import React from 'react';
import { ArrowUp, Shield, Instagram, Lock } from 'lucide-react';
import { useInView } from '../hooks/useInView';

interface FooterProps {
  onReplayIntro?: () => void;
  onOpenAdminPortal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onReplayIntro, onOpenAdminPortal }) => {
  const { ref, isInView } = useInView<HTMLElement>({ threshold: 0.05 });
  const currentYear = 2027;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer ref={ref} className="relative z-20 bg-[#050506] text-white border-t border-neutral-900 py-16">
      <div
        className={`max-w-7xl mx-auto px-5 sm:px-8 md:px-12 transition-all duration-1000 ease-out transform ${
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
                  WEST <span className="text-[#d4af37]">MUN</span>
                </span>
                <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-sans">
                  Where Diplomacy Meets Leadership
                </span>
              </div>
            </div>
            <p className="text-neutral-400 text-xs sm:text-sm font-light max-w-sm leading-relaxed">
              Western Model United Nations Conference. Fostering diplomatic negotiation, global perspective, and principled leadership through rigorous international simulations.
            </p>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
              <Shield className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Official Conference Secretariat</span>
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
                <a href="#register" className="hover:text-[#d4af37] transition-colors">Registration Portal</a>
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
                <span className="font-mono text-[#d4af37]">TBA</span>
              </li>
              <li>
                <span className="text-neutral-500 block">Host Venue:</span>
                <span className="font-mono text-neutral-300">TBA</span>
              </li>
              <li>
                <span className="text-neutral-500 block mb-1">Official Instagram:</span>
                <a
                  href="https://www.instagram.com/westmun_27?rpxt=c3JkNHN2Mm44OTh5&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit WEST MUN on Instagram"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-[#d4af37] hover:text-[#f3e5ab] transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>@westmun_27 ↗</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Back to Top */}
        <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {currentYear} WEST MUN (Model United Nations). All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-mono text-neutral-600 hidden sm:inline">Diplomatic Summit Portal</span>
            {onOpenAdminPortal && (
              <button
                type="button"
                onClick={onOpenAdminPortal}
                className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-[#d4af37] transition-colors text-xs font-mono cursor-pointer"
                title="Secretariat Organizer Portal"
              >
                <Lock className="w-3 h-3 text-[#d4af37]" />
                <span>Secretariat Portal</span>
              </button>
            )}
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-[#d4af37] transition-colors cursor-pointer"
              aria-label="Back to top"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

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
      </div>
    </footer>
  );
};
