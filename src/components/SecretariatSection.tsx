import React from 'react';
import { User, Shield, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useInView } from '../hooks/useInView';
import { usePublicTable, DEFAULT_SECRETARIAT, type SecretariatRow } from '../lib/content';
import { safeUrl } from '../lib/safe';

interface TeamMember {
  role: string;
  name: string;
  department: string;
  bio: string;
  image?: string;
  isConfirmed: boolean;
  appointmentNumber: string;
  imagePosition?: string;
}

export const SecretariatSection: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>();

  const rows = usePublicTable<SecretariatRow>('secretariat', DEFAULT_SECRETARIAT);
  const positionClass = { center: 'object-center', top: 'object-top', bottom: 'object-bottom' } as const;
  const secretariat: TeamMember[] = rows.map((r, i) => ({
    role: r.role,
    name: r.name,
    department: r.department,
    bio: r.bio,
    image: safeUrl(r.image_url) || undefined,
    imagePosition: positionClass[r.image_position] ?? 'object-center',
    isConfirmed: r.confirmed,
    appointmentNumber: String(i + 1).padStart(2, '0'),
  }));

  return (
    <section id="secretariat" ref={ref} className="section-content-visibility relative z-20 py-24 sm:py-32 bg-[#0a0a0c] text-white border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-[1px] bg-[#d4af37]" />
              <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
                Executive Leadership & Advisory
              </span>
            </div>
            <h2
              className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              The{' '}
              <span className="gold-gradient-text shimmer-gold shimmer-stagger-1">
                Secretariat
              </span>
            </h2>
          </div>
          <p className="text-neutral-400 text-sm max-w-md font-light leading-relaxed">
            The executive leadership body governing WEST MUN, ensuring academic excellence, parliamentary decorum, and an unforgettable delegate experience.
          </p>
        </motion.div>

        {/* Secretariat Profiles Grid — Consistent 4-Card Responsive Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {secretariat.map((member, index) => (
            <motion.div
              key={member.role + index}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.99 }}
              className={`group p-6 sm:p-7 bg-[#0e0e11] border rounded-sm transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden h-full ${
                member.isConfirmed
                  ? 'border-[#d4af37]/40 hover:border-[#d4af37] shadow-[0_0_25px_rgba(212,175,55,0.06)]'
                  : 'border-neutral-800/80 hover:border-[#d4af37]/30'
              }`}
            >
              {/* Top Department Badge (Equal Height) */}
              <div className="h-5 flex items-center justify-center mb-4">
                <span className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-[#d4af37]">
                  {member.department}
                </span>
              </div>

              {/* Portrait (Identical Dimensions & Circular Border Treatment) */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full mb-5 relative overflow-hidden flex items-center justify-center shrink-0 bg-gradient-to-b from-[#18181f] to-[#0c0c0e] border-2 border-[#d4af37]/40 group-hover:border-[#d4af37] transition-all shadow-xl">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${member.imagePosition || 'object-center'}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-400 group-hover:text-[#d4af37] transition-colors">
                    <User className="w-10 h-10 mb-1 opacity-50" />
                    <span className="text-[9px] sm:text-[10px] font-mono tracking-widest uppercase text-[#d4af37]/80">
                      PORTRAIT TBA
                    </span>
                  </div>
                )}
              </div>

              {/* Role Title (Fixed Min-Height to Guarantee Vertical Alignment Across All Rows) */}
              <div className="min-h-[2.85rem] flex items-center justify-center mb-2">
                <h3 className="text-lg sm:text-xl font-serif text-white group-hover:text-[#f3e5ab] transition-colors leading-snug">
                  {member.role}
                </h3>
              </div>

              {/* Name Badge (Identical Offset & Dimensions) */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141418] border border-neutral-800 rounded-sm mb-4 shrink-0">
                <Shield className="w-3 h-3 text-[#d4af37]" />
                <span className="text-xs font-mono text-neutral-200 font-semibold tracking-wider">
                  {member.name}
                </span>
              </div>

              {/* Bio Container (Starts at Identical Offset, Harmonious Typography) */}
              <div className="flex-1 flex items-start justify-center">
                <p className="text-neutral-300 text-xs sm:text-[13px] leading-relaxed font-light">
                  {member.bio}
                </p>
              </div>

              {/* Card Footer (Pinned to Bottom via mt-auto, Consistent Status Layout) */}
              <div className="mt-6 pt-3.5 w-full border-t border-neutral-800/60 flex items-center justify-between text-[10px] uppercase tracking-widest font-mono text-neutral-500">
                <span>Appointment {member.appointmentNumber}</span>
                <span className={`inline-flex items-center gap-1 ${member.isConfirmed ? 'text-[#d4af37]' : 'text-neutral-400'}`}>
                  {member.isConfirmed ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-[#d4af37]" />
                      <span>Confirmed</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 text-[#d4af37]/70" />
                      <span>Pending TBA</span>
                    </>
                  )}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});
SecretariatSection.displayName = 'SecretariatSection';
