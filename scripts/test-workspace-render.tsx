/**
 * Renders the shipped workspace components with real props and asserts the
 * resulting markup. This catches runtime/rendering regressions that a static
 * source check cannot: broken hooks, missing imports, and empty renders.
 *
 * Run with: npx tsx scripts/test-workspace-render.tsx
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DepartmentWorkspace } from '../src/head/DepartmentWorkspace';
import { WorkspaceModuleGrid, WorkspaceOverview } from '../src/head/WorkspaceOverview';
import { DEPARTMENTS } from '../src/head/departments';
import { getWorkspaceModules } from '../src/head/workspaces';
import type { DepartmentRecord } from '../src/head/services/departmentStore';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed += 1;
  } else {
    console.error(`[FAIL] ${name}`);
    if (details) console.error(`       -> ${details}`);
    failed += 1;
  }
}

const designMeta = DEPARTMENTS.design;
const designTasks = getWorkspaceModules('design').find((module) => module.id === 'design-tasks');
if (!designTasks) throw new Error('design-tasks module must exist');

const records: DepartmentRecord[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    department: 'design',
    section: null,
    category: 'task',
    title: 'Placard revision round 2',
    status: 'In Progress',
    priority: 'high',
    data: {
      assignee: 'Design desk',
      due_date: '2027-02-15',
      deliverable_type: 'Placards',
    },
    created_at: '2026-10-01T10:00:00.000Z',
    updated_at: '2026-10-05T10:00:00.000Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    department: 'design',
    section: null,
    category: 'task',
    title: 'Stage backdrop export',
    status: 'Approved',
    priority: 'medium',
    data: { assignee: 'Visual lead', due_date: '2027-01-20' },
    created_at: '2026-09-20T10:00:00.000Z',
    updated_at: '2026-09-25T10:00:00.000Z',
  },
];

const noopAsync = async () => ({ ok: true });

console.log('====================================================');
console.log('WEST MUN — Workspace Component Render Tests');
console.log('====================================================');

// 1. Populated workspace
const populated = renderToStaticMarkup(
  React.createElement(DepartmentWorkspace, {
    department: 'design',
    section: null,
    module: designTasks,
    records,
    loading: false,
    storageError: '',
    onReload: () => {},
    onCreate: noopAsync,
    onUpdate: noopAsync,
    onDelete: noopAsync,
  }),
);

assert(populated.includes('Design tasks'), 'Workspace renders the module heading');
assert(populated.includes('Placard revision round 2'), 'Workspace renders real record titles');
assert(populated.includes('Stage backdrop export'), 'Workspace renders every record in the category');
assert(populated.includes('In Progress'), 'Workspace renders status values');
assert(populated.includes('2 saved'), 'Workspace shows the real saved record count');
assert(populated.includes('New item'), 'Workspace exposes the create action');
assert(populated.includes('Search design tasks'), 'Workspace exposes search');
assert(populated.includes('Stage'), 'Workspace renders the primary detail summary');
assert(populated.includes('Due'), 'Workspace renders deadlines from record data');
assert(!populated.includes('No design tasks yet'), 'Populated workspace does not show the empty state');

// 2. Empty workspace
const empty = renderToStaticMarkup(
  React.createElement(DepartmentWorkspace, {
    department: 'design',
    section: null,
    module: designTasks,
    records: [],
    loading: false,
    storageError: '',
    onReload: () => {},
    onCreate: noopAsync,
    onUpdate: noopAsync,
    onDelete: noopAsync,
  }),
);
assert(empty.includes('No design tasks yet'), 'Empty workspace renders the module empty state');
assert(empty.includes('Create the first item'), 'Empty workspace offers a create action');
assert(empty.includes('0 saved'), 'Empty workspace reports a real zero count');

// 3. Storage failure state (migration not applied)
const storageFailure = renderToStaticMarkup(
  React.createElement(DepartmentWorkspace, {
    department: 'design',
    section: null,
    module: designTasks,
    records: [],
    loading: false,
    storageError:
      'Department workspace storage is not initialized in this Supabase project. An administrator must run supabase/migration_department_workspaces.sql in the Supabase SQL Editor, then reload this page.',
    onReload: () => {},
    onCreate: noopAsync,
    onUpdate: noopAsync,
    onDelete: noopAsync,
  }),
);

assert(
  storageFailure.includes('Workspace storage is unavailable'),
  'Missing-table failures render a visible error state',
);
assert(
  storageFailure.includes('migration_department_workspaces.sql'),
  'The error names the exact migration administrators must run',
);
assert(
  storageFailure.includes('Records cannot be loaded yet'),
  'The empty state does not pretend records simply do not exist',
);

// 4. Module grid + overview for a non-registration department (Logistics)
const logisticsMeta = DEPARTMENTS.logistics;
const logisticsRecords: DepartmentRecord[] = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    department: 'logistics',
    section: null,
    category: 'venue',
    title: 'Grand plenary hall',
    status: 'Confirmed',
    priority: 'high',
    data: { room: 'Hall A', capacity: 450 },
    created_at: '2026-10-01T10:00:00.000Z',
    updated_at: '2026-10-02T10:00:00.000Z',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    department: 'logistics',
    section: null,
    category: 'equipment',
    title: 'Floor microphones',
    status: 'Delivered',
    priority: 'medium',
    data: { quantity_needed: 32, quantity_sourced: 32, delivery_date: '2026-01-01' },
    created_at: '2026-09-01T10:00:00.000Z',
    updated_at: '2026-09-02T10:00:00.000Z',
  },
];

const grid = renderToStaticMarkup(
  React.createElement(WorkspaceModuleGrid, {
    meta: logisticsMeta,
    records: logisticsRecords,
    loading: false,
    onOpenModule: () => {},
  }),
);

assert(grid.includes('Venue operations'), 'Module grid renders the venue module');
assert(grid.includes('Equipment'), 'Module grid renders the equipment module');
assert(grid.includes('Readiness checklist'), 'Module grid renders the readiness module');
assert(grid.includes('1 saved'), 'Module grid reports real per-module counts');
assert(grid.includes('1 overdue'), 'Module grid flags overdue items from real dates');

const overview = renderToStaticMarkup(
  React.createElement(WorkspaceOverview, {
    meta: logisticsMeta,
    section: null,
    headName: 'Logistics Head',
    records: logisticsRecords,
    loading: false,
    storageError: '',
    announcements: [],
    onRefresh: () => {},
    onOpenModule: () => {},
    registrationAccess: false,
  }),
);

assert(overview.includes('Total records'), 'Overview renders real aggregate statistics');
assert(overview.includes('Your department workspace'), 'Overview renders the workspace section');
assert(overview.includes('Grand plenary hall'), 'Overview renders recently updated records');
assert(!overview.includes('Applications'), 'Non-registration overview never offers registration management');
assert(
  !overview.includes('Review applications'),
  'Non-registration overview has no registration call to action',
);
assert(overview.includes('Open items'), 'Overview renders open-item statistics');

// 5. Registration department overview still exposes applications only when allowed
const securityMeta = DEPARTMENTS.security;
const securityOverview = renderToStaticMarkup(
  React.createElement(WorkspaceOverview, {
    meta: securityMeta,
    section: 'male',
    headName: 'Security Head',
    records: [],
    loading: false,
    storageError: '',
    announcements: [],
    onRefresh: () => {},
    onOpenModule: () => {},
    registrationAccess: true,
    registrationCount: 7,
    onOpenRegistrations: () => {},
  }),
);

assert(
  securityOverview.includes('Open applications'),
  'Authorized registration departments get the applications shortcut',
);
assert(
  securityOverview.includes('male division'),
  'Section identity is rendered for gender-separated departments',
);

console.log('====================================================');
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log('====================================================');

if (failed > 0) process.exit(1);
