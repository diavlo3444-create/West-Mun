import React from 'react';
import { Compass, BookOpen, Handshake, Globe } from 'lucide-react';
import { useInView } from '../hooks/useInView';

export const ConferenceIntro: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>();

  return (
    <section id="intro" ref={ref} className="relative z-20 py-24 sm:py-32 bg-[#070707] text-white border-t border-neutral-900">
      <div
        className={`max-w-7xl mx-auto px-5 sm:px-8 md:px-12 transition-all duration-1000 ease-out transform ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-[1px] bg-[#d4af37]" />
            <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
              The Mission of WEST MUN
            </span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight leading-tight mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Diplomacy. Dialogue.{' '}
            <span className="gold-gradient-text shimmer-gold shimmer-stagger-1">
              Impact.
            </span>
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed font-light">
            Model United Nations is an authentic simulation of the UN General Assembly, Security Council, and multilateral diplomatic agencies. Delegates represent sovereign nations, advocating foreign policy objectives, drafting binding resolutions, and navigating international crises.
          </p>
        </div>

        {/* 3 Pillars of Diplomatic Engagement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="p-8 bg-[#0d0d0e] border border-neutral-800/80 hover:border-[#d4af37]/40 transition-colors duration-300 rounded-sm">
            <div className="w-10 h-10 rounded-sm bg-[#171718] border border-[#d4af37]/20 flex items-center justify-center mb-6 text-[#d4af37]">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-serif text-white mb-3">Sovereign Representation</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Step into the shoes of career diplomats and heads of state. Defend geopolitical stances, reconcile competing alliances, and defend constitutional mandates through reasoned debate.
            </p>
          </div>

          <div className="p-8 bg-[#0d0d0e] border border-neutral-800/80 hover:border-[#d4af37]/40 transition-colors duration-300 rounded-sm">
            <div className="w-10 h-10 rounded-sm bg-[#171718] border border-[#d4af37]/20 flex items-center justify-center mb-6 text-[#d4af37]">
              <Handshake className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-serif text-white mb-3">Multilateral Consensus</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Real world solutions cannot be dictated; they must be negotiated. Experience unmoderated caucuses, coalition building, compromise, and diplomatic bridge-building across ideological divides.
            </p>
          </div>

          <div className="p-8 bg-[#0d0d0e] border border-neutral-800/80 hover:border-[#d4af37]/40 transition-colors duration-300 rounded-sm">
            <div className="w-10 h-10 rounded-sm bg-[#171718] border border-[#d4af37]/20 flex items-center justify-center mb-6 text-[#d4af37]">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-serif text-white mb-3">Resolution Crafting</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Transform discussions into actionable international policy. Draft operative clauses, debate formal amendments, and establish international frameworks addressing modern global challenges.
            </p>
          </div>
        </div>

        {/* Conference Theme Notice (Enforcing mandatory TBA policy) */}
        <div className="p-6 bg-[#0a0a0b] border border-[#d4af37]/20 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-[#d4af37] shrink-0" />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] block">
                Official Conference Theme
              </span>
              <span className="text-sm text-neutral-300">
                To Be Announced (TBA) by the Secretariat prior to registration opening.
              </span>
            </div>
          </div>
          <span className="px-3 py-1 text-xs uppercase tracking-widest font-mono text-neutral-400 border border-neutral-800 rounded-sm">
            Status: Pending Announcement
          </span>
        </div>
      </div>
    </section>
  );
});
ConferenceIntro.displayName = 'ConferenceIntro';
