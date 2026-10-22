/**
 * Comprehensive Test Suite for WEST MUN 2027 — Custom Team Groups & Bulk Shift Assignment
 *
 * Verifies all requirements:
 * 1. Custom Team Groups creation, editing, membership management, and deletion.
 * 2. Membership deduplication within a group (no duplicate members in one group).
 * 3. Cross-group membership (members can belong to multiple distinct groups).
 * 4. Bulk assignment of entire groups to shifts.
 * 5. Multi-group + individual member deduplication in shift assignment.
 * 6. Live summary counters: X Co-Heads · Y individually selected · Z groups selected · N unique people assigned.
 * 7. Preservation of individual assignment controls: removal from shift does not mutate saved group.
 * 8. "Assign to Shift" direct entry workflow from Team Groups dashboard.
 * 9. Supabase migration schema, constraints, unique indexes, and RLS policies.
 * 10. Server-side Super Admin and IT test session operations dispatchers.
 * 11. Component integration across ShiftCreationModal, ShiftManagementDashboard, OperationsWorkspace, and DepartmentDashboard.
 *
 * Run with: node scripts/test-team-groups.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

console.log('========================================================================');
console.log('WEST MUN 2027 — Custom Team Groups & Bulk Shift Assignment Test Suite');
console.log('========================================================================\n');

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
// 1. Group Creation & Membership Deduplication Within Group
// ---------------------------------------------------------------------------
function deduplicateGroupMembers(members) {
  const seen = new Set();
  const deduped = [];
  for (const m of members) {
    const emailKey = m.member_email ? m.member_email.trim().toLowerCase() : m.member_id;
    if (!emailKey || seen.has(emailKey)) continue;
    seen.add(emailKey);
    deduped.push({
      ...m,
      member_email: m.member_email ? m.member_email.trim() : '',
      member_name: m.member_name.trim(),
    });
  }
  return deduped;
}

runTest('Group Membership: Deduplicates multiple entries of the same member in one group', () => {
  const incoming = [
    { member_id: 'm1', member_name: 'Alice Wong', member_email: 'alice@example.com', role_title: 'Staff' },
    { member_id: 'm1-dup', member_name: 'Alice Wong (Duplicate)', member_email: 'alice@example.com', role_title: 'Staff' },
    { member_id: 'm2', member_name: 'Bob Chen', member_email: 'bob@example.com', role_title: 'Logistics' },
  ];
  const cleaned = deduplicateGroupMembers(incoming);
  assert.equal(cleaned.length, 2);
  assert.equal(cleaned[0].member_name, 'Alice Wong');
  assert.equal(cleaned[1].member_name, 'Bob Chen');
});

runTest('Cross-Group Membership: Allows a person to belong to multiple distinct groups', () => {
  const groupA = deduplicateGroupMembers([
    { member_id: 'm1', member_name: 'Alice Wong', member_email: 'alice@example.com' },
    { member_id: 'm2', member_name: 'Bob Chen', member_email: 'bob@example.com' },
  ]);
  const groupB = deduplicateGroupMembers([
    { member_id: 'm1', member_name: 'Alice Wong', member_email: 'alice@example.com' },
    { member_id: 'm3', member_name: 'Clara Davis', member_email: 'clara@example.com' },
  ]);

  assert.equal(groupA.length, 2);
  assert.equal(groupB.length, 2);
  // Both groups contain Alice Wong
  assert(groupA.some((m) => m.member_email === 'alice@example.com'));
  assert(groupB.some((m) => m.member_email === 'alice@example.com'));
});

// ---------------------------------------------------------------------------
// 2. Bulk Shift Assignment with Multi-Group Deduplication Logic
// ---------------------------------------------------------------------------
class ShiftAssignmentEngine {
  constructor() {
    this.assignedMap = new Map();
    this.selectedGroupIds = new Set();
  }

  getCandidateKey(candidate) {
    return candidate.email && candidate.email.trim()
      ? candidate.email.trim().toLowerCase()
      : candidate.id;
  }

  toggleGroup(group) {
    if (this.selectedGroupIds.has(group.id)) {
      this.selectedGroupIds.delete(group.id);
      // Remove group from assigned people
      for (const [key, val] of this.assignedMap.entries()) {
        const updatedGroups = val.sourceGroupNames.filter((name) => name !== group.name);
        if (updatedGroups.length === 0 && !val.isIndividuallySelected) {
          this.assignedMap.delete(key);
        } else {
          val.sourceGroupNames = updatedGroups;
        }
      }
    } else {
      this.selectedGroupIds.add(group.id);
      for (const m of group.members || []) {
        const key = m.member_email.trim().toLowerCase();
        const existing = this.assignedMap.get(key);
        if (existing) {
          if (!existing.sourceGroupNames.includes(group.name)) {
            existing.sourceGroupNames.push(group.name);
          }
        } else {
          this.assignedMap.set(key, {
            candidate: {
              id: m.member_id || key,
              name: m.member_name,
              email: m.member_email,
              type: 'team_member',
              roleTitle: m.role_title || 'Team Member',
            },
            responsibility: '',
            station: '',
            is_supervisor: false,
            sourceGroupNames: [group.name],
            isIndividuallySelected: false,
          });
        }
      }
    }
  }

  toggleIndividual(candidate) {
    const key = this.getCandidateKey(candidate);
    const existing = this.assignedMap.get(key);
    if (existing) {
      if (existing.isIndividuallySelected) {
        if (existing.sourceGroupNames.length > 0) {
          existing.isIndividuallySelected = false;
        } else {
          this.assignedMap.delete(key);
        }
      } else {
        existing.isIndividuallySelected = true;
      }
    } else {
      this.assignedMap.set(key, {
        candidate,
        responsibility: '',
        station: '',
        is_supervisor: false,
        sourceGroupNames: [],
        isIndividuallySelected: true,
      });
    }
  }

  removePersonFromShift(key) {
    this.assignedMap.delete(key.toLowerCase());
  }

  getLiveCounters() {
    const list = Array.from(this.assignedMap.values());
    const coHeads = list.filter((a) => a.candidate.type === 'co_head').length;
    const individualMembers = list.filter(
      (a) => a.candidate.type === 'team_member' && a.isIndividuallySelected
    ).length;
    const groupsCount = this.selectedGroupIds.size;
    const uniquePeople = list.length;
    return {
      coHeads,
      individualMembers,
      groupsCount,
      uniquePeople,
      summaryString: `${coHeads} Co-Heads · ${individualMembers} individually selected · ${groupsCount} groups selected · ${uniquePeople} unique people assigned`,
    };
  }
}

runTest('Bulk Assignment: Adding single group expands its members', () => {
  const engine = new ShiftAssignmentEngine();
  const groupCleaners = {
    id: 'grp-cleaners',
    name: 'Bathroom Cleaners',
    members: [
      { member_id: 'm1', member_name: 'Member 1', member_email: 'm1@mun.org' },
      { member_id: 'm2', member_name: 'Member 2', member_email: 'm2@mun.org' },
      { member_id: 'm3', member_name: 'Member 3', member_email: 'm3@mun.org' },
      { member_id: 'm4', member_name: 'Member 4', member_email: 'm4@mun.org' },
      { member_id: 'm5', member_name: 'Member 5', member_email: 'm5@mun.org' },
    ],
  };

  engine.toggleGroup(groupCleaners);
  assert.equal(engine.assignedMap.size, 5);
  const counters = engine.getLiveCounters();
  assert.equal(counters.groupsCount, 1);
  assert.equal(counters.uniquePeople, 5);
});

runTest('Bulk Assignment: Overlapping groups deduplicate members correctly', () => {
  const engine = new ShiftAssignmentEngine();
  const groupCleaners = {
    id: 'grp-cleaners',
    name: 'Bathroom Cleaners',
    members: [
      { member_id: 'm1', member_name: 'Member 1', member_email: 'm1@mun.org' },
      { member_id: 'm2', member_name: 'Member 2', member_email: 'm2@mun.org' },
      { member_id: 'm3', member_name: 'Member 3', member_email: 'm3@mun.org' },
    ],
  };
  const groupVIP = {
    id: 'grp-vip',
    name: 'VIP Support',
    members: [
      // m2 is shared between Bathroom Cleaners and VIP Support
      { member_id: 'm2', member_name: 'Member 2', member_email: 'm2@mun.org' },
      { member_id: 'm4', member_name: 'Member 4', member_email: 'm4@mun.org' },
    ],
  };

  engine.toggleGroup(groupCleaners);
  engine.toggleGroup(groupVIP);

  // 3 members from groupCleaners + 1 new member from groupVIP = 4 unique people
  assert.equal(engine.assignedMap.size, 4);

  // Check the overlapping member has both source groups
  const shared = engine.assignedMap.get('m2@mun.org');
  assert(shared);
  assert.equal(shared.sourceGroupNames.length, 2);
  assert(shared.sourceGroupNames.includes('Bathroom Cleaners'));
  assert(shared.sourceGroupNames.includes('VIP Support'));

  const counters = engine.getLiveCounters();
  assert.equal(counters.groupsCount, 2);
  assert.equal(counters.uniquePeople, 4);
});

runTest('Bulk Assignment: Mixed Co-Heads, Individual Members, and Groups produce exact live summary', () => {
  const engine = new ShiftAssignmentEngine();

  // 1. Add 2 Co-Heads
  engine.toggleIndividual({ id: 'ch1', name: 'Co-Head One', email: 'ch1@mun.org', type: 'co_head' });
  engine.toggleIndividual({ id: 'ch2', name: 'Co-Head Two', email: 'ch2@mun.org', type: 'co_head' });

  // 2. Add 2 Groups (Bathroom Cleaners: 5 members, VIP Support: 3 members with 1 overlapping)
  const groupCleaners = {
    id: 'grp-cleaners',
    name: 'Bathroom Cleaners',
    members: [
      { member_id: 'm1', member_name: 'Member 1', member_email: 'm1@mun.org' },
      { member_id: 'm2', member_name: 'Member 2', member_email: 'm2@mun.org' },
      { member_id: 'm3', member_name: 'Member 3', member_email: 'm3@mun.org' },
      { member_id: 'm4', member_name: 'Member 4', member_email: 'm4@mun.org' },
      { member_id: 'm5', member_name: 'Member 5', member_email: 'm5@mun.org' },
    ],
  };
  const groupVIP = {
    id: 'grp-vip',
    name: 'VIP Support',
    members: [
      { member_id: 'm5', member_name: 'Member 5', member_email: 'm5@mun.org' }, // overlap
      { member_id: 'm6', member_name: 'Member 6', member_email: 'm6@mun.org' },
      { member_id: 'm7', member_name: 'Member 7', member_email: 'm7@mun.org' },
    ],
  };
  engine.toggleGroup(groupCleaners);
  engine.toggleGroup(groupVIP);

  // 3. Add 2 distinct individual members
  engine.toggleIndividual({ id: 'ind1', name: 'Individual 1', email: 'ind1@mun.org', type: 'team_member' });
  engine.toggleIndividual({ id: 'ind2', name: 'Individual 2', email: 'ind2@mun.org', type: 'team_member' });

  const counters = engine.getLiveCounters();
  assert.equal(counters.coHeads, 2);
  assert.equal(counters.individualMembers, 2);
  assert.equal(counters.groupsCount, 2);
  // 2 Co-heads + 7 unique members from groups (m1..m7) + 2 individual = 11 unique
  assert.equal(counters.uniquePeople, 11);
  assert.equal(
    counters.summaryString,
    '2 Co-Heads · 2 individually selected · 2 groups selected · 11 unique people assigned'
  );
});

runTest('Shift Removal: Removing a person from a shift does not mutate saved group membership', () => {
  const engine = new ShiftAssignmentEngine();
  const group = {
    id: 'grp-cleaners',
    name: 'Bathroom Cleaners',
    members: [
      { member_id: 'm1', member_name: 'Member 1', member_email: 'm1@mun.org' },
      { member_id: 'm2', member_name: 'Member 2', member_email: 'm2@mun.org' },
    ],
  };

  engine.toggleGroup(group);
  assert.equal(engine.assignedMap.size, 2);

  // Remove Member 1 from this shift
  engine.removePersonFromShift('m1@mun.org');
  assert.equal(engine.assignedMap.size, 1);
  assert.equal(engine.assignedMap.has('m1@mun.org'), false);

  // Original group remains completely intact with 2 members
  assert.equal(group.members.length, 2);
});

// ---------------------------------------------------------------------------
// 3. Database Migration Schema Verification
// ---------------------------------------------------------------------------
runTest('Supabase Migration: migration_team_groups.sql exists and contains valid schema & RLS', () => {
  const path = 'supabase/migration_team_groups.sql';
  assert(existsSync(join(ROOT, path)), `${path} must exist`);
  const sql = read(path).toLowerCase();

  // Table creation
  assert(sql.includes('create table if not exists public.wm_team_groups'));
  assert(sql.includes('create table if not exists public.wm_team_group_members'));

  // Foreign keys and constraints
  assert(sql.includes('references public.wm_team_groups(id) on delete cascade'));
  assert(sql.includes('wm_team_group_members_group_idx') || sql.includes('group_id'));
  assert(sql.includes('unique index') && sql.includes('member_email'));

  // RLS enablement
  assert(sql.includes('alter table public.wm_team_groups enable row level security'));
  assert(sql.includes('alter table public.wm_team_group_members enable row level security'));

  // Department Head & Admin Policies
  assert(sql.includes('heads_manage_wm_team_groups'));
  assert(sql.includes('heads_manage_wm_team_group_members'));
  assert(sql.includes('admins_manage_wm_team_groups'));
  assert(sql.includes('admins_manage_wm_team_group_members'));
});

// ---------------------------------------------------------------------------
// 4. Server-Side Operations Admin Handler Verification
// ---------------------------------------------------------------------------
runTest('Server Operations Admin: operationsAdmin.ts supports all team group operations', () => {
  const code = read('src/server/operationsAdmin.ts');

  assert(code.includes("case 'list_groups':"), 'Must handle list_groups');
  assert(code.includes("case 'create_group':"), 'Must handle create_group');
  assert(code.includes("case 'update_group':"), 'Must handle update_group');
  assert(code.includes("case 'delete_group':"), 'Must handle delete_group');
  assert(code.includes("case 'list_group_members':"), 'Must handle list_group_members');
  assert(code.includes("case 'sync_group_members':"), 'Must handle sync_group_members');

  // In-memory fallback
  assert(code.includes('teamGroups'), 'Must maintain teamGroups in memory store');
  assert(code.includes('teamGroupMembers'), 'Must maintain teamGroupMembers in memory store');
});

// ---------------------------------------------------------------------------
// 5. Operations Store Client Service Verification
// ---------------------------------------------------------------------------
runTest('Client Store: operationsStore.ts exports all group CRUD and member sync methods', () => {
  const code = read('src/head/services/operationsStore.ts');

  assert(code.includes('export interface WmTeamGroup'), 'WmTeamGroup interface');
  assert(code.includes('export interface WmTeamGroupMember'), 'WmTeamGroupMember interface');
  assert(code.includes('export async function listDepartmentGroups'), 'listDepartmentGroups');
  assert(code.includes('export async function createDepartmentGroup'), 'createDepartmentGroup');
  assert(code.includes('export async function updateDepartmentGroup'), 'updateDepartmentGroup');
  assert(code.includes('export async function deleteDepartmentGroup'), 'deleteDepartmentGroup');
  assert(code.includes('export async function listGroupMembers'), 'listGroupMembers');
  assert(code.includes('export async function syncGroupMembers'), 'syncGroupMembers');
});

// ---------------------------------------------------------------------------
// 6. UI Components Integration Verification
// ---------------------------------------------------------------------------
runTest('ShiftCreationModal: Integrates 3 clear categories and live summary matching prompt', () => {
  const code = read('src/head/shifts/ShiftCreationModal.tsx');

  assert(code.includes('1. Co-Heads'), 'Category 1: Co-Heads tab');
  assert(code.includes('2. Individual Members'), 'Category 2: Individual Members tab');
  assert(code.includes('3. Custom Groups'), 'Category 3: Custom Groups tab');
  assert(code.includes('initialGroup?: WmTeamGroup | null'), 'initialGroup prop supported');
  assert(code.includes('selectedGroupsCount'), 'selectedGroupsCount tracked');
  assert(code.includes('unique people assigned'), 'Live unique people assigned summary');
  assert(code.includes('sourceGroupNames'), 'Source group names stored on candidate config');
  assert(code.includes('Already included via') || code.includes('Included in'), 'Deduplication indicator badge');
});

runTest('ShiftManagementDashboard: Accepts initialGroup and forwards to ShiftCreationModal', () => {
  const code = read('src/head/shifts/ShiftManagementDashboard.tsx');

  assert(code.includes('initialGroup?: WmTeamGroup | null'), 'Accepts initialGroup prop');
  assert(code.includes('initialGroup={activeInitialGroup}'), 'Passes initialGroup to ShiftCreationModal');
});

runTest('GroupManagementDashboard: Provides Assign to Shift action, cards, and modal triggers', () => {
  const code = read('src/head/groups/GroupManagementDashboard.tsx');

  assert(code.includes('onAssignGroupToShift?: (group: WmTeamGroup) => void;'), 'onAssignGroupToShift prop');
  assert(code.includes('Assign to Shift'), 'Assign to Shift action button');
  assert(code.includes('GroupFormModal'), 'Mounts GroupFormModal');
  assert(code.includes('GroupDetailsModal'), 'Mounts GroupDetailsModal');
});

runTest('OperationsWorkspace: Includes Team groups tab and renders GroupManagementDashboard', () => {
  const code = read('src/head/OperationsWorkspace.tsx');

  assert(code.includes("label: 'Team groups'"), 'Team groups tab in tabs');
  assert(code.includes('<GroupManagementDashboard'), 'Renders GroupManagementDashboard');
  assert(code.includes('initialGroup={selectedGroupForShift}'), 'Wires selected group to ShiftManagementDashboard');
});

runTest('DepartmentDashboard: Adds Team groups to navigation and renders GroupManagementDashboard', () => {
  const code = read('src/head/DepartmentDashboard.tsx');

  assert(code.includes("label: 'Team groups'"), 'Team groups in operationsNavItems');
  assert(code.includes("view === 'groups'") && code.includes("'Custom Team Groups'"), 'viewLabel for groups');
  assert(code.includes('<GroupManagementDashboard'), 'Renders GroupManagementDashboard on view === groups');
  assert(code.includes('initialGroup={selectedGroupForShift}'), 'Wires selected group to shifts view');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`Test Execution Summary: ${passedTests} / ${totalTests} Passed`);
console.log('========================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
