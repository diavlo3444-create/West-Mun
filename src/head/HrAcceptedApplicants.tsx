import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw, Search, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ApplicantEmailLink } from '../components/ApplicantEmailLink';
import { Notice, PageHeader, Panel, Skeleton, inputCls } from '../dashboard/ui';

interface AcceptedApplicant {
  id: string;
  full_name: string;
  email: string;
  team: string;
  section: string | null;
  status: string;
  institution: string | null;
  created_at: string;
}

export const HrAcceptedApplicants: React.FC = () => {
  const [applicants, setApplicants] = useState<AcceptedApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadApplicants = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!supabase) {
      setApplicants([]);
      setError('Supabase is not configured on this deployment.');
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from('team_registrations')
      .select('id,full_name,email,team,section,status,institution,created_at')
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (queryError) {
      setApplicants([]);
      setError(queryError.message || 'Accepted applicants could not be loaded.');
    } else {
      setApplicants((data || []) as AcceptedApplicant[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadApplicants();
  }, [loadApplicants]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applicants;
    return applicants.filter((applicant) =>
      [applicant.full_name, applicant.email, applicant.team, applicant.section, applicant.institution]
        .some((value) => String(value || '').toLowerCase().includes(q)),
    );
  }, [applicants, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Human resources"
        title="Accepted Applicants"
        description="View accepted applicants across all departments and open a prefilled Gmail draft. Review the message and press Send in Gmail."
        actions={
          <button type="button" onClick={() => void loadApplicants()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/[0.04] disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, department, or institution…"
          aria-label="Search accepted applicants"
          className={`${inputCls} w-full pl-9`}
        />
      </div>

      {error && <Notice tone="error" title="Could not load accepted applicants">{error}</Notice>}

      <Panel>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-medium text-white">
            <Users className="h-4 w-4 text-[#d4af37]" />
            Accepted applicants
          </p>
          <span className="font-mono text-[10px] text-neutral-400">{filtered.length} shown</span>
        </div>

        {loading ? (
          <div className="space-y-3 p-4"><Skeleton /><Skeleton /><Skeleton /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="mx-auto h-6 w-6 text-neutral-500" />
            <p className="mt-2 text-sm text-neutral-300">No accepted applicants found.</p>
            <p className="mt-1 text-xs text-neutral-500">Try another search or refresh the list.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {filtered.map((applicant) => (
              <li key={applicant.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{applicant.full_name}</p>
                  <p className="mt-1 truncate text-xs text-neutral-300">{applicant.email || 'No email provided'}</p>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    {applicant.team}{applicant.section ? ` · ${applicant.section}` : ''}{applicant.institution ? ` · ${applicant.institution}` : ''}
                  </p>
                </div>
                <ApplicantEmailLink
                  applicantName={applicant.full_name}
                  applicantEmail={applicant.email}
                  registrationId={applicant.id}
                  type="team"
                  department={applicant.team}
                  section={applicant.section || undefined}
                  status={applicant.status}
                  institution={applicant.institution || undefined}
                  skipInviteGeneration
                  variant="button"
                  buttonLabel="Open Gmail"
                  align="right"
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};
