import React from 'react';
import { Megaphone, Pin } from 'lucide-react';
import { usePublicTable, type AnnouncementRow } from '../lib/content';

/** Hidden until the Secretariat publishes the first announcement in the admin panel. */
export const AnnouncementsSection: React.FC = React.memo(() => {
  const items = usePublicTable<AnnouncementRow>('announcements', [], [['pinned', false], ['published_at', false]]);
  if (items.length === 0) return null;

  return (
    <section id="announcements" className="relative z-20 py-16 sm:py-20 bg-[#0a0a0c] text-white border-t border-neutral-900">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 md:px-12">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-8 h-[1px] bg-[#d4af37]" />
          <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">Announcements</span>
        </div>
        <div className="space-y-4">
          {items.map((a) => (
            <article key={a.id} className="p-6 bg-[#0e0e11] border border-neutral-800/90 rounded-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-lg font-serif text-white flex items-center gap-2">
                  {a.pinned ? <Pin className="w-4 h-4 text-[#d4af37] shrink-0" /> : <Megaphone className="w-4 h-4 text-[#d4af37] shrink-0" />}
                  {a.title}
                </h3>
                <time className="text-[11px] font-mono text-neutral-500 shrink-0" dateTime={a.published_at}>
                  {new Date(a.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </time>
              </div>
              {a.body && <p className="text-sm text-neutral-300 font-light leading-relaxed whitespace-pre-wrap">{a.body}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
});
AnnouncementsSection.displayName = 'AnnouncementsSection';
