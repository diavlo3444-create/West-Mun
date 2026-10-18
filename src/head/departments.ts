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

export interface AuthorizedHead {
  name: string;
  department: DepartmentKey;
  section?: SectionKey;
  roleTitle: string;
}

/**
 * Official WEST MUN Head Roster.
 * Strict authority: Only individuals listed below are authorized as department heads.
 */
export const AUTHORIZED_HEADS: readonly AuthorizedHead[] = [
  { name: 'Mallak Abbas', department: 'design', roleTitle: 'Head of Design & Visual Identity' },
  { name: 'Naya Barakat', department: 'marketing', roleTitle: 'Head of Marketing & Digital Outreach' },
  { name: 'Fahad Al Kendi', department: 'media_press', section: 'male', roleTitle: 'Male Head of Media & Press' },
  { name: 'Selena', department: 'media_press', section: 'female', roleTitle: 'Female Head of Media & Press' },
  { name: 'Yusef Saad', department: 'security', section: 'male', roleTitle: 'Male Head of Security & Protocol' },
  { name: 'Najla Rami', department: 'security', section: 'female', roleTitle: 'Female Head of Security & Protocol' },
  { name: 'Saad Usman', department: 'volunteers', section: 'male', roleTitle: 'Male Head of Volunteers' },
  { name: 'Maram Ali', department: 'volunteers', section: 'female', roleTitle: 'Female Head of Volunteers' },
  { name: 'Mazen Alada', department: 'pr', roleTitle: 'Head of Public Relations & External Affairs' },
  { name: 'Dana Alnajjar', department: 'pr', roleTitle: 'Head of Public Relations & External Affairs' },
  { name: 'Hoorain', department: 'hr', roleTitle: 'Head of Human Resources & Delegate Services' },
  { name: 'Seif Ayman', department: 'hr', roleTitle: 'Head of Human Resources & Delegate Services' },
  { name: 'Ahmed El Amir', department: 'logistics', roleTitle: 'Head of Logistics & Venue Operations' },
  { name: 'Mohamed Magdi', department: 'it', roleTitle: 'Head of IT & Digital Infrastructure' },
  { name: 'Saleh', department: 'it', roleTitle: 'Head of IT & Digital Infrastructure' },
  { name: 'Sultana', department: 'ceremonies', roleTitle: 'Head of Opening & Closing Ceremonies' },
  { name: 'Majd', department: 'dcc', roleTitle: 'Head of Diplomatic Crisis Corps (DCC)' },
] as const;

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
