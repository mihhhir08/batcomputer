import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const CLEARANCE_COOKIE = "batcomputer-clearance";

/**
 * The cookie is a signature, never the PIN itself. The key mixes in every
 * other server secret, so the token cannot be forged by walking the ten
 * thousand possible PINs against the API.
 */
export function clearanceToken(pin: string) {
  const key = [pin, process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.OPENROUTER_API_KEY, process.env.CRON_SECRET].join("|");
  return createHmac("sha256", key).update(CLEARANCE_COOKIE).digest("hex");
}

/** Constant-time compare so a secret cannot be found one character at a time. */
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * True when the caller may touch mission data. With no PIN configured the
 * terminal is open, which keeps the local-only setup zero-friction.
 */
export async function hasClearance() {
  const pin = process.env.MISSION_PIN;
  if (!pin) return true;
  const jar = await cookies();
  return safeEqual(jar.get(CLEARANCE_COOKIE)?.value ?? "", clearanceToken(pin));
}
