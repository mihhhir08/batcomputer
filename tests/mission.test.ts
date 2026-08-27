import assert from "node:assert/strict";
import { EMPTY_LOG, START_DATE } from "../lib/mission/types";
import { categoryScores, score } from "../lib/mission/scoring";
import { floorHeld, floorChecks } from "../lib/mission/floor";
import { findGaps, returnGap, runs, dayState } from "../lib/mission/gaps";
import { addDays, dateFromKey, dateKey } from "../lib/mission/dates";

// Scoring invariant: these are v1 outputs. If they move, history was rewritten.

const legacyPerfect = { ...EMPTY_LOG, x: true, linkedin: true, cleanFood: true, protein: true, strength: true, jobs: 10, steps: 10420 };
assert.equal(score(legacyPerfect, "2026-08-01", null, null), 100, "legacy-era perfect day must score 100");

const weightedPerfect = { ...EMPTY_LOG, x: true, xPosts: 15, linkedin: true, cleanFood: true, protein: true, strength: true, scalpMassage: true, careerGrowth: true, jobs: 10, steps: 10000, water: 3 };
assert.equal(score(weightedPerfect, "2026-08-10", null, null), 100, "weighted-era perfect day must score 100");
assert.equal(score(EMPTY_LOG, "2026-08-10", null, null), 0, "an empty weighted day scores 0");

const cats = categoryScores(weightedPerfect, "2026-08-10", null, null);
assert.deepEqual(
  { A: cats.Audience, C: cats.Career, B: cats.Body, H: cats.Hair },
  { A: 100, C: 100, B: 100, H: 100 },
  "every goal maxes on a perfect weighted day",
);

// Instagram activation reweights Audience without touching the total.
const igDay = { ...weightedPerfect, instagram: true };
assert.equal(score(igDay, "2026-08-10", null, "2026-08-09"), 100, "Audience still tops out at 35 once Instagram is live");

// Recovery substitutes for strength rather than costing the points.
const recoveryDay = { ...weightedPerfect, strength: false, recovery: true };
assert.equal(score(recoveryDay, "2026-08-10", null, null), 100, "planned recovery protects the body points");

// Floor: independent of score, clearable on a bad day.
assert.equal(floorHeld(weightedPerfect), true, "a perfect day clears the floor");
assert.equal(floorHeld(EMPTY_LOG), false, "an empty day does not clear the floor");

const barelyThere = { ...EMPTY_LOG, steps: 10000, linkedin: true, scalpMassage: true };
assert.equal(floorHeld(barelyThere), true, "one post on one channel clears the publish floor");
assert.ok(score(barelyThere, "2026-08-10", null, null) < 40, "clearing the floor is not the same as a good day");
assert.equal(floorChecks(barelyThere).length, 3, "the floor is exactly three checks");

// Gaps: a real six-day silence inside the mission window.
const start = dateFromKey(START_DATE);
const today = dateFromKey("2026-08-27");
const logs: Record<string, typeof EMPTY_LOG> = {};
for (let i = 0; i < 14; i += 1) logs[dateKey(addDays(start, i))] = { ...barelyThere };
logs[dateKey(addDays(start, 19))] = { ...barelyThere };

const gaps = findGaps(logs, start, today);
assert.equal(gaps.length, 1, "the sealed silence, not the still-live day");
assert.equal(gaps[0].days, 5, "five days went dark before the pickup");
assert.equal(gaps[0].from, "2026-08-21", "the gap starts the day after the last record");

// The day you break silence is the return; the day after is just a day.
assert.ok(returnGap(logs, start, dateFromKey("2026-08-26")), "logging straight after silence is a return");
assert.equal(returnGap(logs, start, today), null, "and it is only announced once");

// Runs: a break costs the current streak, never the record.
const record = runs(logs, start, today, (log) => log.scalpMassage);
assert.equal(record.longest, 14, "the longest run survives the gap");
assert.equal(record.current, 0, "the current run does not");

// Day states.
assert.equal(dayState(logs, dateKey(addDays(start, 0)), "2026-08-27"), "open", "a logged unclosed day is open");
assert.equal(dayState(logs, dateKey(addDays(start, 16)), "2026-08-27"), "offGrid", "an old missing day is off-grid, not failed");
assert.equal(dayState(logs, "2026-09-30", "2026-08-27"), "future", "tomorrow is not a failure either");

console.log("mission logic ok");
