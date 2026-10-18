import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useSettings } from '../lib/content';
import { parseOverride, privacySections, termsSections, type LegalSection } from '../legal/content';

type Kind = 'terms' | 'privacy';

function renderBody(lines: string[]) {
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (bullets.length) {
      out.push(
        <ul key={key} className="list-disc pl-6 space-y-1.5 text-neutral-300">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>,
      );
      bullets = [];
    }
  };
  lines.forEach((line, i) => {
    if (line.startsWith('- ')) bullets.push(line.slice(2));
    else {
      flush(`ul-${i}`);
      out.push(<p key={i} className="text-neutral-300 leading-relaxed">{line}</p>);
    }
  });
  flush('ul-end');
  return out;
}

export const LegalPage: React.FC<{ kind: Kind }> = ({ kind }) => {
  const settings = useSettings();
  const title = kind === 'terms' ? 'Terms of Service' : 'Privacy Policy';
  const override = (kind === 'terms' ? settings.terms_override : settings.privacy_override) || '';
  const sections: LegalSection[] = override.trim()
    ? parseOverride(override)
    : kind === 'terms' ? termsSections(settings) : privacySections(settings);

  useEffect(() => {
    document.title = `${title} — WEST MUN`;
    // the page template points the canonical link at the home page; correct it here
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `https://west-mun.vercel.app/${kind}`);
  }, [title, kind]);

  return (
    <div className="min-h-screen bg-[#070707] text-[#f5f5f5]">
      <header className="border-b border-neutral-900 bg-[#080808]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 text-white no-underline">
            <img src="/westmun-logo.jpg" alt="WEST MUN logo" className="w-9 h-9 rounded-full border border-[#d4af37]/50 object-contain bg-[#141414]" />
            <span className="font-bold tracking-wider text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
              WEST <span className="text-[#d4af37]">MUN</span>
            </span>
          </a>
          <a href="/" className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-[#d4af37] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to website
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-5xl font-normal tracking-tight mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          {title}
        </h1>
        <p className="text-xs font-mono text-neutral-500 mb-10">Version: {settings.legal_version || '—'}</p>

        <div className="space-y-9 text-[15px]">
          {sections.map((sec, i) => (
            <section key={i} className="space-y-3">
              {sec.heading && <h2 className="text-xl font-serif text-[#d4af37]">{sec.heading}</h2>}
              {renderBody(sec.body)}
            </section>
          ))}
        </div>

        <nav className="mt-14 pt-6 border-t border-neutral-900 text-xs text-neutral-500 flex gap-6">
          <a href="/terms" className="hover:text-[#d4af37]">Terms of Service</a>
          <a href="/privacy" className="hover:text-[#d4af37]">Privacy Policy</a>
          <a href="/" className="hover:text-[#d4af37]">Home</a>
        </nav>
      </main>
    </div>
  );
};

export default LegalPage;
