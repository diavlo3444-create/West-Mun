import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Camera,
  HeartHandshake,
  GraduationCap,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { cardCls, btnGold, btnGhost, type Row } from './ui';
import { downloadText, toCsv } from '../lib/safe';

interface StatisticsReportsProps {
  delegates: Row[];
  teamRegistrations: Row[];
  settings: Record<string, string>;
}

export interface ReportItem extends Row {
  _type: 'delegate' | 'team';
  _teamKey: string;
  _teamLabel: string;
}

export const StatisticsReports: React.FC<StatisticsReportsProps> = ({
  delegates,
  teamRegistrations,
  settings,
}) => {
  const [rangePreset, setRangePreset] = useState<'all' | '7d' | '30d' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Unified registration items
  const allRegistrations = useMemo<ReportItem[]>(() => {
    return [
      ...delegates.map((d) => ({
        ...d,
        _type: 'delegate' as const,
        _teamKey: 'delegates',
        _teamLabel: 'Conference Delegates',
      })),
      ...teamRegistrations.map((t) => ({
        ...t,
        _type: 'team' as const,
        _teamKey: String(t.team),
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
  }, [delegates, teamRegistrations]);

  // Filtered by selected date range
  const filteredRecords = useMemo(() => {
    const now = new Date();
    let minDate: string | null = null;
    let maxDate: string | null = null;

    if (rangePreset === '7d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      minDate = d.toISOString().slice(0, 10);
    } else if (rangePreset === '30d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      minDate = d.toISOString().slice(0, 10);
    } else if (rangePreset === 'custom') {
      if (customStart) minDate = customStart;
      if (customEnd) maxDate = customEnd;
    }

    return allRegistrations.filter((r) => {
      if (!r.created_at) return true;
      const d = String(r.created_at).slice(0, 10);
      if (minDate && d < minDate) return false;
      if (maxDate && d > maxDate) return false;
      return true;
    });
  }, [allRegistrations, rangePreset, customStart, customEnd]);

  // Calculations
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const accepted = filteredRecords.filter((r) => r.status === 'accepted').length;
    const rejected = filteredRecords.filter((r) => r.status === 'rejected').length;
    const pending = filteredRecords.filter((r) => r.status === 'received' || r.status === 'under_review').length;
    const waitlisted = filteredRecords.filter((r) => r.status === 'waitlisted').length;

    const approvalRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;
    const pendingRate = total > 0 ? Math.round((pending / total) * 100) : 0;

    // By team
    const teamGroups = [
      { key: 'delegates', label: 'Delegates', icon: GraduationCap },
      { key: 'security', label: 'Security', icon: Shield },
      { key: 'media', label: 'Media', icon: Camera },
      { key: 'volunteers', label: 'Volunteers', icon: HeartHandshake },
    ].map((tg) => {
      const groupRecords = filteredRecords.filter((r) => r._teamKey === tg.key);
      const grpTotal = groupRecords.length;
      const grpAccepted = groupRecords.filter((r) => r.status === 'accepted').length;
      const grpPending = groupRecords.filter((r) => r.status === 'received' || r.status === 'under_review').length;
      const grpRejected = groupRecords.filter((r) => r.status === 'rejected').length;
      const share = total > 0 ? Math.round((grpTotal / total) * 100) : 0;
      return { ...tg, total: grpTotal, accepted: grpAccepted, pending: grpPending, rejected: grpRejected, share };
    });

    return {
      total,
      accepted,
      rejected,
      pending,
      waitlisted,
      approvalRate,
      rejectionRate,
      pendingRate,
      teamGroups,
    };
  }, [filteredRecords]);

  // Daily distribution for timeline chart
  const timelineDays = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      if (!r.created_at) return;
      const day = String(r.created_at).slice(0, 10);
      counts[day] = (counts[day] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return { entries, max };
  }, [filteredRecords]);

  const exportSummaryCsv = () => {
    const head = ['team_category', 'total_applications', 'approved', 'pending_review', 'rejected', 'percentage_of_total'];
    const body = stats.teamGroups.map((tg) => [
      tg.label,
      tg.total,
      tg.accepted,
      tg.pending,
      tg.rejected,
      `${tg.share}%`,
    ]);
    downloadText(`west-mun-team-statistics-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([head, ...body]));
  };

  const exportFullRecordsCsv = () => {
    const head = [
      'application_id',
      'team_category',
      'full_name',
      'email',
      'institution',
      'status',
      'submission_date',
    ];
    const body = filteredRecords.map((r) => [
      r.id,
      r._teamLabel,
      r.full_name,
      r.email,
      r.institution,
      r.status,
      r.created_at,
    ]);
    downloadText(`west-mun-records-report-${rangePreset}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([head, ...body]));
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-[1px] bg-[#d4af37]" />
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#d4af37] font-semibold">
              Analytics & Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">Statistics & Reports</h1>
          <p className="text-xs text-neutral-400 mt-1 font-light">
            Real data performance metrics, committee allocations, and audit-ready data exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={exportSummaryCsv} className={btnGhost}>
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#d4af37]" /> Summary CSV
          </button>
          <button
            type="button"
            onClick={exportFullRecordsCsv}
            disabled={filteredRecords.length === 0}
            className={btnGold}
          >
            <Download className="w-3.5 h-3.5" /> Full Report CSV
          </button>
        </div>
      </div>

      {/* Date Range Selector Pill Bar */}
      <div className={`${cardCls} p-4 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400 font-mono uppercase text-[10px] tracking-wider">Report Horizon:</span>
          <div className="inline-flex rounded-sm p-0.5 bg-[#141418] border border-neutral-800">
            {(
              [
                ['all', 'All Time'],
                ['7d', 'Last 7 Days'],
                ['30d', 'Last 30 Days'],
                ['custom', 'Custom Range'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRangePreset(key)}
                className={`px-3 py-1 rounded-sm text-xs font-mono transition-colors cursor-pointer ${
                  rangePreset === key ? 'bg-[#d4af37] text-black font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {rangePreset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              className="bg-[#141418] border border-neutral-700 text-white px-2 py-1 text-xs rounded-sm focus:border-[#d4af37]"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span className="text-neutral-500">to</span>
            <input
              type="date"
              className="bg-[#141418] border border-neutral-700 text-white px-2 py-1 text-xs rounded-sm focus:border-[#d4af37]"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}

        <div className="text-xs text-neutral-400 font-mono">
          Evaluated Records: <strong className="text-white">{stats.total}</strong>
        </div>
      </div>

      {/* Primary Conversion & Status Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Total Filtered</span>
            <BarChart3 className="w-4 h-4 text-[#d4af37]" />
          </div>
          <div className="text-3xl font-semibold text-white tracking-tight tabular-nums">{stats.total}</div>
          <p className="text-[11px] text-neutral-500 mt-1">Applications in range</p>
        </div>

        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">Approval Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-semibold text-emerald-300 tracking-tight tabular-nums">
            {stats.approvalRate}%
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">{stats.accepted} accepted candidate(s)</p>
        </div>

        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400">Pending Review</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-semibold text-sky-300 tracking-tight tabular-nums">
            {stats.pendingRate}%
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">{stats.pending} under review</p>
        </div>

        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-400">Rejection Rate</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-semibold text-red-300 tracking-tight tabular-nums">
            {stats.rejectionRate}%
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">{stats.rejected} declined</p>
        </div>
      </div>

      {/* Team Distribution & Status Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Team Breakdown Bars */}
        <div className={`${cardCls} lg:col-span-6 p-5 space-y-4`}>
          <div>
            <h3 className="text-base font-serif text-white">Registrations by Team & Category</h3>
            <p className="text-xs text-neutral-400 font-light">Proportion of candidate volume across Summit operations.</p>
          </div>

          <div className="space-y-4 pt-2">
            {stats.teamGroups.map((tg) => {
              const Icon = tg.icon;
              return (
                <div key={tg.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span className="font-semibold text-white">{tg.label}</span>
                    </div>
                    <span className="font-mono text-neutral-400">
                      {tg.total} <span className="text-neutral-500">({tg.share}%)</span>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className="h-full bg-gradient-to-r from-[#aa8232] to-[#d4af37] rounded-full transition-all duration-500"
                      style={{ width: `${tg.share}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                    <span>Approved: {tg.accepted}</span>
                    <span>Pending: {tg.pending}</span>
                    <span>Rejected: {tg.rejected}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Chart */}
        <div className={`${cardCls} lg:col-span-6 p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-serif text-white">Daily Registration Velocity</h3>
              <span className="text-xs font-mono text-neutral-500">Submission Trend</span>
            </div>
            <p className="text-xs text-neutral-400 font-light mb-6">
              Activity spikes recorded by the Supabase database.
            </p>

            {timelineDays.entries.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 text-xs">
                <AlertCircle className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                No registration timestamps found in this horizon.
              </div>
            ) : (
              <div className="h-44 flex items-end gap-1 pt-6 pb-2 border-b border-neutral-800">
                {timelineDays.entries.map(([day, count]) => {
                  const h = Math.max(10, Math.round((count / timelineDays.max) * 100));
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center group relative">
                      <div className="w-full flex justify-center">
                        <div
                          className="w-full max-w-[22px] bg-gradient-to-t from-[#997a3a] to-[#f3e5ab] rounded-t-sm group-hover:brightness-125 transition-all relative"
                          style={{ height: `${h}%` }}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-[#d4af37] text-[10px] font-mono px-1 rounded border border-[#d4af37]/40 pointer-events-none z-10 whitespace-nowrap">
                            {count}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 text-xs text-neutral-500 flex justify-between">
            <span>Peak Activity: <strong className="text-white font-mono">{timelineDays.max} / day</strong></span>
            <span>Horizon: <strong className="text-[#d4af37] font-mono">{rangePreset.toUpperCase()}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
