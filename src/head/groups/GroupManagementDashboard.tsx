import React, { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Trash2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import type { DepartmentKey, SectionKey } from '../departments';
import {
  listDepartmentGroups,
  createDepartmentGroup,
  deleteDepartmentGroup,
  type WmTeamGroup,
} from '../services/operationsStore';

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
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await listDepartmentGroups(department, section, testToken);
    if (res.ok) {
      setGroups(res.data || []);
    } else {
      setError(res.error || 'Failed to load team groups.');
    }
    setLoading(false);
  }, [department, section, testToken]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await createDepartmentGroup(
      {
        department,
        section,
        name: name.trim(),
        description: description.trim(),
      },
      testToken
    );
    if (res.ok && res.data) {
      setGroups((prev) => [res.data!, ...prev]);
      setName('');
      setDescription('');
      setShowCreate(false);
    } else {
      setError(res.error || 'Failed to create group.');
    }
    setSaving(false);
  };

  const handleDelete = async (groupId: string) => {
    if (!window.confirm('Delete this team group?')) return;
    const res = await deleteDepartmentGroup(groupId, testToken);
    if (res.ok) {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } else {
      setError(res.error || 'Failed to delete group.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-[#d4af37]/30 bg-[#0a0a0d] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
              Operations Studio
            </span>
            <h2 className="font-serif text-2xl font-normal text-white">Team Groups & Deployment Squads</h2>
            <p className="text-xs text-neutral-300">
              Assemble multi-member operational squads for shift assignments, station deployments, and task delegation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadGroups}
              className="border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-neutral-300 hover:border-white/30 hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-[#d4af37] px-4 py-2 text-xs font-semibold text-black hover:bg-[#e5c158]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Squad</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreateGroup} className="border border-[#d4af37]/40 bg-[#0e0e12] p-5 space-y-4">
          <h3 className="font-serif text-base text-white">Create Operational Squad</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300">Squad Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Protocol Squad Alpha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300">Squad Description</label>
              <input
                type="text"
                placeholder="e.g. Main Hall Ushering & Delegate Check-in"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="border border-white/15 px-3 py-1.5 text-xs text-neutral-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#d4af37] px-4 py-1.5 text-xs font-semibold text-black hover:bg-[#e5c158] disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Save Squad'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-500">Loading squads…</div>
        ) : groups.length === 0 ? (
          <div className="border border-white/10 bg-[#0d0d10] py-12 text-center text-xs text-neutral-500">
            No squads created yet. Click "Create Squad" to assemble your first deployment group.
          </div>
        ) : (
          groups.map((grp) => (
            <div key={grp.id} className="border border-white/10 bg-[#0d0d10] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">{grp.name}</h4>
                  <span className="font-mono text-[10px] text-[#d4af37] uppercase">
                    {grp.member_count ?? grp.members?.length ?? 0} members
                  </span>
                </div>
                {grp.description && <p className="text-xs text-neutral-400">{grp.description}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onAssignGroupToShift && (
                  <button
                    type="button"
                    onClick={() => onAssignGroupToShift(grp)}
                    className="flex items-center gap-1.5 border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1.5 text-xs text-[#f5d47a] hover:bg-[#d4af37]/20"
                  >
                    <span>Deploy to Shift</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(grp.id)}
                  className="border border-rose-500/30 p-1.5 text-rose-400 hover:bg-rose-500/10"
                  title="Delete squad"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
