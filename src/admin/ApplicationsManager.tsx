import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Mail, RefreshCw, Send, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { downloadText, toCsv } from '../lib/safe';
import { DELEGATE_STATUSES, PAYMENT_STATUSES, TIER_LABELS, TYPE_LABELS } from './config';
import { btnDanger, btnGhost, btnGold, cardCls, explainError, inputCls, labelCls, type Row } from './ui';

const label = (list: Array<{ value: string; label: string }>, v: string) => list.find((x) => x.value === v)?.label ?? v;
const badge: Record<string, string> = {
  received: 'border-neutral-600 text-neutral-300',
  under_review: 'border-sky-500/40 text-sky-300',
  accepted: 'border-emerald-500/40 text-emerald-300',
  waitlisted: 'border-amber-500/40 text-amber-300',
  rejected: 'border-red-500/40 text-red-300',
  withdrawn: 'border-neutral-700 text-neutral-400',
  unpaid: 'border-neutral-600 text-neutral-300',
  paid: 'border-emerald-500/40 text-emerald-300',
  waived: 'border-sky-500/40 text-sky-300',
  refunded: 'border-amber-500/40 text-amber-300',
};
const Pill: React.FC<{ v: string; l: string }> = ({ v, l }) => (
  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 border rounded-md whitespace-nowrap ${badge[v] ?? 'border-neutral-600 text-neutral-300'}`}>{l || '—'}</span>
);

export const ApplicationsManager: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPay, setFPay] = useState('');
  const [fTier, setFTier] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [gmailBusy, setGmailBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [gmailNotice, setGmailNotice] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.from('delegates').select('*').order('created_at', { ascending: false });
    if (err) setError(explainError(err));
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
    const result = new URLSearchParams(window.location.search).get('gmail');
    if (result === 'connected') setGmailNotice('Gmail authorization connected. Acceptance emails remain manual.');
    else if (result) setGmailNotice('Gmail connection result: ' + result.replace(/-/g, ' ') + '. Check configuration if this was not successful.');
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!fStatus || r.status === fStatus) &&
        (!fPay || r.payment_status === fPay) &&
        (!fTier || r.tier === fTier) &&
        (!q || [r.full_name, r.email, r.institution].some((x) => String(x ?? '').toLowerCase().includes(q))),
    );
  }, [rows, search, fStatus, fPay, fTier]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      received: rows.filter((r) => r.status === 'received').length,
      accepted: rows.filter((r) => r.status === 'accepted').length,
      paid: rows.filter((r) => r.payment_status === 'paid').length,
    }),
    [rows],
  );

  const open = (r: Row) => {
    setOpenId(r.id);
    setDraft({ status: r.status, payment_status: r.payment_status, fee_amount: r.fee_amount ?? '', admin_notes: r.admin_notes ?? '' });
    setNotice('');
  };
  const current = rows.find((r) => r.id === openId);

  const save = async () => {
    if (!supabase || !current) return;
    const fee = String(draft.fee_amount ?? '').trim();
    if (fee && !/^\d{1,8}(\.\d{1,2})?$/.test(fee)) return setError('Fee must be a number like 10 or 12.50.');
    setSaving(true);
    setError('');
    const { data, error: err } = await supabase
      .from('delegates')
      .update({ status: draft.status, payment_status: draft.payment_status, fee_amount: fee === '' ? null : Number(fee), admin_notes: String(draft.admin_notes ?? '') })
      .eq('id', current.id)
      .select('id');
    setSaving(false);
    if (err || !data || data.length === 0) return setError(err ? explainError(err) : 'Not saved. You may not be signed in as an organiser.');
    setNotice('Saved.');
    load();
  };

  const remove = async () => {
    if (!supabase || !current) return;
    if (!window.confirm(`Permanently delete the application of ${current.full_name}? This cannot be undone.`)) return;
    const { data, error: err } = await supabase.from('delegates').delete().eq('id', current.id).select('id');
    if (err || !data || data.length === 0) return setError(err ? explainError(err) : 'Not deleted.');
    setOpenId(null);
    setNotice('Deleted.');
    load();
  };

  const connectGmail = async () => {
    if (!supabase || gmailBusy) return;
    setGmailBusy(true);
    setGmailNotice('');
    const { data, error: invokeError } = await supabase.functions.invoke('gmail-oauth-start', { body: {} });
    setGmailBusy(false);
    if (invokeError || !data?.authorization_url) {
      setGmailNotice(invokeError?.message || data?.error || 'Could not start Gmail authorization.');
      return;
    }
    window.location.assign(data.authorization_url);
  };

  const sendAcceptanceEmail = async () => {
    if (!supabase || !current || emailBusy || current.status !== 'accepted') return;
    if (!window.confirm('Send the WEST MUN acceptance email to ' + current.email + ' now? This sends a real email.')) return;
    setEmailBusy(true);
    setGmailNotice('');
    const { data, error: invokeError } = await supabase.functions.invoke('gmail-send-acceptance', { body: { delegateId: current.id } });
    setEmailBusy(false);
    if (invokeError || !data?.sent) {
      setGmailNotice(invokeError?.message || data?.error || 'Email was not confirmed as sent.');
      return;
    }
    setGmailNotice('Acceptance email sent to ' + data.recipient + '.');
  };

  const exportCsv = () => {
    const head = ['id', 'submitted_at', 'full_name', 'email', 'institution', 'tier', 'delegation_type', 'status', 'payment_status', 'fee_amount', 'admin_notes', 'consent_version', 'consent_at'];
    const body = filtered.map((r) => head.map((k) => (k === 'submitted_at' ? r.created_at : r[k])));
    downloadText(`west-mun-applications-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([head, ...body]));
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl wm-serif text-white">Applications</h2>
          <p className="text-xs text-neutral-400 mt-1">Delegate registrations. Only organisers can see these.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={connectGmail} disabled={gmailBusy}>{gmailBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Connect Gmail</button>
          <button type="button" className={btnGhost} onClick={load}><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          <button type="button" className={btnGold} onClick={exportCsv} disabled={filtered.length === 0}><Download className="w-3.5 h-3.5" /> CSV ({filtered.length})</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {([['Total', stats.total], ['Received', stats.received], ['Accepted', stats.accepted], ['Paid', stats.paid]] as const).map(([k, v]) => (
          <div key={k} className={`${cardCls} p-3`}>
            <div className="text-[10px] uppercase tracking-widest text-neutral-400">{k}</div>
            <div className="text-2xl font-sans font-semibold tabular-nums text-white">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <input className={`${inputCls} col-span-2 md:col-span-1`} placeholder="Search name, email, school…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        <select className={inputCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {DELEGATE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className={inputCls} value={fPay} onChange={(e) => setFPay(e.target.value)} aria-label="Filter by payment">
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className={inputCls} value={fTier} onChange={(e) => setFTier(e.target.value)} aria-label="Filter by tier">
          <option value="">All tiers</option>
          {Object.entries(TIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {gmailNotice && <div className="mb-4 p-3 text-xs text-neutral-200 bg-neutral-900 border border-[#d4af37]/30 rounded-md" role="status">{gmailNotice}</div>}
      {error && <div className="mb-4 p-3 text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-md" role="alert">{error}</div>}
      {notice && <div className="mb-4 p-3 text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 rounded-md">{notice}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className={`${cardCls} xl:col-span-3 overflow-x-auto`}>
          {loading ? (
            <p className="p-5 text-sm text-neutral-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-sm text-neutral-400 text-center">{rows.length === 0 ? 'No applications yet.' : 'No applications match these filters.'}</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] font-mono uppercase text-[#d4af37] border-b border-white/[0.07]">
                <tr><th className="p-3">Delegate</th><th className="p-3">Tier</th><th className="p-3">Status</th><th className="p-3">Payment</th><th className="p-3">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => open(r)} className={`cursor-pointer hover:bg-neutral-800/30 ${openId === r.id ? 'bg-neutral-800/40' : ''}`}>
                    <td className="p-3"><div className="text-white">{r.full_name}</div><div className="text-neutral-400 truncate max-w-[16rem]">{r.institution}</div></td>
                    <td className="p-3 text-neutral-300">{TIER_LABELS[r.tier] ?? r.tier}</td>
                    <td className="p-3"><Pill v={r.status} l={label(DELEGATE_STATUSES, r.status)} /></td>
                    <td className="p-3"><Pill v={r.payment_status} l={label(PAYMENT_STATUSES, r.payment_status)} /></td>
                    <td className="p-3 font-mono text-neutral-400">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="xl:col-span-2">
          {current ? (
            <div className={`${cardCls} p-5 space-y-4 xl:sticky xl:top-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg wm-serif text-white">{current.full_name}</div>
                  <a href={`mailto:${current.email}`} className="text-xs text-[#d4af37] break-all">{current.email}</a>
                </div>
                <button type="button" className="text-neutral-400 hover:text-white cursor-pointer" onClick={() => setOpenId(null)} aria-label="Close"><X className="w-4 h-4" /></button>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <dt className="text-neutral-400">School / organisation</dt><dd className="text-neutral-200">{current.institution}</dd>
                <dt className="text-neutral-400">Tier</dt><dd className="text-neutral-200">{TIER_LABELS[current.tier] ?? current.tier}</dd>
                <dt className="text-neutral-400">Registering as</dt><dd className="text-neutral-200">{TYPE_LABELS[current.delegation_type] ?? current.delegation_type}</dd>
                <dt className="text-neutral-400">Submitted</dt><dd className="text-neutral-200">{new Date(current.created_at).toLocaleString()}</dd>
                <dt className="text-neutral-400">Consent</dt><dd className="text-neutral-200">v{current.consent_version}, {new Date(current.consent_at).toLocaleDateString()}</dd>
                <dt className="text-neutral-400">18+ / permission</dt><dd className="text-neutral-200">{current.age_confirmed ? 'Confirmed' : 'No'}</dd>
              </dl>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="a-status" className={labelCls}>Status</label>
                  <select id="a-status" className={inputCls} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                    {DELEGATE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="a-pay" className={labelCls}>Payment</label>
                  <select id="a-pay" className={inputCls} value={draft.payment_status} onChange={(e) => setDraft({ ...draft, payment_status: e.target.value })}>
                    {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="a-fee" className={labelCls}>Fee (set by the server at sign-up)</label>
                <input id="a-fee" className={inputCls} inputMode="decimal" value={draft.fee_amount} onChange={(e) => setDraft({ ...draft, fee_amount: e.target.value })} placeholder="empty = TBA" />
              </div>
              <div>
                <label htmlFor="a-notes" className={labelCls}>Internal notes (private)</label>
                <textarea id="a-notes" rows={4} maxLength={5000} className={inputCls} value={draft.admin_notes} onChange={(e) => setDraft({ ...draft, admin_notes: e.target.value })} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnGold} onClick={save} disabled={saving}>{saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save</button>
                  <button type="button" className={btnGhost} onClick={sendAcceptanceEmail} disabled={emailBusy || current.status !== 'accepted'} title={current.status !== 'accepted' ? 'Save this application as Accepted first.' : 'Send acceptance email manually'}>{emailBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send acceptance email</button>
                </div>
                <button type="button" className={btnDanger} onClick={remove}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </div>
              <p className="text-[11px] text-neutral-400">Changing a status does not email the delegate. Contact them yourself.</p>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 p-4 border border-dashed border-white/[0.07] rounded-md">Select an application to see details and change its status.</p>
          )}
        </div>
      </div>
    </div>
  );
};
