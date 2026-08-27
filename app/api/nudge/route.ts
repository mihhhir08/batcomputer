import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { floorChecks, floorHeld } from "../../../lib/mission/floor.ts";
import { dateFromKey, dateKey, missionToday } from "../../../lib/mission/dates.ts";
import { EMPTY_LOG, START_DATE, type DayLog } from "../../../lib/mission/types.ts";

// The cue. v1 had none, which is most of why it was abandoned: a dashboard you
// have to remember to open is a dashboard you stop opening.
//
// Runs once nightly on Vercel cron. Says nothing when the floor is already
// held — a nudge that fires every day regardless is just noise.

export const dynamic = "force-dynamic";

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

function body(dayNumber: number, log: DayLog, open: string[]) {
  const remaining = open.length;
  return `BATCOMPUTER // MISSION DAY ${String(dayNumber).padStart(2, "0")}

The day's record is still open.

${open.map((line) => `  ·  ${line}`).join("\n")}

${remaining === 1 ? "One item stands between you and a secured day." : `${remaining} items remain on the floor.`}

Steps logged: ${log.steps.toLocaleString("en-CA")}

Open the terminal and close the record.`;
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const to = process.env.NUDGE_EMAIL;
  if (!url || !serviceKey || !resendKey || !to) {
    return NextResponse.json({ sent: false, reason: "not configured" });
  }

  const today = missionToday();
  const todayKey = dateKey(today);
  const admin = createClient(url, serviceKey);

  const { data: rows } = await admin.from("daily_logs").select("data").eq("log_date", todayKey).limit(1);
  const log: DayLog = { ...EMPTY_LOG, ...(rows?.[0]?.data ?? {}) };

  // Nothing to say when the day is already secured.
  if (floorHeld(log)) return NextResponse.json({ sent: false, reason: "floor held" });

  const { data: profile } = await admin.from("profiles").select("start_date").limit(1).maybeSingle();
  const start = dateFromKey(profile?.start_date ?? START_DATE);
  const dayNumber = Math.min(90, Math.max(1, Math.round((today.getTime() - start.getTime()) / 86400000) + 1));
  const open = floorChecks(log).filter((check) => !check.met).map((check) => `${check.label} — ${check.detail}`);

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.NUDGE_FROM ?? "BATCOMPUTER <onboarding@resend.dev>",
      to: [to],
      subject: `Day ${String(dayNumber).padStart(2, "0")} — ${open.length} on the floor`,
      text: body(dayNumber, log, open),
    }),
  });

  return NextResponse.json({ sent: sent.ok, open: open.length, day: dayNumber });
}
