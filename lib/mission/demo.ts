import { EMPTY_LOG, type Logs } from "./types.ts";

/** Shown only before the mission is started, so the terminal is never empty. */
export const DEMO_LOGS: Logs = {
  "2026-08-01": { ...EMPTY_LOG, x: true, linkedin: true, cleanFood: true, protein: true, strength: true, jobs: 10, steps: 10420 },
  "2026-08-02": { ...EMPTY_LOG, x: true, instagram: true, cleanFood: true, protein: true, jobs: 8, steps: 9210 },
  "2026-08-03": { ...EMPTY_LOG, x: true, linkedin: true, instagram: true, cleanFood: true, protein: true, strength: true, jobs: 10, steps: 11320 },
  "2026-08-04": { ...EMPTY_LOG, x: true, linkedin: true, cleanFood: true, strength: true, jobs: 7, steps: 8720 },
  "2026-08-05": { ...EMPTY_LOG, x: true, linkedin: true, instagram: true, cleanFood: true, protein: true, strength: true, jobs: 10, steps: 12040 },
  "2026-08-06": { ...EMPTY_LOG, x: true, linkedin: true, instagram: true, cleanFood: true, protein: true, strength: true, jobs: 9, steps: 10110 },
};

export const STORAGE = {
  logs: "momentum-90-logs",
  start: "momentum-90-start",
  started: "momentum-90-started",
  jobSecured: "momentum-90-job-secured",
  instagramStarted: "momentum-90-instagram-started",
} as const;

/** v2 dropped waist. Strip it on read so it can never come back through a restore. */
export function stripRetired(logs: Logs): Logs {
  return Object.fromEntries(
    Object.entries(logs).map(([key, log]) => {
      const { waist: _retired, ...kept } = log;
      return [key, { ...EMPTY_LOG, ...kept }];
    }),
  );
}
