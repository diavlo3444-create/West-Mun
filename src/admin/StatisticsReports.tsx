import React, { useMemo, useState } from 'react';
import {
  Download,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Camera,
  HeartHandshake,
  GraduationCap,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import type { Row } from './ui';
import { downloadText, toCsv } from '../lib/safe';
import {
  EmptyState,
  MetricBar,
  PageHeader,
  Panel,
  PanelHeader,
  SegmentedTabs,
  StatCard,
  btnGhost,
  btnPrimary,
  inputCls,
  type Tone,
} from '../dashboard/ui';

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

type RangePreset = 'all' | '7d' | '30d' | 'custom';

export const StatisticsReports: React.FC<StatisticsReportsProps> = ({
  delegates,
  teamRegistrations,
}) => {
  const [rangePreset, setRangePreset] = useState<RangePreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

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
            ? 'Security & Protocol'
            : t.team === 'media'
              ? 'Media & Press'
              : t.team === 'volunteers'
                ? 'Volunteers'
                : String(t.team),
      })),
    ];
  }, [delegates, teamRegistrations]);

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

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const accepted = filteredRecords.filter((r) => r.status === 'accepted').length;
    const rejected = filteredRecords.filter((r) => r.status === 'rejected').length;
    const pending = filteredRecords.filter(
      (r) => r.status === 'received' || r.status === 'under_review',
    ).length;
    const waitlisted = filteredRecords.filter((r) => r.status === 'waitlisted').length;

    const approvalRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;
    const pendingRate = total > 0 ? Math.round((pending / total) * 100) : 0;

    const teamGroups: Array<{
      key: string;
      label: string;
      icon: typeof Shield;
      tone: Tone;
      total: number;
      accepted: number;
      pending: number;
      rejected: number;
      share: number;
    }> = [
      { key: 'delegates', label: 'Delegates', icon: GraduationCap, tone: 'gold' as Tone },
      { key: 'security', label: 'Security & Protocol', icon: Shield, tone: 'sky' as Tone },
      { key: 'media', label: 'Media & Press', icon: Camera, tone: 'emerald' as Tone },
      { key: 'volunteers', label: 'Volunteers', icon: HeartHandshake, tone: 'amber' as Tone },
    ].map((group) => {
      const groupRecords = filteredRecords.filter((r) => r._teamKey === group.key);
      const grpTotal = groupRecords.length;
      return {
        ...group,
        total: grpTotal,
        accepted: groupRecords.filter((r) => r.status === 'accepted').length,
        pending: groupRecords.filter(
          (r) => r.status === 'received' || r.status === 'under_review',
        ).length,
        rejected: groupRecords.filter((r) => r.status === 'rejected').length,
        share: total > 0 ? Math.round((grpTotal / total) * 100) : 0,
      };
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

  const timelineDays = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      if (!r.created_at) return;
      const day = String(r.created_at).slice(0, 10);
      counts[day] = (counts[day] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
    const max = Math.max(...entries.map(([, value]) => value), 1);
    return { entries, max };
  }, [filteredRecords]);

  const exportSummaryCsv = () => {
    const head = [
      'team_category',
      'total_applications',
      'approved',
      'pending_review',
      'rejected',
      'percentage_of_total',
    ];
    const body = stats.teamGroups.map((tg) => [
      tg.label,
      tg.total,
      tg.accepted,
      tg.pending,
      tg.rejected,
      `${tg.share}%`,
    ]);
    downloadText(
      `west-mun-team-statistics-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([head, ...body]),
    );
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
    downloadText(
      `west-mun-records-report-${rangePreset}-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([head, ...body]),
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Analytics & intelligence"
        title="Reports"
        description="Real registration performance, department distribution and audit-ready exports. No estimated or synthetic figures are used."
        actions={
          <>
            <button type="button" onClick={exportSummaryCsv} className={btnGhost}>
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#d4af37]" aria-hidden="true" />
              Summary CSV
            </button>
            <button
              type="button"
              onClick={exportFullRecordsCsv}
              disabled={filteredRecords.length === 0}
              className={btnPrimary}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Full report CSV
            </button>
          </>
        }
      />

      <Panel className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-neutral-400">
            Report horizon
          </span>
          <SegmentedTabs<RangePreset>
            ariaLabel="Report date range"
            value={rangePreset}
            onChange={setRangePreset}
            options={[
              { value: 'all', label: 'All time' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          {rangePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className={`${inputCls} w-auto py-1.5`}
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                aria-label="Report start date"
              />
              <span className="text-[10px] text-neutral-400">to</span>
              <input
                type="date"
                className={`${inputCls} w-auto py-1.5`}
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                aria-label="Report end date"
              />
            </div>
          )}
        </div>

        <div className="text-[10.5px] text-neutral-400">
          Evaluated records:{' '}
          <span className="font-mono tabular-nums text-white">{stats.total}</span>
          <span className="mx-1.5 text-neutral-700" aria-hidden="true">·</span>
          {stats.waitlisted} waitlisted
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Records in range"
          value={stats.total}
          helper="Filtered delegate and staff records"
          icon={BarChart3}
          tone="gold"
        />
        <StatCard
          label="Approval rate"
          value={`${stats.approvalRate}%`}
          helper={`${stats.accepted} accepted candidate${stats.accepted === 1 ? '' : 's'}`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Pending share"
          value={`${stats.pendingRate}%`}
          helper={`${stats.pending} awaiting a decision`}
          icon={Clock}
          tone="sky"
        />
        <StatCard
          label="Rejection rate"
          value={`${stats.rejectionRate}%`}
          helper={`${stats.rejected} declined`}
          icon={XCircle}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Panel className="lg:col-span-6">
          <PanelHeader
            title="Registrations by department"
            description="Proportion of candidate volume across conference operations."
          />
          <div className="space-y-4 p-5">
            {stats.teamGroups.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.key}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[#d4af37]/80" aria-hidden="true" />
                      <span className="truncate text-[11.5px] font-medium text-neutral-200">
                        {group.label}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-neutral-400">
                      {group.total}{' '}
                      <span className="text-neutral-400">({group.share}%)</span>
                    </span>
                  </div>
                  <MetricBar value={group.share} tone={group.tone} label={`${group.label} share`} />
                  <div className="mt-1 flex justify-between text-[9px] font-mono text-neutral-400">
                    <span>Approved {group.accepted}</span>
                    <span>Pending {group.pending}</span>
                    <span>Rejected {group.rejected}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel className="flex flex-col lg:col-span-6">
          <PanelHeader
            title="Daily registration velocity"
            description="Submission volume recorded by the Supabase database."
            action={
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-neutral-400">
                {rangePreset.toUpperCase()}
              </span>
            }
          />
          <div className="flex flex-1 flex-col justify-between p-5">
            {timelineDays.entries.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="No submissions in this range"
                description="Choose a wider horizon or wait for new applications to arrive."
              />
            ) : (
              <>
                <div className="wm-scroll flex h-44 items-end gap-[3px] overflow-x-auto border-b border-white/[0.06] pb-1">
                  {timelineDays.entries.map(([day, count]) => (
                    <div
                      key={day}
                      className="group relative flex h-full min-w-[10px] flex-1 items-end"
                      title={`${day}: ${count} registration${count === 1 ? '' : 's'}`}
                    >
                      <div
                        className="w-full rounded-t-[2px] bg-gradient-to-t from-[#7c6425] to-[#d4af37] opacity-80 transition-opacity group-hover:opacity-100"
                        style={{
                          height: `${Math.max(6, Math.round((count / timelineDays.max) * 100))}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] text-neutral-400">
              <span>
                Peak activity:{' '}
                <span className="font-mono text-neutral-300">{timelineDays.max} / day</span>
              </span>
              <span>
                {stats.accepted + stats.rejected} of {stats.total} adjudicated
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};
