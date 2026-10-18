import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Loader2,
  ArrowRight,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import {
  isDepartmentKey,
  isSectionKey,
  isGenderSeparated,
  type DepartmentKey,
  type SectionKey,
} from './departments';
import { AccessDenied } from './AccessDenied';

export interface HeadAssignment {
  department: DepartmentKey;
  section?: SectionKey | null;
  headName?: string | null;
}

export interface HeadLoginProps {
  onSuccess?: (assignment: HeadAssignment) => void;
  authError?: string;
}

export const HeadLogin: React.FC<HeadLoginProps> = ({ onSuccess, authError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState(authError || '');
  const [accessDeniedInfo, setAccessDeniedInfo] = useState<{
    email?: string;
    userId?: string;
  } | null>(null);

  /**
   * Look up user ID in public.department_heads.
   * Reads department, section ('male' | 'female' | null), and optional head_name.
   * Supports both 'id' and 'user_id' schemas.
   */
  const lookupAssignment = useCallback(async (userId: string): Promise<HeadAssignment | null> => {
    if (!supabase) return null;

    try {
      // 1. Try lookup by 'id'
      const { data: recordById, error: errById } = await supabase
        .from('department_heads')
        .select('department, section, head_name, active')
        .eq('id', userId)
        .maybeSingle();

      let record = !errById && recordById ? recordById : null;

      // 2. Try lookup by 'user_id' as fallback
      if (!record) {
        const { data: recordByUserId, error: errByUserId } = await supabase
          .from('department_heads')
          .select('department, section, head_name, active')
          .eq('user_id', userId)
          .maybeSingle();

        if (!errByUserId && recordByUserId) {
          record = recordByUserId;
        }
      }

      if (record && record.active !== false && isDepartmentKey(record.department)) {
        const dept = record.department as DepartmentKey;
        const rawSec = record.section;
        const section: SectionKey | null = isSectionKey(rawSec) ? rawSec : null;

        // If department requires gender section but assignment has none, or vice-versa, handle strictly
        if (isGenderSeparated(dept) && !section) {
          console.warn(`Department ${dept} requires a male or female section assignment.`);
        }

        return {
          department: dept,
          section,
          headName: record.head_name || null,
        };
      }
    } catch (err) {
      console.error('Error querying department_heads:', err);
    }

    return null;
  }, []);

  /**
   * Redirect user to their specific department and section dashboard
   */
  const navigateToDashboard = useCallback(
    (assignment: HeadAssignment) => {
      if (onSuccess) {
        onSuccess(assignment);
        return;
      }

      const targetUrl = assignment.section
        ? `/head/${assignment.department}/${assignment.section}`
        : `/head/${assignment.department}`;

      if (window.location.pathname !== targetUrl) {
        window.location.assign(targetUrl);
      }
    },
    [onSuccess]
  );

  /**
   * Check for an existing verified Supabase session on initial mount
   */
  useEffect(() => {
    let active = true;

    const checkExistingSession = async () => {
      if (!supabaseConfigured || !supabase) {
        setCheckingSession(false);
        return;
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!active) return;

        if (sessionError || !session?.user) {
          setCheckingSession(false);
          return;
        }

        const assignment = await lookupAssignment(session.user.id);
        if (!active) return;

        if (assignment) {
          navigateToDashboard(assignment);
        } else {
          // Authenticated but not a registered department head
          setAccessDeniedInfo({
            email: session.user.email,
            userId: session.user.id,
          });
          setCheckingSession(false);
        }
      } catch (e) {
        console.error('Failed checking head session:', e);
        if (active) setCheckingSession(false);
      }
    };

    checkExistingSession();

    return () => {
      active = false;
    };
  }, [lookupAssignment, navigateToDashboard]);

  /**
   * Handle credential submission
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Database connection is not configured.');
      return;
    }

    setError('');
    setBusy(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authErr || !data.session || !data.user) {
        setBusy(false);
        setError(
          authErr?.message ||
            'Authentication failed. Please verify your department head email and password.'
        );
        return;
      }

      // Check role and section in public.department_heads
      const assignment = await lookupAssignment(data.user.id);

      if (assignment) {
        setBusy(false);
        navigateToDashboard(assignment);
      } else {
        // Authenticated user is not an authorized department head
        setBusy(false);
        setAccessDeniedInfo({
          email: data.user.email,
          userId: data.user.id,
        });
      }
    } catch (err: unknown) {
      setBusy(false);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      setError(msg);
    }
  };

  /**
   * Sign out and return to clean login state
   */
  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setAccessDeniedInfo(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  // If user is authenticated but not authorized as a department head
  if (accessDeniedInfo) {
    return (
      <AccessDenied
        email={accessDeniedInfo.email}
        userId={accessDeniedInfo.userId}
        onSignOut={handleSignOut}
      />
    );
  }

  // Loading screen while checking initial session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#070709] text-white">
        <div className="flex flex-col items-center gap-4 p-8 bg-[#0c0c10] border border-[#d4af37]/30 rounded-sm shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#121217] border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-neutral-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
            <span>Verifying Head Credentials…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#070709] text-white">
      <div className="w-full max-w-md bg-[#0c0c10] border border-[#d4af37]/40 rounded-sm p-7 sm:p-9 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative gold top accent bar */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#121217] border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37] mb-3.5 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <Shield className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-[#17171d] border border-neutral-800 text-[10px] font-mono uppercase tracking-widest text-[#d4af37] mb-2">
            <KeyRound className="w-3 h-3" />
            <span>Authorized Access Only</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-serif text-white tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            WEST MUN 2027
          </h1>
          <p className="text-xs text-neutral-400 mt-1 font-light">
            Department Head Command Portal
          </p>
        </div>

        {error && (
          <div
            className="mb-5 p-3.5 text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-sm leading-relaxed font-light flex items-start gap-2.5"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="head-email"
              className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium"
            >
              Head Email Address
            </label>
            <input
              id="head-email"
              type="email"
              required
              autoComplete="username"
              placeholder="head@westmun.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#141418] border border-neutral-700 focus:border-[#d4af37] rounded-sm py-2.5 px-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="head-password"
              className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium"
            >
              Password
            </label>
            <input
              id="head-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#141418] border border-neutral-700 focus:border-[#d4af37] rounded-sm py-2.5 px-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none transition-colors"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 text-xs font-semibold uppercase tracking-widest text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials & Department…</span>
                </>
              ) : (
                <>
                  <span>Sign In to Head Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500">
          <a
            href="/"
            className="hover:text-[#d4af37] transition-colors inline-flex items-center gap-1"
          >
            <span>← Conference Home</span>
          </a>
          <span className="font-mono text-neutral-600">Confidential · RLS Active</span>
        </div>
      </div>
    </div>
  );
};

export default HeadLogin;
