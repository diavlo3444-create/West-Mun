import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { downloadText, toCsv } from '../lib/safe';
import { INQUIRY_STATUSES } from './config';
import { btnDanger, btnGhost, btnGold, cardCls, explainError, inputCls, type Row } from './ui';

export const InquiriesManager: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false });
    if (err) setError(explainError(err));
    const list = (data as Row[]) ?? [];
    setRows(list);
    setNotes(Object.fromEntries(list.map((r) => [r.id, r.admin_notes ?? ''])));
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) => (!fStatus || r.status === fStatus) && (!q || [r.name, r.email, r.subject, r.message].some((x) => String(x ?? '').toLowerCase().includes(q))),
    );
  }, [rows, search, fStatus]);

  const patch = async (id: string, values: Row) => {
    if (!supabase) return;
    const { data, error: err } = await supabase.from('inquiries').update(values).eq('id', id).select('id');
    if (err || !data || data.length === 0) return setError(err ? explainError(err) : 'Not saved. You may not be signed in as an organiser.');
    setError('');
    load();
  };
  const remove = async (r: Row) => {
    if (!supabase) return;
    if (!window.confirm(`Permanently delete the message from ${r.name}?`)) return;
    const { data, error: err } = await supabase.from('inquiries').delete().eq('id', r.id).select('id');
    if (err || !data || data.length === 0) return setError(err ? explainError(err) : 'Not deleted.');
    load();
  };
  const exportCsv = () => {
    const head = ['id', 'received_at', 'name', 'email', 'subject', 'message', 'status', 'admin_notes', 'consent_version'];
    downloadText(`west-mun-messages-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([head, ...filtered.map((r) => head.map((k) => (k === 'received_at' ? r.created_at : r[k])))]));
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl wm-serif text-white">Messages</h2>
          <p className="text-xs text-neutral-400 mt-1">Messages sent through the contact form. Reply from your own email.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={load}><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          <button type="button" className={btnGold} onClick={exportCsv} disabled={filtered.length === 0}><Download className="w-3.5 h-3.5" /> CSV ({filtered.length})</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4 max-w-xl">
        <input className={inputCls} placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        <select className={inputCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All</option>
          {INQUIRY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      {error && <div className="mb-4 p-3 text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-md" role="alert">{error}</div>}
      {loading ? (
        <p className="text-sm text-neutral-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-400 py-10 text-center border border-dashed border-white/[0.07] rounded-md">{rows.length === 0 ? 'No messages yet.' : 'No messages match.'}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <article key={r.id} className={`${cardCls} p-4 ${r.status === 'new' ? 'border-[#d4af37]/40' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-sm text-white">{r.name} <a href={`mailto:${r.email}?subject=${encodeURIComponent('Re: ' + r.subject)}`} className="text-xs text-[#d4af37] ml-1 break-all">{r.email}</a></div>
                <span className="text-[11px] font-mono text-neutral-400">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="text-sm text-neutral-200 mb-1"><span className="text-neutral-400">Subject: </span>{r.subject}</div>
              <p className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed bg-[#0a0a0d] border border-white/[0.07] rounded-md p-3">{r.message}</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-[10rem_1fr_auto_auto] gap-2 items-start">
                <select className={inputCls} value={r.status} onChange={(e) => patch(r.id, { status: e.target.value })} aria-label="Status">
                  {INQUIRY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <input className={inputCls} placeholder="Private note…" maxLength={5000} value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} aria-label="Private note" />
                <button type="button" className={btnGhost} disabled={(notes[r.id] ?? '') === (r.admin_notes ?? '')} onClick={() => patch(r.id, { admin_notes: notes[r.id] ?? '' })}>Save note</button>
                <button type="button" className={btnDanger} onClick={() => remove(r)} aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
