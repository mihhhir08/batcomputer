import { mission } from "../../mission.config";
import type { DayLog, Logs } from "./types";

// Everything the API accepts passes through here, so the database can only
// ever hold the signals the config tracks, in the shapes it expects.

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_VALUE = 10_000_000;

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && DATE_KEY.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

/** Keeps configured signals only. Returns null for anything that is not a record. */
export function cleanLog(raw: unknown): DayLog | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const log: DayLog = {};
  for (const signal of mission.signals) {
    const value = input[signal.key];
    if (signal.type === "check") {
      if (typeof value === "boolean") log[signal.key] = value;
    } else if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_VALUE) {
      log[signal.key] = value;
    }
  }
  if (input.closedAt === null) log.closedAt = null;
  else if (typeof input.closedAt === "string" && !Number.isNaN(Date.parse(input.closedAt))) {
    log.closedAt = new Date(input.closedAt).toISOString();
  }
  return log;
}

/** A whole record. Bad dates and bad days are dropped; too many days is refused. */
export function cleanLogs(raw: unknown, maxDays = 1000): Logs | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > maxDays) return null;
  const logs: Logs = {};
  for (const [date, value] of entries) {
    const log = isDateKey(date) ? cleanLog(value) : null;
    if (log) logs[date] = log;
  }
  return logs;
}
