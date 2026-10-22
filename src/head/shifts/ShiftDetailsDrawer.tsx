import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Clock,
  MapPin,
  Calendar,
  Users,
  Shield,
  UserCheck,
  Plus,
  Trash2,
  Copy,
  Edit2,
  AlertCircle,
  Loader2,
  Mail,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';
import type { DepartmentKey, SectionKey } from '../departments';
import {
  listShiftAssignments,
  updateDepartmentShift,
  deleteDepartmentShift,
  updateAssignmentStatus,
  removeShiftAssignment,
  assignPersonToShift,
  listDepartmentRosterCandidates,
  type WmShift,
  type WmShiftAssignment,
  type ShiftCandidate,
  type ShiftAssignmentStatus,
  type ShiftStatus,
} from '../services/operationsStore';
import { formatTime12h, calculateShiftDuration } from './ShiftTimePicker';
import { formatDateReadable } from './ShiftDatePicker';

interface ShiftDetailsDrawerProps {
  shift: WmShift | null;
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentKey;
  section?: SectionKey | null;
  testToken?: string | null;
  onShiftUpdated: (updatedShift: WmShift) => void;
  onShiftDeleted: (shiftId: string) => void;
  onDuplicate: (shift: WmShift) => void;
  onEdit: (shift: WmShift) => void;
}

export const ShiftDetailsDrawer: React.FC<ShiftDetailsDrawerProps> = ({
  shift,
  isOpen,
  onClose,
  department,
  section,
  testToken,
  onShiftUpdated,
  onShiftDeleted,
  onDuplicate,
  onEdit,
}) => {
  const [assignments, setAssignments] = useState<WmShiftAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  // Quick Add Person mode
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [candidates, setCandidates] = useState<{ coHeads: ShiftCandidate[]; teamMembers: ShiftCandidate[] }>({
    coHeads: [],
    teamMembers: [],
  });
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [addResponsibility, setAddResponsibility] = useState('');
  const [addStation, setAddStation] = useState('');
  const [addIsSupervisor, setAddIsSupervisor] = useState(false);

  // Load assignments
  const loadRoster = useCallback(async () => {
    if (!shift) return;
    setLoading(true);
    setError('');
    const res = await listShiftAssignments(shift.id, testToken);
    if (res.ok && res.data) {
      setAssignments(res.data);
    } else {
      setError(res.error || 'Failed to load shift assignments.');
    }
    setLoading(false);
  }, [shift, testToken]);

  useEffect(() => {
    if (isOpen && shift) {
      void loadRoster();
      // Load candidate list for adding
      void listDepartmentRosterCandidates(department, section, testToken).then((r) => {
        if (r.ok && r.data) setCandidates(r.data);
      });
    } else {
      setIsAddingPerson(false);
    }
  }, [isOpen, shift, loadRoster, department, section, testToken]);

  if (!isOpen || !shift) return null;

  const shiftDate = shift.starts_at.slice(0, 10);
  const startTime24 = shift.starts_at.slice(11, 16);
  const endTime24 = shift.ends_at.slice(11, 16);
  const duration = calculateShiftDuration(startTime24, endTime24);

  const activeAssignments = assignments.filter((a) => a.status !== 'cancelled');
  const coHeadAssignments = activeAssignments.filter((a) => a.role_type === 'co_head');
  const teamAssignments = activeAssignments.filter((a) => a.role_type !== 'co_head');

  // Handle status update of the shift (Draft -> Open -> Closed)
  const handleShiftStatusChange = async (newStatus: ShiftStatus) => {
    setActionBusy(true);
    const res = await updateDepartmentShift(shift.id, { status: newStatus }, testToken);
    setActionBusy(false);
    if (res.ok && res.data) {
      onShiftUpdated({
        ...res.data,
        assigned_count: activeAssignments.length,
      });
    } else {
      setError(res.error || 'Failed to update shift status.');
    }
  };

  // Handle deletion of shift
  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete shift "${shift.title}"? This cannot be undone.`)) {
      return;
    }
    setActionBusy(true);
    const res = await deleteDepartmentShift(shift.id, testToken);
    setActionBusy(false);
    if (res.ok) {
      onShiftDeleted(shift.id);
      onClose();
    } else {
      setError(res.error || 'Failed to delete shift.');
    }
  };

  // Handle individual assignment status change
  const handleAssignmentStatusChange = async (assignmentId: string, status: ShiftAssignmentStatus) => {
    const res = await updateAssignmentStatus(assignmentId, status, testToken);
    if (res.ok) {
      await loadRoster();
      onShiftUpdated({ ...shift, assigned_count: activeAssignments.length });
    } else {
      setError(res.error || 'Could not update assignment status.');
    }
  };

  // Handle individual assignment removal
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!window.confirm('Remove this person from the shift?')) return;
    const res = await removeShiftAssignment(assignmentId, testToken);
    if (res.ok) {
      await loadRoster();
      onShiftUpdated({ ...shift, assigned_count: Math.max(0, activeAssignments.length - 1) });
    } else {
      setError(res.error || 'Failed to remove assignment.');
    }
  };

  // Handle adding person
  const handleAddCandidate = async () => {
    if (!selectedCandidateId) return;

    const allCandidates = [...candidates.coHeads, ...candidates.teamMembers];
    const cand = allCandidates.find((c) => c.id === selectedCandidateId);
    if (!cand) return;

    setActionBusy(true);
    const res = await assignPersonToShift(
      {
        shift_id: shift.id,
        person_id: cand.personId || null,
        member_id: cand.memberId || null,
        role_type: cand.type === 'co_head' ? 'co_head' : 'team_member',
        responsibility: addResponsibility,
        station: addStation || shift.location,
        is_supervisor: addIsSupervisor,
        assignee_name: cand.name,
        assignee_email: cand.email,
        status: 'assigned',
      },
      testToken,
    );
    setActionBusy(false);

    if (res.ok) {
      setIsAddingPerson(false);
      setSelectedCandidateId('');
      setAddResponsibility('');
      setAddStation('');
      setAddIsSupervisor(false);
      await loadRoster();
      onShiftUpdated({ ...shift, assigned_count: activeAssignments.length + 1 });
    } else {
      setError(res.error || 'Failed to add person to shift.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-xl h-full bg-[#0d0d12] border-l border-white/10 shadow-2xl text-white overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#121218]">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2">
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
              <span className="text-xs text-neutral-400">· {shift.department}</span>
            </div>
            <h2 className="mt-1 text-lg font-serif font-bold text-white truncate">{shift.title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Timing, Date, Location Cards */}
          <div className="grid gap-2.5 sm:grid-cols-2 rounded-xl border border-white/10 bg-[#121218] p-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-neutral-500 flex items-center gap-1">
                <Calendar size={11} className="text-[#d4af37]" /> Date
              </span>
              <p className="mt-0.5 font-semibold text-white">{formatDateReadable(shiftDate)}</p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-neutral-500 flex items-center gap-1">
                <Clock size={11} className="text-[#d4af37]" /> Time & Duration
              </span>
              <p className="mt-0.5 font-semibold text-white">
                {formatTime12h(startTime24)} – {formatTime12h(endTime24)} ({duration.formatted})
              </p>
            </div>

            <div className="sm:col-span-2 border-t border-white/5 pt-2">
              <span className="text-[10px] uppercase font-semibold text-neutral-500 flex items-center gap-1">
                <MapPin size={11} className="text-[#d4af37]" /> Location
              </span>
              <p className="mt-0.5 font-semibold text-white">{shift.location || 'Venue-wide'}</p>
            </div>

            {shift.description && (
              <div className="sm:col-span-2 border-t border-white/5 pt-2">
                <span className="text-[10px] uppercase font-semibold text-neutral-500">Instructions / Notes</span>
                <p className="mt-1 text-neutral-300 whitespace-pre-wrap">{shift.description}</p>
              </div>
            )}
          </div>

          {/* Staffing Capacity Bar */}
          <div className="rounded-xl border border-white/10 bg-[#121218] p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-white">Staffing Coverage</span>
              <span className="font-mono text-xs font-bold text-[#f1d98c]">
                {activeAssignments.length} / {shift.capacity} Filled
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${
                  activeAssignments.length >= shift.capacity ? 'bg-emerald-500' : 'bg-[#d4af37]'
                }`}
                style={{ width: `${Math.min(100, (activeAssignments.length / shift.capacity) * 100)}%` }}
              />
            </div>
          </div>

          {/* ROSTER SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Shift Roster ({activeAssignments.length})
              </h3>

              {!isAddingPerson && (
                <button
                  type="button"
                  onClick={() => setIsAddingPerson(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#d4af37] hover:underline"
                >
                  <Plus size={14} /> Add Person
                </button>
              )}
            </div>

            {/* Quick Add Person Form */}
            {isAddingPerson && (
              <div className="rounded-xl border border-[#d4af37]/30 bg-[#171620] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#f1d98c] uppercase tracking-wider">
                    Add Person to this Shift
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingPerson(false)}
                    className="text-neutral-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                    Select Person
                  </label>
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#121218] px-3 py-2 text-xs text-white focus:border-[#d4af37] focus:outline-none"
                  >
                    <option value="">Choose a Co-Head or Team Member...</option>
                    <optgroup label="Co-Heads">
                      {candidates.coHeads.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Co-Head)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Team Members">
                      {candidates.teamMembers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.roleTitle}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                      Responsibility / Task
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Check-in lead"
                      value={addResponsibility}
                      onChange={(e) => setAddResponsibility(e.target.value)}
                      className="w-full rounded border border-white/10 bg-[#121218] px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                      Station / Post
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Door 1"
                      value={addStation}
                      onChange={(e) => setAddStation(e.target.value)}
                      className="w-full rounded border border-white/10 bg-[#121218] px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addIsSupervisor}
                      onChange={(e) => setAddIsSupervisor(e.target.checked)}
                      className="rounded border-white/20 bg-transparent text-[#d4af37] focus:ring-0"
                    />
                    <span>Designate as shift supervisor</span>
                  </label>

                  <button
                    type="button"
                    disabled={!selectedCandidateId || actionBusy}
                    onClick={handleAddCandidate}
                    className="rounded-lg border border-[#d4af37] bg-[#d4af37] px-3.5 py-1.5 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50"
                  >
                    Confirm Assign
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-[#d4af37]" /> Loading roster...
              </div>
            ) : activeAssignments.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-[#121218] py-8 text-center text-xs text-neutral-500">
                No people currently assigned to this shift.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Co-Heads Assigned */}
                {coHeadAssignments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                      <Shield size={12} /> Co-Heads ({coHeadAssignments.length})
                    </h4>
                    {coHeadAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-xl border border-white/10 bg-[#14141c] p-3 text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">
                                {a.assignee_name || a.person?.display_name || 'Co-Head'}
                              </span>
                              {a.is_supervisor && (
                                <span className="rounded bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                                  Supervisor
                                </span>
                              )}
                            </div>
                            {a.assignee_email && (
                              <a
                                href={`mailto:${a.assignee_email}`}
                                className="mt-0.5 text-[11px] text-neutral-400 hover:text-[#d4af37] flex items-center gap-1"
                              >
                                <Mail size={11} /> {a.assignee_email}
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              aria-label="Assignment Status"
                              value={a.status}
                              onChange={(e) => handleAssignmentStatusChange(a.id, e.target.value as ShiftAssignmentStatus)}
                              className="rounded border border-white/10 bg-[#1a1a24] px-2 py-1 text-[11px] text-white focus:border-[#d4af37] focus:outline-none"
                            >
                              <option value="assigned">Assigned</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="no_show">No Show</option>
                              <option value="cancelled">Cancelled</option>
                            </select>

                            <button
                              type="button"
                              title="Remove from shift"
                              onClick={() => handleRemoveAssignment(a.id)}
                              className="text-neutral-500 hover:text-red-400 p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {(a.responsibility || a.station) && (
                          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-white/5 text-[11px] text-neutral-400">
                            {a.responsibility && (
                              <span>Role: <strong className="text-neutral-200">{a.responsibility}</strong></span>
                            )}
                            {a.station && (
                              <span>Post: <strong className="text-neutral-200">{a.station}</strong></span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Team Members Assigned */}
                {teamAssignments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                      <Users size={12} className="text-[#d4af37]" /> Team Members ({teamAssignments.length})
                    </h4>
                    {teamAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-xl border border-white/10 bg-[#14141c] p-3 text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">
                                {a.assignee_name || a.person?.display_name || 'Team Member'}
                              </span>
                              {a.is_supervisor && (
                                <span className="rounded bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                                  Supervisor
                                </span>
                              )}
                            </div>
                            {a.assignee_email && (
                              <a
                                href={`mailto:${a.assignee_email}`}
                                className="mt-0.5 text-[11px] text-neutral-400 hover:text-[#d4af37] flex items-center gap-1"
                              >
                                <Mail size={11} /> {a.assignee_email}
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              aria-label="Assignment Status"
                              value={a.status}
                              onChange={(e) => handleAssignmentStatusChange(a.id, e.target.value as ShiftAssignmentStatus)}
                              className="rounded border border-white/10 bg-[#1a1a24] px-2 py-1 text-[11px] text-white focus:border-[#d4af37] focus:outline-none"
                            >
                              <option value="assigned">Assigned</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="no_show">No Show</option>
                              <option value="cancelled">Cancelled</option>
                            </select>

                            <button
                              type="button"
                              title="Remove from shift"
                              onClick={() => handleRemoveAssignment(a.id)}
                              className="text-neutral-500 hover:text-red-400 p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {(a.responsibility || a.station) && (
                          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-white/5 text-[11px] text-neutral-400">
                            {a.responsibility && (
                              <span>Role: <strong className="text-neutral-200">{a.responsibility}</strong></span>
                            )}
                            {a.station && (
                              <span>Post: <strong className="text-neutral-200">{a.station}</strong></span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 bg-[#121218]">
          <div className="flex items-center gap-2">
            {shift.status === 'open' ? (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => handleShiftStatusChange('closed')}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-700"
              >
                Close Shift
              </button>
            ) : (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => handleShiftStatusChange('open')}
                className="rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/15 px-3 py-1.5 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/25"
              >
                Publish / Open Shift
              </button>
            )}

            <button
              type="button"
              onClick={() => onDuplicate(shift)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white"
            >
              <Copy size={13} /> Duplicate
            </button>

            <button
              type="button"
              onClick={() => onEdit(shift)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white"
            >
              <Edit2 size={13} /> Edit
            </button>
          </div>

          <button
            type="button"
            disabled={actionBusy}
            onClick={handleDelete}
            className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-950/20 hover:border-red-500/40"
          >
            <Trash2 size={13} /> Delete Shift
          </button>
        </footer>
      </div>
    </div>
  );
};
