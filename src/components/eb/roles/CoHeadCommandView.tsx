import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ScanLine,
  Users,
  ChevronRight,
  Plus,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck2,
  ArrowUpRight,
  ExternalLink,
  Search,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  Phone,
  Mail,
  UserCheck,
  Radio,
  RefreshCw,
} from 'lucide-react';
import type { EbMemberProfile } from '../../../pages/EbPortal';
import type {
  EbTask,
  EbShift,
  EbStation,
  EbAnnouncement,
  EbIncident,
  EbShiftSwap,
  TaskPriority,
  TaskStatus,
} from '../../../lib/ebOperationsService';

interface CoHeadCommandViewProps {
  profile: EbMemberProfile;
  tasks: EbTask[];
  shifts: EbShift[];
  stations: EbStation[];
  announcements: EbAnnouncement[];
  incidents: EbIncident[];
  swaps: EbShiftSwap[];
  onNavigateTab: (tabId: string) => void;
  onAcknowledgeAnnouncement: (id: string) => void;
  onUpdateTaskStatus: (taskId: string, status: 'completed' | 'in_progress') => void;
  onToggleTaskChecklist?: (taskId: string, itemId: string) => void;
  onCreateTask?: (task: any) => Promise<void> | void;
  onResolveIncident?: (id: string, notes?: string) => Promise<void> | void;
  onReviewSwap?: (swapId: string, status: 'approved' | 'rejected', notes: string) => Promise<void> | void;
}

export const CoHeadCommandView: React.FC<CoHeadCommandViewProps> = ({
  profile,
  tasks,
  shifts,
  stations,
  announcements,
  incidents,
  swaps,
  onNavigateTab,
  onAcknowledgeAnnouncement,
  onUpdateTaskStatus,
  onToggleTaskChecklist,
  onCreateTask,
  onResolveIncident,
  onReviewSwap,
}) => {
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('normal');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskStation, setNewTaskStation] = useState('');
  const [newTaskChecklistItems, setNewTaskChecklistItems] = useState<string>('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Is this co-head authorized for security scanning?
  const deptLower = (profile.department || '').toLowerCase();
  const isSecurity = deptLower.includes('security') || deptLower.includes('protocol');
  const canScan = profile.isAdmin || isSecurity || profile.role === 'co_head';

  // Metrics calculation
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed');
  const pendingSwaps = swaps.filter((s) => s.status === 'pending');
  const openIncidents = incidents.filter((i) => i.status !== 'resolved');

  // Filter tasks
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

  const handleCreateNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !onCreateTask) return;
    setCreatingTask(true);
    try {
      const items = newTaskChecklistItems
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          text,
          completed: false,
        }));

      await onCreateTask({
        department: profile.department,
        section: profile.section,
        assigned_to_user_id: null,
        assigned_to_name: newTaskAssignee.trim() || 'Department EB Team',
        assigned_by_name: `${profile.name} (Co-Head)`,
        title: newTaskTitle.trim(),
        description: `Operational task issued by ${profile.name}`,
        priority: newTaskPriority,
        status: 'not_started',
        deadline: newTaskDeadline || null,
        station_name: newTaskStation.trim() || (stations[0]?.name || 'Department HQ'),
        checklist: items,
        completion_note: '',
        blocker_reason: '',
        reference_links: [],
      });

      setNewTaskTitle('');
      setNewTaskAssignee('');
      setNewTaskDeadline('');
      setNewTaskStation('');
      setNewTaskChecklistItems('');
      setShowCreateTaskModal(false);
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <div className="space-y-6">
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
              Supervising floor readiness, operational checklists, station staffing, and security coordination across the summit floor.
            </p>
          </div>

          {/* Quick-action Command Cluster */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {canScan && (
              <a
                href="/scanner"
                className="flex items-center gap-2.5 bg-[#d4af37] px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-[#e5c158] active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.25)]"
              >
                <ScanLine className="h-4 w-4" />
                <span>Launch QR Scanner</span>
                <span className="border-l border-black/20 pl-2 font-mono text-[10px] uppercase tracking-wider">
                  Verified
                </span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowCreateTaskModal(true)}
              className="flex items-center gap-2 border border-white/20 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white transition hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10"
            >
              <Plus className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>Dispatch Task</span>
            </button>

            <a
              href="/pass"
              className="flex items-center gap-2 border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs text-neutral-300 transition hover:border-white/30 hover:text-white"
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
              Active Stations
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-light text-white">{stations.length}</span>
              <span className="text-xs text-neutral-400">monitored</span>
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
              Urgent Flags
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`font-mono text-2xl font-light ${urgentTasks.length > 0 ? 'text-amber-400' : 'text-neutral-400'}`}>
                {urgentTasks.length}
              </span>
              <span className="text-xs text-neutral-400">high priority</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Staffing Coverage
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-light text-[#f5d47a]">{shifts.length}</span>
              <span className="text-xs text-neutral-400">active rosters</span>
            </div>
          </div>
        </div>
      </section>

      {/* Critical Alerts & Escalation Center */}
      {(openIncidents.length > 0 || pendingSwaps.length > 0) && (
        <section className="border border-amber-500/40 bg-amber-950/15 p-5">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-amber-200">
                Operational Triage Queue ({openIncidents.length + pendingSwaps.length} Action Items)
              </h2>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono">Requires Co-Head Sign-off</span>
          </div>

          <div className="mt-4 space-y-3">
            {openIncidents.map((incident) => (
              <div
                key={incident.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-amber-500/20 bg-black/60 p-3.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-rose-400">
                      INCIDENT · {incident.severity}
                    </span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-xs text-neutral-400">{incident.location || 'Station Floor'}</span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-xs text-neutral-400">Reported by {incident.reporter_name}</span>
                  </div>
                  <p className="text-sm text-white font-medium">{incident.description}</p>
                </div>

                {onResolveIncident && (
                  <button
                    type="button"
                    onClick={() => onResolveIncident(incident.id)}
                    className="shrink-0 border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            ))}

            {pendingSwaps.map((swap) => (
              <div
                key={swap.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/10 bg-black/60 p-3.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                      SHIFT SWAP REQUEST
                    </span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-xs text-neutral-300">{swap.requester_name}</span>
                  </div>
                  <p className="text-xs text-neutral-300">{swap.reason || 'No reason specified'}</p>
                </div>

                {onReviewSwap && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onReviewSwap(swap.id, 'approved', 'Approved by Co-Head')}
                      className="border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onReviewSwap(swap.id, 'rejected', 'Declined by Co-Head')}
                      className="border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Command Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Department Tasks & Delegations (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="border border-white/10 bg-[#0d0d10] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="font-serif text-lg text-white">Department Task Matrix</h2>
                <p className="text-xs text-neutral-400">Live assignments, progress tracking & checklist completion</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tasks…"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    className="bg-black/60 border border-white/10 pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37] w-32 sm:w-40"
                  />
                </div>

                <select
                  value={taskPriorityFilter}
                  onChange={(e) => setTaskPriorityFilter(e.target.value as any)}
                  className="bg-black/60 border border-white/10 px-2.5 py-1 text-xs text-neutral-300 focus:outline-none focus:border-[#d4af37]"
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
                <div className="py-12 text-center text-neutral-500">
                  <p className="text-sm">No tasks matching the selected filters.</p>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const completedItems = (task.checklist || []).filter((i) => i.completed).length;
                  const totalItems = (task.checklist || []).length;
                  const isDone = task.status === 'completed';

                  return (
                    <div
                      key={task.id}
                      className={`border p-4 transition ${
                        isDone
                          ? 'border-white/5 bg-black/30 opacity-70'
                          : 'border-white/10 bg-black/50 hover:border-white/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
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
                            <span className="text-neutral-400">
                              Assigned to: <strong className="text-neutral-200">{task.assigned_to_name}</strong>
                            </span>
                          </div>

                          <h3 className={`text-sm font-medium ${isDone ? 'line-through text-neutral-400' : 'text-white'}`}>
                            {task.title}
                          </h3>

                          {task.description && (
                            <p className="text-xs text-neutral-400 line-clamp-2">{task.description}</p>
                          )}

                          {/* Checklist items */}
                          {totalItems > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                                <span>Checklist Progress</span>
                                <span>{completedItems}/{totalItems} items</span>
                              </div>
                              <div className="space-y-1">
                                {task.checklist.map((item) => (
                                  <label
                                    key={item.id}
                                    className="flex items-center gap-2 text-xs text-neutral-300 hover:text-white cursor-pointer select-none"
                                    onClick={() => onToggleTaskChecklist?.(task.id, item.id)}
                                  >
                                    {item.completed ? (
                                      <CheckSquare className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                                    ) : (
                                      <Square className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                                    )}
                                    <span className={item.completed ? 'line-through text-neutral-500' : ''}>
                                      {item.text}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Status Toggle Action */}
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateTaskStatus(task.id, isDone ? 'in_progress' : 'completed')}
                            className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs transition ${
                              isDone
                                ? 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                                : 'border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f5d47a] hover:bg-[#d4af37]/20'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{isDone ? 'Reopen' : 'Mark Done'}</span>
                          </button>
                        </div>
                      </div>

                      {task.deadline && (
                        <div className="mt-3 flex items-center gap-1 text-[11px] font-mono text-neutral-500">
                          <Clock className="h-3 w-3" />
                          <span>Deadline: {new Date(task.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
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
                <h2 className="font-serif text-base text-white">Floor Stations & Staffing</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('station')}
                className="text-xs text-[#d4af37] hover:underline flex items-center gap-1"
              >
                <span>Full Roster</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {stations.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-500">No stations registered yet.</p>
              ) : (
                stations.slice(0, 4).map((station) => (
                  <div key={station.id} className="border border-white/[0.07] bg-black/40 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-white">{station.name}</h4>
                      <span className="font-mono text-[10px] text-neutral-400">{station.location}</span>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-1">{station.purpose}</p>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Supervisor: <span className="text-neutral-200">{station.supervisor_name}</span></span>
                      {station.supervisor_contact && (
                        <span className="font-mono text-neutral-400">{station.supervisor_contact}</span>
                      )}
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
              <h3 className="mt-1 font-serif text-lg text-white">{profile.reportingHeadName}</h3>
              <p className="text-xs text-neutral-400">
                Department Head · {profile.reportingHeadDepartment || profile.department}
              </p>

              <div className="mt-4 pt-3 border-t border-white/10 space-y-2 text-xs">
                {profile.reportingHeadEmail && (
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
                    <a href={`mailto:${profile.reportingHeadEmail}`} className="hover:text-white">
                      {profile.reportingHeadEmail}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-neutral-400">
                  <UserCheck className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>Executive Board Escalation Protocol: Verified</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Directive / Announcements */}
          <div className="border border-white/10 bg-[#0d0d10] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#d4af37]" />
                <h2 className="font-serif text-base text-white">Directives & Broadcasts</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('announcements')}
                className="text-xs text-[#d4af37] hover:underline"
              >
                View all
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {announcements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="border border-white/5 bg-black/30 p-3 space-y-1">
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

      {/* Task Creation Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-[#d4af37]/40 bg-[#0e0e12] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                  Co-Head Task Dispatch
                </span>
                <h3 className="font-serif text-lg text-white">Issue Department Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTaskModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono"
              >
                [ESC / Close]
              </button>
            </div>

            <form onSubmit={handleCreateNewTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct Security Sweep of Committee Hall A"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300">Assignee Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Team Alpha or Officer Name"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300">Priority Level</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300">Target Station</label>
                  <input
                    type="text"
                    placeholder="e.g. Registration Desk / Hall A"
                    value={newTaskStation}
                    onChange={(e) => setNewTaskStation(e.target.value)}
                    className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300">Deadline</label>
                  <input
                    type="datetime-local"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  Checklist Items (one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="Check badge printers&#10;Verify backup QR scanners&#10;Hand over keys"
                  value={newTaskChecklistItems}
                  onChange={(e) => setNewTaskChecklistItems(e.target.value)}
                  className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="border border-white/15 px-4 py-2 text-xs text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="bg-[#d4af37] px-5 py-2 text-xs font-semibold text-black hover:bg-[#e5c158] disabled:opacity-50"
                >
                  {creatingTask ? 'Dispatching…' : 'Dispatch Task to Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
