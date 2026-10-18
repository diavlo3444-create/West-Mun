import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('WEST MUN — Security & Hardening Verification Audit');
console.log('====================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
    if (failureDetails) console.error(`       -> ${failureDetails}`);
  }
}

function read(file: string): string {
  const fullPath = path.resolve(process.cwd(), file);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

// 1. Environment documentation and secret hygiene
const envExample = read('.env.example');
assert(
  envExample.includes('VITE_SUPABASE_URL=') &&
    envExample.includes('VITE_SUPABASE_ANON_KEY=') &&
    envExample.includes('SUPABASE_SERVICE_ROLE_KEY='),
  'Configuration: .env.example documents the public anon key and the server-only service role key'
);
assert(
  !/eyJ[A-Za-z0-9_-]{20,}/.test(envExample) && !/sb_secret_[A-Za-z0-9_-]{10,}/.test(envExample),
  'Secret Protection: .env.example contains no JWT/token values'
);

const gitignore = read('.gitignore');
assert(
  gitignore.includes('.env*') && gitignore.includes('!.env.example') && gitignore.includes('data/'),
  'Git Hygiene: .gitignore excludes .env files and local data while preserving .env.example'
);

// 2. Client bundle must never reference the service-role key or trust headers
const clientFiles = [
  'src/admin/AdminApp.tsx',
  'src/admin/SuperAdminManager.tsx',
  'src/head/HeadLogin.tsx',
  'src/head/departments.ts',
  'src/lib/supabase.ts',
];
const clientSource = clientFiles.map(read).join('\n');

assert(
  !clientSource.includes('SERVICE_ROLE_KEY') &&
    !/process\.env\.SUPABASE_(SERVICE|SECRET)/.test(clientSource),
  'Secret Protection: Browser sources never read the service-role key'
);
assert(
  !clientSource.includes('x-admin-email') && !clientSource.includes('x-user-email'),
  'Identity: Browser code does not send self-declared admin identity headers'
);
assert(
  !clientSource.includes('masterkey') &&
    !/Authorization:\s*`Bearer \$\{password/.test(clientSource),
  'Authentication: No password-as-token fallback or default master password in the client'
);
{
  const adminApp = read('src/admin/AdminApp.tsx');
  assert(
    adminApp.includes('signInWithPassword') && adminApp.includes('action=session'),
    'Authentication: Admin login uses Supabase Auth and a server-side session check'
  );
  assert(
    !adminApp.includes('super-admin?action=verify'),
    'Authentication: The old email-header verification path is gone from AdminApp'
  );
}

// 3. Server-side authorization invariants
const serverHandler = read('src/server/superAdminHandler.ts');
assert(
  serverHandler.includes('auth/v1/user') && serverHandler.includes('isRegisteredAdmin'),
  'Authorization: Bearer tokens are verified with Supabase Auth and public.admins'
);
assert(
  !serverHandler.includes("customHeaders?.['x-admin-email']") &&
    !serverHandler.includes('isMasterKeyMatch'),
  'Authorization: No client-supplied email or master-key authorization path remains'
);
assert(
  !serverHandler.includes("process.env.ADMIN_PASSWORD || 'masterkey'"),
  'Authorization: No hardcoded fallback admin password'
);
assert(
  serverHandler.includes('onConflict: \'user_id\'') && serverHandler.includes('writeHeadAssignment'),
  'Head Provisioning: Assignments are idempotent upserts keyed on the Auth user_id'
);

const headAuth = read('serverless/head-auth.ts');
assert(
  headAuth.includes('USE_SUPABASE_AUTH') && headAuth.includes('VERCEL'),
  'Head Authentication: File-backed login is disabled on hosted deployments'
);

const headStore = read('src/server/headStore.ts');
assert(
  !headStore.includes('WestMun2027!'),
  'Head Authentication: Seed records no longer use predictable default passwords'
);

// 4. Deployment configuration
const vercelConfig = read('vercel.json');
assert(
  vercelConfig.includes('Content-Security-Policy') &&
    vercelConfig.includes('X-Content-Type-Options') &&
    vercelConfig.includes('Referrer-Policy') &&
    vercelConfig.includes('Permissions-Policy'),
  'Security Headers: Vercel enforces CSP, nosniff, Referrer-Policy and Permissions-Policy'
);
assert(
  !vercelConfig.includes('includeFiles'),
  'Deployment: Handlers are bundled instead of relying on cross-directory includeFiles'
);

// 5. Local API input validation (legacy local-only routes)
const localRoutes = read('api/local-routes.ts');
assert(
  localRoutes.includes('isValidEmail') && localRoutes.includes('sanitizeInput'),
  'Input Validation: Local routes validate emails and sanitize text input'
);
assert(
  localRoutes.includes('timingSafeEqual'),
  'Authentication Hardening: Local password comparison is constant-time'
);

console.log('====================================================');
console.log(`Results: ${passedTests} / ${totalTests} security checks passed.`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
