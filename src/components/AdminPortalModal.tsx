import React, { useState, useEffect, useCallback } from 'react';
import { X, Shield, Lock, LogOut, RefreshCw, Mail, Users, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { adminLogin, fetchAdminData, adminLogout, RegistrationRecord, InquiryRecord } from '../lib/api';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Authenticated state
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem('westmun_admin_token');
    } catch {
      return null;
    }
  });

  // Active dashboard tab
  const [activeTab, setActiveTab] = useState<'registrations' | 'inquiries'>('registrations');
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (token: string) => {
    setIsLoadingData(true);
    setDataError(null);

    const res = await fetchAdminData(token);
    if (!res.success || !res.data) {
      if (res.error?.includes('expired') || res.error?.includes('Authentication')) {
        setSessionToken(null);
        try {
          sessionStorage.removeItem('westmun_admin_token');
        } catch {}
      }
      setDataError(res.error || 'Failed to retrieve administrative records.');
    } else {
      setDataError(null);
      setRegistrations(res.data.registrations || []);
      setInquiries(res.data.inquiries || []);
    }
    setIsLoadingData(false);
  }, []);

  // Sync state on modal open/close
  useEffect(() => {
    if (isOpen) {
      setLoginError(null);
      if (sessionToken) {
        loadDashboardData(sessionToken);
      }
    } else {
      setPassword('');
      setShowPassword(false);
      setLoginError(null);
    }
  }, [isOpen, sessionToken, loadDashboardData]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);

    // Read from state or form element to support browser autofill & password managers
    const form = e.currentTarget;
    const inputElem = form.elements.namedItem('password') as HTMLInputElement | null;
    const effectivePassword = (password || inputElem?.value || '').trim();

    if (!effectivePassword) {
      setLoginError('Please enter the Secretariat authorization key.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await adminLogin(effectivePassword);
      const token = res.data?.token || res.token;
      if (!res.success || !token) {
        throw new Error(res.error || 'Authentication failed. Invalid authorization key.');
      }

      setSessionToken(token);
      try {
        sessionStorage.setItem('westmun_admin_token', token);
      } catch {}
      setPassword('');
      setDataError(null);
      setLoginError(null);
      await loadDashboardData(token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    if (sessionToken) {
      await adminLogout(sessionToken);
    }
    setSessionToken(null);
    try {
      sessionStorage.removeItem('westmun_admin_token');
    } catch {}
    setRegistrations([]);
    setInquiries([]);
    setPassword('');
    setDataError(null);
    setLoginError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-portal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0a0a0d] border border-[#d4af37]/40 rounded-sm shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_20px_rgba(212,175,55,0.15)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gold Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#aa8232] via-[#d4af37] to-[#aa8232]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-[#0d0d12]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#141418] border border-[#d4af37]/60 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#d4af37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="admin-portal-title" className="text-base font-serif text-white font-medium">
                  Secretariat Diplomatic Portal
                </h3>
                {sessionToken && (
                  <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-[#1a1810] text-[#d4af37] border border-[#d4af37]/40 rounded-sm">
                    Verified Session
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-neutral-400">
                {sessionToken
                  ? 'Active Secretariat Session · Protected Local Registry'
                  : 'Authorized Personnel Only · Server-Verified Access'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {sessionToken && (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-red-300 border border-neutral-800 hover:border-red-500/40 rounded-sm transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-sm hover:bg-neutral-800/60 transition-colors cursor-pointer"
              aria-label="Close portal dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!sessionToken ? (
            /* Login Form */
            <div className="max-w-md mx-auto py-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#121217] border border-neutral-800 flex items-center justify-center text-[#d4af37] mb-3">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-serif text-white">Organizer Authentication</h4>
                <p className="text-xs text-neutral-400 mt-1 font-light">
                  Protected administrative console. Authentication is validated in constant-time on the server with rate limiting.
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded-sm flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="admin-pass" className="block uppercase tracking-wider text-neutral-300 font-medium">
                      Secretariat Authorization Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-[#d4af37] transition-colors cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="admin-pass"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      autoComplete="current-password"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Enter conference admin key"
                      className="w-full bg-[#141418] border border-neutral-800 focus:border-[#d4af37] rounded-sm py-2.5 px-3 text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 uppercase tracking-widest font-semibold text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-60 shadow-[0_2px_12px_rgba(212,175,55,0.25)]"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <span>Authenticate Session</span>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-neutral-500 text-center font-mono mt-4">
                  Rate-limited endpoint. Max 5 attempts per IP window. No secrets stored in browser bundle.
                </p>
              </form>
            </div>
          ) : (
            /* Authorized Dashboard */
            <div className="space-y-6">
              {/* Navigation Tabs */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('registrations')}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer ${
                      activeTab === 'registrations'
                        ? 'bg-[#d4af37] text-black font-semibold'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Registrations ({registrations.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inquiries')}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer ${
                      activeTab === 'inquiries'
                        ? 'bg-[#d4af37] text-black font-semibold'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Inquiries ({inquiries.length})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => sessionToken && loadDashboardData(sessionToken)}
                  disabled={isLoadingData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-[#d4af37] border border-neutral-800 hover:border-[#d4af37]/40 rounded-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-[#d4af37]' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Data Error */}
              {dataError && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-sm flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{dataError}</span>
                </div>
              )}

              {/* Tab 1: Registrations Table */}
              {activeTab === 'registrations' && (
                <div>
                  {registrations.length === 0 ? (
                    <div className="py-16 text-center text-neutral-500 text-xs flex flex-col items-center justify-center gap-2 border border-neutral-800/60 rounded-sm bg-[#0d0d10]">
                      <Users className="w-8 h-8 text-neutral-700" />
                      <p className="font-medium text-neutral-300">No registrations yet</p>
                      <p className="text-[11px] text-neutral-500">Official delegate submissions will appear here once registered.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-neutral-800/80 rounded-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#101015] text-[10px] font-mono uppercase text-[#d4af37] border-b border-neutral-800">
                          <tr>
                            <th className="p-3 font-semibold">Delegate / Head</th>
                            <th className="p-3 font-semibold">Email</th>
                            <th className="p-3 font-semibold">Institution</th>
                            <th className="p-3 font-semibold">Tier</th>
                            <th className="p-3 font-semibold">Structure</th>
                            <th className="p-3 font-semibold">Submitted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/60 font-light text-neutral-300">
                          {registrations.map((reg) => (
                            <tr key={reg.id || reg.email} className="hover:bg-neutral-800/20">
                              <td className="p-3 text-white font-medium">{reg.full_name}</td>
                              <td className="p-3 font-mono text-[11px] text-neutral-400">{reg.email}</td>
                              <td className="p-3">{reg.institution}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono uppercase bg-[#18181f] text-[#d4af37] border border-neutral-700">
                                  {reg.tier === 'early_bird' ? 'Early Bird' : 'Regular'}
                                </span>
                              </td>
                              <td className="p-3 text-neutral-400">
                                {reg.delegation_type.replace('_', ' ')}
                              </td>
                              <td className="p-3 font-mono text-[10px] text-neutral-500">
                                {reg.created_at ? new Date(reg.created_at).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Inquiries List */}
              {activeTab === 'inquiries' && (
                <div>
                  {inquiries.length === 0 ? (
                    <div className="py-16 text-center text-neutral-500 text-xs flex flex-col items-center justify-center gap-2 border border-neutral-800/60 rounded-sm bg-[#0d0d10]">
                      <Mail className="w-8 h-8 text-neutral-700" />
                      <p className="font-medium text-neutral-300">No inquiries yet</p>
                      <p className="text-[11px] text-neutral-500">Official diplomatic inquiries will appear here once submitted.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {inquiries.map((inq) => (
                        <div key={inq.id || inq.email + inq.created_at} className="p-4 bg-[#101015] border border-neutral-800 rounded-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-xs">{inq.name}</span>
                              <span className="text-[11px] font-mono text-[#d4af37]">({inq.email})</span>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-500">
                              {inq.created_at ? new Date(inq.created_at).toLocaleString() : 'Recent'}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-neutral-200 mb-1">
                            <span className="text-neutral-500 font-normal">Subject: </span>
                            {inq.subject}
                          </div>
                          <p className="text-xs text-neutral-400 font-light whitespace-pre-wrap leading-relaxed bg-[#0c0c0f] p-3 rounded-sm border border-neutral-800/60">
                            {inq.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
