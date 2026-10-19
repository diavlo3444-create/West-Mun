// Shared class names so every admin screen looks the same.
// These mirror src/dashboard/ui.tsx; keep both in sync when the design tokens change.
export const inputCls =
  'w-full rounded-md border border-white/[0.1] bg-[#101013] px-3 py-2 text-[12.5px] text-neutral-100 placeholder:text-neutral-400/70 transition-colors duration-150 hover:border-white/[0.16] focus:border-[#d4af37]/70 focus:outline-none';
export const labelCls =
  'mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400';
export const helpCls = 'mt-1 text-[10.5px] leading-snug text-neutral-400';
export const errCls = 'mt-1 text-[10.5px] text-rose-400';
export const cardCls =
  'relative rounded-[10px] border border-white/[0.075] bg-[#0c0c0f] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]';
export const btnGold =
  'inline-flex items-center justify-center gap-2 rounded-md bg-[#d4af37] px-3.5 py-2 text-[12px] font-semibold tracking-[0.02em] text-black transition-colors duration-150 hover:bg-[#e2c258] active:bg-[#c8a331] disabled:cursor-not-allowed disabled:opacity-40';
export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-white/[0.1] bg-white/[0.02] px-3 py-1.5 text-[11.5px] font-medium text-neutral-300 transition-colors duration-150 hover:border-white/[0.18] hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40';
export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-rose-400/25 bg-rose-400/[0.06] px-3 py-1.5 text-[11.5px] font-medium text-rose-300 transition-colors duration-150 hover:border-rose-400/40 hover:bg-rose-400/[0.12] hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40';

export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Turns a Supabase/Postgres error into something an organiser can act on. */
export function explainError(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return '';
  if (err.code === '42501' || /row-level security|permission denied/i.test(err.message ?? '')) {
    return 'Not allowed. Are you signed in as an organiser? (Run make_admin.sql for your email.)';
  }
  if (err.code === '23514') return 'A value is not valid or is too long. Check the highlighted limits and try again.';
  if (err.code === '23505') return 'That value already exists.';
  if (err.code === '23503') return 'It is still linked to other items.';
  return err.message || 'Something went wrong. Please try again.';
}
