import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export type DepartmentKey =
  | 'design'
  | 'marketing'
  | 'media_press'
  | 'security'
  | 'volunteers'
  | 'pr'
  | 'hr'
  | 'logistics'
  | 'it'
  | 'ceremonies'
  | 'dcc';

export type SectionKey = 'male' | 'female';

export const VALID_DEPARTMENTS: readonly DepartmentKey[] = [
  'design',
  'marketing',
  'media_press',
  'security',
  'volunteers',
  'pr',
  'hr',
  'logistics',
  'it',
  'ceremonies',
  'dcc',
] as const;

export function isGenderSeparatedDepartment(dept: string): boolean {
  return dept === 'media_press' || dept === 'security' || dept === 'volunteers';
}

export interface HeadAccountRecord {
  id: string;
  email: string;
  head_name: string;
  department: DepartmentKey;
  section: SectionKey | null;
  active: boolean;
  passwordHash: string; // Hex string of scrypt hash
  salt: string; // Hex string of 16-byte random salt
  resetToken?: string | null;
  resetTokenExpiresAt?: number | null;
  created_at: string;
  updated_at: string;
  lastLoginAt?: string | null;
}

export interface HeadSession {
  token: string;
  headId: string;
  email: string;
  headName: string;
  department: DepartmentKey;
  section: SectionKey | null;
  createdAt: number;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// 1. Storage Location & Directory Setup
// ---------------------------------------------------------------------------
function getStoragePath(): string {
  // Try local project `data/` folder first
  const localDataDir = path.resolve(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDataDir)) {
      fs.mkdirSync(localDataDir, { recursive: true, mode: 0o700 });
    }
    const testFile = path.join(localDataDir, '.test_write');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return path.join(localDataDir, 'head_accounts.json');
  } catch {
    // If running in a read-only serverless environment (e.g., Vercel Lambda)
    const tmpDataDir = path.join(os.tmpdir(), 'westmun');
    try {
      if (!fs.existsSync(tmpDataDir)) {
        fs.mkdirSync(tmpDataDir, { recursive: true });
      }
      return path.join(tmpDataDir, 'head_accounts.json');
    } catch {
      return path.join(os.tmpdir(), 'westmun_head_accounts.json');
    }
  }
}

const STORAGE_FILE = getStoragePath();

// In-memory cache for ultra-fast lookups and cold-start fallback
let headsCache: HeadAccountRecord[] | null = null;
const activeSessions = new Map<string, HeadSession>();

// ---------------------------------------------------------------------------
// 2. Cryptographic Security Helpers (Salted scrypt + Constant-Time Match)
// ---------------------------------------------------------------------------
export function hashPassword(plainPassword: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

export function verifyPassword(plainPassword: string, storedHash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(plainPassword, salt, 64);
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (derivedKey.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(derivedKey, storedBuf);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 3. Initial Seed of Official Department Heads
// ---------------------------------------------------------------------------
interface InitialHeadSeed {
  name: string;
  email: string;
  department: DepartmentKey;
  section?: SectionKey;
}

const OFFICIAL_INITIAL_HEADS: InitialHeadSeed[] = [
  { name: 'Mallak Abbas', email: 'mallak.design@westmun.org', department: 'design' },
  { name: 'Naya Barakat', email: 'naya.marketing@westmun.org', department: 'marketing' },
  { name: 'Fahad Al Kendi', email: 'fahad.media@westmun.org', department: 'media_press', section: 'male' },
  { name: 'Selena', email: 'selena.media@westmun.org', department: 'media_press', section: 'female' },
  { name: 'Yusef Saad', email: 'yusef.security@westmun.org', department: 'security', section: 'male' },
  { name: 'Najla Rami', email: 'najla.security@westmun.org', department: 'security', section: 'female' },
  { name: 'Saad Usman', email: 'saad.volunteers@westmun.org', department: 'volunteers', section: 'male' },
  { name: 'Maram Ali', email: 'maram.volunteers@westmun.org', department: 'volunteers', section: 'female' },
  { name: 'Mazen Alada', email: 'mazen.pr@westmun.org', department: 'pr' },
  { name: 'Dana Alnajjar', email: 'dana.pr@westmun.org', department: 'pr' },
  { name: 'Hoorain', email: 'hoorain.hr@westmun.org', department: 'hr' },
  { name: 'Seif Ayman', email: 'seif.hr@westmun.org', department: 'hr' },
  { name: 'Ahmed El Amir', email: 'ahmed.logistics@westmun.org', department: 'logistics' },
  { name: 'Mohamed Magdi', email: 'mohamed.it@westmun.org', department: 'it' },
  { name: 'Saleh', email: 'saleh.it@westmun.org', department: 'it' },
  { name: 'Sultana', email: 'sultana.ceremonies@westmun.org', department: 'ceremonies' },
  { name: 'Majd', email: 'majd.dcc@westmun.org', department: 'dcc' },
];

function generateInitialRecords(): HeadAccountRecord[] {
  const now = new Date().toISOString();
  return OFFICIAL_INITIAL_HEADS.map((seed, idx) => {
    // Generate secure initial password for each department head
    const tempPass = `WestMun2027!${seed.department}!${idx + 1}`;
    const { hash, salt } = hashPassword(tempPass);

    return {
      id: crypto.randomUUID(),
      email: seed.email.toLowerCase().trim(),
      head_name: seed.name,
      department: seed.department,
      section: seed.section || null,
      active: true,
      passwordHash: hash,
      salt,
      created_at: now,
      updated_at: now,
      lastLoginAt: null,
    };
  });
}

// ---------------------------------------------------------------------------
// 4. Persistence (File Read / Atomic Write)
// ---------------------------------------------------------------------------
function atomicWriteFile(filePath: string, content: string): void {
  try {
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    }
    const tempPath = `${filePath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    fs.writeFileSync(tempPath, content, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // Fallback direct write if atomic rename fails on some file systems
    fs.writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 });
  }
}

function loadFromDisk(): HeadAccountRecord[] {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[HeadStore] Error reading file, re-initializing storage:', err);
  }

  // Seed default roster if empty or missing
  const initial = generateInitialRecords();
  try {
    atomicWriteFile(STORAGE_FILE, JSON.stringify(initial, null, 2));
  } catch (writeErr) {
    console.warn('[HeadStore] Warning saving initial head accounts file:', writeErr);
  }
  return initial;
}

function saveToDisk(records: HeadAccountRecord[]): void {
  headsCache = records;
  try {
    atomicWriteFile(STORAGE_FILE, JSON.stringify(records, null, 2));
  } catch (err) {
    console.error('[HeadStore] Failed to write head accounts to disk:', err);
  }
}

function getRecords(): HeadAccountRecord[] {
  if (!headsCache) {
    headsCache = loadFromDisk();
  }
  return headsCache;
}

// ---------------------------------------------------------------------------
// 5. Head Store Operations (CRUD & Queries)
// ---------------------------------------------------------------------------
export const HeadStore = {
  getAll(): HeadAccountRecord[] {
    return [...getRecords()];
  },

  getById(id: string): HeadAccountRecord | null {
    const records = getRecords();
    return records.find((h) => h.id === id) || null;
  },

  getByEmail(email: string): HeadAccountRecord | null {
    const normalized = email.trim().toLowerCase();
    const records = getRecords();
    return records.find((h) => h.email.toLowerCase() === normalized) || null;
  },

  create(params: {
    fullName: string;
    email: string;
    password: string;
    department: DepartmentKey;
    section?: SectionKey | null;
    active?: boolean;
  }): { head: HeadAccountRecord } {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.fullName.trim();
    const cleanDept = params.department;
    const cleanSec = isGenderSeparatedDepartment(cleanDept) ? (params.section || 'male') : null;

    if (this.getByEmail(cleanEmail)) {
      throw new Error(`An account with email ${cleanEmail} already exists.`);
    }

    if (params.password.length < 8) {
      throw new Error('Password must be at least 8 characters in length.');
    }

    const { hash, salt } = hashPassword(params.password);
    const now = new Date().toISOString();

    const newHead: HeadAccountRecord = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      head_name: cleanName,
      department: cleanDept,
      section: cleanSec,
      active: params.active !== false,
      passwordHash: hash,
      salt,
      created_at: now,
      updated_at: now,
      lastLoginAt: null,
    };

    const records = getRecords();
    records.unshift(newHead);
    saveToDisk(records);

    return { head: newHead };
  },

  update(
    id: string,
    updates: {
      fullName?: string;
      department?: DepartmentKey;
      section?: SectionKey | null;
      active?: boolean;
    }
  ): HeadAccountRecord {
    const records = getRecords();
    const index = records.findIndex((h) => h.id === id);
    if (index === -1) {
      throw new Error(`Department head with ID ${id} not found.`);
    }

    const current = records[index];
    const newDept = updates.department || current.department;
    let newSec = current.section;

    if (updates.department) {
      newSec = isGenderSeparatedDepartment(newDept)
        ? (updates.section || current.section || 'male')
        : null;
    } else if (updates.section !== undefined) {
      newSec = isGenderSeparatedDepartment(newDept) ? updates.section : null;
    }

    const updated: HeadAccountRecord = {
      ...current,
      head_name: updates.fullName !== undefined ? updates.fullName.trim() : current.head_name,
      department: newDept,
      section: newSec,
      active: updates.active !== undefined ? updates.active : current.active,
      updated_at: new Date().toISOString(),
    };

    records[index] = updated;
    saveToDisk(records);
    return updated;
  },

  setPassword(id: string, newPassword: string): void {
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters in length.');
    }

    const records = getRecords();
    const index = records.findIndex((h) => h.id === id);
    if (index === -1) {
      throw new Error(`Department head with ID ${id} not found.`);
    }

    const { hash, salt } = hashPassword(newPassword);
    records[index] = {
      ...records[index],
      passwordHash: hash,
      salt,
      resetToken: null,
      resetTokenExpiresAt: null,
      updated_at: new Date().toISOString(),
    };

    saveToDisk(records);
  },

  createResetToken(id: string): { token: string; expiresAt: number } {
    const records = getRecords();
    const index = records.findIndex((h) => h.id === id);
    if (index === -1) {
      throw new Error(`Department head with ID ${id} not found.`);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 48 * 60 * 60 * 1000; // 48 hours validity

    records[index] = {
      ...records[index],
      resetToken: token,
      resetTokenExpiresAt: expiresAt,
      updated_at: new Date().toISOString(),
    };

    saveToDisk(records);
    return { token, expiresAt };
  },

  resetWithToken(token: string, newPassword: string): HeadAccountRecord {
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters in length.');
    }

    const records = getRecords();
    const index = records.findIndex(
      (h) => h.resetToken === token && h.resetTokenExpiresAt && h.resetTokenExpiresAt > Date.now()
    );

    if (index === -1) {
      throw new Error('Invalid or expired password reset link. Please request a new one from the IT Super Admin.');
    }

    const { hash, salt } = hashPassword(newPassword);
    const updated: HeadAccountRecord = {
      ...records[index],
      passwordHash: hash,
      salt,
      resetToken: null,
      resetTokenExpiresAt: null,
      updated_at: new Date().toISOString(),
    };

    records[index] = updated;
    saveToDisk(records);
    return updated;
  },

  delete(id: string): void {
    const records = getRecords();
    const filtered = records.filter((h) => h.id !== id);
    if (filtered.length === records.length) {
      throw new Error(`Department head with ID ${id} not found.`);
    }

    // Invalidate any active session for this head
    for (const [token, session] of activeSessions.entries()) {
      if (session.headId === id) {
        activeSessions.delete(token);
      }
    }

    saveToDisk(filtered);
  },

  // -------------------------------------------------------------------------
  // 6. Head Authentication & Session Management
  // -------------------------------------------------------------------------
  authenticate(
    email: string,
    plainPassword: string
  ): {
    success: boolean;
    token?: string;
    expiresAt?: string;
    head?: Omit<HeadAccountRecord, 'passwordHash' | 'salt'>;
    error?: string;
    status: number;
  } {
    const normalized = email.trim().toLowerCase();
    const head = this.getByEmail(normalized);

    if (!head) {
      return {
        success: false,
        status: 401,
        error: 'Authentication failed. Please verify your department head email address.',
      };
    }

    if (!head.active) {
      return {
        success: false,
        status: 403,
        error: 'Your department head account has been deactivated. Please contact the IT Super Admin (diavlo3444@gmail.com).',
      };
    }

    const isMatch = verifyPassword(plainPassword, head.passwordHash, head.salt);
    if (!isMatch) {
      return {
        success: false,
        status: 401,
        error: 'Invalid password. Please double check your credentials or request a password reset from the IT Super Admin.',
      };
    }

    // Create session (24 hours)
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000;

    const session: HeadSession = {
      token,
      headId: head.id,
      email: head.email,
      headName: head.head_name,
      department: head.department,
      section: head.section,
      createdAt: now,
      expiresAt,
    };

    activeSessions.set(token, session);

    // Update lastLoginAt
    const records = getRecords();
    const index = records.findIndex((h) => h.id === head.id);
    if (index !== -1) {
      records[index].lastLoginAt = new Date().toISOString();
      saveToDisk(records);
    }

    const { passwordHash, salt, ...safeHead } = head;
    return {
      success: true,
      status: 200,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      head: safeHead,
    };
  },

  verifySession(token: string): HeadSession | null {
    if (!token) return null;
    const session = activeSessions.get(token);
    if (!session) return null;

    if (session.expiresAt <= Date.now()) {
      activeSessions.delete(token);
      return null;
    }

    // Verify account still exists and is active
    const head = this.getById(session.headId);
    if (!head || !head.active) {
      activeSessions.delete(token);
      return null;
    }

    return session;
  },

  destroySession(token: string): void {
    if (token) {
      activeSessions.delete(token);
    }
  },
};

// Periodically prune expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) {
      activeSessions.delete(token);
    }
  }
}, 15 * 60 * 1000);
