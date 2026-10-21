import React from 'react';
import {
  X,
  User,
  Shield,
  Layers,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  FileText,
  Mail,
  Phone,
  Building,
} from 'lucide-react';
import type {
  ApprovedMember,
  DepartmentPosition,
  DepartmentTask,
  TaskPriority,
  TaskStatus,
} from '../services/rolesStore';
import { Modal, btnSecondary } from '../../dashboard/ui';

interface MemberRoleDossierProps {
  open: boolean;
  onClose: () => void;
  member: ApprovedMember | null;
  position?: DepartmentPosition | null;
  supervisor?: ApprovedMember | null;
  tasks: DepartmentTask[];
  directReports: { member: ApprovedMember; position?: DepartmentPosition; tasks: DepartmentTask[] }[];
  onUpdateTaskStatus?: (taskId: string, status: TaskStatus) => void;
  onAssignNewTask?: (memberId: string) => void;
}

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

export const MemberRoleDossier: React.FC<MemberRoleDossierProps> = ({
  open,
  onClose,
  member,
  position,
  supervisor,
  tasks,
  directReports,
  onUpdateTaskStatus,
  onAssignNewTask,
}) => {
  if (!member) return null;

  const memberTasks = tasks.filter((t) => t.member_id === member.id);
  const activeTasks = memberTasks.filter((t) => t.status !== 'completed');
  const completedTasks = memberTasks.filter((t) => t.status === 'completed');

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow="Department Member Dossier"
      title={member.full_name}
      description={
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-neutral-400">
          <span>{member.email}</span>
          {member.phone && <span>· {member.phone}</span>}
          {member.section && (
            <span className="rounded bg-[#d4af37]/15 px-1.5 py-0.5 text-[10px] text-[#d4af37] border border-[#d4af37]/30 uppercase">
              {member.section} section
            </span>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {onAssignNewTask && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAssignNewTask(member.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/15 px-3 py-1.5 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/25 transition-colors"
              >
                Assign Task to Member
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Organizational Role */}
          <div className="rounded-lg border border-[#d4af37]/30 bg-[#12110c] p-3.5 space-y-1">
            <span className="block text-[9.5px] font-mono uppercase tracking-wider text-[#d4af37]">
              Hierarchy Position
            </span>
            <p className="font-serif text-sm font-semibold text-white">
              {position ? position.title : 'No Position Assigned'}
            </p>
            {position?.description && (
              <p className="text-[10.5px] text-neutral-400 line-clamp-2">
                {position.description}
              </p>
            )}
          </div>

          {/* Direct Supervisor */}
          <div className="rounded-lg border border-white/[0.08] bg-[#0c0c0f] p-3.5 space-y-1">
            <span className="block text-[9.5px] font-mono uppercase tracking-wider text-neutral-400">
              Direct Supervisor
            </span>
            <p className="font-medium text-neutral-200">
              {supervisor ? supervisor.full_name : 'Department Head / Secretariat'}
            </p>
            {supervisor?.email && (
              <p className="text-[10px] text-neutral-400 font-mono">
                {supervisor.email}
              </p>
            )}
          </div>

          {/* Academic / Institution */}
          <div className="rounded-lg border border-white/[0.08] bg-[#0c0c0f] p-3.5 space-y-1">
            <span className="block text-[9.5px] font-mono uppercase tracking-wider text-neutral-400">
              Institution / School
            </span>
            <p className="truncate font-medium text-neutral-200">
              {member.institution || '—'}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 className="h-3 w-3" />
              Approved Member
            </span>
          </div>
        </div>

        {/* Assigned Tasks Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#d4af37]" />
              <h4 className="font-serif text-sm font-semibold text-white">
                Assigned Responsibilities & Tasks ({memberTasks.length})
              </h4>
            </div>
            <span className="text-[10.5px] font-mono text-neutral-400">
              {activeTasks.length} active · {completedTasks.length} completed
            </span>
          </div>

          {memberTasks.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/[0.1] p-4 text-center text-neutral-400">
              No tasks currently assigned to {member.full_name}.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {memberTasks.map((task) => {
                const prio = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.normal;
                const stat = STATUS_BADGES[task.status] || STATUS_BADGES.not_started;

                return (
                  <div
                    key={task.id}
                    className="rounded-lg border border-white/[0.08] bg-[#0c0c0f] p-3 transition-colors hover:border-white/[0.15]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-serif font-semibold text-neutral-100">
                            {task.title}
                          </h5>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase border ${prio.cls}`}
                          >
                            {prio.label}
                          </span>
                        </div>
                        {task.description && (
                          <p className="mt-1 text-[11px] text-neutral-300 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Status Toggle Selector */}
                      <div className="flex items-center gap-2">
                        {onUpdateTaskStatus ? (
                          <select
                            value={task.status}
                            onChange={(e) =>
                              onUpdateTaskStatus(task.id, e.target.value as TaskStatus)
                            }
                            className={`rounded border px-2 py-1 text-[10.5px] font-mono font-medium focus:outline-none cursor-pointer ${stat.cls}`}
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        ) : (
                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] font-mono ${stat.cls}`}
                          >
                            {stat.label}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-4 border-t border-white/[0.04] pt-2 text-[10.5px] text-neutral-400">
                      {task.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#d4af37]" />
                          <span>{task.location}</span>
                        </span>
                      )}
                      {task.deadline && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-amber-400" />
                          <span>Due: {formatDate(task.deadline)}</span>
                        </span>
                      )}
                      {task.notes && (
                        <span className="truncate italic text-neutral-400">
                          Note: {task.notes}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reporting Subordinates / Direct Reports */}
        {directReports.length > 0 && (
          <div className="space-y-3 border-t border-white/[0.08] pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#d4af37]" />
              <h4 className="font-serif text-sm font-semibold text-white">
                Team Members Reporting to {member.full_name} ({directReports.length})
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {directReports.map(({ member: repMember, position: repPos, tasks: repTasks }) => (
                <div
                  key={repMember.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"
                >
                  <p className="font-medium text-neutral-200">{repMember.full_name}</p>
                  <p className="text-[10px] font-mono text-[#d4af37]">
                    {repPos ? repPos.title : 'Subordinate Member'}
                  </p>
                  <p className="mt-1 text-[10.5px] text-neutral-400">
                    {repTasks.length} active responsibility{repTasks.length === 1 ? '' : 'ies'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
