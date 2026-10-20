import { supabase, supabaseConfigured } from '../../lib/supabase';
import type { DepartmentKey, SectionKey } from '../departments';

export interface DepartmentRecord {
  id: string;
  department: DepartmentKey;
  section?: SectionKey | null;
  category: string;
  title: string;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  data: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_PREFIX = 'wm_dept_records_';

// Initial MUN operational seeds by department
const INITIAL_TEMPLATES: Record<DepartmentKey, Omit<DepartmentRecord, 'id' | 'department'>[]> = {
  design: [
    {
      category: 'task',
      title: 'Finalize UN Security Council Placard Template',
      status: 'In Review',
      priority: 'high',
      data: {
        assignee: 'Mallak Abbas',
        deadline: '2027-02-15',
        deliverableType: 'Committee Placards',
        notes: 'Dimensions 297x105mm with diplomatic gold embossing border.',
        revisionCount: 2,
      },
    },
    {
      category: 'task',
      title: 'Design Social Media Announcement Banner (Delegate Tier 2)',
      status: 'In Progress',
      priority: 'medium',
      data: {
        assignee: 'Design Team',
        deadline: '2027-02-20',
        deliverableType: 'Instagram Post / Story',
        notes: 'Ensure Cinzel typography matches brand constitution.',
      },
    },
    {
      category: 'asset',
      title: 'Official WEST MUN 2027 Crest & Emblem (Vector Pack)',
      status: 'Approved',
      priority: 'high',
      data: {
        assetCategory: 'Logos & Emblems',
        format: 'SVG / Vector',
        fileUrl: '/assets/emblem.svg',
        version: 'v2.4',
        dimensions: 'Vector',
        approvedBy: 'Secretariat',
      },
    },
    {
      category: 'asset',
      title: 'Opening Ceremony Main Stage Backdrop (4K High-Res)',
      status: 'Approved',
      priority: 'high',
      data: {
        assetCategory: 'Banners & Backdrops',
        format: 'TIFF / 300 DPI',
        fileUrl: '/assets/stage-backdrop.png',
        version: 'v1.0',
        dimensions: '3840 x 2160',
        approvedBy: 'Secretariat',
      },
    },
  ],
  marketing: [
    {
      category: 'campaign',
      title: 'Institutional Delegation Outreach — GCC High Schools',
      status: 'Active',
      priority: 'high',
      data: {
        targetDelegates: 250,
        currentRegistrations: 142,
        startDate: '2027-01-15',
        endDate: '2027-02-28',
        channels: ['Email', 'Instagram', 'School Visits'],
        notes: 'Follow-up with Model UN club advisors in Kuwait and UAE.',
      },
    },
    {
      category: 'post',
      title: 'Early Bird Registration Deadline Countdown',
      status: 'Ready for Review',
      priority: 'high',
      data: {
        platform: 'Instagram',
        scheduledDate: '2027-02-10',
        caption:
          'Diplomacy begins with decisive action. Less than 72 hours remain before Early Bird delegate registrations close for WEST MUN 2027. Secure your committee allocation today.',
        assetId: 'banner_early_bird',
        needsDesignApproval: true,
      },
    },
    {
      category: 'coordination',
      title: 'Request: Crisis Committee Teaser Video Asset',
      status: 'In Progress',
      priority: 'medium',
      data: {
        targetDepartment: 'media_press',
        deadline: '2027-02-18',
        requirements: '30-second dramatic cinematic reel with typewriter SFX.',
        notes: 'Script approved by DCC Head.',
      },
    },
  ],
  media_press: [
    {
      category: 'coverage',
      title: 'Opening Plenary Keynote Speech Recording & Live Feed',
      status: 'Confirmed',
      priority: 'urgent',
      data: {
        assignedCrew: 'Selena & Broadcast Team',
        time: 'Day 1 — 09:30 AM',
        location: 'Grand Ballroom Plenary Hall',
        gear: 'Sony FX3 + Wireless Lapels + Blackmagic switcher',
      },
    },
    {
      category: 'interview',
      title: 'Exclusive Interview with Secretary-General & Keynote Dignitary',
      status: 'Scheduled',
      priority: 'high',
      data: {
        interviewer: 'Press Correspondent',
        time: 'Day 1 — 11:45 AM',
        location: 'VIP Press Lounge',
        topic: 'Summit Vision & Multilateral Diplomatic Reform',
      },
    },
    {
      category: 'checklist',
      title: 'Dais Camera Batteries & Dual SD Card Backups',
      status: 'Completed',
      priority: 'high',
      data: { checked: true, verifiedBy: 'Media Head' },
    },
  ],
  security: [
    {
      category: 'roster',
      title: 'Main Hall Security Post — Delegate Credential Check',
      status: 'Active',
      priority: 'high',
      data: {
        officerInCharge: 'Yusef Saad',
        assignedVolunteers: ['Karim Mansour', 'Rami Haddad'],
        postLocation: 'Grand Hall Turnstiles (North & South)',
        shift: 'Morning (08:00 - 13:00)',
        radioChannel: 'Channel 1 (Primary Protocol)',
      },
    },
    {
      category: 'checklist',
      title: 'Chamber Emergency Egress & Fire Exit Inspection',
      status: 'Completed',
      priority: 'urgent',
      data: {
        checked: true,
        inspectedBy: 'Najla Rami',
        verifiedAt: '2027-02-01',
        notes: 'All 6 emergency exits clear of banners and cables.',
      },
    },
    {
      category: 'incident',
      title: 'Unaccredited Visitor Attempted Committee Room Entry',
      status: 'Resolved',
      priority: 'high',
      data: {
        timestamp: 'Day 1 — 14:15 PM',
        location: 'Chamber 3 (UNSC)',
        involvedParties: 'External Visitor',
        description: 'Individual without badge attempted entry. Stopped by floor protocol.',
        actionTaken: 'Escorted to main reception for identity check and day pass issuance.',
        resolutionNotes: 'Verified as school faculty advisor; credentials issued.',
        confidential: true,
      },
    },
  ],
  volunteers: [
    {
      category: 'station',
      title: 'Plenary Chamber Dais Runners Station',
      status: 'Filled',
      priority: 'high',
      data: {
        stationName: 'UNSC & DISEC Dais Runners',
        requiredVolunteers: 4,
        assignedVolunteers: ['Farah Zaid', 'Ali Qasim', 'Dana Shaker', 'Omar Fathi'],
        shiftTime: '09:00 - 17:00',
        responsibilities: 'Resolution note-passing, speaker list updates, water carafe replenishment.',
      },
    },
    {
      category: 'station',
      title: 'Registration Desk & Delegate Welcome Ushers',
      status: 'Needs Coverage',
      priority: 'urgent',
      data: {
        stationName: 'Main Lobby Registration Desk',
        requiredVolunteers: 6,
        assignedVolunteers: ['Layla K.', 'Hassan M.'],
        shiftTime: '07:30 - 10:30',
        responsibilities: 'Placard distribution, badge verification, welcome bag handover.',
      },
    },
    {
      category: 'checklist',
      title: 'Volunteer Handbook & Dress Code Orientation Briefing',
      status: 'Completed',
      priority: 'high',
      data: {
        briefingDate: '2027-02-12',
        attendanceCount: 42,
        notes: 'All volunteers received black suit / formal attire guidelines.',
      },
    },
  ],
  pr: [
    {
      category: 'deliverable',
      title: 'Title Sponsor Logo Placement on Conference Badges',
      status: 'Confirmed',
      priority: 'high',
      data: {
        sponsor: 'Diplomatic Foundation',
        tier: 'Title Sponsor',
        deadline: '2027-02-10',
        confirmedWith: 'Director of External Affairs',
        notes: 'Gold metallic foil logo on reverse of all delegate lanyards.',
      },
    },
    {
      category: 'meeting',
      title: 'Sponsorship Ratification Meeting with Bank of Amman',
      status: 'Pending',
      priority: 'medium',
      data: {
        date: '2027-02-16',
        attendees: 'Mazen Alada, Dana Alnajjar, VP of Corporate CSR',
        stage: 'Negotiating',
        fundingOffer: '$5,000 Platinum Tier',
      },
    },
  ],
  hr: [
    {
      category: 'team',
      title: 'Organizing Committee Onboarding & Conduct Accreditations',
      status: 'Active',
      priority: 'high',
      data: {
        totalStaff: 48,
        accreditedStaff: 45,
        pendingSignoffs: 3,
        codeOfConductVersion: 'v2027.1',
      },
    },
    {
      category: 'task',
      title: 'Delegate Dispute Resolution Protocol & Hearing Room Booking',
      status: 'In Progress',
      priority: 'medium',
      data: {
        leads: 'Hoorain & Seif Ayman',
        deadline: '2027-02-15',
        notes: 'Protocol for mediating parliamentary etiquette challenges.',
      },
    },
  ],
  logistics: [
    {
      category: 'venue',
      title: 'Royal Amra Convention Center — Main Conference Hall A',
      status: 'Confirmed',
      priority: 'high',
      data: {
        roomName: 'Grand Plenary Hall A',
        capacity: 450,
        daisLayout: 'Elevated 8-seater dais with UN flags and audio podium',
        avSetup: 'Dual 4K laser projectors, 16 floor condenser microphones',
        operationalNotes: 'Catering access via service corridor B.',
      },
    },
    {
      category: 'equipment',
      title: 'Chamber Audio & Delegate Floor Microphones (32 units)',
      status: 'Delivered',
      priority: 'high',
      data: {
        quantityNeeded: 32,
        quantitySourced: 32,
        vendor: 'Amman Sound & Staging Ltd.',
        deliveryDate: '2027-02-14',
      },
    },
    {
      category: 'procurement',
      title: 'Wooden Committee Gavels & Embroidered Dais Banners',
      status: 'In Transit',
      priority: 'medium',
      data: {
        costEstimate: '$850',
        supplier: 'Heritage Crafts Co.',
        targetDelivery: '2027-02-18',
        poNumber: 'PO-2027-LOG-041',
      },
    },
  ],
  it: [
    {
      category: 'issue',
      title: 'Dais Presentation Screen Mirroring Latency Check',
      status: 'Open',
      priority: 'high',
      data: {
        subsystem: 'AV & Networking',
        reportedBy: 'Secretariat Dais Lead',
        description: 'Verify HDMI over CAT6 extenders latency in Committee Room 4.',
        troubleshootingNotes: 'Replaced extender power brick; awaiting final load test.',
      },
    },
    {
      category: 'issue',
      title: 'Conference WiFi Guest SSID & Bandwidth Allocation',
      status: 'Resolved',
      priority: 'urgent',
      data: {
        subsystem: 'Venue Infrastructure',
        reportedBy: 'IT Head',
        description: 'Configure dedicated 500Mbps symmetrical fiber for delegates and dais.',
        troubleshootingNotes: 'VLAN 40 configured with captive portal bypass for dais laptops.',
      },
    },
    {
      category: 'checklist',
      title: 'Digital Voting System & Backup Dais Tablets Readiness',
      status: 'Completed',
      priority: 'high',
      data: {
        verifiedDevices: 12,
        batteryHealth: '100%',
        offlineFallbackReady: true,
      },
    },
  ],
  ceremonies: [
    {
      category: 'run_of_show',
      title: 'Opening Ceremony Minute-by-Minute Run-of-Show Timeline',
      status: 'Locked',
      priority: 'urgent',
      data: {
        timeline: [
          { time: '09:00', segment: 'Delegate & Dignitary Seating', cue: 'Ambient orchestral string suite' },
          { time: '09:15', segment: 'National Anthem of the Hashemite Kingdom', cue: 'Royal Anthem brass fanfare' },
          { time: '09:20', segment: 'Secretariat Procession & Intro Video', cue: 'Cinematic video playback on 4K wall' },
          { time: '09:30', segment: 'Secretary-General Convocation Address', cue: 'Spotlight 1 & podium mic live' },
          { time: '09:45', segment: 'Diplomatic Keynote Speaker Address', cue: 'VIP escort to stage' },
          { time: '10:05', segment: 'Gavel Handover & Official Declaration of Opening', cue: 'Traditional 3 gavel strikes' },
        ],
      },
    },
    {
      category: 'speaker',
      title: 'Keynote Speaker: Former Ambassador to the United Nations',
      status: 'Confirmed',
      priority: 'high',
      data: {
        speakerName: 'Ambassador H.E. Karim Al-Faris',
        affiliation: 'Diplomatic Institute',
        arrivalTime: '08:45 AM',
        speechDurationMinutes: 15,
        stageRequirements: 'Podium microphone, water glass, translation headset',
        assignedLiaison: 'Sultana (Ceremonies Lead)',
      },
    },
    {
      category: 'task',
      title: 'Grand Gavel Ceremony Polishing & Award Plaque Inscriptions',
      status: 'Completed',
      priority: 'medium',
      data: { verified: true, inspector: 'Ceremonies Team' },
    },
  ],
  dcc: [
    {
      category: 'committee',
      title: 'Historic Crisis Committee: 1962 Cuban Missile Crisis',
      status: 'Ready',
      priority: 'urgent',
      data: {
        chairs: 'Majd (Crisis Director)',
        delegatesCount: 24,
        studyGuideStatus: 'Published & Distributed',
        crisisTimelineReady: true,
        secretDirectivesCount: 8,
        cabinetSetup: 'Bilateral Washington & Moscow crisis suites',
      },
    },
    {
      category: 'directive',
      title: 'Midnight Directive Leak — DEFCON 2 Naval Blockade Simulation',
      status: 'Scheduled',
      priority: 'high',
      data: {
        triggerPhase: 'Session 3 (Day 2 — 14:00 PM)',
        multimediaAsset: 'Teletype audio and redacted diplomatic dispatch',
        scenarioObjective: 'Force emergency vote on Soviet transport ship interception',
        leakStatus: 'Classified / Sealed in Red Envelope',
      },
    },
    {
      category: 'document',
      title: 'Crisis Directives Dossier & Urgent Action Forms (100 copies)',
      status: 'Printed',
      priority: 'medium',
      data: { location: 'Crisis Backroom Table 1' },
    },
  ],
};

/**
 * Loads department records. Checks Supabase first if available,
 * falling back to local storage and starter MUN templates.
 */
export async function fetchDepartmentRecords(
  department: DepartmentKey,
  category?: string
): Promise<DepartmentRecord[]> {
  const localKey = `${STORAGE_PREFIX}${department}`;

  // 1. If Supabase is configured and caller has a session, attempt query
  if (supabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('department_records')
        .select('*')
        .eq('department', department);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        // Cache to local storage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(localKey, JSON.stringify(data));
          } catch {}
        }
        return data as DepartmentRecord[];
      }
    } catch (err) {
      console.warn('[DepartmentStore] Supabase query fallback:', err);
    }
  }

  // 2. Local storage retrieval
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed = JSON.parse(stored) as DepartmentRecord[];
        if (category) {
          return parsed.filter((r) => r.category === category);
        }
        return parsed;
      }
    } catch {}

    // 3. Seed initial templates if completely empty
    const initial = (INITIAL_TEMPLATES[department] || []).map((item, index) => ({
      id: `seed_${department}_${index + 1}_${Date.now()}`,
      department,
      created_at: new Date(Date.now() - (index + 1) * 3600000).toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    })) as DepartmentRecord[];

    try {
      localStorage.setItem(localKey, JSON.stringify(initial));
    } catch {}

    if (category) {
      return initial.filter((r) => r.category === category);
    }
    return initial;
  }

  return [];
}

/**
 * Persists a new or updated department record.
 */
export async function saveDepartmentRecord(
  record: Omit<DepartmentRecord, 'id'> & { id?: string }
): Promise<{ ok: boolean; record?: DepartmentRecord; error?: string }> {
  const resolvedRecord: DepartmentRecord = {
    id: record.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    created_at: record.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    department: record.department,
    section: record.section ?? null,
    category: record.category,
    title: record.title,
    status: record.status,
    priority: record.priority || 'medium',
    data: record.data || {},
  };

  // 1. Try Supabase
  if (supabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('department_records')
        .upsert(resolvedRecord)
        .select('*')
        .maybeSingle();

      if (!error && data) {
        syncToLocalStorage(data as DepartmentRecord);
        return { ok: true, record: data as DepartmentRecord };
      }
    } catch (err) {
      console.warn('[DepartmentStore] Supabase upsert error, saving locally:', err);
    }
  }

  // 2. Fallback to LocalStorage
  syncToLocalStorage(resolvedRecord);
  return { ok: true, record: resolvedRecord };
}

/**
 * Deletes a department record
 */
export async function deleteDepartmentRecord(
  id: string,
  department: DepartmentKey
): Promise<{ ok: boolean; error?: string }> {
  if (supabaseConfigured && supabase) {
    try {
      await supabase
        .from('department_records')
        .delete()
        .eq('id', id)
        .eq('department', department);
    } catch (err) {
      console.warn('[DepartmentStore] Supabase delete error:', err);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const localKey = `${STORAGE_PREFIX}${department}`;
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed = JSON.parse(stored) as DepartmentRecord[];
        const filtered = parsed.filter((r) => r.id !== id);
        localStorage.setItem(localKey, JSON.stringify(filtered));
      }
    } catch {}
  }

  return { ok: true };
}

function syncToLocalStorage(record: DepartmentRecord) {
  if (typeof window === 'undefined') return;
  try {
    const localKey = `${STORAGE_PREFIX}${record.department}`;
    const stored = localStorage.getItem(localKey);
    let items: DepartmentRecord[] = stored ? JSON.parse(stored) : [];
    const index = items.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      items[index] = record;
    } else {
      items.unshift(record);
    }
    localStorage.setItem(localKey, JSON.stringify(items));
  } catch {}
}
