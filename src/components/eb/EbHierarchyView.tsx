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

  // Render a node and its children recursively in a clean tree structure
  const renderNode = (node: EbHierarchyNode, level = 1) => {
    const hasChildren = node.children && node.children.length > 0;
    const isHead = node.rank_level === 1 || node.rank_level === 2;
    const isMe = node.assigned_name.toLowerCase() === profile.name.toLowerCase();

    return (
      <div key={node.id} className="relative space-y-4">
        {/* Node Card */}
        <div
          onClick={() => setSelectedPerson(node)}
          className={`group cursor-pointer rounded-2xl border p-4 sm:p-5 transition-all max-w-xl ${
            isMe
              ? 'border-[#d4af37] bg-gradient-to-r from-[#d4af37]/25 to-[#d4af37]/5 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
              : isHead
              ? 'border-[#d4af37]/40 bg-gradient-to-b from-[#18150f] to-[#0c0c0e] hover:border-[#d4af37]'
              : 'border-white/10 bg-black/40 hover:border-white/25 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  isHead
                    ? 'border-[#d4af37]/60 bg-[#d4af37]/20 text-[#f5d47a]'
                    : 'border-white/10 bg-white/5 text-neutral-400'
                }`}
              >
                {isHead ? <Crown className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#d4af37]">
                    Tier {node.rank_level} · {node.department.replace(/_/g, ' ')}
                  </span>
                  {isMe && (
                    <span className="rounded bg-[#d4af37] px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase text-black">
                      You
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-white group-hover:text-[#f5d47a] transition">
                  {node.assigned_name}
                </h4>

                <p className="mt-0.5 text-xs text-[#d4af37] font-medium">{node.role_title}</p>
                <p className="mt-1 text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                  {node.responsibilities}
                </p>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-neutral-500 group-hover:text-white shrink-0 mt-2" />
          </div>
        </div>

        {/* Children reporting tree */}
        {hasChildren && (
          <div className="pl-6 sm:pl-10 border-l border-white/10 space-y-4 ml-4 sm:ml-5">
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
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
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 space-y-6 overflow-x-auto">
        {hierarchy.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            Organizational hierarchy chart is being synchronized with the Secretariat database.
          </div>
        ) : (
          hierarchy.map((rootNode) => renderNode(rootNode))
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
