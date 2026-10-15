import React, { useState } from 'react';
import { Mail, Instagram, Share2, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useInView } from '../hooks/useInView';

export const ContactSection: React.FC = () => {
  const { ref, isInView } = useInView<HTMLElement>();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<boolean>(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Please provide your name.';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please provide a valid email format.';
    }
    if (!formData.subject.trim()) errs.subject = 'Subject line is required.';
    if (!formData.message.trim()) errs.message = 'Please provide your message.';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSent(true);
  };

  return (
    <section id="contact" ref={ref} className="relative z-20 py-24 sm:py-32 bg-[#070707] text-white border-t border-neutral-900">
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
              Secretariat Inquiries
            </span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight leading-tight mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Contact <span className="gold-gradient-text">WEST MUN</span>
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed font-light">
            Have questions regarding committee agendas, delegation quotas, or institutional sponsorships? Connect with the organizing team directly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Official Contact Placeholders (With Mandatory TBA Policy) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-[#0c0c0e] border border-neutral-800 rounded-sm">
              <h3 className="text-lg font-serif text-white mb-4">Official Channels</h3>
              <p className="text-xs text-neutral-400 mb-6 font-light leading-relaxed">
                Official email addresses and social handles will be activated concurrently with the launch of the delegate handbook.
              </p>

              <div className="space-y-4 text-xs">
                {/* Email */}
                <div className="flex items-start gap-3 p-3.5 bg-[#121215] border border-neutral-800/80 rounded-sm">
                  <Mail className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-400 block font-medium">Official Secretariat Email</span>
                    <span className="font-mono text-[#d4af37] font-semibold">TBA</span>
                  </div>
                </div>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/westmun_27?rpxt=c3JkNHN2Mm44OTh5&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit WEST MUN on Instagram"
                  className="flex items-start gap-3 p-3.5 bg-[#121215] border border-neutral-800/80 hover:border-[#d4af37]/60 rounded-sm transition-all group"
                >
                  <Instagram className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="text-neutral-400 block font-medium group-hover:text-white transition-colors">
                      Official Instagram
                    </span>
                    <span className="font-mono text-[#d4af37] font-semibold text-xs">
                      @westmun_27 ↗
                    </span>
                  </div>
                </a>

                {/* Other Social Media */}
                <div className="flex items-start gap-3 p-3.5 bg-[#121215] border border-neutral-800/80 rounded-sm">
                  <Share2 className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-400 block font-medium">LinkedIn & Social Channels</span>
                    <span className="font-mono text-[#d4af37] font-semibold">TBA</span>
                  </div>
                </div>

                {/* Venue / Location */}
                <div className="flex items-start gap-3 p-3.5 bg-[#121215] border border-neutral-800/80 rounded-sm">
                  <MapPin className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-400 block font-medium">Conference Venue & City</span>
                    <span className="font-mono text-[#d4af37] font-semibold">TBA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Inquiries Form */}
          <div className="lg:col-span-7">
            <div className="p-8 sm:p-10 bg-[#0e0e11] border border-neutral-800/90 rounded-sm">
              <h3 className="text-xl font-serif text-white mb-2">Send a Diplomatic Inquiry</h3>
              <p className="text-xs text-neutral-400 mb-6 font-light">
                Submit an inquiry directly to the Secretariat queue. Our team reviews incoming messages periodically.
              </p>

              {sent ? (
                <div className="p-6 bg-[#121c14] border border-emerald-500/30 rounded-sm text-center animate-in fade-in duration-300">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-lg font-serif text-white mb-2">Inquiry Logged</h4>
                  <p className="text-xs text-neutral-300 max-w-md mx-auto mb-4 leading-relaxed">
                    Thank you, <span className="text-white font-semibold">{formData.name}</span>. Your inquiry regarding "{formData.subject}" has been queued. As official conference emails are currently TBA, inquiries will be addressed as secretariat communication channels activate.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setFormData({ name: '', email: '', subject: '', message: '' });
                    }}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] rounded-sm hover:bg-[#e5c158] transition-colors cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs uppercase tracking-wider text-neutral-300 mb-1 font-medium">
                        Your Name <span className="text-[#d4af37]">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Delegate / Advisor Name"
                        className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2 px-3 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                      />
                      {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="block text-xs uppercase tracking-wider text-neutral-300 mb-1 font-medium">
                        Your Email <span className="text-[#d4af37]">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="advisor@school.org"
                        className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2 px-3 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                      />
                      {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="block text-xs uppercase tracking-wider text-neutral-300 mb-1 font-medium">
                      Subject Matter <span className="text-[#d4af37]">*</span>
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g. Delegation Quota / Committee Allocation Inquiry"
                      className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2 px-3 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                    {errors.subject && <p className="text-[11px] text-red-400 mt-1">{errors.subject}</p>}
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-xs uppercase tracking-wider text-neutral-300 mb-1 font-medium">
                      Message <span className="text-[#d4af37]">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please specify your institution, anticipated delegation size, or substantive question..."
                      className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm p-3 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors resize-none"
                    />
                    {errors.message && <p className="text-[11px] text-red-400 mt-1">{errors.message}</p>}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 text-xs uppercase tracking-widest font-semibold text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmit Message</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
