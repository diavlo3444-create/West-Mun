import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  type LucideIcon,
} from 'lucide-react';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ *
 * Controls
 * ------------------------------------------------------------------ */
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-md bg-[#d4af37] px-3.5 py-2 text-[12px] font-semibold tracking-[0.02em] text-black transition-colors duration-150 hover:bg-[#e2c258] active:bg-[#c8a331] disabled:cursor-not-allowed disabled:opacity-40';

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.025] px-3.5 py-2 text-[12px] font-medium text-neutral-200 transition-colors duration-150 hover:border-white/[0.2] hover:bg-white/[0.055] hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-[11.5px] font-medium text-neutral-400 transition-colors duration-150 hover:bg-white/[0.045] hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-md border border-rose-400/25 bg-rose-400/[0.08] px-3.5 py-2 text-[12px] font-medium text-rose-200 transition-colors duration-150 hover:border-rose-400/40 hover:bg-rose-400/[0.14] hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-40';

export const btnDangerSolid =
  'inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-3.5 py-2 text-[12px] font-semibold text-white transition-colors duration-150 hover:bg-rose-500 active:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40';

export const inputCls =
  'w-full rounded-md border border-white/[0.1] bg-[#101013] px-3 py-2 text-[12.5px] text-neutral-100 placeholder:text-neutral-400/70 transition-colors duration-150 hover:border-white/[0.16] focus:border-[#d4af37]/70 focus:outline-none';

export const selectCls = cx(inputCls, 'cursor-pointer appearance-none pr-8');

export const labelCls =
  'mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400';

export const iconButtonCls =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] text-neutral-400 transition-colors duration-150 hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */
export function Panel({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...rest}
      className={cx(
        'relative rounded-[10px] border border-white/[0.075] bg-[#0c0c0f] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

interface PanelHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}

export function PanelHeader({
  title,
  description,
  eyebrow,
  action,
  className,
  id,
}: PanelHeaderProps) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <span className="mb-1 block text-[9.5px] font-mono uppercase tracking-[0.2em] text-[#d4af37]/80">
            {eyebrow}
          </span>
        )}
        <h2 id={id} className="text-[13.5px] font-semibold tracking-[0.01em] text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-neutral-400">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions, meta }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="h-px w-6 bg-[#d4af37]/70" aria-hidden="true" />
          <span className="text-[9.5px] font-mono uppercase tracking-[0.24em] text-[#d4af37]">
            {eyebrow}
          </span>
        </div>
        <h1 className="wm-display text-[24px] leading-[1.12] text-[#f5f2e9] sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-neutral-400">
            {description}
          </p>
        )}
        {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * Statistics
 * ------------------------------------------------------------------ */
export type Tone = 'gold' | 'sky' | 'emerald' | 'amber' | 'rose' | 'neutral';

export const toneStyles: Record<Tone, { icon: string; text: string; bar: string }> = {
  gold: {
    icon: 'border-[#d4af37]/25 bg-[#d4af37]/[0.07] text-[#e2c258]',
    text: 'text-[#e2c258]',
    bar: 'bg-[#d4af37]',
  },
  sky: {
    icon: 'border-sky-400/20 bg-sky-400/[0.06] text-sky-300',
    text: 'text-sky-300',
    bar: 'bg-sky-400',
  },
  emerald: {
    icon: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300',
    text: 'text-emerald-300',
    bar: 'bg-emerald-400',
  },
  amber: {
    icon: 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300',
    text: 'text-amber-300',
    bar: 'bg-amber-400',
  },
  rose: {
    icon: 'border-rose-400/20 bg-rose-400/[0.06] text-rose-300',
    text: 'text-rose-300',
    bar: 'bg-rose-400',
  },
  neutral: {
    icon: 'border-white/[0.1] bg-white/[0.03] text-neutral-300',
    text: 'text-neutral-200',
    bar: 'bg-neutral-400',
  },
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  loading?: boolean;
  footer?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'neutral',
  loading,
  footer,
}: StatCardProps) {
  const style = toneStyles[tone];
  return (
    <div className="group relative overflow-hidden rounded-[10px] border border-white/[0.075] bg-[#0c0c0f] p-4 transition-colors duration-200 hover:border-white/[0.13] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="pt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-neutral-400">
          {label}
        </span>
        <span
          className={cx(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
            style.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        {loading ? (
          <Skeleton className="h-7 w-14" />
        ) : (
          <span className="text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-white">
            {value}
          </span>
        )}
      </div>
      {helper && <p className="mt-2 text-[11px] leading-snug text-neutral-400">{helper}</p>}
      {footer}
    </div>
  );
}

export function MetricBar({
  value,
  tone = 'gold',
  label,
}: {
  value: number;
  tone?: Tone;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cx('h-full rounded-full transition-[width] duration-500', toneStyles[tone].bar)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Status + feedback
 * ------------------------------------------------------------------ */
type StatusMeta = { label: string; dot: string; badge: string };

const STATUS: Record<string, StatusMeta> = {
  accepted: {
    label: 'Approved',
    dot: 'bg-emerald-400',
    badge: 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300',
  },
  rejected: {
    label: 'Rejected',
    dot: 'bg-rose-400',
    badge: 'border-rose-400/20 bg-rose-400/[0.08] text-rose-300',
  },
  under_review: {
    label: 'Under review',
    dot: 'bg-sky-400',
    badge: 'border-sky-400/20 bg-sky-400/[0.08] text-sky-300',
  },
  waitlisted: {
    label: 'Waitlisted',
    dot: 'bg-amber-400',
    badge: 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300',
  },
  withdrawn: {
    label: 'Withdrawn',
    dot: 'bg-neutral-500',
    badge: 'border-white/[0.08] bg-white/[0.03] text-neutral-400',
  },
  received: {
    label: 'Pending',
    dot: 'bg-neutral-400',
    badge: 'border-white/[0.1] bg-white/[0.04] text-neutral-300',
  },
};

export function statusLabel(status?: string | null): string {
  return STATUS[String(status || 'received')]?.label ?? 'Pending';
}

export function StatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const meta = STATUS[String(status || 'received')] ?? STATUS.received;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.07em]',
        meta.badge,
        className,
      )}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export type NoticeTone = 'success' | 'error' | 'info' | 'warning';

const NOTICE_STYLES: Record<NoticeTone, { wrap: string; icon: string; Icon: LucideIcon }> = {
  success: {
    wrap: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200',
    icon: 'text-emerald-400',
    Icon: CheckCircle2,
  },
  error: {
    wrap: 'border-rose-400/25 bg-rose-400/[0.07] text-rose-200',
    icon: 'text-rose-400',
    Icon: AlertCircle,
  },
  warning: {
    wrap: 'border-amber-400/25 bg-amber-400/[0.06] text-amber-200',
    icon: 'text-amber-400',
    Icon: AlertTriangle,
  },
  info: {
    wrap: 'border-sky-400/20 bg-sky-400/[0.05] text-sky-200',
    icon: 'text-sky-400',
    Icon: Info,
  },
};

export function Notice({
  tone = 'info',
  title,
  children,
  onDismiss,
  className,
}: {
  tone?: NoticeTone;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const style = NOTICE_STYLES[tone];
  const Icon = style.Icon;
  return (
    <div
      className={cx('flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-[12px]', style.wrap, className)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', style.icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="mb-0.5 font-semibold text-white">{title}</p>}
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-1 shrink-0 rounded p-0.5 text-current opacity-60 transition-opacity hover:opacity-100"
          aria-label="Dismiss message"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function Toast({
  message,
  tone = 'success',
  onDismiss,
}: {
  message: string;
  tone?: NoticeTone;
  onDismiss: () => void;
}) {
  const style = NOTICE_STYLES[tone];
  const Icon = style.Icon;
  return (
    <div
      className="fixed inset-x-4 bottom-4 z-[90] mx-auto w-auto max-w-sm sm:inset-x-auto sm:right-6 sm:mx-0"
      role="status"
      aria-live="polite"
    >
      <div className="wm-dialog-in flex items-start gap-2.5 rounded-lg border border-white/[0.1] bg-[#131316] px-4 py-3 text-[12px] text-neutral-200 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
        <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', style.icon)} aria-hidden="true" />
        <span className="min-w-0 flex-1 leading-relaxed">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 text-neutral-400 transition-colors hover:text-white"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Empty + loading
 * ------------------------------------------------------------------ */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] text-neutral-400">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="text-[13px] font-medium text-neutral-200">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-neutral-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded bg-white/[0.06]', className)} aria-hidden="true" />;
}

export function LoadingPanel({ label = 'Loading records' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 px-5 py-12 text-[12px] text-neutral-400" role="status">
      <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" aria-hidden="true" />
      {label}…
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Tabs
 * ------------------------------------------------------------------ */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: Array<{ value: T; label: string; icon?: LucideIcon; count?: number }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md border border-white/[0.07] bg-[#0b0b0e] p-0.5',
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[11.5px] font-medium transition-colors duration-150',
              active
                ? 'bg-[#1c1c20] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                : 'text-neutral-400 hover:text-neutral-200',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            {option.label}
            {typeof option.count === 'number' && (
              <span
                className={cx(
                  'rounded px-1 text-[9.5px] font-mono tabular-nums',
                  active ? 'bg-white/[0.08] text-neutral-200' : 'bg-white/[0.04] text-neutral-400',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Modal
 * ------------------------------------------------------------------ */
const MODAL_SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof MODAL_SIZES;
  closeOnBackdrop?: boolean;
  tone?: 'default' | 'danger';
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  tone = 'default',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Stable callback ref: ensures effect does NOT re-run on parent re-renders/keystrokes
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Track the element that was focused BEFORE the modal opened so we can restore it on close
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Capture the element focused before opening
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Initial autofocus: runs once when modal transitions to open
    const focusTimer = window.setTimeout(() => {
      const root = panelRef.current;
      if (!root) return;

      // Guard: if user is already focused on an element inside this modal, never steal focus
      if (root.contains(document.activeElement)) {
        return;
      }

      // Priority 1: explicitly marked autofocus element
      const autofocusEl = root.querySelector<HTMLElement>('[data-autofocus]');
      if (autofocusEl && typeof autofocusEl.focus === 'function') {
        autofocusEl.focus();
        return;
      }

      // Priority 2: first interactive form control inside modal body (never the X close button)
      const bodyContent = root.querySelector<HTMLElement>('.wm-modal-body');
      const searchScope = bodyContent || root;
      const firstFormInput = searchScope.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
      );
      if (firstFormInput && typeof firstFormInput.focus === 'function') {
        firstFormInput.focus();
        return;
      }

      // Priority 3: first action button in modal body or footer
      const firstBodyBtn = searchScope.querySelector<HTMLElement>(
        'button:not([disabled]):not([data-modal-close]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (firstBodyBtn && typeof firstBodyBtn.focus === 'function') {
        firstBodyBtn.focus();
        return;
      }

      // Priority 4: fallback to close button only if modal has no interactive body children
      const closeBtn = root.querySelector<HTMLElement>('[data-modal-close]');
      closeBtn?.focus?.();
    }, 40);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Restore previous focus only when the modal is closed or unmounted
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="wm-overlay-in fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cx(
          'wm-dialog-in relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[12px] border bg-[#0c0c0f] shadow-[0_28px_90px_rgba(0,0,0,0.72)] sm:max-h-[calc(100dvh-3rem)]',
          tone === 'danger' ? 'border-rose-400/25' : 'border-white/[0.12]',
          MODAL_SIZES[size],
        )}
      >
        <div
          className={cx(
            'absolute inset-x-0 top-0 h-px',
            tone === 'danger'
              ? 'bg-gradient-to-r from-transparent via-rose-400/60 to-transparent'
              : 'bg-gradient-to-r from-transparent via-[#d4af37]/55 to-transparent',
          )}
          aria-hidden="true"
        />
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0">
            {eyebrow && (
              <span className="mb-1 block text-[9.5px] font-mono uppercase tracking-[0.22em] text-[#d4af37]/85">
                {eyebrow}
              </span>
            )}
            <h2 id={titleId} className="wm-serif text-[22px] leading-tight text-white">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="mt-1 text-[11.5px] leading-relaxed text-neutral-400">
                {description}
              </div>
            )}
          </div>
          <button
            type="button"
            data-modal-close
            onClick={onClose}
            className={iconButtonCls}
            aria-label="Close dialog"
            tabIndex={0}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="wm-modal-body wm-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.07] bg-[#0a0a0c]/70 px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'gold';
  busy?: boolean;
  error?: string;
  icon?: LucideIcon;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'gold',
  busy,
  error,
  icon,
}: ConfirmDialogProps) {
  const Icon = icon ?? (tone === 'danger' ? AlertTriangle : CheckCircle2);
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      eyebrow={tone === 'danger' ? 'Consequential action' : 'Confirm action'}
      size="sm"
      tone={tone === 'danger' ? 'danger' : 'default'}
      closeOnBackdrop={!busy}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={tone === 'danger' ? btnDangerSolid : btnPrimary}
            data-autofocus
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <span
          className={cx(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
            tone === 'danger'
              ? 'border-rose-400/25 bg-rose-400/[0.08] text-rose-300'
              : 'border-[#d4af37]/25 bg-[#d4af37]/[0.07] text-[#e2c258]',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 text-[12px] leading-relaxed text-neutral-400">{description}</div>
      </div>
      {error && <Notice tone="error" className="mt-4">{error}</Notice>}
    </Modal>
  );
}
