import { NextResponse } from "next/server";
import { analyse } from "../../../lib/mission/analytics";
import { dateFromKey, dateKey, missionToday } from "../../../lib/mission/dates";
import { GOALS } from "../../../lib/mission/scoring";
import { cleanLogs, isDateKey } from "../../../lib/mission/validate";
import { hasClearance } from "../../../lib/clearance";
import { cloud } from "../../../lib/cloud";
import type { Logs } from "../../../lib/mission/types";

// A share is a snapshot, not a live view. It is written once to its own table
// and read by a route with no write path, so a friend physically cannot alter
// the mission no matter what they send.

function token() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 22);
}

/** Scores only. Measures and per-signal detail never leave the terminal. */
function publicSnapshot(logs: Logs, startDate: string) {
  const stats = analyse(logs, dateFromKey(startDate), missionToday());
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
    categories: GOALS.map((category) => ({ category, value: stats.categoryAverage(stats.recorded, category) })),
    days: stats.elapsed.map((date) => {
      const key = dateKey(date);
      return { key, score: logs[key] ? stats.scoreOn(date) : null };
    }),
  };
}

export async function POST(request: Request) {
  if (!await hasClearance()) return NextResponse.json({ locked: true }, { status: 401 });
  const admin = cloud();
  if (!admin) return NextResponse.json({ error: "Sharing needs the cloud mirror" }, { status: 501 });

  const payload = await request.json().catch(() => null);
  const logs = cleanLogs(payload?.logs);
  if (!logs || !isDateKey(payload?.startDate)) {
    return NextResponse.json({ error: "No mission data" }, { status: 400 });
  }

  const slug = token();
  const { error } = await admin.from("shared_dossiers").insert({
    token: slug,
    snapshot: publicSnapshot(logs, payload.startDate),
  });

  if (error) {
    console.error("share api:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  return NextResponse.json({ url: `${origin}/dossier/${slug}` });
}

/** Revoking is real: every snapshot is deleted, so old links stop resolving. */
export async function DELETE() {
  if (!await hasClearance()) return NextResponse.json({ locked: true }, { status: 401 });
  const admin = cloud();
  if (!admin) return NextResponse.json({ error: "Sharing needs the cloud mirror" }, { status: 501 });
  const { error } = await admin.from("shared_dossiers").delete().neq("token", "");
  if (error) console.error("share api:", error.message);
  return error
    ? NextResponse.json({ error: "Database error" }, { status: 500 })
    : NextResponse.json({ revoked: true });
}
