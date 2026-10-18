import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  BarChart3,
  Inbox,
  Settings,
  Shield,
  LogOut,
  Loader2,
  Menu,
  X,
  ExternalLink,
  Layers,
  ChevronRight,
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
import { btnGold, cardCls, inputCls, labelCls, type Row } from './ui';

const IDLE_MS = 30 * 60 * 1000; // Sign out after 30 minutes of inactivity

export type NavigationPage =
  | 'dashboard'
  | 'registrations'
  | 'teams'
  | 'reports'
  | 'messages'
  | 'settings'
  | `section:${string}`;

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [booting, setBooting] = useState(true);
  const [page, setPage] = useState<NavigationPage>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Authentication form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const idleTimer = useRef<number | undefined>(undefined);

  // Real data state
  const [delegates, setDelegates] = useState<Row[]>([]);
  const [teamRegistrations, setTeamRegistrations] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [inspectTarget, setInspectTarget] = useState<{ app: any; type: 'delegate' | 'team' } | null>(null);

  // SEO & Head configuration: admin panel must never be indexed
  useEffect(() => {
    document.title = 'WEST MUN 2027 — Conference Management Dashboard';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    document.querySelector('link[rel="canonical"]')?.remove();
    return () => meta.remove();
  }, []);

  const checkAdmin = useCallback(async (s: Session | null) => {
    if (!supabase || !s) {
      setIsAdmin(null);
      return;
    }
    const { data, error: err } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', s.user.id)
      .maybeSingle();

    setIsAdmin(!err && Boolean(data));
  }, []);

  // Fetch real records from Supabase
  const loadData = useCallback(async () => {
    if (!supabase) return;
    setDataLoading(true);

    try {
      // 1. Fetch delegates
      const { data: delData } = await supabase
        .from('delegates')
        .select('*')
        .order('created_at', { ascending: false });
      setDelegates((delData as Row[]) || []);

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
      const { data: setRows } = await supabase.from('settings').select('*');
      if (setRows) {
        const dict: Record<string, string> = {};
        setRows.forEach((r: { key: string; value: string }) => {
          dict[r.key] = r.value;
        });
        setSettings(dict);
      }
    } catch {
      // Graceful error handling
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setBooting(false);
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await checkAdmin(data.session);
      if (alive) setBooting(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setIsAdmin(null);
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

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setIsAdmin(null);
    setPassword('');
    setDelegates([]);
    setTeamRegistrations([]);
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
    if (!supabase) return;
    setError('');
    setBusy(true);

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (err || !data.session) {
      setBusy(false);
      setError('Sign-in failed. Please verify your email and password.');
      return;
    }

    const { data: row } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', data.session.user.id)
      .maybeSingle();

    if (!row) {
      await supabase.auth.signOut();
      setBusy(false);
      setError('This account does not have organiser permissions. Request access from the Secretariat.');
      return;
    }

    setBusy(false);
    setPassword('');
    setSession(data.session);
    setIsAdmin(true);
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

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#070709] text-[#f5f5f5] font-sans antialiased selection:bg-[#d4af37] selection:text-black">
      {children}
    </div>
  );

  if (!supabaseConfigured) {
    return shell(
      <div className="max-w-xl mx-auto px-5 py-24">
        <div className={`${cardCls} p-7 text-center space-y-4`}>
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-950/50 border border-amber-500/40 flex items-center justify-center text-[#d4af37]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-serif text-white">Supabase Connection Required</h1>
          <p className="text-sm text-neutral-400 leading-relaxed font-light">
            Set <code className="text-[#d4af37] font-mono">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-[#d4af37] font-mono">VITE_SUPABASE_ANON_KEY</code> in Vercel or your local environment.
          </p>
        </div>
      </div>,
    );
  }

  if (booting) {
    return shell(
      <div className="min-h-screen flex flex-col items-center justify-center text-neutral-400 text-sm gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#d4af37]" />
        <span className="font-mono text-xs uppercase tracking-widest text-[#d4af37]">Authenticating Secretariat…</span>
      </div>,
    );
  }

  // Not signed in or not an admin
  if (!session || isAdmin !== true) {
    return shell(
      <div className="min-h-screen flex items-center justify-center px-5 py-12">
        <form onSubmit={login} className={`${cardCls} w-full max-w-sm p-8 space-y-5 border-[#d4af37]/40 shadow-2xl bg-[#0c0c10]`}>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#121217] border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37] mb-3 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-serif text-white tracking-tight">WEST MUN 2027</h1>
            <p className="text-xs text-neutral-400 mt-1 font-light">Secretariat Command Portal</p>
          </div>

          {session && isAdmin === false && (
            <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-sm p-3 font-light leading-relaxed">
              Signed in, but this account lacks organiser permissions in <code className="font-mono text-white">public.admins</code>.{' '}
              <button type="button" className="underline font-semibold cursor-pointer ml-1" onClick={signOut}>
                Sign out
              </button>
            </p>
          )}

          {error && (
            <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-sm p-3 font-light">
              {error}
            </p>
          )}

          <div className="space-y-3.5">
            <div>
              <label htmlFor="adm-email" className={labelCls}>
                Organiser Email
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
              <input
                id="adm-pass"
                type="password"
                autoComplete="current-password"
                required
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className={`${btnGold} w-full py-2.5`} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Authenticate as Organiser'}
          </button>

          <div className="pt-2 text-center">
            <a href="/" className="text-[11px] text-neutral-500 hover:text-[#d4af37] transition-colors">
              ← Return to Conference Homepage
            </a>
          </div>
        </form>
      </div>,
    );
  }

  // Active section for content editor
  const contentSection = page.startsWith('section:') ? SECTIONS.find((s) => s.id === page.slice(8)) : undefined;

  const navItem = (id: NavigationPage, label: string, icon: React.ReactNode, badgeCount?: number) => {
    const active = page === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => {
          setPage(id);
          setSidebarOpen(false);
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-sm transition-all cursor-pointer font-medium ${
          active
            ? 'bg-[#d4af37] text-black font-semibold shadow-sm'
            : 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className={active ? 'text-black' : 'text-[#d4af37]'}>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        {badgeCount !== undefined && badgeCount > 0 && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-sm ${
              active ? 'bg-black text-[#d4af37]' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  const pendingCount =
    delegates.filter((d) => d.status === 'received' || d.status === 'under_review').length +
    teamRegistrations.filter((t) => t.status === 'received' || t.status === 'under_review').length;

  return shell(
    <div className="min-h-screen flex flex-col">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-[#0a0a0d]/95 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="lg:hidden p-1.5 text-neutral-400 hover:text-white rounded-sm hover:bg-neutral-800 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <a href="/admin" className="flex items-center gap-2.5 no-underline">
              <div className="w-8 h-8 rounded-full bg-[#121217] border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.2)]">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-serif font-semibold text-white tracking-wide leading-none">
                  WEST MUN <span className="text-[#d4af37]">2027</span>
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 mt-0.5">
                  Command Dashboard
                </span>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-neutral-300 hover:text-[#d4af37] transition-colors"
            >
              <span>View Website</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-neutral-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] text-neutral-300 truncate max-w-[14rem]">
                {session.user.email}
              </span>
            </div>

            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-neutral-700 hover:border-red-500/50 hover:text-red-300 rounded-sm cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-8">
        {/* Responsive Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 bg-[#0c0c10] border-r border-neutral-800 p-5 transform transition-transform duration-300 ease-in-out lg:static lg:w-auto lg:p-0 lg:bg-transparent lg:border-none lg:transform-none ${
            sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="lg:hidden flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
            <span className="font-serif font-semibold text-white">Navigation</span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Core Conference Management */}
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 px-3">
                Core Operations
              </span>
              <nav className="space-y-1">
                {navItem('dashboard', 'Dashboard', <LayoutDashboard className="w-4 h-4" />)}
                {navItem('registrations', 'Registrations', <Users className="w-4 h-4" />, pendingCount)}
                {navItem('teams', 'Team Management', <ShieldAlert className="w-4 h-4" />)}
                {navItem('reports', 'Statistics & Reports', <BarChart3 className="w-4 h-4" />)}
              </nav>
            </div>

            {/* Inquiries & Settings */}
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 px-3">
                Communications & Config
              </span>
              <nav className="space-y-1">
                {navItem('messages', 'Inquiries / Messages', <Inbox className="w-4 h-4" />)}
                {navItem('settings', 'Conference Settings', <Settings className="w-4 h-4" />)}
              </nav>
            </div>

            {/* Website Content Sections */}
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 px-3">
                Website Content
              </span>
              <nav className="space-y-1">
                {SECTIONS.map((sec) => navItem(`section:${sec.id}`, sec.label, <Layers className="w-3.5 h-3.5" />))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Primary Content View */}
        <main className="min-w-0">
          {page === 'dashboard' && (
            <DashboardOverview
              delegates={delegates}
              teamRegistrations={teamRegistrations}
              settings={settings}
              loading={dataLoading}
              onRefresh={loadData}
              onNavigate={(p) => setPage(p)}
              onViewApplication={handleInspectFromDashboard}
            />
          )}

          {page === 'registrations' && (
            <RegistrationsManager
              delegates={delegates}
              teamRegistrations={teamRegistrations}
              loading={dataLoading}
              onRefresh={loadData}
              selectedApp={inspectTarget}
              onClearSelectedApp={() => setInspectTarget(null)}
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

          {page === 'messages' && <InquiriesManager />}

          {page === 'settings' && <SettingsManager />}

          {contentSection && <ContentManager key={contentSection.id} section={contentSection} />}
        </main>
      </div>
    </div>,
  );
}
