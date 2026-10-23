import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ScanLine,
  QrCode,
  Users,
  ChevronRight,
  Building2,
  FileCheck2,
  ArrowUpRight,
  Mail,
  UserCheck,
  Radio,
  Search,
} from 'lucide-react';
import type { EbMemberProfile } from '../../../pages/EbPortal';
import type {
  EbTask,
  EbShift,
  EbStation,
  EbAnnouncement,
  TaskPriority,
} from '../../../lib/ebOperationsService';

interface CoHeadCommandViewProps {
  profile: EbMemberProfile;
  tasks: EbTask[];
  shifts: EbShift[];
  stations: EbStation[];
  announcements: EbAnnouncement[];
  onNavigateTab: (tabId: string) => void;
  onAcknowledgeAnnouncement: (id: string) => void;
  onUpdateTaskStatus: (taskId: string, status: 'completed' | 'in_progress') => void;
}

export const CoHeadCommandView: React.FC<CoHeadCommandViewProps> = ({
  profile,
  tasks,
  shifts,
  stations,
  announcements,
  onNavigateTab,
  onAcknowledgeAnnouncement,
  onUpdateTaskStatus,
}) => {
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'all' | TaskPriority>('all');

  const deptLower = (profile.department || '').toLowerCase();
  const isSecurity = deptLower.includes('security') || deptLower.includes('protocol');
  const canScan = profile.isAdmin || isSecurity || profile.role === 'co_head';

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.deadline && new Date(t.deadline).getTime() < Date.now()
  );
  const nextShift = shifts[0] || null;
  const criticalAlert = announcements.find((a) => a.priority === 'critical' && !a.is_acknowledged);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.assigned_to_name.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.station_name.toLowerCase().includes(taskSearch.toLowerCase());
      const matchPriority = taskPriorityFilter === 'all' || t.priority === taskPriorityFilter;
      return matchSearch && matchPriority;
    });
  }, [tasks, taskSearch, taskPriorityFilter]);

  return (
    <div className="space-y-6">
      {/* Critical Operational Directive Banner if unacknowledged */}
      {criticalAlert && (
        <div className="border border-rose-500/40 bg-rose-950/20 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-wider text-rose-300 font-bold">
                  Mandatory Directive
                </span>
                <span className="text-neutral-500">·</span>
                <span className="text-xs text-neutral-400">Issued by {criticalAlert.author_name}</span>
              </div>
              <h3 className="text-sm font-semibold text-white">{criticalAlert.title}</h3>
              <p className="text-xs text-neutral-300 max-w-2xl">{criticalAlert.body}</p>
            </div>

            <button
              type="button"
              onClick={() => onAcknowledgeAnnouncement(criticalAlert.id)}
              className="shrink-0 flex items-center gap-2 bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Acknowledge</span>
            </button>
          </div>
        </div>
      )}

      {/* Co-Head Executive Command Bar */}
      <section className="relative overflow-hidden border border-[#d4af37]/30 bg-[#0a0a0d] p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">
                Executive Command Center
              </span>
              <span className="text-neutral-600">/</span>
              <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                {profile.department.replace(/_/g, ' ')} {profile.section ? `· ${profile.section}` : ''}
              </span>
              <span className="text-neutral-600">/</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                OPERATIONAL READINESS: ACTIVE
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal tracking-wide text-white">
              Department Operations Briefing
            </h1>

            <p className="text-sm leading-relaxed text-neutral-300">
              Co-Head oversight console for <span className="text-white font-medium">{profile.name}</span>.
              Monitoring department station readiness, assigned shift duties, and operational action deliverables across the summit floor.
            </p>
          </div>

          {/* Quick-action Command Cluster */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {canScan && (
              <a
                href="/scanner"
                className="flex items-center gap-2.5 bg-[#d4af37] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#e5c158] active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.25)]"
              >
                <ScanLine className="h-4 w-4" />
                <span>Launch QR Scanner</span>
                <span className="border-l border-black/20 pl-2 font-mono text-[10px] uppercase tracking-wider">
                  Verified
                </span>
              </a>
            )}

            <a
              href="/pass"
              className="flex items-center gap-2 border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-neutral-300 transition hover:border-white/30 hover:text-white"
            >
              <QrCode className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>Pass</span>
            </a>
          </div>
        </div>

        {/* Telemetry Strip - Clean, Zero-Pill Typography */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Monitored Stations
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-light text-white">{stations.length}</span>
              <span className="text-xs text-neutral-400">active</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Pending Deliverables
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-light text-white">{pendingTasks.length}</span>
              <span className="text-xs text-neutral-400">of {tasks.length}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Overdue Flags
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`font-mono text-2xl font-light ${overdueTasks.length > 0 ? 'text-amber-400' : 'text-neutral-400'}`}>
                {overdueTasks.length}
              </span>
              <span className="text-xs text-neutral-400">requiring action</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Roster Assignments
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-light text-[#f5d47a]">{shifts.length}</span>
              <span className="text-xs text-neutral-400">shifts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Command Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scheduled Shift & Department Tasks (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Next Shift Assignment */}
          <div className="border border-white/10 bg-[#0d0d10] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#d4af37]" />
                <h2 className="font-serif text-base text-white">Next Assigned Shift</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('schedule')}
                className="text-xs text-[#d4af37] hover:underline flex items-center gap-1"
              >
                <span>Full Schedule</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {nextShift ? (
              <div className="mt-4 border border-[#d4af37]/30 bg-black/40 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                      Station Post
                    </span>
                    <h3 className="text-base font-semibold text-white">{nextShift.station_name}</h3>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                    Confirmed Roster
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <MapPin className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span>{nextShift.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Clock className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span className="font-mono">
                      {new Date(nextShift.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' — '}
                      {new Date(nextShift.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {nextShift.responsibilities && (
                  <div className="pt-2 border-t border-white/5 text-xs">
                    <span className="text-neutral-400 font-mono text-[10px] uppercase">Responsibilities:</span>
                    <p className="mt-0.5 text-neutral-300 leading-relaxed">{nextShift.responsibilities}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-neutral-500">
                No active shifts scheduled at this moment. Check back closer to event day.
              </div>
            )}
          </div>

          {/* Department Tasks & Action Items */}
          <div className="border border-white/10 bg-[#0d0d10] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="font-serif text-base text-white">Department Deliverables Matrix</h2>
                <p className="text-xs text-neutral-400">Live operational action items</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search…"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    className="bg-black/60 border border-white/10 pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37] w-32"
                  />
                </div>

                <select
                  value={taskPriorityFilter}
                  onChange={(e) => setTaskPriorityFilter(e.target.value as any)}
                  className="bg-black/60 border border-white/10 px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-[#d4af37]"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Task List */}
            <div className="mt-4 space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="py-8 text-center text-neutral-500 text-xs">
                  No deliverables match the selected filter.
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const isDone = task.status === 'completed';

                  return (
                    <div
                      key={task.id}
                      className={`border p-3.5 transition ${
                        isDone
                          ? 'border-white/5 bg-black/30 opacity-70'
                          : 'border-white/10 bg-black/50 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={`font-mono text-[10px] uppercase tracking-wider ${
                                task.priority === 'urgent'
                                  ? 'text-rose-400 font-semibold'
                                  : task.priority === 'high'
                                  ? 'text-amber-400'
                                  : 'text-neutral-400'
                              }`}
                            >
                              {task.priority}
                            </span>
                            <span className="text-neutral-600">·</span>
                            <span className="font-mono text-[11px] text-[#d4af37]">
                              {task.station_name || 'Station HQ'}
                            </span>
                            <span className="text-neutral-600">·</span>
                            <span className="text-neutral-400 text-xs truncate">
                              Assigned: {task.assigned_to_name}
                            </span>
                          </div>

                          <h3 className={`text-xs font-semibold ${isDone ? 'line-through text-neutral-500' : 'text-white'}`}>
                            {task.title}
                          </h3>

                          {task.description && (
                            <p className="text-[11px] text-neutral-400 line-clamp-2">{task.description}</p>
                          )}

                          {task.deadline && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-neutral-500">
                              <Clock className="h-3 w-3" />
                              <span>Due: {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </div>

                        {/* Status Toggle Action */}
                        <button
                          type="button"
                          onClick={() => onUpdateTaskStatus(task.id, isDone ? 'in_progress' : 'completed')}
                          className={`shrink-0 border px-2.5 py-1 text-[11px] font-mono transition ${
                            isDone
                              ? 'border-white/10 bg-white/5 text-neutral-500'
                              : 'border-[#d4af37]/40 text-[#f5d47a] hover:bg-[#d4af37]/10'
                          }`}
                        >
                          {isDone ? 'Done' : 'Complete'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Stations, Staffing & Direct Supervisor (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Station Roster & Floor Coverage */}
          <div className="border border-white/10 bg-[#0d0d10] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#d4af37]" />
                <h2 className="font-serif text-base text-white">Floor Stations & Directory</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('station')}
                className="text-xs text-[#d4af37] hover:underline flex items-center gap-1"
              >
                <span>Full Directory</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {stations.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-500">No stations registered yet.</p>
              ) : (
                stations.slice(0, 3).map((station) => (
                  <div key={station.id} className="border border-white/[0.07] bg-black/40 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-white">{station.name}</h4>
                      <span className="font-mono text-[10px] text-neutral-400">{station.location}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-1">{station.purpose}</p>
                    <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                      <span>Supervisor: <span className="text-neutral-200">{station.supervisor_name}</span></span>
                      {station.supervisor_contact && <span>{station.supervisor_contact}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Department Head Supervisor Link */}
          {profile.reportingHeadName && (
            <div className="border border-[#d4af37]/25 bg-[#0a0a0d] p-5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                Reporting Officer & Department Head
              </span>
              <h3 className="mt-1 font-serif text-base text-white">{profile.reportingHeadName}</h3>
              <p className="text-xs text-neutral-400">
                Department Head · {profile.reportingHeadDepartment || profile.department}
              </p>

              {profile.reportingHeadEmail && (
                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-neutral-300 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
                  <a href={`mailto:${profile.reportingHeadEmail}`} className="hover:text-white font-mono text-[11px]">
                    {profile.reportingHeadEmail}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Quick Directive / Announcements */}
          <div className="border border-white/10 bg-[#0d0d10] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#d4af37]" />
                <h2 className="font-serif text-base text-white">Directives & Bulletins</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('announcements')}
                className="text-xs text-[#d4af37] hover:underline"
              >
                View all
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {announcements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="border border-white/5 bg-black/30 p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#d4af37] uppercase">{ann.priority}</span>
                    <span className="text-neutral-500">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-medium text-white">{ann.title}</h4>
                  <p className="text-[11px] text-neutral-400 line-clamp-2">{ann.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
