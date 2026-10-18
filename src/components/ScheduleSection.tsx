import React, { useState } from 'react';
import { Clock, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useInView } from '../hooks/useInView';
import { usePublicTable, DEFAULT_DAYS, DEFAULT_SESSIONS, type ScheduleDayRow, type ScheduleSessionRow } from '../lib/content';

interface ScheduleSession {
  time: string;
  title: string;
  location: string;
  description: string;
}

export const ScheduleSection: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>();
  const [activeDay, setActiveDay] = useState<number>(1);

  const dayRows = usePublicTable<ScheduleDayRow>('schedule_days', DEFAULT_DAYS);
  const sessionRows = usePublicTable<ScheduleSessionRow>('schedule_sessions', DEFAULT_SESSIONS);
  const daysData = dayRows.map((d, i) => ({
    dayNumber: i + 1,
    dayTitle: d.title,
    date: d.date_text,
    sessions: sessionRows
      .filter((x) => x.day_id === d.id)
      .map((x) => ({ time: x.time_text, title: x.title, location: x.location, description: x.description })),
  }));
  const activeData = daysData[activeDay - 1] ?? daysData[0];
  if (!activeData) return null;

  return (
    <section id="schedule" ref={ref} className="section-content-visibility relative z-20 py-24 sm:py-32 bg-[#070707] text-white border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
        >
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
            <span>Dates, times, and venue rooms are subject to change; check back for updates.</span>
          </div>
        </motion.div>

        {/* Day Selector Tabs */}
        <div className="flex items-center gap-3 mb-12 border-b border-neutral-800 pb-4 overflow-x-auto scrollbar-none">
          {daysData.map((d) => (
            <motion.button
              key={d.dayNumber}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveDay(d.dayNumber)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-sm transition-all text-xs uppercase tracking-widest font-semibold cursor-pointer whitespace-nowrap ${
                activeDay === d.dayNumber
                  ? 'bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] text-black shadow-md'
                  : 'bg-[#121215] text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <span>Day {d.dayNumber}</span>
              <span className="text-[10px] font-mono opacity-80">({d.date})</span>
            </motion.button>
          ))}
        </div>

        {/* Active Day Title & Overview */}
        <motion.div
          key={activeData.dayNumber}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0d0d10] border border-neutral-800 rounded-sm"
        >
          <h3 className="text-lg font-serif text-white">
            {activeData.dayTitle}
          </h3>
          <div className="flex items-center gap-2 text-xs text-[#d4af37] font-mono">
            <Calendar className="w-4 h-4" />
            <span>Date: {activeData.date}</span>
          </div>
        </motion.div>

        {/* Timeline Layout */}
        <div className="relative border-l border-neutral-800 ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-8">
          {activeData.sessions.map((session: ScheduleSession, index: number) => (
            <motion.div
              key={session.title + activeData.dayNumber}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{
                duration: 0.45,
                delay: index * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="relative group"
            >
              {/* Timeline Gold Dot */}
              <div className="absolute -left-[31px] sm:-left-[47px] top-1.5 w-4 h-4 rounded-full bg-[#0a0a0c] border-2 border-[#d4af37] group-hover:scale-125 transition-transform" />

              <motion.div
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="p-6 bg-[#0e0e11] border border-neutral-800/90 hover:border-[#d4af37]/40 rounded-sm transition-colors"
              >
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
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});
ScheduleSection.displayName = 'ScheduleSection';
