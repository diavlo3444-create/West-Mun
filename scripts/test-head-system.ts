import { HeadStore } from '../src/server/headStore.ts';
import {
  verifySuperAdminCaller,
  handleCreateHeadAccount,
  handleListHeads,
  handleUpdateHead,
  handleResetPassword,
  handleDeleteHead,
  SUPER_ADMIN_EMAIL,
} from '../src/server/superAdminHandler.ts';

console.log('========================================================');
console.log('WEST MUN — Standalone Head Management & Auth Test Suite');
console.log('========================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
    passed++;
  } else {
    console.error(`[FAIL] ${desc}`);
    if (detail) console.error(`       -> ${detail}`);
    failed++;
  }
}

async function runTests() {
  // 1. Initial Seeding Verification
  const initialHeads = HeadStore.getAll();
  assert(
    initialHeads.length >= 17,
    `Initial Roster: Pre-seeded with ${initialHeads.length} official department heads (expected >= 17)`
  );

  const designHead = initialHeads.find((h) => h.department === 'design');
  assert(
    Boolean(designHead && designHead.head_name && designHead.email),
    'Initial Roster: Contains valid Head of Design & Visual Identity record'
  );

  // 2. Super Admin Authorization Protection
  const rejectUnauth = await verifySuperAdminCaller('Bearer invalid-token');
  assert(
    !rejectUnauth.authorized && rejectUnauth.statusCode === 403,
    'Security: Unauthorized caller rejected with 403'
  );

  const authSuperAdmin = await verifySuperAdminCaller('Bearer masterkey', {
    'x-admin-email': SUPER_ADMIN_EMAIL,
  });
  assert(
    authSuperAdmin.authorized && authSuperAdmin.user?.email === SUPER_ADMIN_EMAIL,
    `Security: Authorized ${SUPER_ADMIN_EMAIL} verified as IT Super Admin`
  );

  // 3. Create New Head Account via Super Admin Handler
  const testEmail = `test.head.${Date.now()}@westmun.org`;
  const createResult = await handleCreateHeadAccount(
    'Bearer masterkey',
    {
      fullName: 'Dr. Test Head',
      email: testEmail,
      password: 'StrongSecretPassword2027!',
      department: 'security',
      section: 'female',
      active: true,
    },
    { 'x-admin-email': SUPER_ADMIN_EMAIL }
  );

  assert(
    createResult.statusCode === 201 && createResult.body.success,
    'Super Admin: Provisioned new female Security department head account'
  );

  const newHeadId = (createResult.body as any).head.id;

  // 4. Duplicate Email Rejection
  const dupResult = await handleCreateHeadAccount(
    'Bearer masterkey',
    {
      fullName: 'Duplicate Head',
      email: testEmail,
      password: 'AnotherPassword2027!',
      department: 'marketing',
    },
    { 'x-admin-email': SUPER_ADMIN_EMAIL }
  );

  assert(
    dupResult.statusCode === 400 && String(dupResult.body.error).includes('already exists'),
    'Validation: Duplicate email registration blocked with clear error message'
  );

  // 5. Gender Division Validation
  const invalidGenderResult = await handleCreateHeadAccount(
    'Bearer masterkey',
    {
      fullName: 'Invalid Section Head',
      email: `invalid.sec.${Date.now()}@westmun.org`,
      password: 'ValidPassword123!',
      department: 'volunteers',
      // missing required section for volunteers
    },
    { 'x-admin-email': SUPER_ADMIN_EMAIL }
  );

  assert(
    invalidGenderResult.statusCode === 400 && String(invalidGenderResult.body.error).includes('division'),
    'Validation: Enforced gender section requirement for Volunteers/Media/Security'
  );

  // 6. Department Head Authentication
  const authBadPass = HeadStore.authenticate(testEmail, 'WrongPassword123');
  assert(
    !authBadPass.success && authBadPass.status === 401,
    'Authentication: Incorrect password rejected with 401'
  );

  const authSuccess = HeadStore.authenticate(testEmail, 'StrongSecretPassword2027!');
  assert(
    authSuccess.success && Boolean(authSuccess.token) && authSuccess.head?.department === 'security',
    'Authentication: Valid credentials authenticated with 256-bit cryptographically secure session token'
  );

  const sessionToken = authSuccess.token!;
  const sessionCheck = HeadStore.verifySession(sessionToken);
  assert(
    Boolean(sessionCheck && sessionCheck.email === testEmail && sessionCheck.section === 'female'),
    'Session Verification: Verified active session token and department scope'
  );

  // 7. Deactivation / Suspension
  const deactResult = await handleUpdateHead(
    'Bearer masterkey',
    newHeadId,
    { active: false },
    { 'x-admin-email': SUPER_ADMIN_EMAIL }
  );

  assert(
    deactResult.statusCode === 200 && (deactResult.body as any).head.active === false,
    'Super Admin: Successfully deactivated department head portal access'
  );

  const authSuspended = HeadStore.authenticate(testEmail, 'StrongSecretPassword2027!');
  assert(
    !authSuspended.success && authSuspended.status === 403,
    'Access Control: Suspended/inactive head cannot sign in (403 Forbidden)'
  );

  // 8. Re-activation
  await handleUpdateHead(
    'Bearer masterkey',
    newHeadId,
    { active: true },
    { 'x-admin-email': SUPER_ADMIN_EMAIL }
  );

  // 9. Password Reset via Invitation / Recovery Link
  const resetLinkResult = await handleResetPassword(
    'Bearer masterkey',
    newHeadId,
    { generateLink: true, email: testEmail },
    { 'x-admin-email': SUPER_ADMIN_EMAIL },
    'https://west-mun.vercel.app'
  );

  assert(
    resetLinkResult.statusCode === 200 && Boolean((resetLinkResult.body as any).actionLink),
    'Super Admin: Generated secure password reset / activation link'
  );

  const actionLink = (resetLinkResult.body as any).actionLink;
  const resetToken = new URL(actionLink).searchParams.get('resetToken')!;

  const resetExec = HeadStore.resetWithToken(resetToken, 'BrandNewPassword2027!');
  assert(
    Boolean(resetExec),
    'Password Reset: Head successfully activated new password using one-time token'
  );

  const authNewPass = HeadStore.authenticate(testEmail, 'BrandNewPassword2027!');
  assert(
    authNewPass.success && Boolean(authNewPass.token),
    'Authentication: Successfully authenticated with updated password'
  );

  // 10. Deletion / Revocation
  const deleteResult = await handleDeleteHead(
    'Bearer masterkey',
    newHeadId,
    { 'x-admin-email': SUPER_ADMIN_EMAIL }
  );

  assert(
    deleteResult.statusCode === 200,
    'Super Admin: Revoked and deleted test department head account'
  );

  const postDeleteAuth = HeadStore.authenticate(testEmail, 'BrandNewPassword2027!');
  assert(
    !postDeleteAuth.success,
    'Access Control: Revoked account can no longer authenticate'
  );

  console.log('\n========================================================');
  console.log(`Test Results: ${passed} passed, ${failed} failed.`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
