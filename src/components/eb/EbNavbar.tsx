import React, { useState } from 'react';
import {
  ShieldCheck,
  Crown,
  Bell,
  QrCode,
  LogOut,
  Smartphone,
  ChevronDown,
  Check,
  Clock,
  AlertTriangle,
  User,
  Coffee,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type { EbNotification } from '../../lib/ebOperationsService';

interface EbNavbarProps {
  profile: EbMemberProfile;
  operationalStatus: 'on_duty' | 'standby' | 'break' | 'off_duty';
  onStatusChange: (status: 'on_duty' | 'standby' | 'break' | 'off_duty') => void;
  isEventDayMode: boolean;
  onToggleEventDayMode: () => void;
  notifications: EbNotification[];
  onMarkNotificationRead: (id: string) => void;
  onClearAllNotifications: () => void;
  pendingTasksCount: number;
  overdueTasksCount: number;
  unreadAnnouncementsCount: number;
  onSignOut: () => void;
}

const STATUS_CONFIG = {
  on_duty: { label: 'On Duty', color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  standby: { label: 'Standby', color: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30' },
  break: { label: 'On Break', color: 'bg-sky-500', text: 'text-sky-400', border: 'border-sky-500/30' },
  off_duty: { label: 'Off Duty', color: 'bg-neutral-500', text: 'text-neutral-400', border: 'border-neutral-700' },
};

export const EbNavbar: React.FC<EbNavbarProps> = ({
  profile,
  operationalStatus,
  onStatusChange,
  isEventDayMode,
  onToggleEventDayMode,
  notifications,
  onMarkNotificationRead,
  onClearAllNotifications,
  pendingTasksCount,
  overdueTasksCount,
  unreadAnnouncementsCount,
  onSignOut,
}) => {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.read);
  const activeStatus = STATUS_CONFIG[operationalStatus];

  return (
    <header className="sticky top-0 z-40 border-b border-[#d4af37]/20 bg-[#070707]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand & Member Info */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-gradient-to-br from-[#d4af37]/20 to-[#070707] text-[#f5d47a] shadow-[0_0_12px_rgba(212,175,55,0.18)]">
            {profile.isHead || profile.isAdmin ? (
              <Crown className="h-5 w-5 text-[#f5d47a]" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-[#f5d47a]" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-semibold tracking-wide text-white sm:text-base">
                WEST MUN
              </span>
              <span className="rounded bg-[#d4af37]/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#d4af37]">
                {profile.isAdmin ? 'Admin Operations' : profile.isHead ? 'Head Operations' : 'EB Operations'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="truncate max-w-[140px] sm:max-w-[200px] text-neutral-200 font-medium">
                {profile.name}
              </span>
              <span className="hidden sm:inline text-neutral-600">•</span>
              <span className="hidden sm:inline capitalize text-[#d4af37]/90">
                {profile.role.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Status Selector & KPI Badges (Desktop) */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Operational Status Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setStatusMenuOpen((prev) => !prev)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:brightness-110 ${activeStatus.border} bg-black/50`}
            >
              <span className={`h-2 w-2 rounded-full ${activeStatus.color} animate-pulse`} />
              <span className={activeStatus.text}>{activeStatus.label}</span>
              <ChevronDown className="h-3 w-3 text-neutral-400" />
            </button>

            {statusMenuOpen && (
              <div className="absolute left-0 mt-2 w-36 rounded-xl border border-[#d4af37]/30 bg-[#0e0e12] p-1.5 shadow-2xl backdrop-blur-xl z-50">
                {(['on_duty', 'standby', 'break', 'off_duty'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      onStatusChange(s);
                      setStatusMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition ${
                      operationalStatus === s
                        ? 'bg-[#d4af37]/20 font-semibold text-white'
                        : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[s].color}`} />
                      <span>{STATUS_CONFIG[s].label}</span>
                    </div>
                    {operationalStatus === s && <Check className="h-3 w-3 text-[#d4af37]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 border-l border-white/10 pl-4 text-xs font-mono">
            <div className="flex items-center gap-1.5" title="Tasks pending completion">
              <Clock className="h-3.5 w-3.5 text-neutral-400" />
              <span className="text-neutral-400">Tasks:</span>
              <span className="font-semibold text-white">{pendingTasksCount}</span>
            </div>

            {overdueTasksCount > 0 && (
              <div className="flex items-center gap-1.5 text-rose-400" title="Overdue tasks requiring action">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{overdueTasksCount} overdue</span>
              </div>
            )}

            {unreadAnnouncementsCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-300" title="Unread urgent announcements">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>{unreadAnnouncementsCount} unread</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Event-Day Mode Button */}
          <button
            type="button"
            onClick={onToggleEventDayMode}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
              isEventDayMode
                ? 'border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#aa8232] text-black shadow-[0_0_16px_rgba(212,175,55,0.3)]'
                : 'border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f5d47a] hover:bg-[#d4af37]/20'
            }`}
            title="Switch to Mobile Event-Day Operations View"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isEventDayMode ? 'Standard Portal' : 'Event-Day Mode'}
            </span>
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-neutral-300 hover:border-white/25 hover:text-white"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#d4af37] font-mono text-[9px] font-bold text-black shadow-lg">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {/* Notification Popover */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#d4af37]/30 bg-[#0e0e12] p-3 shadow-2xl backdrop-blur-xl z-50">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
                    Operational Alerts ({unreadNotifs.length})
                  </span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearAllNotifications}
                      className="text-[10px] text-neutral-400 hover:text-white"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="mt-2 max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-neutral-500">No operational alerts right now.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => onMarkNotificationRead(n.id)}
                        className={`cursor-pointer rounded-lg border p-2.5 transition ${
                          n.read
                            ? 'border-white/5 bg-black/20 text-neutral-400'
                            : 'border-[#d4af37]/30 bg-[#d4af37]/[0.06] text-white shadow-[0_0_8px_rgba(212,175,55,0.08)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-xs text-neutral-200">{n.title}</h4>
                          <span className="font-mono text-[9px] text-neutral-500 shrink-0">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* QR Pass Link */}
          <a
            href="/pass"
            className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/10 px-2.5 py-1.5 text-xs font-semibold text-[#f5d47a] hover:bg-[#d4af37]/20"
            title="Open digital conference accreditation badge"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">My Pass</span>
          </a>

          {/* Sign Out */}
          <button
            type="button"
            onClick={onSignOut}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-neutral-400 hover:border-white/20 hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
