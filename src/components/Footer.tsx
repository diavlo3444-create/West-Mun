import React from 'react';
import { motion } from 'motion/react';
import { ArrowUp, Shield, Instagram } from 'lucide-react';
import { useInView } from '../hooks/useInView';
import { useSettings, orTba } from '../lib/content';
import { useCmsContent } from '../lib/cmsContent';
import { safeUrl } from '../lib/safe';

interface FooterProps {
  onReplayIntro?: () => void;
}

export const Footer: React.FC<FooterProps> = React.memo(({ onReplayIntro }) => {
  const { ref, isInView } = useInView<HTMLElement>({ threshold: 0.05 });
  const currentYear = 2027;
  const settings = useSettings();
  const { t } = useCmsContent();
  const instagramUrl = safeUrl(settings.instagram_url);
  const contactEmail = settings.contact_email.trim();

  const brandTitle = t('footer_brand_title', 'WEST MUN');
  const brandTagline = t('footer_brand_tagline', 'Where Diplomacy Meets Leadership');
  const description = t(
    'footer_description',
    'Western Model United Nations Conference. Fostering diplomatic negotiation, global perspective, and principled leadership through rigorous international simulations.',
  );
  const badgeText = t('footer_badge_text', 'Official Conference Secretariat');
  const copyright = t('footer_copyright', `© ${currentYear} WEST MUN (Model United Nations). All rights reserved.`);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer ref={ref} className="relative z-20 bg-[#050506] text-white border-t border-neutral-900 py-16">
      <div
        className={`max-w-7xl mx-auto px-5 sm:px-8 md:px-12 transition-[opacity,transform] duration-1000 ease-out will-change-[opacity,transform] ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-[#d4af37]/50 flex items-center justify-center bg-[#141414] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                <img
                  src="/westmun-logo.jpg"
                  alt="WEST MUN Official Logo"
                  className="w-full h-full object-contain p-0.5 object-center"
                />
              </div>
              <div className="flex flex-col">
                <span
                  className="text-xl font-bold tracking-wider text-white font-serif leading-tight"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <span className="text-white">{brandTitle}</span>
                </span>
                <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-sans">
                  {brandTagline}
                </span>
              </div>
            </div>
            <p className="text-neutral-400 text-xs sm:text-sm font-light max-w-sm leading-relaxed">
              {description}
            </p>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
              <Shield className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>{badgeText}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-4">
              Conference Index
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              <li>
                <a href="#hero" className="hover:text-white transition-colors">Home</a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">About WEST MUN</a>
              </li>
              <li>
                <a href="#committees" className="hover:text-white transition-colors">Committees & Agendas</a>
              </li>
              <li>
                <a href="#schedule" className="hover:text-white transition-colors">Conference Schedule</a>
              </li>
              <li>
                <a href="#secretariat" className="hover:text-white transition-colors">Secretariat Dais</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">Delegate FAQ</a>
              </li>
              <li>
                <a href="#register" className="hover:text-[#d4af37] transition-colors">Registration (TBA)</a>
              </li>
            </ul>
          </div>

          {/* Official Disclosures & Social Links */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-4">
              Contact & Social
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              <li>
                <span className="text-neutral-500 block">General Secretariat:</span>
                {contactEmail ? (
                  <a href={`mailto:${contactEmail}`} className="font-mono text-[#d4af37] hover:text-[#f3e5ab] break-all">{contactEmail}</a>
                ) : (
                  <span className="font-mono text-[#d4af37]">TBA</span>
                )}
              </li>
              <li>
                <span className="text-neutral-500 block">Host Venue:</span>
                <span className="font-mono text-neutral-300">{orTba(settings.conference_venue)}</span>
              </li>
              {instagramUrl && (
              <li>
                <span className="text-neutral-500 block mb-1">Official Instagram:</span>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit WEST MUN on Instagram"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-[#d4af37] hover:text-[#f3e5ab] transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>{orTba(settings.instagram_handle, 'Instagram')} ↗</span>
                </a>
              </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Back to Top */}
        <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>{copyright}</p>
          <div className="flex items-center gap-6">
            <a href="/terms" className="hover:text-[#d4af37] transition-colors">Terms of Service</a>
            <a href="/privacy" className="hover:text-[#d4af37] transition-colors">Privacy Policy</a>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-[#d4af37] transition-colors cursor-pointer active:scale-95"
              aria-label="Back to top"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-neutral-600 leading-relaxed max-w-3xl">
          WEST MUN is an independent Model United Nations conference simulation. It is not affiliated with, endorsed by, or sponsored by the United Nations.
        </p>

        {/* Dedicated Replay Intro Button at the very bottom */}
        {onReplayIntro && (
          <div className="pt-6 mt-6 border-t border-neutral-900/50 flex justify-center items-center">
            <button
              type="button"
              onClick={onReplayIntro}
              className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[#d4af37]/30 bg-[#0a0a0c]/80 hover:bg-[#d4af37]/10 hover:border-[#d4af37]/70 text-neutral-400 hover:text-[#f3e5ab] text-xs font-mono tracking-wider transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] active:scale-95 cursor-pointer"
              aria-label="Replay intro animation"
            >
              <span className="text-sm font-sans transition-transform duration-500 group-hover:rotate-180">↻</span>
              <span>Replay Intro</span>
            </button>
          </div>
        )}

        {/* Cinematic website inquiry CTA — final element on the page */}
        <motion.section
          initial={{ opacity: 0, y: 44, scale: 0.985 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 44, scale: 0.985 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="group mt-16 sm:mt-20 relative isolate overflow-hidden border border-[#d4af37]/25 bg-[#080809] px-6 py-16 sm:px-12 sm:py-24 text-center"
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_55%,rgba(212,175,55,0.16),transparent_58%)]" />
          <motion.div
            aria-hidden="true"
            className="absolute -top-40 left-1/2 h-80 w-[ min(90%,900px)] -translate-x-1/2 rounded-full border border-[#d4af37]/10"
            animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute -inset-y-1/2 left-[-35%] w-1/3 rotate-[18deg] bg-gradient-to-r from-transparent via-[#f3e5ab]/[0.07] to-transparent blur-xl pointer-events-none"
            animate={{ x: ['0%', '480%'] }}
            transition={{ duration: 8, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
          />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
          <div className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />

          <div className="relative z-10 mx-auto max-w-3xl">
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={isInView ? { width: 56, opacity: 1 } : { width: 0, opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.55 }}
              className="h-px mx-auto mb-7 bg-[#d4af37]"
            />
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="text-[10px] sm:text-xs uppercase tracking-[0.38em] text-[#d4af37] font-semibold mb-6"
            >
              YOUR VISION. BUILT WITH PURPOSE.
            </motion.p>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.85, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl sm:text-5xl md:text-6xl font-serif font-normal leading-[1.08] tracking-tight text-white"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Want a website
              <span className="block mt-2 text-[#d4af37] italic">like this?</span>
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.75, delay: 0.78 }}
              className="mx-auto mt-6 max-w-lg text-sm sm:text-base leading-relaxed text-neutral-400 font-light"
            >
              Let’s turn your idea into a digital experience people remember.
            </motion.p>
            <motion.a
              href="https://wa.me/966558792450?text=Hi%20Mohammed%2C%20I%27m%20interested%20in%20getting%20a%20website%20like%20WEST%20MUN."
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 18 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.75, delay: 0.95 }}
              whileHover={{ y: -4, scale: 1.025 }}
              whileTap={{ scale: 0.98 }}
              className="relative mt-9 inline-flex items-center justify-center gap-4 overflow-hidden border border-[#d4af37] bg-[#d4af37] px-8 py-4 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-[0_0_35px_rgba(212,175,55,0.12)] transition-shadow duration-500 hover:shadow-[0_0_45px_rgba(212,175,55,0.32)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Contact Mohammed Magdi</span>
              <span aria-hidden="true" className="relative text-base">↗</span>
            </motion.a>
            <p className="mt-6 text-[9px] uppercase tracking-[0.24em] text-neutral-600">
              Riyadh · Available for select projects
            </p>
          </div>
        </motion.section>
      </div>
    </footer>
  );
});
Footer.displayName = 'Footer';
