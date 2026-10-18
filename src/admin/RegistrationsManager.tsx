import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Shield,
  Camera,
  HeartHandshake,
  GraduationCap,
  Calendar,
  X,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cardCls, btnGold, btnGhost, btnDanger, inputCls, labelCls, explainError, type Row } from './ui';
import { downloadText, toCsv } from '../lib/safe';

export interface UnifiedRegistration extends Row {
  _type: 'delegate' | 'team';
  _teamId: string;
  _teamLabel: string;
}

interface RegistrationsManagerProps {
  delegates: Row[];
  teamRegistrations: Row[];
  loading: boolean;
  onRefresh: () => void;
  selectedApp?: { app: any; type: 'delegate' | 'team' } | null;
  onClearSelectedApp?: () => void;
}

export const RegistrationsManager: React.FC<RegistrationsManagerProps> = ({
  delegates,
  teamRegistrations,
  loading,
  onRefresh,
  selectedApp,
  onClearSelectedApp,
}) => {
  // Filters & Search
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'status'>('date_desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Detail Modal & Draft state
  const [activeItem, setActiveItem] = useState<UnifiedRegistration | null>(null);
  const [draftStatus, setDraftStatus] = useState<string>('received');
  const [draftNotes, setDraftNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [modalNotice, setModalNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Confirmation modal
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject' | 'delete';
    title: string;
    description: string;
  } | null>(null);

  // If a parent requested opening an application
  React.useEffect(() => {
    if (selectedApp?.app) {
      const isTeam = selectedApp.type === 'team';
      const item: UnifiedRegistration = {
        ...selectedApp.app,
        _type: selectedApp.type,
        _teamId: isTeam ? selectedApp.app.team : 'delegates',
        _teamLabel: isTeam
          ? selectedApp.app.team === 'security'
            ? 'Security Team'
            : selectedApp.app.team === 'media'
            ? 'Media Team'
            : selectedApp.app.team === 'volunteers'
            ? 'Volunteers Team'
            : String(selectedApp.app.team)
          : selectedApp.app.tier === 'early_bird'
          ? 'Early Bird Delegate'
          : 'Regular Delegate',
      };
      setActiveItem(item);
      setDraftStatus(item.status || 'received');
      setDraftNotes(item.admin_notes || '');
      setModalNotice(null);
    }
  }, [selectedApp]);

  // Consolidate delegate and team records into one unified list
  const unifiedList: UnifiedRegistration[] = useMemo(() => {
    const list: UnifiedRegistration[] = [
      ...delegates.map((d) => ({
        ...d,
        _type: 'delegate' as const,
        _teamId: 'delegates',
        _teamLabel: d.tier === 'early_bird' ? 'Early Bird Delegate' : 'Regular Delegate',
      })),
      ...teamRegistrations.map((t) => ({
        ...t,
        _type: 'team' as const,
        _teamId: String(t.team),
        _teamLabel:
          t.team === 'security'
            ? 'Security Team'
            : t.team === 'media'
            ? 'Media Team'
            : t.team === 'volunteers'
            ? 'Volunteers Team'
            : String(t.team),
      })),
    ];

    return list;
  }, [delegates, teamRegistrations]);

  // Filter and sort records
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();

    return unifiedList.filter((item) => {
      // Search
      if (q) {
        const matches = [
          item.full_name,
          item.email,
          item.institution,
          item.phone,
          item.id,
          item._teamLabel,
        ].some((val) => String(val || '').toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Team filter
      if (teamFilter !== 'all' && item._teamId !== teamFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && item.status !== 'received' && item.status !== 'under_review') {
          return false;
        } else if (statusFilter === 'approved' && item.status !== 'accepted') {
          return false;
        } else if (statusFilter !== 'pending' && statusFilter !== 'approved' && item.status !== statusFilter) {
          return false;
        }
      }

      // Date range filter
      if (startDate) {
        const itemDate = new Date(item.created_at).toISOString().slice(0, 10);
        if (itemDate < startDate) return false;
      }
      if (endDate) {
        const itemDate = new Date(item.created_at).toISOString().slice(0, 10);
        if (itemDate > endDate) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name_asc') {
        return String(a.full_name || '').localeCompare(String(b.full_name || ''));
      }
      if (sortBy === 'date_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'status') {
        return String(a.status || '').localeCompare(String(b.status || ''));
      }
      // default: date_desc
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [unifiedList, search, teamFilter, statusFilter, startDate, endDate, sortBy]);

  // Paginated items
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));

  const openModal = (item: UnifiedRegistration) => {
    setActiveItem(item);
    setDraftStatus(item.status || 'received');
    setDraftNotes(item.admin_notes || '');
    setModalNotice(null);
  };

  const closeModal = () => {
    setActiveItem(null);
    setConfirmAction(null);
    setModalNotice(null);
    if (onClearSelectedApp) onClearSelectedApp();
  };

  // Persist status and notes change to Supabase
  const saveApplication = async (newStatus?: string) => {
    if (!activeItem || !supabase) return;
    const targetStatus = newStatus || draftStatus;
    const table = activeItem._type === 'delegate' ? 'delegates' : 'team_registrations';

    setSaving(true);
    setModalNotice(null);

    const { error } = await supabase
      .from(table)
      .update({
        status: targetStatus,
        admin_notes: draftNotes.trim(),
      })
      .eq('id', activeItem.id);

    setSaving(false);

    if (error) {
      setModalNotice({ type: 'error', text: explainError(error) });
      return;
    }

    setDraftStatus(targetStatus);
    setActiveItem((prev) => (prev ? { ...prev, status: targetStatus, admin_notes: draftNotes.trim() } : null));
    setModalNotice({ type: 'success', text: `Application successfully updated to ${targetStatus.toUpperCase()}.` });
    onRefresh();
  };

  // Delete application
  const deleteApplication = async () => {
    if (!activeItem || !supabase) return;
    const table = activeItem._type === 'delegate' ? 'delegates' : 'team_registrations';

    setSaving(true);
    const { error } = await supabase.from(table).delete().eq('id', activeItem.id);
    setSaving(false);

    if (error) {
      setModalNotice({ type: 'error', text: explainError(error) });
      setConfirmAction(null);
      return;
    }

    closeModal();
    onRefresh();
  };

  const exportFilteredCsv = () => {
    const head = [
      'id',
      'category',
      'team',
      'full_name',
      'email',
      'phone',
      'institution',
      'status',
      'experience',
      'statement',
      'admin_notes',
      'submitted_at',
    ];

    const body = filteredList.map((item) => [
      item.id,
      item._type === 'delegate' ? 'Delegate' : 'Staff',
      item._teamLabel,
      item.full_name,
      item.email,
      item.phone || 'N/A',
      item.institution,
      item.status,
      item.experience || '',
      item.statement || '',
      item.admin_notes || '',
      item.created_at,
    ]);

    downloadText(
      `west-mun-registrations-${teamFilter}-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([head, ...body])
    );
  };

  const getTeamIcon = (teamId: string) => {
    switch (teamId) {
      case 'security':
        return <Shield className="w-3.5 h-3.5 text-blue-400" />;
      case 'media':
        return <Camera className="w-3.5 h-3.5 text-purple-400" />;
      case 'volunteers':
        return <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <GraduationCap className="w-3.5 h-3.5 text-[#d4af37]" />;
    }
  };

  const statusPill = (st: string) => {
    switch (st) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-red-950/60 text-red-400 border border-red-500/40">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-sky-950/60 text-sky-400 border border-sky-500/40">
            <Clock className="w-3 h-3" /> Under Review
          </span>
        );
      case 'waitlisted':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-amber-950/60 text-amber-400 border border-amber-500/40">
            <AlertCircle className="w-3 h-3" /> Waitlisted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-neutral-900 text-neutral-300 border border-neutral-700">
            <Clock className="w-3 h-3 text-neutral-400" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-[1px] bg-[#d4af37]" />
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#d4af37] font-semibold">
              Delegate & Team Registry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">Registration Records</h1>
          <p className="text-xs text-neutral-400 mt-1 font-light">
            Search, review, approve, or reject candidate applications with audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onRefresh} className={btnGhost}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={exportFilteredCsv}
            disabled={filteredList.length === 0}
            className={btnGold}
          >
            <Download className="w-3.5 h-3.5" /> CSV ({filteredList.length})
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className={`${cardCls} p-4 space-y-3`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, email, school, ID…"
              className={`${inputCls} pl-9`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Team / Category Filter */}
          <div className="lg:col-span-3">
            <select
              className={inputCls}
              value={teamFilter}
              onChange={(e) => {
                setTeamFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Teams & Categories</option>
              <option value="delegates">Delegates (Early Bird & Regular)</option>
              <option value="security">Security Team</option>
              <option value="media">Media & Press Team</option>
              <option value="volunteers">Conference Volunteers</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-3">
            <select
              className={inputCls}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Application Statuses</option>
              <option value="pending">Pending (Received / Under Review)</option>
              <option value="approved">Approved / Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="lg:col-span-2">
            <select
              className={inputCls}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {/* Date Range Sub-Bar */}
        <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Submission Date Range:</span>
            <input
              type="date"
              className="bg-[#141418] border border-neutral-700 text-white px-2 py-1 text-xs rounded-sm focus:border-[#d4af37]"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
            <span>to</span>
            <input
              type="date"
              className="bg-[#141418] border border-neutral-700 text-white px-2 py-1 text-xs rounded-sm focus:border-[#d4af37]"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[#d4af37] hover:underline ml-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="font-mono text-neutral-400">
            Showing <strong className="text-white">{filteredList.length}</strong> of{' '}
            <strong className="text-white">{unifiedList.length}</strong> records
          </div>
        </div>
      </div>

      {/* Registrations Table */}
      <div className={`${cardCls} overflow-x-auto`}>
        {loading ? (
          <div className="p-12 text-center text-neutral-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#d4af37]" /> Loading registration records…
          </div>
        ) : paginatedList.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-sm space-y-2">
            <AlertCircle className="w-8 h-8 text-neutral-600 mx-auto mb-1" />
            <p>{unifiedList.length === 0 ? 'No applications have been registered yet.' : 'No applications match your selected filters.'}</p>
            {unifiedList.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setTeamFilter('all');
                  setStatusFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-[#d4af37] hover:underline cursor-pointer"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121216] border-b border-neutral-800 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              <tr>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Team / Category</th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {paginatedList.map((item) => (
                <tr key={`${item._type}-${item.id}`} className="hover:bg-neutral-800/30 transition-colors">
                  {/* Applicant Name & Email */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{item.full_name}</div>
                    <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{item.email}</div>
                  </td>

                  {/* Team */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#15151a] border border-neutral-800 text-[#d4af37]">
                      {getTeamIcon(item._teamId)}
                      <span className="font-mono text-[11px]">{item._teamLabel}</span>
                    </div>
                  </td>

                  {/* Institution */}
                  <td className="py-3.5 px-4 max-w-[12rem] truncate text-neutral-300">
                    {item.institution || '—'}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">{statusPill(item.status)}</td>

                  {/* Submitted Date */}
                  <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openModal(item)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono uppercase bg-neutral-800 hover:bg-[#d4af37] hover:text-black text-neutral-200 rounded-sm transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Bar */}
        {filteredList.length > 0 && (
          <div className="p-3.5 border-t border-neutral-800 bg-[#101014] flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                className="bg-[#141418] border border-neutral-700 text-white rounded-sm px-2 py-0.5 text-xs"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1 border border-neutral-700 rounded-sm hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 border border-neutral-700 rounded-sm hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      {activeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className={`${cardCls} max-w-2xl w-full my-8 p-6 sm:p-7 shadow-2xl border-[#d4af37]/40 relative`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]">
                    {activeItem._type === 'delegate' ? 'Delegate Dossier' : 'Staff Application'}
                  </span>
                  <span>·</span>
                  <span className="text-[10px] font-mono text-neutral-500">ID: {activeItem.id}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif text-white">{activeItem.full_name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-neutral-400">
                  <span className="text-white font-mono">{activeItem.email}</span>
                  {activeItem.phone && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-neutral-300">{activeItem.phone}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{activeItem.institution}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                aria-label="Close application modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Banner */}
            {modalNotice && (
              <div
                className={`mt-4 p-3 text-xs rounded-sm border ${
                  modalNotice.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/40 border-red-500/40 text-red-300'
                }`}
              >
                {modalNotice.text}
              </div>
            )}

            {/* Application Data Grid */}
            <div className="py-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-[#121217] border border-neutral-800/80 rounded-sm text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-mono">Assigned Category</span>
                  <span className="text-[#d4af37] font-semibold">{activeItem._teamLabel}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-mono">Current Status</span>
                  <div className="mt-0.5">{statusPill(activeItem.status)}</div>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-mono">Submission Timestamp</span>
                  <span className="text-neutral-300 font-mono">
                    {activeItem.created_at ? new Date(activeItem.created_at).toLocaleString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-mono">Age / Legal Confirmation</span>
                  <span className="text-neutral-300 font-mono">{activeItem.age_confirmed ? 'Verified' : 'Unconfirmed'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-mono">Consent Version</span>
                  <span className="text-neutral-300 font-mono">{activeItem.consent_version || '2026-10-17'}</span>
                </div>
                {activeItem._type === 'delegate' && (
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-mono">Delegation Type</span>
                    <span className="text-neutral-300 capitalize">{activeItem.delegation_type || 'Single'}</span>
                  </div>
                )}
              </div>

              {/* Team specific statement / experience */}
              {activeItem.experience && (
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">
                    Relevant Prior Experience
                  </h4>
                  <div className="p-3 bg-[#121217] border border-neutral-800 rounded-sm text-xs text-neutral-200 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {activeItem.experience}
                  </div>
                </div>
              )}

              {activeItem.statement && (
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">
                    Statement of Motivation
                  </h4>
                  <div className="p-3 bg-[#121217] border border-neutral-800 rounded-sm text-xs text-neutral-200 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {activeItem.statement}
                  </div>
                </div>
              )}

              {/* Status Decision Controls */}
              <div className="pt-3 border-t border-neutral-800/80">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold">
                    Secretariat Adjudication
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmAction({
                          type: 'approve',
                          title: `Approve Application for ${activeItem.full_name}?`,
                          description: `This marks the candidate as accepted for ${activeItem._teamLabel}.`,
                        })
                      }
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/50 rounded-sm cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve Application
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmAction({
                          type: 'reject',
                          title: `Reject Application for ${activeItem.full_name}?`,
                          description: `This marks the candidate as rejected for ${activeItem._teamLabel}.`,
                        })
                      }
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-red-300 bg-red-950/60 hover:bg-red-900/80 border border-red-500/50 rounded-sm cursor-pointer transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject Application
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelCls}>Fine-grained Status</label>
                    <select
                      className={inputCls}
                      value={draftStatus}
                      onChange={(e) => setDraftStatus(e.target.value)}
                    >
                      <option value="received">Received / Pending</option>
                      <option value="under_review">Under review</option>
                      <option value="accepted">Accepted / Approved</option>
                      <option value="waitlisted">Waitlisted</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Internal Administrative Notes (Private)</label>
                    <textarea
                      rows={2}
                      className={inputCls}
                      placeholder="Add private evaluation notes, interview results, or dais instructions…"
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    type: 'delete',
                    title: `Permanently Delete Application for ${activeItem.full_name}?`,
                    description: 'This permanently removes the record from the database and cannot be undone.',
                  })
                }
                className="text-xs text-red-400 hover:text-red-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete record
              </button>

              <div className="flex items-center gap-2">
                <button type="button" onClick={closeModal} className={btnGhost}>
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => saveApplication()}
                  disabled={saving}
                  className={btnGold}
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>

            {/* Confirmation Dialog Overlay */}
            {confirmAction && (
              <div
                className="absolute inset-0 z-20 bg-black/90 flex items-center justify-center p-6 rounded-sm"
                role="dialog"
                aria-modal="true"
              >
                <div className="bg-[#121217] border border-neutral-700 p-5 rounded-sm max-w-sm w-full space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">{confirmAction.title}</h4>
                      <p className="text-xs text-neutral-400 mt-1 font-light leading-relaxed">
                        {confirmAction.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setConfirmAction(null)}
                      className={btnGhost}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmAction.type === 'approve') {
                          saveApplication('accepted');
                          setConfirmAction(null);
                        } else if (confirmAction.type === 'reject') {
                          saveApplication('rejected');
                          setConfirmAction(null);
                        } else if (confirmAction.type === 'delete') {
                          deleteApplication();
                        }
                      }}
                      className={confirmAction.type === 'approve' ? btnGold : btnDanger}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
