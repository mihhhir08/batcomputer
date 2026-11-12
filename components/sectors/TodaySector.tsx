"use client";

import { Stepper } from "../ui/Stepper";
import { sound } from "../../lib/audio/console";
import { FLOOR, floorAt, floorHeld, floorMetCount } from "../../lib/mission/floor";
import { SCORED, amount, complete, fmt, score, targetOf } from "../../lib/mission/scoring";
import type { DayLog, SignalConfig } from "../../lib/mission/types";

function hint(signal: SignalConfig) {
  if (signal.note) return signal.note;
  if (signal.type === "check") return "Daily";
  const unit = signal.unit ?? "";
  const full = `${fmt(targetOf(signal))} ${unit}`.trim();
  return signal.floor && floorAt(signal) < targetOf(signal)
    ? `${fmt(floorAt(signal))} clears the floor · ${full} earns full points`
    : `Target · ${full}`;
}

/**
 * The only sector that writes. Floor signals sit above the fold and are
 * visually separated from everything else, because clearing them is the job
 * and the rest is optional. Both lists come from mission.config.ts.
 */
export function TodaySector({ todayLog, updateToday }: {
  todayLog: DayLog;
  updateToday: (patch: Partial<DayLog>) => void;
}) {
  const held = floorHeld(todayLog);
  const todayScore = score(todayLog);

  function write(patch: Partial<DayLog>, quiet = false) {
    updateToday(patch);
    if (!held && floorHeld({ ...todayLog, ...patch })) sound.floorHeld();
    else if (!quiet) sound.commit();
  }

  function row(signal: SignalConfig) {
    const value = amount(todayLog, signal.key);
    const impact = `${signal.goal} · ${signal.points ?? 0} pts`;

    if (signal.type === "check") {
      return (
        <label key={signal.key} className={value ? "queue-row check met" : "queue-row check"}>
          <input type="checkbox" checked={Boolean(value)} onChange={() => write({ [signal.key]: !value })} />
          <span className="queue-mark" aria-hidden="true" />
          <span className="queue-copy"><strong>{signal.label}</strong><small>{hint(signal)}</small></span>
          <span className="queue-impact">{impact}</span>
        </label>
      );
    }

    const met = signal.floor ? value >= floorAt(signal) : complete(todayLog, signal);
    return (
      <div key={signal.key} className={met ? "queue-row met" : "queue-row"}>
        <span className="queue-copy"><strong>{signal.label}</strong><small>{hint(signal)} · {impact}</small></span>
        <Stepper label={`${signal.label} today`} value={value} step={signal.step ?? 1} unit={signal.unit ?? ""}
          complete={complete(todayLog, signal)} onChange={(next) => write({ [signal.key]: next }, true)} />
      </div>
    );
  }

  return (
    <div className="today-sector">
      <section className={held ? "queue-block floor-block held" : "queue-block floor-block"}>
        <header>
          <span className="console-label">NON-NEGOTIABLE / THE FLOOR</span>
          <strong>{held ? "HELD" : `${floorMetCount(todayLog)}/${FLOOR.length}`}</strong>
        </header>
        {FLOOR.map(row)}
      </section>

      <section className="queue-block">
        <header>
          <span className="console-label">BEYOND THE FLOOR / OPTIONAL</span>
          <strong>{todayScore}<small>/100</small></strong>
        </header>
        {SCORED.filter((signal) => !signal.floor).map(row)}
      </section>

      <div className={todayLog.closedAt ? "close-bar closed" : "close-bar"}>
        <span>
          <b>{todayLog.closedAt ? "RECORD CLOSED" : "RECORD OPEN"}</b>
          {todayLog.closedAt ? "Closed deliberately. Reopen if you spot a mistake." : "Close it when you are done, so a real result reads differently from missing data."}
        </span>
        <button type="button" onClick={() => {
          updateToday({ closedAt: todayLog.closedAt ? null : new Date().toISOString() });
          sound.commit();
        }}>
          {todayLog.closedAt ? "REOPEN" : `CLOSE AT ${todayScore}%`}
        </button>
      </div>
    </div>
  );
}
