import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  Globe,
  History,
  Info,
  Layers,
  Layout,
  Maximize2,
  Minus,
  Monitor,
  Move,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { invalidateSettingsCache } from '../lib/content';
import {
  CMS_SECTIONS,
  DEFAULT_CMS_CONTENT,
  type CmsCustomSection,
  type CmsFieldDef,
  type CmsRevision,
  type CmsSectionDef,
} from '../lib/cmsRegistry';
import {
  btnDanger,
  btnGhost,
  btnGold,
  cardCls,
  errCls,
  explainError,
  helpCls,
  inputCls,
  labelCls,
} from './ui';
import type { Session } from '@supabase/supabase-js';

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

interface WebsiteEditorProps {
  session?: Session | null;
  /** Allow department heads or organizers to edit and publish */
  authorName?: string;
  authorEmail?: string;
}

export const WebsiteEditor: React.FC<WebsiteEditorProps> = ({
  session,
  authorName = 'Editor',
  authorEmail = '',
}) => {
  const [published, setPublished] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [activeSectionId, setActiveSectionId] = useState<string>('navbar');
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<CmsRevision[]>([]);
  const [customSections, setCustomSections] = useState<CmsCustomSection[]>([]);
  const [newSectionModal, setNewSectionModal] = useState(false);
  const [newCardModal, setNewCardModal] = useState<string | null>(null);

  // Live preview frame ref and key
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewKey, setPreviewKey] = useState(1);

  // Synchronize draft and custom sections with the live preview iframe & storage
  const syncPreviewDraft = useCallback(
    (draftData: Record<string, string>, customSecs: CmsCustomSection[]) => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('westmun_cms_draft_preview', JSON.stringify(draftData));
          localStorage.setItem('westmun_cms_custom_sections_preview', JSON.stringify(customSecs));
          window.dispatchEvent(
            new CustomEvent('westmun:draft_updated', {
              detail: { draft: draftData, customSections: customSecs },
            })
          );
        }
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            {
              type: 'WESTMUN_CMS_PREVIEW_UPDATE',
              draft: draftData,
              customSections: customSecs,
            },
            '*'
          );
        }
      } catch (e) {
        console.warn('[WebsiteEditor] Could not sync preview update:', e);
      }
    },
    []
  );

  // Scroll live preview iframe when active section changes
  useEffect(() => {
    if (iframeRef.current?.contentWindow && activeSectionId) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'WESTMUN_CMS_PREVIEW_SCROLL',
          sectionId: activeSectionId,
        },
        '*'
      );
    }
  }, [activeSectionId]);

  // New section form state
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionEyebrow, setNewSectionEyebrow] = useState('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('');
  const [newSectionLayout, setNewSectionLayout] = useState<'cards' | 'split' | 'banner'>('cards');

  // New card form state
  const [cardTitle, setCardTitle] = useState('');
  const [cardDesc, setCardDesc] = useState('');
  const [cardBadge, setCardBadge] = useState('');
  const [cardLink, setCardLink] = useState('');
  const [cardLinkLabel, setCardLinkLabel] = useState('');

  // 1. Load settings & draft from Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    let initialSettings: Record<string, string> = { ...DEFAULT_CMS_CONTENT };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('settings').select('key,value');
        if (!error && data) {
          data.forEach((r: { key: string; value: string }) => {
            initialSettings[r.key] = r.value ?? '';
          });
        }
      } catch {}
    }

    // Parse custom sections
    let parsedCustomSections: CmsCustomSection[] = [];
    try {
      const rawCustom = initialSettings['cms_custom_sections_json'];
      if (rawCustom) {
        parsedCustomSections = JSON.parse(rawCustom);
        setCustomSections(parsedCustomSections);
      }
    } catch {
      setCustomSections([]);
    }

    // Parse revision history
    try {
      const rawHistory = initialSettings['cms_version_history'];
      if (rawHistory) {
        setRevisions(JSON.parse(rawHistory));
      }
    } catch {
      setRevisions([]);
    }

    // Check for saved draft
    let activeDraft = { ...initialSettings };
    try {
      const rawDraft = initialSettings['cms_draft_data'];
      if (rawDraft) {
        const parsedDraft = JSON.parse(rawDraft);
        if (parsedDraft && typeof parsedDraft === 'object') {
          activeDraft = { ...initialSettings, ...parsedDraft };
        }
      }
    } catch {}

    setPublished(initialSettings);
    setDraft(activeDraft);
    setLoading(false);
    syncPreviewDraft(activeDraft, parsedCustomSections);
  }, [syncPreviewDraft]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Track modified fields count
  const unsavedDiffs = useMemo(() => {
    const diffKeys: string[] = [];
    for (const [k, v] of Object.entries(draft)) {
      if (k === 'cms_draft_data' || k === 'cms_version_history') continue;
      if ((published[k] ?? '') !== (v ?? '')) {
        diffKeys.push(k);
      }
    }
    return diffKeys;
  }, [draft, published]);

  const hasUnsavedChanges = unsavedDiffs.length > 0;

  // Active section definition
  const activeSection = useMemo(() => {
    return CMS_SECTIONS.find((s) => s.id === activeSectionId) ?? CMS_SECTIONS[0];
  }, [activeSectionId]);

  // Field change handler: updates local draft and pushes live update to preview
  const handleFieldChange = (key: string, value: string) => {
    setDraft((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };
      syncPreviewDraft(next, customSections);
      return next;
    });
  };

  // Discard changes
  const handleDiscard = () => {
    if (confirm('Discard all unsaved changes and revert to currently published content?')) {
      setDraft({ ...published });
      syncPreviewDraft(published, customSections);
      setNotice({ ok: true, message: 'All changes discarded.' });
    }
  };

  // Save draft without publishing
  const handleSaveDraft = async () => {
    setSaving(true);
    setNotice(null);

    try {
      // Extract differences to save draft payload
      const draftPayload = JSON.stringify(draft);
      if (supabase) {
        const { error } = await supabase.from('settings').upsert(
          [
            { key: 'cms_draft_data', value: draftPayload },
            { key: 'cms_draft_updated_at', value: new Date().toISOString() },
            { key: 'cms_draft_author', value: authorEmail || authorName },
          ],
          { onConflict: 'key' },
        );
        if (error) {
          throw new Error(explainError(error));
        }
      }
      setNotice({ ok: true, message: 'Draft saved successfully. Visitors will not see changes until published.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save draft.';
      setNotice({ ok: false, message: msg });
    } finally {
      setSaving(false);
    }
  };

  // Publish changes live
  const handlePublish = async () => {
    setPublishing(true);
    setNotice(null);

    try {
      const timestamp = new Date().toISOString();
      const updatedKeys = Object.entries(draft).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : String(value ?? ''),
      }));

      // Snapshot for version history
      const newRev: CmsRevision = {
        id: `rev-${Date.now()}`,
        timestamp,
        authorName: authorName || 'Editor',
        authorEmail: authorEmail || 'editor@westmun.org',
        summary: `Published updates to ${unsavedDiffs.length} content fields.`,
        data: { ...published },
      };

      const nextHistory = [newRev, ...revisions].slice(0, 20); // Keep last 20 revisions
      updatedKeys.push({
        key: 'cms_version_history',
        value: JSON.stringify(nextHistory),
      });
      updatedKeys.push({
        key: 'cms_published_at',
        value: timestamp,
      });
      // Clear current draft
      updatedKeys.push({
        key: 'cms_draft_data',
        value: '',
      });

      if (supabase) {
        const { error } = await supabase
          .from('settings')
          .upsert(updatedKeys, { onConflict: 'key' });

        if (error) {
          throw new Error(explainError(error));
        }
      }

      invalidateSettingsCache();

      setPublished({ ...draft });
      setRevisions(nextHistory);
      setNotice({
        ok: true,
        message: 'Published successfully! All changes are now live across all visitors and devices.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Publishing failed.';
      setNotice({ ok: false, message: msg });
    } finally {
      setPublishing(false);
    }
  };

  // Restore revision
  const handleRestoreRevision = async (rev: CmsRevision) => {
    if (confirm(`Restore snapshot published by ${rev.authorName} on ${new Date(rev.timestamp).toLocaleString()}?`)) {
      setDraft((prev) => ({
        ...prev,
        ...rev.data,
      }));
      setHistoryOpen(false);
      setNotice({
        ok: true,
        message: `Restored snapshot from ${new Date(rev.timestamp).toLocaleDateString()}. Remember to click Publish to make it live.`,
      });
    }
  };

  // Structured items helpers
  // 1. Pillars
  const currentPillars = useMemo(() => {
    try {
      const raw = draft['intro_pillars_json'] || DEFAULT_CMS_CONTENT['intro_pillars_json'];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, [draft]);

  const updatePillars = (items: any[]) => {
    handleFieldChange('intro_pillars_json', JSON.stringify(items));
  };

  // 2. Highlights
  const currentHighlights = useMemo(() => {
    try {
      const raw = draft['highlights_items_json'] || DEFAULT_CMS_CONTENT['highlights_items_json'];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, [draft]);

  const updateHighlights = (items: any[]) => {
    handleFieldChange('highlights_items_json', JSON.stringify(items));
  };

  // 3. Nav links
  const currentNavLinks = useMemo(() => {
    try {
      const raw = draft['nav_links_json'] || DEFAULT_CMS_CONTENT['nav_links_json'];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, [draft]);

  const updateNavLinks = (items: any[]) => {
    handleFieldChange('nav_links_json', JSON.stringify(items));
  };

  // 4. Custom sections management
  const addCustomSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSec: CmsCustomSection = {
      id: `custom-sec-${Date.now()}`,
      title: newSectionTitle.trim(),
      eyebrow: newSectionEyebrow.trim(),
      subtitle: newSectionSubtitle.trim(),
      layout: newSectionLayout,
      visible: true,
      items: [],
    };
    const next = [...customSections, newSec];
    setCustomSections(next);
    handleFieldChange('cms_custom_sections_json', JSON.stringify(next));
    setNewSectionModal(false);
    setNewSectionTitle('');
    setNewSectionEyebrow('');
    setNewSectionSubtitle('');
    setActiveSectionId('custom_sections_group');
    setNotice({ ok: true, message: `Created custom section "${newSec.title}".` });
  };

  const removeCustomSection = (id: string) => {
    if (confirm('Delete this custom section?')) {
      const next = customSections.filter((s) => s.id !== id);
      setCustomSections(next);
      handleFieldChange('cms_custom_sections_json', JSON.stringify(next));
    }
  };

  const toggleCustomSectionVisibility = (id: string) => {
    const next = customSections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s));
    setCustomSections(next);
    handleFieldChange('cms_custom_sections_json', JSON.stringify(next));
  };

  const addCardToSection = (sectionId: string) => {
    if (!cardTitle.trim()) return;
    const newCard = {
      id: `card-${Date.now()}`,
      title: cardTitle.trim(),
      description: cardDesc.trim(),
      badge: cardBadge.trim(),
      linkUrl: cardLink.trim(),
      linkLabel: cardLinkLabel.trim() || 'Learn more',
    };
    const next = customSections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, items: [...s.items, newCard] };
      }
      return s;
    });
    setCustomSections(next);
    handleFieldChange('cms_custom_sections_json', JSON.stringify(next));
    setNewCardModal(null);
    setCardTitle('');
    setCardDesc('');
    setCardBadge('');
    setCardLink('');
    setCardLinkLabel('');
  };

  const removeCardFromSection = (sectionId: string, cardId: string) => {
    const next = customSections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, items: s.items.filter((c) => c.id !== cardId) };
      }
      return s;
    });
    setCustomSections(next);
    handleFieldChange('cms_custom_sections_json', JSON.stringify(next));
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-neutral-400 flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-[#d4af37]" />
        <span>Loading CMS registry and live content…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[650px] bg-[#070709] text-white -m-4 sm:-m-6 border border-neutral-800/80 rounded-md overflow-hidden shadow-2xl">
      {/* ========================================================
          1. CMS TOP BAR & PUBLISHING CONTROLS
         ======================================================== */}
      <header className="px-4 py-3 bg-[#0d0d10] border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#16161c] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-white font-serif">
                Website Content Manager
              </h1>
              {hasUnsavedChanges ? (
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-950/50 border border-amber-500/40 rounded-full animate-pulse">
                  {unsavedDiffs.length} Unsaved {unsavedDiffs.length === 1 ? 'change' : 'changes'}
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-full">
                  All synced
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">
              Visual content management with draft preview, version rollbacks, and instant publishing.
            </p>
          </div>
        </div>

        {/* Viewport switch & actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Viewport mode toggle */}
          <div className="hidden md:flex items-center bg-[#141418] border border-neutral-800 rounded-sm p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`px-2.5 py-1 rounded-sm flex items-center gap-1.5 transition-colors ${
                viewport === 'desktop'
                  ? 'bg-[#d4af37] text-black font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`px-2.5 py-1 rounded-sm flex items-center gap-1.5 transition-colors ${
                viewport === 'tablet'
                  ? 'bg-[#d4af37] text-black font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Tablet View"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`px-2.5 py-1 rounded-sm flex items-center gap-1.5 transition-colors ${
                viewport === 'mobile'
                  ? 'bg-[#d4af37] text-black font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          {/* History modal toggle */}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white bg-[#141418] border border-neutral-700 hover:border-neutral-500 rounded-sm flex items-center gap-1.5 transition-colors"
            title="Version History & Revisions"
          >
            <History className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="hidden sm:inline">History</span>
          </button>

          {/* Discard changes */}
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              className="px-2.5 py-1.5 text-xs text-rose-300 hover:text-rose-200 bg-rose-950/30 border border-rose-800/50 hover:border-rose-600 rounded-sm flex items-center gap-1.5 transition-colors"
              title="Discard unsaved changes"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Discard</span>
            </button>
          )}

          {/* Save Draft */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || !hasUnsavedChanges}
            className="px-3 py-1.5 text-xs font-medium text-neutral-200 bg-[#16161c] border border-neutral-700 hover:border-[#d4af37]/60 hover:text-white rounded-sm flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Draft</span>
          </button>

          {/* Publish Live */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || (!hasUnsavedChanges && !draft['cms_draft_data'])}
            className="px-3.5 py-1.5 text-xs font-semibold text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_2px_12px_rgba(212,175,55,0.25)] flex items-center gap-1.5 disabled:opacity-40"
          >
            {publishing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Publish Live</span>
          </button>
        </div>
      </header>

      {/* Notice alert */}
      {notice && (
        <div
          className={`px-4 py-2.5 text-xs border-b flex items-center justify-between ${
            notice.ok
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-neutral-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================
          2. MAIN WORKSPACE: 3-PANE LAYOUT
             Left: Section Tree
             Middle: Section Editor Form
             Right: Live Viewport Preview
         ======================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Section Tree Sidebar */}
        <aside className="w-56 sm:w-64 border-r border-neutral-800 bg-[#09090b] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-neutral-800/80 sticky top-0 bg-[#09090b] z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search sections…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#121215] border border-neutral-800 rounded-sm text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37]/60"
              />
            </div>
          </div>

          <div className="p-2 space-y-1 flex-1">
            <span className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
              Public Website Sections
            </span>
            {CMS_SECTIONS.filter(
              (s) =>
                !searchQuery.trim() ||
                s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.description.toLowerCase().includes(searchQuery.toLowerCase()),
            ).map((section) => {
              const isSelected = activeSectionId === section.id;
              // Check if any field in this section is modified
              const modifiedCount = section.fields.filter(
                (f) => (published[f.key] ?? '') !== (draft[f.key] ?? ''),
              ).length;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-sm text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-[#181820] text-[#d4af37] font-medium border-l-2 border-[#d4af37]'
                      : 'text-neutral-300 hover:bg-[#121215] hover:text-white'
                  }`}
                >
                  <span className="truncate">{section.label}</span>
                  {modifiedCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Modified" />
                  )}
                </button>
              );
            })}

            {/* Custom Sections trigger */}
            <div className="pt-3 mt-3 border-t border-neutral-800/80">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  Custom Sections
                </span>
                <button
                  type="button"
                  onClick={() => setNewSectionModal(true)}
                  className="text-xs text-[#d4af37] hover:text-[#f3e5ab] flex items-center gap-1"
                  title="Create new custom section"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>

              {customSections.map((sec) => (
                <div
                  key={sec.id}
                  className="px-2.5 py-1.5 rounded-sm text-xs flex items-center justify-between text-neutral-400 hover:text-white hover:bg-[#121215]"
                >
                  <span className="truncate">{sec.title}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleCustomSectionVisibility(sec.id)}
                      className={`text-[10px] ${sec.visible ? 'text-emerald-400' : 'text-neutral-600'}`}
                      title={sec.visible ? 'Visible' : 'Hidden'}
                    >
                      {sec.visible ? 'On' : 'Off'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCustomSection(sec.id)}
                      className="text-neutral-500 hover:text-rose-400 p-0.5"
                      title="Delete custom section"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick link to Structured Tables */}
          <div className="p-3 border-t border-neutral-800 bg-[#0d0d10] text-[11px] text-neutral-400 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">
              Structured Tables
            </span>
            <div className="text-[11px] text-neutral-400 leading-snug">
              Dais, committees, agendas, and FAQs use structured databases. Edit them under{' '}
              <span className="text-[#d4af37]">Website content</span> in the main sidebar.
            </div>
          </div>
        </aside>

        {/* Middle: Section Content Editor Form */}
        <div className="w-full lg:w-[480px] xl:w-[540px] border-r border-neutral-800 bg-[#0b0b0e] flex flex-col shrink-0 overflow-y-auto">
          {/* Section banner */}
          <div className="p-4 border-b border-neutral-800 bg-[#0f0f13] sticky top-0 z-10">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-serif font-semibold text-white">
                {activeSection.label}
              </h2>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                {activeSection.fields.length} {activeSection.fields.length === 1 ? 'field' : 'fields'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {activeSection.description}
            </p>
          </div>

          {/* Form fields */}
          <div className="p-4 sm:p-5 space-y-5 flex-1">
            {/* Structured editor for special sections */}
            {activeSection.id === 'navbar' && (
              <div className="space-y-4 pb-4 border-b border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
                    Navigation Menu Links
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const label = prompt('Link label:');
                      if (!label) return;
                      const href = prompt('Link destination (e.g. #hero):', '#');
                      if (!href) return;
                      updateNavLinks([...currentNavLinks, { label, href }]);
                    }}
                    className="text-xs text-[#d4af37] hover:text-[#f3e5ab] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Link</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {currentNavLinks.map((link: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#121216] border border-neutral-800 rounded-sm flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => {
                            const copy = [...currentNavLinks];
                            copy[idx].label = e.target.value;
                            updateNavLinks(copy);
                          }}
                          className="px-2 py-1 bg-black/60 border border-neutral-700 rounded-sm text-white"
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          value={link.href}
                          onChange={(e) => {
                            const copy = [...currentNavLinks];
                            copy[idx].href = e.target.value;
                            updateNavLinks(copy);
                          }}
                          className="px-2 py-1 bg-black/60 border border-neutral-700 rounded-sm text-neutral-300 font-mono text-[11px]"
                          placeholder="Destination"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = currentNavLinks.filter((_: any, i: number) => i !== idx);
                          updateNavLinks(copy);
                        }}
                        className="text-neutral-500 hover:text-rose-400 p-1"
                        title="Remove link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Structured editor for Intro Pillars */}
            {activeSection.id === 'intro' && (
              <div className="space-y-4 pb-4 border-b border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
                    3 Diplomatic Pillars
                  </span>
                </div>
                <div className="space-y-3">
                  {currentPillars.map((pillar: any, idx: number) => (
                    <div
                      key={pillar.id || idx}
                      className="p-3 bg-[#121216] border border-neutral-800 rounded-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-neutral-400">
                          Pillar 0{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={pillar.title}
                          onChange={(e) => {
                            const copy = [...currentPillars];
                            copy[idx].title = e.target.value;
                            updatePillars(copy);
                          }}
                          className="px-2 py-1 bg-black/60 border border-neutral-700 rounded-sm text-xs font-semibold text-white flex-1 mx-2"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={pillar.description}
                        onChange={(e) => {
                          const copy = [...currentPillars];
                          copy[idx].description = e.target.value;
                          updatePillars(copy);
                        }}
                        className="w-full px-2 py-1.5 bg-black/60 border border-neutral-700 rounded-sm text-xs text-neutral-300 resize-none leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Structured editor for Academic Highlights */}
            {activeSection.id === 'highlights' && (
              <div className="space-y-4 pb-4 border-b border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
                    Conference Discipline Cards
                  </span>
                </div>
                <div className="space-y-3">
                  {currentHighlights.map((hl: any, idx: number) => (
                    <div
                      key={hl.id || idx}
                      className="p-3 bg-[#121216] border border-neutral-800 rounded-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-neutral-400">
                          Card 0{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={hl.title}
                          onChange={(e) => {
                            const copy = [...currentHighlights];
                            copy[idx].title = e.target.value;
                            updateHighlights(copy);
                          }}
                          className="px-2 py-1 bg-black/60 border border-neutral-700 rounded-sm text-xs font-semibold text-white flex-1 mx-2"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={hl.description}
                        onChange={(e) => {
                          const copy = [...currentHighlights];
                          copy[idx].description = e.target.value;
                          updateHighlights(copy);
                        }}
                        className="w-full px-2 py-1.5 bg-black/60 border border-neutral-700 rounded-sm text-xs text-neutral-300 resize-none leading-relaxed"
                      />
                      <input
                        type="text"
                        value={hl.metrics}
                        onChange={(e) => {
                          const copy = [...currentHighlights];
                          copy[idx].metrics = e.target.value;
                          updateHighlights(copy);
                        }}
                        className="w-full px-2 py-1 bg-black/60 border border-neutral-700 rounded-sm text-[11px] font-mono text-neutral-400"
                        placeholder="Metrics summary tags"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Sections Editor Group */}
            {activeSection.id === 'custom_sections_group' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
                    Custom Created Sections
                  </h3>
                  <button
                    type="button"
                    onClick={() => setNewSectionModal(true)}
                    className="px-2.5 py-1 text-xs bg-[#d4af37] text-black font-semibold rounded-sm hover:brightness-110 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Section</span>
                  </button>
                </div>

                {customSections.length === 0 ? (
                  <div className="p-6 bg-[#121216] border border-neutral-800 rounded-sm text-center">
                    <p className="text-xs text-neutral-400 mb-3">
                      No custom sections added yet. Create sections with custom cards, banners, or split layouts.
                    </p>
                    <button
                      type="button"
                      onClick={() => setNewSectionModal(true)}
                      className="px-3 py-1.5 text-xs text-[#d4af37] border border-[#d4af37]/40 rounded-sm hover:bg-[#d4af37]/10"
                    >
                      + Add First Custom Section
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customSections.map((sec) => (
                      <div
                        key={sec.id}
                        className="p-4 bg-[#121216] border border-neutral-800 rounded-sm space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] block">
                              {sec.layout} layout · {sec.visible ? 'Visible' : 'Hidden'}
                            </span>
                            <h4 className="text-sm font-serif font-bold text-white">{sec.title}</h4>
                            {sec.subtitle && (
                              <p className="text-xs text-neutral-400 mt-0.5">{sec.subtitle}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleCustomSectionVisibility(sec.id)}
                              className={`px-2 py-0.5 text-[10px] rounded-sm font-mono ${
                                sec.visible
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              {sec.visible ? 'Active' : 'Hidden'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCustomSection(sec.id)}
                              className="p-1 text-neutral-500 hover:text-rose-400"
                              title="Delete section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Cards in this section */}
                        <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                          <div className="flex items-center justify-between text-xs text-neutral-400">
                            <span>Cards ({sec.items.length})</span>
                            <button
                              type="button"
                              onClick={() => setNewCardModal(sec.id)}
                              className="text-[#d4af37] hover:text-[#f3e5ab] text-xs flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Card</span>
                            </button>
                          </div>

                          {sec.items.map((card) => (
                            <div
                              key={card.id}
                              className="p-2.5 bg-black/50 border border-neutral-800/80 rounded-sm flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="truncate">
                                <span className="font-semibold text-white block truncate">
                                  {card.title}
                                </span>
                                <span className="text-neutral-400 text-[11px] block truncate">
                                  {card.description}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeCardFromSection(sec.id, card.id)}
                                className="text-neutral-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Standard key-value fields for this section */}
            {activeSection.fields.map((field) => {
              const val = draft[field.key] ?? '';
              const orig = published[field.key] ?? '';
              const isModified = val !== orig;

              return (
                <div key={field.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-neutral-300 flex items-center gap-1.5">
                      <span>{field.label}</span>
                      {isModified && (
                        <span className="text-[10px] font-mono text-amber-400">● modified</span>
                      )}
                    </label>
                    {field.max && (
                      <span className="text-[10px] font-mono text-neutral-500">
                        {val.length} / {field.max}
                      </span>
                    )}
                  </div>

                  {field.category === 'textarea' ? (
                    <textarea
                      rows={field.max && field.max > 400 ? 4 : 2}
                      value={val}
                      maxLength={field.max}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 bg-[#121216] border border-neutral-800 rounded-sm text-xs text-white focus:outline-none focus:border-[#d4af37]/60 leading-relaxed font-sans"
                      placeholder={field.default}
                    />
                  ) : (
                    <input
                      type="text"
                      value={val}
                      maxLength={field.max}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 bg-[#121216] border border-neutral-800 rounded-sm text-xs text-white focus:outline-none focus:border-[#d4af37]/60 font-sans"
                      placeholder={field.default}
                    />
                  )}

                  {field.help && <p className="text-[11px] text-neutral-500">{field.help}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Viewport Preview Panel */}
        <div className="flex-1 bg-[#050507] hidden lg:flex flex-col overflow-hidden items-center justify-start p-4">
          <div className="w-full flex items-center justify-between pb-3 text-xs text-neutral-400 border-b border-neutral-800/80 mb-3">
            <span className="font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Visual Inspection</span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-500">
                {viewport === 'desktop' ? '1280px' : viewport === 'tablet' ? '768px' : '375px'}
              </span>
            </span>

            <div className="inline-flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewKey((k) => k + 1)}
                className="inline-flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
                title="Reload preview iframe"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload preview</span>
              </button>

              <a
                href="/preview"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-[#d4af37] transition-colors"
              >
                <span>Open in new tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Device Frame */}
          <div
            className={`h-full border border-neutral-800 rounded-md overflow-hidden bg-[#070707] shadow-2xl transition-all duration-300 flex flex-col relative ${
              viewport === 'desktop'
                ? 'w-full max-w-5xl'
                : viewport === 'tablet'
                  ? 'w-[768px]'
                  : 'w-[375px]'
            }`}
          >
            <iframe
              key={previewKey}
              ref={iframeRef}
              src="/preview"
              title="WEST MUN Website Preview"
              className="w-full h-full border-none bg-[#070707]"
              onLoad={() => {
                syncPreviewDraft(draft, customSections);
                if (activeSectionId && iframeRef.current?.contentWindow) {
                  iframeRef.current.contentWindow.postMessage(
                    {
                      type: 'WESTMUN_CMS_PREVIEW_SCROLL',
                      sectionId: activeSectionId,
                    },
                    '*'
                  );
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          3. REVISION HISTORY DRAWER MODAL
         ======================================================== */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-[#0e0e12] border-l border-neutral-800 h-full p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-[#d4af37]" />
                  <h3 className="text-base font-serif font-bold text-white">Version History</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                Previous published versions are snapshotted here. You can roll back the website to any earlier state with one click.
              </p>

              {revisions.length === 0 ? (
                <div className="p-6 bg-[#131318] border border-neutral-800 rounded-sm text-center text-xs text-neutral-500">
                  No published revisions recorded yet. The first snapshot will appear upon your next publish.
                </div>
              ) : (
                <div className="space-y-3">
                  {revisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3.5 bg-[#131318] border border-neutral-800 rounded-sm space-y-2 hover:border-[#d4af37]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white font-serif">
                          {rev.authorName}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {new Date(rev.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">{rev.summary}</p>
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRestoreRevision(rev)}
                          className="px-2.5 py-1 text-xs text-[#d4af37] border border-[#d4af37]/40 rounded-sm hover:bg-[#d4af37]/10 flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore This Version</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-xs text-white rounded-sm"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. CREATE CUSTOM SECTION MODAL
         ======================================================== */}
      {newSectionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e0e12] border border-neutral-800 rounded-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-serif font-bold text-white">Create Custom Website Section</h3>
              <button
                type="button"
                onClick={() => setNewSectionModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Section Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Delegate Accommodations & Hotel Partners"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141418] border border-neutral-800 rounded-sm text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Eyebrow (Small Header)</label>
                <input
                  type="text"
                  placeholder="e.g. Logistics & Stay"
                  value={newSectionEyebrow}
                  onChange={(e) => setNewSectionEyebrow(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141418] border border-neutral-800 rounded-sm text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Subtitle / Overview</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Preferential room rates and transport guidance for international delegates."
                  value={newSectionSubtitle}
                  onChange={(e) => setNewSectionSubtitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141418] border border-neutral-800 rounded-sm text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Layout Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cards', 'split', 'banner'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setNewSectionLayout(l)}
                      className={`p-2.5 rounded-sm border text-center capitalize transition-colors ${
                        newSectionLayout === l
                          ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37] font-semibold'
                          : 'bg-[#141418] border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setNewSectionModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addCustomSection}
                disabled={!newSectionTitle.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-black bg-[#d4af37] rounded-sm hover:brightness-110 disabled:opacity-50"
              >
                Create Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. ADD CARD TO SECTION MODAL
         ======================================================== */}
      {newCardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e0e12] border border-neutral-800 rounded-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-serif font-bold text-white">Add Card to Section</h3>
              <button
                type="button"
                onClick={() => setNewCardModal(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Card Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Official Summit Hotel"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141418] border border-neutral-800 rounded-sm text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 5-star accommodation 5 minutes from the plenary hall with delegate shuttle service."
                  value={cardDesc}
                  onChange={(e) => setCardDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141418] border border-neutral-800 rounded-sm text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Badge Tag</label>
                <input
                  type="text"
                  placeholder="e.g. Partner Hotel"
                  value={cardBadge}
                  onChange={(e) => setCardBadge(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141418] border border-neutral-800 rounded-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Link URL</label>
                  <input
                    type="text"
                    placeholder="e.g. https://example.com"
                    value={cardLink}
                    onChange={(e) => setCardLink(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141418] border border-neutral-800 rounded-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Link Label</label>
                  <input
                    type="text"
                    placeholder="e.g. View Booking"
                    value={cardLinkLabel}
                    onChange={(e) => setCardLinkLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141418] border border-neutral-800 rounded-sm text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setNewCardModal(null)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addCardToSection(newCardModal)}
                disabled={!cardTitle.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-black bg-[#d4af37] rounded-sm hover:brightness-110 disabled:opacity-50"
              >
                Add Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
