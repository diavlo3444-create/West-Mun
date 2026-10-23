import React, { useState, useMemo } from 'react';
import {
  Megaphone,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Search,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  Share2,
  FileText,
  Mail,
  Instagram,
  Radio,
  Globe,
  Users2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { EbMemberProfile } from '../../../pages/EbPortal';
import type {
  EbTask,
  EbAnnouncement,
  TaskPriority,
  TaskStatus,
} from '../../../lib/ebOperationsService';

interface MarketingCampaignViewProps {
  profile: EbMemberProfile;
  tasks: EbTask[];
  announcements: EbAnnouncement[];
  onNavigateTab: (tabId: string) => void;
  onAcknowledgeAnnouncement: (id: string) => void;
  onUpdateTaskStatus: (taskId: string, status: 'completed' | 'in_progress') => void;
  onToggleTaskChecklist?: (taskId: string, itemId: string) => void;
  onCreateTask?: (task: any) => Promise<void> | void;
}

type CampaignChannel = 'all' | 'instagram' | 'email' | 'delegations' | 'press' | 'website';

export const MarketingCampaignView: React.FC<MarketingCampaignViewProps> = ({
  profile,
  tasks,
  announcements,
  onNavigateTab,
  onAcknowledgeAnnouncement,
  onUpdateTaskStatus,
  onToggleTaskChecklist,
  onCreateTask,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<CampaignChannel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newChannel, setNewChannel] = useState('Instagram');
  const [newDeadline, setNewDeadline] = useState('');
  const [newCopyDraft, setNewCopyDraft] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Marketing campaign phases
  const CAMPAIGN_PHASES = [
    {
      phase: 'Phase 01',
      title: 'Institutional Delegation Outreach',
      period: 'Active Window',
      status: 'In Progress',
      focus: 'High schools, universities & embassy model UN delegations across GCC.',
    },
    {
      phase: 'Phase 02',
      title: 'Delegate Recruitment & Committee Reveal',
      period: 'Upcoming',
      status: 'Scheduled',
      focus: 'Early bird registration drive, committee teasers, agenda reveal.',
    },
    {
      phase: 'Phase 03',
      title: 'Dossiers & Speaker Spotlights',
      period: 'Final Countdown',
      status: 'Drafting',
      focus: 'Keynote speakers, study guides, venue orientation, delegate handbook.',
    },
    {
      phase: 'Phase 04',
      title: 'Live Summit Press & Broadcast',
      period: 'Conference Days',
      status: 'Planned',
      focus: 'Real-time committee coverage, daily communiqués, closing gala press.',
    },
  ];

  // Channel distribution
  const CHANNELS = [
    { id: 'all' as const, label: 'All Channels', icon: Globe },
    { id: 'instagram' as const, label: 'Instagram & Social', icon: Share2 },
    { id: 'delegations' as const, label: 'Delegations & Schools', icon: Users2 },
    { id: 'email' as const, label: 'Direct Dispatches', icon: Mail },
    { id: 'press' as const, label: 'Press & Media', icon: Radio },
  ];

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const descLower = (t.description + ' ' + t.title + ' ' + t.station_name).toLowerCase();
      let matchChannel = true;
      if (selectedChannel === 'instagram') matchChannel = descLower.includes('insta') || descLower.includes('social');
      else if (selectedChannel === 'email') matchChannel = descLower.includes('email') || descLower.includes('dispatch') || descLower.includes('newsletter');
      else if (selectedChannel === 'delegations') matchChannel = descLower.includes('delegat') || descLower.includes('school');
      else if (selectedChannel === 'press') matchChannel = descLower.includes('press') || descLower.includes('communiqu');
      return matchSearch && matchChannel;
    });
  }, [tasks, searchQuery, selectedChannel]);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const pendingCount = tasks.filter((t) => t.status !== 'completed').length;

  const handleCreateCampaignTask = async (e: React.FormEvent) => {
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
        department: 'marketing',
        section: profile.section,
        assigned_to_user_id: profile.id,
        assigned_to_name: profile.name,
        assigned_by_name: `${profile.name} (Marketing Team)`,
        title: `[${newChannel}] ${newTitle.trim()}`,
        description: newCopyDraft.trim() || `Channel: ${newChannel}. Scheduled marketing deliverable.`,
        priority: 'high',
        status: 'not_started',
        deadline: newDeadline || null,
        station_name: `Channel: ${newChannel}`,
        checklist: items,
        completion_note: '',
        blocker_reason: '',
        reference_links: [],
      });

      setNewTitle('');
      setNewCopyDraft('');
      setNewDeadline('');
      setNewChecklist('');
      setShowNewCampaignModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Marketing Header Desk */}
      <section className="relative overflow-hidden border border-[#d4af37]/30 bg-[#0a0a0d] p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">
                Editorial & Campaign Desk
              </span>
              <span className="text-neutral-600">/</span>
              <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                Marketing & Digital Outreach
              </span>
              <span className="text-neutral-600">/</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#f5d47a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                OUTREACH PIPELINE: ACTIVE
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal tracking-wide text-white">
              Campaign & Publication Studio
            </h1>

            <p className="text-sm leading-relaxed text-neutral-300">
              Coordinating institutional school recruitment, promotional calendar releases, social copy reviews, and press announcements for WEST MUN 2027.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowNewCampaignModal(true)}
              className="flex items-center gap-2 bg-[#d4af37] px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-[#e5c158] active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.25)]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Campaign Deliverable</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('announcements')}
              className="flex items-center gap-2 border border-white/20 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white transition hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10"
            >
              <Megaphone className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>Broadcast Directives</span>
            </button>
          </div>
        </div>

        {/* Editorial Metrics */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Active Deliverables
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-light text-white">{pendingCount}</span>
              <span className="text-xs text-neutral-400">pending</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Published & Delivered
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-light text-[#f5d47a]">{completedCount}</span>
              <span className="text-xs text-neutral-400">completed</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Channels Monitored
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-light text-white">4</span>
              <span className="text-xs text-neutral-400">active channels</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Target Audience
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                GCC & International
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Campaign Roadmap Stages */}
      <section className="border border-white/10 bg-[#0d0d10] p-5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#d4af37]" />
            <h2 className="font-serif text-base text-white">Campaign Stage Roadmap</h2>
          </div>
          <span className="font-mono text-[11px] text-neutral-400">WEST MUN 2027 Schedule</span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CAMPAIGN_PHASES.map((p, idx) => (
            <div
              key={p.phase}
              className={`border p-4 space-y-2 ${
                idx === 0
                  ? 'border-[#d4af37]/40 bg-[#d4af37]/[0.04]'
                  : 'border-white/[0.07] bg-black/40'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={idx === 0 ? 'text-[#d4af37] font-semibold' : 'text-neutral-400'}>
                  {p.phase}
                </span>
                <span className="text-neutral-400 uppercase tracking-wider">{p.status}</span>
              </div>

              <h4 className="text-xs font-semibold text-white leading-snug">{p.title}</h4>
              <p className="text-[11px] text-neutral-400 leading-relaxed">{p.focus}</p>

              <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 text-[10px] font-mono text-neutral-400">
                <Clock className="h-3 w-3" />
                <span>{p.period}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Channel Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon;
            const isActive = selectedChannel === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedChannel(ch.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs transition ${
                  isActive
                    ? 'border-b-2 border-[#d4af37] text-white font-medium bg-white/[0.04]'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#d4af37]' : 'text-neutral-500'}`} />
                <span>{ch.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search deliverables…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-black/60 border border-white/10 pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37] w-40 sm:w-48"
          />
        </div>
      </div>

      {/* Main Campaign Deliverables List */}
      <section className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="border border-white/10 bg-[#0d0d10] py-14 text-center space-y-3">
            <Megaphone className="h-8 w-8 text-[#d4af37]/40 mx-auto" />
            <h3 className="font-serif text-base text-white">No campaign deliverables found</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Add a new deliverable above to track social posts, delegation invitations, or press updates.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === 'completed';
            const totalItems = (task.checklist || []).length;
            const completedItems = (task.checklist || []).filter((i) => i.completed).length;

            return (
              <div
                key={task.id}
                className={`border p-5 transition ${
                  isDone
                    ? 'border-white/5 bg-black/30 opacity-75'
                    : 'border-white/10 bg-[#0d0d10] hover:border-white/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                        {task.station_name || 'MARKETING'}
                      </span>
                      <span className="text-neutral-600">·</span>
                      <span className="font-mono text-[10px] uppercase text-neutral-400">
                        PRIORITY: {task.priority}
                      </span>
                      {task.deadline && (
                        <>
                          <span className="text-neutral-600">·</span>
                          <span className="font-mono text-[11px] text-neutral-400">
                            Release Target: {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className={`font-serif text-lg ${isDone ? 'line-through text-neutral-400' : 'text-white'}`}>
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs leading-relaxed text-neutral-300 whitespace-pre-line bg-black/40 border border-white/5 p-3 font-sans">
                        {task.description}
                      </p>
                    )}

                    {/* Checklist items */}
                    {totalItems > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                          <span>Milestone Tasks</span>
                          <span>{completedItems}/{totalItems} Completed</span>
                        </div>
                        <div className="space-y-1">
                          {task.checklist.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-2 text-xs text-neutral-300 hover:text-white cursor-pointer select-none"
                              onClick={() => onToggleTaskChecklist?.(task.id, item.id)}
                            >
                              {item.completed ? (
                                <CheckSquare className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                              )}
                              <span className={item.completed ? 'line-through text-neutral-500' : ''}>
                                {item.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2 self-start">
                    <button
                      type="button"
                      onClick={() => onUpdateTaskStatus(task.id, isDone ? 'in_progress' : 'completed')}
                      className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs transition ${
                        isDone
                          ? 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                          : 'border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f5d47a] hover:bg-[#d4af37]/20'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{isDone ? 'Move to Drafting' : 'Mark Published'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* New Deliverable Modal */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-[#d4af37]/40 bg-[#0e0e12] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                  Marketing Campaign Desk
                </span>
                <h3 className="font-serif text-lg text-white">Create Promotional Deliverable</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCampaignModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono"
              >
                [Close]
              </button>
            </div>

            <form onSubmit={handleCreateCampaignTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300">Deliverable Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Early-Bird Registration Countdown Reel"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300">Primary Channel</label>
                  <select
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Email Dispatch">Direct Delegation Email</option>
                    <option value="School Outreach">School Visit / Packet</option>
                    <option value="Press Release">Press & Communiqué</option>
                    <option value="TikTok">TikTok / Short Video</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300">Target Publish Date</label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  Caption Draft or Campaign Brief
                </label>
                <textarea
                  rows={3}
                  placeholder="Draft caption, hashtags, key talking points, or delegation contact targets..."
                  value={newCopyDraft}
                  onChange={(e) => setNewCopyDraft(e.target.value)}
                  className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300">
                  Milestone Tasks (one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="Review copy with Secretariat&#10;Request visual graphic from Design team&#10;Schedule via Meta Suite"
                  value={newChecklist}
                  onChange={(e) => setNewChecklist(e.target.value)}
                  className="mt-1 w-full bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(false)}
                  className="border border-white/15 px-4 py-2 text-xs text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#d4af37] px-5 py-2 text-xs font-semibold text-black hover:bg-[#e5c158] disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Add to Campaign Desk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
