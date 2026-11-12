import { mission } from "../../mission.config";
import { GOALS, complete, fmt, goalScore, reading, score, targetOf } from "./scoring";
import { FLOOR, floorHeld, floorMetCount } from "./floor";
import type { DayLog, SignalConfig } from "./types";

export type Signal = {
  key: string;
  label: string;
  target: string;
  group: string;
  complete: (log: DayLog) => boolean;
  reading: (log: DayLog) => string;
};

function targetText(signal: SignalConfig) {
  if (signal.type === "check") return "Daily";
  if (signal.type === "measure") return signal.band ? `${signal.band[0]}–${signal.band[1]} ${signal.unit ?? ""}`.trim() : "Tracked";
  return `${fmt(targetOf(signal))} ${signal.unit ?? ""}`.trim();
}

/** Every interrogable signal: the floor, each configured signal, each score. */
export const SIGNALS: Signal[] = [
  { key: "floor", label: "Minimum viable day", target: `All ${FLOOR.length}`, group: "Floor",
    complete: floorHeld, reading: (log) => `${floorMetCount(log)}/${FLOOR.length} held` },
  ...mission.signals.map((signal) => ({
    key: signal.key, label: signal.label, target: targetText(signal), group: signal.goal ?? "Metric",
    complete: (log: DayLog) => complete(log, signal), reading: (log: DayLog) => reading(log, signal),
  })),
  { key: "score:overall", label: "Overall score", target: "70–100", group: "Score",
    complete: (log) => score(log) >= 70, reading: (log) => `${score(log)}%` },
  ...GOALS.map((goal) => ({
    key: `score:${goal}`, label: `${goal} score`, target: "70–100", group: goal,
    complete: (log: DayLog) => goalScore(log, goal) >= 70, reading: (log: DayLog) => `${goalScore(log, goal)}%`,
  })),
];
