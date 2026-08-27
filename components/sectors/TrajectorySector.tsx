"use client";

import { TrendChart } from "../charts/TrendChart";
import { sound } from "../../lib/audio/console";
import { addDays } from "../../lib/mission/dates";
import type { Logs } from "../../lib/mission/types";

export function TrajectorySector({
  logs, today, dayNumber, range, onRange, jobSecuredOn, instagramStartedOn, weeklyScore, challengeScore, floorDays,
}: {
  logs: Logs;
  today: Date;
  dayNumber: number;
  range: 14 | 30 | 90;
  onRange: (range: 14 | 30 | 90) => void;
  jobSecuredOn: string | null;
  instagramStartedOn: string | null;
  weeklyScore: number;
  challengeScore: number;
  floorDays: number;
}) {
  const span = Math.min(range, Math.max(dayNumber, 1));
  const dates = Array.from({ length: span }, (_, index) => addDays(today, index - span + 1));

  return (
    <div className="trajectory-sector">
      <div className="sector-toolbar">
        <div className="range-switch" role="group" aria-label="Scan window">
          {([14, 30, 90] as const).map((option) => (
            <button key={option} type="button" className={range === option ? "active" : ""}
              aria-pressed={range === option}
              onClick={() => { onRange(option); sound.toggle(); }}>
              {option}D
            </button>
          ))}
        </div>
        <dl className="readout-strip">
          <div><dt>THIS WEEK</dt><dd>{weeklyScore}%</dd></div>
          <div><dt>MISSION AVG</dt><dd>{challengeScore}%</dd></div>
          <div><dt>FLOOR HELD</dt><dd>{floorDays}d</dd></div>
        </dl>
      </div>

      <TrendChart logs={logs} dates={dates} jobSecuredOn={jobSecuredOn} instagramStartedOn={instagramStartedOn} />
    </div>
  );
}
