import {
  BinaryKey, CONTENT_VOLUME_START_DATE, DayLog, EMPTY_LOG, GoalName, HABITS,
  SKILL_GROWTH_START_DATE, WEIGHTED_SCORE_START_DATE, WELLNESS_START_DATE,
} from "./types";

// INVARIANT: this file reproduces v1 scoring exactly. Every past day must
// score identically forever. Change the presentation, never the arithmetic.

export function careerIsActive(logDate: string, jobSecuredOn: string | null) {
  return !jobSecuredOn || logDate < jobSecuredOn;
}

export function instagramIsActive(logDate: string, instagramStartedOn: string | null) {
  return Boolean(instagramStartedOn && logDate >= instagramStartedOn);
}

export function xPostCount(log: DayLog) {
  return typeof log.xPosts === "number" ? log.xPosts : Number(log.x);
}

function legacyScore(log: DayLog, logDate: string, jobSecuredOn: string | null, instagramStartedOn: string | null) {
  const instagramActive = instagramIsActive(logDate, instagramStartedOn);
  const wellnessActive = logDate >= WELLNESS_START_DATE;
  const contentVolumeActive = logDate >= CONTENT_VOLUME_START_DATE;
  const activeHabits = HABITS.filter((habit) =>
    (habit.key !== "instagram" || instagramActive) &&
    (habit.key !== "strength" || !log.recovery) &&
    (habit.key !== "scalpMassage" || wellnessActive) &&
    (habit.key !== "x" || !contentVolumeActive) &&
    (habit.key !== "careerGrowth" || logDate >= SKILL_GROWTH_START_DATE));
  const binaries = activeHabits.reduce((sum, habit) => sum + Number(Boolean(log[habit.key])), 0);
  const steps = Math.min(log.steps / 10000, 1);
  const water = wellnessActive ? Math.min((log.water ?? 0) / 3, 1) : 0;
  const xExecution = contentVolumeActive ? Math.min(xPostCount(log) / 15, 1) : 0;
  const jobs = Math.min(log.jobs / 10, 1);
  const careerActive = careerIsActive(logDate, jobSecuredOn);
  return Math.round(((binaries + steps + water + xExecution + (careerActive ? jobs : 0)) /
    (activeHabits.length + 1 + Number(wellnessActive) + Number(contentVolumeActive) + Number(careerActive))) * 100);
}

export function xImpact(posts: number) {
  if (posts >= 15) return 20;
  if (posts >= 10) return 14;
  if (posts >= 5) return 7;
  return 0;
}

export function waterImpact(litres: number) {
  if (litres >= 3) return 5;
  if (litres >= 2) return 3;
  if (litres >= 1) return 1;
  return 0;
}

export function goalPoints(log: DayLog, logDate: string, jobSecuredOn: string | null, instagramStartedOn: string | null) {
  const instagramActive = instagramIsActive(logDate, instagramStartedOn);
  const careerActive = careerIsActive(logDate, jobSecuredOn);
  return {
    Audience: xImpact(xPostCount(log)) + Number(log.linkedin) * (instagramActive ? 10 : 15) + Number(instagramActive && log.instagram) * 5,
    Career: careerActive ? Math.min(log.jobs / 10, 1) * 12 + Number(log.careerGrowth) * 13 : Number(log.careerGrowth) * 25,
    Body: Number(log.cleanFood) * 7 + Number(log.protein) * 7 + Number(log.strength || log.recovery) * 7 + Math.min(log.steps / 10000, 1) * 4 + waterImpact(log.water ?? 0),
    Hair: Number(log.scalpMassage) * 10,
  } satisfies Record<GoalName, number>;
}

export function score(log: DayLog, logDate: string, jobSecuredOn: string | null, instagramStartedOn: string | null) {
  if (logDate < WEIGHTED_SCORE_START_DATE) return legacyScore(log, logDate, jobSecuredOn, instagramStartedOn);
  return Math.round(Object.values(goalPoints(log, logDate, jobSecuredOn, instagramStartedOn)).reduce((sum, value) => sum + value, 0));
}

export function categoryScores(log: DayLog, logDate: string, jobSecuredOn: string | null, instagramStartedOn: string | null) {
  if (logDate >= WEIGHTED_SCORE_START_DATE) {
    const points = goalPoints(log, logDate, jobSecuredOn, instagramStartedOn);
    return {
      Overall: score(log, logDate, jobSecuredOn, instagramStartedOn),
      Audience: Math.round((points.Audience / 35) * 100),
      Career: Math.round((points.Career / 25) * 100),
      Body: Math.round((points.Body / 30) * 100),
      Hair: Math.round((points.Hair / 10) * 100),
    };
  }
  const instagramActive = instagramIsActive(logDate, instagramStartedOn);
  const xSignal = logDate >= CONTENT_VOLUME_START_DATE ? Math.min(xPostCount(log) / 15, 1) : Number(log.x);
  const wellnessSignals = logDate >= WELLNESS_START_DATE ? [Boolean(log.scalpMassage), Math.min((log.water ?? 0) / 3, 1)] : [];
  const bodySignals = [log.cleanFood, log.protein, ...(log.recovery ? [] : [log.strength]), Math.min(log.steps / 10000, 1), ...wellnessSignals];
  const careerSignals = [...(careerIsActive(logDate, jobSecuredOn) ? [Math.min(log.jobs / 10, 1)] : []), ...(logDate >= SKILL_GROWTH_START_DATE ? [Number(Boolean(log.careerGrowth))] : [])];
  return {
    Overall: score(log, logDate, jobSecuredOn, instagramStartedOn),
    Body: Math.round((bodySignals.reduce<number>((sum, value) => sum + Number(value), 0) / bodySignals.length) * 100),
    Audience: Math.round(((xSignal + Number(log.linkedin) + (instagramActive ? Number(log.instagram) : 0)) / (instagramActive ? 3 : 2)) * 100),
    Career: careerSignals.length ? Math.round((careerSignals.reduce((sum, value) => sum + value, 0) / careerSignals.length) * 100) : 100,
    Hair: 0,
  };
}

export function habitImpact(key: BinaryKey, instagramActive: boolean, careerActive: boolean) {
  return { x: 20, linkedin: instagramActive ? 10 : 15, instagram: 5, cleanFood: 7, protein: 7, strength: 7, scalpMassage: 10, careerGrowth: careerActive ? 13 : 25 }[key];
}

export function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

/** XP rewards volume above the X floor; the rest tracks the daily score. */
export function dayXp(log: DayLog, logDate: string, jobSecuredOn: string | null, instagramStartedOn: string | null) {
  const extraXPosts = logDate >= CONTENT_VOLUME_START_DATE ? Math.max(0, xPostCount(log) - 15) : 0;
  return score(log, logDate, jobSecuredOn, instagramStartedOn) * 10 + extraXPosts * 10;
}

export { EMPTY_LOG };
