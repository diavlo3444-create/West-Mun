import React from 'react';
import {
  Megaphone,
  Calendar,
  Clock,
  CheckCircle2,
  Mail,
  Users2,
  Radio,
  MapPin,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import type { EbMemberProfile } from '../../../pages/EbPortal';
import type {
  EbTask,
  EbShift,
  EbStation,
  EbAnnouncement,
} from '../../../lib/ebOperationsService';

interface MarketingCampaignViewProps {
  profile: EbMemberProfile;
  tasks: EbTask[];
  shifts: EbShift[];
  stations: EbStation[];
  announcements: EbAnnouncement[];
  onNavigateTab: (tabId: string) => void;
  onAcknowledgeAnnouncement: (id: string) => void;
  onUpdateTaskStatus: (taskId: string, status: 'completed' | 'in_progress') => void;
}

export const MarketingCampaignView: React.FC<MarketingCampaignViewProps> = ({
  profile,
  tasks,
  shifts,
  stations,
  announcements,
  onNavigateTab,
  onAcknowledgeAnnouncement,
  onUpdateTaskStatus,
}) => {
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.deadline && new Date(t.deadline).getTime() < Date.now()
  );
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

      {/* Marketing Header Desk - Editorial Aesthetic */}
      <section className="relative overflow-hidden border border-[#d4af37]/30 bg-[#0a0a0d] p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">
                Editorial & Campaign Desk
              </span>
              <span className="text-neutral-600">/</span>
              <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                {profile.department.replace(/_/g, ' ')}
              </span>
              <span className="text-neutral-600">/</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#f5d47a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                CAMPAIGN OPERATIONS: ACTIVE
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal tracking-wide text-white">
              Marketing & Outreach Operations
            </h1>

            <p className="text-sm leading-relaxed text-neutral-300">
              Assigned to <span className="text-white font-medium">{profile.name}</span>.
              Managing institutional delegation outreach, promotional deadlines, and official announcements for WEST MUN 2027.
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

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scheduled Outreach Shift & Deliverables (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Next Shift */}
          <div className="border border-white/10 bg-[#0d0d10] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#d4af37]" />
                <h2 className="font-serif text-base text-white">Next Assigned Outreach Shift</h2>
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
              <div className="mt-4 border border-[#d4af37]/30 bg-black/40 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                      Outreach Station / Desk
                    </span>
                    <h3 className="text-base font-semibold text-white">{nextShift.station_name}</h3>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                    Confirmed
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
            ) : (
              <div className="py-8 text-center text-xs text-neutral-500">
                No active outreach shift assigned right now.
              </div>
            )}
          </div>

          {/* Marketing Action Items & Deliverables */}
          <div className="border border-white/10 bg-[#0d0d10] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-[#d4af37]" />
                <h2 className="font-serif text-base text-white">Campaign Action Items ({tasks.length})</h2>
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {tasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No promotional tasks currently assigned to your profile.
                </div>
              ) : (
                tasks.map((task) => {
                  const isDone = task.status === 'completed';

                  return (
                    <div
                      key={task.id}
                      className="border border-white/5 bg-black/40 p-3.5 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className={task.priority === 'urgent' ? 'text-rose-400 font-bold' : 'text-[#d4af37]'}>
                            {task.priority}
                          </span>
                          <span className="text-neutral-600">·</span>
                          <span className="text-neutral-400 truncate">{task.station_name || 'MARKETING'}</span>
                        </div>
                        <h4 className={`text-xs font-semibold ${isDone ? 'line-through text-neutral-500' : 'text-white'}`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-[11px] text-neutral-400 line-clamp-2">{task.description}</p>
                        )}
                        {task.deadline && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-neutral-500">
                            <Clock className="h-3 w-3" />
                            <span>Deadline: {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onUpdateTaskStatus(task.id, isDone ? 'in_progress' : 'completed')}
                        className={`shrink-0 border px-2.5 py-1 text-[11px] font-mono transition ${
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
        </div>

        {/* Right Column: Supervisor & Announcements (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Department Head Supervisor Link */}
          {profile.reportingHeadName && (
            <div className="border border-[#d4af37]/25 bg-[#0a0a0d] p-5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                Reporting Officer & Department Head
              </span>
              <h3 className="mt-1 font-serif text-base text-white">{profile.reportingHeadName}</h3>
              <p className="text-xs text-neutral-400">
                Department Head · {profile.reportingHeadDepartment || profile.department}
              </p>

              {profile.reportingHeadEmail && (
                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-neutral-300 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
                  <a href={`mailto:${profile.reportingHeadEmail}`} className="hover:text-white font-mono text-[11px]">
                    {profile.reportingHeadEmail}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Quick Directives & Announcements */}
          <div className="border border-white/10 bg-[#0d0d10] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#d4af37]" />
                <h2 className="font-serif text-base text-white">Outreach Bulletins</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('announcements')}
                className="text-xs text-[#d4af37] hover:underline"
              >
                View all
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {announcements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="border border-white/5 bg-black/30 p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#d4af37] uppercase">{ann.priority}</span>
                    <span className="text-neutral-500">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-medium text-white">{ann.title}</h4>
                  <p className="text-[11px] text-neutral-400 line-clamp-2">{ann.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
