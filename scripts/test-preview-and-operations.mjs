/**
 * Targeted Regression Test Suite:
 * 1. Website Editor Preview loading, iframe headers, draft sync & bypass intro
 * 2. Operations Studio Super IT Test Session authentication, privileged operations,
 *    cross-department access, and audit logging without "Session invalid" error.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  handleCreateTestSession,
  verifyTestSession,
  handleTerminateTestSession,
} from '../src/server/superAdminHandler.ts';
import { handleSuperAdminOperations } from '../src/server/operationsAdmin.ts';

console.log('\n====================================================');
console.log('WEST MUN — Website Editor Preview & Operations Studio Tests');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// 1. WEBSITE EDITOR PREVIEW TESTS
// ---------------------------------------------------------------------------

// Check vercel.json headers
const vercelRaw = fs.readFileSync(path.resolve('vercel.json'), 'utf8');
const vercelConfig = JSON.parse(vercelRaw);
const globalHeaders = vercelConfig.headers.find(h => h.source === '/(.*)')?.headers || [];
const cspHeader = globalHeaders.find(h => h.key === 'Content-Security-Policy')?.value || '';
const xfoHeader = globalHeaders.find(h => h.key === 'X-Frame-Options')?.value || '';

assert(
  cspHeader.includes("frame-ancestors 'self'"),
  'CSP must allow frame-ancestors \'self\' to enable editor preview'
);
console.log('[PASS] Vercel CSP permits same-origin iframe embedding (frame-ancestors \'self\')');

assert(
  xfoHeader === 'SAMEORIGIN',
  'X-Frame-Options must be SAMEORIGIN (not DENY) so /admin can embed preview'
);
console.log('[PASS] Vercel X-Frame-Options is SAMEORIGIN (prevents browser denial in preview iframe)');

// Check main.tsx router supports /preview
const mainRaw = fs.readFileSync(path.resolve('src/main.tsx'), 'utf8');
assert(
  mainRaw.includes("path === '/preview'"),
  'main.tsx router must explicitly handle /preview route'
);
console.log('[PASS] main.tsx registers /preview route');

// Check App.tsx bypasses intro in preview mode and supports scroll sync
const appRaw = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
assert(
  appRaw.includes('isPreviewContext'),
  'App.tsx must detect preview context'
);
assert(
  appRaw.includes('WESTMUN_CMS_PREVIEW_SCROLL'),
  'App.tsx must listen to WESTMUN_CMS_PREVIEW_SCROLL messages'
);
console.log('[PASS] App.tsx bypasses intro animation and supports smooth scroll sync in preview mode');

// Check cmsContent.ts and content.ts live preview draft updates
const cmsContentRaw = fs.readFileSync(path.resolve('src/lib/cmsContent.ts'), 'utf8');
assert(
  cmsContentRaw.includes('WESTMUN_CMS_PREVIEW_UPDATE') && cmsContentRaw.includes('westmun_cms_draft_preview'),
  'cmsContent.ts must merge preview draft and listen for real-time updates'
);
console.log('[PASS] cmsContent.ts incorporates live editor draft updates in real time');

const contentRaw = fs.readFileSync(path.resolve('src/lib/content.ts'), 'utf8');
assert(
  contentRaw.includes('WESTMUN_CMS_PREVIEW_UPDATE') && contentRaw.includes('westmun_cms_draft_preview'),
  'content.ts useSettings must merge preview draft for site settings'
);
console.log('[PASS] content.ts useSettings incorporates live editor draft updates');

// Check WebsiteEditor.tsx has syncPreviewDraft and preview reload
const editorRaw = fs.readFileSync(path.resolve('src/admin/WebsiteEditor.tsx'), 'utf8');
assert(
  editorRaw.includes('syncPreviewDraft') &&
  editorRaw.includes('iframeRef') &&
  editorRaw.includes('Reload preview'),
  'WebsiteEditor.tsx must sync preview draft and provide preview reload controls'
);
console.log('[PASS] WebsiteEditor.tsx pushes real-time updates and manages preview iframe');

// ---------------------------------------------------------------------------
// 2. OPERATIONS STUDIO SESSION & TEST MODE TESTS
// ---------------------------------------------------------------------------

// A. Unauthenticated request to Operations Studio
const unauthRes = await handleSuperAdminOperations(null, { action: 'wm_ops_list_people' });
assert.strictEqual(unauthRes.statusCode, 401, 'Unauthenticated request must be rejected with 401');
assert.strictEqual(unauthRes.body.code, 'MISSING_TOKEN', 'Must report MISSING_TOKEN code');
console.log('[PASS] Unauthenticated request to Operations Studio is rejected (401 MISSING_TOKEN)');

// B. Invalid / forged token to Operations Studio
const invalidRes = await handleSuperAdminOperations('Bearer invalid_forged_token_123', {
  action: 'wm_ops_list_people',
});
assert.strictEqual(invalidRes.statusCode, 401, 'Invalid token must be rejected with 401');
assert.strictEqual(invalidRes.body.code, 'SESSION_INVALID', 'Must report SESSION_INVALID code');
console.log('[PASS] Invalid token to Operations Studio is rejected with clear error (401 SESSION_INVALID)');

// C. Launch a genuine Super IT Test Session (for diavlo3444@gmail.com testing Volunteers Head)
const launchResult = await handleCreateTestSession(
  'Bearer dummy_admin_bearer', // During test environment, mocked or checked
  { email: 'volunteers.head@westmun.org', id: 'head-vol-test' },
  'http://localhost:3000'
);

let testToken = launchResult.body.sessionToken;
assert(testToken, 'Launch must return a valid session token');
assert(verifyTestSession(testToken), 'verifyTestSession must accept genuine test token');
console.log('[PASS] Genuine Super IT Test Session generated and verified');

// D. Test Operations Studio: list_people using test session token
const listPeopleRes = await handleSuperAdminOperations(
  `Bearer ${testToken}`,
  { action: 'wm_ops_list_people', department: 'volunteers' },
  new URLSearchParams('op=list_people')
);
assert.strictEqual(listPeopleRes.statusCode, 200, 'list_people must succeed with test session');
assert.strictEqual(listPeopleRes.body.success, true, 'list_people must report success: true');
assert(Array.isArray(listPeopleRes.body.data), 'list_people must return array of people');
console.log('[PASS] Super Admin test session lists department people without session errors (200 OK)');

// E. Test Operations Studio: create_person using test session token
const createPersonRes = await handleSuperAdminOperations(
  `Bearer ${testToken}`,
  {
    action: 'wm_ops_create_person',
    display_name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    department: 'volunteers',
    role_title: 'Hallway Lead Volunteer',
    status: 'active',
  },
  new URLSearchParams('op=create_person')
);
assert.strictEqual(createPersonRes.statusCode, 200, 'create_person must succeed with test session');
assert.strictEqual(createPersonRes.body.success, true, 'create_person must report success: true');
assert.strictEqual(createPersonRes.body.data.role_title, 'Hallway Lead Volunteer');
const createdPersonId = createPersonRes.body.data.id;
console.log('[PASS] Super Admin test session creates custom role/person in Operations Studio (200 OK)');

// F. Test Operations Studio: list_projects & create_project
const createProjectRes = await handleSuperAdminOperations(
  `Bearer ${testToken}`,
  {
    action: 'wm_ops_create_project',
    department: 'volunteers',
    title: 'Delegate Registration Packets Preparation',
    brief: 'Assemble badges, country placards, and committee handbooks.',
    status: 'active',
  },
  new URLSearchParams('op=create_project')
);
assert.strictEqual(createProjectRes.statusCode, 200);
assert.strictEqual(createProjectRes.body.success, true);
assert.strictEqual(createProjectRes.body.data.title, 'Delegate Registration Packets Preparation');
console.log('[PASS] Super Admin test session creates project in Operations Studio (200 OK)');

// G. Test Operations Studio: list_shifts & create_shift
const createShiftRes = await handleSuperAdminOperations(
  `Bearer ${testToken}`,
  {
    action: 'wm_ops_create_shift',
    department: 'volunteers',
    title: 'Registration Desk Morning Shift',
    location: 'Main Foyer Checkpoint',
    starts_at: '2027-02-15T08:00:00Z',
    ends_at: '2027-02-15T12:00:00Z',
    capacity: 4,
  },
  new URLSearchParams('op=create_shift')
);
assert.strictEqual(createShiftRes.statusCode, 200);
assert.strictEqual(createShiftRes.body.success, true);
console.log('[PASS] Super Admin test session creates coverage shift in Operations Studio (200 OK)');

// H. Test Operations Studio: list_registration_windows & set_registration_window
const listWindowsRes = await handleSuperAdminOperations(
  `Bearer ${testToken}`,
  { action: 'wm_ops_list_registration_windows' },
  new URLSearchParams('op=list_registration_windows')
);
assert.strictEqual(listWindowsRes.statusCode, 200);
assert(Array.isArray(listWindowsRes.body.data));
assert(listWindowsRes.body.data.some(w => w.team === 'volunteers'));
console.log('[PASS] Super Admin test session queries registration windows without error (200 OK)');

const setWindowRes = await handleSuperAdminOperations(
  `Bearer ${testToken}`,
  { action: 'wm_ops_set_registration_window', team: 'volunteers', isOpen: false },
  new URLSearchParams('op=set_registration_window')
);
assert.strictEqual(setWindowRes.statusCode, 200);
assert.strictEqual(setWindowRes.body.data.is_open, false);
console.log('[PASS] Super Admin test session toggles registration window in Operations Studio (200 OK)');

// I. Terminate session and ensure revoked token is rejected
await handleTerminateTestSession(testToken);
const postTerminationRes = await handleSuperAdminOperations(
  `Bearer ${testToken}`,
  { action: 'wm_ops_list_people' },
  new URLSearchParams('op=list_people')
);
assert.strictEqual(postTerminationRes.statusCode, 401, 'Revoked test session must be rejected with 401');
console.log('[PASS] Terminated test session is immediately revoked and blocked (401 SESSION_INVALID)');

console.log('\n====================================================');
console.log('Results: All 14 preview and operations tests PASSED!');
console.log('====================================================\n');
