import { HeadStore } from '../src/server/headStore';

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

  try {
    const authHeader = req.headers.authorization || null;
    const method = (req.method || 'GET').toUpperCase();
    const host = req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    const url = new URL(req.url || '/', origin);
    const action = url.searchParams.get('action') || '';

    // 1. Session verification endpoint
    if (action === 'session' || (method === 'GET' && !action)) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          authorized: false,
          error: 'No active session token provided.',
        });
      }

      const token = authHeader.slice(7).trim();
      const session = HeadStore.verifySession(token);

      if (!session) {
        return res.status(401).json({
          authorized: false,
          error: 'Session has expired or is invalid. Please sign in again.',
        });
      }

      return res.status(200).json({
        authorized: true,
        head: {
          id: session.headId,
          email: session.email,
          headName: session.headName,
          department: session.department,
          section: session.section,
        },
      });
    }

    // 2. Department Head Login endpoint
    if (action === 'login' || (method === 'POST' && action === 'login')) {
      const body = await parseJsonBody(req);
      const { email, password } = body || {};

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Both email and password are required.',
        });
      }

      const result = HeadStore.authenticate(email, password);
      return res.status(result.status).json(result);
    }

    // 3. Department Head Logout endpoint
    if (action === 'logout') {
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        HeadStore.destroySession(token);
      }
      return res.status(200).json({
        success: true,
        message: 'Signed out successfully.',
      });
    }

    // 4. Complete Password Reset via Token
    if (action === 'reset-password' || (method === 'POST' && action === 'reset-password')) {
      const body = await parseJsonBody(req);
      const { token, newPassword } = body || {};

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Reset token and new password are required.',
        });
      }

      try {
        HeadStore.resetWithToken(token, newPassword);
        return res.status(200).json({
          success: true,
          message: 'Password successfully updated. You may now sign in with your new credentials.',
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to reset password.';
        return res.status(400).json({ success: false, error: msg });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  } catch (fatalErr: any) {
    console.error('[API Head Auth Error]:', fatalErr);
    return res.status(500).json({
      success: false,
      error: fatalErr?.message || 'A server error occurred during authentication request.',
    });
  }
}
