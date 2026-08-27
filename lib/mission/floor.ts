import { DayLog } from "./types";
import { xPostCount } from "./scoring";

// The floor is not the goal. It is the line under which a day stops counting.
// It must stay clearable on your worst day, or it is just another ceiling.

export const STEP_FLOOR = 10000;

export type FloorKey = "steps" | "publish" | "scalp";

export type FloorCheck = {
  key: FloorKey;
  label: string;
  detail: string;
  met: boolean;
  reading: string;
};

/**
 * One post on any channel clears the publish floor. Requiring all three would
 * make the floor unreachable on a bad day, which is what broke v1.
 */
export function published(log: DayLog) {
  return xPostCount(log) > 0 || log.linkedin || log.instagram;
}

export function floorChecks(log: DayLog): FloorCheck[] {
  const posts = xPostCount(log);
  const channels = [
    posts > 0 && `${posts} on X`,
    log.linkedin && "LinkedIn",
    log.instagram && "Instagram",
  ].filter(Boolean) as string[];

  return [
    {
      key: "steps",
      label: "Movement",
      detail: `${STEP_FLOOR.toLocaleString("en-CA")} steps`,
      met: log.steps >= STEP_FLOOR,
      reading: log.steps.toLocaleString("en-CA"),
    },
    {
      key: "publish",
      label: "Distribution",
      detail: "Publish on any channel",
      met: published(log),
      reading: channels.length ? channels.join(" · ") : "Nothing published",
    },
    {
      key: "scalp",
      label: "Recovery",
      detail: "Scalp massage",
      met: log.scalpMassage,
      reading: log.scalpMassage ? "Complete" : "Open",
    },
  ];
}

/** A day counts when all three hold. Binary, and deliberately unweighted. */
export function floorHeld(log: DayLog) {
  return floorChecks(log).every((check) => check.met);
}

export function floorMetCount(log: DayLog) {
  return floorChecks(log).filter((check) => check.met).length;
}
