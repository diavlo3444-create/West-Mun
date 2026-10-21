import React from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  User,
  Users,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import type { DepartmentPosition, ApprovedMember, DepartmentTask } from '../services/rolesStore';
import { btnGhost } from '../../dashboard/ui';

interface OrgListViewProps {
  positions: DepartmentPosition[];
  members: ApprovedMember[];
  tasks: DepartmentTask[];
  onAddPosition: (parentId?: string | null) => void;
  onEditPosition: (position: DepartmentPosition) => void;
  onDeletePosition: (position: DepartmentPosition) => void;
  onSelectMember: (member: ApprovedMember, position?: DepartmentPosition) => void;
}

interface FlattenedNode {
  position: DepartmentPosition;
  level: number;
  parentTitle?: string;
  childCount: number;
}

function flattenTree(positions: DepartmentPosition[]): FlattenedNode[] {
  const map = new Map<string, { position: DepartmentPosition; children: DepartmentPosition[] }>();
  const rootPositions: DepartmentPosition[] = [];

  for (const pos of positions) {
    map.set(pos.id, { position: pos, children: [] });
  }

  for (const pos of positions) {
    if (pos.parent_position_id && map.has(pos.parent_position_id)) {
      map.get(pos.parent_position_id)!.children.push(pos);
    } else {
      rootPositions.push(pos);
    }
  }

  const result: FlattenedNode[] = [];

  function traverse(pos: DepartmentPosition, level: number, parentTitle?: string) {
    const entry = map.get(pos.id);
    const children = entry ? entry.children : [];
    result.push({
      position: pos,
      level,
      parentTitle,
      childCount: children.length,
    });
    for (const child of children) {
      traverse(child, level + 1, pos.title);
    }
  }

  for (const root of rootPositions) {
    traverse(root, 0, undefined);
  }

  return result;
}

export const OrgListView: React.FC<OrgListViewProps> = ({
  positions,
  members,
  tasks,
  onAddPosition,
  onEditPosition,
  onDeletePosition,
  onSelectMember,
}) => {
  const flattened = flattenTree(positions);

  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.08] bg-[#0c0c0f] p-8 text-center text-xs text-neutral-400">
        No positions found in the hierarchy.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c0c0f]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              <th className="px-4 py-3">Position Title</th>
              <th className="px-4 py-3">Assigned Member</th>
              <th className="px-4 py-3">Direct Supervisor</th>
              <th className="px-4 py-3 text-center">Active Tasks</th>
              <th className="px-4 py-3 text-center">Sub-Teams</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {flattened.map(({ position, level, parentTitle, childCount }) => {
              const assignedMember = members.find((m) => m.id === position.member_id);
              const memberTasks = assignedMember
                ? tasks.filter((t) => t.member_id === assignedMember.id)
                : [];

              return (
                <tr
                  key={position.id}
                  className="transition-colors hover:bg-white/[0.02] group"
                >
                  {/* Position Title with Indentation */}
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${level * 20}px` }}
                    >
                      {level > 0 && (
                        <span className="text-[#d4af37]/50 font-mono text-xs select-none">
                          ↳
                        </span>
                      )}
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] text-[10px] font-mono">
                        {level + 1}
                      </span>
                      <span className="font-serif font-medium text-white">
                        {position.title}
                      </span>
                    </div>
                    {position.description && (
                      <p
                        className="mt-0.5 text-[10.5px] text-neutral-400 line-clamp-1"
                        style={{ paddingLeft: `${level * 20 + 28}px` }}
                      >
                        {position.description}
                      </p>
                    )}
                  </td>

                  {/* Assigned Member */}
                  <td className="px-4 py-3">
                    {assignedMember ? (
                      <button
                        type="button"
                        onClick={() => onSelectMember(assignedMember, position)}
                        className="flex items-center gap-2 text-left hover:text-[#d4af37] transition-colors"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/15 text-[#d4af37] text-[9.5px] font-mono">
                          {assignedMember.full_name[0]?.toUpperCase() || '?'}
                        </span>
                        <div>
                          <p className="font-medium text-neutral-200 hover:underline">
                            {assignedMember.full_name}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {assignedMember.institution || assignedMember.email}
                          </p>
                        </div>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-950/40 px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/30 italic">
                        Vacant
                      </span>
                    )}
                  </td>

                  {/* Direct Supervisor / Parent */}
                  <td className="px-4 py-3 text-neutral-400">
                    {parentTitle ? (
                      <span className="font-mono text-[11px] text-neutral-300">
                        {parentTitle}
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-neutral-400 italic">
                        Top Leadership (Root)
                      </span>
                    )}
                  </td>

                  {/* Active Tasks count */}
                  <td className="px-4 py-3 text-center">
                    {memberTasks.length > 0 ? (
                      <span className="inline-flex items-center rounded bg-[#d4af37]/15 px-2 py-0.5 font-mono text-[10px] text-[#d4af37] border border-[#d4af37]/30">
                        {memberTasks.length} task{memberTasks.length === 1 ? '' : 's'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400">—</span>
                    )}
                  </td>

                  {/* Sub-teams count */}
                  <td className="px-4 py-3 text-center">
                    {childCount > 0 ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-300">
                        <Users className="h-3 w-3 text-[#d4af37]" />
                        <span>{childCount}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
