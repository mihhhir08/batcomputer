"use client";

import { Decode } from "../shell/Decode.tsx";
import { sound } from "../../lib/audio/console.ts";
import { addDays, dateKey } from "../../lib/mission/dates.ts";
import { runs } from "../../lib/mission/gaps.ts";
import { signalCatalog, type SignalKey } from "../../lib/mission/signals.ts";
import { EMPTY_LOG, type Logs } from "../../lib/mission/types.ts";

/**
 * Interrogation. Choosing a signal reorganises the whole sector around it
 * rather than updating a widget in the corner.
 */
export function SignalsSector({
  logs, start, today, todayKey, selected, onSelect, jobSecuredOn, instagramStartedOn, dayNumber,
}: {
  logs: Logs;
  start: Date;
  today: Date;
  todayKey: string;
  selected: SignalKey;
  onSelect: (key: SignalKey) => void;
  jobSecuredOn: string | null;
  instagramStartedOn: string | null;
  dayNumber: number;
}) {
  const catalog = signalCatalog(todayKey, jobSecuredOn, instagramStartedOn);
  const signal = catalog.find((entry) => entry.key === selected) ?? catalog[0];

  const window = Math.min(28, dayNumber);
  const dates = Array.from({ length: window }, (_, index) => addDays(today, index - window + 1));
  const record = runs(logs, start, today, signal.complete);

  const evidence = dates.flatMap((date) => (logs[dateKey(date)] ? [logs[dateKey(date)]] : []));
  const rate = evidence.length ? Math.round((evidence.filter(signal.complete).length / evidence.length) * 100) : 0;
  const missionDays = Array.from({ length: dayNumber }, (_, index) => addDays(start, index));
  const cleared = missionDays.filter((date) => logs[dateKey(date)] && signal.complete(logs[dateKey(date)])).length;

  return (
    <div className="signals-sector">
      <nav className="signal-list" aria-label="Signals">
        {catalog.map((entry) => (
          <button key={entry.key} type="button"
            className={entry.key === signal.key ? "signal-pick active" : "signal-pick"}
            aria-current={entry.key === signal.key ? "true" : undefined}
            onClick={() => { onSelect(entry.key); sound.focus(); }}>
            <span className="signal-pick-name">{entry.label}</span>
            <span className="signal-pick-group">{entry.group}</span>
          </button>
        ))}
      </nav>

      <section className="signal-scope">
        <header>
          <span className="console-label">UNDER INTERROGATION</span>
          <h3><Decode key={signal.key} text={signal.label.toUpperCase()} /></h3>
          <p>Target · {signal.target}</p>
        </header>

        <div className="signal-reading">
          <strong>{signal.reading(logs[todayKey] ?? EMPTY_LOG)}</strong>
          <em>TODAY</em>
        </div>

        <div className="signal-history" aria-label={`${signal.label} last ${window} days`}>
          {dates.map((date) => {
            const log = logs[dateKey(date)];
            const state = !log ? "unknown" : signal.complete(log) ? "held" : "missed";
            return <i key={dateKey(date)} className={state}
              title={`${dateKey(date)} · ${log ? signal.reading(log) : "No record"}`} />;
          })}
        </div>

        <dl className="signal-stats">
          <div><dt>CURRENT RUN</dt><dd>{record.current}d</dd></div>
          <div><dt>RECORD RUN</dt><dd>{record.longest}d</dd></div>
          <div><dt>{window}-DAY RATE</dt><dd>{rate}%</dd></div>
          <div><dt>MISSION DAYS</dt><dd>{cleared}</dd></div>
        </dl>

        <p className="signal-note">
          {evidence.length} actual records in the last {window} days. Empty positions are
          unknown, not failed.
        </p>
      </section>
    </div>
  );
}
