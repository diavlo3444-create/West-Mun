import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Mail,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Archive,
  Download,
  Loader2,
  AlertCircle,
  MessageSquare,
  Send,
  Eye,
  FileText,
  User,
  Calendar,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { downloadText, toCsv } from '../lib/safe';
import { ApplicantEmailLink } from '../components/ApplicantEmailLink';
import {
  Panel,
  PanelHeader,
  PageHeader,
  EmptyState,
  Notice,
  btnPrimary,
  btnSecondary,
  btnGhost,
  inputCls,
  labelCls,
  iconButtonCls,
} from '../dashboard/ui';

export interface InquiryItem {
  id: string;
  created_at: string;
  updated_at?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'resolved' | 'archived' | string;
  admin_notes?: string;
  consent_version?: string;
}

export const HeadInquiriesManager: React.FC<{
  headName?: string;
  headEmail?: string;
}> = ({ headName, headEmail }) => {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Local draft notes per inquiry ID
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const loadInquiries = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) {
        if (fetchErr.code === '42501' || /policy|permission/i.test(fetchErr.message)) {
          setError(
            'Row Level Security blocked access to inquiries. Ensure your HR department head assignment is active and the RLS migration has been applied.',
          );
        } else {
          setError(fetchErr.message || 'Failed to fetch inquiries.');
        }
        setInquiries([]);
      } else {
        const rows = (data as InquiryItem[]) || [];
        setInquiries(rows);
        const draftMap: Record<string, string> = {};
        rows.forEach((r) => {
          draftMap[r.id] = r.admin_notes || '';
        });
        setNotesDraft(draftMap);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error loading inquiries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  // Update Status helper
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!supabase) return;
    setError(null);
    setSuccess(null);

    try {
      const { data, error: updateErr } = await supabase
        .from('inquiries')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, status');

      if (updateErr) {
        // If constraint fails because 'resolved' hasn't been added to postgres check constraint,
        // gracefully fallback to 'archived' and inform user
        if (updateErr.code === '23514' && newStatus === 'resolved') {
          const { error: fallbackErr } = await supabase
            .from('inquiries')
            .update({ status: 'archived', updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('id, status');

          if (fallbackErr) throw fallbackErr;
          setSuccess('Marked as archived (schema uses "archived" for closed tickets).');
          setInquiries((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: 'archived' } : item)),
          );
          return;
        }
        throw updateErr;
      }

      setSuccess(`Inquiry status updated to "${newStatus}".`);
      setInquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status.';
      setError(
        msg.includes('42501')
          ? 'Row Level Security blocked this update. Only authenticated HR heads and Admins can update inquiries.'
          : msg,
      );
    }
  };

  // Save Private Note
  const handleSaveNote = async (id: string) => {
    if (!supabase) return;
    const noteText = notesDraft[id] ?? '';
    setSavingNoteId(id);
    setError(null);
    setSuccess(null);

    try {
      const { error: noteErr } = await supabase
        .from('inquiries')
        .update({ admin_notes: noteText.trim(), updated_at: new Date().toISOString() })
        .eq('id', id);

      if (noteErr) throw noteErr;
      setSuccess('Internal note saved.');
      setInquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, admin_notes: noteText.trim() } : item)),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save note.';
      setError(msg);
    } finally {
      setSavingNoteId(null);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Received At',
      'Sender Name',
      'Email',
      'Subject',
      'Message',
      'Status',
      'Internal Notes',
      'Consent Version',
    ];

    const rows = filteredInquiries.map((item) => [
      item.id,
      item.created_at,
      item.name,
      item.email,
      item.subject,
      item.message,
      item.status,
      item.admin_notes || '',
      item.consent_version || '',
    ]);

    const csvContent = toCsv([headers, ...rows]);
    downloadText(`west-mun-hr-inquiries-${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  // Filtering
  const filteredInquiries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inquiries.filter((item) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'closed') {
          if (item.status !== 'resolved' && item.status !== 'archived') return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
      }

      // Query search
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        (item.admin_notes && item.admin_notes.toLowerCase().includes(q))
      );
    });
  }, [inquiries, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = inquiries.length;
    const newCount = inquiries.filter((i) => i.status === 'new').length;
    const readCount = inquiries.filter((i) => i.status === 'read').length;
    const closedCount = inquiries.filter((i) => i.status === 'resolved' || i.status === 'archived').length;
    return { total, newCount, readCount, closedCount };
  }, [inquiries]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Human Resources & Delegate Services"
        title="Public Secretariat Inquiries"
        description="Review, process, and address incoming diplomatic queries, delegation inquiries, and institutional correspondence submitted through the WEST MUN contact portal."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={loadInquiries}
              disabled={loading}
              title="Refresh messages"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={handleExportCsv}
              disabled={filteredInquiries.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV ({filteredInquiries.length})</span>
            </button>
          </div>
        }
      />

      {error && (
        <Notice tone="error" title="Access Notice">
          {error}
        </Notice>
      )}

      {success && (
        <Notice tone="success" title="Status updated">
          {success}
        </Notice>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-[10px] border border-white/[0.08] bg-[#0c0c0f]">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400">
            Total Messages
          </span>
          <p className="mt-1 text-2xl font-serif text-white">{stats.total}</p>
        </div>
        <div className="p-4 rounded-[10px] border border-[#d4af37]/30 bg-[#d4af37]/10">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#d4af37]">
            New / Unread
          </span>
          <p className="mt-1 text-2xl font-serif text-[#d4af37]">{stats.newCount}</p>
        </div>
        <div className="p-4 rounded-[10px] border border-sky-500/20 bg-sky-950/10">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-sky-400">
            Read / In Review
          </span>
          <p className="mt-1 text-2xl font-serif text-sky-300">{stats.readCount}</p>
        </div>
        <div className="p-4 rounded-[10px] border border-emerald-500/20 bg-emerald-950/10">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-400">
            Resolved / Archived
          </span>
          <p className="mt-1 text-2xl font-serif text-emerald-300">{stats.closedCount}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-[10px] border border-white/[0.08] bg-[#0f0f13]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            className={`${inputCls} pl-9`}
            placeholder="Search by delegate name, email, subject, or message text…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
          <select
            className="rounded-md border border-white/[0.1] bg-[#101013] px-3 py-2 text-[12px] text-neutral-200"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Inquiries ({inquiries.length})</option>
            <option value="new">New only ({stats.newCount})</option>
            <option value="read">Read only ({stats.readCount})</option>
            <option value="resolved">Resolved only</option>
            <option value="closed">Resolved & Archived ({stats.closedCount})</option>
          </select>
        </div>
      </div>

      {/* Inquiries Content Panel */}
      <Panel>
        <PanelHeader
          eyebrow="Incoming Transmissions"
          title={`Inquiries (${filteredInquiries.length})`}
          description="Inquiries sent through the public contact form. Reply directly via email or update internal processing status below."
        />

        {loading ? (
          <div className="p-12 text-center text-sm text-neutral-400 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
            <span>Loading inquiries from database…</span>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={MessageSquare}
              title={inquiries.length === 0 ? 'No inquiries received yet' : 'No matching inquiries'}
              description={
                inquiries.length === 0
                  ? 'Messages submitted via the public contact section will automatically appear here for HR review.'
                  : 'Try adjusting your search criteria or clearing the status filter.'
              }
              action={
                searchQuery || statusFilter !== 'all' ? (
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filter
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredInquiries.map((item) => {
              const isNew = item.status === 'new';
              const isResolved = item.status === 'resolved' || item.status === 'archived';
              const isDraftChanged = (notesDraft[item.id] ?? '') !== (item.admin_notes ?? '');

              return (
                <article
                  key={item.id}
                  className={`p-5 transition-colors ${
                    isNew ? 'bg-[#d4af37]/[0.025] border-l-2 border-[#d4af37]' : 'hover:bg-white/[0.015]'
                  }`}
                >
                  {/* Header row: Sender name, email, timestamp, status badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{item.name}</span>
                      <ApplicantEmailLink
                        applicantName={item.name}
                        applicantEmail={item.email}
                        inquirySubject={item.subject}
                        templateType="inquiry_reply"
                        variant="inline"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {/* Status pill */}
                      {isNew && (
                        <span className="rounded border border-[#d4af37]/40 bg-[#d4af37]/10 px-2 py-0.5 text-[9.5px] font-mono uppercase tracking-[0.14em] text-[#d4af37]">
                          New
                        </span>
                      )}
                      {item.status === 'read' && (
                        <span className="rounded border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 text-[9.5px] font-mono uppercase tracking-[0.14em] text-sky-400">
                          Read
                        </span>
                      )}
                      {isResolved && (
                        <span className="rounded border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[9.5px] font-mono uppercase tracking-[0.14em] text-emerald-400">
                          {item.status === 'resolved' ? 'Resolved' : 'Archived'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="mb-2 text-sm text-neutral-200">
                    <span className="text-neutral-400 font-medium">Subject: </span>
                    <span className="text-white font-medium">{item.subject}</span>
                  </div>

                  {/* Message body */}
                  <div className="rounded-md border border-white/[0.07] bg-[#09090b] p-3.5 text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {item.message}
                  </div>

                  {/* Action Bar: Quick status change, notes, mailto */}
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Status selection and quick action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        Status:
                      </span>
                      <select
                        className="rounded border border-white/[0.1] bg-[#101013] px-2.5 py-1 text-xs text-neutral-200"
                        value={item.status}
                        onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                        aria-label="Change inquiry status"
                      >
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="resolved">Resolved</option>
                        <option value="archived">Archived</option>
                      </select>

                      {isNew && (
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => handleUpdateStatus(item.id, 'read')}
                          title="Mark inquiry as read"
                        >
                          <Eye className="h-3 w-3 text-sky-400" />
                          <span>Mark Read</span>
                        </button>
                      )}

                      {!isResolved && (
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => handleUpdateStatus(item.id, 'resolved')}
                          title="Mark inquiry as resolved"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span>Mark Resolved</span>
                        </button>
                      )}

                      {isResolved && (
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => handleUpdateStatus(item.id, 'new')}
                          title="Re-open inquiry"
                        >
                          <Clock className="h-3 w-3 text-amber-400" />
                          <span>Re-open</span>
                        </button>
                      )}

                      <ApplicantEmailLink
                        applicantName={item.name}
                        applicantEmail={item.email}
                        inquirySubject={item.subject}
                        templateType="inquiry_reply"
                        variant="button"
                        buttonLabel="Reply in Gmail"
                        align="right"
                      />
                    </div>

                    {/* Private Internal HR Note */}
                    <div className="flex items-center gap-2 w-full md:w-auto md:min-w-[320px]">
                      <input
                        type="text"
                        maxLength={5000}
                        className={`${inputCls} py-1 text-xs`}
                        placeholder="Private HR internal note…"
                        value={notesDraft[item.id] ?? ''}
                        onChange={(e) =>
                          setNotesDraft({ ...notesDraft, [item.id]: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={!isDraftChanged || savingNoteId === item.id}
                        onClick={() => handleSaveNote(item.id)}
                      >
                        {savingNoteId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span>Save</span>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};
