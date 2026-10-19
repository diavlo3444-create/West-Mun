/**
 * Regression tests for the authentication fixes and department-head
 * provisioning, run against the exact bundled Vercel handler
 * (api/super-admin.js) with an in-process fake Supabase.
 *
 * Run with: npm run build && node scripts/test-auth-and-heads.mjs
 */
import { createServer } from 'node:http';

const SUPER = '11111111-1111-4111-8111-111111111111';
const ADMIN = '22222222-2222-4222-8222-222222222222';
const NON_ADMIN = '33333333-3333-4333-8333-333333333333';
const AFFECTED = '897ba3ff-a3d3-4761-846b-5aa87696f3eb';

const users = [
  { id: SUPER, email: 'diavlo3444@gmail.com', user_metadata: { full_name: 'Super Admin' } },
  { id: ADMIN, email: 'yousefasaifi@gmail.com', user_metadata: { full_name: 'Yousef' } },
  { id: NON_ADMIN, email: 'stranger@example.com', user_metadata: { full_name: 'Stranger' } },
  { id: AFFECTED, email: 'new.head@westmun.org', user_metadata: { full_name: 'New Head' } },
];
const adminIds = new Set([SUPER, ADMIN]);
const tokens = new Map([
  ['token-super', SUPER],
  ['token-admin', ADMIN],
  ['token-nonadmin', NON_ADMIN],
]);

const state = {
  users: [...users],
  heads: [],
  headColumnsOk: false,
  generateLinkCalls: 0,
  createUserCalls: 0,
};

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

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname;

  // --- Supabase Auth: token verification ---
  if (path === '/auth/v1/user' && req.method === 'GET') {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const uid = tokens.get(token);
    const user = state.users.find((u) => u.id === uid);
    if (!user) return json(res, 401, { message: 'invalid JWT' });
    return json(res, 200, user);
  }

  // --- Supabase Auth admin API ---
  if (path === '/auth/v1/admin/users' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'x-total-count': String(state.users.length),
    });
    return res.end(JSON.stringify({ users: state.users }));
  }

  if (path.startsWith('/auth/v1/admin/users/') && req.method === 'GET') {
    const uid = path.split('/').pop();
    const user = state.users.find((u) => u.id === uid);
    if (!user) return json(res, 404, { message: 'User not found' });
    return json(res, 200, user);
  }

  if (path === '/auth/v1/admin/generate_link' && req.method === 'POST') {
    state.generateLinkCalls += 1;
    const body = await readBody(req);
    const existing = state.users.find((u) => u.email === body.email);
    if (body.type === 'invite' && existing) {
      return json(res, 422, { code: 422, msg: 'User already registered' });
    }
    const user = existing || {
      id: '44444444-4444-4444-8444-444444444444',
      email: body.email,
      user_metadata: body.data || {},
    };
    if (!existing) state.users.push(user);
    return json(res, 200, {
      id: user.id,
      email: user.email,
      action_link: `https://example.test/setup?type=${body.type}&uid=${user.id}`,
      verification_type: body.type,
    });
  }

  if (path === '/auth/v1/admin/users' && req.method === 'POST') {
    state.createUserCalls += 1;
    const body = await readBody(req);
    const user = {
      id: '55555555-5555-4555-8555-555555555555',
      email: body.email,
      user_metadata: body.user_metadata || {},
    };
    state.users.push(user);
    return json(res, 200, user);
  }

  if (path.startsWith('/auth/v1/admin/users/') && req.method === 'PUT') {
    const uid = path.split('/').pop();
    const body = await readBody(req);
    const user = state.users.find((u) => u.id === uid);
    if (user) Object.assign(user, body);
    state.authAdminUpdates = (state.authAdminUpdates || []).concat([{ uid, body }]);
    return json(res, 200, user || {});
  }

  // --- PostgREST: admins ---
  if (path === '/rest/v1/admins' && req.method === 'GET') {
    const uid = (url.searchParams.get('user_id') || '').replace(/^eq\./, '');
    return json(res, 200, adminIds.has(uid) ? [{ user_id: uid }] : []);
  }

  // --- PostgREST: department_heads ---
  if (path === '/rest/v1/department_heads' && req.method === 'POST') {
    const body = await readBody(req);
    if (!state.headColumnsOk) {
      return json(res, 400, {
        code: 'PGRST204',
        message: "Could not find the 'active' column of 'department_heads' in the schema cache",
        details: null,
        hint: null,
      });
    }
    const row = Array.isArray(body) ? body[0] : body;
    const existingIndex = state.heads.findIndex((h) => h.user_id === row.user_id);
    if (existingIndex === -1) state.heads.push(row);
    else state.heads[existingIndex] = { ...state.heads[existingIndex], ...row };
    return json(res, 201, null);
  }

  if (path === '/rest/v1/department_heads' && req.method === 'GET') {
    if (!state.headColumnsOk) {
      return json(res, 400, {
        code: 'PGRST204',
        message: "Could not find the 'active' column of 'department_heads' in the schema cache",
        details: null,
        hint: null,
      });
    }
    const uid = (url.searchParams.get('user_id') || '').replace(/^eq\./, '');
    return json(res, 200, uid ? state.heads.filter((h) => h.user_id === uid) : state.heads);
  }

  if (path === '/rest/v1/department_heads' && req.method === 'PATCH') {
    if (!state.headColumnsOk) {
      return json(res, 400, { code: 'PGRST204', message: "Could not find the 'active' column" });
    }
    const body = await readBody(req);
    const uid = (url.searchParams.get('user_id') || '').replace(/^eq\./, '');
    const row = state.heads.find((h) => h.user_id === uid);
    if (row) Object.assign(row, body);
    return json(res, 200, row ? [row] : []);
  }

  if (path === '/rest/v1/department_heads' && req.method === 'DELETE') {
    const uid = (url.searchParams.get('user_id') || '').replace(/^eq\./, '');
    const before = state.heads.length;
    state.heads = state.heads.filter((h) => h.user_id !== uid);
    return json(res, 200, before === state.heads.length ? [] : [{ user_id: uid }]);
  }

  return json(res, 404, { message: `Unhandled ${req.method} ${path}` });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

// Route the fake Supabase HTTPS hostname to the in-process server.
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const raw = typeof input === 'string' ? input : input.url;
  const mapped = raw.replace('https://fake.supabase.test', base);
  return realFetch(mapped, init);
};

process.env.SUPABASE_URL = 'https://fake.supabase.test';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.VERCEL;
delete process.env.VERCEL_ENV;

const { default: handler } = await import('../api/super-admin.js');

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {},
  };
}

async function call(method, path, { token, body, headers } = {}) {
  const res = makeRes();
  const req = {
    method,
    url: path,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body,
  };
  await handler(req, res);
  return { status: res.statusCode, body: res.body };
}

let passed = 0;
let failed = 0;
function check(name, condition, details) {
  if (condition) {
    passed += 1;
    console.log(`[PASS] ${name}`);
  } else {
    failed += 1;
    console.error(`[FAIL] ${name}`);
    if (details !== undefined) console.error('       ', details);
  }
}

// ---------------------------------------------------------------------------
// 1. Identity / authorization
// ---------------------------------------------------------------------------
let r = await call('GET', '/api/super-admin?action=session');
check('unauthenticated session request is rejected with 401', r.status === 401, r);

r = await call('GET', '/api/super-admin?action=session', {
  token: 'literally-any-password',
  headers: { 'x-admin-email': 'diavlo3444@gmail.com' },
});
check('forged password + x-admin-email header cannot authenticate', r.status === 401, r);
check('forged request is not authorized', r.body?.authorized === false, r.body);

r = await call('GET', '/api/super-admin?action=session', { token: 'token-super' });
check(
  'verified super admin token is authorized as super admin',
  r.status === 200 && r.body?.authorized === true && r.body?.isSuperAdmin === true,
  r
);

r = await call('GET', '/api/super-admin?action=session', { token: 'token-admin' });
check(
  'second existing admin authenticates as admin but not super admin',
  r.status === 200 && r.body?.isAdmin === true && r.body?.isSuperAdmin === false,
  r
);

r = await call('GET', '/api/super-admin?action=session', {
  token: 'token-nonadmin',
  headers: { 'x-admin-email': 'diavlo3444@gmail.com' },
});
check('authenticated non-admin cannot escalate with an email header', r.status === 403, r);

r = await call('GET', '/api/super-admin', { token: 'token-admin' });
check('non-super-admin cannot list head accounts', r.status === 403, r);

r = await call('GET', '/api/super-admin');
check('unauthenticated caller cannot list head accounts', r.status === 401, r);

r = await call('GET', '/api/super-admin?scope=admins', { token: 'token-admin' });
check('non-super-admin cannot access admin accounts list', r.status === 403, r);

r = await call('POST', '/api/super-admin?scope=admins', {
  token: 'token-admin',
  body: { fullName: 'Unauthorized Attempt', email: 'intruder@test.org', password: 'ValidPassword123!' },
});
check('non-super-admin cannot create admin accounts', r.status === 403, r);

r = await call('GET', '/api/super-admin?scope=admins');
check('unauthenticated caller cannot access admin accounts list', r.status === 401, r);

r = await call('GET', '/api/super-admin?scope=admins', { token: 'token-super' });
check('super-admin can access admin accounts list', r.status === 200 && Array.isArray(r.body?.admins), r);

// ---------------------------------------------------------------------------
// 2. Head account creation / recoverable assignment
//    Provisioning requires the server-side service-role key (never sent to
//    the browser). Identity verification above intentionally ran without it.
// ---------------------------------------------------------------------------
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
state.headColumnsOk = false;
const usersBefore = state.users.length;

r = await call('POST', '/api/super-admin', {
  token: 'token-super',
  body: {
    fullName: 'New Head',
    email: 'new.head@westmun.org',
    inviteOnly: true,
    department: 'volunteers',
    section: 'female',
    active: true,
  },
});
check(
  'missing schema column returns the real error and a retryable userId',
  r.status === 400 &&
    r.body?.retryable === true &&
    r.body?.userId === AFFECTED &&
    String(r.body?.error).includes("'active' column"),
  r
);
check('invitation link is preserved when assignment fails', Boolean(r.body?.invitationLink), r.body);
check('no duplicate Auth user is created when assignment fails', state.users.length === usersBefore);
check('existing Auth user was reused (no new createUser call)', state.createUserCalls === 0, state);

state.headColumnsOk = true;

r = await call('POST', '/api/super-admin?action=assign', {
  token: 'token-super',
  body: {
    userId: AFFECTED,
    fullName: 'New Head',
    email: 'new.head@westmun.org',
    department: 'volunteers',
    section: 'female',
    active: true,
  },
});
check('retry assigns the existing Auth user', r.status === 200 && r.body?.success === true, r);
check(
  'assignment stores the Auth UUID in department_heads.user_id',
  state.heads.some((h) => h.user_id === AFFECTED && h.department === 'volunteers'),
  state.heads
);
check('retry did not create another Auth user', state.users.length === usersBefore, state);
check('retry did not create another head row', state.heads.filter((h) => h.user_id === AFFECTED).length === 1, state.heads);

r = await call('POST', '/api/super-admin?action=assign', {
  token: 'token-super',
  body: {
    userId: AFFECTED,
    department: 'security',
    section: 'male',
  },
});
check('retry is idempotent and updates the same row', r.status === 200, r);
check(
  'still exactly one row for the Auth user',
  state.heads.filter((h) => h.user_id === AFFECTED).length === 1,
  state.heads
);

r = await call('POST', '/api/super-admin?action=assign', {
  token: 'token-super',
  body: { userId: '99999999-9999-4999-8999-999999999999', department: 'design' },
});
check('assigning an unknown Auth user fails without creating one', r.status === 404, r);

r = await call('POST', '/api/super-admin?action=assign', {
  token: 'token-super',
  body: { userId: AFFECTED, department: 'volunteers', section: null },
});
check('gender-separated department requires a division', r.status === 400 && r.body?.code === 'SECTION_REQUIRED', r);

// ---------------------------------------------------------------------------
// 3. Existing head is never duplicated; response stays useful
// ---------------------------------------------------------------------------
const beforeExisting = state.users.length;
r = await call('POST', '/api/super-admin', {
  token: 'token-super',
  body: {
    fullName: 'New Head Updated',
    email: 'new.head@westmun.org',
    inviteOnly: true,
    department: 'volunteers',
    section: 'female',
    active: true,
  },
});
check(
  'creating an email that already exists reuses the Auth user',
  r.status === 201 && state.users.length === beforeExisting,
  { status: r.status, body: r.body, users: state.users.length }
);

r = await call('POST', '/api/super-admin?action=reset-password&id=' + AFFECTED, {
  token: 'token-super',
  body: { newPassword: 'short' },
});
check('short password reset is rejected', r.status === 400 && r.body?.code === 'WEAK_PASSWORD', r);

r = await call('PATCH', '/api/super-admin?id=' + AFFECTED, {
  token: 'token-super',
  body: { active: false },
});
check('deactivating a department-head assignment succeeds without an Auth ban', r.status === 200 && r.body?.success === true, r);
check('assignment deactivation does not change Auth ban state', !(state.authAdminUpdates || []).some((entry) => entry.uid === AFFECTED && Object.hasOwn(entry.body || {}, 'ban_duration')), state.authAdminUpdates);

r = await call('DELETE', '/api/super-admin?id=' + AFFECTED, { token: 'token-super' });
check('authorized super admin can delete a head assignment', r.status === 200 && r.body?.success === true, r);
check('deletion removes only the department_heads row', !state.heads.some((h) => h.user_id === AFFECTED), state.heads);
check('deleting a head assignment does not ban or update the Auth user', !(state.authAdminUpdates || []).some((entry) => entry.uid === AFFECTED && Object.hasOwn(entry.body || {}, 'ban_duration')), state.authAdminUpdates);
check('deleting a head assignment preserves the Auth user', state.users.some((u) => u.id === AFFECTED), state.users);
r = await call('DELETE', '/api/super-admin?id=' + AFFECTED, { token: 'token-admin' });
check('non-super-admin cannot delete a head assignment', r.status === 403, r);

// ---------------------------------------------------------------------------
// 4. Configuration fails closed
// ---------------------------------------------------------------------------
delete process.env.SUPABASE_URL;
delete process.env.VITE_SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.VITE_SUPABASE_ANON_KEY;

r = await call('GET', '/api/super-admin?action=session', {
  token: 'literally-any-password',
  headers: { 'x-admin-email': 'diavlo3444@gmail.com' },
});
check(
  'missing Supabase configuration fails closed (503), never authorizes',
  r.status === 503 && r.body?.authorized === false,
  r
);

server.close();
globalThis.fetch = realFetch;

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
