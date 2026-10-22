import React, { useState } from 'react';
import {
  Users,
  Crown,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Shield,
  UserCheck,
  Building2,
  X,
  ExternalLink,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type { EbHierarchyNode } from '../../lib/ebOperationsService';

interface EbHierarchyViewProps {
  profile: EbMemberProfile;
  hierarchy: EbHierarchyNode[];
}

export const EbHierarchyView: React.FC<EbHierarchyViewProps> = ({
  profile,
  hierarchy,
}) => {
  const [selectedPerson, setSelectedPerson] = useState<EbHierarchyNode | null>(null);

  // Vertical mind-map layout: each reporting level flows downward,
  // with peers branching horizontally beneath their manager.
  const renderNode = (node: EbHierarchyNode, level = 1): React.ReactNode => {
    const hasChildren = Boolean(node.children?.length);
    const isLeadership = level <= 4 || /secretary-general|under-secretary|senior advisor/i.test(node.role_title);
    const isMe = node.assigned_name.toLowerCase() === profile.name.toLowerCase();

    return (
      <div key={node.id} className="flex min-w-0 flex-col items-center">
        <button
          type="button"
          onClick={() => setSelectedPerson(node)}
          className={`group relative z-10 w-[250px] max-w-[calc(100vw-5rem)] rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d4af37]/80 hover:shadow-[0_8px_30px_rgba(212,175,55,0.10)] sm:w-[280px] ${
            isMe
              ? 'border-[#d4af37] bg-gradient-to-br from-[#d4af37]/25 to-[#0b0b0d] shadow-[0_0_24px_rgba(212,175,55,0.16)]'
              : isLeadership
              ? 'border-[#d4af37]/45 bg-gradient-to-br from-[#211b0d] to-[#0c0c0e]'
              : 'border-white/10 bg-gradient-to-br from-[#151518] to-[#09090b]'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              isLeadership ? 'border-[#d4af37]/60 bg-[#d4af37]/15 text-[#f5d47a]' : 'border-white/10 bg-white/5 text-neutral-400'
            }`}>
              {isLeadership ? <Crown className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#d4af37]">
                  {node.department.replace(/_/g, ' ')}
                </span>
                {isMe && <span className="rounded bg-[#d4af37] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-black">You</span>}
              </div>
              <h4 className="text-sm font-semibold text-white transition group-hover:text-[#f5d47a]">{node.assigned_name}</h4>
              <p className="mt-0.5 text-xs font-medium text-[#d4af37]">{node.role_title}</p>
              {node.section && <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">{node.section} section</p>}
              {node.responsibilities && <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-neutral-400">{node.responsibilities}</p>}
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 rotate-90 text-neutral-500 transition group-hover:text-white" />
          </div>
        </button>

        {hasChildren && (
          <>
            <div className="h-7 w-px bg-gradient-to-b from-[#d4af37]/70 to-white/15" />
            <div className="relative flex w-full min-w-max justify-center pt-7 before:absolute before:left-1/2 before:top-0 before:h-3.5 before:w-px before:-translate-x-1/2 before:bg-white/20">
              {node.children!.length > 1 && (
                <div className="absolute left-[calc(50%_/_var(--unused,1))] right-0 top-0 hidden border-t border-white/20" />
              )}
              <div className="flex w-full flex-wrap items-start justify-center gap-x-6 gap-y-8">
                {node.children!.map((child) => (
                  <div key={child.id} className="relative flex min-w-0 flex-col items-center before:absolute before:-top-7 before:left-1/2 before:h-7 before:w-px before:-translate-x-1/2 before:bg-white/20">
                    {renderNode(child, level + 1)}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-4">
        <h2 className="font-serif text-2xl font-normal text-white">Department Chain of Command</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Executive reporting hierarchy, team leadership, assigned mandates, and direct communication lines.
        </p>
      </div>

      {/* Tree Container */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-5 sm:p-8">
        {hierarchy.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            Organizational hierarchy chart is being synchronized with the Secretariat database.
          </div>
        ) : (
          <div className="flex min-w-max flex-col items-center gap-8 py-4">{hierarchy.map((rootNode) => renderNode(rootNode))}</div>
        )}
      </div>

      {/* Person Dossier Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/40 bg-[#0e0e12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                Executive Personnel Dossier
              </span>
              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <h3 className="font-serif text-xl font-semibold text-white">{selectedPerson.assigned_name}</h3>
              <p className="text-xs font-medium text-[#d4af37] mt-0.5">{selectedPerson.role_title}</p>
              <p className="text-[11px] text-neutral-400 capitalize mt-0.5">
                {selectedPerson.department.replace(/_/g, ' ')} Directorate
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1.5 text-xs text-neutral-300">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Core Portfolio & Responsibilities
              </span>
              <p className="leading-relaxed">{selectedPerson.responsibilities}</p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Contact & Communication
              </span>
              {selectedPerson.contact_email && (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
                  <a href={`mailto:${selectedPerson.contact_email}`} className="font-mono hover:underline">
                    {selectedPerson.contact_email}
                  </a>
                </div>
              )}
              {selectedPerson.contact_phone && (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Phone className="h-3.5 w-3.5 text-[#d4af37]" />
                  <a href={`tel:${selectedPerson.contact_phone.replace(/\s+/g, '')}`} className="font-mono hover:underline">
                    {selectedPerson.contact_phone}
                  </a>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
