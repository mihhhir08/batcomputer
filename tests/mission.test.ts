import assert from "node:assert/strict";
import { mission } from "../mission.config";
import type { DayLog, Logs, SignalConfig } from "../lib/mission/types";
import { SCORED, complete, earned, goalScore, score, targetOf } from "../lib/mission/scoring";
import { FLOOR, floorAt, floorChecks, floorHeld } from "../lib/mission/floor";
import { cleanLog, cleanLogs, isDateKey } from "../lib/mission/validate";
import { demoLogs } from "../lib/mission/demo";
import { findGaps, returnGap, runs, dayState } from "../lib/mission/gaps";
import { addDays, dateFromKey, dateKey } from "../lib/mission/dates";

// ── mission.config.ts is sane. These fail with a message that says what to fix.

const keys = mission.signals.map((signal) => signal.key);
assert.equal(new Set(keys).size, keys.length, "config: every signal key must be unique");
assert.ok(!keys.includes("closedAt"), 'config: "closedAt" is reserved and cannot be a signal key');
assert.ok(mission.days >= 7, "config: a mission needs at least 7 days");
assert.ok(mission.goals.length > 0, "config: define at least one goal");
assert.doesNotThrow(() => new Intl.DateTimeFormat("en", { timeZone: mission.timezone }), "config: timezone must be a valid IANA name");

const goalIds = mission.goals.map((goal) => goal.id);
for (const signal of mission.signals) {
  assert.ok(/^[A-Za-z][A-Za-z0-9]*$/.test(signal.key), `config: key "${signal.key}" must be letters and digits only`);
  if (signal.type === "measure") continue;
  assert.ok(signal.goal && goalIds.includes(signal.goal), `config: "${signal.key}" needs a goal from the goals list`);
  assert.ok((signal.points ?? 0) > 0, `config: "${signal.key}" needs points above 0`);
  if (signal.type === "count") assert.ok((signal.target ?? 0) > 0, `config: count "${signal.key}" needs a target above 0`);
  if (typeof signal.floor === "number") assert.equal(signal.type, "count", `config: only a count can use a numeric floor ("${signal.key}")`);
}

// ── Counting types, on signals defined here so the config can change freely.

const check: SignalConfig = { key: "c", label: "C", type: "check", goal: "G", points: 10 };
assert.equal(earned({ c: true }, check), 10, "a ticked check earns all its points");
assert.equal(earned({}, check), 0, "an unticked check earns nothing");

const count: SignalConfig = { key: "n", label: "N", type: "count", goal: "G", points: 20, target: 10 };
assert.equal(earned({ n: 5 }, count), 10, "half a count target earns half the points");
assert.equal(earned({ n: 40 }, count), 20, "going over the target never earns extra");
assert.equal(complete({ n: 9 }, count), false, "a count is complete only at its target");

const tiered: SignalConfig = { ...count, tiers: [[5, 7], [10, 14], [15, 20]] };
assert.equal(earned({ n: 4 }, tiered), 0, "below the first tier earns nothing");
assert.equal(earned({ n: 12 }, tiered), 14, "tiers pay the highest threshold reached");

const measure: SignalConfig = { key: "m", label: "M", type: "measure" };
assert.equal(earned({ m: 80 }, measure), 0, "a measure is never scored");

// ── The real config scores 0 to 100.

const perfect: DayLog = Object.fromEntries(SCORED.map((signal) => [signal.key, signal.type === "check" ? true : targetOf(signal)]));
assert.equal(score(perfect), 100, "hitting every target scores 100");
assert.equal(score({}), 0, "an empty day scores 0");
for (const goal of goalIds) {
  if (SCORED.some((signal) => signal.goal === goal)) assert.equal(goalScore(perfect, goal), 100, `${goal} maxes on a perfect day`);
}

// ── Floor: independent of score, clearable on a bad day.

const barelyThere: DayLog = Object.fromEntries(FLOOR.map((signal) => [signal.key, signal.type === "check" ? true : floorAt(signal)]));
assert.equal(floorHeld(perfect), true, "a perfect day clears the floor");
assert.equal(floorHeld(barelyThere), true, "meeting only the floor signals clears the floor");
assert.equal(floorChecks(barelyThere).length, FLOOR.length, "one check per floor signal");
if (FLOOR.length) assert.equal(floorHeld({}), false, "an empty day does not clear the floor");

// ── Validation: the API stores configured signals and nothing else.

assert.equal(cleanLog("nope"), null, "a log must be an object");
assert.deepEqual(cleanLog({ injected: "x", __proto__: { a: 1 } }), {}, "unknown keys are dropped");
const firstCount = mission.signals.find((signal) => signal.type !== "check");
if (firstCount) {
  assert.deepEqual(cleanLog({ [firstCount.key]: 3 }), { [firstCount.key]: 3 }, "a number survives");
  assert.deepEqual(cleanLog({ [firstCount.key]: -1 }), {}, "negative numbers are dropped");
  assert.deepEqual(cleanLog({ [firstCount.key]: "3" }), {}, "strings are not numbers");
}
assert.equal(isDateKey("2026-08-07"), true);
assert.equal(isDateKey("2026-8-7"), false, "dates must be YYYY-MM-DD");
assert.deepEqual(cleanLogs({ "not-a-date": {}, "2026-08-07": {} }), { "2026-08-07": {} }, "bad dates are dropped");
assert.equal(cleanLogs({ a: {}, b: {} }, 1), null, "too many days is refused");

// ── Demo data only uses configured signals.

for (const log of Object.values(demoLogs(dateFromKey("2026-08-07")))) {
  assert.deepEqual(cleanLog(log), log, "demo days pass validation unchanged");
}

// ── Gaps: a real silence inside the mission window.

const start = dateFromKey("2026-08-07");
const today = dateFromKey("2026-08-27");
const logs: Logs = {};
for (let i = 0; i < 14; i += 1) logs[dateKey(addDays(start, i))] = { done: true };
logs[dateKey(addDays(start, 19))] = { done: true };

const gaps = findGaps(logs, start, today);
assert.equal(gaps.length, 1, "the sealed silence, not the still-live day");
assert.equal(gaps[0].days, 5, "five days went dark before the pickup");
assert.equal(gaps[0].from, "2026-08-21", "the gap starts the day after the last record");

// The day you break silence is the return; the day after is just a day.
assert.ok(returnGap(logs, start, dateFromKey("2026-08-26")), "logging straight after silence is a return");
assert.equal(returnGap(logs, start, today), null, "and it is only announced once");

// Runs: a break costs the current streak, never the record.
const record = runs(logs, start, today, (log) => log.done === true);
assert.equal(record.longest, 14, "the longest run survives the gap");
assert.equal(record.current, 0, "the current run does not");

// Day states.
assert.equal(dayState(logs, dateKey(addDays(start, 0)), "2026-08-27"), "open", "a logged unclosed day is open");
assert.equal(dayState(logs, dateKey(addDays(start, 16)), "2026-08-27"), "offGrid", "an old missing day is off-grid, not failed");
assert.equal(dayState(logs, "2026-09-30", "2026-08-27"), "future", "tomorrow is not a failure either");

console.log("mission logic ok");
