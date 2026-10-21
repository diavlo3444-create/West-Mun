import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown, Users, UserRoundCog, Search, RefreshCw, ShieldCheck, Mail, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EmptyState, Notice, PageHeader, Panel, PanelHeader, Skeleton, btnSecondary, inputCls } from '../dashboard/ui';

type Member = { user_id: string; full_name: string; email: string; account_role: string; team: string | null; section: string | null; active: boolean; created_at: string };
type Head = { user_id: string; email: string; head_name: string | null; department: string; section: string | null; active: boolean; created_at: string };
type Person = { id: string; name: string; email: string; role: string; department: string; section: string; active: boolean; created_at: string; kind: 'member' | 'head' };

const pretty = (value?: string | null) => String(value || '—').replace(/[_-]/g, ' ').replace(/\\b\\w/g, (c) => c.toUpperCase());

export const ExecutiveBoardManager: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [heads, setHeads] = useState<Head[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'member' | 'head'>('all');
  const [notice, setNotice] = useState<{ tone: 'error' | 'success' | 'info'; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabase) { setNotice({ tone: 'error', message: 'Supabase is not configured.' }); setLoading(false); return; }
    setRefreshing(true);
    setNotice(null);
    const { data, error } = await supabase.functions.invoke('wm-eb-access', { body: { action: 'list_members' } });
    if (error || !data?.success) {
      setNotice({ tone: 'error', message: data?.error || error?.message || 'Could not load the Executive Board directory.' });
    } else {
      setMembers((data.members || []) as Member[]);
      setHeads((data.heads || []) as Head[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const people = useMemo<Person[]>(() => [
    ...members.map((m) => ({ id: m.user_id, name: m.full_name || 'Unnamed EB member', email: m.email, role: pretty(m.account_role), department: m.team || '', section: m.section || '', active: m.active, created_at: m.created_at, kind: 'member' as const })),
    ...heads.map((h) => ({ id: h.user_id, name: h.head_name || 'Unnamed head', email: h.email, role: 'Department Head', department: h.department || '', section: h.section || '', active: h.active, created_at: h.created_at, kind: 'head' as const })),
  ], [members, heads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => (filter === 'all' || p.kind === filter) && (!q || [p.name, p.email, p.role, p.department, p.section].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [people, search, filter]);

  return <div className="space-y-5">
    <PageHeader eyebrow="People & access" title="Executive Board" description="One directory for EB members and department heads, including their assigned roles and sections." actions={<div className="flex flex-wrap gap-2"><a href="/admin/eb-invites" className="inline-flex items-center gap-2 rounded-md border border-[#d4af37]/35 px-3 py-2 text-xs font-medium text-[#e2c66f] hover:bg-[#d4af37]/10"><Crown className="h-3.5 w-3.5" /> EB Signup Links <ExternalLink className="h-3 w-3" /></a><button type="button" onClick={() => void load()} className={btnSecondary} disabled={refreshing}>{refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh</button></div>} />
    {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}
    <div className="grid gap-3 sm:grid-cols-3">
      <Panel className="p-4"><div className="flex items-center gap-3"><span className="rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/[0.08] p-2 text-[#e2c66f]"><Users className="h-4 w-4" /></span><div><p className="text-[10px] uppercase tracking-wider text-neutral-400">EB Members</p><p className="mt-1 text-2xl font-semibold text-white">{members.length}</p></div></div></Panel>
      <Panel className="p-4"><div className="flex items-center gap-3"><span className="rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/[0.08] p-2 text-[#e2c66f]"><UserRoundCog className="h-4 w-4" /></span><div><p className="text-[10px] uppercase tracking-wider text-neutral-400">Department Heads</p><p className="mt-1 text-2xl font-semibold text-white">{heads.length}</p></div></div></Panel>
      <Panel className="p-4"><div className="flex items-center gap-3"><span className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-2 text-emerald-300"><ShieldCheck className="h-4 w-4" /></span><div><p className="text-[10px] uppercase tracking-wider text-neutral-400">Active Assignments</p><p className="mt-1 text-2xl font-semibold text-white">{people.filter((p) => p.active).length}</p></div></div></Panel>
    </div>
    <Panel className="overflow-hidden">
      <PanelHeader title={`Executive Board directory (${filtered.length})`} description="Search people by name, email, role, department or section." />
      <div className="flex flex-col gap-3 border-b border-white/[0.06] p-3 sm:flex-row">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" /><input className={`${inputCls} pl-8`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the Executive Board…" aria-label="Search Executive Board" /></div>
        <div className="flex gap-1 rounded-md border border-white/[0.08] bg-black/20 p-1">
          {([{ id: 'all', label: 'Everyone' }, { id: 'member', label: 'EB Members' }, { id: 'head', label: 'Heads' }] as const).map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`rounded px-3 py-1.5 text-xs ${filter === item.id ? 'bg-[#d4af37] font-semibold text-black' : 'text-neutral-400 hover:text-white'}`}>{item.label}</button>)}
        </div>
      </div>
      {loading ? <div className="space-y-3 p-4">{[1,2,3,4].map((n) => <Skeleton key={n} className="h-16 w-full" />)}</div> : filtered.length === 0 ? <EmptyState icon={Users} title="No people found" description={search ? 'Try another name, email, role or section.' : 'No EB members or heads are available yet.'} /> : <div className="divide-y divide-white/[0.05]">
        {filtered.map((p) => <div key={`${p.kind}:${p.id}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.07] text-[#e2c66f]">{p.kind === 'head' ? <UserRoundCog className="h-4 w-4" /> : <Crown className="h-4 w-4" />}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-100">{p.name}</p><p className="mt-1 flex items-center gap-1.5 break-all text-[11px] text-neutral-400"><Mail className="h-3 w-3 shrink-0" />{p.email}</p><p className="mt-1 text-[11px] text-neutral-300">{pretty(p.role)} · {pretty(p.department)}{p.section ? ` · ${pretty(p.section)}` : ''}</p></div></div>
          <div className="flex shrink-0 items-center gap-2 sm:pl-4"><span className={`rounded border px-2 py-1 text-[9px] uppercase tracking-wider ${p.kind === 'head' ? 'border-sky-400/20 text-sky-300' : 'border-[#d4af37]/25 text-[#e2c66f]'}`}>{p.kind === 'head' ? 'Head' : 'EB Member'}</span><span className={`rounded border px-2 py-1 text-[9px] uppercase tracking-wider ${p.active ? 'border-emerald-400/20 text-emerald-300' : 'border-neutral-700 text-neutral-500'}`}>{p.active ? 'Active' : 'Inactive'}</span></div>
        </div>)}
      </div>}
    </Panel>
  </div>;
};
