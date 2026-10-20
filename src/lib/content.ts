import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Row shapes (match supabase/schema.sql)
// ---------------------------------------------------------------------------
export interface SecretariatRow {
  id: string; role: string; name: string; department: string; bio: string;
  image_url: string; image_position: 'center' | 'top' | 'bottom'; confirmed: boolean;
}
export interface CommitteeRow {
  id: string; name: string; type: string; topic: string; chair: string; description: string; level: string;
}
export interface ScheduleDayRow { id: string; title: string; date_text: string }
export interface ScheduleSessionRow {
  id: string; day_id: string; time_text: string; title: string; location: string; description: string;
}
export interface FaqRow { id: string; question: string; answer: string }
export interface DocumentRow { id: string; title: string; description: string; category: string; file_url: string }
export interface SponsorRow {
  id: string;
  name: string;
  tier: string;
  logo_url: string;
  website_url: string;
  description?: string;
  sort_order?: number;
  published?: boolean;
  created_at?: string;
}
export interface AnnouncementRow { id: string; title: string; body: string; pinned: boolean; published_at: string }

export type Settings = Record<string, string>;

// ---------------------------------------------------------------------------
// Built-in defaults. These are shown instantly while the database loads, and
// whenever the database is not configured / unreachable. They mirror seed.sql.
// ---------------------------------------------------------------------------
export const DEFAULT_SETTINGS: Settings = {
  conference_dates: 'TBA',
  conference_venue: 'TBA',
  contact_email: '',
  instagram_handle: '@westmun_27',
  instagram_url: 'https://www.instagram.com/westmun_27',
  registration_open: 'false',
  registration_currency: 'USD',
  fee_early_bird: '',
  fee_regular: '',
  early_bird_opens: '',
  early_bird_closes: '',
  regular_opens: '',
  regular_closes: '',
  registration_intro:
    'Secure your delegation’s place at the Western Model United Nations Conference. Delegate registration proceeds in progressive windows. All official fee structures, financial aid criteria, and country allocation matrixes are To Be Announced (TBA).',
  registration_notice_title: 'Official Delegate Registration Opening Soon',
  registration_notice_text:
    'Official conference registration dates, delegate and delegation fee schedules, and committee allocation matrices will be published once conference dates and host venue agreements are ratified by the Secretariat.',
  contact_intro:
    'Have questions regarding committee agendas, delegation quotas, or institutional sponsorships? Connect with the organizing team directly.',
  organizer_name: '',
  legal_country: '',
  legal_version: '2026-10-17',
  terms_override: '',
  privacy_override: '',
};

const TBA_COMMITTEE =
  'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.';

export const DEFAULT_SECRETARIAT: SecretariatRow[] = [
  { id: 'd-sec-1', role: 'Secretary-General', name: 'Rakan Almerbad', department: 'Executive Leadership', bio: 'Overseeing conference proceedings, guiding delegates, and maintaining parliamentary decorum. Dedicated to ensuring an exceptional, collaborative MUN experience for all delegations.', image_url: '/rakan-almerbad.jpg', image_position: 'center', confirmed: true },
  { id: 'd-sec-2', role: 'Deputy Secretary-General', name: 'Yousef Saifi', department: 'Executive Secretariat', bio: 'Experienced debater with a deep passion for global diplomacy and constructive dialogue. Committed to youth empowerment, collaborative problem-solving, and delivering an unforgettable conference.', image_url: '/yousef.jpg', image_position: 'top', confirmed: true },
  { id: 'd-sec-3', role: 'Under-Secretary-General', name: 'Fahad', department: 'Executive Secretariat', bio: 'Directing substantive committee operations, delegate services, and institutional logistics. Dedicated to fostering high-level multilateral debate and diplomatic excellence.', image_url: 'https://i.ibb.co/DP0dXFd3/Whats-App-Image-2026-10-18-at-11-35-39-AM.jpg', image_position: 'center', confirmed: true },
  { id: 'd-sec-4', role: 'Senior Advisor', name: 'Muaz Elamir', department: 'Advisory Board', bio: 'Hi im Muaz Elamir My job is to guide the team, share advice, and help make sure the conference runs smoothly so you all have a great MUN experience!', image_url: '/muaz.jpg', image_position: 'center', confirmed: true },
];

export const DEFAULT_COMMITTEES: CommitteeRow[] = [
  { id: 'd-com-1', name: 'TBA', type: 'General Assembly', topic: 'TBA', chair: 'TBA', description: TBA_COMMITTEE, level: 'Novice & Intermediate' },
  { id: 'd-com-2', name: 'TBA', type: 'Security Council', topic: 'TBA', chair: 'TBA', description: TBA_COMMITTEE, level: 'Advanced & Crisis' },
  { id: 'd-com-3', name: 'TBA', type: 'Economic & Social Council', topic: 'TBA', chair: 'TBA', description: TBA_COMMITTEE, level: 'Intermediate' },
  { id: 'd-com-4', name: 'TBA', type: 'Specialized Agency', topic: 'TBA', chair: 'TBA', description: TBA_COMMITTEE, level: 'All Experience Levels' },
  { id: 'd-com-5', name: 'TBA', type: 'Crisis Committee', topic: 'TBA', chair: 'TBA', description: TBA_COMMITTEE, level: 'Advanced / Dynamic Directives' },
  { id: 'd-com-6', name: 'TBA', type: 'Regional Body', topic: 'TBA', chair: 'TBA', description: TBA_COMMITTEE, level: 'Intermediate' },
];

export const DEFAULT_DAYS: ScheduleDayRow[] = [
  { id: 'd-day-1', title: 'Day 1 — Convocations & Opening Deliberations', date_text: 'TBA' },
  { id: 'd-day-2', title: 'Day 2 — Intensive Negotiation & Working Papers', date_text: 'TBA' },
  { id: 'd-day-3', title: 'Day 3 — Voting Procedure & Closing Assembly', date_text: 'TBA' },
];

const s = (id: string, day_id: string, title: string, description: string): ScheduleSessionRow => ({
  id, day_id, time_text: 'TBA', title, location: 'TBA', description,
});
export const DEFAULT_SESSIONS: ScheduleSessionRow[] = [
  s('d-ses-1', 'd-day-1', 'Delegate Accreditation & Registration', 'Official credential issuance, placard collection, and handbook verification for registered delegations and single delegates.'),
  s('d-ses-2', 'd-day-1', 'Opening Ceremony & Diplomatic Keynote Address', 'Secretariat welcome, introduction of committee dais teams, and opening remarks by invited international relations guest speakers.'),
  s('d-ses-3', 'd-day-1', 'Committee Session I: Roll Call & Agenda Adoption', 'Formal roll call of member states, setting the agenda, opening of the General Speakers List, and initial moderated caucuses.'),
  s('d-ses-4', 'd-day-2', 'Committee Session II: Substantive Debate', 'Deep debate on core agenda items. Introduction of unmoderated caucuses, formation of regional blocs, and drafting initial working papers.'),
  s('d-ses-5', 'd-day-2', 'Committee Session III: Crisis Directives & Working Papers', 'Dais review of submitted working papers. Introduction of crisis updates and real-time diplomatic intelligence scenarios.'),
  s('d-ses-6', 'd-day-2', 'Committee Session IV: Draft Resolution Formulation', 'Consolidation of competing working papers into formal draft resolutions with registered sponsor and signatory states.'),
  s('d-ses-7', 'd-day-3', 'Committee Session V: Amendments & Debate', 'Presentation of friendly and unfriendly amendments, final speeches for and against operative clauses, and bloc consolidation.'),
  s('d-ses-8', 'd-day-3', 'Formal Voting Procedure on Draft Resolutions', 'Strict roll call voting procedure in accordance with parliamentary rules. Adoption or rejection of final committee resolutions.'),
  s('d-ses-9', 'd-day-3', 'Closing Ceremony & Delegation Adjournment', 'Secretary-General closing address, committee awards presentation, gavel handover, and official adjournment of WEST MUN.'),
];

export const DEFAULT_FAQ: FaqRow[] = [
  { id: 'd-faq-1', question: 'What is WEST MUN?', answer: 'WEST MUN (Western Model United Nations) is an academic conference simulating the United Nations and associated multilateral organs. Student delegates act as diplomats representing designated countries, researching international issues, negotiating policies, and authoring formal resolutions.' },
  { id: 'd-faq-2', question: 'Who can participate?', answer: 'WEST MUN welcomes high school and university students with an interest in international relations, debate, politics, law, and diplomacy. Both individual delegates (independent registrations) and school delegations accompanied by faculty advisors are eligible to register.' },
  { id: 'd-faq-3', question: 'Do I need previous MUN experience?', answer: 'No prior Model UN experience is required. The conference features committees tailored across skill levels, ranging from beginner-friendly General Assembly rooms with dais guidance to fast-paced advanced crisis simulations. Introductory procedure briefings are held during Day 1.' },
  { id: 'd-faq-4', question: 'What should delegates prepare prior to the conference?', answer: 'Delegates should thoroughly study their committee’s official Background Guide, research their assigned nation’s foreign policy and treaty record, and prepare a written Position Paper. Delegates will also benefit from practicing speeches and familiarizing themselves with the Rules of Procedure.' },
  { id: 'd-faq-5', question: 'What are the registration fees?', answer: 'Official registration fees for delegates, delegations, and faculty advisors are To Be Announced (TBA). The Secretariat is committed to keeping registration accessible and will announce final pricing alongside early-bird deadlines prior to open enrollment.' },
  { id: 'd-faq-6', question: 'When and where will the conference take place?', answer: 'The official conference dates and host venue/city are To Be Announced (TBA). The Secretariat is finalizing agreements with partner educational facilities and will release the confirmed schedule on this website.' },
  { id: 'd-faq-7', question: 'How can I contact the organizing team?', answer: 'Official secretariat contact email and communication channels are To Be Announced (TBA). In the interim, delegates and faculty may submit pre-registration alerts or message inquiries through our on-page Contact section below.' },
];

// ---------------------------------------------------------------------------
// Loading (one request per table per page load, shared by all components)
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;
const tableCache = new Map<string, Promise<Row[] | null>>();

function loadTable(table: string, order: Array<[string, boolean]>): Promise<Row[] | null> {
  let p = tableCache.get(table);
  if (!p) {
    p = (async () => {
      if (!supabase) return null;
      try {
        let query = supabase.from(table).select('*');
        for (const [col, asc] of order) query = query.order(col, { ascending: asc });
        const { data, error } = await query;
        if (error || !data) return null;
        return data as Row[];
      } catch {
        return null;
      }
    })();
    tableCache.set(table, p);
  }
  return p;
}

/**
 * Published rows of a table. While loading (or if the database cannot be
 * reached) the built-in fallback is returned; a successful empty result
 * really means "nothing to show".
 */
export function usePublicTable<T>(
  table: string,
  fallback: T[],
  order: Array<[string, boolean]> = [['sort_order', true], ['created_at', true]],
): T[] {
  const [rows, setRows] = useState<T[]>(fallback);
  useEffect(() => {
    let alive = true;
    loadTable(table, order).then((data) => {
      if (alive && data) setRows(data as T[]);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
  return rows;
}

let settingsPromise: Promise<Settings | null> | null = null;
function loadSettings(): Promise<Settings | null> {
  if (!settingsPromise) {
    settingsPromise = (async () => {
      if (!supabase) return null;
      try {
        const { data, error } = await supabase.from('settings').select('key,value');
        if (error || !data) return null;
        const out: Settings = {};
        for (const r of data as Array<{ key: string; value: string }>) out[r.key] = r.value ?? '';
        return out;
      } catch {
        return null;
      }
    })();
  }
  return settingsPromise;
}

export function invalidateSettingsCache(): void {
  settingsPromise = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('westmun:settings_updated'));
  }
}

export function invalidateTableCache(table?: string): void {
  if (table) {
    tableCache.delete(table);
  } else {
    tableCache.clear();
  }
}

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    let alive = true;
    const fetchSettings = () => {
      loadSettings().then((data) => {
        if (alive && data) setSettings({ ...DEFAULT_SETTINGS, ...data });
      });
    };
    fetchSettings();
    const handleUpdate = () => {
      settingsPromise = null;
      fetchSettings();
    };
    window.addEventListener('westmun:settings_updated', handleUpdate);
    return () => {
      alive = false;
      window.removeEventListener('westmun:settings_updated', handleUpdate);
    };
  }, []);
  return settings;
}

/** Text that is blank in Settings falls back to this ("TBA" style). */
export function orTba(value: string | undefined, fallback = 'TBA'): string {
  return value && value.trim() ? value.trim() : fallback;
}
