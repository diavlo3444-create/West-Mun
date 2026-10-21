import React, { useEffect, useState } from 'react';
import { ExternalLink, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MARKER = /\n?\n?\[EXTRA_PHOTOS\]\n([\s\S]*?)\n\[\/EXTRA_PHOTOS\]/;

export function stripExtraPhotoMarker(statement?: string | null): string {
  return String(statement || '').replace(MARKER, '').trim();
}

export const RegistrationExtraPhotos: React.FC<{ statement?: string | null }> = ({ statement }) => {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const match = String(statement || '').match(MARKER);
    const paths = match?.[1].split('\n').map((p) => p.trim()).filter((p) => p.startsWith('registration-extra/')) || [];
    if (!supabase || paths.length === 0) { setUrls([]); return; }
    setLoading(true);
    Promise.all(paths.map(async (path) => {
      const { data, error } = await supabase!.storage.from('registration-extra').createSignedUrl(path, 60 * 60);
      return !error && data?.signedUrl ? data.signedUrl : null;
    })).then((results) => { if (alive) setUrls(results.filter((url): url is string => Boolean(url))); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [statement]);

  const count = String(statement || '').match(MARKER)?.[1].split('\n').filter((p) => p.trim().startsWith('registration-extra/')).length || 0;
  if (!count) return null;
  return (
    <section className="mt-3 rounded-md border border-[#d4af37]/20 bg-[#101013] p-3">
      <h3 className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[#d4af37]">
        <ImageIcon className="h-3.5 w-3.5" /> Extra — Past Experience Photos ({count})
      </h3>
      {loading ? <p className="flex items-center gap-2 text-xs text-neutral-400"><Loader2 className="h-3 w-3 animate-spin" /> Loading photos…</p> :
        urls.length ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {urls.map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded border border-white/10">
            <img src={url} alt={`Past experience photo ${i + 1}`} loading="lazy" className="h-28 w-full object-cover transition-transform group-hover:scale-[1.03]" />
            <span className="flex items-center justify-center gap-1 py-1.5 text-[10px] text-neutral-300"><ExternalLink className="h-3 w-3" /> Open photo</span>
          </a>)}
        </div> : <p className="text-xs text-neutral-400">Photos were attached, but could not be loaded with your current permissions.</p>}
    </section>
  );
};
