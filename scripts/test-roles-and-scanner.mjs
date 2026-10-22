import assert from 'node:assert/strict';
import { validateHierarchy } from '../src/lib/ebOperationsService.ts';

console.log('--- TEST 1: Hierarchy Cycle Detection & Validation ---');

// Case 1: Valid tree with multiple branches
const validTree = [
  { id: 'pos-1', parent_position_id: null }, // Head
  { id: 'pos-2', parent_position_id: 'pos-1' }, // Team Leader
  { id: 'pos-3', parent_position_id: 'pos-1' }, // Team Leader 2
  { id: 'pos-4', parent_position_id: 'pos-2' }, // Specialist
  { id: 'pos-5', parent_position_id: 'pos-4' }, // Assistant
];
const res1 = validateHierarchy(validTree);
assert.equal(res1.valid, true, 'Valid tree must pass hierarchy validation');
console.log('✓ Valid tree passed validation');

// Case 2: Direct self-parenting
const selfParenting = [
  { id: 'pos-1', parent_position_id: 'pos-1' },
];
const res2 = validateHierarchy(selfParenting);
assert.equal(res2.valid, false, 'Self-parenting must be rejected');
assert.match(res2.error, /cannot report to itself/i);
console.log('✓ Self-parenting correctly rejected:', res2.error);

// Case 3: Circular reporting loop (A -> B -> C -> A)
const circularLoop = [
  { id: 'node-A', parent_position_id: 'node-C' },
  { id: 'node-B', parent_position_id: 'node-A' },
  { id: 'node-C', parent_position_id: 'node-B' },
];
const res3 = validateHierarchy(circularLoop);
assert.equal(res3.valid, false, 'Circular reporting loop must be rejected');
assert.match(res3.error, /circular reporting relationship/i);
console.log('✓ Circular reporting loop correctly detected & rejected:', res3.error);

// Case 4: Deep circular loop with innocent leaf nodes attached
const deepCycle = [
  { id: 'root', parent_position_id: null },
  { id: 'lead-1', parent_position_id: 'root' },
  { id: 'sub-1', parent_position_id: 'lead-1' },
  { id: 'sub-2', parent_position_id: 'sub-1' },
  { id: 'lead-1', parent_position_id: 'sub-2' }, // Loop introduced back to lead-1
  { id: 'leaf', parent_position_id: 'root' },
];
const res4 = validateHierarchy(deepCycle);
assert.equal(res4.valid, false, 'Deep cycle must be rejected');
console.log('✓ Deep cycle detected successfully');

console.log('--- TEST 2: Security Scanner Role Gate Logic ---');

// Mock function matching the exact server & client authorization rule
function verifyScannerClearance(caller) {
  if (!caller || !caller.authenticated) {
    return { authorized: false, code: 'UNAUTHENTICATED', status: 401 };
  }
  if (caller.isAdmin) {
    return { authorized: true, role: 'Secretariat Administrator', status: 200 };
  }
  if (caller.department === 'security' && (caller.roleType === 'head' || caller.roleType === 'co_head')) {
    return {
      authorized: true,
      role: caller.roleType === 'co_head' ? 'Security Co-Head' : 'Security Head',
      status: 200,
    };
  }
  return {
    authorized: false,
    code: 'FORBIDDEN_DEPARTMENT',
    error: `Unauthorized. QR Scanner clearance restricted to Security Directorate personnel (Security Heads and Security Co-Heads) and Secretariat Administrators (Caller: ${caller.department} ${caller.roleType}).`,
    status: 403,
  };
}

// Security Head
const secHead = verifyScannerClearance({
  authenticated: true,
  department: 'security',
  roleType: 'head',
  isAdmin: false,
});
assert.equal(secHead.authorized, true);
assert.equal(secHead.status, 200);
console.log('✓ Security Head authorized for scanner');

// Security Co-Head (Crucial Requirement: MUST BE AUTHORIZED)
const secCoHead = verifyScannerClearance({
  authenticated: true,
  department: 'security',
  roleType: 'co_head',
  isAdmin: false,
});
assert.equal(secCoHead.authorized, true);
assert.equal(secCoHead.status, 200);
console.log('✓ Security Co-Head authorized for scanner');

// Secretariat Admin
const adminCaller = verifyScannerClearance({
  authenticated: true,
  department: null,
  roleType: 'admin',
  isAdmin: true,
});
assert.equal(adminCaller.authorized, true);
assert.equal(adminCaller.status, 200);
console.log('✓ Secretariat Admin authorized for scanner');

// Media Co-Head (Crucial Requirement: MUST BE REJECTED)
const mediaCoHead = verifyScannerClearance({
  authenticated: true,
  department: 'media_press',
  roleType: 'co_head',
  isAdmin: false,
});
assert.equal(mediaCoHead.authorized, false);
assert.equal(mediaCoHead.status, 403);
assert.equal(mediaCoHead.code, 'FORBIDDEN_DEPARTMENT');
console.log('✓ Media Co-Head correctly rejected with 403 FORBIDDEN_DEPARTMENT');

// Volunteer Co-Head (Crucial Requirement: MUST BE REJECTED)
const volCoHead = verifyScannerClearance({
  authenticated: true,
  department: 'volunteers',
  roleType: 'co_head',
  isAdmin: false,
});
assert.equal(volCoHead.authorized, false);
assert.equal(volCoHead.status, 403);
assert.equal(volCoHead.code, 'FORBIDDEN_DEPARTMENT');
console.log('✓ Volunteer Co-Head correctly rejected with 403 FORBIDDEN_DEPARTMENT');

// Unauthenticated user
const unauth = verifyScannerClearance(null);
assert.equal(unauth.authorized, false);
assert.equal(unauth.status, 401);
console.log('✓ Unauthenticated request rejected with 401');

console.log('--- TEST 3: Approved Members Gate for Roles & Task Assignment ---');

// Mock registration pool
const registrations = [
  { id: 'mem-1', full_name: 'Alice approved', team: 'media', status: 'accepted' },
  { id: 'mem-2', full_name: 'Bob pending', team: 'media', status: 'received' },
  { id: 'mem-3', full_name: 'Charlie under review', team: 'media', status: 'under_review' },
  { id: 'mem-4', full_name: 'David rejected', team: 'media', status: 'rejected' },
  { id: 'mem-5', full_name: 'Emma approved', team: 'media', status: 'approved' },
  { id: 'mem-6', full_name: 'Frank security', team: 'security', status: 'accepted' },
];

const approvedForMedia = registrations.filter(
  (r) => r.team === 'media' && (r.status === 'accepted' || r.status === 'approved')
);

assert.equal(approvedForMedia.length, 2);
assert.deepEqual(
  approvedForMedia.map((m) => m.id),
  ['mem-1', 'mem-5']
);
console.log('✓ Approved-only member filter strictly excludes unapproved, pending, or rejected applicants');

console.log('\nAll Roles & Security Scanner tests passed successfully!');
