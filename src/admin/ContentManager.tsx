import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { safeUrl } from '../lib/safe';
import type { FieldDef, SectionDef } from './config';
import { FileUpload } from './FileUpload';
import { btnDanger, btnGhost, btnGold, cardCls, errCls, explainError, helpCls, inputCls, labelCls, type Row } from './ui';

const pad = (n: number) => String(n).padStart(2, '0');
function toLocalInput(iso: unknown): string {
  if (typeof iso !== 'string' || !iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function blankDraft(section: SectionDef): Row {
  const d: Row = {};
  for (const f of section.fields) {
    if (f.default !== undefined) d[f.key] = f.default;
    else if (f.type === 'boolean') d[f.key] = false;
    else if (f.type === 'datetime') d[f.key] = new Date().toISOString();
    else d[f.key] = '';
  }
  return d;
}

function validate(section: SectionDef, draft: Row): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const f of section.fields) {
    const v = draft[f.key];
    const isText = typeof v === 'string';
    if (f.required && (v === undefined || v === null || (isText && !v.trim()))) {
      errs[f.key] = 'Required.';
      continue;
    }
    if (isText && f.max && v.length > f.max) errs[f.key] = `Maximum ${f.max} characters (now ${v.length}).`;
    if ((f.type === 'url' || f.type === 'image' || f.type === 'file') && isText && v.trim() && !safeUrl(v)) {
      errs[f.key] = 'Use a link starting with https:// (or upload a file).';
    }
    if (f.type === 'datetime' && !v) errs[f.key] = 'Pick a date and time.';
  }
  return errs;
}

export const ContentManager: React.FC<{ section: SectionDef }> = ({ section }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [relations, setRelations] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [draft, setDraft] = useState<Row>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const relationFields = useMemo(() => section.fields.filter((f) => f.type === 'relation'), [section]);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    let q = supabase.from(section.table).select('*');
    for (const [col, asc] of section.orderBy) q = q.order(col, { ascending: asc });
    const rels: Record<string, Row[]> = {};
    for (const f of relationFields) {
      const { data } = await supabase.from(f.relation!.table).select('*').order('sort_order', { ascending: true });
      rels[f.key] = (data as Row[]) ?? [];
    }
    const { data, error: err } = await q;
    if (err) setError(explainError(err));
    let list = (data as Row[]) ?? [];
    if (section.groupKey && rels[section.groupKey]) {
      const order = new Map(rels[section.groupKey].map((r, i) => [r.id, i]));
      list = [...list].sort(
        (a, b) => (order.get(a[section.groupKey!]) ?? 999) - (order.get(b[section.groupKey!]) ?? 999) || a.sort_order - b.sort_order,
      );
    }
    setRelations(rels);
    setRows(list);
    setLoading(false);
  }, [section, relationFields]);

  useEffect(() => {
    setEditing(null);
    setNotice('');
    load();
  }, [load]);

  const relationLabel = (f: FieldDef, id: string) => {
    const r = relations[f.key]?.find((x) => x.id === id);
    return r ? f.relation!.labelKeys.map((k) => r[k]).join(' ') : '—';
  };

  const startNew = () => {
    setDraft(blankDraft(section));
    setErrors({});
    setNotice('');
    setEditing('new');
  };
  const startEdit = (row: Row) => {
    setDraft({ ...row });
    setErrors({});
    setNotice('');
    setEditing(row);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const errs = validate(section, draft);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload: Row = {};
    for (const f of section.fields) {
      const v = draft[f.key];
      payload[f.key] = typeof v === 'string' ? (f.type === 'datetime' ? v : v.trim()) : v;
    }

    setSaving(true);
    setError('');
    let err;
    if (editing === 'new') {
      if (section.sortable) {
        const peers = section.groupKey ? rows.filter((r) => r[section.groupKey!] === payload[section.groupKey!]) : rows;
        payload.sort_order = peers.reduce((m, r) => Math.max(m, r.sort_order ?? 0), 0) + 1;
      }
      ({ error: err } = await supabase.from(section.table).insert(payload));
    } else {
      const { data, error: e2 } = await supabase.from(section.table).update(payload).eq('id', (editing as Row).id).select('id');
      err = e2 ?? (data && data.length === 0 ? { message: 'Not saved. You may not be signed in as an organiser.' } : null);
    }
    setSaving(false);
    if (err) {
      setError(explainError(err as { code?: string; message?: string }));
      return;
    }
    setEditing(null);
    setNotice('Saved. The website shows the change on the next page load.');
    load();
  };

  const remove = async (row: Row) => {
    if (!supabase) return;
    const name = row[section.titleKey] ?? 'this item';
    const warn = section.deleteWarning ? `\n\n${section.deleteWarning}` : '';
    if (!window.confirm(`Delete "${name}" permanently? This cannot be undone.${warn}`)) return;
    const { data, error: err } = await supabase.from(section.table).delete().eq('id', row.id).select('id');
    if (err || !data || data.length === 0) {
      setError(err ? explainError(err) : 'Not deleted. You may not be signed in as an organiser.');
      return;
    }
    setNotice('Deleted.');
    load();
  };

  const move = async (row: Row, dir: -1 | 1) => {
    if (!supabase) return;
    const group = section.groupKey ? rows.filter((r) => r[section.groupKey!] === row[section.groupKey!]) : rows;
    const i = group.findIndex((r) => r.id === row.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= group.length) return;
    const next = [...group];
    [next[i], next[j]] = [next[j], next[i]];
    const updates = next
      .map((r, idx) => ({ id: r.id, sort_order: idx + 1, old: r.sort_order }))
      .filter((u) => u.sort_order !== u.old);
    const results = await Promise.all(
      updates.map((u) => supabase!.from(section.table).update({ sort_order: u.sort_order }).eq('id', u.id).select('id')),
    );
    const bad = results.find((r) => r.error || !r.data || r.data.length === 0);
    if (bad) setError(bad.error ? explainError(bad.error) : 'Order not saved. You may not be signed in as an organiser.');
    load();
  };

  const set = (key: string, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));

  const renderField = (f: FieldDef) => {
    const v = draft[f.key];
    const id = `f-${section.id}-${f.key}`;
    const err = errors[f.key];
    const counter = f.max && typeof v === 'string' ? (
      <span className="text-neutral-400 normal-case tracking-normal float-right">{v.length}/{f.max}</span>
    ) : null;

    let control: React.ReactNode;
    switch (f.type) {
      case 'textarea':
        control = <textarea id={id} rows={5} className={inputCls} value={v ?? ''} maxLength={f.max ? f.max + 200 : undefined} onChange={(e) => set(f.key, e.target.value)} />;
        break;
      case 'number':
        control = <input id={id} type="number" className={inputCls} value={v ?? ''} onChange={(e) => set(f.key, e.target.value)} />;
        break;
      case 'boolean':
        control = (
          <label className="inline-flex items-center gap-2 text-sm text-neutral-200 cursor-pointer">
            <input id={id} type="checkbox" className="h-4 w-4 accent-[#d4af37]" checked={Boolean(v)} onChange={(e) => set(f.key, e.target.checked)} />
            {f.label}
          </label>
        );
        break;
      case 'select':
        control = (
          <select id={id} className={inputCls} value={v ?? ''} onChange={(e) => set(f.key, e.target.value)}>
            {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
        break;
      case 'relation':
        control = (
          <select id={id} className={inputCls} value={v ?? ''} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">— choose —</option>
            {relations[f.key]?.map((r) => <option key={r.id} value={r.id}>{f.relation!.labelKeys.map((k) => r[k]).join(' ')}</option>)}
          </select>
        );
        break;
      case 'datetime':
        control = <input id={id} type="datetime-local" className={inputCls} value={toLocalInput(v)} onChange={(e) => set(f.key, fromLocalInput(e.target.value))} />;
        break;
      case 'image':
      case 'file': {
        const shown = safeUrl(v);
        control = (
          <div className="space-y-2">
            {f.type === 'image' && shown && <img src={shown} alt="" className="h-20 w-20 object-cover rounded-md border border-neutral-700" referrerPolicy="no-referrer" />}
            {f.type === 'file' && shown && (
              <a href={shown} target="_blank" rel="noopener noreferrer" className="text-xs text-[#d4af37] underline break-all">Current file ↗</a>
            )}
            <FileUpload kind={f.type} onUploaded={(url) => set(f.key, url)} />
            <input id={id} className={inputCls} placeholder="…or paste a link (https://…)" value={v ?? ''} onChange={(e) => set(f.key, e.target.value)} />
          </div>
        );
        break;
      }
      default: {
        const listId = f.suggestions ? `${id}-list` : undefined;
        control = (
          <>
            <input id={id} className={inputCls} value={v ?? ''} placeholder={f.placeholder} list={listId} type={f.type === 'url' ? 'url' : 'text'} onChange={(e) => set(f.key, e.target.value)} />
            {f.suggestions && <datalist id={listId}>{f.suggestions.map((s) => <option key={s} value={s} />)}</datalist>}
          </>
        );
      }
    }

    return (
      <div key={f.key}>
        {f.type !== 'boolean' && <label htmlFor={id} className={labelCls}>{f.label}{f.required && <span className="text-[#d4af37]"> *</span>}{counter}</label>}
        {control}
        {f.help && <p className={helpCls}>{f.help}</p>}
        {err && <p className={errCls}>{err}</p>}
      </div>
    );
  };

  const groupEnds = (row: Row) => {
    const group = section.groupKey ? rows.filter((r) => r[section.groupKey!] === row[section.groupKey!]) : rows;
    const i = group.findIndex((r) => r.id === row.id);
    return { first: i <= 0, last: i === group.length - 1 };
  };

  const groupField = section.groupKey ? relationFields.find((f) => f.key === section.groupKey) : undefined;
  let lastGroup: unknown = Symbol();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl wm-serif text-white">{section.label}</h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl">{section.description}</p>
        </div>
        <button type="button" className={btnGold} onClick={startNew} disabled={loading}>
          <Plus className="w-3.5 h-3.5" /> Add new
        </button>
      </div>

      {error && <div className="mb-4 p-3 text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-md" role="alert">{error}</div>}
      {notice && <div className="mb-4 p-3 text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 rounded-md">{notice}</div>}

      {editing && (
        <form onSubmit={save} className={`${cardCls} p-5 mb-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">{editing === 'new' ? 'New item' : 'Edit item'}</h3>
            <button type="button" className="text-neutral-400 hover:text-white cursor-pointer" onClick={() => setEditing(null)} aria-label="Cancel"><X className="w-4 h-4" /></button>
          </div>
          {section.fields.map(renderField)}
          <div className="flex gap-3 pt-1">
            <button type="submit" className={btnGold} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
            </button>
            <button type="button" className={btnGhost} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-400 py-10 text-center border border-dashed border-white/[0.07] rounded-md">Nothing here yet. Click “Add new”.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const { first, last } = groupEnds(row);
            const g = section.groupKey ? row[section.groupKey] : undefined;
            const showGroup = groupField && g !== lastGroup;
            lastGroup = g;
            return (
              <React.Fragment key={row.id}>
                {showGroup && groupField && (
                  <li className="pt-3 text-[11px] font-mono uppercase tracking-widest text-[#d4af37]">{relationLabel(groupField, g)}</li>
                )}
                <li className={`${cardCls} p-3 flex items-center gap-3`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">{String(row[section.titleKey] ?? '')}</div>
                    <div className="text-[11px] text-neutral-400 truncate">
                      {section.subtitleKey === 'published_at'
                        ? new Date(row.published_at).toLocaleString()
                        : section.subtitleKey ? String(row[section.subtitleKey] ?? '') : ''}
                    </div>
                  </div>
                  {row.pinned && <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-[#d4af37]/40 text-[#d4af37] rounded-md">Pinned</span>}
                  {row.published === false && <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-neutral-600 text-neutral-400 rounded-md">Hidden</span>}
                  {section.sortable && (
                    <div className="flex gap-1">
                      <button type="button" className={btnGhost} disabled={first} onClick={() => move(row, -1)} aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button type="button" className={btnGhost} disabled={last} onClick={() => move(row, 1)} aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  <button type="button" className={btnGhost} onClick={() => startEdit(row)}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                  <button type="button" className={btnDanger} onClick={() => remove(row)} aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
};
