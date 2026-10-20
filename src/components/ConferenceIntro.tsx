import React from 'react';
import { Compass, BookOpen, Handshake, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { useInView } from '../hooks/useInView';
import { useCmsContent } from '../lib/cmsContent';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass,
  BookOpen,
  Handshake,
  Globe,
};

export const ConferenceIntro: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>();
  const { t, introPillars } = useCmsContent();

  const eyebrow = t('intro_eyebrow', 'The Mission of WEST MUN');
  const title = t('intro_title', 'Diplomacy. Dialogue. Impact.');
  const description = t(
    'intro_description',
    'Model United Nations is an authentic simulation of the UN General Assembly, Security Council, and multilateral diplomatic agencies. Delegates represent sovereign nations, advocating foreign policy objectives, drafting binding resolutions, and navigating international crises.',
  );
  const themeBadge = t('intro_theme_badge', 'Official Conference Theme');
  const themeText = t(
    'intro_theme_text',
    'To Be Announced (TBA) by the Secretariat prior to registration opening.',
  );

  return (
    <section id="intro" ref={ref} className="section-content-visibility relative z-20 py-24 sm:py-32 bg-[#070707] text-white border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-3xl mb-16"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-[1px] bg-[#d4af37]" />
            <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
              {eyebrow}
            </span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight leading-tight mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {title}
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed font-light">
            {description}
          </p>
        </motion.div>

        {/* 3 Pillars of Diplomatic Engagement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {introPillars.map((pillar, index) => {
            const Icon = (pillar.icon && ICON_MAP[pillar.icon]) || Compass;
            return (
              <motion.div
                key={pillar.id || pillar.title}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="p-8 bg-[#0d0d0e] border border-neutral-800/80 hover:border-[#d4af37]/40 transition-colors duration-300 rounded-sm"
              >
                <div className="w-10 h-10 rounded-sm bg-[#171718] border border-[#d4af37]/20 flex items-center justify-center mb-6 text-[#d4af37]">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-serif text-white mb-3">{pillar.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{pillar.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Conference Theme Notice (Enforcing mandatory TBA policy) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="p-6 bg-[#0a0a0b] border border-[#d4af37]/20 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-[#d4af37] shrink-0" />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] block">
                {themeBadge}
              </span>
              <span className="text-sm text-neutral-300">
                {themeText}
              </span>
            </div>
          </div>
          <span className="px-3 py-1 text-xs uppercase tracking-widest font-mono text-neutral-400 border border-neutral-800 rounded-sm">
            Status: Pending Announcement
          </span>
        </motion.div>
      </div>
    </section>
  );
});
ConferenceIntro.displayName = 'ConferenceIntro';
