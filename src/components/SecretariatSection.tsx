import React from 'react';
import { User, Shield, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useInView } from '../hooks/useInView';

interface TeamMember {
  role: string;
  name: string;
  department: string;
  bio: string;
  image?: string;
  fallbackImage?: string;
  isConfirmed: boolean;
  appointmentNumber: string;
}

export const SecretariatSection: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>();

  const secretariat: TeamMember[] = [
    {
      role: 'Secretary-General',
      name: 'Rakan Almerbad',
      department: 'Executive Leadership',
      bio: 'Overseeing conference proceedings, guiding delegates, and maintaining parliamentary decorum. Dedicated to ensuring an exceptional, collaborative MUN experience for all delegations.',
      image: '/rakan-almerbad.jpg',
      isConfirmed: true,
      appointmentNumber: '01',
    },
    {
      role: 'Deputy Secretary-General',
      name: 'Yousef Saifi',
      department: 'Executive Secretariat',
      bio: 'Experienced debater with a deep passion for global diplomacy and constructive dialogue. Committed to youth empowerment, collaborative problem-solving, and delivering an unforgettable conference.',
      image: '/yousef.jpg',
      isConfirmed: true,
      appointmentNumber: '02',
    },
    {
      role: 'Under-Secretary-General',
      name: 'Fahad',
      department: 'Executive Secretariat',
      bio: 'Directing substantive committee operations, delegate services, and institutional logistics. Dedicated to fostering high-level multilateral debate and diplomatic excellence.',
      image: '/fahad.jpg',
      fallbackImage: 'https://i.ibb.co/mrYKgTYc/Whats-App-Image-2026-10-15-at-1-36-37-PM.jpg',
      isConfirmed: true,
      appointmentNumber: '03',
    },
    {
      role: 'Senior Advisor',
      name: 'Muaz Elamir',
      department: 'Advisory Board',
      bio: 'Hi im Muaz Elamir My job is to guide the team, share advice, and help make sure the conference runs smoothly so you all have a great MUN experience!',
      image: '/muaz.jpg',
      fallbackImage: 'https://i.ibb.co/4wCsnP6Q/Whats-App-Image-2026-10-15-at-11-07-35-PM.jpg',
      isConfirmed: true,
      appointmentNumber: '04',
    },
  ];

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
              key={member.role}
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
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      if (member.fallbackImage && e.currentTarget.src !== member.fallbackImage) {
                        e.currentTarget.src = member.fallbackImage;
                      }
                    }}
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
