import React, { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EMAIL_RE } from '../lib/safe';

interface ChairApplicationModalProps { onClose: () => void; }

export const ChairApplicationModal: React.FC<ChairApplicationModalProps> = ({ onClose }) => {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', institution: '', experience: '', motivation: '', preferences: '', ageConfirmed: false, consent: false, website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!supabase) { setError('Applications are temporarily unavailable. Please try again later.'); return; }
    if (form.website) { setDone(true); return; }
    const name = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const institution = form.institution.trim();
    const motivation = form.motivation.trim();
    if (name.length < 2 || name.length > 120) { setError('Enter your full name.'); return; }
    if (!EMAIL_RE.test(email) || email.length > 160) { setError('Enter a valid email address.'); return; }
    if (institution.length < 2 || institution.length > 180) { setError('Enter your school or organisation.'); return; }
    if (motivation.length < 20 || motivation.length > 6000) { setError('Your motivation statement must be between 20 and 6,000 characters.'); return; }
    if (!form.ageConfirmed || !form.consent) { setError('Please confirm the eligibility statement and privacy consent.'); return; }

    setBusy(true);
    try {
      const { data: setting, error: settingError } = await supabase.from('settings').select('value').eq('key', 'chair_applications_open').maybeSingle();
      if (settingError) throw new Error('Could not verify whether chair applications are open. Please try again.');
      if (String(setting?.value || 'false').toLowerCase() !== 'true') throw new Error('Chair applications are currently closed.');
      const { error: insertError } = await supabase.from('wm_chair_applications').insert({
        full_name: name,
        email,
        phone: form.phone.trim().slice(0, 40),
        institution,
        experience: form.experience.trim().slice(0, 6000),
        motivation,
        committee_preferences: form.preferences.trim().slice(0, 2000),
      });
      if (insertError) {
        if (/row-level security|policy|permission/i.test(insertError.message)) throw new Error('Chair applications have closed or submissions are temporarily unavailable. Please refresh and try again.');
        if (/duplicate|unique/i.test(insertError.message)) throw new Error('An application with this email may already exist. Contact the Secretariat if you need help.');
        throw new Error('Your application could not be submitted. Please try again.');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your application could not be submitted. Please try again.');
    } finally { setBusy(false); }
  };

  const field = 'w-full rounded-sm border border-neutral-700 bg-[#09090b] px-3.5 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none';
  const label = 'mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-neutral-400';

  return <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="chair-form-title">
    <div className="my-auto w-full max-w-2xl border border-[#d4af37]/30 bg-[#0c0c0e] shadow-2xl">
      <div className="flex items-start justify-between border-b border-neutral-800 px-5 py-5 sm:px-7">
        <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]"><GraduationCap size={20}/></span><div><p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#d4af37]">WEST MUN 2027 · Dais recruitment</p><h2 id="chair-form-title" className="mt-1 font-serif text-2xl text-white">Chair application</h2><p className="mt-1 text-xs text-neutral-400">Apply to chair a committee at WEST MUN.</p></div></div>
        <button type="button" onClick={onClose} className="rounded p-2 text-neutral-400 hover:bg-white/5 hover:text-white" aria-label="Close form"><X size={19}/></button>
      </div>
      {done ? <div className="px-6 py-12 text-center"><CheckCircle2 size={42} className="mx-auto text-emerald-400"/><h3 className="mt-4 font-serif text-2xl text-white">Application received</h3><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-400">Thank you for applying. The DCC and Secretariat will review your application.</p><button type="button" onClick={onClose} className="mt-6 bg-[#d4af37] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-black">Close</button></div> : <form onSubmit={(event) => void submit(event)} className="space-y-5 px-5 py-6 sm:px-7">
        {error && <div role="alert" className="flex gap-2 border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-200"><AlertCircle size={17} className="mt-0.5 shrink-0"/>{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label} htmlFor="chair-name">Full name *</label><input id="chair-name" className={field} autoComplete="name" maxLength={120} required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Your full name"/></div>
          <div><label className={label} htmlFor="chair-email">Email address *</label><input id="chair-email" className={field} type="email" autoComplete="email" maxLength={160} required value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com"/></div>
          <div><label className={label} htmlFor="chair-phone">Phone number</label><input id="chair-phone" className={field} type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Optional"/></div>
          <div><label className={label} htmlFor="chair-school">School / organisation *</label><input id="chair-school" className={field} maxLength={180} required value={form.institution} onChange={(e) => update('institution', e.target.value)} placeholder="Your school or organisation"/></div>
        </div>
        <div><label className={label} htmlFor="chair-experience">MUN / debate experience</label><textarea id="chair-experience" className={field} rows={3} maxLength={6000} value={form.experience} onChange={(e) => update('experience', e.target.value)} placeholder="Past conferences, delegate or dais roles, awards…"/></div>
        <div><label className={label} htmlFor="chair-preferences">Committee preferences</label><textarea id="chair-preferences" className={field} rows={2} maxLength={2000} value={form.preferences} onChange={(e) => update('preferences', e.target.value)} placeholder="Which committees or topics would you prefer?"/></div>
        <div><label className={label} htmlFor="chair-motivation">Why should we select you as a chair? *</label><textarea id="chair-motivation" className={field} rows={5} minLength={20} maxLength={6000} required value={form.motivation} onChange={(e) => update('motivation', e.target.value)} placeholder="Describe your leadership, procedural knowledge, impartiality, and what you would bring to the dais."/><p className="mt-1 text-right text-[10px] text-neutral-500">{form.motivation.length}/6000</p></div>
        <div className="hidden" aria-hidden="true"><label htmlFor="chair-website">Website</label><input id="chair-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update('website', e.target.value)}/></div>
        <div className="space-y-3 border-t border-neutral-800 pt-4">
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-neutral-300"><input type="checkbox" checked={form.ageConfirmed} onChange={(e) => update('ageConfirmed', e.target.checked)} className="mt-0.5 accent-[#d4af37]"/><span>I confirm that I meet the conference's eligibility requirements and that the information above is accurate.</span></label>
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-neutral-300"><input type="checkbox" checked={form.consent} onChange={(e) => update('consent', e.target.checked)} className="mt-0.5 accent-[#d4af37]"/><span>I consent to WEST MUN using these details to assess my chair application in accordance with its <a href="/privacy" target="_blank" rel="noreferrer" className="text-[#d4af37] underline">Privacy Policy</a>.</span></label>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-neutral-800 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="border border-neutral-700 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-300">Cancel</button><button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-60">{busy && <Loader2 size={15} className="animate-spin"/>}{busy ? 'Submitting…' : 'Submit application'}</button></div>
      </form>}
    </div>
  </div>;
};
