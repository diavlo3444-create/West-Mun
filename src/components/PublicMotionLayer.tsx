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
 * Public-only chapter navigation and progressive reveals.
 * The scroll-controlled hero/video and intro animation are deliberately excluded.
 * All content remains visible and usable when motion APIs are unavailable.
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

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      return () => activeObserver.disconnect();
    }

    const sectionSelector = [
      '#intro', '#highlights', '#about', '#committees', '#schedule',
      '#secretariat', '#register', '#faq', '#contact', '#announcements',
      '#sponsors', '#documents'
    ].join(',');

    const sections = Array.from(document.querySelectorAll<HTMLElement>(sectionSelector));
    const candidates: HTMLElement[] = [];

    sections.forEach((section) => {
      const header = section.querySelector<HTMLElement>('h1, h2');
      const intro = section.querySelector<HTMLElement>(':scope > div > p, :scope > div > div > p');
      if (header) candidates.push(header);
      if (intro && intro !== header) candidates.push(intro);
      section.querySelectorAll<HTMLElement>(
        ':scope > div > div.grid > *, :scope > div > div.flex > *, [data-motion-item]'
      ).forEach((item) => candidates.push(item));
    });

    const unique = Array.from(new Set(candidates)).filter((el) =>
      !el.closest('#hero, [data-opening-intro], .wm-app, form')
    );

    unique.forEach((el, index) => {
      el.classList.add('wm-cinematic-item');
      el.style.setProperty('--wm-reveal-delay', `${Math.min(index % 4, 3) * 65}ms`);
    });

    document.body.classList.add('westmun-motion-ready');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('wm-cinematic-in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

    unique.forEach((el) => revealObserver.observe(el));

    return () => {
      activeObserver.disconnect();
      revealObserver.disconnect();
      document.body.classList.remove('westmun-motion-ready');
      unique.forEach((el) => {
        el.classList.remove('wm-cinematic-item', 'wm-cinematic-in');
        el.style.removeProperty('--wm-reveal-delay');
      });
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
