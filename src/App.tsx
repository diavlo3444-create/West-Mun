import { useState, useEffect, useCallback } from 'react';
import { OpeningIntro } from './components/OpeningIntro';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ConferenceIntro } from './components/ConferenceIntro';
import { ConferenceHighlights } from './components/ConferenceHighlights';
import { AboutSection } from './components/AboutSection';
import { CommitteesSection } from './components/CommitteesSection';
import { ScheduleSection } from './components/ScheduleSection';
import { SecretariatSection } from './components/SecretariatSection';
import { RegistrationSection } from './components/RegistrationSection';
import { FAQSection } from './components/FAQSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';

// Preserved custom typewriter hook
function useTypewriter(
  text: string,
  speed: number = 38,
  startDelay: number = 600
) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    timer = setTimeout(() => {
      interval = setInterval(() => {
        index++;
        if (index <= text.length) {
          setDisplayed(text.slice(0, index));
        }
        if (index >= text.length) {
          if (interval) clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Intro animation playback state:
  // Shows on first visit or when triggered by Replay Intro
  const [introFinished, setIntroFinished] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('westmun_intro_seen') === 'true';
    } catch {
      return false;
    }
  });

  const [introFlying, setIntroFlying] = useState(false);
  const [introKey, setIntroKey] = useState(1);

  const handleIntroComplete = useCallback(() => {
    try {
      sessionStorage.setItem('westmun_intro_seen', 'true');
    } catch {}
    setIntroFlying(true);
    setIntroFinished(true);
  }, []);

  const handleFlightStart = useCallback(() => {
    setIntroFlying(true);
  }, []);

  const handleReplayIntro = useCallback(() => {
    // Scroll cleanly to the very top so camera, navbar, and hero coordinates align
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Reset intro states & cycle key to mount a completely fresh OpeningIntro instance
    try {
      sessionStorage.removeItem('westmun_intro_seen');
    } catch {}

    setIntroFlying(false);
    setIntroFinished(false);
    setIntroKey((prev) => prev + 1);
  }, []);

  // Diplomatic dispatch text using preserved typewriter animation
  const typewriterText =
    'The floor is open for debate. Good diplomacy unites divided nations. What global crisis will your delegation solve?';
  const { displayed, done } = useTypewriter(typewriterText, 36, 500);

  // Track scroll position for navbar styling with RAF throttling
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 40;
          setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#070707] text-[#f5f5f5]">
      {/* Opening Intro Animation (Logo Centered -> Falling Gold Particles -> Flight to Navbar) */}
      {!introFinished && (
        <OpeningIntro
          key={introKey}
          onComplete={handleIntroComplete}
          onFlightStart={handleFlightStart}
        />
      )}

      {/* A. Fixed Navigation Bar */}
      <Navbar
        scrolled={scrolled}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        logoVisible={introFinished}
        navVisible={introFinished || introFlying}
      />

      {/* B. Scroll-Controlled Cinematic Hero Section */}
      <Hero
        displayedText={displayed}
        isDoneTyping={done}
      />

      {/* C. Conference Introduction */}
      <ConferenceIntro />

      {/* D. Conference Highlights */}
      <ConferenceHighlights />

      {/* E. About WEST MUN */}
      <AboutSection />

      {/* F. Committees & Dossiers */}
      <CommitteesSection />

      {/* G. Conference Schedule Timeline */}
      <ScheduleSection />

      {/* H. Secretariat & Organizing Team */}
      <SecretariatSection />

      {/* I. Registration Portal */}
      <RegistrationSection />

      {/* J. Frequently Asked Questions */}
      <FAQSection />

      {/* K. Contact & Inquiries */}
      <ContactSection />

      {/* L. Conference Footer */}
      <Footer onReplayIntro={handleReplayIntro} />
    </div>
  );
}
