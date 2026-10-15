import React from 'react';
import { User, Shield, CheckCircle2, Clock } from 'lucide-react';
import { useInView } from '../hooks/useInView';

interface TeamMember {
  role: string;
  name: string;
  department: string;
  bio: string;
  image?: string;
  isConfirmed: boolean;
  appointmentNumber: string;
}

export const SecretariatSection: React.FC = () => {
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
      name: 'Yousef',
      department: 'Executive Secretariat',
      bio: 'Experienced debater with a deep passion for global diplomacy and constructive dialogue. Committed to youth empowerment, collaborative problem-solving, and delivering an unforgettable conference.',
      image: '/yousef.jpg',
      isConfirmed: true,
      appointmentNumber: '02',
    },
    {
      role: 'Under-Secretary-General',
      name: 'TBA',
      department: 'Executive Secretariat',
      bio: 'Executive portfolio directing committee logistics, delegate affairs, and operational excellence. Official appointment to be ratified as the secretariat finalizes committee allocations.',
      image: undefined,
      isConfirmed: false,
      appointmentNumber: '03',
    },
  ];

  return (
    <section id="secretariat" ref={ref} className="relative z-20 py-24 sm:py-32 bg-[#0a0a0c] text-white border-t border-neutral-900">
      <div
        className={`max-w-7xl mx-auto px-5 sm:px-8 md:px-12 transition-all duration-1000 ease-out transform ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-[1px] bg-[#d4af37]" />
              <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
                Executive Leadership
              </span>
            </div>
            <h2
              className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              The <span className="gold-gradient-text">Secretariat</span>
            </h2>
          </div>
          <p className="text-neutral-400 text-sm max-w-md font-light leading-relaxed">
            The executive leadership body governing WEST MUN, ensuring academic excellence, parliamentary decorum, and an unforgettable delegate experience.
          </p>
        </div>

        {/* Secretariat Profiles Grid — Consistent Layout Across All Profiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {secretariat.map((member) => (
            <div
              key={member.role}
              className={`group p-7 sm:p-8 bg-[#0e0e11] border rounded-sm transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden h-full ${
                member.isConfirmed
                  ? 'border-[#d4af37]/40 hover:border-[#d4af37] shadow-[0_0_25px_rgba(212,175,55,0.06)]'
                  : 'border-neutral-800/80 hover:border-[#d4af37]/30'
              }`}
            >
              {/* Top Department Badge (Equal Height) */}
              <div className="h-5 flex items-center justify-center mb-5">
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#d4af37]">
                  {member.department}
                </span>
              </div>

              {/* Portrait (Identical Dimensions & Border Treatment) */}
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full mb-6 relative overflow-hidden flex items-center justify-center shrink-0 bg-gradient-to-b from-[#18181f] to-[#0c0c0e] border-2 border-[#d4af37]/40 group-hover:border-[#d4af37] transition-all shadow-xl">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-400 group-hover:text-[#d4af37] transition-colors">
                    <User className="w-12 h-12 mb-1 opacity-50" />
                    <span className="text-[10px] font-mono tracking-widest uppercase text-[#d4af37]/80">
                      PORTRAIT TBA
                    </span>
                  </div>
                )}
              </div>

              {/* Role Title (Fixed Min-Height to Guarantee Vertical Alignment) */}
              <div className="min-h-[3rem] flex items-center justify-center mb-2">
                <h3 className="text-xl font-serif text-white group-hover:text-[#f3e5ab] transition-colors leading-snug">
                  {member.role}
                </h3>
              </div>

              {/* Name Badge (Identical Offset & Dimensions) */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141418] border border-neutral-800 rounded-sm mb-5 shrink-0">
                <Shield className="w-3 h-3 text-[#d4af37]" />
                <span className="text-xs font-mono text-neutral-200 font-semibold tracking-wider">
                  {member.name}
                </span>
              </div>

              {/* Bio Container (Starts at Identical Offset, Harmonious Typography) */}
              <div className="flex-1 flex items-start justify-center">
                <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed font-light">
                  {member.bio}
                </p>
              </div>

              {/* Card Footer (Pinned to Bottom via mt-auto, Consistent Status Layout) */}
              <div className="mt-6 pt-4 w-full border-t border-neutral-800/60 flex items-center justify-between text-[10px] uppercase tracking-widest font-mono text-neutral-500">
                <span>Appointment {member.appointmentNumber}</span>
                <span className={`inline-flex items-center gap-1 ${member.isConfirmed ? 'text-[#d4af37]' : 'text-neutral-400'}`}>
                  {member.isConfirmed ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
