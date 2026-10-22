import React from 'react';
import { Clock, Moon, Sun, ArrowRight, Zap } from 'lucide-react';

interface ShiftTimePickerProps {
  startTime: string; // 'HH:mm' 24-hr format e.g. '09:00'
  endTime: string;   // 'HH:mm' 24-hr format e.g. '13:00'
  onChangeStart: (time: string) => void;
  onChangeEnd: (time: string) => void;
  error?: string;
}

export function formatTime12h(time24: string): string {
  if (!time24) return '--:--';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
}

export function calculateShiftDuration(startTime: string, endTime: string): {
  hours: number;
  minutes: number;
  formatted: string;
  isOvernight: boolean;
} {
  if (!startTime || !endTime) {
    return { hours: 0, minutes: 0, formatted: '0h', isOvernight: false };
  }
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  let startTotalMins = sh * 60 + sm;
  let endTotalMins = eh * 60 + em;
  let isOvernight = false;

  if (endTotalMins <= startTotalMins) {
    // Overnight shift: crosses midnight
    endTotalMins += 24 * 60;
    isOvernight = true;
  }

  const diffMins = endTotalMins - startTotalMins;
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;

  const formatted = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h 00m`;
  return { hours, minutes, formatted, isOvernight };
}

export const ShiftTimePicker: React.FC<ShiftTimePickerProps> = ({
  startTime,
  endTime,
  onChangeStart,
  onChangeEnd,
  error,
}) => {
  const duration = calculateShiftDuration(startTime, endTime);

  const presets = [
    { label: 'Morning', start: '09:00', end: '13:00', desc: '9:00 AM – 1:00 PM (4h)' },
    { label: 'Afternoon', start: '13:00', end: '17:00', desc: '1:00 PM – 5:00 PM (4h)' },
    { label: 'Evening', start: '17:00', end: '21:00', desc: '5:00 PM – 9:00 PM (4h)' },
    { label: 'Full Day', start: '09:00', end: '18:00', desc: '9:00 AM – 6:00 PM (9h)' },
    { label: 'Night Watch', start: '22:00', end: '06:00', desc: '10:00 PM – 6:00 AM (8h overnight)' },
  ];

  const commonHours = Array.from({ length: 24 }).map((_, i) => String(i).padStart(2, '0'));
  const commonMinutes = ['00', '15', '30', '45'];

  const [startHour = '09', startMin = '00'] = startTime ? startTime.split(':') : ['09', '00'];
  const [endHour = '13', endMin = '00'] = endTime ? endTime.split(':') : ['13', '00'];

  return (
    <div className="w-full space-y-3">
      {/* Quick Time Presets */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Quick Shift Presets
          </span>
          <span className="text-[10px] text-neutral-500">Tap to auto-fill</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {presets.map((p) => {
            const isMatch = startTime === p.start && endTime === p.end;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  onChangeStart(p.start);
                  onChangeEnd(p.end);
                }}
                className={`rounded-lg border p-2 text-left transition-all ${
                  isMatch
                    ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#f1d98c]'
                    : 'border-white/5 bg-[#121218] text-neutral-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <Zap size={11} className={isMatch ? 'text-[#d4af37]' : 'text-neutral-500'} />
                  {p.label}
                </div>
                <div className="mt-0.5 text-[10px] text-neutral-500 truncate">{p.start}–{p.end}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start and End Inputs */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Start Time Box */}
        <div className="rounded-xl border border-white/10 bg-[#111116] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
              <Sun size={13} /> Start Time
            </span>
            <span className="rounded bg-[#d4af37]/10 px-2 py-0.5 text-xs font-mono font-medium text-[#f1d98c]">
              {formatTime12h(startTime)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="sr-only">Start Hour</label>
              <select
                aria-label="Start Hour"
                value={startHour}
                onChange={(e) => onChangeStart(`${e.target.value}:${startMin}`)}
                className="w-full rounded-lg border border-white/10 bg-[#16161f] px-2.5 py-2 text-sm text-white focus:border-[#d4af37] focus:outline-none"
              >
                {commonHours.map((h) => {
                  const label12 = formatTime12h(`${h}:00`);
                  return (
                    <option key={`sh-${h}`} value={h}>
                      {h}:00 ({label12})
                    </option>
                  );
                })}
              </select>
            </div>
            <span className="text-neutral-500 font-bold">:</span>
            <div className="w-24">
              <label className="sr-only">Start Minute</label>
              <select
                aria-label="Start Minute"
                value={startMin}
                onChange={(e) => onChangeStart(`${startHour}:${e.target.value}`)}
                className="w-full rounded-lg border border-white/10 bg-[#16161f] px-2.5 py-2 text-sm text-white focus:border-[#d4af37] focus:outline-none"
              >
                {commonMinutes.map((m) => (
                  <option key={`sm-${m}`} value={m}>
                    :{m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* End Time Box */}
        <div className="rounded-xl border border-white/10 bg-[#111116] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
              <Moon size={13} /> End Time
            </span>
            <span className="rounded bg-[#d4af37]/10 px-2 py-0.5 text-xs font-mono font-medium text-[#f1d98c]">
              {formatTime12h(endTime)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="sr-only">End Hour</label>
              <select
                aria-label="End Hour"
                value={endHour}
                onChange={(e) => onChangeEnd(`${e.target.value}:${endMin}`)}
                className="w-full rounded-lg border border-white/10 bg-[#16161f] px-2.5 py-2 text-sm text-white focus:border-[#d4af37] focus:outline-none"
              >
                {commonHours.map((h) => {
                  const label12 = formatTime12h(`${h}:00`);
                  return (
                    <option key={`eh-${h}`} value={h}>
                      {h}:00 ({label12})
                    </option>
                  );
                })}
              </select>
            </div>
            <span className="text-neutral-500 font-bold">:</span>
            <div className="w-24">
              <label className="sr-only">End Minute</label>
              <select
                aria-label="End Minute"
                value={endMin}
                onChange={(e) => onChangeEnd(`${endHour}:${e.target.value}`)}
                className="w-full rounded-lg border border-white/10 bg-[#16161f] px-2.5 py-2 text-sm text-white focus:border-[#d4af37] focus:outline-none"
              >
                {commonMinutes.map((m) => (
                  <option key={`em-${m}`} value={m}>
                    :{m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-calculated Duration Banner */}
      <div className="flex flex-wrap items-center justify-between rounded-lg border border-white/5 bg-[#0e0e14] px-3.5 py-2 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <Clock size={14} className="text-[#d4af37]" />
          <span>Calculated shift duration:</span>
          <strong className="text-white font-semibold">{duration.formatted}</strong>
        </div>

        {duration.isOvernight && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
            <Moon size={12} /> Ends next day (Overnight)
          </span>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};
