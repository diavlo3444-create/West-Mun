import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Send, User, Mail, School, Sparkles } from 'lucide-react';
import { useInView } from '../hooks/useInView';

export const RegistrationSection: React.FC = () => {
  const { ref, isInView } = useInView<HTMLElement>();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    institution: '',
    delegationType: 'Single Delegate',
    experienceLevel: 'Beginner',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<boolean>(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full Name is required.';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please provide a valid email format.';
    }
    if (!formData.institution.trim()) errs.institution = 'School or Institution name is required.';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitted(true);
  };

  return (
    <section id="register" ref={ref} className="relative z-20 py-24 sm:py-32 bg-[#070707] text-white border-t border-neutral-900">
      <div
        className={`max-w-7xl mx-auto px-5 sm:px-8 md:px-12 transition-all duration-1000 ease-out transform ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-[1px] bg-[#d4af37]" />
            <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
              Delegate Portal & Inquiries
            </span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight leading-tight mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Register for <span className="gold-gradient-text">WEST MUN</span>
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed font-light">
            Secure your delegation’s place at the Western Model United Nations Conference. Delegate registration proceeds in progressive windows. All official fee structures, financial aid criteria, and country allocation matrixes are To Be Announced (TBA).
          </p>
        </div>

        {/* 2 Registration Tiers (Centered & Balanced, With Mandatory TBA Flags) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Early Bird */}
          <div className="p-8 bg-[#0c0c0e] border border-neutral-800 rounded-sm relative flex flex-col justify-between hover:border-[#d4af37]/40 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#d4af37]">Tier 01</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-[#17171d] text-neutral-400 border border-neutral-800 rounded-sm">
                  Status: TBA
                </span>
              </div>
              <h3 className="text-xl font-serif text-white mb-2">Early Bird Delegate</h3>
              <p className="text-xs text-neutral-400 mb-6 font-light leading-relaxed">
                Priority country matrix preference for individual delegates and faculty-led groups.
              </p>
              <div className="space-y-2 py-4 border-t border-neutral-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Registration Fee:</span>
                  <span className="font-mono text-[#d4af37] font-bold">TBA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Application Deadline:</span>
                  <span className="font-mono text-neutral-300">TBA</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800/80 text-[11px] text-neutral-500">
              Eligibility: High School & Collegiate Delegates
            </div>
          </div>

          {/* Regular Delegate */}
          <div className="p-8 bg-[#0e0e12] border border-[#d4af37]/50 rounded-sm relative flex flex-col justify-between shadow-[0_0_30px_rgba(212,175,55,0.06)] hover:border-[#d4af37] transition-all duration-300">
            <div className="absolute -top-3 left-6 px-3 py-0.5 bg-[#d4af37] text-black text-[10px] uppercase font-bold tracking-widest rounded-sm">
              Standard Delegate
            </div>
            <div>
              <div className="flex justify-between items-start mb-4 mt-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#d4af37]">Tier 02</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-[#17171d] text-neutral-400 border border-neutral-800 rounded-sm">
                  Status: TBA
                </span>
              </div>
              <h3 className="text-xl font-serif text-white mb-2">Regular Registration</h3>
              <p className="text-xs text-neutral-400 mb-6 font-light leading-relaxed">
                General registration window for single delegates, school delegations, and independent youth diplomats.
              </p>
              <div className="space-y-2 py-4 border-t border-neutral-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Registration Fee:</span>
                  <span className="font-mono text-[#d4af37] font-bold">TBA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Application Deadline:</span>
                  <span className="font-mono text-neutral-300">TBA</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800/80 text-[11px] text-neutral-400">
              Eligibility: Open to All Registered Delegates
            </div>
          </div>
        </div>

        {/* Delegate Pre-Registration & Interest Form */}
        <div className="p-8 sm:p-10 bg-[#0e0e11] border border-neutral-800/90 rounded-sm max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
            <h3 className="text-2xl font-serif text-white">Pre-Registration & Priority Alert</h3>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mb-6 font-light leading-relaxed">
            Register your interest to receive immediate notification when the official registration portal, delegate fee schedule, and country assignment matrix go live.
          </p>

          {/* Transparent Disclosure */}
          <div className="p-3.5 bg-[#141418] border border-neutral-800 rounded-sm mb-6 flex items-start gap-3 text-xs text-neutral-300">
            <AlertTriangle className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
            <p>
              <strong className="text-white">Transparency Notice:</strong> Official payment portals, institutional invoices, and confirmed country assignments will be processed once dates and fees are announced (TBA). Submitting below records your interest locally.
            </p>
          </div>

          {submitted ? (
            <div className="p-6 bg-[#121c14] border border-emerald-500/30 rounded-sm text-center animate-in fade-in duration-300">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-lg font-serif text-white mb-2">Priority Interest Recorded</h4>
              <p className="text-xs text-neutral-300 max-w-md mx-auto mb-4 leading-relaxed">
                Thank you, <span className="text-white font-semibold">{formData.fullName}</span>. You will receive an official notification at <span className="text-[#d4af37] font-mono">{formData.email}</span> as soon as WEST MUN registration dates and fees are announced.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setFormData({
                    fullName: '',
                    email: '',
                    institution: '',
                    delegationType: 'Single Delegate',
                    experienceLevel: 'Beginner',
                  });
                }}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] rounded-sm hover:bg-[#e5c158] transition-colors cursor-pointer"
              >
                Submit Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label htmlFor="reg-name" className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                    Full Name <span className="text-[#d4af37]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                    <input
                      id="reg-name"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                  {errors.fullName && <p className="text-[11px] text-red-400 mt-1">{errors.fullName}</p>}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="reg-email" className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                    Email Address <span className="text-[#d4af37]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                    <input
                      id="reg-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. delegate@university.edu"
                      className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                  {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
                </div>
              </div>

              {/* Institution */}
              <div>
                <label htmlFor="reg-inst" className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                  School / College / Institution <span className="text-[#d4af37]">*</span>
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    id="reg-inst"
                    type="text"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="e.g. Western Academy / Faculty of Law"
                    className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  />
                </div>
                {errors.institution && <p className="text-[11px] text-red-400 mt-1">{errors.institution}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Delegation Type */}
                <div>
                  <label htmlFor="reg-type" className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                    Delegation Type
                  </label>
                  <select
                    id="reg-type"
                    value={formData.delegationType}
                    onChange={(e) => setFormData({ ...formData, delegationType: e.target.value })}
                    className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2.5 px-3 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="Single Delegate">Single Delegate</option>
                    <option value="Dual Delegation">Dual Delegation</option>
                    <option value="School Delegation (6+ delegates)">School Delegation (6+ delegates)</option>
                    <option value="Faculty Advisor / Observer">Faculty Advisor / Observer</option>
                  </select>
                </div>

                {/* Experience Tier */}
                <div>
                  <label htmlFor="reg-exp" className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                    MUN Experience Level
                  </label>
                  <select
                    id="reg-exp"
                    value={formData.experienceLevel}
                    onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                    className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2.5 px-3 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="First-time Delegate (Novice)">First-time Delegate (Novice)</option>
                    <option value="1-3 Conferences (Intermediate)">1-3 Conferences (Intermediate)</option>
                    <option value="4+ Conferences (Advanced)">4+ Conferences (Advanced)</option>
                    <option value="Crisis Specialist">Crisis Specialist</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 text-xs uppercase tracking-widest font-semibold text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-[0_2px_15px_rgba(212,175,55,0.2)]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Priority Pre-Registration</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
