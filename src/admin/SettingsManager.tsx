import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EMAIL_RE, safeUrl } from '../lib/safe';
import { parseDate } from '../lib/registration';
import { DEFAULT_SETTINGS } from '../lib/content';
import { SETTING_GROUPS, type SettingField } from './config';
import { btnGold, cardCls, errCls, explainError, helpCls, inputCls, labelCls } from './ui';

function check(f: SettingField, value: string): string {
  const v = value ?? '';
  if (f.max && v.length > f.max) return `Maximum ${f.max} characters.`;
  if (!v.trim()) return '';
  switch (f.type) {
    case 'number':
      return /^\d{1,6}(\.\d{1,2})?$/.test(v.trim()) ? '' : 'Numbers only, like 10 or 12.50.';
    case 'date':
      return parseDate(v) ? '' : 'Pick a real date.';
    case 'email':
      return EMAIL_RE.test(v.trim()) ? '' : 'Enter a valid email address.';
    case 'url':
      return safeUrl(v) ? '' : 'Use a link starting with https://';
    default:
      return '';
  }
}

export const SettingsManager: React.FC = () => {
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from('settings').select('key,value');
    if (error) setMessage({ ok: false, text: explainError(error) });
    const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const r of (data as Array<{ key: string; value: string }>) ?? []) merged[r.key] = r.value ?? '';
    setSaved(merged);
    setValues(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const errs: Record<string, string> = {};
    const changed: Array<{ key: string; value: string }> = [];
    for (const g of SETTING_GROUPS) {
      for (const f of g.fields) {
        const v = values[f.key] ?? '';
        const msg = check(f, v);
        if (msg) errs[f.key] = msg;
        if (v !== (saved[f.key] ?? '')) changed.push({ key: f.key, value: v.trim() });
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length) return setMessage({ ok: false, text: 'Fix the highlighted fields first.' });
    if (changed.length === 0) return setMessage({ ok: true, text: 'Nothing changed.' });
    setSaving(true);
    const { data, error } = await supabase.from('settings').upsert(changed, { onConflict: 'key' }).select('key');
    setSaving(false);
    if (error || !data || data.length !== changed.length) {
      return setMessage({ ok: false, text: error ? explainError(error) : 'Not saved. You may not be signed in as an organiser.' });
    }
    setMessage({ ok: true, text: `Saved ${changed.length} setting${changed.length === 1 ? '' : 's'}.` });
    load();
  };

  if (loading) return <p className="text-sm text-neutral-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>;

  return (
    <form onSubmit={save} noValidate>
      <div className="mb-5">
        <h2 className="text-xl wm-serif text-white">Settings</h2>
        <p className="text-xs text-neutral-400 mt-1 max-w-xl">
          Fees, dates, links and page texts. Everything here is <strong>public</strong>: never type passwords or private notes into settings.
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-3 text-xs rounded-md border ${message.ok ? 'text-emerald-300 bg-emerald-950/30 border-emerald-500/30' : 'text-red-300 bg-red-950/40 border-red-500/40'}`} role="status">
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {SETTING_GROUPS.map((g) => (
          <section key={g.id} className={`${cardCls} p-5`}>
            <h3 className="text-sm font-semibold text-[#d4af37] uppercase tracking-wider">{g.title}</h3>
            {g.description && <p className="text-xs text-neutral-400 mt-1 mb-4 max-w-2xl">{g.description}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {g.fields.map((f) => {
                const id = `s-${f.key}`;
                const v = values[f.key] ?? '';
                const wide = f.type === 'textarea';
                return (
                  <div key={f.key} className={wide ? 'md:col-span-2' : ''}>
                    {f.type === 'boolean' ? (
                      <label className="inline-flex items-center gap-2 text-sm text-neutral-200 cursor-pointer">
                        <input id={id} type="checkbox" className="h-4 w-4 accent-[#d4af37]" checked={v.trim().toLowerCase() === 'true'} onChange={(e) => setValues({ ...values, [f.key]: e.target.checked ? 'true' : 'false' })} />
                        {f.label}
                      </label>
                    ) : (
                      <>
                        <label htmlFor={id} className={labelCls}>{f.label}</label>
                        {f.type === 'textarea' ? (
                          <textarea id={id} rows={f.key.endsWith('_override') ? 10 : 3} className={inputCls} value={v} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                        ) : (
                          <input
                            id={id}
                            className={inputCls}
                            type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'}
                            inputMode={f.type === 'number' ? 'decimal' : undefined}
                            placeholder={f.placeholder}
                            value={v}
                            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                          />
                        )}
                      </>
                    )}
                    {f.help && <p className={helpCls}>{f.help}</p>}
                    {errors[f.key] && <p className={errCls}>{errors[f.key]}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="sticky bottom-0 mt-6 py-4 bg-[#0a0a0d]/95 border-t border-white/[0.07]">
        <button type="submit" className={btnGold} disabled={saving}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save settings
        </button>
      </div>
    </form>
  );
};
