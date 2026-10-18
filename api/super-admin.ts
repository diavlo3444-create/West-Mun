import type { IncomingMessage, ServerResponse } from 'http';
import {
  verifySuperAdminCaller,
  handleCreateHeadAccount,
  handleListHeads,
  handleUpdateHead,
  handleResetPassword,
  handleDeleteHead,
} from '../src/server/superAdminHandler.ts';

// Simple body parser for serverless Node/Vercel environments
async function parseJsonBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
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
  });
}

export default async function handler(req: any, res: any) {
  // Set CORS and security headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

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
      authorized: check.authorized,
      user: check.user,
      error: check.error,
    });
  }

  // 2. Head Accounts Management
  if (method === 'GET') {
    const result = await handleListHeads(authHeader, req.headers);
    return res.status(result.statusCode).json(result.body);
  }

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

  if (method === 'PATCH' || method === 'PUT') {
    const body = await parseJsonBody(req);
    const targetId = headId || body.id;
    const result = await handleUpdateHead(authHeader, targetId, body, req.headers);
    return res.status(result.statusCode).json(result.body);
  }

  if (method === 'DELETE') {
    const body = await parseJsonBody(req);
    const targetId = headId || body.id;
    const result = await handleDeleteHead(authHeader, targetId, req.headers);
    return res.status(result.statusCode).json(result.body);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
