import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Check,
  Send,
  X,
  Loader2,
  AlertCircle,
  FileText,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type {
  EbShift,
  EbStation,
  EbTask,
  EbAnnouncement,
  EbIncident,
} from '../../lib/ebOperationsService';

interface EbEventDayModeProps {
  profile: EbMemberProfile;
  currentShift: EbShift | null;
  station: EbStation | null;
  tasks: EbTask[];
  announcements: EbAnnouncement[];
  incidents: EbIncident[];
  onToggleTaskChecklist: (taskId: string, itemId: string) => Promise<void>;
  onReportIncident: (incident: Omit<EbIncident, 'id' | 'created_at' | 'status'>) => Promise<void>;
  onResolveIncident?: (incidentId: string, resolutionNotes: string) => Promise<void>;
  onExitEventDayMode: () => void;
}

export const EbEventDayMode: React.FC<EbEventDayModeProps> = ({
  profile,
  currentShift,
  station,
  tasks,
  announcements,
  incidents,
  onToggleTaskChecklist,
  onReportIncident,
  onResolveIncident,
  onExitEventDayMode,
}) => {
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [category, setCategory] = useState<'medical' | 'security' | 'decorum' | 'logistics' | 'it_tech' | 'protocol' | 'other'>('decorum');
  const [location, setLocation] = useState(station?.location || 'Main Chamber Hall');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [busy, setBusy] = useState(false);
  const [incidentSuccess, setIncidentSuccess] = useState(false);

  // Resolution modal state for supervisors
  const [resolveIncidentId, setResolveIncidentId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const canManageIncidents = profile.isHead || profile.isAdmin || profile.role === 'co_head';

  const urgentAlerts = announcements.filter((a) => a.priority === 'critical' || a.priority === 'urgent');

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || busy) return;
    setBusy(true);
    try {
      await onReportIncident({
        department: profile.department,
        section: profile.section,
        reporter_name: profile.name,
        reporter_role: profile.role,
        category,
        location: location.trim(),
        description: description.trim(),
        severity,
      });
      setIncidentSuccess(true);
      setTimeout(() => {
        setIncidentModalOpen(false);
        setIncidentSuccess(false);
        setDescription('');
      }, 1500);
    } finally {
      setBusy(false);
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolveIncidentId || !onResolveIncident || busy) return;
    setBusy(true);
    try {
      await onResolveIncident(resolveIncidentId, resolutionNotes.trim() || 'Resolved by station supervisor.');
      setResolveIncidentId(null);
      setResolutionNotes('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-12 animate-in fade-in duration-150">
      {/* Event Day Mode Top Banner */}
      <div className="flex items-center justify-between rounded-xl border border-[#d4af37]/40 bg-gradient-to-r from-[#1c180e] to-black p-3.5 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#d4af37]">
            Event-Day Field Mode Active
          </span>
        </div>

        <button
          type="button"
          onClick={onExitEventDayMode}
          className="text-xs text-neutral-400 hover:text-white underline underline-offset-4"
        >
          Exit to Full Portal
        </button>
      </div>

      {/* Urgent Alert Banner (if any) */}
      {urgentAlerts.length > 0 && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-4 space-y-1 shadow-md">
          <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs uppercase tracking-wider">
            <AlertCircle className="h-4 w-4 animate-pulse" />
            <span>URGENT DIRECTIVE: {urgentAlerts[0].title}</span>
          </div>
          <p className="text-xs text-rose-100 leading-relaxed">{urgentAlerts[0].body}</p>
        </div>
      )}

      {/* Primary Current Shift & Station Card (Large Touch Target) */}
      <div className="rounded-2xl border border-[#d4af37] bg-gradient-to-b from-[#1c180f] via-[#0d0c0e] to-black p-5 shadow-[0_0_24px_rgba(212,175,55,0.18)] space-y-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[#d4af37]/20 px-3 py-1 font-mono text-[10px] font-bold uppercase text-[#f5d47a]">
            Active Duty Station
          </span>
          <span className="font-mono text-xs text-neutral-300">
            {currentShift ? currentShift.shift_date : 'Today'}
          </span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">
            {currentShift ? currentShift.station_name : station ? station.name : 'No station assigned'}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-[#d4af37]">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{currentShift ? currentShift.location : station ? station.location : 'Location not configured'}</span>
          </div>
        </div>

        {/* Shift Timings */}
        {currentShift && (
          <div className="rounded-xl border border-white/10 bg-black/60 p-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-neutral-300">
              <Clock className="h-4 w-4 text-[#d4af37]" />
              <span>Shift Window:</span>
            </div>
            <span className="font-bold text-white">
              {new Date(currentShift.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' — '}
              {new Date(currentShift.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* 1-Tap Quick Action Row */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          {station?.supervisor_contact ? (
            <a
              href={`tel:${station.supervisor_contact.replace(/\s+/g, '')}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3 text-xs font-bold text-white shadow-lg active:scale-95"
            >
              <Phone className="h-4 w-4" />
              <span>Call Supervisor</span>
            </a>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-center text-xs text-neutral-400">
              <Phone className="h-4 w-4" />
              <span>Supervisor contact not configured</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIncidentModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/50 bg-gradient-to-r from-rose-950/60 to-rose-900/60 py-3 text-xs font-bold text-rose-200 shadow-lg active:scale-95"
          >
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* Essential Station Instructions / Duties */}
      {station && station.duties.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-4.5 space-y-2.5">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#d4af37]">
            Core Station Protocols
          </h3>
          <ul className="space-y-2 text-xs text-neutral-300">
            {station.duties.map((duty, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af37]" />
                <span className="leading-relaxed">{duty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Field Action Checklist */}
      <div className="rounded-2xl border border-white/10 bg-black/60 p-4.5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            Active Shift Checklist
          </h3>
          <span className="text-[10px] text-neutral-400 font-mono">Tap to check off</span>
        </div>

        <div className="space-y-2">
          {tasks.slice(0, 4).flatMap((task) =>
            task.checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => onToggleTaskChecklist(task.id, item.id)}
                className="cursor-pointer flex items-center gap-3 rounded-xl border border-white/5 bg-[#0e0e12] p-3 text-xs transition active:bg-white/10"
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    item.completed
                      ? 'border-[#d4af37] bg-[#d4af37] text-black font-bold'
                      : 'border-white/30 hover:border-[#d4af37]'
                  }`}
                >
                  {item.completed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>
                <span className={`text-xs ${item.completed ? 'line-through text-neutral-500' : 'text-neutral-100'}`}>
                  {item.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active Incidents Feed (Visible to Supervisors & Incident Reporters) */}
      {incidents.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/50 p-4.5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-rose-300">
              Live Incident Log ({incidents.length})
            </h3>
            <span className="font-mono text-[10px] text-neutral-400">Security & Medical Oversight</span>
          </div>

          <div className="space-y-2.5">
            {incidents.map((inc) => (
              <div key={inc.id} className="rounded-xl border border-white/10 bg-[#0e0e12] p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-rose-500/20 px-2 py-0.2 font-mono text-[9px] font-bold uppercase text-rose-300">
                    {inc.category} · {inc.severity}
                  </span>
                  <span
                    className={`font-mono text-[9px] font-bold uppercase px-2 py-0.2 rounded ${
                      inc.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300 animate-pulse'
                    }`}
                  >
                    {inc.status}
                  </span>
                </div>

                <p className="text-white font-medium">{inc.description}</p>
                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span>Location: {inc.location}</span>
                  <span>{new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {canManageIncidents && inc.status !== 'resolved' && onResolveIncident && (
                  <button
                    type="button"
                    onClick={() => setResolveIncidentId(inc.id)}
                    className="w-full mt-2 rounded-lg border border-emerald-500/40 bg-emerald-950/30 py-1.5 text-center font-semibold text-emerald-300 hover:bg-emerald-950/50"
                  >
                    Mark Incident Resolved
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incident Reporting Modal */}
      {incidentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-[#0e0e12] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-400" />
                <h3 className="font-serif text-lg font-semibold text-white">Report Operational Incident</h3>
              </div>
              <button
                type="button"
                onClick={() => setIncidentModalOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {incidentSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 animate-in zoom-in-75 duration-200" />
                <p className="text-sm font-semibold text-white">Incident Dispatched to Directorate</p>
                <p className="text-xs text-neutral-400">Floor supervisors have been notified.</p>
              </div>
            ) : (
              <form onSubmit={handleIncidentSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">Incident Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-rose-500"
                  >
                    <option value="decorum">Chamber Decorum / Delegate Disruption</option>
                    <option value="medical">Medical / First Aid Emergency</option>
                    <option value="security">Security / Unauthorized Access</option>
                    <option value="logistics">Logistics / Equipment Failure</option>
                    <option value="it_tech">IT / Audio & Livestream Outage</option>
                    <option value="protocol">VIP Protocol Escalation</option>
                    <option value="other">Other Operational Urgent Matter</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-neutral-300 mb-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-rose-500"
                    >
                      <option value="low">Low (Notice)</option>
                      <option value="medium">Medium (Requires Staff)</option>
                      <option value="high">High (Urgent Attention)</option>
                      <option value="critical">Critical (Immediate Evac / Medic)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-300 mb-1">Exact Location</label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="E.g. Chamber 3, Row 4"
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-neutral-300 mb-1">
                    Description & Immediate Situation <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what occurred, individuals involved, and immediate assistance needed…"
                    className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-white outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIncidentModalOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!description.trim() || busy}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2 font-semibold text-white hover:brightness-110 active:scale-95"
                  >
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Dispatch Incident Alert
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Resolve Incident Modal (Supervisors) */}
      {resolveIncidentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/50 bg-[#0e0e12] p-5 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-semibold text-white">Log Incident Resolution</h3>
            <p className="text-xs text-neutral-400">
              Provide resolution actions taken for the conference security audit.
            </p>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Resolution Summary</label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="E.g. Paramedic attended delegate, situation stabilized. Replaced audio cable."
                className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setResolveIncidentId(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveSubmit}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:brightness-110"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
