import React from 'react';
import { ShieldCheck, Calendar, Clock, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useInView } from '../hooks/useInView';
import { useSettings, orTba } from '../lib/content';

export const RegistrationSection: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>();
  const settings = useSettings();

  return (
    <section
      id="register"
      ref={ref}
      className="section-content-visibility relative z-20 py-24 sm:py-32 bg-[#070707] text-white border-t border-neutral-900"
    >
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
              Delegate Portal & Registration Status
            </span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight leading-tight mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Registration for{' '}
            <span className="gold-gradient-text shimmer-gold shimmer-stagger-2">
              WEST MUN
            </span>
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed font-light">
            {settings.registration_intro ||
              'Secure your delegation’s place at the Western Model United Nations Conference. All official fee structures, registration schedules, and country allocation matrices are To Be Announced (TBA).'}
          </p>
        </motion.div>

        {/* Balanced Registration Tiers (All Status: TBA) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Tier 01: Early Bird */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="p-8 bg-[#0c0c0e] border border-neutral-800 rounded-sm relative flex flex-col justify-between hover:border-[#d4af37]/40 transition-[transform,border-color,box-shadow] duration-300"
          >
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
                <div className="flex justify-between">
                  <span className="text-neutral-500">Registration Window:</span>
                  <span className="font-mono text-neutral-400">To Be Announced</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Eligibility: High School & Collegiate Delegates</span>
              <span className="font-mono text-[#d4af37]">TBA</span>
            </div>
          </motion.div>

          {/* Tier 02: Regular Registration */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="p-8 bg-[#0e0e12] border border-[#d4af37]/40 rounded-sm relative flex flex-col justify-between shadow-[0_0_30px_rgba(212,175,55,0.06)] hover:border-[#d4af37] transition-[transform,border-color,box-shadow] duration-300"
          >
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
                <div className="flex justify-between">
                  <span className="text-neutral-500">Registration Window:</span>
                  <span className="font-mono text-neutral-400">To Be Announced</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
              <span>Eligibility: Open to All Registered Delegates</span>
              <span className="font-mono text-[#d4af37]">TBA</span>
            </div>
          </motion.div>
        </div>

        {/* Diplomatic Registration Notice Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-12 p-6 sm:p-8 bg-[#0c0c0e] border border-[#d4af37]/30 rounded-sm max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-[#141418] border border-[#d4af37]/40 rounded-sm text-xs text-[#f3e5ab] font-medium uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Registration Status: To Be Announced</span>
          </div>
          <h3 className="text-lg sm:text-xl font-serif text-white mb-2">
            {settings.registration_notice_title || 'Official Delegate Registration Opening Soon (TBA)'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed max-w-xl mx-auto mb-4">
            {settings.registration_notice_text ||
              'Official conference registration dates, delegate and delegation fee schedules, and committee allocation matrices will be published once conference dates and host venue agreements are ratified by the Secretariat.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400 pt-3 border-t border-neutral-800">
            <span className="inline-flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
              Dates: <strong className="text-white">{orTba(settings.conference_dates)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono">
              <MapPin className="w-3.5 h-3.5 text-[#d4af37]" />
              Venue: <strong className="text-white">{orTba(settings.conference_venue)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
              Portal Access: <strong className="text-[#d4af37]">TBA</strong>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

RegistrationSection.displayName = 'RegistrationSection';
