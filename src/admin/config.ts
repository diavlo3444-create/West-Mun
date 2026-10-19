// The admin panel is DESCRIBED here, not hand-built screen by screen.
// ContentManager and SettingsManager read this file and draw the forms and
// tables. To add a field later: add the column in supabase/schema.sql, then
// add one line to the matching `fields` list below.
//
// Keep the `max` values equal to the database CHECK limits in schema.sql.

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'image' // upload (or paste a link to) a JPG/PNG/WebP
  | 'file' // upload (or paste a link to) a PDF or image
  | 'url'
  | 'datetime'
  | 'relation'; // pick a row from another table

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  max?: number;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[]; // select
  suggestions?: string[]; // text with a dropdown of ideas (any value still allowed)
  relation?: { table: string; labelKeys: string[] }; // relation
  default?: string | number | boolean;
}

export interface SectionDef {
  id: string;
  label: string;
  table: string;
  description: string;
  titleKey: string;
  subtitleKey?: string;
  /** Show up/down arrows and keep `sort_order` tidy. */
  sortable: boolean;
  /** Rows are ordered and re-ordered only inside the same value of this column. */
  groupKey?: string;
  orderBy: Array<[string, boolean]>;
  deleteWarning?: string;
  fields: FieldDef[];
}

const PUBLISHED: FieldDef = {
  key: 'published',
  label: 'Published',
  type: 'boolean',
  default: true,
  help: 'Untick to hide it from the website without deleting it.',
};

export const SECTIONS: SectionDef[] = [
  {
    id: 'announcements',
    label: 'Announcements',
    table: 'announcements',
    description: 'News shown near the top of the website. The section stays hidden until you publish the first one.',
    titleKey: 'title',
    subtitleKey: 'published_at',
    sortable: false,
    orderBy: [['pinned', false], ['published_at', false]],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, max: 200 },
      { key: 'body', label: 'Message', type: 'textarea', max: 3000 },
      { key: 'published_at', label: 'Publish date', type: 'datetime', help: 'Set a future time to schedule it.' },
      { key: 'pinned', label: 'Pinned to the top', type: 'boolean', default: false },
      PUBLISHED,
    ],
  },
  {
    id: 'secretariat',
    label: 'Secretariat',
    table: 'secretariat',
    description: 'The executive team shown in "The Secretariat" section.',
    titleKey: 'name',
    subtitleKey: 'role',
    sortable: true,
    orderBy: [['sort_order', true], ['created_at', true]],
    fields: [
      { key: 'role', label: 'Role', type: 'text', required: true, max: 120, placeholder: 'Secretary-General' },
      { key: 'name', label: 'Name', type: 'text', required: true, max: 120 },
      { key: 'department', label: 'Department', type: 'text', max: 120, placeholder: 'Executive Leadership' },
      { key: 'bio', label: 'Short bio', type: 'textarea', max: 1500 },
      { key: 'image_url', label: 'Photo', type: 'image', max: 600, help: 'Upload a photo of the person with their permission.' },
      {
        key: 'image_position',
        label: 'Photo focus',
        type: 'select',
        default: 'center',
        options: [
          { value: 'center', label: 'Centre' },
          { value: 'top', label: 'Top (faces near the top)' },
          { value: 'bottom', label: 'Bottom' },
        ],
      },
      { key: 'confirmed', label: 'Appointment confirmed', type: 'boolean', default: true },
      PUBLISHED,
    ],
  },
  {
    id: 'committees',
    label: 'Committees',
    table: 'committees',
    description: 'Committees and agendas.',
    titleKey: 'name',
    subtitleKey: 'type',
    sortable: true,
    orderBy: [['sort_order', true], ['created_at', true]],
    fields: [
      { key: 'name', label: 'Committee name', type: 'text', required: true, max: 160, default: 'TBA' },
      {
        key: 'type',
        label: 'Type',
        type: 'text',
        required: true,
        max: 80,
        default: 'General Assembly',
        suggestions: ['General Assembly', 'Security Council', 'Economic & Social Council', 'Specialized Agency', 'Crisis Committee', 'Regional Body'],
        help: 'Committees with the same type are grouped under one filter button.',
      },
      { key: 'topic', label: 'Agenda / topic', type: 'text', max: 300, default: 'TBA' },
      { key: 'chair', label: 'Chairperson', type: 'text', max: 120, default: 'TBA' },
      { key: 'level', label: 'Delegate level', type: 'text', max: 120, placeholder: 'Novice & Intermediate' },
      { key: 'description', label: 'Description', type: 'textarea', max: 1500 },
      PUBLISHED,
    ],
  },
  {
    id: 'schedule_days',
    label: 'Schedule: days',
    table: 'schedule_days',
    description: 'The days of the conference. Add the sessions of each day under "Schedule: sessions".',
    titleKey: 'title',
    subtitleKey: 'date_text',
    sortable: true,
    orderBy: [['sort_order', true], ['created_at', true]],
    deleteWarning: 'Deleting a day also deletes every session inside it.',
    fields: [
      { key: 'title', label: 'Day title', type: 'text', required: true, max: 200, placeholder: 'Day 1 — Opening' },
      { key: 'date_text', label: 'Date (as text)', type: 'text', max: 80, default: 'TBA', placeholder: '12 March 2027' },
      PUBLISHED,
    ],
  },
  {
    id: 'schedule_sessions',
    label: 'Schedule: sessions',
    table: 'schedule_sessions',
    description: 'The sessions inside each day.',
    titleKey: 'title',
    subtitleKey: 'time_text',
    sortable: true,
    groupKey: 'day_id',
    orderBy: [['sort_order', true], ['created_at', true]],
    fields: [
      { key: 'day_id', label: 'Day', type: 'relation', required: true, relation: { table: 'schedule_days', labelKeys: ['title'] } },
      { key: 'title', label: 'Session title', type: 'text', required: true, max: 200 },
      { key: 'time_text', label: 'Time (as text)', type: 'text', max: 80, default: 'TBA', placeholder: '9:00 – 10:30' },
      { key: 'location', label: 'Location', type: 'text', max: 120, default: 'TBA' },
      { key: 'description', label: 'Description', type: 'textarea', max: 1500 },
      PUBLISHED,
    ],
  },
  {
    id: 'faq',
    label: 'FAQ',
    table: 'faq',
    description: 'Frequently asked questions.',
    titleKey: 'question',
    sortable: true,
    orderBy: [['sort_order', true], ['created_at', true]],
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true, max: 300 },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true, max: 3000 },
      PUBLISHED,
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    table: 'documents',
    description: 'Background guides, handbooks and rules. The section stays hidden until you add the first document.',
    titleKey: 'title',
    subtitleKey: 'category',
    sortable: true,
    orderBy: [['sort_order', true], ['created_at', true]],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, max: 200 },
      {
        key: 'category',
        label: 'Category',
        type: 'text',
        max: 60,
        default: 'Other',
        suggestions: ['Background Guide', 'Delegate Handbook', 'Rules of Procedure', 'Position Paper Guide', 'Other'],
      },
      { key: 'description', label: 'Description', type: 'textarea', max: 600 },
      { key: 'file_url', label: 'File', type: 'file', required: true, max: 600 },
      PUBLISHED,
    ],
  },
  {
    id: 'sponsors',
    label: 'Sponsors',
    table: 'sponsors',
    description: 'Sponsors and partners. The section stays hidden until you add the first one.',
    titleKey: 'name',
    subtitleKey: 'tier',
    sortable: true,
    orderBy: [['sort_order', true], ['created_at', true]],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, max: 160 },
      { key: 'tier', label: 'Tier', type: 'text', max: 60, suggestions: ['Title Sponsor', 'Gold', 'Silver', 'Partner'] },
      { key: 'logo_url', label: 'Logo', type: 'image', max: 600 },
      { key: 'website_url', label: 'Website', type: 'url', max: 600, placeholder: 'https://example.com' },
      { key: 'description', label: 'Description', type: 'textarea', max: 1500, placeholder: 'Brief overview of partnership or sponsor involvement' },
      PUBLISHED,
    ],
  },
];

// ---------------------------------------------------------------------------
// Settings (key/value). They are PUBLIC: never put secrets in here.
// ---------------------------------------------------------------------------
export type SettingType = 'text' | 'textarea' | 'boolean' | 'date' | 'number' | 'url' | 'email';

export interface SettingField {
  key: string;
  label: string;
  type: SettingType;
  help?: string;
  placeholder?: string;
  max?: number;
}

export interface SettingGroup {
  id: string;
  title: string;
  description?: string;
  fields: SettingField[];
}

export const SETTING_GROUPS: SettingGroup[] = [
  {
    id: 'registration',
    title: 'Registration',
    description: 'The master switch, fees and windows. The database enforces these: nobody can register outside them or pay a different price.',
    fields: [
      { key: 'registration_open', label: 'Registration is open (Delegates)', type: 'boolean', help: 'Master switch for delegate applications. Off = nobody can register as a delegate.' },
      { key: 'team_security_open', label: 'Security team registration is open', type: 'boolean', help: 'Independent switch for Security team applications.' },
      { key: 'team_media_open', label: 'Media team registration is open', type: 'boolean', help: 'Independent switch for Media & Press team applications.' },
      { key: 'team_volunteers_open', label: 'Volunteers team registration is open', type: 'boolean', help: 'Independent switch for Volunteer team applications.' },
      { key: 'registration_currency', label: 'Currency', type: 'text', max: 10, placeholder: 'USD' },
      { key: 'fee_early_bird', label: 'Early Bird fee', type: 'number', help: 'Numbers only, e.g. 10 or 12.50. Leave empty to show "TBA".' },
      { key: 'early_bird_opens', label: 'Early Bird opens', type: 'date', help: 'Optional. Dates are checked in UTC.' },
      { key: 'early_bird_closes', label: 'Early Bird closes (last day)', type: 'date', help: 'Optional. The closing day itself is still open.' },
      { key: 'fee_regular', label: 'Regular fee', type: 'number' },
      { key: 'regular_opens', label: 'Regular opens', type: 'date' },
      { key: 'regular_closes', label: 'Regular closes (last day)', type: 'date' },
    ],
  },
  {
    id: 'general',
    title: 'Conference details',
    fields: [
      { key: 'conference_dates', label: 'Conference dates', type: 'text', max: 120, placeholder: 'TBA' },
      { key: 'conference_venue', label: 'Venue / city', type: 'text', max: 160, placeholder: 'TBA' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact & links',
    fields: [
      { key: 'contact_email', label: 'Official email', type: 'email', max: 120, help: 'Shown on the website and in the legal pages. Empty shows "TBA".' },
      { key: 'instagram_handle', label: 'Instagram handle', type: 'text', max: 60, placeholder: '@westmun_27' },
      { key: 'instagram_url', label: 'Instagram link', type: 'url', max: 300, placeholder: 'https://www.instagram.com/westmun_27' },
    ],
  },
  {
    id: 'texts',
    title: 'Page texts',
    fields: [
      { key: 'registration_intro', label: 'Registration intro paragraph', type: 'textarea', max: 1000 },
      { key: 'registration_notice_title', label: 'Registration notice: title (while closed)', type: 'text', max: 160 },
      { key: 'registration_notice_text', label: 'Registration notice: text (while closed)', type: 'textarea', max: 1000 },
      { key: 'contact_intro', label: 'Contact section intro', type: 'textarea', max: 600 },
    ],
  },
  {
    id: 'legal',
    title: 'Legal',
    description: 'Used by the Terms of Service and Privacy Policy pages. Have a lawyer review those pages before you collect real registrations.',
    fields: [
      { key: 'organizer_name', label: 'Organiser / legal name', type: 'text', max: 160, help: 'Who is responsible for the conference, e.g. your school, club or company name.' },
      { key: 'legal_country', label: 'Governing country', type: 'text', max: 80, help: 'Country whose law applies, e.g. Saudi Arabia.' },
      { key: 'legal_version', label: 'Legal version', type: 'text', max: 40, help: 'A date such as 2026-10-17. Change it whenever you change the Terms or Privacy text: each registration records which version was accepted.' },
      { key: 'terms_override', label: 'Terms text (replaces the built-in draft)', type: 'textarea', max: 20000, help: 'Leave empty to use the built-in draft. Format: "## Heading" on its own line, blank line between paragraphs, "- " for bullet points.' },
      { key: 'privacy_override', label: 'Privacy text (replaces the built-in draft)', type: 'textarea', max: 20000, help: 'Same format as above.' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Applications (delegates) and messages (inquiries)
// ---------------------------------------------------------------------------
export const DELEGATE_STATUSES: Array<{ value: string; label: string }> = [
  { value: 'received', label: 'Received' },
  { value: 'under_review', label: 'Under review' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];
export const PAYMENT_STATUSES: Array<{ value: string; label: string }> = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'waived', label: 'Waived' },
  { value: 'refunded', label: 'Refunded' },
];
export const TIER_LABELS: Record<string, string> = { early_bird: 'Early Bird', regular: 'Regular' };
export const TYPE_LABELS: Record<string, string> = { single_delegate: 'Single delegate', school_delegation: 'School delegation' };
export const INQUIRY_STATUSES: Array<{ value: string; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
];
