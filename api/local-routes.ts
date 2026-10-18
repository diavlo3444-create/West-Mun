import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

function getDataDir(): string {
  const localDir = path.resolve(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true, mode: 0o700 });
    }
    const testFile = path.join(localDir, '.write_test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'westmun_data');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

const DATA_DIR = getDataDir();
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');

try {
  if (!fs.existsSync(REGISTRATIONS_FILE)) {
    fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  if (!fs.existsSync(INQUIRIES_FILE)) {
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify([], null, 2), 'utf8');
  }
} catch (e) {
  console.warn('[Storage Warning]:', e);
}

function atomicWriteJson(filePath: string, data: unknown): void {
  const tempPath = `${filePath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

function getTargetAdminPassword(): string {
  const envKey = process.env.ADMIN_PASSWORD;
  if (typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim().replace(/^["']|["']$/g, '');
  }
  return 'masterkey';
}

interface Session {
  token: string;
  createdAt: number;
  expiresAt: number;
}
const activeSessions = new Map<string, Session>();

function pruneExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) {
      activeSessions.delete(token);
    }
  }
}
const pruneInterval = setInterval(pruneExpiredSessions, 10 * 60 * 1000);
pruneInterval.unref();

function sanitizeInput(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return char;
      }
    })
    .slice(0, maxLength);
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$/;
function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length > 5 && trimmed.length <= 120 && EMAIL_REGEX.test(trimmed);
}

async function parseJsonBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

function ensureResponseHelpers(res: any) {
  if (!res.status) {
    res.status = function (code: number) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function (data: any) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
      res.end(JSON.stringify(data));
      return res;
    };
  }
}

export default async function handler(req: any, res: any) {
  ensureResponseHelpers(res);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const host = req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;
  const url = new URL(req.url || '/', origin);
  const pathname = url.pathname;
  const method = (req.method || 'GET').toUpperCase();

  // /api/health
  if (pathname === '/api/health') {
    return res.status(200).json({
      status: 'healthy',
      conference: 'WEST MUN 2027',
      timestamp: new Date().toISOString(),
    });
  }

  // /api/contact
  if (pathname === '/api/contact' && method === 'POST') {
    const body = await parseJsonBody(req);
    const { name, email, subject, message } = body || {};

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid official email address.' });
    }

    const cleanName = sanitizeInput(name, 100);
    const cleanEmail = sanitizeInput(email, 120);
    const cleanSubject = sanitizeInput(subject, 150);
    const cleanMessage = sanitizeInput(message, 3000);

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!cleanSubject || cleanSubject.length < 3) {
      return res.status(400).json({ error: 'Inquiry subject line is required.' });
    }
    if (!cleanMessage || cleanMessage.length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters in length.' });
    }

    const newInquiry = {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      created_at: new Date().toISOString(),
    };

    try {
      const inquiries = readJsonFile<typeof newInquiry[]>(INQUIRIES_FILE, []);
      inquiries.unshift(newInquiry);
      if (inquiries.length > 500) inquiries.pop();
      atomicWriteJson(INQUIRIES_FILE, inquiries);

      return res.status(200).json({
        success: true,
        message: 'Your diplomatic communication has been safely transmitted to the Secretariat.',
        data: { id: newInquiry.id, created_at: newInquiry.created_at },
      });
    } catch {
      return res.status(500).json({ error: 'An error occurred while saving your inquiry.' });
    }
  }

  // /api/register
  if (pathname === '/api/register' && method === 'POST') {
    const body = await parseJsonBody(req);
    const { fullName, email, institution, tier, delegationType } = body || {};

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const cleanName = sanitizeInput(fullName, 100);
    const cleanEmail = sanitizeInput(email, 120);
    const cleanInstitution = sanitizeInput(institution, 150);

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: 'Full delegate name is required.' });
    }
    if (!cleanInstitution || cleanInstitution.length < 2) {
      return res.status(400).json({ error: 'Academic institution name is required.' });
    }

    try {
      const registrations = readJsonFile<Array<{
        id: string;
        full_name: string;
        email: string;
        institution: string;
        tier: string;
        delegation_type: string;
        created_at: string;
      }>>(REGISTRATIONS_FILE, []);

      const newRecord = {
        id: crypto.randomUUID(),
        full_name: cleanName,
        email: cleanEmail,
        institution: cleanInstitution,
        tier: (tier || 'regular') as 'early_bird' | 'regular',
        delegation_type: (delegationType || 'single_delegate') as 'single_delegate' | 'school_delegation',
        created_at: new Date().toISOString(),
      };

      registrations.unshift(newRecord);
      if (registrations.length > 500) registrations.pop();
      atomicWriteJson(REGISTRATIONS_FILE, registrations);

      return res.status(200).json({
        success: true,
        message: 'Your registration preference has been securely recorded by the Secretariat.',
        data: newRecord,
      });
    } catch {
      return res.status(500).json({ error: 'Unable to process registration.' });
    }
  }

  // /api/admin/login
  if (pathname === '/api/admin/login' && method === 'POST') {
    const body = await parseJsonBody(req);
    const { password } = body || {};
    const rawInput = typeof password === 'string' ? password : '';
    const trimmedInput = rawInput.trim();

    if (!trimmedInput) {
      return res.status(400).json({ error: 'Secretariat authorization key is required.' });
    }

    const targetPassword = getTargetAdminPassword();
    const targetHash = crypto.createHash('sha256').update(targetPassword).digest();
    const trimmedInputHash = crypto.createHash('sha256').update(trimmedInput).digest();
    const rawInputHash = crypto.createHash('sha256').update(rawInput).digest();

    const isMatch =
      crypto.timingSafeEqual(trimmedInputHash, targetHash) ||
      crypto.timingSafeEqual(rawInputHash, targetHash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Secretariat authorization credentials.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const session: Session = {
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    };
    activeSessions.set(token, session);

    return res.status(200).json({
      success: true,
      token,
      expiresAt: new Date(session.expiresAt).toISOString(),
      data: {
        token,
        expiresAt: new Date(session.expiresAt).toISOString(),
      },
    });
  }

  // /api/admin/data
  if (pathname === '/api/admin/data' && method === 'GET') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const token = authHeader.slice(7).trim();
    const session = activeSessions.get(token);

    if (!session || session.expiresAt <= Date.now()) {
      if (session) activeSessions.delete(token);
      return res.status(401).json({ error: 'Session expired or invalid.' });
    }

    const registrations = readJsonFile(REGISTRATIONS_FILE, []);
    const inquiries = readJsonFile(INQUIRIES_FILE, []);

    return res.status(200).json({
      success: true,
      data: {
        registrations,
        inquiries,
      },
    });
  }

  // /api/admin/logout
  if (pathname === '/api/admin/logout' && method === 'POST') {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      activeSessions.delete(token);
    }
    return res.status(200).json({ success: true, message: 'Signed out successfully.' });
  }

  return res.status(404).json({ error: 'API route not found.' });
}
