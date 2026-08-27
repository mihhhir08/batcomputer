export type BinaryKey =
  | "x" | "linkedin" | "instagram" | "cleanFood" | "protein"
  | "strength" | "scalpMassage" | "careerGrowth";

export type GoalName = "Audience" | "Career" | "Body" | "Hair";

export type DayLog = Record<BinaryKey, boolean> & {
  jobs: number;
  steps: number;
  water: number;
  xPosts?: number;
  recovery: boolean;
  weight?: number;
  /** @deprecated v2 dropped waist tracking. Tolerated on read, never written. */
  waist?: number;
  closedAt?: string | null;
};

export type Logs = Record<string, DayLog>;

export type SyncState = "local" | "saving" | "saved" | "error";

/** Mission clock. Fixed for this challenge; not user-configurable. */
export const START_DATE = "2026-08-07";
export const WELLNESS_START_DATE = "2026-08-08";
export const CONTENT_VOLUME_START_DATE = "2026-08-08";
export const SKILL_GROWTH_START_DATE = "2026-08-08";
export const WEIGHTED_SCORE_START_DATE = "2026-08-08";

export const EMPTY_LOG: DayLog = {
  x: false,
  linkedin: false,
  instagram: false,
  cleanFood: false,
  protein: false,
  strength: false,
  scalpMassage: false,
  careerGrowth: false,
  jobs: 0,
  steps: 0,
  water: 0,
  recovery: false,
};

export const HABITS: { key: BinaryKey; label: string; note: string; group: GoalName }[] = [
  { key: "x", label: "Post on X", note: "Build daily distribution", group: "Audience" },
  { key: "linkedin", label: "Post on LinkedIn", note: "Build authority and opportunity", group: "Audience" },
  { key: "instagram", label: "Post on Instagram", note: "Build the new channel", group: "Audience" },
  { key: "careerGrowth", label: "Career opportunity block", note: "45 focused min · skill, project, interview prep or outreach", group: "Career" },
  { key: "cleanFood", label: "Clean food only", note: "Whole foods, no junk", group: "Body" },
  { key: "protein", label: "Protein target", note: "Hit your daily target", group: "Body" },
  { key: "strength", label: "Kettlebell strength", note: "Complete the session", group: "Body" },
  { key: "scalpMassage", label: "Scalp massage", note: "Daily consistency for healthier hair", group: "Hair" },
];

export const GOAL_COLORS: Record<GoalName, string> = {
  Audience: "#78ddeb",
  Career: "#68b99b",
  Body: "#82b6d3",
  Hair: "#718d9c",
};

/** Maximum weighted points each goal can contribute to a single day. */
export const GOAL_TOTALS: Record<GoalName, number> = {
  Audience: 35,
  Career: 25,
  Body: 30,
  Hair: 10,
};
