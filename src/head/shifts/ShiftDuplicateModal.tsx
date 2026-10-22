import React, { useState } from 'react';
import { X, Copy, Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import type { WmShift } from '../services/operationsStore';
import { duplicateDepartmentShift } from '../services/operationsStore';
import { ShiftDatePicker, formatDateReadable } from './ShiftDatePicker';
import { ShiftTimePicker, calculateShiftDuration } from './ShiftTimePicker';

interface ShiftDuplicateModalProps {
  shift: WmShift | null;
  isOpen: boolean;
  onClose: () => void;
  testToken?: string | null;
  onSuccess: (clonedShift: WmShift) => void;
}

export const ShiftDuplicateModal: React.FC<ShiftDuplicateModalProps> = ({
  shift,
  isOpen,
  onClose,
  testToken,
  onSuccess,
}) => {
  if (!isOpen || !shift) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const [newTitle, setNewTitle] = useState(`${shift.title} (Copy)`);
  const [newDate, setNewDate] = useState(tomorrowStr);
  const [startTime, setStartTime] = useState(shift.starts_at.slice(11, 16));
  const [endTime, setEndTime] = useState(shift.ends_at.slice(11, 16));
  const [copyAssignments, setCopyAssignments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const duration = calculateShiftDuration(startTime, endTime);

  const handleDuplicate = async () => {
    if (!newDate) {
      setError('Please select a date for the new shift.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const startsAtIso = new Date(`${newDate}T${startTime}:00`).toISOString();

      let endsAtDate = newDate;
      if (duration.isOvernight) {
        const [y, m, d] = newDate.split('-').map(Number);
        const nextDay = new Date(y, m - 1, d + 1);
        endsAtDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
      }
      const endsAtIso = new Date(`${endsAtDate}T${endTime}:00`).toISOString();

      const res = await duplicateDepartmentShift(
        shift.id,
        {
          starts_at: startsAtIso,
          ends_at: endsAtIso,
          title: newTitle.trim() || shift.title,
          copyAssignments,
        },
        testToken,
      );

      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to duplicate shift.');
      }

      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Duplication failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d12] shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#121218]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4af37]/15 text-[#f1d98c] border border-[#d4af37]/30">
              <Copy size={16} />
            </span>
            <div>
              <h3 className="font-serif font-bold text-white text-base">Duplicate Shift</h3>
              <p className="text-xs text-neutral-400">Clone shift and select new date</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        {error && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
              New Shift Title
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#14141c] px-3.5 py-2 text-sm text-white focus:border-[#d4af37] focus:outline-none"
            />
          </div>

          <ShiftDatePicker
            value={newDate}
            onChange={setNewDate}
            label="Target Date for Cloned Shift"
          />

          <ShiftTimePicker
            startTime={startTime}
            endTime={endTime}
            onChangeStart={setStartTime}
            onChangeEnd={setEndTime}
          />

          <div className="rounded-xl border border-white/5 bg-[#14141c] p-3.5">
            <label className="flex items-center justify-between text-xs cursor-pointer">
              <div>
                <span className="font-semibold text-white block">Copy Assigned Personnel</span>
                <span className="text-[11px] text-neutral-400">
                  Carry over all {shift.assigned_count ?? 0} Co-Heads and team members to the new date
                </span>
              </div>
              <input
                type="checkbox"
                checked={copyAssignments}
                onChange={(e) => setCopyAssignments(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent text-[#d4af37] focus:ring-0 ml-3"
              />
            </label>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4 bg-[#121218]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleDuplicate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b89628] px-4 py-2 text-xs font-bold text-black shadow-md hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
            Duplicate Shift
          </button>
        </footer>
      </div>
    </div>
  );
};
