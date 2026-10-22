import React from 'react';
import {
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Building2,
  AlertCircle,
  TrendingUp,
  Shield,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type {
  EbTask,
  EbShift,
  EbStation,
  EbAnnouncement,
} from '../../lib/ebOperationsService';

interface EbOversightViewProps {
  profile: EbMemberProfile;
  tasks: EbTask[];
  shifts: EbShift[];
  stations: EbStation[];
  announcements: EbAnnouncement[];
  onNavigateTab: (tabId: string) => void;
}

export const EbOversightView: React.FC<EbOversightViewProps> = ({
  profile,
  tasks,
  shifts,
  stations,
  announcements,
  onNavigateTab,
}) => {
  // Real calculated metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const notStartedTasks = tasks.filter((t) => t.status === 'not_started');
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.deadline && new Date(t.deadline).getTime() < Date.now()
  );

  const completionPct = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Unassigned stations check
  const scheduledStationNames = new Set(shifts.map((s) => s.station_name.toLowerCase()));
  const unassignedStations = stations.filter(
    (st) => !scheduledStationNames.has(st.name.toLowerCase())
  );

  // Critical announcements requiring acknowledgement
  const criticalAnnouncements = announcements.filter((a) => a.requires_acknowledgement);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#d4af37]/20 px-2.5 py-0.5 font-mono text-[10px] uppercase font-bold text-[#f5d47a]">
            Directorate Oversight
          </span>
          <span className="text-xs text-neutral-400 capitalize">
            {profile.department.replace(/_/g, ' ')} Directorate
          </span>
        </div>
        <h2 className="mt-1 font-serif text-2xl font-normal text-white">Operational Command & Staffing Health</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Real-time accountability metrics, station coverage, critical blockers, and staffing gap analysis.
        </p>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-mono uppercase text-[10px] tracking-wider">Task Completion</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-white">{completionPct}%</span>
            <span className="text-xs text-neutral-400">
              ({completedTasks.length}/{totalTasks})
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-mono uppercase text-[10px] tracking-wider">Active Blockers</span>
            <AlertTriangle className={`h-4 w-4 ${blockedTasks.length > 0 ? 'text-rose-400' : 'text-neutral-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-mono text-3xl font-bold ${
                blockedTasks.length > 0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {blockedTasks.length}
            </span>
            <span className="text-xs text-neutral-400">items need intervention</span>
          </div>
          <p className="text-[10px] text-neutral-500">
            {blockedTasks.length > 0 ? 'Immediate Directorate action required' : 'Zero blockers reported'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-mono uppercase text-[10px] tracking-wider">Overdue Items</span>
            <Clock className={`h-4 w-4 ${overdueTasks.length > 0 ? 'text-amber-400' : 'text-neutral-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-mono text-3xl font-bold ${
                overdueTasks.length > 0 ? 'text-amber-400' : 'text-white'
              }`}
            >
              {overdueTasks.length}
            </span>
            <span className="text-xs text-neutral-400">past deadline</span>
          </div>
          <p className="text-[10px] text-neutral-500">
            {overdueTasks.length > 0 ? 'Review assigned timelines' : 'All deliverables on schedule'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-mono uppercase text-[10px] tracking-wider">Station Coverage</span>
            <Building2 className="h-4 w-4 text-[#d4af37]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-white">
              {stations.length - unassignedStations.length}/{stations.length}
            </span>
            <span className="text-xs text-neutral-400">active</span>
          </div>
          <p className="text-[10px] text-neutral-500">
            {unassignedStations.length > 0 ? `${unassignedStations.length} unassigned station(s)` : 'Full coverage across venue'}
          </p>
        </div>
      </div>

      {/* Deep Dive Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blocked Items Requiring Head Intervention */}
        <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 via-black to-[#08080a] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
                Blocked Deliverables ({blockedTasks.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('tasks')}
              className="text-xs text-[#d4af37] hover:underline"
            >
              Task Board
            </button>
          </div>

          <div className="space-y-2.5">
            {blockedTasks.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-400">
                No blocked tasks at this moment. The team is executing smoothly.
              </p>
            ) : (
              blockedTasks.map((t) => (
                <div key={t.id} className="rounded-xl border border-rose-500/30 bg-black/50 p-3.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white">{t.title}</h4>
                    <span className="font-mono text-[10px] text-neutral-400">By {t.assigned_to_name}</span>
                  </div>
                  <p className="text-[11px] text-rose-200 bg-rose-950/40 p-2 rounded-lg border border-rose-500/20">
                    Reason: {t.blocker_reason || 'Staff member flagged operational roadblock.'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Staffing & Station Gap Warnings */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#d4af37]" />
              <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
                Station Staffing Roster Gaps ({unassignedStations.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('station')}
              className="text-xs text-[#d4af37] hover:underline"
            >
              Station Manual
            </button>
          </div>

          <div className="space-y-2.5">
            {unassignedStations.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-400">
                All venue stations have active shifts and assigned personnel.
              </p>
            ) : (
              unassignedStations.map((st) => (
                <div key={st.id} className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">{st.name}</h4>
                    <p className="text-[11px] text-neutral-300">{st.location}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('schedule')}
                    className="rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1 text-xs text-[#f5d47a] hover:bg-[#d4af37]/20"
                  >
                    Assign Roster
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
