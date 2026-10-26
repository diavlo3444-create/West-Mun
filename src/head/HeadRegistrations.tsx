import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  FileText,
  Shield,
  Copy,
  Link2,
  Mail,
  CalendarDays,
  HeartHandshake,
} from 'lucide-react';
import { ApplicantEmailLink } from '../components/ApplicantEmailLink';
import { RegistrationExtraPhotos, stripExtraPhotoMarker } from '../components/RegistrationExtraPhotos';
import { downloadText, toCsv } from '../lib/safe';
import {
  EmptyState,
  Modal,
  Notice,
  PageHeader,
  Panel,
  SegmentedTabs,
  Skeleton,
  StatusBadge,
  Toast,
  btnGhost,
  btnPrimary,
  btnSecondary,
  inputCls,
  labelCls,
  selectCls,
} from '../dashboard/ui';
import type { HeadRegistration } from './HeadOverview';
import { supabase } from '../lib/supabase';
import type { SectionKey } from './departments';
import { SECURITY_QUESTIONS, countWords, extractSecurityAnswers, getWordCountFeedback } from '../lib/securityQuestions';
import { VOLUNTEER_QUESTIONS, extractVolunteerAnswers, getVolunteerWordCountFeedback } from '../lib/volunteerQuestions';

type StatusTab = 'all' | 'pending' | 'approved' | 'accepted-secretariat' | 'waitlisted' | 'rejected';

interface HeadRegistrationsProps {
  registrations: HeadRegistration[];
  loading: boolean;
  department?: string;
  departmentLabel: string;
  section?: SectionKey | null;
  isGenderDivision: boolean;
  onRefresh: () => void;
  onSave: (
    id: string,
    status: string,
    notes: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  initialRecord?: HeadRegistration | null;
  onConsumeInitial?: () => void;
}

function initials(name?: string): string {
  const cleaned = String(name || '?').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function formatDate(value?: string | null, withTime = false): string {
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

export const HeadRegistrations: React.FC<HeadRegistrationsProps> = ({
  registrations,
  loading,
  department = '',
  departmentLabel,
  section,
  isGenderDivision,
  onRefresh,
  onSave,
  initialRecord,
  onConsumeInitial,
}) => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc'>('date_desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  const [activeItem, setActiveItem] = useState<HeadRegistration | null>(null);
  const [draftStatus, setDraftStatus] = useState('received');
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalNotice, setModalNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [adminDecision, setAdminDecision] = useState('pending');
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupUrl, setSignupUrl] = useState<string | null>(null);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [signupNotice, setSignupNotice] = useState<string | null>(null);
  const [bulkSignupBusy, setBulkSignupBusy] = useState(false);
  const [bulkSignupLinks, setBulkSignupLinks] = useState<Array<{ signupUrl: string; message: string; applicantEmail: string; team: string; section: string | null; expiresAt: string }>>([]);
  const [bulkSignupNotice, setBulkSignupNotice] = useState<string | null>(null);

  const openItem = (record: HeadRegistration) => {
    setActiveItem(record);
    setDraftStatus('received');
    setDraftNotes('');
    setModalNotice(null);
    setPendingAction(null);
    setAdminDecision('pending');
    setSignupUrl(null);
    setSignupNotice(null);
    if (supabase) {
      void supabase.from('wm_staffing_decisions')
        .select('head_decision,head_notes,admin_decision')
        .eq('registration_id', record.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error || !data) return;
          setDraftStatus(data.head_decision === 'approved' ? 'accepted' : 'rejected');
          setDraftNotes(data.head_notes || '');
          setAdminDecision(data.admin_decision || 'pending');
        });
    }
  };

  useEffect(() => {
    if (!initialRecord) return;
    openItem(initialRecord);
    onConsumeInitial?.();
  }, [initialRecord, onConsumeInitial]);

  const counts = useMemo(
    () => ({
      all: registrations.length,
      pending: registrations.filter(
        (r) => r.status === 'received' || r.status === 'under_review',
      ).length,
      approved: registrations.filter((r) => r.status === 'accepted').length,
      acceptedSecretariat: registrations.filter((r) => r.status === 'accepted' && Boolean(r.admin_finalized_at)).length,
      waitlisted: registrations.filter((r) => r.status === 'waitlisted').length,
      rejected: registrations.filter((r) => r.status === 'rejected').length,
    }),
    [registrations],
  );

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return registrations
      .filter((record) => {
        if (query) {
          const matches = [
            record.full_name,
            record.email,
            record.institution,
            record.phone,
            record.id,
          ].some((value) => String(value || '').toLowerCase().includes(query));
          if (!matches) return false;
        }

        if (statusTab === 'accepted-secretariat') {
          if (record.status !== 'accepted' || !record.admin_finalized_at) return false;
        } else if (statusTab === 'pending') {
          if (record.status !== 'received' && record.status !== 'under_review') return false;
        } else if (statusTab === 'approved') {
          if (record.status !== 'accepted') return false;
        } else if (statusTab === 'waitlisted') {
          if (record.status !== 'waitlisted') return false;
        } else if (statusTab === 'rejected') {
          if (record.status !== 'rejected') return false;
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
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [registrations, deferredSearch, statusTab, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const closeModal = () => {
    if (saving) return;
    setActiveItem(null);
    setPendingAction(null);
    setModalNotice(null);
  };

  const persist = async (targetStatus: string) => {
    if (!activeItem) return;
    setSaving(true);
    setModalNotice(null);
    const result = await onSave(activeItem.id, targetStatus, draftNotes.trim());
    setSaving(false);

    if (!result.ok) {
      setModalNotice({
        type: 'error',
        text: result.error || 'The decision could not be saved. Check your access and try again.',
      });
      return;
    }

    setDraftStatus(targetStatus);
    setActiveItem((prev) =>
      prev ? {
        ...prev,
        head_decision: targetStatus === 'accepted' ? 'approved' : targetStatus === 'rejected' ? 'rejected' : null,
        head_notes: draftNotes.trim(),
      } : null,
    );
    setPendingAction(null);
    setModalNotice({
      type: 'success',
      text: targetStatus === 'received'
        ? 'Your pending recommendation was cleared. The Secretariat still controls the final application status.'
        : 'Your recommendation was submitted for Secretariat review. The final application status has not changed.',
    });
    setAdminDecision('pending');
    setToast({
      message: targetStatus === 'received'
        ? `Recommendation cleared for ${activeItem.full_name}.`
        : `Recommendation submitted for ${activeItem.full_name}; Secretariat approval is still required.`,
      tone: 'success',
    });
  };

  const createSignupLink = async (target: HeadRegistration | null = activeItem) => {
    if (!supabase || !target || target.status !== 'accepted' || !target.admin_finalized_at || !target.admin_finalized_by || signupBusy) return;
    setSignupBusy(true);
    setSignupUrl(null);
    setSignupMessage(null);
    setSignupNotice(null);
    try {
      const { data, error } = await supabase.functions.invoke('team-signup', {
        body: { action: 'create', registrationId: target.id },
      });
      if (error || !data?.success || typeof data.signupUrl !== 'string') {
        setSignupNotice(data?.error || error?.message || 'Could not create a signup link.');
        return;
      }
      setSignupUrl(data.signupUrl);
      const message = typeof data.message === 'string' ? data.message : `Hi ${(target.full_name || '').split(/\s+/)[0] || 'there'}, congratulations! Your WEST MUN 2027 application has been accepted. Create your team account here: ${data.signupUrl}`;
      setSignupMessage(message);
      try {
        await navigator.clipboard.writeText(message);
        setSignupNotice(`Acceptance message and signup link copied. Expires ${new Date(data.expiresAt).toLocaleString()}.`);
      } catch {
        setSignupNotice('Acceptance message and link are ready below. Copy them and send manually to the applicant.');
      }
    } catch {
      setSignupNotice('Could not create the signup link. Try again or contact an admin.');
    } finally {
      setSignupBusy(false);
    }
  };

  const bulkSignupCandidates = filtered.filter((record) =>
    record.status === 'accepted' && Boolean(record.admin_finalized_at) && Boolean(record.admin_finalized_by)
  );

  const generateBulkSignupLinks = async () => {
    if (!supabase || bulkSignupBusy || bulkSignupCandidates.length === 0) return;
    if (bulkSignupCandidates.length > 25) {
      setBulkSignupNotice('Filter to 25 or fewer finally accepted applications before generating links.');
      return;
    }
    if (!window.confirm(`Generate one-time signup links for ${bulkSignupCandidates.length} finally accepted application(s)? Existing unused links for these applicants will be revoked. No emails will be sent.`)) return;
    setBulkSignupBusy(true);
    setBulkSignupNotice(null);
    setBulkSignupLinks([]);
    try {
      const { data, error } = await supabase.functions.invoke('team-signup', {
        body: { action: 'create_batch', registrationIds: bulkSignupCandidates.map((record) => record.id) },
      });
      if (error || !data?.success || !Array.isArray(data.links)) {
        setBulkSignupNotice(data?.error || error?.message || 'Could not create bulk signup links.');
        return;
      }
      setBulkSignupLinks(data.links);
      setBulkSignupNotice(`Created ${data.links.length} signup link(s). Copy and send them manually; no emails were sent.`);
      const messages = data.links.map((link: any) => link.message || link.signupUrl).join('\\n\\n---\\n\\n');
      try { await navigator.clipboard.writeText(messages); setBulkSignupNotice(`Created and copied ${data.links.length} signup link(s). No emails were sent.`); } catch {}
    } catch {
      setBulkSignupNotice('Could not create bulk signup links. Check your connection and try again.');
    } finally {
      setBulkSignupBusy(false);
    }
  };

  const copyAllBulkSignupLinks = async () => {
    try {
      await navigator.clipboard.writeText(bulkSignupLinks.map((link) => link.message || link.signupUrl).join('\\n\\n---\\n\\n'));
      setBulkSignupNotice(`Copied ${bulkSignupLinks.length} signup link(s). Send them manually; no emails were sent.`);
    } catch {
      setBulkSignupNotice('Clipboard access is blocked. Select and copy the links manually.');
    }
  };

  const copySignupLink = async () => {
    if (!signupUrl) return;
    try {
      await navigator.clipboard.writeText(signupMessage || signupUrl);
      setSignupNotice('Acceptance message and signup link copied. Send them manually; no email will be sent.');
    } catch {
      setSignupNotice('Clipboard access is blocked. Select and copy the link manually.');
    }
  };

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
    const body = filtered.map((record) => [
      record.id,
      record.full_name,
      record.email,
      record.phone || 'N/A',
      record.institution,
      departmentLabel,
      record.section || 'All',
      record.status,
      record.experience || '',
      record.statement || '',
      record.admin_notes || '',
      record.created_at,
    ]);
    const filename = section
      ? `westmun-${departmentLabel.toLowerCase().replace(/\s+/g, '-')}-${section}-registrations-${new Date().toISOString().slice(0, 10)}.csv`
      : `westmun-${departmentLabel.toLowerCase().replace(/\s+/g, '-')}-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadText(filename, toCsv([head, ...body]));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Candidate registry"
        title="Applications"
        description={`Review candidates for ${departmentLabel}${section ? ` · ${section} division` : ''}. Use “Accepted by Secretariat” to see candidates with a recorded final decision.`}
        actions={
          <>
            <button type="button" onClick={onRefresh} className={btnSecondary} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className={btnPrimary}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
            <button type="button" onClick={() => void generateBulkSignupLinks()} disabled={bulkSignupBusy || bulkSignupCandidates.length === 0 || bulkSignupCandidates.length > 25} className={btnSecondary} title="Create one-time signup links for finally accepted applications in your assigned scope.">
              {bulkSignupBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {bulkSignupBusy ? 'Generating links…' : `Generate bulk signup links (${bulkSignupCandidates.length})`}
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedTabs<StatusTab>
          ariaLabel="Filter applications by status"
          value={statusTab}
          onChange={(next) => {
            setStatusTab(next);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'pending', label: 'Pending', count: counts.pending },
            { value: 'approved', label: 'Accepted (all)', count: counts.approved },
            { value: 'accepted-secretariat', label: 'Accepted by Secretariat', count: counts.acceptedSecretariat },
            { value: 'waitlisted', label: 'Waitlisted', count: counts.waitlisted },
            { value: 'rejected', label: 'Rejected', count: counts.rejected },
          ]}
        />

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-[260px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              className={`${inputCls} pl-8`}
              placeholder="Search candidate or institution…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Search applications"
            />
          </div>
          <select
            className={`${selectCls} w-auto min-w-[112px]`}
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            aria-label="Sort applications"
          >
            <option value="date_desc">Newest</option>
            <option value="date_asc">Oldest</option>
            <option value="name_asc">Name A–Z</option>
          </select>
        </div>
      </div>

      {(bulkSignupNotice || bulkSignupLinks.length > 0) && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-100">Bulk signup links</h3>
            <button type="button" onClick={() => void copyAllBulkSignupLinks()} disabled={!bulkSignupLinks.length} className={btnSecondary}>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy all links
            </button>
          </div>
          {bulkSignupNotice && <p role="status" className="mt-2 text-[11px] text-neutral-300">{bulkSignupNotice}</p>}
          {bulkSignupLinks.map((link) => (
            <div key={link.signupUrl} className="mt-3 rounded-md border border-white/[0.07] bg-black/20 p-3">
              <p className="text-xs font-medium text-neutral-100">{link.applicantEmail} · {link.team}{link.section ? ` / ${link.section}` : ''}</p>
              <textarea readOnly rows={3} value={link.message || link.signupUrl} onFocus={(e) => e.currentTarget.select()} className={`${inputCls} mt-2 w-full resize-y text-xs`} aria-label={`Signup message for ${link.applicantEmail}`} />
            </div>
          ))}
        </Panel>
      )}

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <span className="text-[10.5px] text-neutral-400">
            {filtered.length} candidate{filtered.length === 1 ? '' : 's'}
            {statusTab !== 'all' || search ? ' matching filters' : ''}
          </span>
          <span className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-neutral-400">
            {isGenderDivision && section ? `${section} division scope` : 'Department scope'}
          </span>
        </div>

        {loading && registrations.length === 0 ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          registrations.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No applications in your scope"
              description={`${departmentLabel}${section ? ` (${section} division)` : ''} has not received any applications yet. New submissions appear here automatically.`}
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
              title="No candidates match"
              description="Try a different search term or clear the status filter."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusTab('all');
                  }}
                  className={btnSecondary}
                >
                  Clear filters
                </button>
              }
            />
          )
        ) : (
          <>
            <div className="wm-scroll hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012] text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                    <th scope="col" className="px-5 py-2.5 font-normal">Candidate</th>
                    <th scope="col" className="px-3 py-2.5 font-normal">Institution</th>
                    {isGenderDivision && (
                      <th scope="col" className="px-3 py-2.5 font-normal">Section</th>
                    )}
                    <th scope="col" className="hidden px-3 py-2.5 font-normal lg:table-cell">Phone</th>
                    <th scope="col" className="px-3 py-2.5 font-normal">Status</th>
                    <th scope="col" className="hidden px-3 py-2.5 font-normal lg:table-cell">Submitted</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-normal">Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.045]">
                  {paginated.map((record) => (
                    <tr key={record.id} className="transition-colors hover:bg-white/[0.025]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-[9.5px] font-semibold text-neutral-300">
                            {initials(record.full_name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium text-neutral-100">
                              {record.full_name}
                            </p>
                            <ApplicantEmailLink
                              applicantName={record.full_name}
                              applicantEmail={record.email}
                              type="team"
                              department={department}
                              section={record.section || section}
                              status={record.status}
                              institution={record.institution}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[12rem] truncate px-3 py-3 text-[11.5px] text-neutral-400">
                        {record.institution || '—'}
                      </td>
                      {isGenderDivision && (
                        <td className="px-3 py-3">
                          <span className="rounded border border-white/[0.08] bg-white/[0.025] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-neutral-400">
                            {record.section || '—'}
                          </span>
                        </td>
                      )}
                      <td className="hidden px-3 py-3 font-mono text-[10.5px] text-neutral-400 lg:table-cell">
                        {record.phone || '—'}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3 font-mono text-[10.5px] text-neutral-400 lg:table-cell">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openItem(record)}
                            className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] px-2 py-1 text-[10.5px] font-medium text-neutral-400 transition-colors hover:border-[#d4af37]/35 hover:bg-[#d4af37]/[0.06] hover:text-[#e2c258]"
                            aria-label={`Open ${record.full_name}'s dossier`}
                          >
                            <Eye className="h-3 w-3" aria-hidden="true" />
                            Review
                          </button>
                          {record.status === 'accepted' && record.admin_finalized_at && record.admin_finalized_by && (
                            <button
                              type="button"
                              onClick={() => { openItem(record); void createSignupLink(record); }}
                              disabled={signupBusy}
                              className="inline-flex items-center gap-1 rounded-md border border-[#d4af37]/25 px-2 py-1 text-[10px] font-medium text-[#e2c258] transition-colors hover:bg-[#d4af37]/[0.08] disabled:opacity-50"
                              aria-label={`Generate signup link for ${record.full_name}`}
                            >
                              <Link2 className="h-3 w-3" aria-hidden="true" />
                              Generate signup link
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-white/[0.045] md:hidden">
              {paginated.map((record) => (
                <li key={`mobile-${record.id}`}>
                  <button
                    type="button"
                    onClick={() => openItem(record)}
                    className="block w-full px-4 py-3.5 text-left transition-colors active:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-neutral-100">
                          {record.full_name}
                        </p>
                        <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                          <ApplicantEmailLink
                            applicantName={record.full_name}
                            applicantEmail={record.email}
                            type="team"
                            department={department}
                            section={record.section || section}
                            status={record.status}
                            institution={record.institution}
                          />
                        </div>
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-neutral-400">
                      <span className="truncate">{record.institution || 'No institution'}</span>
                      <span className="text-neutral-700" aria-hidden="true">·</span>
                      <span className="font-mono">{formatDate(record.created_at)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.012] px-4 py-3 sm:px-5">
            <span className="font-mono text-[10px] text-neutral-400">
              {Math.min((safePage - 1) * pageSize + 1, filtered.length)}–
              {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-neutral-400">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/[0.08] text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/[0.08] text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </Panel>

      <Modal
        open={Boolean(activeItem)}
        onClose={closeModal}
        size="lg"
        eyebrow={`${departmentLabel} candidate dossier`}
        title={activeItem?.full_name || 'Candidate'}
        description={
          activeItem ? (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <ApplicantEmailLink
                applicantName={activeItem.full_name}
                applicantEmail={activeItem.email}
                type="team"
                department={department}
                section={activeItem.section || section}
                status={activeItem.status}
                institution={activeItem.institution}
                variant="badge"
              />
              {activeItem.phone ? <span className="font-mono text-[10.5px] text-neutral-400">· {activeItem.phone}</span> : null}
              {activeItem.institution ? <span className="text-[10.5px] text-neutral-400">· {activeItem.institution}</span> : null}
            </div>
          ) : undefined
        }
        footer={
          activeItem ? (
            <>
              <button type="button" onClick={closeModal} className={btnSecondary} disabled={saving}>
                Close
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

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-white/[0.07] bg-white/[0.045] sm:grid-cols-4">
              {[
                { label: 'Status', value: <StatusBadge status={activeItem.status} /> },
                { label: 'Section', value: activeItem.section ? activeItem.section.toUpperCase() : 'General' },
                { label: 'Submitted', value: formatDate(activeItem.created_at, true) },
                { label: 'Age confirmed', value: activeItem.age_confirmed ? 'Verified' : 'Unconfirmed' },
              ].map((cell) => (
                <div key={cell.label} className="bg-[#0c0c0f] px-3 py-2.5">
                  <span className="mb-1 block text-[8.5px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                    {cell.label}
                  </span>
                  <span className="block truncate text-[11px] text-neutral-200">{cell.value}</span>
                </div>
              ))}
            </div>

            {/* Contact Applicant Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d4af37]/25 bg-[#d4af37]/[0.05] p-3">
              <div>
                <p className="text-xs font-medium text-white flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>Contact Candidate via Gmail</span>
                </p>
                <p className="mt-0.5 text-[10.5px] text-neutral-400">
                  Compose approval notification, shift briefing, or ask for missing information with a prefilled message.
                </p>
              </div>
              <ApplicantEmailLink
                applicantName={activeItem.full_name}
                applicantEmail={activeItem.email}
                type="team"
                department={department}
                section={activeItem.section || section}
                status={activeItem.status}
                institution={activeItem.institution}
                missingInfoNote={draftNotes}
                variant="button"
                buttonLabel="Compose Email"
                align="right"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-white/[0.07] bg-white/[0.012] p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  Candidate
                </p>
                <dl className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center gap-3">
                    <dt className="text-neutral-400">Email</dt>
                    <dd className="text-right">
                      <ApplicantEmailLink
                        applicantName={activeItem.full_name}
                        applicantEmail={activeItem.email}
                        type="team"
                        department={department}
                        section={activeItem.section || section}
                        status={activeItem.status}
                        institution={activeItem.institution}
                        align="right"
                      />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Institution</dt>
                    <dd className="truncate text-right text-neutral-300">{activeItem.institution || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Phone</dt>
                    <dd className="font-mono text-right text-neutral-300">{activeItem.phone || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Department</dt>
                    <dd className="text-right text-neutral-300">{departmentLabel}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-md border border-white/[0.07] bg-white/[0.012] p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  Consent record
                </p>
                <dl className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Record ID</dt>
                    <dd className="truncate font-mono text-[9.5px] text-neutral-400">{activeItem.id}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Consent version</dt>
                    <dd className="font-mono text-right text-neutral-300">
                      {activeItem.consent_version || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-400">Submitted</dt>
                    <dd className="inline-flex items-center gap-1 text-right text-neutral-300">
                      <CalendarDays className="h-3 w-3 text-neutral-400" aria-hidden="true" />
                      {formatDate(activeItem.created_at)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {activeItem.experience && (
              <div>
                <h3 className="mb-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  Prior experience
                </h3>
                <div className="wm-scroll max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-white/[0.07] bg-[#101013] p-3 text-[11.5px] leading-relaxed text-neutral-300">
                  {activeItem.experience}
                </div>
              </div>
            )}

            {activeItem.statement &&
              !activeItem.statement.startsWith('=== SECURITY TEAM ASSESSMENT ===') &&
              !activeItem.statement.startsWith('=== VOLUNTEER TEAM ASSESSMENT ===') && (
              <div>
                <h3 className="mb-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                  Statement of motivation
                </h3>
                <div className="wm-scroll max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-white/[0.07] bg-[#101013] p-3 text-[11.5px] leading-relaxed text-neutral-300">
                  {stripExtraPhotoMarker(activeItem.statement)}
                </div>
              </div>
            )}
            <RegistrationExtraPhotos statement={activeItem.statement} />

            {/* Security Team Assessment Section (All 4 Questions & Answers) */}
            {(() => {
              const secAnswers = extractSecurityAnswers(activeItem);
              const hasAnyAnswers =
                activeItem.team === 'security' ||
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
                              className={`text-[9.5px] font-mono px-2 py-0.5 rounded-sm border ${
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

            {/* Volunteer Team Assessment Section (All 4 Questions & Answers) */}
            {(() => {
              const volAnswers = extractVolunteerAnswers(activeItem);
              const isVolTeam = activeItem.team === 'volunteers' || department === 'volunteers';
              const hasAnyVolAnswers =
                isVolTeam ||
                Boolean(
                  volAnswers.volunteer_special_skills ||
                  volAnswers.volunteer_teamwork_conflict ||
                  volAnswers.volunteer_emergency_reaction ||
                  volAnswers.volunteer_delegate_professionalism
                );

              if (!hasAnyVolAnswers) return null;

              return (
                <div className="space-y-3 rounded-md border border-[#d4af37]/35 bg-[#12110c] p-3.5">
                  <div className="flex items-center justify-between gap-2 border-b border-[#d4af37]/20 pb-2">
                    <div className="flex items-center gap-1.5 text-[9.5px] font-mono uppercase tracking-[0.14em] text-[#d4af37]">
                      <HeartHandshake className="h-3.5 w-3.5" aria-hidden="true" />
                      Volunteer Team Assessment (4 Required Questions)
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-sm bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37]">
                      Official Responses
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {VOLUNTEER_QUESTIONS.map((q, idx) => {
                      const ans = volAnswers[q.key];
                      const words = countWords(ans);
                      const feedback = getVolunteerWordCountFeedback(words);

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
                              className={`text-[9.5px] font-mono px-2 py-0.5 rounded-sm border ${
                                words >= 1
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

            <div className="rounded-md border border-white/[0.07] bg-white/[0.012] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#d4af37]/85">Head recommendation</p>
                  <p className="mt-1 text-[11px] text-neutral-300">
                    {draftStatus === 'accepted' ? 'Recommendation submitted: approve this applicant.' : draftStatus === 'rejected' ? 'Recommendation submitted: reject this applicant.' : 'No recommendation submitted yet.'}
                  </p>
                  <p className="mt-1 text-[10.5px] text-neutral-500">The Secretariat still makes the final decision.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void persist('accepted')} disabled={saving || adminDecision !== 'pending' || activeItem.status === 'accepted' || activeItem.status === 'rejected'} className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-2 text-[11px] font-medium text-emerald-300 transition-colors hover:bg-emerald-400/[0.13] disabled:opacity-40">
                    {saving && draftStatus === 'accepted' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    Recommend approval
                  </button>
                  <button type="button" onClick={() => void persist('rejected')} disabled={saving || adminDecision !== 'pending' || activeItem.status === 'accepted' || activeItem.status === 'rejected'} className="inline-flex items-center gap-1.5 rounded-md border border-rose-400/25 bg-rose-400/[0.06] px-3 py-2 text-[11px] font-medium text-rose-300 transition-colors hover:bg-rose-400/[0.12] disabled:opacity-40">
                    {saving && draftStatus === 'rejected' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                    Recommend rejection
                  </button>
                </div>
              </div>
              {(adminDecision !== 'pending' || activeItem.status === 'accepted' || activeItem.status === 'rejected') && (
                <Notice tone="info" title="Secretariat decision recorded">This application already has a final admin decision. The recommendation is locked.</Notice>
              )}
              {activeItem.status === 'accepted' && activeItem.admin_finalized_at && (
                <div className="mt-4 rounded-md border border-[#d4af37]/20 bg-[#d4af37]/[0.035] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-[#d4af37]"><Link2 className="h-3.5 w-3.5" /> Manual signup link</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">This applicant has been accepted by the Secretariat. Generate a one-time link and send it manually; this website will not send emails.</p>
                    </div>
                    <button type="button" onClick={() => void createSignupLink()} disabled={signupBusy} className={btnPrimary}>
                      {signupBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      {signupBusy ? 'Creating message…' : 'Generate acceptance message'}
                    </button>
                  </div>
                  {signupNotice && <p role="status" className="mt-3 text-[11px] text-neutral-300">{signupNotice}</p>}
                  {signupUrl && (
                    <div className="mt-3 space-y-2">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-[#d4af37]">Acceptance message to send</label>
                      <textarea aria-label="Acceptance message with signup link" readOnly rows={4} value={signupMessage || signupUrl} onFocus={(e) => e.currentTarget.select()} className={`${inputCls} w-full resize-y text-xs leading-relaxed`} />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(signupMessage || signupUrl); setSignupNotice('Acceptance message copied. Send it manually to the applicant.'); } catch { setSignupNotice('Clipboard access is blocked. Select and copy the message manually.'); } }} className={btnSecondary}><Copy className="h-3.5 w-3.5" /> Copy acceptance message</button>
                        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(signupUrl); setSignupNotice('Signup link copied.'); } catch { setSignupNotice('Clipboard access is blocked. Select and copy the link manually.'); } }} className={btnSecondary}>Copy link only</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
};
