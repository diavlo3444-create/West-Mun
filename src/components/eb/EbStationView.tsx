import React, { useState } from 'react';
import {
  MapPin,
  Building2,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Shield,
  Layers,
  Wrench,
  Check,
  ChevronRight,
  Edit3,
  X,
  Plus,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type {
  EbStation,
  StationChecklistItem,
} from '../../lib/ebOperationsService';

interface EbStationViewProps {
  profile: EbMemberProfile;
  stations: EbStation[];
  onToggleStationChecklist: (stationId: string, type: 'opening' | 'closing', checklist: StationChecklistItem[]) => Promise<void>;
}

export const EbStationView: React.FC<EbStationViewProps> = ({
  profile,
  stations,
  onToggleStationChecklist,
}) => {
  const [activeStationId, setActiveStationId] = useState<string>(stations[0]?.id || '');

  const activeStation = stations.find((s) => s.id === activeStationId) || stations[0];

  const handleToggleCheck = async (type: 'opening' | 'closing', itemId: string) => {
    if (!activeStation) return;
    const list = type === 'opening' ? activeStation.opening_checklist : activeStation.closing_checklist;
    const updated = list.map((item) => (item.id === itemId ? { ...item, checked: !item.checked } : item));
    await onToggleStationChecklist(activeStation.id, type, updated);
  };

  if (!activeStation) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center text-xs text-neutral-400">
        No active station dossiers configured for this department yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-4">
        <h2 className="font-serif text-2xl font-normal text-white">Station Operating Manuals</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Standard operating procedures, equipment custody, opening/closing verification, and escalation contacts.
        </p>
      </div>

      {/* Station Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {stations.map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => setActiveStationId(st.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
              activeStation.id === st.id
                ? 'border-[#d4af37] bg-gradient-to-r from-[#d4af37]/20 to-[#d4af37]/10 text-white shadow-[0_0_16px_rgba(212,175,55,0.18)]'
                : 'border-white/10 bg-black/40 text-neutral-400 hover:border-white/20 hover:text-white'
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>{st.name}</span>
          </button>
        ))}
      </div>

      {/* Main Station Dossier Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Core Dossier & SOP (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-[#d4af37]/30 bg-gradient-to-b from-[#18150f] via-[#0d0c0e] to-black p-6 shadow-xl space-y-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                Official Venue Station
              </span>
              <h3 className="mt-1 text-xl font-serif font-semibold text-white">{activeStation.name}</h3>
              <div className="mt-2 flex items-center gap-2 text-xs text-neutral-300">
                <MapPin className="h-4 w-4 text-[#d4af37] shrink-0" />
                <span>{activeStation.location}</span>
              </div>
            </div>

            <div className="border-t border-white/[0.08] pt-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Station Mandate</span>
              <p className="mt-1 text-xs text-neutral-200 leading-relaxed">{activeStation.purpose}</p>
            </div>

            {/* Operating Procedures & Duties */}
            <div className="border-t border-white/[0.08] pt-3 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37]">
                Standard Operating Duties
              </span>
              <ul className="space-y-2 text-xs text-neutral-300">
                {activeStation.duties.map((duty, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af37]" />
                    <span className="leading-relaxed">{duty}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Equipment & Materials Needed */}
            <div className="border-t border-white/[0.08] pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-[#d4af37]" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-300">
                  Required Equipment & Materials
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {activeStation.equipment.map((eq, idx) => (
                  <div key={idx} className="rounded-lg border border-white/5 bg-black/40 p-2.5 text-neutral-300">
                    {eq}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Checklists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opening Checklist */}
            <div className="rounded-2xl border border-white/10 bg-black/50 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#f5d47a]">
                  Opening Verification
                </span>
                <span className="font-mono text-[10px] text-neutral-500">
                  {activeStation.opening_checklist.filter((i) => i.checked).length}/
                  {activeStation.opening_checklist.length}
                </span>
              </div>

              <div className="space-y-2">
                {activeStation.opening_checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleCheck('opening', item.id)}
                    className="cursor-pointer flex items-center gap-2.5 rounded-lg border border-white/5 bg-black/40 p-2 text-xs transition hover:bg-white/[0.03]"
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        item.checked
                          ? 'border-emerald-500 bg-emerald-500 text-black'
                          : 'border-white/30 hover:border-emerald-500'
                      }`}
                    >
                      {item.checked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className={item.checked ? 'line-through text-neutral-500' : 'text-neutral-200'}>
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Closing Checklist */}
            <div className="rounded-2xl border border-white/10 bg-black/50 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  Closing / Adjournment
                </span>
                <span className="font-mono text-[10px] text-neutral-500">
                  {activeStation.closing_checklist.filter((i) => i.checked).length}/
                  {activeStation.closing_checklist.length}
                </span>
              </div>

              <div className="space-y-2">
                {activeStation.closing_checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleCheck('closing', item.id)}
                    className="cursor-pointer flex items-center gap-2.5 rounded-lg border border-white/5 bg-black/40 p-2 text-xs transition hover:bg-white/[0.03]"
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        item.checked
                          ? 'border-[#d4af37] bg-[#d4af37] text-black'
                          : 'border-white/30 hover:border-[#d4af37]'
                      }`}
                    >
                      {item.checked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className={item.checked ? 'line-through text-neutral-500' : 'text-neutral-200'}>
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Supervisor & Emergency Escalation (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Station Supervisor Card */}
          <div className="rounded-2xl border border-white/10 bg-black/50 p-5 space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Station Duty Supervisor
            </span>
            <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/[0.06] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-white">{activeStation.supervisor_name}</h4>
                <span className="rounded bg-[#d4af37]/20 px-2 py-0.5 text-[9px] font-mono text-[#d4af37] uppercase">
                  Lead
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-300">
                <Phone className="h-3.5 w-3.5 text-[#d4af37]" />
                <span className="font-mono">{activeStation.supervisor_contact}</span>
              </div>
            </div>
          </div>

          {/* Emergency Escalation Matrix */}
          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 via-black to-[#08080a] p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-rose-500/20 pb-3">
              <Shield className="h-5 w-5 text-rose-400" />
              <div>
                <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
                  Emergency Escalation Contacts
                </h3>
                <p className="text-[10px] text-neutral-400">Immediate response numbers for venue incidents</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {activeStation.emergency_contacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-black/40 p-3.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <h5 className="font-semibold text-xs text-white">{contact.name}</h5>
                    <p className="text-[11px] text-neutral-400">{contact.role}</p>
                  </div>
                  <a
                    href={`tel:${contact.contact.replace(/\s+/g, '')}`}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/20 px-3 py-1.5 text-xs font-mono font-semibold text-rose-200 hover:bg-rose-500/30"
                  >
                    <Phone className="h-3 w-3" />
                    <span>Call</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
