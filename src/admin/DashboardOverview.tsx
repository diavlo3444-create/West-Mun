import React, { useMemo } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Camera,
  HeartHandshake,
  GraduationCap,
  ArrowRight,
  TrendingUp,
  Download,
  RefreshCw,
  AlertCircle,
  CircleDashed,
  Lock,
  Unlock,
  ChevronRight,
  Database,
} from 'lucide-react';
import type { Row } from './ui';
import { downloadText, toCsv } from '../lib/safe';
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
  toneStyles,
  type Tone,
} from '../dashboard/ui';

interface DashboardOverviewProps {
  delegates: Row[];
  teamRegistrations: Row[];
  settings: Record<string, string>;
  loading: boolean;
  error?: string;
  onRefresh: () => void;
  onNavigate: (page: any) => void;
  onViewApplication: (app: any, type: 'delegate' | 'team') => void;
  userName?: string;
}

type Unified = Row & { _type: 'delegate' | 'team'; _teamLabel: string; _teamId: string };

const TEAM_META: Record<
  string,
  { name: string; subtitle: string; icon: typeof Shield; settingKey: string; tone: Tone }
> = {
  delegates: {
    name: 'Delegates',
    subtitle: 'Early Bird & Regular',
    icon: GraduationCap,
    settingKey: 'registration_open',
    tone: 'gold',
  },
  security: {
    name: 'Security & Protocol',
    subtitle: 'Summit operations',
    icon: Shield,
    settingKey: 'team_security_open',
    tone: 'sky',
  },
  media: {
    name: 'Media & Press',
    subtitle: 'Press corps',
    icon: Camera,
    settingKey: 'team_media_open',
    tone: 'emerald',
  },
  volunteers: {
    name: 'Volunteers',
    subtitle: 'Conference staff',
    icon: HeartHandshake,
    settingKey: 'team_volunteers_open',
    tone: 'amber',
  },
};

function formatDate(value?: string, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function initials(name?: string): string {
  const cleaned = String(name || '?').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  delegates,
  teamRegistrations,
  settings,
  loading,
  error,
  onRefresh,
  onNavigate,
  onViewApplication,
  userName,
}) => {
  const allRegistrations = useMemo<Unified[]>(() => {
    const list: Unified[] = [
      ...delegates.map((d) => ({
        ...d,
        _type: 'delegate' as const,
        _teamId: 'delegates',
        _teamLabel: d.tier === 'early_bird' ? 'Early Bird delegate' : 'Regular delegate',
      })),
      ...teamRegistrations.map((t) => ({
        ...t,
        _type: 'team' as const,
        _teamId: String(t.team),
        _teamLabel:
          t.team === 'security'
            ? 'Security & Protocol'
            : t.team === 'media'
              ? 'Media & Press'
              : t.team === 'volunteers'
                ? 'Volunteers'
                : String(t.team),
      })),
    ];
    return list.sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    );
  }, [delegates, teamRegistrations]);

  const kpis = useMemo(() => {
    const total = allRegistrations.length;
    const pending = allRegistrations.filter(
      (r) => r.status === 'received' || r.status === 'under_review',
    ).length;
    const approved = allRegistrations.filter((r) => r.status === 'accepted').length;
    const rejected = allRegistrations.filter((r) => r.status === 'rejected').length;
    const waitlisted = allRegistrations.filter((r) => r.status === 'waitlisted').length;
    const withdrawn = allRegistrations.filter((r) => r.status === 'withdrawn').length;
    const reviewed = approved + rejected + waitlisted + withdrawn;
    return {
      total,
      pending,
      approved,
      rejected,
      waitlisted,
      withdrawn,
      reviewed,
      completion: total > 0 ? Math.round((reviewed / total) * 100) : 0,
    };
  }, [allRegistrations]);

  const statusSegments = useMemo(
    () => [
      { key: 'accepted', label: 'Approved', count: kpis.approved, color: '#34d399' },
      { key: 'under_review', label: 'Under review', count: allRegistrations.filter((r) => r.status === 'under_review').length, color: '#38bdf8' },
      { key: 'received', label: 'Pending', count: allRegistrations.filter((r) => r.status === 'received').length, color: '#9ca3af' },
      { key: 'waitlisted', label: 'Waitlisted', count: kpis.waitlisted, color: '#fbbf24' },
      { key: 'rejected', label: 'Rejected', count: kpis.rejected, color: '#fb7185' },
      { key: 'withdrawn', label: 'Withdrawn', count: kpis.withdrawn, color: '#52525b' },
    ],
    [allRegistrations, kpis],
  );

  const donutBackground = useMemo(() => {
    if (kpis.total === 0) return 'conic-gradient(#242428 0deg 360deg)';
    let cursor = 0;
    const stops: string[] = [];
    for (const segment of statusSegments) {
      if (segment.count === 0) continue;
      const start = (cursor / kpis.total) * 360;
      cursor += segment.count;
      const end = (cursor / kpis.total) * 360;
      stops.push(`${segment.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`);
    }
    return `conic-gradient(${stops.join(', ')})`;
  }, [kpis.total, statusSegments]);

  const departments = useMemo(
    () =>
      Object.entries(TEAM_META).map(([id, meta]) => {
        const records = allRegistrations.filter((r) => r._teamId === id);
        const total = records.length;
        const pending = records.filter(
          (r) => r.status === 'received' || r.status === 'under_review',
        ).length;
        const approved = records.filter((r) => r.status === 'accepted').length;
        const isOpen = (settings[meta.settingKey] ?? 'true').toLowerCase() === 'true';
        return { id, ...meta, total, pending, approved, isOpen };
      }),
    [allRegistrations, settings],
  );

  const timeline = useMemo(() => {
    const now = new Date();
    const days: Array<{ key: string; label: string; count: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const iso = date.toISOString().slice(0, 10);
      days.push({
        key: iso,
        label: date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
        count: 0,
      });
    }
    const index = new Map(days.map((day, i) => [day.key, i]));
    allRegistrations.forEach((record) => {
      if (!record.created_at) return;
      const key = String(record.created_at).slice(0, 10);
      const position = index.get(key);
      if (position !== undefined) days[position].count += 1;
    });
    const max = Math.max(...days.map((day) => day.count), 1);
    const periodTotal = days.reduce((sum, day) => sum + day.count, 0);
    return { days, max, periodTotal };
  }, [allRegistrations]);

  const recent = allRegistrations.slice(0, 6);
  const attention = useMemo(
    () =>
      allRegistrations
        .filter((r) => r.status === 'received' || r.status === 'under_review')
        .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
        .slice(0, 4),
    [allRegistrations],
  );

  const exportAllCsv = () => {
    const head = ['id', 'category', 'team', 'full_name', 'email', 'institution', 'status', 'submitted_at'];
    const body = allRegistrations.map((r) => [
      r.id,
      r._type === 'delegate' ? 'Delegate' : 'Team staff',
      r._teamLabel,
      r.full_name,
      r.email,
      r.institution,
      r.status,
      r.created_at,
    ]);
    downloadText(
      `west-mun-all-registrations-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([head, ...body]),
    );
  };

  const firstName = (userName || '').split(/[\s@]/)[0] || 'organiser';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Conference operations"
        title="Overview"
        description={`Welcome back, ${firstName}. Every figure below is read from the live Supabase registry and reflects the same records the public site writes.`}
        meta={
          <>
            <span className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-neutral-400">
              {today}
            </span>
            <span className="text-neutral-700" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-neutral-400">
              <span className="h-1 w-1 rounded-full bg-emerald-400" aria-hidden="true" />
              Supabase connected
            </span>
          </>
        }
        actions={
          <>
            <button type="button" onClick={onRefresh} className={btnSecondary} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportAllCsv}
              disabled={allRegistrations.length === 0}
              className={btnGhost}
              title="Download every registration as CSV"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export
            </button>
            <button
              type="button"
              onClick={() => onNavigate('registrations')}
              className={btnPrimary}
            >
              Review queue
              {kpis.pending > 0 && (
                <span className="rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-mono tabular-nums">
                  {kpis.pending}
                </span>
              )}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        }
      />

      {error && (
        <Notice tone="error" title="Some records could not be loaded">
          {error} Use Refresh to try again. Figures below only include records Supabase returned.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total registrations"
          value={kpis.total}
          helper="Delegates and conference staff combined"
          icon={Users}
          tone="gold"
          loading={loading && allRegistrations.length === 0}
        />
        <StatCard
          label="Awaiting review"
          value={kpis.pending}
          helper={kpis.pending > 0 ? 'Oldest applications first in the review queue' : 'The review queue is clear'}
          icon={Clock}
          tone="sky"
          loading={loading && allRegistrations.length === 0}
        />
        <StatCard
          label="Approved"
          value={kpis.approved}
          helper={`${kpis.total > 0 ? Math.round((kpis.approved / kpis.total) * 100) : 0}% of all applications`}
          icon={CheckCircle2}
          tone="emerald"
          loading={loading && allRegistrations.length === 0}
        />
        <StatCard
          label="Declined"
          value={kpis.rejected}
          helper={`${kpis.waitlisted} waitlisted · ${kpis.withdrawn} withdrawn`}
          icon={XCircle}
          tone="rose"
          loading={loading && allRegistrations.length === 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Pipeline */}
        <Panel className="xl:col-span-5">
          <PanelHeader
            title="Application pipeline"
            description="Status distribution across every submitted record."
          />
          <div className="p-5">
            {loading && allRegistrations.length === 0 ? (
              <div className="flex items-center gap-6">
                <Skeleton className="h-[132px] w-[132px] rounded-full" />
                <div className="flex-1 space-y-2.5">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ) : kpis.total === 0 ? (
              <EmptyState
                icon={CircleDashed}
                title="No applications yet"
                description="Once a delegate or staff application is submitted, the pipeline will populate here automatically."
              />
            ) : (
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div
                  className="relative mx-auto h-[132px] w-[132px] shrink-0 rounded-full"
                  style={{ background: donutBackground }}
                  role="img"
                  aria-label={`Status distribution for ${kpis.total} registrations: ${statusSegments
                    .map((s) => `${s.label} ${s.count}`)
                    .join(', ')}`}
                >
                  <div className="absolute inset-[9px] flex flex-col items-center justify-center rounded-full border border-white/[0.05] bg-[#0c0c0f]">
                    <span className="text-[26px] font-semibold leading-none tabular-nums text-white">
                      {kpis.total}
                    </span>
                    <span className="mt-1 text-[8.5px] font-mono uppercase tracking-[0.18em] text-neutral-400">
                      Total
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  {statusSegments.map((segment) => (
                    <div key={segment.key} className="flex items-center gap-2 text-[11.5px]">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: segment.color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-neutral-400">{segment.label}</span>
                      <span className="font-mono text-[11px] tabular-nums text-neutral-200">
                        {segment.count}
                      </span>
                      <span className="w-8 text-right font-mono text-[10px] tabular-nums text-neutral-400">
                        {kpis.total > 0 ? Math.round((segment.count / kpis.total) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-white/[0.06] pt-4">
              <div className="mb-2 flex items-center justify-between text-[10.5px]">
                <span className="text-neutral-400">Adjudication progress</span>
                <span className="font-mono tabular-nums text-neutral-300">{kpis.completion}%</span>
              </div>
              <MetricBar value={kpis.completion} tone="gold" label="Adjudication progress" />
              <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
                {kpis.reviewed} of {kpis.total} records have a final decision.
              </p>
            </div>
          </div>
        </Panel>

        {/* Departments */}
        <Panel className="xl:col-span-7">
          <PanelHeader
            title="Registration channels"
            description="Department-level totals and the live public registration switch."
            action={
              <button type="button" onClick={() => onNavigate('teams')} className={btnGhost}>
                Manage
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </button>
            }
          />
          <div className="wm-scroll overflow-x-auto">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  <th scope="col" className="px-5 py-2.5 font-normal">Department</th>
                  <th scope="col" className="px-3 py-2.5 font-normal">Status</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-normal">Total</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-normal">Pending</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-normal">Approved</th>
                  <th scope="col" className="hidden px-5 py-2.5 font-normal md:table-cell">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.045]">
                {departments.map((department) => {
                  const Icon = department.icon;
                  const share = kpis.total > 0 ? (department.total / kpis.total) * 100 : 0;
                  return (
                    <tr key={department.id} className="group transition-colors hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${toneStyles[department.tone].icon}`}>
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium text-neutral-100">{department.name}</p>
                            <p className="text-[10px] text-neutral-400">{department.subtitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.07em] ${
                            department.isOpen
                              ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300'
                              : 'border-white/[0.08] bg-white/[0.03] text-neutral-400'
                          }`}
                        >
                          {department.isOpen ? (
                            <Unlock className="h-2.5 w-2.5" aria-hidden="true" />
                          ) : (
                            <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                          )}
                          {department.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[11.5px] tabular-nums text-neutral-100">
                        {department.total}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[11.5px] tabular-nums text-sky-300/90">
                        {department.pending}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[11.5px] tabular-nums text-emerald-300/90">
                        {department.approved}
                      </td>
                      <td className="hidden px-5 py-3 md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-14 xl:w-20">
                            <MetricBar value={share} tone={department.tone} label={`${department.name} share`} />
                          </div>
                          <span className="w-8 text-right font-mono text-[10px] tabular-nums text-neutral-400">
                            {Math.round(share)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
            <p className="text-[10px] leading-relaxed text-neutral-400">
              Closing a channel is enforced by database triggers, not just this interface.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('registrations')}
              className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-medium text-[#d4af37] transition-colors hover:text-[#f0dda2]"
            >
              All records
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Recent */}
        <Panel className="xl:col-span-7">
          <PanelHeader
            title="Recent registrations"
            description="The latest records received by the secretariat."
            action={
              <button type="button" onClick={() => onNavigate('registrations')} className={btnGhost}>
                View all
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            }
          />
          {loading && allRegistrations.length === 0 ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="No registrations yet"
              description="Applications submitted through the conference website will appear here immediately."
              action={
                <button type="button" onClick={onRefresh} className={btnGhost}>
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Refresh records
                </button>
              }
            />
          ) : (
            <ul className="divide-y divide-white/[0.045]">
              {recent.map((application) => (
                <li
                  key={`${application._type}-${application.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]"
                >
                  <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-[9.5px] font-semibold text-neutral-300 sm:flex">
                    {initials(application.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[12px] font-medium text-neutral-100">
                        {application.full_name || 'Unnamed applicant'}
                      </p>
                      <StatusBadge status={application.status} className="hidden sm:inline-flex" />
                    </div>
                    <p className="mt-0.5 truncate text-[10.5px] text-neutral-400">
                      <span className="text-[#c9a64a]/90">{application._teamLabel}</span>
                      <span className="mx-1.5 text-neutral-700" aria-hidden="true">·</span>
                      {application.institution || application.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-[10px] font-mono text-neutral-400 md:inline">
                      {formatDate(application.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onViewApplication(application, application._type)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/[0.09] px-2 py-1 text-[10px] text-neutral-400 transition-colors hover:border-[#d4af37]/35 hover:text-[#e2c258]"
                      aria-label={`Review ${application.full_name}`}
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

        <div className="space-y-5 xl:col-span-5">
          {/* Trend */}
          <Panel>
            <PanelHeader
              title="Submission trend"
              description={`${timeline.periodTotal} application${timeline.periodTotal === 1 ? '' : 's'} in the last 14 days.`}
              action={<TrendingUp className="h-4 w-4 text-[#d4af37]" aria-hidden="true" />}
            />
            <div className="px-5 pb-5 pt-4">
              {timeline.periodTotal === 0 ? (
                <div className="flex h-[112px] items-center justify-center border-b border-white/[0.06] text-[11px] text-neutral-400">
                  No submissions in this period
                </div>
              ) : (
                <div className="flex h-[112px] items-end gap-[3px] border-b border-white/[0.06] pb-1">
                  {timeline.days.map((day) => (
                    <div key={day.key} className="group relative flex h-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-[2px] bg-gradient-to-t from-[#7c6425] to-[#d4af37] opacity-80 transition-opacity group-hover:opacity-100"
                        style={{
                          height: `${Math.max(day.count > 0 ? 8 : 2, Math.round((day.count / timeline.max) * 100))}%`,
                        }}
                        title={`${day.label}: ${day.count} registration${day.count === 1 ? '' : 's'}`}
                        aria-label={`${day.label}: ${day.count} registrations`}
                        role="img"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.1em] text-neutral-400">
                <span>{timeline.days[0]?.label}</span>
                <span>Today</span>
              </div>
            </div>
          </Panel>

          {/* Attention */}
          <Panel>
            <PanelHeader
              title="Awaiting a decision"
              description="Oldest unresolved applications."
              action={
                <span className="rounded-full border border-sky-400/20 bg-sky-400/[0.07] px-2 py-0.5 text-[9.5px] font-mono tabular-nums text-sky-300">
                  {kpis.pending}
                </span>
              }
            />
            {attention.length === 0 ? (
              <div className="flex items-center gap-2.5 px-5 py-5 text-[11.5px] text-neutral-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400/80" aria-hidden="true" />
                Every application has a decision.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.045]">
                {attention.map((application) => (
                  <li key={`attention-${application._type}-${application.id}`}>
                    <button
                      type="button"
                      onClick={() => onViewApplication(application, application._type)}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-white/[0.025]"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          application.status === 'under_review' ? 'bg-sky-400' : 'bg-neutral-500'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] text-neutral-200">
                          {application.full_name}
                        </span>
                        <span className="block truncate text-[10px] text-neutral-400">
                          {application._teamLabel} · {formatDate(application.created_at)}
                        </span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.055] pt-3 text-[9.5px] font-mono uppercase tracking-[0.13em] text-neutral-700">
        <span className="inline-flex items-center gap-1.5">
          <Database className="h-3 w-3" aria-hidden="true" />
          Supabase Postgres · Row Level Security enforced
        </span>
        <span>{allRegistrations.length} records in scope</span>
      </div>
    </div>
  );
};
