import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The only place a database credential is read. Returns null when the cloud
 * mirror is off, which every caller treats as "local-only".
 *
 * A production deployment without MISSION_PIN gets no cloud at all: the
 * mission API would otherwise hand the whole record to anyone with the URL.
 */
export function cloud(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (process.env.NODE_ENV === "production" && !process.env.MISSION_PIN) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
