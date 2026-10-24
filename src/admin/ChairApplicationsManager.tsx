import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, RefreshCw, Search, Users, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ChairApplication = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  institution: string;
  experience: string;
  motivation: string;
  committee_preferences: string;
  status: 'received' | 'under_review' | 'accepted' | 'rejected' | 'waitlisted';
  admin_notes: string;
};

type Setting = { key: string; value: string };

const statusOptions: ChairApplication['status'][] = ['received', 'under_review', 'accepted', 'rejected', 'waitlisted'];

export const ChairApplicationsManager: React.FC = () => {
  const [rows, setRows] = useState<ChairApplication[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setMessage('Supabase is not configured.'); setLoading(false); return; }
    setLoading(true);
    setMessage('');
    const [apps, config] = await Promise.all([
      supabase.from('wm_chair_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('settings').select('key,value').eq('key', 'chair_applications_open').maybeSingle(),
    ]);
    if (apps.error) setMessage(apps.error.message);
    else setRows((apps.data || []) as ChairApplication[]);
    if (config.error) setMessage((prev) => prev ? prev + ' · ' + config.error!.message : config.error!.message);
    setIsOpen((config.data as Setting | null)?.value?.toLowerCase() === 'true');
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggle = async () => {
    if (!supabase) return;
    const next = !isOpen;
    setBusy('toggle');
    setMessage('');
    const { error } = await supabase.from('settings').upsert({
      key: 'chair_applications_open',
      value: String(next),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    if (error) setMessage('Could not update the application window: ' + error.message);
    else {
      setIsOpen(next);
      setMessage(next ? 'Chair applications are now OPEN.' : 'Chair applications are now CLOSED.');
    }
    setBusy('');
  };

  const updateApplication = async (row: ChairApplication, status: ChairApplication['status']) => {
    if (!supabase) return;
    setBusy(row.id);
    setMessage('');
    const { error } = await supabase.from('wm_chair_applications')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', row.id);
    if (error) setMessage('Could not update application: ' + error.message);
    else {
      setRows((prev) => prev.map((item) => item.id === row.id ? { ...item, status } : item));
      setMessage(row.full_name + ' marked ' + status.replaceAll('_', ' ') + '.');
    }
    setBusy('');
  };

  const filtered = rows.filter((row) =>
    (filter === 'all' || row.status === filter) &&
    [row.full_name, row.email, row.institution, row.committee_preferences].some((value) =>
      String(value || '').toLowerCase().includes(search.toLowerCase()),
    ),
  );

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Chair applications</h2>
        <p className="text-sm text-neutral-400">Control the public application window and review chair applicants.</p>
      </div>
      {message && <p role="status" className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-neutral-200">{message}</p>}
      <div className="rounded-xl border border-[#d4af37]/25 bg-gradient-to-r from-[#17150f] to-neutral-900 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-white">Public chair application form</p>
            <p className="mt-1 text-sm text-neutral-400">{isOpen ? 'Applicants can submit the form now.' : 'The public form is closed to new submissions.'}</p>
          </div>
          <button type="button" disabled={busy === 'toggle'} onClick={() => void toggle()} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${isOpen ? 'bg-red-500/15 text-red-200 border border-red-400/30' : 'bg-emerald-500 text-black'}`}>
            {busy === 'toggle' ? <Loader2 size={18} className="animate-spin" /> : isOpen ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            {isOpen ? 'Close applications' : 'Open applications'}
          </button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">Closing stops new submissions immediately; existing applications remain available for review.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-neutral-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, school, committee…" className="w-full rounded-lg border border-white/10 bg-neutral-950 py-2.5 pl-9 pr-3 text-sm text-white" /></label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white">
          <option value="all">All statuses</option><option value="received">Pending</option><option value="under_review">Under review</option><option value="accepted">Accepted</option><option value="waitlisted">Waitlisted</option><option value="rejected">Rejected</option>
        </select>
        <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white"><RefreshCw size={15} /> Refresh</button>
      </div>
      {loading ? <p className="text-sm text-neutral-400">Loading chair applications…</p> : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-7 text-center text-sm text-neutral-400"><Users className="mx-auto mb-2" size={22} />{rows.length ? 'No applications match your search.' : 'No chair applications submitted yet.'}</div>
      ) : <div className="space-y-3">{filtered.map((row) => (
        <article key={row.id} className="space-y-3 rounded-xl border border-white/10 bg-neutral-900/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-semibold text-white">{row.full_name}</h3><p className="text-sm text-neutral-400">{row.email}{row.phone ? ' · ' + row.phone : ''}</p><p className="mt-1 text-xs text-neutral-500">{row.institution} · {new Date(row.created_at).toLocaleDateString()}</p></div>
            <span className="rounded-full border border-[#d4af37]/25 px-3 py-1 text-xs text-[#e6cb74]">{row.status.replaceAll('_', ' ')}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-black/25 p-3"><p className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">Committee preferences</p><p className="whitespace-pre-wrap text-sm text-neutral-200">{row.committee_preferences || 'Not provided'}</p></div>
            <div className="rounded-lg bg-black/25 p-3"><p className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">Previous experience</p><p className="whitespace-pre-wrap text-sm text-neutral-200">{row.experience || 'Not provided'}</p></div>
          </div>
          <div className="rounded-lg bg-black/25 p-3"><p className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">Motivation statement</p><p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{row.motivation}</p></div>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy === row.id || row.status === 'accepted'} onClick={() => void updateApplication(row, 'accepted')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black"><Check size={14} /> Accept</button>
            <button disabled={busy === row.id || row.status === 'rejected'} onClick={() => void updateApplication(row, 'rejected')} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300"><X size={14} /> Reject</button>
            {statusOptions.filter((status) => status !== 'accepted' && status !== 'rejected' && status !== row.status).map((status) => <button key={status} disabled={busy === row.id} onClick={() => void updateApplication(row, status)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">{status === 'received' ? 'Mark pending' : status === 'under_review' ? 'Mark reviewing' : 'Waitlist'}</button>)}
          </div>
        </article>
      ))}</div>}
    </section>
  );
};
