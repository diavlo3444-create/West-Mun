import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Lock,
  Unlock,
  Copy,
  Check,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import {
  PageHeader,
  Panel,
  PanelHeader,
  StatCard,
  Notice,
  Modal,
  btnPrimary,
  btnSecondary,
  btnGhost,
  btnDanger,
  btnDangerSolid,
  inputCls,
  labelCls,
  selectCls,
} from '../dashboard/ui';

export const SUPER_ADMIN_EMAIL = 'diavlo3444@gmail.com';

export interface AdminRecord {
  user_id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin';
  active: boolean;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
}

interface AdminAccountsManagerProps {
  session: Session | null;
  isSuperAdmin: boolean;
}

export const AdminAccountsManager: React.FC<AdminAccountsManagerProps> = ({
  session,
  isSuperAdmin,
}) => {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Create Admin Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Success Card / Credentials display after creation
  const [createdAdminDetails, setCreatedAdminDetails] = useState<{
    name: string;
    email: string;
    password?: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Deactivate & Delete Action Modals
  const [toggleTarget, setToggleTarget] = useState<AdminRecord | null>(null);
  const [toggling, setToggling] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Global notice banner
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  /**
   * Fetch admin accounts from the trusted server-side API.
   * Only the verified IT Super Admin token is authorized.
   */
  const loadAdmins = useCallback(async () => {
    if (!session?.access_token) return;
    setRefreshing(true);

    try {
      const response = await fetch('/api/super-admin?scope=admins', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          Accept: 'application/json',
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success && Array.isArray(data.admins)) {
        setAdmins(data.admins);
      } else {
        setNotice({
          tone: 'error',
          message: data?.error || 'Failed to load administrator accounts from server.',
        });
      }
    } catch {
      setNotice({
        tone: 'error',
        message: 'Could not connect to the administrative server. Please try again.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAdmins();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, loadAdmins]);

  /**
   * Helper: Generate a strong random password
   */
  const generateStrongPassword = () => {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let pwd = '';
    const array = new Uint32Array(16);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < 16; i++) {
      pwd += chars[array[i] % chars.length];
    }
    setFormPassword(pwd);
    setFormConfirmPassword(pwd);
    setShowPassword(true);
    setShowConfirmPassword(true);
    setFormError('');
  };

  const handleCloseCreateModal = useCallback(() => {
    if (!creating) {
      setCreateModalOpen(false);
      setFormError('');
    }
  }, [creating]);

  /**
   * Create a normal Admin account
   */
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = formName.trim();
    const cleanEmail = formEmail.trim().toLowerCase();
    const cleanPassword = formPassword.trim();
    const cleanConfirm = formConfirmPassword.trim();

    if (cleanName.length < 2) {
      setFormError('Please enter the administrator’s full name (at least 2 characters).');
      return;
    }

    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRe.test(cleanEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      setFormError('Cannot create an account with the primary Super Admin email address.');
      return;
    }

    if (cleanPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      setFormError('Passwords do not match. Please verify both password fields.');
      return;
    }

    if (!session?.access_token) {
      setFormError('Your Super Admin session has expired. Please sign in again.');
      return;
    }

    setCreating(true);

    try {
      const response = await fetch('/api/super-admin?scope=admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success) {
        setCreatedAdminDetails({
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
        });
        setNotice({
          tone: 'success',
          message: data.message || `Normal Admin account for ${cleanName} created successfully.`,
        });
        // Reset inputs
        setFormName('');
        setFormEmail('');
        setFormPassword('');
        setFormConfirmPassword('');
        setCreateModalOpen(false);
        loadAdmins();
      } else {
        setFormError(data?.error || 'Failed to create administrator account.');
      }
    } catch {
      setFormError('Network error while communicating with authorization server.');
    } finally {
      setCreating(false);
    }
  };

  /**
   * Toggle Active / Deactivated status
   */
  const handleConfirmToggle = async () => {
    if (!toggleTarget || !session?.access_token) return;
    setToggling(true);

    const nextState = !toggleTarget.active;

    try {
      const response = await fetch(`/api/super-admin?scope=admins&id=${toggleTarget.user_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ active: nextState }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success) {
        setNotice({
          tone: 'success',
          message:
            data.message ||
            `Administrator account has been ${nextState ? 'reactivated' : 'deactivated'}.`,
        });
        setToggleTarget(null);
        loadAdmins();
      } else {
        setNotice({
          tone: 'error',
          message: data?.error || 'Failed to update administrator status.',
        });
      }
    } catch {
      setNotice({
        tone: 'error',
        message: 'Network error while attempting to update administrator status.',
      });
    } finally {
      setToggling(false);
    }
  };

  /**
   * Delete Admin account
   */
  const handleConfirmDelete = async () => {
    if (!deleteTarget || !session?.access_token) return;
    setDeleting(true);

    try {
      const response = await fetch(`/api/super-admin?scope=admins&id=${deleteTarget.user_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success) {
        setNotice({
          tone: 'success',
          message:
            data.message || `Administrator account for ${deleteTarget.email} was removed.`,
        });
        setDeleteTarget(null);
        loadAdmins();
      } else {
        setNotice({
          tone: 'error',
          message: data?.error || 'Failed to remove administrator account.',
        });
      }
    } catch {
      setNotice({
        tone: 'error',
        message: 'Network error while attempting to delete administrator account.',
      });
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Copy credentials payload to clipboard
   */
  const copyCredentialsToClipboard = () => {
    if (!createdAdminDetails) return;
    const text = [
      `WEST MUN 2027 — Administrator Account Credentials`,
      `Name: ${createdAdminDetails.name}`,
      `Email: ${createdAdminDetails.email}`,
      `Password: ${createdAdminDetails.password}`,
      `Portal: ${window.location.origin}/admin`,
      `Role: Normal Admin (Full conference operations, registrations, and inquiries)`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 3000);
  };

  // Filtered List
  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    return admins.filter((a) => {
      if (q) {
        const matches =
          a.full_name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.user_id.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (statusFilter === 'active' && !a.active) return false;
      if (statusFilter === 'inactive' && a.active) return false;
      return true;
    });
  }, [admins, search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((a) => a.active).length;
    const normalAdmins = admins.filter((a) => a.role === 'admin').length;
    return { total, active, normalAdmins };
  }, [admins]);

  // Non-Super Admin Access Denied Fallback
  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="SECRETARIAT SECURITY ENFORCEMENT"
          title="Admin Accounts Management"
          description="Access restricted to the primary IT Super Admin."
        />
        <Panel className="p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-950/40 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">Super Admin Authorization Required</h3>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
            This module is reserved exclusively for the verified IT Super Admin (
            <code className="text-[#d4af37] font-mono">{SUPER_ADMIN_EMAIL}</code>). Normal
            administrators cannot view, create, or manage other administrator accounts.
          </p>
          <div className="pt-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
              Server Verification: 403 Forbidden
            </span>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="SECRETARIAT ACCESS ARCHITECTURE"
        title="Admin Accounts"
        description="Provision and manage Secretariat organiser accounts with full administrative privileges across WEST MUN 2027."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadAdmins}
              disabled={refreshing}
              className={btnSecondary}
              title="Refresh list"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setCreateModalOpen(true);
              }}
              className={btnPrimary}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Create Admin</span>
            </button>
          </div>
        }
      />

      {/* Global Notice Banner */}
      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
        </Notice>
      )}

      {/* Recently Created Credentials Card */}
      {createdAdminDetails && (
        <Panel className="p-5 border-[#d4af37]/40 bg-[#12110c] relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-[#d4af37]/20 border border-[#d4af37]/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[#f3e5ab] font-semibold">
                  <CheckCircle2 className="h-3 w-3 text-[#d4af37]" />
                  New Admin Account Provisioned
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  Ready for immediate sign-in at /admin
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white">
                {createdAdminDetails.name} ({createdAdminDetails.email})
              </h3>
              <p className="text-xs text-neutral-300 font-light">
                This account was created in Supabase Auth and registered in public.admins with normal
                Admin privileges. Share the password securely with the organiser.
              </p>
              {createdAdminDetails.password && (
                <div className="mt-2 inline-flex items-center gap-2 rounded bg-black/60 border border-white/[0.1] px-3 py-1.5 font-mono text-xs text-[#d4af37]">
                  <KeyRound className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Password: {createdAdminDetails.password}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={copyCredentialsToClipboard}
                className={btnSecondary}
              >
                {copiedCredentials ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Credentials</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCreatedAdminDetails(null)}
                className={btnGhost}
              >
                Dismiss
              </button>
            </div>
          </div>
        </Panel>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Organisers"
          value={stats.total}
          helper="Super Admin + normal admins"
          icon={Shield}
          loading={loading}
        />
        <StatCard
          label="Active Accounts"
          value={stats.active}
          helper="Permitted to access /admin"
          icon={CheckCircle2}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          label="Normal Admins"
          value={stats.normalAdmins}
          helper="Delegates & conference ops"
          icon={UserCheck}
          tone="gold"
          loading={loading}
        />
        <StatCard
          label="Security Enforcement"
          value="RLS Active"
          helper="Server-verified bearer tokens"
          icon={ShieldAlert}
          tone="gold"
          loading={loading}
        />
      </div>

      {/* Main Admin List Panel */}
      <Panel>
        <PanelHeader
          eyebrow="DIRECTORY"
          title="Registered Administrators"
          description="Accounts with verified access to the WEST MUN secretariat command panel."
          action={
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
              Displaying <strong className="text-white">{filteredAdmins.length}</strong> of{' '}
              <strong className="text-white">{admins.length}</strong> organiser(s)
            </div>
          }
        />

        {/* Filter Bar */}
        <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0a0a0d]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by organiser name, email, or UUID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputCls}
              style={{ paddingLeft: '2rem' }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={selectCls}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Deactivated Only</option>
            </select>
          </div>
        </div>

        {/* Admins Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-neutral-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
              <span>Loading administrator accounts…</span>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 text-xs space-y-2">
              <AlertCircle className="w-6 h-6 text-neutral-500 mx-auto mb-1" />
              <p>
                {admins.length === 0
                  ? 'No administrator accounts registered.'
                  : 'No administrators match your current search filters.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#101013] border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Role & Scope</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredAdmins.map((admin) => {
                  const isPrimarySuper =
                    admin.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ||
                    admin.role === 'super_admin';

                  return (
                    <tr key={admin.user_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 border ${
                              isPrimarySuper
                                ? 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/40'
                                : 'bg-white/[0.04] text-neutral-300 border-white/[0.08]'
                            }`}
                          >
                            {isPrimarySuper ? (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            ) : (
                              <Shield className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{admin.full_name || 'Organiser'}</span>
                              {isPrimarySuper && (
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#d4af37]/20 text-[#f3e5ab] border border-[#d4af37]/40">
                                  Owner
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                              {admin.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPrimarySuper ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-[#1c180e] text-[#f3e5ab] border border-[#d4af37]/50 font-semibold">
                            <Sparkles className="w-3 h-3 text-[#d4af37]" />
                            IT Super Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-white/[0.04] text-neutral-300 border border-white/[0.09]">
                            <UserCheck className="w-3 h-3 text-neutral-400" />
                            Admin Organiser
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {admin.active ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-emerald-950/50 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-rose-950/50 text-rose-300 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                        {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                        {admin.last_sign_in_at
                          ? new Date(admin.last_sign_in_at).toLocaleString()
                          : 'Never signed in'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isPrimarySuper ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-neutral-500 px-2 py-1"
                            title="Super Admin account is protected against deactivation or deletion."
                          >
                            <Lock className="w-3 h-3" />
                            Immutable
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setToggleTarget(admin)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase rounded-sm border border-white/[0.08] hover:border-white/[0.18] text-neutral-300 hover:text-white transition-colors"
                              title={
                                admin.active
                                  ? 'Deactivate this administrator'
                                  : 'Reactivate this administrator'
                              }
                            >
                              {admin.active ? (
                                <>
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span>Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3 text-emerald-400" />
                                  <span>Reactivate</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(admin)}
                              className="p-1 text-neutral-400 hover:text-rose-300 rounded hover:bg-rose-950/40 transition-colors"
                              title="Delete admin account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      {/* ------------------------------------------------------------------ */}
      {/* CREATE ADMIN MODAL                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={createModalOpen}
        onClose={handleCloseCreateModal}
        title="Create Administrator Account"
        eyebrow="SECRETARIAT ORGANISER PROVISIONING"
        description="Creates a genuine Supabase Auth user with confirmed email and grants normal Admin privileges for WEST MUN 2027 operations."
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <Notice tone="error" onDismiss={() => setFormError('')}>
              {formError}
            </Notice>
          )}

          <div>
            <label htmlFor="create-admin-name" className={labelCls}>
              Full Name *
            </label>
            <input
              id="create-admin-name"
              type="text"
              required
              disabled={creating}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Yousef Al-Mansoor"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="create-admin-email" className={labelCls}>
              Email Address *
            </label>
            <input
              id="create-admin-email"
              type="email"
              required
              disabled={creating}
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="organiser@westmun.org"
              className={inputCls}
            />
            <p className="mt-1 text-[10.5px] text-neutral-400 font-light">
              This email will be used to log in at{' '}
              <code className="text-[#d4af37] font-mono">/admin</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="create-admin-pass" className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                  Password *
                </label>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="text-[9.5px] font-mono text-[#d4af37] hover:underline inline-flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  Generate
                </button>
              </div>
              <div className="relative">
                <input
                  id="create-admin-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={creating}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className={`${inputCls} pr-8`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="create-admin-confirm" className={labelCls}>
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="create-admin-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  disabled={creating}
                  value={formConfirmPassword}
                  onChange={(e) => setFormConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={`${inputCls} pr-8`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 rounded bg-white/[0.03] border border-white/[0.07] text-[11px] text-neutral-300 space-y-1">
            <span className="font-semibold text-white block">Assigned Permissions:</span>
            <ul className="list-disc list-inside space-y-0.5 text-neutral-400">
              <li>Full access to overview, delegate registrations, team applications, and inquiries.</li>
              <li>Cannot access Super Admin tools, create other admins, or manage department heads.</li>
              <li>Strict server-side enforcement on all privileged API routes.</li>
            </ul>
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={creating}
              onClick={() => {
                setCreateModalOpen(false);
                setFormError('');
              }}
              className={btnGhost}
            >
              Cancel
            </button>
            <button type="submit" disabled={creating} className={btnPrimary}>
              {creating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Provisioning Account…</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Admin Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* DEACTIVATE / REACTIVATE CONFIRMATION MODAL                         */}
      {/* ------------------------------------------------------------------ */}
      {toggleTarget && (
        <Modal
          open={Boolean(toggleTarget)}
          onClose={() => !toggling && setToggleTarget(null)}
          title={
            toggleTarget.active
              ? `Deactivate ${toggleTarget.full_name || toggleTarget.email}?`
              : `Reactivate ${toggleTarget.full_name || toggleTarget.email}?`
          }
          eyebrow="ACCESS CONTROL ADJUDICATION"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-neutral-300 leading-relaxed">
              {toggleTarget.active
                ? `Deactivating this account will immediately revoke their access to the /admin command dashboard. Their database records and audit logs will remain intact.`
                : `Reactivating this account will immediately restore their ability to sign in to /admin with their existing credentials.`}
            </p>

            <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded text-xs font-mono space-y-1">
              <div>Organiser: <span className="text-white">{toggleTarget.full_name || 'Admin'}</span></div>
              <div>Email: <span className="text-[#d4af37]">{toggleTarget.email}</span></div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={toggling}
                onClick={() => setToggleTarget(null)}
                className={btnGhost}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={toggling}
                onClick={handleConfirmToggle}
                className={toggleTarget.active ? btnDanger : btnPrimary}
              >
                {toggling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating…</span>
                  </>
                ) : toggleTarget.active ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirm Deactivation</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Confirm Reactivation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DELETE CONFIRMATION MODAL                                          */}
      {/* ------------------------------------------------------------------ */}
      {deleteTarget && (
        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => !deleting && setDeleteTarget(null)}
          title={`Remove Administrator Account?`}
          eyebrow="PERMANENT ACCESS REVOCATION"
          tone="danger"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to permanently remove{' '}
              <strong className="text-white">{deleteTarget.full_name || deleteTarget.email}</strong>?
              This will delete their admin status from{' '}
              <code className="text-[#d4af37] font-mono">public.admins</code> and revoke their
              administrative access.
            </p>

            <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded text-xs font-mono space-y-1">
              <div>Account: <span className="text-white">{deleteTarget.full_name || 'Admin'}</span></div>
              <div>Email: <span className="text-rose-300">{deleteTarget.email}</span></div>
              <div className="text-[10.5px] text-neutral-400 pt-1">UUID: {deleteTarget.user_id}</div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className={btnGhost}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className={btnDangerSolid}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Admin Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminAccountsManager;
