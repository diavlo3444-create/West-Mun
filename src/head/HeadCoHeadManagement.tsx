import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, ClipboardList, Loader2, Plus, RefreshCw, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { DepartmentKey, SectionKey } from './departments';

type CoHead = { user_id: string; full_name: string; email: string; phone?: string | null; gender?: string | null };
type TaskRow = { id: string; title: string; assigned_to_user_id: string | null; assigned_to_name: string; status: string; priority: string; deadline: string | null; created_at: string };
type ShiftRow = { id: string; station_name: string; location: string; starts_at: string; ends_at: string; status: string; is_published: boolean };

const field = 'w-full rounded-md border border-white/10 bg-[#111115] px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none';
const action = 'inline-flex items-center justify-center gap-2 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-2 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/20 disabled:opacity-50';
const panel = 'rounded-xl border border-white/10 bg-[#111115]/90 p-4';

export const HeadCoHeadManagement: React.FC<{ department: DepartmentKey; section?: SectionKey | null; headName?: string }> = ({ department, section, headName }) => {
  const [coHeads, setCoHeads] = useState<CoHead[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [selected, setSelected] = useState('');
  const [tab, setTab] = useState<'people' | 'tasks' | 'shifts'>('people');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'normal', deadline: '' });
  const [shiftForm, setShiftForm] = useState({ station: '', location: '', startsAt: '', endsAt: '', responsibilities: '' });

  const load = useCallback(async () => {
    if (!supabase) { setError('Database connection is unavailable.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [{ data: peopleData, error: peopleError }, { data: taskData, error: taskError }, { data: shiftData, error: shiftError }] = await Promise.all([
        supabase.functions.invoke('wm-eb-access', { body: { action: 'list_my_coheads', department, section: section || null } }),
        supabase.from('wm_eb_tasks').select('id,title,assigned_to_user_id,assigned_to_name,status,priority,deadline,created_at').eq('department', department).order('created_at', { ascending: false }).limit(100),
        supabase.from('wm_eb_shifts').select('id,station_name,location,starts_at,ends_at,status,is_published').eq('department', department).order('starts_at', { ascending: true }).limit(100),
      ]);
      if (peopleError || !peopleData?.success) {
        const status = (peopleError as any)?.context?.status;
        const message = status === 403
          ? 'This login is not assigned as an active Department Head. Sign out and sign in with the account assigned to lead this department, then reopen Co-Head Management.'
          : status === 401
            ? 'Your session is missing or expired. Sign in again with your Department Head account.'
            : peopleData?.error || peopleError?.message || 'Could not load your Co-Heads.';
        throw new Error(message);
      }
      if (taskError) throw new Error(taskError.message);
      if (shiftError) throw new Error(shiftError.message);
      const list = (peopleData.coHeads || []) as CoHead[];
      const scopedPeople = section ? list.filter((p: any) => !p.section || p.section === section) : list;
      setCoHeads(scopedPeople);
      setSelected(current => scopedPeople.some(p => p.user_id === current) ? current : (scopedPeople[0]?.user_id || ''));
      setTasks((taskData || []) as TaskRow[]);
      setShifts((shiftData || []) as ShiftRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Co-Head operations.');
    } finally { setLoading(false); }
  }, [department, section]);

  useEffect(() => { void load(); }, [load]);

  const selectedCoHead = coHeads.find(p => p.user_id === selected) || null;
  const scopedTasks = tasks.filter(t => !selectedCoHead || t.assigned_to_user_id === selectedCoHead.user_id);
  const formatDate = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedCoHead || !taskForm.title.trim() || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error('Your session expired. Sign in again.');
      const now = new Date().toISOString();
      const { error: saveError } = await supabase.from('wm_eb_tasks').insert({
        id: crypto.randomUUID(), department, section: section || null,
        assigned_to_user_id: selectedCoHead.user_id, assigned_to_name: selectedCoHead.full_name,
        assigned_by_name: headName || authData.user.email || 'Department Head',
        title: taskForm.title.trim(), description: taskForm.description.trim(),
        priority: taskForm.priority, status: 'not_started',
        deadline: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : null,
        station_name: '', checklist: [], completion_note: '', blocker_reason: '',
        reference_links: [], completed_at: null, created_at: now, updated_at: now,
      });
      if (saveError) throw saveError;
      setTaskForm({ title: '', description: '', priority: 'normal', deadline: '' });
      setNotice('Task assigned to ' + selectedCoHead.full_name + '.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Task could not be saved.'); }
    finally { setBusy(false); }
  };

  const createShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedCoHead || !shiftForm.station.trim() || !shiftForm.startsAt || !shiftForm.endsAt || busy) return;
    const start = new Date(shiftForm.startsAt);
    const end = new Date(shiftForm.endsAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setError('Choose a valid shift end time after the start time.'); return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error('Your session expired. Sign in again.');
      const shiftId = crypto.randomUUID();
      const now = new Date().toISOString();
      const { error: shiftError } = await supabase.from('wm_eb_shifts').insert({
        id: shiftId, department, section: section || null, station_id: null,
        station_name: shiftForm.station.trim(), location: shiftForm.location.trim(),
        shift_date: shiftForm.startsAt.slice(0, 10), starts_at: start.toISOString(), ends_at: end.toISOString(),
        supervisor_name: headName || authData.user.email || 'Department Head', supervisor_id: authData.user.id,
        responsibilities: shiftForm.responsibilities.trim(), handover_notes: '', break_schedule: '',
        checklist: [], capacity: 1, status: 'scheduled', is_published: true, created_at: now, updated_at: now,
      });
      if (shiftError) throw shiftError;
      const { error: assignError } = await supabase.from('wm_eb_shift_assignments').insert({
        id: crypto.randomUUID(), shift_id: shiftId, user_id: selectedCoHead.user_id,
        member_name: selectedCoHead.full_name, member_email: selectedCoHead.email,
        role_title: 'Co-Head', department, section: section || null,
        status: 'confirmed', notes: shiftForm.responsibilities.trim(), created_at: now, updated_at: now,
      });
      if (assignError) {
        await supabase.from('wm_eb_shifts').delete().eq('id', shiftId);
        throw assignError;
      }
      setShiftForm({ station: '', location: '', startsAt: '', endsAt: '', responsibilities: '' });
      setNotice('Shift assigned to ' + selectedCoHead.full_name + '.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Shift could not be saved.'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Team leadership</p><h1 className="mt-1 text-2xl font-semibold text-white">Co-Head Management</h1><p className="mt-1 text-sm text-neutral-400">View the Co-Heads assigned to you, delegate tasks, and schedule their shifts.</p></div>
      <button type="button" className={action} onClick={() => void load()} disabled={loading || busy}><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
    </div>
    {error && <div role="alert" className="rounded-md border border-rose-400/30 bg-rose-950/20 p-3 text-sm text-rose-200">{error}</div>}
    {notice && <div role="status" className="rounded-md border border-emerald-400/30 bg-emerald-950/20 p-3 text-sm text-emerald-200">{notice}</div>}
    <div className="grid gap-3 sm:grid-cols-3">
      <div className={panel}><p className="text-xs text-neutral-400">Your Co-Heads</p><p className="mt-2 text-2xl font-semibold text-white">{coHeads.length}</p></div>
      <div className={panel}><p className="text-xs text-neutral-400">Tasks assigned</p><p className="mt-2 text-2xl font-semibold text-white">{tasks.filter(t => t.assigned_to_user_id).length}</p></div>
      <div className={panel}><p className="text-xs text-neutral-400">Scheduled shifts</p><p className="mt-2 text-2xl font-semibold text-white">{shifts.filter(s => s.status !== 'cancelled' && new Date(s.ends_at) >= new Date()).length}</p></div>
    </div>
    <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
      {([{id:'people',label:'Co-Heads',icon:Users},{id:'tasks',label:'Tasks',icon:ClipboardList},{id:'shifts',label:'Shifts',icon:CalendarClock}] as const).map(item => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${tab===item.id?'bg-[#d4af37] text-black':'border border-white/10 text-neutral-300 hover:bg-white/5'}`}><item.icon className="h-3.5 w-3.5"/>{item.label}</button>)}
    </div>
    {loading ? <div className={panel}><Loader2 className="h-4 w-4 animate-spin text-[#d4af37]"/> Loading your Co-Head workspace…</div> : coHeads.length === 0 ? <div className={panel}><p className="font-medium text-white">No Co-Head linked to your account yet</p><p className="mt-1 text-sm text-neutral-400">Co-Heads must select your head account during EB sign-up. If this is incorrect, ask an admin to verify their reporting-head assignment.</p></div> : <>
      <div className={panel}>
        <label className="mb-2 block text-xs font-semibold text-neutral-300" htmlFor="cohead-select">Manage Co-Head</label>
        <select id="cohead-select" className={field} value={selected} onChange={e => setSelected(e.target.value)}><option value="">Select a Co-Head</option>{coHeads.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name} — {p.email}</option>)}</select>
        {selectedCoHead && <div className="mt-3 grid gap-2 sm:grid-cols-3"><div><p className="text-xs text-neutral-500">Name</p><p className="mt-1 text-sm text-white">{selectedCoHead.full_name}</p></div><div><p className="text-xs text-neutral-500">Email</p><p className="mt-1 break-all text-sm text-white">{selectedCoHead.email}</p></div><div><p className="text-xs text-neutral-500">Phone</p><p className="mt-1 text-sm text-white">{selectedCoHead.phone || 'Not provided'}</p></div></div>}
      </div>
      {tab === 'people' && <div className={panel}><h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Users className="h-4 w-4 text-[#d4af37]"/>Your Co-Head directory</h2><div className="mt-3 divide-y divide-white/10">{coHeads.map(p => <div key={p.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-white">{p.full_name}</p><p className="mt-1 text-xs text-neutral-400">{p.email}{p.phone ? ' · '+p.phone : ''}</p></div><button type="button" className={action} onClick={() => {setSelected(p.user_id);setTab('tasks')}}><Plus className="h-3 w-3"/> Assign work</button></div>)}</div></div>}
      {tab === 'tasks' && <div className="grid gap-4 xl:grid-cols-2"><form className={panel+' space-y-3'} onSubmit={createTask}><h2 className="flex items-center gap-2 text-sm font-semibold text-white"><ClipboardList className="h-4 w-4 text-[#d4af37]"/>Assign a task</h2><p className="text-xs text-neutral-400">Task will appear in the selected Co-Head's task list.</p><input className={field} placeholder="Task title" value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} required/><textarea className={field+' min-h-24'} placeholder="Instructions and expected result" value={taskForm.description} onChange={e=>setTaskForm({...taskForm,description:e.target.value})}/><div className="grid gap-3 sm:grid-cols-2"><select className={field} value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value})}><option value="low">Low priority</option><option value="normal">Normal priority</option><option value="high">High priority</option><option value="urgent">Urgent</option></select><input className={field} type="datetime-local" value={taskForm.deadline} onChange={e=>setTaskForm({...taskForm,deadline:e.target.value})}/></div><button className={action} disabled={busy || !selectedCoHead} type="submit">{busy?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Plus className="h-3.5 w-3.5"/>}Assign task</button></form><div className={panel}><h2 className="text-sm font-semibold text-white">Department task list</h2><div className="mt-3 space-y-2">{scopedTasks.length===0?<p className="text-xs text-neutral-500">No tasks assigned to this Co-Head yet.</p>:scopedTasks.map(t=><div key={t.id} className="rounded-md border border-white/10 p-3"><p className="text-sm font-medium text-white">{t.title}</p><p className="mt-1 text-xs text-neutral-400">{t.assigned_to_name} · {t.status.replace(/_/g,' ')} · {t.priority}</p>{t.deadline&&<p className="mt-1 text-xs text-neutral-500">Due {formatDate(t.deadline)}</p>}</div>)}</div></div></div>}
      {tab === 'shifts' && <div className="grid gap-4 xl:grid-cols-2"><form className={panel+' space-y-3'} onSubmit={createShift}><h2 className="flex items-center gap-2 text-sm font-semibold text-white"><CalendarClock className="h-4 w-4 text-[#d4af37]"/>Schedule a shift</h2><p className="text-xs text-neutral-400">Creates a published shift and assigns it to the selected Co-Head.</p><input className={field} placeholder="Station / shift title" value={shiftForm.station} onChange={e=>setShiftForm({...shiftForm,station:e.target.value})} required/><input className={field} placeholder="Location (optional)" value={shiftForm.location} onChange={e=>setShiftForm({...shiftForm,location:e.target.value})}/><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-neutral-400">Starts<input className={field+' mt-1'} type="datetime-local" value={shiftForm.startsAt} onChange={e=>setShiftForm({...shiftForm,startsAt:e.target.value})} required/></label><label className="text-xs text-neutral-400">Ends<input className={field+' mt-1'} type="datetime-local" value={shiftForm.endsAt} onChange={e=>setShiftForm({...shiftForm,endsAt:e.target.value})} required/></label></div><textarea className={field+' min-h-20'} placeholder="Responsibilities / handover notes" value={shiftForm.responsibilities} onChange={e=>setShiftForm({...shiftForm,responsibilities:e.target.value})}/><button className={action} disabled={busy || !selectedCoHead} type="submit">{busy?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Plus className="h-3.5 w-3.5"/>}Publish & assign shift</button></form><div className={panel}><h2 className="text-sm font-semibold text-white">Department shift roster</h2><div className="mt-3 space-y-2">{shifts.length===0?<p className="text-xs text-neutral-500">No shifts scheduled yet.</p>:shifts.map(s=><div key={s.id} className="rounded-md border border-white/10 p-3"><p className="text-sm font-medium text-white">{s.station_name}</p><p className="mt-1 text-xs text-neutral-400">{formatDate(s.starts_at)} – {formatDate(s.ends_at)}</p><p className="mt-1 text-xs text-neutral-500">{s.location || 'Location not set'} · {s.status} · {s.is_published?'Published':'Draft'}</p></div>)}</div></div></div>}
    </>}
  </div>;
};
