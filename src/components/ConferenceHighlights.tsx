import React from 'react';
import { Mic2, ScrollText, Users, Scale } from 'lucide-react';
import { motion } from 'motion/react';
import { useInView } from '../hooks/useInView';
import { useCmsContent } from '../lib/cmsContent';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Scale,
  ScrollText,
  Mic2,
  Users,
};

export const ConferenceHighlights: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>();
  const { t, highlightItems } = useCmsContent();

  const eyebrow = t('highlights_eyebrow', 'Core Academic Disciplines');
  const title = t('highlights_title', 'Conference Highlights');
  const description = t(
    'highlights_description',
    'Model United Nations provides hands-on mastery of diplomacy, speechwriting, geopolitical strategy, and international dispute resolution.',
  );

  return (
    <section id="highlights" ref={ref} className="section-content-visibility relative z-20 py-24 bg-[#0a0a0c] text-white border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-[1px] bg-[#d4af37]" />
              <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
                {eyebrow}
              </span>
            </div>
            <h2
              className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {title}
            </h2>
          </div>
          <p className="text-neutral-400 text-sm max-w-md font-light">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {highlightItems.map((item, idx) => {
            const Icon = (item.icon && ICON_MAP[item.icon]) || Scale;
            return (
              <motion.div
                key={item.id || item.title}
                initial={{ opacity: 0, y: 18 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="group p-8 bg-[#0e0e11] border border-neutral-800/80 hover:border-[#d4af37]/50 transition-colors duration-300 rounded-sm relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-sm bg-[#17171c] border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37] group-hover:scale-105 group-hover:border-[#d4af37]/60 transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono text-neutral-500">
                    0{idx + 1}
                  </span>
                </div>

                <h3 className="text-xl font-serif text-white mb-3 group-hover:text-[#f3e5ab] transition-colors">
                  {item.title}
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed mb-6 font-light">
                  {item.description}
                </p>

                <div className="pt-4 border-t border-neutral-800/70 text-[11px] uppercase tracking-wider text-[#d4af37] font-sans">
                  {item.metrics}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Website inquiry CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 relative overflow-hidden border border-[#d4af37]/30 bg-[#0d0d0f] px-6 py-12 sm:px-10 sm:py-14 text-center rounded-sm"
        >
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.10),transparent_65%)]" />
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.28em] text-[#d4af37] font-semibold mb-4">
              Have a vision of your own?
            </p>
            <h3
              className="text-2xl sm:text-4xl font-serif text-white mb-7"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Want a website like this?
            </h3>
            <a
              href="https://wa.me/966558792450?text=Hi%20Mohammed%2C%20I%27m%20interested%20in%20getting%20a%20website%20like%20WEST%20MUN."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 px-7 py-3.5 border border-[#d4af37] bg-[#d4af37] text-black text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] hover:bg-transparent hover:text-[#d4af37] transition-all duration-300"
            >
              Contact Mohammed Magdi
              <span aria-hidden="true" className="text-base">↗</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
});
ConferenceHighlights.displayName = 'ConferenceHighlights';

