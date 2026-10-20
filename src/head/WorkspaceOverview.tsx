import React, { useMemo } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Inbox,
  Key,
  Megaphone,
  RefreshCw,
  Users,
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
  btnGhost,
  btnPrimary,
  btnSecondary,
  cx,
} from '../dashboard/ui';
import type { DepartmentMeta, SectionKey } from './departments';
import type { DepartmentRecord } from './services/departmentStore';
import type { HeadAnnouncement } from './HeadOverview';
import {
  getWorkspaceModules,
  isOpenStatus,
  isOverdue,
  recordDeadline,
  type WorkspaceModule,
} from './workspaces';

interface WorkspaceModuleGridProps {
  meta: DepartmentMeta;
  records: DepartmentRecord[];
  loading: boolean;
  onOpenModule: (moduleId: string) => void;
  className?: string;
}

/**
 * Grid of department modules with real record counts derived from Supabase.
 * Nothing here is a placeholder statistic: counts come from the loaded rows.
 */
export const WorkspaceModuleGrid: React.FC<WorkspaceModuleGridProps> = ({
  meta,
  records,
  loading,
  onOpenModule,
  className,
}) => {
  const modules = getWorkspaceModules(meta.key);

  return (
    <div className={cx('grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {modules.map((module) => {
        const moduleRecords = records.filter((record) => record.category === module.category);
        const open = moduleRecords.filter((record) => isOpenStatus(module, record.status)).length;
        const overdue = moduleRecords.filter((record) => isOverdue(module, record)).length;
        const Icon = module.icon;

        return (
          <button
            key={module.id}
            type="button"
            onClick={() => onOpenModule(module.id)}
            className="group relative flex h-full flex-col rounded-[10px] border border-white/[0.075] bg-[#0c0c0f] p-4 text-left transition-colors duration-150 hover:border-[#d4af37]/30 hover:bg-[#101013] focus:outline-none focus-visible:border-[#d4af37]/60"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#d4af37]/25 bg-[#d4af37]/[0.07] text-[#e2c258]">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              {loading ? (
                <Skeleton className="h-5 w-12" />
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-400">
                  {moduleRecords.length} saved
                </span>
              )}
            </div>
            <p className="mt-3 text-[12.5px] font-medium text-neutral-100">{module.label}</p>
            <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-neutral-400">
              {module.description}
            </p>
            <div className="mt-auto flex items-center gap-2 pt-3">
              {!loading && (
                <>
                  <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.08em] text-neutral-300">
                    {open} open
                  </span>
                  {overdue > 0 && (
                    <span className="rounded border border-rose-400/25 bg-rose-400/[0.07] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.08em] text-rose-300">
                      {overdue} overdue
                    </span>
                  )}
                </>
              )}
              <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-neutral-400 transition-colors group-hover:text-[#e2c258]">
                Open
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

interface WorkspaceOverviewProps {
  meta: DepartmentMeta;
  section?: SectionKey | null;
  headName?: string;
  records: DepartmentRecord[];
  loading: boolean;
  storageError: string;
  announcements: HeadAnnouncement[];
  onRefresh: () => void;
  onOpenModule: (moduleId: string) => void;
  onReplayUnlock?: () => void;
  /** Present only for Media/Press, Security, and Volunteers. */
  registrationAccess?: boolean;
  registrationCount?: number;
  onOpenRegistrations?: () => void;
}

function moduleForCategory(meta: DepartmentMeta, category: string): WorkspaceModule | undefined {
  return getWorkspaceModules(meta.key).find((module) => module.category === category);
}

function shortDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export const WorkspaceOverview: React.FC<WorkspaceOverviewProps> = ({
  meta,
  section,
  headName,
  records,
  loading,
  storageError,
  announcements,
  onRefresh,
  onOpenModule,
  onReplayUnlock,
  registrationAccess = false,
  registrationCount = 0,
  onOpenRegistrations,
}) => {
  const modules = getWorkspaceModules(meta.key);

  const totals = useMemo(() => {
    let open = 0;
    let overdue = 0;
    let urgent = 0;
    for (const record of records) {
      const module = moduleForCategory(meta, record.category);
      if (!module) continue;
      if (isOpenStatus(module, record.status)) open += 1;
      if (isOverdue(module, record)) overdue += 1;
      if (record.priority === 'urgent' || record.priority === 'high') urgent += 1;
    }
    const closed = records.length - open;
    return {
      total: records.length,
      open,
      overdue,
      urgent,
      completion: records.length > 0 ? Math.round((closed / records.length) * 100) : 0,
    };
  }, [records, meta]);

  const recent = useMemo(
    () =>
      [...records]
        .sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, 6),
    [records],
  );

  const Icon = meta.icon;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={headName ? `Welcome back, ${headName}` : 'Department command'}
        title={meta.label}
        description={
          section
            ? `You are signed in to the ${section} division of ${meta.label}. Records you create are scoped to your department and division.`
            : meta.description
        }
        meta={
          <>
            {section && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.08em] text-[#e2c258]">
                {section} division
              </span>
            )}
            <span className="text-[10px] text-neutral-400">{meta.tagline}</span>
          </>
        }
        actions={
          <>
            {onReplayUnlock && (
              <button
                type="button"
                onClick={onReplayUnlock}
                className={btnSecondary}
                title="Replay the golden key unlock sequence"
              >
                <Key className="h-3.5 w-3.5 text-[#d4af37]" aria-hidden="true" />
                Unlock intro
              </button>
            )}
            <button type="button" onClick={onRefresh} className={btnSecondary} disabled={loading}>
              <RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden="true" />
              Refresh
            </button>
            {modules[0] && (
              <button type="button" onClick={() => onOpenModule(modules[0].id)} className={btnPrimary}>
                Open {modules[0].navLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </>
        }
      />

      {storageError && <Notice tone="error" title="Workspace storage unavailable">{storageError}</Notice>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total records"
          value={totals.total}
          helper="Across every module in your department"
          icon={Icon}
          tone="gold"
          loading={loading && records.length === 0}
        />
        <StatCard
          label="Open items"
          value={totals.open}
          helper={totals.overdue > 0 ? `${totals.overdue} overdue` : 'Nothing overdue'}
          icon={Clock}
          tone={totals.overdue > 0 ? 'rose' : 'sky'}
          loading={loading && records.length === 0}
        />
        <StatCard
          label="High priority"
          value={totals.urgent}
          helper="Marked high or urgent"
          icon={CheckCircle2}
          tone="amber"
          loading={loading && records.length === 0}
        />
        <StatCard
          label={registrationAccess ? 'Registrations' : 'Closed items'}
          value={registrationAccess ? registrationCount : totals.total - totals.open}
          helper={
            registrationAccess
              ? 'Authorized registration scope'
              : `${totals.completion}% of your records closed`
          }
          icon={registrationAccess ? Users : CheckCircle2}
          tone="emerald"
          loading={loading && records.length === 0}
          footer={
            registrationAccess && onOpenRegistrations ? (
              <button
                type="button"
                onClick={onOpenRegistrations}
                className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-[#e2c258] hover:text-[#f1e4bb]"
              >
                Open applications
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            ) : (
              <div className="mt-3">
                <MetricBar
                  value={totals.total > 0 ? (totals.total - totals.open) / totals.total * 100 : 0}
                  tone="emerald"
                  label="Closed records"
                />
              </div>
            )
          }
        />
      </div>

      <section aria-labelledby="workspace-modules-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="workspace-modules-heading" className="text-[13.5px] font-semibold text-white">
              Your department workspace
            </h2>
            <p className="mt-0.5 text-[11.5px] text-neutral-400">
              {modules.length} tools scoped to {meta.label}. Changes save directly to Supabase.
            </p>
          </div>
        </div>
        <WorkspaceModuleGrid
          meta={meta}
          records={records}
          loading={loading}
          onOpenModule={onOpenModule}
        />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Panel className="xl:col-span-7">
          <PanelHeader
            title="Recently updated"
            description="The latest changes across every module in your department."
            action={
              <button
                type="button"
                onClick={onRefresh}
                className={btnGhost}
                disabled={loading}
                aria-label="Refresh recent records"
              >
                <RefreshCw className={cx('h-3 w-3', loading && 'animate-spin')} aria-hidden="true" />
              </button>
            }
          />
          {loading && records.length === 0 ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No records yet"
              description="Create your first record in any module above. It will appear here and persist after refresh."
            />
          ) : (
            <ul className="divide-y divide-white/[0.045]">
              {recent.map((record) => {
                const module = moduleForCategory(meta, record.category);
                const deadline = recordDeadline(record.data);
                const overdue = module ? isOverdue(module, record) : false;
                return (
                  <li key={record.id}>
                    <button
                      type="button"
                      onClick={() => module && onOpenModule(module.id)}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.025]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-neutral-100">
                          {record.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[10.5px] text-neutral-400">
                          {module?.label || record.category} · {record.status}
                          {deadline ? ` · due ${shortDate(deadline)}${overdue ? ' (overdue)' : ''}` : ''}
                        </span>
                      </span>
                      <span className="hidden shrink-0 font-mono text-[10px] text-neutral-400 sm:inline">
                        {shortDate(record.updated_at)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel className="xl:col-span-5">
          <PanelHeader
            eyebrow="Secretariat"
            title="Notices"
            description="Published announcements from the conference organisers."
            action={<Megaphone className="h-4 w-4 text-[#d4af37]" aria-hidden="true" />}
          />
          {announcements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No published notices"
              description="Announcements published by the Secretariat will appear here."
            />
          ) : (
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
                  </div>
                  {announcement.body && (
                    <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-neutral-400">
                      {announcement.body}
                    </p>
                  )}
                  <p className="mt-1.5 inline-flex items-center gap-1 font-mono text-[9.5px] text-neutral-500">
                    <CalendarDays className="h-2.5 w-2.5" aria-hidden="true" />
                    {shortDate(announcement.published_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
};
