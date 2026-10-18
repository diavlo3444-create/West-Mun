// JavaScript mirror of the SQL functions tier_state() / tier_fee() in
// supabase/schema.sql. The database is the real enforcer; this only decides
// what the website shows. Keep both in sync.
export type Tier = 'early_bird' | 'regular';
export type TierState = 'closed' | 'not_yet' | 'ended' | 'open';
type Settings = Record<string, string | undefined>;

const trimSpaces = (s: string | undefined) => (s ?? '').replace(/^ +| +$/g, '');

export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Returns the date if it is a real YYYY-MM-DD, otherwise null (never throws). */
export function parseDate(v: string | undefined): string | null {
  const s = trimSpaces(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  return s;
}

export function tierState(settings: Settings, tier: Tier, on: string = utcToday()): TierState {
  if (tier !== 'early_bird' && tier !== 'regular') return 'closed';
  if (trimSpaces(settings.registration_open).toLowerCase() !== 'true') return 'closed';
  const opens = parseDate(settings[`${tier}_opens`]);
  const closes = parseDate(settings[`${tier}_closes`]);
  if (opens && on < opens) return 'not_yet';
  if (closes && on > closes) return 'ended';
  return 'open';
}

export function tierFee(settings: Settings, tier: Tier): number | null {
  const v = trimSpaces(settings[`fee_${tier}`]);
  return /^\d{1,6}(\.\d{1,2})?$/.test(v) ? Number(v) : null;
}

export function formatFee(settings: Settings, tier: Tier): string {
  const fee = tierFee(settings, tier);
  if (fee === null) return 'TBA';
  const cur = trimSpaces(settings.registration_currency) || 'USD';
  return `${fee % 1 === 0 ? fee.toFixed(0) : fee.toFixed(2)} ${cur}`;
}
