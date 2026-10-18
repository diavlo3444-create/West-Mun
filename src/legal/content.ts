// Default Terms of Service and Privacy Policy text.
//
// IMPORTANT: this is a plain-language starting draft, NOT legal advice.
// Have a lawyer in the place where the conference is held review it before
// the site collects real registrations. Once reviewed, paste the final text
// into Admin > Settings > "Terms text" / "Privacy text" (no redeploy needed),
// and change "Legal version" so each consent record points at the right text.
import type { Settings } from '../lib/content';

export interface LegalSection {
  heading: string;
  /** Paragraphs. A line starting with "- " is a bullet. */
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
    org: s.organizer_name?.trim() || 'the WEST MUN organising team',
    contact: email ? `by email at ${email} or through the contact form on this website` : 'through the contact form on this website',
    country: s.legal_country?.trim() || '',
    version: s.legal_version?.trim() || '',
  };
}

export function termsSections(settings: Settings): LegalSection[] {
  const v = vars(settings);
  const law = v.country
    ? `These Terms are governed by the laws of ${v.country}, and the courts of ${v.country} have jurisdiction over any dispute, except where mandatory consumer-protection law where you live gives you rights that cannot be limited by contract.`
    : 'These Terms are governed by the laws of the country in which the organisers are based, except where mandatory consumer-protection law where you live gives you rights that cannot be limited by contract.';
  return [
    {
      heading: '1. About these Terms',
      body: [
        `These Terms of Service ("Terms") apply to your use of the WEST MUN website and to registering for the WEST MUN conference (the "Conference"). The website and the Conference are run by ${v.org} ("we", "us").`,
        'By using the website, sending a message or submitting a registration you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the website or register.',
      ],
    },
    {
      heading: '2. Independent event',
      body: ['WEST MUN is an independent Model United Nations conference simulation. It is not affiliated with, endorsed by, or sponsored by the United Nations. Names, flags and symbols of the United Nations, countries and other organisations are used only to simulate diplomatic bodies for educational purposes and belong to their owners.'],
    },
    {
      heading: '3. Who can register',
      body: [
        'The Conference is intended for high school and university students.',
        'If you are under 18 you may register only with the permission of your parent or legal guardian, or of your school. When you register you confirm that you are 18 or older, or that you have this permission, including permission for us to handle your details as described in the Privacy Policy.',
      ],
    },
    {
      heading: '4. Registration and acceptance',
      body: [
        'Submitting the registration form is an application. It is not a guarantee of a place. After you apply your status is "received". We may later accept, waitlist or decline an application, and we will contact you at the email address you gave.',
        'You must give accurate information. Each email address may register once per registration tier. We may cancel or refuse a registration that contains false information, duplicates another registration, or breaks these Terms.',
        'Delegate placement (committee and country) is decided by the Secretariat.',
      ],
    },
    {
      heading: '5. Fees and payments',
      body: [
        'Registration fees, deadlines, payment methods and refund or cancellation rules are published by the organisers on this website or sent to you before any payment is due, and form part of your registration.',
        'This website does not take payments and does not ask for card or bank details. Never send payment card or bank details through the contact form or by email to anyone claiming to represent us unless the organisers have published that channel on this website.',
        'Payment status shown to you reflects the organisers\' own records.',
      ],
    },
    {
      heading: '6. Conduct at the Conference',
      body: [
        'Delegates must follow the Rules of Procedure, any code of conduct or dress code published by the Secretariat, venue rules, and the reasonable instructions of the Secretariat and committee chairs.',
        'We do not tolerate harassment, discrimination, bullying, threats, cheating, impersonation or damage to property. We may warn, remove or disqualify a delegate who breaks these rules, and any refund will follow the refund rules mentioned in section 5.',
      ],
    },
    {
      heading: '7. Photos and recordings',
      body: ['We may take photographs or video at the Conference and publish them to document the event. We will tell attendees at the event when this happens. If you do not want to appear in published material, or want something removed, contact us and we will take reasonable steps to remove it.'],
    },
    {
      heading: '8. Using the website',
      body: [
        'You agree not to:',
        '- attack, overload, probe or try to break into the website, its database or its administration area;',
        '- submit spam, malicious content, or another person\'s private information through our forms;',
        '- use automated tools to collect personal data from the website.',
        'We may block access to anyone who does.',
      ],
    },
    {
      heading: '9. Our content',
      body: ['The website\'s text, design, logo, images and documents belong to the organisers or their licensors. You may view the website and share links to it. You may not copy or republish our content, or the WEST MUN name and logo, without our written permission. Background guides and other documents are for your personal preparation for the Conference.'],
    },
    {
      heading: '10. What you send us',
      body: ['You are responsible for what you submit. We use what you send only as described in the Privacy Policy, for example to answer your message or to run your registration.'],
    },
    {
      heading: '11. Information may change',
      body: ['Dates, venue, committees, schedules, fees and other details on the website are marked "TBA" until confirmed and may change. Information on the website is general information, not an offer or a promise that the Conference will take place as described.'],
    },
    {
      heading: '12. Other websites',
      body: ['The website may link to other sites, such as Instagram. We do not control them and are not responsible for their content or privacy practices.'],
    },
    {
      heading: '13. No warranty and limits on liability',
      body: [
        'The website is provided "as is". We try to keep it accurate and available but do not promise it will be error-free or uninterrupted.',
        'To the fullest extent the law allows, we are not liable for indirect or consequential losses, or for loss of data, profit or opportunity, arising from your use of the website or from changes to or cancellation of the Conference, and our total liability to you in connection with the website and your registration is limited to the amount you paid us, if any.',
        'Nothing in these Terms limits liability that cannot be limited by law, including liability for fraud, or for death or personal injury caused by negligence.',
      ],
    },
    {
      heading: '14. Changes to these Terms',
      body: [`We may update these Terms. The current version is dated ${v.version || 'shown above'}. Continuing to use the website after an update means you accept the new Terms. Your registration is governed by the version you agreed to when you registered unless the law requires otherwise.`],
    },
    {
      heading: '15. Governing law',
      body: [law],
    },
    {
      heading: '16. Contact',
      body: [`Questions about these Terms? Contact us ${v.contact}.`],
    },
  ];
}

export function privacySections(settings: Settings): LegalSection[] {
  const v = vars(settings);
  return [
    {
      heading: '1. Who we are',
      body: [`${v.org} runs the WEST MUN website and conference and decides how your personal data is used (the "controller"). Contact us ${v.contact}.`],
    },
    {
      heading: '2. What we collect',
      body: [
        'When you register as a delegate:',
        '- full name, email address, school or organisation;',
        '- the registration tier and whether you register alone or as a school delegation;',
        '- your confirmation that you are 18+ or have permission, and a record of the Terms/Privacy version you agreed to and when;',
        '- our own records about your application: status, payment status, fee, and internal notes.',
        'When you send a message through the contact form: your name, email address, subject and message.',
        'Automatically: our hosting and database providers process technical data such as your IP address and browser details to deliver the website and keep it secure.',
        'We do not ask for payment card details, government ID numbers, or sensitive categories of data. Please do not include them in messages.',
      ],
    },
    {
      heading: '3. Why we use it',
      body: [
        '- To run the Conference: review and answer applications, tell you the result, allocate committees, plan logistics and keep payment records (needed to carry out your registration).',
        '- To reply to your messages.',
        '- To keep the website secure and prevent spam and abuse (our legitimate interest).',
        '- To meet legal obligations, where they apply.',
        'Where the law requires your consent, we rely on the consent you give by ticking the box on our forms. You can withdraw it at any time.',
        'We do not sell your data, and we do not use it for advertising.',
      ],
    },
    {
      heading: '4. Cookies and tracking',
      body: ['We do not use advertising or analytics cookies or trackers. The website stores one small item in your browser\'s session storage to remember that you have seen the intro animation; it is removed when you close the tab. Event organisers who log in to the administration area also have a login session stored in their browser. The website\'s fonts are served from our own website, not from a third party.'],
    },
    {
      heading: '5. Who can see your data',
      body: [
        '- The organising team (only logged-in organisers can read applications and messages).',
        '- Service providers that run the website for us: our database and file-storage provider (Supabase) and our web host. They process data on our behalf and may store it on servers in other countries.',
        '- Authorities, if the law requires us to share it.',
        'Committee chairs and the Secretariat may receive the details of accepted delegates they need to run committees.',
      ],
    },
    {
      heading: '6. International transfers',
      body: ['Our providers may process data outside your country, including in the United States or the European Union. We choose providers that protect data with appropriate safeguards such as encryption in transit and access controls.'],
    },
    {
      heading: '7. How long we keep it',
      body: ['We keep registration data and messages only as long as needed to run the Conference and handle follow-up questions, and no longer than 12 months after the Conference ends, unless the law requires us to keep something longer. After that it is deleted.'],
    },
    {
      heading: '8. How we protect it',
      body: ['Applications and messages are stored in a database where the public can add a submission but cannot read any. Only authorised organisers who sign in with a personal account can read or change them. Data is encrypted in transit. No system is perfectly secure, so we also limit what we collect.'],
    },
    {
      heading: '9. Your rights',
      body: [
        'Depending on where you live (for example under the EU/UK GDPR or the Saudi PDPL) you may have the right to: know what we hold about you, get a copy, correct it, delete it, restrict or object to its use, withdraw consent, and complain to your data protection authority.',
        `To use any of these rights, contact us ${v.contact} and tell us which email address you used. We may need to confirm it is you.`,
      ],
    },
    {
      heading: '10. Young people',
      body: ['Many delegates are students under 18. Delegates under 18 should register only with the permission of a parent, guardian or school, and the registration form asks you to confirm this. The website is not meant for children under 13. If you believe a child has sent us data without permission, contact us and we will delete it.'],
    },
    {
      heading: '11. Other websites',
      body: ['Links to other websites (such as Instagram) are governed by those sites\' own privacy policies.'],
    },
    {
      heading: '12. Changes',
      body: [`We may update this policy. The current version is dated ${v.version || 'shown above'}. If we change it in a way that matters to you, we will say so on this page.`],
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
    current.body.push(...b.split('\n').map((l) => l.trim()).filter(Boolean).reduce<string[]>((acc, l) => {
      if (l.startsWith('- ') || acc.length === 0 || acc[acc.length - 1].startsWith('- ')) acc.push(l);
      else acc[acc.length - 1] += ' ' + l;
      return acc;
    }, []));
  }
  return sections;
}
