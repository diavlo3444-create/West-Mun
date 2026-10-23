import React, { useEffect, useState, useCallback } from 'react';
import { Crown, Mail, Phone, ShieldCheck, UserCheck, RefreshCw, AlertCircle, Users } from 'lucide-react';
import type { DepartmentKey, SectionKey } from './departments';
import { listDepartmentCoHeads, type ShiftCandidate } from './services/operationsStore';

interface HeadCoHeadManagementProps {
  department: DepartmentKey;
  section?: SectionKey | null;
  headName?: string;
  testToken?: string | null;
}

export const HeadCoHeadManagement: React.FC<HeadCoHeadManagementProps> = ({
  department,
  section,
  headName,
  testToken,
}) => {
  const [coHeads, setCoHeads] = useState<ShiftCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCoHeads = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await listDepartmentCoHeads(department, section, testToken);
    if (result.ok) {
      setCoHeads(result.data || []);
    } else {
      setError(result.error || 'Failed to retrieve department co-heads.');
    }
    setLoading(false);
  }, [department, section, testToken]);

  useEffect(() => {
    void loadCoHeads();
  }, [loadCoHeads]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-[#d4af37]/30 bg-[#0a0a0d] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                Department Leadership
              </span>
              <span className="text-neutral-600">·</span>
              <span className="font-mono text-[10px] text-neutral-400 uppercase">
                {department.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="font-serif text-2xl font-normal text-white">Co-Head Coordination Desk</h1>
            <p className="text-xs text-neutral-300">
              Department Head <span className="text-white font-medium">{headName || 'Officer'}</span> supervising assigned Co-Heads, operational escalations, and section leadership.
            </p>
          </div>

          <button
            type="button"
            onClick={loadCoHeads}
            disabled={loading}
            className="flex items-center gap-2 border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-neutral-300 hover:border-white/30 hover:text-white disabled:opacity-50 self-start"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Roster</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Co-Head Roster Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#d4af37]" />
            <h2 className="font-serif text-base text-white">Active Co-Head Officers ({coHeads.length})</h2>
          </div>
          <span className="font-mono text-[10px] text-neutral-400">Authenticated Department Leadership</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-500">Loading co-heads…</div>
        ) : coHeads.length === 0 ? (
          <div className="border border-white/10 bg-[#0d0d10] py-12 text-center space-y-2">
            <Crown className="h-6 w-6 text-[#d4af37]/40 mx-auto" />
            <h3 className="font-serif text-sm text-white">No Co-Heads assigned to this department yet</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              When members register as Co-Heads through the EB registration invite or are assigned by Super Admin, they will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coHeads.map((ch) => (
              <div key={ch.id} className="border border-white/10 bg-[#0d0d10] p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                      Department Co-Head
                    </span>
                    <h3 className="font-serif text-base text-white">{ch.name}</h3>
                    <p className="text-xs text-neutral-400">{ch.roleTitle}</p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                    Active
                  </span>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-1.5 text-xs text-neutral-300">
                  {ch.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
                      <a href={`mailto:${ch.email}`} className="hover:text-white font-mono text-[11px]">
                        {ch.email}
                      </a>
                    </div>
                  )}
                  {ch.section && (
                    <div className="flex items-center gap-2 text-neutral-400 font-mono text-[10px]">
                      <span>Section: {ch.section}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
