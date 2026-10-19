import React from 'react';
import { usePublicTable, type SponsorRow } from '../lib/content';
import { safeUrl } from '../lib/safe';

/** Hidden until the first sponsor is added in the admin panel. */
export const SponsorsSection: React.FC = React.memo(() => {
  const sponsors = usePublicTable<SponsorRow>('sponsors', []);
  if (sponsors.length === 0) return null;

  return (
    <section id="sponsors" className="relative z-20 py-20 sm:py-24 bg-[#0a0a0c] text-white border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-8 h-[1px] bg-[#d4af37]" />
          <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">Partners</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif text-white tracking-tight mb-10" style={{ fontFamily: 'var(--font-heading)' }}>
          Sponsors & <span className="gold-gradient-text">Partners</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sponsors.map((sp) => {
            const logo = safeUrl(sp.logo_url);
            const href = safeUrl(sp.website_url);
            const inner = (
              <div className="h-full p-5 bg-[#0e0e11] border border-neutral-800/90 hover:border-[#d4af37]/50 rounded-sm transition-colors flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
                {logo ? (
                  <img src={logo} alt={sp.name} loading="lazy" referrerPolicy="no-referrer" className="max-h-16 w-auto object-contain" />
                ) : (
                  <span className="text-sm font-serif text-white">{sp.name}</span>
                )}
                {sp.tier && <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]">{sp.tier}</span>}
                {sp.description && <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">{sp.description}</p>}
              </div>
            );
            return href ? (
              <a key={sp.id} href={href} target="_blank" rel="noopener noreferrer" aria-label={sp.name}>{inner}</a>
            ) : (
              <div key={sp.id}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
SponsorsSection.displayName = 'SponsorsSection';
