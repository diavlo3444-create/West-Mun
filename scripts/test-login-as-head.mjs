import { createServer } from 'node:http';

const SUPER = '11111111-1111-4111-8111-111111111111';
const ADMIN = '22222222-2222-4222-8222-222222222222';
const NON_ADMIN = '33333333-3333-4333-8333-333333333333';

const users = [
  { id: SUPER, email: 'diavlo3444@gmail.com', user_metadata: { full_name: 'Super Admin' } },
  { id: ADMIN, email: 'yousefasaifi@gmail.com', user_metadata: { full_name: 'Yousef' } },
  { id: NON_ADMIN, email: 'stranger@example.com', user_metadata: { full_name: 'Stranger' } },
];
const adminIds = new Set([SUPER, ADMIN]);
const tokens = new Map([
  ['token-super', SUPER],
  ['token-admin', ADMIN],
  ['token-nonadmin', NON_ADMIN],
]);

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const fakeSupabase = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname;

  if (path === '/auth/v1/user' && req.method === 'GET') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const userId = tokens.get(token);
    if (!userId) return json(res, 401, { message: 'Invalid JWT' });
    const user = users.find((u) => u.id === userId);
    return json(res, 200, user);
  }

  if (path.startsWith('/rest/v1/admins') && req.method === 'GET') {
    const uid = (url.searchParams.get('user_id') || '').replace(/^eq\./, '');
    if (uid) {
      return json(res, 200, adminIds.has(uid) ? [{ user_id: uid, active: true }] : []);
    }
    return json(res, 200, Array.from(adminIds).map((id) => {
      const u = users.find((x) => x.id === id);
      return { user_id: id, email: u?.email, active: true };
    }));
  }

  if (path.startsWith('/rest/v1/department_heads') && req.method === 'GET') {
    return json(res, 200, [
      {
        id: 'head-1',
        user_id: 'head-1-uid',
        email: 'design.head@westmun.org',
        head_name: 'Mallak Abbas',
        department: 'design',
        section: null,
        active: true,
      },
    ]);
  }

  if (path.startsWith('/rest/v1/team_registrations') && req.method === 'GET') {
    return json(res, 200, [
      { id: 'reg-1', full_name: 'Delegate One', email: 'one@example.com', team: 'design', status: 'received' },
    ]);
  }

  return json(res, 200, []);
});

await new Promise((resolve) => fakeSupabase.listen(0, '127.0.0.1', resolve));
const fakePort = fakeSupabase.address().port;

process.env.SUPABASE_URL = `http://127.0.0.1:${fakePort}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-test-service-role-key-never-verified-against-cloud';
process.env.SUPABASE_ANON_KEY = 'fake-test-anon-key';

const { default: superAdminHandler } = await import('../api/super-admin.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${message}`);
  } else {
    failed++;
    console.error(`[FAIL] ${message}`);
  }
}

async function callHandler(method, urlPath, authHeader, body = null) {
  return new Promise(async (resolve) => {
    let statusCode = 200;
    const headers = {};
    let responseBody = '';

    const req = {
      method,
      url: urlPath,
      headers: {
        host: 'localhost',
        'x-forwarded-proto': 'http',
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      on(event, cb) {
        if (event === 'data' && body) cb(JSON.stringify(body));
        if (event === 'end') cb();
      },
    };

    const res = {
      setHeader(k, v) { headers[k] = v; },
      status(c) { statusCode = c; return this; },
      json(d) { responseBody = JSON.stringify(d); resolve({ statusCode, data: d }); },
      end(d) { if (d) responseBody = d; try { resolve({ statusCode, data: JSON.parse(responseBody) }); } catch { resolve({ statusCode, data: responseBody }); } },
    };

    await superAdminHandler(req, res);
  });
}

console.log('====================================================');
console.log('WEST MUN — Super IT Test Mode Security Test Suite');
console.log('====================================================');

// Test 1: Non-super-admin cannot launch test session
const nonAdminRes = await callHandler('POST', '/api/super-admin?action=launch-test', 'Bearer token-admin', {
  email: 'design.head@westmun.org',
});
assert(nonAdminRes.statusCode === 403, 'non-super-admin is blocked from launching Login as Head test sessions (403)');

// Test 2: Unauthenticated caller cannot launch test session
const unauthRes = await callHandler('POST', '/api/super-admin?action=launch-test', null, {
  email: 'design.head@westmun.org',
});
assert(unauthRes.statusCode === 401, 'unauthenticated caller is blocked from launching test sessions (401)');

// Test 3: IT Super Admin (diavlo3444@gmail.com) can launch test session
const launchRes = await callHandler('POST', '/api/super-admin?action=launch-test', 'Bearer token-super', {
  email: 'design.head@westmun.org',
});
assert(launchRes.statusCode === 200 && launchRes.data?.success, 'authorized IT Super Admin launches test session');
assert(Boolean(launchRes.data?.ticket && launchRes.data?.launchUrl), 'launch returns single-use ticket and secure launch URL');

const ticket = launchRes.data?.ticket;

// Test 4: Single-use launch ticket exchange
const consumeRes = await callHandler('GET', `/api/super-admin?action=consume-ticket&ticket=${ticket}`, null);
assert(consumeRes.statusCode === 200 && consumeRes.data?.success, 'single-use launch ticket exchanges for session token');
const sessionToken = consumeRes.data?.sessionToken;
assert(Boolean(sessionToken && sessionToken.startsWith('test_sess_')), 'valid dedicated test session token returned');

// Test 5: Single-use ticket replay prevention
const replayRes = await callHandler('GET', `/api/super-admin?action=consume-ticket&ticket=${ticket}`, null);
assert(replayRes.statusCode === 401 && !replayRes.data?.success, 'consumed ticket cannot be reused / replayed (strictly single-use)');

// Test 6: Verify active test session
const verifyRes = await callHandler('GET', `/api/super-admin?action=verify-test-session&token=${sessionToken}`, null);
assert(verifyRes.statusCode === 200 && verifyRes.data?.authorized && verifyRes.data?.isSuperAdminTestMode, 'active test session verifies as Super IT Test Mode');
assert(verifyRes.data?.adminEmail === 'diavlo3444@gmail.com', 'admin email bound to diavlo3444@gmail.com');

// Test 7: Elevated data query
const dataRes = await callHandler('GET', '/api/super-admin?action=test-data&department=design', `Bearer ${sessionToken}`);
assert(dataRes.statusCode === 200 && dataRes.data?.success, 'active test session grants cross-department data testing');

// Test 8: Terminate test session
const termRes = await callHandler('POST', '/api/super-admin?action=terminate-test-session', `Bearer ${sessionToken}`, { token: sessionToken });
assert(termRes.statusCode === 200 && termRes.data?.success, 'test session terminates cleanly');

// Test 9: Terminated session is revoked and invalid
const afterTermVerify = await callHandler('GET', `/api/super-admin?action=verify-test-session&token=${sessionToken}`, null);
assert(afterTermVerify.statusCode === 401 && !afterTermVerify.data?.authorized, 'terminated session cannot be used again');

fakeSupabase.close();
console.log('====================================================');
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log('====================================================');

if (failed > 0) process.exit(1);
