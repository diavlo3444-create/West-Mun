import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { btnGhost, errCls, explainError } from './ui';

const MAX_BYTES = 15 * 1024 * 1024; // must match the bucket limit in schema.sql
const TYPES: Record<'image' | 'file', Record<string, string[]>> = {
  image: { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'] },
  file: { 'application/pdf': ['pdf'], 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'] },
};

function cleanName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  return ext ? `${base}.${ext}` : base;
}

/** Uploads a PDF/image to the public "site-files" bucket and returns its public link. */
export const FileUpload: React.FC<{ kind: 'image' | 'file'; onUploaded: (url: string) => void }> = ({ kind, onUploaded }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const accept = Object.keys(TYPES[kind]).join(',');
  const nice = kind === 'image' ? 'JPG, PNG or WebP' : 'PDF, JPG, PNG or WebP';

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supabase) return;
    setError('');
    const exts = TYPES[kind][file.type];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!exts || !exts.includes(ext)) return setError(`Only ${nice} files are allowed.`);
    if (file.size > MAX_BYTES) return setError('The file is larger than 15 MB.');
    setBusy(true);
    const path = `${kind}/${Date.now()}-${cleanName(file.name)}`;
    const { error: upErr } = await supabase.storage.from('site-files').upload(path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: '3600',
    });
    if (upErr) {
      setBusy(false);
      return setError(explainError(upErr));
    }
    const { data } = supabase.storage.from('site-files').getPublicUrl(path);
    setBusy(false);
    onUploaded(data.publicUrl);
  };

  return (
    <div>
      <input ref={input} type="file" accept={accept} className="hidden" onChange={pick} />
      <button type="button" className={btnGhost} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {busy ? 'Uploading…' : `Upload ${kind === 'image' ? 'image' : 'file'}`}
      </button>
      <span className="ml-2 text-[11px] text-neutral-500">{nice}, max 15 MB</span>
      {error && <p className={errCls}>{error}</p>}
    </div>
  );
};
