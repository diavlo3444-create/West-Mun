import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Upload,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Building2,
  Award,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { safeUrl } from '../lib/safe';
import {
  Panel,
  PanelHeader,
  PageHeader,
  EmptyState,
  Notice,
  btnPrimary,
  btnSecondary,
  btnGhost,
  btnDanger,
  inputCls,
  labelCls,
  iconButtonCls,
} from '../dashboard/ui';

export interface SponsorItem {
  id: string;
  name: string;
  tier: string;
  logo_url: string;
  website_url: string;
  description?: string;
  sort_order: number;
  published: boolean;
  created_at?: string;
}

const TIER_SUGGESTIONS = [
  'Title Sponsor',
  'Strategic Partner',
  'Platinum Sponsor',
  'Gold Sponsor',
  'Silver Sponsor',
  'Bronze Sponsor',
  'Official Partner',
  'Media Partner',
  'Institutional Partner',
];

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

function cleanFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'logo';
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'png';
  return `${base}.${ext}`;
}

export const HeadSponsorsManager: React.FC<{
  headName?: string;
  headEmail?: string;
}> = ({ headName, headEmail }) => {
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit / Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tier: 'Gold Sponsor',
    logo_url: '',
    website_url: '',
    description: '',
    sort_order: 1,
    published: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSponsors = useCallback(async () => {
    if (!supabase) {
      setError('Supabase connection is not available.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('sponsors')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (fetchErr) {
        if (fetchErr.code === '42501' || /policy|permission/i.test(fetchErr.message)) {
          setError(
            'Row Level Security prevented loading sponsors. Verify that your PR department head assignment is active and the RLS migration has been executed.',
          );
        } else {
          setError(fetchErr.message || 'Failed to load sponsors list.');
        }
        setSponsors([]);
      } else {
        setSponsors((data as SponsorItem[]) || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error loading sponsors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSponsors();
  }, [loadSponsors]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const nextOrder = sponsors.reduce((max, s) => Math.max(max, s.sort_order || 0), 0) + 1;
    setFormData({
      name: '',
      tier: 'Gold Sponsor',
      logo_url: '',
      website_url: '',
      description: '',
      sort_order: nextOrder,
      published: true,
    });
    setFormErrors({});
    setUploadError(null);
    setEditingId(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (sp: SponsorItem) => {
    setFormData({
      name: sp.name,
      tier: sp.tier || '',
      logo_url: sp.logo_url || '',
      website_url: sp.website_url || '',
      description: sp.description || '',
      sort_order: sp.sort_order ?? 0,
      published: sp.published ?? true,
    });
    setFormErrors({});
    setUploadError(null);
    setEditingId(sp.id);
    setIsModalOpen(true);
  };

  // Handle Logo Upload to 'site-files'
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supabase) return;

    setUploadError(null);

    if (!ALLOWED_MIME.includes(file.type)) {
      setUploadError('Allowed image formats: JPG, PNG, or WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError('Image size exceeds 15 MB limit.');
      return;
    }

    setIsUploading(true);
    try {
      const path = `sponsors/${Date.now()}-${cleanFileName(file.name)}`;
      const { error: upErr } = await supabase.storage.from('site-files').upload(path, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600',
      });

      if (upErr) {
        if (upErr.message?.includes('row-level security') || /policy/i.test(upErr.message)) {
          throw new Error('Upload blocked by storage policy. Ensure PR head upload RLS policy is active.');
        }
        throw new Error(upErr.message || 'Failed to upload image.');
      }

      const { data: pubData } = supabase.storage.from('site-files').getPublicUrl(path);
      setFormData((prev) => ({ ...prev, logo_url: pubData.publicUrl }));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error uploading logo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Validate form
  const validateForm = () => {
    const errs: Record<string, string> = {};
    const name = formData.name.trim();
    if (!name) {
      errs.name = 'Sponsor name is required.';
    } else if (name.length > 160) {
      errs.name = 'Name must be under 160 characters.';
    }

    if (formData.tier && formData.tier.length > 60) {
      errs.tier = 'Tier label must be under 60 characters.';
    }

    if (formData.logo_url && formData.logo_url.trim()) {
      if (!safeUrl(formData.logo_url.trim())) {
        errs.logo_url = 'Enter a valid image URL starting with https://';
      }
    }

    if (formData.website_url && formData.website_url.trim()) {
      if (!safeUrl(formData.website_url.trim())) {
        errs.website_url = 'Enter a valid web link starting with https://';
      }
    }

    if (formData.description && formData.description.length > 1500) {
      errs.description = 'Description must be under 1500 characters.';
    }

    return errs;
  };

  // Submit save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const errs = validateForm();
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: formData.name.trim(),
      tier: formData.tier.trim(),
      logo_url: formData.logo_url.trim(),
      website_url: formData.website_url.trim(),
      description: formData.description.trim(),
      sort_order: Number(formData.sort_order) || 0,
      published: Boolean(formData.published),
    };

    try {
      if (editingId) {
        // Update
        const { error: updateErr } = await supabase
          .from('sponsors')
          .update(payload)
          .eq('id', editingId);

        if (updateErr) throw updateErr;
        setSuccess(`Updated "${payload.name}" successfully.`);
      } else {
        // Insert
        const { error: insertErr } = await supabase.from('sponsors').insert([payload]);

        if (insertErr) throw insertErr;
        setSuccess(`Added new sponsor "${payload.name}" successfully.`);
      }

      setIsModalOpen(false);
      await loadSponsors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save sponsor.';
      setError(
        msg.includes('42501') || /policy|permission/i.test(msg)
          ? 'Permission denied by Row Level Security. Ensure your PR department head account is active in department_heads.'
          : msg,
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Delete sponsor
  const handleDelete = async (sp: SponsorItem) => {
    if (!supabase) return;
    const confirmDelete = window.confirm(
      `Permanently delete "${sp.name}"? This will immediately remove them from the public website.`,
    );
    if (!confirmDelete) return;

    setError(null);
    setSuccess(null);

    try {
      const { error: delErr } = await supabase.from('sponsors').delete().eq('id', sp.id);

      if (delErr) throw delErr;
      setSuccess(`Removed "${sp.name}".`);
      await loadSponsors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete sponsor.';
      setError(msg);
    }
  };

  // Toggle published state
  const handleTogglePublished = async (sp: SponsorItem) => {
    if (!supabase) return;
    const newPublished = !sp.published;

    try {
      const { error: toggleErr } = await supabase
        .from('sponsors')
        .update({ published: newPublished })
        .eq('id', sp.id);

      if (toggleErr) throw toggleErr;
      setSponsors((prev) =>
        prev.map((item) => (item.id === sp.id ? { ...item, published: newPublished } : item)),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update publication status.');
    }
  };

  // Move sort order up / down
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (!supabase) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sponsors.length) return;

    const current = sponsors[index];
    const adjacent = sponsors[targetIndex];

    const currentOrder = current.sort_order;
    const adjacentOrder = adjacent.sort_order;

    // Swap sort orders
    const newCurrentOrder = currentOrder === adjacentOrder ? targetIndex : adjacentOrder;
    const newAdjacentOrder = currentOrder === adjacentOrder ? index : currentOrder;

    try {
      await Promise.all([
        supabase.from('sponsors').update({ sort_order: newCurrentOrder }).eq('id', current.id),
        supabase.from('sponsors').update({ sort_order: newAdjacentOrder }).eq('id', adjacent.id),
      ]);
      await loadSponsors();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update display order.');
    }
  };

  const publishedCount = useMemo(() => sponsors.filter((s) => s.published).length, [sponsors]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Public Relations & External Affairs"
        title="Sponsors & Partners Management"
        description="Curate and manage official corporate sponsors, institutional partners, and diplomatic patrons displayed on the WEST MUN public website."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={loadSponsors}
              disabled={loading}
              title="Refresh list"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button type="button" className={btnPrimary} onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5" />
              <span>Add Sponsor</span>
            </button>
          </div>
        }
      />

      {error && (
        <Notice tone="error" title="Action failed">
          {error}
        </Notice>
      )}

      {success && (
        <Notice tone="success" title="Success">
          {success}
        </Notice>
      )}

      {/* Overview Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-[10px] border border-white/[0.08] bg-[#0c0c0f]">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400">
            Total Records
          </span>
          <p className="mt-1 text-2xl font-serif text-white">{sponsors.length}</p>
        </div>
        <div className="p-4 rounded-[10px] border border-emerald-500/20 bg-emerald-950/10">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-400">
            Live on Website
          </span>
          <p className="mt-1 text-2xl font-serif text-emerald-300">{publishedCount}</p>
        </div>
        <div className="p-4 rounded-[10px] border border-neutral-700/30 bg-[#0c0c0f]">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400">
            Drafts / Hidden
          </span>
          <p className="mt-1 text-2xl font-serif text-neutral-300">
            {sponsors.length - publishedCount}
          </p>
        </div>
        <div className="p-4 rounded-[10px] border border-[#d4af37]/20 bg-[#d4af37]/5">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#d4af37]">
            Active PR Scope
          </span>
          <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
            Full create, edit, logo upload, reorder, and deletion privileges.
          </p>
        </div>
      </div>

      {/* Sponsors Table / List Panel */}
      <Panel>
        <PanelHeader
          eyebrow="Live Directory"
          title="Configured Sponsors & Partners"
          description="Drag or use arrow buttons to arrange priority display order on the homepage."
        />

        {loading ? (
          <div className="p-12 text-center text-sm text-neutral-400 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
            <span>Loading sponsor records from database…</span>
          </div>
        ) : sponsors.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Building2}
              title="No sponsors added yet"
              description="Click 'Add Sponsor' above to register the first partner logo, tier, description, and link."
              action={
                <button type="button" className={btnPrimary} onClick={handleOpenCreate}>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add First Sponsor</span>
                </button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {sponsors.map((sp, idx) => {
              const safeLogo = safeUrl(sp.logo_url);
              const safeWeb = safeUrl(sp.website_url);

              return (
                <div
                  key={sp.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-colors ${
                    sp.published ? 'hover:bg-white/[0.015]' : 'bg-black/30 opacity-70'
                  }`}
                >
                  {/* Left: Reorder Controls + Logo Thumbnail + Details */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="flex flex-col gap-1 shrink-0 pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        className={iconButtonCls}
                        title="Move higher in display order"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(idx, 'down')}
                        disabled={idx === sponsors.length - 1}
                        className={iconButtonCls}
                        title="Move lower in display order"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Logo Box */}
                    <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded border border-white/[0.1] bg-[#141418] p-1.5 text-center">
                      {safeLogo ? (
                        <img
                          src={safeLogo}
                          alt={sp.name}
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-neutral-500" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-white tracking-wide truncate">
                          {sp.name}
                        </h3>
                        {sp.tier && (
                          <span className="inline-flex items-center rounded border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.12em] text-[#d4af37]">
                            {sp.tier}
                          </span>
                        )}
                        {!sp.published && (
                          <span className="inline-flex items-center gap-1 rounded border border-neutral-700 bg-neutral-800/80 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-neutral-400">
                            <EyeOff className="h-2.5 w-2.5" />
                            Hidden Draft
                          </span>
                        )}
                      </div>

                      {sp.description && (
                        <p className="mt-1 text-xs text-neutral-400 line-clamp-1 max-w-xl">
                          {sp.description}
                        </p>
                      )}

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                        <span>Display Order: #{sp.sort_order}</span>
                        {safeWeb && (
                          <a
                            href={safeWeb}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#d4af37] hover:underline"
                          >
                            <span>Website link</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => handleTogglePublished(sp)}
                      title={sp.published ? 'Hide from public site' : 'Publish to website'}
                    >
                      {sp.published ? (
                        <>
                          <Eye className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="hidden sm:inline">Published</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-neutral-500" />
                          <span className="hidden sm:inline">Draft</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => handleOpenEdit(sp)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      className={btnDanger}
                      onClick={() => handleDelete(sp)}
                      title="Permanently delete"
                      aria-label="Delete sponsor"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-[12px] border border-[#d4af37]/40 bg-[#0f0f13] shadow-2xl p-6 sm:p-7 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#d4af37]">
                  PR Department Scope
                </span>
                <h2 className="text-lg font-serif text-white">
                  {editingId ? 'Edit Sponsor & Partner Record' : 'Register New Sponsor / Partner'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Name */}
              <div>
                <label className={labelCls}>
                  Sponsor / Partner Name <span className="text-[#d4af37]">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  className={inputCls}
                  placeholder="e.g. Al-Mansour Petrochemicals / United Nations Association"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-rose-400">{formErrors.name}</p>
                )}
              </div>

              {/* Tier */}
              <div>
                <label className={labelCls}>Sponsorship Tier / Category</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={60}
                    className={inputCls}
                    placeholder="e.g. Gold Sponsor, Official Partner"
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  />
                  <select
                    className="rounded-md border border-white/[0.1] bg-[#101013] px-2 text-xs text-neutral-300"
                    onChange={(e) => {
                      if (e.target.value) setFormData({ ...formData, tier: e.target.value });
                    }}
                    value=""
                  >
                    <option value="" disabled>
                      Presets…
                    </option>
                    {TIER_SUGGESTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                {formErrors.tier && (
                  <p className="mt-1 text-xs text-rose-400">{formErrors.tier}</p>
                )}
              </div>

              {/* Logo Upload + URL */}
              <div className="space-y-2">
                <label className={labelCls}>Logo Image</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>{isUploading ? 'Uploading to site-files…' : 'Upload Logo File'}</span>
                  </button>
                  <span className="text-[11px] text-neutral-400">JPG, PNG, or WebP up to 15MB</span>
                </div>

                {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}

                <div>
                  <input
                    type="url"
                    className={inputCls}
                    placeholder="Or enter direct image URL (https://...)"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  />
                  {formErrors.logo_url && (
                    <p className="mt-1 text-xs text-rose-400">{formErrors.logo_url}</p>
                  )}
                </div>

                {/* Logo Preview */}
                {formData.logo_url && safeUrl(formData.logo_url) && (
                  <div className="mt-2 flex items-center gap-3 p-3 rounded border border-white/[0.08] bg-[#141419]">
                    <div className="h-12 w-20 flex items-center justify-center p-1 bg-black/40 rounded border border-white/[0.05]">
                      <img
                        src={safeUrl(formData.logo_url)}
                        alt="Logo preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Valid logo preview
                    </span>
                  </div>
                )}
              </div>

              {/* Website URL */}
              <div>
                <label className={labelCls}>Official Website Link</label>
                <input
                  type="url"
                  className={inputCls}
                  placeholder="https://company.example.com"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                />
                {formErrors.website_url && (
                  <p className="mt-1 text-xs text-rose-400">{formErrors.website_url}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Sponsor Description / Partnership Mandate</label>
                <textarea
                  rows={3}
                  maxLength={1500}
                  className={inputCls}
                  placeholder="Brief synopsis of the sponsor's involvement, academic grant, or collaborative support."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <span className="text-[10px] text-neutral-400 block text-right">
                  {formData.description.length} / 1500 chars
                </span>
                {formErrors.description && (
                  <p className="mt-1 text-xs text-rose-400">{formErrors.description}</p>
                )}
              </div>

              {/* Display Order & Published Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className={labelCls}>Display Order Priority</label>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    className={inputCls}
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                  <span className="text-[10px] text-neutral-400">Lower numbers appear first.</span>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded border border-white/[0.08] bg-[#121217] hover:border-[#d4af37]/40">
                    <input
                      type="checkbox"
                      checked={formData.published}
                      onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                      className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-[#d4af37] focus:ring-[#d4af37]"
                    />
                    <span className="text-xs font-medium text-white">
                      Visible on Public Website
                    </span>
                  </label>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="pt-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400 block mb-1">
                  Public Website Card Preview
                </span>
                <div className="p-4 bg-[#0e0e11] border border-neutral-800/90 rounded-sm flex flex-col items-center justify-center text-center gap-2 min-h-[110px]">
                  {formData.logo_url && safeUrl(formData.logo_url) ? (
                    <img
                      src={safeUrl(formData.logo_url)}
                      alt="Preview"
                      className="max-h-14 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-sm font-serif text-white">
                      {formData.name || 'Sponsor Name'}
                    </span>
                  )}
                  {formData.tier && (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]">
                      {formData.tier}
                    </span>
                  )}
                  {formData.description && (
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 max-w-sm">
                      {formData.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className={btnPrimary} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>{editingId ? 'Update Sponsor' : 'Publish Sponsor'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
