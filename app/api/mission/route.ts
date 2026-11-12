import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanLog, cleanLogs, isDateKey } from "../../../lib/mission/validate";
import type { Logs } from "../../../lib/mission/types";
import { hasClearance } from "../../../lib/clearance";
import { cloud } from "../../../lib/cloud";

// Single-operator terminal. There is no sign-in: the browser never holds a
// Supabase key, and this route talks to the database with the service role.
//
// The owner is whoever already exists in the table, so records written by an
// earlier version stay attached to the same mission with no migration.

export const dynamic = "force-dynamic";

const FALLBACK_OWNER = "00000000-0000-4000-8000-000000000001";

async function ownerId(client: SupabaseClient) {
  const profile = await client.from("profiles").select("user_id").limit(1).maybeSingle();
  if (profile.data?.user_id) return profile.data.user_id as string;
  const log = await client.from("daily_logs").select("user_id").limit(1).maybeSingle();
  return (log.data?.user_id as string) ?? FALLBACK_OWNER;
}

// Database errors are logged, not returned: their text can describe the schema.
function failed(error: { message: string }) {
  console.error("mission api:", error.message);
  return NextResponse.json({ error: "Database error" }, { status: 500 });
}

export async function GET() {
  if (!await hasClearance()) return NextResponse.json({ locked: true }, { status: 401 });
  const client = cloud();
  if (!client) return NextResponse.json({ configured: false });

  const owner = await ownerId(client);
  const [daily, profile] = await Promise.all([
    client.from("daily_logs").select("log_date,data").eq("user_id", owner),
    client.from("profiles").select("start_date").eq("user_id", owner).maybeSingle(),
  ]);

  if (daily.error) {
    console.error("mission api:", daily.error.message);
    return NextResponse.json({ configured: true, error: "Database error" }, { status: 500 });
  }

  const logs = Object.fromEntries((daily.data ?? []).map((row) => [row.log_date, row.data])) as Logs;
  return NextResponse.json({
    configured: true,
    logs,
    profile: { startDate: profile.data?.start_date ?? null, exists: Boolean(profile.data) },
  });
}

export async function POST(request: Request) {
  if (!await hasClearance()) return NextResponse.json({ locked: true }, { status: 401 });
  const client = cloud();
  if (!client) return NextResponse.json({ configured: false }, { status: 501 });

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const owner = await ownerId(client);

  if (payload.type === "day") {
    const data = cleanLog(payload.data);
    if (!isDateKey(payload.date) || !data) return NextResponse.json({ error: "Bad day" }, { status: 400 });
    const { error } = await client.from("daily_logs").upsert({ user_id: owner, log_date: payload.date, data });
    return error ? failed(error) : NextResponse.json({ saved: true });
  }

  if (payload.type === "profile") {
    if (!isDateKey(payload.startDate)) return NextResponse.json({ error: "Bad date" }, { status: 400 });
    const { error } = await client.from("profiles").upsert({ user_id: owner, start_date: payload.startDate });
    return error ? failed(error) : NextResponse.json({ saved: true });
  }

  if (payload.type === "bulk") {
    const logs = cleanLogs(payload.logs);
    if (!logs) return NextResponse.json({ error: "Bad logs" }, { status: 400 });
    const rows = Object.entries(logs).map(([log_date, data]) => ({ user_id: owner, log_date, data }));
    if (!rows.length) return NextResponse.json({ saved: true, rows: 0 });
    const { error } = await client.from("daily_logs").upsert(rows);
    return error ? failed(error) : NextResponse.json({ saved: true, rows: rows.length });
  }

  return NextResponse.json({ error: "Unknown operation" }, { status: 400 });
}
