import { useEffect, useState } from 'react';

const CHAPTERS = [
  { id: 'intro', label: 'The mission', number: '01' },
  { id: 'highlights', label: 'The experience', number: '02' },
  { id: 'about', label: 'About WEST MUN', number: '03' },
  { id: 'committees', label: 'Committees', number: '04' },
  { id: 'schedule', label: 'The schedule', number: '05' },
  { id: 'secretariat', label: 'The team', number: '06' },
  { id: 'register', label: 'Registration', number: '07' },
  { id: 'faq', label: 'Questions', number: '08' },
  { id: 'contact', label: 'Contact', number: '09' },
];

/**
 * Lightweight chapter navigation only.
 * Scroll-triggered text/card reveal effects are intentionally disabled so
 * content stays stable while scrolling. The cinematic hero remains untouched.
 */
export function PublicMotionLayer() {
  const [activeChapter, setActiveChapter] = useState('intro');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const chapterElements = CHAPTERS
      .map((chapter) => document.getElementById(chapter.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!chapterElements.length || !('IntersectionObserver' in window)) return;

    const activeObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveChapter(visible.target.id);
    }, { threshold: [0.12, 0.3, 0.55], rootMargin: '-18% 0px -45% 0px' });

    chapterElements.forEach((section) => activeObserver.observe(section));
    // Lightweight one-shot reveals: no scroll handlers or layout reads, and the hero video is untouched.
    const cardSelector = '#highlights [class*="grid"] > *, #committees [class*="grid"] > *, #schedule [class*="grid"] > *, #secretariat [class*="grid"] > *';
    const motionTargets = Array.from(document.querySelectorAll<HTMLElement>(
      '#highlights h2, #about h2, #committees h2, #schedule h2, #secretariat h2, #register h2, #faq h2, #contact h2, ' + cardSelector
    ));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) return () => activeObserver.disconnect();

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add('wm-scroll-reveal--visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

    motionTargets.forEach((element, index) => {
      element.classList.add('wm-scroll-reveal');
      if (element.matches(cardSelector)) {
        element.style.setProperty('--wm-reveal-delay', String(Math.min(index % 6, 5) * 65) + 'ms');
      }
      revealObserver.observe(element);
    });

    return () => {
      activeObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  return (
    <nav className="wm-chapter-nav" aria-label="Conference chapters">
      <span className="wm-chapter-nav__rail" aria-hidden="true" />
      {CHAPTERS.map((chapter) => (
        <a
          key={chapter.id}
          href={`#${chapter.id}`}
          aria-label={chapter.label}
          aria-current={activeChapter === chapter.id ? 'location' : undefined}
          className={`wm-chapter-nav__link ${activeChapter === chapter.id ? 'is-active' : ''}`}
        >
          <span className="wm-chapter-nav__number">{chapter.number}</span>
          <span className="wm-chapter-nav__label">{chapter.label}</span>
          <span className="wm-chapter-nav__dot" aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
