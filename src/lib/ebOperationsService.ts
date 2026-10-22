import { supabase } from './supabase';
import { DEFAULT_SECRETARIAT } from './content';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed';

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface EbTask {
  id: string;
  department: string;
  section: string | null;
  assigned_to_user_id: string | null;
  assigned_to_name: string;
  assigned_by_name: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  station_name: string;
  checklist: TaskChecklistItem[];
  completion_note: string;
  blocker_reason: string;
  reference_links: string[];
  completed_at: string | null;
  created_at: string;
}

export interface EbTaskComment {
  id: string;
  task_id: string;
  author_user_id: string;
  author_name: string;
  author_role: string;
  comment: string;
  created_at: string;
}

export interface StationChecklistItem {
  id: string;
  item: string;
  checked: boolean;
}

export interface EmergencyContact {
  name: string;
  role: string;
  contact: string;
}

export interface EbStation {
  id: string;
  department: string;
  section: string | null;
  name: string;
  location: string;
  purpose: string;
  supervisor_name: string;
  supervisor_contact: string;
  duties: string[];
  equipment: string[];
  opening_checklist: StationChecklistItem[];
  closing_checklist: StationChecklistItem[];
  emergency_contacts: EmergencyContact[];
}

export interface EbShift {
  id: string;
  department: string;
  section: string | null;
  station_id: string | null;
  station_name: string;
  location: string;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  supervisor_name: string;
  supervisor_id?: string | null;
  responsibilities: string;
  handover_notes: string;
  break_schedule?: string;
  checklist?: TaskChecklistItem[];
  capacity: number;
  status: 'scheduled' | 'active' | 'completed' | 'modified' | 'cancelled';
  is_published?: boolean;
  assigned_members?: { id: string; name: string; email: string }[];
}

export interface EbTemplate {
  id: string;
  department: string;
  template_type: 'task' | 'shift_checklist' | 'station_checklist';
  title: string;
  description: string;
  checklist: TaskChecklistItem[];
  created_at?: string;
}

export interface EbShiftAssignment {
  id: string;
  shift_id: string;
  user_id: string;
  member_name: string;
  member_email: string;
  role_title: string;
  department: string;
  section: string | null;
  status: 'confirmed' | 'checked_in' | 'completed' | 'swap_requested' | 'absent';
  notes: string;
  shift?: EbShift;
}

export interface EbShiftSwap {
  id: string;
  assignment_id: string;
  requester_user_id: string;
  requester_name: string;
  target_shift_id: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by?: string | null;
  review_notes?: string;
  created_at: string;
  shift?: EbShift;
}

export interface EbAnnouncement {
  id: string;
  department: string;
  section: string | null;
  title: string;
  body: string;
  priority: 'normal' | 'urgent' | 'critical';
  requires_acknowledgement: boolean;
  author_name: string;
  pinned: boolean;
  created_at: string;
  is_acknowledged?: boolean;
}

export interface EbHierarchyNode {
  id: string;
  department: string;
  section: string | null;
  role_title: string;
  rank_level: number; // 1=Director/Head, 2=Deputy/Co-Head, 3=Supervisor, 4=EB Member
  parent_node_id: string | null;
  assigned_name: string;
  assigned_email: string;
  responsibilities: string;
  contact_email: string;
  contact_phone: string;
  avatar_url?: string;
  /** Source identifiers used to match the EB member's selected reporting head. */
  source_user_id?: string | null;
  source_head_id?: string | null;
  children?: EbHierarchyNode[];
}

export interface EbIncident {
  id: string;
  department: string;
  section: string | null;
  reporter_name: string;
  reporter_role: string;
  category: 'medical' | 'security' | 'decorum' | 'logistics' | 'it_tech' | 'protocol' | 'other';
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'responding' | 'resolved';
  resolution_notes?: string;
  created_at: string;
}

export interface EbNotification {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'shift' | 'announcement' | 'alert' | 'swap';
  timestamp: string;
  read: boolean;
  linkTab?: string;
}

// ---------------------------------------------------------------------------
// Realistic Initial Fallback Data (WEST MUN 2027 Event Operations)
// ---------------------------------------------------------------------------

const FALLBACK_STATIONS: EbStation[] = [
  {
    id: 'st-plenary',
    department: 'all',
    section: null,
    name: 'Plenary Assembly Hall & Dais Protocol',
    location: 'Auditorium Level 1, Main Chamber',
    purpose: 'Oversees Secretariat dais operations, speaker timers, placard decorum, and general assembly proceedings.',
    supervisor_name: 'Fahad Al-Saud (Head of Protocol)',
    supervisor_contact: '+966 50 112 3344',
    duties: [
      'Maintain diplomatic chamber decorum during working caucuses and voting procedures.',
      'Operate official speaker clock and manage speaking list placards.',
      'Ensure VIP delegates and guest dignitaries are escorted to designated podium seating.',
      'Coordinate sound and resolution document delivery with the Dais clerk.',
    ],
    equipment: [
      'Master timer display unit & backup digital stopwatch',
      'Country delegation placard replacement kit',
      'Two handheld wireless microphones (Shure Axient)',
      'Direct landline link to Secretariat Room 204',
    ],
    opening_checklist: [
      { id: 'op-1', item: 'Verify Dais audio feeds and podium microphone levels', checked: true },
      { id: 'op-2', item: 'Check all 45 delegation placards are positioned in alphabetical order', checked: true },
      { id: 'op-3', item: 'Confirm gavel and resolution printing terminal are connected', checked: false },
    ],
    closing_checklist: [
      { id: 'cl-1', item: 'Collect and securely lock master voting ballots', checked: false },
      { id: 'cl-2', item: 'Power down Dais display monitors and wireless audio transceivers', checked: false },
      { id: 'cl-3', item: 'Report chamber status to Secretariat Room 204', checked: false },
    ],
    emergency_contacts: [
      { name: 'Security Command Center', role: 'Emergency Floor Control', contact: '+966 50 999 1100' },
      { name: 'Medical & First Aid Post', role: 'Hall B Corridor Medic', contact: '+966 55 444 8822' },
      { name: 'Secretariat Help Desk', role: 'General Coordinator', contact: '+966 51 223 9944' },
    ],
  },
  {
    id: 'st-registration',
    department: 'volunteers',
    section: null,
    name: 'Executive Registration & Accreditation Desk',
    location: 'West Wing Foyer Entrance Gate 2',
    purpose: 'Handles delegate accreditation, QR pass scanning, welcome kits, and security badge distribution.',
    supervisor_name: 'Leen Mansour (Volunteers Directorate)',
    supervisor_contact: '+966 54 883 1122',
    duties: [
      'Scan digital QR passes of arriving delegates and staff members.',
      'Verify government/school identification against conference attendance registry.',
      'Hand out official conference badge, lanyard, and printed handbook.',
      'Direct delegations to their assigned committee chambers.',
    ],
    equipment: [
      '3x High-speed QR scanner terminals with USB tethering',
      'Badge laminator and credential card stock',
      'Delegation master attendance roster (encrypted tablet)',
    ],
    opening_checklist: [
      { id: 'reg-op-1', item: 'Boot accreditation scanners and verify Wi-Fi connectivity', checked: true },
      { id: 'reg-op-2', item: 'Stack delegate welcome kits and lanyards by committee', checked: true },
    ],
    closing_checklist: [
      { id: 'reg-cl-1', item: 'Tally total checked-in delegates against registered headcount', checked: false },
      { id: 'reg-cl-2', item: 'Box uncollected badges and secure inside storage room A', checked: false },
    ],
    emergency_contacts: [
      { name: 'Central Logistics Lead', role: 'Credential Supply', contact: '+966 50 771 2233' },
      { name: 'Floor Security Officer', role: 'Perimeter Integrity', contact: '+966 50 999 1101' },
    ],
  },
  {
    id: 'st-media',
    department: 'media_press',
    section: null,
    name: 'Media Broadcasting & Press Center',
    location: 'Room 108, North Corridor',
    purpose: 'Coordinates live session broadcasting, press releases, photography coverage, and official social media publishing.',
    supervisor_name: 'Omar Farooq (Media Directorate)',
    supervisor_contact: '+966 56 332 9900',
    duties: [
      'Capture high-resolution photojournalism coverage of all committee chambers.',
      'Produce real-time daily digest and plenary highlights video.',
      'Manage official WEST MUN press Instagram and X feeds.',
      'Record keynote addresses and ambassador interviews.',
    ],
    equipment: [
      'Sony Alpha 7 IV camera kits with prime lenses',
      'High-speed media ingest station and NAS storage unit',
      'Wireless lavalier microphone kit and LED video panels',
    ],
    opening_checklist: [
      { id: 'med-op-1', item: 'Format SD cards and verify battery charge on all 4 cameras', checked: true },
      { id: 'med-op-2', item: 'Test livestream relay with IT master control', checked: true },
    ],
    closing_checklist: [
      { id: 'med-cl-1', item: 'Backup all daily media footage to dual redundant SSD drives', checked: false },
      { id: 'med-cl-2', item: 'Publish daily recap reel and press communiqué', checked: false },
    ],
    emergency_contacts: [
      { name: 'IT Technical Director', role: 'Stream & Uplink Support', contact: '+966 50 445 6677' },
      { name: 'Public Relations Officer', role: 'Press Spokesperson', contact: '+966 55 998 7711' },
    ],
  },
  {
    id: 'st-security',
    department: 'security',
    section: null,
    name: 'Diplomatic Security & Access Checkpoint Alpha',
    location: 'Main Entry Concourse & Chamber Foyer',
    purpose: 'Enforces diplomatic badge decorum, chamber access integrity, and perimeter safety.',
    supervisor_name: 'Tariq Al-Harbi (Security & Protocol Head)',
    supervisor_contact: '+966 55 771 4455',
    duties: [
      'Inspect physical/digital accreditation badges for all persons entering chamber zones.',
      'Keep clear corridors for delegation movements and emergency exits.',
      'Handle decorum enforcement and chamber disturbances quickly and courteously.',
      'Liaise with venue security and medical first-responders.',
    ],
    equipment: [
      'Two-way encrypted UHF radios (Channel 1 Security)',
      'First-aid responder kit and emergency AED unit',
      'Visitor badge sign-in log and guest escorts',
    ],
    opening_checklist: [
      { id: 'sec-op-1', item: 'Inspect all 8 emergency exit doors and confirm unblocked paths', checked: true },
      { id: 'sec-op-2', item: 'Conduct radio check on Channel 1 with all sector leads', checked: true },
    ],
    closing_checklist: [
      { id: 'sec-cl-1', item: 'Perform final sweep of all committee rooms after adjournments', checked: false },
      { id: 'sec-cl-2', item: 'Return radios to central charging bank', checked: false },
    ],
    emergency_contacts: [
      { name: 'Facility Emergency Dispatch', role: 'Venue 24/7 Operations', contact: '+966 11 444 0000' },
      { name: 'Chief Security Officer', role: 'Overall Safety', contact: '+966 50 999 1100' },
    ],
  },
];

const FALLBACK_SHIFTS: EbShift[] = [
  {
    id: 'sh-1',
    department: 'all',
    section: null,
    station_id: 'st-plenary',
    station_name: 'Plenary Assembly Hall & Dais Protocol',
    location: 'Auditorium Level 1, Main Chamber',
    shift_date: '2027-02-18',
    starts_at: '2027-02-18T08:00:00Z',
    ends_at: '2027-02-18T13:00:00Z',
    supervisor_name: 'Fahad Al-Saud',
    responsibilities: 'Manage opening ceremony delegate seating, Dais sound checks, and initial roll-call voting procedure.',
    handover_notes: 'Relief crew arrives at 12:45. Hand over master speaker log and wireless mics.',
    capacity: 6,
    status: 'scheduled',
  },
  {
    id: 'sh-2',
    department: 'volunteers',
    section: null,
    station_id: 'st-registration',
    station_name: 'Executive Registration & Accreditation Desk',
    location: 'West Wing Foyer Entrance Gate 2',
    shift_date: '2027-02-18',
    starts_at: '2027-02-18T07:30:00Z',
    ends_at: '2027-02-18T12:00:00Z',
    supervisor_name: 'Leen Mansour',
    responsibilities: 'Process early morning delegate arrivals, scan digital passes, and distribute official delegate packs.',
    handover_notes: 'Ensure late registrations binder is placed on Desk 1 before handover.',
    capacity: 8,
    status: 'scheduled',
  },
  {
    id: 'sh-3',
    department: 'all',
    section: null,
    station_id: 'st-plenary',
    station_name: 'Plenary Assembly Hall & Dais Protocol',
    location: 'Auditorium Level 1, Main Chamber',
    shift_date: '2027-02-18',
    starts_at: '2027-02-18T13:00:00Z',
    ends_at: '2027-02-18T18:00:00Z',
    supervisor_name: 'Fahad Al-Saud',
    responsibilities: 'Moderate Committee Session I, track unmoderated caucus time, and facilitate draft resolution distribution.',
    handover_notes: 'All working paper copies must be logged in the Dais filing cabinet.',
    capacity: 6,
    status: 'scheduled',
  },
  {
    id: 'sh-4',
    department: 'media_press',
    section: null,
    station_id: 'st-media',
    station_name: 'Media Broadcasting & Press Center',
    location: 'Room 108, North Corridor',
    shift_date: '2027-02-19',
    starts_at: '2027-02-19T09:00:00Z',
    ends_at: '2027-02-19T14:30:00Z',
    supervisor_name: 'Omar Farooq',
    responsibilities: 'Conduct live delegate interviews in crisis chamber and draft midway conference bulletin.',
    handover_notes: 'Upload morning photo reels to cloud repository before ending shift.',
    capacity: 4,
    status: 'scheduled',
  },
];

const FALLBACK_TASKS: EbTask[] = [
  {
    id: 'tsk-1',
    department: 'all',
    section: null,
    assigned_to_user_id: null,
    assigned_to_name: 'Executive Board Team',
    assigned_by_name: 'Secretary-General & Secretariat',
    title: 'Audit Dais Placards & Speaker Timers',
    description: 'Perform complete inventory of country placards for 45 assigned delegations and calibrate the electronic speaker timer displays before the first plenary session.',
    priority: 'urgent',
    status: 'in_progress',
    deadline: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    station_name: 'Plenary Assembly Hall & Dais Protocol',
    checklist: [
      { id: 'c1', text: 'Confirm all 45 state placards are accounted for', completed: true },
      { id: 'c2', text: 'Test electronic timer countdown sound and warning buzzer', completed: true },
      { id: 'c3', text: 'Place spare placards and marker pens in Dais storage box', completed: false },
    ],
    completion_note: '',
    blocker_reason: '',
    reference_links: ['https://west-mun.vercel.app/terms'],
    completed_at: null,
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: 'tsk-2',
    department: 'all',
    section: null,
    assigned_to_user_id: null,
    assigned_to_name: 'Operations Team',
    assigned_by_name: 'Department Head',
    title: 'Review Opening Ceremony Diplomatic Seating Map',
    description: 'Ensure front two rows are reserved for guest ambassadors and university advisors. Place personalized name tags and briefing folders on each seat.',
    priority: 'high',
    status: 'not_started',
    deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    station_name: 'Plenary Assembly Hall & Dais Protocol',
    checklist: [
      { id: 'c4', text: 'Print updated VIP attendee seating ledger', completed: false },
      { id: 'c5', text: 'Place diplomatic folders with program on seats 1–20', completed: false },
    ],
    completion_note: '',
    blocker_reason: '',
    reference_links: [],
    completed_at: null,
    created_at: new Date(Date.now() - 7200 * 1000).toISOString(),
  },
  {
    id: 'tsk-3',
    department: 'volunteers',
    section: null,
    assigned_to_user_id: null,
    assigned_to_name: 'Volunteers Directorate',
    assigned_by_name: 'Leen Mansour',
    title: 'Distribute Digital Badge Kits to Accreditation Desks',
    description: 'Confirm each registration counter has active barcode/QR scanners, spare lanyard packs, and physical emergency registration forms.',
    priority: 'normal',
    status: 'completed',
    deadline: new Date(Date.now() - 3600 * 1000).toISOString(),
    station_name: 'Executive Registration & Accreditation Desk',
    checklist: [
      { id: 'c6', text: 'Deliver badge kits to Desks 1 through 4', completed: true },
      { id: 'c7', text: 'Verify tablet scanner synchronization with server database', completed: true },
    ],
    completion_note: 'Completed all distribution at 07:15. All 4 desks reported operational readiness.',
    blocker_reason: '',
    reference_links: [],
    completed_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 14400 * 1000).toISOString(),
  },
  {
    id: 'tsk-4',
    department: 'security',
    section: null,
    assigned_to_user_id: null,
    assigned_to_name: 'Security & Protocol',
    assigned_by_name: 'Tariq Al-Harbi',
    title: 'Emergency Egress Corridor Physical Walkthrough',
    description: 'Inspect all 8 emergency exit corridors and fire escape doors. Verify zero obstructions from equipment crates or temporary exhibition booths.',
    priority: 'high',
    status: 'not_started',
    deadline: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
    station_name: 'Diplomatic Security & Access Checkpoint Alpha',
    checklist: [
      { id: 'c8', text: 'Inspect North and East exit corridors', completed: false },
      { id: 'c9', text: 'Confirm crash bars open freely without binding', completed: false },
      { id: 'c10', text: 'Log inspection with Venue Safety Manager', completed: false },
    ],
    completion_note: '',
    blocker_reason: '',
    reference_links: [],
    completed_at: null,
    created_at: new Date(Date.now() - 5000 * 1000).toISOString(),
  },
];

const FALLBACK_ANNOUNCEMENTS: EbAnnouncement[] = [
  {
    id: 'ann-1',
    department: 'all',
    section: null,
    title: 'URGENT: All Hands Executive Briefing at 08:30 in Chamber A',
    body: 'The Secretariat and Department Heads will conduct a final 15-minute operational briefing before delegate doors open. Attendance is mandatory for all active EB staff.',
    priority: 'critical',
    requires_acknowledgement: true,
    author_name: 'Secretariat Executive Directorate',
    pinned: true,
    created_at: new Date(Date.now() - 1800 * 1000).toISOString(),
    is_acknowledged: false,
  },
  {
    id: 'ann-2',
    department: 'all',
    section: null,
    title: 'Dais Protocol: Official Resolution Amendment Format Updated',
    body: 'Please inform Committee Chairs that friendly amendments must now carry digital signatures from at least two sponsoring delegations before presentation to the podium.',
    priority: 'urgent',
    requires_acknowledgement: false,
    author_name: 'Fahad Al-Saud (Protocol Head)',
    pinned: true,
    created_at: new Date(Date.now() - 7200 * 1000).toISOString(),
    is_acknowledged: true,
  },
  {
    id: 'ann-3',
    department: 'all',
    section: null,
    title: 'Staff Lounge Catering & Refreshment Schedule',
    body: 'Hot coffee, water bottles, and refreshments are available continuously in Staff Room 104. Lunch shifts are staggered in two waves (12:00-13:00 and 13:00-14:00).',
    priority: 'normal',
    requires_acknowledgement: false,
    author_name: 'Logistics Directorate',
    pinned: false,
    created_at: new Date(Date.now() - 18000 * 1000).toISOString(),
    is_acknowledged: true,
  },
];

const FALLBACK_HIERARCHY: EbHierarchyNode[] = [
  {
    id: 'node-sg',
    department: 'all',
    section: null,
    role_title: 'Secretary-General',
    rank_level: 1,
    parent_node_id: null,
    assigned_name: 'Dr. Zaid Al-Mansoor',
    assigned_email: 'secretariat@westmun.org',
    responsibilities: 'Overall summit authority, diplomatic governance, high-level diplomatic relations, and plenary direction.',
    contact_email: 'secretariat@westmun.org',
    contact_phone: '+966 50 111 0001',
    children: [
      {
        id: 'node-head-volunteers',
        department: 'volunteers',
        section: null,
        role_title: 'Head of Volunteers Directorate',
        rank_level: 2,
        parent_node_id: 'node-sg',
        assigned_name: 'Leen Mansour',
        assigned_email: 'volunteers@westmun.org',
        responsibilities: 'Directs delegate welcoming, registration desks, hallway guides, and assembly floor assistance.',
        contact_email: 'volunteers@westmun.org',
        contact_phone: '+966 54 883 1122',
        children: [
          {
            id: 'node-cohead-volunteers',
            department: 'volunteers',
            section: null,
            role_title: 'Deputy Co-Head (Floor Operations)',
            rank_level: 3,
            parent_node_id: 'node-head-volunteers',
            assigned_name: 'Hamza Nabil',
            assigned_email: 'hamza.volunteers@westmun.org',
            responsibilities: 'Oversees shift rosters, breaks handover, and delegate assistance on Floors 1 and 2.',
            contact_email: 'hamza.volunteers@westmun.org',
            contact_phone: '+966 54 223 9988',
          },
          {
            id: 'node-lead-reg',
            department: 'volunteers',
            section: null,
            role_title: 'Registration Desk Lead Supervisor',
            rank_level: 3,
            parent_node_id: 'node-head-volunteers',
            assigned_name: 'Nora Al-Subaie',
            assigned_email: 'nora.reg@westmun.org',
            responsibilities: 'Manages badge printing, check-in kiosks, and late arrivals accreditation.',
            contact_email: 'nora.reg@westmun.org',
            contact_phone: '+966 54 331 4455',
          },
        ],
      },
      {
        id: 'node-head-security',
        department: 'security',
        section: null,
        role_title: 'Head of Security & Protocol',
        rank_level: 2,
        parent_node_id: 'node-sg',
        assigned_name: 'Tariq Al-Harbi',
        assigned_email: 'security@westmun.org',
        responsibilities: 'Ensures delegate safety, perimeter control, VIP escorts, and chamber decorum enforcement.',
        contact_email: 'security@westmun.org',
        contact_phone: '+966 55 771 4455',
        children: [
          {
            id: 'node-cohead-security',
            department: 'security',
            section: null,
            role_title: 'Deputy Co-Head (Access & Integrity)',
            rank_level: 3,
            parent_node_id: 'node-head-security',
            assigned_name: 'Saad Al-Ghamdi',
            assigned_email: 'saad.security@westmun.org',
            responsibilities: 'Monitors chamber checkpoints Alpha and Bravo and supervises entry screening.',
            contact_email: 'saad.security@westmun.org',
            contact_phone: '+966 55 990 1144',
          },
        ],
      },
      {
        id: 'node-head-media',
        department: 'media_press',
        section: null,
        role_title: 'Head of Media & Press Corps',
        rank_level: 2,
        parent_node_id: 'node-sg',
        assigned_name: 'Omar Farooq',
        assigned_email: 'media@westmun.org',
        responsibilities: 'Directs summit journalism, photography, livestream feeds, and conference publications.',
        contact_email: 'media@westmun.org',
        contact_phone: '+966 56 332 9900',
        children: [
          {
            id: 'node-cohead-media',
            department: 'media_press',
            section: null,
            role_title: 'Lead Creative Designer & Media Co-Head',
            rank_level: 3,
            parent_node_id: 'node-head-media',
            assigned_name: 'Dana Al-Khatib',
            assigned_email: 'dana.media@westmun.org',
            responsibilities: 'Coordinates graphic assets, social clips, digital signage, and committee recap prints.',
            contact_email: 'dana.media@westmun.org',
            contact_phone: '+966 56 771 2299',
          },
        ],
      },
    ],
  },
];

// In-Memory Storage Cache (Zero Mock Fallback - Initialized strictly to empty sets)
let cachedTasks: EbTask[] = [];
let cachedStations: EbStation[] = [];
let cachedShifts: EbShift[] = [];
let cachedAnnouncements: EbAnnouncement[] = [];
let cachedIncidents: EbIncident[] = [];
let cachedComments: Record<string, EbTaskComment[]> = {};
let cachedSwaps: EbShiftSwap[] = [];
let cachedTemplates: EbTemplate[] = [];

// Helper: load from localStorage if present
function initLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    const savedTasks = localStorage.getItem('wm_eb_tasks_store');
    if (savedTasks) cachedTasks = JSON.parse(savedTasks);
    const savedStations = localStorage.getItem('wm_eb_stations_store');
    if (savedStations) cachedStations = JSON.parse(savedStations);
    const savedShifts = localStorage.getItem('wm_eb_shifts_store');
    if (savedShifts) cachedShifts = JSON.parse(savedShifts);
    const savedAnn = localStorage.getItem('wm_eb_announcements_store');
    if (savedAnn) cachedAnnouncements = JSON.parse(savedAnn);
    const savedInc = localStorage.getItem('wm_eb_incidents_store');
    if (savedInc) cachedIncidents = JSON.parse(savedInc);
    const savedTemplates = localStorage.getItem('wm_eb_templates_store');
    if (savedTemplates) cachedTemplates = JSON.parse(savedTemplates);
  } catch {
    // Ignore storage issues
  }
}
// Intentionally disabled: operational data must come from Supabase.

function persistTasks() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('wm_eb_tasks_store', JSON.stringify(cachedTasks));
    } catch {}
  }
}

function persistShifts() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('wm_eb_shifts_store', JSON.stringify(cachedShifts));
    } catch {}
  }
}

function persistAnnouncements() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('wm_eb_announcements_store', JSON.stringify(cachedAnnouncements));
    } catch {}
  }
}

function persistIncidents() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('wm_eb_incidents_store', JSON.stringify(cachedIncidents));
    } catch {}
  }
}

function persistTemplates() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('wm_eb_templates_store', JSON.stringify(cachedTemplates));
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

export const ebOperationsService = {
  /**
   * Fetch all tasks relevant to an EB member or department
   */
  async getTasks(userId?: string, department?: string): Promise<EbTask[]> {
    if (supabase) {
      try {
        let query = supabase.from('wm_eb_tasks').select('*').order('created_at', { ascending: false });
        if (department && department !== 'all') {
          query = query.or(`department.eq.${department},department.eq.all`);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data as EbTask[];
        }
      } catch (e) {
        // Fall back to memory
      }
    }
    return [];
  },

  /**
   * Update task status, notes, or checklist
   */
  async updateTask(
    taskId: string,
    updates: Partial<Pick<EbTask, 'status' | 'checklist' | 'completion_note' | 'blocker_reason' | 'completed_at'>>
  ): Promise<EbTask> {
    const completedAt = updates.status === 'completed' ? new Date().toISOString() : null;
    const finalUpdates = { ...updates, ...(completedAt ? { completed_at: completedAt } : {}) };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('wm_eb_tasks')
          .update(finalUpdates)
          .eq('id', taskId)
          .select()
          .single();
        if (!error && data) {
          // Update in local cache as well
          cachedTasks = cachedTasks.map((t) => (t.id === taskId ? (data as EbTask) : t));
          persistTasks();
          return data as EbTask;
        }
      } catch {}
    }

    // Fallback update
    cachedTasks = cachedTasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, ...finalUpdates };
      }
      return t;
    });
    persistTasks();
    const updated = cachedTasks.find((t) => t.id === taskId);
    if (!updated) throw new Error('Task not found');
    return updated;
  },

  /**
   * Create a new task (Heads and Supervisors)
   */
  async createTask(task: Omit<EbTask, 'id' | 'created_at' | 'completed_at'>): Promise<EbTask> {
    const newTask: EbTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('wm_eb_tasks').insert(newTask).select().single();
        if (!error && data) {
          cachedTasks = [data as EbTask, ...cachedTasks];
          persistTasks();
          return data as EbTask;
        }
      } catch {}
    }

    throw new Error('Task was not saved. Check the database connection and your department permissions.');
  },

  /**
   * Fetch Task comments
   */
  async getTaskComments(taskId: string): Promise<EbTaskComment[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('wm_eb_task_comments')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });
        if (!error && data) return data as EbTaskComment[];
      } catch {}
    }
    return [];
  },

  /**
   * Add a comment to a task
   */
  async addTaskComment(taskId: string, commentText: string, author: { id: string; name: string; role: string }): Promise<EbTaskComment> {
    const newComment: EbTaskComment = {
      id: `comm-${Date.now()}`,
      task_id: taskId,
      author_user_id: author.id,
      author_name: author.name,
      author_role: author.role,
      comment: commentText.trim(),
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('wm_eb_task_comments').insert(newComment).select().single();
        if (!error && data) return data as EbTaskComment;
      } catch {}
    }

    throw new Error('Comment was not saved. Check the database connection and task permissions.');
  },

  /**
   * Fetch all stations
   */
  async getStations(department?: string): Promise<EbStation[]> {
    if (supabase) {
      try {
        let query = supabase.from('wm_eb_stations').select('*').order('name');
        if (department && department !== 'all') {
          query = query.or(`department.eq.${department},department.eq.all`);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) return data as EbStation[];
      } catch {}
    }
    return [];
  },

  /**
   * Update station checklist
   */
  async updateStationChecklist(
    stationId: string,
    type: 'opening' | 'closing',
    checklist: StationChecklistItem[]
  ): Promise<void> {
    if (!supabase) throw new Error('Database connection is unavailable.');
    const key = type === 'opening' ? 'opening_checklist' : 'closing_checklist';
    const { error } = await supabase.from('wm_eb_stations').update({ [key]: checklist }).eq('id', stationId);
    if (error) throw new Error('Station checklist was not saved: ' + error.message);
  },

  /**
   * Fetch member shifts and schedule
   */
  async getShifts(department?: string): Promise<EbShift[]> {
    if (supabase) {
      try {
        let query = supabase.from('wm_eb_shifts').select('*').order('starts_at', { ascending: true });
        if (department && department !== 'all') {
          query = query.or(`department.eq.${department},department.eq.all`);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) return data as EbShift[];
      } catch {}
    }
    return [];
  },

  /**
   * Fetch shift swap requests
   */
  async getShiftSwaps(userId?: string): Promise<EbShiftSwap[]> {
    if (supabase) {
      try {
        let query = supabase.from('wm_eb_shift_swaps').select('*, shift:wm_eb_shifts(*)').order('created_at', { ascending: false });
        if (userId) {
          query = query.eq('requester_user_id', userId);
        }
        const { data, error } = await query;
        if (!error && data) return data as EbShiftSwap[];
      } catch {}
    }
    return [];
  },

  /**
   * Submit shift swap request
   */
  async requestShiftSwap(swap: { assignment_id: string; requester_user_id: string; requester_name: string; target_shift_id?: string | null; reason: string }): Promise<EbShiftSwap> {
    const newSwap: EbShiftSwap = {
      id: `swap-${Date.now()}`,
      assignment_id: swap.assignment_id,
      requester_user_id: swap.requester_user_id,
      requester_name: swap.requester_name,
      target_shift_id: swap.target_shift_id || null,
      reason: swap.reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('wm_eb_shift_swaps').insert(newSwap).select().single();
        if (!error && data) return data as EbShiftSwap;
      } catch {}
    }

    throw new Error('Shift-swap request was not saved. Check the database connection.');
  },

  /**
   * Approve or reject shift swap
   */
  async reviewShiftSwap(swapId: string, status: 'approved' | 'rejected', reviewNotes: string): Promise<void> {
    if (!supabase) throw new Error('Database connection is unavailable.');
    const { data, error } = await supabase
      .from('wm_eb_shift_swaps')
      .update({ status, review_notes: reviewNotes, updated_at: new Date().toISOString() })
      .eq('id', swapId)
      .select('id')
      .maybeSingle();
    if (error || !data) throw new Error('Shift-swap review was not saved' + (error ? ': ' + error.message : '. Check your permissions.'));
  },

  /**
   * Fetch announcements
   */
  async getAnnouncements(userId?: string, department?: string): Promise<EbAnnouncement[]> {
    if (supabase) {
      try {
        let query = supabase
          .from('wm_eb_announcements')
          .select('*, acks:wm_eb_announcement_acks(user_id)')
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false });
        if (department && department !== 'all') {
          query = query.or(`department.eq.${department},department.eq.all`);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((item: any) => ({
            ...item,
            is_acknowledged: userId ? (item.acks || []).some((a: any) => a.user_id === userId) : false,
          })) as EbAnnouncement[];
        }
      } catch {}
    }
    return [];
  },

  /**
   * Acknowledge critical announcement
   */
  async acknowledgeAnnouncement(announcementId: string, userId: string): Promise<void> {
    if (!supabase) throw new Error('Database connection is unavailable.');
    const { error } = await supabase
      .from('wm_eb_announcement_acks')
      .upsert({ announcement_id: announcementId, user_id: userId }, { onConflict: 'announcement_id,user_id' });
    if (error) throw new Error('Announcement acknowledgement was not saved: ' + error.message);
  },

  /**
   * Publish an announcement (Heads & Admins)
   */
  async publishAnnouncement(ann: Omit<EbAnnouncement, 'id' | 'created_at'>): Promise<EbAnnouncement> {
    const newAnn: EbAnnouncement = {
      ...ann,
      id: `ann-${Date.now()}`,
      created_at: new Date().toISOString(),
      is_acknowledged: false,
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('wm_eb_announcements').insert(newAnn).select().single();
        if (!error && data) {
          cachedAnnouncements = [data as EbAnnouncement, ...cachedAnnouncements];
          persistAnnouncements();
          return data as EbAnnouncement;
        }
      } catch {}
    }

    throw new Error('Announcement was not published. Check the database connection and department permissions.');
  },

  /**
   * Fetch Department Hierarchy
   *
   * Structure:
   * - Top row: SG | DSG | USG (same horizontal level as three peer roles)
   * - Below them: Senior Advisor
   * - Below Senior Advisor: real, active section and department heads
   * - Below each section head: their corresponding co-heads
   */
  async getHierarchy(department?: string): Promise<EbHierarchyNode[]> {
    try {
      const [
        { data: secretariatRows },
        { data: headRows },
        { data: coHeadRows },
      ] = await Promise.all([
        supabase
          ? supabase
              .from('secretariat')
              .select('id, role, name, department, bio, sort_order, published, confirmed')
              .eq('published', true)
              .eq('confirmed', true)
              .order('sort_order', { ascending: true })
          : Promise.resolve({ data: null }),
        supabase
          ? supabase
              .from('department_heads')
              .select('user_id, department, section, head_name, active')
              .order('department', { ascending: true })
          : Promise.resolve({ data: null }),
        supabase
          ? supabase
              .from('wm_people')
              .select('id, display_name, email, department, section, role_title, status')
              .eq('status', 'active')
              .or('role_title.ilike.%co-head%,role_title.ilike.%co head%,role_title.ilike.%deputy head%')
          : Promise.resolve({ data: null }),
      ]);



      const secretariat =
        secretariatRows && secretariatRows.length > 0 ? (secretariatRows as any[]) : DEFAULT_SECRETARIAT;

      const rawHeads = headRows || [];
      const heads = rawHeads.filter((h: any) => h.active === true && h.head_name && h.department);
      // Co-heads are sourced from active wm_people records below; department_heads has no role_type/title columns.
      const peopleCoHeads = (coHeadRows || []).filter((p: any) => p.display_name && p.department);

      const makeNode = (
        id: string,
        roleTitle: string,
        name: string,
        departmentName: string,
        rank: number,
        parentId: string | null,
        responsibilities: string,
        email = '',
        section: string | null = null,
        avatarUrl?: string
      ): EbHierarchyNode => ({
        id,
        department: departmentName || 'Executive Secretariat',
        section,
        role_title: roleTitle,
        rank_level: rank,
        parent_node_id: parentId,
        assigned_name: name,
        assigned_email: email,
        responsibilities: responsibilities || 'WEST MUN 2027 conference leadership and operations.',
        contact_email: email,
        contact_phone: '',
        avatar_url: avatarUrl,
        children: [],
      });

      // 1. Top row: SG | DSG | USG (same level, rank 1, parent null)
      const sgRow = secretariat.find((r: any) => /secretary[- ]general/i.test(r.role) && !/deputy|under/i.test(r.role)) || DEFAULT_SECRETARIAT[0];
      const dsgRow = secretariat.find((r: any) => /deputy secretary[- ]general/i.test(r.role)) || DEFAULT_SECRETARIAT[1];
      const usgRow = secretariat.find((r: any) => /under[- ]secretary[- ]general/i.test(r.role)) || DEFAULT_SECRETARIAT[2];
      const advisorRow = secretariat.find((r: any) => /senior advisor/i.test(r.role)) || DEFAULT_SECRETARIAT[3];

      const sgNode = makeNode(
        `secretariat-${sgRow.id}`,
        sgRow.role || 'Secretary-General',
        sgRow.name,
        sgRow.department || 'Executive Secretariat',
        1,
        null,
        sgRow.bio || 'Directs high-level academic, operational, and institutional conference affairs for WEST MUN 2027.',
        'sg@westmun.org',
        null,
        sgRow.image_url || '/rakan-almerbad.jpg'
      );

      const dsgNode = makeNode(
        `secretariat-${dsgRow.id}`,
        dsgRow.role || 'Deputy Secretary-General',
        dsgRow.name,
        dsgRow.department || 'Executive Secretariat',
        1,
        null,
        dsgRow.bio || 'Oversees executive operations, internal alignments, and substantive delegation procedures.',
        'dsg@westmun.org',
        null,
        dsgRow.image_url || '/yousef.jpg'
      );

      const usgNode = makeNode(
        `secretariat-${usgRow.id}`,
        usgRow.role || 'Under-Secretary-General',
        usgRow.name,
        usgRow.department || 'Executive Secretariat',
        1,
        null,
        usgRow.bio || 'Manages logistical operations, substantive dais teams, and operational directorates.',
        'usg@westmun.org',
        null,
        usgRow.image_url || '/zain-firas.jpg'
      );

      // 2. Below them: Senior Advisor (rank 2)
      const advisorNode = makeNode(
        `secretariat-${advisorRow.id}`,
        advisorRow.role || 'Senior Advisor',
        advisorRow.name,
        advisorRow.department || 'Advisory Board',
        2,
        'secretariat-triad',
        advisorRow.bio || 'Guides the executive leadership team, shares strategic counsel, and ensures smooth conference execution.',
        'advisor@westmun.org',
        null,
        advisorRow.image_url || '/muaz.jpg'
      );

      // 3. Below Senior Advisor: Active Section and Department Heads (rank 3)
      const headNodes = heads.map((head: any) => {
        const secLabel = head.section
          ? `${head.section.charAt(0).toUpperCase() + head.section.slice(1)} Section Head`
          : 'Department Head';
        const node = makeNode(
          `head-${head.user_id}`,
          secLabel,
          head.head_name,
          head.department,
          3,
          advisorNode.id,
          `Leads the ${head.section ? `${head.section} section of ` : ''}${head.department.replace(/_/g, ' ')} team and coordinates its EB operations.`,
          head.email || '',
          head.section
        );
        return {
          ...node,
          source_user_id: head.user_id || null,
          source_head_id: head.id || head.user_id || null,
        };
      });

      // 4. Below each section head: their corresponding co-heads (rank 4)
      const allCoHeads = [
        ...peopleCoHeads.map((p: any) => ({
          id: p.id,
          name: p.display_name,
          department: p.department,
          section: p.section,
          role_title: p.role_title || 'Co-Head',
          email: p.email || '',
        })),
      ];

      for (const headNode of headNodes) {
        const matchingCoHeads = allCoHeads.filter((ch) => {
          const deptMatch = (ch.department || '').toLowerCase() === headNode.department.toLowerCase();
          if (!deptMatch) return false;
          if (headNode.section && ch.section) {
            return headNode.section.toLowerCase() === ch.section.toLowerCase();
          }
          return true;
        });

        headNode.children = matchingCoHeads.map((ch) =>
          makeNode(
            `cohead-${ch.id}`,
            ch.role_title,
            ch.name,
            ch.department || headNode.department,
            4,
            headNode.id,
            'Supports the section head and coordinates section operations with the team.',
            ch.email,
            ch.section
          )
        );
      }

      advisorNode.children = headNodes;

      // Link advisor to all three peer triad nodes
      sgNode.children = [advisorNode];
      dsgNode.children = [advisorNode];
      usgNode.children = [advisorNode];

      void department;
      // Return the top row peer triad: SG | DSG | USG
      return [sgNode, dsgNode, usgNode];
    } catch (error) {
      console.error('Unable to build the Secretariat hierarchy', error);
      // Graceful fallback using DEFAULT_SECRETARIAT
      return [];
    }
  },
  /**
   * Fetch Incidents
   */
  async getIncidents(): Promise<EbIncident[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('wm_eb_incidents')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data as EbIncident[];
      } catch {}
    }
    return [];
  },

  /**
   * Report an Incident (Event-Day Mode)
   */
  async reportIncident(incident: Omit<EbIncident, 'id' | 'created_at' | 'status'>): Promise<EbIncident> {
    const newInc: EbIncident = {
      ...incident,
      id: `inc-${Date.now()}`,
      status: 'open',
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('wm_eb_incidents').insert(newInc).select().single();
        if (!error && data) {
          cachedIncidents = [data as EbIncident, ...cachedIncidents];
          persistIncidents();
          return data as EbIncident;
        }
      } catch {}
    }

    throw new Error('Incident report was not saved. Check the database connection and department permissions.');
  },

  /**
   * Resolve an incident
   */
  async resolveIncident(incidentId: string, resolutionNotes: string): Promise<void> {
    if (!supabase) throw new Error('Database connection is unavailable.');
    const { data, error } = await supabase
      .from('wm_eb_incidents')
      .update({ status: 'resolved', resolution_notes: resolutionNotes, updated_at: new Date().toISOString() })
      .eq('id', incidentId)
      .select('id')
      .maybeSingle();
    if (error || !data) throw new Error('Incident was not resolved' + (error ? ': ' + error.message : '. Check your permissions.'));
  },
};
