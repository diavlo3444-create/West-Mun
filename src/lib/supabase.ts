import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Both values are PUBLIC by design (the "anon" key is only a doorway; the
// Row Level Security rules in supabase/schema.sql protect the data).
// NEVER put the Supabase "service_role" key anywhere in this project.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey && /^https:\/\//.test(url));

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;
