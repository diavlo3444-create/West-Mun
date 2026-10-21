import assert from 'node:assert/strict';
import {
  buildGmailComposeUrl,
  buildMailtoUrl,
  getEmailTemplates,
  getApprovedNextStepLink,
  getDepartmentPortalLink,
  determineDefaultTemplate,
  formatScheduleDateTime,
  formatDepartmentLabel,
  getProductionBaseUrl,
} from '../src/lib/applicantEmail.ts';

console.log('--- RUNNING WEST MUN APPLICANT EMAIL DISPATCH TEST SUITE ---\n');

const prodBase = getProductionBaseUrl();
assert.equal(prodBase, 'https://west-mun.vercel.app');

// 1. URL ENCODING TEST
console.log('1. Testing Gmail compose and mailto URL encoding...');
const testEmail = 'candidate.mun2027@example.com';
const testSubject = 'WEST MUN 2027 — Application Approved';
const testBody = `Hello Jane Doe,\n\nCongratulations! Your application to join WEST MUN 2027 has been approved.\n\nPlease visit:\nhttps://west-mun.vercel.app/volunteer\n\nBest regards,\nWEST MUN Team`;

const gmailUrl = buildGmailComposeUrl(testEmail, testSubject, testBody);
assert(gmailUrl.startsWith('https://mail.google.com/mail/?view=cm&fs=1&to='));
assert(gmailUrl.includes('to=candidate.mun2027%40example.com'));
assert(gmailUrl.includes('su=WEST%20MUN%202027%20%E2%80%94%20Application%20Approved'));
// Verify newlines are encoded as %0A
assert(gmailUrl.includes('%0A'));
assert(!gmailUrl.includes('\n'), 'URL should not contain raw unencoded newlines');

const mailtoUrl = buildMailtoUrl(testEmail, testSubject, testBody);
assert(mailtoUrl.startsWith('mailto:candidate.mun2027%40example.com?subject='));
assert(mailtoUrl.includes('subject=WEST%20MUN%202027%20%E2%80%94%20Application%20Approved'));
assert(!mailtoUrl.includes('\n'), 'Mailto should not contain raw unencoded newlines');
console.log('✓ URL encoding for Gmail compose and mailto passed.');

// 2. CONTEXT: APPROVED APPLICANT (EXACT EXAMPLE TEMPLATE)
console.log('\n2. Testing Approved Applicant Template (Exact requirement match)...');
const approvedDelegate = {
  applicantName: 'Sophia Lin',
  applicantEmail: 'sophia@example.edu',
  type: 'delegate',
  status: 'accepted',
};
const { defaultTemplate: approvedTpl } = getEmailTemplates(approvedDelegate);
assert.equal(approvedTpl.id, 'approved');
assert.equal(approvedTpl.subject, 'WEST MUN 2027 — Application Approved');
assert(approvedTpl.body.includes('Hello Sophia Lin,'));
assert(approvedTpl.body.includes('Congratulations! Your application to join WEST MUN 2027 has been approved.'));
assert(approvedTpl.body.includes('Please use the following link to access the next step:'));
assert(approvedTpl.body.includes('https://west-mun.vercel.app/#register'));
assert(approvedTpl.body.includes('If you have any questions, please reply to this email.'));
assert(approvedTpl.body.includes('Best regards,\nWEST MUN Team'));
assert.equal(approvedTpl.gmailUrl, buildGmailComposeUrl(approvedDelegate.applicantEmail, approvedTpl.subject, approvedTpl.body));
console.log('✓ Approved delegate template and links passed.');

// 3. CONTEXT: VOLUNTEER HEAD (SHIFT ASSIGNMENT WITH FULL DETAILS)
console.log('\n3. Testing Volunteer Head Shift Assignment Template...');
const volunteerShift = {
  applicantName: 'Marcus Vance',
  applicantEmail: 'marcus.v@example.com',
  type: 'team',
  department: 'volunteers',
  status: 'accepted',
  assignment: {
    title: 'Dais Runner & Delegate Check-In',
    station: 'Auditorium Main Foyer',
    startsAt: '2027-03-12T08:30:00Z',
    endsAt: '2027-03-12T16:30:00Z',
    reportingTo: 'Chief Volunteer Officer Sarah Chen',
    notes: 'Pick up radio headset and runner badge at Room B-12.',
    section: 'general',
  },
};
const { defaultTemplate: volTpl } = getEmailTemplates(volunteerShift);
assert.equal(volTpl.id, 'shift_assignment');
assert.equal(volTpl.subject, 'WEST MUN 2027 — Volunteer Shift Assignment & Schedule');
assert(volTpl.body.includes('Hello Marcus Vance,'));
assert(volTpl.body.includes('• Department: Volunteers'));
assert(volTpl.body.includes('• Role / Station: Dais Runner & Delegate Check-In'));
assert(volTpl.body.includes('• Reporting Location: Auditorium Main Foyer'));
assert(volTpl.body.includes('• Supervisor: Chief Volunteer Officer Sarah Chen'));
assert(volTpl.body.includes('• Reporting & Handover Instructions: Pick up radio headset and runner badge at Room B-12.'));
assert(volTpl.body.includes('https://west-mun.vercel.app/volunteer'));
console.log('✓ Volunteer shift assignment context and portal route passed.');

// 4. CONTEXT: MEDIA HEAD (MEDIA COVERAGE ASSIGNMENT)
console.log('\n4. Testing Media Head Duty Assignment Template...');
const mediaDuty = {
  applicantName: 'Elena Rostova',
  applicantEmail: 'elena.press@example.org',
  type: 'team',
  department: 'media',
  status: 'accepted',
  assignment: {
    title: 'Opening Plenary Lead Photographer',
    station: 'Grand Assembly Hall - Stage Left & Press Riser',
    startsAt: '2027-03-12T09:00:00Z',
    endsAt: '2027-03-12T13:00:00Z',
    reportingTo: 'Media Director Alex Rivera',
    notes: 'Bring standard zoom lens; SD cards will be provided for raw dump at 13:15.',
  },
};
const { defaultTemplate: mediaTpl } = getEmailTemplates(mediaDuty);
assert.equal(mediaTpl.id, 'shift_assignment');
assert.equal(mediaTpl.subject, 'WEST MUN 2027 — Media Assignment & Coverage Briefing');
assert(mediaTpl.body.includes('Hello Elena Rostova,'));
assert(mediaTpl.body.includes('• Department: Media & Press'));
assert(mediaTpl.body.includes('• Task / Assignment: Opening Plenary Lead Photographer'));
assert(mediaTpl.body.includes('• Duty Location: Grand Assembly Hall - Stage Left & Press Riser'));
assert(mediaTpl.body.includes('• Reporting Lead: Media Director Alex Rivera'));
assert(mediaTpl.body.includes('https://west-mun.vercel.app/media'));
console.log('✓ Media Head assignment context and portal route passed.');

// 5. CONTEXT: SECURITY HEAD (POST & PROTOCOL BRIEFING)
console.log('\n5. Testing Security Head Post Assignment Template...');
const securityPost = {
  applicantName: 'Tariq Al-Mansoor',
  applicantEmail: 'tariq.security@example.com',
  type: 'team',
  department: 'security',
  status: 'accepted',
  assignment: {
    title: 'VIP Delegations Access Checkpoint Post #3',
    station: 'North Gate Entrance & Delegate Accreditation Hall',
    startsAt: '2027-03-12T07:45:00Z',
    endsAt: '2027-03-12T15:00:00Z',
    reportingTo: 'Security Commander Liam Scott',
    notes: 'Ensure all lanyard badges are checked against digital accreditation scanner.',
  },
};
const { defaultTemplate: secTpl } = getEmailTemplates(securityPost);
assert.equal(secTpl.id, 'shift_assignment');
assert.equal(secTpl.subject, 'WEST MUN 2027 — Security Post Assignment & Protocol Briefing');
assert(secTpl.body.includes('Hello Tariq Al-Mansoor,'));
assert(secTpl.body.includes('• Department: Security & Protocol'));
assert(secTpl.body.includes('• Post / Assignment: VIP Delegations Access Checkpoint Post #3'));
assert(secTpl.body.includes('• Duty Location / Checkpoint: North Gate Entrance & Delegate Accreditation Hall'));
assert(secTpl.body.includes('• Reporting Officer: Security Commander Liam Scott'));
assert(secTpl.body.includes('https://west-mun.vercel.app/security'));
console.log('✓ Security Head assignment context and portal route passed.');

// 6. CONTEXT: REJECTED APPLICANT (RESPECTFUL, NO INVENTED REASONS)
console.log('\n6. Testing Rejected Applicant Template...');
const rejectedCandidate = {
  applicantName: 'Daniel Brooks',
  applicantEmail: 'daniel@example.com',
  type: 'team',
  department: 'volunteers',
  status: 'rejected',
};
const { defaultTemplate: rejTpl } = getEmailTemplates(rejectedCandidate);
assert.equal(rejTpl.id, 'rejected');
assert.equal(rejTpl.subject, 'WEST MUN 2027 — Application Status Update');
assert(rejTpl.body.includes('Thank you for your interest in WEST MUN 2027'));
assert(rejTpl.body.includes('Due to high applicant volume and limited openings'));
assert(!rejTpl.body.includes('you failed') && !rejTpl.body.includes('bad interview'));
console.log('✓ Respectful rejected application template passed.');

// 7. CONTEXT: PENDING APPLICATION
console.log('\n7. Testing Pending Application Template...');
const pendingCandidate = {
  applicantName: 'Amara Okafor',
  applicantEmail: 'amara@example.com',
  type: 'team',
  department: 'security',
  status: 'received',
};
const { defaultTemplate: pendTpl } = getEmailTemplates(pendingCandidate);
assert.equal(pendTpl.id, 'pending');
assert.equal(pendTpl.subject, 'WEST MUN 2027 — Application Received & Under Review');
assert(pendTpl.body.includes('currently under review by our department heads and Secretariat'));
console.log('✓ Pending application template passed.');

// 8. CONTEXT: MISSING INFORMATION
console.log('\n8. Testing Missing Information Template with specific note...');
const missingInfoCandidate = {
  applicantName: 'Lucas Grey',
  applicantEmail: 'lucas@example.com',
  type: 'team',
  department: 'volunteers',
  missingInfoNote: '1. Scanned Government ID / Student Card\n2. Emergency Contact Phone Number',
  templateType: 'missing_info',
};
const { defaultTemplate: missTpl } = getEmailTemplates(missingInfoCandidate);
assert.equal(missTpl.id, 'missing_info');
assert.equal(missTpl.subject, 'WEST MUN 2027 — Additional Information Needed');
assert(missTpl.body.includes('Specific items needed:'));
assert(missTpl.body.includes('Scanned Government ID / Student Card'));
assert(missTpl.body.includes('Emergency Contact Phone Number'));
console.log('✓ Missing information template with specific details passed.');

// 9. CONTEXT: INQUIRY REPLY
console.log('\n9. Testing Contact Form Inquiry Reply Template...');
const inquiryContext = {
  applicantName: 'Dr. Evelyn Reed',
  applicantEmail: 'ereed@university.edu',
  inquirySubject: 'Delegation Accommodation & Shuttle Inquiries',
  templateType: 'inquiry_reply',
};
const { defaultTemplate: inqTpl } = getEmailTemplates(inquiryContext);
assert.equal(inqTpl.id, 'inquiry_reply');
assert(inqTpl.subject.includes('Re: Delegation Accommodation & Shuttle Inquiries'));
assert(inqTpl.body.includes('Regarding your inquiry about "Delegation Accommodation & Shuttle Inquiries":'));
console.log('✓ Inquiry reply template passed.');

// 10. SECURITY & CONFIDENTIALITY CHECK (No leaked tokens or admin passwords)
console.log('\n10. Testing Security & Confidentiality Guardrails...');
const allTemplates = getEmailTemplates({
  applicantName: 'Test Applicant',
  applicantEmail: 'test@example.com',
  type: 'team',
  department: 'volunteers',
  status: 'accepted',
  assignment: {
    title: 'Logistics Staff',
    station: 'Desk A',
  },
}).templates;

for (const tpl of allTemplates) {
  assert(!tpl.body.includes('/admin'), 'Must not contain admin URLs');
  assert(!tpl.body.includes('/head'), 'Must not contain head URLs');
  assert(!tpl.body.includes('password'), 'Must not contain passwords');
  assert(!tpl.body.includes('token'), 'Must not contain session tokens');
  assert(!tpl.body.includes('eyJ'), 'Must not contain JWT tokens');
}
console.log('✓ No admin routes, tokens, or credentials present in any email templates.');

console.log('\n======================================================');
console.log('ALL APPLICANT EMAIL DISPATCH TESTS PASSED SUCCESSFULLY');
console.log('======================================================');
