import { categoryScores, score, xPostCount } from "./scoring";
import { STEP_FLOOR, published } from "./floor";
import type { BinaryKey, DayLog, GoalName } from "./types";

export type SignalKey =
  | BinaryKey | "xPosts" | "jobs" | "steps" | "water" | "weight"
  | "floor" | "overall" | "audience" | "career" | "body" | "hair";

export type Signal = {
  key: SignalKey;
  label: string;
  target: string;
  group: GoalName | "Floor";
  complete: (log: DayLog) => boolean;
  reading: (log: DayLog) => string;
};

const binary = (log: DayLog, key: BinaryKey) => (log[key] ? "Complete" : "Open");

/** Every interrogable signal. `todayKey` only scopes the score-derived ones. */
export function signalCatalog(todayKey: string, jobSecuredOn: string | null, instagramStartedOn: string | null): Signal[] {
  const cat = (log: DayLog) => categoryScores(log, todayKey, jobSecuredOn, instagramStartedOn);
  return [
    { key: "floor", label: "Minimum viable day", target: "All three", group: "Floor",
      complete: (log) => log.steps >= STEP_FLOOR && published(log) && log.scalpMassage,
      reading: (log) => `${[log.steps >= STEP_FLOOR, published(log), log.scalpMassage].filter(Boolean).length}/3 held` },
    { key: "steps", label: "Daily steps", target: STEP_FLOOR.toLocaleString("en-CA"), group: "Body",
      complete: (log) => log.steps >= STEP_FLOOR, reading: (log) => log.steps.toLocaleString("en-CA") },
    { key: "xPosts", label: "X distribution", target: "15 for full points", group: "Audience",
      complete: (log) => xPostCount(log) >= 15, reading: (log) => `${xPostCount(log)} posts` },
    { key: "scalpMassage", label: "Scalp massage", target: "Daily", group: "Hair",
      complete: (log) => log.scalpMassage, reading: (log) => binary(log, "scalpMassage") },
    { key: "linkedin", label: "LinkedIn post", target: "1 daily", group: "Audience",
      complete: (log) => log.linkedin, reading: (log) => binary(log, "linkedin") },
    { key: "instagram", label: "Instagram post", target: instagramStartedOn ? "1 daily" : "Not active", group: "Audience",
      complete: (log) => log.instagram, reading: (log) => binary(log, "instagram") },
    { key: "careerGrowth", label: "Career opportunity block", target: "45 focused min", group: "Career",
      complete: (log) => log.careerGrowth, reading: (log) => binary(log, "careerGrowth") },
    { key: "jobs", label: "Job applications", target: "10 daily", group: "Career",
      complete: (log) => log.jobs >= 10, reading: (log) => `${log.jobs} sent` },
    { key: "cleanFood", label: "Clean food", target: "All day", group: "Body",
      complete: (log) => log.cleanFood, reading: (log) => binary(log, "cleanFood") },
    { key: "protein", label: "Protein target", target: "Daily", group: "Body",
      complete: (log) => log.protein, reading: (log) => binary(log, "protein") },
    { key: "strength", label: "Strength session", target: "Workout or recovery", group: "Body",
      complete: (log) => log.strength || log.recovery,
      reading: (log) => (log.recovery ? "Recovery" : binary(log, "strength")) },
    { key: "water", label: "Water intake", target: "3 L", group: "Body",
      complete: (log) => (log.water ?? 0) >= 3, reading: (log) => `${log.water ?? 0} L` },
    { key: "weight", label: "Weight", target: "goal band", group: "Body",
      complete: (log) => typeof log.weight === "number",
      reading: (log) => (typeof log.weight === "number" ? `${log.weight.toFixed(1)} kg` : "No entry") },
    { key: "overall", label: "Overall score", target: "70–100", group: "Body",
      complete: (log) => score(log, todayKey, jobSecuredOn, instagramStartedOn) >= 70,
      reading: (log) => `${score(log, todayKey, jobSecuredOn, instagramStartedOn)}%` },
    { key: "audience", label: "Audience score", target: "35 points", group: "Audience",
      complete: (log) => cat(log).Audience >= 70, reading: (log) => `${cat(log).Audience}%` },
    { key: "career", label: "Career score", target: "25 points", group: "Career",
      complete: (log) => cat(log).Career >= 70, reading: (log) => `${cat(log).Career}%` },
    { key: "body", label: "Body score", target: "30 points", group: "Body",
      complete: (log) => cat(log).Body >= 70, reading: (log) => `${cat(log).Body}%` },
  ];
}
