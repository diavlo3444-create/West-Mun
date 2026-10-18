import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Inbox, Loader2, LogOut, Settings, Shield, Users } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { SECTIONS } from './config';
import { ContentManager } from './ContentManager';
import { SettingsManager } from './SettingsManager';
import { ApplicationsManager } from './ApplicationsManager';
import { InquiriesManager } from './InquiriesManager';
import { btnGold, cardCls, inputCls, labelCls } from './ui';

const IDLE_MS = 30 * 60 * 1000; // sign out after 30 minutes without activity

type Page = 'applications' | 'messages' | 'settings' | `section:${string}`;

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [booting, setBooting] = useState(true);
  const [page, setPage] = useState<Page>('applications');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const idleTimer = useRef<number | undefined>(undefined);

  // The admin area must never be indexed.
  useEffect(() => {
    document.title = 'Organiser panel — WEST MUN';
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
    const { data, error: err } = await supabase.from('admins').select('user_id').eq('user_id', s.user.id).maybeSingle();
    setIsAdmin(!err && Boolean(data));
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

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setIsAdmin(null);
    setPassword('');
  }, []);

  // Idle sign-out
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
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err || !data.session) {
      setBusy(false);
      setError('Sign-in failed. Check your email and password.');
      return;
    }
    const { data: row } = await supabase.from('admins').select('user_id').eq('user_id', data.session.user.id).maybeSingle();
    if (!row) {
      await supabase.auth.signOut();
      setBusy(false);
      setError('This account is not an organiser. Ask an existing organiser to add you.');
      return;
    }
    setBusy(false);
    setPassword('');
    setSession(data.session);
    setIsAdmin(true);
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#08080b] text-[#f5f5f5] font-sans">{children}</div>
  );

  if (!supabaseConfigured) {
    return shell(
      <div className="max-w-xl mx-auto px-5 py-20">
        <div className={`${cardCls} p-6`}>
          <h1 className="text-xl font-serif text-white mb-2">Admin panel is not connected yet</h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Set <code className="text-[#d4af37]">VITE_SUPABASE_URL</code> and <code className="text-[#d4af37]">VITE_SUPABASE_ANON_KEY</code> (see
            <code className="text-[#d4af37]"> .env.example</code>), then redeploy. In Vercel: Project → Settings → Environment Variables.
          </p>
        </div>
      </div>,
    );
  }

  if (booting) {
    return shell(
      <div className="min-h-screen flex items-center justify-center text-neutral-400 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>,
    );
  }

  if (!session || isAdmin !== true) {
    return shell(
      <div className="min-h-screen flex items-center justify-center px-5">
        <form onSubmit={login} className={`${cardCls} w-full max-w-sm p-7 space-y-4`}>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#121217] border border-[#d4af37]/50 flex items-center justify-center text-[#d4af37] mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-serif text-white">Organiser sign-in</h1>
            <p className="text-xs text-neutral-500 mt-1">WEST MUN administration</p>
          </div>
          {session && isAdmin === false && (
            <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-sm p-3" role="alert">
              You are signed in, but this account is not an organiser.{' '}
              <button type="button" className="underline cursor-pointer" onClick={signOut}>Sign out</button>
            </p>
          )}
          {error && <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-sm p-3" role="alert">{error}</p>}
          <div>
            <label htmlFor="adm-email" className={labelCls}>Email</label>
            <input id="adm-email" type="email" autoComplete="username" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="adm-pass" className={labelCls}>Password</label>
            <input id="adm-pass" type="password" autoComplete="current-password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className={`${btnGold} w-full`} disabled={busy}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Sign in
          </button>
        </form>
      </div>,
    );
  }

  const navBtn = (id: Page, label: string, icon?: React.ReactNode) => (
    <button
      key={id}
      type="button"
      onClick={() => setPage(id)}
      aria-current={page === id ? 'page' : undefined}
      className={`w-full flex items-center gap-2 text-left px-3 py-2 text-xs rounded-sm transition-colors cursor-pointer whitespace-nowrap ${
        page === id ? 'bg-[#d4af37] text-black font-semibold' : 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const section = page.startsWith('section:') ? SECTIONS.find((s) => s.id === page.slice(8)) : undefined;

  return shell(
    <>
      <header className="border-b border-neutral-800 bg-[#0c0c10]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-serif">
            <Shield className="w-4 h-4 text-[#d4af37]" /> WEST MUN <span className="text-neutral-500">· Organiser panel</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <a href="/" className="hover:text-[#d4af37] hidden sm:inline">View website ↗</a>
            <span className="hidden md:inline truncate max-w-[14rem]">{session.user.email}</span>
            <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-700 hover:border-red-500/50 hover:text-red-300 rounded-sm cursor-pointer">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[13rem_1fr] gap-6">
        <nav aria-label="Admin sections" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {navBtn('applications', 'Applications', <Users className="w-3.5 h-3.5" />)}
          {navBtn('messages', 'Messages', <Inbox className="w-3.5 h-3.5" />)}
          {navBtn('settings', 'Settings', <Settings className="w-3.5 h-3.5" />)}
          <div className="hidden lg:block mt-3 mb-1 px-3 text-[10px] uppercase tracking-widest text-neutral-600">Website content</div>
          {SECTIONS.map((s) => navBtn(`section:${s.id}`, s.label))}
        </nav>

        <main className="min-w-0">
          {page === 'applications' && <ApplicationsManager />}
          {page === 'messages' && <InquiriesManager />}
          {page === 'settings' && <SettingsManager />}
          {section && <ContentManager key={section.id} section={section} />}
        </main>
      </div>
    </>,
  );
}
