import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Award,
  MessageSquare,
  ShieldAlert,
  LogOut,
  Layers,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  DEPARTMENTS,
  isGenderSeparated,
  type DepartmentKey,
  type SectionKey,
} from './departments';
import { DashboardShell, type NavGroup } from '../dashboard/DashboardShell';
import { Notice } from '../dashboard/ui';
import {
  HeadOverview,
  type HeadAnnouncement,
  type HeadRegistration,
  type HeadStats,
} from './HeadOverview';
import { HeadRegistrations } from './HeadRegistrations';
import { HeadDepartment } from './HeadDepartment';
import { GoldenKeyUnlock } from './GoldenKeyUnlock';
import { HeadSponsorsManager } from './HeadSponsorsManager';
import { HeadInquiriesManager } from './HeadInquiriesManager';

export interface TestModeInfo {
  isActive: boolean;
  adminEmail: string;
  token: string;
  expiresAt?: string;
  crossDeptAccess: boolean;
}

interface DepartmentDashboardProps {
  department: DepartmentKey;
  section?: SectionKey | null;
  headName?: string;
  headEmail?: string;
  initialView?: HeadView;
  testMode?: TestModeInfo | null;
  onSignOut: () => void;
}

type HeadView = 'overview' | 'registrations' | 'department' | 'sponsors' | 'inquiries';

function explainAccessError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return '';
  if (/auth session missing|jwt expired|session expired|invalid claim/i.test(error.message || '')) {
    return 'Your session has expired. Please sign in again to access department records.';
  }
  if (
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    /row-level security|permission denied|policy/i.test(error.message || '')
  ) {
    return 'Row Level Security blocked this request. Confirm the department head assignment is still active, then sign in again.';
  }
  if (/failed to fetch|network|timeout/i.test(error.message || '')) {
    return 'Could not reach Supabase. Check the connection and retry.';
  }
  return error.message || 'The records could not be loaded.';
}

export const DepartmentDashboard: React.FC<DepartmentDashboardProps> = ({
  department,
  section,
  headName,
  headEmail = '',
  initialView,
  testMode,
  onSignOut,
}) => {
  const meta = DEPARTMENTS[department];
  const isGenderDivision = isGenderSeparated(department);
  const isPr = department === 'pr';
  const isHr = department === 'hr';

  const [view, setView] = useState<HeadView>(() => {
    if (initialView === 'sponsors' && isPr) return 'sponsors';
    if (initialView === 'inquiries' && isHr) return 'inquiries';
    if (initialView === 'registrations' || initialView === 'department') return initialView;
    return 'overview';
  });
  const [registrations, setRegistrations] = useState<HeadRegistration[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [announcements, setAnnouncements] = useState<HeadAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [focusRecord, setFocusRecord] = useState<HeadRegistration | null>(null);

  // One-time unlock animation per login/session for this department head
  const sessionUnlockKey = `wm_head_unlocked_${department}_${section || 'main'}`;
  const [showUnlockAnimation, setShowUnlockAnimation] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(sessionUnlockKey) !== 'true';
    } catch {
      return false;
    }
  });

  const handleUnlockComplete = useCallback(() => {
    try {
      sessionStorage.setItem(sessionUnlockKey, 'true');
    } catch {}
    setShowUnlockAnimation(false);
  }, [sessionUnlockKey]);

  const handleReplayUnlock = useCallback(() => {
    setShowUnlockAnimation(true);
  }, []);

  const teamValues = useMemo(
    () => (department === 'media_press' ? ['media_press', 'media'] : [department]),
    [department],
  );

  const loadDepartmentData = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    // If active Super IT Test Mode session, fetch verified testing records via test-data endpoint
    if (testMode?.token) {
      try {
        const resp = await fetch(
          `/api/super-admin?action=test-data&department=${encodeURIComponent(department)}&section=${encodeURIComponent(section || '')}`,
          {
            headers: {
              Authorization: `Bearer ${testMode.token}`,
            },
          }
        );
        const data = await resp.json();
        if (resp.ok && data?.success) {
          setRegistrations((data.registrations as HeadRegistration[]) || []);
          if (data.settings) setSettings(data.settings);
          if (data.announcements) setAnnouncements(data.announcements as HeadAnnouncement[]);
          setLoading(false);
          return;
        } else if (data?.error) {
          setLoadError(data.error);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to query test session data.';
        setLoadError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!supabase) {
      setLoading(false);
      setLoadError('Supabase is not configured on this deployment. Contact the IT Super Admin.');
      return;
    }

    try {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        if (
          sessData?.session?.expires_at &&
          sessData.session.expires_at * 1000 < Date.now() + 60000
        ) {
          await supabase.auth.refreshSession();
        }
      } catch {}

      // Scope is already enforced by RLS; the explicit filters keep the query
      // aligned with the head's exact department and section as well.
      let query = supabase.from('team_registrations').select('*').in('team', teamValues);
      if (section) query = query.eq('section', section);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        setRegistrations([]);
        setLoadError(explainAccessError(error));
      } else {
        setRegistrations((data as HeadRegistration[]) || []);
      }

      // Registration channel status (public settings)
      const { data: settingRows, error: settingsError } = await supabase
        .from('settings')
        .select('key,value');

      if (!settingsError && settingRows) {
        const dictionary: Record<string, string> = {};
        settingRows.forEach((row: { key: string; value: string }) => {
          dictionary[row.key] = row.value;
        });
        setSettings(dictionary);
      }

      // Published Secretariat notices are public-read by RLS. Failure here is
      // non-critical, so the dashboard still renders without it.
      const { data: announcementRows, error: announcementsError } = await supabase
        .from('announcements')
        .select('id,title,body,published_at,pinned')
        .eq('published', true)
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(3);

      if (!announcementsError && announcementRows) {
        setAnnouncements(announcementRows as HeadAnnouncement[]);
      } else {
        setAnnouncements([]);
      }
    } catch {
      setLoadError('Could not load department records. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [department, section, teamValues, testMode]);

  useEffect(() => {
    loadDepartmentData();
  }, [loadDepartmentData]);

  useEffect(() => {
    document.title = `WEST MUN 2027 — ${meta.label} Dashboard`;
    const metaTag = document.createElement('meta');
    metaTag.name = 'robots';
    metaTag.content = 'noindex, nofollow';
    document.head.appendChild(metaTag);
    document.querySelector('link[rel="canonical"]')?.remove();
    return () => metaTag.remove();
  }, [meta.label]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [view]);

  const isOpen = (settings[meta.settingKey] ?? 'true').toLowerCase() === 'true';

  const stats = useMemo<HeadStats>(() => {
    const total = registrations.length;
    const received = registrations.filter((record) => record.status === 'received').length;
    const underReview = registrations.filter((record) => record.status === 'under_review').length;
    const approved = registrations.filter((record) => record.status === 'accepted').length;
    const rejected = registrations.filter((record) => record.status === 'rejected').length;
    const waitlisted = registrations.filter((record) => record.status === 'waitlisted').length;
    const withdrawn = registrations.filter((record) => record.status === 'withdrawn').length;
    const decided = approved + rejected + waitlisted + withdrawn;

    return {
      total,
      pending: received + underReview,
      approved,
      rejected,
      waitlisted,
      underReview,
      received,
      withdrawn,
      completion: total > 0 ? Math.round((decided / total) * 100) : 0,
    };
  }, [registrations]);

  const saveRegistration = async (
    id: string,
    status: string,
    notes: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    // If active Super IT Test Mode session, use privileged test-update endpoint
    if (testMode?.token) {
      try {
        const resp = await fetch('/api/super-admin?action=test-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testMode.token}`,
          },
          body: JSON.stringify({ id, status, notes }),
        });
        const data = await resp.json();
        if (resp.ok && data?.success) {
          return { ok: true };
        }
        return { ok: false, error: data?.error || 'Test update failed.' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error.';
        return { ok: false, error: msg };
      }
    }

    if (!supabase) return { ok: false, error: 'Supabase is not configured.' };

    try {
      const { data: sessData } = await supabase.auth.getSession();
      if (
        sessData?.session?.expires_at &&
        sessData.session.expires_at * 1000 < Date.now() + 60000
      ) {
        await supabase.auth.refreshSession();
      }
    } catch {}

    let updateQuery = supabase
      .from('team_registrations')
      .update({
        status,
        admin_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .in('team', teamValues);

    if (section) updateQuery = updateQuery.eq('section', section);

    const { data, error } = await updateQuery.select('id');

    if (error) return { ok: false, error: explainAccessError(error) };
    if (!data || data.length === 0) {
      return {
        ok: false,
        error: 'No record was updated. It may be outside your department scope or no longer exist.',
      };
    }

    setRegistrations((previous) =>
      previous.map((record) =>
        record.id === id ? { ...record, status, admin_notes: notes } : record,
      ),
    );
    return { ok: true };
  };

  const openReview = (record: HeadRegistration) => {
    setFocusRecord(record);
    setView('registrations');
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'registrations', label: 'Applications', icon: Users, badge: stats.pending },
    ...(isPr ? [{ id: 'sponsors', label: 'Sponsors', icon: Award }] : []),
    ...(isHr ? [{ id: 'inquiries', label: 'Inquiries', icon: MessageSquare }] : []),
    { id: 'department', label: 'Assignment', icon: Building2 },
  ];

  const navGroups: NavGroup[] = [
    {
      label: 'My department',
      items: navItems,
    },
  ];

  const viewLabel =
    view === 'overview'
      ? 'Overview'
      : view === 'registrations'
      ? 'Applications'
      : view === 'sponsors'
      ? 'Sponsors & Partners'
      : view === 'inquiries'
      ? 'Inquiries & Messages'
      : 'Assignment';

  const displayName =
    (headName && headName.trim()) || headEmail.split('@')[0] || 'Department head';

  const user = {
    name: displayName,
    email: headEmail,
    role: section ? `${meta.label} · ${section}` : meta.label,
  };

  return (
    <DashboardShell
      brandSubtitle="Department head portal"
      navGroups={navGroups}
      active={view}
      onNavigate={(id) => setView(id as HeadView)}
      user={user}
      onSignOut={onSignOut}
      topbarLabel={viewLabel}
      roleBadge={
        testMode?.isActive
          ? 'Super IT Test Session'
          : isGenderDivision && section
          ? `${section} division`
          : 'Department head'
      }
    >
      {/* ====================================================================
          PERSISTENT SUPER IT TEST MODE BANNER (Exclusive to diavlo3444@gmail.com)
          ==================================================================== */}
      {testMode?.isActive && (
        <div className="mb-5 rounded-md border-2 border-amber-500/80 bg-gradient-to-r from-amber-950/80 via-[#1a1408] to-neutral-950 p-4 shadow-xl shadow-amber-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-500/50 bg-amber-500/15 text-amber-400">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-mono font-bold tracking-wider uppercase text-amber-400">
                    SUPER IT TEST MODE
                  </span>
                  <span className="text-[11px] text-neutral-400">·</span>
                  <span className="text-[12px] font-medium text-white">
                    Logged in as <strong className="text-amber-200">{headName || headEmail || 'Head'}</strong>
                  </span>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-300 border border-amber-500/30">
                    {meta.label} {section ? `(${section})` : ''}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-neutral-300">
                  Authorized IT Super Admin testing session (<span className="font-mono text-amber-300/90">{testMode.adminEmail}</span>). Elevated testing privileges are active across all departments; normal head accounts and RLS policies remain completely isolated.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/60 bg-amber-500/20 px-3.5 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-amber-200 hover:bg-amber-500/30 hover:border-amber-400 hover:text-white transition-colors cursor-pointer shadow-sm"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Exit Test Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div key={view} className="wm-page-in space-y-5">
        {loadError && (
          <Notice tone="error" title="Records could not be loaded">
            {loadError}{' '}
            <button
              type="button"
              onClick={loadDepartmentData}
              className="font-semibold underline underline-offset-2 hover:text-white"
            >
              Retry
            </button>
          </Notice>
        )}

        {view === 'overview' && (
          <HeadOverview
            meta={meta}
            section={section}
            headName={headName}
            stats={stats}
            registrations={registrations}
            isOpen={isOpen}
            loading={loading}
            announcements={announcements}
            onRefresh={loadDepartmentData}
            onOpenRegistrations={() => setView('registrations')}
            onReview={openReview}
            onReplayUnlock={handleReplayUnlock}
            onOpenSponsors={isPr ? () => setView('sponsors') : undefined}
            onOpenInquiries={isHr ? () => setView('inquiries') : undefined}
          />
        )}

        {view === 'registrations' && (
          <HeadRegistrations
            registrations={registrations}
            loading={loading}
            departmentLabel={meta.label}
            section={section}
            isGenderDivision={isGenderDivision}
            onRefresh={loadDepartmentData}
            onSave={saveRegistration}
            initialRecord={focusRecord}
            onConsumeInitial={() => setFocusRecord(null)}
          />
        )}

        {view === 'sponsors' && isPr && (
          <HeadSponsorsManager headName={headName} headEmail={headEmail} />
        )}

        {view === 'inquiries' && isHr && (
          <HeadInquiriesManager headName={headName} headEmail={headEmail} />
        )}

        {view === 'department' && (
          <HeadDepartment
            meta={meta}
            section={section}
            headName={headName}
            headEmail={headEmail}
            isOpen={isOpen}
            stats={stats}
            onOpenRegistrations={() => setView('registrations')}
          />
        )}
      </div>

      {showUnlockAnimation && (
        <GoldenKeyUnlock
          department={department}
          section={section}
          headName={headName}
          headEmail={headEmail}
          onComplete={handleUnlockComplete}
        />
      )}
    </DashboardShell>
  );
};
