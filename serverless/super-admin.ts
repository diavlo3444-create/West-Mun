import {
  verifyAdminCaller,
  handleCreateHeadAccount,
  handleAssignHead,
  handleListHeads,
  handleUpdateHead,
  handleResetPassword,
  handleDeleteHead,
  handleListAdmins,
  handleCreateAdmin,
  handleToggleAdmin,
  handleDeleteAdmin,
  handleCreateTestSession,
  handleConsumeLaunchTicket,
  handleVerifyTestSession,
  handleTerminateTestSession,
  handleTestSessionData,
  handleTestSessionUpdate,
} from '../src/server/superAdminHandler.ts';
import {
  handleTestSessionRecords,
  handleTestSessionRecordSave,
  handleTestSessionRecordDelete,
} from '../src/server/departmentRecordsAdmin.ts';

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
    const scope = url.searchParams.get('scope') || url.searchParams.get('target') || '';
    const headId = url.searchParams.get('id') || '';

    // 1. Session / identity verification (any organiser in public.admins).
    //    The bearer token is verified with Supabase Auth server-side; the
    //    caller's email, role flags and headers are never trusted.
    if (action === 'session' || action === 'verify' || url.pathname.endsWith('/verify')) {
      const check = await verifyAdminCaller(authHeader);
      return res.status(check.statusCode).json({
        success: check.authorized,
        authorized: check.authorized,
        isAdmin: Boolean(check.isAdmin),
        isSuperAdmin: Boolean(check.isSuperAdmin),
        user: check.user,
        code: check.code,
        error: check.error,
      });
    }

    // =========================================================================
    // 1b. SUPER IT TEST MODE: LOGIN AS HEAD (diavlo3444@gmail.com exclusive)
    // =========================================================================
    if (action === 'launch-test' || action === 'login-as-head') {
      const body = await parseJsonBody(req);
      const result = await handleCreateTestSession(authHeader, body, origin, req.headers);
      return res.status(result.statusCode).json(result.body);
    }

    if (action === 'consume-ticket' || action === 'exchange-ticket') {
      const body = await parseJsonBody(req);
      const ticket = url.searchParams.get('ticket') || body.ticket || '';
      const result = await handleConsumeLaunchTicket(ticket);
      return res.status(result.statusCode).json(result.body);
    }

    if (action === 'verify-test-session') {
      const token = url.searchParams.get('token') || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '');
      const result = await handleVerifyTestSession(token);
      return res.status(result.statusCode).json(result.body);
    }

    if (action === 'terminate-test-session' || action === 'exit-test') {
      const body = await parseJsonBody(req);
      const token = body.token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '');
      const result = await handleTerminateTestSession(token);
      return res.status(result.statusCode).json(result.body);
    }

    if (action === 'test-data') {
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const dept = url.searchParams.get('department') || undefined;
      const sec = url.searchParams.get('section') || undefined;
      const result = await handleTestSessionData(token, { department: dept, section: sec });
      return res.status(result.statusCode).json(result.body);
    }

    if (action === 'test-update') {
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const body = await parseJsonBody(req);
      const result = await handleTestSessionUpdate(token, body);
      return res.status(result.statusCode).json(result.body);
    }

    // Department workspace records during an active Super IT test session.
    if (action === 'test-records') {
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const dept = url.searchParams.get('department') || undefined;
      const sec = url.searchParams.get('section') || undefined;
      const result = await handleTestSessionRecords(token, { department: dept, section: sec });
      return res.status(result.statusCode).json(result.body);
    }

    if (action === 'test-record-save') {
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const body = await parseJsonBody(req);
      const result = await handleTestSessionRecordSave(token, body);
      return res.status(result.statusCode).json(result.body);
    }

    if (action === 'test-record-delete') {
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const body = await parseJsonBody(req);
      const result = await handleTestSessionRecordDelete(token, body);
      return res.status(result.statusCode).json(result.body);
    }

    // 2. Normal Admin Accounts Management (Super Admin Exclusive)
    if (scope === 'admins' || action.startsWith('admin-')) {
      if (method === 'GET') {
        const result = await handleListAdmins(authHeader);
        return res.status(result.statusCode).json(result.body);
      }
      if (method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await handleCreateAdmin(authHeader, body);
        return res.status(result.statusCode).json(result.body);
      }
      if (method === 'PATCH' || method === 'PUT') {
        const body = await parseJsonBody(req);
        const targetId = headId || body.id || body.user_id;
        const result = await handleToggleAdmin(authHeader, targetId, body);
        return res.status(result.statusCode).json(result.body);
      }
      if (method === 'DELETE') {
        const body = await parseJsonBody(req);
        const targetId = headId || body.id || body.user_id;
        const result = await handleDeleteAdmin(authHeader, targetId);
        return res.status(result.statusCode).json(result.body);
      }
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // 3. Head Accounts Management - List
    if (method === 'GET') {
      const result = await handleListHeads(authHeader);
      return res.status(result.statusCode).json(result.body);
    }

    // 3. Head Accounts Management - Create / Reset Password
    if (method === 'POST') {
      const body = await parseJsonBody(req);
      if (action === 'reset-password' || url.pathname.includes('/password')) {
        const targetId = headId || body.id;
        const result = await handleResetPassword(authHeader, targetId, body, undefined, origin);
        return res.status(result.statusCode).json(result.body);
      }

      // Recoverable retry: Auth user already exists, (re)write the assignment.
      if (action === 'assign' || url.pathname.endsWith('/assign')) {
        const result = await handleAssignHead(authHeader, body);
        return res.status(result.statusCode).json(result.body);
      }

      const result = await handleCreateHeadAccount(authHeader, body, req.headers, origin);
      return res.status(result.statusCode).json(result.body);
    }

    // 4. Head Accounts Management - Update
    if (method === 'PATCH' || method === 'PUT') {
      const body = await parseJsonBody(req);
      const targetId = headId || body.id;
      const result = await handleUpdateHead(authHeader, targetId, body);
      return res.status(result.statusCode).json(result.body);
    }

    // 5. Head Accounts Management - Delete / Revoke
    if (method === 'DELETE') {
      const body = await parseJsonBody(req);
      const targetId = headId || body.id;
      const result = await handleDeleteHead(authHeader, targetId);
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
