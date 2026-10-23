import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  FolderPlus,
  CalendarPlus,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import type { DepartmentKey, SectionKey } from '../departments';
import {
  listDepartmentGroups,
  deleteDepartmentGroup,
  type WmTeamGroup,
} from '../services/operationsStore';
import { GroupFormModal } from './GroupFormModal';
import { GroupDetailsModal } from './GroupDetailsModal';

interface GroupManagementDashboardProps {
  department: DepartmentKey;
  section?: SectionKey | null;
  testToken?: string | null;
  onAssignGroupToShift?: (group: WmTeamGroup) => void;
}

export const GroupManagementDashboard: React.FC<GroupManagementDashboardProps> = ({
  department,
  section,
  testToken,
  onAssignGroupToShift,
}) => {
  const [groups, setGroups] = useState<WmTeamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<WmTeamGroup | null>(null);

  const [activeGroupForDetails, setActiveGroupForDetails] = useState<WmTeamGroup | null>(null);

  // Load groups
  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await listDepartmentGroups(department, section, testToken);
    if (res.ok && res.data) {
      setGroups(res.data);
    } else {
      setError(res.error || 'Failed to load team groups.');
    }
    setLoading(false);
  }, [department, section, testToken]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q)
    );
  }, [groups, search]);

  const totalMembersInAllGroups = useMemo(() => {
    return groups.reduce((acc, g) => acc + (g.member_count ?? 0), 0);
  }, [groups]);

  // Handle group created or edited
  const handleGroupSaved = (savedGroup: WmTeamGroup) => {
    setNotice(`Group "${savedGroup.name}" saved successfully.`);
    setGroups((prev) => {
      const idx = prev.findIndex((g) => g.id === savedGroup.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedGroup;
        return copy;
      }
      return [...prev, savedGroup].sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  // Handle delete group
  const handleDeleteGroup = async (groupId: string) => {
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    if (!window.confirm(`Delete team group "${target.name}"?`)) return;

    const res = await deleteDepartmentGroup(groupId, testToken);
    if (res.ok) {
      setNotice(`Group "${target.name}" deleted.`);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (activeGroupForDetails?.id === groupId) {
        setActiveGroupForDetails(null);
      }
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
    <section className="space-y-5 text-white">
      {/* Top Banner / Dashboard Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[.22em] text-[#d4af37]">
              WEST MUN 2027 · Operations Team Groups
            </span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Custom Team Groups
          </h1>
          <p className="mt-1 text-xs text-neutral-400 max-w-2xl">
            Create reusable custom groups of team members (e.g. Bathroom Cleaners, Hallway Team, VIP Support, Registration Desk)
            and deploy an entire group to shifts with a single click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadGroups()}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-[#111116] p-2 text-neutral-400 hover:border-white/20 hover:text-white transition-all disabled:opacity-50"
            title="Refresh groups"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => {
              setGroupToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b89628] px-4 py-2 text-xs font-bold text-black shadow-[0_0_18px_rgba(212,175,55,0.25)] hover:brightness-110 transition-all"
          >
            <Plus size={15} /> Create Group
          </button>
        </div>
      </div>

      {/* Notice & Error Alerts */}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3.5 text-xs text-red-200">
          <AlertCircle size={16} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice('')} className="text-emerald-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#0e0e14] p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Total Custom Groups
          </span>
          <div className="mt-1 font-serif text-2xl font-bold text-white">{groups.length}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0e0e14] p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Members Enrolled in Groups
          </span>
          <div className="mt-1 font-serif text-2xl font-bold text-[#f1d98c]">{totalMembersInAllGroups}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0e0e14] p-3.5 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Bulk Shift Deployment
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <Sparkles size={14} /> Ready for 1-Click Assignment
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0e0e14] p-3.5">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search groups by name or responsibilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#14141c] pl-10 pr-4 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
          />
        </div>

        <div className="text-xs text-neutral-400">
          Showing <strong className="text-white">{filteredGroups.length}</strong> of {groups.length} groups
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#0e0e14] py-16 text-center">
          <Users size={36} className="mx-auto text-neutral-600 mb-3" />
          <h4 className="text-base font-semibold text-white">No custom groups found</h4>
          <p className="mt-1 text-xs text-neutral-400 max-w-sm mx-auto">
            {groups.length === 0
              ? 'Create custom groups like "Bathroom Cleaners" or "VIP Escorts" to assign entire teams to shifts with one click.'
              : 'Try clearing your search query to see your saved groups.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setGroupToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37] bg-[#d4af37] px-4 py-2 text-xs font-bold text-black hover:brightness-110 shadow-lg"
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => {
            const memberCount = group.member_count ?? (group.members?.length || 0);
            const previewMembers = group.members?.slice(0, 4) || [];

            return (
              <article
                key={group.id}
                className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#0e0e14] p-4 transition-all hover:border-[#d4af37]/50 hover:bg-[#12121a] shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3
                        onClick={() => setActiveGroupForDetails(group)}
                        className="text-base font-semibold text-white hover:text-[#d4af37] cursor-pointer transition-colors truncate"
                      >
                        {group.name}
                      </h3>
                      <p className="text-[11px] text-[#f1d98c] font-medium mt-0.5">
                        {memberCount} {memberCount === 1 ? 'member' : 'members'} enrolled
                      </p>
                    </div>

                    <span className="rounded-lg bg-[#d4af37]/10 p-2 text-[#d4af37] border border-[#d4af37]/20">
                      <Users size={16} />
                    </span>
                  </div>

                  {group.description && (
                    <p className="mt-2.5 text-xs text-neutral-400 line-clamp-2">
                      {group.description}
                    </p>
                  )}

                  {/* Member avatars preview */}
                  <div className="mt-3.5 flex items-center gap-1.5">
                    {previewMembers.length > 0 ? (
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {previewMembers.map((m) => (
                          <div
                            key={m.id}
                            title={m.member_name}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#0e0e14] bg-[#1a1822] text-[10px] font-bold text-[#f1d98c]"
                          >
                            {getInitials(m.member_name)}
                          </div>
                        ))}
                        {memberCount > 4 && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#0e0e14] bg-white/10 text-[10px] font-bold text-neutral-300">
                            +{memberCount - 4}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-500 italic">No members added yet</span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (onAssignGroupToShift) {
                        onAssignGroupToShift(group);
                      } else {
                        setActiveGroupForDetails(group);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/20 transition-all"
                  >
                    <CalendarPlus size={13} /> Assign to Shift
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="View group details"
                      onClick={() => setActiveGroupForDetails(group)}
                      className="rounded-lg border border-white/10 p-1.5 text-neutral-400 hover:border-white/30 hover:text-white"
                    >
                      <Eye size={13} />
                    </button>

                    <button
                      type="button"
                      title="Edit group"
                      onClick={() => {
                        setGroupToEdit(group);
                        setIsFormModalOpen(true);
                      }}
                      className="rounded-lg border border-white/10 p-1.5 text-neutral-400 hover:border-white/30 hover:text-white"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      title="Delete group"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="rounded-lg border border-red-500/20 p-1.5 text-red-400 hover:bg-red-950/20 hover:border-red-500/40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Group Modal */}
      <GroupFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setGroupToEdit(null);
        }}
        department={department}
        section={section}
        testToken={testToken}
        groupToEdit={groupToEdit}
        onSuccess={handleGroupSaved}
      />

      {/* Group Details Modal */}
      <GroupDetailsModal
        group={activeGroupForDetails}
        isOpen={Boolean(activeGroupForDetails)}
        onClose={() => setActiveGroupForDetails(null)}
        testToken={testToken}
        onEdit={(g) => {
          setGroupToEdit(g);
          setIsFormModalOpen(true);
        }}
        onDelete={(id) => {
          setGroups((prev) => prev.filter((g) => g.id !== id));
        }}
        onAssignToShift={(g) => {
          if (onAssignGroupToShift) {
            onAssignGroupToShift(g);
          }
        }}
      />
    </section>
  );
};
