import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Radio,
  UserCheck,
  ChevronRight,
  Shield,
  ArrowUpRight,
  Phone,
  Mail,
  FileCheck2,
  AlertCircle,
  Building2,
  Layers,
  Sparkles,
  Megaphone,
  Eye,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type {
  EbTask,
  EbShift,
  EbStation,
  EbAnnouncement,
} from '../../lib/ebOperationsService';
import { CoHeadCommandView } from './roles/CoHeadCommandView';
import { MarketingCampaignView } from './roles/MarketingCampaignView';
import { DesignStudioView } from './roles/DesignStudioView';

interface EbOverviewViewProps {
  profile: EbMemberProfile;
  tasks: EbTask[];
  shifts: EbShift[];
  stations: EbStation[];
  announcements: EbAnnouncement[];
  onNavigateTab: (tabId: string) => void;
  onAcknowledgeAnnouncement: (id: string) => void;
  onUpdateTaskStatus: (taskId: string, status: 'completed' | 'in_progress') => void;
}

export type RolePerspective = 'auto' | 'co_head' | 'marketing' | 'design' | 'standard';

export const EbOverviewView: React.FC<EbOverviewViewProps> = ({
  profile,
  tasks,
  shifts,
  stations,
  announcements,
  onNavigateTab,
  onAcknowledgeAnnouncement,
  onUpdateTaskStatus,
}) => {
  // Determine natural assigned role
  const naturalRole: 'co_head' | 'marketing' | 'design' | 'standard' = useMemo(() => {
    const r = (profile.role || '').toLowerCase().trim();
    const d = (profile.department || '').toLowerCase().trim();

    if (r.includes('co_head') || r.includes('co-head') || r === 'cohead') {
      return 'co_head';
    }
    if (r.includes('market') || d === 'marketing') {
      return 'marketing';
    }
    if (r.includes('design') || d === 'design') {
      return 'design';
    }
    return 'standard';
  }, [profile.role, profile.department]);

  const [perspective, setPerspective] = useState<RolePerspective>('auto');

  // Compute active rendered perspective
  const effectivePerspective = perspective === 'auto' ? naturalRole : perspective;

  // Render Co-Head bespoke view
  if (effectivePerspective === 'co_head') {
    return (
      <div className="space-y-4">
        <PerspectiveSelector
          current={perspective}
          natural={naturalRole}
          onChange={setPerspective}
        />
        <CoHeadCommandView
          profile={profile}
          tasks={tasks}
          shifts={shifts}
          stations={stations}
          announcements={announcements}
          onNavigateTab={onNavigateTab}
          onAcknowledgeAnnouncement={onAcknowledgeAnnouncement}
          onUpdateTaskStatus={onUpdateTaskStatus}
        />
      </div>
    );
  }

  // Render Marketing bespoke view
  if (effectivePerspective === 'marketing') {
    return (
      <div className="space-y-4">
        <PerspectiveSelector
          current={perspective}
          natural={naturalRole}
          onChange={setPerspective}
        />
        <MarketingCampaignView
          profile={profile}
          tasks={tasks}
          shifts={shifts}
          stations={stations}
          announcements={announcements}
          onNavigateTab={onNavigateTab}
          onAcknowledgeAnnouncement={onAcknowledgeAnnouncement}
          onUpdateTaskStatus={onUpdateTaskStatus}
        />
      </div>
    );
  }

  // Render Design bespoke view
  if (effectivePerspective === 'design') {
    return (
      <div className="space-y-4">
        <PerspectiveSelector
          current={perspective}
          natural={naturalRole}
          onChange={setPerspective}
        />
        <DesignStudioView
          profile={profile}
          tasks={tasks}
          shifts={shifts}
          stations={stations}
          announcements={announcements}
          onNavigateTab={onNavigateTab}
          onAcknowledgeAnnouncement={onAcknowledgeAnnouncement}
          onUpdateTaskStatus={onUpdateTaskStatus}
        />
      </div>
    );
  }

  // Standard / Generic EB Officer Redesigned View
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.deadline && new Date(t.deadline).getTime() < Date.now()
  );
  const nextShift = shifts[0] || null;
  const criticalAlert = announcements.find((a) => a.priority === 'critical' && !a.is_acknowledged);

  return (
    <div className="space-y-6">
      <PerspectiveSelector
        current={perspective}
        natural={naturalRole}
        onChange={setPerspective}
      />

      {/* Critical Operational Broadcast Banner */}
      {criticalAlert && (
        <div className="relative border border-rose-500/40 bg-rose-950/20 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-rose-500/40 bg-rose-500/10 text-rose-300">
                <AlertCircle className="h-4 w-4 animate-pulse" />
              </div>
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
            </div>

            <button
              type="button"
              onClick={() => onAcknowledgeAnnouncement(criticalAlert.id)}
              className="shrink-0 flex items-center justify-center gap-2 bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Acknowledge</span>
            </button>
          </div>
        </div>
      )}

      {/* Executive Board Briefing Header */}
      <section className="border border-[#d4af37]/30 bg-[#0a0a0d] p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">
                WEST MUN 2027 · Operations Board
              </span>
              <span className="text-neutral-600">/</span>
              <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                {profile.department.replace(/_/g, ' ')}
              </span>
              <span className="text-neutral-600">/</span>
              <span className="font-mono text-[10px] text-neutral-400">
                ID: <span className="text-neutral-200">WM-EB-27</span>
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal tracking-wide text-white">
              Welcome back, {profile.name}
            </h1>

            <p className="text-sm leading-relaxed text-neutral-300">
              Assigned as <span className="font-medium text-[#d4af37]">{profile.role.replace(/_/g, ' ')}</span> in the{' '}
              <span className="font-medium text-white">{profile.department.replace(/_/g, ' ')}</span> department
              {profile.section ? ` (${profile.section} section)` : ''}.
              All assignments and shift stations below are populated from the live operational database.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="border border-white/10 bg-black/50 p-3.5 text-center">
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">Pending</span>
              <span className="mt-1 font-mono text-xl font-light text-white block">{pendingTasks.length}</span>
            </div>
            <div className="border border-white/10 bg-black/50 p-3.5 text-center">
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">Overdue</span>
              <span className={`mt-1 font-mono text-xl font-light block ${overdueTasks.length > 0 ? 'text-rose-400' : 'text-neutral-400'}`}>
                {overdueTasks.length}
              </span>
            </div>
            <div className="border border-[#d4af37]/30 bg-[#d4af37]/[0.05] p-3.5 text-center">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37] block">Completed</span>
              <span className="mt-1 font-mono text-xl font-light text-[#f5d47a] block">{completedTasks.length}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Column Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Next Shift Assignment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="border border-white/10 bg-[#0d0d10] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#d4af37]" />
                <h2 className="font-serif text-base text-white">Next Scheduled Shift</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('schedule')}
                className="text-xs text-[#d4af37] hover:underline flex items-center gap-1"
              >
                <span>Full Schedule</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {nextShift ? (
              <div className="mt-4 space-y-4">
                <div className="border border-[#d4af37]/30 bg-black/40 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                        Station Assignment
                      </span>
                      <h3 className="text-base font-semibold text-white">{nextShift.station_name}</h3>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                      Confirmed Roster
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <MapPin className="h-3.5 w-3.5 text-[#d4af37]" />
                      <span>{nextShift.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Clock className="h-3.5 w-3.5 text-[#d4af37]" />
                      <span className="font-mono">
                        {new Date(nextShift.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' — '}
                        {new Date(nextShift.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {nextShift.responsibilities && (
                    <div className="pt-2 border-t border-white/5 text-xs">
                      <span className="text-neutral-400 font-mono text-[10px] uppercase">Roster Duties:</span>
                      <p className="mt-0.5 text-neutral-300 leading-relaxed">{nextShift.responsibilities}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="border border-white/10 bg-black/40 p-3.5 space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Supervisor</span>
                    <p className="text-white font-medium">{nextShift.supervisor_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('station')}
                    className="border border-white/10 bg-black/40 p-3.5 text-left hover:border-[#d4af37]/40 transition space-y-1"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">Station Manual</span>
                    <p className="text-neutral-300 flex items-center justify-between">
                      <span>Procedures & Opening Checklist</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#d4af37]" />
                    </p>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-neutral-500 text-xs">
                No active shift assigned yet. Your department head will publish shift rosters prior to summit opening.
              </div>
            )}
          </div>
        </div>

        {/* Action Items & Reporting Supervisor (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-white/10 bg-[#0d0d10] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-[#d4af37]" />
                <h2 className="font-serif text-base text-white">Action Deliverables</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('tasks')}
                className="text-xs text-[#d4af37] hover:underline"
              >
                View all ({tasks.length})
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {tasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No personal tasks currently assigned.
                </div>
              ) : (
                tasks.slice(0, 4).map((task) => {
                  const isDone = task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      className="border border-white/5 bg-black/40 p-3 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className={task.priority === 'urgent' ? 'text-rose-400 font-bold' : 'text-[#d4af37]'}>
                            {task.priority}
                          </span>
                          <span className="text-neutral-600">·</span>
                          <span className="text-neutral-400 truncate">{task.station_name || 'HQ'}</span>
                        </div>
                        <h4 className={`text-xs font-medium truncate ${isDone ? 'line-through text-neutral-500' : 'text-white'}`}>
                          {task.title}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => onUpdateTaskStatus(task.id, isDone ? 'in_progress' : 'completed')}
                        className={`shrink-0 border px-2.5 py-1 text-[11px] font-mono ${
                          isDone
                            ? 'border-white/10 bg-white/5 text-neutral-500'
                            : 'border-[#d4af37]/40 text-[#f5d47a] hover:bg-[#d4af37]/10'
                        }`}
                      >
                        {isDone ? 'Done' : 'Complete'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Supervisor Card */}
          {profile.reportingHeadName && (
            <div className="border border-[#d4af37]/25 bg-[#0a0a0d] p-5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                Assigned Department Head
              </span>
              <h3 className="mt-1 font-serif text-lg text-white">{profile.reportingHeadName}</h3>
              <p className="text-xs text-neutral-400">
                Department Head · {profile.reportingHeadDepartment || profile.department}
              </p>

              {profile.reportingHeadEmail && (
                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-neutral-300 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
                  <a href={`mailto:${profile.reportingHeadEmail}`} className="hover:text-white">
                    {profile.reportingHeadEmail}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Perspective Selector Bar (Zero pills, clean typographic switcher)
interface PerspectiveSelectorProps {
  current: RolePerspective;
  natural: 'co_head' | 'marketing' | 'design' | 'standard';
  onChange: (p: RolePerspective) => void;
}

const PerspectiveSelector: React.FC<PerspectiveSelectorProps> = ({ current, natural, onChange }) => {
  return (
    <div className="border-b border-white/[0.08] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 text-neutral-400">
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
          Role Workspace View:
        </span>
        <span className="font-medium text-neutral-200 capitalize">
          {natural.replace(/_/g, ' ')} EB Member
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onChange('auto')}
          className={`px-2.5 py-1 font-mono text-[11px] transition ${
            current === 'auto'
              ? 'border-b-2 border-[#d4af37] text-white font-medium bg-white/[0.04]'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="Default view matching your official assigned role"
        >
          Active Role (Auto)
        </button>

        <span className="text-neutral-600">·</span>

        <button
          type="button"
          onClick={() => onChange('co_head')}
          className={`px-2.5 py-1 font-mono text-[11px] transition ${
            current === 'co_head'
              ? 'border-b-2 border-[#d4af37] text-white font-medium bg-white/[0.04]'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Co-Head Command
        </button>

        <span className="text-neutral-600">·</span>

        <button
          type="button"
          onClick={() => onChange('marketing')}
          className={`px-2.5 py-1 font-mono text-[11px] transition ${
            current === 'marketing'
              ? 'border-b-2 border-[#d4af37] text-white font-medium bg-white/[0.04]'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Marketing Campaign
        </button>

        <span className="text-neutral-600">·</span>

        <button
          type="button"
          onClick={() => onChange('design')}
          className={`px-2.5 py-1 font-mono text-[11px] transition ${
            current === 'design'
              ? 'border-b-2 border-[#d4af37] text-white font-medium bg-white/[0.04]'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Design Studio
        </button>

        <span className="text-neutral-600">·</span>

        <button
          type="button"
          onClick={() => onChange('standard')}
          className={`px-2.5 py-1 font-mono text-[11px] transition ${
            current === 'standard'
              ? 'border-b-2 border-[#d4af37] text-white font-medium bg-white/[0.04]'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          General Briefing
        </button>
      </div>
    </div>
  );
};
