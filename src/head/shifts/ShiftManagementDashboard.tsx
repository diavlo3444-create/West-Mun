import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
  RefreshCw,
  Clock,
  Users,
  Shield,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { DepartmentKey, SectionKey } from '../departments';
import {
  listDepartmentShifts,
  type WmShift,
  type WmTeamGroup,
} from '../services/operationsStore';
import { ShiftCalendarView } from './ShiftCalendarView';
import { ShiftListView } from './ShiftListView';
import { ShiftCreationModal } from './ShiftCreationModal';
import { ShiftDetailsDrawer } from './ShiftDetailsDrawer';
import { ShiftDuplicateModal } from './ShiftDuplicateModal';
import { formatDateReadable } from './ShiftDatePicker';
import { formatTime12h } from './ShiftTimePicker';

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
  const [notice, setNotice] = useState('');

  // Primary view mode: 'calendar' or 'list'
  const [mainView, setMainView] = useState<'calendar' | 'list'>('calendar');

  // Modals & Drawers state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createInitialDate, setCreateInitialDate] = useState<string | undefined>(undefined);
  const [activeInitialGroup, setActiveInitialGroup] = useState<WmTeamGroup | null>(initialGroup || null);

  useEffect(() => {
    if (initialGroup) {
      setActiveInitialGroup(initialGroup);
      setIsCreateModalOpen(true);
    }
  }, [initialGroup]);

  const [activeShiftForDetails, setActiveShiftForDetails] = useState<WmShift | null>(null);
  const [shiftToDuplicate, setShiftToDuplicate] = useState<WmShift | null>(null);

  // Load shifts from Supabase
  const loadShifts = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await listDepartmentShifts(department, section, testToken);
    if (res.ok && res.data) {
      setShifts(res.data);
    } else {
      setError(res.error || 'Failed to load shifts.');
    }
    setLoading(false);
  }, [department, section, testToken]);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  // Quick stats calculations
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const stats = useMemo(() => {
    const total = shifts.length;
    const upcoming = shifts.filter((s) => new Date(s.starts_at).getTime() >= now.getTime()).length;
    const totalAssigned = shifts.reduce((acc, s) => acc + (s.assigned_count ?? 0), 0);
    const gaps = shifts.reduce((acc, s) => acc + Math.max(0, s.capacity - (s.assigned_count ?? 0)), 0);

    return { total, upcoming, totalAssigned, gaps };
  }, [shifts, now]);

  // Upcoming shifts for quick summary strip (next 3 shifts)
  const upcomingShifts = useMemo(() => {
    return shifts
      .filter((s) => new Date(s.starts_at).getTime() >= now.getTime() - 3600000)
      .slice(0, 3);
  }, [shifts, now]);

  // Callbacks from children
  const handleShiftCreated = (newShift: WmShift) => {
    setNotice(`Shift "${newShift.title}" successfully created and saved.`);
    setShifts((prev) => [...prev, newShift].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
  };

  const handleShiftUpdated = (updatedShift: WmShift) => {
    setNotice(`Shift "${updatedShift.title}" updated.`);
    setShifts((prev) => prev.map((s) => (s.id === updatedShift.id ? updatedShift : s)));
    if (activeShiftForDetails?.id === updatedShift.id) {
      setActiveShiftForDetails(updatedShift);
    }
  };

  const handleShiftDeleted = (deletedId: string) => {
    setNotice('Shift deleted from database.');
    setShifts((prev) => prev.filter((s) => s.id !== deletedId));
  };

  const handleShiftDuplicated = (clonedShift: WmShift) => {
    setNotice(`Shift duplicated successfully as "${clonedShift.title}".`);
    setShifts((prev) => [...prev, clonedShift].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
  };

  const handleOpenCreateWithDate = (dateStr?: string) => {
    setCreateInitialDate(dateStr);
    setIsCreateModalOpen(true);
  };

  return (
    <section className="space-y-5 text-white">
      {/* Top Banner / Dashboard Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[.22em] text-[#d4af37]">
              WEST MUN 2027 · Operations Scheduling
            </span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Shift Management & Coverage
          </h1>
          <p className="mt-1 text-xs text-neutral-400 max-w-2xl">
            Schedule operational shifts on the interactive calendar, configure staffing capacity,
            and assign both Co-Heads and team members with individual stations and supervisor designations.
          </p>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Calendar vs List Mode */}
          <div className="inline-flex rounded-xl border border-white/10 bg-[#111116] p-1 text-xs">
            <button
              type="button"
              onClick={() => setMainView('calendar')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                mainView === 'calendar'
                  ? 'bg-[#d4af37] text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CalendarIcon size={14} /> Calendar View
            </button>
            <button
              type="button"
              onClick={() => setMainView('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                mainView === 'list'
                  ? 'bg-[#d4af37] text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ListIcon size={14} /> List View
            </button>
          </div>

          <button
            type="button"
            onClick={() => void loadShifts()}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-[#111116] p-2 text-neutral-400 hover:border-white/20 hover:text-white transition-all disabled:opacity-50"
            title="Refresh shifts"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreateWithDate(todayStr)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b89628] px-4 py-2 text-xs font-bold text-black shadow-[0_0_18px_rgba(212,175,55,0.25)] hover:brightness-110 transition-all"
          >
            <Plus size={15} /> Create Shift
          </button>
        </div>
      </div>

      {/* Notice & Error Alerts */}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3.5 text-xs text-red-200">
          <AlertCircle size={16} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice('')} className="text-emerald-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#0e0e14] p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Total Shifts
          </span>
          <div className="mt-1 font-serif text-2xl font-bold text-white">{stats.total}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0e0e14] p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Upcoming Shifts
          </span>
          <div className="mt-1 font-serif text-2xl font-bold text-[#f1d98c]">{stats.upcoming}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0e0e14] p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Total Staff Assigned
          </span>
          <div className="mt-1 font-serif text-2xl font-bold text-white">{stats.totalAssigned}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0e0e14] p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Coverage Gaps
          </span>
          <div className={`mt-1 font-serif text-2xl font-bold ${stats.gaps > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {stats.gaps}
          </div>
        </div>
      </div>

      {/* Upcoming Shifts Summary Strip */}
      {upcomingShifts.length > 0 && (
        <div className="rounded-xl border border-[#d4af37]/20 bg-[#12121a] p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
              <Sparkles size={13} /> Upcoming Scheduled Shifts
            </h4>
            <button
              type="button"
              onClick={() => setMainView('list')}
              className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
            >
              View all <ArrowRight size={11} />
            </button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            {upcomingShifts.map((s) => {
              const sDate = s.starts_at.slice(0, 10);
              const sTime = s.starts_at.slice(11, 16);
              const eTime = s.ends_at.slice(11, 16);

              return (
                <div
                  key={s.id}
                  onClick={() => setActiveShiftForDetails(s)}
                  className="rounded-lg border border-white/10 bg-[#161622] p-3 hover:border-[#d4af37]/50 transition-all cursor-pointer"
                >
                  <div className="font-semibold text-xs text-white truncate">{s.title}</div>
                  <div className="mt-1 text-[11px] text-neutral-400">
                    {formatDateReadable(sDate)} · {formatTime12h(sTime)}–{formatTime12h(eTime)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500 border-t border-white/5 pt-1.5">
                    <span className="text-[#f1d98c] font-medium">{s.assigned_count ?? 0}/{s.capacity} staffed</span>
                    <span className="truncate max-w-[100px]">{s.location || 'Venue'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main View Display: Calendar or List */}
      {mainView === 'calendar' ? (
        <ShiftCalendarView
          shifts={shifts}
          onSelectDate={(dateStr) => {
            setCreateInitialDate(dateStr);
            setActiveInitialGroup(null);
            setIsCreateModalOpen(true);
          }}
          onOpenCreate={handleOpenCreateWithDate}
          onSelectShift={(shift) => setActiveShiftForDetails(shift)}
        />
      ) : (
        <ShiftListView
          shifts={shifts}
          onSelectShift={(shift) => setActiveShiftForDetails(shift)}
          onEditShift={(shift) => setActiveShiftForDetails(shift)}
          onDuplicateShift={(shift) => setShiftToDuplicate(shift)}
          onDeleteShift={(shift) => {
            setActiveShiftForDetails(shift);
          }}
          onOpenCreate={() => handleOpenCreateWithDate(todayStr)}
        />
      )}

      {/* Shift Creation Modal */}
      <ShiftCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setActiveInitialGroup(null);
        }}
        department={department}
        section={section}
        testToken={testToken}
        initialDate={createInitialDate}
        initialGroup={activeInitialGroup}
        onSuccess={handleShiftCreated}
      />

      {/* Shift Details & Roster Drawer */}
      <ShiftDetailsDrawer
        shift={activeShiftForDetails}
        isOpen={Boolean(activeShiftForDetails)}
        onClose={() => setActiveShiftForDetails(null)}
        department={department}
        section={section}
        testToken={testToken}
        onShiftUpdated={handleShiftUpdated}
        onShiftDeleted={handleShiftDeleted}
        onDuplicate={(shift) => {
          setActiveShiftForDetails(null);
          setShiftToDuplicate(shift);
        }}
        onEdit={(shift) => {
          // Open details where fields can be edited/updated
          setActiveShiftForDetails(shift);
        }}
      />

      {/* Shift Duplication Modal */}
      <ShiftDuplicateModal
        shift={shiftToDuplicate}
        isOpen={Boolean(shiftToDuplicate)}
        onClose={() => setShiftToDuplicate(null)}
        testToken={testToken}
        onSuccess={handleShiftDuplicated}
      />
    </section>
  );
};
