import {
  AlertTriangle,
  Award,
  Boxes,
  Building2,
  Bug,
  CalendarDays,
  Camera,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Code2,
  FileCheck2,
  Flame,
  Handshake,
  Image as ImageIcon,
  Layers,
  ListOrdered,
  MapPin,
  Megaphone,
  Mic,
  Package,
  Send,
  ServerCog,
  ShieldCheck,
  Siren,
  Sparkles,
  Truck,
  UserCheck,
  Video,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { DepartmentKey } from './departments';

/**
 * Department workspaces are data-driven projections over public.department_records.
 * Each module maps to one `category` value; every field below is stored inside the
 * record's `data` jsonb object so the SQL schema stays stable.
 */

export type WorkspaceFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'time'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'url'
  | 'email';

export interface WorkspaceField {
  key: string;
  label: string;
  type: WorkspaceFieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  help?: string;
  wide?: boolean;
}

export interface WorkspaceModule {
  /** Stable view id used by the dashboard router (never contains a colon). */
  id: string;
  category: string;
  label: string;
  navLabel: string;
  description: string;
  icon: LucideIcon;
  /** Ordered workflow statuses shown in forms and filters. */
  statuses: string[];
  defaultStatus: string;
  /** Statuses that mean the item no longer needs attention. */
  closedStatuses: string[];
  titleLabel: string;
  titlePlaceholder?: string;
  fields: WorkspaceField[];
  emptyTitle: string;
  emptyDescription: string;
}

/* ------------------------------------------------------------------ *
 * Design
 * ------------------------------------------------------------------ */
const designModules: WorkspaceModule[] = [
  {
    id: 'design-tasks',
    category: 'task',
    label: 'Design tasks',
    navLabel: 'Tasks',
    description:
      'Every visual deliverable with an owner, a deadline, and an approval state. Revisions are tracked in their own module.',
    icon: ClipboardList,
    statuses: ['Backlog', 'In Progress', 'In Review', 'Changes Requested', 'Approved', 'Blocked'],
    defaultStatus: 'Backlog',
    closedStatuses: ['Approved'],
    titleLabel: 'Deliverable',
    titlePlaceholder: 'e.g. UNSC placard template',
    fields: [
      { key: 'assignee', label: 'Owner', type: 'text', placeholder: 'Designer or team' },
      {
        key: 'deliverable_type',
        label: 'Deliverable type',
        type: 'select',
        options: ['Placards', 'Banner', 'Social asset', 'Publication', 'Signage', 'Stage visual', 'Other'],
      },
      { key: 'due_date', label: 'Deadline', type: 'date' },
      { key: 'revision_count', label: 'Revisions so far', type: 'number', placeholder: '0' },
      { key: 'approver', label: 'Approver', type: 'text', placeholder: 'Secretariat member' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No design tasks yet',
    emptyDescription: 'Add the first deliverable so deadlines and approvals are tracked in one place.',
  },
  {
    id: 'design-revisions',
    category: 'revision',
    label: 'Revisions & approvals',
    navLabel: 'Revisions',
    description: 'Feedback rounds, requested changes, and who signed off on each revision.',
    icon: FileCheck2,
    statuses: ['Open', 'In Revision', 'Awaiting Approval', 'Approved', 'Rejected'],
    defaultStatus: 'Open',
    closedStatuses: ['Approved', 'Rejected'],
    titleLabel: 'Revision request',
    titlePlaceholder: 'e.g. Placard border round 2',
    fields: [
      { key: 'round', label: 'Revision round', type: 'number', placeholder: '1' },
      { key: 'requested_by', label: 'Requested by', type: 'text' },
      { key: 'due_date', label: 'Response due', type: 'date' },
      { key: 'feedback', label: 'Feedback', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No revision requests',
    emptyDescription: 'Revision rounds raised by the Secretariat or other departments will appear here.',
  },
  {
    id: 'design-assets',
    category: 'asset',
    label: 'Creative assets library',
    navLabel: 'Assets',
    description: 'Approved logos, backdrops, and templates with version history and file links.',
    icon: ImageIcon,
    statuses: ['Pending', 'Approved', 'Superseded', 'Archived'],
    defaultStatus: 'Pending',
    closedStatuses: ['Approved', 'Superseded', 'Archived'],
    titleLabel: 'Asset name',
    titlePlaceholder: 'e.g. WEST MUN 2027 crest (vector)',
    fields: [
      { key: 'asset_type', label: 'Asset type', type: 'select', options: ['Logo', 'Backdrop', 'Template', 'Icon set', 'Publication', 'Photo', 'Other'] },
      { key: 'version', label: 'Version', type: 'text', placeholder: 'v1.0' },
      { key: 'format', label: 'Format', type: 'text', placeholder: 'SVG / PNG / AI' },
      { key: 'file_url', label: 'File or folder link', type: 'url', placeholder: 'https://…', wide: true },
      { key: 'approved_by', label: 'Approved by', type: 'text' },
      { key: 'usage_notes', label: 'Usage notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'Asset library is empty',
    emptyDescription: 'Record approved artwork here so the whole team uses the latest version.',
  },
  {
    id: 'design-web-content',
    category: 'web_content',
    label: 'Website content',
    navLabel: 'Website content',
    description:
      'Content change requests for the public site. Publishing remains restricted to administrators; this module tracks drafting and approval.',
    icon: Layers,
    statuses: ['Requested', 'Drafting', 'Awaiting Approval', 'Approved', 'Published', 'Rejected'],
    defaultStatus: 'Requested',
    closedStatuses: ['Published', 'Rejected'],
    titleLabel: 'Content request',
    titlePlaceholder: 'e.g. Committee dossier hero copy',
    fields: [
      { key: 'page', label: 'Page or section', type: 'text', placeholder: 'Committees, Hero, About…' },
      { key: 'content_type', label: 'Content type', type: 'select', options: ['Copy', 'Image', 'Video', 'Document', 'Layout', 'Other'] },
      { key: 'publish_target', label: 'Target publish date', type: 'date' },
      { key: 'approved_by', label: 'Approved by', type: 'text' },
      { key: 'draft_link', label: 'Draft link', type: 'url', wide: true },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No website content requests',
    emptyDescription: 'Track copy, imagery, and layout changes that need approval before publishing.',
  },
];

/* ------------------------------------------------------------------ *
 * Marketing
 * ------------------------------------------------------------------ */
const marketingModules: WorkspaceModule[] = [
  {
    id: 'marketing-campaigns',
    category: 'campaign',
    label: 'Campaigns',
    navLabel: 'Campaigns',
    description: 'Outreach campaigns with owners, windows, and channel plans.',
    icon: Megaphone,
    statuses: ['Planning', 'Active', 'Paused', 'Completed', 'Cancelled'],
    defaultStatus: 'Planning',
    closedStatuses: ['Completed', 'Cancelled'],
    titleLabel: 'Campaign',
    titlePlaceholder: 'e.g. Institutional outreach — GCC schools',
    fields: [
      { key: 'owner', label: 'Owner', type: 'text' },
      { key: 'channels', label: 'Channels', type: 'text', placeholder: 'Instagram, email, school visits' },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'goal', label: 'Goal', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No campaigns yet',
    emptyDescription: 'Create a campaign to plan channels, dates, and the owner responsible.',
  },
  {
    id: 'marketing-calendar',
    category: 'calendar',
    label: 'Content calendar',
    navLabel: 'Calendar',
    description: 'Planned posts and announcements across every channel.',
    icon: CalendarDays,
    statuses: ['Idea', 'Drafting', 'In Review', 'Scheduled', 'Published', 'Cancelled'],
    defaultStatus: 'Idea',
    closedStatuses: ['Published', 'Cancelled'],
    titleLabel: 'Calendar entry',
    titlePlaceholder: 'e.g. Early-bird deadline countdown',
    fields: [
      { key: 'publish_date', label: 'Publish date', type: 'date' },
      { key: 'publish_time', label: 'Publish time', type: 'time' },
      { key: 'platform', label: 'Platform', type: 'select', options: ['Instagram', 'LinkedIn', 'TikTok', 'X', 'Email', 'Website', 'Print'] },
      { key: 'owner', label: 'Owner', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'Calendar is empty',
    emptyDescription: 'Add your first scheduled post to build the content calendar.',
  },
  {
    id: 'marketing-posts',
    category: 'post',
    label: 'Captions & drafts',
    navLabel: 'Captions',
    description: 'Caption drafts and promotional copy awaiting review.',
    icon: Send,
    statuses: ['Draft', 'Needs Review', 'Approved', 'Published', 'Rejected'],
    defaultStatus: 'Draft',
    closedStatuses: ['Published', 'Rejected'],
    titleLabel: 'Post title',
    titlePlaceholder: 'e.g. Delegate applications open',
    fields: [
      { key: 'platform', label: 'Platform', type: 'select', options: ['Instagram', 'LinkedIn', 'TikTok', 'X', 'Email', 'Website'] },
      { key: 'scheduled_date', label: 'Scheduled date', type: 'date' },
      { key: 'caption', label: 'Caption / copy', type: 'textarea', wide: true, placeholder: 'Paste the full caption draft' },
      { key: 'asset_link', label: 'Linked asset', type: 'url', wide: true },
    ],
    emptyTitle: 'No caption drafts',
    emptyDescription: 'Draft captions here and move them through review before publishing.',
  },
  {
    id: 'marketing-assets',
    category: 'asset',
    label: 'Marketing assets',
    navLabel: 'Assets',
    description: 'Promotional artwork and brand files with review status.',
    icon: Boxes,
    statuses: ['Pending', 'Approved', 'Archived'],
    defaultStatus: 'Pending',
    closedStatuses: ['Approved', 'Archived'],
    titleLabel: 'Asset',
    titlePlaceholder: 'e.g. Delegate recruitment story set',
    fields: [
      { key: 'asset_type', label: 'Type', type: 'select', options: ['Image', 'Video', 'Document', 'Template', 'Other'] },
      { key: 'file_url', label: 'File link', type: 'url', wide: true },
      { key: 'owner', label: 'Owner', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No marketing assets',
    emptyDescription: 'Track approved promotional files so nothing outdated gets published.',
  },
];

/* ------------------------------------------------------------------ *
 * Media / Press
 * ------------------------------------------------------------------ */
const mediaModules: WorkspaceModule[] = [
  {
    id: 'media-coverage',
    category: 'coverage',
    label: 'Coverage assignments',
    navLabel: 'Coverage',
    description: 'Who is filming or photographing which session, and with what kit.',
    icon: Camera,
    statuses: ['Unassigned', 'Assigned', 'In Progress', 'Completed', 'Cancelled'],
    defaultStatus: 'Unassigned',
    closedStatuses: ['Completed', 'Cancelled'],
    titleLabel: 'Coverage assignment',
    titlePlaceholder: 'e.g. Opening plenary live feed',
    fields: [
      { key: 'crew', label: 'Crew / lead', type: 'text' },
      { key: 'shoot_date', label: 'Date', type: 'date' },
      { key: 'start_time', label: 'Call time', type: 'time' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'gear', label: 'Gear', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No coverage assignments',
    emptyDescription: 'Assign press crew to sessions so every moment is covered.',
  },
  {
    id: 'media-schedule',
    category: 'schedule',
    label: 'Content schedule',
    navLabel: 'Content schedule',
    description: 'Publication plan for articles, reels, and photo drops.',
    icon: CalendarDays,
    statuses: ['Planned', 'In Progress', 'Review', 'Delivered', 'Cancelled'],
    defaultStatus: 'Planned',
    closedStatuses: ['Delivered', 'Cancelled'],
    titleLabel: 'Content item',
    titlePlaceholder: 'e.g. Day 1 photo recap',
    fields: [
      { key: 'outlet', label: 'Outlet', type: 'select', options: ['Instagram', 'Website', 'Press release', 'Newsletter', 'Print', 'Internal'] },
      { key: 'publish_date', label: 'Publish date', type: 'date' },
      { key: 'owner', label: 'Owner', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No scheduled content',
    emptyDescription: 'Plan publication dates for coverage produced by the press corps.',
  },
  {
    id: 'media-library',
    category: 'asset',
    label: 'Approved media library',
    navLabel: 'Media library',
    description: 'Cleared photos and footage with credit and usage rights recorded.',
    icon: Video,
    statuses: ['Unreviewed', 'Approved', 'Restricted', 'Archived'],
    defaultStatus: 'Unreviewed',
    closedStatuses: ['Approved', 'Restricted', 'Archived'],
    titleLabel: 'Media item',
    titlePlaceholder: 'e.g. SG keynote — wide shot',
    fields: [
      { key: 'asset_type', label: 'Media type', type: 'select', options: ['Photo', 'Video', 'Audio', 'Article', 'Graphic'] },
      { key: 'file_url', label: 'File link', type: 'url', wide: true },
      { key: 'credit', label: 'Credit', type: 'text' },
      { key: 'usage_rights', label: 'Usage rights', type: 'select', options: ['Internal only', 'Social media', 'Press use', 'Restricted'] },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'Media library is empty',
    emptyDescription: 'Only cleared media should be recorded here for reuse by other departments.',
  },
];

/* ------------------------------------------------------------------ *
 * Security
 * ------------------------------------------------------------------ */
const securityModules: WorkspaceModule[] = [
  {
    id: 'security-roster',
    category: 'roster',
    label: 'Staff assignments & zones',
    navLabel: 'Roster & zones',
    description: 'Officer postings, zones of responsibility, and shift coverage.',
    icon: ShieldCheck,
    statuses: ['Unstaffed', 'Staffed', 'Confirmed', 'Handed Over'],
    defaultStatus: 'Unstaffed',
    closedStatuses: ['Handed Over'],
    titleLabel: 'Post',
    titlePlaceholder: 'e.g. Chamber 3 entry control',
    fields: [
      { key: 'officer', label: 'Officer in charge', type: 'text' },
      { key: 'zone', label: 'Zone', type: 'text', placeholder: 'North lobby…' },
      { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Afternoon', 'Evening', 'Night'] },
      { key: 'headcount', label: 'Assigned staff', type: 'number', placeholder: '2' },
      { key: 'radio_channel', label: 'Radio channel', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No posts assigned',
    emptyDescription: 'Add posts and zones so every area has a named officer.',
  },
  {
    id: 'security-incidents',
    category: 'incident',
    label: 'Incident log',
    navLabel: 'Incidents',
    description:
      'Confidential incident records. Visible only to Security heads and administrators — other departments cannot read this category.',
    icon: Siren,
    statuses: ['Open', 'Investigating', 'Resolved', 'Escalated'],
    defaultStatus: 'Open',
    closedStatuses: ['Resolved'],
    titleLabel: 'Incident',
    titlePlaceholder: 'Short neutral summary',
    fields: [
      { key: 'occurred_on', label: 'Date', type: 'date' },
      { key: 'occurred_at', label: 'Time', type: 'time' },
      { key: 'zone', label: 'Zone', type: 'text' },
      { key: 'severity', label: 'Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
      { key: 'action_taken', label: 'Action taken', type: 'textarea', wide: true },
      { key: 'follow_up', label: 'Follow-up date', type: 'date' },
      { key: 'confidential', label: 'Confidential', type: 'checkbox' },
    ],
    emptyTitle: 'No incidents recorded',
    emptyDescription: 'Log an incident as soon as it is reported so follow-up is never lost.',
  },
  {
    id: 'security-checklists',
    category: 'checklist',
    label: 'Event-day checklists',
    navLabel: 'Checklists',
    description: 'Opening, session, and closing checks with sign-off.',
    icon: CheckSquare,
    statuses: ['Pending', 'Verified', 'Issue Found'],
    defaultStatus: 'Pending',
    closedStatuses: ['Verified'],
    titleLabel: 'Checklist item',
    titlePlaceholder: 'e.g. Emergency exits clear',
    fields: [
      { key: 'checklist', label: 'Checklist', type: 'select', options: ['Opening', 'Session', 'Closing', 'Daily', 'Emergency'] },
      { key: 'verified_by', label: 'Verified by', type: 'text' },
      { key: 'verified_on', label: 'Verified on', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No checklist items',
    emptyDescription: 'Build the event-day checklist so nothing is skipped under pressure.',
  },
];

/* ------------------------------------------------------------------ *
 * Volunteers
 * ------------------------------------------------------------------ */
const volunteerModules: WorkspaceModule[] = [
  {
    id: 'volunteers-stations',
    category: 'station',
    label: 'Stations & staffing',
    navLabel: 'Stations',
    description: 'Stations, required headcount, and how many are actually assigned.',
    icon: MapPin,
    statuses: ['Needs Coverage', 'Partially Filled', 'Filled', 'Closed'],
    defaultStatus: 'Needs Coverage',
    closedStatuses: ['Closed'],
    titleLabel: 'Station',
    titlePlaceholder: 'e.g. Dais runners — UNSC',
    fields: [
      { key: 'required', label: 'Required volunteers', type: 'number', placeholder: '4' },
      { key: 'assigned', label: 'Assigned volunteers', type: 'number', placeholder: '0' },
      { key: 'lead', label: 'Station lead', type: 'text' },
      { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Afternoon', 'Evening', 'Full day'] },
      { key: 'responsibilities', label: 'Responsibilities', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No stations defined',
    emptyDescription: 'Define stations with required headcount to expose staffing gaps automatically.',
  },
  {
    id: 'volunteers-shifts',
    category: 'shift',
    label: 'Shift plan',
    navLabel: 'Shifts',
    description: 'Shift windows per station, with the lead responsible.',
    icon: Clock,
    statuses: ['Planned', 'Confirmed', 'Completed', 'Cancelled'],
    defaultStatus: 'Planned',
    closedStatuses: ['Completed', 'Cancelled'],
    titleLabel: 'Shift',
    titlePlaceholder: 'e.g. Registration desk — morning',
    fields: [
      { key: 'shift_date', label: 'Date', type: 'date' },
      { key: 'start_time', label: 'Start', type: 'time' },
      { key: 'end_time', label: 'End', type: 'time' },
      { key: 'station', label: 'Station', type: 'text' },
      { key: 'lead', label: 'Lead', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No shifts planned',
    emptyDescription: 'Add shifts so volunteers know exactly when and where to report.',
  },
  {
    id: 'volunteers-attendance',
    category: 'attendance',
    label: 'Attendance',
    navLabel: 'Attendance',
    description: 'Check-in record per volunteer per shift.',
    icon: UserCheck,
    statuses: ['Expected', 'Present', 'Late', 'Absent', 'Excused'],
    defaultStatus: 'Expected',
    closedStatuses: ['Present', 'Late', 'Absent', 'Excused'],
    titleLabel: 'Volunteer',
    titlePlaceholder: 'Volunteer name',
    fields: [
      { key: 'shift_date', label: 'Date', type: 'date' },
      { key: 'station', label: 'Station', type: 'text' },
      { key: 'checked_in_at', label: 'Check-in time', type: 'time' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No attendance recorded',
    emptyDescription: 'Record check-ins during the event to keep staffing gaps visible.',
  },
  {
    id: 'volunteers-tasks',
    category: 'task',
    label: 'Volunteer task list',
    navLabel: 'Tasks',
    description: 'Preparation and event-day tasks owned by the volunteer team.',
    icon: ClipboardList,
    statuses: ['Open', 'In Progress', 'Blocked', 'Done'],
    defaultStatus: 'Open',
    closedStatuses: ['Done'],
    titleLabel: 'Task',
    titlePlaceholder: 'e.g. Print welcome packs',
    fields: [
      { key: 'assignee', label: 'Owner', type: 'text' },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No volunteer tasks',
    emptyDescription: 'Add preparation tasks so the team knows what to finish before event day.',
  },
];

/* ------------------------------------------------------------------ *
 * PR
 * ------------------------------------------------------------------ */
const prModules: WorkspaceModule[] = [
  {
    id: 'pr-sponsor-tasks',
    category: 'sponsor_task',
    label: 'Sponsor tiers & tasks',
    navLabel: 'Sponsor tasks',
    description: 'Tier commitments and the deliverables owed to each sponsor.',
    icon: Award,
    statuses: ['Prospect', 'Negotiating', 'Confirmed', 'Fulfilled', 'Declined'],
    defaultStatus: 'Prospect',
    closedStatuses: ['Fulfilled', 'Declined'],
    titleLabel: 'Sponsor commitment',
    titlePlaceholder: 'e.g. Title sponsor badge placement',
    fields: [
      { key: 'sponsor', label: 'Sponsor', type: 'text' },
      { key: 'tier', label: 'Tier', type: 'select', options: ['Title', 'Platinum', 'Gold', 'Silver', 'Community', 'In-kind'] },
      { key: 'owner', label: 'Owner', type: 'text' },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'deliverables', label: 'Deliverables', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No sponsor commitments',
    emptyDescription: 'Track what each tier is owed so nothing promised is forgotten.',
  },
  {
    id: 'pr-partners',
    category: 'partner_contact',
    label: 'Partner communications',
    navLabel: 'Partners',
    description: 'Institutional partners, last contact, and next follow-up.',
    icon: Handshake,
    statuses: ['New', 'Contacted', 'Awaiting Reply', 'Meeting Scheduled', 'Closed'],
    defaultStatus: 'New',
    closedStatuses: ['Closed'],
    titleLabel: 'Partner',
    titlePlaceholder: 'e.g. Bank of Amman — CSR',
    fields: [
      { key: 'contact_name', label: 'Contact', type: 'text' },
      { key: 'contact_email', label: 'Email', type: 'email' },
      { key: 'last_contact', label: 'Last contact', type: 'date' },
      { key: 'next_follow_up', label: 'Next follow-up', type: 'date' },
      { key: 'summary', label: 'Conversation summary', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No partner records',
    emptyDescription: 'Log each partner conversation with a follow-up date.',
  },
  {
    id: 'pr-assets',
    category: 'asset',
    label: 'Sponsor logo library',
    navLabel: 'Logo library',
    description:
      'Approved sponsor logos and assets. Upload files in Sponsors management (existing site-files storage); reference them here.',
    icon: ImageIcon,
    statuses: ['Pending Consent', 'Uploaded', 'Approved', 'Archived'],
    defaultStatus: 'Uploaded',
    closedStatuses: ['Approved', 'Archived'],
    titleLabel: 'Sponsor asset',
    titlePlaceholder: 'e.g. Platinum partner logo (white)',
    fields: [
      { key: 'sponsor', label: 'Sponsor', type: 'text' },
      { key: 'asset_type', label: 'Asset type', type: 'select', options: ['Logo', 'Banner', 'Video', 'Document'] },
      { key: 'file_url', label: 'File link', type: 'url', wide: true },
      { key: 'approved_by', label: 'Approved by', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No sponsor assets recorded',
    emptyDescription: 'Record approved logos with usage notes for the design and marketing teams.',
  },
];

/* ------------------------------------------------------------------ *
 * HR
 * ------------------------------------------------------------------ */
const hrModules: WorkspaceModule[] = [
  {
    id: 'hr-tasks',
    category: 'hr_task',
    label: 'HR follow-ups',
    navLabel: 'Follow-ups',
    description: 'Onboarding, accreditation, and welfare follow-up work.',
    icon: ClipboardList,
    statuses: ['Open', 'In Progress', 'Waiting on Staff', 'Resolved'],
    defaultStatus: 'Open',
    closedStatuses: ['Resolved'],
    titleLabel: 'Follow-up',
    titlePlaceholder: 'e.g. Outstanding conduct sign-offs',
    fields: [
      { key: 'category', label: 'Category', type: 'select', options: ['Onboarding', 'Accreditation', 'Welfare', 'Dispute', 'Training'] },
      { key: 'assignee', label: 'Owner', type: 'text' },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'notes', label: 'Internal notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No HR follow-ups',
    emptyDescription: 'Track onboarding and welfare follow-ups with owners and dates.',
  },
];

/* ------------------------------------------------------------------ *
 * Logistics
 * ------------------------------------------------------------------ */
const logisticsModules: WorkspaceModule[] = [
  {
    id: 'logistics-venues',
    category: 'venue',
    label: 'Venue operations',
    navLabel: 'Venues',
    description:
      'Rooms, capacity, setup, and access windows. Venue records are also readable to other department heads.',
    icon: Building2,
    statuses: ['Proposed', 'Confirmed', 'Setup In Progress', 'Ready', 'Released'],
    defaultStatus: 'Proposed',
    closedStatuses: ['Ready', 'Released'],
    titleLabel: 'Venue / room',
    titlePlaceholder: 'e.g. Grand plenary hall',
    fields: [
      { key: 'room', label: 'Room', type: 'text' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'setup', label: 'Setup', type: 'select', options: ['Theatre', 'Classroom', 'Dais', 'Round tables', 'Reception', 'Backstage'] },
      { key: 'access_window', label: 'Access window', type: 'text', placeholder: '07:00 – 21:00' },
      { key: 'av_notes', label: 'AV notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No venue records',
    emptyDescription: 'Add rooms and access windows so every team knows where it can operate.',
  },
  {
    id: 'logistics-equipment',
    category: 'equipment',
    label: 'Equipment',
    navLabel: 'Equipment',
    description: 'Audio, visual, and staging equipment with delivery status.',
    icon: Wrench,
    statuses: ['Requested', 'Ordered', 'In Transit', 'Delivered', 'Installed', 'Returned'],
    defaultStatus: 'Requested',
    closedStatuses: ['Installed', 'Returned'],
    titleLabel: 'Equipment item',
    titlePlaceholder: 'e.g. Floor microphones (32 units)',
    fields: [
      { key: 'quantity_needed', label: 'Needed', type: 'number' },
      { key: 'quantity_sourced', label: 'Sourced', type: 'number' },
      { key: 'vendor', label: 'Vendor', type: 'text' },
      { key: 'delivery_date', label: 'Delivery date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No equipment tracked',
    emptyDescription: 'Track quantities needed versus sourced so shortages are caught early.',
  },
  {
    id: 'logistics-supplies',
    category: 'supply',
    label: 'Supplies & procurement',
    navLabel: 'Supplies',
    description: 'Stationery, printed material, and catering procurement.',
    icon: Package,
    statuses: ['Requested', 'Approved', 'Ordered', 'Delivered', 'Cancelled'],
    defaultStatus: 'Requested',
    closedStatuses: ['Delivered', 'Cancelled'],
    titleLabel: 'Supply item',
    titlePlaceholder: 'e.g. Wooden committee gavels',
    fields: [
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'cost', label: 'Estimated cost', type: 'text' },
      { key: 'delivery_date', label: 'Delivery date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No supplies requested',
    emptyDescription: 'Raise supply requests with quantities and delivery dates.',
  },
  {
    id: 'logistics-readiness',
    category: 'checklist',
    label: 'Readiness checklist',
    navLabel: 'Readiness',
    description: 'Room-by-room readiness checks before the conference opens.',
    icon: ClipboardCheck,
    statuses: ['Pending', 'In Progress', 'Failed', 'Passed'],
    defaultStatus: 'Pending',
    closedStatuses: ['Passed'],
    titleLabel: 'Checklist item',
    titlePlaceholder: 'e.g. Chamber signage installed',
    fields: [
      { key: 'area', label: 'Area', type: 'text' },
      { key: 'verified_by', label: 'Verified by', type: 'text' },
      { key: 'verified_on', label: 'Verified on', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No readiness checks',
    emptyDescription: 'Create the readiness checklist for each venue area.',
  },
  {
    id: 'logistics-tasks',
    category: 'task',
    label: 'Operational tasks',
    navLabel: 'Tasks',
    description: 'Logistics tasks with owners and deadlines.',
    icon: Truck,
    statuses: ['Open', 'In Progress', 'Blocked', 'Done'],
    defaultStatus: 'Open',
    closedStatuses: ['Done'],
    titleLabel: 'Task',
    titlePlaceholder: 'e.g. Book service corridor access',
    fields: [
      { key: 'assignee', label: 'Owner', type: 'text' },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No operational tasks',
    emptyDescription: 'Add logistics tasks with deadlines so nothing slips.',
  },
];

/* ------------------------------------------------------------------ *
 * IT
 * ------------------------------------------------------------------ */
const itModules: WorkspaceModule[] = [
  {
    id: 'it-support',
    category: 'support_task',
    label: 'Technical support tasks',
    navLabel: 'Support',
    description: 'Support requests raised by other departments, with resolution notes.',
    icon: ServerCog,
    statuses: ['Open', 'In Progress', 'Awaiting Info', 'Resolved'],
    defaultStatus: 'Open',
    closedStatuses: ['Resolved'],
    titleLabel: 'Support request',
    titlePlaceholder: 'e.g. Dais laptop cannot mirror',
    fields: [
      { key: 'requester', label: 'Requested by', type: 'text' },
      { key: 'subsystem', label: 'Subsystem', type: 'select', options: ['AV', 'Network', 'Portal', 'Devices', 'Printing', 'Other'] },
      { key: 'due_date', label: 'Target date', type: 'date' },
      { key: 'description', label: 'Description', type: 'textarea', wide: true },
      { key: 'resolution', label: 'Resolution', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No support requests',
    emptyDescription: 'Support requests raised by department heads will be tracked here.',
  },
  {
    id: 'it-issues',
    category: 'issue',
    label: 'Reported issues',
    navLabel: 'Issues',
    description: 'Confirmed technical defects under investigation.',
    icon: Bug,
    statuses: ['Reported', 'Triaged', 'Fixing', 'Monitoring', 'Resolved'],
    defaultStatus: 'Reported',
    closedStatuses: ['Resolved'],
    titleLabel: 'Issue',
    titlePlaceholder: 'e.g. Projector latency in Chamber 4',
    fields: [
      { key: 'subsystem', label: 'Subsystem', type: 'select', options: ['AV', 'Network', 'Portal', 'Devices', 'Printing', 'Other'] },
      { key: 'severity', label: 'Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
      { key: 'reported_by', label: 'Reported by', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea', wide: true },
      { key: 'resolution', label: 'Resolution', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No issues reported',
    emptyDescription: 'Log technical issues with severity so they can be triaged in order.',
  },
  {
    id: 'it-readiness',
    category: 'readiness',
    label: 'Event technology readiness',
    navLabel: 'Readiness',
    description: 'Systems checked before doors open: network, voting, presentation, printing.',
    icon: Code2,
    statuses: ['Not Ready', 'Testing', 'Ready', 'Failed'],
    defaultStatus: 'Not Ready',
    closedStatuses: ['Ready'],
    titleLabel: 'System',
    titlePlaceholder: 'e.g. Digital voting tablets',
    fields: [
      { key: 'system', label: 'System', type: 'select', options: ['Network', 'Voting', 'Presentation', 'Registration desk', 'Printing', 'Backup power'] },
      { key: 'verified_by', label: 'Verified by', type: 'text' },
      { key: 'verified_on', label: 'Verified on', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No readiness checks',
    emptyDescription: 'Record each system check so event-day technology is verified, not assumed.',
  },
];

/* ------------------------------------------------------------------ *
 * Ceremonies
 * ------------------------------------------------------------------ */
const ceremoniesModules: WorkspaceModule[] = [
  {
    id: 'ceremonies-schedule',
    category: 'ceremony',
    label: 'Ceremony schedule',
    navLabel: 'Schedule',
    description: 'Opening and closing ceremony segments with cue times.',
    icon: Sparkles,
    statuses: ['Draft', 'Rehearsed', 'Locked', 'Completed'],
    defaultStatus: 'Draft',
    closedStatuses: ['Completed'],
    titleLabel: 'Segment',
    titlePlaceholder: 'e.g. Secretary-General address',
    fields: [
      { key: 'ceremony', label: 'Ceremony', type: 'select', options: ['Opening', 'Closing', 'Awards', 'Reception'] },
      { key: 'start_time', label: 'Start time', type: 'time' },
      { key: 'duration_min', label: 'Duration (min)', type: 'number' },
      { key: 'owner', label: 'Cue owner', type: 'text' },
      { key: 'cue_notes', label: 'Cue notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No ceremony segments',
    emptyDescription: 'Build the ceremony timeline segment by segment.',
  },
  {
    id: 'ceremonies-run-of-show',
    category: 'run_of_show',
    label: 'Run of show',
    navLabel: 'Run of show',
    description:
      'The minute-by-minute master document. Run-of-show records are also readable to other department heads for coordination.',
    icon: ListOrdered,
    statuses: ['Draft', 'Approved', 'Locked'],
    defaultStatus: 'Draft',
    closedStatuses: ['Locked'],
    titleLabel: 'Run-of-show item',
    titlePlaceholder: 'e.g. National anthem',
    fields: [
      { key: 'segment_order', label: 'Order', type: 'number' },
      { key: 'start_time', label: 'Time', type: 'time' },
      { key: 'cue', label: 'Cue', type: 'text' },
      { key: 'owner', label: 'Responsible', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'Run of show is empty',
    emptyDescription: 'Add the master timeline so every cue has an owner and a time.',
  },
  {
    id: 'ceremonies-rehearsals',
    category: 'rehearsal',
    label: 'Rehearsal plan',
    navLabel: 'Rehearsals',
    description: 'Rehearsal dates, venues, and who must attend.',
    icon: Mic,
    statuses: ['Planned', 'Completed', 'Cancelled'],
    defaultStatus: 'Planned',
    closedStatuses: ['Completed', 'Cancelled'],
    titleLabel: 'Rehearsal',
    titlePlaceholder: 'e.g. Full opening run-through',
    fields: [
      { key: 'rehearsal_date', label: 'Date', type: 'date' },
      { key: 'start_time', label: 'Start', type: 'time' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'attendees', label: 'Required attendees', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No rehearsals planned',
    emptyDescription: 'Schedule rehearsals so speakers and crew are ready on the day.',
  },
  {
    id: 'ceremonies-tasks',
    category: 'task',
    label: 'Ceremony tasks',
    navLabel: 'Tasks',
    description: 'Preparation tasks for the ceremonies team.',
    icon: ClipboardList,
    statuses: ['Open', 'In Progress', 'Blocked', 'Done'],
    defaultStatus: 'Open',
    closedStatuses: ['Done'],
    titleLabel: 'Task',
    titlePlaceholder: 'e.g. Engrave award plaques',
    fields: [
      { key: 'assignee', label: 'Owner', type: 'text' },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No ceremony tasks',
    emptyDescription: 'Add preparation tasks with owners and deadlines.',
  },
];

/* ------------------------------------------------------------------ *
 * DCC
 * ------------------------------------------------------------------ */
const dccModules: WorkspaceModule[] = [
  {
    id: 'dcc-committees',
    category: 'committee',
    label: 'Committee readiness',
    navLabel: 'Readiness',
    description: 'Crisis committee readiness, study guides, and delegate counts.',
    icon: Layers,
    statuses: ['Planning', 'Ready', 'Live', 'Closed'],
    defaultStatus: 'Planning',
    closedStatuses: ['Closed'],
    titleLabel: 'Committee',
    titlePlaceholder: 'e.g. Historic crisis — 1962',
    fields: [
      { key: 'chair', label: 'Chair / crisis director', type: 'text' },
      { key: 'delegates', label: 'Delegates', type: 'number' },
      { key: 'study_guide', label: 'Study guide', type: 'select', options: ['Not started', 'Draft', 'Published'] },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No committee readiness records',
    emptyDescription: 'Track each committee to confirm guides, chairs, and rosters are ready.',
  },
  {
    id: 'dcc-directives',
    category: 'directive',
    label: 'Crisis directives',
    navLabel: 'Directives',
    description: 'Directive workflows: trigger phase, objective, and release state.',
    icon: Flame,
    statuses: ['Draft', 'Sealed', 'Released', 'Resolved'],
    defaultStatus: 'Draft',
    closedStatuses: ['Resolved'],
    titleLabel: 'Directive',
    titlePlaceholder: 'e.g. Midnight naval blockade leak',
    fields: [
      { key: 'trigger_phase', label: 'Trigger phase', type: 'text' },
      { key: 'release_window', label: 'Release window', type: 'text' },
      { key: 'objective', label: 'Scenario objective', type: 'textarea', wide: true },
      { key: 'assets', label: 'Multimedia assets', type: 'text', wide: true },
    ],
    emptyTitle: 'No directives prepared',
    emptyDescription: 'Prepare directives with trigger phases and objectives before the crisis begins.',
  },
  {
    id: 'dcc-tasks',
    category: 'task',
    label: 'Coordination tasks',
    navLabel: 'Tasks',
    description: 'Crisis team preparation and coordination tasks.',
    icon: AlertTriangle,
    statuses: ['Open', 'In Progress', 'Blocked', 'Done'],
    defaultStatus: 'Open',
    closedStatuses: ['Done'],
    titleLabel: 'Task',
    titlePlaceholder: 'e.g. Print directive envelopes',
    fields: [
      { key: 'assignee', label: 'Owner', type: 'text' },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    emptyTitle: 'No coordination tasks',
    emptyDescription: 'Add crisis coordination tasks with owners and deadlines.',
  },
];

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */
export const DEPARTMENT_WORKSPACES: Record<DepartmentKey, WorkspaceModule[]> = {
  design: designModules,
  marketing: marketingModules,
  media_press: mediaModules,
  security: securityModules,
  volunteers: volunteerModules,
  pr: prModules,
  hr: hrModules,
  logistics: logisticsModules,
  it: itModules,
  ceremonies: ceremoniesModules,
  dcc: dccModules,
};

export function getWorkspaceModules(department: DepartmentKey): WorkspaceModule[] {
  return DEPARTMENT_WORKSPACES[department] || [];
}

export function getWorkspaceModule(
  department: DepartmentKey,
  moduleId: string,
): WorkspaceModule | undefined {
  return getWorkspaceModules(department).find((module) => module.id === moduleId);
}

/** Keys that represent a deadline or scheduled date inside `data`. */
const DATE_KEYS = [
  'due_date',
  'deadline',
  'target_date',
  'publish_date',
  'scheduled_date',
  'shoot_date',
  'next_follow_up',
  'last_contact',
  'delivery_date',
  'verified_on',
  'shift_date',
  'rehearsal_date',
  'occurred_on',
  'publish_target',
  'follow_up',
] as const;

export function recordDeadline(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;
  for (const key of DATE_KEYS) {
    const value = data[key];
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
  }
  return null;
}

export function isOpenStatus(module: WorkspaceModule, status: string): boolean {
  const normalized = String(status || '').trim();
  return !module.closedStatuses.some((closed) => closed.toLowerCase() === normalized.toLowerCase());
}

export function isOverdue(module: WorkspaceModule, record: {
  status: string;
  data?: Record<string, unknown> | null;
}): boolean {
  if (!isOpenStatus(module, record.status)) return false;
  const deadline = recordDeadline(record.data);
  if (!deadline) return false;
  const parsed = new Date(`${deadline}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
}

export const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITY_OPTIONS)[number];

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITY_OPTIONS as readonly string[]).includes(value);
}
