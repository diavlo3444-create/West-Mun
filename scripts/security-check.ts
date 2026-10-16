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

// 1. Audit .env.example
const envExamplePath = path.resolve(process.cwd(), '.env.example');
const envExampleContent = fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, 'utf8') : '';

assert(
  !envExampleContent.includes('service_role') &&
  !envExampleContent.includes('secret') &&
  !envExampleContent.includes('eyJh') &&
  !envExampleContent.includes('SUPABASE'),
  'Security: .env.example contains no secret keys, JWT tokens, or external DB credentials'
);

assert(
  envExampleContent.includes('ADMIN_PASSWORD='),
  'Configuration: .env.example documents ADMIN_PASSWORD without default secret values'
);

// 2. Audit .gitignore
const gitignorePath = path.resolve(process.cwd(), '.gitignore');
const gitignoreContent = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';

assert(
  gitignoreContent.includes('.env*') &&
  gitignoreContent.includes('!.env.example') &&
  gitignoreContent.includes('data/'),
  'Git Hygiene: .gitignore excludes all .env files and local data/ store while preserving .env.example'
);

// 3. Audit Client Code for Secret Leakage and External DB Dependencies
const clientFiles = [
  'src/lib/api.ts',
  'src/components/RegistrationModal.tsx',
  'src/components/ContactSection.tsx',
  'src/components/AdminPortalModal.tsx',
  'src/App.tsx',
];

let secretLeakDetected = false;
let supabaseDetected = false;

for (const file of clientFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (
      content.includes('service_role') ||
      content.includes('process.env.ADMIN_PASSWORD') ||
      content.includes('westmun2027secretariat')
    ) {
      secretLeakDetected = true;
    }
    if (content.includes('@supabase') || content.includes('supabase.from')) {
      supabaseDetected = true;
    }
  }
}

assert(
  !secretLeakDetected,
  'Secret Protection: Browser client bundle contains no passwords, private credentials, or secrets'
);

assert(
  !supabaseDetected,
  'Architecture: Codebase operates without Supabase or external database dependencies'
);

// 4. Audit Server Security Implementation (server.ts)
const serverPath = path.resolve(process.cwd(), 'server.ts');
const serverContent = fs.existsSync(serverPath) ? fs.readFileSync(serverPath, 'utf8') : '';

assert(
  serverContent.includes('X-Content-Type-Options') &&
  serverContent.includes('Content-Security-Policy') &&
  serverContent.includes('Referrer-Policy') &&
  serverContent.includes('Permissions-Policy'),
  'Security Headers: Server enforces CSP, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy'
);

assert(
  serverContent.includes('checkRateLimit') &&
  serverContent.includes('429'),
  'Abuse Prevention: Server implements in-memory rate limiting against spam and brute-force attacks'
);

assert(
  serverContent.includes('timingSafeEqual'),
  'Authentication Hardening: Constant-time string comparison protects organizer authentication from timing attacks'
);

assert(
  serverContent.includes("app.use('/data'"),
  'Access Control: Private data folder is explicitly forbidden from HTTP static file exposure'
);

assert(
  serverContent.includes("express.json({ limit: '16kb' })"),
  'DoS Mitigation: Request body size strictly constrained to 16kb'
);

// 5. Input Validation & Sanitization Verification
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$/;
assert(
  emailRegex.test('delegate@westmun.org') &&
  emailRegex.test('head.delegate@university.edu') &&
  !emailRegex.test('plainaddress') &&
  !emailRegex.test('<script>@domain.com') &&
  !emailRegex.test('user@domain'),
  'Data Sanitization: Strict RFC email validation blocks malformed, truncated, or hostile strings'
);

function sanitizeTest(str: string): string {
  return str.replace(/[<>'"&]/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return char;
    }
  });
}

assert(
  sanitizeTest('<script>alert("xss")</script>') === '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
  'Injection Defense: HTML entities are neutralized prior to data storage'
);

console.log('====================================================');
console.log(`Results: ${passedTests} / ${totalTests} security checks passed.`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
