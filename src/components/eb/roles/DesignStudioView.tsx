import React, { useState, useMemo } from 'react';
import {
  Palette,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Search,
  Filter,
  CheckSquare,
  Square,
  FileCheck2,
  Image as ImageIcon,
  Monitor,
  Printer,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  Download,
} from 'lucide-react';
import type { EbMemberProfile } from '../../../pages/EbPortal';
import type {
  EbTask,
  EbAnnouncement,
  TaskPriority,
  TaskStatus,
} from '../../../lib/ebOperationsService';

interface DesignStudioViewProps {
  profile: EbMemberProfile;
  tasks: EbTask[];
  announcements: EbAnnouncement[];
  onNavigateTab: (tabId: string) => void;
  onAcknowledgeAnnouncement: (id: string) => void;
  onUpdateTaskStatus: (taskId: string, status: 'completed' | 'in_progress') => void;
  onToggleTaskChecklist?: (taskId: string, itemId: string) => void;
  onCreateTask?: (task: any) => Promise<void> | void;
}

type DesignCategory = 'all' | 'placards' | 'passes' | 'screens' | 'social' | 'print';

export const DesignStudioView: React.FC<DesignStudioViewProps> = ({
  profile,
  tasks,
  announcements,
  onNavigateTab,
  onAcknowledgeAnnouncement,
  onUpdateTaskStatus,
  onToggleTaskChecklist,
  onCreateTask,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DesignCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDeliverableModal, setShowNewDeliverableModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Placards & Signage');
  const [newSpec, setNewSpec] = useState('A4 Landscape · Vector CMYK 300DPI');
  const [newDeadline, setNewDeadline] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Official Brand Guidelines Quick Reference
  const BRAND_SPECS = [
    { label: 'Primary Summit Gold', value: '#D4AF37', note: 'Pantone 7555 C / CMYK 20, 30, 85, 5' },
    { label: 'Deep Noir Surface', value: '#070707', note: 'Rich Black / CMYK 60, 40, 40, 100' },
    { label: 'Diplomatic Serif', value: 'Cinzel & Cormorant', note: 'Official diplomatic headers' },
    { label: 'Technical Mono', value: 'JetBrains Mono', note: 'Code, IDs, telemetry & specifications' },
  ];

  // Category filter buttons
  const CATEGORIES = [
    { id: 'all' as const, label: 'All Studio Deliverables', icon: Layers },
    { id: 'placards' as const, label: 'Placards & Signage', icon: Printer },
    { id: 'passes' as const, label: 'Badges & Passes', icon: FileCheck2 },
    { id: 'screens' as const, label: 'Stage & LED Screens', icon: Monitor },
    { id: 'social' as const, label: 'Social & Digital Assets', icon: ImageIcon },
  ];

  // Filter tasks
  const filteredDeliverables = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.station_name.toLowerCase().includes(searchQuery.toLowerCase());

      const fullText = (t.title + ' ' + t.description + ' ' + t.station_name).toLowerCase();
      let matchCat = true;
      if (selectedCategory === 'placards') matchCat = fullText.includes('placard') || fullText.includes('signage') || fullText.includes('banner');
      else if (selectedCategory === 'passes') matchCat = fullText.includes('pass') || fullText.includes('badge') || fullText.includes('lanyard');
      else if (selectedCategory === 'screens') matchCat = fullText.includes('screen') || fullText.includes('stage') || fullText.includes('backdrop');
      else if (selectedCategory === 'social') matchCat = fullText.includes('social') || fullText.includes('tile') || fullText.includes('post');

      return matchSearch && matchCat;
    });
  }, [tasks, searchQuery, selectedCategory]);

  const approvedCount = tasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = tasks.filter((t) => t.status !== 'completed').length;

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !onCreateTask) return;
    setSubmitting(true);
    try {
      const items = newChecklist
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((text, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          text,
          completed: false,
        }));

      await onCreateTask({
        department: 'design',
        section: profile.section,
        assigned_to_user_id: profile.id,
        assigned_to_name: profile.name,
        assigned_by_name: `${profile.name} (Design Studio)`,
        title: `[${newCategory}] ${newTitle.trim()}`,
        description: `Format Spec: ${newSpec}. ${newNotes.trim()}`,
        priority: 'high',
        status: 'not_started',
        deadline: newDeadline || null,
        station_name: newCategory,
        checklist: items,
        completion_note: '',
        blocker_reason: '',
        reference_links: [],
      });

      setNewTitle('');
      setNewNotes('');
      setNewDeadline('');
      setNewChecklist('');
      setShowNewDeliverableModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Design Studio Header */}
      <section className="relative overflow-hidden border border-[#d4af37]/30 bg-[#0a0a0d] p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">
                Visual & Spatial Identity Studio
              </span>
              <span className="text-neutral-600">/</span>
              <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                WEST MUN 2027 Design Department
              </span>
              <span className="text-neutral-600">/</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#f5d47a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                STUDIO PRODUCTION: ACTIVE
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal tracking-wide text-white">
              Creative Deliverables & Specifications Matrix
            </h1>

            <p className="text-sm leading-relaxed text-neutral-300">
              Official creative workspace for <span className="text-white font-medium">{profile.name}</span>.
              Managing print-ready committee placards, attendee badges, digital stage displays, and publication layouts adhering to the black-and-gold visual standard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowNewDeliverableModal(true)}
              className="flex items-center gap-2 bg-[#d4af37] px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-[#e5c158] active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.25)]"
            >
              <Plus className="h-4 w-4" />
              <span>New Studio Deliverable</span>
            </button>
          </div>
        </div>

        {/* Studio Production Telemetry */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              In Production
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-light text-white">{inProgressCount}</span>
              <span className="text-xs text-neutral-400">deliverables</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Approved & Packaged
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-light text-[#f5d47a]">{approvedCount}</span>
              <span className="text-xs text-neutral-400">print ready</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Standard Compliance
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                100% Brand Certified
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Color Workspace
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-neutral-300">CMYK FOGRA39 / sRGB</span>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Identity Tokens Ribbon */}
      <section className="border border-white/10 bg-[#0d0d10] p-4 lg:p-5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#d4af37]" />
            <h2 className="font-serif text-sm sm:text-base text-white">Brand Palette & Typographic Tokens</h2>
          </div>
          <span className="font-mono text-[10px] text-neutral-400">WEST MUN 2027 Standards</span>
        </div>

        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BRAND_SPECS.map((spec) => (
            <div key={spec.label} className="border border-white/5 bg-black/40 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                  {spec.label}
                </span>
                {spec.value.startsWith('#') && (
                  <span
                    className="h-3 w-3 rounded-sm border border-white/20"
                    style={{ backgroundColor: spec.value }}
                  />
                )}
              </div>
              <p className="font-mono text-xs font-semibold text-white">{spec.value}</p>
              <p className="text-[10px] text-neutral-400 leading-tight">{spec.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Studio Category Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs transition ${
                  isActive
                    ? 'border-b-2 border-[#d4af37] text-white font-medium bg-white/[0.04]'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#d4af37]' : 'text-neutral-500'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search deliverables & specs…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-black/60 border border-white/10 pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37] w-40 sm:w-52"
          />
        </div>
      </div>

      {/* Deliverables Matrix Grid */}
      <section className="space-y-4">
        {filteredDeliverables.length === 0 ? (
          <div className="border border-white/10 bg-[#0d0d10] py-14 text-center space-y-3">
            <Palette className="h-8 w-8 text-[#d4af37]/40 mx-auto" />
            <h3 className="font-serif text-base text-white">No studio deliverables in this category</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Create a new design deliverable above to track placards, badges, banners, or stage graphics.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDeliverables.map((item) => {
              const isApproved = item.status === 'completed';
              const totalChecks = (item.checklist || []).length;
              const completedChecks = (item.checklist || []).filter((c) => c.completed).length;

              return (
                <div
                  key={item.id}
                  className={`border p-5 flex flex-col justify-between transition ${
                    isApproved
                      ? 'border-white/5 bg-black/40 opacity-80'
                      : 'border-white/10 bg-[#0d0d10] hover:border-[#d4af37]/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                            {item.station_name || 'STUDIO DELIVERABLE'}
                          </span>
                          <span className="text-neutral-600">·</span>
                          <span className="font-mono text-[10px] uppercase text-neutral-400">
                            {isApproved ? 'STATUS: APPROVED' : 'STATUS: IN REVIEW'}
                          </span>
                        </div>

                        <h3 className={`font-serif text-base sm:text-lg ${isApproved ? 'text-neutral-300' : 'text-white'}`}>
                          {item.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => onUpdateTaskStatus(item.id, isApproved ? 'in_progress' : 'completed')}
                        className={`shrink-0 border px-3 py-1 text-xs transition ${
                          isApproved
                            ? 'border-white/15 bg-white/5 text-neutral-400 hover:text-white'
                            : 'border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f5d47a] hover:bg-[#d4af37]/20'
                        }`}
                      >
                        {isApproved ? 'Reopen Draft' : 'Mark Approved'}
                      </button>
                    </div>

                    {item.description && (
                      <div className="border border-white/5 bg-black/50 p-2.5 font-mono text-[11px] text-neutral-300 leading-relaxed">
                        {item.description}
                      </div>
                    )}

                    {/* Milestone Checklist */}
                    {totalChecks > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                          <span>Quality Checkpoints</span>
                          <span>{completedChecks}/{totalChecks} Passed</span>
                        </div>
                        <div className="space-y-1">
                          {item.checklist.map((check) => (
                            <label
                              key={check.id}
                              className="flex items-center gap-2 text-xs text-neutral-300 hover:text-white cursor-pointer select-none"
                              onClick={() => onToggleTaskChecklist?.(item.id, check.id)}
                            >
                              {check.completed ? (
                                <CheckSquare className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                              )}
                              <span className={check.completed ? 'line-through text-neutral-500' : ''}>
                                {check.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                    <span>Assigned: {item.assigned_to_name}</span>
                    {item.deadline && (
                      <span>Due: {new Date(item.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* New Deliverable Modal */}
      {showNewDeliverableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-[#d4af37]/40 bg-[#0e0e12] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                  Design Studio Intake
                </span>
                <h3 className="font-serif text-lg text-white">New Creative Deliverable</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDeliverableModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono"
              >
                [Close]
              </button>
            </div>

            <form onSubmit={handleCreateDeliverable} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300">Deliverable Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UNSC Committee Country Placards"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="Placards & Signage">Placards & Signage</option>
                    <option value="Badges & Passes">Badges & Passes</option>
                    <option value="Stage & LED Screens">Stage & LED Screens</option>
                    <option value="Social & Digital Assets">Social & Digital Assets</option>
                    <option value="Summit Publications">Summit Publications</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300">Technical Specs</label>
                  <input
                    type="text"
                    placeholder="e.g. A4 Landscape · 300DPI PDF/X-1a"
                    value={newSpec}
                    onChange={(e) => setNewSpec(e.target.value)}
                    className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300">Print / Delivery Deadline</label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300">Resolution / Profile</label>
                  <input
                    type="text"
                    defaultValue="CMYK 300DPI Print Vector"
                    className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  Specification Notes / Asset Links
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Drive folder link, country flag asset vector path, bleed specifications..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  Quality Checkpoints (one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="Verify flag aspect ratios&#10;Check country name spelling against UN roster&#10;Ensure 3mm print bleed on all edges"
                  value={newChecklist}
                  onChange={(e) => setNewChecklist(e.target.value)}
                  className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewDeliverableModal(false)}
                  className="border border-white/15 px-4 py-2 text-xs text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#d4af37] px-5 py-2 text-xs font-semibold text-black hover:bg-[#e5c158] disabled:opacity-50"
                >
                  {submitting ? 'Registering…' : 'Register Deliverable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
