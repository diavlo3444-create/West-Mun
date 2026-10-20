import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Inbox,
  Settings,
  Shield,
  LogOut,
  Loader2,
  Layers,
  ShieldCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  ArrowRight,
  CircleDot,
  Database,
  ScrollText,
  UserCheck,
  Globe,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { SECTIONS } from './config';
import { ContentManager } from './ContentManager';
import { SettingsManager } from './SettingsManager';
import { InquiriesManager } from './InquiriesManager';
import { DashboardOverview } from './DashboardOverview';
import { RegistrationsManager } from './RegistrationsManager';
import { TeamManagement } from './TeamManagement';
import { StatisticsReports } from './StatisticsReports';
import { SuperAdminManager } from './SuperAdminManager';
import { AdminAccountsManager } from './AdminAccountsManager';
import { WebsiteEditor } from './WebsiteEditor';
import { explainError, type Row } from './ui';
import { DashboardShell, type NavGroup } from '../dashboard/DashboardShell';
import { Notice, btnPrimary, inputCls, labelCls } from '../dashboard/ui';

const IDLE_MS = 30 * 60 * 1000; // Sign out after 30 minutes of inactivity

export type NavigationPage =
  | 'dashboard'
  | 'registrations'
  | 'teams'
  | 'reports'
  | 'admin-accounts'
  | 'super-admin'
  | 'website-editor'
  | 'messages'
  | 'settings'
  | `section:${string}`;

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [booting, setBooting] = useState(true);
  const [page, setPage] = useState<NavigationPage>(() =>
    new URLSearchParams(window.location.search).has('gmail') ? 'registrations' : 'dashboard',
  );

  // Authentication form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const idleTimer = useRef<number | undefined>(undefined);

  // Real data state
  const [delegates, setDelegates] = useState<Row[]>([]);
  const [teamRegistrations, setTeamRegistrations] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [inspectTarget, setInspectTarget] = useState<{ app: any; type: 'delegate' | 'team' } | null>(
    null,
  );

  // SEO & Head configuration: admin panel must never be indexed
  useEffect(() => {
    document.title = 'WEST MUN 2027 — Conference Management';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    document.querySelector('link[rel="canonical"]')?.remove();
    return () => meta.remove();
  }, []);

  /**
   * Trusted server-side gate. The browser never decides admin status from an
   * email string, localStorage flag or client-supplied user ID: the API
   * verifies the Supabase access token and the caller's public.admins row.
   */
  const checkAdmin = useCallback(async (s: Session | null): Promise<string | null> => {
    if (!s?.access_token) {
      setIsAdmin(null);
      setIsSuperAdmin(false);
      return 'You are not signed in.';
    }

    try {
      const response = await fetch('/api/super-admin?action=session', {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.authorized) {
        setIsAdmin(true);
        setIsSuperAdmin(Boolean(data.isSuperAdmin));
        return null;
      }

      setIsAdmin(false);
      setIsSuperAdmin(false);
      return (
        data?.error ||
        (response.status === 503
          ? 'Server authentication is not configured.'
          : 'This account does not have organiser permissions.')
      );
    } catch {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      return 'Could not reach the authorization server. Please try again.';
    }
  }, []);

  // Fetch real records from Supabase
  const loadData = useCallback(async () => {
    if (!supabase) return;
    setDataLoading(true);
    setDataError('');

    try {
      // 1. Fetch delegates
      const { data: delData, error: delErr } = await supabase
        .from('delegates')
        .select('*')
        .order('created_at', { ascending: false });

      if (delErr) {
        setDataError(explainError(delErr));
      } else {
        setDelegates((delData as Row[]) || []);
      }

      // 2. Fetch team_registrations (gracefully handle if table has not been created yet)
      const { data: teamData, error: teamErr } = await supabase
        .from('team_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!teamErr && teamData) {
        setTeamRegistrations((teamData as Row[]) || []);
      } else {
        setTeamRegistrations([]);
      }

      // 3. Fetch settings
      const { data: setRows, error: setErr } = await supabase.from('settings').select('*');
      if (setErr) {
        if (!delErr) setDataError(explainError(setErr));
      } else if (setRows) {
        const dict: Record<string, string> = {};
        setRows.forEach((r: { key: string; value: string }) => {
          dict[r.key] = r.value;
        });
        setSettings(dict);
      }
    } catch {
      setDataError('Could not load records from Supabase. Check the connection and try again.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase || !supabaseConfigured) {
      setError(
        'Supabase Auth is not configured on this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the hosting environment and redeploy.',
      );
      setBooting(false);
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      const authErr = await checkAdmin(data.session);
      if (alive) {
        // A first visit has no session at all: show the sign-in form without a
        // scary error. Only surface a message when a real account was refused.
        if (authErr && data.session) setError(authErr);
        setBooting(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setIsAdmin(null);
        setIsSuperAdmin(false);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [checkAdmin]);

  // Load records once authenticated as admin
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, loadData]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [page]);

  const signOut = useCallback(async () => {
    try {
      // Revoke the refresh token on Supabase's side, not just locally.
      await supabase?.auth.signOut({ scope: 'global' });
    } catch {
      await supabase?.auth.signOut().catch(() => null);
    }
    setSession(null);
    setIsAdmin(null);
    setIsSuperAdmin(false);
    setPassword('');
    setDelegates([]);
    setTeamRegistrations([]);
    setDataError('');
  }, []);

  // Idle sign-out after 30 minutes
  useEffect(() => {
    if (!session) return;
    const reset = () => {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        signOut();
        setError('You were signed out after 30 minutes of inactivity.');
      }, IDLE_MS);
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      window.clearTimeout(idleTimer.current);
    };
  }, [session, signOut]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!supabase || !supabaseConfigured) {
      setError(
        'Supabase Auth is not configured on this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the hosting environment and redeploy.',
      );
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    setBusy(true);

    try {
      // Genuine Supabase Auth password verification. There is deliberately no
      // fallback, demo login, master key or email-only path.
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (err || !data?.session) {
        setError('Incorrect email or password.');
        return;
      }

      const authErr = await checkAdmin(data.session);
      if (authErr) {
        await supabase.auth.signOut({ scope: 'global' }).catch(() => null);
        setPassword('');
        setError(authErr);
        return;
      }

      setSession(data.session);
      setPassword('');
    } catch {
      setError('Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Update a single setting in Supabase
  const handleSettingsUpdate = async (key: string, val: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error: err } = await supabase
      .from('settings')
      .upsert({ key, value: val }, { onConflict: 'key' });

    if (!err) {
      setSettings((prev) => ({ ...prev, [key]: val }));
      return true;
    }
    return false;
  };

  const handleInspectFromDashboard = (app: any, type: 'delegate' | 'team') => {
    setInspectTarget({ app, type });
    setPage('registrations');
  };

  if (booting) {
    return (
      <div className="wm-app flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#101014]">
            <Shield className="h-5 w-5 text-[#d4af37]" aria-hidden="true" />
            <span className="absolute inset-0 animate-ping rounded-full border border-[#d4af37]/20" />
          </span>
          <div className="text-center">
            <p className="wm-display text-[12px] tracking-[0.16em] text-neutral-200">WEST MUN 2027</p>
            <p className="mt-1.5 flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
              <Loader2 className="h-3 w-3 animate-spin text-[#d4af37]" aria-hidden="true" />
              Verifying organiser session
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not signed in or not an admin
  if (!session || isAdmin !== true) {
    return (
      <div className="wm-app min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
        {/* Brand panel */}
        <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/[0.07] bg-[#0a0a0c] px-12 py-12 lg:flex">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_420px_at_18%_8%,rgba(212,175,55,0.11),transparent_65%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(500px_260px_at_60%_100%,rgba(212,175,55,0.05),transparent_70%)]"
            aria-hidden="true"
          />

          <div className="relative flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-[8px] border border-[#d4af37]/35 bg-[#121214]">
              <img src="/westmun-logo.jpg" alt="" className="h-full w-full object-cover" />
            </span>
            <div>
              <p className="wm-display text-[13px] tracking-[0.14em] text-[#f4f0e4]">
                WEST MUN <span className="text-[#d4af37]">2027</span>
              </p>
              <p className="mt-1 text-[8.5px] font-mono uppercase tracking-[0.24em] text-neutral-400">
                Western Model United Nations
              </p>
            </div>
          </div>

          <div className="relative max-w-lg">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.025] px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.18em] text-neutral-400">
              <LockKeyhole className="h-3 w-3 text-[#d4af37]" aria-hidden="true" />
              Secretariat access only
            </span>
            <h1 className="wm-serif text-[46px] leading-[1.02] text-[#f7f2e4]">
              The command room
              <br />
              for WEST MUN <span className="text-[#d4af37]">2027.</span>
            </h1>
            <p className="mt-5 max-w-md text-[13px] leading-relaxed text-neutral-400">
              One verified workspace for applications, department registrations, delegate services
              and conference communications — backed by the same Supabase records the public site uses.
            </p>

            <div className="mt-9 grid max-w-md gap-3">
              {[
                { icon: ScrollText, title: 'Application review', copy: 'Approve, reject and annotate with a full record trail.' },
                { icon: Layers, title: 'Department control', copy: 'Open or close each registration channel in one move.' },
                { icon: Database, title: 'Live Supabase data', copy: 'Row Level Security stays the final authority on every request.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3 border-t border-white/[0.06] pt-3">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d4af37]/80" aria-hidden="true" />
                    <div>
                      <p className="text-[11.5px] font-medium text-neutral-200">{item.title}</p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-neutral-400">{item.copy}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="relative text-[9px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            Authorised organisers only · Session expires after 30 minutes idle
          </p>
        </section>

        {/* Form panel */}
        <section className="relative flex min-h-screen flex-col justify-center px-5 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-[400px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-[8px] border border-[#d4af37]/35 bg-[#121214]">
                <img src="/westmun-logo.jpg" alt="" className="h-full w-full object-cover" />
              </span>
              <div>
                <p className="wm-display text-[12px] tracking-[0.14em] text-[#f4f0e4]">
                  WEST MUN <span className="text-[#d4af37]">2027</span>
                </p>
                <p className="mt-0.5 text-[8.5px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                  Conference management
                </p>
              </div>
            </div>

            <p className="text-[9.5px] font-mono uppercase tracking-[0.22em] text-[#d4af37]">
              Organiser access
            </p>
            <h2 className="wm-serif mt-2 text-[30px] leading-tight text-white">Sign in to the portal</h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
              Use the organisers’ Supabase account. Admins are granted in the database, not by this form.
            </p>

            <div className="mt-6 space-y-3">
              {session && isAdmin === false && (
                <Notice
                  tone="warning"
                  title="Signed in without organiser permissions"
                >
                  This account has no row in <code className="font-mono text-[11px] text-white">public.admins</code>.{' '}
                  <button
                    type="button"
                    className="ml-1 font-semibold underline underline-offset-2 hover:text-white"
                    onClick={signOut}
                  >
                    Sign out
                  </button>
                </Notice>
              )}

              {error && (
                <Notice tone="error" onDismiss={() => setError('')}>
                  {error}
                </Notice>
              )}
            </div>

            <form onSubmit={login} className="mt-5 space-y-4">
              <div>
                <label htmlFor="adm-email" className={labelCls}>
                  Organiser email
                </label>
                <input
                  id="adm-email"
                  type="email"
                  autoComplete="username"
                  required
                  className={inputCls}
                  placeholder="secretariat@westmun.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="adm-pass" className={labelCls}>
                  Password
                </label>
                <div className="relative">
                  <input
                    id="adm-pass"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className={`${inputCls} pr-10`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 transition-colors hover:text-neutral-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <button type="submit" className={`${btnPrimary} w-full py-2.5`} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Verifying credentials…
                  </>
                ) : (
                  <>
                    Authenticate
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-4 text-[10.5px] text-neutral-400">
              <a href="/" className="inline-flex items-center gap-1.5 transition-colors hover:text-[#d4af37]">
                <CircleDot className="h-3 w-3" aria-hidden="true" />
                Conference homepage
              </a>
              <span className="font-mono uppercase tracking-[0.14em]">Supabase Auth</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Active section for content editor
  const contentSection = page.startsWith('section:')
    ? SECTIONS.find((s) => s.id === page.slice(8))
    : undefined;

  const pendingCount =
    delegates.filter((d) => d.status === 'received' || d.status === 'under_review').length +
    teamRegistrations.filter((t) => t.status === 'received' || t.status === 'under_review').length;

  const navGroups: NavGroup[] = [
    {
      label: 'Operations',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'registrations', label: 'Registrations', icon: Users, badge: pendingCount },
        { id: 'teams', label: 'Departments', icon: Layers },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    ...(isSuperAdmin
      ? [
          {
            label: 'Access & systems',
            items: [
              { id: 'admin-accounts', label: 'Admin Accounts', icon: UserCheck },
              { id: 'super-admin', label: 'IT Super Admin', icon: ShieldCheck },
            ],
          },
        ]
      : []),
    {
      label: 'Communications',
      items: [
        { id: 'messages', label: 'Inquiries', icon: Inbox },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
    {
      label: 'Website CMS & Content',
      items: [
        { id: 'website-editor', label: 'Live Visual Editor', icon: Globe },
        ...SECTIONS.map((section) => ({
          id: `section:${section.id}`,
          label: section.label,
          icon: Layers,
        })),
      ],
    },
  ];

  const activeLabel =
    navGroups.flatMap((group) => group.items).find((item) => item.id === page)?.label ??
    contentSection?.label ??
    'Overview';

  const displayName =
    (session.user.user_metadata?.full_name as string | undefined) ||
    session.user.email?.split('@')[0] ||
    'Organiser';

  const user = {
    name: displayName,
    email: session.user.email || '',
    role: isSuperAdmin ? 'IT Super Admin' : 'Organiser',
  };

  return (
    <DashboardShell
      brandSubtitle="Secretariat command"
      navGroups={navGroups}
      active={page}
      onNavigate={(id) => setPage(id as NavigationPage)}
      user={user}
      onSignOut={signOut}
      topbarLabel={activeLabel}
      roleBadge={isSuperAdmin ? 'Super admin' : 'Organiser'}
    >
      <div key={page} className="wm-page-in">
        {page === 'dashboard' && (
          <DashboardOverview
            delegates={delegates}
            teamRegistrations={teamRegistrations}
            settings={settings}
            loading={dataLoading}
            error={dataError}
            onRefresh={loadData}
            onNavigate={(p) => setPage(p)}
            onViewApplication={handleInspectFromDashboard}
            userName={displayName}
          />
        )}

        {page === 'registrations' && (
          <RegistrationsManager
            delegates={delegates}
            teamRegistrations={teamRegistrations}
            loading={dataLoading}
            error={dataError}
            onRefresh={loadData}
            selectedApp={inspectTarget}
            onClearSelectedApp={() => setInspectTarget(null)}
            isSuperAdmin={Boolean(isAdmin && isSuperAdmin)}
          />
        )}

        {page === 'teams' && (
          <TeamManagement
            settings={settings}
            delegates={delegates}
            teamRegistrations={teamRegistrations}
            loading={dataLoading}
            onRefresh={loadData}
            onSettingsUpdate={handleSettingsUpdate}
          />
        )}

        {page === 'reports' && (
          <StatisticsReports
            delegates={delegates}
            teamRegistrations={teamRegistrations}
            settings={settings}
          />
        )}

        {page === 'super-admin' && (
          <SuperAdminManager session={session} isSuperAdmin={Boolean(isAdmin && isSuperAdmin)} />
        )}

        {page === 'admin-accounts' && (
          <AdminAccountsManager
            session={session}
            isSuperAdmin={Boolean(isAdmin && isSuperAdmin)}
          />
        )}

        {page === 'website-editor' && (
          <WebsiteEditor
            session={session}
            authorName={displayName}
            authorEmail={session.user.email || ''}
          />
        )}

        {page === 'messages' && <InquiriesManager />}

        {page === 'settings' && <SettingsManager />}

        {contentSection && <ContentManager key={contentSection.id} section={contentSection} />}
      </div>
    </DashboardShell>
  );
}
