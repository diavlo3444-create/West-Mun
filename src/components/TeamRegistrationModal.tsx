import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, Shield, Camera, HeartHandshake, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EMAIL_RE } from '../lib/safe';
import type { Settings } from '../lib/content';
import { ConsentCheck } from './ConsentCheck';
import {
  SECURITY_QUESTIONS,
  countWords,
  getWordCountFeedback,
  validateSecurityAnswers,
  formatSecurityAnswers,
} from '../lib/securityQuestions';
import {
  VOLUNTEER_QUESTIONS,
  getVolunteerWordCountFeedback,
  validateVolunteerAnswers,
  formatVolunteerAnswers,
} from '../lib/volunteerQuestions';

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
    // Security team 4 mandatory scenario questions
    security_emergency_steps: '',
    security_teamwork: '',
    security_motivation: '',
    security_handling_harassment: '',
    // Volunteer team 4 mandatory assessment questions
    volunteer_special_skills: '',
    volunteer_teamwork_conflict: '',
    volunteer_emergency_reaction: '',
    volunteer_delegate_professionalism: '',
    // Media team application questions
    media_motivation: '',
    media_capture_strategy: '',
    media_unique_skills: '',
    media_equipment: '',
    media_portfolio: '',
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

  // Compute live Security validation state if team is security
  const securityValidation = team === 'security'
    ? validateSecurityAnswers({
        security_emergency_steps: form.security_emergency_steps,
        security_teamwork: form.security_teamwork,
        security_motivation: form.security_motivation,
        security_handling_harassment: form.security_handling_harassment,
      })
    : { valid: true, errors: {}, counts: {} };

  // Compute live Volunteer validation state if team is volunteers
  const volunteerValidation = team === 'volunteers'
    ? validateVolunteerAnswers({
        volunteer_special_skills: form.volunteer_special_skills,
        volunteer_teamwork_conflict: form.volunteer_teamwork_conflict,
        volunteer_emergency_reaction: form.volunteer_emergency_reaction,
        volunteer_delegate_professionalism: form.volunteer_delegate_professionalism,
      })
    : { valid: true, errors: {}, counts: {} };

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

    // Strict validation for Security team long-answer scenario questions
    if (team === 'security') {
      const secVal = validateSecurityAnswers({
        security_emergency_steps: form.security_emergency_steps,
        security_teamwork: form.security_teamwork,
        security_motivation: form.security_motivation,
        security_handling_harassment: form.security_handling_harassment,
      });

      if (!secVal.valid) {
        Object.assign(errs, secVal.errors);
      }
    }

    // Media questions are required; portfolio must be a valid HTTP(S) link.
    if (team === 'media') {
      const mediaRequired: Array<[string, string]> = [
        ['media_motivation', form.media_motivation],
        ['media_capture_strategy', form.media_capture_strategy],
        ['media_unique_skills', form.media_unique_skills],
        ['media_portfolio', form.media_portfolio],
      ];
      for (const [key, value] of mediaRequired) {
        if (!value.trim()) errs[key] = 'This question is required.';
      }
      try {
        const url = new URL(form.media_portfolio.trim());
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
      } catch {
        errs.media_portfolio = 'Please provide a valid portfolio URL starting with https:// or http://.';
      }
    }

    // Strict validation for Volunteer team required scenario questions
    if (team === 'volunteers') {
      const volVal = validateVolunteerAnswers({
        volunteer_special_skills: form.volunteer_special_skills,
        volunteer_teamwork_conflict: form.volunteer_teamwork_conflict,
        volunteer_emergency_reaction: form.volunteer_emergency_reaction,
        volunteer_delegate_professionalism: form.volunteer_delegate_professionalism,
      });

      if (!volVal.valid) {
        Object.assign(errs, volVal.errors);
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      if (team === 'security' && !securityValidation.valid) {
        setSubmitError('Please complete all 4 Security Assessment questions with their minimum required word counts.');
      } else if (team === 'volunteers' && !volunteerValidation.valid) {
        setSubmitError('Please complete all 4 Volunteer Assessment questions.');
      }
      return;
    }

    if (form.website) {
      setDone(true); // bot honeypot
      return;
    }

    setBusy(true);

    const formattedStatement = team === 'media'
      ? [
          'MEDIA DEPARTMENT APPLICATION RESPONSES',
          '',
          '1. Motivation and contribution to WEST MUN visual identity and coverage:',
          form.media_motivation.trim(),
          '',
          '2. Strategy for capturing key moments and delegate interactions in real time:',
          form.media_capture_strategy.trim(),
          '',
          '3. Unique skills, creative strengths, and prior experience:',
          form.media_unique_skills.trim(),
          '',
          '4. Personal media equipment and current setup:',
          form.media_equipment.trim() || 'Not provided',
          '',
          '5. Photography, videography, or design portfolio:',
          form.media_portfolio.trim(),
        ].join('\n')
      : team === 'security'
      ? formatSecurityAnswers({
          security_emergency_steps: form.security_emergency_steps,
          security_teamwork: form.security_teamwork,
          security_motivation: form.security_motivation,
          security_handling_harassment: form.security_handling_harassment,
        })
      : team === 'volunteers'
      ? formatVolunteerAnswers({
          volunteer_special_skills: form.volunteer_special_skills,
          volunteer_teamwork_conflict: form.volunteer_teamwork_conflict,
          volunteer_emergency_reaction: form.volunteer_emergency_reaction,
          volunteer_delegate_professionalism: form.volunteer_delegate_professionalism,
        })
      : form.statement.trim();

    const fullPayload = {
      full_name: name,
      email,
      phone: form.phone.trim(),
      institution: inst,
      team,
      section: form.section,
      experience: form.experience.trim(),
      statement: formattedStatement,
      security_emergency_steps: team === 'security' ? form.security_emergency_steps.trim() : '',
      security_teamwork: team === 'security' ? form.security_teamwork.trim() : '',
      security_motivation: team === 'security' ? form.security_motivation.trim() : '',
      security_handling_harassment: team === 'security' ? form.security_handling_harassment.trim() : '',
      volunteer_special_skills: team === 'volunteers' ? form.volunteer_special_skills.trim() : '',
      volunteer_teamwork_conflict: team === 'volunteers' ? form.volunteer_teamwork_conflict.trim() : '',
      volunteer_emergency_reaction: team === 'volunteers' ? form.volunteer_emergency_reaction.trim() : '',
      volunteer_delegate_professionalism: team === 'volunteers' ? form.volunteer_delegate_professionalism.trim() : '',
      age_confirmed: true,
      consent_version: settings.legal_version || '2026-10-17',
    };

    let submissionSuccess = false;

    if (supabase) {
      // 1. Attempt insert with all dedicated columns
      let { error } = await supabase.from('team_registrations').insert(fullPayload);

      // If Supabase reports a missing column or schema cache error, gracefully retry with standard columns
      // while retaining all 4 answers in the formatted statement.
      if (error) {
        const isColumnSchemaError =
          error.code === 'PGRST204' ||
          error.code === '42703' ||
          /could not find the '(security|volunteer)_.*' column/i.test(error.message || '') ||
          /column "(security|volunteer)_.*" of relation .* does not exist/i.test(error.message || '') ||
          /permission denied for column '(security|volunteer)_.*'/i.test(error.message || '');

        if (isColumnSchemaError) {
          const fallbackPayload = {
            full_name: name,
            email,
            phone: form.phone.trim(),
            institution: inst,
            team,
            section: form.section,
            experience: form.experience.trim(),
            statement: formattedStatement,
            age_confirmed: true,
            consent_version: settings.legal_version || '2026-10-17',
          };
          const retry = await supabase.from('team_registrations').insert(fallbackPayload);
          error = retry.error;
        }
      }

      if (!error) {
        submissionSuccess = true;
      } else {
        console.warn('[Team Registration Supabase Insert Warning]:', error);
        if (error.message?.includes('team_registration_closed')) {
          setSubmitError(`Registration for the ${team.toUpperCase()} team has been closed.`);
          setBusy(false);
          return;
        } else if (error.code === '23505') {
          setSubmitError(`This email address has already submitted an application for the ${team.toUpperCase()} team.`);
          setBusy(false);
          return;
        } else if (error.message?.includes('rate_limited')) {
          setSubmitError('High registration volume detected. Please wait a moment and try again.');
          setBusy(false);
          return;
        } else if (error.message?.includes('security_emergency_steps_min_words_80')) {
          setSubmitError('Emergency Problem-Solving response requires at least 80 words.');
          setBusy(false);
          return;
        } else if (error.message?.includes('security_teamwork_min_words_50')) {
          setSubmitError('Teamwork and Communication response requires at least 50 words.');
          setBusy(false);
          return;
        } else if (error.message?.includes('security_motivation_min_words_50')) {
          setSubmitError('Motivation response requires at least 50 words.');
          setBusy(false);
          return;
        } else if (error.message?.includes('security_handling_harassment_min_words_50')) {
          setSubmitError('Handling Bullying and Harassment response requires at least 50 words.');
          setBusy(false);
          return;
        } else if (error.message?.includes('volunteer_special_skills_required')) {
          setSubmitError('Special skills response is required.');
          setBusy(false);
          return;
        } else if (error.message?.includes('volunteer_teamwork_conflict_required')) {
          setSubmitError('Teamwork & accountability response is required.');
          setBusy(false);
          return;
        } else if (error.message?.includes('volunteer_emergency_reaction_required')) {
          setSubmitError('Emergency reaction response is required.');
          setBusy(false);
          return;
        } else if (error.message?.includes('volunteer_delegate_professionalism_required')) {
          setSubmitError('Professionalism response is required.');
          setBusy(false);
          return;
        }
      }
    }

    if (!submissionSuccess) {
      // Fallback via server endpoint
      try {
        const res = await fetch('/api/team-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullPayload),
        });
        const resData = await res.json().catch(() => ({}));
        if (res.ok && resData.success) {
          submissionSuccess = true;
        } else {
          setSubmitError(resData.error || 'Could not submit application. Please verify your details and try again.');
        }
      } catch {
        if (!supabase) {
          setSubmitError('Team registration is unavailable at this moment. Please reach out via the contact form.');
        } else {
          setSubmitError('Could not submit application. Please verify your connection and try again.');
        }
      }
    }

    setBusy(false);

    if (submissionSuccess) {
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
      <div className="relative w-full max-w-2xl my-8 bg-[#0e0e12] border border-[#d4af37]/40 rounded-sm p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
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
              Your application for the <strong className="text-[#d4af37] capitalize">{team}</strong> team has been securely recorded. The Secretariat and Department Head will review your credentials and contact you at <span className="font-mono text-white">{form.email}</span>.
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
              <div className="p-3 bg-red-950/40 border border-red-500/40 text-red-300 text-xs rounded-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{submitError}</span>
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
                placeholder="Past MUN conferences, security/protocol roles, first-aid certificates, etc."
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
              />
            </div>

            {/* Media Team: Standard Statement of Motivation */}
            {team !== 'security' && team !== 'volunteers' && (
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
            )}

            {/* SECURITY TEAM ONLY: The 4 Required Long-Answer Scenario Questions */}
            {team === 'security' && (
              <div className="space-y-5 pt-3 border-t border-[#d4af37]/30">
                <div className="rounded-sm border border-[#d4af37]/35 bg-[#14120a] p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-[#d4af37]" />
                    <span className="text-xs font-serif font-semibold text-white tracking-wide">
                      Security Team Assessment (4 Required Long-Answer Questions)
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 font-light leading-relaxed">
                    Security officers are responsible for delegate safety, floor protocol, and committee decorum. All four scenario questions below are required and subject to minimum word counts enforced on submission.
                  </p>
                </div>

                {SECURITY_QUESTIONS.map((q, idx) => {
                  const currentWords = countWords(form[q.key as keyof typeof form] as string);
                  const meetsMin = currentWords >= q.minWords;
                  const feedback = getWordCountFeedback(currentWords, q.minWords);
                  const hasError = Boolean(errors[q.key]);

                  return (
                    <div key={q.key} className="space-y-1.5 bg-[#101014] p-3.5 rounded-sm border border-neutral-800/90">
                      <div className="flex items-start justify-between gap-2">
                        <label className="text-xs font-medium text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] text-[10.5px] font-mono flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-serif text-[12.5px] text-neutral-100">{q.title} *</span>
                        </label>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border shrink-0 transition-colors ${
                            meetsMin
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 font-semibold'
                              : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                          }`}
                        >
                          {feedback}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-neutral-300 font-light leading-relaxed italic bg-black/40 p-2.5 rounded-sm border border-neutral-800">
                        "{q.prompt}"
                      </p>

                      <textarea
                        rows={4}
                        required
                        disabled={!currentlyOpen || busy}
                        className={`${inputCls} font-normal leading-relaxed text-[11.5px] ${
                          hasError ? 'border-red-500/80 focus:border-red-400' : ''
                        }`}
                        placeholder={`Provide your detailed answer here (minimum ${q.minWords} words)...`}
                        value={(form[q.key as keyof typeof form] as string) || ''}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setForm({ ...form, [q.key]: nextVal });
                          if (errors[q.key]) {
                            const newWords = countWords(nextVal);
                            if (newWords >= q.minWords) {
                              const nextErrs = { ...errors };
                              delete nextErrs[q.key];
                              setErrors(nextErrs);
                            }
                          }
                        }}
                      />

                      {errors[q.key] && (
                        <p className="text-[11px] text-red-400 font-medium flex items-center gap-1.5 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors[q.key]}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* VOLUNTEER TEAM ONLY: The 4 Required Assessment Questions */}
            {team === 'volunteers' && (
              <div className="space-y-5 pt-3 border-t border-[#d4af37]/30">
                <div className="rounded-sm border border-[#d4af37]/35 bg-[#14120a] p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <HeartHandshake className="w-4 h-4 text-[#d4af37]" />
                    <span className="text-xs font-serif font-semibold text-white tracking-wide">
                      Volunteers Team Assessment (4 Required Questions)
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 font-light leading-relaxed">
                    Volunteers provide operational excellence and diplomatic support across all conference chambers, ceremonies, and logistics. All four questions below are required.
                  </p>
                </div>

                {VOLUNTEER_QUESTIONS.map((q, idx) => {
                  const currentWords = countWords(form[q.key as keyof typeof form] as string);
                  const meetsMin = currentWords >= 1;
                  const feedback = getVolunteerWordCountFeedback(currentWords);
                  const hasError = Boolean(errors[q.key]);

                  return (
                    <div key={q.key} className="space-y-1.5 bg-[#101014] p-3.5 rounded-sm border border-neutral-800/90">
                      <div className="flex items-start justify-between gap-2">
                        <label className="text-xs font-medium text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] text-[10.5px] font-mono flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-serif text-[12.5px] text-neutral-100">{q.title} *</span>
                        </label>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border shrink-0 transition-colors ${
                            meetsMin
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 font-semibold'
                              : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                          }`}
                        >
                          {feedback}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-neutral-300 font-light leading-relaxed italic bg-black/40 p-2.5 rounded-sm border border-neutral-800">
                        "{q.prompt}"
                      </p>

                      <textarea
                        rows={3}
                        required
                        disabled={!currentlyOpen || busy}
                        className={`${inputCls} font-normal leading-relaxed text-[11.5px] ${
                          hasError ? 'border-red-500/80 focus:border-red-400' : ''
                        }`}
                        placeholder="Provide your detailed answer here..."
                        value={(form[q.key as keyof typeof form] as string) || ''}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setForm({ ...form, [q.key]: nextVal });
                          if (errors[q.key]) {
                            const newWords = countWords(nextVal);
                            if (newWords >= 1) {
                              const nextErrs = { ...errors };
                              delete nextErrs[q.key];
                              setErrors(nextErrs);
                            }
                          }
                        }}
                      />

                      {errors[q.key] && (
                        <p className="text-[11px] text-red-400 font-medium flex items-center gap-1.5 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors[q.key]}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}


            {/* MEDIA TEAM ONLY: Required application questions */}
            {team === 'media' && (
              <div className="space-y-5 pt-3 border-t border-[#d4af37]/30">
                <div className="rounded-sm border border-[#d4af37]/35 bg-[#14120a] p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Camera className="w-4 h-4 text-[#d4af37]" />
                    <span className="text-xs font-serif font-semibold text-white tracking-wide">
                      Media Department Application (5 Questions)
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 font-light leading-relaxed">
                    Please answer the questions below and share a link to your best creative work. GitHub, Google Drive, Behance, and personal websites are accepted.
                  </p>
                </div>
                {([
                  {
                    key: 'media_motivation',
                    title: "What motivates you to apply for the WESTMUN Media Department, and how do you plan to contribute to the visual identity and coverage of next year’s conference?",
                    value: form.media_motivation,
                    placeholder: 'Explain your motivation and how you would contribute...',
                    rows: 4,
                  },
                  {
                    key: 'media_capture_strategy',
                    title: 'MUN conferences are fast-paced and dynamic. What strategies or techniques will you use to reliably capture key moments, intense debates, and delegate interactions in real time?',
                    value: form.media_capture_strategy,
                    placeholder: 'Describe your approach to planning, timing, and capturing moments...',
                    rows: 4,
                  },
                  {
                    key: 'media_unique_skills',
                    title: 'What unique skills, creative strengths, or prior experience set you apart from other applicants for this role?',
                    value: form.media_unique_skills,
                    placeholder: 'Describe your skills, strengths, and relevant experience...',
                    rows: 3,
                  },
                  {
                    key: 'media_equipment',
                    title: 'Do you have personal media equipment (e.g., DSLR/mirrorless camera, lenses, gimbal, editing software)? If yes, please specify your current setup.',
                    value: form.media_equipment,
                    placeholder: 'List your equipment and software, or write “None currently”.',
                    rows: 3,
                    optional: true,
                  },
                  {
                    key: 'media_portfolio',
                    title: 'Please provide a link to your best photography, videography, or design work. GitHub, Google Drive, Behance, personal websites, or other online portfolios are accepted.',
                    value: form.media_portfolio,
                    placeholder: 'https://...',
                    rows: 2,
                  },
                ] as const).map((q, idx) => (
                  <div key={q.key} className="space-y-1.5 bg-[#101014] p-3.5 rounded-sm border border-neutral-800/90">
                    <label className="text-xs font-medium text-white flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] text-[10.5px] font-mono flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-serif text-[12.5px] text-neutral-100">
                        {q.title}{'optional' in q && q.optional ? ' (Optional)' : ' *'}
                      </span>
                    </label>
                    <textarea
                      rows={q.rows}
                      required={!('optional' in q && q.optional)}
                      disabled={!currentlyOpen || busy}
                      className={`${inputCls} font-normal leading-relaxed text-[11.5px] ${errors[q.key] ? 'border-red-500/80 focus:border-red-400' : ''}`}
                      placeholder={q.placeholder}
                      value={q.value}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        setForm((prev) => ({ ...prev, [q.key]: nextVal }));
                        if (errors[q.key]) setErrors((prev) => {
                          const next = { ...prev };
                          delete next[q.key];
                          return next;
                        });
                      }}
                    />
                    {q.key === 'media_portfolio' && (
                      <p className="text-[10.5px] text-neutral-500">Paste a shareable link. Make sure reviewers have permission to open it.</p>
                    )}
                    {errors[q.key] && <p className="text-[11px] text-red-400 mt-1">{errors[q.key]}</p>}
                  </div>
                ))}
              </div>
            )}

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
                disabled={!currentlyOpen || busy || (team === 'security' && !securityValidation.valid)}
                className="px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all inline-flex items-center gap-2"
                title={team === 'security' && !securityValidation.valid ? 'Please satisfy all 4 minimum word count requirements before submitting' : undefined}
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
