import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, RefreshCw, Search, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChairApplicationsManager } from '../admin/ChairApplicationsManager';

type Delegate = {
  id: string; created_at: string; full_name: string; email: string; institution: string;
  tier: string; delegation_type: string; status: string; payment_status: string; admin_notes: string;
};
type Setting = { key: string; value: string };

export const DCCApplicationsManager: React.FC = () => {
  const [rows, setRows] = useState<Delegate[]>([]);
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setMessage('Supabase is not configured.'); setLoading(false); return; }
    setLoading(true); setMessage('');
    const [apps, config] = await Promise.all([
      supabase.from('delegates').select('id,created_at,full_name,email,institution,tier,delegation_type,status,payment_status,admin_notes').order('created_at',{ascending:false}),
      supabase.from('settings').select('key,value').eq('key','registration_open')
    ]);
    if (apps.error) setMessage(apps.error.message); else setRows((apps.data || []) as Delegate[]);
    if (config.error) setMessage(prev => prev ? prev + ' | ' + config.error!.message : config.error!.message);
    else { const next:Record<string,string>={}; (config.data || []).forEach((x:Setting)=>next[x.key]=x.value); setSettings(next); }
    setLoading(false);
  }, []);
  useEffect(()=>{ void load(); },[load]);

  const toggle = async (key:string) => {
    if (!supabase) return;
    const next = (settings[key] || 'false').toLowerCase() !== 'true';
    setBusy(key); setMessage('');
    const {error}=await supabase.from('settings').update({value:String(next),updated_at:new Date().toISOString()}).eq('key',key);
    if(error) setMessage(error.message); else {setSettings(p=>({...p,[key]:String(next)}));setMessage(next?'Applications opened.':'Applications closed.');}
    setBusy('');
  };
  const decide = async (row:Delegate,status:Delegate['status']) => {
    if(!supabase) return;
    setBusy(row.id); setMessage('');
    const {error}=await supabase.from('delegates').update({status,updated_at:new Date().toISOString()}).eq('id',row.id);
    if(error) setMessage(error.message); else {setRows(p=>p.map(x=>x.id===row.id?{...x,status}:x));setMessage(row.full_name+' marked '+status+'.');}
    setBusy('');
  };
  const filtered=rows.filter(r=>(filter==='all'||r.status===filter)&&[r.full_name,r.email,r.institution].some(v=>v.toLowerCase().includes(search.toLowerCase())));
  const isOpen=(key:string)=>(settings[key]||'false').toLowerCase()==='true';
  const switchButton=(key:string,label:string)=><button key={key} disabled={busy===key} onClick={()=>void toggle(key)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-neutral-900 p-4 text-left text-white"><span><span className="block font-medium">{label}</span><span className="text-xs text-neutral-400">{isOpen(key)?'Currently open to applicants':'Currently closed to applicants'}</span></span>{isOpen(key)?<ToggleRight className="text-emerald-400" size={26}/>:<ToggleLeft className="text-neutral-500" size={26}/>}</button>;

  return <section className="space-y-5">
    <ChairApplicationsManager />
    <div><h2 className="text-lg font-semibold text-white">Delegate applications</h2><p className="text-sm text-neutral-400">Review delegate registrations and control the delegate registration window.</p></div>
    {message&&<p role="status" className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-neutral-200">{message}</p>}
    <div className="grid gap-3 md:grid-cols-2">
      {switchButton('registration_open','Delegate registration')}
    </div>
    <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-neutral-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, school…" className="w-full rounded-lg border border-white/10 bg-neutral-950 py-2.5 pl-9 pr-3 text-sm text-white"/></label><select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white"><option value="all">All statuses</option><option value="received">Pending</option><option value="under_review">Under review</option><option value="accepted">Accepted</option><option value="waitlisted">Waitlisted</option><option value="rejected">Rejected</option></select><button onClick={()=>void load()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white"><RefreshCw size={15}/> Refresh</button></div>
    {loading?<p className="text-sm text-neutral-400">Loading applications…</p>:filtered.length===0?<div className="rounded-xl border border-white/10 p-6 text-center text-sm text-neutral-400"><Users className="mx-auto mb-2" size={22}/>{rows.length?'No applications match your search.':'No delegate applications have been submitted yet.'}</div>:<div className="space-y-3">{filtered.map(row=><article key={row.id} className="space-y-3 rounded-xl border border-white/10 bg-neutral-900/70 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-white">{row.full_name}</h3><p className="text-sm text-neutral-400">{row.email} · {row.institution}</p><p className="mt-1 text-xs text-neutral-500">{row.delegation_type.replaceAll('_',' ')} · {row.tier.replaceAll('_',' ')} · Payment: {row.payment_status}</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-200">{row.status.replaceAll('_',' ')}</span></div><div className="flex flex-wrap gap-2"><button disabled={busy===row.id||row.status==='accepted'} onClick={()=>void decide(row,'accepted')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black"><Check size={14}/> Accept</button><button disabled={busy===row.id||row.status==='rejected'} onClick={()=>void decide(row,'rejected')} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300"><X size={14}/> Reject</button><button disabled={busy===row.id||row.status==='waitlisted'} onClick={()=>void decide(row,'waitlisted')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">Waitlist</button><button disabled={busy===row.id||row.status==='under_review'} onClick={()=>void decide(row,'under_review')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">Mark reviewing</button></div></article>)}</div>}
  </section>;
};
