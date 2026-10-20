import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Star, Shield, Award, CheckCircle2 } from 'lucide-react';
import { useInView } from '../hooks/useInView';
import type { CmsCustomSection } from '../lib/cmsRegistry';

interface CustomSectionsRendererProps {
  sections: CmsCustomSection[];
}

export const CustomSectionsRenderer: React.FC<CustomSectionsRendererProps> = ({ sections }) => {
  if (!sections || sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => (
        <CustomSectionBlock key={section.id} section={section} />
      ))}
    </>
  );
};

const CustomSectionBlock: React.FC<{ section: CmsCustomSection }> = ({ section }) => {
  const { ref, isInView } = useInView<HTMLElement>();

  return (
    <section
      id={section.id}
      ref={ref}
      className="section-content-visibility relative z-20 py-20 sm:py-28 bg-[#08080a] text-white border-t border-neutral-900"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-3xl mb-12 sm:mb-16"
        >
          {section.eyebrow && (
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-[1px] bg-[#d4af37]" />
              <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
                {section.eyebrow}
              </span>
            </div>
          )}
          <h2
            className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight leading-tight mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-neutral-300 text-base sm:text-lg leading-relaxed font-light">
              {section.subtitle}
            </p>
          )}
        </motion.div>

        {/* Layout Render */}
        {section.layout === 'banner' ? (
          <div className="p-8 sm:p-10 bg-gradient-to-r from-[#121216] via-[#16161c] to-[#0d0d10] border border-[#d4af37]/30 rounded-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
              {section.items.map((item) => (
                <div key={item.id} className="space-y-3">
                  {item.badge && (
                    <span className="inline-block px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-[#d4af37] bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-sm">
                      {item.badge}
                    </span>
                  )}
                  <h3 className="text-xl font-serif text-white">{item.title}</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">{item.description}</p>
                  {item.linkUrl && (
                    <a
                      href={item.linkUrl}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#d4af37] hover:text-[#f3e5ab] uppercase tracking-wider transition-colors pt-2"
                    >
                      <span>{item.linkLabel || 'Learn more'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : section.layout === 'split' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
            {section.items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-8 bg-[#0c0c0e] border border-neutral-800 rounded-sm hover:border-[#d4af37]/40 transition-colors shadow-lg"
              >
                {item.badge && (
                  <span className="text-[11px] font-mono tracking-widest uppercase text-[#d4af37] block mb-3">
                    {item.badge}
                  </span>
                )}
                <h3 className="text-xl sm:text-2xl font-serif text-white mb-3">{item.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed mb-6">{item.description}</p>
                {item.linkUrl && (
                  <a
                    href={item.linkUrl}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37] hover:text-white transition-colors"
                  >
                    <span>{item.linkLabel || 'Explore'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          /* Default: Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {section.items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-7 bg-[#0d0d10] border border-neutral-800/80 rounded-sm hover:border-[#d4af37]/40 transition-all duration-300 flex flex-col justify-between group shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-sm bg-[#151518] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] group-hover:scale-105 transition-transform">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    {item.badge && (
                      <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-serif text-white mb-2.5 group-hover:text-[#f3e5ab] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {item.linkUrl && (
                  <div className="pt-6 mt-6 border-t border-neutral-800/60">
                    <a
                      href={item.linkUrl}
                      className="inline-flex items-center gap-2 text-xs font-medium text-[#d4af37] hover:text-white uppercase tracking-wider transition-colors"
                    >
                      <span>{item.linkLabel || 'Read more'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
