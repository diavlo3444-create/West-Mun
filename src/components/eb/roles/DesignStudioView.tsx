import React, { useState, useMemo } from 'react';
import {
  Palette,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  Search,
  CheckSquare,
  Square,
  FileCheck2,
  Image as ImageIcon,
  Monitor,
  Printer,
  Calendar,
  MapPin,
  ChevronRight,
  Radio,
  UserCheck,
} from 'lucide-react';
import type { EbMemberProfile } from '../../../pages/EbPortal';
import type {
  EbTask,
  EbShift,
  EbStation,
  EbAnnouncement,
} from '../../../lib/ebOperationsService';

interface DesignStudioViewProps {
  profile: EbMemberProfile;
  tasks: EbTask[];
  shifts: EbShift[];
  stations: EbStation[];
  announcements: EbAnnouncement[];
  onNavigateTab: (tabId: string) => void;
  onAcknowledgeAnnouncement: (id: string) => void;
  onUpdateTaskStatus: (taskId: string, status: 'completed' | 'in_progress') => void;
}

type DesignCategory = 'all' | 'placards' | 'passes' | 'screens' | 'social';

export const DesignStudioView: React.FC<DesignStudioViewProps> = ({
  profile,
  tasks,
  shifts,
  stations,
  announcements,
  onNavigateTab,
  onAcknowledgeAnnouncement,
  onUpdateTaskStatus,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DesignCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Official Brand Guidelines Quick Reference
  const BRAND_SPECS = [
    { label: 'Primary Summit Gold', value: '#D4AF37', note: 'Pantone 7555 C / CMYK 20, 30, 85, 5' },
    { label: 'Deep Noir Surface', value: '#070707', note: 'Rich Black / CMYK 60, 40, 40, 100' },
    { label: 'Diplomatic Serif', value: 'Cinzel & Cormorant', note: 'Official diplomatic headers' },
    { label: 'Technical Mono', value: 'JetBrains Mono', note: 'Code, IDs, telemetry & specifications' },
  ];

  // Category filter tabs
  const CATEGORIES = [
    { id: 'all' as const, label: 'All Studio Deliverables', icon: Layers },
    { id: 'placards' as const, label: 'Placards & Signage', icon: Printer },
    { id: 'passes' as const, label: 'Badges & Passes', icon: FileCheck2 },
    { id: 'screens' as const, label: 'Stage & LED Screens', icon: Monitor },
    { id: 'social' as const, label: 'Social & Digital Assets', icon: ImageIcon },
  ];

  // Filter tasks based on search and category
  const filteredDeliverables = useMemo(() => {
    return tasks.filter((t) => {
      const fullText = (t.title + ' ' + (t.description || '') + ' ' + (t.station_name || '')).toLowerCase();
      const matchSearch =
        searchQuery === '' ||
        fullText.includes(searchQuery.toLowerCase()) ||
        t.assigned_to_name.toLowerCase().includes(searchQuery.toLowerCase());

      let matchCat = true;
      if (selectedCategory === 'placards') {
        matchCat = fullText.includes('placard') || fullText.includes('signage') || fullText.includes('banner') || fullText.includes('print');
      } else if (selectedCategory === 'passes') {
        matchCat = fullText.includes('pass') || fullText.includes('badge') || fullText.includes('lanyard') || fullText.includes('card');
      } else if (selectedCategory === 'screens') {
        matchCat = fullText.includes('screen') || fullText.includes('stage') || fullText.includes('backdrop') || fullText.includes('display');
      } else if (selectedCategory === 'social') {
        matchCat = fullText.includes('social') || fullText.includes('tile') || fullText.includes('post') || fullText.includes('digital');
      }

      return matchSearch && matchCat;
    });
  }, [tasks, searchQuery, selectedCategory]);

  const approvedCount = tasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = tasks.filter((t) => t.status !== 'completed').length;
  const nextShift = shifts[0] || null;
  const criticalAlert = announcements.find((a) => a.priority === 'critical' && !a.is_acknowledged);

  return (
    <div className="space-y-6">
      {/* Critical Broadcast */}
      {criticalAlert && (
        <div className="border border-rose-500/40 bg-rose-950/20 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-wider text-rose-300 font-bold">
                  Mandatory Directive
                </span>
                <span className="text-neutral-500">·</span>
                <span className="text-xs text-neutral-400">Issued by {criticalAlert.author_name}</span>
              </div>
              <h3 className="text-sm font-semibold text-white">{criticalAlert.title}</h3>
              <p className="text-xs text-neutral-300 max-w-2xl">{criticalAlert.body}</p>
            </div>

            <button
              type="button"
              onClick={() => onAcknowledgeAnnouncement(criticalAlert.id)}
              className="shrink-0 flex items-center gap-2 bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Acknowledge</span>
            </button>
          </div>
        </div>
      )}

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
              onClick={() => onNavigateTab('station')}
              className="flex items-center gap-2 border border-white/10 bg-black/60 px-4 py-2 text-xs text-neutral-300 transition hover:border-[#d4af37]/40 hover:text-white"
            >
              <MapPin className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="font-mono text-[11px] uppercase tracking-wider">Design Stations</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('schedule')}
              className="flex items-center gap-2 border border-white/10 bg-black/60 px-4 py-2 text-xs text-neutral-300 transition hover:border-[#d4af37]/40 hover:text-white"
            >
              <Calendar className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="font-mono text-[11px] uppercase tracking-wider">Studio Roster</span>
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

      {/* Studio Category Navigation & Search */}
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
            className="bg-black/60 border border-white/10 pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37] w-48 sm:w-56"
          />
        </div>
      </div>

      {/* Deliverables Matrix Grid */}
      <section className="space-y-4">
        {filteredDeliverables.length === 0 ? (
          <div className="border border-white/10 bg-[#0d0d10] py-14 text-center space-y-3">
            <Palette className="h-8 w-8 text-[#d4af37]/40 mx-auto" />
            <h3 className="font-serif text-base text-white">No studio deliverables match this view</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Any design tasks, placard layouts, or stage graphics assigned to your team appear here automatically from operations.
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

                    {/* Quality Checkpoints Checklist if present */}
                    {totalChecks > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                          <span>Quality Checkpoints</span>
                          <span>{completedChecks}/{totalChecks} Passed</span>
                        </div>
                        <div className="space-y-1">
                          {item.checklist.map((check) => (
                            <div
                              key={check.id}
                              className="flex items-center gap-2 text-xs text-neutral-300"
                            >
                              {check.completed ? (
                                <CheckSquare className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                              )}
                              <span className={check.completed ? 'line-through text-neutral-500' : ''}>
                                {check.text}
                              </span>
                            </div>
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

      {/* Roster & Studio Station Grounding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Shift */}
        <div className="border border-white/10 bg-[#0d0d10] p-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#d4af37]" />
              <h2 className="font-serif text-base text-white">Next Assigned Studio Shift</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('schedule')}
              className="text-xs font-mono uppercase tracking-wider text-[#d4af37] hover:underline"
            >
              Full Roster →
            </button>
          </div>

          {nextShift ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <h3 className="font-serif text-lg text-white">{nextShift.station_name || 'Design Production Lab'}</h3>
                <span className="font-mono text-xs text-[#f5d47a]">
                  {nextShift.shift_date} · {new Date(nextShift.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(nextShift.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                <span>Station: {nextShift.location || nextShift.station_name}</span>
              </div>
              {nextShift.responsibilities && (
                <p className="text-xs text-neutral-300 leading-relaxed">{nextShift.responsibilities}</p>
              )}
            </div>
          ) : (
            <div className="mt-4 py-6 text-center text-xs text-neutral-500">
              No active shift assigned for this period.
            </div>
          )}
        </div>

        {/* Assigned Stations */}
        <div className="border border-white/10 bg-[#0d0d10] p-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#d4af37]" />
              <h2 className="font-serif text-base text-white">Design Lab & Distribution Stations</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('station')}
              className="text-xs font-mono uppercase tracking-wider text-[#d4af37] hover:underline"
            >
              All Stations →
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {stations.slice(0, 3).map((st) => (
              <div
                key={st.id}
                className="border border-white/5 bg-black/40 p-3 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-medium text-white">{st.name}</h4>
                  <p className="font-mono text-[10px] text-neutral-400">
                    {st.location} · {st.purpose}
                  </p>
                </div>
                <span className="font-mono text-[10px] uppercase text-[#d4af37] border border-[#d4af37]/20 px-2 py-0.5">
                  Supervisor: {st.supervisor_name || 'Active'}
                </span>
              </div>
            ))}
            {stations.length === 0 && (
              <div className="py-6 text-center text-xs text-neutral-500">
                No design workstations currently listed.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
