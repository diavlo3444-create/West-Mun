import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Plus, Clock, MapPin, Users, RefreshCw, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';
import type { DepartmentKey, SectionKey } from '../departments';
import {
  listDepartmentShifts,
  createDepartmentShift,
  updateDepartmentShift,
  deleteDepartmentShift,
  type WmShift,
  type WmTeamGroup,
  type ShiftStatus,
} from '../services/operationsStore';

interface ShiftManagementDashboardProps {
  department: DepartmentKey;
  section?: SectionKey | null;
  testToken?: string | null;
  initialGroup?: WmTeamGroup | null;
}

export const ShiftManagementDashboard: React.FC<ShiftManagementDashboardProps> = ({
  department,
  section,
  testToken,
  initialGroup,
}) => {
  const [shifts, setShifts] = useState<WmShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(Boolean(initialGroup));
  const [title, setTitle] = useState(initialGroup ? `Deployment: ${initialGroup.name}` : '');
  const [location, setLocation] = useState('Main Summit Venue');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [saving, setSaving] = useState(false);

  const loadShifts = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await listDepartmentShifts(department, section, testToken);
    if (res.ok) {
      setShifts(res.data || []);
    } else {
      setError(res.error || 'Failed to load shifts.');
    }
    setLoading(false);
  }, [department, section, testToken]);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt || !endsAt) return;
    setSaving(true);
    const res = await createDepartmentShift(
      {
        department,
        section,
        title: title.trim(),
        location: location.trim(),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        capacity: Number(capacity) || 1,
        status: 'open',
      },
      testToken
    );
    if (res.ok && res.data) {
      setShifts((prev) => [res.data!, ...prev]);
      setTitle('');
      setShowCreate(false);
    } else {
      setError(res.error || 'Failed to create shift.');
    }
    setSaving(false);
  };

  const handleToggleStatus = async (shift: WmShift) => {
    const nextStatus: ShiftStatus = shift.status === 'open' ? 'closed' : 'open';
    const res = await updateDepartmentShift(shift.id, { status: nextStatus }, testToken);
    if (res.ok) {
      setShifts((prev) =>
        prev.map((s) => (s.id === shift.id ? { ...s, status: nextStatus } : s))
      );
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!window.confirm('Delete this operational shift?')) return;
    const res = await deleteDepartmentShift(shiftId, testToken);
    if (res.ok) {
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    } else {
      setError(res.error || 'Failed to delete shift.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-[#d4af37]/30 bg-[#0a0a0d] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
              Operations Studio
            </span>
            <h2 className="font-serif text-2xl font-normal text-white">Shift Scheduling & Station Rosters</h2>
            <p className="text-xs text-neutral-300">
              Manage time windows, station quotas, staff capacity, and roster dispatch for {department.replace(/_/g, ' ')}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadShifts}
              className="border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-neutral-300 hover:border-white/30 hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-[#d4af37] px-4 py-2 text-xs font-semibold text-black hover:bg-[#e5c158]"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule Shift</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreateShift} className="border border-[#d4af37]/40 bg-[#0e0e12] p-5 space-y-4">
          <h3 className="font-serif text-base text-white">New Operational Shift</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300">Shift Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Morning Registration & Accreditation Desk"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300">Location / Station</label>
              <input
                type="text"
                placeholder="e.g. Main Foyer Entrance"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300">Start Time *</label>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300">End Time *</label>
              <input
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300">Capacity / Headcount</label>
              <input
                type="number"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="border border-white/15 px-3 py-1.5 text-xs text-neutral-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#d4af37] px-4 py-1.5 text-xs font-semibold text-black hover:bg-[#e5c158] disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Save Shift'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-500">Loading scheduled shifts…</div>
        ) : shifts.length === 0 ? (
          <div className="border border-white/10 bg-[#0d0d10] py-12 text-center text-xs text-neutral-500">
            No shifts scheduled yet for this department.
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="border border-white/10 bg-[#0d0d10] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">{shift.title}</h4>
                  <span className={`font-mono text-[10px] uppercase ${shift.status === 'open' ? 'text-emerald-400' : 'text-neutral-500'}`}>
                    {shift.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span>{shift.location}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span className="font-mono">
                      {new Date(shift.starts_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(shift.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  <span className="font-mono text-[#d4af37]">
                    Capacity: {shift.capacity}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(shift)}
                  className="border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:border-white/30 hover:text-white"
                >
                  {shift.status === 'open' ? 'Close Shift' : 'Reopen Shift'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteShift(shift.id)}
                  className="border border-rose-500/30 p-1.5 text-rose-400 hover:bg-rose-500/10"
                  title="Delete shift"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
