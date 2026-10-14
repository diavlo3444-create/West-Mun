import React from 'react';
import { User, Award, Shield } from 'lucide-react';

interface TeamMember {
  role: string;
  name: string;
  department: string;
  bio: string;
}

export const SecretariatSection: React.FC = () => {
  const secretariat: TeamMember[] = [
    {
      role: 'Secretary-General',
      name: 'TBA',
      department: 'Executive Leadership',
      bio: 'The Secretary-General oversees academic integrity, executive dais appointments, and final committee ratifications.',
    },
    {
      role: 'Director-General',
      name: 'TBA',
      department: 'Operations & Host Logistics',
      bio: 'Directs conference venue operations, committee room administration, and liaison with institutional partners.',
    },
    {
      role: 'USG of Committee Affairs',
      name: 'TBA',
      department: 'Substantive Directives',
      bio: 'Coordinates committee chairs, crisis directors, background guide development, and academic guidelines.',
    },
    {
      role: 'USG of Delegate Affairs',
      name: 'TBA',
      department: 'Delegations & Accreditation',
      bio: 'Manages school registrations, single delegate allotments, country matrix assignments, and delegate briefings.',
    },
    {
      role: 'USG of Finance & Sponsorship',
      name: 'TBA',
      department: 'Financial Secretariat',
      bio: 'Oversees delegate scholarship funds, conference fee processing, financial audits, and institutional grants.',
    },
    {
      role: 'USG of Communications',
      name: 'TBA',
      department: 'Media & Outreach',
      bio: 'Directs press coverage, delegate handbook publications, social channels, and international media partnerships.',
    },
  ];

  return (
    <section id="secretariat" className="relative z-20 py-24 sm:py-32 bg-[#0a0a0c] text-white border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
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
          <p className="text-neutral-400 text-sm max-w-md font-light">
            The WEST MUN Secretariat comprises collegiate and youth leaders dedicated to delivering a seamless, academically rigorous diplomatic experience. Individual appointments are pending formal announcement (TBA).
          </p>
        </div>

        {/* Secretariat Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {secretariat.map((member, idx) => (
            <div
              key={member.role}
              className="group p-6 bg-[#0e0e11] border border-neutral-800/80 hover:border-[#d4af37]/50 rounded-sm transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Elegant Diplomatic Portrait Placeholder */}
              <div className="w-32 h-32 rounded-full mb-6 relative flex items-center justify-center bg-gradient-to-b from-[#18181f] to-[#0c0c0e] border-2 border-[#d4af37]/30 group-hover:border-[#d4af37] transition-all shadow-[0_0_25px_rgba(212,175,55,0.06)]">
                <div className="absolute inset-1 rounded-full border border-dashed border-[#d4af37]/20" />
                <div className="flex flex-col items-center justify-center text-neutral-400 group-hover:text-[#d4af37] transition-colors">
                  <User className="w-10 h-10 mb-1 opacity-60" />
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#d4af37]/80">
                    PORTRAIT TBA
                  </span>
                </div>
              </div>

              {/* Role & Department */}
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#d4af37] mb-1">
                {member.department}
              </span>
              <h3 className="text-lg font-serif text-white mb-1 group-hover:text-[#f3e5ab] transition-colors">
                {member.role}
              </h3>

              {/* Name (Explicitly TBA per policy) */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141418] border border-neutral-800 rounded-sm mb-4">
                <Shield className="w-3 h-3 text-[#d4af37]" />
                <span className="text-xs font-mono text-neutral-300 font-semibold tracking-wider">
                  Officer: {member.name}
                </span>
              </div>

              {/* Bio */}
              <p className="text-neutral-400 text-xs leading-relaxed font-light mt-auto">
                {member.bio}
              </p>

              <div className="mt-4 pt-3 w-full border-t border-neutral-800/60 text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
                Appointment 0{idx + 1} · TBA
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
