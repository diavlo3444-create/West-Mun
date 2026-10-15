import React, { useState } from 'react';
import { Clock, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { useInView } from '../hooks/useInView';

interface ScheduleSession {
  time: string;
  title: string;
  location: string;
  description: string;
}

export const ScheduleSection: React.FC = () => {
  const { ref, isInView } = useInView<HTMLElement>();
  const [activeDay, setActiveDay] = useState<number>(1);

  const daysData = [
    {
      dayNumber: 1,
      dayTitle: 'Day 1 — Convocations & Opening Deliberations',
      date: 'TBA',
      sessions: [
        {
          time: 'TBA',
          title: 'Delegate Accreditation & Registration',
          location: 'TBA',
          description: 'Official credential issuance, placard collection, and handbook verification for registered delegations and single delegates.',
        },
        {
          time: 'TBA',
          title: 'Opening Ceremony & Diplomatic Keynote Address',
          location: 'TBA',
          description: 'Secretariat welcome, introduction of committee dais teams, and opening remarks by invited international relations guest speakers.',
        },
        {
          time: 'TBA',
          title: 'Committee Session I: Roll Call & Agenda Adoption',
          location: 'TBA',
          description: 'Formal roll call of member states, setting the agenda, opening of the General Speakers List, and initial moderated caucuses.',
        },
      ],
    },
    {
      dayNumber: 2,
      dayTitle: 'Day 2 — Intensive Negotiation & Working Papers',
      date: 'TBA',
      sessions: [
        {
          time: 'TBA',
          title: 'Committee Session II: Substantive Debate',
          location: 'TBA',
          description: 'Deep debate on core agenda items. Introduction of unmoderated caucuses, formation of regional blocs, and drafting initial working papers.',
        },
        {
          time: 'TBA',
          title: 'Committee Session III: Crisis Directives & Working Papers',
          location: 'TBA',
          description: 'Dais review of submitted working papers. Introduction of crisis updates and real-time diplomatic intelligence scenarios.',
        },
        {
          time: 'TBA',
          title: 'Committee Session IV: Draft Resolution Formulation',
          location: 'TBA',
          description: 'Consolidation of competing working papers into formal draft resolutions with registered sponsor and signatory states.',
        },
      ],
    },
    {
      dayNumber: 3,
      dayTitle: 'Day 3 — Voting Procedure & Closing Assembly',
      date: 'TBA',
      sessions: [
        {
          time: 'TBA',
          title: 'Committee Session V: Amendments & Debate',
          location: 'TBA',
          description: 'Presentation of friendly and unfriendly amendments, final speeches for and against operative clauses, and bloc consolidation.',
        },
        {
          time: 'TBA',
          title: 'Formal Voting Procedure on Draft Resolutions',
          location: 'TBA',
          description: 'Strict roll call voting procedure in accordance with parliamentary rules. Adoption or rejection of final committee resolutions.',
        },
        {
          time: 'TBA',
          title: 'Closing Ceremony & Delegation Adjournment',
          location: 'TBA',
          description: 'Secretary-General closing address, committee awards presentation, gavel handover, and official adjournment of WEST MUN.',
        },
      ],
    },
  ];

  return (
    <section id="schedule" ref={ref} className="relative z-20 py-24 sm:py-32 bg-[#070707] text-white border-t border-neutral-900">
      <div
        className={`max-w-7xl mx-auto px-5 sm:px-8 md:px-12 transition-all duration-1000 ease-out transform ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-[1px] bg-[#d4af37]" />
              <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
                Agenda of Proceedings
              </span>
            </div>
            <h2
              className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Conference{' '}
              <span className="gold-gradient-text shimmer-gold shimmer-stagger-4">
                Schedule
              </span>
            </h2>
          </div>
          <div className="p-3 bg-[#111114] border border-[#d4af37]/30 rounded-sm flex items-center gap-2 text-xs text-neutral-300">
            <AlertCircle className="w-4 h-4 text-[#d4af37] shrink-0" />
            <span>Exact calendar dates, times, and venue rooms are TBA pending committee finalization.</span>
          </div>
        </div>

        {/* Day Selector Tabs */}
        <div className="flex items-center gap-3 mb-12 border-b border-neutral-800 pb-4 overflow-x-auto scrollbar-none">
          {daysData.map((d) => (
            <button
              key={d.dayNumber}
              onClick={() => setActiveDay(d.dayNumber)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-sm transition-all text-xs uppercase tracking-widest font-semibold cursor-pointer whitespace-nowrap ${
                activeDay === d.dayNumber
                  ? 'bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] text-black shadow-md'
                  : 'bg-[#121215] text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <span>Day {d.dayNumber}</span>
              <span className="text-[10px] font-mono opacity-80">(Date: TBA)</span>
            </button>
          ))}
        </div>

        {/* Active Day Title & Overview */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0d0d10] border border-neutral-800 rounded-sm">
          <h3 className="text-lg font-serif text-white">
            {daysData[activeDay - 1].dayTitle}
          </h3>
          <div className="flex items-center gap-2 text-xs text-[#d4af37] font-mono">
            <Calendar className="w-4 h-4" />
            <span>Date: {daysData[activeDay - 1].date}</span>
          </div>
        </div>

        {/* Timeline Layout */}
        <div className="relative border-l border-neutral-800 ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-8">
          {daysData[activeDay - 1].sessions.map((session: ScheduleSession, index: number) => (
            <div key={session.title + index} className="relative group">
              {/* Timeline Gold Dot */}
              <div className="absolute -left-[31px] sm:-left-[47px] top-1.5 w-4 h-4 rounded-full bg-[#0a0a0c] border-2 border-[#d4af37] group-hover:scale-125 transition-transform" />

              <div className="p-6 bg-[#0e0e11] border border-neutral-800/90 hover:border-[#d4af37]/40 rounded-sm transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <h4 className="text-lg font-serif text-white group-hover:text-[#f3e5ab] transition-colors">
                    {session.title}
                  </h4>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-[#d4af37]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{session.time}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Location: {session.location}</span>
                    </span>
                  </div>
                </div>

                <p className="text-neutral-400 text-sm leading-relaxed font-light">
                  {session.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
