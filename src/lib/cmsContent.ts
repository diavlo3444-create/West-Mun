import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from './supabase';
import { useSettings } from './content';
import {
  DEFAULT_CMS_CONTENT,
  type CmsCustomSection,
  type CmsRevision,
} from './cmsRegistry';

export interface CmsPillarItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface CmsHighlightItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  metrics: string;
}

export interface CmsNavLink {
  label: string;
  href: string;
}

function isPreviewContext(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const search = window.location.search || '';
    if (search.includes('preview=') || window.location.pathname === '/preview') return true;
    if (window.self !== window.top) return true;
  } catch {}
  return false;
}

function getStoredPreviewDraft(): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('westmun_cms_draft_preview') || sessionStorage.getItem('westmun_cms_draft_preview');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return null;
}

/**
 * Accesses live CMS content with reliable fallbacks to default site copy.
 * Updates in Supabase are immediately reflected when reload occurs or on state refresh.
 * When in preview mode, seamlessly incorporates uncommitted editor draft updates in real time.
 */
export function useCmsContent() {
  const settings = useSettings();
  const [previewDraft, setPreviewDraft] = useState<Record<string, string> | null>(() => {
    return isPreviewContext() ? getStoredPreviewDraft() : null;
  });

  useEffect(() => {
    if (!isPreviewContext()) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'WESTMUN_CMS_PREVIEW_UPDATE' && e.data.draft) {
        setPreviewDraft(e.data.draft);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'westmun_cms_draft_preview' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') setPreviewDraft(parsed);
        } catch {}
      }
    };

    const handleCustomEvent = (e: Event) => {
      const custom = (e as CustomEvent).detail?.draft;
      if (custom) setPreviewDraft(custom);
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('westmun:draft_updated', handleCustomEvent);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('westmun:draft_updated', handleCustomEvent);
    };
  }, []);

  // Merge default CMS dictionary with whatever is loaded from public.settings, plus live draft in preview
  const content = useMemo(() => {
    const merged: Record<string, string> = {
      ...DEFAULT_CMS_CONTENT,
      ...settings,
      ...(previewDraft || {}),
    };
    return merged;
  }, [settings, previewDraft]);

  // Safe accessor helper with fallback
  const t = useCallback(
    (key: string, fallback?: string): string => {
      const val = content[key];
      if (val !== undefined && val !== null && val.trim() !== '') {
        return val;
      }
      return fallback !== undefined ? fallback : DEFAULT_CMS_CONTENT[key] ?? '';
    },
    [content],
  );

  // Parsed structured items
  const navLinks: CmsNavLink[] = useMemo(() => {
    try {
      const raw = content['nav_links_json'];
      if (!raw) return JSON.parse(DEFAULT_CMS_CONTENT['nav_links_json']);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : JSON.parse(DEFAULT_CMS_CONTENT['nav_links_json']);
    } catch {
      return JSON.parse(DEFAULT_CMS_CONTENT['nav_links_json']);
    }
  }, [content]);

  const introPillars: CmsPillarItem[] = useMemo(() => {
    try {
      const raw = content['intro_pillars_json'];
      if (!raw) return JSON.parse(DEFAULT_CMS_CONTENT['intro_pillars_json']);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : JSON.parse(DEFAULT_CMS_CONTENT['intro_pillars_json']);
    } catch {
      return JSON.parse(DEFAULT_CMS_CONTENT['intro_pillars_json']);
    }
  }, [content]);

  const highlightItems: CmsHighlightItem[] = useMemo(() => {
    try {
      const raw = content['highlights_items_json'];
      if (!raw) return JSON.parse(DEFAULT_CMS_CONTENT['highlights_items_json']);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : JSON.parse(DEFAULT_CMS_CONTENT['highlights_items_json']);
    } catch {
      return JSON.parse(DEFAULT_CMS_CONTENT['highlights_items_json']);
    }
  }, [content]);

  const customSections: CmsCustomSection[] = useMemo(() => {
    try {
      const raw = content['cms_custom_sections_json'];
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((s) => s.visible !== false) : [];
    } catch {
      return [];
    }
  }, [content]);

  return {
    content,
    t,
    navLinks,
    introPillars,
    highlightItems,
    customSections,
  };
}
