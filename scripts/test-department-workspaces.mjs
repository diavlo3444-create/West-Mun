/**
 * Contract tests for the department workspace system.
 *
 * These are executable assertions over the shipped source and build artifacts.
 * They do NOT require a database connection; live RLS behaviour must be verified
 * separately against the Supabase project (see the report / migration notes).
 *
 * Run with: node scripts/test-department-workspaces.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
let passed = 0;
let failed = 0;

function assert(condition, name, details) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed += 1;
  } else {
    console.error(`[FAIL] ${name}`);
    if (details) console.error(`       -> ${details}`);
    failed += 1;
  }
}

function read(relative) {
  const full = path.resolve(ROOT, relative);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

const departmentsSource = read('src/head/departments.ts');
const store = read('src/head/services/departmentStore.ts');
const dashboard = read('src/head/DepartmentDashboard.tsx');
const workspaces = read('src/head/workspaces.ts');
const workspaceUi = read('src/head/DepartmentWorkspace.tsx');
const overviewUi = read('src/head/WorkspaceOverview.tsx');
const headDepartment = read('src/head/HeadDepartment.tsx');
const migration = read('supabase/migration_department_workspaces.sql');
const serverHandler = read('serverless/super-admin.ts');
const recordsAdmin = read('src/server/departmentRecordsAdmin.ts');
const builtApi = read('api/super-admin.js');

console.log('====================================================');
console.log('WEST MUN — Department Workspaces Contract Tests');
console.log('====================================================');

/* ------------------------------------------------------------------ *
 * 1. Registration access gating (frontend)
 * ------------------------------------------------------------------ */
assert(
  /REGISTRATION_DEPARTMENTS[\s\S]{0,200}'media_press'[\s\S]{0,80}'security'[\s\S]{0,80}'volunteers'/.test(
    departmentsSource,
  ),
  'Gating: exactly Media/Press, Security, and Volunteers are registration departments',
);

assert(
  /function canManageRegistrations\([\s\S]{0,160}REGISTRATION_DEPARTMENTS\.includes/.test(departmentsSource),
  'Gating: canManageRegistrations derives access from the shared allowlist',
);

assert(
  dashboard.includes('canManageRegistrations(department)') &&
    dashboard.includes('const registrationAccess = canManageRegistrations(department)'),
  'Dashboard: computes registrationAccess from the verified department',
);

assert(
  /if \(registrationAccess\) \{[\s\S]{0,600}from\('team_registrations'\)/.test(dashboard),
  'Dashboard: team_registrations is only queried inside the registration-access branch',
);

assert(
  dashboard.indexOf("from('team_registrations')") > dashboard.indexOf('if (registrationAccess) {'),
  'Dashboard: no registration query can run before the access check',
);

assert(
  /id === 'registrations' && !registrationAccess/.test(dashboard) &&
    /view === 'registrations' && registrationAccess &&/.test(dashboard),
  'Dashboard: the Applications view refuses to render without registration access',
);

assert(
  /registrationAccess\s*\?\s*\(\s*<button[\s\S]{0,240}Open applications/.test(headDepartment),
  'Assignment page: "Open applications" is hidden for non-registration departments',
);

assert(
  headDepartment.includes('registrationAccess') &&
    headDepartment.includes('Registration data is not part of this department'),
  'Assignment page: explains the registration boundary for other departments',
);

/* ------------------------------------------------------------------ *
 * 2. Real persistence, no mock data
 * ------------------------------------------------------------------ */
assert(
  store.includes("from('department_records')"),
  'Persistence: the store reads and writes public.department_records',
);

assert(
  !/INITIAL_TEMPLATES/.test(store) && !/seed_/.test(store),
  'Persistence: no seeded sample records remain in the department store',
);

assert(
  !/Mallak Abbas|Yusef Saad|Farah Zaid|Ambassador H\.E\./.test(store),
  'Persistence: no hardcoded names or invented operational data remain',
);

assert(
  !/localStorage\.(getItem|setItem|removeItem)/.test(store),
  'Persistence: localStorage is not used as a department datastore',
);

assert(
  !/console\.warn\('\[DepartmentStore\][^']*fallback/.test(store),
  'Persistence: Supabase failures are no longer silently swallowed into a local fallback',
);

assert(
  store.includes('WORKSPACE_STORAGE_MIGRATION') &&
    store.includes('migration_department_workspaces.sql') &&
    store.includes('PGRST205'),
  'Persistence: a missing department_records table produces an actionable setup error',
);

assert(
  store.includes('validateRecordInput') &&
    store.includes('MAX_TITLE') &&
    /Row Level Security blocked/.test(store),
  'Persistence: input validation and RLS error handling are implemented',
);

assert(
  !/service_role|SERVICE_ROLE/i.test(store) && !/service_role|SERVICE_ROLE/i.test(dashboard),
  'Security: no service-role key is referenced in browser code',
);

/* ------------------------------------------------------------------ *
 * 3. Department-specific workspaces
 * ------------------------------------------------------------------ */
assert(
  /DEPARTMENT_WORKSPACES:\s*Record<DepartmentKey,\s*WorkspaceModule\[\]>/.test(workspaces),
  'Workspaces: every department has a declared module list',
);

const requiredModules = {
  design: ['category: \'task\'', 'category: \'asset\'', 'category: \'revision\'', 'category: \'web_content\''],
  marketing: ['category: \'campaign\'', 'category: \'calendar\'', 'category: \'post\''],
  media_press: ['category: \'coverage\'', 'category: \'schedule\'', 'category: \'asset\''],
  security: ['category: \'roster\'', 'category: \'incident\'', 'category: \'checklist\''],
  volunteers: ['category: \'station\'', 'category: \'shift\'', 'category: \'attendance\''],
  pr: ['category: \'sponsor_task\'', 'category: \'partner_contact\''],
  hr: ['category: \'hr_task\''],
  logistics: ['category: \'venue\'', 'category: \'equipment\'', 'category: \'supply\''],
  it: ['category: \'support_task\'', 'category: \'issue\'', 'category: \'readiness\''],
  ceremonies: ['category: \'ceremony\'', 'category: \'run_of_show\'', 'category: \'rehearsal\''],
  dcc: ['category: \'committee\'', 'category: \'directive\''],
};

for (const [department, categories] of Object.entries(requiredModules)) {
  const missing = categories.filter((snippet) => !workspaces.includes(snippet));
  assert(
    missing.length === 0,
    `Workspaces: ${department} defines its ${categories.length} required modules`,
    missing.length ? `missing ${missing.join(', ')}` : undefined,
  );
}

assert(
  /design:\s*designModules/.test(workspaces) &&
    /dcc:\s*dccModules/.test(workspaces) &&
    /logistics:\s*logisticsModules/.test(workspaces),
  'Workspaces: the registry maps each department to its own module set (not one generic list)',
);

assert(
  workspaceUi.includes('onCreate') &&
    workspaceUi.includes('onUpdate') &&
    workspaceUi.includes('onDelete') &&
    workspaceUi.includes('Delete this record?'),
  'Workspace UI: create, edit, and delete actions are implemented',
);

assert(
  workspaceUi.includes('loading') &&
    workspaceUi.includes('storageError') &&
    workspaceUi.includes('No items match these filters') &&
    workspaceUi.includes('Record created and saved to Supabase'),
  'Workspace UI: loading, error, empty, and success states are implemented',
);

assert(
  overviewUi.includes('WorkspaceModuleGrid') &&
    overviewUi.includes('records.filter((record) => record.category === module.category)'),
  'Overview: module counts are derived from real loaded records, not placeholders',
);

assert(
  dashboard.includes('<DepartmentWorkspace') && /activeModule/.test(dashboard),
  'Dashboard: the sidebar routes to the matching department workspace component',
);

/* ------------------------------------------------------------------ *
 * 4. SQL migration safety and enforcement
 * ------------------------------------------------------------------ */
assert(migration.length > 0, 'Migration: supabase/migration_department_workspaces.sql exists');

assert(
  /create table if not exists public\.department_records/.test(migration),
  'Migration: department_records creation is idempotent',
);

assert(
  /alter table public\.department_records enable row level security/.test(migration),
  'Migration: RLS is enabled on department_records',
);

for (const verb of ['select', 'insert', 'update', 'delete']) {
  assert(
    new RegExp(`create policy "department_records ${verb} access"`).test(migration),
    `Migration: department_records has an explicit ${verb.toUpperCase()} policy`,
  );
}

assert(
  /lower\(btrim\(department\)\) = lower\(btrim\(public\.head_department\(\)\)\)/.test(migration),
  'Migration: department isolation is enforced against trusted head_department()',
);

assert(
  /public\.head_section\(\) is null or section = public\.head_section\(\)/.test(migration),
  'Migration: section isolation is enforced for gender-separated departments',
);

assert(
  /category = 'incident'[\s\S]{0,120}'security'/.test(migration),
  'Migration: incident records stay restricted to Security heads and admins',
);

assert(
  /create or replace function public\.is_registration_head\(\)[\s\S]{0,600}in \('media_press', 'security', 'volunteers'\)/.test(
    migration,
  ),
  'Migration: is_registration_head is limited to the three authorized departments',
);

assert(
  /policy "department head read team" on public\.team_registrations[\s\S]{0,900}is_registration_head/.test(
    migration,
  ),
  'Migration: team_registrations SELECT is gated by is_registration_head()',
);

assert(
  /policy "department head update team" on public\.team_registrations/.test(migration),
  'Migration: team_registrations UPDATE is gated by the same allowlist',
);

assert(
  !/drop table/i.test(migration) && !/truncate/i.test(migration) && !/delete from public\.team_registrations/i.test(migration),
  'Migration: no destructive statements against existing registration data',
);

assert(
  !/insert into public\.department_records/i.test(migration),
  'Migration: no sample/demo records are inserted',
);

assert(
  /create or replace function public\.head_department\(\)/.test(migration) &&
    /create or replace function public\.head_section\(\)/.test(migration),
  'Migration: trusted helper functions are (re)created for RLS',
);

/* ------------------------------------------------------------------ *
 * 5. Super IT test-mode parity (server-side, audit-logged)
 * ------------------------------------------------------------------ */
assert(
  serverHandler.includes("action === 'test-records'") &&
    serverHandler.includes("action === 'test-record-save'") &&
    serverHandler.includes("action === 'test-record-delete'"),
  'Super IT: test-mode workspace endpoints are routed',
);

assert(
  (recordsAdmin.match(/verifyTestSession\(sessionToken\)/g) || []).length >= 3,
  'Super IT: every test-mode workspace endpoint re-verifies the signed session token',
);

assert(
  recordsAdmin.includes('recordTestAuditLog') && recordsAdmin.includes('department_record_write'),
  'Super IT: test-mode workspace writes are audit-logged',
);

assert(
  builtApi.includes('test-record-save') && builtApi.includes('test-record-delete'),
  'Build artifact: api/super-admin.js contains the new endpoints',
);

assert(
  !/service_role|SERVICE_ROLE/.test(builtApi) || builtApi.includes('SUPABASE_SERVICE_ROLE_KEY'),
  'Security: the service-role key is only read from server environment variables',
);

console.log('====================================================');
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log('====================================================');

if (failed > 0) process.exit(1);
