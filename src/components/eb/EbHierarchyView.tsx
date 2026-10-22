import React, { useState, useMemo } from 'react';
import {
  Users,
  Crown,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Shield,
  UserCheck,
  Building2,
  X,
  Search,
  Network,
  ListFilter,
  Sparkles,
  Layers,
  ArrowDown,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type { EbHierarchyNode } from '../../lib/ebOperationsService';

interface EbHierarchyViewProps {
  profile: EbMemberProfile;
  hierarchy: EbHierarchyNode[];
}

export const EbHierarchyView: React.FC<EbHierarchyViewProps> = ({
  profile,
  hierarchy,
}) => {
  const [selectedPerson, setSelectedPerson] = useState<EbHierarchyNode | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedHeads, setCollapsedHeads] = useState<Record<string, boolean>>({});

  // 1. Identify Secretariat Triad (SG, DSG, USG), Senior Advisor, and Department Heads
  const { sgNode, dsgNode, usgNode, seniorAdvisorNode, allHeads } = useMemo(() => {
    // Search among roots or children
    const findInTree = (predicate: (n: EbHierarchyNode) => boolean): EbHierarchyNode | null => {
      for (const root of hierarchy) {
        if (predicate(root)) return root;
        if (root.children) {
          for (const c of root.children) {
            if (predicate(c)) return c;
            if (c.children) {
              for (const gc of c.children) {
                if (predicate(gc)) return gc;
              }
            }
          }
        }
      }
      return null;
    };

    const sg =
      hierarchy.find((n) => /secretary[- ]general/i.test(n.role_title) && !/deputy|under/i.test(n.role_title)) ||
      findInTree((n) => /secretary[- ]general/i.test(n.role_title) && !/deputy|under/i.test(n.role_title));

    const dsg =
      hierarchy.find((n) => /deputy secretary[- ]general/i.test(n.role_title)) ||
      findInTree((n) => /deputy secretary[- ]general/i.test(n.role_title));

    const usg =
      hierarchy.find((n) => /under[- ]secretary[- ]general/i.test(n.role_title)) ||
      findInTree((n) => /under[- ]secretary[- ]general/i.test(n.role_title));

    const advisor =
      hierarchy.find((n) => /senior advisor/i.test(n.role_title)) ||
      findInTree((n) => /senior advisor/i.test(n.role_title)) ||
      sg?.children?.find((n) => /advisor/i.test(n.role_title)) ||
      dsg?.children?.find((n) => /advisor/i.test(n.role_title));

    // Heads are children of Senior Advisor, or any rank 3 nodes
    let heads: EbHierarchyNode[] = [];
    if (advisor?.children && advisor.children.length > 0) {
      heads = advisor.children;
    } else {
      // Gather all rank 3 nodes
      const gathered: EbHierarchyNode[] = [];
      const traverse = (node: EbHierarchyNode) => {
        if (node.rank_level === 3) gathered.push(node);
        node.children?.forEach(traverse);
      };
      hierarchy.forEach(traverse);
      heads = gathered;
    }

    return {
      sgNode: sg || null,
      dsgNode: dsg || null,
      usgNode: usg || null,
      seniorAdvisorNode: advisor || null,
      allHeads: heads,
    };
  }, [hierarchy]);

  // Peer Triad array: SG | DSG | USG (strictly 3 peer roles on the same level)
  const triadNodes = useMemo(() => {
    if (isScopedMember) return [];
    return [sgNode, dsgNode, usgNode].filter((n): n is EbHierarchyNode => Boolean(n));
  }, [sgNode, dsgNode, usgNode, isScopedMember]);

  // Regular EB members see only the reporting head selected at sign-up.
  // Admins and department heads retain the full organizational overview.
  const isScopedMember = !profile.isAdmin && !profile.isHead;
  const reportingHeadNode = useMemo(() => {
    const selectedId = profile.reportingHeadId?.trim();
    const selectedName = profile.reportingHeadName?.trim().toLowerCase();
    if (!selectedId && !selectedName) return null;
    return allHeads.find((head) => {
      const identifiers = [head.id, head.id.replace(/^head-/, ''), head.source_head_id || '', head.source_user_id || '', head.assigned_email || ''].map((value) => value.toLowerCase());
      const idMatches = Boolean(selectedId && identifiers.some((value) => value === selectedId.toLowerCase()));
      const nameMatches = Boolean(selectedName && selectedName !== 'department head' &&
        selectedName !== 'directorate secretariat' && head.assigned_name.trim().toLowerCase() === selectedName);
      return idMatches || nameMatches;
    }) || null;
  }, [allHeads, profile.reportingHeadId, profile.reportingHeadName]);

  // Department filter options
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    allHeads.forEach((h) => set.add(h.department));
    return Array.from(set).sort();
  }, [allHeads]);

  // Filtered Heads based on selected department and search query
  const filteredHeads = useMemo(() => {
    if (isScopedMember) return reportingHeadNode ? [{ ...reportingHeadNode, children: [] }] : [];
    return allHeads.filter((head) => {
      if (selectedDeptFilter !== 'all' && head.department !== selectedDeptFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesHead =
          head.assigned_name.toLowerCase().includes(q) ||
          head.role_title.toLowerCase().includes(q) ||
          head.department.toLowerCase().includes(q);
        const matchesChild = head.children?.some(
          (c) =>
            c.assigned_name.toLowerCase().includes(q) ||
            c.role_title.toLowerCase().includes(q)
        );
        return matchesHead || matchesChild;
      }
      return true;
    });
  }, [allHeads, selectedDeptFilter, searchQuery, isScopedMember, reportingHeadNode]);

  const toggleHeadCollapse = (id: string) => {
    setCollapsedHeads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isMe = (name: string) => {
    return name.trim().toLowerCase() === profile.name.trim().toLowerCase();
  };

  // Helper to render personnel card in chart view
  const renderPersonnelCard = (
    node: EbHierarchyNode,
    tier: 'triad' | 'advisor' | 'head' | 'cohead',
    hasChildren = false,
    isCollapsed = false,
    onToggleCollapse?: () => void
  ) => {
    const me = isMe(node.assigned_name);
    const isTriad = tier === 'triad';
    const isAdvisor = tier === 'advisor';
    const isHead = tier === 'head';

    return (
      <div
        className={`group relative z-10 flex flex-col rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-1 ${
          me
            ? 'border-[#d4af37] bg-gradient-to-br from-[#d4af37]/25 via-[#1a160c] to-[#0b0b0d] shadow-[0_0_30px_rgba(212,175,55,0.22)] ring-1 ring-[#d4af37]/60'
            : isTriad
            ? 'border-[#d4af37]/60 bg-gradient-to-br from-[#261e0b] via-[#14120e] to-[#0c0c0e] shadow-[0_8px_24px_rgba(212,175,55,0.12)] hover:border-[#d4af37] hover:shadow-[0_12px_36px_rgba(212,175,55,0.25)]'
            : isAdvisor
            ? 'border-amber-500/50 bg-gradient-to-br from-[#221808] via-[#14110d] to-[#0a0a0c] shadow-[0_6px_20px_rgba(245,158,11,0.12)] hover:border-amber-400'
            : isHead
            ? 'border-white/15 bg-gradient-to-br from-[#1c1a17] via-[#121215] to-[#09090b] hover:border-[#d4af37]/60 hover:shadow-[0_6px_20px_rgba(212,175,55,0.10)]'
            : 'border-white/10 bg-gradient-to-br from-[#141416] to-[#09090b] hover:border-white/30'
        } ${
          isTriad
            ? 'w-[260px] sm:w-[290px]'
            : isAdvisor
            ? 'w-[280px] sm:w-[320px]'
            : isHead
            ? 'w-[240px] sm:w-[260px]'
            : 'w-[220px] sm:w-[240px]'
        }`}
      >
        {/* Card Header & Avatar */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {node.avatar_url ? (
              <img
                src={node.avatar_url}
                alt={node.assigned_name}
                className={`h-12 w-12 rounded-xl object-cover border ${
                  isTriad
                    ? 'border-[#d4af37] ring-2 ring-[#d4af37]/40 shadow-md'
                    : isAdvisor
                    ? 'border-amber-400/80 ring-2 ring-amber-400/30'
                    : 'border-white/20'
                }`}
                onError={(e) => {
                  // Fallback to avatar placeholder on error
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                node.avatar_url ? 'hidden' : 'flex'
              } ${
                isTriad
                  ? 'border-[#d4af37] bg-gradient-to-br from-[#d4af37]/30 to-[#1e1707] text-[#f5d47a] shadow-md'
                  : isAdvisor
                  ? 'border-amber-500/70 bg-gradient-to-br from-amber-500/25 to-[#1c1407] text-amber-300'
                  : isHead
                  ? 'border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f5d47a]'
                  : 'border-white/10 bg-white/5 text-neutral-400'
              }`}
            >
              {isTriad ? (
                <Crown className="h-6 w-6 text-[#f5d47a]" />
              ) : isAdvisor ? (
                <Sparkles className="h-5 w-5 text-amber-300" />
              ) : isHead ? (
                <UserCheck className="h-5 w-5 text-[#f5d47a]" />
              ) : (
                <Shield className="h-4 w-4 text-neutral-400" />
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`font-mono text-[9px] uppercase tracking-wider ${
                  isTriad
                    ? 'text-[#f5d47a] font-semibold'
                    : isAdvisor
                    ? 'text-amber-300 font-semibold'
                    : 'text-[#d4af37]'
                }`}
              >
                {node.department.replace(/_/g, ' ')}
              </span>
              {me && (
                <span className="rounded bg-[#d4af37] px-1.5 py-0.2 font-mono text-[8px] font-bold uppercase text-black">
                  You
                </span>
              )}
            </div>

            <h4 className="mt-0.5 truncate text-sm font-semibold text-white transition group-hover:text-[#f5d47a]">
              {node.assigned_name}
            </h4>

            <p
              className={`mt-0.5 text-xs font-medium leading-tight ${
                isTriad
                  ? 'text-[#d4af37]'
                  : isAdvisor
                  ? 'text-amber-400'
                  : 'text-neutral-300'
              }`}
            >
              {node.role_title}
            </p>

            {node.section && (
              <span className="mt-1 inline-block rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-neutral-400">
                {node.section} section
              </span>
            )}
          </div>
        </div>

        {/* Responsibilities Preview */}
        {node.responsibilities && (
          <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-neutral-400">
            {node.responsibilities}
          </p>
        )}

        {/* Card Footer Actions */}
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2.5 text-[10px]">
          <button
            type="button"
            onClick={() => setSelectedPerson(node)}
            className="flex items-center gap-1 text-[#d4af37] hover:text-[#f5d47a] transition-colors font-mono uppercase tracking-wider"
          >
            <span>Dossier</span>
            <ChevronRight className="h-3 w-3" />
          </button>

          {hasChildren && onToggleCollapse && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-neutral-400 hover:text-white transition-colors"
            >
              <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${
                  isCollapsed ? '-rotate-90' : 'rotate-0'
                }`}
              />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#f5d47a]">
              <Crown className="h-3 w-3 text-[#d4af37]" />
              WEST MUN 2027 Executive Chain of Command
            </span>
          </div>
          <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-normal text-white">
            {isScopedMember ? 'Your Reporting Head' : 'Secretariat & Directorate Hierarchy'}
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            {isScopedMember ? 'Your EB view is limited to the department head selected during sign-up.' : 'Secretary-General, Deputy Secretary-General, and Under-Secretary-General peer leadership, Senior Advisory counsel, and Directorate operational chains.'}
          </p>
        </div>

        {!isScopedMember && (
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search personnel or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-56 rounded-xl border border-white/10 bg-black/40 pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Department Dropdown */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#121215] px-3 py-1.5 text-xs text-neutral-200 focus:border-[#d4af37] focus:outline-none"
          >
            <option value="all">All Directorates ({allHeads.length})</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>

          {/* View Mode Toggle Buttons */}
          <div className="flex rounded-xl border border-white/10 bg-black/40 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.2 text-xs font-medium transition ${
                viewMode === 'chart'
                  ? 'bg-[#d4af37] text-black font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mind-Map</span> Chart
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.2 text-xs font-medium transition ${
                viewMode === 'list'
                  ? 'bg-[#d4af37] text-black font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hierarchy</span> List
            </button>
          </div>
        </div>
        )}
      </div>

      {!isScopedMember && (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#d4af37]/30 bg-gradient-to-br from-[#d4af37]/10 to-black/40 p-3">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-[#d4af37]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#f5d47a]">
              Secretariat Triad
            </span>
          </div>
          <p className="mt-1 text-base font-semibold text-white">3 Peer Roles</p>
          <p className="text-[10px] text-neutral-400">SG • DSG • USG (Same Level)</p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-black/40 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300">
              Senior Advisory
            </span>
          </div>
          <p className="mt-1 text-base font-semibold text-white">
            {seniorAdvisorNode ? seniorAdvisorNode.assigned_name : 'Muaz Elamir'}
          </p>
          <p className="text-[10px] text-neutral-400">Advisory to Executive Secretariat</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#d4af37]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Active Directorates
            </span>
          </div>
          <p className="mt-1 text-base font-semibold text-white">{allHeads.length} Heads</p>
          <p className="text-[10px] text-neutral-400">Media, Volunteers, Security & Unified</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#d4af37]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Co-Head Cadre
            </span>
          </div>
          <p className="mt-1 text-base font-semibold text-white">
            {allHeads.reduce((acc, h) => acc + (h.children?.length || 0), 0)} Co-Heads
          </p>
          <p className="text-[10px] text-neutral-400">Subordinate Section Leadership</p>
        </div>
      </div>
      )}

      {/* Main View Area */}
      {isScopedMember ? (
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#15130f] to-[#09090b] p-5 sm:p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f5d47a]">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d4af37]">Your reporting line</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Your Department Head</h3>
              <p className="mt-1 text-xs text-neutral-400">Only the head you selected during EB sign-up is shown here.</p>
            </div>
          </div>
          {reportingHeadNode ? (
            <div className="flex flex-col items-center">
              <div className="mb-3 h-6 w-px bg-[#d4af37]/60" />
              {renderPersonnelCard(reportingHeadNode, 'head')}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-center">
              <Shield className="mx-auto h-6 w-6 text-amber-300" />
              <p className="mt-3 text-sm font-medium text-white">Your reporting head could not be matched</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-neutral-400">
                Your account's selected reporting-head ID does not match an active head record. No other heads are shown. Ask an admin to verify the head selection saved during sign-up.
              </p>
            </div>
          )}
        </div>
      ) : viewMode === 'chart' ? (
        <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#09090b]/80 p-4 shadow-inner sm:p-6 lg:p-8">
          <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-center font-mono text-[10px] uppercase tracking-wider text-[#f5d47a]">
              <Crown className="h-3.5 w-3.5" />
              Executive Secretariat · Equal Peer Level
            </div>
            <div className="grid w-full grid-cols-1 justify-items-center gap-4 lg:grid-cols-3 lg:items-stretch">
              {triadNodes.map((node) => (
                <div key={node.id} className="flex w-full flex-col items-center">
                  {renderPersonnelCard(node, 'triad')}
                </div>
              ))}
            </div>
            <div className="my-4 h-6 w-px bg-gradient-to-b from-[#d4af37] to-amber-400/60" />
            {seniorAdvisorNode && (
              <>
                <div className="mb-2 text-center font-mono text-[10px] uppercase tracking-wider text-amber-300">Senior advisory</div>
                {renderPersonnelCard(seniorAdvisorNode, 'advisor')}
                <div className="my-4 h-6 w-px bg-gradient-to-b from-amber-400/70 to-[#d4af37]/50" />
              </>
            )}
            <div className="mb-4 text-center font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">Department & section heads</div>
            {filteredHeads.length ? (
              <div className="grid w-full grid-cols-1 items-start justify-items-center gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredHeads.map((head) => {
                  const hasCoHeads = Boolean(head.children?.length);
                  const isCollapsed = Boolean(collapsedHeads[head.id]);
                  return (
                    <div key={head.id} className="flex w-full flex-col items-center rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 sm:p-4">
                      {renderPersonnelCard(head, 'head', hasCoHeads, isCollapsed, hasCoHeads ? () => toggleHeadCollapse(head.id) : undefined)}
                      {hasCoHeads && !isCollapsed && (
                        <>
                          <div className="my-3 h-5 w-px bg-[#d4af37]/50" />
                          <div className="flex w-full flex-col items-center gap-3">
                            {head.children!.map((cohead) => (
                              <div key={cohead.id} className="flex w-full justify-center">
                                {renderPersonnelCard(cohead, 'cohead')}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">No active department heads match the current filters.</p>
            )}
          </div>
        </div>
      ) : (
        /* Alternative Structured Hierarchy List View */
        <div className="space-y-6">
          {/* Level 1: Secretariat Triad */}
          <div className="rounded-2xl border border-[#d4af37]/40 bg-black/40 p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
              <Crown className="h-4 w-4 text-[#d4af37]" />
              <h3 className="font-serif text-lg font-medium text-white">
                Executive Secretariat Triad (Peer Roles)
              </h3>
              <span className="ml-auto rounded-full bg-[#d4af37]/15 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#f5d47a]">
                Level 1 • Same Level
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {triadNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => setSelectedPerson(node)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all hover:border-[#d4af37] ${
                    isMe(node.assigned_name)
                      ? 'border-[#d4af37] bg-[#d4af37]/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {node.avatar_url ? (
                      <img
                        src={node.avatar_url}
                        alt={node.assigned_name}
                        className="h-10 w-10 rounded-lg object-cover border border-[#d4af37]/60"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f5d47a]">
                        <Crown className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-white truncate">
                          {node.assigned_name}
                        </h4>
                        {isMe(node.assigned_name) && (
                          <span className="rounded bg-[#d4af37] px-1 py-0.2 font-mono text-[8px] font-bold text-black uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#d4af37] font-medium">{node.role_title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Level 2: Senior Advisor */}
          {seniorAdvisorNode && (
            <div className="rounded-2xl border border-amber-500/40 bg-black/40 p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h3 className="font-serif text-lg font-medium text-white">
                  Executive Senior Advisory
                </h3>
                <span className="ml-auto rounded-full bg-amber-500/15 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300">
                  Level 2 • Reports to Triad
                </span>
              </div>
              <div
                onClick={() => setSelectedPerson(seniorAdvisorNode)}
                className="cursor-pointer max-w-md rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-400 transition"
              >
                <div className="flex items-center gap-3">
                  {seniorAdvisorNode.avatar_url ? (
                    <img
                      src={seniorAdvisorNode.avatar_url}
                      alt={seniorAdvisorNode.assigned_name}
                      className="h-12 w-12 rounded-lg object-cover border border-amber-400/60"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-300">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-white">
                      {seniorAdvisorNode.assigned_name}
                    </h4>
                    <p className="text-xs text-amber-400 font-medium">
                      {seniorAdvisorNode.role_title}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
                      {seniorAdvisorNode.responsibilities}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Level 3 & 4: Section & Department Heads */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
              <Building2 className="h-4 w-4 text-[#d4af37]" />
              <h3 className="font-serif text-lg font-medium text-white">
                Directorate & Section Leadership
              </h3>
              <span className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-neutral-300">
                Level 3 & 4 • Reports to Senior Advisor
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredHeads.map((head) => (
                <div
                  key={head.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
                >
                  <div
                    onClick={() => setSelectedPerson(head)}
                    className="cursor-pointer group flex items-start gap-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f5d47a]">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#d4af37]">
                          {head.department.replace(/_/g, ' ')}
                        </span>
                        {isMe(head.assigned_name) && (
                          <span className="rounded bg-[#d4af37] px-1 py-0.2 font-mono text-[8px] font-bold text-black uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-white group-hover:text-[#f5d47a] transition truncate">
                        {head.assigned_name}
                      </h4>
                      <p className="text-xs text-neutral-300">{head.role_title}</p>
                      {head.section && (
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
                          {head.section} section
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Subordinate Co-Heads */}
                  {head.children && head.children.length > 0 && (
                    <div className="border-t border-white/[0.08] pt-2 space-y-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
                        Subordinate Co-Heads:
                      </span>
                      {head.children.map((cohead) => (
                        <div
                          key={cohead.id}
                          onClick={() => setSelectedPerson(cohead)}
                          className="cursor-pointer flex items-center justify-between rounded-lg bg-black/40 px-2.5 py-1.5 text-xs hover:border-[#d4af37]/40 border border-transparent transition"
                        >
                          <div>
                            <span className="font-medium text-white">{cohead.assigned_name}</span>
                            <span className="ml-1 text-[10px] text-[#d4af37]">({cohead.role_title})</span>
                          </div>
                          <ChevronRight className="h-3 w-3 text-neutral-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Personnel Dossier Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#d4af37]/40 bg-[#0e0e12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-[#d4af37]" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                  WEST MUN 2027 Executive Personnel Dossier
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-start gap-4">
              {selectedPerson.avatar_url ? (
                <img
                  src={selectedPerson.avatar_url}
                  alt={selectedPerson.assigned_name}
                  className="h-16 w-16 rounded-xl object-cover border border-[#d4af37]/70 shadow-lg"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f5d47a]">
                  <Crown className="h-8 w-8" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl font-semibold text-white">
                    {selectedPerson.assigned_name}
                  </h3>
                  {isMe(selectedPerson.assigned_name) && (
                    <span className="rounded bg-[#d4af37] px-1.5 py-0.5 font-mono text-[9px] font-bold text-black uppercase">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-[#d4af37] mt-0.5">
                  {selectedPerson.role_title}
                </p>
                <p className="text-[11px] text-neutral-400 capitalize mt-0.5">
                  {selectedPerson.department.replace(/_/g, ' ')} Directorate
                  {selectedPerson.section ? ` • ${selectedPerson.section} section` : ''}
                </p>
              </div>
            </div>

            {/* Hierarchy Level Details */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Reporting Chain & Position
              </span>
              <p className="text-neutral-200">
                {selectedPerson.rank_level === 1 ? (
                  <span className="text-[#f5d47a] font-medium">
                    Secretariat Triad Member (Peer Executive Level with SG, DSG, and USG)
                  </span>
                ) : selectedPerson.rank_level === 2 ? (
                  <span className="text-amber-300 font-medium">
                    Executive Senior Advisor (Reports directly to Secretariat Triad)
                  </span>
                ) : selectedPerson.rank_level === 3 ? (
                  <span>Directorate Section Head (Reports to Senior Advisor & Secretariat)</span>
                ) : (
                  <span>Section Co-Head (Reports to Section Head)</span>
                )}
              </p>
            </div>

            {/* Core Responsibilities */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1.5 text-xs text-neutral-300">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37]">
                Mandate & Core Responsibilities
              </span>
              <p className="leading-relaxed">{selectedPerson.responsibilities}</p>
            </div>

            {/* Contact Details */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Official Communication Lines
              </span>
              {selectedPerson.contact_email ? (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
                  <a
                    href={`mailto:${selectedPerson.contact_email}`}
                    className="font-mono hover:underline text-[#f5d47a]"
                  >
                    {selectedPerson.contact_email}
                  </a>
                </div>
              ) : null}
              {selectedPerson.contact_phone ? (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Phone className="h-3.5 w-3.5 text-[#d4af37]" />
                  <a
                    href={`tel:${selectedPerson.contact_phone.replace(/\s+/g, '')}`}
                    className="font-mono hover:underline text-neutral-300"
                  >
                    {selectedPerson.contact_phone}
                  </a>
                </div>
              ) : null}
            </div>

            <div className="pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="w-full rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 py-2.5 text-xs font-semibold text-[#f5d47a] hover:bg-[#d4af37]/20 transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
