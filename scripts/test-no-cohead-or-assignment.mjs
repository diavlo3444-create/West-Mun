import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function read(rel) {
  return fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
}

console.log('====================================================');
console.log('WEST MUN — Co-Head & Assignment Removal Verification');
console.log('====================================================');

const dashboardCode = read('src/head/DepartmentDashboard.tsx');

// Check 1: Nav items do not contain cohead-management or department
assert(
  !dashboardCode.includes("id: 'cohead-management'"),
  'FAIL: DepartmentDashboard contains id: "cohead-management" in nav items'
);
console.log('[PASS] Co-Head Management sidebar/nav item is completely removed');

assert(
  !dashboardCode.includes("id: 'department'"),
  'FAIL: DepartmentDashboard contains id: "department" in nav items'
);
console.log('[PASS] Assignment sidebar/nav item is completely removed');

// Check 2: HeadCoHeadManagement and HeadDepartment are not rendered
assert(
  !dashboardCode.includes('<HeadCoHeadManagement'),
  'FAIL: DepartmentDashboard still renders HeadCoHeadManagement'
);
console.log('[PASS] HeadCoHeadManagement component render is completely removed');

assert(
  !dashboardCode.includes('<HeadDepartment'),
  'FAIL: DepartmentDashboard still renders HeadDepartment'
);
console.log('[PASS] HeadDepartment component render is completely removed');

// Check 3: Overview co-heads card is removed
assert(
  !dashboardCode.includes('Your Co-Head'),
  'FAIL: Overview still contains "Your Co-Head" card'
);
console.log('[PASS] "Your Co-Head" dashboard card is completely removed');

// Check 4: HeadView type does not declare cohead-management or department
assert(
  !dashboardCode.includes("'cohead-management'"),
  'FAIL: HeadView type or state still contains "cohead-management"'
);
console.log('[PASS] HeadView type does not contain "cohead-management"');

// Check 5: View label does not contain Co-Head Management or Assignment
assert(
  !dashboardCode.includes("'Co-Head Management'"),
  'FAIL: viewLabel or UI strings still contain "Co-Head Management"'
);
console.log('[PASS] viewLabel does not contain "Co-Head Management"');

// Check 6: Admin functionality is preserved
const adminSuperManager = read('src/admin/SuperAdminManager.tsx');
assert(
  adminSuperManager.includes('super-admin') && adminSuperManager.includes('department_heads'),
  'FAIL: Admin dashboard SuperAdminManager was unexpectedly altered'
);
console.log('[PASS] Admin SuperAdminManager functionality is fully preserved');

// Check 7: QR pass and security scanner remain intact
assert(
  dashboardCode.includes("id: 'qr-pass'") && dashboardCode.includes("id: 'security-website'"),
  'FAIL: QR pass or security scanner was inadvertently modified'
);
console.log('[PASS] QR pass and security scanner remain fully functional');

console.log('====================================================');
console.log('Results: All Co-Head & Assignment removal tests PASSED!');
console.log('====================================================');
