import { cookies } from "next/headers";

export const CLEARANCE_COOKIE = "batcomputer-clearance";

/**
 * True when the caller may touch mission data. With no PIN configured the
 * terminal is open, which keeps the single-operator setup zero-friction.
 */
export async function hasClearance() {
  const secret = process.env.MISSION_PIN;
  if (!secret) return true;
  const jar = await cookies();
  return jar.get(CLEARANCE_COOKIE)?.value === secret;
}
