import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { cx } from './ui';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface DashboardShellProps {
  brandSubtitle: string;
  navGroups: NavGroup[];
  active: string;
  onNavigate: (id: string) => void;
  user: { name?: string | null; email: string; role: string };
  onSignOut: () => void;
  topbarLabel: string;
  roleBadge?: string;
  children: React.ReactNode;
}

function initials(name?: string | null, email?: string): string {
  const source = (name || email || 'WM').trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function DashboardShell({
  brandSubtitle,
  navGroups,
  active,
  onNavigate,
  user,
  onSignOut,
  topbarLabel,
  roleBadge,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [active]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const navigate = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const brand = (
    <div className="flex items-center gap-2.5">
      <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border border-[#d4af37]/35 bg-[#121214]">
        <img
          src="/westmun-logo.jpg"
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
        <span className="absolute inset-0 rounded-[7px] ring-1 ring-inset ring-white/[0.06]" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="wm-display block whitespace-nowrap text-[12.5px] tracking-[0.1em] text-[#f4f0e4]">
          WEST MUN <span className="text-[#d4af37]">2027</span>
        </span>
        <span className="mt-1 block text-[8.5px] font-mono uppercase tracking-[0.2em] text-neutral-400">
          {brandSubtitle}
        </span>
      </span>
    </div>
  );

  const navigation = (
    <>
      {navGroups.map((group) => (
        <div key={group.label} className="mb-5 last:mb-0">
          <p className="mb-1.5 px-2.5 text-[8.5px] font-mono uppercase tracking-[0.2em] text-neutral-400">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cx(
                    'group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12px] transition-colors duration-150',
                    isActive
                      ? 'bg-[#d4af37]/[0.09] font-medium text-[#f1e4bb]'
                      : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-100',
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-[#d4af37]"
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    className={cx(
                      'h-[15px] w-[15px] shrink-0 transition-colors',
                      isActive ? 'text-[#d4af37]' : 'text-neutral-400 group-hover:text-neutral-300',
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={cx(
                        'rounded px-1.5 py-0.5 text-[9px] font-mono tabular-nums',
                        isActive
                          ? 'bg-[#d4af37]/15 text-[#f1e4bb]'
                          : 'bg-white/[0.05] text-neutral-400',
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  const account = (
    <div className="border-t border-white/[0.06] px-3 py-3.5">
      <div className="flex items-center gap-2.5 rounded-md border border-white/[0.06] bg-white/[0.018] px-2.5 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.08] text-[9.5px] font-semibold tracking-wide text-[#e2c258]">
          {initials(user.name, user.email)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11.5px] font-medium text-neutral-200">
            {user.name || user.email.split('@')[0]}
          </span>
          <span className="block truncate text-[9.5px] text-neutral-400">{user.role}</span>
        </span>
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-rose-300"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center justify-between rounded px-1.5 py-1 text-[10px] text-neutral-400 transition-colors hover:text-neutral-300"
      >
        <span>Conference website</span>
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </div>
  );

  return (
    <div className="wm-app">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[#d4af37] focus:px-3 focus:py-2 focus:text-[12px] focus:font-semibold focus:text-black"
      >
        Skip to main content
      </a>

      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17.5rem] flex-col border-r border-white/[0.06] bg-[#09090b] lg:flex">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(240px_120px_at_18%_0%,rgba(212,175,55,0.09),transparent_72%)]"
          aria-hidden="true"
        />
        <div className="relative px-4 pb-4 pt-5">{brand}</div>
        <div className="mx-4 h-px bg-white/[0.055]" aria-hidden="true" />
        <nav className="wm-scroll relative flex-1 overflow-y-auto px-2.5 py-4" aria-label="Dashboard">
          {navigation}
        </nav>
        {account}
      </aside>

      <div className="lg:pl-[17.5rem]">
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070708]/95">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-white lg:hidden"
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-4 w-4" />
              </button>
              <span className="wm-display text-[11px] tracking-[0.12em] text-neutral-300 lg:hidden">
                WEST MUN <span className="text-[#d4af37]">2027</span>
              </span>
              <div className="hidden min-w-0 items-center gap-2 lg:flex">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400">
                  WEST MUN 2027
                </span>
                <span className="text-neutral-700" aria-hidden="true">/</span>
                <span className="truncate text-[11px] font-medium text-neutral-300">{topbarLabel}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {roleBadge && (
                <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[9px] font-mono uppercase tracking-[0.13em] text-neutral-400 sm:inline-flex">
                  <span className="h-1 w-1 rounded-full bg-[#d4af37]" aria-hidden="true" />
                  {roleBadge}
                </span>
              )}
              <span className="hidden text-[10px] text-neutral-400 md:inline" aria-hidden="true">
                {user.email}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1.5 text-[10.5px] text-neutral-400 transition-colors hover:border-rose-400/25 hover:text-rose-300"
              >
                <LogOut className="h-3 w-3" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="wm-overlay-in absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            className="wm-drawer-in absolute inset-y-0 left-0 flex w-[17.5rem] max-w-[85vw] flex-col border-r border-white/[0.08] bg-[#0a0a0c] shadow-[20px_0_60px_rgba(0,0,0,0.5)]"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className="flex items-center justify-between px-4 pb-4 pt-5">
              {brand}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mx-4 h-px bg-white/[0.055]" aria-hidden="true" />
            <nav className="wm-scroll flex-1 overflow-y-auto px-2.5 py-4" aria-label="Mobile dashboard">
              {navigation}
            </nav>
            {account}
          </div>
        </div>
      )}
    </div>
  );
}
