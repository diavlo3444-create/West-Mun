import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LogOut,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Lock,
  Unlock,
  Shield,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Check,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  DEPARTMENTS,
  isGenderSeparated,
  type DepartmentKey,
  type SectionKey,
} from './departments';
import { downloadText, toCsv } from '../lib/safe';

interface DepartmentDashboardProps {
  department: DepartmentKey;
  section?: SectionKey | null;
  headName?: string;
  headEmail?: string;
  onSignOut: () => void;
}

interface RegistrationRow {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone?: string;
  institution: string;
  team: string;
  section?: SectionKey | null;
  status: string;
  experience?: string;
  statement?: string;
  admin_notes?: string;
  age_confirmed?: boolean;
  consent_version?: string;
}

export const DepartmentDashboard: React.FC<DepartmentDashboardProps> = ({
  department,
  section,
  headName,
  headEmail,
  onSignOut,
}) => {
  const meta = DEPARTMENTS[department];
  const Icon = meta.icon;
  const isGenderDivision = isGenderSeparated(department);

  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeItem, setActiveItem] = useState<RegistrationRow | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const loadDepartmentData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    try {
      // 1. Load registrations for this department only
      const teamQueryValues =
        department === 'media_press' ? ['media_press', 'media'] : [department];

      let query = supabase
        .from('team_registrations')
        .select('*')
        .in('team', teamQueryValues);

      // Filter by section if head is assigned to male/female division
      if (section) {
        query = query.eq('section', section);
      }

      const { data: teamData, error: teamErr } = await query.order('created_at', {
        ascending: false,
      });

      if (!teamErr && teamData) {
        setRegistrations(teamData as RegistrationRow[]);
      } else {
        setRegistrations([]);
      }

      // 2. Load settings for department registration open/closed status
      const { data: setRows } = await supabase.from('settings').select('*');
      if (setRows) {
        const dict: Record<string, string> = {};
        setRows.forEach((r: { key: string; value: string }) => {
          dict[r.key] = r.value;
        });
        setSettings(dict);
      }
    } catch {
      // Graceful error handling
    } finally {
      setLoading(false);
    }
  }, [department, section]);

  useEffect(() => {
    loadDepartmentData();
  }, [loadDepartmentData]);

  // Sync modal state when opening
  useEffect(() => {
    if (activeItem) {
      setEditNotes(activeItem.admin_notes || '');
      setEditStatus(activeItem.status || 'received');
    }
  }, [activeItem]);

  // Department open status
  const isOpen = (settings[meta.settingKey] ?? 'true').toLowerCase() === 'true';

  // Statistics
  const stats = useMemo(() => {
    const total = registrations.length;
    const pending = registrations.filter(
      (r) => r.status === 'received' || r.status === 'under_review'
    ).length;
    const approved = registrations.filter((r) => r.status === 'accepted').length;
    const rejected = registrations.filter((r) => r.status === 'rejected').length;
    const waitlisted = registrations.filter((r) => r.status === 'waitlisted').length;

    return { total, pending, approved, rejected, waitlisted };
  }, [registrations]);

  // Filtering
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter((item) => {
      if (q) {
        const matches = [
          item.full_name,
          item.email,
          item.institution,
          item.phone,
          item.id,
        ].some((val) => String(val || '').toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (statusFilter !== 'all') {
        if (
          statusFilter === 'pending' &&
          item.status !== 'received' &&
          item.status !== 'under_review'
        ) {
          return false;
        } else if (statusFilter === 'approved' && item.status !== 'accepted') {
          return false;
        } else if (
          statusFilter !== 'pending' &&
          statusFilter !== 'approved' &&
          item.status !== statusFilter
        ) {
          return false;
        }
      }

      return true;
    });
  }, [registrations, search, statusFilter]);

  // Pagination
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));

  const exportCsv = () => {
    const head = [
      'id',
      'full_name',
      'email',
      'phone',
      'institution',
      'department',
      'section',
      'status',
      'experience',
      'statement',
      'admin_notes',
      'submitted_at',
    ];
    const body = filteredList.map((r) => [
      r.id,
      r.full_name,
      r.email,
      r.phone || 'N/A',
      r.institution,
      meta.label,
      r.section || 'All',
      r.status,
      r.experience || '',
      r.statement || '',
      r.admin_notes || '',
      r.created_at,
    ]);

    const filename = section
      ? `westmun-${meta.slug}-${section}-registrations-${new Date().toISOString().slice(0, 10)}.csv`
      : `westmun-${meta.slug}-registrations-${new Date().toISOString().slice(0, 10)}.csv`;

    downloadText(filename, toCsv([head, ...body]));
  };

  const handleUpdateApplicant = async () => {
    if (!supabase || !activeItem) return;
    setSavingNotes(true);

    try {
      const { error } = await supabase
        .from('team_registrations')
        .update({
          status: editStatus,
          admin_notes: editNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeItem.id);

      if (!error) {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === activeItem.id
              ? { ...r, status: editStatus, admin_notes: editNotes }
              : r
          )
        );
        setActiveItem((prev) =>
          prev ? { ...prev, status: editStatus, admin_notes: editNotes } : null
        );
      }
    } catch {
      // Graceful error handling
    } finally {
      setSavingNotes(false);
    }
  };

  const statusBadge = (st: string) => {
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
    <div className="min-h-screen bg-[#070709] text-[#f5f5f5] font-sans antialiased pb-16">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-[#0a0a0d]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#121217] border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-serif font-semibold text-white tracking-wide leading-none">
                  WEST MUN <span className="text-[#d4af37]">2027</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-[#17171d] text-[#d4af37] border border-[#d4af37]/30">
                  Head Portal
                </span>
                {section && (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-[#1a1710] text-[#e5c158] border border-[#d4af37]/40 font-semibold">
                    {section.toUpperCase()} SECTION
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-neutral-400 mt-0.5 block truncate max-w-xs sm:max-w-none">
                {meta.label} {section ? `(${section.toUpperCase()} Head)` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 text-neutral-400 hover:text-[#d4af37] transition-colors"
            >
              <span>Website</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-neutral-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex flex-col text-left">
                {headName && (
                  <span className="font-serif text-xs text-white font-medium">
                    {headName}
                  </span>
                )}
                <span className="font-mono text-[10px] text-neutral-400 truncate max-w-[14rem]">
                  {headEmail || 'Authenticated Head'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-neutral-700 hover:border-red-500/50 hover:text-red-300 rounded-sm cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Department Banner & Controls */}
        <div className="bg-[#0c0c10] border border-neutral-800 rounded-sm p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-sm bg-[#141418] border border-[#d4af37]/50 flex items-center justify-center text-[#d4af37] shrink-0 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">
                  {meta.label}
                </h1>

                {section && (
                  <span className="px-2.5 py-0.5 rounded-sm bg-[#1a1710] border border-[#d4af37] text-[#f3e5ab] text-[10px] font-mono uppercase tracking-widest font-semibold">
                    {section.toUpperCase()} DIVISION
                  </span>
                )}

                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-sm border ${
                    isOpen
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {isOpen ? (
                    <Unlock className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Lock className="w-3 h-3 text-neutral-400" />
                  )}
                  <span>Registration: {isOpen ? 'Open' : 'Closed'}</span>
                </span>
              </div>

              {headName && (
                <div className="flex items-center gap-2 text-xs text-[#d4af37] font-medium mb-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Authorized Head: {headName}</span>
                </div>
              )}

              <p className="text-xs text-[#f3e5ab] font-mono tracking-wide mb-1">
                {meta.tagline}
              </p>
              <p className="text-xs text-neutral-400 font-light leading-relaxed max-w-2xl">
                {isGenderDivision && section
                  ? `Authorized command dashboard for the ${section.toUpperCase()} section of ${meta.label}. Candidate registrations for this division are strictly isolated by Row Level Security.`
                  : meta.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={loadDepartmentData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white rounded-sm cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredList.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] hover:bg-[#e5c158] rounded-sm cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-[#0c0c10] border border-neutral-800 rounded-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
              Total {section ? `${section.toUpperCase()} ` : ''}Applications
            </span>
            <div className="text-3xl font-semibold text-white tracking-tight tabular-nums">
              {stats.total}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 font-light">
              Registered for {section ? `this division` : `this department`}
            </p>
          </div>

          <div className="p-5 bg-[#0c0c10] border border-neutral-800 rounded-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 block mb-1">
              Pending Review
            </span>
            <div className="text-3xl font-semibold text-sky-300 tracking-tight tabular-nums">
              {stats.pending}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 font-light">
              Awaiting departmental adjudication
            </p>
          </div>

          <div className="p-5 bg-[#0c0c10] border border-neutral-800 rounded-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block mb-1">
              Approved Candidates
            </span>
            <div className="text-3xl font-semibold text-emerald-300 tracking-tight tabular-nums">
              {stats.approved}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 font-light">
              Accepted for conference staff
            </p>
          </div>

          <div className="p-5 bg-[#0c0c10] border border-neutral-800 rounded-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 block mb-1">
              Rejected / Declined
            </span>
            <div className="text-3xl font-semibold text-red-300 tracking-tight tabular-nums">
              {stats.rejected}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 font-light">
              Not selected for this team
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-[#0c0c10] border border-neutral-800 rounded-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search candidate name, email, institution, or phone…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#121216] border border-neutral-700 focus:border-[#d4af37] text-xs text-white placeholder-neutral-500 rounded-sm pl-8 pr-3 py-2 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-[#121216] border border-neutral-700 text-xs text-neutral-300 rounded-sm py-2 px-2.5 focus:border-[#d4af37] outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="waitlisted">Waitlisted</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-neutral-400 font-mono pt-1">
            Displaying <strong className="text-white">{filteredList.length}</strong> of{' '}
            <strong className="text-white">{registrations.length}</strong> candidate(s)
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-[#0c0c10] border border-neutral-800 rounded-sm overflow-x-auto shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-neutral-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#d4af37]" /> Loading candidates…
            </div>
          ) : paginatedList.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 text-sm space-y-2">
              <AlertCircle className="w-8 h-8 text-neutral-600 mx-auto mb-1" />
              <p>
                {registrations.length === 0
                  ? `No applications registered for ${meta.label}${section ? ` (${section} section)` : ''} yet.`
                  : 'No candidate applications match your current filters.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121216] border-b border-neutral-800 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Institution</th>
                  {isGenderDivision && <th className="py-3 px-4">Section</th>}
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {paginatedList.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{item.full_name}</div>
                      <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        {item.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-300 max-w-[12rem] truncate">
                      {item.institution || '—'}
                    </td>
                    {isGenderDivision && (
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block text-[9px] font-mono uppercase px-2 py-0.5 rounded-sm ${
                            item.section === 'male'
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                              : item.section === 'female'
                              ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                              : 'bg-neutral-900 text-neutral-400 border border-neutral-700'
                          }`}
                        >
                          {item.section ? item.section.toUpperCase() : 'Unassigned'}
                        </span>
                      </td>
                    )}
                    <td className="py-3.5 px-4 font-mono text-neutral-400">
                      {item.phone || '—'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {statusBadge(item.status)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setActiveItem(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono uppercase bg-neutral-800 hover:bg-[#d4af37] hover:text-black text-neutral-200 rounded-sm transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {filteredList.length > 0 && (
            <div className="p-3.5 border-t border-neutral-800 bg-[#101014] flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
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
          )}
        </div>
      </main>

      {/* Candidate Dossier Detail Modal */}
      {activeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#0c0c10] border border-[#d4af37]/40 rounded-sm max-w-xl w-full my-8 p-6 sm:p-7 shadow-2xl relative space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]">
                    {meta.label} Candidate Dossier
                  </span>
                  {activeItem.section && (
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-sm bg-[#17171d] text-[#e5c158] border border-neutral-800">
                      {activeItem.section.toUpperCase()} SECTION
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-serif text-white mt-0.5">
                  {activeItem.full_name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1 font-mono">
                  <span>{activeItem.email}</span>
                  {activeItem.phone && <span>· {activeItem.phone}</span>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5 p-3 bg-[#121217] border border-neutral-800 rounded-sm">
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                    Institution
                  </span>
                  <span className="text-white">{activeItem.institution}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                    Section / Division
                  </span>
                  <span className="text-white font-mono">
                    {activeItem.section ? activeItem.section.toUpperCase() : 'General / Shared'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                    Submission Date
                  </span>
                  <span className="text-neutral-300 font-mono">
                    {activeItem.created_at
                      ? new Date(activeItem.created_at).toLocaleString()
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                    Legal & Age Confirmation
                  </span>
                  <span className="text-neutral-300 font-mono">
                    {activeItem.age_confirmed ? 'Confirmed (≥15 yrs)' : 'Unconfirmed'}
                  </span>
                </div>
              </div>

              {/* Status Update Control */}
              <div className="p-3 bg-[#121217] border border-neutral-800 rounded-sm space-y-2">
                <label className="text-[10px] font-mono uppercase text-[#d4af37] block font-semibold">
                  Department Head Adjudication Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'under_review', label: 'Under Review' },
                    { id: 'accepted', label: 'Accept / Approve' },
                    { id: 'waitlisted', label: 'Waitlist' },
                    { id: 'rejected', label: 'Reject' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEditStatus(s.id)}
                      className={`px-3 py-1.5 text-xs font-mono uppercase rounded-sm border cursor-pointer transition-colors ${
                        editStatus === s.id
                          ? 'bg-[#d4af37] text-black border-[#d4af37] font-semibold'
                          : 'bg-[#17171d] text-neutral-300 border-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeItem.experience && (
                <div>
                  <h4 className="text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    Prior Experience & Qualifications
                  </h4>
                  <div className="p-3 bg-[#121217] border border-neutral-800 rounded-sm text-neutral-200 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">
                    {activeItem.experience}
                  </div>
                </div>
              )}

              {activeItem.statement && (
                <div>
                  <h4 className="text-[11px] font-mono uppercase text-neutral-400 mb-1">
                    Statement of Motivation
                  </h4>
                  <div className="p-3 bg-[#121217] border border-neutral-800 rounded-sm text-neutral-200 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">
                    {activeItem.statement}
                  </div>
                </div>
              )}

              {/* Head Internal Notes */}
              <div>
                <h4 className="text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Department Head Internal Notes
                </h4>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Private evaluation notes for Secretariat review…"
                  className="w-full bg-[#121217] border border-neutral-700 focus:border-[#d4af37] text-xs text-white p-2.5 rounded-sm outline-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white border border-neutral-700 rounded-sm cursor-pointer"
              >
                Close Dossier
              </button>

              <button
                type="button"
                onClick={handleUpdateApplicant}
                disabled={savingNotes}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-[0.99] cursor-pointer shadow-md disabled:opacity-50"
              >
                {savingNotes ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Adjudication</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
