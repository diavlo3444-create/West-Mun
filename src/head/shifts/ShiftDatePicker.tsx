import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface ShiftDatePickerProps {
  value: string; // ISO date string 'YYYY-MM-DD'
  onChange: (date: string) => void;
  label?: string;
  error?: string;
  minDate?: string;
}

export const formatDateReadable = (dateStr: string): string => {
  if (!dateStr) return 'Select date';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const ShiftDatePicker: React.FC<ShiftDatePickerProps> = ({
  value,
  onChange,
  label = 'Shift Date',
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  // Parse current selected date or fallback to today
  const selectedParts = value ? value.split('-').map(Number) : [];
  const selectedYear = selectedParts[0] || new Date().getFullYear();
  const selectedMonth = selectedParts[1] ? selectedParts[1] - 1 : new Date().getMonth();
  const selectedDay = selectedParts[2] || new Date().getDate();

  const [viewYear, setViewYear] = useState<number>(selectedYear);
  const [viewMonth, setViewMonth] = useState<number>(selectedMonth);

  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value]);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const popupWidth = Math.min(380, window.innerWidth - 24);
      const estimatedHeight = 360;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - popupWidth - 12));
      const top = openAbove
        ? Math.max(12, rect.top - estimatedHeight - 8)
        : Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 12));
      setPopupStyle({
        position: 'fixed',
        left,
        top,
        width: popupWidth,
        maxHeight: 'min(80vh, 520px)',
        overflowY: 'auto',
        zIndex: 10000,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday

  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mStr}-${dStr}`);
    setIsOpen(false);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const summitPresets = [
    { label: 'Today', date: todayStr },
    { label: 'Tomorrow', date: tomorrowStr },
    { label: 'Summit Day 1 (Oct 22)', date: '2026-10-22' },
    { label: 'Summit Day 2 (Oct 23)', date: '2026-10-23' },
    { label: 'Summit Day 3 (Oct 24)', date: '2026-10-24' },
  ];

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm transition-all ${
          error
            ? 'border-red-500/50 bg-red-950/10 text-white'
            : isOpen
            ? 'border-[#d4af37] bg-[#1a1a24] text-white shadow-[0_0_15px_rgba(212,175,55,0.15)]'
            : 'border-white/10 bg-[#111116] text-neutral-200 hover:border-white/20'
        }`}
      >
        <span className="flex items-center gap-2.5 truncate font-medium">
          <CalendarIcon size={16} className="text-[#d4af37] shrink-0" />
          {value ? formatDateReadable(value) : <span className="text-neutral-500">Choose a shift date...</span>}
        </span>
        <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
          {value || 'YYYY-MM-DD'}
        </span>
      </button>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Choose date"
          style={popupStyle}
          className="rounded-xl border border-[#d4af37]/40 bg-[#0e0e14] p-4 text-white shadow-[0_20px_70px_rgba(0,0,0,0.75)] backdrop-blur-xl"
        >
          {/* Quick Shortcuts */}
          <div className="mb-3 flex flex-wrap gap-1.5 border-b border-white/5 pb-3">
            {summitPresets.map((preset) => {
              const isSelected = value === preset.date;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onChange(preset.date);
                    setIsOpen(false);
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-[#d4af37] text-black font-semibold'
                      : 'border border-white/10 bg-white/5 text-neutral-300 hover:border-[#d4af37]/40 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Month / Year Navigation */}
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-serif font-bold text-white text-sm tracking-wide">
              {monthNames[viewMonth]} {viewYear}
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Previous month leading days */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => {
              const dayNum = prevMonthDays - firstDayOfWeek + idx + 1;
              return (
                <div
                  key={`prev-${idx}`}
                  className="flex h-8 items-center justify-center text-xs text-neutral-600 select-none"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#d4af37] to-[#b89628] font-bold text-black shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                      : isToday
                      ? 'border border-[#d4af37]/60 text-[#f1d98c] hover:bg-[#d4af37]/15'
                      : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Selected Date Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[11px] text-neutral-400">
            <span>Today: {formatDateReadable(todayStr)}</span>
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="text-[#d4af37] hover:underline font-medium"
            >
              Select Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
