"use client";

import { Stepper } from "../ui/Stepper.tsx";
import type { DayLog } from "../../lib/mission/types.ts";

const START_WEIGHT = 0;
const GOAL_LOW = 0;
const GOAL_HIGH = 0;

function WeightTrend({ entries }: { entries: [string, number][] }) {
  if (entries.length < 2) {
    return <p className="weight-empty">Two weigh-ins start the trend. You have {entries.length}.</p>;
  }
  const values = entries.map(([, value]) => value);
  const min = Math.min(...values, GOAL_LOW) - 0.6;
  const max = Math.max(...values) + 0.6;
  const x = (index: number) => 18 + (index / Math.max(entries.length - 1, 1)) * 364;
  const y = (value: number) => 14 + ((max - value) / Math.max(max - min, 1)) * 74;
  const points = entries.map(([, value], index) => `${x(index)},${y(value)}`).join(" ");

  return (
    <svg className="weight-trend" viewBox="0 0 400 108" role="img"
      aria-label={`Weight from ${values[0]} to ${values.at(-1)} kilograms`}>
      <rect className="goal-band" x="18" y={y(GOAL_HIGH)} width="364" height={Math.max(2, y(GOAL_LOW) - y(GOAL_HIGH))} />
      <text className="axis-label" x="22" y={y(GOAL_HIGH) - 4}>GOAL {GOAL_LOW}–{GOAL_HIGH}</text>
      <polyline className="weight-line" points={points} fill="none" />
      {entries.map(([date, value], index) => (
        <circle key={date} cx={x(index)} cy={y(value)} r="3"><title>{date} · {value} kg</title></circle>
      ))}
    </svg>
  );
}

export function BodySector({ todayLog, weights, updateToday }: {
  todayLog: DayLog;
  weights: [string, number][];
  updateToday: (patch: Partial<DayLog>) => void;
}) {
  const latest = weights.at(-1)?.[1] ?? START_WEIGHT;
  const change = latest - START_WEIGHT;
  const toGoal = latest > GOAL_HIGH ? latest - GOAL_HIGH : latest < GOAL_LOW ? GOAL_LOW - latest : 0;

  return (
    <div className="body-sector">
      <div className="sector-toolbar">
        <dl className="readout-strip wide">
          <div><dt>LATEST</dt><dd>{latest.toFixed(1)} kg</dd></div>
          <div><dt>FROM START</dt><dd>{change > 0 ? "+" : ""}{change.toFixed(1)} kg</dd></div>
          <div><dt>TO GOAL BAND</dt><dd>{toGoal === 0 ? "IN BAND" : `${toGoal.toFixed(1)} kg`}</dd></div>
          <div><dt>ENTRIES</dt><dd>{weights.length}</dd></div>
        </dl>
      </div>

      <section className="weigh-in">
        <span className="console-label">LOG AGAINST TODAY</span>
        <Stepper label="weight in kilograms" value={todayLog.weight ?? latest} step={0.1} unit="kg"
          complete={typeof todayLog.weight === "number"}
          onChange={(weight) => updateToday({ weight })} />
      </section>

      <WeightTrend entries={weights.slice(-16)} />

      <p className="body-note">
        Weekly weight is directional, not a verdict. Read it beside strength consistency
        and how the work actually felt.
      </p>
    </div>
  );
}
