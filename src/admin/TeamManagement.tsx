import React, { useState } from 'react';
import {
  Shield,
  Camera,
  HeartHandshake,
  GraduationCap,
  Loader2,
  Copy,
  Check,
  Lock,
  Unlock,
  Info,
  ChevronDown,
  Database,
} from 'lucide-react';
import { btnGhost, type Row } from './ui';
import {
  ConfirmDialog,
  MetricBar,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  Toast,
} from '../dashboard/ui';

interface TeamManagementProps {
  settings: Record<string, string>;
  delegates: Row[];
  teamRegistrations: Row[];
  loading: boolean;
  onRefresh: () => void;
  onSettingsUpdate: (key: string, val: string) => Promise<boolean>;
}

const SQL_MIGRATION_SAMPLE = `-- Run in Supabase > SQL Editor > New query if team_registrations does not exist:
create table if not exists public.team_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text default '',
  institution text not null,
  team text not null check (team in ('security', 'media', 'volunteers')),
  experience text default '',
  statement text default '',
  status text not null default 'received',
  admin_notes text default '',
  age_confirmed boolean not null,
  consent_version text not null,
  consent_at timestamptz not null default now()
);
alter table public.team_registrations enable row level security;
create policy "public submit team" on public.team_registrations for insert to anon, authenticated with check (true);
create policy "admin read team" on public.team_registrations for select to authenticated using (public.is_admin());
create policy "admin update team" on public.team_registrations for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete team" on public.team_registrations for delete to authenticated using (public.is_admin());
grant insert (full_name, email, phone, institution, team, experience, statement, age_confirmed, consent_version) on public.team_registrations to anon, authenticated;
grant select, update, delete on public.team_registrations to authenticated;`;

export const TeamManagement: React.FC<TeamManagementProps> = ({
  settings,
  delegates,
  teamRegistrations,
  loading,
  onRefresh,
  onSettingsUpdate,
}) => {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    name: string;
    settingKey: string;
    currentOpen: boolean;
  } | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const teams = [
    {
      id: 'delegates',
      name: 'Conference Delegates',
      category: 'Diplomatic delegation',
      description:
        'Single delegates and institutional school delegations participating in committee debate.',
      icon: GraduationCap,
      settingKey: 'registration_open',
      isOpen: settings.registration_open?.toLowerCase() === 'true',
      records: delegates,
      openHelp: 'When closed, the public delegate form shows TBA and the database rejects submissions.',
    },
    {
      id: 'security',
      name: 'Security & Protocol',
      category: 'Summit operations',
      description:
        'Security officers responsible for delegate safety, floor protocol and committee room decorum.',
      icon: Shield,
      settingKey: 'team_security_open',
      isOpen: (settings.team_security_open ?? 'true').toLowerCase() === 'true',
      records: teamRegistrations.filter((t) => t.team === 'security'),
      openHelp: 'When closed, Security applicants see a closed notice and the database blocks inserts.',
    },
    {
      id: 'media',
      name: 'Media & Press Corps',
      category: 'Summit press corps',
      description:
        'Journalists, photographers, videographers and social media managers documenting proceedings.',
      icon: Camera,
      settingKey: 'team_media_open',
      isOpen: (settings.team_media_open ?? 'true').toLowerCase() === 'true',
      records: teamRegistrations.filter((t) => t.team === 'media'),
      openHelp: 'When closed, Media applicants see a closed notice and the database blocks inserts.',
    },
    {
      id: 'volunteers',
      name: 'Conference Volunteers',
      category: 'General staff',
      description:
        'Logistics personnel, dais runners, registration assistants and general conference staff.',
      icon: HeartHandshake,
      settingKey: 'team_volunteers_open',
      isOpen: (settings.team_volunteers_open ?? 'true').toLowerCase() === 'true',
      records: teamRegistrations.filter((t) => t.team === 'volunteers'),
      openHelp: 'When closed, Volunteer applicants see a closed notice and the database blocks inserts.',
    },
  ];

  const executeToggle = async () => {
    if (!confirmTarget) return;
    const { settingKey, currentOpen, name } = confirmTarget;
    const nextVal = currentOpen ? 'false' : 'true';

    setBusyKey(settingKey);
    setNotice(null);

    const success = await onSettingsUpdate(settingKey, nextVal);
    setBusyKey(null);
    setConfirmTarget(null);

    if (success) {
      setNotice({
        type: 'success',
        message: `${name} registration is now ${nextVal === 'true' ? 'open' : 'closed'}. The change is enforced by the database.`,
      });
      setToast(`${name} registration ${nextVal === 'true' ? 'opened' : 'closed'}.`);
      onRefresh();
    } else {
      setNotice({
        type: 'error',
        message: `Could not update ${name}. Confirm this account has a row in public.admins and try again.`,
      });
    }
  };

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(SQL_MIGRATION_SAMPLE);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      setNotice({ type: 'error', message: 'Clipboard access was blocked by the browser.' });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Registration governance"
        title="Departments"
        description="Open or close each public registration channel independently. Every switch is persisted in public.settings and enforced by database triggers, not just this interface."
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.12em] text-neutral-400">
            <Database className="h-3 w-3 text-[#d4af37]/80" aria-hidden="true" />
            Live Supabase settings
          </span>
        }
        actions={
          <button type="button" onClick={onRefresh} className={btnGhost} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Refresh status
          </button>
        }
      />

      {notice && (
        <Notice
          tone={notice.type === 'error' ? 'error' : 'success'}
          onDismiss={() => setNotice(null)}
        >
          {notice.message}
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {teams.map((team) => {
          const Icon = team.icon;
          const total = team.records.length;
          const pending = team.records.filter(
            (record) => record.status === 'received' || record.status === 'under_review',
          ).length;
          const approved = team.records.filter((record) => record.status === 'accepted').length;
          const rejected = team.records.filter((record) => record.status === 'rejected').length;
          const approvalShare = total > 0 ? (approved / total) * 100 : 0;
          const isBusy = busyKey === team.settingKey;

          return (
            <Panel key={team.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${
                      team.isOpen
                        ? 'border-[#d4af37]/25 bg-[#d4af37]/[0.07] text-[#e2c258]'
                        : 'border-white/[0.08] bg-white/[0.02] text-neutral-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                      {team.category}
                    </p>
                    <h2 className="mt-0.5 truncate text-[14px] font-semibold text-white">{team.name}</h2>
                  </div>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.07em] ${
                    team.isOpen
                      ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300'
                      : 'border-white/[0.08] bg-white/[0.03] text-neutral-400'
                  }`}
                >
                  {team.isOpen ? (
                    <Unlock className="h-2.5 w-2.5" aria-hidden="true" />
                  ) : (
                    <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                  )}
                  {team.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>

              <p className="mt-3 min-h-[32px] text-[11.5px] leading-relaxed text-neutral-400">
                {team.description}
              </p>

              <div className="mt-4 grid grid-cols-3 divide-x divide-white/[0.06] rounded-md border border-white/[0.07] bg-white/[0.012] py-2.5 text-center">
                <div>
                  <p className="text-[8.5px] font-mono uppercase tracking-[0.12em] text-neutral-400">Total</p>
                  <p className="mt-0.5 font-mono text-[14px] tabular-nums text-neutral-100">{total}</p>
                </div>
                <div>
                  <p className="text-[8.5px] font-mono uppercase tracking-[0.12em] text-neutral-400">Pending</p>
                  <p className="mt-0.5 font-mono text-[14px] tabular-nums text-sky-300/90">{pending}</p>
                </div>
                <div>
                  <p className="text-[8.5px] font-mono uppercase tracking-[0.12em] text-neutral-400">Approved</p>
                  <p className="mt-0.5 font-mono text-[14px] tabular-nums text-emerald-300/90">{approved}</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[10px] text-neutral-400">
                  <span>Approval share</span>
                  <span className="font-mono tabular-nums text-neutral-400">
                    {Math.round(approvalShare)}%
                  </span>
                </div>
                <MetricBar value={approvalShare} tone="gold" label={`${team.name} approval share`} />
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                <span className="max-w-[13rem] text-[10px] leading-relaxed text-neutral-400">
                  {team.isOpen ? 'Accepting new applications' : 'Closed to new applicants'}
                  {rejected > 0 ? ` · ${rejected} declined` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmTarget({
                      id: team.id,
                      name: team.name,
                      settingKey: team.settingKey,
                      currentOpen: team.isOpen,
                    });
                    setNotice(null);
                  }}
                  disabled={isBusy}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10.5px] font-medium transition-colors ${
                    team.isOpen
                      ? 'border border-rose-400/22 bg-rose-400/[0.05] text-rose-300 hover:bg-rose-400/[0.11]'
                      : 'border border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300 hover:bg-emerald-400/[0.12]'
                  }`}
                >
                  {isBusy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                  {team.isOpen ? 'Close registration' : 'Open registration'}
                </button>
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel>
        <PanelHeader
          eyebrow="Technical reference"
          title="Server-side enforcement"
          description="Team registration state is anchored in the PostgreSQL settings table. Database triggers intercept every insert, so closing a channel cannot be bypassed from the browser."
          action={
            <button type="button" onClick={copySql} className={btnGhost}>
              {copiedSql ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copiedSql ? 'Copied' : 'Copy schema SQL'}
            </button>
          }
        />
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-[11px] text-neutral-400 transition-colors hover:text-neutral-200">
            <span className="inline-flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-[#d4af37]/80" aria-hidden="true" />
              Show the table, triggers and RLS policies used by these switches
            </span>
            <ChevronDown
              className="h-3.5 w-3.5 text-neutral-400 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-white/[0.06] px-5 pb-5 pt-3">
            <pre className="wm-scroll max-h-64 overflow-auto rounded-md border border-white/[0.07] bg-[#08080a] p-3 font-mono text-[9.5px] leading-relaxed text-neutral-400">
              {SQL_MIGRATION_SAMPLE}
            </pre>
            <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
              Never place the service-role key in this panel or anywhere in the browser bundle.
            </p>
          </div>
        </details>
      </Panel>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onClose={() => {
          if (!busyKey) setConfirmTarget(null);
        }}
        onConfirm={executeToggle}
        title={confirmTarget?.currentOpen ? 'Close registration?' : 'Open registration?'}
        confirmLabel={confirmTarget?.currentOpen ? 'Close registration' : 'Open registration'}
        cancelLabel="Keep current status"
        tone={confirmTarget?.currentOpen ? 'danger' : 'gold'}
        busy={Boolean(busyKey)}
        description={
          confirmTarget ? (
            <>
              <p className="font-medium text-neutral-100">
                {confirmTarget.name}
              </p>
              <p className="mt-1">
                {confirmTarget.currentOpen
                  ? 'New submissions will be blocked immediately on the website and by database triggers. Existing applications remain safe and reviewable.'
                  : 'Candidates will be able to submit new applications for this channel as soon as the setting is saved.'}
              </p>
            </>
          ) : null
        }
      />

      {toast && <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />}
    </div>
  );
};
