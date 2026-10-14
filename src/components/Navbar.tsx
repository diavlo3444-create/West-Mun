import React from 'react';
import { Globe2 } from 'lucide-react';

interface NavbarProps {
  scrolled: boolean;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Navbar: React.FC<NavbarProps> = ({ scrolled, menuOpen, setMenuOpen }) => {
  const navLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'About', href: '#about' },
    { label: 'Committees', href: '#committees' },
    { label: 'Schedule', href: '#schedule' },
    { label: 'Secretariat', href: '#secretariat' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 w-full transition-all duration-300 ${
          scrolled || menuOpen
            ? 'bg-[#080808]/95 backdrop-blur-md border-b border-[#d4af37]/20 py-3.5 shadow-2xl'
            : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          {/* Logo / Brand Zone */}
          <a
            href="#hero"
            className="flex items-center gap-3 text-white no-underline group"
            aria-label="WEST MUN Home"
          >
            <div className="w-8 h-8 rounded-full border border-[#d4af37]/40 flex items-center justify-center bg-[#141414] text-[#d4af37] transition-transform duration-300 group-hover:scale-105">
              <Globe2 className="w-4 h-4 text-[#d4af37]" />
            </div>
            <div className="flex flex-col">
              <span
                className="text-lg sm:text-xl font-bold tracking-wider text-white leading-tight font-serif"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                WEST <span className="text-[#d4af37]">MUN</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-sans hidden sm:block">
                Model United Nations
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav
            className="hidden lg:flex items-center gap-7 text-sm font-medium tracking-wide text-neutral-300"
            aria-label="Desktop Navigation"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-[#d4af37] transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-[#d4af37] hover:after:w-full after:transition-all after:duration-300"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Primary Action */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="#register"
              className="inline-flex items-center justify-center px-5 py-2 text-xs uppercase tracking-widest font-semibold text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_2px_12px_rgba(212,175,55,0.25)]"
            >
              Register Now
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="lg:hidden flex flex-col justify-center items-center gap-[5px] w-9 h-9 z-50 cursor-pointer focus:outline-none rounded-md p-1.5 hover:bg-white/5 transition-colors"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
          >
            <span
              className={`w-6 h-[2px] bg-[#d4af37] transition-all duration-300 ease-in-out ${
                menuOpen ? 'rotate-45 translate-y-[7px]' : ''
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-[#d4af37] transition-all duration-300 ease-in-out ${
                menuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-[#d4af37] transition-all duration-300 ease-in-out ${
                menuOpen ? '-rotate-45 -translate-y-[7px]' : ''
              }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <div
        className={`fixed inset-0 z-30 bg-[#070707]/98 backdrop-blur-xl flex flex-col justify-center items-start px-8 sm:px-12 gap-6 lg:hidden transition-all duration-300 ease-in-out ${
          menuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-2">
          WEST MUN Conference Navigation
        </div>
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            className="text-2xl sm:text-3xl font-serif text-white hover:text-[#d4af37] transition-colors"
          >
            {link.label}
          </a>
        ))}
        <div className="pt-4 w-full max-w-xs border-t border-neutral-800">
          <a
            href="#register"
            onClick={() => setMenuOpen(false)}
            className="w-full inline-flex items-center justify-center py-3 text-xs uppercase tracking-widest font-semibold text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 transition-all text-center"
          >
            Register Now
          </a>
        </div>
      </div>
    </>
  );
};
