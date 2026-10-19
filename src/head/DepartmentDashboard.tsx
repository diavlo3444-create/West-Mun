import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Users, Building2 } from 'lucide-react';
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

interface DepartmentDashboardProps {
  department: DepartmentKey;
  section?: SectionKey | null;
  headName?: string;
  headEmail?: string;
  onSignOut: () => void;
}

type HeadView = 'overview' | 'registrations' | 'department';

function explainAccessError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return '';
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
  onSignOut,
}) => {
  const meta = DEPARTMENTS[department];
  const isGenderDivision = isGenderSeparated(department);

  const [view, setView] = useState<HeadView>('overview');
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
    if (!supabase) {
      setLoading(false);
      setLoadError('Supabase is not configured on this deployment. Contact the IT Super Admin.');
      return;
    }

    setLoading(true);
    setLoadError('');

    try {
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
  }, [section, teamValues]);

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
    if (!supabase) return { ok: false, error: 'Supabase is not configured.' };

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

  const navGroups: NavGroup[] = [
    {
      label: 'My department',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'registrations', label: 'Applications', icon: Users, badge: stats.pending },
        { id: 'department', label: 'Assignment', icon: Building2 },
      ],
    },
  ];

  const viewLabel =
    view === 'overview' ? 'Overview' : view === 'registrations' ? 'Applications' : 'Assignment';

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
      roleBadge={isGenderDivision && section ? `${section} division` : 'Department head'}
    >
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
