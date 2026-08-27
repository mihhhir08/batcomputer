"use client";

import { useState } from "react";
import { sound } from "../../lib/audio/console";
import { addDays, dateFromKey, dateKey } from "../../lib/mission/dates";
import { dayState } from "../../lib/mission/gaps";
import { floorChecks, floorHeld } from "../../lib/mission/floor";
import { score } from "../../lib/mission/scoring";
import { EMPTY_LOG, type Logs } from "../../lib/mission/types";

/** The 90-day record. Every cell opens without leaving the sector. */
export function ArchiveSector({ logs, start, todayKey, jobSecuredOn, instagramStartedOn }: {
  logs: Logs;
  start: Date;
  todayKey: string;
  jobSecuredOn: string | null;
  instagramStartedOn: string | null;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const days = Array.from({ length: 90 }, (_, index) => addDays(start, index));

  const openLog = open ? logs[open] : undefined;
  const openScore = open ? score(openLog ?? EMPTY_LOG, open, jobSecuredOn, instagramStartedOn) : 0;
  const openDay = open ? Math.round((dateFromKey(open).getTime() - start.getTime()) / 86400000) + 1 : 0;
  const openState = open ? dayState(logs, open, todayKey) : "future";

  return (
    <div className="archive-sector">
      <div className="archive-map" role="group" aria-label="90-day record">
        {days.map((date, index) => {
          const key = dateKey(date);
          const log = logs[key];
          const state = dayState(logs, key, todayKey);
          const value = score(log ?? EMPTY_LOG, key, jobSecuredOn, instagramStartedOn);
          const band = state === "future" ? "future" : !log ? state : value >= 75 ? "high" : value >= 40 ? "mid" : "low";
          return (
            <button key={key} type="button"
              className={`archive-cell ${band}${log && floorHeld(log) ? " floor" : ""}${open === key ? " open" : ""}`}
              aria-pressed={open === key}
              aria-label={`Day ${index + 1}, ${state}, ${value} percent`}
              title={`Day ${index + 1} · ${key} · ${state.toUpperCase()}`}
              onClick={() => { setOpen(open === key ? null : key); sound.focus(); }}>
              <span aria-hidden="true">{index + 1}</span>
            </button>
          );
        })}
      </div>

      <div className="archive-legend">
        <span><i className="archive-cell low" />Low</span>
        <span><i className="archive-cell mid" />Mid</span>
        <span><i className="archive-cell high" />High</span>
        <span><i className="archive-cell offGrid" />Off-grid</span>
        <span><i className="archive-cell unlogged" />Unlogged</span>
        <span><i className="archive-cell floor high" />Floor held</span>
      </div>

      {open && (
        <section className="archive-record">
          <header>
            <span className="console-label">DAY {String(openDay).padStart(2, "0")} / {open}</span>
            <strong>{openState.toUpperCase()}</strong>
            <em>{openLog ? `${openScore}%` : "NO RECORD"}</em>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close record">×</button>
          </header>
          {openLog ? (
            <ul className="archive-signals">
              {floorChecks(openLog).map((check) => (
                <li key={check.key} className={check.met ? "met" : ""}>
                  <b>{check.label}</b><span>{check.reading}</span>
                </li>
              ))}
              <li className={openLog.closedAt ? "met" : ""}>
                <b>Record</b><span>{openLog.closedAt ? "Closed deliberately" : "Left open"}</span>
              </li>
            </ul>
          ) : (
            <p>
              {openState === "offGrid"
                ? "Sealed off-grid. Life happened; it is not counted against you."
                : openState === "future"
                  ? "Ahead of the mission clock."
                  : "Not logged yet. Still open to record."}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
