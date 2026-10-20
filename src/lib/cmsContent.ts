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

/**
 * Accesses live CMS content with reliable fallbacks to default site copy.
 * Updates in Supabase are immediately reflected when reload occurs or on state refresh.
 */
export function useCmsContent() {
  const settings = useSettings();

  // Merge default CMS dictionary with whatever is loaded from public.settings
  const content = useMemo(() => {
    const merged: Record<string, string> = { ...DEFAULT_CMS_CONTENT, ...settings };
    return merged;
  }, [settings]);

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
