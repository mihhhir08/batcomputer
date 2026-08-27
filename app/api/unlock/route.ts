import { NextResponse } from "next/server";

// The PIN is never shipped to the browser and never compared there. The client
// posts a candidate, the server answers yes or no, and only on yes does it set
// an httpOnly cookie the mission API will accept.

const COOKIE = "batcomputer-clearance";
const YEAR = 60 * 60 * 24 * 365;

/** Constant-time compare so a wrong PIN cannot be found one digit at a time. */
function matches(candidate: string, secret: string) {
  if (candidate.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i += 1) diff |= candidate.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  const secret = process.env.MISSION_PIN;
  if (!secret) return NextResponse.json({ required: false });

  const { pin } = await request.json();
  if (typeof pin !== "string" || !matches(pin, secret)) {
    // A deliberate pause: four digits are only ten thousand guesses otherwise.
    await new Promise((resolve) => setTimeout(resolve, 700));
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: YEAR,
    path: "/",
  });
  return response;
}

export async function GET() {
  return NextResponse.json({ required: Boolean(process.env.MISSION_PIN) });
}
