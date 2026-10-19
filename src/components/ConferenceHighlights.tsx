import React from 'react';
import { Mic2, ScrollText, Users, Scale } from 'lucide-react';
import { motion } from 'motion/react';
import { useInView } from '../hooks/useInView';

export const ConferenceHighlights: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>();

  const highlights = [
    {
      icon: Scale,
      title: 'Debate & Diplomacy',
      description:
        'Engage in parliamentary procedure under strict Rules of Procedure. Deliver formal speeches, raise points of inquiry, and present diplomatic counter-arguments while adhering to country policy.',
      metrics: 'Rules of Procedure · Parliamentary Floor · Moderated Caucuses',
    },
    {
      icon: ScrollText,
      title: 'Research & Resolution Writing',
      description:
        'Analyze extensive background guides, historical treaties, and international law. Draft rigorous preambulatory and operative clauses that propose tangible solutions to global crises.',
      metrics: 'Working Papers · Draft Resolutions · Direct Amendments',
    },
    {
      icon: Mic2,
      title: 'Public Speaking & Rhetoric',
      description:
        'Hone oratorical confidence and poise in front of a committee of international peers. Learn to articulate complex geopolitical arguments under strict speech-timer limits.',
      metrics: 'Speakers List · Right of Reply · Point of Information',
    },
    {
      icon: Users,
      title: 'Collaboration & Leadership',
      description:
        'Coordinate multilateral blocs during unmoderated sessions. Reconcile conflicting sovereign interests, negotiate mutual concessions, and lead sponsor groups toward a two-thirds majority vote.',
      metrics: 'Bloc Consensus · Coalition Building · Sponsor Leadership',
    },
  ];

  return (
    <section id="highlights" ref={ref} className="section-content-visibility relative z-20 py-24 bg-[#0a0a0c] text-white border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-[1px] bg-[#d4af37]" />
              <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
                Core Academic Disciplines
              </span>
            </div>
            <h2
              className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Conference <span className="gold-gradient-text">Highlights</span>
            </h2>
          </div>
          <p className="text-neutral-400 text-sm max-w-md font-light">
            Model United Nations provides hands-on mastery of diplomacy, speechwriting, geopolitical strategy, and international dispute resolution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
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
      </div>
    </section>
  );
});
ConferenceHighlights.displayName = 'ConferenceHighlights';

