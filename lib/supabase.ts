import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Sign in once, stay signed in: the session lives in localStorage and the
// access token refreshes in the background.
//
// Do NOT set storageKey or flowType here. Both are derived from the project
// ref by default, and overriding either one orphans every session that was
// created before the change — which is exactly how this broke once already.
export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
