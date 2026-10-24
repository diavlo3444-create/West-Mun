import { useState, useCallback, useEffect } from 'react';
import { OpeningIntro } from './components/OpeningIntro';
import { PublicMotionLayer } from './components/PublicMotionLayer';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { DiplomaticGlobe } from './components/DiplomaticGlobe';
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
import { AnnouncementsSection } from './components/AnnouncementsSection';
import { DocumentsSection } from './components/DocumentsSection';
import { SponsorsSection } from './components/SponsorsSection';
import { CustomSectionsRenderer } from './components/CustomSectionsRenderer';
import { useCmsContent } from './lib/cmsContent';

function isPreviewContext(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const search = window.location.search || '';
    if (search.includes('preview=') || window.location.pathname === '/preview') return true;
    if (window.self !== window.top) return true;
  } catch {}
  return false;
}

export default function App() {
  const { customSections } = useCmsContent();
  const [menuOpen, setMenuOpen] = useState(false);

  // Intro animation playback state:
  // Shows on first visit or when triggered by Replay Intro. Bypassed in preview mode.
  const [introFinished, setIntroFinished] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (isPreviewContext()) return true;
      return sessionStorage.getItem('westmun_intro_seen') === 'true';
    } catch {
      return false;
    }
  });

  const [introFlying, setIntroFlying] = useState(() => isPreviewContext());
  const [introKey, setIntroKey] = useState(1);

  // Smooth scroll sync for Live Visual Editor preview
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'WESTMUN_CMS_PREVIEW_SCROLL' && e.data.sectionId) {
        const secId = String(e.data.sectionId).replace(/^section:/, '');
        const targetMap: Record<string, string> = {
          hero: 'hero',
          intro: 'about',
          highlights: 'highlights',
          about: 'about',
          committees: 'committees',
          schedule: 'schedule',
          secretariat: 'secretariat',
          registration: 'register',
          faq: 'faq',
          contact: 'contact',
          announcements: 'announcements',
          sponsors: 'sponsors',
          documents: 'documents',
        };
        const domId = targetMap[secId] || secId;
        const targetEl = document.getElementById(domId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        logoVisible={introFinished}
        navVisible={introFinished || introFlying}
      />

      {/* B. Scroll-Controlled Cinematic Hero Section */}
      <Hero />

      {/* Interactive diplomatic globe: the global story begins in Riyadh. */}
      <DiplomaticGlobe />

      {/* Announcements (hidden until the first one is published) */}
      <AnnouncementsSection />

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

      {/* Documents (hidden until the first one is added) */}
      <DocumentsSection />

      {/* I. Registration Portal */}
      <RegistrationSection />

      {/* Sponsors (hidden until the first one is added) */}
      <SponsorsSection />

      {/* J. Frequently Asked Questions */}
      <FAQSection />

      {/* K. Contact & Inquiries */}
      <ContactSection />

      {/* User-Defined Custom CMS Sections */}
      <CustomSectionsRenderer sections={customSections} />

      {/* L. Conference Footer */}
      <Footer onReplayIntro={handleReplayIntro} />

      {/* Public-page-only cinematic scroll reveals. Does not touch the hero video. */}
      <PublicMotionLayer />
    </div>
  );
}
