import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

type ObserverCallback = (inView: boolean) => void;

interface ObserverInstance {
  observer: IntersectionObserver;
  callbacks: Map<Element, ObserverCallback>;
}

const observerPool = new Map<string, ObserverInstance>();

function getPooledObserver(threshold: number, rootMargin: string): ObserverInstance {
  const key = `${threshold}_${rootMargin}`;
  let pool = observerPool.get(key);

  if (!pool) {
    const callbacks = new Map<Element, ObserverCallback>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const cb = callbacks.get(entry.target);
          if (cb) {
            cb(entry.isIntersecting);
          }
        }
      },
      { threshold, rootMargin }
    );

    pool = { observer, callbacks };
    observerPool.set(key, pool);
  }

  return pool;
}

export function useInView<T extends HTMLElement = HTMLElement>(options: UseInViewOptions = {}) {
  const { threshold = 0.08, rootMargin = '0px 0px -50px 0px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Honor accessibility: reduced motion users get instant display
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsInView(true);
      return;
    }

    // Fallback if browser doesn't support IntersectionObserver
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const { observer, callbacks } = getPooledObserver(threshold, rootMargin);

    const callback: ObserverCallback = (inView) => {
      if (inView) {
        setIsInView(true);
        if (triggerOnce) {
          observer.unobserve(element);
          callbacks.delete(element);
        }
      } else if (!triggerOnce) {
        setIsInView(false);
      }
    };

    callbacks.set(element, callback);
    observer.observe(element);

    return () => {
      observer.unobserve(element);
      callbacks.delete(element);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isInView };
}

