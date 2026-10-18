import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface NavbarProps {
  scrolled?: boolean;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  logoVisible?: boolean;
  navVisible?: boolean;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  scrolled: externalScrolled,
  menuOpen,
  setMenuOpen,
  logoVisible = true,
  navVisible = true,
}) => {
  const regLabel = 'Registration: TBA';
  const [internalScrolled, setInternalScrolled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.scrollY > 40;
  });

  const isScrolled = externalScrolled !== undefined ? externalScrolled : internalScrolled;

  const isScrolledRef = useRef(internalScrolled);
  isScrolledRef.current = isScrolled;

  useEffect(() => {
    if (externalScrolled !== undefined) return;

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const isNowScrolled = window.scrollY > 40;
        // Only trigger state update when the threshold state genuinely changes
        if (isNowScrolled !== isScrolledRef.current) {
          isScrolledRef.current = isNowScrolled;
          setInternalScrolled(isNowScrolled);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [externalScrolled]);

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
        className={`fixed top-0 left-0 right-0 z-40 w-full py-3.5 sm:py-4 transition-[background-color,border-color,box-shadow,opacity] duration-500 ease-out ${
          navVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${
          isScrolled || menuOpen
            ? 'bg-[#080808]/98 border-b border-[#d4af37]/20 shadow-2xl'
            : 'bg-gradient-to-b from-black/85 via-black/40 to-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          {/* Logo / Brand Zone */}
          <a
            href="#hero"
            className="flex items-center gap-3 text-white no-underline group"
            aria-label="WEST MUN Home"
          >
            <div
              id="navbar-logo-target"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-[#d4af37]/50 flex items-center justify-center bg-[#141414] group-hover:scale-105 group-hover:border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)] ${
                logoVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={{
                transition: logoVisible ? 'none' : 'opacity 200ms ease-out',
              }}
            >
              <img
                src="/westmun-logo.jpg"
                alt="WEST MUN Official Logo"
                className="w-full h-full object-contain p-0.5 object-center"
              />
            </div>
            <div className="flex flex-col">
              <span
                className="text-lg sm:text-xl font-bold tracking-wider leading-tight font-serif select-none"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span className="shimmer-platinum">WEST</span>{' '}
                <span className="shimmer-gold">MUN</span>
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
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href="#register"
              className="inline-flex items-center justify-center px-4 py-2 text-xs uppercase tracking-widest font-semibold text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 transition-all shadow-[0_2px_12px_rgba(212,175,55,0.25)]"
            >
              {regLabel}
            </motion.a>
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
              className={`w-6 h-[2px] bg-[#d4af37] transition-[transform,opacity] duration-300 ease-in-out ${
                menuOpen ? 'rotate-45 translate-y-[7px]' : ''
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-[#d4af37] transition-[transform,opacity] duration-300 ease-in-out ${
                menuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-[#d4af37] transition-[transform,opacity] duration-300 ease-in-out ${
                menuOpen ? '-rotate-45 -translate-y-[7px]' : ''
              }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <div
        className={`fixed inset-0 z-30 bg-[#070707]/98 flex flex-col justify-center items-start px-8 sm:px-12 gap-6 lg:hidden transition-opacity duration-300 ease-in-out ${
          menuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#d4af37]/50 flex items-center justify-center bg-[#141414] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <img
              src="/westmun-logo.jpg"
              alt="WEST MUN Logo"
              className="w-full h-full object-contain p-0.5 object-center"
            />
          </div>
          <div className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
            WEST MUN Navigation
          </div>
        </div>
        {navLinks.map((link) => (
          <motion.a
            key={link.label}
            href={link.href}
            whileHover={{ x: 6 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMenuOpen(false)}
            className="text-2xl sm:text-3xl font-serif text-white hover:text-[#d4af37] transition-colors"
          >
            {link.label}
          </motion.a>
        ))}
        <div className="pt-4 w-full max-w-xs border-t border-neutral-800">
          <motion.a
            href="#register"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMenuOpen(false)}
            className="w-full inline-flex items-center justify-center py-3 text-xs uppercase tracking-widest font-semibold text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 transition-all text-center"
          >
            {regLabel}
          </motion.a>
        </div>
      </div>
    </>
  );
});

Navbar.displayName = 'Navbar';
