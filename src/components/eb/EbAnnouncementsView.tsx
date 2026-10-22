import React, { useState } from 'react';
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Send,
  Pin,
  Clock,
  Shield,
  X,
  Loader2,
  AlertCircle,
  Users,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type { EbAnnouncement } from '../../lib/ebOperationsService';

interface EbAnnouncementsViewProps {
  profile: EbMemberProfile;
  announcements: EbAnnouncement[];
  onAcknowledgeAnnouncement: (id: string) => Promise<void>;
  onPublishAnnouncement?: (ann: Omit<EbAnnouncement, 'id' | 'created_at'>) => Promise<void>;
}

export const EbAnnouncementsView: React.FC<EbAnnouncementsViewProps> = ({
  profile,
  announcements,
  onAcknowledgeAnnouncement,
  onPublishAnnouncement,
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'dept'>('all');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newPriority, setNewPriority] = useState<'normal' | 'urgent' | 'critical'>('normal');
  const [newDept, setNewDept] = useState(profile.department);
  const [newReqAck, setNewReqAck] = useState(false);
  const [busy, setBusy] = useState(false);

  // Can publish if head or admin
  const canPublish = profile.isHead || profile.isAdmin;

  const filteredAnnouncements = announcements.filter((a) => {
    if (filter === 'critical') return a.priority === 'critical' || a.priority === 'urgent';
    if (filter === 'dept') return a.department === profile.department;
    return true;
  });

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim() || !onPublishAnnouncement || busy) return;
    setBusy(true);
    try {
      await onPublishAnnouncement({
        department: newDept,
        section: profile.section,
        title: newTitle.trim(),
        body: newBody.trim(),
        priority: newPriority,
        requires_acknowledgement: newReqAck,
        author_name: `${profile.name} (${profile.role.replace(/_/g, ' ')})`,
        pinned: newPriority === 'critical',
      });
      setPublishModalOpen(false);
      setNewTitle('');
      setNewBody('');
      setNewReqAck(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="font-serif text-2xl font-normal text-white">Executive Bulletins & Directives</h2>
          <p className="mt-1 text-xs text-neutral-400">
            Official conference announcements, urgent alerts, and protocol changes from Secretariat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-3 py-1 text-xs transition ${
                filter === 'all' ? 'bg-[#d4af37] font-semibold text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              All ({announcements.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('critical')}
              className={`rounded-md px-3 py-1 text-xs transition ${
                filter === 'critical' ? 'bg-rose-500 font-semibold text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Urgent & Critical
            </button>
            <button
              type="button"
              onClick={() => setFilter('dept')}
              className={`rounded-md px-3 py-1 text-xs transition ${
                filter === 'dept' ? 'bg-[#d4af37] font-semibold text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Department Only
            </button>
          </div>

          {/* Publish Broadcast Button */}
          {canPublish && (
            <button
              type="button"
              onClick={() => setPublishModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] px-3.5 py-2 text-xs font-semibold text-black shadow-lg hover:brightness-110 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Broadcast Bulletin</span>
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center text-xs text-neutral-400">
            No announcements found in this view.
          </div>
        ) : (
          filteredAnnouncements.map((ann) => {
            const isCritical = ann.priority === 'critical';
            const isUrgent = ann.priority === 'urgent';

            return (
              <div
                key={ann.id}
                className={`rounded-2xl border p-5 sm:p-6 transition shadow-lg ${
                  isCritical
                    ? 'border-rose-500/50 bg-gradient-to-r from-rose-950/30 via-black to-[#12080a] shadow-[0_0_20px_rgba(244,63,94,0.12)]'
                    : isUrgent
                    ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-black to-[#0e0c08]'
                    : 'border-white/10 bg-black/50 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    {ann.pinned && (
                      <span className="flex items-center gap-1 rounded bg-[#d4af37]/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-[#f5d47a]">
                        <Pin className="h-3 w-3" />
                        <span>Pinned</span>
                      </span>
                    )}

                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                        isCritical
                          ? 'bg-rose-500/30 text-rose-300'
                          : isUrgent
                          ? 'bg-amber-500/30 text-amber-300'
                          : 'bg-white/10 text-neutral-300'
                      }`}
                    >
                      {ann.priority} directive
                    </span>

                    <span className="font-mono text-[10px] text-neutral-400 capitalize">
                      {ann.department === 'all' ? 'All Staff' : `${ann.department.replace(/_/g, ' ')} Directorate`}
                    </span>
                  </div>

                  <span className="font-mono text-[11px] text-neutral-500">
                    {new Date(ann.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="mt-3.5 space-y-2">
                  <h3 className="font-serif text-lg font-semibold text-white">{ann.title}</h3>
                  <p className="text-xs text-neutral-300 leading-relaxed max-w-3xl whitespace-pre-line">{ann.body}</p>
                </div>

                {/* Footer and Acknowledgement button */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs">
                  <span className="text-[11px] text-neutral-400">Published by: {ann.author_name}</span>

                  {ann.requires_acknowledgement && (
                    <div className="flex items-center gap-2">
                      {ann.is_acknowledged ? (
                        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 font-mono text-[10px] font-bold text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Acknowledged</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAcknowledgeAnnouncement(ann.id)}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Confirm & Acknowledge</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Publish Announcement Modal */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/40 bg-[#0e0e12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-serif text-lg font-semibold text-white">Broadcast Operational Bulletin</h3>
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-300 mb-1">
                  Bulletin Title <span className="text-[#d4af37]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="E.g. Dais Schedule Update for Chamber 3"
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-300 mb-1">
                  Directive Details <span className="text-[#d4af37]">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Provide precise operational guidelines, time adjustments, or emergency protocols…"
                  className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-white outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">Priority Level</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-[#d4af37]"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical (Banner)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-neutral-300 mb-1">Target Audience</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white outline-none focus:border-[#d4af37]"
                  >
                    {profile.isAdmin && <option value="all">All Conference Staff</option>}
                    <option value={profile.department}>{profile.department.replace(/_/g, ' ')} Directorate</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="reqAck"
                  type="checkbox"
                  checked={newReqAck}
                  onChange={(e) => setNewReqAck(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/40 text-[#d4af37] focus:ring-0"
                />
                <label htmlFor="reqAck" className="text-neutral-300">
                  Require active personnel acknowledgment
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setPublishModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-neutral-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] px-5 py-2 font-semibold text-black hover:brightness-110"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Broadcast Bulletin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
