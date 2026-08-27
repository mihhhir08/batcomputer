import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Sign in once, stay signed in. The session is kept in localStorage and the
// access token is refreshed in the background, so the magic link should only
// ever be needed again if the refresh token itself expires from disuse.
export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "batcomputer-auth",
        flowType: "pkce",
      },
    })
  : null;
