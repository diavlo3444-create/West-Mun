import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Both values are PUBLIC by design (the "anon" key is only a doorway; the
// Row Level Security rules in supabase/schema.sql protect the data).
// NEVER put the Supabase "service_role" key anywhere in this project.
let rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

// If rawUrl is not a valid https URL (e.g. if VITE_SUPABASE_URL was set to sb_publishable key or project ref),
// derive the https project URL from the JWT anon key ref or format it:
if (rawUrl && !rawUrl.startsWith('https://') && /^[a-z0-9-]+$/.test(rawUrl)) {
  rawUrl = `https://${rawUrl}.supabase.co`;
} else if ((!rawUrl || !rawUrl.startsWith('https://')) && rawKey && rawKey.startsWith('eyJ')) {
  try {
    const part = rawKey.split('.')[1];
    const decoded = typeof atob === 'function' ? atob(part) : Buffer.from(part, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded);
    if (payload?.ref) {
      rawUrl = `https://${payload.ref}.supabase.co`;
    }
  } catch {}
}

export const supabaseConfigured = Boolean(rawUrl && rawKey && /^https:\/\//.test(rawUrl));

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(rawUrl as string, rawKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;
