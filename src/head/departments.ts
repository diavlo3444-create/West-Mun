import {
  Palette,
  Megaphone,
  Camera,
  Shield,
  HeartHandshake,
  Share2,
  Users2,
  Truck,
  Code2,
  Sparkles,
  Flame,
  type LucideIcon,
} from 'lucide-react';

export type DepartmentKey =
  | 'design'
  | 'marketing'
  | 'media_press'
  | 'security'
  | 'volunteers'
  | 'pr'
  | 'hr'
  | 'logistics'
  | 'it'
  | 'ceremonies'
  | 'dcc';

export type SectionKey = 'male' | 'female';

export interface DepartmentMeta {
  key: DepartmentKey;
  label: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  settingKey: string;
  slug: string;
  primaryColor: string;
  hasGenderSections?: boolean;
}

export const GENDER_SEPARATED_DEPARTMENTS: readonly DepartmentKey[] = [
  'media_press',
  'security',
  'volunteers',
] as const;

export function isGenderSeparated(dept: DepartmentKey): boolean {
  return GENDER_SEPARATED_DEPARTMENTS.includes(dept);
}

export const DEPARTMENTS: Record<DepartmentKey, DepartmentMeta> = {
  design: {
    key: 'design',
    slug: 'design',
    label: 'Design & Visual Identity',
    tagline: 'Brand, Placards & Visual Architecture',
    description: 'Directing summit visuals, branding guidelines, conference publications, placard design, and spatial aesthetics.',
    icon: Palette,
    settingKey: 'team_design_open',
    primaryColor: '#d4af37',
    hasGenderSections: false,
  },
  marketing: {
    key: 'marketing',
    slug: 'marketing',
    label: 'Marketing & Digital Outreach',
    tagline: 'Promotions, Campaigns & Delegation Growth',
    description: 'Leading digital campaigns, delegation recruitment initiatives, institutional outreach, and sponsorship collateral.',
    icon: Megaphone,
    settingKey: 'team_marketing_open',
    primaryColor: '#e5c158',
    hasGenderSections: false,
  },
  media_press: {
    key: 'media_press',
    slug: 'media_press',
    label: 'Media & Press Corps',
    tagline: 'Journalism, Broadcast & Summit Photography',
    description: 'Leading the summit press corps, plenary broadcast recordings, editorial articles, photojournalism, and interviews.',
    icon: Camera,
    settingKey: 'team_media_open',
    primaryColor: '#c5a059',
    hasGenderSections: true,
  },
  security: {
    key: 'security',
    slug: 'security',
    label: 'Security & Protocol',
    tagline: 'Delegate Safety, Decorum & Floor Integrity',
    description: 'Enforcing diplomatic decorum, entrance accreditation, committee chamber order, and physical safety.',
    icon: Shield,
    settingKey: 'team_security_open',
    primaryColor: '#997a3a',
    hasGenderSections: true,
  },
  volunteers: {
    key: 'volunteers',
    slug: 'volunteers',
    label: 'Conference Volunteers',
    tagline: 'Chamber Logistics, Dais Runners & Support',
    description: 'Managing dais runners, draft resolution delivery, crisis note passing, and general summit assistance.',
    icon: HeartHandshake,
    settingKey: 'team_volunteers_open',
    primaryColor: '#d4af37',
    hasGenderSections: true,
  },
  pr: {
    key: 'pr',
    slug: 'pr',
    label: 'Public Relations & External Affairs',
    tagline: 'Diplomatic Liaison & VIP Protocol',
    description: 'Managing relations with embassies, educational institutions, keynote speakers, and visiting diplomatic dignitaries.',
    icon: Share2,
    settingKey: 'team_pr_open',
    primaryColor: '#f3e5ab',
    hasGenderSections: false,
  },
  hr: {
    key: 'hr',
    slug: 'hr',
    label: 'Human Resources & Delegate Services',
    tagline: 'Staff Welfare, Accreditation & Inquiries',
    description: 'Staff performance, delegate credential dispute resolution, onboarding briefings, and team coordination.',
    icon: Users2,
    settingKey: 'team_hr_open',
    primaryColor: '#aa8232',
    hasGenderSections: false,
  },
  logistics: {
    key: 'logistics',
    slug: 'logistics',
    label: 'Logistics & Venue Operations',
    tagline: 'Procurement, Staging & Room Allocation',
    description: 'Managing venue floor plans, dais audio-visual staging, catering, stationery procurement, and signage.',
    icon: Truck,
    settingKey: 'team_logistics_open',
    primaryColor: '#e5c158',
    hasGenderSections: false,
  },
  it: {
    key: 'it',
    slug: 'it',
    label: 'IT & Digital Infrastructure',
    tagline: 'Portals, Cybersecurity & Dais Tech',
    description: 'Managing conference portal stability, dais presentation technology, network connectivity, and digital voting systems.',
    icon: Code2,
    settingKey: 'team_it_open',
    primaryColor: '#d4af37',
    hasGenderSections: false,
  },
  ceremonies: {
    key: 'ceremonies',
    slug: 'ceremonies',
    label: 'Opening & Closing Ceremonies',
    tagline: 'Convocations, Keynotes & Diplomatic Protocol',
    description: 'Organizing the grand opening convocation, dais stage design, ambassador keynotes, gavel handover, and awards.',
    icon: Sparkles,
    settingKey: 'team_ceremonies_open',
    primaryColor: '#f3e5ab',
    hasGenderSections: false,
  },
  dcc: {
    key: 'dcc',
    slug: 'dcc',
    label: 'Diplomatic Crisis Corps (DCC)',
    tagline: 'Crisis Intelligence, Directives & Scenarios',
    description: 'Formulating dynamic crisis storylines, intelligence leaks, midnight directives, and real-time simulations.',
    icon: Flame,
    settingKey: 'team_dcc_open',
    primaryColor: '#aa8232',
    hasGenderSections: false,
  },
};

export const VALID_DEPARTMENTS: DepartmentKey[] = Object.keys(DEPARTMENTS) as DepartmentKey[];

export function isDepartmentKey(val: unknown): val is DepartmentKey {
  return typeof val === 'string' && VALID_DEPARTMENTS.includes(val as DepartmentKey);
}

export function isSectionKey(val: unknown): val is SectionKey {
  return val === 'male' || val === 'female';
}

export interface HeadAssignment {
  department: DepartmentKey;
  section?: SectionKey | null;
  headName?: string | null;
  headEmail?: string | null;
  roleTitle?: string | null;
}

export type HeadLookupResult =
  | { status: 'success'; assignment: HeadAssignment }
  | { status: 'not_found' }
  | { status: 'permission_denied'; code?: string; message: string }
  | { status: 'network_error'; message: string }
  | { status: 'invalid_assignment'; message: string };

/**
 * Generates the canonical URL for a department dashboard.
 */
export function getDepartmentDashboardUrl(
  department: DepartmentKey,
  section?: SectionKey | null
): string {
  if (isGenderSeparated(department) && section) {
    return `/head/${department}/${section}`;
  }
  return `/head/${department}`;
}

/**
 * Role titles are derived from the department catalogue and the assignment
 * stored in public.department_heads. No head identity is hardcoded in the
 * frontend: the database remains the single source of truth.
 */
export function getRoleTitle(
  department: DepartmentKey,
  section?: SectionKey | null
): string {
  const deptMeta = DEPARTMENTS[department];
  if (!deptMeta) return 'Department Head';
  if (isGenderSeparated(department) && section) {
    return `${section === 'female' ? 'Female' : 'Male'} Head of ${deptMeta.label}`;
  }
  return `Head of ${deptMeta.label}`;
}

/**
 * Look up verified department assignment for authenticated head.
 * Checks active server session first, then falls back to Supabase if configured.
 */
export async function lookupHeadAssignment(userId?: string): Promise<HeadLookupResult> {
  // 1. Local dev session token. Skipped whenever a real Supabase user ID is
  //    supplied, so a stale token can never override the authenticated account.
  try {
    const token =
      !userId && typeof window !== 'undefined'
        ? sessionStorage.getItem('westmun_head_session')
        : null;
    if (token) {
      const resp = await fetch('/api/head-auth?action=session', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.authorized && data.head) {
          const dept = data.head.department as DepartmentKey;
          const sec = data.head.section as SectionKey | null;
          return {
            status: 'success',
            assignment: {
              department: dept,
              section: sec,
              headName: data.head.headName || null,
              headEmail: data.head.email || null,
              roleTitle: getRoleTitle(dept, sec),
            },
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Head Authorization] Session verification check bypassed:', err);
  }

  // 2. Supabase fallback if configured
  const { supabase, supabaseConfigured } = await import('../lib/supabase');
  if (!supabaseConfigured || !supabase || !userId) {
    return {
      status: 'not_found',
    };
  }

  try {
    // Query public.department_heads using `user_id = session.user.id`.
    // RLS still restricts this to the caller's own row.
    const { data, error } = await supabase
      .from('department_heads')
      .select('department, section, active, head_name, email')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // Safe diagnostic logging (no passwords, tokens, or personal info)
      console.error('[Head Authorization] Query failed:', {
        code: error.code,
        message: error.message,
      });

      // Distinguish RLS / permission denial
      const isPermission =
        error.code === '42501' ||
        error.code === 'PGRST301' ||
        error.message?.toLowerCase().includes('permission') ||
        error.message?.toLowerCase().includes('policy') ||
        error.message?.toLowerCase().includes('row-level security');

      if (isPermission) {
        return {
          status: 'permission_denied',
          code: error.code,
          message: error.message || 'Row Level Security policy blocked reading department_heads.',
        };
      }

      // Distinguish network / connection errors
      const isNetwork =
        error.message?.toLowerCase().includes('failed to fetch') ||
        error.message?.toLowerCase().includes('network') ||
        error.message?.toLowerCase().includes('timeout');

      if (isNetwork) {
        return {
          status: 'network_error',
          message: error.message || 'Network connection failed.',
        };
      }

      return {
        status: 'permission_denied',
        code: error.code,
        message: error.message || 'Database error occurred during authorization lookup.',
      };
    }

    // Query ran cleanly: check if an assignment row exists
    if (!data) {
      return { status: 'not_found' };
    }

    // Suspended heads keep their row but must lose portal access.
    if (data.active === false) {
      return { status: 'not_found' };
    }

    // Validate department
    let deptStr = String(data.department || '').trim().toLowerCase();
    if (deptStr === 'media') deptStr = 'media_press';

    if (!isDepartmentKey(deptStr)) {
      return {
        status: 'invalid_assignment',
        message: `Unknown department "${data.department}" assigned in database.`,
      };
    }

    const dept = deptStr as DepartmentKey;

    // Validate section for gender-separated departments
    let section: SectionKey | null = null;
    if (isGenderSeparated(dept)) {
      const rawSec = data.section ? String(data.section).trim().toLowerCase() : '';
      if (rawSec !== 'male' && rawSec !== 'female') {
        return {
          status: 'invalid_assignment',
          message: `Department "${dept}" requires division to be "male" or "female". Found "${data.section || 'null'}".`,
        };
      }
      section = rawSec as SectionKey;
    }

    // Identity comes from the assigned department_heads row, never a roster
    // embedded in the bundle. Empty names fall back to the Auth profile in
    // HeadPortal, and the email column is used only for display.
    const storedName = typeof data.head_name === 'string' ? data.head_name.trim() : '';

    return {
      status: 'success',
      assignment: {
        department: dept,
        section,
        headName: storedName || null,
        headEmail: typeof data.email === 'string' ? data.email : null,
        roleTitle: getRoleTitle(dept, section),
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown exception during authorization';
    console.error('[Head Authorization] Unexpected lookup exception:', msg);
    return {
      status: 'network_error',
      message: msg,
    };
  }
}

/**
 * Backward-compatible helper returning HeadAssignment | null
 */
export async function fetchHeadAssignment(userId: string): Promise<HeadAssignment | null> {
  const result = await lookupHeadAssignment(userId);
  if (result.status === 'success') {
    return result.assignment;
  }
  return null;
}
