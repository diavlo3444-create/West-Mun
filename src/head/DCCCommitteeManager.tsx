import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Save, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Committee = {
  id: string;
  sort_order: number;
  published: boolean;
  name: string;
  type: string;
  topic: string;
  chair: string;
  description: string;
  level: string;
};

const emptyCommittee = (): Omit<Committee, 'id'> => ({
  sort_order: 0, published: true, name: '', type: 'General Assembly',
  topic: '', chair: 'TBA', description: '', level: '',
});

export const DCCCommitteeManager: React.FC = () => {
  const [items, setItems] = useState<Committee[]>([]);
  const [draft, setDraft] = useState<Record<string, Partial<Committee>>>({});
  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState(emptyCommittee());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setMessage('Supabase is not configured.'); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from('committees').select('*').order('sort_order').order('name');
    if (error) setMessage(error.message);
    else { setItems((data || []) as Committee[]); setDraft({}); setMessage(''); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (id: string) => {
    if (!supabase) return;
    const changes = draft[id];
    if (!changes) return;
    setBusy(id); setMessage('');
    const { error } = await supabase.from('committees').update(changes).eq('id', id);
    if (error) setMessage(error.message);
    else { setMessage('Committee updated.'); await load(); }
    setBusy(null);
  };

  const create = async () => {
    if (!supabase || !newItem.name.trim()) { setMessage('Enter a committee name first.'); return; }
    setBusy('new'); setMessage('');
    const { error } = await supabase.from('committees').insert({ ...newItem, name: newItem.name.trim(), topic: newItem.topic.trim() || 'TBA' });
    if (error) setMessage(error.message);
    else { setCreating(false); setNewItem(emptyCommittee()); setMessage('Committee created.'); await load(); }
    setBusy(null);
  };

  const remove = async (id: string) => {
    if (!supabase || !window.confirm('Delete this committee? This cannot be undone.')) return;
    setBusy(id); setMessage('');
    const { error } = await supabase.from('committees').delete().eq('id', id);
    if (error) setMessage(error.message);
    else { setItems((prev) => prev.filter((item) => item.id !== id)); setMessage('Committee deleted.'); }
    setBusy(null);
  };

  const togglePublished = async (item: Committee) => {
    if (!supabase) return;
    setBusy(item.id); setMessage('');
    const { error } = await supabase.from('committees').update({ published: !item.published }).eq('id', item.id);
    if (error) setMessage(error.message); else await load();
    setBusy(null);
  };

  const field = (label: string, value: string, onChange: (v: string) => void, multiline = false) => (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-neutral-400">{label}</span>
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500" />
        : <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500" />}
    </label>
  );

  const editor = (item: Committee, isNew = false) => {
    const setValue = (key: keyof Committee, value: string | number | boolean) => {
      if (isNew) setNewItem((prev) => ({ ...prev, [key]: value }));
      else setDraft((prev) => ({ ...prev, [item.id]: { ...prev[item.id], [key]: value } }));
    };
    const value = (key: keyof Committee) => (isNew ? (newItem as any)[key] : { ...item, ...draft[item.id] }[key]);
    return <div className="grid gap-3 md:grid-cols-2">
      {field('Committee name', String(value('name') || ''), v => setValue('name', v))}
      {field('Committee type', String(value('type') || ''), v => setValue('type', v))}
      {field('Topic / agenda', String(value('topic') || ''), v => setValue('topic', v))}
      {field('Chair name', String(value('chair') || ''), v => setValue('chair', v))}
      {field('Level', String(value('level') || ''), v => setValue('level', v))}
      {field('Description', String(value('description') || ''), v => setValue('description', v), true)}
      <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={Boolean(value('published'))} onChange={e => setValue('published', e.target.checked)} /> Visible on public website</label>
      <label className="block space-y-1"><span className="text-xs font-medium text-neutral-400">Display order</span><input type="number" value={Number(value('sort_order') || 0)} onChange={e => setValue('sort_order', Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white" /></label>
    </div>;
  };

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-white">Committee management</h2><p className="text-sm text-neutral-400">Edit committee topics, agendas, descriptions, chairs, visibility and display order.</p></div>
      <div className="flex gap-2"><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white"><RefreshCw size={15}/> Refresh</button><button onClick={() => setCreating(v => !v)} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black"><Plus size={15}/> Add committee</button></div>
    </div>
    {message && <p role="status" className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-neutral-200">{message}</p>}
    {creating && <div className="space-y-4 rounded-xl border border-amber-500/30 bg-neutral-900 p-4"><h3 className="font-semibold text-white">New committee</h3>{editor({ id: 'new', ...newItem } as Committee, true)}<div className="flex gap-2"><button disabled={busy === 'new'} onClick={() => void create()} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black">{busy === 'new' ? 'Creating…' : 'Create committee'}</button><button onClick={() => setCreating(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white">Cancel</button></div></div>}
    {loading ? <p className="text-sm text-neutral-400">Loading committees…</p> : items.length === 0 ? <p className="rounded-xl border border-white/10 p-5 text-sm text-neutral-400">No committees found.</p> : items.map(item => <div key={item.id} className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-white">{(draft[item.id]?.name as string) ?? item.name}</h3><p className="text-xs text-neutral-400">{item.published ? 'Published' : 'Hidden from public website'}</p></div><div className="flex flex-wrap gap-2"><button disabled={busy === item.id} onClick={() => void togglePublished({ ...item, ...draft[item.id] } as Committee)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white">{item.published ? <EyeOff size={14}/> : <Eye size={14}/>} {item.published ? 'Hide' : 'Publish'}</button><button disabled={busy === item.id || !draft[item.id]} onClick={() => void save(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-black"><Save size={14}/> Save changes</button><button disabled={busy === item.id} onClick={() => void remove(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300"><Trash2 size={14}/> Delete</button></div></div>
      {editor(item)}
    </div>)}
  </section>;
};
