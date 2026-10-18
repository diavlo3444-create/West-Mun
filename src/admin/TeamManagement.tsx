import React, { useState } from 'react';
import {
  Shield,
  Camera,
  HeartHandshake,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  Lock,
  Unlock,
  Info,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cardCls, btnGold, btnGhost, btnDanger, explainError, type Row } from './ui';

interface TeamManagementProps {
  settings: Record<string, string>;
  delegates: Row[];
  teamRegistrations: Row[];
  loading: boolean;
  onRefresh: () => void;
  onSettingsUpdate: (key: string, val: string) => Promise<boolean>;
}

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
  const [copiedSql, setCopiedSql] = useState(false);

  const teams = [
    {
      id: 'delegates',
      name: 'Conference Delegates',
      category: 'Diplomatic Delegation',
      description: 'Single delegates and institutional school delegations participating in committee debate.',
      icon: GraduationCap,
      settingKey: 'registration_open',
      isOpen: settings.registration_open?.toLowerCase() === 'true',
      records: delegates,
      openHelp: 'When closed, public delegate registration form displays TBA status and rejects new submissions.',
    },
    {
      id: 'security',
      name: 'Security Team',
      category: 'Summit Operations',
      description: 'Security officers responsible for delegate safety, floor protocol, and committee room decorum.',
      icon: Shield,
      settingKey: 'team_security_open',
      isOpen: (settings.team_security_open ?? 'true').toLowerCase() === 'true',
      records: teamRegistrations.filter((t) => t.team === 'security'),
      openHelp: 'When closed, Security applicants see a closed notice and the database blocks incoming submissions.',
    },
    {
      id: 'media',
      name: 'Media & Press Team',
      category: 'Summit Press Corps',
      description: 'Journalists, photographers, videographers, and social media managers documenting proceedings.',
      icon: Camera,
      settingKey: 'team_media_open',
      isOpen: (settings.team_media_open ?? 'true').toLowerCase() === 'true',
      records: teamRegistrations.filter((t) => t.team === 'media'),
      openHelp: 'When closed, Media applicants see a closed notice and the database blocks incoming submissions.',
    },
    {
      id: 'volunteers',
      name: 'Conference Volunteers',
      category: 'General Staff',
      description: 'Logistics personnel, dais runners, registration assistants, and general conference staff.',
      icon: HeartHandshake,
      settingKey: 'team_volunteers_open',
      isOpen: (settings.team_volunteers_open ?? 'true').toLowerCase() === 'true',
      records: teamRegistrations.filter((t) => t.team === 'volunteers'),
      openHelp: 'When closed, Volunteer applicants see a closed notice and the database blocks incoming submissions.',
    },
  ];

  const handleToggleClick = (t: typeof teams[0]) => {
    setConfirmTarget({
      id: t.id,
      name: t.name,
      settingKey: t.settingKey,
      currentOpen: t.isOpen,
    });
    setNotice(null);
  };

  const executeToggle = async () => {
    if (!confirmTarget || !supabase) return;
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
        message: `${name} registration is now ${nextVal === 'true' ? 'OPEN' : 'CLOSED'}. Server rules updated.`,
      });
      onRefresh();
    } else {
      setNotice({
        type: 'error',
        message: `Failed to update status for ${name}. Ensure your account has organiser privileges in public.admins.`,
      });
    }
  };

  const sqlMigrationSample = `-- Run in Supabase > SQL Editor > New query if team_registrations table is not yet created:
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

  const copySql = () => {
    navigator.clipboard.writeText(sqlMigrationSample);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-8 h-[1px] bg-[#d4af37]" />
          <span className="text-[11px] font-mono tracking-widest uppercase text-[#d4af37] font-semibold">
            Registration Governance
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">Team Management & Access Controls</h1>
        <p className="text-xs text-neutral-400 mt-1 font-light max-w-2xl leading-relaxed">
          Independently control registration availability for Security, Media, Volunteers, and Delegates.
          Closures are enforced directly at the database layer to prevent unauthorized API submissions.
        </p>
      </div>

      {notice && (
        <div
          className={`p-3.5 text-xs rounded-sm border flex items-center justify-between gap-3 ${
            notice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
          role="alert"
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            <span>{notice.message}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-neutral-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {teams.map((t) => {
          const Icon = t.icon;
          const total = t.records.length;
          const pending = t.records.filter((r) => r.status === 'received' || r.status === 'under_review').length;
          const approved = t.records.filter((r) => r.status === 'accepted').length;
          const rejected = t.records.filter((r) => r.status === 'rejected').length;
          const isBusy = busyKey === t.settingKey;

          return (
            <div
              key={t.id}
              className={`${cardCls} p-6 flex flex-col justify-between border-neutral-800 hover:border-neutral-700 transition-all relative overflow-hidden`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-[#141418] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block">
                        {t.category}
                      </span>
                      <h3 className="text-lg font-serif text-white">{t.name}</h3>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-sm border ${
                      t.isOpen
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {t.isOpen ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-neutral-400" />}
                    <span>{t.isOpen ? 'Open' : 'Closed'}</span>
                  </span>
                </div>

                <p className="text-xs text-neutral-300 font-light leading-relaxed mb-6">{t.description}</p>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-[#121216] border border-neutral-800/80 rounded-sm mb-6 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-neutral-500 block">Total</span>
                    <span className="text-base font-semibold text-white tabular-nums">{total}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-sky-400/80 block">Pending</span>
                    <span className="text-base font-semibold text-sky-300 tabular-nums">{pending}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-emerald-400/80 block">Approved</span>
                    <span className="text-base font-semibold text-emerald-300 tabular-nums">{approved}</span>
                  </div>
                </div>
              </div>

              {/* Action Toggle Button */}
              <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between gap-3">
                <span className="text-[11px] text-neutral-500 font-light">
                  {t.isOpen ? 'Accepting new applications' : 'Closed to new applicants'}
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleClick(t)}
                  disabled={isBusy}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                    t.isOpen
                      ? 'border border-red-500/50 text-red-300 hover:bg-red-950/50 hover:border-red-400'
                      : 'border border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/50 hover:border-emerald-400'
                  }`}
                >
                  {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {t.isOpen ? 'Close Registration' : 'Open Registration'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"
          role="dialog"
          aria-modal="true"
        >
          <div className={`${cardCls} max-w-md w-full p-6 shadow-2xl border-[#d4af37]/40 space-y-4`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-sm ${confirmTarget.currentOpen ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif text-white">
                  {confirmTarget.currentOpen ? 'Close Registration' : 'Open Registration'} for {confirmTarget.name}?
                </h3>
                <p className="text-xs text-neutral-400 mt-1 font-light leading-relaxed">
                  {confirmTarget.currentOpen
                    ? `Closing registration will immediately block new submissions for ${confirmTarget.name} on the website and enforce rejection of direct API calls. All existing applications remain safe and reviewable.`
                    : `Opening registration will permit candidates to submit new applications for ${confirmTarget.name}.`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className={btnGhost}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeToggle}
                className={confirmTarget.currentOpen ? btnDanger : btnGold}
              >
                {confirmTarget.currentOpen ? 'Yes, Close Registration' : 'Yes, Open Registration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Technical Architecture Callout */}
      <div className={`${cardCls} p-5 bg-[#0a0a0d] border-[#d4af37]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-white block">Server-Side Enforcement Active</span>
            <p className="text-neutral-400 font-light mt-0.5 leading-relaxed">
              Team registration state is persistently anchored in the PostgreSQL <code className="text-[#d4af37]">public.settings</code> table.
              Database triggers intercept every insert: when closed, database triggers reject requests with <code className="text-[#d4af37]">team_registration_closed</code>, protecting against browser bypass.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={copySql}
          className="inline-flex items-center gap-1.5 text-xs text-[#d4af37] hover:text-[#f3e5ab] font-mono shrink-0 cursor-pointer border border-[#d4af37]/30 hover:border-[#d4af37] px-3 py-1.5 rounded-sm bg-[#121217]"
        >
          {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedSql ? 'Copied SQL!' : 'Copy Schema SQL'}</span>
        </button>
      </div>
    </div>
  );
};
