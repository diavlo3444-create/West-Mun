import {
  verifySuperAdminCaller,
  handleCreateHeadAccount,
  handleListHeads,
  handleUpdateHead,
  handleResetPassword,
  handleDeleteHead,
} from '../src/server/superAdminHandler.ts';

// Robust body parser for serverless Node/Vercel environments
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

  // Set standard API headers
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
    const headId = url.searchParams.get('id') || '';

    // 1. Verification Endpoint
    if (action === 'verify' || url.pathname.endsWith('/verify')) {
      const check = await verifySuperAdminCaller(authHeader, req.headers);
      return res.status(check.statusCode).json({
        success: check.authorized,
        authorized: check.authorized,
        user: check.user,
        error: check.error,
      });
    }

    // 2. Head Accounts Management - List
    if (method === 'GET') {
      const result = await handleListHeads(authHeader, req.headers);
      return res.status(result.statusCode).json(result.body);
    }

    // 3. Head Accounts Management - Create / Reset Password
    if (method === 'POST') {
      const body = await parseJsonBody(req);
      if (action === 'reset-password' || url.pathname.includes('/password')) {
        const targetId = headId || body.id;
        const result = await handleResetPassword(authHeader, targetId, body, req.headers, origin);
        return res.status(result.statusCode).json(result.body);
      }

      const result = await handleCreateHeadAccount(authHeader, body, req.headers, origin);
      return res.status(result.statusCode).json(result.body);
    }

    // 4. Head Accounts Management - Update
    if (method === 'PATCH' || method === 'PUT') {
      const body = await parseJsonBody(req);
      const targetId = headId || body.id;
      const result = await handleUpdateHead(authHeader, targetId, body, req.headers);
      return res.status(result.statusCode).json(result.body);
    }

    // 5. Head Accounts Management - Delete / Revoke
    if (method === 'DELETE') {
      const body = await parseJsonBody(req);
      const targetId = headId || body.id;
      const result = await handleDeleteHead(authHeader, targetId, req.headers);
      return res.status(result.statusCode).json(result.body);
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (fatalErr: any) {
    console.error('[API Super Admin Error]:', fatalErr);
    return res.status(500).json({
      success: false,
      error: fatalErr?.message || 'A server error occurred during request execution.',
    });
  }
}
