/**
 * WEST MUN 2027 — Context-Aware Applicant Email Dispatcher
 *
 * Generates URL-encoded Gmail compose links and mailto fallback links
 * with tailored subject lines, recipient information, and prewritten bodies
 * based on applicant status, department, and duty assignments.
 */

export type EmailTemplateType =
  | 'approved'
  | 'rejected'
  | 'pending'
  | 'missing_info'
  | 'shift_assignment'
  | 'general'
  | 'inquiry_reply';

export interface EmailAssignmentInfo {
  title?: string;
  station?: string;
  startsAt?: string;
  endsAt?: string;
  reportingTo?: string;
  notes?: string;
  section?: string | null;
}

export interface ApplicantEmailContext {
  applicantName?: string;
  applicantEmail: string;
  type?: 'delegate' | 'team';
  department?: string | null;
  section?: string | null;
  status?: string | null;
  roleTitle?: string | null;
  institution?: string | null;
  assignment?: EmailAssignmentInfo | null;
  missingInfoNote?: string | null;
  inquirySubject?: string | null;
  templateType?: EmailTemplateType;
}

export interface PreparedEmailTemplate {
  id: EmailTemplateType;
  label: string;
  description: string;
  subject: string;
  body: string;
  gmailUrl: string;
  mailtoUrl: string;
}

/**
 * Returns the canonical WEST MUN production URL without trailing slash.
 */
export function getProductionBaseUrl(): string {
  return 'https://west-mun.vercel.app';
}

/**
 * Returns the appropriate production link for an applicant based on type and department.
 * - Delegates -> #register
 * - Volunteers -> /volunteer
 * - Media -> /media
 * - Security -> /security
 * - Other approved team members -> /login
 */
export function getApprovedNextStepLink(ctx: ApplicantEmailContext): string {
  const prodUrl = getProductionBaseUrl();
  if (ctx.type === 'delegate') {
    return `${prodUrl}/#register`;
  }
  const clean = (ctx.department || '').toLowerCase().trim();
  if (clean === 'volunteers' || clean === 'volunteer') {
    return `${prodUrl}/volunteer`;
  }
  if (clean === 'media' || clean === 'media_press') {
    return `${prodUrl}/media`;
  }
  if (clean === 'security') {
    return `${prodUrl}/security`;
  }
  return `${prodUrl}/login`;
}

/**
 * Returns the department-specific assignment or dashboard portal link.
 */
export function getDepartmentPortalLink(department?: string | null): string {
  const prodUrl = getProductionBaseUrl();
  const clean = (department || '').toLowerCase().trim();
  if (clean === 'volunteers' || clean === 'volunteer') {
    return `${prodUrl}/volunteer`;
  }
  if (clean === 'media' || clean === 'media_press') {
    return `${prodUrl}/media`;
  }
  if (clean === 'security') {
    return `${prodUrl}/security`;
  }
  return `${prodUrl}/login`;
}

/**
 * Normalizes department display labels.
 */
export function formatDepartmentLabel(department?: string | null): string {
  if (!department) return 'WEST MUN';
  const clean = department.toLowerCase().trim();
  switch (clean) {
    case 'security':
      return 'Security & Protocol';
    case 'volunteers':
    case 'volunteer':
      return 'Volunteers';
    case 'media':
    case 'media_press':
      return 'Media & Press';
    case 'design':
      return 'Design & Visuals';
    case 'pr_sponsorship':
    case 'pr':
      return 'PR & Sponsorship';
    case 'hr':
      return 'Human Resources';
    case 'delegates':
    case 'delegate':
      return 'Delegations';
    default:
      return department.charAt(0).toUpperCase() + department.slice(1);
  }
}

/**
 * Safe date formatter for shift/duty schedule strings.
 */
export function formatScheduleDateTime(value?: string | null): string {
  if (!value) return 'TBA';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

/**
 * Builds the URL-encoded Gmail compose link.
 * URL structure: https://mail.google.com/mail/?view=cm&fs=1&to=RECIPIENT&su=SUBJECT&body=BODY
 * Uses standard encodeURIComponent for RFC 3986 encoding of spaces (%20), line breaks (%0A),
 * query params, and special characters.
 */
export function buildGmailComposeUrl(to: string, subject: string, body: string): string {
  const cleanTo = encodeURIComponent(to.trim());
  const cleanSubject = encodeURIComponent(subject);
  const cleanBody = encodeURIComponent(body);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${cleanTo}&su=${cleanSubject}&body=${cleanBody}`;
}

/**
 * Builds the RFC 6068 mailto URI fallback.
 */
export function buildMailtoUrl(to: string, subject: string, body: string): string {
  const cleanTo = to.trim();
  return `mailto:${encodeURIComponent(cleanTo)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

/**
 * Determines the most context-appropriate default template type.
 */
export function determineDefaultTemplate(ctx: ApplicantEmailContext): EmailTemplateType {
  if (ctx.templateType) return ctx.templateType;

  if (ctx.assignment && (ctx.assignment.title || ctx.assignment.station || ctx.assignment.startsAt)) {
    return 'shift_assignment';
  }

  if (ctx.inquirySubject) {
    return 'inquiry_reply';
  }

  const s = (ctx.status || '').toLowerCase().trim();
  if (s === 'accepted' || s === 'approved') return 'approved';
  if (s === 'rejected' || s === 'declined') return 'rejected';
  if (s === 'received' || s === 'under_review' || s === 'waitlisted' || s === 'pending') {
    return 'pending';
  }

  return 'general';
}

/**
 * Generates all context-aware email templates for a given applicant.
 */
export function getEmailTemplates(ctx: ApplicantEmailContext): {
  templates: PreparedEmailTemplate[];
  defaultTemplate: PreparedEmailTemplate;
} {
  const applicantName = (ctx.applicantName || 'Applicant').trim();
  const email = (ctx.applicantEmail || '').trim();
  const prodUrl = getProductionBaseUrl();
  const deptLabel = formatDepartmentLabel(ctx.department);
  const cleanDept = (ctx.department || '').toLowerCase().trim();

  // Link for next steps (Approved candidate)
  const nextStepLink = getApprovedNextStepLink(ctx);

  // 1. Approved Applicant Template (Matches required format exactly)
  const approvedSubject = 'WEST MUN 2027 — Application Approved';
  const approvedBody = `Hello ${applicantName},

Congratulations! Your application to join WEST MUN 2027 has been approved.

Please use the following link to access the next step:
${nextStepLink}

If you have any questions, please reply to this email.

Best regards,
WEST MUN Team`;

  // 2. Rejected Application Template (respectful, polite, no invented reasons)
  const rejectedSubject = 'WEST MUN 2027 — Application Status Update';
  const rejectedBody = `Hello ${applicantName},

Thank you for your interest in WEST MUN 2027 and for taking the time to submit your application.

Following a thorough review of all candidate submissions, we regret to inform you that we are unable to offer you a position with the WEST MUN 2027 team at this time. Due to high applicant volume and limited openings, difficult decisions had to be made across all departments.

We deeply appreciate your dedication and encourage you to follow future WEST MUN announcements and opportunities:
${prodUrl}

Best regards,
WEST MUN Secretariat`;

  // 3. Pending Application Template (brief update that application is still under review)
  const pendingSubject = 'WEST MUN 2027 — Application Received & Under Review';
  const pendingBody = `Hello ${applicantName},

Thank you for submitting your application to WEST MUN 2027.

We wanted to let you know that your application is currently under review by our department heads and Secretariat. We are evaluating candidate submissions carefully and will notify you as soon as a final decision is reached.

If you have any questions or updates to share regarding your application in the meantime, please feel free to reply directly to this email.

Conference details and updates:
${prodUrl}

Best regards,
WEST MUN Team`;

  // 4. Missing Information Template (only includes specific missing info if known)
  const missingInfoSubject = 'WEST MUN 2027 — Additional Information Needed';
  const missingDetail = ctx.missingInfoNote?.trim()
    ? `Specific items needed:\n${ctx.missingInfoNote.trim()}\n`
    : 'Please review your application details and reply to this email with any missing information or requested verification documents.\n';
  const missingInfoBody = `Hello ${applicantName},

Thank you for applying to WEST MUN 2027.

During the review of your application, our team noticed that some additional information is needed to complete your evaluation.

${missingDetail}
Please reply to this email at your earliest convenience so our team can proceed with your application.

Best regards,
WEST MUN Team`;

  // 5. Department-Specific Shift or Duty Assignment Template
  const isVolunteer = cleanDept.includes('volunteer');
  const isMedia = cleanDept.includes('media');
  const isSecurity = cleanDept.includes('security');

  const assignment = ctx.assignment || {};
  const dutyTitle = assignment.title || ctx.roleTitle || 'Operational Assignment';
  const stationLocation = assignment.station || 'Main Conference Venue';
  const startTime = formatScheduleDateTime(assignment.startsAt);
  const endTime = formatScheduleDateTime(assignment.endsAt);
  const reportingSupervisor = assignment.reportingTo || `${deptLabel} Supervisor`;
  const assignmentNotes = assignment.notes?.trim() ? `• Reporting & Handover Instructions: ${assignment.notes.trim()}\n` : '';
  const sectionInfo = assignment.section || ctx.section ? `• Section: ${(assignment.section || ctx.section || '').toUpperCase()}\n` : '';
  const portalLink = getDepartmentPortalLink(ctx.department);

  let shiftSubject = `WEST MUN 2027 — ${deptLabel} Duty Assignment & Briefing`;
  let shiftBody = '';

  if (isVolunteer) {
    // Volunteer shift assignment: includes assigned date, start and end time, station, reporting location, and supervisor
    shiftSubject = 'WEST MUN 2027 — Volunteer Shift Assignment & Schedule';
    shiftBody = `Hello ${applicantName},

Here are your confirmed shift assignment and schedule details for WEST MUN 2027:

• Department: Volunteers
• Role / Station: ${dutyTitle}
• Reporting Location: ${stationLocation}
${sectionInfo}• Shift Schedule: ${startTime} – ${endTime}
• Supervisor: ${reportingSupervisor}
${assignmentNotes}
Please ensure you arrive at your designated station at least 15 minutes before your shift starts. If you encounter any scheduling conflicts, please reply to this email immediately.

Volunteer portal:
${portalLink}

Best regards,
WEST MUN Volunteers Directorate`;
  } else if (isMedia) {
    // Media assignment: includes relevant task, duty location, schedule, and reporting instructions
    shiftSubject = 'WEST MUN 2027 — Media Assignment & Coverage Briefing';
    shiftBody = `Hello ${applicantName},

Here are your confirmed media coverage task and assignment details for WEST MUN 2027:

• Department: Media & Press
• Task / Assignment: ${dutyTitle}
• Duty Location: ${stationLocation}
${sectionInfo}• Schedule: ${startTime} – ${endTime}
• Reporting Lead: ${reportingSupervisor}
${assignmentNotes}
Please ensure all equipment is checked and ready prior to your call time. If you have any technical questions or scheduling conflicts, please reply to this email directly.

Media portal:
${portalLink}

Best regards,
WEST MUN Media & Press Team`;
  } else if (isSecurity) {
    // Security assignment: includes relevant post, duty location, schedule, and reporting instructions
    shiftSubject = 'WEST MUN 2027 — Security Post Assignment & Protocol Briefing';
    shiftBody = `Hello ${applicantName},

Here are your confirmed post assignment and security briefing details for WEST MUN 2027:

• Department: Security & Protocol
• Post / Assignment: ${dutyTitle}
• Duty Location / Checkpoint: ${stationLocation}
${sectionInfo}• Schedule: ${startTime} – ${endTime}
• Reporting Officer: ${reportingSupervisor}
${assignmentNotes}
Please report in full protocol dress at least 15 minutes before your post begins. If you have any questions or conflicts, please reply to this email immediately.

Security portal:
${portalLink}

Best regards,
WEST MUN Security Directorate`;
  } else {
    shiftBody = `Hello ${applicantName},

Here are your confirmed duty assignment and schedule details for WEST MUN 2027:

• Department: ${deptLabel}
• Role / Duty: ${dutyTitle}
• Station / Location: ${stationLocation}
${sectionInfo}• Schedule: ${startTime} – ${endTime}
• Reporting Supervisor: ${reportingSupervisor}
${assignmentNotes}
Please ensure you arrive at least 15 minutes before your assignment begins. If you have any questions, please reply to this email.

Team member portal:
${portalLink}

Best regards,
WEST MUN ${deptLabel} Team`;
  }

  // 6. General Contact Template
  const generalSubject = 'WEST MUN 2027 — Regarding Your Application';
  const generalBody = `Hello ${applicantName},

We are contacting you from the WEST MUN 2027 team regarding your application and participation in the conference.

If you have any questions or require assistance, please feel free to reply directly to this email.

Conference website:
${prodUrl}

Best regards,
WEST MUN Team`;

  // 7. Inquiry Reply Template
  const inquirySubject = ctx.inquirySubject
    ? `WEST MUN 2027 — Re: ${ctx.inquirySubject.trim()}`
    : 'WEST MUN 2027 — Inquiry Follow-Up';
  const inquiryBody = `Hello ${applicantName},

Thank you for reaching out to WEST MUN 2027.

Regarding your inquiry${ctx.inquirySubject ? ` about "${ctx.inquirySubject.trim()}"` : ''}:

If you need any additional information or have further questions, please reply directly to this email.

Conference website:
${prodUrl}

Best regards,
WEST MUN Secretariat`;

  const rawList: Array<{
    id: EmailTemplateType;
    label: string;
    description: string;
    subject: string;
    body: string;
  }> = [
    {
      id: 'approved',
      label: 'Approved Application',
      description: 'Formal acceptance message with next-step instructions',
      subject: approvedSubject,
      body: approvedBody,
    },
    {
      id: 'pending',
      label: 'Application Under Review',
      description: 'Status update informing applicant their dossier is being reviewed',
      subject: pendingSubject,
      body: pendingBody,
    },
    {
      id: 'shift_assignment',
      label: isVolunteer
        ? 'Volunteer Shift Assignment'
        : isMedia
        ? 'Media Coverage Assignment'
        : isSecurity
        ? 'Security Post Assignment'
        : 'Duty Assignment Briefing',
      description: 'Deployment roster times, duty station, reporting supervisor & notes',
      subject: shiftSubject,
      body: shiftBody,
    },
    {
      id: 'missing_info',
      label: 'Request Missing Information',
      description: 'Polite request to provide missing details or documents',
      subject: missingInfoSubject,
      body: missingInfoBody,
    },
    {
      id: 'rejected',
      label: 'Application Update (Respectful)',
      description: 'Respectful notification that application was not successful',
      subject: rejectedSubject,
      body: rejectedBody,
    },
    {
      id: 'general',
      label: 'General WEST MUN Message',
      description: 'Professional message with editable subject and body',
      subject: generalSubject,
      body: generalBody,
    },
    {
      id: 'inquiry_reply',
      label: 'Inquiry Response',
      description: 'Direct reply to contact form inquiry with subject reference',
      subject: inquirySubject,
      body: inquiryBody,
    },
  ];

  const templates: PreparedEmailTemplate[] = rawList.map((t) => ({
    ...t,
    gmailUrl: buildGmailComposeUrl(email, t.subject, t.body),
    mailtoUrl: buildMailtoUrl(email, t.subject, t.body),
  }));

  const defaultId = determineDefaultTemplate(ctx);
  const defaultTemplate =
    templates.find((t) => t.id === defaultId) || templates[0];

  return { templates, defaultTemplate };
}

/**
 * Triggers Gmail compose window in a new browser tab.
 */
export function openGmailCompose(
  ctx: ApplicantEmailContext,
  templateType?: EmailTemplateType
): Window | null {
  const { templates, defaultTemplate } = getEmailTemplates(ctx);
  const selected = templateType
    ? templates.find((t) => t.id === templateType) || defaultTemplate
    : defaultTemplate;

  return window.open(selected.gmailUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Triggers fallback mailto handler.
 */
export function openMailto(
  ctx: ApplicantEmailContext,
  templateType?: EmailTemplateType
): void {
  const { templates, defaultTemplate } = getEmailTemplates(ctx);
  const selected = templateType
    ? templates.find((t) => t.id === templateType) || defaultTemplate
    : defaultTemplate;

  window.location.href = selected.mailtoUrl;
}
