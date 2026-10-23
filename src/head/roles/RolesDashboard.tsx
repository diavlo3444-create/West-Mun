import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Briefcase,
  UserCheck,
  Shield,
  MapPin,
  Calendar,
  ChevronDown,
  Edit2,
  Trash2,
  ArrowRight,
  RefreshCw,
  Eye,
  Network,
  ListTree,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { DepartmentKey, SectionKey } from '../departments';
import {
  listApprovedMembers,
  listDepartmentPositions,
  listDepartmentTasks,
  createDepartmentPosition,
  updateDepartmentPosition,
  deleteDepartmentPosition,
  createDepartmentTask,
  updateDepartmentTask,
  deleteDepartmentTask,
  validateNoCircularHierarchy,
  getDescendantPositionIds,
  type ApprovedMember,
  type DepartmentPosition,
  type DepartmentTask,
  type TaskPriority,
  type TaskStatus,
  type PositionInput,
  type TaskInput,
} from '../services/rolesStore';
import { OrgChartView } from './OrgChartView';
import { OrgListView } from './OrgListView';
import { MemberRoleDossier } from './MemberRoleDossier';
import {
  Modal,
  ConfirmDialog,
  Notice,
  Skeleton,
  Toast,
  btnPrimary,
  btnSecondary,
  btnDanger,
  inputCls,
  labelCls,
  selectCls,
} from '../../dashboard/ui';

interface RolesDashboardProps {
  department: DepartmentKey;
  section?: SectionKey | null;
  departmentLabel: string;
  testToken?: string | null;
  coHeads?: Array<{ user_id: string; full_name: string; email: string; account_role?: string | null; team?: string | null; section?: string | null; phone?: string | null; gender?: string | null }>;
}

type MainTab = 'tasks' | 'hierarchy';
type HierarchyViewMode = 'chart' | 'list';

const PRIORITY_BADGES: Record<TaskPriority, { label: string; cls: string }> = {
  low: { label: 'Low', cls: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
  normal: { label: 'Normal', cls: 'bg-blue-950/50 text-blue-300 border-blue-500/30' },
  high: { label: 'High', cls: 'bg-amber-950/50 text-amber-300 border-amber-500/40 font-semibold' },
  urgent: { label: 'Urgent', cls: 'bg-rose-950/60 text-rose-300 border-rose-500/50 font-bold animate-pulse' },
};

const STATUS_BADGES: Record<TaskStatus, { label: string; cls: string }> = {
  not_started: { label: 'Not Started', cls: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-950/60 text-amber-300 border-amber-500/40' },
  completed: { label: 'Completed', cls: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' },
};

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const RolesDashboard: React.FC<RolesDashboardProps> = ({
  department,
  section,
  departmentLabel,
  testToken,
  coHeads = [],
}) => {
  const scope = useMemo(
    () => ({ department, section: section || null, testToken: testToken || null }),
    [department, section, testToken]
  );

  const [activeTab, setActiveTab] = useState<MainTab>('tasks');
  const [hierarchyMode, setHierarchyMode] = useState<HierarchyViewMode>('chart');

  // Core Data State
  const [members, setMembers] = useState<ApprovedMember[]>([]);
  const [positions, setPositions] = useState<DepartmentPosition[]>([]);
  const [tasks, setTasks] = useState<DepartmentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters for Tasks view
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterMember, setFilterMember] = useState<string>('all');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DepartmentTask | null>(null);
  const [taskFormData, setTaskFormData] = useState<TaskInput>({
    title: '',
    description: '',
    member_id: '',
    position_id: null,
    supervisor_member_id: null,
    priority: 'normal',
    status: 'not_started',
    deadline: '',
    location: '',
    notes: '',
  });

  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<DepartmentPosition | null>(null);
  const [posFormData, setPosFormData] = useState<PositionInput>({
    title: '',
    description: '',
    parent_position_id: null,
    member_id: null,
    sort_order: 0,
  });

  const [posDeleteTarget, setPosDeleteTarget] = useState<DepartmentPosition | null>(null);
  const [taskDeleteTarget, setTaskDeleteTarget] = useState<DepartmentTask | null>(null);

  // Member Dossier Flyout
  const [dossierMember, setDossierMember] = useState<{
    member: ApprovedMember;
    position?: DepartmentPosition | null;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  // Load All Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorNotice(null);

    try {
      const [membersRes, positionsRes, tasksRes] = await Promise.all([
        listApprovedMembers(scope),
        listDepartmentPositions(scope),
        listDepartmentTasks(scope),
      ]);

      if (membersRes.data) setMembers(membersRes.data);
      if (positionsRes.data) setPositions(positionsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);

      if (!membersRes.ok && membersRes.error) {
        setErrorNotice(membersRes.error);
      } else if (!positionsRes.ok && positionsRes.error) {
        // Non-fatal if Supabase table is not yet migrated, cache will serve
      }
    } catch (e) {
      setErrorNotice(e instanceof Error ? e.message : 'Failed to query roles data.');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalApproved = members.length + coHeads.length;
    const memberIdsWithTask = new Set(tasks.map((t) => t.member_id));
    const memberIdsWithPos = new Set(positions.filter((p) => p.member_id).map((p) => p.member_id!));
    const allAssignedIds = new Set([...memberIdsWithTask, ...memberIdsWithPos]);

    const assignedCount = members.filter((m) => allAssignedIds.has(m.id)).length;
    const availableCount = Math.max(0, totalApproved - assignedCount);

    const activeTasksCount = tasks.filter((t) => t.status !== 'completed').length;
    const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;

    return {
      totalApproved,
      assignedCount,
      availableCount,
      activeTasksCount,
      completedTasksCount,
      coHeadCount: coHeads.length,
    };
  }, [members, positions, tasks, coHeads]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const assigned = members.find((m) => m.id === t.member_id);
      const memberName = (assigned?.full_name || '').toLowerCase();
      const pos = positions.find((p) => p.id === t.position_id);
      const posTitle = (pos?.title || '').toLowerCase();

      if (q) {
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchLoc = t.location.toLowerCase().includes(q);
        const matchMember = memberName.includes(q);
        const matchPos = posTitle.includes(q);
        if (!matchTitle && !matchDesc && !matchLoc && !matchMember && !matchPos) {
          return false;
        }
      }

      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterMember !== 'all' && t.member_id !== filterMember) return false;

      return true;
    });
  }, [tasks, search, filterStatus, filterPriority, filterMember, members, positions]);

  // Open Task Modal (Create)
  const handleOpenCreateTask = (preselectedMemberId?: string) => {
    setEditingTask(null);
    setTaskFormData({
      title: '',
      description: '',
      member_id: preselectedMemberId || (members[0]?.id || ''),
      position_id: null,
      supervisor_member_id: null,
      priority: 'normal',
      status: 'not_started',
      deadline: '',
      location: '',
      notes: '',
    });
    setIsTaskModalOpen(true);
  };

  // Open Task Modal (Edit)
  const handleOpenEditTask = (task: DepartmentTask) => {
    setEditingTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description,
      member_id: task.member_id,
      position_id: task.position_id,
      supervisor_member_id: task.supervisor_member_id,
      priority: task.priority,
      status: task.status,
      deadline: task.deadline ? task.deadline.slice(0, 16) : '',
      location: task.location,
      notes: task.notes,
    });
    setIsTaskModalOpen(true);
  };

  // Save Task
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormData.title.trim()) {
      alert('Please enter a role or task title.');
      return;
    }
    if (!taskFormData.member_id) {
      alert('Please assign an approved department member.');
      return;
    }

    setSaving(true);
    try {
      if (editingTask) {
        const res = await updateDepartmentTask(scope, editingTask.id, taskFormData);
        if (!res.ok) throw new Error(res.error || 'Failed to update task.');
        setToastMessage(`Task "${taskFormData.title}" updated successfully.`);
      } else {
        const res = await createDepartmentTask(scope, taskFormData);
        if (!res.ok) throw new Error(res.error || 'Failed to create task.');
        setToastMessage(`Role / Task "${taskFormData.title}" created and assigned.`);
      }
      setIsTaskModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving task.');
    } finally {
      setSaving(false);
    }
  };

  // Quick Status Update
  const handleQuickStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await updateDepartmentTask(scope, taskId, { status: newStatus });
      if (!res.ok) throw new Error(res.error || 'Failed to update status.');
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t))
      );
      setToastMessage(`Status changed to ${STATUS_BADGES[newStatus].label}.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not update task status.');
    }
  };

  // Delete Task
  const handleConfirmDeleteTask = async () => {
    if (!taskDeleteTarget) return;
    setSaving(true);
    try {
      const res = await deleteDepartmentTask(scope, taskDeleteTarget.id);
      if (!res.ok) throw new Error(res.error || 'Failed to delete task.');
      setToastMessage('Task assignment removed.');
      setTaskDeleteTarget(null);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete task.');
    } finally {
      setSaving(false);
    }
  };

  const handleClosePosModal = useCallback(() => {
    setIsPosModalOpen(false);
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
  }, []);

  // Open Position Modal (Create)
  const handleOpenCreatePos = (parentId?: string | null) => {
    setEditingPosition(null);
    setPosFormData({
      title: '',
      description: '',
      parent_position_id: parentId || null,
      member_id: null,
      sort_order: positions.length + 1,
    });
    setIsPosModalOpen(true);
  };

  // Open Position Modal (Edit)
  const handleOpenEditPos = (pos: DepartmentPosition) => {
    setEditingPosition(pos);
    setPosFormData({
      title: pos.title,
      description: pos.description,
      parent_position_id: pos.parent_position_id,
      member_id: pos.member_id,
      sort_order: pos.sort_order,
    });
    setIsPosModalOpen(true);
  };

  // Save Position with Circular Hierarchy Check
  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posFormData.title.trim()) {
      alert('Please enter an organizational position title.');
      return;
    }

    // Circular check if editing
    if (editingPosition) {
      const circCheck = validateNoCircularHierarchy(
        positions,
        editingPosition.id,
        posFormData.parent_position_id || null
      );
      if (!circCheck.valid) {
        alert(circCheck.reason || 'Circular reporting relationship detected.');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingPosition) {
        const res = await updateDepartmentPosition(scope, editingPosition.id, posFormData);
        if (!res.ok) throw new Error(res.error || 'Failed to update position.');
        setToastMessage(`Position "${posFormData.title}" updated.`);
      } else {
        const res = await createDepartmentPosition(scope, posFormData);
        if (!res.ok) throw new Error(res.error || 'Failed to create position.');
        setToastMessage(`Position "${posFormData.title}" added to hierarchy.`);
      }
      setIsPosModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving position.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Position
  const handleConfirmDeletePos = async () => {
    if (!posDeleteTarget) return;
    setSaving(true);
    try {
      const res = await deleteDepartmentPosition(scope, posDeleteTarget.id);
      if (!res.ok) throw new Error(res.error || 'Failed to delete position.');
      setToastMessage(
        `Position "${posDeleteTarget.title}" removed. Subordinate positions have been safely preserved and reparented.`
      );
      setPosDeleteTarget(null);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete position.');
    } finally {
      setSaving(false);
    }
  };

  // Open Member Dossier
  const handleOpenMemberDossier = (member: ApprovedMember, pos?: DepartmentPosition) => {
    const position = pos || positions.find((p) => p.member_id === member.id) || null;
    setDossierMember({ member, position });
  };

  // Direct reports for the current dossier member
  const dossierDirectReports = useMemo(() => {
    if (!dossierMember) return [];
    const memberPos = dossierMember.position;
    if (!memberPos) return [];

    const childPositions = positions.filter((p) => p.parent_position_id === memberPos.id);
    const reports: { member: ApprovedMember; position?: DepartmentPosition; tasks: DepartmentTask[] }[] = [];

    for (const cp of childPositions) {
      if (cp.member_id) {
        const repMem = members.find((m) => m.id === cp.member_id);
        if (repMem) {
          const repTasks = tasks.filter((t) => t.member_id === repMem.id);
          reports.push({ member: repMem, position: cp, tasks: repTasks });
        }
      }
    }

    return reports;
  }, [dossierMember, positions, members, tasks]);

  // Direct supervisor for the current dossier member
  const dossierSupervisor = useMemo(() => {
    if (!dossierMember?.position?.parent_position_id) return null;
    const parentPos = positions.find((p) => p.id === dossierMember.position!.parent_position_id);
    if (!parentPos?.member_id) return null;
    return members.find((m) => m.id === parentPos.member_id) || null;
  }, [dossierMember, positions, members]);

  // Positions that cannot be parent for the currently edited position (self + descendants)
  const forbiddenParentIds = useMemo(() => {
    if (!editingPosition) return new Set<string>();
    const descendants = getDescendantPositionIds(positions, editingPosition.id);
    descendants.add(editingPosition.id);
    return descendants;
  }, [editingPosition, positions]);

  return (
    <div className="space-y-6">
      {toastMessage && (
        <Toast
          message={toastMessage}
          tone="success"
          onDismiss={() => setToastMessage(null)}
        />
      )}

      {errorNotice && (
        <Notice tone="error" title="Roles Storage Notice">
          {errorNotice}
        </Notice>
      )}

      {/* Top Header & Metrics */}
      <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#14130f] via-[#0e0e12] to-[#0a0a0d] p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#d4af37]/40 bg-[#d4af37]/15 text-[#d4af37]">
                <Network className="h-4 w-4" />
              </span>
              <span className="text-xs font-mono uppercase tracking-[0.16em] text-[#d4af37]">
                Operations & Team Architecture
              </span>
            </div>
            <h1 className="mt-1 font-serif text-xl font-bold text-white tracking-wide">
              {departmentLabel} — Roles & Hierarchy
            </h1>
            <p className="mt-0.5 text-xs text-neutral-400">
              Assign roles, define responsibilities, and structure your approved team members into an
              organizational chain of command.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenCreateTask()}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#d4af37] bg-[#d4af37] px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#e2c258]"
            >
              <Plus className="h-4 w-4" />
              <span>Assign Role / Task</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreatePos(null)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.15] bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <Layers className="h-4 w-4 text-[#d4af37]" />
              <span>Add Position</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              title="Refresh records"
              className="rounded-md border border-white/[0.1] bg-white/[0.02] p-2 text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 border-t border-white/[0.07] pt-4">
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Approved Members
            </span>
            <p className="mt-1 font-serif text-lg font-bold text-white">
              {metrics.totalApproved}
            </p>
          </div>

          <div className="rounded-lg border border-[#d4af37]/30 bg-[#12110c] p-3">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#d4af37]">
              Assigned Personnel
            </span>
            <p className="mt-1 font-serif text-lg font-bold text-[#f1d98c]">
              {metrics.assignedCount}
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Available Staff
            </span>
            <p className="mt-1 font-serif text-lg font-bold text-emerald-400">
              {metrics.availableCount}
            </p>
          </div>

          <div className="rounded-lg border border-[#d4af37]/25 bg-[#12110c] p-3">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#d4af37]">
              Co-Heads
            </span>
            <p className="mt-1 font-serif text-lg font-bold text-[#f1d98c]">
              {metrics.coHeadCount}
            </p>
            <p className="mt-1 text-[10px] text-neutral-500">Department leadership</p>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-amber-400">
              Active Tasks
            </span>
            <p className="mt-1 font-serif text-lg font-bold text-amber-300">
              {metrics.activeTasksCount}
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Completed Tasks
            </span>
            <p className="mt-1 font-serif text-lg font-bold text-neutral-300">
              {metrics.completedTasksCount}
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Roles & Task Assignments ({tasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hierarchy')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'hierarchy'
                ? 'bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            <span>Organizational Hierarchy ({positions.length + coHeads.length})</span>
          </button>
        </div>

        {/* Sub-toggle for Hierarchy View mode */}
        {activeTab === 'hierarchy' && (
          <div className="flex items-center rounded-lg border border-white/[0.1] bg-[#0c0c0f] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setHierarchyMode('chart')}
              className={`rounded-md px-3 py-1 text-[11px] font-mono uppercase transition-colors ${
                hierarchyMode === 'chart'
                  ? 'bg-[#d4af37]/20 text-[#d4af37] font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Org Chart
            </button>
            <button
              type="button"
              onClick={() => setHierarchyMode('list')}
              className={`rounded-md px-3 py-1 text-[11px] font-mono uppercase transition-colors ${
                hierarchyMode === 'list'
                  ? 'bg-[#d4af37]/20 text-[#d4af37] font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              List View
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: ROLES & TASK ASSIGNMENTS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 rounded-lg border border-white/[0.07] bg-[#0c0c0f] p-3 text-xs">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search tasks, members, locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-white/[0.1] bg-[#141418] py-1.5 pl-8 pr-3 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-[#d4af37] focus:outline-none"
              />
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={selectCls}
              >
                <option value="all">All Statuses</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className={selectCls}
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <select
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className={selectCls}
              >
                <option value="all">All Approved Members ({members.length})</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tasks List */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/[0.1] p-10 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-neutral-600" />
              <h3 className="mt-3 text-sm font-serif font-semibold text-neutral-300">
                No Role or Task Assignments Found
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                {search || filterStatus !== 'all' || filterPriority !== 'all' || filterMember !== 'all'
                  ? 'Try clearing the search or filters.'
                  : 'Assign custom roles, specific responsibilities, and operational tasks to your approved team members.'}
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreateTask()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/15 px-3.5 py-1.5 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/25 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Assignment</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredTasks.map((task) => {
                const assigned = members.find((m) => m.id === task.member_id);
                const supervisor = members.find((m) => m.id === task.supervisor_member_id);
                const pos = positions.find((p) => p.id === task.position_id);
                const prio = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.normal;
                const stat = STATUS_BADGES[task.status] || STATUS_BADGES.not_started;

                return (
                  <div
                    key={task.id}
                    className="flex flex-col justify-between rounded-lg border border-white/[0.08] bg-[#0c0c0f] p-4 transition-all hover:border-[#d4af37]/40 hover:shadow-md"
                  >
                    <div>
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase border ${prio.cls}`}
                            >
                              {prio.label}
                            </span>
                            {pos && (
                              <span className="rounded bg-[#d4af37]/15 px-1.5 py-0.5 text-[9.5px] font-mono text-[#d4af37] border border-[#d4af37]/30">
                                {pos.title}
                              </span>
                            )}
                          </div>
                          <h4 className="mt-1 font-serif text-sm font-semibold text-white">
                            {task.title}
                          </h4>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Edit task"
                            onClick={() => handleOpenEditTask(task)}
                            className="rounded p-1 text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Remove assignment"
                            onClick={() => setTaskDeleteTarget(task)}
                            className="rounded p-1 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="mt-2 text-xs text-neutral-300 leading-relaxed line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Member & Supervisor details */}
                      <div className="mt-3.5 space-y-1.5 border-t border-white/[0.06] pt-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                            Assigned to:
                          </span>
                          {assigned ? (
                            <button
                              type="button"
                              onClick={() => handleOpenMemberDossier(assigned, pos)}
                              className="font-medium text-neutral-200 hover:text-[#d4af37] hover:underline transition-colors"
                            >
                              {assigned.full_name}
                            </button>
                          ) : (
                            <span className="text-neutral-500 italic">Unassigned</span>
                          )}
                        </div>

                        {supervisor && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                              Reports to:
                            </span>
                            <span className="font-mono text-[11px] text-neutral-300">
                              {supervisor.full_name}
                            </span>
                          </div>
                        )}

                        {task.location && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-[#d4af37]" />
                              Location:
                            </span>
                            <span className="truncate text-neutral-200">{task.location}</span>
                          </div>
                        )}

                        {task.deadline && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-amber-400" />
                              Deadline:
                            </span>
                            <span className="font-mono text-[11px] text-amber-200">
                              {formatDate(task.deadline)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom status select bar */}
                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        Status:
                      </span>
                      <select
                        value={task.status}
                        onChange={(e) =>
                          handleQuickStatusUpdate(task.id, e.target.value as TaskStatus)
                        }
                        className={`rounded border px-2 py-0.5 text-[10.5px] font-mono font-medium focus:outline-none cursor-pointer ${stat.cls}`}
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORGANIZATIONAL HIERARCHY */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[#d4af37]/35 bg-gradient-to-br from-[#d4af37]/[0.10] via-neutral-950 to-neutral-950 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d4af37]">Department Leadership</p>
                <h3 className="mt-1 text-base font-semibold text-white">Your EB Team Members</h3>
                <p className="mt-1 text-xs text-neutral-400">Registered EB team members assigned to this head are shown here. Approved conference team registrations will appear in the member directory as they are accepted.</p>
              </div>
              <span className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-xs font-semibold text-[#f3e5ab]">{coHeads.length}</span>
            </div>
            {coHeads.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {coHeads.map((member) => (
                  <div key={member.user_id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/35 bg-[#d4af37]/10 text-xs font-bold text-[#f3e5ab]">
                        {(member.full_name || "E").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{member.full_name || "EB Member"}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-[#d4af37]">{(member.account_role || "EB Member").replace(/_/g, " ")}{member.team ? ` · ${member.team}` : ""}{member.section ? ` · ${member.section}` : ""}</p>
                        <p className="mt-1 break-all text-xs text-neutral-400">{member.email}</p>
                        {member.phone && <p className="mt-1 text-xs text-neutral-500">{member.phone}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-xs text-neutral-400">No EB members are assigned to this head yet. New members linked to your head account or matching this team and section will appear here automatically.</p>
            )}
          </section>
          {hierarchyMode === 'chart' ? (
            <OrgChartView
              positions={positions}
              members={members}
              tasks={tasks}
              onAddPosition={handleOpenCreatePos}
              onEditPosition={handleOpenEditPos}
              onDeletePosition={(p) => setPosDeleteTarget(p)}
              onSelectMember={handleOpenMemberDossier}
            />
          ) : (
            <OrgListView
              positions={positions}
              members={members}
              tasks={tasks}
              onAddPosition={handleOpenCreatePos}
              onEditPosition={handleOpenEditPos}
              onDeletePosition={(p) => setPosDeleteTarget(p)}
              onSelectMember={handleOpenMemberDossier}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN ROLE / CREATE TASK                                          */}
      {/* ========================================================================= */}
      <Modal
        open={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        size="md"
        eyebrow="Department Operational Assignment"
        title={editingTask ? 'Edit Role / Task Assignment' : 'Assign Role & Responsibilities'}
        description="Assign a specific role, operational tasks, priority, location, and reporting supervisor to an approved member."
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseTaskModal}
              className={btnSecondary}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTask}
              className={btnPrimary}
              disabled={saving}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingTask ? 'Save Changes' : 'Assign to Member'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
          {/* Member Selector (strictly approved members) */}
          <div>
            <label className={labelCls}>Assign To Approved Member *</label>
            <select
              required
              value={taskFormData.member_id}
              onChange={(e) => setTaskFormData({ ...taskFormData, member_id: e.target.value })}
              className={selectCls}
            >
              <option value="" disabled>
                -- Select Approved Member ({members.length} available) --
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.institution || m.email})
                </option>
              ))}
            </select>
            {members.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-400">
                No approved applications found in this department/section. Only candidates whose
                applications have been approved (status: accepted) can receive assignments.
              </p>
            )}
          </div>

          {/* Role / Task Title */}
          <div>
            <label className={labelCls}>Role or Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Photography Lead, Floor Decorum Officer, Dais Runner"
              value={taskFormData.title}
              onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Description & Responsibilities */}
          <div>
            <label className={labelCls}>Description & Responsibilities</label>
            <textarea
              rows={3}
              placeholder="Detailed instructions, operational responsibilities, expected deliverables..."
              value={taskFormData.description}
              onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Associated Organizational Position (Optional) */}
          <div>
            <label className={labelCls}>Associated Organizational Position (Optional)</label>
            <select
              value={taskFormData.position_id || ''}
              onChange={(e) =>
                setTaskFormData({ ...taskFormData, position_id: e.target.value || null })
              }
              className={selectCls}
            >
              <option value="">-- None (Standalone Task) --</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Direct Reporting Supervisor */}
          <div>
            <label className={labelCls}>Direct Reporting Supervisor (Optional)</label>
            <select
              value={taskFormData.supervisor_member_id || ''}
              onChange={(e) =>
                setTaskFormData({
                  ...taskFormData,
                  supervisor_member_id: e.target.value || null,
                })
              }
              className={selectCls}
            >
              <option value="">-- Department Head / Secretariat --</option>
              {members
                .filter((m) => m.id !== taskFormData.member_id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.email})
                  </option>
                ))}
            </select>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Priority</label>
              <select
                value={taskFormData.priority}
                onChange={(e) =>
                  setTaskFormData({
                    ...taskFormData,
                    priority: e.target.value as TaskPriority,
                  })
                }
                className={selectCls}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <select
                value={taskFormData.status}
                onChange={(e) =>
                  setTaskFormData({
                    ...taskFormData,
                    status: e.target.value as TaskStatus,
                  })
                }
                className={selectCls}
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Location & Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Station / Location (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Committee Room B, Main Hall"
                value={taskFormData.location}
                onChange={(e) => setTaskFormData({ ...taskFormData, location: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Deadline / Target Date (Optional)</label>
              <input
                type="datetime-local"
                value={taskFormData.deadline || ''}
                onChange={(e) => setTaskFormData({ ...taskFormData, deadline: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className={labelCls}>Internal Head Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Private notes for the head and secretariat..."
              value={taskFormData.notes}
              onChange={(e) => setTaskFormData({ ...taskFormData, notes: e.target.value })}
              className={inputCls}
            />
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: ORGANIZATIONAL POSITION (CREATE / EDIT)                             */}
      {/* ========================================================================= */}
      <Modal
        open={isPosModalOpen}
        onClose={handleClosePosModal}
        size="md"
        eyebrow="Organizational Hierarchy"
        title={editingPosition ? 'Edit Position' : 'Create Organizational Position'}
        description="Define a leadership position or sub-team in your department's reporting structure."
        footer={
          <>
            <button
              type="button"
              onClick={handleClosePosModal}
              className={btnSecondary}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSavePosition}
              className={btnPrimary}
              disabled={saving}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingPosition ? 'Save Changes' : 'Add Position'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSavePosition} className="space-y-4 text-xs">
          {/* Position Title */}
          <div>
            <label className={labelCls}>Position Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Media Team Leader, Photography Lead, Security Supervisor"
              value={posFormData.title}
              onChange={(e) => setPosFormData({ ...posFormData, title: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description / Purpose (Optional)</label>
            <textarea
              rows={2}
              placeholder="Purpose of this position and sub-team responsibilities..."
              value={posFormData.description}
              onChange={(e) => setPosFormData({ ...posFormData, description: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Parent Position (Hierarchy Reporting Line) */}
          <div>
            <label className={labelCls}>Reports To / Parent Position</label>
            <select
              value={posFormData.parent_position_id || ''}
              onChange={(e) =>
                setPosFormData({
                  ...posFormData,
                  parent_position_id: e.target.value || null,
                })
              }
              className={selectCls}
            >
              <option value="">-- Top Leadership (Reports Directly to Head) --</option>
              {positions
                .filter((p) => !forbiddenParentIds.has(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
            </select>
            {editingPosition && forbiddenParentIds.size > 1 && (
              <p className="mt-1 text-[10.5px] text-neutral-400">
                Self and subordinate positions are hidden to prevent circular reporting relationships.
              </p>
            )}
          </div>

          {/* Assign Approved Member */}
          <div>
            <label className={labelCls}>Assigned Member (Optional / Can Leave Vacant)</label>
            <select
              value={posFormData.member_id || ''}
              onChange={(e) =>
                setPosFormData({
                  ...posFormData,
                  member_id: e.target.value || null,
                })
              }
              className={selectCls}
            >
              <option value="">-- Leave Vacant --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.institution || m.email})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* CONFIRMATION DIALOG: DELETE POSITION                                      */}
      {/* ========================================================================= */}
      <ConfirmDialog
        open={Boolean(posDeleteTarget)}
        title="Remove Position from Hierarchy"
        tone="danger"
        confirmLabel="Remove Position"
        onClose={() => setPosDeleteTarget(null)}
        onConfirm={handleConfirmDeletePos}
        description={
          <>
            <p className="text-xs text-neutral-300">
              Are you sure you want to remove the position{' '}
              <strong className="text-white">"{posDeleteTarget?.title}"</strong>?
            </p>
            <p className="mt-2 text-[11px] text-neutral-400">
              Any subordinate positions reporting to this role will be safely re-parented to its parent
              position, and all member task records will be preserved.
            </p>
          </>
        }
      />

      {/* ========================================================================= */}
      {/* CONFIRMATION DIALOG: DELETE TASK                                          */}
      {/* ========================================================================= */}
      <ConfirmDialog
        open={Boolean(taskDeleteTarget)}
        title="Delete Role / Task Assignment"
        tone="danger"
        confirmLabel="Delete Assignment"
        onClose={() => setTaskDeleteTarget(null)}
        onConfirm={handleConfirmDeleteTask}
        description={
          <p className="text-xs text-neutral-300">
            Are you sure you want to delete the assignment{' '}
            <strong className="text-white">"{taskDeleteTarget?.title}"</strong>?
          </p>
        }
      />

      {/* ========================================================================= */}
      {/* MEMBER DOSSIER MODAL                                                      */}
      {/* ========================================================================= */}
      <MemberRoleDossier
        open={Boolean(dossierMember)}
        onClose={() => setDossierMember(null)}
        member={dossierMember?.member || null}
        position={dossierMember?.position || null}
        supervisor={dossierSupervisor}
        tasks={tasks}
        directReports={dossierDirectReports}
        onUpdateTaskStatus={handleQuickStatusUpdate}
        onAssignNewTask={handleOpenCreateTask}
      />
    </div>
  );
};
