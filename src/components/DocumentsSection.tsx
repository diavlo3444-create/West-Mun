import React from 'react';
import { FileText, Download } from 'lucide-react';
import { usePublicTable, type DocumentRow } from '../lib/content';
import { safeUrl } from '../lib/safe';

/** Background guides, handbooks, rules. Hidden until the first document is added in the admin panel. */
export const DocumentsSection: React.FC = React.memo(() => {
  const docs = usePublicTable<DocumentRow>('documents', []).filter((d) => safeUrl(d.file_url));
  if (docs.length === 0) return null;

  return (
    <section id="documents" className="relative z-20 py-20 sm:py-24 bg-[#070707] text-white border-t border-neutral-900">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-12">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-8 h-[1px] bg-[#d4af37]" />
          <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">Resources</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif text-white tracking-tight mb-10" style={{ fontFamily: 'var(--font-heading)' }}>
          Delegate <span className="gold-gradient-text">Documents</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map((d) => (
            <a
              key={d.id}
              href={safeUrl(d.file_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 p-5 bg-[#0e0e11] border border-neutral-800/90 hover:border-[#d4af37]/50 rounded-sm transition-colors"
            >
              <FileText className="w-6 h-6 text-[#d4af37] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                {d.category && <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]">{d.category}</span>}
                <h3 className="text-base font-serif text-white group-hover:text-[#f3e5ab] transition-colors">{d.title}</h3>
                {d.description && <p className="text-xs text-neutral-400 font-light mt-1 leading-relaxed">{d.description}</p>}
              </div>
              <Download className="w-4 h-4 text-neutral-500 group-hover:text-[#d4af37] shrink-0 mt-1" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
});
DocumentsSection.displayName = 'DocumentsSection';
