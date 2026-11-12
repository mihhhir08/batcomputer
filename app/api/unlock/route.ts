import { NextResponse } from "next/server";
import { CLEARANCE_COOKIE, clearanceToken, safeEqual } from "../../../lib/clearance";

// The PIN is never shipped to the browser and never compared there. The client
// posts a candidate, the server answers yes or no, and only on yes does it set
// an httpOnly cookie the mission API will accept.

const YEAR = 60 * 60 * 24 * 365;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// ponytail: in-memory, so each serverless instance counts on its own. Move the
// counter to a table if the PIN ever has to stand up to a distributed attack.
let failures = 0;
let lockedUntil = 0;

export async function POST(request: Request) {
  const secret = process.env.MISSION_PIN;
  if (!secret) return NextResponse.json({ required: false });

  if (Date.now() < lockedUntil) {
    return NextResponse.json({ ok: false, locked: true }, { status: 429 });
  }

  const { pin } = await request.json().catch(() => ({ pin: null }));
  if (typeof pin !== "string" || !safeEqual(pin, secret)) {
    failures += 1;
    if (failures >= MAX_FAILURES) {
      failures = 0;
      lockedUntil = Date.now() + LOCKOUT_MS;
    }
    // A deliberate pause: four digits are only ten thousand guesses otherwise.
    await new Promise((resolve) => setTimeout(resolve, 700));
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  failures = 0;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLEARANCE_COOKIE, clearanceToken(secret), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: YEAR,
    path: "/",
  });
  return response;
}

export async function GET() {
  return NextResponse.json({ required: Boolean(process.env.MISSION_PIN) });
}
