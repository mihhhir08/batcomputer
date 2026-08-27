import { addDays, dateKey, daysBetween } from "./dates";
import { average, categoryScores, dayXp, score } from "./scoring";
import { floorHeld } from "./floor";
import { runs } from "./gaps";
import { EMPTY_LOG, WELLNESS_START_DATE, type GoalName, type Logs } from "./types";

const GOALS: GoalName[] = ["Audience", "Career", "Body", "Hair"];

export type Analytics = ReturnType<typeof analyse>;

/**
 * Every derived number the sectors read. Pure, so the same inputs always give
 * the same dashboard and the whole thing can be tested without a browser.
 */
export function analyse(logs: Logs, start: Date, today: Date, jobSecuredOn: string | null, instagramStartedOn: string | null) {
  const dayNumber = Math.min(90, Math.max(1, daysBetween(start, today) + 1));
  const elapsed = Array.from({ length: dayNumber }, (_, index) => addDays(start, index));
  const recorded = elapsed.filter((date) => Boolean(logs[dateKey(date)]));

  const scoreOn = (date: Date) => score(logs[dateKey(date)] ?? EMPTY_LOG, dateKey(date), jobSecuredOn, instagramStartedOn);
  const categoryAverage = (dates: Date[], category: GoalName) =>
    average(dates
      .filter((date) => logs[dateKey(date)] && (category !== "Hair" || dateKey(date) >= WELLNESS_START_DATE))
      .map((date) => categoryScores(logs[dateKey(date)], dateKey(date), jobSecuredOn, instagramStartedOn)[category]));

  // Weeks are mission weeks counted from the start date, not calendar weeks.
  const weekIndex = Math.floor((dayNumber - 1) / 7);
  const weekDayCount = ((dayNumber - 1) % 7) + 1;
  const weekStart = addDays(start, weekIndex * 7);
  const weekDates = Array.from({ length: weekDayCount }, (_, index) => addDays(weekStart, index));
  const hasPreviousWeek = weekIndex > 0;
  const previousWeekDates = hasPreviousWeek
    ? Array.from({ length: weekDayCount }, (_, index) => addDays(weekStart, index - 7))
    : [];

  const weekScores = weekDates.filter((date) => logs[dateKey(date)]).map(scoreOn);
  const previousScores = previousWeekDates.filter((date) => logs[dateKey(date)]).map(scoreOn);
  const weeklyScore = average(weekScores);
  const previousScore = average(previousScores);

  const weeklyCategories = GOALS.map((category) => ({ category, value: categoryAverage(weekDates, category) }));
  const previousCategories = hasPreviousWeek
    ? GOALS.map((category) => ({ category, value: categoryAverage(previousWeekDates, category) }))
    : [];
  const sortedWeekly = [...weeklyCategories].sort((a, b) => b.value - a.value);

  const xp = recorded.reduce((total, date) => total + dayXp(logs[dateKey(date)], dateKey(date), jobSecuredOn, instagramStartedOn), 0);
  const level = Math.floor(xp / 1000) + 1;

  const floorRun = runs(logs, start, today, floorHeld);
  const floorDays = elapsed.filter((date) => logs[dateKey(date)] && floorHeld(logs[dateKey(date)])).length;

  const weekEvidence = Array.from({ length: Math.ceil(dayNumber / 7) }, (_, index) => {
    const dates = Array.from({ length: 7 }, (_, offset) => addDays(start, index * 7 + offset))
      .filter((date) => date <= today && Boolean(logs[dateKey(date)]));
    return { week: index + 1, value: average(dates.map(scoreOn)), days: dates.length };
  }).filter((week) => week.days > 0);

  const weights = Object.entries(logs)
    .filter((entry): entry is [string, typeof EMPTY_LOG & { weight: number }] => typeof entry[1].weight === "number")
    .sort(([a], [b]) => a.localeCompare(b));

  return {
    dayNumber,
    daysRemaining: Math.max(0, 90 - dayNumber),
    elapsed,
    recorded,
    challengeScore: average(recorded.map(scoreOn)),
    scoreOn,
    categoryAverage,
    weekIndex,
    weekDayCount,
    weekDates,
    previousWeekDates,
    hasPreviousWeek,
    weekScores,
    weeklyScore,
    previousScore,
    weeklyDelta: weeklyScore - previousScore,
    weekLoggedCount: weekDates.filter((date) => Boolean(logs[dateKey(date)])).length,
    weekClosedCount: weekDates.filter((date) => Boolean(logs[dateKey(date)]?.closedAt)).length,
    weeklyCategories,
    previousCategories,
    strongest: sortedWeekly[0],
    weakest: sortedWeekly[sortedWeekly.length - 1],
    xp,
    level,
    nextLevelXp: 1000 - (xp % 1000),
    floorRun,
    floorDays,
    weekEvidence,
    bestWeek: [...weekEvidence].sort((a, b) => b.value - a.value)[0],
    weights: weights.map(([date, log]) => [date, log.weight] as [string, number]),
    totalJobs: Object.values(logs).reduce((sum, log) => sum + log.jobs, 0),
  };
}
