import { addDays, dateKey, daysBetween } from "./dates";
import { DayLog, Logs } from "./types";

// v1 treated an unlogged day as a hole in the evidence and let it poison every
// average and streak. v2 names it: OFF-GRID. Absence is a fact about life,
// not a verdict about you.

export type DayState = "future" | "unlogged" | "offGrid" | "open" | "closed";

export type Gap = { from: string; to: string; days: number };

/** Days older than this with no record are sealed rather than left accusing. */
export const OFF_GRID_AFTER_DAYS = 1;

export function dayState(logs: Logs, key: string, todayKey: string): DayState {
  if (key > todayKey) return "future";
  const log = logs[key];
  if (log) return log.closedAt ? "closed" : "open";
  const age = daysBetween(new Date(`${key}T12:00:00Z`), new Date(`${todayKey}T12:00:00Z`));
  return age > OFF_GRID_AFTER_DAYS ? "offGrid" : "unlogged";
}

/** Contiguous runs of missing days inside the elapsed mission window. */
export function findGaps(logs: Logs, start: Date, today: Date): Gap[] {
  const gaps: Gap[] = [];
  let run: string[] = [];
  const elapsed = Math.max(0, daysBetween(start, today)) + 1;

  for (let index = 0; index < elapsed; index += 1) {
    const key = dateKey(addDays(start, index));
    if (logs[key]) {
      if (run.length) gaps.push({ from: run[0], to: run.at(-1)!, days: run.length });
      run = [];
    } else {
      run.push(key);
    }
  }
  // A run touching today is still live, not yet a gap.
  if (run.length && run.at(-1)! !== dateKey(today)) {
    gaps.push({ from: run[0], to: run.at(-1)!, days: run.length });
  }
  return gaps;
}

/** The gap you just walked out of, if today is a return after silence. */
export function returnGap(logs: Logs, start: Date, today: Date): Gap | null {
  const gaps = findGaps(logs, start, today);
  const last = gaps.at(-1);
  if (!last) return null;
  const dayAfter = dateKey(addDays(new Date(`${last.to}T12:00:00Z`), 1));
  return dayAfter === dateKey(today) ? last : null;
}

export type Run = { current: number; longest: number };

/**
 * Off-grid days end the current run but never erase the longest. A break costs
 * you momentum, not your record.
 */
export function runs(logs: Logs, start: Date, today: Date, held: (log: DayLog) => boolean): Run {
  let current = 0;
  let longest = 0;
  const elapsed = Math.max(0, daysBetween(start, today)) + 1;

  for (let index = 0; index < elapsed; index += 1) {
    const log = logs[dateKey(addDays(start, index))];
    current = log && held(log) ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return { current, longest };
}
