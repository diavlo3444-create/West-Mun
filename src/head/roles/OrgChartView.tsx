import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  User,
  Users,
  Shield,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import type { DepartmentPosition, ApprovedMember, DepartmentTask } from '../services/rolesStore';
import { btnGhost } from '../../dashboard/ui';

interface OrgChartViewProps {
  positions: DepartmentPosition[];
  members: ApprovedMember[];
  tasks: DepartmentTask[];
  onAddPosition: (parentId?: string | null) => void;
  onEditPosition: (position: DepartmentPosition) => void;
  onDeletePosition: (position: DepartmentPosition) => void;
  onSelectMember: (member: ApprovedMember, position?: DepartmentPosition) => void;
}

interface TreeNode {
  position: DepartmentPosition;
  children: TreeNode[];
}

function buildTree(positions: DepartmentPosition[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes
  for (const pos of positions) {
    map.set(pos.id, { position: pos, children: [] });
  }

  // Connect parents and children
  for (const pos of positions) {
    const node = map.get(pos.id)!;
    if (pos.parent_position_id && map.has(pos.parent_position_id)) {
      map.get(pos.parent_position_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const OrgChartView: React.FC<OrgChartViewProps> = ({
  positions,
  members,
  tasks,
  onAddPosition,
  onEditPosition,
  onDeletePosition,
  onSelectMember,
}) => {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tree = buildTree(positions);

  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.08] bg-[#0c0c0f] p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]">
          <Layers className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-sm font-serif font-semibold text-white">No Organizational Positions Yet</h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-neutral-400">
          Create the leadership and reporting hierarchy for your department. Start by adding a root
          position (e.g. Team Lead, Operations Supervisor), then build sub-teams underneath.
        </p>
        <button
          type="button"
          onClick={() => onAddPosition(null)}
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-[#d4af37]/40 bg-[#d4af37] px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#e2c258]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add First Position</span>
        </button>
      </div>
    );
  }

  const renderTreeNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const { position, children } = node;
    const isCollapsed = collapsedNodes.has(position.id);
    const assignedMember = members.find((m) => m.id === position.member_id);
    const memberTasks = assignedMember ? tasks.filter((t) => t.member_id === assignedMember.id) : [];
    const hasChildren = children.length > 0;

    return (
      <div key={position.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div
          onClick={() => {
            if (assignedMember) {
              onSelectMember(assignedMember, position);
            } else {
              onEditPosition(position);
            }
          }}
          className={`group relative w-72 cursor-pointer rounded-lg border transition-all duration-200 ${
            assignedMember
              ? 'border-[#d4af37]/30 bg-[#12110c] hover:border-[#d4af37]/70 hover:shadow-lg hover:shadow-black/60'
              : 'border-white/[0.08] bg-[#0f0f13] hover:border-white/[0.2]'
          }`}
        >
          {/* Top highlight bar */}
          <div
            className={`h-1 w-full rounded-t-lg ${
              depth === 0 ? 'bg-[#d4af37]' : assignedMember ? 'bg-[#d4af37]/60' : 'bg-neutral-700'
            }`}
          />

          <div className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="inline-block text-[9px] font-mono uppercase tracking-wider text-[#d4af37]/80">
                  {depth === 0 ? 'Leadership' : `Level ${depth + 1}`}
                </span>
                <h4 className="truncate font-serif text-[13px] font-semibold text-white">
                  {position.title}
                </h4>
              </div>

              {/* Action buttons (stop propagation) */}
              <div
                className="flex items-center gap-1 opacity-80 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  title="Add subordinate position"
                  onClick={() => onAddPosition(position.id)}
                  className="rounded p-1 text-neutral-400 hover:bg-white/[0.08] hover:text-[#d4af37] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Edit position"
                  onClick={() => onEditPosition(position)}
                  className="rounded p-1 text-neutral-400 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete position"
                  onClick={() => onDeletePosition(position)}
                  className="rounded p-1 text-neutral-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {position.description && (
              <p className="mt-1 line-clamp-1 text-[11px] text-neutral-400">
                {position.description}
              </p>
            )}

            {/* Assigned Member info or Vacant pill */}
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
              {assignedMember ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/40 bg-[#d4af37]/15 text-[10px] font-mono font-bold text-[#d4af37]">
                    {initials(assignedMember.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-200">
                      {assignedMember.full_name}
                    </p>
                    <p className="truncate text-[10px] text-neutral-400">
                      {assignedMember.institution || assignedMember.email}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-400/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="text-[11px] font-mono italic">Vacant Position</span>
                </div>
              )}

              {/* Task Count badge */}
              {assignedMember && memberTasks.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-[#d4af37]/15 px-1.5 py-0.5 text-[9.5px] font-mono text-[#d4af37] border border-[#d4af37]/30">
                  <span>{memberTasks.length} task{memberTasks.length === 1 ? '' : 's'}</span>
                </span>
              )}
            </div>

            {/* Sub-teams counter / toggle */}
            {hasChildren && (
              <div
                onClick={(e) => toggleCollapse(position.id, e)}
                className="mt-2.5 flex items-center justify-between rounded bg-white/[0.03] px-2 py-1 text-[10.5px] font-mono text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-200 transition-colors"
              >
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-[#d4af37]" />
                  <span>
                    {children.length} sub-position{children.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="flex items-center gap-0.5 text-[#d4af37]">
                  {isCollapsed ? (
                    <>
                      <span>Expand</span>
                      <ChevronRight className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <span>Collapse</span>
                      <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Connecting Line Downward */}
        {hasChildren && !isCollapsed && (
          <div className="h-6 w-0.5 bg-[#d4af37]/30" />
        )}

        {/* Children Container */}
        {hasChildren && !isCollapsed && (
          <div className="relative flex items-start justify-center gap-6 pt-2">
            {/* Horizontal connector bar across siblings */}
            {children.length > 1 && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 bg-[#d4af37]/30"
                style={{
                  width: `calc(100% - ${288 / 2}px)`,
                }}
              />
            )}

            {children.map((childNode) => (
              <div key={childNode.position.id} className="relative flex flex-col items-center">
                {/* Vertical hook from horizontal bar to child node */}
                <div className="h-4 w-0.5 bg-[#d4af37]/30" />
                {renderTreeNode(childNode, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-[#0c0c0f] p-3 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d4af37]/20 text-[#d4af37] text-[10px] font-mono">
            i
          </span>
          <span>
            Click on any position card to view the member's full dossier, supervisor, and assigned tasks.
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAddPosition(null)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/15 px-3 py-1.5 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/25 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Position</span>
        </button>
      </div>

      <div className="overflow-x-auto pb-8 pt-4">
        <div className="flex min-w-max flex-col items-center gap-10">
          {tree.map((rootNode) => (
            <div key={rootNode.position.id} className="flex flex-col items-center">
              {renderTreeNode(rootNode, 0)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
