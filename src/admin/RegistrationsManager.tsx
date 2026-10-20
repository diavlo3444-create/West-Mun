import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  Search,
  Download,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
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
  SlidersHorizontal,
  Inbox,
  ListFilter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { explainError, type Row } from './ui';
import { downloadText, toCsv } from '../lib/safe';
import { SECURITY_QUESTIONS, countWords, extractSecurityAnswers, getWordCountFeedback } from '../lib/securityQuestions';
import {
  EmptyState,
  Modal,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  SegmentedTabs,
  Skeleton,
  StatusBadge,
  Toast,
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSecondary,
  inputCls,
  labelCls,
  selectCls,
} from '../dashboard/ui';

export interface UnifiedRegistration extends Row {
  _type: 'delegate' | 'team';
  _teamId: string;
  _teamLabel: string;
  statement?: string;
  security_emergency_steps?: string;
  security_teamwork?: string;
  security_motivation?: string;
  security_handling_harassment?: string;
}

interface RegistrationsManagerProps {
  delegates: Row[];
  teamRegistrations: Row[];
  loading: boolean;
  error?: string;
  onRefresh: () => void;
  selectedApp?: { app: any; type: 'delegate' | 'team' } | null;
  onClearSelectedApp?: () => void;
  isSuperAdmin?: boolean;
}

type StatusTab = 'all' | 'pending' | 'approved' | 'rejected' | 'waitlisted';

const TEAM_META: Record<string, { label: string; short: string; icon: typeof Shield }> = {
  delegates: { label: 'Conference delegates', short: 'Delegates', icon: GraduationCap },
  security: { label: 'Security & Protocol', short: 'Security', icon: Shield },
  media: { label: 'Media & Press', short: 'Media', icon: Camera },
  volunteers: { label: 'Conference Volunteers', short: 'Volunteers', icon: HeartHandshake },
};

function teamLabel(team: string): string {
  return TEAM_META[team]?.short ?? team;
}

function teamIcon(team: string) {
  const Icon = TEAM_META[team]?.icon ?? GraduationCap;
  return <Icon className="h-3 w-3" aria-hidden="true" />;
}

function initials(name?: string): string {
  const cleaned = String(name || '?').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function formatDate(value?: string, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export const RegistrationsManager: React.FC<RegistrationsManagerProps> = ({
  delegates,
  teamRegistrations,
  loading,
  error,
  onRefresh,
  selectedApp,
  onClearSelectedApp,
}) => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [teamFilter, setTeamFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'status'>('date_desc');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [activeItem, setActiveItem] = useState<UnifiedRegistration | null>(null);
  const [draftStatus, setDraftStatus] = useState('received');
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalNotice, setModalNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const [signupBusy, setSignupBusy] = useState(false);
  const [signupUrl, setSignupUrl] = useState<string | null>(null);
  const [signupNotice, setSignupNotice] = useState<string | null>(null);
  const [headRecommendation, setHeadRecommendation] = useState<{ head_decision: string; head_notes: string; admin_decision: string } | null>(null);

  React.useEffect(() => {
    let current = true;
    setHeadRecommendation(null);
    if (!supabase || !activeItem || activeItem._type !== 'team') return () => { current = false; };
    void supabase.from('wm_staffing_decisions')
      .select('head_decision,head_notes,admin_decision')
      .eq('registration_id', activeItem.id)
      .maybeSingle()
      .then(({ data }) => { if (current && data) setHeadRecommendation(data as any); });
    return () => { current = false; };
  }, [activeItem?.id, activeItem?._type]);

  const createSignupLink = async () => {
    if (!supabase || !activeItem || activeItem._type !== 'team' || activeItem.status !== 'accepted' || signupBusy) return;
    setSignupBusy(true);
    setSignupNotice(null);
    setSignupUrl(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('team-signup', {
        body: { action: 'create', registrationId: activeItem.id },
      });
      if (invokeError || !data?.success || typeof data.signupUrl !== 'string') {
        let message = data?.error || invokeError?.message || 'Could not create a signup link.';
        try {
          const body = await (invokeError as any)?.context?.json();
          if (body?.error) message = body.error;
        } catch {}
        setSignupNotice(message);
        return;
      }
      setSignupUrl(data.signupUrl);
      setSignupNotice(`Link created. It expires ${new Date(data.expiresAt).toLocaleString()}.`);
      try {
        await navigator.clipboard.writeText(data.signupUrl);
        setSignupNotice(`Signup link copied. It expires ${new Date(data.expiresAt).toLocaleString()}.`);
      } catch {
        setSignupNotice('Link created. Copy it from the field below and send it manually to the applicant.');
      }
    } catch {
      setSignupNotice('Could not create a signup link. Check your connection and try again.');
    } finally {
      setSignupBusy(false);
    }
  };

  const copySignupLink = async () => {
    if (!signupUrl) return;
    try {
      await navigator.clipboard.writeText(signupUrl);
      setSignupNotice('Signup link copied. Send it manually to the applicant.');
    } catch {
      setSignupNotice('Clipboard access is blocked. Select and copy the link manually.');
    }
  };

  const openItem = (item: UnifiedRegistration) => {
    setActiveItem(item);
    setDraftStatus(item.status || 'received');
    setDraftNotes(item.admin_notes || '');
    setModalNotice(null);
    setPendingAction(null);
  };

  // Deep-link from the overview page opens the exact dossier.
  React.useEffect(() => {
    if (!selectedApp?.app) return;
    const isTeam = selectedApp.type === 'team';
    openItem({
      ...selectedApp.app,
      _type: selectedApp.type,
      _teamId: isTeam ? String(selectedApp.app.team) : 'delegates',
      _teamLabel: isTeam
        ? teamLabel(String(selectedApp.app.team))
        : selectedApp.app.tier === 'early_bird'
          ? 'Early Bird delegate'
          : 'Regular delegate',
    });
  }, [selectedApp]);

  const unifiedList: UnifiedRegistration[] = useMemo(() => {
    const list: UnifiedRegistration[] = [
      ...delegates.map((d) => ({
        ...d,
        _type: 'delegate' as const,
        _teamId: 'delegates',
        _teamLabel: d.tier === 'early_bird' ? 'Early Bird delegate' : 'Regular delegate',
      })),
      ...teamRegistrations.map((t) => ({
        ...t,
        _type: 'team' as const,
        _teamId: String(t.team),
        _teamLabel: teamLabel(String(t.team)),
      })),
    ];
    return list;
  }, [delegates, teamRegistrations]);

  const statusCounts = useMemo(() => {
    return {
      all: unifiedList.length,
      pending: unifiedList.filter((r) => r.status === 'received' || r.status === 'under_review').length,
      approved: unifiedList.filter((r) => r.status === 'accepted').length,
      rejected: unifiedList.filter((r) => r.status === 'rejected').length,
      waitlisted: unifiedList.filter((r) => r.status === 'waitlisted').length,
    };
  }, [unifiedList]);

  const hasSectionData = useMemo(
    () => unifiedList.some((r) => r.section === 'male' || r.section === 'female'),
    [unifiedList],
  );

  const filteredList = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();

    return unifiedList
      .filter((item) => {
        if (q) {
          const matches = [
            item.full_name,
            item.email,
            item.institution,
            item.phone,
            item.id,
            item._teamLabel,
          ].some((value) => String(value || '').toLowerCase().includes(q));
          if (!matches) return false;
        }

        if (teamFilter !== 'all' && item._teamId !== teamFilter) return false;

        if (sectionFilter !== 'all') {
          if (sectionFilter === 'unassigned') {
            if (item.section === 'male' || item.section === 'female') return false;
          } else if (item.section !== sectionFilter) {
            return false;
          }
        }

        if (statusTab === 'pending') {
          if (item.status !== 'received' && item.status !== 'under_review') return false;
        } else if (statusTab === 'approved') {
          if (item.status !== 'accepted') return false;
        } else if (statusTab === 'rejected') {
          if (item.status !== 'rejected') return false;
        } else if (statusTab === 'waitlisted') {
          if (item.status !== 'waitlisted') return false;
        }

        if (startDate) {
          const itemDate = new Date(item.created_at).toISOString().slice(0, 10);
          if (itemDate < startDate) return false;
        }
        if (endDate) {
          const itemDate = new Date(item.created_at).toISOString().slice(0, 10);
          if (itemDate > endDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return String(a.full_name || '').localeCompare(String(b.full_name || ''));
        }
        if (sortBy === 'date_asc') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'status') {
          return String(a.status || '').localeCompare(String(b.status || ''));
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [
    unifiedList,
    deferredSearch,
    teamFilter,
    sectionFilter,
    statusTab,
    startDate,
    endDate,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedList = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, safePage, pageSize]);

  const activeFilters =
    (teamFilter !== 'all' ? 1 : 0) +
    (sectionFilter !== 'all' ? 1 : 0) +
    (statusTab !== 'all' ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);

  const clearFilters = () => {
    setSearch('');
    setTeamFilter('all');
    setSectionFilter('all');
    setStatusTab('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const closeModal = () => {
    if (saving) return;
    setActiveItem(null);
    setPendingAction(null);
    setModalNotice(null);
    onClearSelectedApp?.();
  };

  const saveApplication = async (newStatus?: string) => {
    if (!activeItem || !supabase) return;
    const targetStatus = newStatus || draftStatus;
    const table = activeItem._type === 'delegate' ? 'delegates' : 'team_registrations';

    setSaving(true);
    setModalNotice(null);

    const { error: saveError } = await supabase
      .from(table)
      .update({
        status: targetStatus,
        admin_notes: draftNotes.trim(),
      })
      .eq('id', activeItem.id);

    setSaving(false);

    if (saveError) {
      setModalNotice({ type: 'error', text: explainError(saveError) });
      return;
    }

    if (activeItem._type === 'team' && (targetStatus === 'accepted' || targetStatus === 'rejected')) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const finalDecision = await supabase.from('wm_staffing_decisions')
          .update({
            admin_decision: targetStatus === 'accepted' ? 'approved' : 'rejected',
            admin_notes: draftNotes.trim(),
            admin_user_id: authData.user.id,
            admin_reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('registration_id', activeItem.id)
          .select('id')
          .maybeSingle();
        if (finalDecision.error) {
          setModalNotice({ type: 'error', text: 'The application status was saved, but the head-recommendation record could not be finalized. Refresh and review the recommendation record.' });
        }
      }
    }

    setDraftStatus(targetStatus);
    setActiveItem((prev) =>
      prev ? { ...prev, status: targetStatus, admin_notes: draftNotes.trim() } : null,
    );
    setPendingAction(null);
    setModalNotice({ type: 'success', text: 'Decision saved to Supabase.' });
    setToast({
      message: `${activeItem.full_name} is now marked ${targetStatus.replace('_', ' ')}.`,
      tone: 'success',
    });
    onRefresh();
  };

  const deleteApplication = async () => {
    if (!activeItem || !supabase) return;
    const table = activeItem._type === 'delegate' ? 'delegates' : 'team_registrations';
    const deletedName = activeItem.full_name;

    setSaving(true);
    const { error: deleteError } = await supabase.from(table).delete().eq('id', activeItem.id);
    setSaving(false);

    if (deleteError) {
      setModalNotice({ type: 'error', text: explainError(deleteError) });
      setPendingAction(null);
      return;
    }

    setActiveItem(null);
    setPendingAction(null);
    onClearSelectedApp?.();
    setToast({ message: `${deletedName}'s record was permanently deleted.`, tone: 'success' });
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
      'security_emergency_steps',
      'security_teamwork',
      'security_motivation',
      'security_handling_harassment',
      'admin_notes',
      'submitted_at',
    ];

    const body = filteredList.map((item) => {
      const sec = extractSecurityAnswers(item);
      return [
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
        sec.security_emergency_steps || '',
        sec.security_teamwork || '',
        sec.security_motivation || '',
        sec.security_handling_harassment || '',
        item.admin_notes || '',
        item.created_at,
      ];
    });

    downloadText(
      `west-mun-registrations-${teamFilter}-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([head, ...body]),
    );
  };

  const emptyRecords = unifiedList.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Delegate & staff registry"
        title="Registrations"
        description="Review every application in one place. Decisions and private notes are written straight to Supabase."
        actions={
          <>
            <button type="button" onClick={onRefresh} className={btnSecondary} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportFilteredCsv}
              disabled={filteredList.length === 0}
              className={btnPrimary}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </>
        }
      />

      {error && (
        <Notice tone="error" title="Could not refresh every record">
          {error}
        </Notice>
      )}

      <Panel className="border-[#d4af37]/15 bg-gradient-to-r from-[#17150f]/80 to-[#0c0c0f]">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#d4af37]">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Manual applicant contact</h2>
            <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-neutral-400">
              No emails are sent by this website. After an application is accepted, generate a one-time signup link and send it yourself by WhatsApp, phone, or your own email account. The link expires in seven days and only works with the email on the application.
            </p>
          </div>
        </div>
      </Panel>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedTabs<StatusTab>
          ariaLabel="Filter by application status"
          value={statusTab}
          onChange={(next) => {
            setStatusTab(next);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All', count: statusCounts.all },
            { value: 'pending', label: 'Pending', count: statusCounts.pending },
            { value: 'approved', label: 'Approved', count: statusCounts.approved },
            { value: 'waitlisted', label: 'Waitlisted', count: statusCounts.waitlisted },
            { value: 'rejected', label: 'Rejected', count: statusCounts.rejected },
          ]}
        />

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-[270px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search name, email, school, ID…"
              className={`${inputCls} pl-8`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search registrations"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`${btnSecondary} ${filtersOpen ? 'border-[#d4af37]/40 text-[#e2c258]' : ''}`}
            aria-expanded={filtersOpen}
            aria-controls="registration-filters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Filters
            {activeFilters > 0 && (
              <span className="rounded bg-[#d4af37]/15 px-1.5 py-0.5 text-[9.5px] font-mono text-[#e2c258]">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>

      {filtersOpen && (
        <Panel id="registration-filters" className="wm-page-in p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <label htmlFor="filter-department" className={labelCls}>
                Department
              </label>
              <select
                id="filter-department"
                className={selectCls}
                value={teamFilter}
                onChange={(e) => {
                  setTeamFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All departments</option>
                <option value="delegates">Conference delegates</option>
                <option value="security">Security & Protocol</option>
                <option value="media">Media & Press</option>
                <option value="volunteers">Conference Volunteers</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label htmlFor="filter-section" className={labelCls}>
                Section
              </label>
              <select
                id="filter-section"
                className={selectCls}
                value={sectionFilter}
                onChange={(e) => {
                  setSectionFilter(e.target.value);
                  setPage(1);
                }}
                disabled={!hasSectionData}
              >
                <option value="all">All sections</option>
                <option value="male">Male division</option>
                <option value="female">Female division</option>
                <option value="unassigned">No section</option>
              </select>
              {!hasSectionData && (
                <p className="mt-1 text-[10px] text-neutral-400">No sectioned records yet.</p>
              )}
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="filter-sort" className={labelCls}>
                Sort
              </label>
              <select
                id="filter-sort"
                className={selectCls}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="name_asc">Name A–Z</option>
                <option value="status">Status</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <span className={labelCls}>Submitted between</span>
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Calendar
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    type="date"
                    className={`${inputCls} pl-7`}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    aria-label="Start date"
                  />
                </div>
                <span className="text-[10px] text-neutral-400">to</span>
                <input
                  type="date"
                  className={inputCls}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  aria-label="End date"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <p className="text-[10.5px] text-neutral-400">
              Showing <span className="text-neutral-300">{filteredList.length}</span> of{' '}
              <span className="text-neutral-300">{unifiedList.length}</span> records
            </p>
            <button
              type="button"
              onClick={clearFilters}
              disabled={activeFilters === 0 && !search}
              className={btnGhost}
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Clear filters
            </button>
          </div>
        </Panel>
      )}

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 text-[10.5px] text-neutral-400">
            <ListFilter className="h-3.5 w-3.5 text-[#d4af37]/80" aria-hidden="true" />
            <span>
              {filteredList.length} record{filteredList.length === 1 ? '' : 's'}
              {activeFilters > 0 || search ? ' matching filters' : ' in the registry'}
            </span>
          </div>
          <span className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-neutral-400">
            {statusCounts.pending} awaiting decision
          </span>
        </div>

        {loading && unifiedList.length === 0 ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="hidden h-4 w-28 sm:block" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : paginatedList.length === 0 ? (
          emptyRecords ? (
            <EmptyState
              icon={Inbox}
              title="The registry is empty"
              description="No delegate or staff applications have been submitted yet. New records appear here automatically."
              action={
                <button type="button" onClick={onRefresh} className={btnGhost}>
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Check again
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={Search}
              title="No records match these filters"
              description="Try a broader search or clear the current filter set."
              action={
                <button type="button" onClick={clearFilters} className={btnSecondary}>
                  Clear filters
                </button>
              }
            />
          )
        ) : (
          <>
            {/* Desktop table */}
            <div className="wm-scroll hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012] text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                    <th scope="col" className="px-5 py-2.5 font-normal">Applicant</th>
                    <th scope="col" className="px-3 py-2.5 font-normal">Department</th>
                    <th scope="col" className="hidden px-3 py-2.5 font-normal lg:table-cell">Institution</th>
                    <th scope="col" className="hidden px-3 py-2.5 font-normal xl:table-cell">Section</th>
                    <th scope="col" className="px-3 py-2.5 font-normal">Status</th>
                    <th scope="col" className="hidden px-3 py-2.5 font-normal lg:table-cell">Submitted</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-normal">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.045]">
                  {paginatedList.map((item) => (
                    <tr
                      key={`${item._type}-${item.id}`}
                      className="group transition-colors hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-[9.5px] font-semibold text-neutral-300">
                            {initials(item.full_name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium text-neutral-100">
                              {item.full_name || 'Unnamed applicant'}
                            </p>
                            <p className="truncate font-mono text-[10px] text-neutral-400">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded border border-white/[0.07] bg-white/[0.02] px-1.5 py-0.5 text-[10px] text-neutral-400">
                          <span className="text-[#c9a64a]/90">{teamIcon(item._teamId)}</span>
                          {item._teamLabel}
                        </span>
                      </td>
                      <td className="hidden max-w-[12rem] truncate px-3 py-3 text-[11.5px] text-neutral-400 lg:table-cell">
                        {item.institution || '—'}
                      </td>
                      <td className="hidden px-3 py-3 xl:table-cell">
                        {item.section ? (
                          <span className="rounded border border-white/[0.08] bg-white/[0.025] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-neutral-400">
                            {item.section}
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-neutral-700">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3 font-mono text-[10.5px] text-neutral-400 lg:table-cell">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openItem(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] px-2 py-1 text-[10.5px] font-medium text-neutral-400 transition-colors hover:border-[#d4af37]/35 hover:bg-[#d4af37]/[0.06] hover:text-[#e2c258]"
                          aria-label={`Review ${item.full_name}`}
                        >
                          <Eye className="h-3 w-3" aria-hidden="true" />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-white/[0.045] md:hidden">
              {paginatedList.map((item) => (
                <li key={`mobile-${item._type}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className="block w-full px-4 py-3.5 text-left transition-colors active:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-neutral-100">
                          {item.full_name || 'Unnamed applicant'}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-neutral-400">{item.email}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-neutral-400">
                      <span className="text-[#c9a64a]/90">{item._teamLabel}</span>
                      <span className="text-neutral-700" aria-hidden="true">·</span>
                      <span className="truncate">{item.institution || 'No institution'}</span>
                      <span className="text-neutral-700" aria-hidden="true">·</span>
                      <span className="font-mono">{formatDate(item.created_at)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {filteredList.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.012] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2 text-[10.5px] text-neutral-400">
              <span>Rows</span>
              <select
                className="rounded border border-white/[0.09] bg-[#101013] px-1.5 py-0.5 text-[10.5px] text-neutral-300 focus:outline-none"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Rows per page"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="hidden sm:inline">
                · {Math.min((safePage - 1) * pageSize + 1, filteredList.length)}–
                {Math.min(safePage * pageSize, filteredList.length)} of {filteredList.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-neutral-400">
                Page {safePage} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/[0.08] text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/[0.08] text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Modal
        open={Boolean(activeItem)}
        onClose={closeModal}
        size="lg"
        eyebrow={activeItem?._type === 'delegate' ? 'Delegate dossier' : 'Staff application'}
        title={activeItem?.full_name || 'Application'}
        description={
          activeItem ? (
            <span className="font-mono text-[10.5px]">
              {activeItem.email}
              {activeItem.phone ? ` · ${activeItem.phone}` : ''}
              {activeItem.institution ? ` · ${activeItem.institution}` : ''}
            </span>
          ) : undefined
        }
        footer={
          activeItem ? (
            <>
              <button
                type="button"
                onClick={() => setPendingAction('delete')}
                className="mr-auto inline-flex items-center gap-1.5 text-[10.5px] text-neutral-400 transition-colors hover:text-rose-300"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
                Delete record
              </button>
              <button type="button" onClick={closeModal} className={btnSecondary} disabled={saving}>
                Close
              </button>
              <button
                type="button"
                onClick={() => saveApplication()}
                className={btnPrimary}
                disabled={saving}
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                Save changes
              </button>
            </>
          ) : undefined
        }
      >
        {activeItem && (
          <div className="space-y-4">
            {modalNotice && (
              <Notice tone={modalNotice.type === 'error' ? 'error' : 'success'}>
                {modalNotice.text}
              </Notice>
            )}

            {/* Snapshot */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-white/[0.07] bg-white/[0.045] sm:grid-cols-4">
              {[
                { label: 'Status', value: <StatusBadge status={activeItem.status} /> },
                { label: 'Department', value: activeItem._teamLabel },
                {
                  label: 'Submitted',
                  value: formatDate(activeItem.created_at, true),
                },
                {
                  label: 'Section',
                  value: activeItem.section ? activeItem.section.toUpperCase() : 'Not sectioned',
                },
              ].map((cell) => (
                <div key={cell.label} className="bg-[#0c0c0f] px-3 py-2.5">
                  <span className="mb-1 block text-[8.5px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                    {cell.label}
                  </span>
                  <span className="block truncate text-[11px] text-neutral-200">{cell.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-white/[0.07] bg-white/[0.012] p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  Applicant details
                </p>
                <dl className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Institution</dt>
                    <dd className="truncate text-right text-neutral-300">{activeItem.institution || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Phone</dt>
                    <dd className="font-mono text-right text-neutral-300">{activeItem.phone || '—'}</dd>
                  </div>
                  {activeItem._type === 'delegate' && (
                    <>
                      <div className="flex justify-between gap-3">
                        <dt className="text-neutral-400">Delegation</dt>
                        <dd className="text-right capitalize text-neutral-300">
                          {String(activeItem.delegation_type || 'single_delegate').replace('_', ' ')}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-neutral-400">Tier</dt>
                        <dd className="text-right capitalize text-neutral-300">
                          {String(activeItem.tier || '—').replace('_', ' ')}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-neutral-400">Payment</dt>
                        <dd className="text-right capitalize text-neutral-300">
                          {String(activeItem.payment_status || 'unpaid')}
                          {activeItem.fee_amount != null ? ` · ${activeItem.fee_amount}` : ''}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>

              <div className="rounded-md border border-white/[0.07] bg-white/[0.012] p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  Consent & audit
                </p>
                <dl className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Record ID</dt>
                    <dd className="truncate font-mono text-[9.5px] text-neutral-400">{activeItem.id}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Age confirmed</dt>
                    <dd className="text-right text-neutral-300">
                      {activeItem.age_confirmed ? 'Verified' : 'Not confirmed'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Consent version</dt>
                    <dd className="font-mono text-right text-neutral-300">
                      {activeItem.consent_version || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Consent at</dt>
                    <dd className="text-right text-neutral-300">
                      {formatDate(activeItem.consent_at || activeItem.created_at)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {activeItem.experience && (
              <div>
                <h3 className="mb-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  Relevant experience
                </h3>
                <div className="wm-scroll max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-white/[0.07] bg-[#101013] p-3 text-[11.5px] leading-relaxed text-neutral-300">
                  {activeItem.experience}
                </div>
              </div>
            )}

            {activeItem.statement && (
              <div>
                <h3 className="mb-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  Statement of motivation
                </h3>
                <div className="wm-scroll max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-white/[0.07] bg-[#101013] p-3 text-[11.5px] leading-relaxed text-neutral-300">
                  {activeItem.statement}
                </div>
              </div>
            )}

            {/* Security Team Assessment Section (All 4 Questions & Answers) */}
            {(() => {
              const secAnswers = extractSecurityAnswers(activeItem);
              const hasAnyAnswers =
                activeItem._teamId === 'security' ||
                Boolean(
                  secAnswers.security_emergency_steps ||
                  secAnswers.security_teamwork ||
                  secAnswers.security_motivation ||
                  secAnswers.security_handling_harassment
                );

              if (!hasAnyAnswers) return null;

              return (
                <div className="space-y-3 rounded-md border border-[#d4af37]/35 bg-[#12110c] p-3.5">
                  <div className="flex items-center justify-between gap-2 border-b border-[#d4af37]/20 pb-2">
                    <div className="flex items-center gap-1.5 text-[9.5px] font-mono uppercase tracking-[0.14em] text-[#d4af37]">
                      <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                      Security Team Scenario Assessment (4 Required Questions)
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-sm bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37]">
                      Official Responses
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {SECURITY_QUESTIONS.map((q, idx) => {
                      const ans = secAnswers[q.key];
                      const words = countWords(ans);
                      const meetsMin = words >= q.minWords;
                      const feedback = getWordCountFeedback(words, q.minWords);

                      return (
                        <div key={q.key} className="rounded-md border border-white/[0.07] bg-[#0c0c0f] p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10.5px] font-mono uppercase tracking-wider text-neutral-200 font-semibold flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] text-[9px] flex items-center justify-center">
                                {idx + 1}
                              </span>
                              {q.title}
                            </span>
                            <span
                              className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded-sm border ${
                                meetsMin
                                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 font-semibold'
                                  : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                              }`}
                            >
                              {feedback}
                            </span>
                          </div>

                          <p className="text-[10.5px] text-neutral-400 italic font-light leading-relaxed">
                            "{q.prompt}"
                          </p>

                          <div className="wm-scroll max-h-36 overflow-y-auto whitespace-pre-wrap rounded border border-white/[0.06] bg-[#141418] p-2.5 text-[11px] leading-relaxed text-neutral-200">
                            {ans ? ans : <span className="text-neutral-500 italic">No response submitted.</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {activeItem._type === 'team' && (
              <div className="rounded-md border border-white/[0.07] bg-white/[0.012] p-3">
                <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#d4af37]/85">Head recommendation</p>
                {headRecommendation ? (
                  <>
                    <p className="mt-1 text-[11.5px] text-neutral-200">
                      {headRecommendation.head_decision === 'approved' ? 'Recommends approval' : 'Recommends rejection'}
                      <span className="mx-2 text-neutral-600">·</span>
                      Secretariat: {headRecommendation.admin_decision === 'approved' ? 'Approved' : headRecommendation.admin_decision === 'rejected' ? 'Rejected' : 'Pending final decision'}
                    </p>
                    {headRecommendation.head_notes && <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-400">{headRecommendation.head_notes}</p>}
                  </>
                ) : (
                  <p className="mt-1 text-[11px] text-neutral-400">No head recommendation has been submitted. You can still make the final decision yourself.</p>
                )}
              </div>
            )}

            {/* Decision */}
            <div className="rounded-md border border-white/[0.07] bg-white/[0.012] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#d4af37]/85">
                    Secretariat adjudication
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-neutral-400">
                    Status changes are written directly to the registrations table.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {activeItem._type === 'team' && activeItem.status === 'accepted' && (
                    <button
                      type="button"
                      onClick={() => void createSignupLink()}
                      disabled={signupBusy || saving}
                      className={btnGhost}
                      title="Create and copy a one-time signup link. No email will be sent."
                    >
                      {signupBusy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Shield className="h-3 w-3" aria-hidden="true" />}
                      {signupBusy ? 'Creating link…' : 'Generate & copy signup link'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingAction('approve')}
                    disabled={saving || activeItem.status === 'accepted'}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-400/[0.07] px-2.5 py-1.5 text-[10.5px] font-medium text-emerald-300 transition-colors hover:bg-emerald-400/[0.13] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction('reject')}
                    disabled={saving || activeItem.status === 'rejected'}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-400/25 bg-rose-400/[0.06] px-2.5 py-1.5 text-[10.5px] font-medium text-rose-300 transition-colors hover:bg-rose-400/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <XCircle className="h-3 w-3" aria-hidden="true" />
                    Reject
                  </button>
                </div>
              </div>

              {signupNotice && (
                <div className="mt-3 rounded-md border border-[#d4af37]/20 bg-[#d4af37]/[0.04] p-3 text-[11px] text-neutral-300" role="status">
                  <p>{signupNotice}</p>
                  {signupUrl && (
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input aria-label="One-time signup link" readOnly value={signupUrl} onFocus={(e) => e.currentTarget.select()} className={`${inputCls} min-w-0 flex-1 font-mono text-[10px]`} />
                      <button type="button" onClick={() => void copySignupLink()} className={btnSecondary}>Copy link</button>
                    </div>
                  )}
                </div>
              )}

              {pendingAction && (
                <div
                  className={`mt-3 rounded-md border p-3 ${
                    pendingAction === 'delete'
                      ? 'border-rose-400/25 bg-rose-400/[0.05]'
                      : pendingAction === 'reject'
                        ? 'border-rose-400/20 bg-rose-400/[0.04]'
                        : 'border-emerald-400/20 bg-emerald-400/[0.04]'
                  }`}
                  role="alertdialog"
                  aria-label="Confirm decision"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        pendingAction === 'approve' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-medium text-neutral-100">
                        {pendingAction === 'approve'
                          ? `Approve ${activeItem.full_name}?`
                          : pendingAction === 'reject'
                            ? `Reject ${activeItem.full_name}?`
                            : `Permanently delete this record?`}
                      </p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-neutral-400">
                        {pendingAction === 'approve'
                          ? `The application will be marked approved for ${activeItem._teamLabel}. The applicant record is preserved.`
                          : pendingAction === 'reject'
                            ? `The application will be marked rejected for ${activeItem._teamLabel}. You can reverse this later.`
                            : 'This removes the record from Supabase permanently. It cannot be undone.'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingAction(null)}
                      className={btnGhost}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      autoFocus
                      onClick={() => {
                        if (pendingAction === 'approve') saveApplication('accepted');
                        else if (pendingAction === 'reject') saveApplication('rejected');
                        else deleteApplication();
                      }}
                      disabled={saving}
                      className={pendingAction === 'delete' ? btnDanger : btnPrimary}
                    >
                      {saving && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                      {pendingAction === 'approve'
                        ? 'Confirm approval'
                        : pendingAction === 'reject'
                          ? 'Confirm rejection'
                          : 'Delete permanently'}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="detail-status" className={labelCls}>
                    Detailed status
                  </label>
                  <select
                    id="detail-status"
                    className={selectCls}
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                  >
                    <option value="received">Received / pending</option>
                    <option value="under_review">Under review</option>
                    <option value="accepted">Accepted / approved</option>
                    <option value="waitlisted">Waitlisted</option>
                    <option value="rejected">Rejected</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="detail-notes" className={labelCls}>
                    Private administrative notes
                  </label>
                  <textarea
                    id="detail-notes"
                    rows={2}
                    className={inputCls}
                    placeholder="Interview notes, dais instructions, internal rationale…"
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
};
