import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Shield,
  ShieldCheck,
  Megaphone,
  ShieldAlert,
  UserPlus,
  KeyRound,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  Info,
  LogIn,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, Panel, StatCard, Notice } from '../dashboard/ui';
import {
  DEPARTMENTS,
  VALID_DEPARTMENTS,
  isGenderSeparated,
  getDepartmentDashboardUrl,
  type DepartmentKey,
  type SectionKey,
} from '../head/departments';

export const SUPER_ADMIN_EMAIL = 'diavlo3444@gmail.com';

interface DepartmentHeadRecord {
  id: string;
  user_id?: string;
  email: string;
  head_name?: string | null;
  department: DepartmentKey;
  section?: SectionKey | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SuperAdminManagerProps {
  session: Session | null;
  isSuperAdmin: boolean;
}

export const SuperAdminManager: React.FC<SuperAdminManagerProps> = ({
  session,
  isSuperAdmin,
}) => {
  const [heads, setHeads] = useState<DepartmentHeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Create Head Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [authMethod, setAuthMethod] = useState<'invite' | 'password'>('invite');
  const [showPassword, setShowPassword] = useState(false);
  const [formDept, setFormDept] = useState<DepartmentKey>('design');
  const [formSection, setFormSection] = useState<SectionKey>('male');
  const [formActive, setFormActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // If Supabase Auth succeeds but the department_heads write fails, keep the
  // resulting Auth user so the assignment can be retried without duplicating it.
  const [failedAssignment, setFailedAssignment] = useState<{
    userId: string;
    name: string;
    email: string;
    department: DepartmentKey;
    section: SectionKey | null;
    active: boolean;
    invitationLink?: string;
  } | null>(null);
  const [retryingAssignment, setRetryingAssignment] = useState(false);

  // Recently created credentials card
  const [recentCredentials, setRecentCredentials] = useState<{
    name: string;
    email: string;
    password?: string;
    invitationLink?: string;
    department: string;
    section?: string | null;
    portalUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetCopied, setResetCopied] = useState(false);

  // Edit Head Modal State
  const [editingHead, setEditingHead] = useState<DepartmentHeadRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState<DepartmentKey>('design');
  const [editSection, setEditSection] = useState<SectionKey | null>(null);
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Password Reset Modal State
  const [resetTarget, setResetTarget] = useState<DepartmentHeadRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetResult, setResetResult] = useState<{ message: string; link?: string } | null>(null);
  const [resetError, setResetError] = useState('');

  // Delete Confirmation Modal State
  const [deletingHead, setDeletingHead] = useState<DepartmentHeadRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Super IT Test Mode State
  const [launchingHeadId, setLaunchingHeadId] = useState<string | null>(null);
  const [launchingDemoRole, setLaunchingDemoRole] = useState<string | null>(null);
  const [testLaunchError, setTestLaunchError] = useState<string | null>(null);

  const currentUserEmail = session?.user?.email?.toLowerCase().trim() || '';
  // Server-verified flag only. The email is displayed for context, never used
  // as proof of authorization, and every API call is re-verified server-side.
  const isAuthorizedCaller = isSuperAdmin;

  // Helper: Resilient fetch that never throws JSON parse syntax errors on server HTML/text errors
  const safeJsonFetch = async (
    url: string,
    options?: RequestInit
  ): Promise<{ ok: boolean; status: number; data: any }> => {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        data = {
          error: res.ok
            ? 'Server returned non-JSON response.'
            : `Server returned error (${res.status}): ${
                text.length > 200 ? text.slice(0, 200) + '…' : text || 'Empty response'
              }`,
        };
      }
      return { ok: res.ok, status: res.status, data };
    } catch (netErr: any) {
      return {
        ok: false,
        status: 0,
        data: {
          error: `Network request failed: ${netErr?.message || 'Unable to communicate with server.'}`,
        },
      };
    }
  };

  // Load department heads list from authoritative server endpoint
  const loadHeads = useCallback(async () => {
    if (!isAuthorizedCaller || !session) return;
    setRefreshing(true);

    try {
      const { ok, data } = await safeJsonFetch('/api/super-admin', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (ok && data?.heads) {
        setHeads(data.heads);
      } else {
        console.error('Failed to load heads from server:', data?.error);
      }
    } catch (err) {
      console.error('Failed to load department heads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthorizedCaller, session, currentUserEmail]);

  useEffect(() => {
    if (isAuthorizedCaller) {
      loadHeads();
    } else {
      setLoading(false);
    }
  }, [isAuthorizedCaller, loadHeads]);

  // Generate strong random password helper
  const generatePassword = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let result = '';
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    for (let i = 0; i < 12; i++) {
      result += charset[bytes[i] % charset.length];
    }
    setFormPassword(result);
  };

  // Handle Create Head Account
  const handleCreateHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorizedCaller || !session) return;

    setFormError('');
    setFormSuccess(null);
    setFailedAssignment(null);
    setCreating(true);

    const cleanEmail = formEmail.trim().toLowerCase();
    const cleanName = formName.trim();
    const sec = isGenderSeparated(formDept) ? formSection : null;
    const isInvite = authMethod === 'invite';
    const cleanPassword = isInvite ? '' : formPassword.trim();

    try {
      const { ok, data: result } = await safeJsonFetch('/api/super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          inviteOnly: isInvite,
          department: formDept,
          section: sec,
          active: formActive,
        }),
      });

      if (!ok) {
        if (result?.retryable && result?.userId) {
          setFailedAssignment({
            userId: result.userId,
            name: cleanName,
            email: cleanEmail,
            department: formDept,
            section: sec,
            active: formActive,
            invitationLink: result.invitationLink,
          });
        }
        setFormError(result?.error || 'Failed to create department head account.');
        return;
      }

      setFormSuccess(result.message || 'Department head account created successfully.');
      setRecentCredentials({
        name: cleanName,
        email: cleanEmail,
        password: isInvite ? undefined : cleanPassword,
        invitationLink: result.invitationLink,
        department: DEPARTMENTS[formDept].label,
        section: sec,
        portalUrl: `${window.location.origin}${getDepartmentDashboardUrl(formDept, sec)}`,
      });

      // Reset form
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setFormActive(true);

      // Refresh directory
      await loadHeads();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during account creation.';
      setFormError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Retry ONLY the department assignment for the Auth user that already exists.
  const handleRetryAssignment = async () => {
    if (!failedAssignment || !session) return;
    setRetryingAssignment(true);
    setFormError('');

    try {
      const { ok, data: result } = await safeJsonFetch('/api/super-admin?action=assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: failedAssignment.userId,
          fullName: failedAssignment.name,
          email: failedAssignment.email,
          department: failedAssignment.department,
          section: failedAssignment.section,
          active: failedAssignment.active,
        }),
      });

      if (!ok) {
        setFormError(result?.error || 'The department assignment still could not be saved.');
        return;
      }

      const sec = failedAssignment.section;
      const dept = failedAssignment.department;

      setFormSuccess(result.message || 'Department assignment saved successfully.');
      setRecentCredentials({
        name: failedAssignment.name,
        email: failedAssignment.email,
        invitationLink: failedAssignment.invitationLink,
        department: DEPARTMENTS[dept].label,
        section: sec,
        portalUrl: `${window.location.origin}${getDepartmentDashboardUrl(dept, sec)}`,
      });
      setFailedAssignment(null);
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setFormActive(true);
      await loadHeads();
    } catch {
      setFormError('Could not reach the server while retrying the assignment.');
    } finally {
      setRetryingAssignment(false);
    }
  };

  // Handle Edit Head modal open
  const openEditModal = (head: DepartmentHeadRecord) => {
    setEditingHead(head);
    setEditName(head.head_name || '');
    setEditDept(head.department);
    setEditSection(head.section || (isGenderSeparated(head.department) ? 'male' : null));
    setEditActive(head.active !== false);
    setEditError('');
  };

  // Submit Edit Head
  const handleSaveEdit = async () => {
    if (!editingHead || !session) return;
    setSavingEdit(true);
    setEditError('');

    const headId = editingHead.id || editingHead.user_id;
    const sec = isGenderSeparated(editDept) ? editSection : null;

    try {
      const { ok, data: result } = await safeJsonFetch(`/api/super-admin?action=update&id=${headId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: editName,
          department: editDept,
          section: sec,
          active: editActive,
        }),
      });

      if (!ok) {
        throw new Error(result?.error || 'Failed to update department head assignment.');
      }

      setEditingHead(null);
      await loadHeads();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update assignment.';
      setEditError(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick Toggle Active/Inactive
  const handleToggleActive = async (head: DepartmentHeadRecord) => {
    if (!session) return;
    const headId = head.id || head.user_id;
    const newStatus = !head.active;

    try {
      const { ok, data: result } = await safeJsonFetch(`/api/super-admin?action=update&id=${headId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          active: newStatus,
        }),
      });

      if (!ok) {
        throw new Error(result?.error || 'Failed to change account status.');
      }

      await loadHeads();
    } catch (err) {
      console.error('Error toggling head status:', err);
    }
  };

  // Submit Password Reset
  const handleExecutePasswordReset = async () => {
    if (!resetTarget || !session) return;
    setResettingPassword(true);
    setResetError('');
    setResetResult(null);

    const headId = resetTarget.id || resetTarget.user_id;

    try {
      const { ok, data: result } = await safeJsonFetch(`/api/super-admin?action=reset-password&id=${headId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          newPassword: newPassword || undefined,
          generateLink: !newPassword,
          email: resetTarget.email,
        }),
      });

      if (!ok) {
        throw new Error(result?.error || 'Password reset failed.');
      }

      setResetResult({
        message: result.message || 'Password successfully updated.',
        link: result.actionLink,
      });
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error resetting password.';
      setResetError(msg);
    } finally {
      setResettingPassword(false);
    }
  };

  // Launch a temporary EB demo profile in a separate tab. This does not create a real Auth account.
  const handleLaunchDemoRole = async (role: 'co_head' | 'marketing' | 'design') => {
    if (!isAuthorizedCaller || !session) return;
    setTestLaunchError(null);
    setLaunchingDemoRole(role);
    try {
      const { ok, data } = await safeJsonFetch('/api/super-admin?action=launch-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ demoRole: role }),
      });
      if (!ok || !data?.launchUrl) throw new Error(data?.error || 'Could not create the demo session.');
      const opened = window.open(data.launchUrl, '_blank', 'noopener,noreferrer');
      if (!opened) window.location.href = data.launchUrl;
    } catch (err: unknown) {
      setTestLaunchError(err instanceof Error ? err.message : 'Could not launch the demo session.');
    } finally {
      setLaunchingDemoRole(null);
    }
  };

  // Handle Login as Head (Super IT Test Mode)
  const handleLoginAsHead = async (head: DepartmentHeadRecord) => {
    if (!isAuthorizedCaller || !session) return;
    setTestLaunchError(null);
    setLaunchingHeadId(head.id || head.email);

    try {
      const { ok, data: result } = await safeJsonFetch('/api/super-admin?action=launch-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: head.id || head.user_id,
          email: head.email,
        }),
      });

      if (!ok || !result?.launchUrl) {
        throw new Error(result?.error || 'Failed to initialize Super IT test session.');
      }

      // Synchronize to storage so the new tab inherits the test credentials instantly
      if (result.sessionToken) {
        const testSess = {
          token: result.sessionToken,
          adminEmail: 'diavlo3444@gmail.com',
          expiresAt: Date.now() + 15 * 60 * 1000,
        };
        try {
          localStorage.setItem('westmun_super_it_test_session', JSON.stringify(testSess));
          sessionStorage.setItem('westmun_super_it_test_session', JSON.stringify(testSess));
        } catch {}
      }

      // Open new tab without modifying the current IT Super Admin tab session
      const opened = window.open(result.launchUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        // If popup blocker blocked window.open, navigate directly
        window.location.href = result.launchUrl;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to launch test session.';
      setTestLaunchError(msg);
    } finally {
      setLaunchingHeadId(null);
    }
  };

  // Handle Delete / Revoke Head
  const handleConfirmDelete = async () => {
    if (!deletingHead || !session) return;
    setDeleting(true);
    setDeleteError('');

    const headId = deletingHead.id || deletingHead.user_id;

    try {
      const { ok, data: result } = await safeJsonFetch(`/api/super-admin?action=delete&id=${headId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!ok) {
        throw new Error(result?.error || 'Failed to remove head assignment.');
      }

      setDeletingHead(null);
      await loadHeads();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete head record.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // Copy credentials message
  const handleCopyCredentials = () => {
    if (!recentCredentials) return;
    const lines = [
      `WEST MUN 2027 — Department Head Portal Access`,
      `Name: ${recentCredentials.name}`,
      `Department: ${recentCredentials.department}${recentCredentials.section ? ` (${recentCredentials.section.toUpperCase()} Division)` : ''}`,
      `Portal Sign-in URL: ${recentCredentials.portalUrl}`,
      `Login Email: ${recentCredentials.email}`,
    ];

    if (recentCredentials.invitationLink) {
      lines.push(`Password-Setup Invitation Link: ${recentCredentials.invitationLink}`);
      lines.push(`\nPlease click the invitation link to set up your password and access your dashboard.`);
    } else if (recentCredentials.password) {
      lines.push(`Temporary Password: ${recentCredentials.password}`);
      lines.push(`\nSecurity notice: Please sign in and update your password upon first login.`);
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = heads.length;
    const active = heads.filter((h) => h.active !== false).length;
    const inactive = total - active;
    const genderSeparatedCount = heads.filter((h) => isGenderSeparated(h.department)).length;
    return { total, active, inactive, genderSeparatedCount };
  }, [heads]);

  // Filtered Heads
  const filteredHeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return heads.filter((h) => {
      if (q) {
        const match =
          (h.head_name || '').toLowerCase().includes(q) ||
          h.email.toLowerCase().includes(q) ||
          h.department.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (deptFilter !== 'all' && h.department !== deptFilter) {
        return false;
      }
      if (statusFilter === 'active' && h.active === false) {
        return false;
      }
      if (statusFilter === 'inactive' && h.active !== false) {
        return false;
      }
      return true;
    });
  }, [heads, search, deptFilter, statusFilter]);

  // ---------------------------------------------------------------------------
  // ACCESS DENIED VIEW: For any user other than diavlo3444@gmail.com
  // ---------------------------------------------------------------------------
  if (!isAuthorizedCaller) {
    return (
      <div className="mx-auto max-w-2xl py-4">
        <Panel className="overflow-hidden">
          <div className="h-px wm-hairline" aria-hidden="true" />
          <div className="p-8 text-center sm:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/25 bg-rose-400/[0.07] text-rose-300">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="wm-serif mt-4 text-[26px] text-white">Restricted console</h2>
            <p className="mt-1 text-[9.5px] font-mono uppercase tracking-[0.2em] text-[#d4af37]">
              IT Super Admin
            </p>
            <p className="mx-auto mt-4 max-w-md text-[12px] leading-relaxed text-neutral-400">
              Head account provisioning is limited to the top-level conference administrator{' '}
              <strong className="font-mono text-white">{SUPER_ADMIN_EMAIL}</strong>. Your session is valid,
              but it does not hold this permission.
            </p>
            <div className="mx-auto mt-5 max-w-sm rounded-md border border-white/[0.07] bg-white/[0.015] px-3.5 py-3 text-left">
              <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                Current authenticated user
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-rose-300">
                {currentUserEmail || 'Signed out'}
              </p>
            </div>
            <p className="mt-4 text-[10px] leading-relaxed text-neutral-400">
              Authorization is re-verified on every request by the server against Supabase Auth and{' '}
              <code className="font-mono text-neutral-400">public.admins</code>.
            </p>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access & systems"
        title="IT Super Admin"
        description="Provision department-head identities, assign departments and divisions, and revoke portal access. Every action is executed server-side with the service-role key."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.13em] text-[#e2c258]">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Master privileges
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400">
              <UserCheck className="h-3 w-3 text-emerald-400" aria-hidden="true" />
              {SUPER_ADMIN_EMAIL}
            </span>
          </>
        }
        actions={
          <button
            type="button"
            onClick={loadHeads}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.12] bg-white/[0.025] px-3 py-2 text-[11px] font-medium text-neutral-300 transition-colors hover:border-white/[0.2] hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#d4af37]' : ''}`} aria-hidden="true" />
            Refresh roster
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Head accounts"
          value={stats.total}
          helper="Auth users with a department assignment"
          icon={ShieldCheck}
          tone="gold"
          loading={loading}
        />
        <StatCard
          label="Active access"
          value={stats.active}
          helper="Can sign in to their department dashboard"
          icon={UserCheck}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          label="Suspended"
          value={stats.inactive}
          helper="Assignment kept, portal access revoked"
          icon={ShieldAlert}
          tone="rose"
          loading={loading}
        />
        <StatCard
          label="Sectioned roles"
          value={stats.genderSeparatedCount}
          helper="Male and female divisions combined"
          icon={Sparkles}
          tone="amber"
          loading={loading}
        />
      </div>

      {/* 3. Provision New Head Account Form */}
      <Panel className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-white/[0.07]/80 pb-4">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-[13.5px] font-semibold text-white tracking-tight">
              Provision New Department Head Account
            </h2>
          </div>
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
            Server-Side Verified
          </span>
        </div>

        {formError && (
          <div className="p-3.5 text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-md flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {failedAssignment && (
          <div className="p-3.5 text-xs bg-[#171208] border border-[#d4af37]/50 rounded-md space-y-3">
            <div className="flex items-start gap-2.5 text-[#f3e5ab]">
              <ShieldAlert className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">
                  The Auth account already exists (UID {failedAssignment.userId}). Only the department
                  assignment is missing.
                </p>
                <p className="text-neutral-400 font-light">
                  Nothing will be duplicated. Fix the cause shown above (usually the SQL migration or a
                  department/division already held by another head), then retry.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetryAssignment}
              disabled={retryingAssignment}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] hover:bg-[#e2c258] rounded-md cursor-pointer disabled:opacity-50"
            >
              {retryingAssignment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Retrying Assignment…</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry department assignment</span>
                </>
              )}
            </button>
          </div>
        )}

        {formSuccess && (
          <div className="p-3.5 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 rounded-md flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{formSuccess}</span>
          </div>
        )}

        {recentCredentials && (
          <div className="p-4 bg-[#111114] border border-[#d4af37]/40 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-[#d4af37] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Account Created — Copy Credentials to Dispatch:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono uppercase bg-[#1a1710] border border-[#d4af37]/60 text-[#f3e5ab] hover:brightness-110 rounded-md cursor-pointer transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono bg-black/40 p-3 rounded-md border border-white/[0.07]">
              <div><span className="text-neutral-400">Name:</span> <span className="text-white">{recentCredentials.name}</span></div>
              <div><span className="text-neutral-400">Email:</span> <span className="text-white">{recentCredentials.email}</span></div>
              <div><span className="text-neutral-400">Department:</span> <span className="text-[#d4af37]">{recentCredentials.department}</span></div>
              <div><span className="text-neutral-400">Division:</span> <span className="text-[#f3e5ab]">{recentCredentials.section ? `${recentCredentials.section.toUpperCase()}` : 'None (Universal)'}</span></div>
              {recentCredentials.invitationLink ? (
                <div className="sm:col-span-2 p-2.5 bg-[#171610] border border-[#d4af37]/50 rounded-md space-y-1">
                  <div className="text-[11px] text-[#f3e5ab] font-sans font-medium flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Password Setup Invitation Link (Valid for 48 hours):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(recentCredentials.invitationLink!);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2500);
                      }}
                      className="text-[10px] uppercase font-mono text-[#d4af37] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Link</span>
                    </button>
                  </div>
                  <div className="text-emerald-300 font-mono text-[11px] break-all select-all bg-black/50 p-2 rounded-xs border border-white/[0.07]">
                    {recentCredentials.invitationLink}
                  </div>
                </div>
              ) : (
                <div className="sm:col-span-2"><span className="text-neutral-400">Temporary Password:</span> <span className="text-emerald-300 font-semibold select-all">{recentCredentials.password}</span></div>
              )}
              <div className="sm:col-span-2 truncate"><span className="text-neutral-400">Portal Link:</span> <a href={recentCredentials.portalUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{recentCredentials.portalUrl}</a></div>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateHead} className="space-y-4">
          {/* Method selector: Invitation vs Password */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
              Authentication Method *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuthMethod('invite')}
                className={`p-3 text-left rounded-md border transition-all cursor-pointer flex items-start gap-2.5 ${
                  authMethod === 'invite'
                    ? 'bg-[#181610] border-[#d4af37] text-white shadow-xs'
                    : 'bg-[#111114] border-white/[0.07] text-neutral-400 hover:border-white/[0.1]'
                }`}
              >
                <KeyRound className={`w-4 h-4 mt-0.5 shrink-0 ${authMethod === 'invite' ? 'text-[#d4af37]' : 'text-neutral-400'}`} />
                <div>
                  <div className="text-xs font-medium text-white flex items-center gap-1.5">
                    <span>Secure Invitation Link</span>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-[#d4af37]/20 text-[#f3e5ab] rounded-xs">Recommended</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-light mt-0.5">
                    Generates a secure link for the head to configure their own password
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAuthMethod('password')}
                className={`p-3 text-left rounded-md border transition-all cursor-pointer flex items-start gap-2.5 ${
                  authMethod === 'password'
                    ? 'bg-[#181610] border-[#d4af37] text-white shadow-xs'
                    : 'bg-[#111114] border-white/[0.07] text-neutral-400 hover:border-white/[0.1]'
                }`}
              >
                <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${authMethod === 'password' ? 'text-[#d4af37]' : 'text-neutral-400'}`} />
                <div>
                  <div className="text-xs font-medium text-white">Manual / Temporary Password</div>
                  <div className="text-[11px] text-neutral-400 font-light mt-0.5">
                    Define an explicit temporary password to dispatch directly
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                Full Legal / Head Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Najla Rami"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-[#101013] border border-white/[0.1] focus:border-[#d4af37] rounded-md py-2 px-3 text-sm text-white focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                Head Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="head@westmun.org"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full bg-[#101013] border border-white/[0.1] focus:border-[#d4af37] rounded-md py-2 px-3 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {authMethod === 'password' ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs uppercase tracking-wider text-neutral-300 font-medium">
                    Temporary Password *
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-[11px] font-mono text-[#d4af37] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={authMethod === 'password'}
                    placeholder="Min. 8 characters"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-[#101013] border border-white/[0.1] focus:border-[#d4af37] rounded-md py-2 pl-3 pr-10 text-sm text-white focus:outline-none font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#111114] border border-white/[0.07] rounded-md flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-300 font-light leading-relaxed">
                  A high-entropy password-setup invitation token will be generated upon creation. The head can set their password directly via the link.
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                Assigned Department *
              </label>
              <select
                value={formDept}
                onChange={(e) => setFormDept(e.target.value as DepartmentKey)}
                className="w-full bg-[#101013] border border-white/[0.1] focus:border-[#d4af37] rounded-md py-2 px-3 text-sm text-white focus:outline-none transition-colors"
              >
                {VALID_DEPARTMENTS.map((deptKey) => (
                  <option key={deptKey} value={deptKey}>
                    {DEPARTMENTS[deptKey].label} {isGenderSeparated(deptKey) ? '(Gender-Divided)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Gender Section Radio (Conditional strictly for Media, Security, Volunteers) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                Gender Division {isGenderSeparated(formDept) ? '*' : '(Not Applicable)'}
              </label>
              {isGenderSeparated(formDept) ? (
                <div className="flex items-center gap-4 p-2 bg-[#101013] border border-[#d4af37]/40 rounded-md">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-200">
                    <input
                      type="radio"
                      name="head-section"
                      value="male"
                      checked={formSection === 'male'}
                      onChange={() => setFormSection('male')}
                      className="accent-[#d4af37]"
                    />
                    <span>Male Division</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-200">
                    <input
                      type="radio"
                      name="head-section"
                      value="female"
                      checked={formSection === 'female'}
                      onChange={() => setFormSection('female')}
                      className="accent-[#d4af37]"
                    />
                    <span>Female Division</span>
                  </label>
                </div>
              ) : (
                <div className="p-2 bg-[#111114] border border-white/[0.07] rounded-md text-xs text-neutral-400 font-mono">
                  Universal / Single Leadership
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                Initial Account Status
              </label>
              <div className="flex items-center gap-4 p-2 bg-[#101013] border border-white/[0.1] rounded-md">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-300">
                  <input
                    type="radio"
                    name="head-active"
                    checked={formActive}
                    onChange={() => setFormActive(true)}
                    className="accent-emerald-500"
                  />
                  <span>Active (Can sign in)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400">
                  <input
                    type="radio"
                    name="head-active"
                    checked={!formActive}
                    onChange={() => setFormActive(false)}
                    className="accent-red-500"
                  />
                  <span>Inactive (Suspended)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={creating}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-black bg-[#d4af37] hover:bg-[#e2c258] rounded-md cursor-pointer transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Provisioning Head Account…</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Provision Department Head</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Panel>

      {/* Temporary EB role demo sessions */}
      <Panel className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#e2c258]"><Eye className="h-5 w-5" /></div>
          <div><h2 className="text-[14px] font-semibold text-white">EB Role Demo Accounts</h2><p className="mt-1 text-xs leading-relaxed text-neutral-400">Open a temporary preview of a role in a separate tab, similar to Administrator Session. These are signed demo sessions, not real accounts, and expire after 15 minutes.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {([{ role: 'co_head' as const, title: 'Co-Head', detail: 'Co-Head operations preview', icon: UserCheck }, { role: 'marketing' as const, title: 'Marketing', detail: 'Marketing EB dashboard preview', icon: Megaphone }, { role: 'design' as const, title: 'Design', detail: 'Design EB dashboard preview', icon: Sparkles }]).map((item) => {
            const Icon = item.icon;
            return <button key={item.role} type="button" onClick={() => handleLaunchDemoRole(item.role)} disabled={Boolean(launchingDemoRole)} className="group flex items-center gap-3 rounded-xl border border-white/[0.09] bg-black/30 p-4 text-left transition hover:border-[#d4af37]/50 hover:bg-[#d4af37]/[0.06] disabled:cursor-wait disabled:opacity-60"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/[0.08] text-[#d4af37]">{launchingDemoRole === item.role ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}</span><span className="min-w-0"><span className="block text-sm font-medium text-white">{item.title}</span><span className="mt-1 block text-[11px] leading-relaxed text-neutral-400">{item.detail}</span></span><ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-neutral-500 group-hover:text-[#d4af37]" /></button>;
          })}
        </div>
      </Panel>

      {/* 4. Department Heads Directory */}
      <Panel className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07]/80 pb-4">
          <div>
            <h2 className="text-[13.5px] font-semibold text-white tracking-tight">
              Department Heads Registry ({filteredHeads.length})
            </h2>
            <p className="text-xs text-neutral-400 font-light">
              Manage existing head assignments, toggle instant portal access, or initiate secure credential resets.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#101013] border border-white/[0.1] rounded-md pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37] w-40 sm:w-48"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-[#101013] border border-white/[0.1] rounded-md px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="all">All Departments</option>
              {VALID_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {DEPARTMENTS[dept].label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#101013] border border-white/[0.1] rounded-md px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {testLaunchError && (
          <div className="mb-4">
            <Notice tone="error" title="Test Session Launch Failed">
              {testLaunchError}
            </Notice>
          </div>
        )}

        {/* Heads Table */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
            <Loader2 className="w-5 h-5 animate-spin text-[#d4af37]" />
            <span className="text-xs font-mono">Loading Head Roster…</span>
          </div>
        ) : filteredHeads.length === 0 ? (
          <div className="py-10 text-center text-xs text-neutral-400 font-light">
            No department head records match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] font-mono text-[9px] text-neutral-400 uppercase tracking-[0.14em]">
                  <th className="py-3 px-3">Head Name & Email</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Division</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-light">
                {filteredHeads.map((h) => {
                  const meta = DEPARTMENTS[h.department] || {
                    label: h.department,
                    primaryColor: '#d4af37',
                  };
                  const isActive = h.active !== false;

                  return (
                    <tr key={h.id || h.email} className="hover:bg-white/[0.025] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-white">
                          {h.head_name || <span className="text-neutral-400 italic">No name registered</span>}
                        </div>
                        <div className="font-mono text-[11px] text-neutral-400">{h.email}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 text-neutral-200">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: meta.primaryColor }}
                          />
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        {h.section ? (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider ${
                              h.section === 'female'
                                ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40'
                                : 'bg-blue-950/60 text-blue-300 border border-blue-500/40'
                            }`}
                          >
                            {h.section.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-neutral-400 font-mono text-[11px]">All / Joint</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(h)}
                          title="Click to toggle active status"
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider cursor-pointer border transition-colors ${
                            isActive
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                              : 'bg-red-950/60 text-red-300 border-red-500/40 hover:bg-red-900/60'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-red-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Super IT Test Mode: Login as Head */}
                          <button
                            type="button"
                            onClick={() => handleLoginAsHead(h)}
                            disabled={launchingHeadId === (h.id || h.email)}
                            title="Login as Head in new tab (Super IT Test Session)"
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-medium rounded-md text-[#d4af37] bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border border-[#d4af37]/35 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {launchingHeadId === (h.id || h.email) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <LogIn className="w-3 h-3" />
                            )}
                            <span>Login</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(h)}
                            title="Edit Role / Department"
                            className="p-1.5 text-neutral-400 hover:text-[#d4af37] bg-neutral-900 hover:bg-[#1a1710] border border-white/[0.07] rounded-md transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(h);
                              setNewPassword('');
                              setResetError('');
                              setResetResult(null);
                            }}
                            title="Reset Password"
                            className="p-1.5 text-neutral-400 hover:text-[#e5c158] bg-neutral-900 hover:bg-[#1a1710] border border-white/[0.07] rounded-md transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeletingHead(h);
                              setDeleteError('');
                            }}
                            title="Remove Portal Access"
                            className="p-1.5 text-neutral-400 hover:text-red-400 bg-neutral-900 hover:bg-red-950/50 border border-white/[0.07] rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* 5. EDIT HEAD MODAL */}
      {editingHead && (
        <div className="wm-overlay-in fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 sm:p-6">
          <div className="bg-[#0c0c0f] border border-[#d4af37]/40 rounded-md p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <h3 className="wm-serif text-lg text-white">Edit Department Head Assignment</h3>
              <button
                type="button"
                onClick={() => setEditingHead(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-2.5 bg-red-950/50 border border-red-500/40 text-red-300 text-xs rounded-md">
                {editError}
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-400 uppercase font-mono tracking-wider mb-1">
                  Email (Immutable UID)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingHead.email}
                  className="w-full bg-[#101013] border border-white/[0.07] text-neutral-400 py-2 px-3 rounded-md font-mono opacity-60"
                />
              </div>

              <div>
                <label className="block text-neutral-300 uppercase font-mono tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#101013] border border-white/[0.1] py-2 px-3 rounded-md text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-neutral-300 uppercase font-mono tracking-wider mb-1">
                  Assigned Department
                </label>
                <select
                  value={editDept}
                  onChange={(e) => {
                    const nextDept = e.target.value as DepartmentKey;
                    setEditDept(nextDept);
                    if (isGenderSeparated(nextDept) && !editSection) {
                      setEditSection('male');
                    } else if (!isGenderSeparated(nextDept)) {
                      setEditSection(null);
                    }
                  }}
                  className="w-full bg-[#101013] border border-white/[0.1] py-2 px-3 rounded-md text-white focus:outline-none focus:border-[#d4af37]"
                >
                  {VALID_DEPARTMENTS.map((deptKey) => (
                    <option key={deptKey} value={deptKey}>
                      {DEPARTMENTS[deptKey].label}
                    </option>
                  ))}
                </select>
              </div>

              {isGenderSeparated(editDept) && (
                <div>
                  <label className="block text-neutral-300 uppercase font-mono tracking-wider mb-1">
                    Gender Division *
                  </label>
                  <div className="flex items-center gap-4 p-2 bg-[#101013] border border-white/[0.1] rounded-md">
                    <label className="flex items-center gap-2 cursor-pointer text-neutral-200">
                      <input
                        type="radio"
                        name="edit-section"
                        value="male"
                        checked={editSection === 'male'}
                        onChange={() => setEditSection('male')}
                        className="accent-[#d4af37]"
                      />
                      <span>Male Division</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-neutral-200">
                      <input
                        type="radio"
                        name="edit-section"
                        value="female"
                        checked={editSection === 'female'}
                        onChange={() => setEditSection('female')}
                        className="accent-[#d4af37]"
                      />
                      <span>Female Division</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-neutral-300 uppercase font-mono tracking-wider mb-1">
                  Access Status
                </label>
                <div className="flex items-center gap-4 p-2 bg-[#101013] border border-white/[0.1] rounded-md">
                  <label className="flex items-center gap-2 cursor-pointer text-emerald-300">
                    <input
                      type="radio"
                      name="edit-active"
                      checked={editActive}
                      onChange={() => setEditActive(true)}
                      className="accent-emerald-500"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-400">
                    <input
                      type="radio"
                      name="edit-active"
                      checked={!editActive}
                      onChange={() => setEditActive(false)}
                      className="accent-red-500"
                    />
                    <span>Inactive (Suspended)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.07]">
              <button
                type="button"
                onClick={() => setEditingHead(null)}
                className="px-4 py-2 text-xs font-mono uppercase text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] hover:bg-[#e2c258] rounded-md cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PASSWORD RESET MODAL */}
      {resetTarget && (
        <div className="wm-overlay-in fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 sm:p-6">
          <div className="bg-[#0c0c0f] border border-[#d4af37]/40 rounded-md p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#d4af37]" />
                <h3 className="wm-serif text-lg text-white">Administrative Password Reset</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              Reset credentials for <strong className="text-white">{resetTarget.head_name || resetTarget.email}</strong> ({resetTarget.email}). Existing passwords are never stored in plaintext and cannot be displayed.
            </p>

            {resetError && (
              <div className="p-2.5 bg-red-950/50 border border-red-500/40 text-red-300 text-xs rounded-md">
                {resetError}
              </div>
            )}

            {resetResult && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs rounded-md space-y-2">
                <div className="font-medium">{resetResult.message}</div>
                {resetResult.link && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[#f3e5ab]">
                      <span>Password Reset Link (Valid for 48 hours):</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(resetResult.link!);
                          setResetCopied(true);
                          setTimeout(() => setResetCopied(false), 2500);
                        }}
                        className="text-[10px] font-mono text-[#d4af37] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {resetCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{resetCopied ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                    </div>
                    <div className="p-2 bg-black/60 rounded-xs font-mono text-[10px] break-all select-all text-white border border-white/[0.07]">
                      {resetResult.link}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 uppercase font-mono tracking-wider mb-1">
                  New Password (Optional, or leave empty to generate recovery link)
                </label>
                <input
                  type="text"
                  placeholder="Min 8 characters (or leave blank for link)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#101013] border border-white/[0.1] py-2 px-3 rounded-md text-white font-mono focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.07]">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 text-xs font-mono uppercase text-neutral-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecutePasswordReset}
                disabled={resettingPassword}
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] hover:bg-[#e2c258] rounded-md cursor-pointer disabled:opacity-50"
              >
                {resettingPassword
                  ? 'Processing…'
                  : newPassword
                  ? 'Set New Password'
                  : 'Generate Recovery Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DELETE / REVOKE CONFIRMATION MODAL */}
      {deletingHead && (
        <div className="wm-overlay-in fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 sm:p-6">
          <div className="bg-[#0c0c0f] border border-red-500/40 rounded-md p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-400 border-b border-white/[0.07] pb-3">
              <AlertCircle className="w-5 h-5" />
              <h3 className="wm-serif text-lg text-white">Revoke Portal Access?</h3>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed font-light">
              Are you sure you want to permanently delete the department head account for{' '}
              <strong className="text-white">{deletingHead.head_name || deletingHead.email}</strong>?
            </p>

            <div className="p-3 bg-neutral-900 border border-white/[0.07] text-[11px] text-neutral-400 rounded-md space-y-1">
              <div>Department: <span className="text-white">{DEPARTMENTS[deletingHead.department]?.label}</span></div>
              {deletingHead.section && <div>Division: <span className="text-white">{deletingHead.section.toUpperCase()}</span></div>}
              <div className="text-[#e5c158] pt-1">
                This permanently deletes the Supabase login and removes its head, admin, and EB/pass assignments. Candidate applications and delegate records remain intact.
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-red-950/50 border border-red-500/40 text-red-300 text-xs rounded-md">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.07]">
              <button
                type="button"
                onClick={() => setDeletingHead(null)}
                className="px-4 py-2 text-xs font-mono uppercase text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-red-700 hover:bg-red-600 rounded-md cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Revoking…' : 'Revoke Authorization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminManager;
