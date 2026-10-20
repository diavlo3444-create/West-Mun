import React from 'react';
import {
  Lock,
  Unlock,
  Shield,
  UserCheck,
  Mail,
  Database,
  ArrowRight,
  Layers,
  KeyRound,
} from 'lucide-react';
import {
  MetricBar,
  PageHeader,
  Panel,
  PanelHeader,
  btnPrimary,
  btnSecondary,
} from '../dashboard/ui';
import { getRoleTitle, type DepartmentMeta, type SectionKey } from './departments';
import type { HeadStats } from './HeadOverview';

interface HeadDepartmentProps {
  meta: DepartmentMeta;
  section?: SectionKey | null;
  headName?: string;
  headEmail: string;
  isOpen: boolean;
  stats: HeadStats;
  /** Only Media/Press, Security, and Volunteers may manage registrations. */
  registrationAccess: boolean;
  onOpenRegistrations: () => void;
  onOpenWorkspace?: () => void;
}

export const HeadDepartment: React.FC<HeadDepartmentProps> = ({
  meta,
  section,
  headName,
  headEmail,
  isOpen,
  stats,
  registrationAccess,
  onOpenRegistrations,
  onOpenWorkspace,
}) => {
  const Icon = meta.icon;

  // PR and HR keep their existing sponsor/inquiry modules; neither is on the
  // registration allowlist, so their copy must not promise candidate access.
  const workspaceScopeCopy =
    meta.key === 'pr'
      ? 'Your tools write to public.department_records scoped to PR, and you manage public.sponsors through the existing sponsor manager. Candidate applications, inquiries, admins, and other departments stay outside your scope in PostgreSQL RLS.'
      : meta.key === 'hr'
        ? 'Your tools write to public.department_records scoped to HR, and you can triage public.inquiries. Sponsors, candidate applications, admins, and other departments stay outside your scope in PostgreSQL RLS.'
        : `Your tools write to public.department_records scoped to ${meta.label}. Candidate applications, sponsor records, and inquiries stay outside your scope in PostgreSQL RLS.`;

  const visibleRecordsCopy =
    meta.key === 'pr'
      ? 'All sponsor records in public.sponsors plus PR department_records and shared venue, equipment, and run-of-show records. No registration rows.'
      : meta.key === 'hr'
        ? 'Public inquiries in public.inquiries plus HR department_records and shared coordination records. No registration rows and no sponsor access.'
        : registrationAccess
          ? `Only team_registrations where team matches ${meta.label}${section ? ` and section is ${section}` : ''}, plus department_records for ${meta.label}.`
          : `public.department_records rows for ${meta.label}${section ? ` (${section} division)` : ''}, plus shared venue, equipment, and run-of-show records. No registration rows.`;

  const permittedActionsCopy =
    meta.key === 'pr'
      ? 'Manage sponsor tiers and tasks, partner follow-ups, and approved logo records with the existing sponsors manager and site-files storage.'
      : meta.key === 'hr'
        ? 'Triage and update public inquiries; record internal notes and HR follow-ups. Inquiries cannot be deleted and sponsors stay out of scope.'
        : registrationAccess
          ? 'Create, edit, and delete department records; review candidate records in scope and update status and internal notes.'
          : 'Create, edit, and delete records only in your department workspace. Candidate records, account management, and other departments stay out of scope.';

  const sharedDatabaseCopy =
    meta.key === 'pr'
      ? 'Inquiries, candidate registrations, delegates, admins, and other departments remain strictly outside your scope in PostgreSQL RLS.'
      : meta.key === 'hr'
        ? 'Sponsors, candidate registrations, delegates, admins, and other departments remain strictly outside your scope in PostgreSQL RLS.'
        : registrationAccess
          ? 'Delegates, inquiries, admins, and the other ten departments remain outside your scope even through the Supabase API.'
          : 'Candidate registrations, sponsors, inquiries, delegates, and admins remain outside your scope even through the Supabase API.';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Assignment & scope"
        title="Department"
        description="Your verified assignment and the exact data boundary your account operates within."
        actions={
          registrationAccess ? (
            <button type="button" onClick={onOpenRegistrations} className={btnPrimary}>
              Open applications
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : onOpenWorkspace ? (
            <button type="button" onClick={onOpenWorkspace} className={btnPrimary}>
              Open workspace
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Panel className="lg:col-span-7">
          <PanelHeader
            eyebrow="Verified assignment"
            title="Leadership record"
            description="Read from public.department_heads using your authenticated Supabase user ID."
            action={
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d4af37]/25 bg-[#d4af37]/[0.07] text-[#e2c258]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            }
          />
          <div className="p-5">
            <div className="flex items-start gap-3 border-b border-white/[0.06] pb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.08] text-[11px] font-semibold text-[#e2c258]">
                {String(headName || headEmail || 'H')
                  .split(/[\s@.]/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join('')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-white">
                  {headName || 'Department head'}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 truncate font-mono text-[10.5px] text-neutral-400">
                  <Mail className="h-3 w-3 text-neutral-400" aria-hidden="true" />
                  {headEmail}
                </p>
                <p className="mt-1 text-[10.5px] text-[#d4af37]/85">
                  {getRoleTitle(meta.key, section)}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-[11.5px] sm:grid-cols-2">
              <div>
                <dt className="text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  Department
                </dt>
                <dd className="mt-0.5 text-neutral-200">{meta.label}</dd>
              </div>
              <div>
                <dt className="text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  Division
                </dt>
                <dd className="mt-0.5 text-neutral-200">
                  {section ? `${section.charAt(0).toUpperCase()}${section.slice(1)} division` : 'Department-wide'}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  Registration channel
                </dt>
                <dd className="mt-0.5 font-mono text-[10.5px] text-neutral-400">{meta.settingKey}</dd>
              </div>
              <div>
                <dt className="text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  Access model
                </dt>
                <dd className="mt-0.5 inline-flex items-center gap-1.5 text-neutral-300">
                  <Shield className="h-3 w-3 text-emerald-400/80" aria-hidden="true" />
                  Row Level Security
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-md border border-white/[0.07] bg-white/[0.012] p-3">
              <p className="text-[10.5px] leading-relaxed text-neutral-400">
                {meta.description}
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelHeader
            eyebrow={registrationAccess ? 'Public channel' : 'Data boundary'}
            title={registrationAccess ? 'Registration status' : 'Workspace records'}
            description={
              registrationAccess
                ? 'Controlled by the Secretariat. This view is read-only.'
                : 'Registration data is not part of this department\u2019s authorized scope.'
            }
          />
          {!registrationAccess && (
            <div className="p-5">
              <div className="flex items-start gap-3 rounded-md border border-[#d4af37]/20 bg-[#d4af37]/[0.05] p-3.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.08] text-[#e2c258]">
                  <Database className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[12px] font-medium text-[#f1e4bb]">Department workspace only</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-neutral-400">
                    {workspaceScopeCopy}
                  </p>
                </div>
              </div>
              <p className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-neutral-400">
                Only Media/Press, Security, and Volunteers are authorized for registration management. Your
                department keeps its operational tools and this assignment record.
              </p>
            </div>
          )}
          {registrationAccess && (
          <div className="p-5">
            <div
              className={`flex items-start gap-3 rounded-md border p-3.5 ${
                isOpen
                  ? 'border-emerald-400/20 bg-emerald-400/[0.05]'
                  : 'border-white/[0.08] bg-white/[0.02]'
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                  isOpen
                    ? 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300'
                    : 'border-white/[0.1] bg-white/[0.03] text-neutral-400'
                }`}
              >
                {isOpen ? (
                  <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
              <div>
                <p className={`text-[12px] font-medium ${isOpen ? 'text-emerald-200' : 'text-neutral-300'}`}>
                  {isOpen ? 'Accepting applications' : 'Closed to new applications'}
                </p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-neutral-400">
                  {isOpen
                    ? 'Candidates can submit through the public conference website. New records appear in your applications view.'
                    : 'Existing applications remain available for review, but no new submissions are accepted until the Secretariat reopens the channel.'}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-neutral-400">Approved share</span>
                <span className="font-mono tabular-nums text-neutral-300">
                  {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                </span>
              </div>
              <MetricBar
                value={stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}
                tone="gold"
                label="Approved share"
              />
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                {[
                  { label: 'Total', value: stats.total },
                  { label: 'Pending', value: stats.pending },
                  { label: 'Approved', value: stats.approved },
                ].map((item) => (
                  <div key={item.label} className="rounded border border-white/[0.06] bg-white/[0.015] py-2">
                    <p className="text-[8px] font-mono uppercase tracking-[0.12em] text-neutral-400">
                      {item.label}
                    </p>
                    <p className="mt-0.5 font-mono text-[13px] tabular-nums text-neutral-200">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-neutral-400">
              Need the channel opened or closed? Contact the Secretariat or the IT Super Admin; department
              heads cannot change public registration settings.
            </p>
          </div>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          eyebrow="Security boundary"
          title="What your account can access"
          description="These limits are enforced in PostgreSQL, not only hidden in the interface."
        />
        <div className="grid grid-cols-1 divide-y divide-white/[0.06] md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            {
              icon: Database,
              title: 'Visible records',
              copy: visibleRecordsCopy,
            },
            {
              icon: UserCheck,
              title: 'Permitted actions',
              copy: permittedActionsCopy,
            },
            {
              icon: KeyRound,
              title: 'Shared database',
              copy: sharedDatabaseCopy,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] text-[#d4af37]/85">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[11.5px] font-medium text-neutral-200">{item.title}</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-neutral-400">{item.copy}</p>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3">
          <p className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400">
            <Layers className="h-3 w-3" aria-hidden="true" />
            Department head access · Supabase authenticated
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-1 text-[10.5px] text-[#d4af37] transition-colors hover:text-[#f0dda2]"
          >
            View public website
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </Panel>
    </div>
  );
};
