import React, { useEffect } from 'react';
import { ArrowLeft, ShieldAlert, FileText, Lock, Copyright, Camera, Scale } from 'lucide-react';
import { useSettings } from '../lib/content';
import {
  parseOverride,
  privacySections,
  termsSections,
  copyrightSections,
  mediaConsentSections,
  codeOfConductSections,
  type LegalSection,
} from '../legal/content';

export type LegalKind = 'terms' | 'privacy' | 'copyright' | 'media-consent' | 'code-of-conduct';

interface PageMeta {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const META: Record<LegalKind, PageMeta> = {
  terms: {
    title: 'Terms and Conditions',
    subtitle: 'Conference Participation & Website Usage Framework',
    icon: FileText,
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'Saudi PDPL & Personal Data Protection Disclosures',
    icon: Lock,
  },
  copyright: {
    title: 'Copyright & Intellectual Property',
    subtitle: 'Proprietary Marks, Asset Register & Fair Use',
    icon: Copyright,
  },
  'media-consent': {
    title: 'Photography & Media Consent',
    subtitle: 'Conference Documentation, Minor Protection & Opt-Out',
    icon: Camera,
  },
  'code-of-conduct': {
    title: 'Participant Code of Conduct',
    subtitle: 'Diplomatic Decorum, Anti-Harassment & Safeguarding',
    icon: Scale,
  },
};

const NAV_ITEMS: { kind: LegalKind; label: string; href: string }[] = [
  { kind: 'terms', label: 'Terms & Conditions', href: '/terms' },
  { kind: 'privacy', label: 'Privacy Policy', href: '/privacy' },
  { kind: 'copyright', label: 'Copyright & IP', href: '/copyright' },
  { kind: 'media-consent', label: 'Media Consent', href: '/media-consent' },
  { kind: 'code-of-conduct', label: 'Code of Conduct', href: '/code-of-conduct' },
];

function renderBody(lines: string[]) {
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (bullets.length) {
      out.push(
        <ul key={key} className="list-disc pl-6 space-y-2 text-neutral-300">
          {bullets.map((b, i) => (
            <li key={i} className="leading-relaxed">{b}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  lines.forEach((line, i) => {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2));
    } else {
      flush(`ul-${i}`);
      out.push(
        <p key={i} className="text-neutral-300 leading-relaxed font-light">
          {line}
        </p>,
      );
    }
  });
  flush('ul-end');
  return out;
}

export const LegalPage: React.FC<{ kind: LegalKind }> = ({ kind }) => {
  const settings = useSettings();
  const currentMeta = META[kind] || META.terms;

  // Check admin overrides if available, otherwise use defaults
  let sections: LegalSection[];
  if (kind === 'terms' && settings.terms_override?.trim()) {
    sections = parseOverride(settings.terms_override);
  } else if (kind === 'privacy' && settings.privacy_override?.trim()) {
    sections = parseOverride(settings.privacy_override);
  } else if (kind === 'copyright' && settings.copyright_override?.trim()) {
    sections = parseOverride(settings.copyright_override);
  } else if (kind === 'media-consent' && settings.media_override?.trim()) {
    sections = parseOverride(settings.media_override);
  } else if (kind === 'code-of-conduct' && settings.conduct_override?.trim()) {
    sections = parseOverride(settings.conduct_override);
  } else {
    switch (kind) {
      case 'terms':
        sections = termsSections(settings);
        break;
      case 'privacy':
        sections = privacySections(settings);
        break;
      case 'copyright':
        sections = copyrightSections(settings);
        break;
      case 'media-consent':
        sections = mediaConsentSections(settings);
        break;
      case 'code-of-conduct':
        sections = codeOfConductSections(settings);
        break;
    }
  }

  useEffect(() => {
    document.title = `${currentMeta.title} — WEST MUN (Riyadh)`;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', `https://west-mun.vercel.app/${kind}`);
    }
  }, [currentMeta.title, kind]);

  const Icon = currentMeta.icon;

  return (
    <div className="min-h-screen bg-[#070707] text-[#f5f5f5] selection:bg-[#d4af37]/30 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-900 bg-[#080808]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 text-white no-underline group">
            <img
              src="/westmun-logo.jpg"
              alt="WEST MUN logo"
              className="w-9 h-9 rounded-full border border-[#d4af37]/50 object-contain bg-[#141414] transition-transform duration-300 group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-bold tracking-wider text-base sm:text-lg leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                WEST <span className="text-[#d4af37]">MUN</span>
              </span>
              <span className="text-[9px] tracking-widest uppercase text-neutral-400 font-sans">
                Riyadh, Saudi Arabia
              </span>
            </div>
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-[#d4af37] transition-colors py-1.5 px-3 rounded-full border border-neutral-800 hover:border-[#d4af37]/40 bg-neutral-900/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to website
          </a>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-neutral-900/70 bg-[#060607]">
          <div className="max-w-4xl mx-auto px-5 sm:px-8 overflow-x-auto scrollbar-none flex gap-1 sm:gap-2 py-2">
            {NAV_ITEMS.map((item) => {
              const active = item.kind === kind;
              return (
                <a
                  key={item.kind}
                  href={item.href}
                  className={`shrink-0 px-3.5 py-1.5 text-xs font-mono tracking-wider transition-all rounded-md ${
                    active
                      ? 'bg-[#d4af37]/15 text-[#f3e5ab] border border-[#d4af37]/40 font-semibold shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60 border border-transparent'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-16">
        {/* UN Affiliation Disclaimer Callout Banner */}
        <div className="mb-10 p-4 sm:p-5 rounded-lg border border-[#d4af37]/30 bg-[#0e0e11] flex items-start gap-3.5 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
          <div className="text-xs text-neutral-300 leading-relaxed space-y-1">
            <p className="font-semibold text-white tracking-wide">
              Official United Nations Affiliation Disclaimer
            </p>
            <p className="text-neutral-400 font-light">
              WEST MUN (Western Model United Nations) is an independent, student-organized academic simulation conducted in Riyadh, Kingdom of Saudi Arabia. WEST MUN is not affiliated with, authorized, maintained, sponsored, or endorsed by the United Nations or any of its specialized agencies. All names, emblems, and procedural models are used strictly for diplomatic simulation and educational leadership training.
            </p>
          </div>
        </div>

        {/* Page Title & Header */}
        <div className="mb-10 pb-6 border-b border-neutral-900">
          <div className="flex items-center gap-2.5 text-xs font-mono text-[#d4af37] uppercase tracking-widest mb-3">
            <Icon className="w-4 h-4" />
            <span>Official Conference Policy</span>
          </div>
          <h1
            className="text-3xl sm:text-5xl font-normal tracking-tight mb-3 text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {currentMeta.title}
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 font-light max-w-2xl">
            {currentMeta.subtitle}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-500">
            <span>Jurisdiction: Kingdom of Saudi Arabia</span>
            <span>•</span>
            <span>Version: {settings.legal_version || '2027.1 (Riyadh Edition)'}</span>
          </div>
        </div>

        {/* Policy Sections */}
        <div className="space-y-10 text-[15px]">
          {sections.map((sec, i) => (
            <section key={i} className="space-y-3.5 scroll-mt-24">
              {sec.heading && (
                <h2
                  className="text-lg sm:text-xl font-serif text-[#d4af37] tracking-wide border-b border-[#d4af37]/10 pb-2"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {sec.heading}
                </h2>
              )}
              {renderBody(sec.body)}
            </section>
          ))}
        </div>

        {/* Bottom Navigation */}
        <nav className="mt-16 pt-8 border-t border-neutral-900 text-xs text-neutral-400 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.kind}
                href={item.href}
                className={item.kind === kind ? 'text-[#d4af37] font-semibold' : 'hover:text-[#d4af37]'}
              >
                {item.label}
              </a>
            ))}
          </div>
          <a href="/" className="hover:text-[#d4af37] font-mono text-neutral-500">
            ← Return to Homepage
          </a>
        </nav>
      </main>
    </div>
  );
};

export default LegalPage;
