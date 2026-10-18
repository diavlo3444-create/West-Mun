import React, { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EMAIL_RE } from '../lib/safe';
import { formatFee, type Tier } from '../lib/registration';
import type { Settings } from '../lib/content';
import { ConsentCheck } from './ConsentCheck';

interface Props {
  settings: Settings;
  openTiers: Tier[];
  onClose: () => void;
}

const TIER_LABEL: Record<Tier, string> = { early_bird: 'Early Bird Delegate', regular: 'Regular Registration' };

function explain(err: { code?: string; message?: string } | null): string {
  const m = err?.message ?? '';
  if (m.includes('registration_closed') || m.includes('registration_ended')) return 'Registration for this tier is closed.';
  if (m.includes('registration_not_yet')) return 'Registration for this tier has not opened yet.';
  if (m.includes('rate_limited')) return 'Many registrations are arriving right now. Please wait a minute and try again.';
  if (err?.code === '23505') return 'This email address is already registered for this tier.';
  if (err?.code === '23514') return 'Some details are not valid. Please check your name, email and institution.';
  return 'We could not submit your registration. Please try again later or use the contact form.';
}

export const RegistrationForm: React.FC<Props> = ({ settings, openTiers, onClose }) => {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    institution: '',
    tier: openTiers[0] ?? ('regular' as Tier),
    delegationType: 'single_delegate',
    ageOk: false,
    consent: false,
    website: '', // honeypot: real people never see or fill this
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const errs: Record<string, string> = {};
    const name = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const inst = form.institution.trim();
    if (name.length < 2 || name.length > 100) errs.fullName = 'Please enter your full name.';
    if (!EMAIL_RE.test(email) || email.length > 120) errs.email = 'Please enter a valid email address.';
    if (inst.length < 2 || inst.length > 150) errs.institution = 'Please enter your school or organisation.';
    if (!form.ageOk) errs.ageOk = 'Please confirm this.';
    if (!form.consent) errs.consent = 'You must agree to the Terms and Privacy Policy to register.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (form.website) {
      setDone(true); // bot: pretend success, send nothing
      return;
    }
    if (!supabase) {
      setSubmitError('Registration is not available right now. Please use the contact form.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('delegates').insert({
      full_name: name,
      email,
      institution: inst,
      tier: form.tier,
      delegation_type: form.delegationType,
      age_confirmed: true,
      consent_version: settings.legal_version || 'unknown',
    });
    setBusy(false);
    if (error) setSubmitError(explain(error));
    else setDone(true);
  };

  const input =
    'w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2 px-3 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors';
  const label = 'block text-xs uppercase tracking-wider text-neutral-300 mb-1 font-medium';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="reg-title">
      <div className="relative w-full max-w-lg my-8 bg-[#0e0e12] border border-[#d4af37]/40 rounded-sm p-6 sm:p-8 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 cursor-pointer" aria-label="Close registration form">
          <X className="w-5 h-5" />
        </button>
        <h3 id="reg-title" className="text-2xl font-serif text-white mb-1">Delegate Registration</h3>
        <p className="text-xs text-neutral-400 mb-6 font-light">
          Submitting this form does not guarantee a place. The Secretariat reviews every application and will contact you.
        </p>

        {done ? (
          <div className="p-6 bg-[#121c14] border border-emerald-500/30 rounded-sm text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h4 className="text-lg font-serif text-white mb-2">Application received</h4>
            <p className="text-xs text-neutral-300 leading-relaxed mb-4">
              Thank you. Your status is “received”. The Secretariat will contact you at the email you provided.
            </p>
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] rounded-sm hover:bg-[#e5c158] cursor-pointer">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="reg-name" className={label}>Full name <span className="text-[#d4af37]">*</span></label>
              <input id="reg-name" className={input} value={form.fullName} maxLength={100} autoComplete="name"
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              {errors.fullName && <p className="text-[11px] text-red-400 mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <label htmlFor="reg-email" className={label}>Email <span className="text-[#d4af37]">*</span></label>
              <input id="reg-email" type="email" className={input} value={form.email} maxLength={120} autoComplete="email"
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="reg-inst" className={label}>School / organisation <span className="text-[#d4af37]">*</span></label>
              <input id="reg-inst" className={input} value={form.institution} maxLength={150} autoComplete="organization"
                onChange={(e) => setForm({ ...form, institution: e.target.value })} />
              {errors.institution && <p className="text-[11px] text-red-400 mt-1">{errors.institution}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-tier" className={label}>Tier</label>
                <select id="reg-tier" className={input} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as Tier })}>
                  {openTiers.map((t) => (
                    <option key={t} value={t}>{TIER_LABEL[t]} — {formatFee(settings, t)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="reg-type" className={label}>Registering as</label>
                <select id="reg-type" className={input} value={form.delegationType} onChange={(e) => setForm({ ...form, delegationType: e.target.value })}>
                  <option value="single_delegate">Single delegate</option>
                  <option value="school_delegation">School delegation</option>
                </select>
              </div>
            </div>

            {/* honeypot */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
              <label>Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
            </div>

            <ConsentCheck id="reg-age" checked={form.ageOk} onChange={(v) => setForm({ ...form, ageOk: v })} error={errors.ageOk}>
              I am 18 or older, or my parent / guardian / school has given me permission to register and to share these details.
            </ConsentCheck>
            <ConsentCheck id="reg-consent" checked={form.consent} onChange={(v) => setForm({ ...form, consent: v })} error={errors.consent} />

            {submitError && (
              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-sm flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}
            <button type="submit" disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 text-xs uppercase tracking-widest font-semibold text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
              {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Submitting…</span></> : <span>Submit registration</span>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
