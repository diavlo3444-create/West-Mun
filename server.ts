import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// ============================================================================
// 1. DATA PERSISTENCE & DIRECTORY SETUP (Safe Local Storage)
// ============================================================================
const DATA_DIR = path.resolve(process.cwd(), 'data');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
  if (!fs.existsSync(REGISTRATIONS_FILE)) {
    fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify([], null, 2), { encoding: 'utf8', mode: 0o600 });
  }
  if (!fs.existsSync(INQUIRIES_FILE)) {
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify([], null, 2), { encoding: 'utf8', mode: 0o600 });
  }
} catch (err) {
  console.error('[Storage Init] Warning creating data files:', err);
}

function atomicWriteJson(filePath: string, data: unknown): void {
  const tempPath = `${filePath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
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

// ============================================================================
// 2. ADMIN CREDENTIALS & SESSION MANAGEMENT (Zero Client Secret Exposure)
// ============================================================================
// Optional local-development Secretariat key. There is deliberately no default:
// when unset, these legacy local routes stay disabled instead of accepting a
// well-known password.
function getTargetAdminPassword(): string | null {
  const envKey = process.env.ADMIN_PASSWORD;
  if (typeof envKey === 'string' && envKey.trim().length > 0) {
    // Strip surrounding quotes and whitespace from env variable if present
    return envKey.trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

// Active session storage with TTL (2 hours)
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
setInterval(pruneExpiredSessions, 10 * 60 * 1000);

// ============================================================================
// 3. IN-MEMORY RATE LIMITING (Spam & Brute Force Defense)
// ============================================================================
interface RateLimitRecord {
  count: number;
  firstRequestTime: number;
  blockedUntil?: number;
}

const rateLimitStores = {
  contact: new Map<string, RateLimitRecord>(),
  register: new Map<string, RateLimitRecord>(),
  login: new Map<string, RateLimitRecord>(),
};

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function checkRateLimit(
  bucket: 'contact' | 'register' | 'login',
  ip: string,
  maxAttempts: number,
  windowMs: number,
  blockDurationMs = 15 * 60 * 1000,
  increment = true
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const store = rateLimitStores[bucket];
  const record = store.get(ip);

  if (record && record.blockedUntil && record.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.blockedUntil - now) / 1000),
    };
  }

  if (!increment) {
    return { allowed: true };
  }

  if (!record || now - record.firstRequestTime > windowMs) {
    store.set(ip, { count: 1, firstRequestTime: now });
    return { allowed: true };
  }

  record.count += 1;
  if (record.count > maxAttempts) {
    record.blockedUntil = now + blockDurationMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(blockDurationMs / 1000),
    };
  }

  return { allowed: true };
}

// Clean up rate limit maps periodically
setInterval(() => {
  const now = Date.now();
  for (const map of Object.values(rateLimitStores)) {
    for (const [ip, rec] of map.entries()) {
      if (rec.blockedUntil && rec.blockedUntil < now && now - rec.firstRequestTime > 30 * 60 * 1000) {
        map.delete(ip);
      }
    }
  }
}, 15 * 60 * 1000);

// ============================================================================
// 4. SANITIZATION & STRICT INPUT VALIDATION (Injection & XSS Prevention)
// ============================================================================
function sanitizeInput(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '') // remove ASCII control characters
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

// ============================================================================
// 5. SECURITY HEADERS MIDDLEWARE (CSP, X-Content-Type-Options, etc.)
// ============================================================================
app.use((_req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Modern browser feature permissions
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // Cross-Origin Opener Policy for popups and security isolation
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // Disable browser DNS prefetching
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Content Security Policy
  // Allows Google Fonts, OnlineWebFonts, blob & data URI images for animations/canvas,
  // and allows framing in AI Studio iframe environment.
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://db.onlinewebfonts.com",
    "font-src 'self' https://fonts.gstatic.com https://db.onlinewebfonts.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'self' *",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  next();
});

// Explicitly protect private data folder from direct static file access
app.use('/data', (_req: Request, res: Response) => {
  res.status(403).json({ error: 'Access forbidden.' });
});

// Strict JSON body parser with 16kb limit to mitigate memory exhaustion/DOS
app.use(express.json({ limit: '16kb' }));

// ============================================================================
// 6. BACKEND API ENDPOINTS
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    conference: 'WEST MUN 2027',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Public Contact / Diplomatic Inquiry Endpoint
 */
app.post('/api/contact', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rate = checkRateLimit('contact', ip, 5, 10 * 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Too many submissions. Please wait ${rate.retryAfterSeconds} seconds before sending another message.`,
    });
  }

  const { name, email, subject, message } = req.body || {};

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid official email address.' });
  }

  const cleanName = sanitizeInput(name, 100);
  const cleanEmail = sanitizeInput(email, 120);
  const cleanSubject = sanitizeInput(subject, 150);
  const cleanMessage = sanitizeInput(message, 3000);

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: 'Delegate or delegate representative name is required.' });
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
    // Keep max 500 inquiries
    if (inquiries.length > 500) inquiries.pop();
    atomicWriteJson(INQUIRIES_FILE, inquiries);

    return res.status(200).json({
      success: true,
      message: 'Your diplomatic communication has been safely transmitted to the Secretariat.',
      data: { id: newInquiry.id, created_at: newInquiry.created_at },
    });
  } catch (err) {
    console.error('[Inquiry Error]', err);
    return res.status(500).json({ error: 'An error occurred while saving your inquiry. Please try again.' });
  }
});

/**
 * Public Delegate Pre-Registration Endpoint
 */
app.post('/api/register', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rate = checkRateLimit('register', ip, 5, 10 * 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Too many registration attempts. Please wait ${rate.retryAfterSeconds} seconds before trying again.`,
    });
  }

  const { fullName, email, institution, tier, delegationType } = req.body || {};

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid institutional or personal email address.' });
  }

  const validTiers = ['early_bird', 'regular'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ error: 'Invalid registration tier selected.' });
  }

  const validTypes = ['single_delegate', 'school_delegation'];
  if (!validTypes.includes(delegationType)) {
    return res.status(400).json({ error: 'Invalid delegation structure selected.' });
  }

  const cleanName = sanitizeInput(fullName, 100);
  const cleanEmail = sanitizeInput(email, 120);
  const cleanInstitution = sanitizeInput(institution, 150);

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: 'Full legal/delegate name is required.' });
  }
  if (!cleanInstitution || cleanInstitution.length < 2) {
    return res.status(400).json({ error: 'Academic institution or organization name is required.' });
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

    // Check duplicate registration for the same tier
    const duplicate = registrations.find(
      (r) => r.email.toLowerCase() === cleanEmail.toLowerCase() && r.tier === tier
    );
    if (duplicate) {
      return res.status(409).json({
        error: 'A registration for this email under this conference tier has already been registered.',
      });
    }

    const newRecord = {
      id: crypto.randomUUID(),
      full_name: cleanName,
      email: cleanEmail,
      institution: cleanInstitution,
      tier: tier as 'early_bird' | 'regular',
      delegation_type: delegationType as 'single_delegate' | 'school_delegation',
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
  } catch (err) {
    console.error('[Registration Error]', err);
    return res.status(500).json({ error: 'Unable to process registration at this moment.' });
  }
});

/**
 * Organizer Admin Authentication Endpoint (Constant-time string comparison)
 */
app.post('/api/admin/login', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  // Check if IP is currently blocked without prematurely incrementing attempt counter
  const rate = checkRateLimit('login', ip, 5, 15 * 60 * 1000, 15 * 60 * 1000, false);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Security lock active. Maximum login attempts exceeded. Try again in ${rate.retryAfterSeconds} seconds.`,
    });
  }

  const { password } = req.body || {};
  const rawInput = typeof password === 'string' ? password : '';
  const trimmedInput = rawInput.trim();

  if (!trimmedInput) {
    return res.status(400).json({ error: 'Secretariat authorization key is required.' });
  }

  const targetPassword = getTargetAdminPassword();
  if (!targetPassword) {
    return res.status(503).json({
      error: 'Local admin password authentication is disabled. Configure ADMIN_PASSWORD for local development, or use Supabase Auth.',
    });
  }

  // Constant-time comparison using sha256 hashes to prevent timing attacks
  const targetHash = crypto.createHash('sha256').update(targetPassword).digest();
  const trimmedInputHash = crypto.createHash('sha256').update(trimmedInput).digest();
  const rawInputHash = crypto.createHash('sha256').update(rawInput).digest();

  // Validate constant-time matches against either trimmed or raw input to handle mobile whitespace/autocorrect
  const isMatch =
    crypto.timingSafeEqual(trimmedInputHash, targetHash) ||
    crypto.timingSafeEqual(rawInputHash, targetHash);

  if (!isMatch) {
    // Record failed attempt against rate limiter
    checkRateLimit('login', ip, 5, 15 * 60 * 1000, 15 * 60 * 1000, true);
    return res.status(401).json({ error: 'Invalid Secretariat authorization credentials.' });
  }

  // Reset rate limiting on successful login
  rateLimitStores.login.delete(ip);

  // Generate 256-bit cryptographically secure session token
  const token = crypto.randomBytes(32).toString('hex');
  const session: Session = {
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
  };
  activeSessions.set(token, session);

  return res.json({
    success: true,
    token,
    expiresAt: new Date(session.expiresAt).toISOString(),
    data: {
      token,
      expiresAt: new Date(session.expiresAt).toISOString(),
    },
  });
});

/**
 * IT Super Admin Endpoint (Exclusive to diavlo3444@gmail.com verified in public.admins)
 */
app.all('/api/super-admin*', async (req: Request, res: Response) => {
  try {
    const { default: handler } = await import('./serverless/super-admin.ts');
    await handler(req, res);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({ error: msg });
  }
});

/**
 * Department Head Authentication & Session Endpoint
 */
app.all('/api/head-auth*', async (req: Request, res: Response) => {
  try {
    const { default: handler } = await import('./serverless/head-auth.ts');
    await handler(req, res);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({ error: msg });
  }
});

/**
 * Organizer Admin Data Retrieval Endpoint (Requires valid Bearer token)
 */
app.get('/api/admin/data', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7).trim();
  const session = activeSessions.get(token);

  if (!session || session.expiresAt <= Date.now()) {
    if (session) activeSessions.delete(token);
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  try {
    const registrations = readJsonFile(REGISTRATIONS_FILE, []);
    const inquiries = readJsonFile(INQUIRIES_FILE, []);

    return res.json({
      success: true,
      data: {
        registrations,
        inquiries,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Failed to read records.' });
  }
});

/**
 * Organizer Admin Logout Endpoint
 */
app.post('/api/admin/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    activeSessions.delete(token);
  }
  return res.json({ success: true, message: 'Signed out successfully.' });
});

// ============================================================================
// 7. VITE DEV SERVER / PRODUCTION STATIC SERVING
// ============================================================================
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WEST MUN Server] Secure full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[WEST MUN Server Error] Fatal startup error:', err);
  process.exit(1);
});
