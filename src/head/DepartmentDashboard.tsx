import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Award,
  MessageSquare,
  ShieldAlert,
  LogOut,
  Globe,
  QrCode,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { WebsiteEditor } from '../admin/WebsiteEditor';
import {
  DEPARTMENTS,
  canManageRegistrations,
  canManageRoles,
  isGenderSeparated,
  type DepartmentKey,
  type SectionKey,
} from './departments';
import { DashboardShell, type NavGroup, type NavItem } from '../dashboard/DashboardShell';
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
import { DCCCommitteeManager } from './DCCCommitteeManager';
import { DCCApplicationsManager } from './DCCApplicationsManager';
import { DepartmentWorkspace } from './DepartmentWorkspace';
import { GroupManagementDashboard } from './groups/GroupManagementDashboard';
import { ShiftManagementDashboard } from './shifts/ShiftManagementDashboard';
import type { WmTeamGroup } from './services/operationsStore';
import { HeadCoHeadManagement } from './HeadCoHeadManagement';
import { WorkspaceModuleGrid, WorkspaceOverview } from './WorkspaceOverview';
import {
  createDepartmentRecord,
  deleteDepartmentRecord,
  listDepartmentRecords,
  updateDepartmentRecord,
  type DepartmentRecord,
  type RecordInput,
  type RecordScope,
} from './services/departmentStore';
import { getWorkspaceModule, getWorkspaceModules } from './workspaces';

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
  initialView?: string;
  testMode?: TestModeInfo | null;
  onSignOut: () => void;
}

type HeadView =
  | 'overview'
  | 'registrations'
  | 'department'
  | 'sponsors'
  | 'inquiries'
  | 'dcc-applications'
  | 'cohead-management'
  | string;

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
  const committeeAccess = department === 'dcc';
  const registrationAccess = canManageRegistrations(department);
  const rolesAccess = canManageRoles(department) || Boolean(testMode?.isActive);
  // Shifts, roster, operations studio, and team-group management belong only
  // to the three operational departments. Test mode does not change a head's
  // department permissions; it remains a separate, explicitly authorized session.
  const operationsAccess = ['media_press', 'security', 'volunteers'].includes(department);
  const securityScannerAccess = department === 'security';
  // Only these departments retain workspace features. All other heads get
  // access to their personal QR pass only.
  const qrPassOnly = !['media_press', 'security', 'volunteers', 'dcc', 'pr', 'hr'].includes(department);
  const workspaceModules = useMemo(() => getWorkspaceModules(department), [department]);

  const isModuleView = useCallback(
    (value: string) => Boolean(getWorkspaceModule(department, value)),
    [department],
  );

  const [view, setView] = useState<HeadView>(() => {
    if (qrPassOnly) return 'qr-pass';
    if (initialView === 'sponsors' && isPr) return 'sponsors';
    if (initialView === 'inquiries' && isHr) return 'inquiries';
    if (initialView === 'dcc-applications' && department === 'dcc') return 'dcc-applications';
    if (initialView === 'dcc-committees' && department === 'dcc') return 'dcc-committees';
    if (['roles', 'groups'].includes(initialView || '') && operationsAccess) return 'groups';
    if (initialView === 'shifts' && operationsAccess) return 'shifts';
    // Operational heads land directly in custom sections/roles.
    if (operationsAccess) return 'groups';
    if (initialView === 'department') return 'department';
    if (initialView === 'registrations' && registrationAccess) return 'registrations';
    if (initialView && workspaceModules.some((module) => module.id === initialView)) return initialView;
    return 'overview';
  });

  const [registrations, setRegistrations] = useState<HeadRegistration[]>([]);
  const [selectedGroupForShift, setSelectedGroupForShift] = useState<WmTeamGroup | null>(null);
  const [coHeads, setCoHeads] = useState<Array<{user_id:string;full_name:string;email:string;phone?:string|null;gender?:string|null}>>([]);
  const [coHeadsError, setCoHeadsError] = useState("");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [announcements, setAnnouncements] = useState<HeadAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [focusRecord, setFocusRecord] = useState<HeadRegistration | null>(null);

  const [records, setRecords] = useState<DepartmentRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState('');

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

  const recordScope = useMemo<RecordScope>(
    () => ({
      department,
      section: section ?? null,
      testToken: testMode?.token || null,
    }),
    [department, section, testMode?.token],
  );

  const loadWorkspaceRecords = useCallback(async () => {
    setRecordsLoading(true);
    setRecordsError('');
    const result = await listDepartmentRecords(recordScope);
    if (result.ok && result.data) {
      setRecords(result.data);
    } else {
      setRecords([]);
      setRecordsError(result.error || 'Department records could not be loaded.');
    }
    setRecordsLoading(false);
  }, [recordScope]);

  /**
   * Registrations and settings. Registration queries only run for the three
   * authorized departments, so other heads never even request the data.
   */
  const loadRegistrationData = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    if (testMode?.token && registrationAccess) {
      try {
        const resp = await fetch(
          `/api/super-admin?action=test-data&department=${encodeURIComponent(department)}&section=${encodeURIComponent(section || '')}`,
          { headers: { Authorization: `Bearer ${testMode.token}` } },
        );
        const data = await resp.json();
        if (resp.ok && data?.success) {
          setRegistrations((data.registrations as HeadRegistration[]) || []);
          if (data.settings) setSettings(data.settings);
          if (data.announcements) setAnnouncements(data.announcements as HeadAnnouncement[]);
        } else if (data?.error) {
          setLoadError(data.error);
        }
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : 'Failed to query test session data.');
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
        if (sessData?.session?.expires_at && sessData.session.expires_at * 1000 < Date.now() + 60000) {
          await supabase.auth.refreshSession();
        }
      } catch {}

      if (registrationAccess) {
        // Scope is enforced by RLS; the explicit filters keep the query aligned
        // with the head's exact department and section as well.
        let query = supabase.from('team_registrations').select('*').in('team', teamValues);
        if (section) query = query.eq('section', section);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          setRegistrations([]);
          setLoadError(explainAccessError(error));
        } else {
          setRegistrations((data as HeadRegistration[]) || []);
        }
      } else {
        setRegistrations([]);
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
  }, [department, section, teamValues, registrationAccess, testMode?.token]);

  const loadDepartmentData = useCallback(async () => {
    if (qrPassOnly) {
      setLoading(false);
      setRecordsLoading(false);
      return;
    }
    await Promise.all([loadRegistrationData(), loadWorkspaceRecords()]);
  }, [qrPassOnly, loadRegistrationData, loadWorkspaceRecords]);

  useEffect(() => {
    loadDepartmentData();
  }, [loadDepartmentData]);

  useEffect(() => {
    let active = true;
    if (qrPassOnly || !supabase) return;
    supabase.functions.invoke("wm-eb-access", { body: { action: "list_my_coheads", department, section: section || null } })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.success) { setCoHeadsError(data?.error || "Co-Head list unavailable."); return; }
        setCoHeads(data.coHeads || []);
        setCoHeadsError("");
      })
      .catch(() => { if (active) setCoHeadsError("Co-Head list unavailable."); });
    return () => { active = false; };
  }, [department, section, qrPassOnly]);

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
    if (!registrationAccess) {
      return { ok: false, error: 'Registration management is not authorized for this department.' };
    }

    // Optimistically update the head's visible applicant list immediately.
    // If the database rejects the decision, restore the previous status.
    const previousRecord = registrations.find((item) => item.id === id);
    if (previousRecord) {
      setRegistrations((current) => current.map((item) =>
        item.id === id ? { ...item, status, admin_notes: notes, updated_at: new Date().toISOString() } : item
      ));
    }
    const rollbackOptimisticStatus = () => {
      if (!previousRecord) return;
      setRegistrations((current) => current.map((item) =>
        item.id === id ? previousRecord : item
      ));
    };

    // Super IT test sessions have no Supabase Auth session; use the privileged,
    // audit-logged server endpoint instead.
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
        rollbackOptimisticStatus();
        return { ok: false, error: data?.error || 'Test update failed.' };
      } catch (err: unknown) {
        rollbackOptimisticStatus();
        const msg = err instanceof Error ? err.message : 'Network error.';
        return { ok: false, error: msg };
      }
    }

    if (!supabase) {
      rollbackOptimisticStatus();
      return { ok: false, error: 'Supabase is not configured.' };
    }

    const record = previousRecord;
    if (!record) {
      rollbackOptimisticStatus();
      return { ok: false, error: 'Application not found in this department.' };
    }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const headUser = userData.user;
    if (userError || !headUser) {
      rollbackOptimisticStatus();
      return { ok: false, error: 'Your Supabase session is missing. Sign in again.' };
    }

    // Department heads make the final decision for applications in their own team/section.
    if (!['accepted', 'rejected', 'waitlisted', 'under_review', 'received'].includes(status)) {
      rollbackOptimisticStatus();
      return { ok: false, error: 'Unsupported application status.' };
    }
    const applicationTeam = String(record.team || department);
    const normalizedTeam = applicationTeam.toLowerCase().replace(/[^a-z]/g, '');
    const decisionDepartment = normalizedTeam.includes('media') || normalizedTeam === 'press' ? 'media_press' : normalizedTeam.includes('volunteer') ? 'volunteers' : normalizedTeam.includes('security') || normalizedTeam.includes('protocol') ? 'security' : department;
    if (section && record.section && String(record.section).toLowerCase() !== String(section).toLowerCase()) {
      rollbackOptimisticStatus();
      return { ok: false, error: 'This application belongs to another section. Refresh the list or ask the Secretariat to correct the assignment.' };
    }
    const normalizedHeadDepartment = String(department || '').toLowerCase();
    const permittedDepartment = normalizedHeadDepartment === decisionDepartment || (normalizedHeadDepartment === 'media' && decisionDepartment === 'media_press') || (normalizedHeadDepartment === 'media_press' && decisionDepartment === 'media');
    if (!permittedDepartment) {
      rollbackOptimisticStatus();
      return { ok: false, error: 'This application is outside your assigned department.' };
    }
    const update = await supabase.from('team_registrations').update({ status, admin_notes: notes, updated_at: new Date().toISOString() }).eq('id', id).select('id,status').maybeSingle();
    if (update.error) {
      rollbackOptimisticStatus();
      return { ok: false, error: explainAccessError(update.error) };
    }
    if (!update.data) {
      rollbackOptimisticStatus();
      return { ok: false, error: 'The application was not updated. Confirm it is still assigned to your department and section.' };
    }
    return { ok: true };
  };

  const handleCreateRecord = useCallback(
    async (input: RecordInput) => {
      const result = await createDepartmentRecord(recordScope, input);
      if (!result.ok || !result.data) {
        return { ok: false, error: result.error || 'The record could not be created.' };
      }
      setRecords((previous) => [result.data as DepartmentRecord, ...previous]);
      return { ok: true };
    },
    [recordScope],
  );

  const handleUpdateRecord = useCallback(
    async (id: string, input: Partial<RecordInput>) => {
      const result = await updateDepartmentRecord(recordScope, id, input);
      if (!result.ok || !result.data) {
        return { ok: false, error: result.error || 'The record could not be updated.' };
      }
      const updated = result.data;
      setRecords((previous) => previous.map((record) => (record.id === id ? updated : record)));
      return { ok: true };
    },
    [recordScope],
  );

  const handleDeleteRecord = useCallback(
    async (id: string) => {
      const result = await deleteDepartmentRecord(recordScope, id);
      if (!result.ok) {
        return { ok: false, error: result.error || 'The record could not be deleted.' };
      }
      setRecords((previous) => previous.filter((record) => record.id !== id));
      return { ok: true };
    },
    [recordScope],
  );

  const openReview = (record: HeadRegistration) => {
    if (!registrationAccess) return;
    setFocusRecord(record);
    setView('registrations');
  };

  const navigate = (id: string) => {
    if (qrPassOnly) {
      if (id === 'qr-pass') window.location.assign('/pass');
      return;
    }
    // Operational heads retain registrations plus exactly two team tools:
    // custom sections/roles and shifts.
    if (operationsAccess && !['registrations', 'groups', 'shifts'].includes(id)) return;
    if (id === 'security-website') { window.location.assign('/scanner'); return; }
    if (['operations', 'shifts', 'groups', 'roles'].includes(id) && !operationsAccess) return;
    if (id === 'security-website' && !securityScannerAccess) return;
    if (id === 'website-editor' && !isCmsDepartment) return;
    if (id === 'registrations' && !registrationAccess) return;
    if (id === 'roles' && !rolesAccess) return;
    if (id === 'sponsors' && !isPr) return;
    if (id === 'inquiries' && !isHr) return;
    if (id === 'dcc-committees' && !committeeAccess) return;
    if (id === 'dcc-applications' && !committeeAccess) return;
    setView(id);
  };

  const workspaceNavItems: NavItem[] = qrPassOnly
    ? [{ id: 'qr-pass', label: 'QR Pass', icon: QrCode }]
    : [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    ...workspaceModules.map((module) => ({
      id: module.id,
      label: module.navLabel,
      icon: module.icon,
    })),
  ];

  const isCmsDepartment =
    department === 'design' || department === 'marketing' || department === 'pr' || department === 'it';

  const operationsNavItems: NavItem[] = operationsAccess
    ? [
        ...(registrationAccess
          ? [{ id: 'registrations', label: 'Registrations', icon: Users, badge: stats.pending }]
          : []),
        { id: 'groups', label: 'Sections / Roles', icon: Users },
        { id: 'shifts', label: 'Shifts', icon: Building2 },
      ]
    : [
        ...(registrationAccess
          ? [{ id: 'registrations', label: 'Applications', icon: Users, badge: stats.pending }]
          : []),
        ...(isPr ? [{ id: 'sponsors', label: 'Sponsors', icon: Award }] : []),
        ...(isHr ? [{ id: 'inquiries', label: 'Inquiries', icon: MessageSquare }] : []),
        ...(committeeAccess ? [{ id: 'dcc-applications', label: 'Applications', icon: Users }] : []),
        ...(committeeAccess ? [{ id: 'dcc-committees', label: 'Committees', icon: Building2 }] : []),
        ...(isCmsDepartment ? [{ id: 'website-editor', label: 'Website CMS', icon: Globe }] : []),
        { id: 'cohead-management', label: 'Co-Head Management', icon: Users },
        { id: 'department', label: 'Assignment', icon: Building2 },
        ...(securityScannerAccess ? [{ id: 'security-website', label: 'Security Scanner', icon: QrCode }] : []),
      ];

  const navGroups: NavGroup[] = qrPassOnly
    ? [{ label: 'Access', items: workspaceNavItems }]
    : operationsAccess
      ? [{ label: 'Team operations', items: operationsNavItems }]
      : [
          { label: 'Department workspace', items: workspaceNavItems },
          { label: 'Operations', items: operationsNavItems },
        ];

  const activeModule = getWorkspaceModule(department, view);

  const viewLabel =
    view === 'qr-pass'
      ? 'QR Pass'
      : view === 'overview'
      ? 'Overview'
      : view === 'shifts'
        ? 'Shifts & Roster'
      : view === 'groups'
        ? 'Sections / Roles'
      : view === 'website-editor'
        ? 'Website CMS'
        : view === 'registrations'
          ? 'Applications'
          : view === 'roles'
            ? 'Roles & Hierarchy'
            : view === 'sponsors'
              ? 'Sponsors & Partners'
              : view === 'inquiries'
                ? 'Inquiries & Messages'
                : view === 'dcc-committees'
                  ? 'Committee Management'
                : view === 'dcc-applications'
                  ? 'Chair & Delegate Applications'
                : view === 'cohead-management'
                  ? 'Co-Head Management'
                : view === 'department'
                  ? 'Assignment'
                  : activeModule?.label || 'Workspace';

  const displayName = (headName && headName.trim()) || headEmail.split('@')[0] || 'Department head';

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
      onNavigate={navigate}
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
                  Authorized IT Super Admin testing session (
                  <span className="font-mono text-amber-300/90">{testMode.adminEmail}</span>). Testing
                  privileges are audit-logged server-side; normal head accounts and RLS policies remain
                  isolated.
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
        {qrPassOnly && view === 'qr-pass' && (
          <section className="mx-auto max-w-2xl rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#17150f] to-[#0b0b0c] p-6 text-center shadow-xl sm:p-9">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]">
              <QrCode className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.24em] text-[#d4af37]">WEST MUN 2027</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Your official QR pass</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-400">
              Your head account has access to the official QR pass only. Open your pass to display your unique code at the venue.
            </p>
            <button type="button" onClick={() => window.location.assign('/pass')} className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110">
              <QrCode className="h-4 w-4" aria-hidden="true" /> Open QR Pass
            </button>
          </section>
        )}
        {!qrPassOnly && loadError && registrationAccess && (
          <Notice tone="error" title="Registrations could not be loaded">
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

        {view === 'overview' && registrationAccess && (
          <>
            {coHeads.length > 0 && (
              <section className="mb-5 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/[0.06] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#f3e5ab]">Your Co-Head{coHeads.length === 1 ? "" : "s"}</h2>
                  <span className="rounded-full border border-[#d4af37]/30 px-2 py-0.5 text-[10px] text-[#e5c158]">{coHeads.length}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {coHeads.map((member) => (
                    <div key={member.user_id} className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-sm font-medium text-white">{member.full_name}</p>
                      <p className="mt-1 text-xs text-neutral-400">{member.email}</p>
                      {member.phone && <p className="mt-1 text-xs text-neutral-500">{member.phone}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {coHeadsError && <p className="mb-4 text-xs text-neutral-500">{coHeadsError}</p>}
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
              onOpenRoles={rolesAccess ? () => setView('roles') : undefined}
            />
            <section aria-labelledby="registration-workspace-heading" className="space-y-3">
              <div>
                <h2
                  id="registration-workspace-heading"
                  className="text-[13.5px] font-semibold text-white"
                >
                  Department workspace
                </h2>
                <p className="mt-0.5 text-[11.5px] text-neutral-400">
                  Operational tools for {meta.label}, stored in Supabase.
                </p>
              </div>
              <WorkspaceModuleGrid
                meta={meta}
                records={records}
                loading={recordsLoading}
                onOpenModule={navigate}
              />
            </section>
          </>
        )}

        {view === 'overview' && !registrationAccess && (
          <WorkspaceOverview
            meta={meta}
            section={section}
            headName={headName}
            records={records}
            loading={recordsLoading}
            storageError={recordsError}
            announcements={announcements}
            onRefresh={loadDepartmentData}
            onOpenModule={navigate}
            onReplayUnlock={handleReplayUnlock}
          />
        )}

        {view === 'registrations' && registrationAccess && (
          <HeadRegistrations
            registrations={registrations}
            loading={loading}
            department={meta.key}
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

        {view === 'dcc-committees' && committeeAccess && <DCCCommitteeManager />}
        {view === 'dcc-applications' && committeeAccess && <DCCApplicationsManager />}

        {view === 'cohead-management' && (
          <HeadCoHeadManagement department={department} section={section} headName={headName} />
        )}

        {view === 'groups' && operationsAccess && (
          <GroupManagementDashboard
            department={department}
            section={section}
            testToken={testMode?.token || null}
            onAssignGroupToShift={(group) => {
              setSelectedGroupForShift(group);
              setView('shifts');
            }}
          />
        )}

        {view === 'shifts' && operationsAccess && (
          <ShiftManagementDashboard
            department={department}
            section={section}
            testToken={testMode?.token || null}
            initialGroup={selectedGroupForShift}
          />
        )}



        {view === 'website-editor' && isCmsDepartment && (
          <WebsiteEditor authorName={displayName} authorEmail={headEmail} />
        )}

        {view === 'security-website' && securityScannerAccess && (
          <div className="rounded-xl border border-white/10 bg-[#0e0e14] p-5">
            <h2 className="text-base font-semibold text-white">Security Scanner</h2>
            <p className="mt-1 text-sm text-neutral-400">Open the conference check-in scanner.</p>
            <button
              type="button"
              onClick={() => window.location.assign('/scanner')}
              className="mt-4 rounded-lg border border-[#d4af37] bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black hover:brightness-110"
            >
              Open Security Scanner
            </button>
          </div>
        )}

        {view === 'department' && (
          <HeadDepartment
            meta={meta}
            section={section}
            headName={headName}
            headEmail={headEmail}
            isOpen={isOpen}
            stats={stats}
            registrationAccess={registrationAccess}
            onOpenRegistrations={() => setView('registrations')}
            onOpenWorkspace={() => setView(workspaceModules[0]?.id || 'overview')}
          />
        )}

        {activeModule && (
          <DepartmentWorkspace
            department={department}
            section={section}
            module={activeModule}
            records={records}
            loading={recordsLoading}
            storageError={recordsError}
            onReload={loadWorkspaceRecords}
            onCreate={handleCreateRecord}
            onUpdate={handleUpdateRecord}
            onDelete={handleDeleteRecord}
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
