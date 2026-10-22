import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  GitFork,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Building,
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  RefreshCw,
  List,
  Network,
  X,
  Check,
  Briefcase,
} from 'lucide-react';
import type { DepartmentKey, SectionKey } from './departments';
import {
  listApprovedMembers,
  listRolesPositions,
  listMemberTasks,
  createRolesPosition,
  updateRolesPosition,
  deleteRolesPosition,
  createMemberTask,
  updateMemberTask,
  deleteMemberTask,
  validateHierarchy,
  type ApprovedMember,
  type RolesPosition,
  type MemberTask,
  type TaskPriority,
  type TaskStatus,
} from '../lib/ebOperationsService';
import { ApplicantEmailLink } from '../components/ApplicantEmailLink';

interface RolesManagementProps {
  department: DepartmentKey;
  section?: SectionKey | null;
  headName?: string;
}

type TabMode = 'assignments' | 'hierarchy';
type HierarchyViewMode = 'chart' | 'list';

export const RolesManagement: React.FC<RolesManagementProps> = ({
  department,
  section,
  headName,
}) => {
  const [tab, setTab] = useState<TabMode>('assignments');
  const [hierarchyMode, setHierarchyMode] = useState<HierarchyViewMode>('chart');

  // Core Data
  const [members, setMembers] = useState<ApprovedMember[]>([]);
  const [positions, setPositions] = useState<RolesPosition[]>([]);
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters for Assignments view
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');

  // Hierarchy expansion state
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<MemberTask | null>(null);

  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<RolesPosition | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'task' | 'position';
    id: string;
    title: string;
  } | null>(null);

  // Form states: Task
  const [taskForm, setTaskForm] = useState<{
    member_id: string;
    position_id: string;
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    deadline: string;
    location: string;
    supervisor_id: string;
    supervisor_name: string;
    internal_notes: string;
  }>({
    member_id: '',
    position_id: '',
    title: '',
    description: '',
    priority: 'normal',
    status: 'not_started',
    deadline: '',
    location: '',
    supervisor_id: '',
    supervisor_name: '',
    internal_notes: '',
  });

  // Form states: Position
  const [posForm, setPosForm] = useState<{
    title: string;
    parent_position_id: string;
    assigned_member_id: string;
    responsibilities: string;
    notes: string;
  }>({
    title: '',
    parent_position_id: '',
    assigned_member_id: '',
    responsibilities: '',
    notes: '',
  });

  // Load all operational data
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [mList, pList, tList] = await Promise.all([
        listApprovedMembers(department, section),
        listRolesPositions(department, section),
        listMemberTasks(department, section),
      ]);
      setMembers(mList);
      setPositions(pList);
      setTasks(tList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load department operational records';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [department, section]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Flash message helper
  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const totalApproved = members.length;
    const assignedMemberIds = new Set(
      positions.map((p) => p.assigned_member_id).filter(Boolean)
    );
    const assignedCount = assignedMemberIds.size;
    const availableCount = Math.max(0, totalApproved - assignedCount);

    const activeTasks = tasks.filter((t) => t.status !== 'completed').length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;

    return {
      totalApproved,
      assignedCount,
      availableCount,
      activeTasks,
      completedTasks,
      totalPositions: positions.length,
    };
  }, [members, positions, tasks]);

  // Open Task Modal
  const handleOpenCreateTask = (presetMemberId?: string) => {
    setEditingTask(null);
    setTaskForm({
      member_id: presetMemberId || members[0]?.id || '',
      position_id: '',
      title: '',
      description: '',
      priority: 'normal',
      status: 'not_started',
      deadline: '',
      location: '',
      supervisor_id: '',
      supervisor_name: headName || '',
      internal_notes: '',
    });
    setShowTaskModal(true);
  };

  const handleOpenEditTask = (task: MemberTask) => {
    setEditingTask(task);
    setTaskForm({
      member_id: task.member_id,
      position_id: task.position_id || '',
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      deadline: task.deadline ? task.deadline.slice(0, 16) : '',
      location: task.location,
      supervisor_id: task.supervisor_id || '',
      supervisor_name: task.supervisor_name,
      internal_notes: task.internal_notes,
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      setErrorMsg('Task title is required.');
      return;
    }
    if (!taskForm.member_id) {
      setErrorMsg('Please select an approved member.');
      return;
    }

    setActionBusy(true);
    setErrorMsg('');

    try {
      if (editingTask) {
        const res = await updateMemberTask(editingTask.id, {
          title: taskForm.title,
          description: taskForm.description,
          member_id: taskForm.member_id,
          position_id: taskForm.position_id || null,
          priority: taskForm.priority,
          status: taskForm.status,
          deadline: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : null,
          location: taskForm.location,
          supervisor_id: taskForm.supervisor_id || null,
          supervisor_name: taskForm.supervisor_name,
          internal_notes: taskForm.internal_notes,
        });
        if (!res.ok) throw new Error(res.error || 'Failed to update task');
        flashSuccess(`Task "${taskForm.title}" updated successfully.`);
      } else {
        const res = await createMemberTask({
          department,
          section,
          member_id: taskForm.member_id,
          position_id: taskForm.position_id || null,
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          status: taskForm.status,
          deadline: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : null,
          location: taskForm.location,
          supervisor_id: taskForm.supervisor_id || null,
          supervisor_name: taskForm.supervisor_name,
          internal_notes: taskForm.internal_notes,
        });
        if (!res.ok) throw new Error(res.error || 'Failed to create task');
        flashSuccess(`Task "${taskForm.title}" assigned successfully.`);
      }

      setShowTaskModal(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving task');
    } finally {
      setActionBusy(false);
    }
  };

  // Quick Task Status Toggle
  const handleToggleTaskStatus = async (task: MemberTask, newStatus: TaskStatus) => {
    setActionBusy(true);
    try {
      const res = await updateMemberTask(task.id, { status: newStatus });
      if (!res.ok) throw new Error(res.error);
      flashSuccess(`Task marked as ${newStatus.replace('_', ' ')}.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update task status');
    } finally {
      setActionBusy(false);
    }
  };

  // Open Position Modal
  const handleOpenCreatePosition = (presetParentId?: string) => {
    setEditingPosition(null);
    setPosForm({
      title: '',
      parent_position_id: presetParentId || '',
      assigned_member_id: '',
      responsibilities: '',
      notes: '',
    });
    setShowPositionModal(true);
  };

  const handleOpenEditPosition = (pos: RolesPosition) => {
    setEditingPosition(pos);
    setPosForm({
      title: pos.title,
      parent_position_id: pos.parent_position_id || '',
      assigned_member_id: pos.assigned_member_id || '',
      responsibilities: pos.responsibilities,
      notes: pos.notes,
    });
    setShowPositionModal(true);
  };

  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posForm.title.trim()) {
      setErrorMsg('Position title is required.');
      return;
    }

    // Validation: Cycle detection check before persisting!
    if (editingPosition) {
      if (posForm.parent_position_id === editingPosition.id) {
        setErrorMsg('Validation Error: A position cannot report to itself.');
        return;
      }
      const testPositions = positions.map((p) =>
        p.id === editingPosition.id
          ? { ...p, parent_position_id: posForm.parent_position_id || null }
          : p
      );
      const validation = validateHierarchy(testPositions);
      if (!validation.valid) {
        setErrorMsg(`Hierarchy Conflict: ${validation.error}`);
        return;
      }
    }

    setActionBusy(true);
    setErrorMsg('');

    try {
      if (editingPosition) {
        const res = await updateRolesPosition(editingPosition.id, {
          title: posForm.title,
          parent_position_id: posForm.parent_position_id || null,
          assigned_member_id: posForm.assigned_member_id || null,
          responsibilities: posForm.responsibilities,
          notes: posForm.notes,
        });
        if (!res.ok) throw new Error(res.error);
        flashSuccess(`Organizational role "${posForm.title}" updated.`);
      } else {
        const res = await createRolesPosition({
          department,
          section,
          title: posForm.title,
          parent_position_id: posForm.parent_position_id || null,
          assigned_member_id: posForm.assigned_member_id || null,
          responsibilities: posForm.responsibilities,
          notes: posForm.notes,
        });
        if (!res.ok) throw new Error(res.error);
        flashSuccess(`Organizational role "${posForm.title}" added to hierarchy.`);
      }

      setShowPositionModal(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving position');
    } finally {
      setActionBusy(false);
    }
  };

  // Perform Deletion with Confirmation
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setActionBusy(true);
    try {
      if (deleteConfirm.type === 'task') {
        const res = await deleteMemberTask(deleteConfirm.id);
        if (!res.ok) throw new Error(res.error);
        flashSuccess(`Task "${deleteConfirm.title}" removed.`);
      } else {
        const res = await deleteRolesPosition(deleteConfirm.id);
        if (!res.ok) throw new Error(res.error);
        flashSuccess(`Role position "${deleteConfirm.title}" removed. Subordinate links preserved.`);
      }
      setDeleteConfirm(null);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Deletion failed');
    } finally {
      setActionBusy(false);
    }
  };

  // Filtered Tasks for Assignments View
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (memberFilter !== 'all' && t.member_id !== memberFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesMember = (t.member_name || '').toLowerCase().includes(q);
        const matchesLocation = t.location.toLowerCase().includes(q);
        const matchesSupervisor = t.supervisor_name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMember && !matchesLocation && !matchesSupervisor) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, memberFilter, searchQuery]);

  // Group members with their position and tasks
  const memberRoster = useMemo(() => {
    return members.map((m) => {
      const pos = positions.find((p) => p.assigned_member_id === m.id);
      const mTasks = tasks.filter((t) => t.member_id === m.id);
      const activeTasks = mTasks.filter((t) => t.status !== 'completed');
      return {
        ...m,
        position: pos,
        tasks: mTasks,
        activeTasksCount: activeTasks.length,
      };
    });
  }, [members, positions, tasks]);

  // Tree representation for Hierarchy
  const hierarchyTree = useMemo(() => {
    const nodeMap = new Map<string, RolesPosition & { children: any[] }>();
    positions.forEach((p) => {
      nodeMap.set(p.id, { ...p, children: [] });
    });

    const roots: Array<RolesPosition & { children: any[] }> = [];

    positions.forEach((p) => {
      const node = nodeMap.get(p.id)!;
      if (p.parent_position_id && nodeMap.has(p.parent_position_id)) {
        nodeMap.get(p.parent_position_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [positions]);

  const toggleNodeCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Render priority badge
  const renderPriorityBadge = (priority: TaskPriority) => {
    const styles: Record<TaskPriority, string> = {
      urgent: 'bg-red-500/20 text-red-300 border-red-500/40',
      high: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      normal: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      low: 'bg-neutral-800 text-neutral-400 border-white/10',
    };
    return (
      <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider border ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  // Render status badge
  const renderStatusBadge = (status: TaskStatus) => {
    const styles: Record<TaskStatus, { label: string; cls: string }> = {
      not_started: { label: 'Not Started', cls: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
      in_progress: { label: 'In Progress', cls: 'bg-[#d4af37]/20 text-[#f1d98c] border-[#d4af37]/40' },
      completed: { label: 'Completed', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    };
    const s = styles[status];
    return (
      <span className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  // Recursive Tree Node Renderer
  const renderHierarchyNode = (node: RolesPosition & { children: any[] }, depth = 0) => {
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.children.length > 0;
    const memberTasks = tasks.filter((t) => t.position_id === node.id || t.member_id === node.assigned_member_id);
    const activeTasks = memberTasks.filter((t) => t.status !== 'completed');

    return (
      <div key={node.id} className="relative flex flex-col items-center">
        {/* Node Card */}
        <div
          className={`relative z-10 w-64 rounded-xl border p-3.5 transition-all shadow-lg ${
            node.assigned_member_id
              ? 'border-[#d4af37]/40 bg-gradient-to-b from-[#18181f] to-[#111116] hover:border-[#d4af37]'
              : 'border-dashed border-neutral-700 bg-[#0e0e12] opacity-80 hover:opacity-100'
          }`}
        >
          {/* Top Row: Title & Action buttons */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] font-semibold">
                Tier {depth + 1} Role
              </span>
              <h4 className="text-xs font-bold text-white line-clamp-1">{node.title}</h4>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenEditPosition(node)}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
                title="Edit Position"
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button
                onClick={() => setDeleteConfirm({ type: 'position', id: node.id, title: node.title })}
                className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                title="Remove Position"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Assigned Member Info */}
          <div className="mt-2.5 pt-2.5 border-t border-white/5">
            {node.assigned_member_id ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-200">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{node.assigned_member_name || 'Assigned Member'}</span>
                </div>
                {node.assigned_member_email && (
                  <div className="text-[10px] text-neutral-400 font-mono truncate pl-5">
                    <ApplicantEmailLink
                      applicantName={node.assigned_member_name || 'Team Member'}
                      applicantEmail={node.assigned_member_email}
                      type="team"
                      department={department}
                      roleTitle={node.title}
                    />
                  </div>
                )}
                {node.assigned_member_institution && (
                  <div className="text-[10px] text-neutral-500 truncate pl-5">
                    {node.assigned_member_institution}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-500" /> Vacant Post
                </span>
                <button
                  onClick={() => handleOpenEditPosition(node)}
                  className="text-[10px] text-[#f1d98c] hover:underline"
                >
                  Assign Member
                </button>
              </div>
            )}
          </div>

          {/* Responsibilities snippet */}
          {node.responsibilities && (
            <p className="mt-2 text-[10px] text-neutral-400 line-clamp-2 italic">
              "{node.responsibilities}"
            </p>
          )}

          {/* Footer Badge & Quick Add Child */}
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
            <span className="font-mono text-neutral-400">
              {activeTasks.length} active {activeTasks.length === 1 ? 'task' : 'tasks'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenCreatePosition(node.id)}
                className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-mono text-[#f1d98c] bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border border-[#d4af37]/30 transition-colors"
                title="Add subordinate role"
              >
                <Plus className="h-2.5 w-2.5" /> Sub-role
              </button>
              {hasChildren && (
                <button
                  onClick={() => toggleNodeCollapse(node.id)}
                  className="rounded p-0.5 text-neutral-400 hover:text-white transition-colors"
                  title={isCollapsed ? 'Expand branch' : 'Collapse branch'}
                >
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tree Branch Connectors */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center">
            {/* Vertical stem down */}
            <div className="h-6 w-0.5 bg-[#d4af37]/40" />

            {/* Horizontal bar across children */}
            <div className="relative flex items-start justify-center gap-8 pt-6">
              {node.children.length > 1 && (
                <div
                  className="absolute top-0 h-0.5 bg-[#d4af37]/40"
                  style={{
                    left: 'calc(132px)',
                    right: 'calc(132px)',
                  }}
                />
              )}
              {node.children.map((child: any) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Stem down to child */}
                  <div className="absolute -top-6 h-6 w-0.5 bg-[#d4af37]/40" />
                  {renderHierarchyNode(child, depth + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-[#141419] via-[#101015] to-[#141419] p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#d4af37] animate-pulse" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">
                Executive Bureau · Operations Directorate
              </span>
            </div>
            <h1 className="mt-1 font-cinzel text-xl font-bold tracking-wide text-white">
              Roles & Hierarchy Management
            </h1>
            <p className="mt-0.5 text-xs text-neutral-400">
              Department reporting structures, positions, and live operational task assignments for approved personnel.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              onClick={() => handleOpenCreatePosition()}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
            >
              <GitFork className="h-3.5 w-3.5 text-[#d4af37]" /> Add Position
            </button>
            <button
              onClick={() => handleOpenCreateTask()}
              className="flex items-center gap-1.5 rounded-md border border-[#d4af37]/60 bg-[#d4af37]/20 px-3.5 py-2 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/30 transition-colors shadow-md"
            >
              <Plus className="h-3.5 w-3.5" /> Assign Task
            </button>
          </div>
        </div>

        {/* Operational Metrics Bar */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <Users className="h-3 w-3 text-[#d4af37]" /> Approved Staff
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-white">{metrics.totalApproved}</div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-emerald-400" /> Assigned Roles
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-emerald-300">{metrics.assignedCount}</div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <Users className="h-3 w-3 text-neutral-500" /> Unassigned
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-neutral-400">{metrics.availableCount}</div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <GitFork className="h-3 w-3 text-blue-400" /> Total Roles
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-blue-300">{metrics.totalPositions}</div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-400" /> Active Tasks
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-amber-300">{metrics.activeTasks}</div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Completed
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-emerald-300">{metrics.completedTasks}</div>
          </div>
        </div>
      </div>

      {/* Notice / Feedback Banners */}
      {errorMsg && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('assignments')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
              tab === 'assignments'
                ? 'border border-[#d4af37]/60 bg-[#d4af37]/15 text-[#f1d98c]'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Briefcase className="h-4 w-4" /> Roles & Assignments
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-mono text-neutral-300">
              {tasks.length}
            </span>
          </button>

          <button
            onClick={() => setTab('hierarchy')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
              tab === 'hierarchy'
                ? 'border border-[#d4af37]/60 bg-[#d4af37]/15 text-[#f1d98c]'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <GitFork className="h-4 w-4" /> Hierarchy Chart
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-mono text-neutral-300">
              {positions.length}
            </span>
          </button>
        </div>

        {tab === 'hierarchy' && (
          <div className="flex items-center gap-1 rounded-md border border-white/10 bg-[#111116] p-1">
            <button
              onClick={() => setHierarchyMode('chart')}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                hierarchyMode === 'chart' ? 'bg-[#d4af37]/20 text-[#f1d98c]' : 'text-neutral-400 hover:text-white'
              }`}
              title="Visual Org Chart"
            >
              <Network className="h-3.5 w-3.5" /> Chart
            </button>
            <button
              onClick={() => setHierarchyMode('list')}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                hierarchyMode === 'list' ? 'bg-[#d4af37]/20 text-[#f1d98c]' : 'text-neutral-400 hover:text-white'
              }`}
              title="Hierarchical List View"
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: ROLES & ASSIGNMENTS                                           */}
      {/* ==================================================================== */}
      {tab === 'assignments' && (
        <div className="space-y-6">
          {/* Member Roster & Quick Assignment Overview */}
          <section className="rounded-xl border border-white/10 bg-[#111116] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#d4af37]" /> Approved Department Roster
              </h3>
              <span className="text-[11px] text-neutral-500">
                Only approved personnel can receive official tasks and positions
              </span>
            </div>

            {members.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-neutral-500">
                No approved applicants found in this department and section yet. Review and accept candidates in Applications first.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {memberRoster.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border border-white/10 bg-[#0c0c10] p-3 hover:border-white/20 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">{m.full_name}</span>
                        {m.position ? (
                          <span className="rounded bg-[#d4af37]/15 px-1.5 py-0.5 text-[9px] font-mono text-[#f1d98c] border border-[#d4af37]/30 truncate max-w-[120px]">
                            {m.position.title}
                          </span>
                        ) : (
                          <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] font-mono text-neutral-400">
                            Available
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] font-mono text-neutral-400 truncate">
                        <ApplicantEmailLink
                          applicantName={m.full_name}
                          applicantEmail={m.email}
                          type="team"
                          department={department}
                          roleTitle={m.position?.title}
                        />
                      </div>
                      <div className="mt-0.5 text-[10px] text-neutral-500 truncate">
                        {m.institution || 'Independent Candidate'}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">
                        {m.activeTasksCount} active {m.activeTasksCount === 1 ? 'task' : 'tasks'}
                      </span>
                      <button
                        onClick={() => handleOpenCreateTask(m.id)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-[#f1d98c] hover:underline"
                      >
                        <Plus className="h-3 w-3" /> Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Filter Bar for Tasks */}
          <div className="rounded-xl border border-white/10 bg-[#111116] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks by title, assignee, location, supervisor..."
                  className="w-full rounded-md border border-white/10 bg-[#0c0c10] pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="rounded-md border border-white/10 bg-[#0c0c10] px-2.5 py-1.5 text-xs text-neutral-200 focus:border-[#d4af37] focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="rounded-md border border-white/10 bg-[#0c0c10] px-2.5 py-1.5 text-xs text-neutral-200 focus:border-[#d4af37] focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="rounded-md border border-white/10 bg-[#0c0c10] px-2.5 py-1.5 text-xs text-neutral-200 focus:border-[#d4af37] focus:outline-none max-w-[160px]"
                >
                  <option value="all">All Members</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-10 text-center space-y-3">
                <Briefcase className="mx-auto h-8 w-8 text-neutral-600" />
                <h4 className="text-sm font-semibold text-white">No Assigned Tasks Found</h4>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  {tasks.length === 0
                    ? 'No operational tasks have been assigned yet. Select an approved member to delegate responsibilities.'
                    : 'No tasks match the active filters.'}
                </p>
                {tasks.length === 0 && (
                  <button
                    onClick={() => handleOpenCreateTask()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#d4af37]/50 bg-[#d4af37]/20 px-3 py-1.5 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/30 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Create First Task
                  </button>
                )}
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-xl border p-4 transition-all ${
                    task.status === 'completed'
                      ? 'border-white/5 bg-[#0f0f13] opacity-75'
                      : 'border-white/10 bg-[#111116] hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(task.status)}
                        {renderPriorityBadge(task.priority)}
                        <h4 className={`text-sm font-bold text-white ${task.status === 'completed' ? 'line-through text-neutral-400' : ''}`}>
                          {task.title}
                        </h4>
                      </div>
                      {task.description && (
                        <p className="text-xs text-neutral-300 leading-relaxed max-w-3xl">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Quick Status and Actions */}
                    <div className="flex items-center gap-2">
                      <select
                        value={task.status}
                        onChange={(e) => void handleToggleTaskStatus(task, e.target.value as TaskStatus)}
                        className="rounded border border-white/10 bg-[#0c0c10] px-2 py-1 text-[11px] font-mono text-neutral-200 focus:border-[#d4af37] focus:outline-none"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>

                      <button
                        onClick={() => handleOpenEditTask(task)}
                        className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                        title="Edit Task"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'task', id: task.id, title: task.title })}
                        className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Task Metadata Row */}
                  <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-neutral-200 font-medium">{task.member_name}</span>
                      {task.position_title && (
                        <span className="text-[10px] font-mono text-[#f1d98c]">({task.position_title})</span>
                      )}
                    </div>

                    {task.deadline && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-amber-400" />
                        <span>Deadline: {new Date(task.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}

                    {task.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                        <span>Station: {task.location}</span>
                      </div>
                    )}

                    {task.supervisor_name && (
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                        <span>Supervisor: {task.supervisor_name}</span>
                      </div>
                    )}
                  </div>

                  {task.internal_notes && (
                    <div className="mt-2 text-[11px] text-neutral-400 bg-black/30 rounded p-2 border border-white/5">
                      <span className="font-semibold text-neutral-300">Internal Head Notes:</span> {task.internal_notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: HIERARCHY (VISUAL ORG CHART & LIST VIEW)                      */}
      {/* ==================================================================== */}
      {tab === 'hierarchy' && (
        <div className="space-y-6">
          {positions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-12 text-center space-y-3">
              <GitFork className="mx-auto h-10 w-10 text-neutral-600" />
              <h4 className="text-base font-semibold text-white">No Organizational Hierarchy Created</h4>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Organize your department into a clear chain of command (Team Leaders, Coordinators, Specialists).
                Positions can be created with or without an assigned member.
              </p>
              <button
                onClick={() => handleOpenCreatePosition()}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#d4af37]/60 bg-[#d4af37]/20 px-4 py-2 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/30 transition-colors shadow-lg"
              >
                <Plus className="h-3.5 w-3.5" /> Create Top-Tier Role
              </button>
            </div>
          ) : hierarchyMode === 'chart' ? (
            /* Visual Org Chart with zoom/scroll box */
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0a0a0d] p-8 min-h-[500px]">
              <div className="flex flex-col items-center gap-10 min-w-max">
                {/* Department Head Root Card */}
                <div className="w-72 rounded-xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1f1a10] to-[#121114] p-4 text-center shadow-2xl shadow-[#d4af37]/10">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-mono uppercase tracking-wider text-[#d4af37]">
                    <ShieldCheck className="h-4 w-4" /> Department Leadership
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-white uppercase font-cinzel">
                    {department.replace('_', ' ')} Head
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-300">
                    {headName || 'Authorized Directorate'}
                  </p>
                  <div className="mt-3 pt-2 border-t border-[#d4af37]/30 flex justify-center">
                    <button
                      onClick={() => handleOpenCreatePosition()}
                      className="flex items-center gap-1 rounded bg-[#d4af37]/20 px-2 py-1 text-[10px] font-mono text-[#f1d98c] hover:bg-[#d4af37]/30 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add Tier-1 Post
                    </button>
                  </div>
                </div>

                {/* Connecting Line Down from Head */}
                <div className="h-8 w-0.5 bg-[#d4af37]" />

                {/* Root Hierarchy Branches */}
                <div className="flex flex-wrap items-start justify-center gap-10">
                  {hierarchyTree.map((rootNode) => renderHierarchyNode(rootNode))}
                </div>
              </div>
            </div>
          ) : (
            /* Structured Hierarchical List View */
            <div className="rounded-xl border border-white/10 bg-[#111116] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c0c10] text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3">Role Title</th>
                    <th className="px-4 py-3">Reporting Supervisor</th>
                    <th className="px-4 py-3">Assigned Member</th>
                    <th className="px-4 py-3">Responsibilities</th>
                    <th className="px-4 py-3">Active Tasks</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {positions.map((pos) => {
                    const parent = positions.find((p) => p.id === pos.parent_position_id);
                    return (
                      <tr key={pos.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                          {pos.title}
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-400 whitespace-nowrap">
                          {parent ? parent.title : `${department.toUpperCase()} Head`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {pos.assigned_member_name ? (
                            <div>
                              <div className="font-medium text-emerald-300">{pos.assigned_member_name}</div>
                              <div className="text-[10px] text-neutral-500 font-mono">{pos.assigned_member_institution}</div>
                            </div>
                          ) : (
                            <span className="text-amber-500 font-mono text-[11px]">(Vacant Position)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-300 max-w-xs truncate">
                          {pos.responsibilities || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-300 whitespace-nowrap">
                          {pos.active_tasks_count || 0}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditPosition(pos)}
                            className="p-1 text-neutral-400 hover:text-white mr-2"
                            title="Edit Role"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'position', id: pos.id, title: pos.title })}
                            className="p-1 text-neutral-500 hover:text-red-400"
                            title="Remove Role"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ASSIGN / EDIT TASK                                            */}
      {/* ==================================================================== */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl border border-white/10 bg-[#121217] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#d4af37]" />
                {editingTask ? 'Edit Task Assignment' : 'Assign New Operational Task'}
              </h3>
              <button onClick={() => setShowTaskModal(false)} className="text-neutral-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              {/* Assignee Selection (Approved Members Only) */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Assignee (Approved Department Members) *
                </label>
                <select
                  value={taskForm.member_id}
                  onChange={(e) => setTaskForm({ ...taskForm, member_id: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white focus:border-[#d4af37] focus:outline-none"
                  required
                >
                  <option value="" disabled>Select approved candidate</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-neutral-500">
                  Strictly limited to candidates with accepted/approved registration status.
                </p>
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Committee Photography Coverage, Main Stage Lanyard Check"
                  className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                  required
                />
              </div>

              {/* Specific Responsibilities / Description */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Responsibilities & Instructions
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={3}
                  placeholder="Specify operating procedures, camera settings, arrival times, handover instructions..."
                  className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                    className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white focus:border-[#d4af37] focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                    Status
                  </label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}
                    className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white focus:border-[#d4af37] focus:outline-none"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Deadline & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                    Station / Work Area
                  </label>
                  <input
                    type="text"
                    value={taskForm.location}
                    onChange={(e) => setTaskForm({ ...taskForm, location: e.target.value })}
                    placeholder="e.g. Hall A, Entrance Desk, Press Room"
                    className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Reporting Supervisor */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Reporting Supervisor
                </label>
                <input
                  type="text"
                  value={taskForm.supervisor_name}
                  onChange={(e) => setTaskForm({ ...taskForm, supervisor_name: e.target.value })}
                  placeholder="e.g. Media Head, Volunteer Team Leader"
                  className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Internal Head Notes */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Internal Head Notes (Private)
                </label>
                <textarea
                  value={taskForm.internal_notes}
                  onChange={(e) => setTaskForm({ ...taskForm, internal_notes: e.target.value })}
                  rows={2}
                  placeholder="Confidential notes for department leadership..."
                  className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="rounded-md border border-[#d4af37]/60 bg-[#d4af37]/20 px-4 py-2 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/30 disabled:opacity-50"
                >
                  {actionBusy ? 'Saving...' : editingTask ? 'Update Task' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: CREATE / EDIT HIERARCHY POSITION                              */}
      {/* ==================================================================== */}
      {showPositionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl border border-white/10 bg-[#121217] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitFork className="h-4 w-4 text-[#d4af37]" />
                {editingPosition ? 'Edit Hierarchy Role Position' : 'Create Hierarchy Role Position'}
              </h3>
              <button onClick={() => setShowPositionModal(false)} className="text-neutral-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePosition} className="space-y-4 text-xs">
              {/* Position Title */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Organizational Role Title *
                </label>
                <input
                  type="text"
                  value={posForm.title}
                  onChange={(e) => setPosForm({ ...posForm, title: e.target.value })}
                  placeholder="e.g. Photography Lead, Hall Security Supervisor, Team Leader"
                  className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                  required
                />
              </div>

              {/* Reporting Parent / Supervisor Position */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Reports To (Parent Position)
                </label>
                <select
                  value={posForm.parent_position_id}
                  onChange={(e) => setPosForm({ ...posForm, parent_position_id: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white focus:border-[#d4af37] focus:outline-none"
                >
                  <option value="">Directly to Department Head</option>
                  {positions
                    .filter((p) => !editingPosition || p.id !== editingPosition.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.assigned_member_name ? `(${p.assigned_member_name})` : '(Vacant)'}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-[10px] text-neutral-500">
                  Select the supervisor post in the chain of command. Cycle detection prevents circular reporting loops.
                </p>
              </div>

              {/* Assigned Member (Optional - Positions can be vacant) */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Assigned Team Member (Optional)
                </label>
                <select
                  value={posForm.assigned_member_id}
                  onChange={(e) => setPosForm({ ...posForm, assigned_member_id: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white focus:border-[#d4af37] focus:outline-none"
                >
                  <option value="">Leave Vacant (Unassigned)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Permanent Role Responsibilities
                </label>
                <textarea
                  value={posForm.responsibilities}
                  onChange={(e) => setPosForm({ ...posForm, responsibilities: e.target.value })}
                  rows={3}
                  placeholder="e.g. Supervises photo deliverables, oversees hall clearance and entrance crowd control..."
                  className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Internal Notes
                </label>
                <textarea
                  value={posForm.notes}
                  onChange={(e) => setPosForm({ ...posForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Internal notes regarding role allocation..."
                  className="w-full rounded-md border border-white/10 bg-[#0c0c10] px-3 py-2 text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPositionModal(false)}
                  className="rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="rounded-md border border-[#d4af37]/60 bg-[#d4af37]/20 px-4 py-2 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/30 disabled:opacity-50"
                >
                  {actionBusy ? 'Saving...' : editingPosition ? 'Save Position' : 'Create Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: DELETE CONFIRMATION                                           */}
      {/* ==================================================================== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-red-500/40 bg-[#121217] p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-neutral-300">
              Are you sure you want to remove {deleteConfirm.type === 'task' ? 'task' : 'position'}{' '}
              <strong className="text-white">"{deleteConfirm.title}"</strong>?
            </p>
            {deleteConfirm.type === 'position' && (
              <p className="text-[11px] text-neutral-500">
                Subordinate positions will automatically have their supervisor link safely reset to the Department Head, preventing broken references.
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-md border border-white/10 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionBusy}
                className="rounded-md border border-red-500/50 bg-red-950/80 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-900"
              >
                {actionBusy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesManagement;
