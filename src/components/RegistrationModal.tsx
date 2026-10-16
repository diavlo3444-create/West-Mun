import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { submitRegistration, RegistrationRecord } from '../lib/api';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: 'early_bird' | 'regular';
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  tier,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    institution: '',
    delegationType: 'single_delegate' as RegistrationRecord['delegation_type'],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const tierLabel = tier === 'early_bird' ? 'Tier 01: Early Bird Delegate' : 'Tier 02: Regular Registration';

  const validate = () => {
    const errs: Record<string, string> = {};
    const name = formData.fullName.trim();
    const email = formData.email.trim();
    const inst = formData.institution.trim();

    if (!name || name.length < 2) {
      errs.fullName = 'Please provide your full legal or delegate name.';
    } else if (name.length > 150) {
      errs.fullName = 'Name cannot exceed 150 characters.';
    }

    if (!email) {
      errs.email = 'Email address is required.';
    } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      errs.email = 'Please provide a valid email format.';
    }

    if (!inst || inst.length < 2) {
      errs.institution = 'Please provide your school, university, or delegation entity.';
    } else if (inst.length > 200) {
      errs.institution = 'Institution cannot exceed 200 characters.';
    }

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await submitRegistration({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        institution: formData.institution.trim(),
        tier: tier,
        delegationType: formData.delegationType,
      });

      if (!res.success) {
        throw new Error(res.error || 'Registration could not be completed.');
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setSubmitError(null);
    setErrors({});
    setFormData({
      fullName: '',
      email: '',
      institution: '',
      delegationType: 'single_delegate',
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg bg-[#0c0c0f] border border-[#d4af37]/40 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(212,175,55,0.15)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gold Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#aa8232] via-[#d4af37] to-[#aa8232]" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-neutral-800">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] block">
              {tierLabel}
            </span>
            <h3 id="registration-modal-title" className="text-xl font-serif text-white mt-0.5">
              Delegate Priority Registration
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-sm hover:bg-neutral-800/60 transition-colors cursor-pointer"
            aria-label="Close registration dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-serif text-white">Priority Registration Received</h4>
              <p className="text-xs text-neutral-300 font-light leading-relaxed max-w-sm mx-auto">
                Thank you, <span className="text-white font-medium">{formData.fullName}</span>. Your priority placement for <span className="text-[#d4af37] font-medium">{tierLabel}</span> has been securely logged. Official handbook matrices and fee settlement details will be dispatched to <span className="text-white font-mono">{formData.email}</span>.
              </p>
              <div className="p-3 bg-[#141418] border border-neutral-800 rounded-sm text-[11px] text-neutral-400 font-mono flex items-center justify-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Protected by Secretariat Security Controls</span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] hover:bg-[#e5c158] rounded-sm transition-colors cursor-pointer"
                >
                  Return to Conference Portal
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <p className="text-neutral-400 text-xs font-light">
                Secure your delegation’s position in the priority queue. Submissions are validated, sanitized, and stored securely.
              </p>

              {submitError && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-sm flex items-start gap-2.5 text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-red-200">Registration Notice</span>
                    <span>{submitError}</span>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="reg-fullname" className="block uppercase tracking-wider text-neutral-300 mb-1 font-medium">
                  Full Delegate / Head Delegate Name <span className="text-[#d4af37]">*</span>
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Enter full delegate name"
                  className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2 px-3 text-white placeholder-neutral-600 focus:outline-none transition-colors"
                />
                {errors.fullName && <p className="text-[11px] text-red-400 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="reg-email" className="block uppercase tracking-wider text-neutral-300 mb-1 font-medium">
                  Official Email Address <span className="text-[#d4af37]">*</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="delegate@institution.edu"
                  className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2 px-3 text-white placeholder-neutral-600 focus:outline-none transition-colors"
                />
                {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="reg-institution" className="block uppercase tracking-wider text-neutral-300 mb-1 font-medium">
                  Educational Institution / Organization <span className="text-[#d4af37]">*</span>
                </label>
                <input
                  id="reg-institution"
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  placeholder="e.g. Western University / Collegiate Academy"
                  className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2 px-3 text-white placeholder-neutral-600 focus:outline-none transition-colors"
                />
                {errors.institution && <p className="text-[11px] text-red-400 mt-1">{errors.institution}</p>}
              </div>

              <div>
                <label htmlFor="reg-type" className="block uppercase tracking-wider text-neutral-300 mb-1 font-medium">
                  Delegation Structure
                </label>
                <select
                  id="reg-type"
                  value={formData.delegationType}
                  onChange={(e) => setFormData({ ...formData, delegationType: e.target.value as RegistrationRecord['delegation_type'] })}
                  className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2 px-3 text-white focus:outline-none transition-colors"
                >
                  <option value="single_delegate">Single Individual Delegate</option>
                  <option value="school_delegation">School / University Delegation</option>
                  <option value="independent_youth">Independent Youth Delegation</option>
                </select>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 uppercase tracking-widest font-semibold text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(212,175,55,0.25)]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Transmitting Registration...</span>
                    </>
                  ) : (
                    <span>Confirm Priority Pre-Registration</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
