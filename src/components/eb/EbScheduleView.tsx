import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  UserCheck,
  AlertTriangle,
  Repeat,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronRight,
  Shield,
  Loader2,
  X,
  Filter,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type {
  EbShift,
  EbShiftSwap,
} from '../../lib/ebOperationsService';

interface EbScheduleViewProps {
  profile: EbMemberProfile;
  shifts: EbShift[];
  swaps: EbShiftSwap[];
  onRequestSwap: (swap: {
    assignment_id: string;
    requester_user_id: string;
    requester_name: string;
    target_shift_id?: string | null;
    reason: string;
  }) => Promise<void>;
  onReviewSwap?: (swapId: string, status: 'approved' | 'rejected', notes: string) => Promise<void>;
}

export const EbScheduleView: React.FC<EbScheduleViewProps> = ({
  profile,
  shifts,
  swaps,
  onRequestSwap,
  onReviewSwap,
}) => {
  const [viewFormat, setViewFormat] = useState<'timeline' | 'calendar'>('timeline');
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<EbShift | null>(null);
  const [swapReason, setSwapReason] = useState('');
  const [targetShiftId, setTargetShiftId] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedReviewSwap, setSelectedReviewSwap] = useState<EbShiftSwap | null>(null);

  // Can review swaps if supervisor, head, or admin
  const canReviewSwaps = profile.isHead || profile.isAdmin || profile.role === 'co_head';

  // Conflict detection: detect if two shifts overlap
  const conflicts: { shiftA: EbShift; shiftB: EbShift }[] = [];
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const a = shifts[i];
      const b = shifts[j];
      const aStart = new Date(a.starts_at).getTime();
      const aEnd = new Date(a.ends_at).getTime();
      const bStart = new Date(b.starts_at).getTime();
      const bEnd = new Date(b.ends_at).getTime();
      if (aStart < bEnd && bStart < aEnd) {
        conflicts.push({ shiftA: a, shiftB: b });
      }
    }
  }

  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftForSwap || !swapReason.trim() || busy) return;
    setBusy(true);
    try {
      await onRequestSwap({
        assignment_id: selectedShiftForSwap.id,
        requester_user_id: profile.id,
        requester_name: profile.name,
        target_shift_id: targetShiftId || null,
        reason: swapReason.trim(),
      });
      setSelectedShiftForSwap(null);
      setSwapReason('');
      setTargetShiftId('');
    } finally {
      setBusy(false);
    }
  };

  const handleReviewAction = async (status: 'approved' | 'rejected') => {
    if (!selectedReviewSwap || !onReviewSwap || busy) return;
    setBusy(true);
    try {
      await onReviewSwap(selectedReviewSwap.id, status, reviewNotes.trim());
      setSelectedReviewSwap(null);
      setReviewNotes('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="font-serif text-2xl font-normal text-white">Conference Shift Schedule</h2>
          <p className="mt-1 text-xs text-neutral-400">
            {canReviewSwaps ? 'Department roster, shift hours, and swap requests awaiting your review.' : 'Your assigned roster, shift hours, and requests you have submitted.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeline vs Calendar Toggle */}
          <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setViewFormat('timeline')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition ${
                viewFormat === 'timeline' ? 'bg-[#d4af37] font-semibold text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewFormat('calendar')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition ${
                viewFormat === 'calendar' ? 'bg-[#d4af37] font-semibold text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>By Date</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conflict Warning Banner */}
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-xs text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-300">Roster Scheduling Conflict Detected</h4>
            <p className="mt-1 text-neutral-300">
              Shift conflict identified between <span className="text-white font-medium">{conflicts[0].shiftA.station_name}</span> and{' '}
              <span className="text-white font-medium">{conflicts[0].shiftB.station_name}</span>. Please request a shift swap or contact your Directorate Head.
            </p>
          </div>
        </div>
      )}

      {canReviewSwaps && swaps.some((swap) => swap.status === 'pending') && (
        <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/[0.06] p-3 text-xs text-[#f5d47a]">
          {swaps.filter((swap) => swap.status === 'pending').length} shift-swap request{swaps.filter((swap) => swap.status === 'pending').length === 1 ? '' : 's'} awaiting review.
        </div>
      )}
      {/* Shifts List / Timeline View */}
      <div className="space-y-4">
        {shifts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center text-xs text-neutral-400">
            No shifts currently assigned to your account. Roster updates will be published prior to conference opening.
          </div>
        ) : (
          shifts.map((shift, index) => {
            const isFirst = index === 0;
            const startDate = new Date(shift.starts_at);
            const endDate = new Date(shift.ends_at);

            return (
              <div
                key={shift.id}
                className={`relative rounded-2xl border transition p-5 sm:p-6 ${
                  isFirst
                    ? 'border-[#d4af37]/60 bg-gradient-to-r from-[#17150f] via-[#0d0c0e] to-black shadow-[0_0_24px_rgba(212,175,55,0.12)]'
                    : 'border-white/10 bg-black/40 hover:border-white/20'
                }`}
              >
                {isFirst && (
                  <span className="absolute -top-3 left-6 rounded-full border border-[#d4af37] bg-gradient-to-r from-[#e5c158] to-[#aa8232] px-3 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-black shadow-md">
                    Immediate Next Shift
                  </span>
                )}

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
                        {shift.shift_date}
                      </span>
                      <span className="text-neutral-600">•</span>
                      <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-neutral-300">
                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' — '}
                        {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="mt-2 text-base font-semibold text-white sm:text-lg">{shift.station_name}</h3>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#d4af37]" />
                        <span>{shift.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-[#d4af37]" />
                        <span>Supervisor: {shift.supervisor_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Request Swap Button */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <button
                      type="button"
                      onClick={() => setSelectedShiftForSwap(shift)}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs font-medium text-neutral-300 hover:border-[#d4af37]/40 hover:text-white"
                    >
                      <Repeat className="h-3.5 w-3.5 text-[#d4af37]" />
                      <span>Request Swap</span>
                    </button>
                  </div>
                </div>

                {/* Duties and Handover Notes */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 text-xs">
                  <div>
                    <span className="font-semibold text-neutral-400 uppercase text-[10px] tracking-wider">
                      Shift Responsibilities
                    </span>
                    <p className="mt-1 text-neutral-300 leading-relaxed">{shift.responsibilities}</p>
                  </div>

                  {shift.handover_notes && (
                    <div>
                      <span className="font-semibold text-neutral-400 uppercase text-[10px] tracking-wider">
                        Handover & Break Instructions
                      </span>
                      <p className="mt-1 text-neutral-300 leading-relaxed">{shift.handover_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active Shift Swaps Section */}
      {swaps.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/50 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="font-serif text-lg font-medium text-white">Shift Swap Activity & Approvals</h3>
            <span className="font-mono text-xs text-neutral-400">{swaps.length} Requests</span>
          </div>

          <p className="text-xs text-neutral-400">
            All shift swap requests require explicit Directorate supervisor approval before the official conference roster is updated.
          </p>

          <div className="divide-y divide-white/[0.06] text-xs">
            {swaps.map((sw) => (
              <div key={sw.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{sw.requester_name}</span>
                    <span
                      className={`rounded px-1.5 py-0.2 font-mono text-[9px] uppercase font-bold ${
                        sw.status === 'approved'
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                          : sw.status === 'rejected'
                          ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {sw.status}
                    </span>
                  </div>
                  <p className="mt-1 text-neutral-300">Reason: {sw.reason}</p>
                  {sw.review_notes && (
                    <p className="mt-0.5 text-neutral-400 text-[11px]">Supervisor Notes: {sw.review_notes}</p>
                  )}
                </div>

                {/* Supervisor Review Action Button */}
                {canReviewSwaps && sw.status === 'pending' && onReviewSwap && (
                  <button
                    type="button"
                    onClick={() => setSelectedReviewSwap(sw)}
                    className="rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-semibold text-[#f5d47a] hover:bg-[#d4af37]/20"
                  >
                    Review Decision
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Swap Request Modal */}
      {selectedShiftForSwap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/40 bg-[#0e0e12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-serif text-lg font-semibold text-white">Request Shift Swap</h3>
              <button
                type="button"
                onClick={() => setSelectedShiftForSwap(null)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs space-y-1">
              <span className="text-neutral-400">Current Shift:</span>
              <p className="font-semibold text-white">{selectedShiftForSwap.station_name}</p>
              <p className="text-neutral-400">
                {selectedShiftForSwap.shift_date} (
                {new Date(selectedShiftForSwap.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                {new Date(selectedShiftForSwap.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </p>
            </div>

            <form onSubmit={handleSwapSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Reason for Request <span className="text-[#d4af37]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="Explain why you are requesting a shift swap (e.g. academic conflict, emergency, or mutual exchange)…"
                  className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Preferred Target Shift (Optional)
                </label>
                <select
                  value={targetShiftId}
                  onChange={(e) => setTargetShiftId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#d4af37]"
                >
                  <option value="">Any available replacement shift</option>
                  {shifts
                    .filter((s) => s.id !== selectedShiftForSwap.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shift_date} — {s.station_name} (
                        {new Date(s.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setSelectedShiftForSwap(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-neutral-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!swapReason.trim() || busy}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] px-5 py-2 text-xs font-semibold text-black hover:brightness-110"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Submit to Supervisor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supervisor Review Modal */}
      {selectedReviewSwap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/40 bg-[#0e0e12] p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-semibold text-white">Supervisor Roster Decision</h3>
            <p className="text-xs text-neutral-300">
              Shift swap requested by <span className="font-semibold text-white">{selectedReviewSwap.requester_name}</span>.
            </p>
            <p className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-neutral-300">
              Reason: {selectedReviewSwap.reason}
            </p>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Supervisor Decision Notes</label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Optional explanation or roster reassignment notes…"
                className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white outline-none focus:border-[#d4af37]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSelectedReviewSwap(null)}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs text-neutral-400 hover:text-white"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => handleReviewAction('rejected')}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/20 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/40"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleReviewAction('approved')}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:brightness-110"
              >
                Approve Swap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
