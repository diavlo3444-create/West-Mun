import React, { useState, useEffect } from 'react';
import {
  Shield,
  Loader2,
  ArrowRight,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  getDepartmentDashboardUrl,
  getRoleTitle,
  type HeadAssignment,
  type DepartmentKey,
  type SectionKey,
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

  // Invitation / Password Reset Link support via ?resetToken=...
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('resetToken') || params.get('token');
      if (tokenParam) {
        setResetToken(tokenParam);
      }
    }
  }, []);

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
   * Handle credential submission via server-side /api/head-auth
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const response = await fetch('/api/head-auth?action=login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const data = await response.json();
      setBusy(false);

      if (!response.ok || !data.success || !data.token) {
        setError(
          data.error ||
            'Authentication failed. Please verify your department head email and password.'
        );
        return;
      }

      // Store authenticated session token
      sessionStorage.setItem('westmun_head_session', data.token);

      const headData = data.head;
      const dept = headData.department as DepartmentKey;
      const sec = headData.section as SectionKey | null;

      const assignment: HeadAssignment = {
        department: dept,
        section: sec,
        headName: headData.head_name || headData.headName || null,
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
   * Handle Password Reset / Account Invitation Completion
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

    try {
      const response = await fetch('/api/head-auth?action=reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
        }),
      });

      const data = await response.json();
      setResettingPassword(false);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete password reset.');
      }

      setResetSuccess(data.message || 'Password successfully updated! You can now sign in.');
      setResetToken(null);
      // Clean query params
      if (window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err: unknown) {
      setResettingPassword(false);
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setError(msg);
    }
  };

  /**
   * Sign out helper
   */
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
            <span>Authorized Command Access</span>
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

        {resetSuccess && (
          <div className="mb-5 p-3.5 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 rounded-sm leading-relaxed font-light flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{resetSuccess}</span>
          </div>
        )}

        {/* 1. Account Invitation / Reset Password View */}
        {resetToken ? (
          <form onSubmit={handleCompleteReset} className="space-y-4">
            <div className="p-3 bg-[#141418] border border-[#d4af37]/40 rounded-sm mb-3">
              <span className="text-xs uppercase font-mono tracking-wider text-[#d4af37] font-semibold flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Head Account Activation</span>
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed font-light">
                Enter a new secure password to activate your official department head credentials.
              </p>
            </div>

            <div>
              <label
                htmlFor="reset-new-password"
                className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium"
              >
                New Password (min 8 chars)
              </label>
              <input
                id="reset-new-password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#141418] border border-neutral-700 focus:border-[#d4af37] rounded-sm py-2.5 px-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="reset-confirm-password"
                className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium"
              >
                Confirm New Password
              </label>
              <input
                id="reset-confirm-password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#141418] border border-neutral-700 focus:border-[#d4af37] rounded-sm py-2.5 px-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={resettingPassword}
                className="w-full py-3 text-xs font-semibold uppercase tracking-widest text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resettingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Credentials…</span>
                  </>
                ) : (
                  <>
                    <span>Activate Account & Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* 2. Standard Login Form */
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
        )}

        <div className="mt-8 pt-5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500">
          <a
            href="/"
            className="hover:text-[#d4af37] transition-colors inline-flex items-center gap-1"
          >
            <span>← Conference Home</span>
          </a>
          <span className="font-mono text-neutral-600">Secretariat Verified</span>
        </div>
      </div>
    </div>
  );
};

export default HeadLogin;
