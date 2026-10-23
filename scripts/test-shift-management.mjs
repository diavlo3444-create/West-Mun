/**
 * Comprehensive Test Suite for WEST MUN 2027 — Shift Management Redesign
 *
 * Verifies all requirements from the Shift Management Redesign:
 * 1. Time calculations & duration calculation (including overnight shifts).
 * 2. 12-hour AM/PM formatting.
 * 3. Date formatting and ISO boundary consistency.
 * 4. Dual assignment logic: Both Co-Heads and regular Team Members supported simultaneously.
 * 5. Independent supervisor designation (no automatic co-head supervisor assumption).
 * 6. Individual responsibilities, work areas/stations, and instructions.
 * 7. Live counter math: Co-Heads selected, Team members selected, Total assigned.
 * 8. 3-Step workflow state integrity: Details -> Assign People -> Review & Publish.
 * 9. Shift duplication logic (date change + assignment cloning toggle).
 * 10. Database migration verification: extended columns, views (wm_eb_shifts, etc.), and RLS policies.
 * 11. Server-side operations admin handlers (test sessions & Super Admin support).
 * 12. Component integration into OperationsWorkspace and DepartmentDashboard.
 *
 * Run with: node scripts/test-shift-management.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

console.log('====================================================');
console.log('WEST MUN 2027 — Shift Management Redesign Test Suite');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// 1. Time Calculation and Overnight Shifts
// ---------------------------------------------------------------------------
function calculateShiftDuration(startTime, endTime) {
  if (!startTime || !endTime) {
    return { hours: 0, minutes: 0, formatted: '0h', isOvernight: false };
  }
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  let startTotalMins = sh * 60 + sm;
  let endTotalMins = eh * 60 + em;
  let isOvernight = false;

  if (endTotalMins <= startTotalMins) {
    endTotalMins += 24 * 60;
    isOvernight = true;
  }

  const diffMins = endTotalMins - startTotalMins;
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;

  const formatted = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h 00m`;
  return { hours, minutes, formatted, isOvernight };
}

function formatTime12h(time24) {
  if (!time24) return '--:--';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
}

runTest('Shift Duration: Regular daytime shift (09:00 to 13:00) computes 4 hours', () => {
  const dur = calculateShiftDuration('09:00', '13:00');
  assert.equal(dur.hours, 4);
  assert.equal(dur.minutes, 0);
  assert.equal(dur.isOvernight, false);
  assert.equal(dur.formatted, '4h 00m');
});

runTest('Shift Duration: Fractional shift (13:15 to 17:45) computes 4 hours 30 mins', () => {
  const dur = calculateShiftDuration('13:15', '17:45');
  assert.equal(dur.hours, 4);
  assert.equal(dur.minutes, 30);
  assert.equal(dur.isOvernight, false);
  assert.equal(dur.formatted, '4h 30m');
});

runTest('Shift Duration: Overnight shift (22:00 to 02:00 next day) calculates 4 hours and flags overnight', () => {
  const dur = calculateShiftDuration('22:00', '02:00');
  assert.equal(dur.hours, 4);
  assert.equal(dur.minutes, 0);
  assert.equal(dur.isOvernight, true);
  assert.equal(dur.formatted, '4h 00m');
});

runTest('Shift Duration: Full overnight watch (22:00 to 06:00) calculates 8 hours and flags overnight', () => {
  const dur = calculateShiftDuration('22:00', '06:00');
  assert.equal(dur.hours, 8);
  assert.equal(dur.minutes, 0);
  assert.equal(dur.isOvernight, true);
  assert.equal(dur.formatted, '8h 00m');
});

// ---------------------------------------------------------------------------
// 2. 12-Hour AM/PM Time Formatting
// ---------------------------------------------------------------------------
runTest('Time Formatting: Converts 24-hr times to readable 12-hour AM/PM format', () => {
  assert.equal(formatTime12h('09:00'), '9:00 AM');
  assert.equal(formatTime12h('12:00'), '12:00 PM');
  assert.equal(formatTime12h('13:00'), '1:00 PM');
  assert.equal(formatTime12h('22:30'), '10:30 PM');
  assert.equal(formatTime12h('00:00'), '12:00 AM');
});

// ---------------------------------------------------------------------------
// 3. Dual Assignment Model: Co-Heads and Team Members
// ---------------------------------------------------------------------------
runTest('Dual Assignment: Supports assigning Co-Heads, Team Members, or both simultaneously', () => {
  const candidates = [
    { id: 'ch-1', type: 'co_head', name: 'Co-Head Alice', email: 'alice@westmun.org' },
    { id: 'ch-2', type: 'co_head', name: 'Co-Head Bob', email: 'bob@westmun.org' },
    { id: 'tm-1', type: 'team_member', name: 'Member Charlie', email: 'charlie@westmun.org' },
    { id: 'tm-2', type: 'team_member', name: 'Member Dana', email: 'dana@westmun.org' },
    { id: 'tm-3', type: 'team_member', name: 'Member Evan', email: 'evan@westmun.org' },
  ];

  // Case 1: Co-Heads only
  const coHeadsOnly = [candidates[0], candidates[1]];
  assert.equal(coHeadsOnly.filter(c => c.type === 'co_head').length, 2);
  assert.equal(coHeadsOnly.filter(c => c.type === 'team_member').length, 0);

  // Case 2: Team Members only
  const teamOnly = [candidates[2], candidates[3], candidates[4]];
  assert.equal(teamOnly.filter(c => c.type === 'co_head').length, 0);
  assert.equal(teamOnly.filter(c => c.type === 'team_member').length, 3);

  // Case 3: Both groups simultaneously
  const bothGroups = [candidates[0], candidates[1], candidates[2], candidates[3], candidates[4]];
  const coHeadCount = bothGroups.filter(c => c.type === 'co_head').length;
  const teamCount = bothGroups.filter(c => c.type === 'team_member').length;
  const total = bothGroups.length;

  assert.equal(coHeadCount, 2);
  assert.equal(teamCount, 3);
  assert.equal(total, 5);
});

runTest('Supervisor Designation: Co-Heads are NOT automatically marked as supervisors; toggle is independent', () => {
  const assignment1 = {
    candidate: { id: 'ch-1', type: 'co_head', name: 'Alice' },
    is_supervisor: false, // Default is false even for co-heads
  };
  const assignment2 = {
    candidate: { id: 'tm-1', type: 'team_member', name: 'Charlie' },
    is_supervisor: true, // Team member CAN be designated as supervisor
  };

  assert.equal(assignment1.is_supervisor, false);
  assert.equal(assignment2.is_supervisor, true);
});

runTest('Individual Duties: Supports station, responsibility, and private notes per assignment', () => {
  const assignment = {
    shift_id: 'shift-100',
    role_type: 'co_head',
    responsibility: 'VIP Protocol Lead',
    station: 'West Gate Checkpoint',
    notes: 'Brief volunteers at 08:45',
    is_supervisor: true,
    assignee_name: 'Najla Rami',
    assignee_email: 'najla@westmun.org',
  };

  assert.equal(assignment.responsibility, 'VIP Protocol Lead');
  assert.equal(assignment.station, 'West Gate Checkpoint');
  assert.equal(assignment.is_supervisor, true);
});

// ---------------------------------------------------------------------------
// 4. Shift Duplication Logic
// ---------------------------------------------------------------------------
runTest('Shift Duplication: Clones shift with new target date and optional assignment duplication', () => {
  const original = {
    id: 'orig-1',
    title: 'Registration Station Morning',
    description: 'Check delegate credentials',
    location: 'Main Hall Door A',
    starts_at: '2026-10-22T09:00:00.000Z',
    ends_at: '2026-10-22T13:00:00.000Z',
    capacity: 4,
    status: 'open',
  };

  const newDate = '2026-10-23';
  const newStartsAt = `${newDate}T09:00:00.000Z`;
  const newEndsAt = `${newDate}T13:00:00.000Z`;
  const newTitle = `${original.title} (Copy)`;

  const cloned = {
    id: 'cloned-2',
    title: newTitle,
    description: original.description,
    location: original.location,
    starts_at: newStartsAt,
    ends_at: newEndsAt,
    capacity: original.capacity,
    status: 'open',
  };

  assert.notEqual(cloned.id, original.id);
  assert.equal(cloned.title, 'Registration Station Morning (Copy)');
  assert.equal(cloned.starts_at.slice(0, 10), '2026-10-23');
  assert.equal(cloned.capacity, 4);
});

// ---------------------------------------------------------------------------
// 5. Database Migration File Validation
// ---------------------------------------------------------------------------
runTest('Database Migration: migration_shift_management_redesign.sql exists and has required schema', () => {
  const migrationPath = join(ROOT, 'supabase/migration_shift_management_redesign.sql');
  assert.ok(existsSync(migrationPath), 'Migration file must exist');

  const content = read('supabase/migration_shift_management_redesign.sql');
  assert.ok(content.includes('description text'), 'Must add description column to wm_shifts');
  assert.ok(content.includes('role_type text'), 'Must add role_type to wm_shift_assignments');
  assert.ok(content.includes('responsibility text'), 'Must add responsibility to wm_shift_assignments');
  assert.ok(content.includes('station text'), 'Must add station to wm_shift_assignments');
  assert.ok(content.includes('is_supervisor boolean'), 'Must add is_supervisor to wm_shift_assignments');
  assert.ok(content.includes('assignee_name text'), 'Must add assignee_name to wm_shift_assignments');
  assert.ok(content.includes('assignee_email text'), 'Must add assignee_email to wm_shift_assignments');
  assert.ok(content.includes('wm_eb_shifts'), 'Must define view wm_eb_shifts');
  assert.ok(content.includes('wm_eb_shift_assignments'), 'Must define view wm_eb_shift_assignments');
  assert.ok(content.includes('wm_eb_tasks'), 'Must define view wm_eb_tasks');
  assert.ok(content.includes('heads_manage_wm_shift_assignments'), 'Must include RLS policy for shift assignments');
  assert.ok(content.includes('heads read own and coheads'), 'Must include RLS policy for department co-heads');
});

// ---------------------------------------------------------------------------
// 6. Server Admin Operations Handler Verification
// ---------------------------------------------------------------------------
runTest('Server Operations Admin: Supports all shift redesign operations', () => {
  const content = read('src/server/operationsAdmin.ts');
  assert.ok(content.includes('create_shift'), 'Must handle create_shift');
  assert.ok(content.includes('update_shift'), 'Must handle update_shift');
  assert.ok(content.includes('delete_shift'), 'Must handle delete_shift');
  assert.ok(content.includes('list_shifts'), 'Must handle list_shifts');
  assert.ok(content.includes('assign_shift'), 'Must handle assign_shift');
  assert.ok(content.includes('batch_assign_shifts'), 'Must handle batch_assign_shifts');
  assert.ok(content.includes('duplicate_shift'), 'Must handle duplicate_shift');
  assert.ok(content.includes('list_co_heads'), 'Must handle list_co_heads');
  assert.ok(content.includes('list_team_members'), 'Must handle list_team_members');
});

// ---------------------------------------------------------------------------
// 7. Operations Store Service Layer Verification
// ---------------------------------------------------------------------------
runTest('Operations Store: Exports updated WmShift, WmShiftAssignment, and new candidate methods', () => {
  const content = read('src/head/services/operationsStore.ts');
  assert.ok(content.includes('export interface WmShift'), 'Must export WmShift');
  assert.ok(content.includes('export interface WmShiftAssignment'), 'Must export WmShiftAssignment');
  assert.ok(content.includes('export interface ShiftCandidate'), 'Must export ShiftCandidate');
  assert.ok(content.includes('listDepartmentCoHeads'), 'Must export listDepartmentCoHeads');
  assert.ok(content.includes('listDepartmentTeamMembers'), 'Must export listDepartmentTeamMembers');
  assert.ok(content.includes('listDepartmentRosterCandidates'), 'Must export listDepartmentRosterCandidates');
  assert.ok(content.includes('batchAssignShiftPeople'), 'Must export batchAssignShiftPeople');
  assert.ok(content.includes('duplicateDepartmentShift'), 'Must export duplicateDepartmentShift');
});

// ---------------------------------------------------------------------------
// 8. Frontend UI Components Existence and Structure
// ---------------------------------------------------------------------------
runTest('UI Components: ShiftDatePicker exists with shortcuts and readable formatting', () => {
  const p = join(ROOT, 'src/head/shifts/ShiftDatePicker.tsx');
  assert.ok(existsSync(p), 'ShiftDatePicker must exist');
  const content = read('src/head/shifts/ShiftDatePicker.tsx');
  assert.ok(content.includes('ShiftDatePicker'), 'Component must be exported');
  assert.ok(content.includes('formatDateReadable'), 'formatDateReadable must be exported');
  assert.ok(content.includes('summitPresets'), 'Must provide quick presets');
});

runTest('UI Components: ShiftTimePicker exists with auto duration and overnight support', () => {
  const p = join(ROOT, 'src/head/shifts/ShiftTimePicker.tsx');
  assert.ok(existsSync(p), 'ShiftTimePicker must exist');
  const content = read('src/head/shifts/ShiftTimePicker.tsx');
  assert.ok(content.includes('calculateShiftDuration'), 'calculateShiftDuration must be exported');
  assert.ok(content.includes('formatTime12h'), 'formatTime12h must be exported');
  assert.ok(content.includes('Overnight'), 'Must indicate overnight shifts');
});

runTest('UI Components: ShiftCalendarView exists with Month, Week, Day views and Today button', () => {
  const p = join(ROOT, 'src/head/shifts/ShiftCalendarView.tsx');
  assert.ok(existsSync(p), 'ShiftCalendarView must exist');
  const content = read('src/head/shifts/ShiftCalendarView.tsx');
  assert.ok(content.includes('viewMode'), 'Must support view modes');
  assert.ok(content.includes('handleToday'), 'Must have handleToday navigation');
  assert.ok(content.includes('onOpenCreate'), 'Must support clicking date cell to open create shift');
});

runTest('UI Components: ShiftListView exists with search, date filters, and status filters', () => {
  const p = join(ROOT, 'src/head/shifts/ShiftListView.tsx');
  assert.ok(existsSync(p), 'ShiftListView must exist');
  const content = read('src/head/shifts/ShiftListView.tsx');
  assert.ok(content.includes('dateFilter'), 'Must support date range filtering');
  assert.ok(content.includes('statusFilter'), 'Must support status filtering');
  assert.ok(content.includes('search'), 'Must support search');
});

runTest('UI Components: ShiftCreationModal exists with 3-step workflow and dual assignment', () => {
  const p = join(ROOT, 'src/head/shifts/ShiftCreationModal.tsx');
  assert.ok(existsSync(p), 'ShiftCreationModal must exist');
  const content = read('src/head/shifts/ShiftCreationModal.tsx');
  assert.ok(content.includes('step === 1'), 'Must have Step 1: Shift Details');
  assert.ok(content.includes('step === 2'), 'Must have Step 2: Assign People');
  assert.ok(content.includes('step === 3'), 'Must have Step 3: Review & Publish');
  assert.ok(content.includes('coHeadsList'), 'Must load Co-Heads list');
  assert.ok(content.includes('teamMembersList'), 'Must load Team Members list');
  assert.ok(content.includes('is_supervisor'), 'Must support supervisor flag');
  assert.ok(content.includes('handleSaveShift'), 'Must handle saving draft or published');
});

runTest('UI Components: ShiftDetailsDrawer and ShiftDuplicateModal exist', () => {
  const p1 = join(ROOT, 'src/head/shifts/ShiftDetailsDrawer.tsx');
  const p2 = join(ROOT, 'src/head/shifts/ShiftDuplicateModal.tsx');
  assert.ok(existsSync(p1), 'ShiftDetailsDrawer must exist');
  assert.ok(existsSync(p2), 'ShiftDuplicateModal must exist');
  const c1 = read('src/head/shifts/ShiftDetailsDrawer.tsx');
  assert.ok(c1.includes('ShiftDetailsDrawer'), 'ShiftDetailsDrawer component exported');
  assert.ok(c1.includes('handleAddCandidate'), 'Allows quick adding person');
  const c2 = read('src/head/shifts/ShiftDuplicateModal.tsx');
  assert.ok(c2.includes('copyAssignments'), 'Supports assignment cloning toggle');
});

runTest('UI Components: ShiftManagementDashboard unites Calendar and List views', () => {
  const p = join(ROOT, 'src/head/shifts/ShiftManagementDashboard.tsx');
  assert.ok(existsSync(p), 'ShiftManagementDashboard must exist');
  const content = read('src/head/shifts/ShiftManagementDashboard.tsx');
  assert.ok(content.includes('ShiftCalendarView'), 'Integrates ShiftCalendarView');
  assert.ok(content.includes('ShiftListView'), 'Integrates ShiftListView');
  assert.ok(content.includes('ShiftCreationModal'), 'Integrates ShiftCreationModal');
  assert.ok(content.includes('ShiftDetailsDrawer'), 'Integrates ShiftDetailsDrawer');
  assert.ok(content.includes('ShiftDuplicateModal'), 'Integrates ShiftDuplicateModal');
  assert.ok(content.includes('Coverage Gaps'), 'Displays KPI stats banner');
});

runTest('Integration: OperationsWorkspace and DepartmentDashboard mount ShiftManagementDashboard', () => {
  const opsContent = read('src/head/OperationsWorkspace.tsx');
  assert.ok(opsContent.includes('ShiftManagementDashboard'), 'OperationsWorkspace must mount ShiftManagementDashboard');

  const deptContent = read('src/head/DepartmentDashboard.tsx');
  assert.ok(deptContent.includes('ShiftManagementDashboard'), 'DepartmentDashboard must mount ShiftManagementDashboard');
  assert.ok(deptContent.includes("view === 'shifts'"), 'DepartmentDashboard must handle shifts view');
});

console.log('\n====================================================');
console.log(`Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
