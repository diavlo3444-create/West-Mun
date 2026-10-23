import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BriefcaseBusiness, Check, LoaderCircle, Plus, RefreshCw, Trash2, Users, Clock3 } from 'lucide-react';
import type { DepartmentKey, SectionKey } from './departments';
import { TeamDeploymentPlanner } from './TeamDeploymentPlanner';
import { ApplicantEmailLink } from '../components/ApplicantEmailLink';
import { ShiftManagementDashboard } from './shifts/ShiftManagementDashboard';
import { GroupManagementDashboard } from './groups/GroupManagementDashboard';
import {
  assignPersonToShift, createDepartmentPerson, createDepartmentShift, deleteDepartmentPerson,
  listDepartmentPeople, listDepartmentShifts, setRegistrationWindowStatus, listRegistrationWindows,
  updateDepartmentPerson, updateDepartmentShift, listShiftAssignments, updateAssignmentStatus,
  type WmPerson, type WmShift, type WmRegistrationWindow, type WmTeamGroup,
} from './services/operationsStore';

type Props = {
  department: DepartmentKey;
  section?: SectionKey | null;
  testToken?: string | null;
  initialGroup?: WmTeamGroup | null;
};
type Tab = 'people' | 'groups' | 'shifts' | 'registrations' | 'deployment';
const field = 'w-full rounded-md border border-white/10 bg-[#111115] px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none';
const button = 'inline-flex items-center justify-center gap-2 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-2 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/20 disabled:opacity-50';
const panel = 'rounded-lg border border-white/10 bg-[#111115]/90 p-4';
const label = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400';

export const OperationsWorkspace: React.FC<Props> = ({ department, section, testToken, initialGroup }) => {
  const [tab, setTab] = useState<Tab>(initialGroup ? 'shifts' : 'people');
  const [people, setPeople] = useState<WmPerson[]>([]);
  const [shifts, setShifts] = useState<WmShift[]>([]);
  const [windows, setWindows] = useState<WmRegistrationWindow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [roleForm, setRoleForm] = useState({ display_name: '', email: '', role_title: '', private_notes: '' });
  const [shiftForm, setShiftForm] = useState({ title: '', location: '', starts_at: '', ends_at: '', capacity: 4 });
  const [selectedGroupForShift, setSelectedGroupForShift] = useState<WmTeamGroup | null>(initialGroup || null);

  useEffect(() => {
    if (initialGroup) {
      setSelectedGroupForShift(initialGroup);
      setTab('shifts');
    }
  }, [initialGroup]);

  // Dedicated test token passed when running under a verified Super IT Test Session.
  // For ordinary department heads, this is strictly null so that queries execute
  // directly against Supabase RLS under their own authentic head session.
  const effectiveTestToken = testToken || null;

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [p, sh, win] = await Promise.all([
        listDepartmentPeople(department, section, effectiveTestToken),
        listDepartmentShifts(department, section, effectiveTestToken),
        listRegistrationWindows(effectiveTestToken),
      ]);
      if (!p.ok) throw new Error(p.error || 'Could not load people.');
      if (!sh.ok) throw new Error(sh.error || 'Could not load shifts.');
      setPeople(p.data || []); setShifts(sh.data || []);
      if (win.ok) {
        setWindows(win.data || []);
      } else {
        setWindows([]);
        setError(`Could not load registration windows: ${win.error || 'Unknown database error'}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load workspace data.';
      setError(msg);
      if (effectiveTestToken && (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('session invalid') || msg.toLowerCase().includes('invalid token'))) {
        try {
          sessionStorage.removeItem('westmun_super_it_test_session');
          localStorage.removeItem('westmun_super_it_test_session');
        } catch {}
      }
    }
    finally { setBusy(false); }
  }, [department, section, effectiveTestToken]);

  useEffect(() => { void load(); }, [load]);

  const run = async (action: () => Promise<{ ok: boolean; error?: string }>, success: string): Promise<boolean> => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await action();
      if (!result.ok) throw new Error(result.error || 'The change was not saved.');
      await load();
      setNotice(success);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The change was not saved.');
      return false;
    } finally { setBusy(false); }
  };

  const createRole = async () => {
    if (!roleForm.display_name.trim() || !roleForm.role_title.trim()) { setError('Enter a person/position name and a custom role title.'); return; }
    const saved = await run(async () => createDepartmentPerson({ ...roleForm, department, section, status: 'active' }, effectiveTestToken), 'Custom role/person saved to Supabase.');
    if (saved) setRoleForm({ display_name: '', email: '', role_title: '', private_notes: '' });
  };
  const createShift = async () => {
    if (!shiftForm.title.trim() || !shiftForm.location.trim() || !shiftForm.starts_at || !shiftForm.ends_at) { setError('Complete the shift title, location, start and end times.'); return; }
    const start = new Date(shiftForm.starts_at), end = new Date(shiftForm.ends_at);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) { setError('The shift end must be after its start.'); return; }
    const saved = await run(async () => createDepartmentShift({ department, section, title: shiftForm.title, location: shiftForm.location, starts_at: start.toISOString(), ends_at: end.toISOString(), capacity: shiftForm.capacity }, effectiveTestToken), 'Shift created.');
    if (saved) setShiftForm({ title: '', location: '', starts_at: '', ends_at: '', capacity: 4 });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'people', label: 'Custom roles & people', icon: <Users size={15}/> },
    { id: 'groups', label: 'Team groups', icon: <Users size={15}/> },
    { id: 'shifts', label: 'Shifts & coverage', icon: <Clock3 size={15}/> },
    ...(['media_press', 'security', 'volunteers'].includes(department) ? [{ id: 'deployment' as Tab, label: 'Team deployment', icon: <Users size={15}/> }] : []),
    { id: 'registrations', label: 'Registration windows', icon: <BriefcaseBusiness size={15}/> },
  ];

  return <section className="space-y-5 text-white">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] uppercase tracking-[.22em] text-[#d4af37]">Live operations · Supabase</p><h1 className="mt-1 text-2xl font-semibold">{department === 'media_press' ? 'Media production studio' : department === 'design' ? 'Design project studio' : 'Department operations'}</h1><p className="mt-1 max-w-2xl text-sm text-neutral-400">Manage custom roles, staff assignments, team groups, shift coverage and registration windows. Changes are saved to the production database.</p></div>
      <button className={button} onClick={() => { void load(); }} disabled={busy}><RefreshCw size={14} className={busy ? 'animate-spin' : ''}/> Refresh</button>
    </header>
    {error && <div role="alert" className="flex gap-2 rounded-md border border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200"><AlertCircle size={17} className="shrink-0"/>{error}</div>}
    {notice && <div role="status" className="flex gap-2 rounded-md border border-emerald-400/20 bg-emerald-950/20 p-3 text-sm text-emerald-200"><Check size={16}/>{notice}</div>}
    <nav className="flex flex-wrap gap-2">{tabs.map(t => <button key={t.id} className={tab===t.id ? button : 'inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-neutral-400 hover:text-white'} onClick={() => setTab(t.id)}>{t.icon}{t.label}</button>)}</nav>

    {tab === 'people' && <div className="grid gap-4 lg:grid-cols-[minmax(260px,.8fr)_minmax(0,1.2fr)]">
      <form className={panel+' space-y-3'} onSubmit={e => { e.preventDefault(); createRole(); }}>
        <h2 className="font-semibold">Create a custom position</h2><p className="text-xs text-neutral-400">Role titles are plain operational labels and never grant application permissions.</p>
        <div><label className={label}>Person / position name</label><input className={field} placeholder="e.g. Bathroom Volunteer" value={roleForm.display_name} onChange={e=>setRoleForm({...roleForm,display_name:e.target.value})}/></div>
        <div><label className={label}>Custom role title</label><input className={field} placeholder="e.g. Hall Supervisor" value={roleForm.role_title} onChange={e=>setRoleForm({...roleForm,role_title:e.target.value})}/></div>
        <div><label className={label}>Email (optional)</label><input type="email" className={field} placeholder="staff@example.com" value={roleForm.email} onChange={e=>setRoleForm({...roleForm,email:e.target.value})}/></div>
        <div><label className={label}>Private instructions / notes</label><textarea className={field} rows={3} value={roleForm.private_notes} onChange={e=>setRoleForm({...roleForm,private_notes:e.target.value})}/></div>
        <button className={button} disabled={busy}><Plus size={14}/> Create role/person</button>
      </form>
      <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold">People & custom roles</h2><span className="text-xs text-neutral-500">{people.length} records</span></div>
        {people.length===0 && <div className={panel+' text-sm text-neutral-400'}>No operational people yet. Create the first custom position.</div>}
        {people.map(p=><article key={p.id} className={panel+' flex flex-wrap items-start justify-between gap-3'}>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-white">{p.display_name}</div>
            <div className="mt-1 text-xs text-[#d4af37]">{p.role_title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
              {p.email ? (
                <ApplicantEmailLink
                  applicantName={p.display_name}
                  applicantEmail={p.email}
                  type="team"
                  department={department}
                  section={p.section || section}
                  status={p.status}
                  roleTitle={p.role_title}
                  variant="inline"
                />
              ) : (
                <span className="text-neutral-500">No email</span>
              )}
              <span>· {p.status} · {p.section || 'Department-wide'}</span>
            </div>
            {p.private_notes && <p className="mt-2 whitespace-pre-wrap text-xs text-neutral-400">{p.private_notes}</p>}
          </div>
          <div className="flex gap-2"><button className={button} onClick={()=>{const title=window.prompt('Edit custom role title',p.role_title); if(title?.trim()) void run(()=>updateDepartmentPerson(p.id,{role_title:title.trim()},effectiveTestToken),'Role updated.');}}>Edit role</button><button aria-label={'Delete '+p.display_name} className="rounded-md border border-red-400/20 p-2 text-red-300" onClick={()=>{if(window.confirm('Delete this person/role record? Related assignments may prevent deletion.')) void run(()=>deleteDepartmentPerson(p.id,effectiveTestToken),'Person/role deleted.');}}><Trash2 size={14}/></button></div>
        </article>)}
      </div>
    </div>}

    {tab === 'groups' && (
      <GroupManagementDashboard
        department={department}
        section={section}
        testToken={effectiveTestToken}
        onAssignGroupToShift={(group) => {
          setSelectedGroupForShift(group);
          setTab('shifts');
        }}
      />
    )}

    {tab === 'shifts' && (
      <ShiftManagementDashboard
        department={department}
        section={section}
        testToken={effectiveTestToken}
        initialGroup={selectedGroupForShift}
      />
    )}

    {tab === 'deployment' && ['media_press', 'security', 'volunteers'].includes(department) && <TeamDeploymentPlanner department={department} section={section} testToken={effectiveTestToken}/>}

    {tab === 'registrations' && <div className="space-y-3"><div className={panel}><h2 className="font-semibold">Registration windows</h2><p className="mt-1 text-xs text-neutral-400">These controls use the database-backed windows. The database trigger remains the final enforcement layer.</p></div>{windows.length===0&&<div className={panel+' text-sm text-neutral-400'}>No windows returned for this account. This may be an RLS restriction; no changes were made.</div>}{windows.map(w=><div key={w.team} className={panel+' flex flex-wrap items-center justify-between gap-3'}><div><div className="font-medium">{w.team}</div><div className="text-xs text-neutral-500">Updated {new Date(w.updated_at).toLocaleString()}</div></div><button className={button} disabled={busy} onClick={()=>void run(()=>setRegistrationWindowStatus(w.team,!w.is_open,effectiveTestToken), 'Registration window updated.')}>{w.is_open?'Close registration':'Open registration'}</button></div>)}</div>}
    <div className="flex items-center gap-2 text-[11px] text-neutral-500"><LoaderCircle size={12} className={busy?'animate-spin':'hidden'}/> Live database operations · access is still restricted by Supabase RLS.</div>
  </section>;
};

const ShiftCard: React.FC<{shift:WmShift;people:WmPerson[];testToken?:string|null;refresh:()=>Promise<void>}> = ({shift,people,testToken,refresh}) => {
  const [personId,setPersonId]=useState(''); const [assignments,setAssignments]=useState<Awaited<ReturnType<typeof listShiftAssignments>>['data'] extends (infer T)[]|undefined?T[]:never>([]);
  const [err,setErr]=useState('');
  const load=useCallback(async()=>{const r=await listShiftAssignments(shift.id,testToken);if(r.ok)setAssignments(r.data||[]);else setErr(r.error||'Could not load assignments.');},[shift.id,testToken]);
  useEffect(()=>{void load();},[load]);
  const run=async(fn:()=>Promise<{ok:boolean;error?:string}>)=>{setErr('');const r=await fn();if(!r.ok){setErr(r.error||'Could not save.');return;}await load();await refresh();};
  const assigned=(assignments||[]).filter((a:any)=>a.status!=='cancelled').length;
  return <article className={panel+' space-y-3'}><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-medium">{shift.title}</h3><p className="mt-1 text-xs text-neutral-400">{shift.location} · {new Date(shift.starts_at).toLocaleString()} – {new Date(shift.ends_at).toLocaleString()}</p><p className={'mt-1 text-xs '+(assigned<shift.capacity?'text-amber-200':'text-emerald-300')}>{assigned}/{shift.capacity} staffed · {Math.max(0,shift.capacity-assigned)} gaps</p></div><button className={button} onClick={()=>void run(()=>updateDepartmentShift(shift.id,{status:shift.status==='open'?'closed':'open'},testToken))}>{shift.status==='open'?'Close shift':'Reopen shift'}</button></div>
    <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();if(personId)void run(()=>assignPersonToShift(shift.id,personId,'assigned',testToken));}}><select className={field+' min-w-[200px] flex-1'} value={personId} onChange={e=>setPersonId(e.target.value)}><option value="">Assign a person…</option>{people.map(p=><option key={p.id} value={p.id}>{p.display_name} — {p.role_title}</option>)}</select><button className={button}><Plus size={13}/> Assign</button></form>
    {(assignments||[]).map((a:any)=><div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-xs"><span>{a.person?.display_name||'Person'} · {a.status}</span><select className={field+' w-auto'} value={a.status} onChange={e=>void run(()=>updateAssignmentStatus(a.id,e.target.value as any,testToken))}><option value="assigned">Assigned</option><option value="completed">Completed</option><option value="no_show">No show</option><option value="cancelled">Cancelled</option></select></div>)}
    {err&&<p role="alert" className="text-xs text-red-300">{err}</p>}</article>;
};
