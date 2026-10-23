import React, { useState } from 'react';
import {
  ShieldCheck,
  Crown,
  Bell,
  LogOut,
  ScanLine,
  QrCode,
  Sparkles,
} from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';
import type { EbNotification } from '../../lib/ebOperationsService';

interface EbNavbarProps {
  profile: EbMemberProfile;
  notifications: EbNotification[];
  onMarkNotificationRead: (id: string) => void;
  onNavigateNotification: (tabId: string) => void;
  onClearAllNotifications: () => void;
  pendingTasksCount: number;
  overdueTasksCount: number;
  unreadAnnouncementsCount: number;
  onSignOut: () => void;
  onReplayWelcome?: () => void;
}

export const EbNavbar: React.FC<EbNavbarProps> = ({
  profile,
  notifications,
  onMarkNotificationRead,
  onNavigateNotification,
  onClearAllNotifications,
  pendingTasksCount,
  overdueTasksCount,
  unreadAnnouncementsCount,
  onSignOut,
  onReplayWelcome,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.read);

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
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-sm font-semibold tracking-wider text-white sm:text-base">
                WEST MUN
              </span>
              <span className="border-l border-[#d4af37]/40 pl-2 font-mono text-[10px] uppercase tracking-widest text-[#d4af37]">
                {profile.isAdmin ? 'Admin Console' : profile.isHead ? 'Head Operations' : 'EB Operations'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="truncate max-w-[140px] sm:max-w-[200px] text-neutral-200 font-medium">
                {profile.name}
              </span>
              <span className="hidden sm:inline text-neutral-600">·</span>
              <span className="hidden sm:inline font-mono text-[11px] uppercase tracking-wider text-[#d4af37]">
                {profile.role.replace(/_/g, ' ')}
              </span>
              {profile.department && (
                <>
                  <span className="hidden sm:inline text-neutral-600">·</span>
                  <span className="hidden sm:inline font-mono text-[11px] text-neutral-400 capitalize">
                    {profile.department.replace(/_/g, ' ')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* EB quick access: scanner and personal QR pass */}
          <a
            href="/scanner"
            className="flex h-8 items-center justify-center gap-1.5 border border-[#d4af37]/30 bg-[#d4af37]/[0.06] px-2.5 text-xs font-medium text-[#f5d47a] transition hover:border-[#d4af37]/70 hover:bg-[#d4af37]/15 sm:px-3"
            title="Open QR scanner"
          >
            <ScanLine className="h-3.5 w-3.5" />
            <span className="hidden md:inline font-mono text-[11px] uppercase tracking-wider">Scanner</span>
          </a>
          <a
            href="/pass"
            className="flex h-8 items-center justify-center gap-1.5 border border-white/10 bg-black/60 px-2.5 text-xs text-neutral-300 transition hover:border-white/30 hover:text-white sm:px-3"
            title="Open your official QR pass"
          >
            <QrCode className="h-3.5 w-3.5 text-[#d4af37]" />
            <span className="hidden md:inline font-mono text-[11px] uppercase tracking-wider">Pass</span>
          </a>

          {onReplayWelcome && (
            <button
              type="button"
              onClick={onReplayWelcome}
              className="flex h-8 items-center justify-center gap-1.5 border border-[#d4af37]/30 bg-[#d4af37]/[0.06] px-2.5 text-xs font-medium text-[#f5d47a] transition hover:border-[#d4af37]/70 hover:bg-[#d4af37]/15 sm:px-3"
              title="Replay diplomatic sign-in welcome intro"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="hidden lg:inline font-mono text-[11px] uppercase tracking-wider">Welcome</span>
            </button>
          )}

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative flex h-8 w-8 items-center justify-center border border-white/10 bg-black/60 text-neutral-300 hover:border-white/25 hover:text-white"
              title="Notifications"
            >
              <Bell className="h-3.5 w-3.5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center bg-[#d4af37] font-mono text-[8px] font-bold text-black">
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
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          onMarkNotificationRead(n.id);
                          if (n.linkTab) onNavigateNotification(n.linkTab);
                          setNotifOpen(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onMarkNotificationRead(n.id);
                            if (n.linkTab) onNavigateNotification(n.linkTab);
                            setNotifOpen(false);
                          }
                        }}
                        className={`cursor-pointer rounded-lg border p-2.5 text-left transition ${
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
