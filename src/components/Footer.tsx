import React from 'react';
import { Globe2, ArrowUp, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = 2026;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative z-20 bg-[#050506] text-white border-t border-neutral-900 py-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-[#d4af37]/40 flex items-center justify-center bg-[#141414] text-[#d4af37]">
                <Globe2 className="w-4 h-4 text-[#d4af37]" />
              </div>
              <span
                className="text-xl font-bold tracking-wider text-white font-serif"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                WEST <span className="text-[#d4af37]">MUN</span>
              </span>
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

          {/* Official Disclosures */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-4">
              Contact & Inquiries
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              <li>
                <span className="text-neutral-500 block">General Secretariat:</span>
                <span className="font-mono text-[#d4af37]">TBA</span>
              </li>
              <li>
                <span className="text-neutral-500 block">Delegate Affairs:</span>
                <span className="font-mono text-[#d4af37]">TBA</span>
              </li>
              <li>
                <span className="text-neutral-500 block">Host Venue:</span>
                <span className="font-mono text-neutral-300">TBA</span>
              </li>
              <li>
                <span className="text-neutral-500 block">Social Media:</span>
                <span className="font-mono text-neutral-300">TBA</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Back to Top */}
        <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {currentYear} WEST MUN (Model United Nations). All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-mono text-neutral-600">Diplomatic Summit Portal</span>
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
      </div>
    </footer>
  );
};
