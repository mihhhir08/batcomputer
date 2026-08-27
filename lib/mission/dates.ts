export const TIMEZONE = "America/Toronto";

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

/** Anchors a YYYY-MM-DD key at UTC noon so day arithmetic never drifts. */
export function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

/** Today in the mission's home timezone, not the viewer's. */
export function missionToday(now = new Date()) {
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return dateFromKey(local);
}

export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}
