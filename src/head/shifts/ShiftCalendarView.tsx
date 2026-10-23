import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Users,
  MapPin,
  Calendar as CalendarIcon,
  Shield,
  FileEdit,
} from 'lucide-react';
import type { WmShift } from '../services/operationsStore';
import { formatTime12h, calculateShiftDuration } from './ShiftTimePicker';
import { formatDateReadable } from './ShiftDatePicker';

interface ShiftCalendarViewProps {
  shifts: WmShift[];
  onSelectDate: (dateStr: string) => void;
  onOpenCreate: (initialDate?: string) => void;
  onSelectShift: (shift: WmShift) => void;
  currentDate?: Date;
}

type CalendarViewMode = 'month' | 'week' | 'day';

export const ShiftCalendarView: React.FC<ShiftCalendarViewProps> = ({
  shifts,
  onSelectDate,
  onOpenCreate,
  onSelectShift,
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Helper to extract YYYY-MM-DD from an ISO string in local time
  const getLocalDatePart = (isoString: string): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return isoString.split('T')[0] || '';
    }
  };

  // Group shifts by date string
  const shiftsByDate = React.useMemo(() => {
    const map = new Map<string, WmShift[]>();
    for (const s of shifts) {
      const key = getLocalDatePart(s.starts_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [shifts]);

  // Navigation handlers
  const handleToday = () => {
    const now = new Date();
    setAnchorDate(now);
    setSelectedDayStr(todayStr);
    onSelectDate(todayStr);
  };

  const handlePrev = () => {
    const next = new Date(anchorDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setAnchorDate(next);
  };

  const handleNext = () => {
    const next = new Date(anchorDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setAnchorDate(next);
  };

  // Month view calculations
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Week view calculations: Sunday to Saturday
  const weekStart = new Date(anchorDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { date: d, dateStr, dayNum: d.getDate() };
  });

  // Day view date
  const singleDayStr = `${anchorDate.getFullYear()}-${String(anchorDate.getMonth() + 1).padStart(2, '0')}-${String(anchorDate.getDate()).padStart(2, '0')}`;
  const dayShifts = shiftsByDate.get(singleDayStr) || [];

  return (
    <div className="space-y-4">
      {/* Calendar Header & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0d0d12] p-3.5 shadow-sm">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/20 transition-all"
          >
            Today
          </button>

          <div className="flex items-center rounded-lg border border-white/10 bg-[#16161e]">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
              aria-label="Previous date range"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
              aria-label="Next date range"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <h3 className="font-serif text-base sm:text-lg font-bold text-white tracking-wide ml-1">
            {viewMode === 'month' && `${monthNames[month]} ${year}`}
            {viewMode === 'week' && `Week of ${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}, ${weekStart.getFullYear()}`}
            {viewMode === 'day' && formatDateReadable(singleDayStr)}
          </h3>
        </div>

        {/* View mode toggle & Create Shift button */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-white/10 bg-[#14141c] p-0.5 text-xs">
            {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-3 py-1 font-medium capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-[#d4af37] text-black font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onOpenCreate(selectedDayStr || todayStr)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b89628] px-3.5 py-1.5 text-xs font-bold text-black shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:brightness-110 transition-all"
          >
            <Plus size={14} /> Create Shift
          </button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0e0e14]">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-white/10 bg-[#14141c] text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400 py-2.5">
            <span className="hidden sm:inline">Sunday</span><span className="sm:hidden">Sun</span>
            <span className="hidden sm:inline">Monday</span><span className="sm:hidden">Mon</span>
            <span className="hidden sm:inline">Tuesday</span><span className="sm:hidden">Tue</span>
            <span className="hidden sm:inline">Wednesday</span><span className="sm:hidden">Wed</span>
            <span className="hidden sm:inline">Thursday</span><span className="sm:hidden">Thu</span>
            <span className="hidden sm:inline">Friday</span><span className="sm:hidden">Fri</span>
            <span className="hidden sm:inline">Saturday</span><span className="sm:hidden">Sat</span>
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-white/5">
            {/* Leading days from previous month */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const prevDay = prevMonthTotalDays - firstDayIndex + idx + 1;
              return (
                <div key={`prev-${idx}`} className="min-h-[105px] sm:min-h-[125px] p-2 bg-[#09090d]/50 select-none">
                  <span className="text-xs font-medium text-neutral-600">{prevDay}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayShiftsList = shiftsByDate.get(dateStr) || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDayStr;

              return (
                <div
                  key={`day-${dateStr}`}
                  onClick={() => {
                    setSelectedDayStr(dateStr);
                    onSelectDate(dateStr);
                  }}
                  className={`group relative min-h-[105px] sm:min-h-[125px] p-1.5 sm:p-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#181824] ring-1 ring-[#d4af37]/60'
                      : isToday
                      ? 'bg-[#14141c]'
                      : 'bg-[#0e0e14] hover:bg-[#12121a]'
                  }`}
                >
                  {/* Top Bar inside cell: Date number + Quick Create button */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday
                          ? 'bg-[#d4af37] text-black font-bold shadow-sm'
                          : isSelected
                          ? 'border border-[#d4af37] text-[#f1d98c]'
                          : 'text-neutral-400 group-hover:text-white'
                      }`}
                    >
                      {dayNum}
                    </span>

                    <button
                      type="button"
                      title="Create shift on this date"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCreate(dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-[#d4af37] transition-all"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Compact Shift Cards */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px] sm:max-h-[95px] pr-0.5">
                    {dayShiftsList.slice(0, 3).map((shift) => {
                      const startTime24 = shift.starts_at.slice(11, 16);
                      const isDraft = shift.status === 'draft';
                      const isClosed = shift.status === 'closed';

                      return (
                        <div
                          key={shift.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectShift(shift);
                          }}
                          className={`rounded border px-1.5 py-1 text-left transition-all hover:scale-[1.02] cursor-pointer ${
                            isDraft
                              ? 'border-amber-500/30 bg-amber-950/20 text-amber-200'
                              : isClosed
                              ? 'border-white/10 bg-neutral-900/60 text-neutral-400'
                              : 'border-[#d4af37]/30 bg-[#d4af37]/10 text-white hover:border-[#d4af37]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-[11px] font-semibold text-white">
                              {shift.title}
                            </span>
                            {isDraft && <span className="text-[9px] uppercase tracking-wider text-amber-400 shrink-0">Draft</span>}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <Clock size={10} className="text-[#d4af37]" />
                              {formatTime12h(startTime24)}
                            </span>
                            <span className="font-mono text-[10px] text-[#f1d98c]">
                              {shift.assigned_count ?? 0}/{shift.capacity}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {dayShiftsList.length > 3 && (
                      <div className="text-[10px] font-medium text-center text-[#d4af37] pt-0.5">
                        +{dayShiftsList.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="grid gap-3 sm:grid-cols-7">
          {weekDays.map(({ date, dateStr, dayNum }) => {
            const dayShiftsList = shiftsByDate.get(dateStr) || [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDayStr;

            return (
              <div
                key={dateStr}
                onClick={() => {
                  setSelectedDayStr(dateStr);
                  onSelectDate(dateStr);
                }}
                className={`flex flex-col rounded-xl border p-3 min-h-[350px] transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#d4af37] bg-[#161622] shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                    : isToday
                    ? 'border-[#d4af37]/50 bg-[#121218]'
                    : 'border-white/10 bg-[#0e0e14] hover:border-white/20'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                      {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </span>
                    <h4 className="text-sm font-bold text-white">{dayNum}</h4>
                  </div>

                  <button
                    type="button"
                    title="Add shift on this date"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCreate(dateStr);
                    }}
                    className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-[#d4af37]"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Shifts List for Week Day */}
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {dayShiftsList.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-center text-[11px] text-neutral-500">
                      No shifts
                    </div>
                  ) : (
                    dayShiftsList.map((shift) => {
                      const startTime24 = shift.starts_at.slice(11, 16);
                      const endTime24 = shift.ends_at.slice(11, 16);
                      const duration = calculateShiftDuration(startTime24, endTime24);

                      return (
                        <div
                          key={shift.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectShift(shift);
                          }}
                          className="rounded-lg border border-white/10 bg-[#16161e] p-2 hover:border-[#d4af37]/50 transition-all cursor-pointer"
                        >
                          <div className="font-semibold text-xs text-white truncate">{shift.title}</div>
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400">
                            <Clock size={11} className="text-[#d4af37]" />
                            <span>{formatTime12h(startTime24)} – {formatTime12h(endTime24)}</span>
                          </div>
                          {shift.location && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400 truncate">
                              <MapPin size={10} className="text-neutral-500" />
                              <span>{shift.location}</span>
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5 text-[10px]">
                            <span className="text-[#f1d98c] font-medium">
                              {shift.assigned_count ?? 0}/{shift.capacity} staffed
                            </span>
                            <span className="capitalize text-neutral-400">{shift.status}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DAY VIEW */}
      {viewMode === 'day' && (
        <div className="rounded-xl border border-white/10 bg-[#0e0e14] p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#d4af37] font-semibold">Single Day Agenda</span>
              <h2 className="text-xl font-bold font-serif text-white">{formatDateReadable(singleDayStr)}</h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenCreate(singleDayStr)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37] bg-[#d4af37]/15 px-3.5 py-1.5 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/25"
            >
              <Plus size={14} /> Schedule Shift for this Day
            </button>
          </div>

          {dayShifts.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarIcon size={32} className="mx-auto text-neutral-600 mb-2" />
              <p className="text-sm font-medium text-neutral-300">No shifts scheduled for this date.</p>
              <p className="text-xs text-neutral-500 mt-1">Tap the button above to add the first operational shift.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dayShifts.map((shift) => {
                const startTime24 = shift.starts_at.slice(11, 16);
                const endTime24 = shift.ends_at.slice(11, 16);
                const duration = calculateShiftDuration(startTime24, endTime24);

                return (
                  <article
                    key={shift.id}
                    onClick={() => onSelectShift(shift)}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#14141c] p-4 hover:border-[#d4af37]/50 hover:bg-[#181822] transition-all cursor-pointer"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-white text-base">{shift.title}</h3>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            shift.status === 'draft'
                              ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
                              : shift.status === 'closed'
                              ? 'bg-neutral-800 text-neutral-400'
                              : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {shift.status}
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1.5 text-xs text-neutral-300">
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-[#d4af37] shrink-0" />
                          <span>{formatTime12h(startTime24)} – {formatTime12h(endTime24)} ({duration.formatted})</span>
                        </div>

                        {shift.location && (
                          <div className="flex items-center gap-2 text-neutral-400">
                            <MapPin size={13} className="text-[#d4af37] shrink-0" />
                            <span>{shift.location}</span>
                          </div>
                        )}
                      </div>

                      {shift.description && (
                        <p className="mt-3 text-xs text-neutral-400 line-clamp-2">
                          {shift.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f1d98c]">
                        <Users size={14} />
                        <span>{shift.assigned_count ?? 0} / {shift.capacity} Staffed</span>
                      </div>
                      <span className="text-xs text-[#d4af37] hover:underline font-medium">
                        View Details →
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
