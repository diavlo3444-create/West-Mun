import React, { useMemo } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Inbox,
  Megaphone,
  Lock,
  Unlock,
  CalendarDays,
  ChevronRight,
  Key,
  Award,
  Mail,
  Network,
} from 'lucide-react';
import {
  EmptyState,
  MetricBar,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  Skeleton,
  StatCard,
  StatusBadge,
  btnGhost,
  btnPrimary,
  btnSecondary,
} from '../dashboard/ui';
import type { DepartmentMeta, SectionKey } from './departments';
import { ApplicantEmailLink } from '../components/ApplicantEmailLink';

export interface HeadRegistration {
  id: string;
  created_at: string;
  updated_at?: string;
  full_name: string;
  email: string;
  phone?: string;
  institution: string;
  team: string;
  section?: SectionKey | null;
  status: string;
  admin_finalized_at?: string | null;
  admin_finalized_by?: string | null;
  head_decision?: 'approved' | 'rejected' | null;
  head_notes?: string;
  experience?: string;
  statement?: string;
  admin_notes?: string;
  age_confirmed?: boolean;
  consent_version?: string;
  security_emergency_steps?: string;
  security_teamwork?: string;
  security_motivation?: string;
  security_handling_harassment?: string;
  volunteer_special_skills?: string;
  volunteer_teamwork_conflict?: string;
  volunteer_emergency_reaction?: string;
  volunteer_delegate_professionalism?: string;
}

export interface HeadAnnouncement {
  id: string;
  title: string;
  body?: string | null;
  published_at?: string | null;
  pinned?: boolean | null;
}

export interface HeadStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  waitlisted: number;
  underReview: number;
  received: number;
  withdrawn: number;
  completion: number;
}

interface HeadOverviewProps {
  meta: DepartmentMeta;
  section?: SectionKey | null;
  headName?: string;
  stats: HeadStats;
  registrations: HeadRegistration[];
  isOpen: boolean;
  loading: boolean;
  announcements: HeadAnnouncement[];
  onRefresh: () => void;
  onOpenRegistrations: () => void;
  onReview: (record: HeadRegistration) => void;
  onReplayUnlock?: () => void;
  onOpenSponsors?: () => void;
  onOpenInquiries?: () => void;
  onOpenRoles?: () => void;
}

function initials(name?: string): string {
  const cleaned = String(name || '?').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function shortDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export const HeadOverview: React.FC<HeadOverviewProps> = ({
  meta,
  section,
  headName,
  stats,
  registrations,
  isOpen,
  loading,
  announcements,
  onRefresh,
  onOpenRegistrations,
  onReview,
  onReplayUnlock,
  onOpenSponsors,
  onOpenInquiries,
  onOpenRoles,
}) => {
  const Icon = meta.icon;
  const recent = registrations.slice(0, 6);

  const segments = useMemo(
    () => [
      { label: 'Approved', count: stats.approved, color: '#34d399' },
      { label: 'Under review', count: stats.underReview, color: '#38bdf8' },
      { label: 'Pending', count: stats.received, color: '#9ca3af' },
      { label: 'Waitlisted', count: stats.waitlisted, color: '#fbbf24' },
      { label: 'Rejected', count: stats.rejected, color: '#fb7185' },
      { label: 'Withdrawn', count: stats.withdrawn, color: '#52525b' },
    ],
    [stats],
  );

  const donut = useMemo(() => {
    if (stats.total === 0) return 'conic-gradient(#242428 0deg 360deg)';
    let cursor = 0;
    const stops: string[] = [];
    for (const segment of segments) {
      if (segment.count === 0) continue;
      const start = (cursor / stats.total) * 360;
      cursor += segment.count;
      const end = (cursor / stats.total) * 360;
      stops.push(`${segment.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`);
    }
    return `conic-gradient(${stops.join(', ')})`;
  }, [segments, stats.total]);

  const divisionLabel = section ? `${section.toUpperCase()} division` : 'Department-wide';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={headName ? `Welcome back, ${headName}` : 'Department command'}
        title={meta.label}
        description={
          section
            ? `You are viewing the ${section} division of ${meta.label}. Applications outside this scope are blocked by database policy.`
            : meta.description
        }
        meta={
          <>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.08em] ${
                isOpen
                  ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300'
                  : 'border-white/[0.08] bg-white/[0.03] text-neutral-400'
              }`}
            >
              {isOpen ? <Unlock className="h-2.5 w-2.5" aria-hidden="true" /> : <Lock className="h-2.5 w-2.5" aria-hidden="true" />}
              Registration {isOpen ? 'open' : 'closed'}
            </span>
            {section && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.08em] text-[#e2c258]">
                {divisionLabel}
              </span>
            )}
            {headName && (
              <span className="text-[10px] text-neutral-400">
                Signed in as <span className="text-neutral-300">{headName}</span>
              </span>
            )}
          </>
        }
        actions={
          <>
            {onReplayUnlock && (
              <button
                type="button"
                onClick={onReplayUnlock}
                className={btnSecondary}
                title="Replay cinematic golden key unlock sequence"
              >
                <Key className="h-3.5 w-3.5 text-[#d4af37]" aria-hidden="true" />
                Unlock Intro
              </button>
            )}
            <button type="button" onClick={onRefresh} className={btnSecondary} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <button type="button" onClick={onOpenRegistrations} className={btnPrimary}>
              Review applications
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        }
      />

      {meta.key === 'pr' && onOpenSponsors && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-[10px] border border-[#d4af37]/40 bg-[#d4af37]/[0.06] shadow-lg">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/20 text-[#d4af37]">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Sponsors & Partners Portal
              </h3>
              <p className="text-xs text-neutral-300 mt-0.5">
                Manage partner logos, tiers, descriptions, and homepage priority display order.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSponsors}
            className={btnPrimary}
          >
            <span>Open Sponsors Management</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {meta.key === 'hr' && onOpenInquiries && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-[10px] border border-sky-500/40 bg-sky-950/[0.15] shadow-lg">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/20 text-sky-400">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Secretariat Inquiries & Messages
              </h3>
              <p className="text-xs text-neutral-300 mt-0.5">
                Review incoming communications, filter by status, and coordinate delegate support.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenInquiries}
            className={btnSecondary}
          >
            <span>Open Inquiries Management</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {onOpenRoles && ['media_press', 'security', 'volunteers'].includes(meta.key) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-[10px] border border-[#d4af37]/40 bg-gradient-to-r from-[#17150e] via-[#12110c] to-[#0c0c0f] shadow-lg">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/20 text-[#d4af37]">
              <Network className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Roles & Organizational Hierarchy
              </h3>
              <p className="text-xs text-neutral-300 mt-0.5">
                Assign roles, delegate operational responsibilities, and structure your approved team members into an organizational hierarchy.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenRoles}
            className={btnPrimary}
          >
            <span>Open Roles & Hierarchy</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!isOpen && (
        <Notice tone="warning" title="Registration is currently closed">
          The Secretariat has closed this channel. Existing applications remain available for review,
          but new candidates cannot submit until it reopens.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={section ? 'Division applications' : 'Applications'}
          value={stats.total}
          helper={section ? 'Scoped to your assigned division' : 'Scoped to your department'}
          icon={Users}
          tone="gold"
          loading={loading && registrations.length === 0}
        />
        <StatCard
          label="Awaiting review"
          value={stats.pending}
          helper={stats.pending > 0 ? 'Oldest unresolved first' : 'Nothing waiting on you'}
          icon={Clock}
          tone="sky"
          loading={loading && registrations.length === 0}
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          helper={`${stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% of your candidates`}
          icon={CheckCircle2}
          tone="emerald"
          loading={loading && registrations.length === 0}
        />
        <StatCard
          label="Declined"
          value={stats.rejected}
          helper={`${stats.waitlisted} waitlisted · ${stats.withdrawn} withdrawn`}
          icon={XCircle}
          tone="rose"
          loading={loading && registrations.length === 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Panel className="xl:col-span-5">
          <PanelHeader
            title="Application pipeline"
            description="Status distribution for your current access scope."
            action={
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#d4af37]/25 bg-[#d4af37]/[0.07] text-[#e2c258]">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            }
          />
          <div className="p-5">
            {loading && registrations.length === 0 ? (
              <div className="flex items-center gap-6">
                <Skeleton className="h-[124px] w-[124px] rounded-full" />
                <div className="flex-1 space-y-2.5">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ) : stats.total === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No applications in your scope yet"
                description={`New ${meta.label}${section ? ` (${section} division)` : ''} applications will appear here as soon as candidates submit.`}
              />
            ) : (
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div
                  className="relative mx-auto h-[124px] w-[124px] shrink-0 rounded-full"
                  style={{ background: donut }}
                  role="img"
                  aria-label={`Status distribution for ${stats.total} applications: ${segments
                    .map((segment) => `${segment.label} ${segment.count}`)
                    .join(', ')}`}
                >
                  <div className="absolute inset-[9px] flex flex-col items-center justify-center rounded-full border border-white/[0.05] bg-[#0c0c0f]">
                    <span className="text-[24px] font-semibold leading-none tabular-nums text-white">
                      {stats.total}
                    </span>
                    <span className="mt-1 text-[8px] font-mono uppercase tracking-[0.16em] text-neutral-400">
                      Total
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {segments.map((segment) => (
                    <div key={segment.label} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: segment.color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-neutral-400">{segment.label}</span>
                      <span className="font-mono text-[10.5px] tabular-nums text-neutral-200">
                        {segment.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-white/[0.06] pt-4">
              <div className="mb-2 flex items-center justify-between text-[10.5px]">
                <span className="text-neutral-400">Review completion</span>
                <span className="font-mono tabular-nums text-neutral-300">{stats.completion}%</span>
              </div>
              <MetricBar value={stats.completion} tone="gold" label="Review completion" />
            </div>
          </div>
        </Panel>

        <Panel className="xl:col-span-7">
          <PanelHeader
            title="Recent applications"
            description="Latest candidates in your department."
            action={
              <button type="button" onClick={onOpenRegistrations} className={btnGhost}>
                View all
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            }
          />
          {loading && registrations.length === 0 ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No candidates yet"
              description={`There are no ${meta.label} applications in your access scope.`}
            />
          ) : (
            <ul className="divide-y divide-white/[0.045]">
              {recent.map((record) => (
                <li
                  key={record.id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.025]"
                >
                  <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-[9.5px] font-semibold text-neutral-300 sm:flex">
                    {initials(record.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onReview(record)}
                        className="truncate text-[12px] font-medium text-neutral-100 hover:text-[#d4af37] text-left cursor-pointer"
                      >
                        {record.full_name}
                      </button>
                      <StatusBadge status={record.status} className="hidden sm:inline-flex" />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-neutral-400">
                      <ApplicantEmailLink
                        applicantName={record.full_name}
                        applicantEmail={record.email}
                        registrationId={record.id}
                        type="team"
                        department={meta.key}
                        section={record.section || section}
                        status={record.status}
                        institution={record.institution}
                      />
                      {record.institution && (
                        <>
                          <span className="text-neutral-700" aria-hidden="true">·</span>
                          <span className="truncate max-w-[12rem]">{record.institution}</span>
                        </>
                      )}
                      {record.section && (
                        <>
                          <span className="text-neutral-700" aria-hidden="true">·</span>
                          <span>{record.section} division</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden font-mono text-[10px] text-neutral-400 md:inline">
                      {shortDate(record.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onReview(record)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] px-2 py-1 text-[10px] font-medium text-neutral-400 transition-colors hover:border-[#d4af37]/35 hover:bg-[#d4af37]/[0.06] hover:text-[#e2c258] cursor-pointer"
                      aria-label={`Review ${record.full_name}`}
                    >
                      Review
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {announcements.length > 0 && (
        <Panel>
          <PanelHeader
            eyebrow="Secretariat"
            title="Notices"
            description="Published announcements from the conference organisers."
            action={<Megaphone className="h-4 w-4 text-[#d4af37]" aria-hidden="true" />}
          />
          <ul className="divide-y divide-white/[0.045]">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  {announcement.pinned && (
                    <span className="rounded border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-[0.12em] text-[#e2c258]">
                      Pinned
                    </span>
                  )}
                  <h3 className="text-[12px] font-medium text-neutral-100">{announcement.title}</h3>
                  <span className="inline-flex items-center gap-1 font-mono text-[9.5px] text-neutral-400">
                    <CalendarDays className="h-2.5 w-2.5" aria-hidden="true" />
                    {shortDate(announcement.published_at)}
                  </span>
                </div>
                {announcement.body && (
                  <p className="mt-1 max-w-3xl whitespace-pre-line text-[11px] leading-relaxed text-neutral-400">
                    {announcement.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
};
