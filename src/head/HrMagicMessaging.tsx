import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mail, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Notice, PageHeader, Panel } from '../dashboard/ui';

type Template = { subject: string; body: string };
type Counts = { total: number; ready: number; alreadyHandled: number; missingEmail: number };
type Preview = { accepted: Counts; rejected: Counts; totalReady: number; providerConfigured: boolean };
type Report = { sent: number; failed: number; skipped: number; errors: Array<{ name: string; reason: string }> };

const defaults: Record<'accepted' | 'rejected', Template> = {
  accepted: {
    subject: 'Your WEST MUN 2027 Application — Accepted',
    body: 'Hello {name},\n\nCongratulations! Your application to WEST MUN 2027 has been accepted.\n\nDepartment / category: {department}\n\nFurther information and next steps will be shared by the WEST MUN Secretariat.\n\nBest regards,\nWEST MUN 2027 Secretariat',
  },
  rejected: {
    subject: 'Your WEST MUN 2027 Application Update',
    body: 'Hello {name},\n\nThank you for applying to WEST MUN 2027 and for taking the time to share your experience and interest. After reviewing your application, we are unable to offer you a place at this time.\n\nWe appreciate your interest in WEST MUN and wish you the very best.\n\nBest regards,\nWEST MUN 2027 Secretariat',
  },
};

export const HrMagicMessaging: React.FC = () => {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [templates, setTemplates] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [report, setReport] = useState<Report | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    const { data, error: invokeError } = await supabase.functions.invoke('hr-bulk-email', { body: { action: 'preview' } });
    if (invokeError || !data?.ok) setError(data?.error || invokeError?.message || 'Could not load messaging preview.');
    else setPreview(data.summary as Preview);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const send = async () => {
    if (!preview || preview.totalReady < 1 || sending) return;
    const message = `Send ${preview.totalReady} emails now?\n\nAccepted: ${preview.accepted.ready}\nRejected: ${preview.rejected.ready}\n\nApplicants already notified will be skipped. This action cannot be undone.`;
    if (!window.confirm(message)) return;
    setSending(true);
    setError('');
    setNotice('');
    setReport(null);
    const { data, error: invokeError } = await supabase!.functions.invoke('hr-bulk-email', { body: { action: 'send', templates } });
    if (invokeError || !data?.result) {
      setError(data?.error || invokeError?.message || 'Email batch failed.');
    } else {
      setReport(data.result as Report);
      setNotice(`Magic Messaging finished: ${data.result.sent} sent, ${data.result.failed} failed, ${data.result.skipped} skipped.`);
      if (data.result.failed > 0) setError('Some messages could not be sent. Review the failure list below; failed messages can be retried.');
    }
    setSending(false);
    await refresh();
  };

  const updateTemplate = (kind: 'accepted' | 'rejected', key: keyof Template, value: string) =>
    setTemplates((current) => ({ ...current, [kind]: { ...current[kind], [key]: value } }));

  const countCard = (label: string, value: number, tone: string) => (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Human resources · automation" title="Magic Messaging" description="One controlled send for finalized accepted and rejected applications across Delegates, Chairs and Team Members." actions={<button type="button" onClick={() => void refresh()} disabled={loading || sending} className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/[0.04] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh preview</button>} />
      <Panel className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#e8cc7b]"><ShieldCheck size={19} /></span>
          <div><h3 className="text-sm font-semibold text-white">Protected bulk delivery</h3><p className="mt-1 text-xs leading-5 text-neutral-400">Only active HR accounts and admins can send. Recipients are read directly from the existing application statuses. Each applicant receives only the matching acceptance or rejection message, and previously queued or sent notifications are excluded.</p></div>
        </div>
      </Panel>
      {error && <Notice tone="error" title="Messaging issue">{error}</Notice>}
      {notice && <div role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {countCard('Accepted applications', preview?.accepted.total ?? 0, 'text-emerald-300')}
        {countCard('Rejected applications', preview?.rejected.total ?? 0, 'text-rose-300')}
        {countCard('Ready to send', preview?.totalReady ?? 0, 'text-[#e8cc7b]')}
        {countCard('Already notified / queued', (preview?.accepted.alreadyHandled ?? 0) + (preview?.rejected.alreadyHandled ?? 0), 'text-neutral-200')}
      </div>
      <Panel className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-white">Delivery preview</h3><p className="mt-1 text-xs text-neutral-500">Counts include all three application groups.</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] ${preview?.providerConfigured ? 'border-emerald-400/30 text-emerald-300' : 'border-amber-400/30 text-amber-300'}`}>{preview?.providerConfigured ? 'Email provider ready' : 'Email provider not configured'}</span></div>
        <div className="grid gap-3 md:grid-cols-2">
          {(['accepted', 'rejected'] as const).map((kind) => (
            <div key={kind} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <h4 className={`text-xs font-semibold uppercase tracking-wider ${kind === 'accepted' ? 'text-emerald-300' : 'text-rose-300'}`}>{kind}</h4>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-neutral-500">Ready</p><p className="mt-1 text-lg text-white">{preview?.[kind].ready ?? '—'}</p></div>
                <div><p className="text-neutral-500">Already handled</p><p className="mt-1 text-lg text-white">{preview?.[kind].alreadyHandled ?? '—'}</p></div>
                <div><p className="text-neutral-500">Missing email</p><p className="mt-1 text-lg text-white">{preview?.[kind].missingEmail ?? '—'}</p></div>
                <div><p className="text-neutral-500">Total</p><p className="mt-1 text-lg text-white">{preview?.[kind].total ?? '—'}</p></div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-neutral-500">Supported placeholders: <code>{'{name}'}</code>, <code>{'{department}'}</code>, <code>{'{institution}'}</code>.</p>
          <button type="button" onClick={() => void send()} disabled={loading || sending || !preview || preview.totalReady === 0 || !preview.providerConfigured} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-5 py-3 text-xs font-semibold text-black transition hover:bg-[#e5c45d] disabled:cursor-not-allowed disabled:opacity-40">{sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}{sending ? 'Sending messages…' : `Send all notifications · ${preview?.totalReady ?? 0}`}</button>
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        {(['accepted', 'rejected'] as const).map((kind) => (
          <Panel key={kind} className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">{kind === 'accepted' ? <CheckCircle2 size={16} className="text-emerald-300" /> : <AlertCircle size={16} className="text-rose-300" />}<h3 className="text-sm font-semibold capitalize text-white">{kind} email template</h3></div>
            <label className="block space-y-1"><span className="text-[10px] uppercase tracking-wider text-neutral-500">Subject</span><input value={templates[kind].subject} maxLength={200} onChange={(event) => updateTemplate(kind, 'subject', event.target.value)} className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-[#d4af37]/50" /></label>
            <label className="block space-y-1"><span className="text-[10px] uppercase tracking-wider text-neutral-500">Message</span><textarea value={templates[kind].body} maxLength={12000} rows={8} onChange={(event) => updateTemplate(kind, 'body', event.target.value)} className="w-full resize-y rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm leading-6 text-white outline-none focus:border-[#d4af37]/50" /></label>
          </Panel>
        ))}
      </div>
      {report && <Panel className="p-4 sm:p-5 space-y-3"><h3 className="text-sm font-semibold text-white">Latest send report</h3><div className="grid grid-cols-3 gap-3"><div><p className="text-[10px] text-neutral-500">Sent</p><p className="text-xl text-emerald-300">{report.sent}</p></div><div><p className="text-[10px] text-neutral-500">Failed</p><p className="text-xl text-rose-300">{report.failed}</p></div><div><p className="text-[10px] text-neutral-500">Skipped</p><p className="text-xl text-neutral-200">{report.skipped}</p></div></div>{report.errors.length > 0 && <ul className="space-y-1 text-xs text-rose-200">{report.errors.map((item, index) => <li key={index}>{item.name}: {item.reason}</li>)}</ul>}</Panel>}
      <p className="text-[11px] text-neutral-600">A queued or sent message is not automatically resent. Failed deliveries are logged and can be retried. A successful provider response confirms acceptance by Resend, not inbox delivery.</p>
    </div>
  );
};
