export type SignalType = "check" | "count" | "measure";

/** One tracked thing. See mission.config.ts for what each field does. */
export type SignalConfig = {
  key: string;
  label: string;
  note?: string;
  type: SignalType;
  /** Which goal the points roll up into. Required unless type is "measure". */
  goal?: string;
  points?: number;
  /** Daily target for a count. */
  target?: number;
  /** How much one press of + or − moves a number. */
  step?: number;
  unit?: string;
  /** [threshold, points] pairs. Replaces proportional credit for a count. */
  tiers?: [number, number][];
  /** true: must be complete for the day to count. A number: a count must reach it. */
  floor?: boolean | number;
  /** Goal range drawn on a measure's trend. */
  band?: [number, number];
};

export type GoalConfig = { id: string; color: string };

export type MissionConfig = {
  days: number;
  timezone: string;
  locale: string;
  honorific: string;
  goals: GoalConfig[];
  signals: SignalConfig[];
};

/** One day's record, keyed by signal. Checks hold booleans, the rest numbers. */
export type DayLog = {
  [key: string]: number | boolean | string | null | undefined;
  closedAt?: string | null;
};

export type Logs = Record<string, DayLog>;

export type SyncState = "local" | "saving" | "saved" | "error";

export const EMPTY_LOG: DayLog = {};
