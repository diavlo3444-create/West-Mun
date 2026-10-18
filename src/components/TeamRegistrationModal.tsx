import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, Shield, Camera, HeartHandshake, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EMAIL_RE } from '../lib/safe';
import type { Settings } from '../lib/content';
import { ConsentCheck } from './ConsentCheck';

interface TeamRegistrationModalProps {
  settings: Settings;
  onClose: () => void;
  defaultTeam?: 'security' | 'media' | 'volunteers';
}

export const TeamRegistrationModal: React.FC<TeamRegistrationModalProps> = ({
  settings,
  onClose,
  defaultTeam = 'security',
}) => {
  const [team, setTeam] = useState<'security' | 'media' | 'volunteers'>(defaultTeam);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    institution: '',
    section: 'male' as 'male' | 'female',
    experience: '',
    statement: '',
    ageOk: false,
    consent: false,
    website: '', // honeypot
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Authoritative open check from database settings
  const isTeamOpen = (teamId: 'security' | 'media' | 'volunteers') => {
    const key = `team_${teamId}_open`;
    return (settings[key] ?? 'true').toLowerCase() === 'true';
  };

  const currentlyOpen = isTeamOpen(team);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!currentlyOpen) {
      setSubmitError(`Registration for ${team.toUpperCase()} is currently closed by the Secretariat.`);
      return;
    }

    const errs: Record<string, string> = {};
    const name = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const inst = form.institution.trim();

    if (name.length < 2 || name.length > 100) errs.fullName = 'Please enter your full name.';
    if (!EMAIL_RE.test(email) || email.length > 120) errs.email = 'Please enter a valid email address.';
    if (inst.length < 2 || inst.length > 150) errs.institution = 'Please enter your school or organisation.';
    if (!form.ageOk) errs.ageOk = 'Please confirm this.';
    if (!form.consent) errs.consent = 'You must agree to the Terms and Privacy Policy.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (form.website) {
      setDone(true); // bot honeypot
      return;
    }

    if (!supabase) {
      setSubmitError('Team registration is unavailable at this moment. Please reach out via contact form.');
      return;
    }

    setBusy(true);

    const { error } = await supabase.from('team_registrations').insert({
      full_name: name,
      email,
      phone: form.phone.trim(),
      institution: inst,
      team,
      section: form.section,
      experience: form.experience.trim(),
      statement: form.statement.trim(),
      age_confirmed: true,
      consent_version: settings.legal_version || '2026-10-17',
    });

    setBusy(false);

    if (error) {
      if (error.message?.includes('team_registration_closed')) {
        setSubmitError(`Registration for the ${team.toUpperCase()} team has been closed.`);
      } else if (error.code === '23505') {
        setSubmitError(`This email address has already submitted an application for the ${team.toUpperCase()} team.`);
      } else if (error.message?.includes('rate_limited')) {
        setSubmitError('High registration volume detected. Please wait a moment and try again.');
      } else {
        setSubmitError('Could not submit application. Please verify your details and try again.');
      }
    } else {
      setDone(true);
    }
  };

  const inputCls =
    'w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2 px-3 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors';
  const labelCls = 'block text-xs uppercase tracking-wider text-neutral-300 mb-1 font-medium';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl my-8 bg-[#0e0e12] border border-[#d4af37]/40 rounded-sm p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 cursor-pointer"
          aria-label="Close team registration form"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-[1px] bg-[#d4af37]" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]">
              WEST MUN 2027 Staff Portal
            </span>
          </div>
          <h3 className="text-2xl font-serif text-white">Join the Organizing Team</h3>
          <p className="text-xs text-neutral-400 mt-1 font-light leading-relaxed">
            Apply to support WEST MUN proceedings as part of our specialized conference teams.
          </p>
        </div>

        {done ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-serif text-white">Application Received</h4>
            <p className="text-xs text-neutral-300 max-w-md mx-auto font-light leading-relaxed">
              Your application for the <strong className="text-[#d4af37] capitalize">{team}</strong> team has been securely recorded. The Secretariat will review your credentials and contact you at <span className="font-mono text-white">{form.email}</span>.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-black bg-[#d4af37] hover:bg-[#e5c158] rounded-sm cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {/* Team Selector Tabs */}
            <div>
              <label className={labelCls}>Select Department / Team</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'security', label: 'Security', icon: Shield },
                  { id: 'media', label: 'Media & Press', icon: Camera },
                  { id: 'volunteers', label: 'Volunteers', icon: HeartHandshake },
                ].map((t) => {
                  const Icon = t.icon;
                  const open = isTeamOpen(t.id as any);
                  const isSelected = team === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTeam(t.id as any);
                        setSubmitError(null);
                      }}
                      className={`p-3 rounded-sm border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#d4af37] bg-[#1a1a22]'
                          : 'border-neutral-800 bg-[#121216] hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#d4af37]' : 'text-neutral-400'}`} />
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-sm ${
                            open
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : 'bg-neutral-900 text-neutral-500 border border-neutral-700'
                          }`}
                        >
                          {open ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <span className="text-xs font-serif text-white font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Team Closed Alert Banner */}
            {!currentlyOpen && (
              <div className="p-3.5 bg-neutral-900/90 border border-neutral-700 rounded-sm text-xs text-neutral-300 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">Registration for {team.toUpperCase()} is Currently Closed</strong>
                  <p className="text-neutral-400 font-light mt-0.5">
                    The Secretariat has filled current quotas or closed admissions for this team. Please choose another department or check back later.
                  </p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="p-3 bg-red-950/40 border border-red-500/40 text-red-300 text-xs rounded-sm">
                {submitError}
              </div>
            )}

            {/* Honeypot for bots */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input
                  type="text"
                  required
                  disabled={!currentlyOpen || busy}
                  className={inputCls}
                  placeholder="e.g. Yousef Al-Mansoor"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
                {errors.fullName && <p className="text-[11px] text-red-400 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className={labelCls}>Email Address *</label>
                <input
                  type="email"
                  required
                  disabled={!currentlyOpen || busy}
                  className={inputCls}
                  placeholder="name@institution.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Phone Number (Optional)</label>
                <input
                  type="tel"
                  disabled={!currentlyOpen || busy}
                  className={inputCls}
                  placeholder="+966 50 123 4567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls}>School or University *</label>
                <input
                  type="text"
                  required
                  disabled={!currentlyOpen || busy}
                  className={inputCls}
                  placeholder="e.g. King Fahd University"
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                />
                {errors.institution && <p className="text-[11px] text-red-400 mt-1">{errors.institution}</p>}
              </div>
            </div>

            {/* Division / Section selection */}
            <div>
              <label className={labelCls}>Applicant Division / Section *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!currentlyOpen || busy}
                  onClick={() => setForm({ ...form, section: 'male' })}
                  className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                    form.section === 'male'
                      ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                      : 'bg-[#121216] border-neutral-700 text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  Male Section
                </button>
                <button
                  type="button"
                  disabled={!currentlyOpen || busy}
                  onClick={() => setForm({ ...form, section: 'female' })}
                  className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                    form.section === 'female'
                      ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                      : 'bg-[#121216] border-neutral-700 text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  Female Section
                </button>
              </div>
            </div>

            <div>
              <label className={labelCls}>Relevant Experience (Optional)</label>
              <textarea
                rows={2}
                disabled={!currentlyOpen || busy}
                className={inputCls}
                placeholder="Past MUN conferences, media portfolio links, first-aid certificates, etc."
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
              />
            </div>

            <div>
              <label className={labelCls}>Statement of Motivation (Optional)</label>
              <textarea
                rows={2}
                disabled={!currentlyOpen || busy}
                className={inputCls}
                placeholder="Why do you wish to join this team at WEST MUN 2027?"
                value={form.statement}
                onChange={(e) => setForm({ ...form, statement: e.target.value })}
              />
            </div>

            {/* Consents */}
            <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs text-neutral-300">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!currentlyOpen || busy}
                  checked={form.ageOk}
                  onChange={(e) => setForm({ ...form, ageOk: e.target.checked })}
                  className="mt-0.5"
                />
                <span>I confirm that I am at least 15 years of age and eligible to participate.</span>
              </label>
              {errors.ageOk && <p className="text-[11px] text-red-400">{errors.ageOk}</p>}

              <ConsentCheck
                id="team-consent"
                checked={form.consent}
                onChange={(checked) => setForm({ ...form, consent: checked })}
              />
              {errors.consent && <p className="text-[11px] text-red-400">{errors.consent}</p>}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!currentlyOpen || busy}
                className="px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all inline-flex items-center gap-2"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {currentlyOpen ? 'Submit Application' : 'Department Closed'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
