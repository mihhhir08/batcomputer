"use client";

import { addDays } from "../../lib/mission/dates.ts";
import type { GoalName } from "../../lib/mission/types.ts";

const GATES = [
  { day: 1, label: "Begin" }, { day: 10, label: "Proof" }, { day: 25, label: "Rhythm" },
  { day: 45, label: "Halfway" }, { day: 60, label: "Systems locked" },
  { day: 75, label: "Finish mode" }, { day: 90, label: "Transform" },
];

/** Written as the mission runs, not unlocked at the end. */
export function DossierSector({
  start, dayNumber, daysRemaining, challengeScore, xp, level, floorDays, floorRun,
  weekEvidence, bestWeek, dossierCategories, caseEntries,
}: {
  start: Date;
  dayNumber: number;
  daysRemaining: number;
  challengeScore: number;
  xp: number;
  level: number;
  floorDays: number;
  floorRun: { current: number; longest: number };
  weekEvidence: { week: number; value: number; days: number }[];
  bestWeek?: { week: number; value: number };
  dossierCategories: { category: GoalName; value: number }[];
  caseEntries: { week: number; text: string }[];
}) {
  return (
    <div className="dossier-sector">
      <dl className="readout-strip wide">
        <div><dt>MISSION AVG</dt><dd>{challengeScore}%</dd></div>
        <div><dt>FLOOR HELD</dt><dd>{floorDays}d</dd></div>
        <div><dt>RECORD RUN</dt><dd>{floorRun.longest}d</dd></div>
        <div><dt>LEVEL</dt><dd>{String(level).padStart(2, "0")}</dd></div>
        <div><dt>XP</dt><dd>{xp.toLocaleString("en-CA")}</dd></div>
      </dl>

      <section className="dossier-block">
        <span className="console-label">SYSTEM AVERAGES / MISSION TO DATE</span>
        <div className="dossier-bars">
          {dossierCategories.map(({ category, value }) => (
            <div key={category}>
              <span>{category}</span>
              <i><b style={{ width: `${value}%` }} /></i>
              <strong>{value}%</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="dossier-block">
        <span className="console-label">WEEK BY WEEK</span>
        <div className="dossier-weeks">
          {weekEvidence.map((week) => (
            <div key={week.week} className={bestWeek && week.week === bestWeek.week ? "best" : ""}>
              <span>W{week.week}</span>
              <i><b style={{ height: `${Math.max(4, week.value)}%` }} /></i>
              <strong>{week.value}</strong>
            </div>
          ))}
          {!weekEvidence.length && <p className="dossier-empty">No completed weeks yet.</p>}
        </div>
      </section>

      <section className="dossier-block">
        <span className="console-label">MISSION GATES</span>
        <div className="dossier-gates">
          {GATES.map((gate) => (
            <div key={gate.day} className={dayNumber >= gate.day ? "reached" : ""}>
              <b>{String(gate.day).padStart(2, "0")}</b>
              <span>{gate.label}</span>
              <small>{addDays(start, gate.day - 1).toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="dossier-block case-log">
        <span className="console-label">CASE LOG / {daysRemaining} DAYS REMAINING</span>
        {caseEntries.length ? (
          caseEntries.map((entry) => (
            <article key={entry.week}>
              <b>WEEK {String(entry.week).padStart(2, "0")}</b>
              <p>{entry.text}</p>
            </article>
          ))
        ) : (
          <p className="dossier-empty">The case log fills in weekly as evidence accumulates.</p>
        )}
      </section>
    </div>
  );
}
