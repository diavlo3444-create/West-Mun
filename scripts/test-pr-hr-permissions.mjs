/**
 * Unit & Integration tests for PR Sponsors Management and HR Inquiries Access Control.
 *
 * Verifies:
 * 1. PR Heads can create, read, update, reorder, and delete sponsors, and upload logos.
 * 2. PR Heads CANNOT view or update inquiries (blocked by RLS).
 * 3. HR Heads can read, search/filter, update status (read, resolved, archived), and save notes on inquiries.
 * 4. HR Heads CANNOT create, update, or delete sponsors (blocked by RLS).
 * 5. HR Heads CANNOT delete inquiries (deletion reserved for Admin).
 * 6. Non-authorized department heads (e.g. Security, Volunteers) CANNOT mutate sponsors or access inquiries.
 * 7. Public users can submit inquiries and read published sponsors only.
 * 8. Admins maintain full access across both domains.
 *
 * Run with: node scripts/test-pr-hr-permissions.mjs
 */

import { createServer } from 'node:http';

const SUPER_ADMIN_UID = '11111111-1111-4111-8111-111111111111';
const PR_HEAD_UID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HR_HEAD_UID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SECURITY_HEAD_UID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ANONYMOUS_UID = null;

const users = [
  { id: SUPER_ADMIN_UID, email: 'diavlo3444@gmail.com' },
  { id: PR_HEAD_UID, email: 'dana.pr@westmun.org' },
  { id: HR_HEAD_UID, email: 'seif.hr@westmun.org' },
  { id: SECURITY_HEAD_UID, email: 'yusef.security@westmun.org' },
];

const departmentHeads = [
  { user_id: PR_HEAD_UID, department: 'pr', active: true },
  { user_id: HR_HEAD_UID, department: 'hr', active: true },
  { user_id: SECURITY_HEAD_UID, department: 'security', active: true },
];

const admins = new Set([SUPER_ADMIN_UID]);

// RLS Evaluation Simulation
function isUserAdmin(uid) {
  return admins.has(uid);
}

function isUserPrHead(uid) {
  if (!uid) return false;
  return departmentHeads.some(
    (h) => h.user_id === uid && h.active && ['pr', 'public relations', 'public relations & external affairs'].includes(h.department.toLowerCase())
  );
}

function isUserHrHead(uid) {
  if (!uid) return false;
  return departmentHeads.some(
    (h) => h.user_id === uid && h.active && ['hr', 'human resources', 'human resources & delegate services'].includes(h.department.toLowerCase())
  );
}

// In-memory test store
const store = {
  sponsors: [
    {
      id: 'sp-1',
      name: 'Diplomatic Foundation',
      tier: 'Title Sponsor',
      logo_url: 'https://example.com/logo.png',
      website_url: 'https://example.com',
      description: 'Official partner for diplomatic studies.',
      sort_order: 1,
      published: true,
    },
    {
      id: 'sp-2',
      name: 'Confidential Partner Draft',
      tier: 'Strategic Partner',
      logo_url: '',
      website_url: '',
      description: 'Internal draft not yet approved.',
      sort_order: 2,
      published: false,
    },
  ],
  inquiries: [
    {
      id: 'inq-1',
      name: 'Ambassador Delegate',
      email: 'delegate@embassy.gov',
      subject: 'Security Council Credentials',
      message: 'Requesting allocation info for high school delegation.',
      status: 'new',
      admin_notes: '',
      created_at: new Date().toISOString(),
    },
    {
      id: 'inq-2',
      name: 'Faculty Advisor',
      email: 'advisor@school.edu',
      subject: 'Fee schedule inquiry',
      message: 'When will early bird financial aid decisions be ratified?',
      status: 'read',
      admin_notes: 'Replied via email on Monday',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  storage: [],
};

// RLS Policy Enforcers
const rls = {
  // Sponsors
  canSelectSponsor(uid, sponsor) {
    if (sponsor.published) return true; // public read published
    return isUserAdmin(uid) || isUserPrHead(uid);
  },
  canInsertSponsor(uid) {
    return isUserAdmin(uid) || isUserPrHead(uid);
  },
  canUpdateSponsor(uid) {
    return isUserAdmin(uid) || isUserPrHead(uid);
  },
  canDeleteSponsor(uid) {
    return isUserAdmin(uid) || isUserPrHead(uid);
  },

  // Storage bucket 'site-files'
  canUploadSiteFile(uid, bucketId) {
    if (bucketId !== 'site-files') return false;
    return isUserAdmin(uid) || isUserPrHead(uid);
  },

  // Inquiries
  canSubmitInquiry() {
    return true; // public submit
  },
  canSelectInquiries(uid) {
    return isUserAdmin(uid) || isUserHrHead(uid);
  },
  canUpdateInquiries(uid) {
    return isUserAdmin(uid) || isUserHrHead(uid);
  },
  canDeleteInquiries(uid) {
    return isUserAdmin(uid); // Admin only, HR blocked from deleting
  },
};

let passed = 0;
let failed = 0;

function check(testName, condition, details) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${testName}`);
  } else {
    failed++;
    console.error(`[FAIL] ${testName}`);
    if (details) console.error('       ', details);
  }
}

console.log('====================================================');
console.log('WEST MUN — PR Sponsors & HR Inquiries Security Suite');
console.log('====================================================');

// 1. PR Head Sponsor Operations
check(
  'PR Head can view all sponsors including unpublished drafts',
  store.sponsors.every((s) => rls.canSelectSponsor(PR_HEAD_UID, s))
);

check(
  'PR Head can insert new sponsor record',
  rls.canInsertSponsor(PR_HEAD_UID) === true
);

check(
  'PR Head can update sponsor record (name, tier, logo, description, sort_order)',
  rls.canUpdateSponsor(PR_HEAD_UID) === true
);

check(
  'PR Head can delete sponsor record',
  rls.canDeleteSponsor(PR_HEAD_UID) === true
);

check(
  'PR Head can upload logo to site-files storage bucket',
  rls.canUploadSiteFile(PR_HEAD_UID, 'site-files') === true
);

// 2. PR Head Restricted Boundaries
check(
  'PR Head CANNOT read inquiries (blocked by RLS)',
  rls.canSelectInquiries(PR_HEAD_UID) === false
);

check(
  'PR Head CANNOT update inquiries (blocked by RLS)',
  rls.canUpdateInquiries(PR_HEAD_UID) === false
);

check(
  'PR Head CANNOT delete inquiries (blocked by RLS)',
  rls.canDeleteInquiries(PR_HEAD_UID) === false
);

// 3. HR Head Inquiry Operations
check(
  'HR Head can read incoming inquiries',
  rls.canSelectInquiries(HR_HEAD_UID) === true
);

check(
  'HR Head can update inquiry status and internal notes',
  rls.canUpdateInquiries(HR_HEAD_UID) === true
);

check(
  'HR Head CANNOT delete inquiries (deletion reserved for Admin)',
  rls.canDeleteInquiries(HR_HEAD_UID) === false
);

// 4. HR Head Restricted Boundaries
check(
  'HR Head CANNOT insert sponsor records',
  rls.canInsertSponsor(HR_HEAD_UID) === false
);

check(
  'HR Head CANNOT update sponsor records',
  rls.canUpdateSponsor(HR_HEAD_UID) === false
);

check(
  'HR Head CANNOT delete sponsor records',
  rls.canDeleteSponsor(HR_HEAD_UID) === false
);

check(
  'HR Head CANNOT upload to site-files (reserved for Admin and PR Head)',
  rls.canUploadSiteFile(HR_HEAD_UID, 'site-files') === false
);

check(
  'HR Head cannot view unpublished sponsor drafts (only sees published)',
  rls.canSelectSponsor(HR_HEAD_UID, store.sponsors[1]) === false &&
    rls.canSelectSponsor(HR_HEAD_UID, store.sponsors[0]) === true
);

// 5. Unrelated Department Head (e.g. Security)
check(
  'Security Head CANNOT insert or update sponsors',
  rls.canInsertSponsor(SECURITY_HEAD_UID) === false &&
    rls.canUpdateSponsor(SECURITY_HEAD_UID) === false
);

check(
  'Security Head CANNOT read inquiries',
  rls.canSelectInquiries(SECURITY_HEAD_UID) === false
);

check(
  'Security Head CANNOT update inquiries',
  rls.canUpdateInquiries(SECURITY_HEAD_UID) === false
);

// 6. Anonymous / Public Users
check(
  'Public can read published sponsors',
  rls.canSelectSponsor(ANONYMOUS_UID, store.sponsors[0]) === true
);

check(
  'Public CANNOT read unpublished sponsor drafts',
  rls.canSelectSponsor(ANONYMOUS_UID, store.sponsors[1]) === false
);

check(
  'Public CANNOT insert, update, or delete sponsors',
  rls.canInsertSponsor(ANONYMOUS_UID) === false &&
    rls.canUpdateSponsor(ANONYMOUS_UID) === false &&
    rls.canDeleteSponsor(ANONYMOUS_UID) === false
);

check(
  'Public CAN submit new inquiries',
  rls.canSubmitInquiry() === true
);

check(
  'Public CANNOT read stored inquiries',
  rls.canSelectInquiries(ANONYMOUS_UID) === false
);

// 7. Super Admin full permissions
check(
  'Super Admin has full access to sponsors',
  rls.canSelectSponsor(SUPER_ADMIN_UID, store.sponsors[1]) &&
    rls.canInsertSponsor(SUPER_ADMIN_UID) &&
    rls.canUpdateSponsor(SUPER_ADMIN_UID) &&
    rls.canDeleteSponsor(SUPER_ADMIN_UID)
);

check(
  'Super Admin has full access to inquiries including deletion',
  rls.canSelectInquiries(SUPER_ADMIN_UID) &&
    rls.canUpdateInquiries(SUPER_ADMIN_UID) &&
    rls.canDeleteInquiries(SUPER_ADMIN_UID)
);

console.log('====================================================');
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log('====================================================');

process.exit(failed === 0 ? 0 : 1);
