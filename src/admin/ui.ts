// Shared class names so every admin screen looks the same.
export const inputCls =
  'w-full bg-[#141418] border border-neutral-700 focus:border-[#d4af37] rounded-sm py-2 px-3 text-sm text-white placeholder-neutral-600 focus:outline-none transition-colors';
export const labelCls = 'block text-xs uppercase tracking-wider text-neutral-300 mb-1 font-medium';
export const helpCls = 'text-[11px] text-neutral-500 mt-1 leading-snug';
export const errCls = 'text-[11px] text-red-400 mt-1';
export const cardCls = 'bg-[#0e0e12] border border-neutral-800 rounded-sm';
export const btnGold =
  'inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-[#d4af37] hover:bg-[#e5c158] rounded-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 rounded-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-red-300 hover:text-white border border-red-500/40 hover:bg-red-600/80 hover:border-red-500 rounded-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

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
