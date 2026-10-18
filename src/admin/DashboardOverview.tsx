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
} from 'lucide-react';
import { cardCls, btnGold, btnGhost, type Row } from './ui';
import { downloadText, toCsv } from '../lib/safe';

interface DashboardOverviewProps {
  delegates: Row[];
  teamRegistrations: Row[];
  settings: Record<string, string>;
  loading: boolean;
  onRefresh: () => void;
  onNavigate: (page: any) => void;
  onViewApplication: (app: any, type: 'delegate' | 'team') => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  delegates,
  teamRegistrations,
  settings,
  loading,
  onRefresh,
  onNavigate,
  onViewApplication,
}) => {
  // Combine all registrations for unified calculations
  const allRegistrations = useMemo(() => {
    const list: Array<Row & { _type: 'delegate' | 'team'; _teamLabel: string }> = [
      ...delegates.map((d) => ({
        ...d,
        _type: 'delegate' as const,
        _teamLabel: d.tier === 'early_bird' ? 'Early Bird Delegate' : 'Regular Delegate',
        team: 'delegates',
      })),
      ...teamRegistrations.map((t) => ({
        ...t,
        _type: 'team' as const,
        _teamLabel:
          t.team === 'security'
            ? 'Security Team'
            : t.team === 'media'
            ? 'Media Team'
            : t.team === 'volunteers'
            ? 'Volunteers Team'
            : String(t.team),
      })),
    ];
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [delegates, teamRegistrations]);

  const kpis = useMemo(() => {
    const total = allRegistrations.length;
    const pending = allRegistrations.filter((r) => r.status === 'received' || r.status === 'under_review').length;
    const approved = allRegistrations.filter((r) => r.status === 'accepted').length;
    const rejected = allRegistrations.filter((r) => r.status === 'rejected').length;
    const waitlisted = allRegistrations.filter((r) => r.status === 'waitlisted').length;

    return { total, pending, approved, rejected, waitlisted };
  }, [allRegistrations]);

  // Team breakdowns with live switches
  const teamBreakdowns = useMemo(() => {
    const teams = [
      {
        id: 'delegates',
        name: 'Conference Delegates',
        subtitle: 'Early Bird & Regular Delegations',
        icon: GraduationCap,
        isOpen: settings.registration_open?.toLowerCase() === 'true',
        records: allRegistrations.filter((r) => r._type === 'delegate'),
      },
      {
        id: 'security',
        name: 'Security Team',
        subtitle: 'Safety, Protocol & Decorum',
        icon: Shield,
        isOpen: (settings.team_security_open ?? 'true').toLowerCase() === 'true',
        records: allRegistrations.filter((r) => r.team === 'security'),
      },
      {
        id: 'media',
        name: 'Media & Press Team',
        subtitle: 'Photography, Press & Coverage',
        icon: Camera,
        isOpen: (settings.team_media_open ?? 'true').toLowerCase() === 'true',
        records: allRegistrations.filter((r) => r.team === 'media'),
      },
      {
        id: 'volunteers',
        name: 'Conference Volunteers',
        subtitle: 'Logistics, Dais Support & Ops',
        icon: HeartHandshake,
        isOpen: (settings.team_volunteers_open ?? 'true').toLowerCase() === 'true',
        records: allRegistrations.filter((r) => r.team === 'volunteers'),
      },
    ];

    return teams.map((t) => {
      const total = t.records.length;
      const pending = t.records.filter((r) => r.status === 'received' || r.status === 'under_review').length;
      const approved = t.records.filter((r) => r.status === 'accepted').length;
      const rejected = t.records.filter((r) => r.status === 'rejected').length;
      return { ...t, total, pending, approved, rejected };
    });
  }, [allRegistrations, settings]);

  // Registration timeline (daily trend over the last 14 days)
  const timelineData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10); // MM-DD
      days[key] = 0;
    }

    allRegistrations.forEach((r) => {
      if (!r.created_at) return;
      const dayKey = String(r.created_at).slice(5, 10);
      if (days[dayKey] !== undefined) {
        days[dayKey]++;
      }
    });

    const entries = Object.entries(days);
    const max = Math.max(...entries.map(([, count]) => count), 1);
    return { entries, max };
  }, [allRegistrations]);

  const recentRegistrations = allRegistrations.slice(0, 6);

  const exportAllCsv = () => {
    const head = ['id', 'category', 'team', 'full_name', 'email', 'institution', 'status', 'submitted_at'];
    const body = allRegistrations.map((r) => [
      r.id,
      r._type === 'delegate' ? 'Delegate' : 'Team Staff',
      r._teamLabel,
      r.full_name,
      r.email,
      r.institution,
      r.status,
      r.created_at,
    ]);
    downloadText(`west-mun-all-registrations-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([head, ...body]));
  };

  const statusBadge = (st: string) => {
    switch (st) {
      case 'accepted':
        return <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">Approved</span>;
      case 'rejected':
        return <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-red-950/60 text-red-400 border border-red-500/40">Rejected</span>;
      case 'under_review':
        return <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-sky-950/60 text-sky-400 border border-sky-500/40">Under review</span>;
      case 'waitlisted':
        return <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-amber-950/60 text-amber-400 border border-amber-500/40">Waitlisted</span>;
      default:
        return <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-neutral-900 text-neutral-300 border border-neutral-700">Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#d4af37]">Live Conference Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-neutral-400 mt-1 font-light">
            WEST MUN 2027 Secretariat operations & real-time delegate registrations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className={btnGhost}
            title="Reload latest records from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={exportAllCsv}
            disabled={allRegistrations.length === 0}
            className={btnGold}
            title="Download full CSV of all applicant records"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${cardCls} p-5 relative overflow-hidden group hover:border-[#d4af37]/50 transition-all`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Total Registrations</span>
            <Users className="w-4 h-4 text-[#d4af37]" />
          </div>
          <div className="text-3xl font-semibold text-white tracking-tight tabular-nums">
            {kpis.total}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">All verified submissions</p>
        </div>

        <div className={`${cardCls} p-5 relative overflow-hidden group hover:border-sky-500/50 transition-all`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Awaiting Review</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-semibold text-sky-300 tracking-tight tabular-nums">
            {kpis.pending}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Pending secretariat decision</p>
        </div>

        <div className={`${cardCls} p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-semibold text-emerald-300 tracking-tight tabular-nums">
            {kpis.approved}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Confirmed participation</p>
        </div>

        <div className={`${cardCls} p-5 relative overflow-hidden group hover:border-red-500/50 transition-all`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Rejected / Declined</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-semibold text-red-300 tracking-tight tabular-nums">
            {kpis.rejected}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Declined or withdrawn</p>
        </div>
      </div>

      {/* Team Breakdown & Live Controls Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif text-white">Teams & Delegation Categories</h2>
            <p className="text-xs text-neutral-400 font-light">Status of independent registration switches and departmental quotas.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('teams')}
            className="text-xs text-[#d4af37] hover:text-[#f3e5ab] inline-flex items-center gap-1 font-medium cursor-pointer"
          >
            Manage Team Controls <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamBreakdowns.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.id}
                className={`${cardCls} p-5 flex flex-col justify-between hover:border-neutral-700 transition-all`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-sm bg-[#141418] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                        t.isOpen
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {t.isOpen ? 'Registration: Open' : 'Registration: Closed'}
                    </span>
                  </div>

                  <h3 className="text-base font-serif text-white">{t.name}</h3>
                  <p className="text-[11px] text-neutral-400 font-light mb-4">{t.subtitle}</p>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-neutral-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total Applications:</span>
                    <span className="font-mono text-white font-semibold">{t.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Pending Review:</span>
                    <span className="font-mono text-sky-400">{t.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Approved:</span>
                    <span className="font-mono text-emerald-400">{t.approved}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Registration Trends & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Registration Trend (14 days) */}
        <div className={`${cardCls} lg:col-span-5 p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#d4af37]" />
                <h3 className="text-base font-serif text-white">Registration Trend</h3>
              </div>
              <span className="text-[11px] font-mono text-neutral-500">Last 14 days</span>
            </div>
            <p className="text-xs text-neutral-400 font-light mb-6">
              Daily volume of submitted applications across all categories.
            </p>

            {/* Visual Histogram */}
            <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 border-b border-neutral-800">
              {timelineData.entries.map(([day, count]) => {
                const heightPercent = Math.max(8, Math.round((count / timelineData.max) * 100));
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full flex justify-center">
                      <div
                        className="w-full max-w-[18px] bg-gradient-to-t from-[#aa8232] via-[#d4af37] to-[#f3e5ab] rounded-t-sm group-hover:brightness-125 transition-all relative"
                        style={{ height: `${heightPercent}%` }}
                      >
                        {count > 0 && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-[#d4af37] text-[10px] font-mono px-1 rounded border border-[#d4af37]/40 pointer-events-none z-10 whitespace-nowrap">
                            {count}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-neutral-500 -rotate-45 origin-top-left mt-2 block sm:hidden">
                      {day.slice(3)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="hidden sm:flex justify-between text-[10px] font-mono text-neutral-500 mt-2">
              <span>{timelineData.entries[0]?.[0]}</span>
              <span>Today ({timelineData.entries[timelineData.entries.length - 1]?.[0]})</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
            <span>Overall Review Completion:</span>
            <span className="font-mono text-[#d4af37] font-semibold">
              {kpis.total > 0 ? Math.round(((kpis.approved + kpis.rejected) / kpis.total) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Recent Applications Feed */}
        <div className={`${cardCls} lg:col-span-7 p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-serif text-white">Recent Registrations</h3>
              <button
                type="button"
                onClick={() => onNavigate('registrations')}
                className="text-xs text-[#d4af37] hover:text-[#f3e5ab] font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                View all ({allRegistrations.length}) <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-neutral-400 font-light mb-4">
              Latest applications received by the Secretariat dais.
            </p>

            {recentRegistrations.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 text-xs">
                <AlertCircle className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                No applications registered in Supabase yet.
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/70">
                {recentRegistrations.map((app) => (
                  <div
                    key={app.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-neutral-800/20 px-2 rounded-sm transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">{app.full_name}</span>
                        {statusBadge(app.status)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5 truncate">
                        <span className="text-[#d4af37] font-mono">{app._teamLabel}</span>
                        <span>·</span>
                        <span className="truncate">{app.institution || app.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">
                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onViewApplication(app, app._type)}
                        className="px-2.5 py-1 text-[11px] font-mono uppercase bg-neutral-800 hover:bg-[#d4af37] hover:text-black text-neutral-200 rounded-sm transition-colors cursor-pointer"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
            <span>Server sync active</span>
            <span className="font-mono text-[#d4af37]">Supabase Postgres RLS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
