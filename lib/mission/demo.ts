import { mission } from "../../mission.config";
import { addDays, dateKey } from "./dates";
import { targetOf } from "./scoring";
import type { DayLog, Logs } from "./types";

export const DEMO_DAYS = 6;

/**
 * Shown only before the mission is started, so the terminal is never empty.
 * Built from whatever the config tracks, and deterministic so the server and
 * the browser render the same numbers.
 */
export function demoLogs(today: Date): Logs {
  return Object.fromEntries(Array.from({ length: DEMO_DAYS }, (_, day) => {
    const log: DayLog = {};
    mission.signals.forEach((signal, index) => {
      const wave = ((day * 7 + index * 3) % 10) / 10;
      if (signal.type === "check") log[signal.key] = wave > 0.2;
      if (signal.type === "count") {
        const step = signal.step ?? 1;
        log[signal.key] = Math.round((targetOf(signal) * (0.55 + wave * 0.6)) / step) * step;
      }
    });
    return [dateKey(addDays(today, day - DEMO_DAYS)), log];
  }));
}

export const STORAGE = {
  logs: "momentum-90-logs",
  start: "momentum-90-start",
  started: "momentum-90-started",
} as const;
