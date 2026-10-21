import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, LoaderCircle, MapPin, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ApplicantEmailLink } from '../components/ApplicantEmailLink';
import type { DepartmentKey, SectionKey } from './departments';

type Applicant = { id: string; full_name: string; email: string; team: string; section: string; status: string };
type Assignment = {
  id: string; registration_id: string; department: DepartmentKey; section: string;
  assignment_title: string; station: string; starts_at: string; ends_at: string;
  reporting_to: string; status: 'assigned'|'in_progress'|'completed'|'no_show'|'cancelled'; notes: string;
  registration?: { full_name?: string; email?: string; section?: string } | null;
};
type Props = { department: DepartmentKey; section?: SectionKey | null };
const field = 'w-full rounded-md border border-white/10 bg-[#111115] px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none';
const button = 'inline-flex items-center justify-center gap-2 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-2 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/20 disabled:opacity-50';
const panel = 'rounded-lg border border-white/10 bg-[#111115]/90 p-4';
const label = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400';
const TEAM_NAMES: Record<string,string> = { media_press:'Media & Press', security:'Security & Protocol', volunteers:'Volunteers' };
const normalizeTeam = (team: string) => team.toLowerCase().trim().replace(/\s+/g,'_');

export const TeamDeploymentPlanner: React.FC<Props> = ({ department, section }) => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [registrationId, setRegistrationId] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [station, setStation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reportingTo, setReportingTo] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const applicantMatches = useCallback((a: Applicant) => {
    const team = normalizeTeam(a.team);
    const expected = department === 'media_press' ? ['media','media_press'].includes(team)
      : department === 'volunteers' ? ['volunteer','volunteers'].includes(team)
      : team === 'security';
    return expected && a.status === 'accepted' && (!section || a.section === section);
  }, [department, section]);

  const load = useCallback(async () => {
    if (!supabase) { setError('Database client is not configured.'); return; }
    setBusy(true); setError('');
    try {
      const [appResult, assignmentResult] = await Promise.all([
        supabase.from('team_registrations').select('id,full_name,email,team,section,status').eq('status','accepted').order('full_name'),
        supabase.from('wm_team_assignments').select('*, registration:team_registrations(full_name,email,section)').eq('department',department).order('starts_at',{ascending:true})
      ]);
      if (appResult.error) throw appResult.error;
      if (assignmentResult.error) throw assignmentResult.error;
      const approved = ((appResult.data || []) as Applicant[]).filter(applicantMatches);
      setApplicants(approved);
      setAssignments((assignmentResult.data || []) as Assignment[]);
      setRegistrationId(current => approved.some(a => a.id === current) ? current : (approved[0]?.id || ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load approved applicants and deployment assignments.');
    } finally { setBusy(false); }
  }, [applicantMatches, department, section]);

  useEffect(() => { void load(); }, [load]);

  const selectedApplicant = useMemo(() => applicants.find(a => a.id === registrationId), [applicants, registrationId]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedApplicant) { setError('Choose an approved applicant first.'); return; }
    if (!assignmentTitle.trim() || !station.trim() || !startsAt || !endsAt || !reportingTo.trim()) {
      setError('Complete the duty, station, start/end time, and reporting supervisor.'); return;
    }
    const start = new Date(startsAt), end = new Date(endsAt);
    if (!(end > start)) { setError('The end time must be after the start time.'); return; }
    const chosenSection = section || (selectedApplicant.section === 'male' || selectedApplicant.section === 'female' ? selectedApplicant.section : 'general');
    if (!chosenSection) { setError('Choose the applicant’s section.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: insertError } = await supabase.from('wm_team_assignments').insert({
        registration_id: selectedApplicant.id, department, section: chosenSection,
        assignment_title: assignmentTitle.trim(), station: station.trim(),
        starts_at: start.toISOString(), ends_at: end.toISOString(),
        reporting_to: reportingTo.trim(), notes: notes.trim(), status: 'assigned'
      });
      if (insertError) throw insertError;
      setNotice('Deployment assignment saved.'); setAssignmentTitle(''); setStation('');
      setStartsAt(''); setEndsAt(''); setReportingTo(''); setNotes('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this assignment.');
    } finally { setBusy(false); }
  };

  const updateStatus = async (item: Assignment, status: Assignment['status']) => {
    if (!supabase) return;
    setError(''); setNotice('');
    const { error: updateError } = await supabase.from('wm_team_assignments').update({ status, updated_at: new Date().toISOString() }).eq('id',item.id);
    if (updateError) setError(updateError.message);
    else { setNotice('Assignment status updated.'); await load(); }
  };
  const remove = async (item: Assignment) => {
    if (!supabase || !window.confirm('Remove this deployment assignment?')) return;
    const { error: deleteError } = await supabase.from('wm_team_assignments').delete().eq('id',item.id);
    if (deleteError) setError(deleteError.message); else { setNotice('Assignment removed.'); await load(); }
  };
  const fmt = (v: string) => new Date(v).toLocaleString([], { dateStyle:'medium', timeStyle:'short' });

  return <section className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] uppercase tracking-[.22em] text-[#d4af37]">Live deployment planner</p>
        <h2 className="mt-1 text-xl font-semibold">{TEAM_NAMES[department] || department} assignments</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">Assign approved applicants to specific duties, stations, shifts, sections, and supervisors. Changes are saved to Supabase and limited to your assigned department/section.</p>
      </div>
      <button className={button} onClick={() => void load()} disabled={busy}><RefreshCw size={14} className={busy?'animate-spin':''}/> Refresh</button>
    </header>
    {error && <div role="alert" className="rounded-md border border-red-400/20 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}
    {notice && <div role="status" className="rounded-md border border-emerald-400/20 bg-emerald-950/20 p-3 text-sm text-emerald-200">{notice}</div>}
    <div className="grid gap-4 xl:grid-cols-[minmax(280px,.85fr)_minmax(0,1.4fr)]">
      <form className={panel+' space-y-3'} onSubmit={submit}>
        <h3 className="flex items-center gap-2 font-semibold"><Plus size={15} className="text-[#d4af37]"/> Create deployment assignment</h3>
        <div>
          <label className={label}>Approved team member</label>
          <select className={field} value={registrationId} onChange={e=>setRegistrationId(e.target.value)} required>
            <option value="">Choose applicant…</option>
            {applicants.map(a=><option key={a.id} value={a.id}>{a.full_name} · {a.section}</option>)}
          </select>
          {selectedApplicant && (
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-neutral-400">Applicant email:</span>
              <ApplicantEmailLink
                applicantName={selectedApplicant.full_name}
                applicantEmail={selectedApplicant.email}
                type="team"
                department={department}
                section={selectedApplicant.section || section}
                status="accepted"
                assignment={{
                  title: assignmentTitle,
                  station,
                  startsAt,
                  endsAt,
                  reportingTo,
                  notes,
                  section: selectedApplicant.section || section,
                }}
              />
            </div>
          )}
          {applicants.length===0&&<p className="mt-1 text-xs text-amber-200">No approved applicants are visible for this department/section yet.</p>}
        </div>
        <div><label className={label}>Duty / role</label><input className={field} placeholder={department==='volunteers'?'e.g. Dais runner / delegate support':department==='security'?'e.g. Entrance checkpoint / floor patrol':'e.g. Plenary photographer / committee reporter'} value={assignmentTitle} onChange={e=>setAssignmentTitle(e.target.value)} required/></div>
        <div><label className={label}>Station / location</label><input className={field} placeholder="e.g. Main entrance, A-201, Press desk" value={station} onChange={e=>setStation(e.target.value)} required/></div>
        <div><label className={label}>Shift starts</label><input type="datetime-local" className={field} value={startsAt} onChange={e=>setStartsAt(e.target.value)} required/></div>
        <div><label className={label}>Shift ends</label><input type="datetime-local" className={field} value={endsAt} onChange={e=>setEndsAt(e.target.value)} required/></div>
        <div><label className={label}>Reports to</label><input className={field} placeholder="Supervisor / team lead" value={reportingTo} onChange={e=>setReportingTo(e.target.value)} required/></div>
        <div><label className={label}>Instructions / notes</label><textarea className={field} rows={3} placeholder="Equipment, handover notes, check-in instructions…" value={notes} onChange={e=>setNotes(e.target.value)}/></div>
        <button className={button} disabled={busy||!applicants.length}><Plus size={14}/> Save assignment</button>
      </form>
      <div className="space-y-3">
        <div className={panel+' flex flex-wrap items-center justify-between gap-3'}><div><h3 className="font-semibold">Deployment roster</h3><p className="mt-1 text-xs text-neutral-400">{assignments.length} assignment(s) · {assignments.filter(a=>a.status==='assigned'||a.status==='in_progress').length} active</p></div><div className="flex items-center gap-2 text-xs text-neutral-400"><Users size={14}/>{applicants.length} approved people</div></div>
        {assignments.length===0 && <div className={panel+' py-8 text-center text-sm text-neutral-400'}><ClipboardList size={24} className="mx-auto mb-2 text-[#d4af37]"/>No deployment assignments yet. Create the first one using an approved applicant.</div>}
        {assignments.map(a=><article key={a.id} className={panel+' space-y-3'}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold">{a.registration?.full_name || 'Team member'} <span className="text-neutral-500 font-normal">· {a.assignment_title}</span></h4>
              {a.registration?.email && (
                <div className="mt-1">
                  <ApplicantEmailLink
                    applicantName={a.registration.full_name}
                    applicantEmail={a.registration.email}
                    type="team"
                    department={department}
                    section={a.section || section}
                    status="accepted"
                    assignment={{
                      title: a.assignment_title,
                      station: a.station,
                      startsAt: a.starts_at,
                      endsAt: a.ends_at,
                      reportingTo: a.reporting_to,
                      notes: a.notes,
                      section: a.section,
                    }}
                    templateType="shift_assignment"
                  />
                </div>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-300"><MapPin size={12}/>{a.station} · {a.section}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400"><CalendarClock size={12}/>{fmt(a.starts_at)} – {fmt(a.ends_at)}</p>
              <p className="mt-1 text-xs text-neutral-400">Reports to: <span className="text-neutral-200">{a.reporting_to}</span></p>
              {a.notes&&<p className="mt-2 whitespace-pre-wrap text-xs text-neutral-400">{a.notes}</p>}
            </div>
            <button type="button" aria-label="Remove assignment" className="rounded-md border border-red-400/20 p-2 text-red-300 hover:bg-red-400/10" onClick={()=>void remove(a)}><Trash2 size={14}/></button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3"><span className="text-[10px] uppercase tracking-wider text-neutral-500">Shift status</span><select className={field+' w-auto'} value={a.status} onChange={e=>void updateStatus(a,e.target.value as Assignment['status'])}><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="no_show">No show</option><option value="cancelled">Cancelled</option></select></div>
        </article>)}
      </div>
    </div>
  </section>;
};
