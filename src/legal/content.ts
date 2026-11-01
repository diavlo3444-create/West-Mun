// Legal Policies and Disclosures for WEST MUN (Western Model United Nations).
//
// Compliant with applicable laws of the Kingdom of Saudi Arabia:
// - Saudi Personal Data Protection Law (PDPL - Royal Decree No. M/19 / M/148)
// - PDPL Implementing Regulations & Cross-Border Data Transfer Regulations
// - Saudi Copyright Law (Royal Decree No. M/41)
// - Saudi E-Commerce Law & Electronic Transactions Law
// - International educational simulation standards & student safeguarding
import type { Settings } from '../lib/content';

export interface LegalSection {
  heading: string;
  /** Paragraphs. A line starting with "- " is rendered as a bullet. */
  body: string[];
}

interface Vars {
  org: string;
  contact: string;
  country: string;
  version: string;
}

function vars(s: Settings): Vars {
  const email = s.contact_email?.trim();
  return {
    org: s.organizer_name?.trim() || 'the WEST MUN Organizing Secretariat',
    contact: email
      ? `by email at ${email} or via the official inquiry channel on this website`
      : 'via the official contact channel on this website',
    country: s.legal_country?.trim() || 'the Kingdom of Saudi Arabia',
    version: s.legal_version?.trim() || '2027.1 (Riyadh Edition)',
  };
}

// ---------------------------------------------------------------------------
// 1. TERMS OF SERVICE / TERMS AND CONDITIONS
// ---------------------------------------------------------------------------
export function termsSections(settings: Settings): LegalSection[] {
  const v = vars(settings);
  return [
    {
      heading: '1. Introduction and Scope',
      body: [
        `These Terms and Conditions ("Terms") govern your access to and use of the official WEST MUN website (west-mun.vercel.app) and your application to, registration for, and attendance at the Western Model United Nations Conference (the "Conference").`,
        `The website and Conference are organized and operated by ${v.org} ("WEST MUN", "we", "us", or "our"), an independent student-led educational initiative based in Riyadh, ${v.country}.`,
        'By browsing this website, submitting an inquiry, or completing an application, you agree to be bound by these Terms, the Privacy Policy, the Participant Code of Conduct, and the Media Consent Notice. If you do not agree, you must immediately discontinue use of the website and refrain from applying.',
      ],
    },
    {
      heading: '2. United Nations Affiliation Disclaimer',
      body: [
        'WEST MUN is an autonomous, non-profit academic simulation organized solely for educational and leadership development purposes.',
        'WEST MUN is NOT an official agency, subsidiary, or affiliate of the United Nations (UN), nor is it sponsored, authorized, or endorsed by the United Nations or any international governmental entity.',
        'The names, acronyms, emblems, flags, and procedural structures of the United Nations, its organs (such as the General Assembly, Security Council, or specialized agencies), and sovereign member states are simulated strictly within the boundaries of diplomatic role-playing, academic education, and customary international fair use. All intellectual property in official UN symbols remains the property of the United Nations.',
      ],
    },
    {
      heading: '3. Eligibility and Minor Safeguarding',
      body: [
        'The Conference is primarily open to intermediate school, high school, and undergraduate university students.',
        'Applicants who are under the age of eighteen (18) Gregorian years ("Minors") must obtain verified parental or legal guardian consent before submitting personal information or participating in any conference activity.',
        'By submitting a registration form, the applicant confirms that they are either 18 years of age or older, or that their parent or legal guardian has reviewed and approved their application, agreeing to these Terms and our Privacy Policy on their behalf.',
        'Faculty advisors and institutional delegation heads assume supervisory responsibility for students traveling with or registered under their school delegation.',
      ],
    },
    {
      heading: '4. Registration, Applications, and Seat Allocation',
      body: [
        'Submission of an application does not constitute a guaranteed seat or delegate placement at WEST MUN. All applications are subject to competitive review, committee capacity constraints, and Secretariat approval.',
        'Applicants must submit truthful, accurate, and complete information. Submission of fraudulent records, forged institutional credentials, impersonation, or duplicate applications will result in immediate disqualification and revocation of access.',
        'Country and committee assignments are made at the sole professional discretion of the Executive Secretariat, taking into account academic experience, committee preferences, and institutional diversity. Assignment decisions are final.',
      ],
    },
    {
      heading: '5. Fees, Invoicing, and Refund Policy',
      body: [
        'Conference registration fees, early-bird rates, regular deadlines, and institutional delegation packages are determined by the Secretariat and announced through official channels. Fee structures are marked "TBA" until formally ratified.',
        'This website does NOT process direct credit card, debit card, or electronic banking transactions on-site. Any fee payments will only be conducted through authorized, secure institutional invoice procedures or officially notified bank transfers. Never provide payment card credentials to any individual or unverified contact.',
        'Refund and cancellation policies will be published prior to fee collection. Unless explicitly stated otherwise in writing by the Secretariat, fees once paid are non-refundable after committee matrix allocation has been finalized, except where mandatory consumer protection regulations under the laws of Saudi Arabia provide non-waivable statutory refund rights.',
      ],
    },
    {
      heading: '6. Participant Conduct and Diplomatic Decorum',
      body: [
        'All delegates, chairs, student officers, and faculty advisors must adhere strictly to the WEST MUN Participant Code of Conduct, venue safety regulations, and the orders of the Secretariat.',
        'Harassment, discrimination, cyberbullying, physical altercations, possession of prohibited substances, academic dishonesty (including unauthorized AI-assisted speech plagiarism during caucuses), and vandalism of host facilities are strictly prohibited.',
        'The Secretariat reserves the right to issue formal warnings, suspend speaking rights, or immediately expel any attendee whose behavior undermines the safety, dignity, or integrity of the Conference, without liability or refund.',
      ],
    },
    {
      heading: '7. Acceptable Use of Digital Platforms',
      body: [
        'Users of this website agree not to engage in any activity that impairs, compromises, or attempts to breach the security of the website, its hosting infrastructure, or connected databases.',
        'Specifically prohibited activities under the Saudi Anti-Cyber Crime Law (Royal Decree No. M/17) include:',
        '- Unauthorized attempts to access administrative dashboards, scanner endpoints, or applicant databases;',
        '- Probing, scanning, or vulnerability testing without prior explicit written authorization from the webmaster;',
        '- Deploying automated scraping bots, spiders, or malicious code designed to harvest email addresses or personal records;',
        '- Injecting malicious payloads, SQL injections, Cross-Site Scripting (XSS), or Distributed Denial of Service (DDoS) attacks.',
        'Violations will be logged, access will be permanently blocked, and severe infractions will be referred to relevant authorities.',
      ],
    },
    {
      heading: '8. Postponement, Cancellation, and Force Majeure',
      body: [
        'The Secretariat reserves the right to reschedule, alter the format of (e.g., transition to virtual sessions), or cancel the Conference in the event of circumstances beyond our reasonable control ("Force Majeure").',
        'Force Majeure events include, without limitation: acts of God, public health emergencies or directives issued by the Ministry of Health or Ministry of Education, severe adverse weather, municipal venue closures, utility failures, or civil disruptions.',
        'In such events, WEST MUN will endeavor to provide alternative educational arrangements or reschedule sessions. WEST MUN shall not be liable for incidental, travel, or accommodation costs incurred by participants.',
      ],
    },
    {
      heading: '9. Limitation of Liability',
      body: [
        'The website and conference resources are provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied.',
        'To the maximum extent permitted by the laws of the Kingdom of Saudi Arabia, WEST MUN, its Secretariat, organizers, advisors, and volunteers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or reputation.',
        'Nothing in these Terms shall limit or exclude any liability that cannot be lawfully limited or excluded under applicable Saudi Arabian law, including liability for fraud, willful misconduct, gross negligence, or bodily injury directly resulting from proven negligence.',
      ],
    },
    {
      heading: '10. Governing Law and Dispute Resolution',
      body: [
        `These Terms and any non-contractual obligations arising out of or in connection with them shall be governed by and construed in accordance with the laws and regulations of ${v.country}.`,
        'Any dispute, controversy, or claim arising between a participant and WEST MUN shall first be submitted in writing to the Secretariat for good-faith amicable resolution.',
        `If a dispute cannot be amicably resolved within thirty (30) business days, it shall be submitted to the exclusive jurisdiction of the competent courts of Riyadh, ${v.country}, without prejudice to mandatory statutory rights under consumer protection legislation.`,
      ],
    },
    {
      heading: '11. Amendments and Inquiries',
      body: [
        `We reserve the right to amend these Terms periodically. The version currently in effect is Version ${v.version}. Continued engagement with WEST MUN following any published updates signifies acceptance of the amended terms.`,
        `For formal questions, notices, or inquiries regarding these Terms, contact us ${v.contact}.`,
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 2. PRIVACY POLICY (SAUDI PDPL COMPLIANT)
// ---------------------------------------------------------------------------
export function privacySections(settings: Settings): LegalSection[] {
  const v = vars(settings);
  return [
    {
      heading: '1. Regulatory Commitment and Data Controller',
      body: [
        `This Privacy Policy explains how ${v.org} ("WEST MUN", "we", "us") collects, processes, stores, and protects personal data in compliance with the Personal Data Protection Law of the Kingdom of Saudi Arabia (promulgated by Royal Decree No. M/19, as amended by Royal Decree No. M/148, the "PDPL") and its Implementing Regulations.`,
        `WEST MUN acts as the Data Controller with respect to all personal information collected through west-mun.vercel.app and affiliated registration portals. Questions regarding our data processing should be directed to the Secretariat ${v.contact}.`,
      ],
    },
    {
      heading: '2. Categories of Personal Data Collected',
      body: [
        'We adhere to the principle of data minimization and only collect information strictly necessary for conference administration and delegate safety:',
        '- Delegate & Head Delegate Applications: Full legal name, preferred name, email address, phone number (with country code), academic institution or school name, grade/academic level, MUN experience level, committee preferences, and language proficiency.',
        '- Minor Safeguarding & Consent Records: Confirmation of age (whether 18+ or under 18), verified parent/guardian consent confirmation, and emergency guardian contact details when requested.',
        '- Executive Board & Team Applicants: Curriculum vitae / resume, written motivation, portfolio links, departmental preferences, and photograph for accreditation badges.',
        '- Inquiries & Communications: Name, email address, subject line, message contents, and correspondence records.',
        '- Digital & Security Data: Secure QR check-in logs, timestamp of registration submission, IP address, device browser headers (for anti-abuse rate-limiting), and authentication session tokens for authorized staff.',
        'We do NOT collect national identity card numbers (Iqama/National ID), payment card numbers, bank account numbers, or biometric data on this public website.',
      ],
    },
    {
      heading: '3. Legal Grounds and Purposes for Processing',
      body: [
        'In accordance with Article 5 and Article 6 of the Saudi PDPL, personal data is processed pursuant to the following lawful bases:',
        '- Consent: You (or your legal guardian, if you are a minor) explicitly provide consent when checking the mandatory consent boxes upon submitting registration or application forms.',
        '- Performance of Contract / Educational Operations: Processing is necessary to evaluate applications, assign committee matrix seats, issue personalized delegate passes, and communicate schedules.',
        '- Legitimate Interests & Safety: Preserving event security, preventing automated bot abuse, coordinating emergency medical response if needed at the venue, and authenticating access credentials.',
        '- Legal Compliance: Maintaining auditable records in accordance with applicable Saudi laws and administrative directives.',
      ],
    },
    {
      heading: '4. Processing of Minor and Student Data',
      body: [
        'Under Article 12 of the PDPL Implementing Regulations, processing the personal data of a minor (under the age of 18) requires the explicit consent of their legal guardian.',
        'Applicants under 18 must have their parent, guardian, or officially appointed school faculty advisor review this Privacy Policy and approve the registration.',
        'We implement age-verification checkpoints during registration. Any personal data inadvertently collected from an unaccompanied minor without proper guardian authorization will be deleted immediately upon notification to the Secretariat.',
      ],
    },
    {
      heading: '5. Access Hierarchy and Confidentiality',
      body: [
        'Personal information is strictly partitioned and accessible solely on a need-to-know basis:',
        '- Secretariat & Administrators: Full administrative access to review registrations, assign committees, communicate official notices, and manage event logistics.',
        '- Department Heads: Restricted access limited solely to applicants who applied to their specific department (e.g., Media, Logistics, PR, Human Resources).',
        '- Security & Door Scanners: Access through the dedicated scanner portal is restricted to validating QR token authenticity, verification of badge status, and check-in confirmation. Scanners cannot export or modify delegate personal profiles.',
        '- Committee Chairs: Provided solely with committee rosters (delegate names, allocated nations, and institutional affiliations) required to moderate debate. Private contact information is not shared with committee chairs.',
      ],
    },
    {
      heading: '6. Third-Party Service Providers and Cross-Border Transfers',
      body: [
        'WEST MUN does not sell, rent, license, or commercialize your personal information to third parties or marketing brokers under any circumstances.',
        'To host and operate our digital infrastructure, data is processed by trusted, enterprise-grade cloud service providers:',
        '- Database & Cloud Storage: Supabase Inc. (PostgreSQL database with Row-Level Security, tokenized authentication, and encrypted data storage).',
        '- Application Hosting: Vercel Inc. (Global edge network, TLS 1.3 encryption, DDoS mitigation).',
        '- Cross-Border Transfer Disclosure: Pursuant to the PDPL Regulations on Personal Data Transfer Outside the Kingdom, cloud server infrastructure may reside in secure regions outside Saudi Arabia (e.g., European Union or United States). Such transfers are protected by standard contractual clauses, encryption in transit (HTTPS/TLS) and at rest (AES-256), and restricted administrative credentials.',
      ],
    },
    {
      heading: '7. Data Retention and Destruction',
      body: [
        'We retain personal information only for the duration required to fulfill the conference purposes for which it was originally collected.',
        'Registration profiles and contact inquiries are maintained through the conclusion of the WEST MUN 2027 conference cycle and follow-up delegate certification, and are securely purged within twelve (12) months following conference adjournment.',
        'When data reaches the end of its retention window or upon a valid deletion request from the data subject, electronic records are irrevocably sanitized or shredded from our production databases.',
      ],
    },
    {
      heading: '8. Technical and Organizational Security Measures',
      body: [
        'We maintain robust technical safeguards to protect personal data against unauthorized disclosure, alteration, loss, or access:',
        '- Row-Level Security (RLS) policies implemented at the database layer to prevent unauthorized cross-tenant queries;',
        '- Strict segregation between public anon API keys and server-side service keys;',
        '- Rate-limiting triggers on submission forms to deter brute-force and credential stuffing;',
        '- Cryptographically signed, single-use QR access passes to prevent credential cloning;',
        '- End-to-end transport layer security (TLS) for all network traffic.',
      ],
    },
    {
      heading: '9. Your Rights Under the Saudi PDPL',
      body: [
        'Under Chapter 4 of the Saudi PDPL, data subjects enjoy comprehensive statutory rights regarding their personal data:',
        '- Right to be Informed: The right to know the legal basis, purpose, and categories of data collected (as set forth herein);',
        '- Right of Access: The right to request access to and receive a copy of your personal data held by us;',
        '- Right to Rectification: The right to request correction, completion, or updating of inaccurate or outdated data;',
        '- Right to Destruction (Erasure): The right to request the deletion or destruction of your personal data when no longer needed;',
        '- Right to Withdraw Consent: The right to withdraw consent at any time, without affecting lawful processing carried out prior to withdrawal;',
        '- Right to Lodge a Regulatory Complaint: If you believe your data has been handled contrary to the PDPL, you have the right to submit a complaint to the competent supervisory authority: the Saudi Data and Artificial Intelligence Authority (SDAIA - sdaia.gov.sa).',
        `To exercise any of these rights, contact the Secretariat ${v.contact}. Requests are processed free of charge within thirty (30) days of identity verification.`,
      ],
    },
    {
      heading: '10. Cookies and Local Storage',
      body: [
        'The public WEST MUN website does NOT use third-party marketing cookies, behavioral trackers, or advertising pixels.',
        'We utilize ephemeral browser session storage solely for essential operational functionality (e.g., remembering that the cinematic intro animation has played during your browsing session).',
        'Staff members who authenticate to the administrative portal utilize secure session tokens stored locally to preserve authorized session state.',
      ],
    },
    {
      heading: '11. Policy Modifications and Contact',
      body: [
        `We may update this Privacy Policy from time to time to reflect evolving regulatory guidance from SDAIA or operational changes. The effective version is Version ${v.version}.`,
        `For all data privacy inquiries, requests to exercise statutory rights, or safeguarding questions, please reach out to the Secretariat ${v.contact}.`,
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 3. COPYRIGHT & INTELLECTUAL PROPERTY NOTICE
// ---------------------------------------------------------------------------
export function copyrightSections(settings: Settings): LegalSection[] {
  const v = vars(settings);
  return [
    {
      heading: '1. Intellectual Property Framework',
      body: [
        `All content published on the WEST MUN website (west-mun.vercel.app)—including website design, bespoke layouts, written copy, committee descriptions, background guides, graphics, digital artwork, and conference publications—is protected under the Saudi Copyright Law (Royal Decree No. M/41) and international intellectual property conventions.`,
        `Unless otherwise attributed, all creative works and organizational marks are the exclusive property of ${v.org} or its licensed contributors. All rights reserved.`,
      ],
    },
    {
      heading: '2. WEST MUN Trademarks and Branding',
      body: [
        'The name "WEST MUN", "Western Model United Nations", the conference acronyms, and the distinctive circular black-and-gold emblem are proprietary marks of the WEST MUN Secretariat.',
        'You may not copy, replicate, alter, display, distribute, or incorporate these marks into any commercial or non-commercial venture without prior written authorization from the Secretariat.',
        'Authorized delegates and institutional delegations are permitted to reference the WEST MUN name solely for factual, academic, and non-commercial attribution in delegate biographies, research position papers, and educational resumes.',
      ],
    },
    {
      heading: '3. Asset Register and Licensing Disclosures',
      body: [
        'In commitment to rigorous copyright compliance, WEST MUN maintains the following verified asset register:',
        '- Official Conference Emblem: Proprietary digital insignia designed specifically for WEST MUN (/westmun-logo.jpg).',
        '- Secretariat Photography: Official portraits of the Executive Secretariat (Rakan Almerbad, Yousef Saifi, Ibrahim Khan) are used with explicit authorization and personal consent of each respective member.',
        '- Typography & Web Fonts: Cinzel, Cormorant Garamond, and Plus Jakarta Sans are licensed under the SIL Open Font License 1.1 (OFL). Fonts are self-hosted and bundled locally; no external third-party font calls are made.',
        '- Software Framework & Code: Built upon open-source software libraries under permissive MIT and ISC licenses (React, Vite, Tailwind CSS, Motion, Lucide Icons, Three.js).',
        '- Background Video & Cinematic Media: Conference assembly footage (/background.mp4, /background_mobile.mp4) is utilized in an academic, transformative, and non-commercial educational simulation context.',
      ],
    },
    {
      heading: '4. United Nations and Sovereign State Emblems',
      body: [
        'WEST MUN is an independent educational simulation. The United Nations emblem, committee acronyms (such as UNSC, UNHRC, DISEC, WHO), and national flags displayed on this website or in conference materials are reproduced strictly for academic educational simulation and historical accuracy.',
        'Display of these emblems does not imply official endorsement, partnership, sponsorship, or certification by the United Nations, its specialized agencies, or any sovereign government.',
      ],
    },
    {
      heading: '5. Permitted Academic Use and Restrictions',
      body: [
        'Delegates, faculty advisors, and educational researchers are granted a limited, revocable, non-exclusive license to view, download, and print background guides, study guides, and committee agendas solely for individual delegate preparation.',
        'You may NOT:',
        '- Republish, resell, or redistribute conference materials for commercial tutoring or third-party conferences;',
        '- Scrape or extract text, code, or images for automated training of public machine learning models without express consent;',
        '- Remove or obscure any copyright notices, watermarks, or author credits from conference publications.',
      ],
    },
    {
      heading: '6. Notice and Takedown Procedure',
      body: [
        'WEST MUN respects the intellectual property rights of all copyright holders. If you are a copyright owner or an authorized agent and believe that any material available on this website infringes your rights, please submit a formal notification.',
        'Your notice should include: identification of the copyrighted work claimed to be infringed, the exact URL or location of the material, proof of ownership or authorization, and your contact details.',
        `Please direct copyright notifications to the Secretariat ${v.contact}. We commit to reviewing verified claims promptly and taking down or modifying infringing content within forty-eight (48) hours.`,
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 4. PHOTOGRAPHY AND MEDIA CONSENT NOTICE
// ---------------------------------------------------------------------------
export function mediaConsentSections(settings: Settings): LegalSection[] {
  const v = vars(settings);
  return [
    {
      heading: '1. Purpose of Media Documentation',
      body: [
        `During the WEST MUN Conference, authorized media teams, photographers, and videographers document committee proceedings, keynote speeches, opening and closing ceremonies, and informal delegate interactions.`,
        'Media documentation serves legitimate educational, archival, and commemorative purposes: to celebrate delegate diplomacy, preserve institutional history, and showcase the educational value of WEST MUN on official platforms.',
      ],
    },
    {
      heading: '2. Official Channels and Non-Commercial Use',
      body: [
        `Official photographs and video clips may be published across verified WEST MUN communication channels, including:`,
        '- The official conference website (west-mun.vercel.app);',
        '- The official WEST MUN Instagram account (@westmun_27);',
        '- Delegate digital yearbooks, recap reels, and post-conference educational reports.',
        'All media created by WEST MUN is used strictly for non-commercial, educational, and reporting purposes. We never sell or license delegate imagery to commercial advertising agencies.',
      ],
    },
    {
      heading: '3. Minor Safeguarding and Parental Consent',
      body: [
        'Recognizing that many of our delegates are intermediate or secondary school students under 18 years of age, student safeguarding is our highest priority.',
        'Parents and legal guardians of minor delegates provide consent for official media coverage upon approving the delegate’s conference registration.',
        'Our media team is trained to adhere to strict child safeguarding standards: delegates are depicted respectfully in formal diplomatic attire, without compromising captions, personal contact numbers, or home addresses.',
      ],
    },
    {
      heading: '4. Right to Opt-Out and Non-Photo Preferences',
      body: [
        'We respect the personal privacy and religious, cultural, or safeguarding preferences of every attendee.',
        'Any delegate, faculty advisor, or parent who prefers that the participant NOT appear in published photographs or video materials may opt out via the following procedures:',
        '- Advance Written Notice: Notify the Secretariat in writing at least 7 days prior to conference commencement;',
        '- On-Site Lanyard Identifier: Request a designated discreet non-photo badge or lanyard upon registration check-in at the host venue;',
        '- Post-Event Takedown: If a photograph or video featuring you or your child is published on our website or social media and you wish it removed, simply contact us with the link, and we will blur or take down the imagery within 48 hours.',
      ],
    },
    {
      heading: '5. Attendee Photography and Privacy Boundaries',
      body: [
        'Attendees are permitted to capture informal photographs and short video clips during unmoderated caucuses and social intervals, provided fellow participants consent to being recorded.',
        'Strictly Prohibited: Photography, audio recording, or video capture in private spaces, restrooms, designated prayer rooms, or during confidential executive caucus sessions is strictly prohibited and constitutes grounds for immediate expulsion.',
      ],
    },
    {
      heading: '6. Contact for Media Inquiries',
      body: [
        `To submit a media opt-out request, report an unauthorized recording, or request the removal of published media, contact the Media & Communications Department ${v.contact}.`,
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 5. PARTICIPANT CODE OF CONDUCT & SAFEGUARDING POLICY
// ---------------------------------------------------------------------------
export function codeOfConductSections(settings: Settings): LegalSection[] {
  const v = vars(settings);
  return [
    {
      heading: '1. Core Values and Diplomatic Excellence',
      body: [
        `WEST MUN is dedicated to providing an inclusive, academically rigorous, and secure conference environment founded on the principles of mutual respect, intellectual integrity, and diplomatic decorum.`,
        'This Code of Conduct applies to all participants, including delegates, chairs, student officers, Secretariat members, volunteer staff, and visiting faculty advisors, across all physical venue areas and affiliated digital communications.',
      ],
    },
    {
      heading: '2. Parliamentary Decorum and Debate Standards',
      body: [
        'Delegates must conduct themselves in a manner befitting representatives of sovereign nations and international organizations:',
        '- Maintain diplomatic courtesy, respectful language, and constructive parliamentary engagement at all times;',
        '- Address fellow delegates through formal committee protocol and the direction of the dais;',
        '- Arrive punctually for all scheduled committee sessions and remain in attendance for the full duration of debate;',
        '- Adhere to the conference dress code (Western Business Attire or formal national diplomatic dress).',
      ],
    },
    {
      heading: '3. Academic Integrity and Originality',
      body: [
        'All speeches, working papers, draft resolutions, and position papers must represent the original work and research of the submitting delegate or delegation co-sponsors.',
        'Plagiarism, unauthorized pre-written resolutions drafted prior to conference commencement ("pre-writing"), or the uncredited use of artificial intelligence generators to draft live resolutions during committee sessions is strictly prohibited.',
        'Violations will result in the immediate disqualification of submitted working papers and potential forfeiture of conference awards.',
      ],
    },
    {
      heading: '4. Zero Tolerance for Harassment and Discrimination',
      body: [
        'WEST MUN strictly prohibits any form of harassment, intimidation, bullying, hate speech, or discrimination based on race, nationality, religious faith, ethnicity, gender, disability, or socioeconomic background.',
        'Prohibited conduct includes, without limitation:',
        '- Derogatory verbal remarks, slurs, or culturally offensive gestures;',
        '- Unwelcome physical contact, advances, or sexual harassment in any form;',
        '- Doxxing, cyberbullying, or online intimidation via WhatsApp caucus groups or social networks;',
        '- Defamation or targeted character attacks against fellow delegates or staff members.',
      ],
    },
    {
      heading: '5. Student Safeguarding and Protection of Minors',
      body: [
        'As a student conference engaging minors, WEST MUN implements comprehensive safeguarding procedures:',
        '- Safe Environment: All sessions and caucus rooms are conducted in open, supervised environments with adult or Secretariat chaperones present.',
        '- Health & Emergencies: In the event of medical illness or physical distress, designated first-aid responders and venue safety officers are activated immediately, and emergency contacts are notified.',
        '- Separation of Spaces: Venue access is controlled via verified, cryptographically signed QR badges to ensure unauthorized members of the public cannot enter committee rooms.',
      ],
    },
    {
      heading: '6. Incident Reporting and Whistleblower Protection',
      body: [
        'Any participant who experiences, observes, or suspects a violation of this Code of Conduct or feels that their personal safety is compromised is urged to report the matter immediately.',
        'Reporting Channels:',
        '- In-Person: Approach any Secretariat member, Dais Director, or Department Head at the venue information desk;',
        `- Digital / Written: Submit an urgent report ${v.contact} with the subject line "URGENT: Safeguarding / Conduct Concern".`,
        'All reports will be treated with the highest degree of confidentiality, impartiality, and discretion. Retaliation against any individual reporting a violation is strictly prohibited and will be met with immediate expulsion.',
      ],
    },
    {
      heading: '7. Disciplinary Measures and Sanctions',
      body: [
        'The Executive Secretariat reserves full authority to investigate alleged infractions and enforce appropriate sanctions based on the severity of the violation:',
        '- Formal verbal or written reprimand from the Secretary-General;',
        '- Suspension of speaking rights or removal from committee proceedings for a designated duration;',
        '- Immediate expulsion from the Conference, revocation of delegate credentials, and barring from future WEST MUN events;',
        '- Notification to the delegate’s school administration, faculty advisors, and parents/guardians;',
        '- Referral to law enforcement authorities in cases involving criminal conduct, physical assault, or severe cybercrimes.',
      ],
    },
  ];
}

/** Admin-supplied replacement text: "## Heading" lines, blank-line separated paragraphs, "- " bullets. */
export function parseOverride(text: string): LegalSection[] {
  const sections: LegalSection[] = [];
  let current: LegalSection | null = null;
  for (const block of text.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const b = block.trim();
    if (!b) continue;
    if (b.startsWith('## ')) {
      const [first, ...rest] = b.split('\n');
      current = { heading: first.slice(3).trim(), body: [] };
      sections.push(current);
      if (rest.length) current.body.push(...rest.map((l) => l.trim()).filter(Boolean));
      continue;
    }
    if (!current) {
      current = { heading: '', body: [] };
      sections.push(current);
    }
    current.body.push(
      ...b
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .reduce<string[]>((acc, l) => {
          if (l.startsWith('- ') || acc.length === 0 || acc[acc.length - 1].startsWith('- ')) acc.push(l);
          else acc[acc.length - 1] += ' ' + l;
          return acc;
        }, []),
    );
  }
  return sections;
}
