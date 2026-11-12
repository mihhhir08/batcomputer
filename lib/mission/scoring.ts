import { mission } from "../../mission.config";
import type { DayLog, SignalConfig } from "./types";

// Everything here is driven by mission.config.ts. A day's score is points
// earned over points available, so weights never have to add up to 100.

export const SCORED = mission.signals.filter((signal) => signal.type !== "measure");
export const MEASURES = mission.signals.filter((signal) => signal.type === "measure");
export const GOALS = mission.goals.map((goal) => goal.id);

export function goalColor(goal: string) {
  return mission.goals.find((entry) => entry.id === goal)?.color ?? "#78ddeb";
}

export function fmt(value: number) {
  return value.toLocaleString(mission.locale);
}

/** A signal's value as a number. A ticked check is 1. */
export function amount(log: DayLog, key: string) {
  const value = log[key];
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return value === true ? 1 : 0;
}

export function targetOf(signal: SignalConfig) {
  return signal.type === "check" ? 1 : signal.target ?? 1;
}

export function complete(log: DayLog, signal: SignalConfig) {
  if (signal.type === "measure") return typeof log[signal.key] === "number";
  return amount(log, signal.key) >= targetOf(signal);
}

/** Points a signal earned today. */
export function earned(log: DayLog, signal: SignalConfig) {
  const points = signal.points ?? 0;
  const value = amount(log, signal.key);
  if (signal.type === "measure") return 0;
  if (signal.type === "check") return value ? points : 0;
  if (signal.tiers) return signal.tiers.reduce((best, [at, worth]) => (value >= at ? Math.max(best, worth) : best), 0);
  return Math.min(value / targetOf(signal), 1) * points;
}

function percent(log: DayLog, signals: SignalConfig[]) {
  const available = signals.reduce((sum, signal) => sum + (signal.points ?? 0), 0);
  if (!available) return 0;
  return Math.round((signals.reduce((sum, signal) => sum + earned(log, signal), 0) / available) * 100);
}

/** 0–100 for the whole day. */
export function score(log: DayLog) {
  return percent(log, SCORED);
}

/** 0–100 for one goal. */
export function goalScore(log: DayLog, goal: string) {
  return percent(log, SCORED.filter((signal) => signal.goal === goal));
}

export function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

export function dayXp(log: DayLog) {
  return score(log) * 10;
}

/** What a signal says about a day, in words. */
export function reading(log: DayLog, signal: SignalConfig) {
  if (signal.type === "check") return log[signal.key] ? "Complete" : "Open";
  if (signal.type === "measure" && typeof log[signal.key] !== "number") return "No entry";
  return `${fmt(amount(log, signal.key))} ${signal.unit ?? ""}`.trim();
}
