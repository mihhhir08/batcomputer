import type { DayLog, SignalConfig } from "./types";
import { SCORED, amount, fmt, reading, targetOf } from "./scoring";

// The floor is not the goal. It is the line under which a day stops counting.
// It must stay clearable on your worst day, or it is just another ceiling.

/** The signals marked `floor` in mission.config.ts. */
export const FLOOR = SCORED.filter((signal) => signal.floor);

export type FloorCheck = {
  key: string;
  label: string;
  detail: string;
  met: boolean;
  reading: string;
};

/** A numeric `floor` lets a count clear the floor well below its full target. */
export function floorAt(signal: SignalConfig) {
  return typeof signal.floor === "number" ? signal.floor : targetOf(signal);
}

export function floorChecks(log: DayLog): FloorCheck[] {
  return FLOOR.map((signal) => ({
    key: signal.key,
    label: signal.label,
    detail: signal.type === "check" ? signal.note ?? "Daily" : `${fmt(floorAt(signal))} ${signal.unit ?? ""}`.trim(),
    met: amount(log, signal.key) >= floorAt(signal),
    reading: reading(log, signal),
  }));
}

/** A day counts when every floor signal holds. Binary, and deliberately unweighted. */
export function floorHeld(log: DayLog) {
  return floorChecks(log).every((check) => check.met);
}

export function floorMetCount(log: DayLog) {
  return floorChecks(log).filter((check) => check.met).length;
}
