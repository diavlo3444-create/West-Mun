import React, { useState, useEffect } from 'react';
import {
  Shield,
  Loader2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import {
  DEPARTMENTS,
  getDepartmentDashboardUrl,
  getRoleTitle,
  lookupHeadAssignment,
  type HeadAssignment,
  type DepartmentKey,
  type SectionKey,
} from './departments';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { AccessDenied } from './AccessDenied';
import { Notice, btnPrimary, inputCls, labelCls } from '../dashboard/ui';

export { type HeadAssignment };

export interface HeadLoginProps {
  onSuccess?: (
    assignment: HeadAssignment,
    headUser?: {
      id: string;
      email: string;
      headName?: string;
      department: DepartmentKey;
      section: SectionKey | null;
    }
  ) => void;
  authError?: string;
}

const HEAD_DEPARTMENTS = Object.values(DEPARTMENTS);

export const HeadLogin: React.FC<HeadLoginProps> = ({ onSuccess, authError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(authError || '');
  const [accessDeniedInfo, setAccessDeniedInfo] = useState<{
    email?: string;
    userId?: string;
  } | null>(null);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // Forgot-password request state
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Invitation / Password Reset Link support via Supabase Auth or ?resetToken=...
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isSupabaseRecovery, setIsSupabaseRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    // Supabase session detection is disabled in the client config, so invite /
    // recovery links must be exchanged manually before updateUser() can work.
    const bootstrapAuthLink = async () => {
      if (typeof window === 'undefined') return;

      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('resetToken');
      if (tokenParam) setResetToken(tokenParam);

      const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
      const linkType = params.get('type') || hashParams.get('type') || '';
      const isAuthLink = linkType === 'invite' || linkType === 'recovery' || linkType === 'signup';

      if (isAuthLink) {
        setIsSupabaseRecovery(true);
        setResetToken('supabase_auth_recovery');
      }

      if (!supabase || !supabaseConfigured) return;

      try {
        // 1. Check if a session already exists (e.g. from detectSessionInUrl)
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session) {
          if (isAuthLink) {
            setIsSupabaseRecovery(true);
            setResetToken('supabase_auth_recovery');
          }
          return;
        }

        // 2. PKCE links arrive as ?code=...
        const code = params.get('code');
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!alive) return;
          if (!exchangeError && data?.session) {
            setIsSupabaseRecovery(true);
            setResetToken('supabase_auth_recovery');
            return;
          }
        }

        // 3. Token hash links arrive as ?token_hash=...
        const tokenHash = params.get('token_hash');
        if (tokenHash) {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (linkType as any) || 'recovery',
          });
          if (!alive) return;
          if (!verifyError && data?.session) {
            setIsSupabaseRecovery(true);
            setResetToken('supabase_auth_recovery');
            return;
          }
        }

        // 4. Implicit-flow links arrive with tokens in the URL hash.
        if (hashParams.get('access_token') && hashParams.get('refresh_token')) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: hashParams.get('access_token') as string,
            refresh_token: hashParams.get('refresh_token') as string,
          });
          if (!alive) return;
          if (!sessionError && data?.session) {
            setIsSupabaseRecovery(true);
            setResetToken('supabase_auth_recovery');
            return;
          }
        }
      } catch {
        if (alive) {
          setError(
            'This invitation link is invalid or has expired. Ask the IT Super Admin for a new one.',
          );
        }
      }
    };

    bootstrapAuthLink();

    // Listen to Supabase Auth state changes for recovery events
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsSupabaseRecovery(true);
          setResetToken('supabase_auth_recovery');
        }
      });

      return () => {
        alive = false;
        authListener?.subscription?.unsubscribe();
      };
    }

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  /**
   * Redirect user to their specific department and section dashboard
   */
  const navigateToDashboard = (
    assignment: HeadAssignment,
    headUser?: {
      id: string;
      email: string;
      headName?: string;
      department: DepartmentKey;
      section: SectionKey | null;
    }
  ) => {
    // Reset unlock session key so fresh login displays the cinematic unlock sequence
    try {
      const sessionUnlockKey = `wm_head_unlocked_${assignment.department}_${assignment.section || 'main'}`;
      sessionStorage.removeItem(sessionUnlockKey);
    } catch {}

    if (onSuccess) {
      onSuccess(assignment, headUser);
      return;
    }

    const targetUrl = getDepartmentDashboardUrl(assignment.department, assignment.section);
    if (window.location.pathname !== targetUrl) {
      window.location.assign(targetUrl);
    }
  };

  /**
   * Handle credential submission via Supabase Auth with fallback to server-side /api/head-auth
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Genuine Supabase Auth verification. There is NO fallback after a
    //    failed password check: a wrong password must always fail.
    if (supabase && supabaseConfigured) {
      try {
        const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (supaErr || !supaData?.user) {
          setError('Incorrect email or password.');
          setBusy(false);
          return;
        }

        const lookup = await lookupHeadAssignment(supaData.user.id);
        if (lookup.status === 'success' && lookup.assignment) {
          setBusy(false);
          const resolvedUser = {
            id: supaData.user.id,
            email: lookup.assignment.headEmail || supaData.user.email || cleanEmail,
            headName:
              lookup.assignment.headName ||
              (supaData.user.user_metadata?.full_name as string | undefined) ||
              '',
            department: lookup.assignment.department,
            section: lookup.assignment.section ?? null,
          };
          navigateToDashboard(lookup.assignment, resolvedUser);
          return;
        }

        if (lookup.status === 'permission_denied') {
          setBusy(false);
          setError(lookup.message || 'Your department assignment could not be verified.');
          return;
        }

        setBusy(false);
        setAccessDeniedInfo({ email: cleanEmail, userId: supaData.user.id });
        return;
      } catch {
        setBusy(false);
        setError('Sign-in failed. Please try again.');
        return;
      }
    }

    // 2. Production must never use the local file-backed auth fallback.
    if (import.meta.env.PROD) {
      setBusy(false);
      setError(
        'Supabase Auth is not configured on this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.',
      );
      return;
    }

    // 3. Local development fallback to /api/head-auth endpoint
    try {
      const response = await fetch('/api/head-auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: `Server error (${response.status})` };
      }
      setBusy(false);

      if (!response.ok || !data.success || !data.token) {
        setError(
          data.error ||
            'Authentication failed. Please verify your department head email and password.',
        );
        return;
      }

      // Store authenticated session token (local development only)
      sessionStorage.setItem('westmun_head_session', data.token);

      const headData = data.head;
      const dept = headData.department as DepartmentKey;
      const sec = headData.section as SectionKey | null;

      const assignment: HeadAssignment = {
        department: dept,
        section: sec,
        headName: headData.head_name || headData.headName || null,
        headEmail: headData.email || cleanEmail,
        roleTitle: getRoleTitle(dept, sec),
      };

      navigateToDashboard(assignment);
    } catch (err: unknown) {
      setBusy(false);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      setError(msg);
    }
  };

  /**
   * Request a Supabase recovery email. The response is intentionally generic:
   * this form never reveals whether an address has a portal account.
   */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = (resetEmail || email).trim().toLowerCase();
    if (!cleanEmail) {
      setError('Enter the email address assigned to your head account.');
      return;
    }

    if (!supabase || !supabaseConfigured) {
      setError(
        'Password recovery is only available through Supabase Auth on this deployment. Contact the IT Super Admin for a new invitation link.',
      );
      return;
    }

    setSendingReset(true);
    try {
      const redirectTo = `${window.location.origin}/head?type=recovery`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });
      setSendingReset(false);

      if (resetError && /rate|too many/i.test(resetError.message)) {
        setError('Too many requests. Wait a few minutes before trying again.');
        return;
      }

      setResetEmailSent(true);
      setCooldown(45);
    } catch {
      setSendingReset(false);
      setError('Could not reach Supabase Auth. Please try again.');
    }
  };

  /**
   * Handle Password Reset / Account Invitation Completion via Supabase Auth or token
   */
  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your entries.');
      return;
    }

    setResettingPassword(true);

    // 1. If this is a Supabase Auth invitation or recovery link
    if (isSupabaseRecovery && supabase) {
      try {
        // Ensure active session exists before calling updateUser, or attempt refresh
        const { data: currentSess } = await supabase.auth.getSession();
        if (!currentSess?.session) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (!refreshed?.session) {
            setResettingPassword(false);
            setError(
              'Your password setup session has expired or the link is invalid. Please request a new invitation from the IT Super Admin (diavlo3444@gmail.com).',
            );
            return;
          }
        }

        const { data: updateData, error: updateErr } = await supabase.auth.updateUser({
          password: newPassword,
        });

        setResettingPassword(false);

        if (updateErr) {
          if (
            /auth session missing|jwt expired|session expired|invalid claim/i.test(
              updateErr.message || ''
            )
          ) {
            setError(
              'Your password setup session has expired. Please request a new invitation link from the IT Super Admin (diavlo3444@gmail.com).',
            );
            return;
          }
          throw new Error(updateErr.message);
        }

        // A recovery/invitation link creates a temporary session. Password setup
        // is not a completed sign-in: clear the link, end that temporary session,
        // and require the recipient to authenticate with the password they chose.
        const accountEmail = updateData?.user?.email || email;
        try {
          window.history.replaceState({}, document.title, '/head');
        } catch {}
        try {
          await supabase.auth.signOut();
        } catch {}

        setEmail(accountEmail);
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setResetToken(null);
        setIsSupabaseRecovery(false);
        setForgotMode(false);
        setResetSuccess('Password set successfully. Please sign in with your new password.');
        return;
      } catch (supaErr: unknown) {
        setResettingPassword(false);
        const rawMsg =
          supaErr instanceof Error ? supaErr.message : 'Failed to update password with Supabase Auth.';
        const msg = /auth session missing|jwt expired|session expired/i.test(rawMsg)
          ? 'Your password setup session has expired. Please request a new invitation link from the IT Super Admin (diavlo3444@gmail.com).'
          : rawMsg;
        setError(msg);
        return;
      }
    }

    // 2. Local development fallback only; production password setup must go
    //    through Supabase Auth invitation/recovery links.
    if (import.meta.env.PROD) {
      setResettingPassword(false);
      setError(
        'This password setup link is not valid. Ask the IT Super Admin to send a new Supabase invitation or recovery link.',
      );
      return;
    }

    try {
      const response = await fetch('/api/head-auth?action=reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: `Server error (${response.status})` };
      }
      setResettingPassword(false);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete password reset.');
      }

      setResetSuccess(data.message || 'Password successfully updated. You can now sign in.');
      setResetToken(null);
      if (window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err: unknown) {
      setResettingPassword(false);
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setError(msg);
    }
  };

  const handleSignOut = async () => {
    const token = sessionStorage.getItem('westmun_head_session');
    if (token) {
      try {
        await fetch('/api/head-auth?action=logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
      sessionStorage.removeItem('westmun_head_session');
    }
    setAccessDeniedInfo(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  if (accessDeniedInfo) {
    return (
      <AccessDenied
        email={accessDeniedInfo.email}
        userId={accessDeniedInfo.userId}
        onSignOut={handleSignOut}
      />
    );
  }

  const heading = resetToken
    ? 'Set your password'
    : forgotMode
      ? 'Recover access'
      : 'Department head sign in';

  return (
    <div className="wm-app min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/[0.07] bg-[#0a0a0c] px-12 py-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_420px_at_20%_4%,rgba(212,175,55,0.1),transparent_66%)]"
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
              Department leadership portal
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.025] px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            <ShieldCheck className="h-3 w-3 text-[#d4af37]" aria-hidden="true" />
            Verified department access
          </span>
          <h1 className="wm-serif text-[46px] leading-[1.02] text-[#f7f2e4]">
            Your department,
            <br />
            in one clear view.
          </h1>
          <p className="mt-5 max-w-md text-[13px] leading-relaxed text-neutral-400">
            Review applications for your assigned department and division, record decisions and
            export records. Access is scoped by Row Level Security, so you only ever see your own team.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2.5 border-t border-white/[0.06] pt-5">
            {HEAD_DEPARTMENTS.slice(0, 10).map((department) => {
              const Icon = department.icon;
              return (
                <div key={department.key} className="flex min-w-0 items-center gap-2">
                  <Icon className="h-3 w-3 shrink-0 text-[#d4af37]/65" aria-hidden="true" />
                  <span className="truncate text-[10.5px] text-neutral-400">{department.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-[9px] font-mono uppercase tracking-[0.18em] text-neutral-400">
          Supabase Auth · Department and section enforced by RLS
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
                Department head portal
              </p>
            </div>
          </div>

          <p className="text-[9.5px] font-mono uppercase tracking-[0.22em] text-[#d4af37]">
            {resetToken ? 'Account activation' : forgotMode ? 'Password recovery' : 'Head portal'}
          </p>
          <h2 className="wm-serif mt-2 text-[30px] leading-tight text-white">{heading}</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
            {resetToken
              ? 'Choose a new password for your department head account.'
              : forgotMode
                ? 'We will send a secure Supabase recovery link to the address assigned to your account.'
                : 'Use the credentials issued by the Secretariat. Your department is resolved automatically.'}
          </p>

          <div className="mt-5 space-y-3">
            {error && (
              <Notice tone="error" onDismiss={() => setError('')}>
                {error}
              </Notice>
            )}
            {resetSuccess && (
              <Notice tone="success" title="Password updated">
                {resetSuccess}
              </Notice>
            )}
          </div>

          {resetToken ? (
            /* Password setup / recovery completion */
            <form onSubmit={handleCompleteReset} className="mt-5 space-y-4">
              <div>
                <label htmlFor="reset-new-password" className={labelCls}>
                  New password
                </label>
                <div className="relative">
                  <input
                    id="reset-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 transition-colors hover:text-neutral-200"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className={labelCls}>
                  Confirm new password
                </label>
                <input
                  id="reset-confirm-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat the password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={resettingPassword}
                className={`${btnPrimary} w-full py-2.5`}
              >
                {resettingPassword ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Updating password…
                  </>
                ) : (
                  <>
                    <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                    Set password & continue
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetToken(null);
                  setIsSupabaseRecovery(false);
                  setResetSuccess(null);
                }}
                className="w-full text-center text-[10.5px] text-neutral-400 transition-colors hover:text-neutral-200"
              >
                Back to sign in
              </button>
            </form>
          ) : forgotMode ? (
            /* Forgot password request */
            <form onSubmit={handleForgotPassword} className="mt-5 space-y-4">
              {resetEmailSent ? (
                <div className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                    <div>
                      <p className="text-[12px] font-medium text-emerald-200">Recovery email requested</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
                        If an account exists for{' '}
                        <span className="font-mono text-neutral-200">{resetEmail || email}</span>, a
                        Supabase recovery link is on its way. The link can only be used once.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(false);
                      setResetEmailSent(false);
                    }}
                    className="mt-3 text-[10.5px] font-medium text-[#d4af37] transition-colors hover:text-[#f0dda2]"
                  >
                    Return to sign in
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="head-reset-email" className={labelCls}>
                      Head account email
                    </label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
                        aria-hidden="true"
                      />
                      <input
                        id="head-reset-email"
                        type="email"
                        required
                        autoComplete="username"
                        placeholder="head@westmun.org"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingReset || cooldown > 0}
                    className={`${btnPrimary} w-full py-2.5`}
                  >
                    {sendingReset ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        Requesting link…
                      </>
                    ) : cooldown > 0 ? (
                      `Try again in ${cooldown}s`
                    ) : (
                      <>
                        Send recovery link
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(false);
                      setError('');
                    }}
                    className="inline-flex w-full items-center justify-center gap-1.5 text-[10.5px] text-neutral-400 transition-colors hover:text-neutral-200"
                  >
                    <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                    Back to sign in
                  </button>
                </>
              )}
            </form>
          ) : (
            /* Standard login */
            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div>
                <label htmlFor="head-email" className={labelCls}>
                  Head email address
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    id="head-email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="head@westmun.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="head-password" className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setForgotMode(true);
                      setError('');
                      setResetEmailSent(false);
                    }}
                    className="text-[10px] text-neutral-400 transition-colors hover:text-[#d4af37]"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="head-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputCls} pr-10`}
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

              <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-2.5`}>
                {busy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Verifying department…
                  </>
                ) : (
                  <>
                    Sign in to head portal
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-7 flex items-center justify-between border-t border-white/[0.07] pt-4 text-[10.5px] text-neutral-400">
            <a href="/" className="inline-flex items-center gap-1.5 transition-colors hover:text-[#d4af37]">
              <Shield className="h-3 w-3" aria-hidden="true" />
              Conference homepage
            </a>
            <span className="font-mono uppercase tracking-[0.14em]">Supabase Auth</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeadLogin;
