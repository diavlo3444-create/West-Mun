import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Search, RefreshCw, Eye, CheckCircle2, Clock3, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EmptyState, Notice, PageHeader, Panel, PanelHeader, Skeleton, StatusBadge, btnPrimary, btnSecondary, inputCls } from '../dashboard/ui';
import type { Row } from './ui';

type HeadRow = {
  user_id: string;
  email: string;
  head_name: string | null;
  department: string;
  section: string | null;
  active: boolean;
  created_at: string;
};
type DecisionRow = {
  registration_id: string;
  department: string;
  section: string;
  role_title: string;
  head_decision: 'approved' | 'rejected';
  head_notes: string | null;
  head_user_id: string;
  head_submitted_at: string;
  admin_decision: string;
  admin_notes: string | null;
  admin_reviewed_at: string | null;
};
type Props = { teamRegistrations: Row[]; loading: boolean; onRefresh: () => void };

const label = (value?: string | null) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const teamMatches = (registrationTeam: string, department: string) => {
  if (department === 'media_press') return ['media', 'media_press'].includes(registrationTeam);
  if (department === 'volunteers') return ['volunteers', 'volunteer'].includes(registrationTeam);
  if (department === 'security') return registrationTeam === 'security';
  return registrationTeam === department;
};

export const HeadsManager: React.FC<Props> = ({ teamRegistrations, loading: registrationsLoading, onRefresh }) => {
  const [heads, setHeads] = useState<HeadRow[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null);

  const loadHeads = useCallback(async () => {
    if (!supabase) { setLoading(false); setNotice({ tone: 'error', message: 'Supabase is not configured.' }); return; }
    setRefreshing(true);
    setNotice(null);
    const [headsResult, decisionsResult] = await Promise.all([
      supabase.from('department_heads').select('user_id,email,head_name,department,section,active,created_at').order('department').order('section'),
      supabase.from('wm_staffing_decisions').select('registration_id,department,section,role_title,head_decision,head_notes,head_user_id,head_submitted_at,admin_decision,admin_notes,admin_reviewed_at').order('head_submitted_at', { ascending: false }),
    ]);
    if (headsResult.error) setNotice({ tone: 'error', message: `Could not load department heads: ${headsResult.error.message}` });
    else setHeads((headsResult.data || []) as HeadRow[]);
    if (decisionsResult.error) setNotice({ tone: 'error', message: `Could not load head recommendations: ${decisionsResult.error.message}` });
    else setDecisions((decisionsResult.data || []) as DecisionRow[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void loadHeads(); }, [loadHeads]);

  const filteredHeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return heads.filter((h) => !q || [h.head_name, h.email, h.department, h.section].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [heads, search]);

  const selectedHead = heads.find((h) => h.user_id === selectedId) || null;
  const selectedDecisions = useMemo(() => selectedHead ? decisions.filter((d) => d.head_user_id === selectedHead.user_id) : [], [decisions, selectedHead]);
  const headRegistrations = useMemo(() => selectedHead ? teamRegistrations.filter((r) => teamMatches(String(r.team || ''), selectedHead.department) && (!selectedHead.section || r.section === selectedHead.section)) : [], [teamRegistrations, selectedHead]);
  const decisionByRegistration = useMemo(() => new Map(selectedDecisions.map((d) => [d.registration_id, d])), [selectedDecisions]);
  const pendingApprovals = selectedDecisions.filter((d) => d.head_decision === 'approved' && d.admin_decision === 'pending' && !['accepted', 'rejected', 'withdrawn'].includes(String(teamRegistrations.find((r) => r.id === d.registration_id)?.status || '')));

  const approveAll = async () => {
    if (!supabase || !selectedHead || pendingApprovals.length === 0 || busy) return;
    const confirmed = window.confirm(`Approve ${pendingApprovals.length} application(s) recommended by ${selectedHead.head_name || selectedHead.email}? This is the final Secretariat decision and cannot be undone here.`);
    if (!confirmed) return;
    setBusy(true);
    setNotice(null);
    const { data: auth } = await supabase.auth.getUser();
    const ids = pendingApprovals.map((d) => d.registration_id);
    const now = new Date().toISOString();
    const statusUpdate = await supabase.from('team_registrations').update({
      status: 'accepted',
      admin_notes: `Approved in bulk by Secretariat for head ${selectedHead.head_name || selectedHead.email} on ${now}.`,
    }).in('id', ids).select('id');
    if (statusUpdate.error) {
      setNotice({ tone: 'error', message: `Bulk approval failed: ${statusUpdate.error.message}` });
      setBusy(false);
      return;
    }
    const finalizedIds = (statusUpdate.data || []).map((r: any) => r.id);
    if (finalizedIds.length) {
      const decisionUpdate = await supabase.from('wm_staffing_decisions').update({
        admin_decision: 'approved',
        admin_user_id: auth.user?.id || null,
        admin_reviewed_at: now,
        admin_notes: 'Approved by Secretariat using Approve All Applications.',
        updated_at: now,
      }).in('registration_id', finalizedIds);
      if (decisionUpdate.error) {
        setNotice({ tone: 'error', message: `Applications were marked accepted, but some Secretariat decision records did not sync: ${decisionUpdate.error.message}. Refresh and review.` });
        await loadHeads();
        onRefresh();
        setBusy(false);
        return;
      }
    }
    setNotice({ tone: 'success', message: `Approved ${finalizedIds.length} application(s). Existing records were updated; no registrations were deleted.` });
    await loadHeads();
    onRefresh();
    setBusy(false);
  };

  return <div className="space-y-5">
    <PageHeader eyebrow="People & approvals" title="Department Heads" description="Open a head to review their department, recommendations, and applicant workload." actions={<button type="button" onClick={() => { void loadHeads(); onRefresh(); }} className={btnSecondary} disabled={refreshing}><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button>} />
    {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}
    <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.6fr)]">
      <Panel className="overflow-hidden">
        <PanelHeader title={`Heads (${filteredHeads.length})`} description="Select a head to inspect their work." />
        <div className="border-b border-white/[0.06] p-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" /><input className={`${inputCls} pl-8`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, team, section…" aria-label="Search department heads" /></div>
        </div>
        {loading ? <div className="space-y-3 p-4">{[1,2,3,4].map((n) => <Skeleton key={n} className="h-14 w-full" />)}</div> : filteredHeads.length === 0 ? <EmptyState icon={Users} title="No heads found" description="No active or inactive department-head assignments match this search." /> : <div className="max-h-[650px] overflow-y-auto divide-y divide-white/[0.05]">
          {filteredHeads.map((head) => {
            const work = decisions.filter((d) => d.head_user_id === head.user_id);
            const waiting = work.filter((d) => d.admin_decision === 'pending' && d.head_decision === 'approved').length;
            return <button type="button" key={head.user_id} onClick={() => { setSelectedId(head.user_id); setNotice(null); }} className={`w-full p-4 text-left transition-colors hover:bg-white/[0.035] ${selectedId === head.user_id ? 'bg-[#d4af37]/[0.08] border-l-2 border-[#d4af37]' : 'border-l-2 border-transparent'}`}>
              <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.08] text-xs font-semibold text-[#e7ca72]">{(head.head_name || head.email || '?').trim().split(/\s+/).slice(0,2).map((p) => p[0]).join('').toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-neutral-100">{head.head_name || 'Unnamed head'}</span><span className="mt-0.5 block truncate text-[11px] text-neutral-400">{label(head.department)}{head.section ? ` · ${label(head.section)}` : ''}</span><span className="mt-1 block truncate text-[10px] text-neutral-500">{head.email}</span></span></div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className={`rounded border px-2 py-0.5 text-[9px] uppercase tracking-wider ${head.active ? 'border-emerald-400/20 text-emerald-300' : 'border-neutral-700 text-neutral-500'}`}>{head.active ? 'Active' : 'Inactive'}</span><span className="text-[10px] text-neutral-400">{work.length} recommendations · {waiting} awaiting approval</span></div>
            </button>;
          })}
        </div>}
      </Panel>
      <div className="space-y-4">
        {!selectedHead ? <Panel className="flex min-h-[320px] items-center justify-center p-8"><EmptyState icon={Eye} title="Select a department head" description="Their applications, recommendations, and approval queue will appear here." /></Panel> : <>
          <Panel className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#d4af37]">Head dossier</p><h2 className="mt-1 text-xl font-semibold text-white">{selectedHead.head_name || 'Unnamed head'}</h2><p className="mt-1 text-xs text-neutral-400">{selectedHead.email}</p><p className="mt-2 text-xs text-neutral-300">{label(selectedHead.department)}{selectedHead.section ? ` · ${label(selectedHead.section)} division` : ''}</p></div><div className="rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/[0.05] px-3 py-2 text-right"><p className="text-[9px] uppercase tracking-widest text-neutral-400">Pending final approval</p><p className="mt-1 text-2xl font-semibold text-[#e7ca72]">{pendingApprovals.length}</p></div></div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void approveAll()} disabled={busy || pendingApprovals.length === 0} className={btnPrimary}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve All Applications ({pendingApprovals.length})</button><button type="button" onClick={() => { void loadHeads(); onRefresh(); }} className={btnSecondary} disabled={refreshing}>Refresh work</button></div>
            <p className="mt-3 text-[10px] leading-relaxed text-neutral-500">Bulk approval only includes candidates this head recommended for approval that are still awaiting the Secretariat. Rejected, withdrawn, and already-finalized applications are left unchanged.</p>
          </Panel>
          <Panel className="overflow-hidden">
            <PanelHeader title={`Applications & work (${headRegistrations.length})`} description="Applications in this head’s assigned department and section, with their recommendation and final decision." />
            {registrationsLoading && headRegistrations.length === 0 ? <div className="space-y-3 p-4">{[1,2,3].map((n) => <Skeleton key={n} className="h-12 w-full" />)}</div> : headRegistrations.length === 0 ? <EmptyState icon={Users} title="No applications yet" description="No team registrations match this head’s department and section." /> : <div className="divide-y divide-white/[0.05]">
              {headRegistrations.map((r) => {
                const d = decisionByRegistration.get(String(r.id));
                return <div key={String(r.id)} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-medium text-neutral-100">{String(r.full_name || 'Unnamed applicant')}</p><p className="mt-0.5 text-[11px] text-neutral-400">{String(r.email || '')} · {String(r.institution || 'No institution')}</p><p className="mt-1 text-[10px] text-neutral-500">{d ? `Recommendation: ${label(d.head_decision)} · ${d.role_title || 'General'}` : 'No recommendation submitted yet'}{d?.head_notes ? ` · ${d.head_notes}` : ''}</p></div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={String(r.status || 'received')} />{d && <span className={`rounded border px-2 py-1 text-[9px] ${d.admin_decision === 'approved' ? 'border-emerald-400/20 text-emerald-300' : d.admin_decision === 'rejected' ? 'border-rose-400/20 text-rose-300' : 'border-amber-400/20 text-amber-300'}`}>{d.admin_decision === 'approved' ? 'Secretariat approved' : d.admin_decision === 'rejected' ? 'Secretariat rejected' : 'Awaiting Secretariat'}</span>}</div></div>;
              })}
            </div>}
          </Panel>
        </>}
      </div>
    </div>
  </div>;
};
