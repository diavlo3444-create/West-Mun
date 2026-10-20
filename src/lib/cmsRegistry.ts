/**
 * WEST MUN 2027 — Centralized CMS Content Registry
 *
 * Audited registry of all public website copy, headings, descriptions, navigation links,
 * and structured content blocks. This enables complete visual editing through the CMS
 * while providing truthful fallback defaults that match the official site copy.
 */

export interface CmsFieldDef {
  key: string;
  label: string;
  section: string;
  category: 'text' | 'textarea' | 'url' | 'image' | 'boolean' | 'number' | 'json';
  default: string;
  help?: string;
  placeholder?: string;
  max?: number;
}

export interface CmsSectionDef {
  id: string;
  label: string;
  description: string;
  page: 'home' | 'legal' | 'all';
  fields: CmsFieldDef[];
  hasStructuredItems?: boolean;
  structuredType?: 'pillars' | 'highlights' | 'facts' | 'links' | 'custom_cards';
}

export interface CmsCustomSection {
  id: string;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  layout: 'cards' | 'split' | 'banner' | 'features';
  visible: boolean;
  items: Array<{
    id: string;
    title: string;
    description: string;
    icon?: string;
    badge?: string;
    linkUrl?: string;
    linkLabel?: string;
  }>;
}

export interface CmsRevision {
  id: string;
  timestamp: string;
  authorName: string;
  authorEmail: string;
  summary: string;
  data: Record<string, string>;
}

// ---------------------------------------------------------------------------
// DEFAULT CMS CONTENT DICTIONARY
// ---------------------------------------------------------------------------
export const DEFAULT_CMS_CONTENT: Record<string, string> = {
  // --- NAVBAR ---
  'nav_brand_title': 'WEST MUN',
  'nav_brand_subtitle': 'Model United Nations',
  'nav_cta_label': 'Registration: TBA',
  'nav_cta_href': '#register',
  'nav_links_json': JSON.stringify([
    { label: 'Home', href: '#hero' },
    { label: 'About', href: '#about' },
    { label: 'Committees', href: '#committees' },
    { label: 'Schedule', href: '#schedule' },
    { label: 'Secretariat', href: '#secretariat' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ]),

  // --- HERO ---
  'hero_stage1_eyebrow': 'Western Model United Nations · 2027',
  'hero_stage1_title': 'WEST MUN 2027',
  'hero_stage1_subtitle': 'The Premier Multilateral Simulation & Diplomatic Leadership Forum',
  'hero_stage1_scroll_hint': 'Scroll down to initiate proceedings',
  'hero_stage2_badge': 'Plenary Session Dispatch',
  'hero_stage2_title': 'Diplomatic Engagement in Real-Time',
  'hero_stage2_dispatch':
    'The floor is open for debate. Good diplomacy unites divided nations. What global crisis will your delegation solve?',
  'hero_stage2_pill1': '✓ Parliamentary Procedure',
  'hero_stage2_pill2': '✓ Consensus Building',
  'hero_stage2_pill3': '✓ Working Resolutions',
  'hero_stage3_eyebrow': 'Registration: TBA',
  'hero_stage3_title': 'Take Your Seat on the World Stage',
  'hero_stage3_description':
    'Whether representing a permanent member of the Security Council or leading an assembly coalition, WEST MUN provides the substantive arena for your diplomatic ambitions.',
  'hero_cta_primary_label': 'Registration: TBA',
  'hero_cta_primary_href': '#register',
  'hero_cta_secondary_label': 'Explore the Conference',
  'hero_cta_secondary_href': '#about',

  // --- INTRO / MISSION ---
  'intro_eyebrow': 'The Mission of WEST MUN',
  'intro_title': 'Diplomacy. Dialogue. Impact.',
  'intro_description':
    'Model United Nations is an authentic simulation of the UN General Assembly, Security Council, and multilateral diplomatic agencies. Delegates represent sovereign nations, advocating foreign policy objectives, drafting binding resolutions, and navigating international crises.',
  'intro_pillars_json': JSON.stringify([
    {
      id: 'pillar-1',
      icon: 'Compass',
      title: 'Sovereign Representation',
      description:
        'Step into the shoes of career diplomats and heads of state. Defend geopolitical stances, reconcile competing alliances, and defend constitutional mandates through reasoned debate.',
    },
    {
      id: 'pillar-2',
      icon: 'Handshake',
      title: 'Multilateral Consensus',
      description:
        'Real world solutions cannot be dictated; they must be negotiated. Experience unmoderated caucuses, coalition building, compromise, and diplomatic bridge-building across ideological divides.',
    },
    {
      id: 'pillar-3',
      icon: 'BookOpen',
      title: 'Resolution Crafting',
      description:
        'Transform discussions into actionable international policy. Draft operative clauses, debate formal amendments, and establish international frameworks addressing modern global challenges.',
    },
  ]),
  'intro_theme_badge': 'Official Conference Theme',
  'intro_theme_text':
    'TBA — The Secretariat will release the annual conference theme and comprehensive delegate handbook ahead of the registration deadline.',

  // --- HIGHLIGHTS / ACADEMICS ---
  'highlights_eyebrow': 'Core Academic Disciplines',
  'highlights_title': 'Conference Highlights',
  'highlights_description':
    'Model United Nations provides hands-on mastery of diplomacy, speechwriting, geopolitical strategy, and international dispute resolution.',
  'highlights_items_json': JSON.stringify([
    {
      id: 'highlight-1',
      icon: 'Scale',
      title: 'Debate & Diplomacy',
      description:
        'Engage in parliamentary procedure under strict Rules of Procedure. Deliver formal speeches, raise points of inquiry, and present diplomatic counter-arguments while adhering to country policy.',
      metrics: 'Rules of Procedure · Parliamentary Floor · Moderated Caucuses',
    },
    {
      id: 'highlight-2',
      icon: 'ScrollText',
      title: 'Research & Resolution Writing',
      description:
        'Analyze extensive background guides, historical treaties, and international law. Draft rigorous preambulatory and operative clauses that propose tangible solutions to global crises.',
      metrics: 'Working Papers · Draft Resolutions · Direct Amendments',
    },
    {
      id: 'highlight-3',
      icon: 'Mic2',
      title: 'Public Speaking & Rhetoric',
      description:
        'Hone oratorical confidence and poise in front of a committee of international peers. Learn to articulate complex geopolitical arguments under strict speech-timer limits.',
      metrics: 'Speakers List · Right of Reply · Point of Information',
    },
    {
      id: 'highlight-4',
      icon: 'Users',
      title: 'Collaboration & Leadership',
      description:
        'Coordinate multilateral blocs during unmoderated sessions. Reconcile conflicting sovereign interests, negotiate mutual concessions, and lead sponsor groups toward a two-thirds majority vote.',
      metrics: 'Bloc Consensus · Coalition Building · Sponsor Leadership',
    },
  ]),

  // --- ABOUT WEST MUN ---
  'about_eyebrow': 'Institutional Profile',
  'about_title': 'About WEST MUN',
  'about_description':
    'WEST MUN is established to offer an uncompromising, academically rigorous platform for high school and collegiate delegates. We convene future diplomats to test their grasp of real-time crises, treaty obligations, and international negotiation.',
  'about_mission_title': 'Mission & Vision',
  'about_mission_text':
    'Our mission is to foster analytical critical thinking, cross-cultural empathy, and diplomatic discipline. WEST MUN empowers delegates to deconstruct complex international deadlocks and build durable coalitions through consensus.',
  'about_theme_notice_title': 'Official Conference Theme',
  'about_theme_notice_text':
    'TBA — The Secretariat will release the annual conference theme and comprehensive delegate handbook ahead of the registration deadline.',
  'about_why_title': 'Why Participate?',
  'about_why_bullet1':
    'Develop substantive fluency in international law, foreign policy, and treaty resolution drafting.',
  'about_why_bullet2':
    'Gain command of parliamentary procedure and high-stakes diplomatic rhetoric under pressure.',
  'about_why_bullet3':
    'Network with driven student delegates, faculty advisors, and guest speakers in international affairs.',
  'about_expectations_title': 'What Delegates Can Expect',
  'about_expectations_text':
    'From opening plenary to final voting procedure, delegates will engage in rigorous committee sessions led by experienced dais members. Expect deep background research, dynamic crises updates, spirited debate, and collegiate social events.',
  'about_facts_dates': 'TBA',
  'about_facts_venue': 'TBA',
  'about_facts_delegations': 'Single Delegates & School Delegations',
  'about_facts_language': 'English (Official UN Parliamentary Procedure)',

  // --- COMMITTEES SECTION HEADER ---
  'committees_eyebrow': 'Parliamentary Chambers',
  'committees_title': 'Committees & Dossiers',
  'committees_description':
    'Browse the simulated councils and specialized agencies ratified for WEST MUN. Each dais will release comprehensive background dossiers and procedural rubrics.',

  // --- SCHEDULE SECTION HEADER ---
  'schedule_eyebrow': 'Conference Program',
  'schedule_title': 'Schedule of Proceedings',
  'schedule_description':
    'The plenary timetable and committee session progression for the WEST MUN conference.',

  // --- SECRETARIAT SECTION HEADER ---
  'secretariat_eyebrow': 'Executive Leadership & Advisory',
  'secretariat_title': 'The Secretariat',
  'secretariat_description':
    'The executive leadership body governing WEST MUN, ensuring academic excellence, parliamentary decorum, and an unforgettable delegate experience.',

  // --- REGISTRATION SECTION ---
  'registration_eyebrow': 'Official Enrollment',
  'registration_title': 'Delegate Registration',
  'registration_intro':
    'Secure your delegation’s place at the Western Model United Nations Conference. Delegate registration proceeds in progressive windows. All official fee structures, financial aid criteria, and country allocation matrixes are To Be Announced (TBA).',
  'registration_notice_title': 'Official Delegate Registration Opening Soon',
  'registration_notice_text':
    'Official conference registration dates, delegate and delegation fee schedules, and committee allocation matrices will be published once conference dates and host venue agreements are ratified by the Secretariat.',

  // --- FAQ SECTION HEADER ---
  'faq_eyebrow': 'Information & Guidance',
  'faq_title': 'Frequently Asked Questions',
  'faq_description':
    'Essential information regarding delegate eligibility, parliamentary preparation, background guides, and registration protocol.',

  // --- CONTACT SECTION ---
  'contact_eyebrow': 'Diplomatic Inquiries',
  'contact_title': 'Connect with the Secretariat',
  'contact_intro':
    'Have questions regarding committee agendas, delegation quotas, or institutional sponsorships? Connect with the organizing team directly.',
  'contact_venue_city': 'TBA',
  'contact_dates_summary': 'TBA',
  'contact_email_note': 'Official secretariat contact email is To Be Announced (TBA).',

  // --- FOOTER ---
  'footer_brand_title': 'WEST MUN',
  'footer_brand_tagline': 'Where Diplomacy Meets Leadership',
  'footer_description':
    'Western Model United Nations Conference. Fostering diplomatic negotiation, global perspective, and principled leadership through rigorous international simulations.',
  'footer_badge_text': 'Official Conference Secretariat',
  'footer_copyright': '© 2027 Western Model United Nations. All rights reserved.',

  // --- CUSTOM SECTIONS & VERSIONING ---
  'cms_custom_sections_json': '[]',
  'cms_published_at': new Date().toISOString(),
  'cms_published_version': '1.0',
};

// ---------------------------------------------------------------------------
// CMS SECTIONS REGISTRY FOR THE VISUAL EDITOR TREE
// ---------------------------------------------------------------------------
export const CMS_SECTIONS: CmsSectionDef[] = [
  {
    id: 'navbar',
    label: 'Navigation Bar',
    description: 'Header logo text, navigation menu links, and primary top action button.',
    page: 'all',
    hasStructuredItems: true,
    structuredType: 'links',
    fields: [
      { key: 'nav_brand_title', label: 'Brand Title', section: 'navbar', category: 'text', default: 'WEST MUN', max: 60 },
      { key: 'nav_brand_subtitle', label: 'Brand Subtitle', section: 'navbar', category: 'text', default: 'Model United Nations', max: 80 },
      { key: 'nav_cta_label', label: 'CTA Button Label', section: 'navbar', category: 'text', default: 'Registration: TBA', max: 60 },
      { key: 'nav_cta_href', label: 'CTA Button Link', section: 'navbar', category: 'text', default: '#register', max: 200 },
    ],
  },
  {
    id: 'hero',
    label: 'Hero & Cinematic Stages',
    description: 'Headlines, typewriter delegate dispatch, scroll cues, and action stage CTAs.',
    page: 'home',
    fields: [
      { key: 'hero_stage1_eyebrow', label: 'Stage 1: Eyebrow', section: 'hero', category: 'text', default: 'Western Model United Nations · 2027', max: 120 },
      { key: 'hero_stage1_title', label: 'Stage 1: Title', section: 'hero', category: 'text', default: 'WEST MUN 2027', max: 120 },
      { key: 'hero_stage1_subtitle', label: 'Stage 1: Subtitle', section: 'hero', category: 'textarea', default: 'The Premier Multilateral Simulation & Diplomatic Leadership Forum', max: 300 },
      { key: 'hero_stage1_scroll_hint', label: 'Stage 1: Scroll Prompt', section: 'hero', category: 'text', default: 'Scroll down to initiate proceedings', max: 120 },
      { key: 'hero_stage2_badge', label: 'Stage 2: Badge Label', section: 'hero', category: 'text', default: 'Plenary Session Dispatch', max: 80 },
      { key: 'hero_stage2_title', label: 'Stage 2: Title', section: 'hero', category: 'text', default: 'Diplomatic Engagement in Real-Time', max: 120 },
      { key: 'hero_stage2_dispatch', label: 'Stage 2: Typewriter Dispatch Text', section: 'hero', category: 'textarea', default: 'The floor is open for debate. Good diplomacy unites divided nations. What global crisis will your delegation solve?', max: 500 },
      { key: 'hero_stage2_pill1', label: 'Stage 2: Pill 1', section: 'hero', category: 'text', default: '✓ Parliamentary Procedure', max: 60 },
      { key: 'hero_stage2_pill2', label: 'Stage 2: Pill 2', section: 'hero', category: 'text', default: '✓ Consensus Building', max: 60 },
      { key: 'hero_stage2_pill3', label: 'Stage 2: Pill 3', section: 'hero', category: 'text', default: '✓ Working Resolutions', max: 60 },
      { key: 'hero_stage3_eyebrow', label: 'Stage 3: Eyebrow Badge', section: 'hero', category: 'text', default: 'Registration: TBA', max: 80 },
      { key: 'hero_stage3_title', label: 'Stage 3: Title', section: 'hero', category: 'text', default: 'Take Your Seat on the World Stage', max: 120 },
      { key: 'hero_stage3_description', label: 'Stage 3: Paragraph', section: 'hero', category: 'textarea', default: 'Whether representing a permanent member of the Security Council or leading an assembly coalition, WEST MUN provides the substantive arena for your diplomatic ambitions.', max: 600 },
      { key: 'hero_cta_primary_label', label: 'Primary CTA Label', section: 'hero', category: 'text', default: 'Registration: TBA', max: 60 },
      { key: 'hero_cta_primary_href', label: 'Primary CTA Link', section: 'hero', category: 'text', default: '#register', max: 200 },
      { key: 'hero_cta_secondary_label', label: 'Secondary CTA Label', section: 'hero', category: 'text', default: 'Explore the Conference', max: 60 },
      { key: 'hero_cta_secondary_href', label: 'Secondary CTA Link', section: 'hero', category: 'text', default: '#about', max: 200 },
    ],
  },
  {
    id: 'intro',
    label: 'Mission & Diplomatic Pillars',
    description: 'Conference purpose, the 3 pillars of diplomatic engagement, and the theme notice.',
    page: 'home',
    hasStructuredItems: true,
    structuredType: 'pillars',
    fields: [
      { key: 'intro_eyebrow', label: 'Section Eyebrow', section: 'intro', category: 'text', default: 'The Mission of WEST MUN', max: 100 },
      { key: 'intro_title', label: 'Section Heading', section: 'intro', category: 'text', default: 'Diplomacy. Dialogue. Impact.', max: 120 },
      { key: 'intro_description', label: 'Mission Overview', section: 'intro', category: 'textarea', default: 'Model United Nations is an authentic simulation of the UN General Assembly, Security Council, and multilateral diplomatic agencies. Delegates represent sovereign nations, advocating foreign policy objectives, drafting binding resolutions, and navigating international crises.', max: 800 },
      { key: 'intro_theme_badge', label: 'Theme Badge Text', section: 'intro', category: 'text', default: 'Official Conference Theme', max: 80 },
      { key: 'intro_theme_text', label: 'Theme Status Text', section: 'intro', category: 'textarea', default: 'TBA — The Secretariat will release the annual conference theme and comprehensive delegate handbook ahead of the registration deadline.', max: 400 },
    ],
  },
  {
    id: 'highlights',
    label: 'Conference Highlights',
    description: 'The core academic disciplines and simulated skillset cards.',
    page: 'home',
    hasStructuredItems: true,
    structuredType: 'highlights',
    fields: [
      { key: 'highlights_eyebrow', label: 'Section Eyebrow', section: 'highlights', category: 'text', default: 'Core Academic Disciplines', max: 100 },
      { key: 'highlights_title', label: 'Section Heading', section: 'highlights', category: 'text', default: 'Conference Highlights', max: 120 },
      { key: 'highlights_description', label: 'Section Subtitle', section: 'highlights', category: 'textarea', default: 'Model United Nations provides hands-on mastery of diplomacy, speechwriting, geopolitical strategy, and international dispute resolution.', max: 600 },
    ],
  },
  {
    id: 'about',
    label: 'About WEST MUN',
    description: 'Institutional profile, mission & vision, participation benefits, and conference facts.',
    page: 'home',
    hasStructuredItems: true,
    structuredType: 'facts',
    fields: [
      { key: 'about_eyebrow', label: 'Section Eyebrow', section: 'about', category: 'text', default: 'Institutional Profile', max: 100 },
      { key: 'about_title', label: 'Section Heading', section: 'about', category: 'text', default: 'About WEST MUN', max: 120 },
      { key: 'about_description', label: 'Introductory Paragraph', section: 'about', category: 'textarea', default: 'WEST MUN is established to offer an uncompromising, academically rigorous platform for high school and collegiate delegates. We convene future diplomats to test their grasp of real-time crises, treaty obligations, and international negotiation.', max: 800 },
      { key: 'about_mission_title', label: 'Mission Box Title', section: 'about', category: 'text', default: 'Mission & Vision', max: 100 },
      { key: 'about_mission_text', label: 'Mission Box Text', section: 'about', category: 'textarea', default: 'Our mission is to foster analytical critical thinking, cross-cultural empathy, and diplomatic discipline. WEST MUN empowers delegates to deconstruct complex international deadlocks and build durable coalitions through consensus.', max: 800 },
      { key: 'about_theme_notice_title', label: 'Theme Callout Title', section: 'about', category: 'text', default: 'Official Conference Theme', max: 100 },
      { key: 'about_theme_notice_text', label: 'Theme Callout Text', section: 'about', category: 'textarea', default: 'TBA — The Secretariat will release the annual conference theme and comprehensive delegate handbook ahead of the registration deadline.', max: 400 },
      { key: 'about_why_title', label: 'Benefits Heading', section: 'about', category: 'text', default: 'Why Participate?', max: 100 },
      { key: 'about_why_bullet1', label: 'Benefit Bullet 1', section: 'about', category: 'textarea', default: 'Develop substantive fluency in international law, foreign policy, and treaty resolution drafting.', max: 400 },
      { key: 'about_why_bullet2', label: 'Benefit Bullet 2', section: 'about', category: 'textarea', default: 'Gain command of parliamentary procedure and high-stakes diplomatic rhetoric under pressure.', max: 400 },
      { key: 'about_why_bullet3', label: 'Benefit Bullet 3', section: 'about', category: 'textarea', default: 'Network with driven student delegates, faculty advisors, and guest speakers in international affairs.', max: 400 },
      { key: 'about_expectations_title', label: 'Expectations Heading', section: 'about', category: 'text', default: 'What Delegates Can Expect', max: 100 },
      { key: 'about_expectations_text', label: 'Expectations Text', section: 'about', category: 'textarea', default: 'From opening plenary to final voting procedure, delegates will engage in rigorous committee sessions led by experienced dais members. Expect deep background research, dynamic crises updates, spirited debate, and collegiate social events.', max: 800 },
      { key: 'about_facts_dates', label: 'Fact: Dates', section: 'about', category: 'text', default: 'TBA', max: 80 },
      { key: 'about_facts_venue', label: 'Fact: Venue / City', section: 'about', category: 'text', default: 'TBA', max: 120 },
      { key: 'about_facts_delegations', label: 'Fact: Delegation Type', section: 'about', category: 'text', default: 'Single Delegates & School Delegations', max: 120 },
      { key: 'about_facts_language', label: 'Fact: Working Language', section: 'about', category: 'text', default: 'English (Official UN Parliamentary Procedure)', max: 120 },
    ],
  },
  {
    id: 'committees_header',
    label: 'Committees Header',
    description: 'Header text displayed above the committee cards and dossier filters.',
    page: 'home',
    fields: [
      { key: 'committees_eyebrow', label: 'Section Eyebrow', section: 'committees_header', category: 'text', default: 'Parliamentary Chambers', max: 100 },
      { key: 'committees_title', label: 'Section Heading', section: 'committees_header', category: 'text', default: 'Committees & Dossiers', max: 120 },
      { key: 'committees_description', label: 'Section Subtitle', section: 'committees_header', category: 'textarea', default: 'Browse the simulated councils and specialized agencies ratified for WEST MUN. Each dais will release comprehensive background dossiers and procedural rubrics.', max: 600 },
    ],
  },
  {
    id: 'schedule_header',
    label: 'Schedule Header',
    description: 'Header text for the conference program timeline.',
    page: 'home',
    fields: [
      { key: 'schedule_eyebrow', label: 'Section Eyebrow', section: 'schedule_header', category: 'text', default: 'Conference Program', max: 100 },
      { key: 'schedule_title', label: 'Section Heading', section: 'schedule_header', category: 'text', default: 'Schedule of Proceedings', max: 120 },
      { key: 'schedule_description', label: 'Section Subtitle', section: 'schedule_header', category: 'textarea', default: 'The plenary timetable and committee session progression for the WEST MUN conference.', max: 600 },
    ],
  },
  {
    id: 'secretariat_header',
    label: 'Secretariat Header',
    description: 'Header text for the Executive Leadership & Advisory team display.',
    page: 'home',
    fields: [
      { key: 'secretariat_eyebrow', label: 'Section Eyebrow', section: 'secretariat_header', category: 'text', default: 'Executive Leadership & Advisory', max: 100 },
      { key: 'secretariat_title', label: 'Section Heading', section: 'secretariat_header', category: 'text', default: 'The Secretariat', max: 120 },
      { key: 'secretariat_description', label: 'Section Subtitle', section: 'secretariat_header', category: 'textarea', default: 'The executive leadership body governing WEST MUN, ensuring academic excellence, parliamentary decorum, and an unforgettable delegate experience.', max: 600 },
    ],
  },
  {
    id: 'registration_texts',
    label: 'Registration Section Copy',
    description: 'Introductory copy and notices shown on the registration portal.',
    page: 'home',
    fields: [
      { key: 'registration_eyebrow', label: 'Section Eyebrow', section: 'registration_texts', category: 'text', default: 'Official Enrollment', max: 100 },
      { key: 'registration_title', label: 'Section Heading', section: 'registration_texts', category: 'text', default: 'Delegate Registration', max: 120 },
      { key: 'registration_intro', label: 'Introductory Paragraph', section: 'registration_texts', category: 'textarea', default: 'Secure your delegation’s place at the Western Model United Nations Conference. Delegate registration proceeds in progressive windows. All official fee structures, financial aid criteria, and country allocation matrixes are To Be Announced (TBA).', max: 1000 },
      { key: 'registration_notice_title', label: 'Notice Title (When Closed)', section: 'registration_texts', category: 'text', default: 'Official Delegate Registration Opening Soon', max: 160 },
      { key: 'registration_notice_text', label: 'Notice Message (When Closed)', section: 'registration_texts', category: 'textarea', default: 'Official conference registration dates, delegate and delegation fee schedules, and committee allocation matrices will be published once conference dates and host venue agreements are ratified by the Secretariat.', max: 1000 },
    ],
  },
  {
    id: 'faq_header',
    label: 'FAQ Header',
    description: 'Header copy for the Frequently Asked Questions section.',
    page: 'home',
    fields: [
      { key: 'faq_eyebrow', label: 'Section Eyebrow', section: 'faq_header', category: 'text', default: 'Information & Guidance', max: 100 },
      { key: 'faq_title', label: 'Section Heading', section: 'faq_header', category: 'text', default: 'Frequently Asked Questions', max: 120 },
      { key: 'faq_description', label: 'Section Subtitle', section: 'faq_header', category: 'textarea', default: 'Essential information regarding delegate eligibility, parliamentary preparation, background guides, and registration protocol.', max: 600 },
    ],
  },
  {
    id: 'contact_texts',
    label: 'Contact & Inquiries Copy',
    description: 'Secretariat communication channels and contact section introduction.',
    page: 'home',
    fields: [
      { key: 'contact_eyebrow', label: 'Section Eyebrow', section: 'contact_texts', category: 'text', default: 'Diplomatic Inquiries', max: 100 },
      { key: 'contact_title', label: 'Section Heading', section: 'contact_texts', category: 'text', default: 'Connect with the Secretariat', max: 120 },
      { key: 'contact_intro', label: 'Introductory Text', section: 'contact_texts', category: 'textarea', default: 'Have questions regarding committee agendas, delegation quotas, or institutional sponsorships? Connect with the organizing team directly.', max: 600 },
      { key: 'contact_venue_city', label: 'Venue / City Summary', section: 'contact_texts', category: 'text', default: 'TBA', max: 120 },
      { key: 'contact_dates_summary', label: 'Dates Summary', section: 'contact_texts', category: 'text', default: 'TBA', max: 120 },
    ],
  },
  {
    id: 'footer_texts',
    label: 'Footer & Disclosures',
    description: 'Footer branding, mission statement, copyright, and official disclosures.',
    page: 'all',
    fields: [
      { key: 'footer_brand_title', label: 'Brand Title', section: 'footer_texts', category: 'text', default: 'WEST MUN', max: 80 },
      { key: 'footer_brand_tagline', label: 'Tagline', section: 'footer_texts', category: 'text', default: 'Where Diplomacy Meets Leadership', max: 120 },
      { key: 'footer_description', label: 'Description', section: 'footer_texts', category: 'textarea', default: 'Western Model United Nations Conference. Fostering diplomatic negotiation, global perspective, and principled leadership through rigorous international simulations.', max: 600 },
      { key: 'footer_badge_text', label: 'Badge Label', section: 'footer_texts', category: 'text', default: 'Official Conference Secretariat', max: 100 },
      { key: 'footer_copyright', label: 'Copyright Notice', section: 'footer_texts', category: 'text', default: '© 2027 Western Model United Nations. All rights reserved.', max: 160 },
    ],
  },
  {
    id: 'custom_sections_group',
    label: 'Custom Website Sections',
    description: 'Add, reorder, show/hide, or remove custom branded sections on the public site.',
    page: 'home',
    hasStructuredItems: true,
    structuredType: 'custom_cards',
    fields: [
      { key: 'cms_custom_sections_json', label: 'Custom Sections Data (JSON)', section: 'custom_sections_group', category: 'json', default: '[]' },
    ],
  },
];
