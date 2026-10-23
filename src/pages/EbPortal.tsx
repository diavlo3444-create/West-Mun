import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Crown,
  LayoutDashboard,
  Calendar,
  Building2,
  Users,
  Radio,
  TrendingUp,
  Smartphone,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  CheckSquare,
} from 'lucide-react';
import {
  ebOperationsService,
  type EbTask,
  type EbShift,
  type EbStation,
  type EbAnnouncement,
  type EbHierarchyNode,
  type EbIncident,
  type EbNotification,
  type EbShiftSwap,
} from '../lib/ebOperationsService';
import { EbNavbar } from '../components/eb/EbNavbar';
import { EbOverviewView } from '../components/eb/EbOverviewView';
import { EbTasksView } from '../components/eb/EbTasksView';
import { EbScheduleView } from '../components/eb/EbScheduleView';
import { EbStationView } from '../components/eb/EbStationView';
import { EbHierarchyView } from '../components/eb/EbHierarchyView';
import { EbAnnouncementsView } from '../components/eb/EbAnnouncementsView';
import { EbOversightView } from '../components/eb/EbOversightView';
import { EbEventDayMode } from '../components/eb/EbEventDayMode';

export interface EbMemberProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  section: string | null;
  phone?: string | null;
  reportingHeadId?: string | null;
  reportingHeadName?: string | null;
  reportingHeadEmail?: string | null;
  reportingHeadDepartment?: string | null;
  reportingHeadSection?: string | null;
  isHead?: boolean;
  isAdmin?: boolean;
}

type TabKey = 'overview' | 'tasks' | 'schedule' | 'station' | 'hierarchy' | 'announcements' | 'oversight';

export default function EbPortal() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EbMemberProfile | null>(null);
  const [demoSessionToken, setDemoSessionToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isEventDayMode, setIsEventDayMode] = useState(false);
  const [dataError, setDataError] = useState('');
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);

  // Operations Data State
  const [tasks, setTasks] = useState<EbTask[]>([]);
  const [shifts, setShifts] = useState<EbShift[]>([]);
  const [stations, setStations] = useState<EbStation[]>([]);
  const [announcements, setAnnouncements] = useState<EbAnnouncement[]>([]);
  const [hierarchy, setHierarchy] = useState<EbHierarchyNode[]>([]);
  const [incidents, setIncidents] = useState<EbIncident[]>([]);
  const [swaps, setSwaps] = useState<EbShiftSwap[]>([]);
  const [notifications, setNotifications] = useState<EbNotification[]>([]);

  // Load initial data
  const loadData = useCallback(async (prof: EbMemberProfile) => {
    try {
      setDataError('');
      const canReview = Boolean(prof.isHead || prof.isAdmin || prof.role === 'co_head');
      const results = await Promise.allSettled([
        ebOperationsService.getTasks(prof.id, prof.department, canReview, prof.name),
        ebOperationsService.getShifts(prof.department, prof.id, canReview),
        ebOperationsService.getStations(prof.department),
        ebOperationsService.getAnnouncements(prof.id, prof.department),
        ebOperationsService.getHierarchy(prof.department),
        ebOperationsService.getIncidents(prof.department),
        ebOperationsService.getShiftSwaps(prof.id, prof.department, canReview),
      ]);
      const [taskResult, shiftResult, stationResult, announcementResult, hierarchyResult, incidentResult, swapResult] = results;
      const t = taskResult.status === 'fulfilled' ? taskResult.value : [];
      const s = shiftResult.status === 'fulfilled' ? shiftResult.value : [];
      const st = stationResult.status === 'fulfilled' ? stationResult.value : [];
      const a = announcementResult.status === 'fulfilled' ? announcementResult.value : [];
      const h = hierarchyResult.status === 'fulfilled' ? hierarchyResult.value : [];
      const inc = incidentResult.status === 'fulfilled' ? incidentResult.value : [];
      const sw = swapResult.status === 'fulfilled' ? swapResult.value : [];
      const failures = results.filter((result) => result.status === 'rejected') as PromiseRejectedResult[];
      setTasks(t);
      setShifts(s);
      setStations(st);
      setAnnouncements(a);
      setHierarchy(h);
      setIncidents(inc);
      setSwaps(sw);
      if (failures.length) {
        setDataError(failures.map((failure) => failure.reason instanceof Error ? failure.reason.message : 'Some EB data could not be loaded.').join(' '));
      }

      // Build real notifications
      const notifs: EbNotification[] = [];
      const overdue = t.filter(
        (task) => task.status !== 'completed' && task.deadline && new Date(task.deadline).getTime() < Date.now()
      );
      if (overdue.length > 0) {
        notifs.push({
          id: 'notif-overdue',
          title: 'Overdue Task Alert',
          message: `You have ${overdue.length} overdue task(s) requiring completion.`,
          type: 'alert',
          timestamp: new Date().toISOString(),
          read: false,
          linkTab: 'overview',
        });
      }

      const critical = a.filter((ann) => ann.priority === 'critical' && !ann.is_acknowledged);
      if (critical.length > 0) {
        notifs.push({
          id: 'notif-crit',
          title: 'Mandatory Directive',
          message: critical[0].title,
          type: 'announcement',
          timestamp: critical[0].created_at,
          read: false,
          linkTab: 'announcements',
        });
      }

      if (s.length > 0) {
        notifs.push({
          id: 'notif-shift',
          title: 'Next Shift Roster',
          message: `${s[0].station_name} on ${s[0].shift_date}`,
          type: 'shift',
          timestamp: s[0].starts_at,
          read: true,
          linkTab: 'schedule',
        });
      }

      let dismissed: string[] = [];
      try { dismissed = JSON.parse(localStorage.getItem(`wm-eb-dismissed-notifications-${prof.id}`) || '[]'); } catch { dismissed = []; }
      setDismissedNotificationIds(dismissed);
      setNotifications(notifs.filter((n) => !dismissed.includes(n.id)).map((n) => ({
        ...n, read: localStorage.getItem(`wm-eb-notification-read-${prof.id}-${n.id}`) === 'true' || n.read,
      })));
    } catch (e) {
      setDataError(e instanceof Error ? e.message : 'EB information could not be loaded. Please retry.');
    }
  }, []);

  // Initialize and verify user role
  useEffect(() => {
    let live = true;
    const verifyUser = async () => {
      const params = new URLSearchParams(window.location.search);
      const launchToken = params.get('test_token') || params.get('test_ticket');
      const storedDemo = (() => { try { return JSON.parse(sessionStorage.getItem('westmun_super_it_test_session') || 'null'); } catch { return null; } })();
      const candidateToken = launchToken || storedDemo?.token;
      if (candidateToken) {
        try {
          let verify = await fetch(`/api/super-admin?action=verify-test-session&token=${encodeURIComponent(candidateToken)}`);
          let result: any = await verify.json().catch(() => ({}));
          if ((!verify.ok || !result?.authorized) && params.has('test_ticket')) {
            verify = await fetch(`/api/super-admin?action=consume-ticket&ticket=${encodeURIComponent(params.get('test_ticket') || '')}`);
            result = await verify.json().catch(() => ({}));
          }
          const demoRole = result?.head?.demoRole;
          if (verify.ok && (result?.authorized || result?.success) && result?.head && ['co_head', 'marketing', 'design'].includes(demoRole)) {
            const token = result.sessionToken || candidateToken;
            setDemoSessionToken(token);
            sessionStorage.setItem('westmun_super_it_test_session', JSON.stringify({ token, adminEmail: result.adminEmail || 'diavlo3444@gmail.com', expiresAt: result.expiresAt }));
            params.delete('test_token'); params.delete('test_ticket');
            window.history.replaceState({}, document.title, `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
            const head = result.head;
            const demoProfile: EbMemberProfile = {
              id: head.id,
              name: head.headName || `Demo ${demoRole}`,
              email: head.email || `demo-${demoRole}@westmun.local`,
              role: demoRole === 'co_head' ? 'co_head' : demoRole === 'marketing' ? 'Marketing' : 'Design',
              department: head.department || (demoRole === 'co_head' ? 'security' : demoRole),
              section: head.section || null,
              isHead: false,
              isAdmin: false,
            };
            if (!live) return;
            setProfile(demoProfile);
            setLoading(false);
            void loadData(demoProfile);
            return;
          }
        } catch (demoError) {
          console.warn('[EB Demo Session] Verification failed:', demoError);
        }
      }

      if (!supabase) {
        if (live) {
          setError('The WEST MUN sign-in service is unavailable.');
          setLoading(false);
        }
        return;
      }

      const { data, error: authError } = await supabase.auth.getUser();
      const user = data?.user;
      if (authError || !user) {
        window.location.replace('/login');
        return;
      }

      const meta = (user.app_metadata || {}) as Record<string, unknown>;
      const userMeta = (user.user_metadata || {}) as Record<string, unknown>;

      // Check Admin status
      const { data: adminData } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
      const isAdmin = Boolean(adminData);

      // Check Department Head status
      const { data: headData } = await supabase
        .from('department_heads')
        .select('user_id,department,section,active')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle();
      const isHead = Boolean(headData);

      const department = String(headData?.department || meta.wm_team || userMeta.wm_team || 'general');
      const section = headData?.section || (meta.wm_section as string | null) || (userMeta.wm_section as string | null) || null;
      const role = isHead
        ? 'Department Head'
        : isAdmin
        ? 'Super Admin'
        : String(meta.wm_eb_role || userMeta.wm_eb_role || 'Executive Board');
      const fullName =
        String(userMeta.full_name || user.email?.split('@')[0] || 'EB Officer');

      // Resolve the exact head selected at sign-up from active database records.
      // Never substitute a generic department contact or a made-up hotline/location.
      const selectedHeadId = String(
        meta.wm_reporting_head_id || userMeta.wm_reporting_head_id ||
        meta.reporting_head_id || userMeta.reporting_head_id ||
        meta.wm_department_head_id || userMeta.wm_department_head_id ||
        meta.selected_head_id || userMeta.selected_head_id || ''
      ).trim();
      const selectedHeadName = String(
        meta.wm_reporting_head_name || userMeta.wm_reporting_head_name ||
        meta.reporting_head_name || userMeta.reporting_head_name ||
        meta.selected_head_name || userMeta.selected_head_name || ''
      ).trim().toLowerCase();
      const selectedHeadEmail = String(
        meta.wm_reporting_head_email || userMeta.wm_reporting_head_email ||
        meta.reporting_head_email || userMeta.reporting_head_email ||
        meta.selected_head_email || userMeta.selected_head_email || ''
      ).trim().toLowerCase();

      let reportingHead: { user_id: string; department: string; section: string | null; head_name?: string; email?: string } | null = null;
      if (!isHead && !isAdmin && (selectedHeadId || selectedHeadName || selectedHeadEmail)) {
        const { data: directory } = await supabase.functions.invoke('wm-eb-access', { body: { action: 'list_active_heads' } });
        const activeHeads = directory?.heads || [];
        reportingHead = activeHeads.find((candidate: any) => {
          const idMatch = Boolean(selectedHeadId && String(candidate.user_id || '') === selectedHeadId);
          const nameMatch = Boolean(selectedHeadName && String(candidate.head_name || '').trim().toLowerCase() === selectedHeadName);
          const emailMatch = Boolean(selectedHeadEmail && String(candidate.email || '').trim().toLowerCase() === selectedHeadEmail);
          return idMatch || nameMatch || emailMatch;
        }) || null;
      }

      const builtProfile: EbMemberProfile = {
        id: user.id,
        name: fullName,
        email: user.email || '',
        role,
        department,
        section,
        phone: (userMeta.phone as string) || null,
        reportingHeadId: reportingHead?.user_id || selectedHeadId || null,
        reportingHeadName: reportingHead?.head_name || (reportingHead ? (selectedHeadName || String(meta.wm_reporting_head_name || userMeta.wm_reporting_head_name || 'Department Head')) : null),
        reportingHeadEmail: reportingHead?.email || null,
        reportingHeadDepartment: reportingHead?.department || null,
        reportingHeadSection: reportingHead?.section || null,
        isHead,
        isAdmin,
      };

      if (!live) return;
      setProfile(builtProfile);
      setLoading(false);
      void loadData(builtProfile);
    };

    void verifyUser();
    return () => {
      live = false;
    };
  }, [loadData]);

  const handleSignOut = async () => {
    if (demoSessionToken) {
      try {
        await fetch('/api/super-admin?action=terminate-test-session', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${demoSessionToken}` }, body: JSON.stringify({ token: demoSessionToken }) });
      } catch {}
      sessionStorage.removeItem('westmun_super_it_test_session');
      window.location.replace('/admin');
      return;
    }
    await supabase?.auth.signOut();
    window.location.replace('/login');
  };

  // Task Actions
  const handleUpdateTask = async (
    taskId: string,
    updates: Partial<Pick<EbTask, 'status' | 'checklist' | 'completion_note' | 'blocker_reason' | 'completed_at'>>
  ) => {
    const updated = await ebOperationsService.updateTask(taskId, updates);
    setTasks((current) => current.map((t) => (t.id === taskId ? updated : t)));
  };

  const handleCreateTask = async (task: Omit<EbTask, 'id' | 'created_at' | 'completed_at'>) => {
    const created = await ebOperationsService.createTask(task);
    setTasks((current) => [created, ...current]);
  };

  const handleFetchComments = async (taskId: string) => {
    return ebOperationsService.getTaskComments(taskId);
  };

  const handleAddComment = async (taskId: string, comment: string) => {
    if (!profile) return;
    await ebOperationsService.addTaskComment(taskId, comment, {
      id: profile.id,
      name: profile.name,
      role: profile.role,
    });
  };

  // Shift & Swap Actions
  const handleRequestSwap = async (swap: {
    assignment_id: string;
    requester_user_id: string;
    requester_name: string;
    target_shift_id?: string | null;
    reason: string;
  }) => {
    const newSwap = await ebOperationsService.requestShiftSwap(swap);
    setSwaps((current) => [newSwap, ...current]);
  };

  const handleReviewSwap = async (swapId: string, status: 'approved' | 'rejected', notes: string) => {
    await ebOperationsService.reviewShiftSwap(swapId, status, notes);
    setSwaps((current) =>
      current.map((sw) => (sw.id === swapId ? { ...sw, status, review_notes: notes } : sw))
    );
  };

  // Station Actions
  const handleToggleStationChecklist = async (
    stationId: string,
    type: 'opening' | 'closing',
    checklist: any[]
  ) => {
    await ebOperationsService.updateStationChecklist(stationId, type, checklist);
    setStations((current) =>
      current.map((s) => {
        if (s.id === stationId) {
          return {
            ...s,
            [type === 'opening' ? 'opening_checklist' : 'closing_checklist']: checklist,
          };
        }
        return s;
      })
    );
  };

  // Announcement Actions
  const handleAcknowledgeAnnouncement = async (announcementId: string) => {
    if (!profile) return;
    await ebOperationsService.acknowledgeAnnouncement(announcementId, profile.id);
    setAnnouncements((current) =>
      current.map((a) => (a.id === announcementId ? { ...a, is_acknowledged: true } : a))
    );
  };

  const handlePublishAnnouncement = async (ann: Omit<EbAnnouncement, 'id' | 'created_at'>) => {
    const created = await ebOperationsService.publishAnnouncement(ann);
    setAnnouncements((current) => [created, ...current]);
  };

  // Incident Actions (Event Day)
  const handleReportIncident = async (incident: Omit<EbIncident, 'id' | 'created_at' | 'status'>) => {
    const created = await ebOperationsService.reportIncident(incident);
    setIncidents((current) => [created, ...current]);
  };

  const handleResolveIncident = async (incidentId: string, resolutionNotes: string) => {
    await ebOperationsService.resolveIncident(incidentId, resolutionNotes);
    setIncidents((current) =>
      current.map((inc) =>
        inc.id === incidentId ? { ...inc, status: 'resolved', resolution_notes: resolutionNotes } : inc
      )
    );
  };

  // Notifications
  const handleMarkNotificationRead = (id: string) => {
    if (profile) localStorage.setItem(`wm-eb-notification-read-${profile.id}-${id}`, 'true');
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleClearAllNotifications = () => {
    if (profile) {
      const allIds = Array.from(new Set([...dismissedNotificationIds, ...notifications.map((n) => n.id)]));
      localStorage.setItem(`wm-eb-dismissed-notifications-${profile.id}`, JSON.stringify(allIds));
      setDismissedNotificationIds(allIds);
    }
    setNotifications([]);
  };

  // Stats calculation
  const pendingCount = tasks.filter((t) => t.status !== 'completed').length;
  const overdueCount = tasks.filter(
    (t) => t.status !== 'completed' && t.deadline && new Date(t.deadline).getTime() < Date.now()
  ).length;
  const unreadAnnouncementsCount = announcements.filter((a) => a.priority === 'critical' && !a.is_acknowledged).length;

  // Tabs configuration
  const canSeeOversight = profile?.isHead || profile?.isAdmin || profile?.role === 'co_head';

  const TABS: { id: TabKey; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: canSeeOversight ? 'Department Tasks' : 'My Tasks', icon: CheckSquare, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'schedule', label: canSeeOversight ? 'Department Schedule' : 'My Schedule', icon: Calendar },
    { id: 'station', label: canSeeOversight ? 'Department Stations' : 'My Station', icon: Building2 },
    { id: 'hierarchy', label: 'Hierarchy', icon: Users },
    { id: 'announcements', label: 'Announcements', icon: Radio, badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : undefined },
    ...(canSeeOversight ? [{ id: 'oversight' as TabKey, label: 'Head Oversight', icon: TrendingUp }] : []),
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] px-4 py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
          <span>Verifying Executive Board credentials…</span>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-[#070707] px-4 py-16 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/40 bg-rose-950/20 p-6 text-center space-y-3">
          <p className="text-sm text-rose-200">{error || 'Could not verify EB account.'}</p>
          <a
            href="/login"
            className="inline-block rounded-xl bg-[#d4af37] px-4 py-2 text-xs font-semibold text-black"
          >
            Back to Sign In
          </a>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-[#f5f5f5] selection:bg-[#d4af37]/30 selection:text-white flex flex-col justify-between">
      <div>
        {demoSessionToken && <div className="border-b border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-2 text-center text-xs text-[#f5d47a]"><span className="font-semibold">SUPER IT DEMO SESSION</span> · Temporary role preview · Live operational data · Expires automatically after 15 minutes</div>}
        {/* Sticky Operations Topbar */}
        <EbNavbar
          profile={profile}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onNavigateNotification={(tabId) => {
            if (['overview', 'schedule', 'station', 'hierarchy', 'announcements', 'oversight'].includes(tabId)) {
              setActiveTab(tabId as TabKey);
              setIsEventDayMode(false);
            }
          }}
          onClearAllNotifications={handleClearAllNotifications}
          pendingTasksCount={pendingCount}
          overdueTasksCount={overdueCount}
          unreadAnnouncementsCount={unreadAnnouncementsCount}
          onSignOut={handleSignOut}
        />

        {dataError && (
          <div role="alert" className="mx-auto mb-4 max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col gap-2 rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 text-sm text-rose-100 sm:flex-row sm:items-center sm:justify-between">
              <span>{dataError}</span>
              <button type="button" onClick={() => profile && void loadData(profile)} className="self-start rounded-lg border border-rose-300/30 px-3 py-1.5 text-xs font-semibold hover:bg-rose-500/10">Retry loading</button>
            </div>
          </div>
        )}
        {/* Event Day Mode (Field Phone Mode) vs Standard Portal */}
        {isEventDayMode ? (
          <main className="px-4 py-6">
            <EbEventDayMode
              profile={profile}
              currentShift={shifts[0] || null}
              station={stations[0] || null}
              tasks={tasks}
              announcements={announcements}
              incidents={incidents}
              onToggleTaskChecklist={async (taskId, itemId) => {
                const task = tasks.find((t) => t.id === taskId);
                if (!task) return;
                const updatedList = task.checklist.map((i) =>
                  i.id === itemId ? { ...i, completed: !i.completed } : i
                );
                await handleUpdateTask(taskId, { checklist: updatedList });
              }}
              onReportIncident={handleReportIncident}
              onResolveIncident={canSeeOversight ? handleResolveIncident : undefined}
              onExitEventDayMode={() => setIsEventDayMode(false)}
            />
          </main>
        ) : (
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
            {/* View Navigation Tab Bar */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-white/[0.08] pb-3 scrollbar-none">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-2 border px-4 py-2 text-xs transition ${
                      isActive
                        ? 'border-[#d4af37] bg-[#d4af37]/10 text-white font-medium'
                        : 'border-white/10 bg-black/40 text-neutral-400 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#f5d47a]' : 'text-neutral-500'}`} />
                    <span className="font-mono text-[11px] uppercase tracking-wider">{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="flex h-3.5 min-w-3.5 items-center justify-center bg-[#d4af37] px-1 font-mono text-[9px] font-bold text-black">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active View Container */}
            {activeTab === 'overview' && (
              <EbOverviewView
                profile={profile}
                tasks={tasks}
                shifts={shifts}
                stations={stations}
                announcements={announcements}
                incidents={incidents}
                swaps={swaps}
                onNavigateTab={(tab) => setActiveTab(tab as TabKey)}
                onAcknowledgeAnnouncement={handleAcknowledgeAnnouncement}
                onUpdateTaskStatus={async (taskId, status) => {
                  await handleUpdateTask(taskId, { status });
                }}
                onToggleTaskChecklist={async (taskId, itemId) => {
                  const task = tasks.find((t) => t.id === taskId);
                  if (!task) return;
                  const updatedList = task.checklist.map((i) =>
                    i.id === itemId ? { ...i, completed: !i.completed } : i
                  );
                  await handleUpdateTask(taskId, { checklist: updatedList });
                }}
                onCreateTask={handleCreateTask}
                onResolveIncident={canSeeOversight ? (id: string, notes?: string) => handleResolveIncident(id, notes || 'Resolved by Co-Head') : undefined}
                onReviewSwap={canSeeOversight ? handleReviewSwap : undefined}
              />
            )}

            {activeTab === 'tasks' && (
              <EbTasksView
                profile={profile}
                tasks={tasks}
                onUpdateTask={handleUpdateTask}
                onCreateTask={handleCreateTask}
                onFetchComments={handleFetchComments}
                onAddComment={handleAddComment}
              />
            )}

            {activeTab === 'schedule' && (
              <EbScheduleView
                profile={profile}
                shifts={shifts}
                swaps={swaps}
                onRequestSwap={handleRequestSwap}
                onReviewSwap={canSeeOversight ? handleReviewSwap : undefined}
              />
            )}

            {activeTab === 'station' && (
              <EbStationView
                profile={profile}
                stations={stations}
                onToggleStationChecklist={handleToggleStationChecklist}
              />
            )}

            {activeTab === 'hierarchy' && (
              <EbHierarchyView profile={profile} hierarchy={hierarchy} />
            )}

            {activeTab === 'announcements' && (
              <EbAnnouncementsView
                profile={profile}
                announcements={announcements}
                onAcknowledgeAnnouncement={handleAcknowledgeAnnouncement}
                onPublishAnnouncement={canSeeOversight ? handlePublishAnnouncement : undefined}
              />
            )}

            {activeTab === 'oversight' && canSeeOversight && (
              <EbOversightView
                profile={profile}
                tasks={tasks}
                shifts={shifts}
                stations={stations}
                announcements={announcements}
                onNavigateTab={(tab) => setActiveTab(tab as TabKey)}
              />
            )}
          </main>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#070707] py-6 text-center text-xs text-neutral-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-neutral-400">
            WEST MUN 2027 · Executive Board Operations System · All Rights Reserved
          </p>
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <a href="/" className="hover:text-white">Conference Website</a>
            <a href="/terms" className="hover:text-white">Operations Terms</a>
            <a href="/privacy" className="hover:text-white">Confidentiality Protocol</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
