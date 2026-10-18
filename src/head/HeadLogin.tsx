import React, { useState } from 'react';
import {
  Shield,
  Loader2,
  ArrowRight,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  fetchHeadAssignment,
  getDepartmentDashboardUrl,
  type HeadAssignment,
} from './departments';
import { AccessDenied } from './AccessDenied';

export { type HeadAssignment };

export interface HeadLoginProps {
  onSuccess?: (assignment: HeadAssignment) => void;
  authError?: string;
}

export const HeadLogin: React.FC<HeadLoginProps> = ({ onSuccess, authError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(authError || '');
  const [accessDeniedInfo, setAccessDeniedInfo] = useState<{
    email?: string;
    userId?: string;
  } | null>(null);

  /**
   * Redirect user to their specific department and section dashboard
   */
  const navigateToDashboard = (assignment: HeadAssignment) => {
    if (onSuccess) {
      onSuccess(assignment);
      return;
    }

    const targetUrl = getDepartmentDashboardUrl(assignment.department, assignment.section);
    if (window.location.pathname !== targetUrl) {
      window.location.assign(targetUrl);
    }
  };

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
      // 1. Authenticate with Supabase Auth
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

      // 2. Get the authenticated user's actual UID from the Supabase session
      const authUserId = data.user.id;

      // 3. Query public.department_heads for that exact user_id
      const assignment = await fetchHeadAssignment(authUserId);

      setBusy(false);

      if (assignment) {
        // Valid assignment exists -> automatically redirect to their assigned department dashboard
        navigateToDashboard(assignment);
      } else {
        // Authenticated in Supabase, but no active assignment in public.department_heads
        // Display clear message that the account is not authorized and provide a sign-out option.
        setAccessDeniedInfo({
          email: data.user.email || cleanEmail,
          userId: authUserId,
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

  // If user has authenticated via login but has no assignment in public.department_heads
  if (accessDeniedInfo) {
    return (
      <AccessDenied
        email={accessDeniedInfo.email}
        userId={accessDeniedInfo.userId}
        onSignOut={handleSignOut}
      />
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
