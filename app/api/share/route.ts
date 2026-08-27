import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analyse } from "../../../lib/mission/analytics.ts";
import { dateFromKey, missionToday } from "../../../lib/mission/dates.ts";
import type { Logs } from "../../../lib/mission/types.ts";

// A share is a snapshot, not a live view. It is written once to its own table
// and read by a route with no write path, so a friend physically cannot alter
// the mission no matter what they send.

function token() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 22);
}

/** Weight, waist and anything else bodily never leaves the terminal. */
function publicSnapshot(logs: Logs, startDate: string, jobSecuredOn: string | null, instagramStartedOn: string | null) {
  const start = dateFromKey(startDate);
  const stats = analyse(logs, start, missionToday(), jobSecuredOn, instagramStartedOn);
  return {
    startDate,
    dayNumber: stats.dayNumber,
    daysRemaining: stats.daysRemaining,
    challengeScore: stats.challengeScore,
    floorDays: stats.floorDays,
    floorRun: stats.floorRun,
    level: stats.level,
    xp: stats.xp,
    weekEvidence: stats.weekEvidence,
    categories: (["Audience", "Career", "Body", "Hair"] as const)
      .map((category) => ({ category, value: stats.categoryAverage(stats.recorded, category) })),
    // Per-day scores only. No habit detail, no weight, no dates of absence.
    days: stats.elapsed.map((date) => {
      const key = date.toISOString().slice(0, 10);
      return { key, score: logs[key] ? stats.scoreOn(date) : null };
    }),
  };
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Sharing needs SUPABASE_SERVICE_ROLE_KEY" }, { status: 501 });
  }

  const { logs, startDate, jobSecuredOn, instagramStartedOn } = await request.json();
  if (!logs || typeof logs !== "object") {
    return NextResponse.json({ error: "No mission data" }, { status: 400 });
  }

  const slug = token();
  const admin = createClient(url, serviceKey);
  const { error } = await admin.from("shared_dossiers").insert({
    token: slug,
    snapshot: publicSnapshot(logs, startDate, jobSecuredOn, instagramStartedOn),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = new URL(request.url).origin;
  return NextResponse.json({ url: `${origin}/dossier/${slug}` });
}
