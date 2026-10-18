import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Shield,
  ShieldCheck,
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
} from 'lucide-react';
import { supabase } from '../lib/supabase';
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

  const currentUserEmail = session?.user?.email?.toLowerCase().trim() || '';
  const isAuthorizedCaller = isSuperAdmin && currentUserEmail === SUPER_ADMIN_EMAIL.toLowerCase();

  // Load department heads list from authoritative server endpoint
  const loadHeads = useCallback(async () => {
    if (!isAuthorizedCaller || !session) return;
    setRefreshing(true);

    try {
      const response = await fetch('/api/super-admin', {
        headers: {
          Authorization: `Bearer ${session.access_token || 'secretariat-master'}`,
          'x-admin-email': currentUserEmail || SUPER_ADMIN_EMAIL,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.heads) {
          setHeads(data.heads);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      } else {
        const errJson = await response.json().catch(() => null);
        console.error('Failed to load heads from server:', errJson?.error);
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
    setCreating(true);

    const cleanEmail = formEmail.trim().toLowerCase();
    const cleanName = formName.trim();
    const sec = isGenderSeparated(formDept) ? formSection : null;
    const isInvite = authMethod === 'invite';
    const cleanPassword = isInvite ? '' : formPassword.trim();

    try {
      const response = await fetch('/api/super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token || 'secretariat-master'}`,
          'x-admin-email': currentUserEmail || SUPER_ADMIN_EMAIL,
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create department head account.');
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
      const response = await fetch(`/api/super-admin?action=update&id=${headId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token || 'secretariat-master'}`,
          'x-admin-email': currentUserEmail || SUPER_ADMIN_EMAIL,
        },
        body: JSON.stringify({
          fullName: editName,
          department: editDept,
          section: sec,
          active: editActive,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update department head assignment.');
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
      const response = await fetch(`/api/super-admin?action=update&id=${headId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token || 'secretariat-master'}`,
          'x-admin-email': currentUserEmail || SUPER_ADMIN_EMAIL,
        },
        body: JSON.stringify({
          active: newStatus,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to change account status.');
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
      const response = await fetch(`/api/super-admin?action=reset-password&id=${headId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token || 'secretariat-master'}`,
          'x-admin-email': currentUserEmail || SUPER_ADMIN_EMAIL,
        },
        body: JSON.stringify({
          newPassword: newPassword || undefined,
          generateLink: !newPassword,
          email: resetTarget.email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Password reset failed.');
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

  // Handle Delete / Revoke Head
  const handleConfirmDelete = async () => {
    if (!deletingHead || !session) return;
    setDeleting(true);
    setDeleteError('');

    const headId = deletingHead.id || deletingHead.user_id;

    try {
      const response = await fetch(`/api/super-admin?action=delete&id=${headId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token || 'secretariat-master'}`,
          'x-admin-email': currentUserEmail || SUPER_ADMIN_EMAIL,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove head assignment.');
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
      <div className="bg-[#0c0c10] border border-red-500/30 rounded-sm p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-950/40 border border-red-500/50 flex items-center justify-center text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.25)]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-serif text-white tracking-tight">Access Restricted</h2>
          <p className="text-xs uppercase font-mono tracking-widest text-[#d4af37]">
            IT Super Admin Console
          </p>
        </div>
        <div className="p-4 bg-[#121217] border border-neutral-800 rounded-sm text-xs text-neutral-300 leading-relaxed space-y-2">
          <p>
            This section is restricted to the top-level conference administrator{' '}
            <strong className="text-white font-mono">{SUPER_ADMIN_EMAIL}</strong>.
          </p>
          <div className="pt-2 border-t border-neutral-800/80 font-mono text-[11px] text-neutral-400">
            Current Authenticated User:{' '}
            <span className="text-red-300">{currentUserEmail || 'Signed Out'}</span>
          </div>
        </div>
        <p className="text-[11px] text-neutral-500 italic">
          Identity is verified both client-side and via server-side cryptographic token validation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="bg-[#0c0c10] border border-[#d4af37]/40 rounded-sm p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-sm bg-[#141418] border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37] shrink-0 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">
                  IT Super Admin Dashboard
                </h1>
                <span className="px-2 py-0.5 rounded-sm bg-[#17171d] border border-[#d4af37]/40 text-[#d4af37] text-[10px] font-mono uppercase tracking-widest">
                  Master Privileges
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-light">
                Department Head identity provisioning, password resets, and real-time division access control.
              </p>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-[#f3e5ab]">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Authorized Administrator: {SUPER_ADMIN_EMAIL}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadHeads}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono uppercase tracking-wider text-neutral-300 hover:text-white bg-[#141418] hover:bg-neutral-800 border border-neutral-700 rounded-sm cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#d4af37]' : ''}`} />
              <span>Refresh Roster</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Overview Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0c0c10] border border-neutral-800 p-4 rounded-sm shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">
            Total Head Accounts
          </span>
          <span className="text-2xl font-serif text-white font-semibold">{stats.total}</span>
        </div>
        <div className="bg-[#0c0c10] border border-neutral-800 p-4 rounded-sm shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block mb-1">
            Active Portal Access
          </span>
          <span className="text-2xl font-serif text-emerald-300 font-semibold">{stats.active}</span>
        </div>
        <div className="bg-[#0c0c10] border border-neutral-800 p-4 rounded-sm shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 block mb-1">
            Suspended / Inactive
          </span>
          <span className="text-2xl font-serif text-red-300 font-semibold">{stats.inactive}</span>
        </div>
        <div className="bg-[#0c0c10] border border-neutral-800 p-4 rounded-sm shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] block mb-1">
            Gender-Divided Roles
          </span>
          <span className="text-2xl font-serif text-[#f3e5ab] font-semibold">
            {stats.genderSeparatedCount}
          </span>
        </div>
      </div>

      {/* 3. Provision New Head Account Form */}
      <div className="bg-[#0c0c10] border border-neutral-800 rounded-sm p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-lg font-serif text-white tracking-tight">
              Provision New Department Head Account
            </h2>
          </div>
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
            Server-Side Verified
          </span>
        </div>

        {formError && (
          <div className="p-3.5 text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3.5 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 rounded-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{formSuccess}</span>
          </div>
        )}

        {recentCredentials && (
          <div className="p-4 bg-[#121217] border border-[#d4af37]/40 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-[#d4af37] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Account Created — Copy Credentials to Dispatch:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono uppercase bg-[#1a1710] border border-[#d4af37]/60 text-[#f3e5ab] hover:brightness-110 rounded-sm cursor-pointer transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono bg-black/40 p-3 rounded-sm border border-neutral-800">
              <div><span className="text-neutral-500">Name:</span> <span className="text-white">{recentCredentials.name}</span></div>
              <div><span className="text-neutral-500">Email:</span> <span className="text-white">{recentCredentials.email}</span></div>
              <div><span className="text-neutral-500">Department:</span> <span className="text-[#d4af37]">{recentCredentials.department}</span></div>
              <div><span className="text-neutral-500">Division:</span> <span className="text-[#f3e5ab]">{recentCredentials.section ? `${recentCredentials.section.toUpperCase()}` : 'None (Universal)'}</span></div>
              {recentCredentials.invitationLink ? (
                <div className="sm:col-span-2 p-2.5 bg-[#171610] border border-[#d4af37]/50 rounded-sm space-y-1">
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
                  <div className="text-emerald-300 font-mono text-[11px] break-all select-all bg-black/50 p-2 rounded-xs border border-neutral-800">
                    {recentCredentials.invitationLink}
                  </div>
                </div>
              ) : (
                <div className="sm:col-span-2"><span className="text-neutral-500">Temporary Password:</span> <span className="text-emerald-300 font-semibold select-all">{recentCredentials.password}</span></div>
              )}
              <div className="sm:col-span-2 truncate"><span className="text-neutral-500">Portal Link:</span> <a href={recentCredentials.portalUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{recentCredentials.portalUrl}</a></div>
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
                className={`p-3 text-left rounded-sm border transition-all cursor-pointer flex items-start gap-2.5 ${
                  authMethod === 'invite'
                    ? 'bg-[#181610] border-[#d4af37] text-white shadow-xs'
                    : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <KeyRound className={`w-4 h-4 mt-0.5 shrink-0 ${authMethod === 'invite' ? 'text-[#d4af37]' : 'text-neutral-500'}`} />
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
                className={`p-3 text-left rounded-sm border transition-all cursor-pointer flex items-start gap-2.5 ${
                  authMethod === 'password'
                    ? 'bg-[#181610] border-[#d4af37] text-white shadow-xs'
                    : 'bg-[#121217] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${authMethod === 'password' ? 'text-[#d4af37]' : 'text-neutral-500'}`} />
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
                className="w-full bg-[#141418] border border-neutral-700 focus:border-[#d4af37] rounded-sm py-2 px-3 text-sm text-white focus:outline-none transition-colors"
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
                className="w-full bg-[#141418] border border-neutral-700 focus:border-[#d4af37] rounded-sm py-2 px-3 text-sm text-white focus:outline-none transition-colors"
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
                    className="w-full bg-[#141418] border border-neutral-700 focus:border-[#d4af37] rounded-sm py-2 pl-3 pr-10 text-sm text-white focus:outline-none font-mono transition-colors"
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
              <div className="p-3 bg-[#121217] border border-neutral-800 rounded-sm flex items-start gap-2.5">
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
                className="w-full bg-[#141418] border border-neutral-700 focus:border-[#d4af37] rounded-sm py-2 px-3 text-sm text-white focus:outline-none transition-colors"
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
                <div className="flex items-center gap-4 p-2 bg-[#141418] border border-[#d4af37]/40 rounded-sm">
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
                <div className="p-2 bg-[#121217] border border-neutral-800 rounded-sm text-xs text-neutral-500 font-mono">
                  Universal / Single Leadership
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">
                Initial Account Status
              </label>
              <div className="flex items-center gap-4 p-2 bg-[#141418] border border-neutral-700 rounded-sm">
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
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-black bg-gradient-to-r from-[#e5c158] to-[#d4af37] hover:brightness-110 rounded-sm cursor-pointer transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50"
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
      </div>

      {/* 4. Department Heads Directory */}
      <div className="bg-[#0c0c10] border border-neutral-800 rounded-sm p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
          <div>
            <h2 className="text-lg font-serif text-white tracking-tight">
              Department Heads Registry ({filteredHeads.length})
            </h2>
            <p className="text-xs text-neutral-400 font-light">
              Manage existing head assignments, toggle instant portal access, or initiate secure credential resets.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#141418] border border-neutral-700 rounded-sm pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37] w-40 sm:w-48"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-[#141418] border border-neutral-700 rounded-sm px-2.5 py-1 text-xs text-white focus:outline-none"
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
              className="bg-[#141418] border border-neutral-700 rounded-sm px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Heads Table */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
            <Loader2 className="w-5 h-5 animate-spin text-[#d4af37]" />
            <span className="text-xs font-mono">Loading Head Roster…</span>
          </div>
        ) : filteredHeads.length === 0 ? (
          <div className="py-10 text-center text-xs text-neutral-500 font-light">
            No department head records match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
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
                    <tr key={h.id || h.email} className="hover:bg-[#121217] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-white">
                          {h.head_name || <span className="text-neutral-500 italic">No name registered</span>}
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
                            className={`px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider ${
                              h.section === 'female'
                                ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40'
                                : 'bg-blue-950/60 text-blue-300 border border-blue-500/40'
                            }`}
                          >
                            {h.section.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-neutral-500 font-mono text-[11px]">All / Joint</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(h)}
                          title="Click to toggle active status"
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider cursor-pointer border transition-colors ${
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
                          <button
                            type="button"
                            onClick={() => openEditModal(h)}
                            title="Edit Role / Department"
                            className="p-1.5 text-neutral-400 hover:text-[#d4af37] bg-neutral-900 hover:bg-[#1a1710] border border-neutral-800 rounded-sm transition-colors cursor-pointer"
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
                            className="p-1.5 text-neutral-400 hover:text-[#e5c158] bg-neutral-900 hover:bg-[#1a1710] border border-neutral-800 rounded-sm transition-colors cursor-pointer"
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
                            className="p-1.5 text-neutral-400 hover:text-red-400 bg-neutral-900 hover:bg-red-950/50 border border-neutral-800 rounded-sm transition-colors cursor-pointer"
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
      </div>

      {/* 5. EDIT HEAD MODAL */}
      {editingHead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0c0c10] border border-[#d4af37]/40 rounded-sm p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-serif text-lg text-white">Edit Department Head Assignment</h3>
              <button
                type="button"
                onClick={() => setEditingHead(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-2.5 bg-red-950/50 border border-red-500/40 text-red-300 text-xs rounded-sm">
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
                  className="w-full bg-[#141418] border border-neutral-800 text-neutral-400 py-2 px-3 rounded-sm font-mono opacity-60"
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
                  className="w-full bg-[#141418] border border-neutral-700 py-2 px-3 rounded-sm text-white focus:outline-none focus:border-[#d4af37]"
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
                  className="w-full bg-[#141418] border border-neutral-700 py-2 px-3 rounded-sm text-white focus:outline-none focus:border-[#d4af37]"
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
                  <div className="flex items-center gap-4 p-2 bg-[#141418] border border-neutral-700 rounded-sm">
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
                <div className="flex items-center gap-4 p-2 bg-[#141418] border border-neutral-700 rounded-sm">
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

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
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
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] hover:brightness-110 rounded-sm cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PASSWORD RESET MODAL */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0c0c10] border border-[#d4af37]/40 rounded-sm p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#d4af37]" />
                <h3 className="font-serif text-lg text-white">Administrative Password Reset</h3>
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
              <div className="p-2.5 bg-red-950/50 border border-red-500/40 text-red-300 text-xs rounded-sm">
                {resetError}
              </div>
            )}

            {resetResult && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs rounded-sm space-y-2">
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
                    <div className="p-2 bg-black/60 rounded-xs font-mono text-[10px] break-all select-all text-white border border-neutral-800">
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
                  className="w-full bg-[#141418] border border-neutral-700 py-2 px-3 rounded-sm text-white font-mono focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
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
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] hover:brightness-110 rounded-sm cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0c0c10] border border-red-500/40 rounded-sm p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-400 border-b border-neutral-800 pb-3">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-serif text-lg text-white">Revoke Portal Access?</h3>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed font-light">
              Are you sure you want to revoke department head authorization for{' '}
              <strong className="text-white">{deletingHead.head_name || deletingHead.email}</strong>?
            </p>

            <div className="p-3 bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 rounded-sm space-y-1">
              <div>Department: <span className="text-white">{DEPARTMENTS[deletingHead.department]?.label}</span></div>
              {deletingHead.section && <div>Division: <span className="text-white">{deletingHead.section.toUpperCase()}</span></div>}
              <div className="text-[#e5c158] pt-1">
                Note: Candidate applications and delegate records will NOT be deleted. Only this account's head portal access will be terminated.
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-red-950/50 border border-red-500/40 text-red-300 text-xs rounded-sm">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
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
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-red-700 hover:bg-red-600 rounded-sm cursor-pointer disabled:opacity-50"
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
