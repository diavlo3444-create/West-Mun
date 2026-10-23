import { useEffect } from 'react';

/**
 * Progressive-enhancement motion for the public homepage only.
 * The scroll-controlled hero/video and intro animation are deliberately excluded.
 * If IntersectionObserver is unavailable, content remains visible and usable.
 */
export function PublicMotionLayer() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    const sectionSelector = [
      '#intro', '#highlights', '#about', '#committees', '#schedule',
      '#secretariat', '#register', '#faq', '#contact', '#announcements',
      '#sponsors', '#documents'
    ].join(',');

    const sections = Array.from(document.querySelectorAll<HTMLElement>(sectionSelector));
    if (!sections.length) return;

    const candidates: HTMLElement[] = [];
    sections.forEach((section) => {
      const header = section.querySelector<HTMLElement>('h1, h2');
      const intro = section.querySelector<HTMLElement>(':scope > div > p, :scope > div > div > p');
      if (header) candidates.push(header);
      if (intro && intro !== header) candidates.push(intro);

      // Animate substantial content groups rather than every nested node.
      section.querySelectorAll<HTMLElement>(
        ':scope > div > div.grid > *, :scope > div > div.flex > *, [data-motion-item]'
      ).forEach((item) => candidates.push(item));
    });

    const unique = Array.from(new Set(candidates)).filter((el) => {
      // Never animate the video hero, the intro overlay, forms, or dashboard UI.
      return !el.closest('#hero, [data-opening-intro], .wm-app, form');
    });
    unique.forEach((el, index) => {
      el.classList.add('wm-cinematic-item');
      el.style.setProperty('--wm-reveal-delay', `${Math.min(index % 5, 4) * 70}ms`);
    });

    document.body.classList.add('westmun-motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('wm-cinematic-in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

    unique.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      document.body.classList.remove('westmun-motion-ready');
      unique.forEach((el) => {
        el.classList.remove('wm-cinematic-item', 'wm-cinematic-in');
        el.style.removeProperty('--wm-reveal-delay');
      });
    };
  }, []);

  return null;
}
