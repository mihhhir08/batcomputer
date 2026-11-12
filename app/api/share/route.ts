import { NextResponse } from "next/server";
import { analyse } from "../../../lib/mission/analytics";
import { dateFromKey, missionToday } from "../../../lib/mission/dates";
import { hasClearance } from "../../../lib/clearance";
import { cloud } from "../../../lib/cloud";
import type { Logs } from "../../../lib/mission/types";

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
  if (!await hasClearance()) return NextResponse.json({ locked: true }, { status: 401 });
  const admin = cloud();
  if (!admin) return NextResponse.json({ error: "Sharing needs the cloud mirror" }, { status: 501 });

  const { logs, startDate, jobSecuredOn, instagramStartedOn } = await request.json();
  if (!logs || typeof logs !== "object") {
    return NextResponse.json({ error: "No mission data" }, { status: 400 });
  }

  const slug = token();
  const { error } = await admin.from("shared_dossiers").insert({
    token: slug,
    snapshot: publicSnapshot(logs, startDate, jobSecuredOn, instagramStartedOn),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = new URL(request.url).origin;
  return NextResponse.json({ url: `${origin}/dossier/${slug}` });
}

/** Revoking is real: every snapshot is deleted, so old links stop resolving. */
export async function DELETE() {
  if (!await hasClearance()) return NextResponse.json({ locked: true }, { status: 401 });
  const admin = cloud();
  if (!admin) return NextResponse.json({ error: "Sharing needs the cloud mirror" }, { status: 501 });
  const { error } = await admin.from("shared_dossiers").delete().neq("token", "");
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ revoked: true });
}
