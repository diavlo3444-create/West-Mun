import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Loader2,
  CheckCircle2,
  Shield,
  Camera,
  HeartHandshake,
  Lock,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  User,
  GraduationCap,
  Phone,
  Heart,
  Award,
  Clock,
  Sparkles,
  FileCheck,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EMAIL_RE } from '../lib/safe';
import type { Settings } from '../lib/content';
import { ConsentCheck } from './ConsentCheck';
import {
  InternationalPhoneInput,
  type PhoneValue,
} from './InternationalPhoneInput';
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

const STORAGE_KEY = 'westmun_team_application_draft';

export const EDUCATION_LEVELS = [
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'First-Year University',
] as const;

export const GUARDIAN_RELATIONSHIPS = [
  'Father',
  'Mother',
  'Guardian',
  'Other',
] as const;

interface ApplicationFormState {
  // Step 1: Personal & Education
  fullName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  phoneFull: string;
  phoneValid: boolean;
  institution: string;
  section: 'male' | 'female';
  gender: 'male' | 'female' | '';
  dob: string;
  educationLevel: string;

  // Step 2: Emergency Contact & Availability
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianPhoneCountryCode: string;
  guardianPhoneFull: string;
  guardianPhoneValid: boolean;
  attendanceAvailability: 'yes' | 'no' | '';
  hasMedical: 'yes' | 'no' | '';
  medicalDetail: string;

  // Step 3: Experience & Department Assessment
  hasExperience: 'yes' | 'no' | '';
  experience: string;
  hasCertificates: 'yes' | 'no' | '';
  certificatesDetail: string;
  statement: string;

  // Security team 4 mandatory scenario questions
  security_emergency_steps: string;
  security_teamwork: string;
  security_motivation: string;
  security_handling_harassment: string;

  // Volunteer team 4 mandatory assessment questions
  volunteer_special_skills: string;
  volunteer_teamwork_conflict: string;
  volunteer_emergency_reaction: string;
  volunteer_delegate_professionalism: string;

  // Media team application questions
  media_motivation: string;
  media_capture_strategy: string;
  media_unique_skills: string;
  media_equipment: string;
  media_portfolio: string;

  // Step 4: Verification & Consents
  ageOk: boolean;
  consent: boolean;
  website: string; // bot honeypot
}

const INITIAL_FORM: ApplicationFormState = {
  fullName: '',
  email: '',
  phone: '',
  phoneCountryCode: 'SA',
  phoneFull: '',
  phoneValid: false,
  institution: '',
  section: 'male',
  gender: 'male',
  dob: '',
  educationLevel: '',

  guardianName: '',
  guardianRelationship: '',
  guardianPhone: '',
  guardianPhoneCountryCode: 'SA',
  guardianPhoneFull: '',
  guardianPhoneValid: false,
  attendanceAvailability: 'yes',
  hasMedical: 'no',
  medicalDetail: '',

  hasExperience: 'no',
  experience: '',
  hasCertificates: 'no',
  certificatesDetail: '',
  statement: '',

  security_emergency_steps: '',
  security_teamwork: '',
  security_motivation: '',
  security_handling_harassment: '',

  volunteer_special_skills: '',
  volunteer_teamwork_conflict: '',
  volunteer_emergency_reaction: '',
  volunteer_delegate_professionalism: '',

  media_motivation: '',
  media_capture_strategy: '',
  media_unique_skills: '',
  media_equipment: '',
  media_portfolio: '',

  ageOk: false,
  consent: false,
  website: '',
};

export const TeamRegistrationModal: React.FC<TeamRegistrationModalProps> = ({
  settings,
  onClose,
  defaultTeam = 'security',
}) => {
  const [team, setTeam] = useState<'security' | 'media' | 'volunteers'>(defaultTeam);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [draftRestored, setDraftRestored] = useState<boolean>(false);

  // Initialize form state from sessionStorage if a draft exists
  const [form, setForm] = useState<ApplicationFormState>(() => {
    if (typeof window === 'undefined') return INITIAL_FORM;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_FORM, ...parsed };
      }
    } catch {}
    return INITIAL_FORM;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [extraPhotoPaths, setExtraPhotoPaths] = useState<string[]>([]);
  const [extraPhotoBusy, setExtraPhotoBusy] = useState(false);
  const [extraPhotoError, setExtraPhotoError] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Prevent background page scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  // Escape key handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Save form draft to sessionStorage automatically
  useEffect(() => {
    if (done) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {}
  }, [form, done]);

  // Check if draft was found on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setDraftRestored(true);
      }
    } catch {}
  }, []);

  // Scroll to top of modal container on step transition
  const scrollToModalTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Authoritative open check from database settings
  const isTeamOpen = (teamId: 'security' | 'media' | 'volunteers') => {
    const key = `team_${teamId}_open`;
    return (settings[key] ?? 'true').toLowerCase() === 'true';
  };

  const currentlyOpen = isTeamOpen(team);

  // Live Security validation
  const securityValidation =
    team === 'security'
      ? validateSecurityAnswers({
          security_emergency_steps: form.security_emergency_steps,
          security_teamwork: form.security_teamwork,
          security_motivation: form.security_motivation,
          security_handling_harassment: form.security_handling_harassment,
        })
      : { valid: true, errors: {}, counts: {} };

  // Live Volunteer validation
  const volunteerValidation =
    team === 'volunteers'
      ? validateVolunteerAnswers({
          volunteer_special_skills: form.volunteer_special_skills,
          volunteer_teamwork_conflict: form.volunteer_teamwork_conflict,
          volunteer_emergency_reaction: form.volunteer_emergency_reaction,
          volunteer_delegate_professionalism: form.volunteer_delegate_professionalism,
        })
      : { valid: true, errors: {}, counts: {} };

  const uploadExtraPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!supabase) {
      setExtraPhotoError('Photo uploads are unavailable right now.');
      return;
    }
    setExtraPhotoBusy(true);
    setExtraPhotoError('');
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.type)) {
          throw new Error(`${file.name}: use JPG, PNG, WEBP, or HEIC images.`);
        }
        if (file.size > 200 * 1024 * 1024) {
          throw new Error(`${file.name}: each photo must be 200 MB or smaller.`);
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'photo';
        const path = `registration-extra/${crypto.randomUUID()}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage
          .from('registration-extra')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        added.push(path);
      }
      setExtraPhotoPaths((current) => [...current, ...added]);
    } catch (error) {
      setExtraPhotoError(
        error instanceof Error ? error.message : 'One or more photos could not be uploaded.'
      );
      if (added.length) await supabase.storage.from('registration-extra').remove(added);
    } finally {
      setExtraPhotoBusy(false);
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    const name = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const inst = form.institution.trim();

    if (name.length < 2 || name.length > 100) errs.fullName = 'Please enter your full name.';
    if (!EMAIL_RE.test(email) || email.length > 120) errs.email = 'Please enter a valid email address.';
    if (!form.phone.trim() || !form.phoneValid) errs.phone = 'Please enter a valid mobile number.';
    if (!form.dob) errs.dob = 'Please select your date of birth.';
    if (!form.gender) errs.gender = 'Please select your gender.';
    if (inst.length < 2 || inst.length > 150) errs.institution = 'Please enter your school or university.';
    if (!form.educationLevel) errs.educationLevel = 'Please select your current education level.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    const gName = form.guardianName.trim();

    if (gName.length < 2 || gName.length > 100) {
      errs.guardianName = 'Please enter guardian or emergency contact full name.';
    }
    if (!form.guardianRelationship) {
      errs.guardianRelationship = 'Please select relationship to emergency contact.';
    }
    if (!form.guardianPhone.trim() || !form.guardianPhoneValid) {
      errs.guardianPhone = 'Please provide a valid emergency phone number.';
    }
    if (!form.attendanceAvailability) {
      errs.attendanceAvailability = 'Please select attendance availability.';
    }
    if (form.hasMedical === 'yes' && !form.medicalDetail.trim()) {
      errs.medicalDetail = 'Please provide brief medical accommodation details.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};

    if (form.hasExperience === 'yes' && !form.experience.trim()) {
      errs.experience = 'Please describe your relevant prior experience.';
    }
    if (form.hasCertificates === 'yes' && !form.certificatesDetail.trim()) {
      errs.certificatesDetail = 'Please list your certificates or relevant awards.';
    }

    // Security Team Scenario Questions
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

    // Media Team Application Questions
    if (team === 'media') {
      if (!form.media_motivation.trim()) {
        errs.media_motivation = 'Please answer the motivation and visual identity question.';
      }
      if (!form.media_capture_strategy.trim()) {
        errs.media_capture_strategy = 'Please answer the real-time moment capture question.';
      }
      if (!form.media_unique_skills.trim()) {
        errs.media_unique_skills = 'Please describe your unique skills and strengths.';
      }
      if (!form.media_portfolio.trim()) {
        errs.media_portfolio = 'Please provide a portfolio URL link.';
      } else {
        try {
          const url = new URL(form.media_portfolio.trim());
          if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
        } catch {
          errs.media_portfolio = 'Please provide a valid URL starting with https:// or http://.';
        }
      }
    }

    // Volunteer Team Questions
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
    return Object.keys(errs).length === 0;
  };

  // Step 4 Validation
  const validateStep4 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.ageOk) errs.ageOk = 'Please confirm that you are eligible and at least 15 years old.';
    if (!form.consent) errs.consent = 'You must review and agree to the Terms of Use and Privacy Policy.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    setSubmitError(null);
    let valid = false;
    if (currentStep === 1) valid = validateStep1();
    else if (currentStep === 2) valid = validateStep2();
    else if (currentStep === 3) valid = validateStep3();

    if (valid) {
      setCurrentStep((prev) => Math.min(4, prev + 1));
      scrollToModalTop();
    }
  };

  const prevStep = () => {
    setSubmitError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    scrollToModalTop();
  };

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    setForm(INITIAL_FORM);
    setDraftRestored(false);
    setCurrentStep(1);
    setErrors({});
  };

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!currentlyOpen) {
      setSubmitError(`Registration for ${team.toUpperCase()} is currently closed by the Secretariat.`);
      return;
    }

    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) {
      setSubmitError('Please complete all required fields across all sections before submitting.');
      return;
    }

    if (form.website) {
      setDone(true); // bot honeypot
      return;
    }

    setBusy(true);

    const name = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const inst = form.institution.trim();
    const applicantPhone = form.phoneFull || form.phone;
    const guardianPhone = form.guardianPhoneFull || form.guardianPhone;

    // Structured Candidate Dossier Text Block
    const structuredProfileBlock = [
      '=== CANDIDATE PROFILE & EMERGENCY CONTACT ===',
      `Gender: ${form.gender ? form.gender.toUpperCase() : 'Not specified'}`,
      `Date of Birth: ${form.dob || 'Not provided'}`,
      `Education Level: ${form.educationLevel || 'Not specified'}`,
      `Institution: ${inst}`,
      `Applicant Phone: ${applicantPhone}`,
      `Attendance Availability: ${form.attendanceAvailability === 'yes' ? 'Yes (Confirmed for all days)' : 'No / Restricted'}`,
      `Emergency Contact: ${form.guardianName.trim()} (${form.guardianRelationship || 'Guardian'})`,
      `Emergency Phone: ${guardianPhone}`,
      `Certificates: ${form.hasCertificates === 'yes' ? form.certificatesDetail.trim() : 'None reported'}`,
      `Medical Notes: ${form.hasMedical === 'yes' ? form.medicalDetail.trim() : 'None reported'}`,
      '==============================================',
    ].join('\n');

    // Department Specific Answers
    const departmentResponses =
      team === 'media'
        ? [
            'MEDIA DEPARTMENT APPLICATION RESPONSES',
            '',
            '1. Motivation and contribution to WEST MUN visual identity:',
            form.media_motivation.trim(),
            '',
            '2. Strategy for capturing real-time delegate interactions & key moments:',
            form.media_capture_strategy.trim(),
            '',
            '3. Unique skills, creative strengths, and prior experience:',
            form.media_unique_skills.trim(),
            '',
            '4. Personal media equipment and current setup:',
            form.media_equipment.trim() || 'None reported',
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

    // Comprehensive combined statement to guarantee zero data loss
    const fullStatement = [
      structuredProfileBlock,
      '',
      departmentResponses,
    ].join('\n');

    const statementWithExtras = extraPhotoPaths.length
      ? `${fullStatement}\n\n[EXTRA_PHOTOS]\n${extraPhotoPaths.join('\n')}\n[/EXTRA_PHOTOS]`
      : fullStatement;

    const formattedExperience = [
      form.hasExperience === 'yes' ? form.experience.trim() : 'No prior MUN experience reported',
      form.hasCertificates === 'yes' ? `Certificates: ${form.certificatesDetail.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    // Full payload attempting all columns
    const fullPayload: Record<string, any> = {
      full_name: name,
      email,
      phone: applicantPhone,
      institution: inst,
      team,
      section: form.section,
      gender: form.gender,
      dob: form.dob,
      date_of_birth: form.dob,
      education_level: form.educationLevel,
      guardian_name: form.guardianName.trim(),
      guardian_relationship: form.guardianRelationship,
      guardian_phone: guardianPhone,
      attendance_availability: form.attendanceAvailability,
      has_experience: form.hasExperience,
      experience: formattedExperience,
      has_certificates: form.hasCertificates,
      certificates_detail: form.certificatesDetail.trim(),
      has_medical: form.hasMedical,
      medical_detail: form.medicalDetail.trim(),
      statement: statementWithExtras,
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
      let { error } = await supabase.from('team_registrations').insert(fullPayload);

      // Resilient fallback if table does not have newly added or specific columns
      if (error) {
        const isColumnSchemaError =
          error.code === 'PGRST204' ||
          error.code === '42703' ||
          /could not find the '.*' column/i.test(error.message || '') ||
          /column ".*" of relation .* does not exist/i.test(error.message || '') ||
          /permission denied for column '.*'/i.test(error.message || '');

        if (isColumnSchemaError) {
          const fallbackPayload = {
            full_name: name,
            email,
            phone: applicantPhone,
            institution: inst,
            team,
            section: form.section,
            experience: formattedExperience,
            statement: statementWithExtras,
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
        console.warn('[Team Registration Supabase Warning]:', error);
        if (error.message?.includes('team_registration_closed')) {
          setSubmitError(`Registration for the ${team.toUpperCase()} team has been closed.`);
          setBusy(false);
          return;
        } else if (error.code === '23505') {
          setSubmitError(
            `This email address has already submitted an application for the ${team.toUpperCase()} team.`
          );
          setBusy(false);
          return;
        } else if (error.message?.includes('rate_limited')) {
          setSubmitError('High registration volume detected. Please wait a moment and try again.');
          setBusy(false);
          return;
        }
      }
    }

    if (!submissionSuccess) {
      // Fallback via server API
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
          setSubmitError(
            resData.error || 'Could not submit application. Please verify your details and try again.'
          );
        }
      } catch {
        if (!supabase) {
          setSubmitError(
            'Team registration is unavailable at this moment. Please reach out via the contact form.'
          );
        } else {
          setSubmitError('Could not submit application. Please verify your connection and try again.');
        }
      }
    }

    setBusy(false);

    if (submissionSuccess) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
      setDone(true);
    }
  };

  const inputCls =
    'w-full bg-[#121217] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2.5 px-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors';
  const labelCls =
    'block text-[11px] uppercase tracking-wider text-neutral-300 mb-1.5 font-medium';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-application-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl my-auto bg-[#0a0a0d] border border-[#d4af37]/40 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.9)] max-h-[92vh] flex flex-col overflow-hidden text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="shrink-0 px-6 py-4 border-b border-neutral-800/90 bg-[#0e0e13] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-[1px] bg-[#d4af37]" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#d4af37]">
                WEST MUN 2027 · Staff Recruitment
              </span>
            </div>
            <h3 id="modal-application-title" className="text-xl sm:text-2xl font-serif text-white mt-0.5">
              Conference Organizing Team
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {draftRestored && !done && (
              <button
                type="button"
                onClick={clearDraft}
                className="text-[10px] text-neutral-400 hover:text-amber-400 transition-colors uppercase tracking-wider"
                title="Discard saved draft and start fresh"
              >
                Reset Draft
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
              aria-label="Close application modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Tracker / Stepper (Shown when not done) */}
        {!done && (
          <div className="shrink-0 bg-[#121217] border-b border-neutral-800/80 px-6 py-3">
            {/* Stepper items */}
            <div className="grid grid-cols-4 gap-2 text-center mb-2">
              {[
                { step: 1, label: 'Personal & Education' },
                { step: 2, label: 'Emergency & Health' },
                { step: 3, label: 'Role Assessment' },
                { step: 4, label: 'Review & Consent' },
              ].map((s) => {
                const isActive = currentStep === s.step;
                const isPassed = currentStep > s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => {
                      if (busy) return;
                      if (s.step < currentStep) {
                        setCurrentStep(s.step);
                        scrollToModalTop();
                      } else if (s.step === currentStep + 1) {
                        nextStep();
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'text-[#d4af37]'
                        : isPassed
                        ? 'text-neutral-300 hover:text-white'
                        : 'text-neutral-500'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] font-mono flex items-center justify-center shrink-0 border ${
                        isActive
                          ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37] font-bold'
                          : isPassed
                          ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-400'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-500'
                      }`}
                    >
                      {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : s.step}
                    </span>
                    <span className="text-[11px] font-medium hidden sm:inline truncate">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Visual Gold Progress Bar */}
            <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] h-full transition-all duration-300 ease-out"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7 space-y-6 wm-scroll">
          {done ? (
            <div className="py-12 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#d4af37]">
                  Submission Confirmed
                </span>
                <h4 className="text-2xl sm:text-3xl font-serif text-white">Application Recorded</h4>
                <p className="text-xs sm:text-sm text-neutral-300 max-w-lg mx-auto font-light leading-relaxed">
                  Your formal application for the{' '}
                  <strong className="text-[#d4af37] capitalize">{team}</strong> team has been securely transmitted to the Executive Secretariat and Department Heads.
                </p>
              </div>

              <div className="p-4 bg-[#141419] border border-neutral-800 rounded-sm max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Applicant:</span>
                  <span className="text-white font-medium">{form.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Department:</span>
                  <span className="text-[#d4af37] font-semibold capitalize">{team}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Confirmation Sent To:</span>
                  <span className="font-mono text-white">{form.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Section:</span>
                  <span className="capitalize text-neutral-300">{form.section} Section</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 text-xs font-semibold uppercase tracking-widest text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 transition-all cursor-pointer shadow-lg"
                >
                  Done & Return to Conference
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submitApplication} className="space-y-6">
              {/* Department Tabs (Always visible at top of form) */}
              <div>
                <label className={labelCls}>Target Department / Team *</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'security', label: 'Security & Protocol', icon: Shield },
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
                        className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#d4af37] bg-[#1a1914] shadow-[0_0_15px_rgba(212,175,55,0.12)]'
                            : 'border-neutral-800 bg-[#121217] hover:border-neutral-700'
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

              {/* Department Closed Warning */}
              {!currentlyOpen && (
                <div className="p-3.5 bg-neutral-900/90 border border-neutral-700 rounded-sm text-xs text-neutral-300 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold">
                      Admissions for {team.toUpperCase()} are Currently Closed
                    </strong>
                    <p className="text-neutral-400 font-light mt-0.5">
                      The Secretariat has filled current recruitment quotas for this department. You may select another team or check back later.
                    </p>
                  </div>
                </div>
              )}

              {/* Submission Error Banner */}
              {submitError && (
                <div className="p-3.5 bg-red-950/40 border border-red-500/40 text-red-300 text-xs rounded-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Honeypot field for bot deterrence */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />

              {/* ========================================================
                  STEP 1: PERSONAL & EDUCATION
                 ======================================================== */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="border-b border-neutral-800 pb-2">
                    <h4 className="text-sm font-serif text-white font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-[#d4af37]" />
                      <span>1. Applicant Personal & Education Details</span>
                    </h4>
                    <p className="text-[11px] text-neutral-400 font-light">
                      Provide your official identification and contact information.
                    </p>
                  </div>

                  {/* Section & Gender Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Applicant Division / Section */}
                    <div>
                      <label className={labelCls}>Applicant Division / Section *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, section: 'male' })}
                          className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                            form.section === 'male'
                              ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                              : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          Male Section
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, section: 'female' })}
                          className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                            form.section === 'female'
                              ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                              : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          Female Section
                        </button>
                      </div>
                    </div>

                    {/* Gender Selection */}
                    <div>
                      <label className={labelCls}>Gender *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ ...form, gender: 'male', section: 'male' });
                            if (errors.gender) {
                              const err = { ...errors };
                              delete err.gender;
                              setErrors(err);
                            }
                          }}
                          className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                            form.gender === 'male'
                              ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                              : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          Male
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ ...form, gender: 'female', section: 'female' });
                            if (errors.gender) {
                              const err = { ...errors };
                              delete err.gender;
                              setErrors(err);
                            }
                          }}
                          className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                            form.gender === 'female'
                              ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                              : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          Female
                        </button>
                      </div>
                      {errors.gender && <p className="text-[11px] text-red-400 mt-1">{errors.gender}</p>}
                    </div>
                  </div>

                  {/* Full Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Full Name *</label>
                      <input
                        type="text"
                        required
                        className={inputCls}
                        placeholder="e.g. Yousef Al-Mansoor"
                        value={form.fullName}
                        onChange={(e) => {
                          setForm({ ...form, fullName: e.target.value });
                          if (errors.fullName) {
                            const err = { ...errors };
                            delete err.fullName;
                            setErrors(err);
                          }
                        }}
                      />
                      {errors.fullName && <p className="text-[11px] text-red-400 mt-1">{errors.fullName}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>Email Address *</label>
                      <input
                        type="email"
                        required
                        className={inputCls}
                        placeholder="applicant@school.edu"
                        value={form.email}
                        onChange={(e) => {
                          setForm({ ...form, email: e.target.value });
                          if (errors.email) {
                            const err = { ...errors };
                            delete err.email;
                            setErrors(err);
                          }
                        }}
                      />
                      {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  {/* Applicant Phone (International Phone Input) */}
                  <div>
                    <label className={labelCls}>Applicant Mobile Phone Number *</label>
                    <InternationalPhoneInput
                      id="applicant-phone"
                      initialCountry={form.phoneCountryCode as any || 'SA'}
                      value={form.phone}
                      onChange={(pv: PhoneValue) => {
                        setForm((prev) => ({
                          ...prev,
                          phone: pv.nationalNumber,
                          phoneCountryCode: pv.countryCode,
                          phoneFull: pv.fullNumber,
                          phoneValid: pv.isValid,
                        }));
                        if (errors.phone && pv.isValid) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.phone;
                            return next;
                          });
                        }
                      }}
                      error={errors.phone}
                      hint="Search your country calling code. Saudi Arabia (+966) is default."
                    />
                  </div>

                  {/* Date of Birth & Education Level */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Date of Birth *</label>
                      <div className="relative">
                        <input
                          type="date"
                          required
                          min="1990-01-01"
                          max="2013-12-31"
                          className={`${inputCls} [color-scheme:dark]`}
                          value={form.dob}
                          onChange={(e) => {
                            setForm({ ...form, dob: e.target.value });
                            if (errors.dob) {
                              const err = { ...errors };
                              delete err.dob;
                              setErrors(err);
                            }
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        Applicants must be between 14 and 25 years old.
                      </p>
                      {errors.dob && <p className="text-[11px] text-red-400 mt-1">{errors.dob}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>Current Education Level *</label>
                      <select
                        required
                        className={`${inputCls} bg-[#121217] cursor-pointer`}
                        value={form.educationLevel}
                        onChange={(e) => {
                          setForm({ ...form, educationLevel: e.target.value });
                          if (errors.educationLevel) {
                            const err = { ...errors };
                            delete err.educationLevel;
                            setErrors(err);
                          }
                        }}
                      >
                        <option value="">Select current grade or stage...</option>
                        {EDUCATION_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                      {errors.educationLevel && (
                        <p className="text-[11px] text-red-400 mt-1">{errors.educationLevel}</p>
                      )}
                    </div>
                  </div>

                  {/* School / Institution */}
                  <div>
                    <label className={labelCls}>School or University / Organisation *</label>
                    <input
                      type="text"
                      required
                      className={inputCls}
                      placeholder="e.g. King Fahd University, Riyadh International School"
                      value={form.institution}
                      onChange={(e) => {
                        setForm({ ...form, institution: e.target.value });
                        if (errors.institution) {
                          const err = { ...errors };
                          delete err.institution;
                          setErrors(err);
                        }
                      }}
                    />
                    {errors.institution && <p className="text-[11px] text-red-400 mt-1">{errors.institution}</p>}
                  </div>
                </div>
              )}

              {/* ========================================================
                  STEP 2: EMERGENCY CONTACT & AVAILABILITY
                 ======================================================== */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="border-b border-neutral-800 pb-2">
                    <h4 className="text-sm font-serif text-white font-medium flex items-center gap-2">
                      <Heart className="w-4 h-4 text-[#d4af37]" />
                      <span>2. Guardian Contact & Availability</span>
                    </h4>
                    <p className="text-[11px] text-neutral-400 font-light">
                      Required for delegate safety, parental consent verification, and conference attendance planning.
                    </p>
                  </div>

                  {/* Guardian Name & Relationship */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Guardian / Emergency Contact Name *</label>
                      <input
                        type="text"
                        required
                        className={inputCls}
                        placeholder="e.g. Mansoor Al-Mansoor"
                        value={form.guardianName}
                        onChange={(e) => {
                          setForm({ ...form, guardianName: e.target.value });
                          if (errors.guardianName) {
                            const err = { ...errors };
                            delete err.guardianName;
                            setErrors(err);
                          }
                        }}
                      />
                      {errors.guardianName && (
                        <p className="text-[11px] text-red-400 mt-1">{errors.guardianName}</p>
                      )}
                    </div>

                    <div>
                      <label className={labelCls}>Relationship to Guardian *</label>
                      <select
                        required
                        className={`${inputCls} bg-[#121217] cursor-pointer`}
                        value={form.guardianRelationship}
                        onChange={(e) => {
                          setForm({ ...form, guardianRelationship: e.target.value });
                          if (errors.guardianRelationship) {
                            const err = { ...errors };
                            delete err.guardianRelationship;
                            setErrors(err);
                          }
                        }}
                      >
                        <option value="">Select relationship...</option>
                        {GUARDIAN_RELATIONSHIPS.map((rel) => (
                          <option key={rel} value={rel}>
                            {rel}
                          </option>
                        ))}
                      </select>
                      {errors.guardianRelationship && (
                        <p className="text-[11px] text-red-400 mt-1">{errors.guardianRelationship}</p>
                      )}
                    </div>
                  </div>

                  {/* Guardian International Phone */}
                  <div>
                    <label className={labelCls}>Guardian / Emergency Contact Phone *</label>
                    <InternationalPhoneInput
                      id="guardian-phone"
                      initialCountry={form.guardianPhoneCountryCode as any || 'SA'}
                      value={form.guardianPhone}
                      onChange={(pv: PhoneValue) => {
                        setForm((prev) => ({
                          ...prev,
                          guardianPhone: pv.nationalNumber,
                          guardianPhoneCountryCode: pv.countryCode,
                          guardianPhoneFull: pv.fullNumber,
                          guardianPhoneValid: pv.isValid,
                        }));
                        if (errors.guardianPhone && pv.isValid) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.guardianPhone;
                            return next;
                          });
                        }
                      }}
                      error={errors.guardianPhone}
                      hint="Search country calling code. Must be reachable during conference hours."
                    />
                  </div>

                  {/* Attendance Availability (Yes/No Selection) */}
                  <div className="pt-2 border-t border-neutral-800">
                    <label className={labelCls}>
                      Attendance Availability: Can you attend all conference days and briefing sessions? *
                    </label>
                    <div className="grid grid-cols-2 gap-3 mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, attendanceAvailability: 'yes' });
                          if (errors.attendanceAvailability) {
                            const err = { ...errors };
                            delete err.attendanceAvailability;
                            setErrors(err);
                          }
                        }}
                        className={`p-3 rounded-sm border text-left transition-colors cursor-pointer flex items-center justify-between ${
                          form.attendanceAvailability === 'yes'
                            ? 'bg-[#1a1710] border-[#d4af37] text-white'
                            : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <div>
                          <strong className="block text-xs">Yes, Fully Available</strong>
                          <span className="text-[10px] text-neutral-400">Available all sessions & briefings</span>
                        </div>
                        {form.attendanceAvailability === 'yes' && (
                          <Check className="w-4 h-4 text-[#d4af37]" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, attendanceAvailability: 'no' });
                          if (errors.attendanceAvailability) {
                            const err = { ...errors };
                            delete err.attendanceAvailability;
                            setErrors(err);
                          }
                        }}
                        className={`p-3 rounded-sm border text-left transition-colors cursor-pointer flex items-center justify-between ${
                          form.attendanceAvailability === 'no'
                            ? 'bg-[#1a1710] border-[#d4af37] text-white'
                            : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <div>
                          <strong className="block text-xs">No / Partial Availability</strong>
                          <span className="text-[10px] text-neutral-400">May have schedule conflicts</span>
                        </div>
                        {form.attendanceAvailability === 'no' && (
                          <Check className="w-4 h-4 text-[#d4af37]" />
                        )}
                      </button>
                    </div>
                    {errors.attendanceAvailability && (
                      <p className="text-[11px] text-red-400 mt-1">{errors.attendanceAvailability}</p>
                    )}
                  </div>

                  {/* Medical Concerns / Special Conditions (Yes/No Selection) */}
                  <div className="pt-2 border-t border-neutral-800">
                    <label className={labelCls}>
                      Medical Concerns: Do you have any medical conditions, chronic allergies, or physical restrictions? *
                    </label>
                    <div className="grid grid-cols-2 gap-3 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, hasMedical: 'no', medicalDetail: '' })}
                        className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                          form.hasMedical === 'no'
                            ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                            : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        No Medical Concerns
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, hasMedical: 'yes' })}
                        className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                          form.hasMedical === 'yes'
                            ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                            : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        Yes, I Have Details to Report
                      </button>
                    </div>

                    {form.hasMedical === 'yes' && (
                      <div className="mt-3">
                        <label className="block text-[11px] text-neutral-300 mb-1">
                          Please describe medical concern or required accommodations:
                        </label>
                        <textarea
                          rows={2}
                          className={inputCls}
                          placeholder="Allergies, asthma, dietary, mobility assistance, etc."
                          value={form.medicalDetail}
                          onChange={(e) => {
                            setForm({ ...form, medicalDetail: e.target.value });
                            if (errors.medicalDetail) {
                              const err = { ...errors };
                              delete err.medicalDetail;
                              setErrors(err);
                            }
                          }}
                        />
                        {errors.medicalDetail && (
                          <p className="text-[11px] text-red-400 mt-1">{errors.medicalDetail}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================
                  STEP 3: EXPERIENCE & DEPARTMENT ASSESSMENT
                 ======================================================== */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="border-b border-neutral-800 pb-2">
                    <h4 className="text-sm font-serif text-white font-medium flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-[#d4af37]" />
                      <span>3. Experience, Certificates & Department Assessment</span>
                    </h4>
                    <p className="text-[11px] text-neutral-400 font-light">
                      Complete your qualification profile and department-specific questionnaire.
                    </p>
                  </div>

                  {/* Previous Experience Selection */}
                  <div className="space-y-2">
                    <label className={labelCls}>Previous Experience: Have you attended or staffed MUN conferences or major events before? *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, hasExperience: 'yes' })}
                        className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                          form.hasExperience === 'yes'
                            ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                            : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        Yes, I Have Experience
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, hasExperience: 'no', experience: '' })}
                        className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                          form.hasExperience === 'no'
                            ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                            : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        No Prior Experience
                      </button>
                    </div>

                    {form.hasExperience === 'yes' && (
                      <div className="mt-2">
                        <label className="block text-[11px] text-neutral-300 mb-1">
                          Please describe your previous conferences, roles, or relevant responsibilities:
                        </label>
                        <textarea
                          rows={2}
                          className={inputCls}
                          placeholder="Past conferences, security/protocol duties, photography gigs, volunteer tasks..."
                          value={form.experience}
                          onChange={(e) => {
                            setForm({ ...form, experience: e.target.value });
                            if (errors.experience) {
                              const err = { ...errors };
                              delete err.experience;
                              setErrors(err);
                            }
                          }}
                        />
                        {errors.experience && (
                          <p className="text-[11px] text-red-400 mt-1">{errors.experience}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Certificates Selection */}
                  <div className="space-y-2 pt-2 border-t border-neutral-800">
                    <label className={labelCls}>Certificates: Do you hold any formal certificates or awards? (First-aid, CPR, MUN awards, Photography/Media certifications, etc.) *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, hasCertificates: 'yes' })}
                        className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                          form.hasCertificates === 'yes'
                            ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                            : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        Yes, I Have Certificates
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, hasCertificates: 'no', certificatesDetail: '' })}
                        className={`py-2 px-3 text-xs font-mono uppercase rounded-sm border transition-colors cursor-pointer text-center ${
                          form.hasCertificates === 'no'
                            ? 'bg-[#1a1710] border-[#d4af37] text-[#d4af37] font-semibold'
                            : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        No Certificates
                      </button>
                    </div>

                    {form.hasCertificates === 'yes' && (
                      <div className="mt-2">
                        <label className="block text-[11px] text-neutral-300 mb-1">
                          List your certificates and issuing organizations:
                        </label>
                        <input
                          type="text"
                          className={inputCls}
                          placeholder="e.g. Red Crescent First Aid, Best Delegate award, Adobe Certified"
                          value={form.certificatesDetail}
                          onChange={(e) => {
                            setForm({ ...form, certificatesDetail: e.target.value });
                            if (errors.certificatesDetail) {
                              const err = { ...errors };
                              delete err.certificatesDetail;
                              setErrors(err);
                            }
                          }}
                        />
                        {errors.certificatesDetail && (
                          <p className="text-[11px] text-red-400 mt-1">{errors.certificatesDetail}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Extra Photos Upload (Preserved) */}
                  <div className="border border-neutral-800 rounded-sm p-4 bg-black/30 space-y-2">
                    <label className={labelCls}>Extra — Photos of Past Experiences (Optional)</label>
                    <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                      Upload photos from previous events, volunteering, or relevant projects. JPG, PNG, WEBP, or HEIC (max 200 MB per photo).
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      multiple
                      disabled={extraPhotoBusy}
                      onChange={(e) => {
                        void uploadExtraPhotos(e.currentTarget.files);
                        e.currentTarget.value = '';
                      }}
                      className="block w-full text-xs text-neutral-300 file:mr-3 file:rounded-sm file:border-0 file:bg-[#d4af37] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black hover:file:bg-[#e8c85a] disabled:opacity-50"
                      aria-label="Upload photos of past experiences"
                    />
                    {extraPhotoBusy && <p className="text-xs text-[#d4af37]">Uploading photos…</p>}
                    {extraPhotoPaths.length > 0 && (
                      <p className="text-xs text-emerald-400 font-medium">
                        ✓ {extraPhotoPaths.length} photo(s) attached to your application dossier.
                      </p>
                    )}
                    {extraPhotoError && <p className="text-xs text-red-400">{extraPhotoError}</p>}
                  </div>

                  {/* SECURITY TEAM QUESTIONS (ALL 4 MANDATORY SCENARIO QUESTIONS WITH LIVE WORD COUNTERS) */}
                  {team === 'security' && (
                    <div className="space-y-4 pt-3 border-t border-[#d4af37]/30">
                      <div className="rounded-sm border border-[#d4af37]/35 bg-[#14120a] p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-4 h-4 text-[#d4af37]" />
                          <span className="text-xs font-serif font-semibold text-white tracking-wide">
                            Security Team Assessment (4 Required Long-Answer Questions)
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300 font-light leading-relaxed">
                          Security officers protect delegate safety and committee decorum. All four questions below require thoughtful, detailed answers meeting the word count minimums.
                        </p>
                      </div>

                      {SECURITY_QUESTIONS.map((q, idx) => {
                        const currentWords = countWords(form[q.key as keyof typeof form] as string);
                        const meetsMin = currentWords >= q.minWords;
                        const feedback = getWordCountFeedback(currentWords, q.minWords);
                        const hasError = Boolean(errors[q.key]);

                        return (
                          <div key={q.key} className="space-y-1.5 bg-[#101014] p-3.5 rounded-sm border border-neutral-800">
                            <div className="flex items-start justify-between gap-2">
                              <label className="text-xs font-medium text-white flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] text-[10.5px] font-mono flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-serif text-[12px] text-neutral-100">{q.title} *</span>
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

                            <p className="text-[11px] text-neutral-300 font-light leading-relaxed italic bg-black/40 p-2.5 rounded-sm border border-neutral-800/80">
                              "{q.prompt}"
                            </p>

                            <textarea
                              rows={4}
                              required
                              className={`${inputCls} font-normal leading-relaxed text-[11.5px] ${
                                hasError ? 'border-red-500/80 focus:border-red-400' : ''
                              }`}
                              placeholder={`Provide your answer here (minimum ${q.minWords} words)...`}
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

                  {/* MEDIA TEAM QUESTIONS (ALL 5 QUESTIONS PRESERVED) */}
                  {team === 'media' && (
                    <div className="space-y-4 pt-3 border-t border-[#d4af37]/30">
                      <div className="rounded-sm border border-[#d4af37]/35 bg-[#14120a] p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <Camera className="w-4 h-4 text-[#d4af37]" />
                          <span className="text-xs font-serif font-semibold text-white tracking-wide">
                            Media Department Application (5 Questions)
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300 font-light leading-relaxed">
                          Please answer each prompt and provide a valid link to your photography, videography, or design portfolio.
                        </p>
                      </div>

                      {[
                        {
                          key: 'media_motivation',
                          title: 'What motivates you to apply for the WESTMUN Media Department, and how do you plan to contribute to the visual identity and coverage of next year’s conference? *',
                          placeholder: 'Explain your motivation and artistic/editorial contribution...',
                          rows: 3,
                        },
                        {
                          key: 'media_capture_strategy',
                          title: 'MUN conferences are fast-paced and dynamic. What strategies or techniques will you use to reliably capture key moments, intense debates, and delegate interactions in real time? *',
                          placeholder: 'Describe your preparation, timing, and capture workflow...',
                          rows: 3,
                        },
                        {
                          key: 'media_unique_skills',
                          title: 'What unique skills, creative strengths, or prior experience set you apart from other applicants for this role? *',
                          placeholder: 'Photography style, editing tools, storytelling capabilities...',
                          rows: 3,
                        },
                        {
                          key: 'media_equipment',
                          title: 'Do you have personal media equipment (e.g., DSLR/mirrorless camera, lenses, gimbal, editing software)? If yes, please specify your current setup. (Optional)',
                          placeholder: 'List your camera bodies, lenses, or write "None currently"...',
                          rows: 2,
                          optional: true,
                        },
                        {
                          key: 'media_portfolio',
                          title: 'Please provide a link to your best photography, videography, or design work. Google Drive, Behance, GitHub, or personal portfolio. *',
                          placeholder: 'https://...',
                          rows: 1,
                        },
                      ].map((q, idx) => (
                        <div key={q.key} className="space-y-1.5 bg-[#101014] p-3.5 rounded-sm border border-neutral-800">
                          <label className="text-xs font-medium text-white flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] text-[10.5px] font-mono flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-serif text-[12px] text-neutral-100">{q.title}</span>
                          </label>

                          {q.rows === 1 ? (
                            <input
                              type="url"
                              required={!q.optional}
                              className={`${inputCls} ${errors[q.key] ? 'border-red-500/80' : ''}`}
                              placeholder={q.placeholder}
                              value={(form[q.key as keyof typeof form] as string) || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm((prev) => ({ ...prev, [q.key]: val }));
                                if (errors[q.key]) {
                                  const next = { ...errors };
                                  delete next[q.key];
                                  setErrors(next);
                                }
                              }}
                            />
                          ) : (
                            <textarea
                              rows={q.rows}
                              required={!q.optional}
                              className={`${inputCls} font-normal leading-relaxed text-[11.5px] ${
                                errors[q.key] ? 'border-red-500/80' : ''
                              }`}
                              placeholder={q.placeholder}
                              value={(form[q.key as keyof typeof form] as string) || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm((prev) => ({ ...prev, [q.key]: val }));
                                if (errors[q.key]) {
                                  const next = { ...errors };
                                  delete next[q.key];
                                  setErrors(next);
                                }
                              }}
                            />
                          )}

                          {errors[q.key] && (
                            <p className="text-[11px] text-red-400 mt-1">{errors[q.key]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* VOLUNTEER TEAM QUESTIONS (ALL 4 ASSESSMENT QUESTIONS PRESERVED) */}
                  {team === 'volunteers' && (
                    <div className="space-y-4 pt-3 border-t border-[#d4af37]/30">
                      <div className="rounded-sm border border-[#d4af37]/35 bg-[#14120a] p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <HeartHandshake className="w-4 h-4 text-[#d4af37]" />
                          <span className="text-xs font-serif font-semibold text-white tracking-wide">
                            Volunteers Team Assessment (4 Required Questions)
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300 font-light leading-relaxed">
                          Volunteers represent the backbone of conference chambers and ceremonies. Please answer all four questions thoroughly.
                        </p>
                      </div>

                      {VOLUNTEER_QUESTIONS.map((q, idx) => {
                        const currentWords = countWords(form[q.key as keyof typeof form] as string);
                        const meetsMin = currentWords >= 1;
                        const feedback = getVolunteerWordCountFeedback(currentWords);
                        const hasError = Boolean(errors[q.key]);

                        return (
                          <div key={q.key} className="space-y-1.5 bg-[#101014] p-3.5 rounded-sm border border-neutral-800">
                            <div className="flex items-start justify-between gap-2">
                              <label className="text-xs font-medium text-white flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] text-[10.5px] font-mono flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-serif text-[12px] text-neutral-100">{q.title} *</span>
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

                            <p className="text-[11px] text-neutral-300 font-light leading-relaxed italic bg-black/40 p-2.5 rounded-sm border border-neutral-800/80">
                              "{q.prompt}"
                            </p>

                            <textarea
                              rows={3}
                              required
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
                </div>
              )}

              {/* ========================================================
                  STEP 4: REVIEW & VERIFICATION
                 ======================================================== */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="border-b border-neutral-800 pb-2">
                    <h4 className="text-sm font-serif text-white font-medium flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#d4af37]" />
                      <span>4. Review Application & Legal Consent</span>
                    </h4>
                    <p className="text-[11px] text-neutral-400 font-light">
                      Confirm the accuracy of your answers and accept official conference conditions.
                    </p>
                  </div>

                  {/* Summary Dossier Card */}
                  <div className="p-4 bg-[#121217] border border-[#d4af37]/30 rounded-sm space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <span className="font-serif font-medium text-white text-sm">
                        Dossier Summary: <strong className="text-[#d4af37] capitalize">{team} Team</strong>
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 rounded-sm">
                        {form.section.toUpperCase()} SECTION
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-300">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-neutral-500 block">Candidate Name</span>
                        <span className="font-medium text-white">{form.fullName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-neutral-500 block">Email Address</span>
                        <span className="font-mono text-white">{form.email || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-neutral-500 block">Mobile Phone</span>
                        <span className="font-mono text-white">{form.phoneFull || form.phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-neutral-500 block">Date of Birth & Stage</span>
                        <span>{form.dob || '—'} ({form.educationLevel || '—'})</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-neutral-500 block">Emergency Contact</span>
                        <span>{form.guardianName || '—'} ({form.guardianRelationship || '—'})</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-neutral-500 block">Emergency Phone</span>
                        <span className="font-mono text-white">{form.guardianPhoneFull || form.guardianPhone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-neutral-500 block">Attendance Availability</span>
                        <span className={form.attendanceAvailability === 'yes' ? 'text-emerald-400' : 'text-amber-400'}>
                          {form.attendanceAvailability === 'yes' ? 'Full Attendance Confirmed' : 'Partial / Conditional'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-neutral-500 block">Institution</span>
                        <span className="truncate block">{form.institution || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Consents and Eligibility Check */}
                  <div className="space-y-3 pt-2 text-xs text-neutral-300">
                    <label className="flex items-start gap-2.5 p-3 rounded-sm bg-[#121217] border border-neutral-800 cursor-pointer hover:border-neutral-700">
                      <input
                        type="checkbox"
                        checked={form.ageOk}
                        onChange={(e) => {
                          setForm({ ...form, ageOk: e.target.checked });
                          if (errors.ageOk) {
                            const err = { ...errors };
                            delete err.ageOk;
                            setErrors(err);
                          }
                        }}
                        className="mt-0.5 accent-[#d4af37]"
                      />
                      <span>
                        I confirm that all information provided in this application is accurate and that I meet the minimum age requirement (15+ years of age) for WEST MUN 2027 staff.
                      </span>
                    </label>
                    {errors.ageOk && <p className="text-[11px] text-red-400">{errors.ageOk}</p>}

                    <div className="p-3 rounded-sm bg-[#121217] border border-neutral-800">
                      <ConsentCheck
                        id="team-consent"
                        checked={form.consent}
                        onChange={(checked) => {
                          setForm({ ...form, consent: checked });
                          if (errors.consent) {
                            const err = { ...errors };
                            delete err.consent;
                            setErrors(err);
                          }
                        }}
                      />
                    </div>
                    {errors.consent && <p className="text-[11px] text-red-400">{errors.consent}</p>}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer Controls (Sticky at bottom) */}
        {!done && (
          <div className="shrink-0 px-6 py-4 border-t border-neutral-800/90 bg-[#0e0e13] flex items-center justify-between gap-3">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-sm transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="px-4 py-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!currentlyOpen || busy}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-[0_2px_12px_rgba(212,175,55,0.2)]"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitApplication}
                  disabled={!currentlyOpen || busy || extraPhotoBusy || (team === 'security' && !securityValidation.valid)}
                  className="inline-flex items-center gap-2 px-7 py-2.5 text-xs font-semibold uppercase tracking-widest text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-[0_2px_15px_rgba(212,175,55,0.3)]"
                  title={
                    team === 'security' && !securityValidation.valid
                      ? 'Please satisfy all 4 security question word counts'
                      : undefined
                  }
                >
                  {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {extraPhotoBusy
                    ? 'Uploading Photos…'
                    : busy
                    ? 'Transmitting…'
                    : currentlyOpen
                    ? 'Submit Application'
                    : 'Department Closed'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
