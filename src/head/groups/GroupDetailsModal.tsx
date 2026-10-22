import React, { useState } from 'react';
import {
  X,
  Users,
  Edit2,
  Trash2,
  CalendarPlus,
  Mail,
  Clock,
  ArrowRight,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { WmTeamGroup, WmTeamGroupMember } from '../services/operationsStore';
import { deleteDepartmentGroup } from '../services/operationsStore';

interface GroupDetailsModalProps {
  group: WmTeamGroup | null;
  isOpen: boolean;
  onClose: () => void;
  testToken?: string | null;
  onEdit: (group: WmTeamGroup) => void;
  onDelete: (groupId: string) => void;
  onAssignToShift: (group: WmTeamGroup) => void;
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  group,
  isOpen,
  onClose,
  testToken,
  onEdit,
  onDelete,
  onAssignToShift,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !group) return null;

  const members = group.members || [];
  const memberCount = group.member_count ?? members.length;

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete group "${group.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError('');

    const res = await deleteDepartmentGroup(group.id, testToken);
    setDeleting(false);

    if (res.ok) {
      onDelete(group.id);
      onClose();
    } else {
      setError(res.error || 'Failed to delete group.');
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return 'TM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-xl max-h-[90vh] rounded-2xl border border-white/10 bg-[#0c0c12] shadow-2xl overflow-hidden text-white">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#111118]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#f1d98c] border border-[#d4af37]/30">
              <Users size={18} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                {group.name}
              </h2>
              <p className="text-xs text-neutral-400">
                Custom Team Group · {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {error && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Group Details Card */}
          <div className="rounded-xl border border-white/10 bg-[#121218] p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">
              Group Overview
            </span>
            <p className="text-sm text-neutral-200 whitespace-pre-wrap">
              {group.description || 'No description provided for this group.'}
            </p>
            <div className="flex items-center gap-4 pt-2 text-xs text-neutral-400 border-t border-white/5">
              <span>Department: <strong className="text-white capitalize">{group.department}</strong></span>
              {group.section && (
                <span>Section: <strong className="text-white capitalize">{group.section}</strong></span>
              )}
            </div>
          </div>

          {/* Quick Action: Assign to Shift */}
          <div className="flex items-center justify-between rounded-xl border border-[#d4af37]/30 bg-gradient-to-r from-[#d4af37]/10 to-transparent p-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <CalendarPlus size={15} className="text-[#d4af37]" /> Assign Group to Shift
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Schedule a shift with all {memberCount} members pre-selected
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onAssignToShift(group);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37] bg-[#d4af37] px-3.5 py-2 text-xs font-bold text-black shadow-md hover:brightness-110 transition-all shrink-0"
            >
              Assign to Shift <ArrowRight size={13} />
            </button>
          </div>

          {/* Members List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Roster Members ({memberCount})
              </h4>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(group);
                }}
                className="text-xs text-[#d4af37] hover:underline flex items-center gap-1"
              >
                <Edit2 size={12} /> Edit Roster
              </button>
            </div>

            {members.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 rounded-xl border border-dashed border-white/10">
                No members currently added to this group.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#121218] p-3 text-xs"
                  >
                    {/* Avatar circle */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#d4af37]/20 to-[#b89628]/10 text-xs font-bold text-[#f1d98c] border border-[#d4af37]/30">
                      {getInitials(m.member_name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h5 className="font-semibold text-white truncate">{m.member_name}</h5>
                      <p className="text-[11px] text-neutral-400 truncate">{m.role_title || 'Team Member'}</p>
                      {m.member_email && (
                        <a
                          href={`mailto:${m.member_email}`}
                          className="text-[10px] text-neutral-500 hover:text-[#d4af37] truncate block"
                        >
                          {m.member_email}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-white/10 px-5 py-4 bg-[#111118]">
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/20 hover:border-red-500/40 transition-all disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete Group
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(group);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/10 transition-all"
            >
              <Edit2 size={13} /> Edit Group
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
