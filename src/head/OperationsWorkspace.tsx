import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BriefcaseBusiness, Check, ChevronDown, LoaderCircle, Plus, RefreshCw, Trash2, Users, Video, Clock3 } from 'lucide-react';
import type { DepartmentKey, SectionKey } from './departments';
import {
  addProjectMember, assignPersonToShift, createDepartmentPerson, createDepartmentProject,
  createDepartmentShift, createProjectStage, createProjectTask, deleteDepartmentPerson,
  deleteDepartmentProject, deleteProjectTask, listDepartmentPeople, listDepartmentProjects,
  listDepartmentShifts, listProjectMembers, listProjectStages, listProjectTasks,
  removeProjectMember, setRegistrationWindowStatus, listRegistrationWindows,
  updateDepartmentPerson, updateDepartmentProject, updateProjectStage, updateProjectTask,
  updateDepartmentShift, listShiftAssignments, updateAssignmentStatus,
  type WmPerson, type WmProject, type WmProjectStage, type WmProjectTask, type WmShift,
  type WmRegistrationWindow,
} from './services/operationsStore';

type Props = { department: DepartmentKey; section?: SectionKey | null; testToken?: string | null };
type Tab = 'people' | 'projects' | 'shifts' | 'registrations';
const field = 'w-full rounded-md border border-white/10 bg-[#111115] px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none';
const button = 'inline-flex items-center justify-center gap-2 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-2 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/20 disabled:opacity-50';
const panel = 'rounded-lg border border-white/10 bg-[#111115]/90 p-4';
const label = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400';

export const OperationsWorkspace: React.FC<Props> = ({ department, section, testToken }) => {
  const [tab, setTab] = useState<Tab>('people');
  const [people, setPeople] = useState<WmPerson[]>([]);
  const [projects, setProjects] = useState<WmProject[]>([]);
  const [shifts, setShifts] = useState<WmShift[]>([]);
  const [windows, setWindows] = useState<WmRegistrationWindow[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [stages, setStages] = useState<WmProjectStage[]>([]);
  const [tasks, setTasks] = useState<WmProjectTask[]>([]);
  const [members, setMembers] = useState<Awaited<ReturnType<typeof listProjectMembers>>['data'] extends (infer T)[] | undefined ? T[] : never>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [roleForm, setRoleForm] = useState({ display_name: '', email: '', role_title: '', private_notes: '' });
  const [projectForm, setProjectForm] = useState({ title: '', brief: '', due_at: '' });
  const [stageTitle, setStageTitle] = useState('');
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium' as WmProjectTask['priority'], assigned_person_id: '' });
  const [shiftForm, setShiftForm] = useState({ title: '', location: '', starts_at: '', ends_at: '', capacity: 4 });
  const [memberForm, setMemberForm] = useState({ person_id: '', project_role: '' });

  // Fallback to stored test token if rendered inside an active Super IT test session tab
  const effectiveTestToken =
    testToken ||
    (typeof window !== 'undefined'
      ? (() => {
          try {
            const raw =
              sessionStorage.getItem('westmun_super_it_test_session') ||
              localStorage.getItem('westmun_super_it_test_session');
            return raw ? JSON.parse(raw)?.token || null : null;
          } catch {
            return null;
          }
        })()
      : null);

  const load = useCallback(async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const [p, pr, sh, win] = await Promise.all([
        listDepartmentPeople(department, section, effectiveTestToken),
        listDepartmentProjects(department, section, effectiveTestToken),
        listDepartmentShifts(department, section, effectiveTestToken),
        listRegistrationWindows(effectiveTestToken),
      ]);
      if (!p.ok) throw new Error(p.error || 'Could not load people.');
      if (!pr.ok) throw new Error(pr.error || 'Could not load projects.');
      if (!sh.ok) throw new Error(sh.error || 'Could not load shifts.');
      setPeople(p.data || []); setProjects(pr.data || []); setShifts(sh.data || []);
      if (win.ok) setWindows(win.data || []);
      setSelectedProject(current => (pr.data || []).some(x => x.id === current) ? current : (pr.data?.[0]?.id || ''));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load workspace data.'); }
    finally { setBusy(false); }
  }, [department, section, effectiveTestToken]);

  const loadProject = useCallback(async (id: string) => {
    if (!id) { setStages([]); setTasks([]); setMembers([]); return; }
    const [s, t, m] = await Promise.all([listProjectStages(id, effectiveTestToken), listProjectTasks(id, effectiveTestToken), listProjectMembers(id, effectiveTestToken)]);
    if (!s.ok || !t.ok || !m.ok) { setError(s.error || t.error || m.error || 'Could not load project details.'); return; }
    setStages(s.data || []); setTasks(t.data || []); setMembers(m.data || []);
  }, [effectiveTestToken]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadProject(selectedProject); }, [selectedProject, loadProject]);

  const run = async (action: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setBusy(true); setError(''); setNotice('');
    try { const result = await action(); if (!result.ok) throw new Error(result.error || 'The change was not saved.'); setNotice(success); await load(); await loadProject(selectedProject); }
    catch (e) { setError(e instanceof Error ? e.message : 'The change was not saved.'); }
    finally { setBusy(false); }
  };

  const createRole = () => {
    if (!roleForm.display_name.trim() || !roleForm.role_title.trim()) { setError('Enter a person/position name and a custom role title.'); return; }
    void run(async () => { const r = await createDepartmentPerson({ ...roleForm, department, section, status: 'active' }, effectiveTestToken); return r; }, 'Custom role/person saved to Supabase.');
    setRoleForm({ display_name: '', email: '', role_title: '', private_notes: '' });
  };
  const createProject = () => {
    if (!projectForm.title.trim()) { setError('Enter a project title.'); return; }
    void run(async () => createDepartmentProject({ department, section, title: projectForm.title, brief: projectForm.brief, due_at: projectForm.due_at ? new Date(projectForm.due_at).toISOString() : null }, effectiveTestToken), 'Project created.');
    setProjectForm({ title: '', brief: '', due_at: '' });
  };
  const createShift = () => {
    if (!shiftForm.title.trim() || !shiftForm.location.trim() || !shiftForm.starts_at || !shiftForm.ends_at) { setError('Complete the shift title, location, start and end times.'); return; }
    void run(async () => createDepartmentShift({ department, section, title: shiftForm.title, location: shiftForm.location, starts_at: new Date(shiftForm.starts_at).toISOString(), ends_at: new Date(shiftForm.ends_at).toISOString(), capacity: shiftForm.capacity }, effectiveTestToken), 'Shift created.');
    setShiftForm({ title: '', location: '', starts_at: '', ends_at: '', capacity: 4 });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'people', label: 'Custom roles & people', icon: <Users size={15}/> },
    { id: 'projects', label: department === 'media_press' ? 'Media production' : department === 'design' ? 'Design projects' : 'Projects & tasks', icon: <Video size={15}/> },
    { id: 'shifts', label: 'Shifts & coverage', icon: <Clock3 size={15}/> },
    { id: 'registrations', label: 'Registration windows', icon: <BriefcaseBusiness size={15}/> },
  ];

  return <section className="space-y-5 text-white">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] uppercase tracking-[.22em] text-[#d4af37]">Live operations · Supabase</p><h1 className="mt-1 text-2xl font-semibold">{department === 'media_press' ? 'Media production studio' : department === 'design' ? 'Design project studio' : 'Department operations'}</h1><p className="mt-1 max-w-2xl text-sm text-neutral-400">Create your own roles, staff assignments, projects, tasks and shift coverage. Changes are saved to the production database.</p></div>
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
          <div className="min-w-0 flex-1"><div className="font-medium">{p.display_name}</div><div className="mt-1 text-xs text-[#d4af37]">{p.role_title}</div><div className="mt-1 text-xs text-neutral-500">{p.email || 'No email'} · {p.status} · {p.section || 'Department-wide'}</div>{p.private_notes && <p className="mt-2 whitespace-pre-wrap text-xs text-neutral-400">{p.private_notes}</p>}</div>
          <div className="flex gap-2"><button className={button} onClick={()=>{const title=window.prompt('Edit custom role title',p.role_title); if(title?.trim()) void run(()=>updateDepartmentPerson(p.id,{role_title:title.trim()},effectiveTestToken),'Role updated.');}}>Edit role</button><button aria-label={'Delete '+p.display_name} className="rounded-md border border-red-400/20 p-2 text-red-300" onClick={()=>{if(window.confirm('Delete this person/role record? Related assignments may prevent deletion.')) void run(()=>deleteDepartmentPerson(p.id,effectiveTestToken),'Person/role deleted.');}}><Trash2 size={14}/></button></div>
        </article>)}
      </div>
    </div>}

    {tab === 'projects' && <div className="space-y-4">
      <form className={panel+' grid gap-3 md:grid-cols-2'} onSubmit={e=>{e.preventDefault();createProject();}}>
        <div className="md:col-span-2"><h2 className="font-semibold">Create a production project</h2><p className="text-xs text-neutral-400">Projects, stages, team roles and tasks are persisted in Supabase.</p></div>
        <input className={field} placeholder={department==='media_press'?'WEST MUN 2027 Opening Film':'Project title'} value={projectForm.title} onChange={e=>setProjectForm({...projectForm,title:e.target.value})}/>
        <input className={field} type="date" value={projectForm.due_at} onChange={e=>setProjectForm({...projectForm,due_at:e.target.value})}/>
        <textarea className={field+' md:col-span-2'} rows={3} placeholder="Project brief, shot list, design requirements, reference links…" value={projectForm.brief} onChange={e=>setProjectForm({...projectForm,brief:e.target.value})}/>
        <div><button className={button} disabled={busy}><Plus size={14}/> Create project</button></div>
      </form>
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-2"><h2 className="font-semibold">Projects</h2>{projects.length===0&&<div className={panel+' text-xs text-neutral-400'}>No projects yet.</div>}{projects.map(p=><button key={p.id} onClick={()=>setSelectedProject(p.id)} className={'block w-full rounded-md border p-3 text-left '+(selectedProject===p.id?'border-[#d4af37]/50 bg-[#d4af37]/10':'border-white/10 bg-[#111115]')}><div className="text-sm font-medium">{p.title}</div><div className="mt-1 text-[11px] text-neutral-500">{p.status} {p.due_at ? '· due '+new Date(p.due_at).toLocaleDateString() : ''}</div></button>)}</div>
        <div className="space-y-4">{selectedProject ? <>
          {projects.filter(p=>p.id===selectedProject).map(p=><div key={p.id} className={panel}><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-semibold">{p.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-neutral-300">{p.brief||'No brief yet.'}</p></div><div className="flex gap-2"><select className={field+' w-auto'} value={p.status} onChange={e=>void run(()=>updateDepartmentProject(p.id,{status:e.target.value as WmProject['status']},effectiveTestToken),'Project status updated.')}><option value="planning">Planning</option><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select><button className="rounded-md border border-red-400/20 p-2 text-red-300" onClick={()=>{if(window.confirm('Delete this project and its linked tasks/stages?')) void run(()=>deleteDepartmentProject(p.id,effectiveTestToken),'Project deleted.');}}><Trash2 size={14}/></button></div></div></div>)}
          <div className="grid gap-4 xl:grid-cols-2">
            <div className={panel+' space-y-3'}><h3 className="font-semibold">Production stages</h3><form className="flex gap-2" onSubmit={e=>{e.preventDefault();if(!stageTitle.trim())return;void run(()=>createProjectStage({project_id:selectedProject,title:stageTitle,sort_order:stages.length},effectiveTestToken),'Stage added.');setStageTitle('');}}><input className={field} placeholder="e.g. Filming / Editing / Review" value={stageTitle} onChange={e=>setStageTitle(e.target.value)}/><button className={button}><Plus size={14}/></button></form>
              {stages.map(s=><div key={s.id} className="flex items-center gap-2 rounded border border-white/5 p-2"><span className="min-w-0 flex-1 text-sm">{s.title}</span><select aria-label="Stage status" className={field+' w-auto'} value={s.status} onChange={e=>void run(()=>updateProjectStage(s.id,{status:e.target.value as WmProjectStage['status']},effectiveTestToken),'Stage updated.')}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></div>)}
            </div>
            <div className={panel+' space-y-3'}><h3 className="font-semibold">Project team roles</h3><form className="space-y-2" onSubmit={e=>{e.preventDefault();if(!memberForm.person_id||!memberForm.project_role.trim())return;void run(()=>addProjectMember({project_id:selectedProject,person_id:memberForm.person_id,project_role:memberForm.project_role},effectiveTestToken),'Team member assigned.');setMemberForm({person_id:'',project_role:''});}}><select className={field} value={memberForm.person_id} onChange={e=>setMemberForm({...memberForm,person_id:e.target.value})}><option value="">Choose a person</option>{people.map(p=><option key={p.id} value={p.id}>{p.display_name} — {p.role_title}</option>)}</select><input className={field} placeholder="Project-specific role, e.g. Director" value={memberForm.project_role} onChange={e=>setMemberForm({...memberForm,project_role:e.target.value})}/><button className={button}><Plus size={14}/> Assign to project</button></form>
              {(members||[]).map((m:any)=><div key={m.person_id} className="flex items-center justify-between gap-2 rounded border border-white/5 p-2"><div className="text-sm">{m.person?.display_name||'Team member'} <span className="text-xs text-[#d4af37]">· {m.project_role}</span></div><button className="text-xs text-red-300" onClick={()=>void run(()=>removeProjectMember(selectedProject,m.person_id,effectiveTestToken),'Member removed.')}>Remove</button></div>)}
            </div>
          </div>
          <div className={panel+' space-y-3'}><h3 className="font-semibold">Tasks & deliverables</h3><form className="grid gap-2 md:grid-cols-2" onSubmit={e=>{e.preventDefault();if(!taskForm.title.trim())return;void run(()=>createProjectTask({project_id:selectedProject,title:taskForm.title,description:taskForm.description,priority:taskForm.priority,assigned_person_id:taskForm.assigned_person_id||null},effectiveTestToken),'Task created.');setTaskForm({title:'',description:'',priority:'medium',assigned_person_id:''});}}><input className={field} placeholder="Task title" value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})}/><select className={field} value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value as WmProjectTask['priority']})}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option><option value="urgent">Urgent</option></select><textarea className={field} rows={2} placeholder="Instructions, shot list, feedback, reference URL…" value={taskForm.description} onChange={e=>setTaskForm({...taskForm,description:e.target.value})}/><select className={field} value={taskForm.assigned_person_id} onChange={e=>setTaskForm({...taskForm,assigned_person_id:e.target.value})}><option value="">Unassigned</option>{people.map(p=><option key={p.id} value={p.id}>{p.display_name} — {p.role_title}</option>)}</select><button className={button+' md:col-span-2'}><Plus size={14}/> Add task</button></form>
            {tasks.map(t=><article key={t.id} className="rounded-md border border-white/5 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-medium">{t.title}</div><p className="mt-1 whitespace-pre-wrap text-xs text-neutral-400">{t.description}</p><p className="mt-1 text-[11px] text-neutral-500">{t.assigned_person?.display_name||'Unassigned'} · {t.priority}</p></div><div className="flex gap-2"><select aria-label="Task status" className={field+' w-auto'} value={t.status} onChange={e=>void run(()=>updateProjectTask(t.id,{status:e.target.value as WmProjectTask['status']},effectiveTestToken),'Task updated.')}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="review">Review</option><option value="blocked">Blocked</option><option value="done">Done</option></select><button aria-label="Delete task" className="text-red-300" onClick={()=>void run(()=>deleteProjectTask(t.id,effectiveTestToken),'Task deleted.')}><Trash2 size={14}/></button></div></div></article>)}
          </div></>:<div className={panel+' text-sm text-neutral-400'}>Select a project to manage its stages, team and tasks.</div>}</div>
      </div>
    </div>}

    {tab === 'shifts' && <div className="grid gap-4 lg:grid-cols-[minmax(260px,.8fr)_minmax(0,1.2fr)]">
      <form className={panel+' space-y-3'} onSubmit={e=>{e.preventDefault();createShift();}}><h2 className="font-semibold">Create a shift / coverage slot</h2>
        <div><label className={label}>Position / shift title</label><input className={field} placeholder="e.g. Entrance Coordinator" value={shiftForm.title} onChange={e=>setShiftForm({...shiftForm,title:e.target.value})}/></div>
        <div><label className={label}>Location</label><input className={field} placeholder="Hall / checkpoint / room" value={shiftForm.location} onChange={e=>setShiftForm({...shiftForm,location:e.target.value})}/></div>
        <div><label className={label}>Starts</label><input type="datetime-local" className={field} value={shiftForm.starts_at} onChange={e=>setShiftForm({...shiftForm,starts_at:e.target.value})}/></div>
        <div><label className={label}>Ends</label><input type="datetime-local" className={field} value={shiftForm.ends_at} onChange={e=>setShiftForm({...shiftForm,ends_at:e.target.value})}/></div>
        <div><label className={label}>Staffing capacity</label><input type="number" min={1} max={500} className={field} value={shiftForm.capacity} onChange={e=>setShiftForm({...shiftForm,capacity:Number(e.target.value)})}/></div><button className={button} disabled={busy}><Plus size={14}/> Create shift</button>
      </form>
      <div className="space-y-3"><h2 className="font-semibold">Coverage & assignments</h2>{shifts.length===0&&<div className={panel+' text-sm text-neutral-400'}>No shifts yet. Create one to start tracking coverage.</div>}
        {shifts.map(s=><ShiftCard key={s.id} shift={s} people={people} testToken={effectiveTestToken} refresh={load}/>)}
      </div>
    </div>}

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
