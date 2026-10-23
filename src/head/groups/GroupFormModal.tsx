import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  Users,
  Shield,
  Loader2,
  AlertCircle,
  FolderPlus,
  Edit2,
  Trash2,
} from 'lucide-react';
import type { DepartmentKey, SectionKey } from '../departments';
import {
  createDepartmentGroup,
  updateDepartmentGroup,
  syncGroupMembers,
  listDepartmentTeamMembers,
  listDepartmentCoHeads,
  type ShiftCandidate,
  type WmTeamGroup,
  type WmTeamGroupMember,
} from '../services/operationsStore';

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentKey;
  section?: SectionKey | null;
  testToken?: string | null;
  groupToEdit?: WmTeamGroup | null;
  onSuccess: (savedGroup: WmTeamGroup) => void;
}

export const GroupFormModal: React.FC<GroupFormModalProps> = ({
  isOpen,
  onClose,
  department,
  section,
  testToken,
  groupToEdit,
  onSuccess,
}) => {
  const isEditing = Boolean(groupToEdit);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState<Map<string, ShiftCandidate>>(new Map());

  const [candidates, setCandidates] = useState<ShiftCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load all department candidates (Team members and Co-Heads)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingCandidates(true);
    setError('');

    Promise.all([
      listDepartmentTeamMembers(department, section, testToken),
      listDepartmentCoHeads(department, section, testToken),
    ])
      .then(([tmRes, chRes]) => {
        if (!isMounted) return;
        const all: ShiftCandidate[] = [];
        const seen = new Set<string>();

        if (tmRes.ok && tmRes.data) {
          for (const m of tmRes.data) {
            const key = m.email ? m.email.toLowerCase() : m.id;
            if (!seen.has(key)) {
              seen.add(key);
              all.push(m);
            }
          }
        }

        if (chRes.ok && chRes.data) {
          for (const h of chRes.data) {
            const key = h.email ? h.email.toLowerCase() : h.id;
            if (!seen.has(key)) {
              seen.add(key);
              all.push(h);
            }
          }
        }

        setCandidates(all);

        // If editing, initialize form and selected candidates
        if (groupToEdit) {
          setName(groupToEdit.name);
          setDescription(groupToEdit.description || '');

          const preselected = new Map<string, ShiftCandidate>();
          const existingMembers = groupToEdit.members || [];

          for (const em of existingMembers) {
            // Find matching candidate by email, member_id, or person_id
            const found = all.find(
              (c) =>
                (em.member_email && c.email.toLowerCase() === em.member_email.toLowerCase()) ||
                (em.member_id && c.memberId === em.member_id) ||
                (em.person_id && c.personId === em.person_id)
            );

            if (found) {
              preselected.set(found.id, found);
            } else {
              // Synthesize candidate from group member record
              preselected.set(em.id, {
                id: em.id,
                type: 'team_member',
                name: em.member_name,
                email: em.member_email,
                roleTitle: em.role_title || 'Team Member',
                status: 'accepted',
                sourceId: em.id,
                memberId: em.member_id,
                personId: em.person_id,
              });
            }
          }

          setSelectedCandidates(preselected);
        } else {
          setName('');
          setDescription('');
          setSelectedCandidates(new Map());
        }
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load candidates.');
      })
      .finally(() => {
        if (isMounted) setLoadingCandidates(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, groupToEdit, department, section, testToken]);

  // Filter candidates by search
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.roleTitle.toLowerCase().includes(q)
    );
  }, [candidates, searchQuery]);

  // Multi-select toggle
  const toggleSelect = (cand: ShiftCandidate) => {
    setSelectedCandidates((prev) => {
      const next = new Map(prev);
      if (next.has(cand.id)) {
        next.delete(cand.id);
      } else {
        next.set(cand.id, cand);
      }
      return next;
    });
  };

  // Select all visible in search
  const handleSelectAllVisible = () => {
    setSelectedCandidates((prev) => {
      const next = new Map(prev);
      for (const c of filteredCandidates) {
        next.set(c.id, c);
      }
      return next;
    });
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedCandidates(new Map());
  };

  // Remove specific selected candidate
  const handleRemoveCandidate = (id: string) => {
    setSelectedCandidates((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  // Save / Update Group
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide a group name (e.g., Bathroom Cleaners, Hallway Team, VIP Support).');
      return;
    }

    setSubmitting(true);

    try {
      const membersPayload = Array.from(selectedCandidates.values()).map((c) => ({
        member_id: c.memberId || null,
        person_id: c.personId || null,
        member_name: c.name,
        member_email: c.email,
        role_title: c.roleTitle,
      }));

      if (isEditing && groupToEdit) {
        // 1. Update group details
        const updateRes = await updateDepartmentGroup(
          groupToEdit.id,
          { name: name.trim(), description: description.trim() },
          testToken
        );
        if (!updateRes.ok || !updateRes.data) {
          throw new Error(updateRes.error || 'Failed to update group name/description.');
        }

        // 2. Sync members
        const syncRes = await syncGroupMembers(groupToEdit.id, membersPayload, testToken);
        if (!syncRes.ok) {
          throw new Error(syncRes.error || 'Failed to sync group members.');
        }

        const fullGroup: WmTeamGroup = {
          ...updateRes.data,
          member_count: syncRes.data?.length || 0,
          members: syncRes.data || [],
        };

        onSuccess(fullGroup);
        onClose();
      } else {
        // Create new group
        const createRes = await createDepartmentGroup(
          {
            department,
            section,
            name: name.trim(),
            description: description.trim(),
            members: membersPayload,
          },
          testToken
        );

        if (!createRes.ok || !createRes.data) {
          throw new Error(createRes.error || 'Failed to create group in database.');
        }

        onSuccess(createRes.data);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save group.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] rounded-2xl border border-white/10 bg-[#0c0c12] shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#111118]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#f1d98c] border border-[#d4af37]/30">
              {isEditing ? <Edit2 size={18} /> : <FolderPlus size={18} />}
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                {isEditing ? `Edit Group: ${groupToEdit?.name}` : 'Create Custom Team Group'}
              </h2>
              <p className="text-xs text-neutral-400">
                Organize members into reusable groups for 1-click shift assignment
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Group Name <span className="text-[#d4af37]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Bathroom Cleaners, Hallway Team, VIP Support, Registration Desk"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#121218] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Description / Responsibilities (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Explain the group's focus, area of responsibility, or standard operational tasks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#121218] px-3.5 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
            />
          </div>

          {/* Members Selection Section */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Users size={14} className="text-[#d4af37]" /> Select Group Members
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Select team members belonging to your department ({department}).
                </p>
              </div>

              {/* Live Count Badge */}
              <div className="rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-2.5 py-1 text-xs font-semibold text-[#f1d98c]">
                {selectedCandidates.size} members selected
              </div>
            </div>

            {/* Currently Selected Members Chips */}
            {selectedCandidates.size > 0 && (
              <div className="rounded-xl border border-white/10 bg-[#121218] p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Selected Roster ({selectedCandidates.size})</span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {Array.from(selectedCandidates.values()).map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-2.5 py-1 text-xs text-[#f1d98c]"
                    >
                      <span className="font-medium">{c.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCandidate(c.id)}
                        className="rounded p-0.5 hover:bg-[#d4af37]/20 hover:text-white"
                        title="Remove member"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Search and Quick Selection Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search members by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#121218] pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white"
                >
                  Select All Visible ({filteredCandidates.length})
                </button>
              </div>
            </div>

            {/* Candidates Selection Grid */}
            {loadingCandidates ? (
              <div className="py-10 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-[#d4af37]" />
                Loading department members...
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 border border-dashed border-white/10 rounded-xl">
                No matching team members found.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 max-h-60 overflow-y-auto pr-1">
                {filteredCandidates.map((c) => {
                  const isSelected = selectedCandidates.has(c.id);
                  const isCoHead = c.type === 'co_head';

                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleSelect(c)}
                      className={`flex items-start justify-between gap-2 rounded-xl border p-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#d4af37] bg-[#1a181e] shadow-[0_0_12px_rgba(212,175,55,0.1)]'
                          : 'border-white/10 bg-[#111116] hover:border-white/20 hover:bg-[#14141c]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-white truncate">{c.name}</span>
                          {isCoHead && (
                            <span className="rounded bg-[#d4af37]/20 px-1 py-0.2 text-[9px] font-bold text-[#f1d98c]">
                              Co-Head
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">{c.roleTitle}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{c.email}</p>
                      </div>

                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border transition-all ${
                          isSelected
                            ? 'border-[#d4af37] bg-[#d4af37] text-black'
                            : 'border-white/20 bg-white/5 text-transparent'
                        }`}
                      >
                        <Check size={12} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/5"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b89628] px-5 py-2 text-xs font-bold text-black shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Team Group'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
