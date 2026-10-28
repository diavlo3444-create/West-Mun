import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw, Search, Users, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ApplicantEmailLink } from '../components/ApplicantEmailLink';
import { Notice, PageHeader, Panel, Skeleton, inputCls } from '../dashboard/ui';

type HrArea = 'delegates' | 'chair' | 'team';
type Applicant = {
  id: string;
  full_name: string;
  email: string;
  institution?: string | null;
  status: string;
  created_at: string;
  team?: string | null;
  section?: string | null;
  tier?: string | null;
  delegation_type?: string | null;
  committee_preferences?: string | null;
};

const teamOptions = [
  { label: 'All teams', value: 'all' },
  { label: 'Media & Press', value: 'media' },
  { label: 'Security & Protocol', value: 'security' },
  { label: 'Volunteers', value: 'volunteer' },
];

const statusLabel = (status: string) => (status || 'pending').replaceAll('_', ' ');

export const HrApplicantHub: React.FC<{ area: HrArea }> = ({ area }) => {
  const [rows, setRows] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'accepted' | 'rejected'>('accepted');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!supabase) {
      setRows([]);
      setError('Supabase is not configured on this deployment.');
      setLoading(false);
      return;
    }

    const table = area === 'delegates' ? 'delegates' : area === 'chair' ? 'wm_chair_applications' : 'team_registrations';
    const columns = area === 'delegates'
      ? 'id,full_name,email,institution,status,created_at,tier,delegation_type'
      : area === 'chair'
        ? 'id,full_name,email,institution,status,created_at,committee_preferences'
        : 'id,full_name,email,institution,status,created_at,team,section';
    const { data, error: queryError } = await supabase.from(table).select(columns).in('status', ['accepted', 'rejected']).order('created_at', { ascending: false });
    if (queryError) {
      setRows([]);
      setError(queryError.message || 'Applications could not be loaded.');
    } else {
      setRows((data || []) as Applicant[]);
    }
    setLoading(false);
  }, [area]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.status !== statusFilter) return false;
      const haystack = [row.full_name, row.email, row.institution, row.team, row.section, row.tier, row.delegation_type, row.committee_preferences]
        .some((value) => String(value || '').toLowerCase().includes(q));
      const normalizedTeam = String(row.team || '').toLowerCase();
      const matchesTeam = teamFilter === 'all'
        || (teamFilter === 'media' && (normalizedTeam.includes('media') || normalizedTeam.includes('press')))
        || (teamFilter === 'security' && (normalizedTeam.includes('security') || normalizedTeam.includes('protocol')))
        || (teamFilter === 'volunteer' && normalizedTeam.includes('volunteer'));
      return haystack && matchesTeam;
    });
  }, [rows, search, teamFilter, statusFilter]);

  const sendAllEmails = useCallback((targetStatus: 'accepted' | 'rejected') => {
    // Use all applicants in the chosen decision section, not only visible search results.
    const recipients = Array.from(new Set(
      rows.filter((row) => row.status === targetStatus)
        .map((row) => String(row.email || '').trim())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ));
    if (recipients.length === 0) {
      setError(`There are no valid email addresses among ${targetStatus} applicants in this list.`);
      return;
    }

    const isAccepted = targetStatus === 'accepted';
    const subject = isAccepted
      ? 'WEST MUN 2027 — Application Approved'
      : 'WEST MUN 2027 — Application Status Update';
    const body = isAccepted
      ? `Hello Applicant,\n\nCongratulations! Your application to WEST MUN 2027 has been accepted. The team will share any role-specific next steps separately.\n\nIf you have any questions, please reply to this email.\n\nBest regards,\nWEST MUN Team`
      : `Hello Applicant,\n\nThank you for your interest in WEST MUN 2027 and for taking the time to submit your application. Following a review of applications, we regret to inform you that we are unable to offer you a position at this time. We appreciate your interest and encourage you to follow future WEST MUN announcements and opportunities at https://west-mun.vercel.app.\n\nBest regards,\nWEST MUN Secretariat`;

    // Gmail opens a draft with recipients hidden from one another for privacy.
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      bcc: recipients.join(','),
      su: subject,
      body,
    });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank', 'noopener,noreferrer');
  }, [rows]);

  const title = area === 'delegates' ? 'Delegate Applications' : area === 'chair' ? 'Chair Applications' : 'Team Member Applications';
  const description = area === 'delegates'
    ? 'View accepted delegate applicants. Send All Emails opens a Gmail draft addressed to all accepted applicants.'
    : area === 'chair'
      ? 'View accepted chair applicants. Send All Emails opens a Gmail draft addressed to all accepted applicants.'
      : 'Browse accepted applicants across Media & Press, Security & Protocol, and Volunteers. Send All Emails opens a Gmail draft addressed to all accepted applicants.';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Human resources"
        title={title}
        description={description}
        actions={<div className="flex flex-wrap gap-2"><button type="button" onClick={() => sendAllEmails('accepted')} disabled={loading || !rows.some((row) => row.status === 'accepted')} className="inline-flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-50"><Send className="h-3.5 w-3.5" />Draft Accepted Emails</button><button type="button" onClick={() => sendAllEmails('rejected')} disabled={loading || !rows.some((row) => row.status === 'rejected')} className="inline-flex items-center gap-2 rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-400/20 disabled:opacity-50"><Send className="h-3.5 w-3.5" />Draft Rejected Emails</button><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/[0.04] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setStatusFilter('accepted')} className={`rounded-lg border px-3 py-2 text-xs transition ${statusFilter === 'accepted' ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200' : 'border-white/10 text-neutral-300 hover:bg-white/[0.04]'}`}>Accepted ({rows.filter((row) => row.status === 'accepted').length})</button>
        <button type="button" onClick={() => setStatusFilter('rejected')} className={`rounded-lg border px-3 py-2 text-xs transition ${statusFilter === 'rejected' ? 'border-rose-400/50 bg-rose-400/10 text-rose-200' : 'border-white/10 text-neutral-300 hover:bg-white/[0.04]'}`}>Rejected ({rows.filter((row) => row.status === 'rejected').length})</button>
      </div>
      {area === 'team' && (
        <div className="flex flex-wrap gap-2">
          {teamOptions.map((option) => (
            <button key={option.value} type="button" onClick={() => setTeamFilter(option.value)} className={`rounded-lg border px-3 py-2 text-xs transition ${teamFilter === option.value ? 'border-[#d4af37]/50 bg-[#d4af37]/10 text-[#f1d98c]' : 'border-white/10 text-neutral-300 hover:bg-white/[0.04]'}`}>{option.label}</button>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, school, or team…" aria-label="Search applicants" className={`${inputCls} w-full pl-9`} />
      </div>
      {error && <Notice tone="error" title="Could not load applications">{error}</Notice>}
      <Panel>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-medium text-white"><Users className="h-4 w-4 text-[#d4af37]" />Applicants</p>
          <span className="font-mono text-[10px] text-neutral-400">{filtered.length} shown</span>
        </div>
        {loading ? <div className="space-y-3 p-4"><Skeleton /><Skeleton /><Skeleton /></div> : filtered.length === 0 ? (
          <div className="p-8 text-center"><Mail className="mx-auto h-6 w-6 text-neutral-500" /><p className="mt-2 text-sm text-neutral-300">No applicants found.</p><p className="mt-1 text-xs text-neutral-500">Try another search, switch the Accepted/Rejected section, or refresh the list.</p></div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {filtered.map((applicant) => (
              <li key={applicant.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium text-white">{applicant.full_name}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] capitalize text-neutral-300">{statusLabel(applicant.status)}</span></div>
                  <p className="mt-1 truncate text-xs text-neutral-300">{applicant.email || 'No email provided'}</p>
                  <p className="mt-1 text-[11px] text-neutral-500">{area === 'team' ? [applicant.team, applicant.section, applicant.institution].filter(Boolean).join(' · ') : area === 'delegates' ? [applicant.institution, applicant.delegation_type?.replaceAll('_', ' '), applicant.tier?.replaceAll('_', ' ')].filter(Boolean).join(' · ') : [applicant.institution, applicant.committee_preferences].filter(Boolean).join(' · ')}</p>
                </div>
                <ApplicantEmailLink applicantName={applicant.full_name} applicantEmail={applicant.email} registrationId={area === 'team' ? applicant.id : undefined} type={area === 'delegates' ? 'delegate' : 'team'} department={area === 'team' ? applicant.team : area === 'chair' ? 'Chair' : 'Delegates'} section={applicant.section || undefined} status={applicant.status} institution={applicant.institution || undefined} templateType={area === 'team' ? undefined : 'general'} skipInviteGeneration={area !== 'team'} variant="button" buttonLabel="Send Email" align="right" />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};
