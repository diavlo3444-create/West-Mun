import React, { useState } from 'react';
import { Shield, FileText, UserCheck, X, ExternalLink, Info } from 'lucide-react';

interface CommitteeData {
  id: string;
  trackNumber: string;
  name: string;
  type: string;
  topic: string;
  chair: string;
  description: string;
  level: string;
}

export const CommitteesSection: React.FC = () => {
  const [selectedCommittee, setSelectedCommittee] = useState<CommitteeData | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const committees: CommitteeData[] = [
    {
      id: 'comm-1',
      trackNumber: '01',
      name: 'TBA',
      type: 'General Assembly',
      topic: 'TBA',
      chair: 'TBA',
      description: 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.',
      level: 'Novice & Intermediate',
    },
    {
      id: 'comm-2',
      trackNumber: '02',
      name: 'TBA',
      type: 'Security Council',
      topic: 'TBA',
      chair: 'TBA',
      description: 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.',
      level: 'Advanced & Crisis',
    },
    {
      id: 'comm-3',
      trackNumber: '03',
      name: 'TBA',
      type: 'Economic & Social Council',
      topic: 'TBA',
      chair: 'TBA',
      description: 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.',
      level: 'Intermediate',
    },
    {
      id: 'comm-4',
      trackNumber: '04',
      name: 'TBA',
      type: 'Specialized Agency',
      topic: 'TBA',
      chair: 'TBA',
      description: 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.',
      level: 'All Experience Levels',
    },
    {
      id: 'comm-5',
      trackNumber: '05',
      name: 'TBA',
      type: 'Crisis Committee',
      topic: 'TBA',
      chair: 'TBA',
      description: 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.',
      level: 'Advanced / Dynamic Directives',
    },
    {
      id: 'comm-6',
      trackNumber: '06',
      name: 'TBA',
      type: 'Regional Body',
      topic: 'TBA',
      chair: 'TBA',
      description: 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.',
      level: 'Intermediate',
    },
  ];

  const filteredCommittees =
    filterType === 'all'
      ? committees
      : committees.filter((c) => c.type.toLowerCase().includes(filterType.toLowerCase()));

  return (
    <section id="committees" className="relative z-20 py-24 sm:py-32 bg-[#0a0a0c] text-white border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-[1px] bg-[#d4af37]" />
              <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
                Simulated Organs & Assemblies
              </span>
            </div>
            <h2
              className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Conference <span className="gold-gradient-text">Committees</span>
            </h2>
          </div>
          <p className="text-neutral-400 text-sm max-w-md font-light">
            Each organ challenges delegates to navigate distinct mandates, voting thresholds, and procedural rules. Official names and agendas are pending announcement (TBA).
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 text-xs scrollbar-none">
          <span className="text-neutral-500 uppercase tracking-widest text-[11px] mr-2">Filter:</span>
          {['all', 'General Assembly', 'Security Council', 'Crisis', 'Specialized'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-sm transition-all whitespace-nowrap cursor-pointer ${
                filterType === type
                  ? 'bg-[#d4af37] text-black font-semibold'
                  : 'bg-[#141416] text-neutral-300 hover:bg-[#1f1f23] border border-neutral-800'
              }`}
            >
              {type === 'all' ? 'All Organs' : type}
            </button>
          ))}
        </div>

        {/* Committees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommittees.map((item) => (
            <div
              key={item.id}
              className="group p-7 bg-[#0e0e11] border border-neutral-800/90 hover:border-[#d4af37]/50 transition-all duration-300 rounded-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono tracking-widest uppercase px-2.5 py-0.5 bg-[#17171c] text-[#d4af37] border border-[#d4af37]/20 rounded-sm">
                    {item.type}
                  </span>
                  <span className="text-xs font-mono text-neutral-500">
                    Track {item.trackNumber}
                  </span>
                </div>

                <h3 className="text-xl font-serif text-white mb-2 group-hover:text-[#f3e5ab] transition-colors">
                  Committee Name: <span className="text-[#d4af37] font-semibold">{item.name}</span>
                </h3>

                <p className="text-neutral-400 text-xs leading-relaxed mb-6 font-light">
                  {item.description}
                </p>

                {/* Structured Fields */}
                <div className="space-y-2.5 pt-4 border-t border-neutral-800/80 text-xs mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#d4af37]" /> Agenda / Topic
                    </span>
                    <span className="font-mono text-neutral-300 font-medium">{item.topic}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#d4af37]" /> Chairperson
                    </span>
                    <span className="font-mono text-neutral-300 font-medium">{item.chair}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#d4af37]" /> Delegate Level
                    </span>
                    <span className="text-neutral-300">{item.level}</span>
                  </div>
                </div>
              </div>

              {/* View Committee Details CTA Button */}
              <button
                type="button"
                onClick={() => setSelectedCommittee(item)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs uppercase tracking-wider font-semibold text-neutral-200 bg-[#141418] hover:bg-[#d4af37] hover:text-black border border-neutral-700/80 hover:border-[#d4af37] rounded-sm transition-all cursor-pointer"
              >
                <span>View Committee Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Modal for Committee Details (No fabricated details) */}
        {selectedCommittee && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="relative w-full max-w-lg bg-[#0e0e12] border border-[#d4af37]/40 rounded-sm p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setSelectedCommittee(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-sm focus:outline-none"
                aria-label="Close committee details dialog"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-mono uppercase tracking-widest px-2 py-0.5 bg-[#17171c] text-[#d4af37] border border-[#d4af37]/20 rounded-sm">
                  {selectedCommittee.type}
                </span>
                <span className="text-xs font-mono text-neutral-500">
                  Track {selectedCommittee.trackNumber}
                </span>
              </div>

              <h3 id="modal-title" className="text-2xl font-serif text-white mb-2">
                Committee Dossier: <span className="text-[#d4af37]">TBA</span>
              </h3>

              <div className="p-3 bg-[#16161c] border border-neutral-800 rounded-sm mb-6 flex items-start gap-2.5 text-xs text-neutral-300">
                <Info className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <span>
                  Official committee title, background study guides, and chair appointments are pending final ratification by the Secretariat (TBA).
                </span>
              </div>

              <div className="space-y-3.5 text-sm mb-8 divide-y divide-neutral-800/80">
                <div className="pt-2 flex justify-between">
                  <span className="text-neutral-400">Committee Name:</span>
                  <span className="font-mono text-[#d4af37]">TBA</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-neutral-400">Primary Agenda:</span>
                  <span className="font-mono text-[#d4af37]">TBA</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-neutral-400">Chairperson / Director:</span>
                  <span className="font-mono text-[#d4af37]">TBA</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-neutral-400">Experience Tier:</span>
                  <span className="text-white">{selectedCommittee.level}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-neutral-400">Rules of Procedure:</span>
                  <span className="text-white">HMUN / THIMUN Standard (TBA)</span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCommittee(null)}
                  className="px-5 py-2 text-xs uppercase tracking-wider font-semibold text-black bg-[#d4af37] hover:bg-[#e5c158] rounded-sm transition-colors cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
