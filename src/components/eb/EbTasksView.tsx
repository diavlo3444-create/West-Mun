import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Check,
  MessageSquare,
  Paperclip,
  ExternalLink,
  ChevronDown,
  X,
  Send,
  Loader2,
  Calendar,
  AlertCircle,
  FolderPlus,
  RefreshCw,
  Kanban,
  List,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type {
  EbTask,
  TaskPriority,
  TaskStatus,
  TaskChecklistItem,
  EbTaskComment,
} from '../../lib/ebOperationsService';

interface EbTasksViewProps {
  profile: EbMemberProfile;
  tasks: EbTask[];
  onUpdateTask: (
    taskId: string,
    updates: Partial<Pick<EbTask, 'status' | 'checklist' | 'completion_note' | 'blocker_reason' | 'completed_at'>>
  ) => Promise<void>;
  onCreateTask: (task: Omit<EbTask, 'id' | 'created_at' | 'completed_at'>) => Promise<void>;
  onFetchComments: (taskId: string) => Promise<EbTaskComment[]>;
  onAddComment: (taskId: string, comment: string) => Promise<void>;
}

const STATUS_COLUMNS: { id: TaskStatus; label: string; color: string; border: string }[] = [
  { id: 'not_started', label: 'Not Started', color: 'bg-neutral-500', border: 'border-neutral-700' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-sky-500', border: 'border-sky-500/40' },
  { id: 'blocked', label: 'Blocked / Attention', color: 'bg-rose-500', border: 'border-rose-500/40' },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-500', border: 'border-emerald-500/40' },
];

const PRIORITY_BADGES: Record<TaskPriority, { label: string; badgeCls: string }> = {
  urgent: { label: 'Urgent', badgeCls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  high: { label: 'High', badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  normal: { label: 'Normal', badgeCls: 'bg-[#d4af37]/20 text-[#f5d47a] border-[#d4af37]/30' },
  low: { label: 'Low', badgeCls: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
};

export const EbTasksView: React.FC<EbTasksViewProps> = ({
  profile,
  tasks,
  onUpdateTask,
  onCreateTask,
  onFetchComments,
  onAddComment,
}) => {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [selectedTask, setSelectedTask] = useState<EbTask | null>(null);

  // Modals state
  const [completeModalTask, setCompleteModalTask] = useState<EbTask | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [blockerModalTask, setBlockerModalTask] = useState<EbTask | null>(null);
  const [blockerReason, setBlockerReason] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Comments state for discussion drawer
  const [comments, setComments] = useState<EbTaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Form state for creating a new task
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal');
  const [newDeadline, setNewDeadline] = useState('');
  const [newStation, setNewStation] = useState('');
  const [newAssignee, setNewAssignee] = useState(profile.name);
  const [newChecklistRaw, setNewChecklistRaw] = useState('');

  // Can create tasks if head, admin, or co-head
  const canManageTasks = profile.isHead || profile.isAdmin || profile.role === 'co_head';

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.station_name.toLowerCase().includes(q) ||
      t.assigned_to_name.toLowerCase().includes(q);
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchPriority && matchStatus;
  });

  const handleOpenTaskDetails = async (task: EbTask) => {
    setSelectedTask(task);
    setCommentsLoading(true);
    try {
      const comms = await onFetchComments(task.id);
      setComments(comms);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleToggleChecklistItem = async (task: EbTask, itemId: string) => {
    const updatedChecklist = task.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    // If all items completed, optionally prompt or update
    await onUpdateTask(task.id, { checklist: updatedChecklist });
    if (selectedTask && selectedTask.id === task.id) {
      setSelectedTask({ ...selectedTask, checklist: updatedChecklist });
    }
  };

  const handleSendComment = async () => {
    if (!selectedTask || !newComment.trim() || busy) return;
    setBusy(true);
    try {
      await onAddComment(selectedTask.id, newComment.trim());
      setNewComment('');
      const updated = await onFetchComments(selectedTask.id);
      setComments(updated);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCompletion = async () => {
    if (!completeModalTask || busy) return;
    setBusy(true);
    try {
      await onUpdateTask(completeModalTask.id, {
        status: 'completed',
        completion_note: completionNote.trim(),
        completed_at: new Date().toISOString(),
      });
      setCompleteModalTask(null);
      setCompletionNote('');
      if (selectedTask && selectedTask.id === completeModalTask.id) {
        setSelectedTask(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBlocker = async () => {
    if (!blockerModalTask || busy) return;
    setBusy(true);
    try {
      await onUpdateTask(blockerModalTask.id, {
        status: 'blocked',
        blocker_reason: blockerReason.trim(),
      });
      setBlockerModalTask(null);
      setBlockerReason('');
      if (selectedTask && selectedTask.id === blockerModalTask.id) {
        setSelectedTask(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || busy) return;
    setBusy(true);

    const checklistItems: TaskChecklistItem[] = newChecklistRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, idx) => ({ id: `c-${Date.now()}-${idx}`, text, completed: false }));

    try {
      await onCreateTask({
        department: profile.department,
        section: profile.section,
        assigned_to_user_id: null,
        assigned_to_name: newAssignee.trim() || 'Unassigned',
        assigned_by_name: profile.name,
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        status: 'not_started',
        deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
        station_name: newStation.trim() || 'General Operations',
        checklist: checklistItems,
        completion_note: '',
        blocker_reason: '',
        reference_links: [],
      });
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewChecklistRaw('');
      setNewDeadline('');
      setNewStation('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header & Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="font-serif text-2xl font-normal text-white">Operations Task Board</h2>
          <p className="mt-1 text-xs text-neutral-400">
            {canManageTasks ? 'Manage department deliverables, assign work, and review blockers.' : 'Tasks assigned to your account by name or member ID appear here.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
                viewMode === 'board' ? 'bg-[#d4af37] font-semibold text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
                viewMode === 'list' ? 'bg-[#d4af37] font-semibold text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Create Task Button (Heads/Admins/Supervisors) */}
          {canManageTasks && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] px-3.5 py-2 text-xs font-semibold text-black shadow-lg hover:brightness-110 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, or station…"
            className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#d4af37]"
          />
        </div>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as any)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-neutral-300 outline-none focus:border-[#d4af37]"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-neutral-300 outline-none focus:border-[#d4af37]"
        >
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div key={col.id} className="flex flex-col rounded-2xl border border-white/10 bg-black/40 p-4">
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">{col.label}</h3>
                  </div>
                  <span className="font-mono text-xs text-neutral-400">{colTasks.length}</span>
                </div>

                {/* Column Tasks List */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-1">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-neutral-500 border border-dashed border-white/5 rounded-xl">
                      No tasks in this lane
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const completedCount = task.checklist.filter((i) => i.completed).length;
                      const hasChecklist = task.checklist.length > 0;
                      const isOverdue =
                        task.status !== 'completed' && task.deadline && new Date(task.deadline).getTime() < Date.now();

                      return (
                        <div
                          key={task.id}
                          onClick={() => handleOpenTaskDetails(task)}
                          className="group cursor-pointer rounded-xl border border-white/10 bg-[#0e0e12] p-3.5 shadow-md transition hover:border-[#d4af37]/40 hover:bg-black/60 hover:shadow-[0_0_12px_rgba(212,175,55,0.1)]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                                PRIORITY_BADGES[task.priority].badgeCls
                              }`}
                            >
                              {task.priority}
                            </span>
                            {task.station_name && (
                              <span className="truncate max-w-[120px] font-mono text-[9px] text-neutral-400">
                                {task.station_name}
                              </span>
                            )}
                          </div>

                          <h4 className="mt-2 text-xs font-semibold text-white group-hover:text-[#f5d47a] line-clamp-2">
                            {task.title}
                          </h4>

                          <p className="mt-1 text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>

                          {/* Checklist Progress Bar */}
                          {hasChecklist && (
                            <div className="mt-3 space-y-1">
                              <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                                <span>Checklist</span>
                                <span>
                                  {completedCount}/{task.checklist.length}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-[#d4af37] transition-all"
                                  style={{ width: `${(completedCount / task.checklist.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Blocker alert box */}
                          {task.status === 'blocked' && task.blocker_reason && (
                            <div className="mt-2.5 rounded-lg border border-rose-500/30 bg-rose-950/30 p-2 text-[10px] text-rose-200 flex items-start gap-1.5">
                              <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{task.blocker_reason}</span>
                            </div>
                          )}

                          {/* Footer info */}
                          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5 text-[10px] text-neutral-500">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate text-neutral-400">{task.assigned_to_name}</span>
                            </div>

                            {task.deadline && (
                              <span className={isOverdue ? 'text-rose-400 font-semibold' : ''}>
                                {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden divide-y divide-white/[0.06]">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">No tasks match your search filters.</div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleOpenTaskDetails(task)}
                className="cursor-pointer p-4 transition hover:bg-white/[0.02] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider shrink-0 ${
                      PRIORITY_BADGES[task.priority].badgeCls
                    }`}
                  >
                    {task.priority}
                  </span>

                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">{task.title}</h4>
                    <p className="text-[11px] text-neutral-400 truncate">{task.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs text-neutral-400 font-mono">
                  <span className="hidden sm:inline">{task.station_name}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase font-semibold ${
                      task.status === 'completed'
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                        : task.status === 'blocked'
                        ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                        : 'bg-white/10 text-neutral-300'
                    }`}
                  >
                    {task.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Task Details & Discussion Drawer / Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="h-full w-full max-w-lg bg-[#0d0d12] border-l border-[#d4af37]/30 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <span
                  className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                    PRIORITY_BADGES[selectedTask.priority].badgeCls
                  }`}
                >
                  {selectedTask.priority} priority
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h3 className="mt-4 font-serif text-xl font-medium text-white">{selectedTask.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-300">{selectedTask.description}</p>

              {/* Meta Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs border-y border-white/[0.06] py-3 font-mono">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase">Station</span>
                  <p className="text-white font-medium">{selectedTask.station_name || 'General'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase">Assigned By</span>
                  <p className="text-white font-medium">{selectedTask.assigned_by_name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase">Deadline</span>
                  <p className="text-white font-medium">
                    {selectedTask.deadline
                      ? new Date(selectedTask.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase">Current Status</span>
                  <p className="text-[#d4af37] font-semibold uppercase">{selectedTask.status.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {/* Interactive Checklist */}
              {selectedTask.checklist.length > 0 && (
                <div className="mt-5 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
                    Execution Checklist
                  </h4>
                  <div className="space-y-2">
                    {selectedTask.checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleChecklistItem(selectedTask, item.id)}
                        className="cursor-pointer flex items-center gap-2.5 rounded-lg border border-white/5 bg-black/40 p-2.5 transition hover:bg-white/[0.03]"
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            item.completed
                              ? 'border-[#d4af37] bg-[#d4af37] text-black'
                              : 'border-white/30 hover:border-[#d4af37]'
                          }`}
                        >
                          {item.completed && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span
                          className={`text-xs ${
                            item.completed ? 'line-through text-neutral-500' : 'text-neutral-200'
                          }`}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completion Notes display */}
              {selectedTask.completion_note && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                    Supervisor Completion Report
                  </span>
                  <p className="mt-1 text-xs text-emerald-200">{selectedTask.completion_note}</p>
                </div>
              )}

              {/* Blocker reason display */}
              {selectedTask.blocker_reason && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-rose-400 font-bold">
                    Reported Operational Blocker
                  </span>
                  <p className="mt-1 text-xs text-rose-200">{selectedTask.blocker_reason}</p>
                </div>
              )}

              {/* Task Discussion Thread */}
              <div className="mt-6 border-t border-white/[0.08] pt-4">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  <MessageSquare className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>Task Discussion ({comments.length})</span>
                </h4>

                <div className="mt-3 max-h-48 overflow-y-auto space-y-2.5 pr-1">
                  {commentsLoading ? (
                    <div className="py-4 text-center text-xs text-neutral-500">Loading comments…</div>
                  ) : comments.length === 0 ? (
                    <p className="py-2 text-xs text-neutral-500">No questions posted on this task yet.</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="rounded-lg border border-white/5 bg-black/40 p-2.5 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span className="font-semibold text-white">{c.author_name}</span>
                          <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="mt-1 text-neutral-300 leading-relaxed">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    placeholder="Ask a question or leave context…"
                    className="flex-1 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#d4af37]"
                  />
                  <button
                    type="button"
                    onClick={handleSendComment}
                    disabled={!newComment.trim() || busy}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4af37] text-black disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="mt-6 border-t border-white/[0.08] pt-4 flex flex-wrap gap-2">
              {selectedTask.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => setCompleteModalTask(selectedTask)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-2.5 text-xs font-semibold text-white shadow-lg hover:brightness-110"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Completed
                </button>
              )}

              {selectedTask.status !== 'blocked' && selectedTask.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => setBlockerModalTask(selectedTask)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Report Blocker
                </button>
              )}

              {selectedTask.status === 'completed' && canManageTasks && (
                <button
                  type="button"
                  onClick={async () => {
                    await onUpdateTask(selectedTask.id, { status: 'in_progress', completed_at: null });
                    setSelectedTask(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/20 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-950/40"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reopen Task
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {completeModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/40 bg-[#0e0e12] p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-semibold text-white">Complete Task</h3>
            <p className="text-xs text-neutral-400">
              Submit your completion notes. This will be logged on the supervisor audit trail.
            </p>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Completion Notes / Outcome
              </label>
              <textarea
                rows={3}
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="E.g. Verified all 45 placards, calibrated timer, handed spare materials to Dais clerk."
                className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#d4af37]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompleteModalTask(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-neutral-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCompletion}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2 text-xs font-semibold text-white"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocker Modal */}
      {blockerModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-[#0e0e12] p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-semibold text-rose-300">Report Operational Blocker</h3>
            <p className="text-xs text-neutral-400">
              Describe what is preventing completion. This will alert your Directorate Head and station supervisor immediately.
            </p>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Blocker Reason / What assistance is required?
              </label>
              <textarea
                rows={3}
                required
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                placeholder="E.g. Missing country placards for delegations 22-25. Waiting on printing delivery from Room 104."
                className="w-full rounded-xl border border-rose-500/40 bg-black/60 p-3 text-xs text-white placeholder-neutral-500 outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlockerModalTask(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-neutral-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBlocker}
                disabled={!blockerReason.trim() || busy}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2 text-xs font-semibold text-white"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Submit Blocker Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal (Heads/Admins) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#d4af37]/40 bg-[#0e0e12] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-serif text-lg font-semibold text-white">Create New Department Task</h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Task Title <span className="text-[#d4af37]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="E.g. Verify Dais Audio Levels"
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Description & Instructions</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Provide explicit operational context and standard operating procedures…"
                  className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#d4af37]"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Deadline</label>
                  <input
                    type="datetime-local"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Station / Location</label>
                  <input
                    type="text"
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    placeholder="E.g. Plenary Hall A"
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Assignee</label>
                  <input
                    type="text"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    placeholder="Team or member name"
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Checklist Items (one item per line)
                </label>
                <textarea
                  rows={3}
                  value={newChecklistRaw}
                  onChange={(e) => setNewChecklistRaw(e.target.value)}
                  placeholder="Verify Dais microphones&#10;Distribute delegate folders&#10;Confirm roll call list"
                  className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-neutral-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] px-5 py-2 text-xs font-semibold text-black hover:brightness-110"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create & Publish Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
