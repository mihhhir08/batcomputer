import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { stripRetired } from "../../../lib/mission/demo";
import { START_DATE, type Logs } from "../../../lib/mission/types";
import { hasClearance } from "../../../lib/clearance";

// Single-operator terminal. There is no sign-in: the browser never holds a
// Supabase key, and this route talks to the database with the service role.
//
// The owner is whoever already exists in the table. That keeps the twenty days
// logged under the old auth user attached to the same mission after auth was
// removed, with no migration and no configuration.

export const dynamic = "force-dynamic";

const FALLBACK_OWNER = "00000000-0000-4000-8000-000000000001";

function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

async function ownerId(client: SupabaseClient) {
  const profile = await client.from("profiles").select("user_id").limit(1).maybeSingle();
  if (profile.data?.user_id) return profile.data.user_id as string;
  const log = await client.from("daily_logs").select("user_id").limit(1).maybeSingle();
  return (log.data?.user_id as string) ?? FALLBACK_OWNER;
}

export async function GET() {
  if (!await hasClearance()) return NextResponse.json({ locked: true }, { status: 401 });
  const client = admin();
  if (!client) return NextResponse.json({ configured: false });

  const owner = await ownerId(client);
  const [daily, profile] = await Promise.all([
    client.from("daily_logs").select("log_date,data").eq("user_id", owner),
    client.from("profiles").select("start_date,job_secured_on,instagram_started_on").eq("user_id", owner).maybeSingle(),
  ]);

  if (daily.error) return NextResponse.json({ configured: true, error: daily.error.message }, { status: 500 });

  const logs = stripRetired(Object.fromEntries((daily.data ?? []).map((row) => [row.log_date, row.data])) as Logs);
  return NextResponse.json({
    configured: true,
    logs,
    profile: {
      startDate: profile.data?.start_date ?? START_DATE,
      jobSecuredOn: profile.data?.job_secured_on ?? null,
      instagramStartedOn: profile.data?.instagram_started_on ?? null,
      exists: Boolean(profile.data),
    },
  });
}

export async function POST(request: Request) {
  if (!await hasClearance()) return NextResponse.json({ locked: true }, { status: 401 });
  const client = admin();
  if (!client) return NextResponse.json({ configured: false }, { status: 501 });

  const payload = await request.json();
  const owner = await ownerId(client);

  if (payload.type === "day") {
    if (typeof payload.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
      return NextResponse.json({ error: "Bad date" }, { status: 400 });
    }
    const { error } = await client.from("daily_logs")
      .upsert({ user_id: owner, log_date: payload.date, data: payload.data });
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ saved: true });
  }

  if (payload.type === "profile") {
    const patch: Record<string, unknown> = { user_id: owner };
    if (payload.startDate) patch.start_date = payload.startDate;
    if ("jobSecuredOn" in payload) patch.job_secured_on = payload.jobSecuredOn;
    if ("instagramStartedOn" in payload) patch.instagram_started_on = payload.instagramStartedOn;
    const { error } = await client.from("profiles").upsert(patch);
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ saved: true });
  }

  if (payload.type === "bulk") {
    const rows = Object.entries((payload.logs ?? {}) as Logs)
      .map(([log_date, data]) => ({ user_id: owner, log_date, data }));
    if (!rows.length) return NextResponse.json({ saved: true, rows: 0 });
    const { error } = await client.from("daily_logs").upsert(rows);
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ saved: true, rows: rows.length });
  }

  return NextResponse.json({ error: "Unknown operation" }, { status: 400 });
}
