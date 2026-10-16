import React, { useState } from 'react';
import { useInView } from '../hooks/useInView';
import { RegistrationModal } from './RegistrationModal';

export const RegistrationSection: React.FC = () => {
  const { ref, isInView } = useInView<HTMLElement>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'early_bird' | 'regular'>('early_bird');

  const handleOpenRegister = (tier: 'early_bird' | 'regular') => {
    setSelectedTier(tier);
    setIsModalOpen(true);
  };

  return (
    <section id="register" ref={ref} className="relative z-20 py-24 sm:py-32 bg-[#070707] text-white border-t border-neutral-900">
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
              Delegate Portal & Registration
            </span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight leading-tight mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Register for{' '}
            <span className="gold-gradient-text shimmer-gold shimmer-stagger-2">
              WEST MUN
            </span>
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed font-light">
            Secure your delegation’s place at the Western Model United Nations Conference. Delegate registration proceeds in progressive windows. All official fee structures, financial aid criteria, and country allocation matrixes are To Be Announced (TBA).
          </p>
        </div>

        {/* Balanced Registration Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Early Bird */}
          <div className="p-8 bg-[#0c0c0e] border border-neutral-800 rounded-sm relative flex flex-col justify-between hover:border-[#d4af37]/40 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#d4af37]">Tier 01</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-[#17171d] text-neutral-400 border border-neutral-800 rounded-sm">
                  Status: TBA
                </span>
              </div>
              <h3 className="text-xl font-serif text-white mb-2">Early Bird Delegate</h3>
              <p className="text-xs text-neutral-400 mb-6 font-light leading-relaxed">
                Preferred country matrix allocation for individual delegates and faculty-led groups.
              </p>
              <div className="space-y-2 py-4 border-t border-neutral-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Registration Fee:</span>
                  <span className="font-mono text-[#d4af37] font-bold">TBA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Application Deadline:</span>
                  <span className="font-mono text-neutral-300">TBA</span>
                </div>
              </div>

              {/* Priority Pre-Register Action */}
              <button
                type="button"
                onClick={() => handleOpenRegister('early_bird')}
                className="w-full mt-6 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] hover:bg-[#e5c158] rounded-sm transition-all cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] active:scale-98"
              >
                Pre-Register / Priority Notice
              </button>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800/80 text-[11px] text-neutral-500">
              Eligibility: High School & Collegiate Delegates
            </div>
          </div>

          {/* Regular Delegate */}
          <div className="p-8 bg-[#0e0e12] border border-[#d4af37]/50 rounded-sm relative flex flex-col justify-between shadow-[0_0_30px_rgba(212,175,55,0.06)] hover:border-[#d4af37] transition-all duration-300">
            <div className="absolute -top-3 left-6 px-3 py-0.5 bg-[#d4af37] text-black text-[10px] uppercase font-bold tracking-widest rounded-sm">
              Standard Delegate
            </div>
            <div>
              <div className="flex justify-between items-start mb-4 mt-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#d4af37]">Tier 02</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-[#17171d] text-neutral-400 border border-neutral-800 rounded-sm">
                  Status: TBA
                </span>
              </div>
              <h3 className="text-xl font-serif text-white mb-2">Regular Registration</h3>
              <p className="text-xs text-neutral-400 mb-6 font-light leading-relaxed">
                General registration window for single delegates, school delegations, and independent youth diplomats.
              </p>
              <div className="space-y-2 py-4 border-t border-neutral-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Registration Fee:</span>
                  <span className="font-mono text-[#d4af37] font-bold">TBA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Application Deadline:</span>
                  <span className="font-mono text-neutral-300">TBA</span>
                </div>
              </div>

              {/* Priority Pre-Register Action */}
              <button
                type="button"
                onClick={() => handleOpenRegister('regular')}
                className="w-full mt-6 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] hover:brightness-110 rounded-sm transition-all cursor-pointer shadow-[0_2px_12px_rgba(212,175,55,0.25)] active:scale-98"
              >
                Pre-Register / Priority Notice
              </button>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800/80 text-[11px] text-neutral-400">
              Eligibility: Open to All Registered Delegates
            </div>
          </div>
        </div>
      </div>

      {/* Diplomatic Registration Modal */}
      <RegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tier={selectedTier}
      />
    </section>
  );
};

