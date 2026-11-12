import type { MissionConfig } from "./lib/mission/types";

// ─────────────────────────────────────────────────────────────────────────────
// THIS IS THE ONLY FILE YOU NEED TO EDIT TO MAKE THE TERMINAL YOURS.
//
// A signal is one thing you track each day. Pick how it is counted:
//
//   type: "check"    Done or not done. Ticking it earns all of its points.
//   type: "count"    A number toward a daily target (steps, pages, litres).
//                    Half the target earns half the points, unless you set
//                    `tiers`, which pays fixed points at fixed thresholds.
//   type: "measure"  A number you only watch (weight, sleep). Never scored,
//                    never shared, charted in the METRICS sector.
//
// Points are relative. They do not have to add up to 100: the day's score is
// points earned divided by points available.
//
// `floor` marks the few signals that decide whether a day counts at all.
//   floor: true   the signal must be complete
//   floor: 1      a count only has to reach 1 (keep the floor easy to clear)
//
// Run `npm test` after editing. It checks this file for mistakes.
// ─────────────────────────────────────────────────────────────────────────────

export const mission: MissionConfig = {
  /** Length of the challenge in days. */
  days: 90,

  /** Your timezone (IANA name). Decides when "today" rolls over. */
  timezone: "America/New_York",

  /** Number and date formatting. */
  locale: "en-US",

  /** How Alfred addresses you: "sir", "ma'am", "boss". */
  honorific: "sir",

  /** The big areas your signals roll up into. Each gets its own score. */
  goals: [
    { id: "Body", color: "#82b6d3" },
    { id: "Mind", color: "#68b99b" },
    { id: "Work", color: "#78ddeb" },
  ],

  signals: [
    // Body
    { key: "steps", label: "Steps", goal: "Body", type: "count", target: 10000, step: 500, unit: "steps", points: 15, floor: true },
    { key: "workout", label: "Workout", note: "Any session that makes you sweat", goal: "Body", type: "check", points: 15 },
    { key: "water", label: "Water", goal: "Body", type: "count", target: 3, step: 0.25, unit: "L", points: 5,
      tiers: [[1, 1], [2, 3], [3, 5]] },

    // Mind
    { key: "read", label: "Reading", goal: "Mind", type: "count", target: 20, step: 5, unit: "pages", points: 15, floor: 1 },
    { key: "journal", label: "Journal", note: "Three honest lines", goal: "Mind", type: "check", points: 10 },

    // Work
    { key: "deepWork", label: "Deep work", note: "Focused 50-minute blocks", goal: "Work", type: "count", target: 4, step: 1, unit: "blocks", points: 25 },
    { key: "ship", label: "Ship something", note: "A commit, a post, a pitch: anything public", goal: "Work", type: "check", points: 15, floor: true },

    // Watched, never scored. Add `band: [70, 72]` to draw a goal range.
    { key: "weight", label: "Weight", type: "measure", unit: "kg", step: 0.1 },
  ],
};
