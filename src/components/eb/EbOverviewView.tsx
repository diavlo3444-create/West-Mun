import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Radio,
  UserCheck,
  ChevronRight,
  Shield,
  ArrowUpRight,
  Phone,
  Mail,
  FileCheck2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type {
  EbTask,
  EbShift,
  EbStation,
  EbAnnouncement,
} from '../../lib/ebOperationsService';

interface EbOverviewViewProps {
  profile: EbMemberProfile;
  tasks: EbTask[];
  shifts: EbShift[];
  stations: EbStation[];
  announcements: EbAnnouncement[];
  onNavigateTab: (tabId: string) => void;
  onAcknowledgeAnnouncement: (id: string) => void;
  onUpdateTaskStatus: (taskId: string, status: 'completed' | 'in_progress') => void;
}

export const EbOverviewView: React.FC<EbOverviewViewProps> = ({
  profile,
  tasks,
  shifts,
  stations,
  announcements,
  onNavigateTab,
  onAcknowledgeAnnouncement,
  onUpdateTaskStatus,
}) => {
  // Compute key stats
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.deadline && new Date(t.deadline).getTime() < Date.now()
  );
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  // Next upcoming shift
  const nextShift = shifts[0] || null;

  // Unacknowledged critical announcement
  const criticalAlert = announcements.find((a) => a.priority === 'critical' && !a.is_acknowledged);

  return (
    <div className="space-y-6">
      {/* Critical Operational Broadcast Banner */}
      {criticalAlert && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/50 bg-gradient-to-r from-rose-950/40 via-black to-[#1a0e0e] p-5 shadow-[0_0_24px_rgba(244,63,94,0.18)] animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/20 text-rose-300">
                <AlertCircle className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-rose-500/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-rose-200 font-bold">
                    Mandatory Acknowledgment
                  </span>
                  <span className="text-xs text-neutral-400">By {criticalAlert.author_name}</span>
                </div>
                <h3 className="mt-1 text-base font-semibold text-white">{criticalAlert.title}</h3>
                <p className="mt-1 text-xs text-neutral-300 max-w-2xl">{criticalAlert.body}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAcknowledgeAnnouncement(criticalAlert.id)}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              Acknowledge Directive
            </button>
          </div>
        </div>
      )}

      {/* Hero Operational Status Bar */}
      <div className="rounded-2xl border border-[#d4af37]/25 bg-gradient-to-r from-[#17150f] via-[#0d0c0e] to-[#08080a] p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Member Overview */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="rounded-full border border-[#d4af37]/35 bg-[#d4af37]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">
                WEST MUN 2027 · Executive Board
              </span>
              <span className="text-xs text-neutral-400">
                Accredited Personnel ID: <span className="font-mono text-neutral-200">WM-EB-27</span>
              </span>
            </div>

            <h1 className="mt-2.5 font-serif text-3xl font-medium tracking-wide text-white sm:text-4xl">
              Welcome back, {profile.name}
            </h1>

            <p className="mt-1.5 text-sm text-neutral-400 max-w-2xl">
              Assigned to{' '}
              <span className="font-semibold text-white capitalize">
                {profile.department.replace(/_/g, ' ')}
              </span>{' '}
              as{' '}
              <span className="font-semibold text-[#d4af37] capitalize">
                {profile.role.replace(/_/g, ' ')}
              </span>
              {profile.section && (
                <>
                  {' '}
                  ({profile.section} section)
                </>
              )}
              . Below is your live operational briefing, shift schedule, and assigned deliverables.
            </p>
          </div>

          {/* KPI Snapshot Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 text-center">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">Tasks Pending</span>
              <p className="mt-1 font-mono text-2xl font-bold text-white">{pendingTasks.length}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 text-center">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">Overdue Items</span>
              <p className={`mt-1 font-mono text-2xl font-bold ${overdueTasks.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {overdueTasks.length}
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/[0.08] p-3.5 text-center">
              <span className="text-[10px] uppercase tracking-wider text-[#d4af37]">Completion Rate</span>
              <p className="mt-1 font-mono text-2xl font-bold text-[#f5d47a]">{completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Core Operational Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Next Shift & Station Card (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/50 p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/15 text-[#f5d47a]">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Next Assigned Shift</h2>
                  <p className="text-[11px] text-neutral-400">Official conference roster assignment</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('schedule')}
                className="flex items-center gap-1 text-xs text-[#d4af37] hover:underline"
              >
                <span>Full Roster</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {nextShift ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-[#d4af37]/30 bg-gradient-to-br from-[#1a170f] to-[#0c0c0e] p-4.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                        Scheduled Station
                      </span>
                      <h3 className="mt-0.5 text-base font-semibold text-white">{nextShift.station_name}</h3>
                    </div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                      Confirmed Shift
                    </span>
                  </div>

                  <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <MapPin className="h-4 w-4 text-[#d4af37] shrink-0" />
                      <span>{nextShift.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-neutral-300">
                      <Clock className="h-4 w-4 text-[#d4af37] shrink-0" />
                      <span>
                        {new Date(nextShift.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' — '}
                        {new Date(nextShift.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' (' + nextShift.shift_date + ')'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-white/[0.06] pt-3 text-xs">
                    <span className="font-medium text-neutral-400">Duties during this shift:</span>
                    <p className="mt-0.5 text-neutral-300 leading-relaxed">{nextShift.responsibilities}</p>
                  </div>
                </div>

                {/* Supervisor & Station Shortcuts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400">Supervisor On Duty</span>
                    <p className="mt-1 font-semibold text-sm text-white">{nextShift.supervisor_name}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">Floor Coordination & Escalations</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateTab('station')}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/40 p-3.5 text-left transition hover:border-[#d4af37]/40 hover:bg-white/[0.02]"
                  >
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400">Station Procedures</span>
                    <span className="flex items-center justify-between text-xs font-semibold text-[#d4af37] mt-1">
                      <span>View Operating Manual</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-neutral-400">
                No active shifts scheduled at this moment. Check back closer to event day.
              </div>
            )}
          </div>

          {/* Quick High-Priority Tasks Card */}
          <div className="rounded-2xl border border-white/10 bg-black/50 p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/15 text-[#f5d47a]">
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Assigned Action Items</h2>
                  <p className="text-[11px] text-neutral-400">Top priority operational deliverables</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('tasks')}
                className="flex items-center gap-1 text-xs text-[#d4af37] hover:underline"
              >
                <span>View All ({tasks.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {tasks.slice(0, 3).map((task) => {
                const isOverdue =
                  task.status !== 'completed' && task.deadline && new Date(task.deadline).getTime() < Date.now();

                return (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-3.5 transition hover:border-white/20"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTaskStatus(task.id, task.status === 'completed' ? 'in_progress' : 'completed')
                        }
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                          task.status === 'completed'
                            ? 'border-[#d4af37] bg-[#d4af37] text-black'
                            : 'border-white/30 hover:border-[#d4af37]'
                        }`}
                        title={task.status === 'completed' ? 'Reopen task' : 'Mark completed'}
                      >
                        {task.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`truncate text-xs font-semibold ${
                              task.status === 'completed' ? 'line-through text-neutral-500' : 'text-white'
                            }`}
                          >
                            {task.title}
                          </h4>
                          <span
                            className={`rounded px-1.5 py-0.2 font-mono text-[9px] uppercase ${
                              task.priority === 'urgent'
                                ? 'bg-rose-500/20 text-rose-300'
                                : task.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-white/10 text-neutral-400'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <p className="mt-0.5 truncate text-[11px] text-neutral-400">{task.description}</p>

                        <div className="mt-2 flex items-center gap-3 text-[10px] text-neutral-500">
                          {task.deadline && (
                            <span className={isOverdue ? 'text-rose-400 font-semibold' : ''}>
                              Due: {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          <span>•</span>
                          <span>By: {task.assigned_by_name}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigateTab('tasks')}
                      className="text-neutral-500 hover:text-white shrink-0 p-1"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Reporting Supervisor & Station Directory (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Supervisor Information Card */}
          <div className="rounded-2xl border border-[#d4af37]/30 bg-gradient-to-b from-[#18150f] via-[#0d0c0e] to-[#070707] p-5 sm:p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/15 text-[#f5d47a]">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                  Chain of Command
                </span>
                <h3 className="text-sm font-semibold text-white">Your Reporting Supervisor</h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-neutral-300 leading-relaxed">
                You report directly to your assigned Directorate Head for task assignments, shift coordination, and emergency escalations.
              </p>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2.5">
                {profile.reportingHeadName ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-white">{profile.reportingHeadName}</span>
                      <span className="rounded bg-[#d4af37]/15 px-2 py-0.5 text-[9px] font-mono text-[#d4af37] uppercase">Assigned Head</span>
                    </div>
                    {profile.reportingHeadDepartment && (
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                        {profile.reportingHeadDepartment.replace(/_/g, ' ')}{profile.reportingHeadSection ? ` · ${profile.reportingHeadSection} section` : ''}
                      </p>
                    )}
                    {profile.reportingHeadEmail ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                        <a href={`mailto:${profile.reportingHeadEmail}`} className="break-all font-mono text-[11px] text-neutral-300 hover:text-[#f5d47a]">
                          {profile.reportingHeadEmail}
                        </a>
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-400">Contact details have not been provided.</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-white">No reporting head linked</span>
                      <span className="rounded bg-amber-400/10 px-2 py-0.5 text-[9px] font-mono text-amber-300 uppercase">Needs review</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-neutral-400">
                      The head selected during sign-up could not be matched to an active department-head record. No contact information is shown rather than displaying incorrect details.
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('hierarchy')}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/35 bg-[#d4af37]/10 py-2.5 text-xs font-semibold text-[#f5d47a] transition hover:bg-[#d4af37]/20"
              >
                <span>View Department Org Hierarchy</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Announcements Snippet */}
          <div className="rounded-2xl border border-white/10 bg-black/50 p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                Recent Broadcasts ({announcements.length})
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('announcements')}
                className="text-xs text-[#d4af37] hover:underline"
              >
                All Bulletins
              </button>
            </div>

            <div className="mt-3 divide-y divide-white/[0.06] text-xs">
              {announcements.slice(0, 3).map((a) => (
                <div key={a.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-medium text-white truncate">{a.title}</h4>
                    <span className="font-mono text-[9px] text-neutral-500 shrink-0">
                      {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-400">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
