"use client";

import { Stepper } from "../ui/Stepper";
import { MEASURES } from "../../lib/mission/scoring";
import type { DayLog, SignalConfig } from "../../lib/mission/types";

function Trend({ signal, entries }: { signal: SignalConfig; entries: [string, number][] }) {
  if (entries.length < 2) {
    return <p className="weight-empty">Two entries start the trend. You have {entries.length}.</p>;
  }
  const unit = signal.unit ?? "";
  const values = entries.map(([, value]) => value);
  const min = Math.min(...values, ...(signal.band ?? [])) - 0.6;
  const max = Math.max(...values, ...(signal.band ?? [])) + 0.6;
  const x = (index: number) => 18 + (index / Math.max(entries.length - 1, 1)) * 364;
  const y = (value: number) => 14 + ((max - value) / Math.max(max - min, 1)) * 74;
  const points = entries.map(([, value], index) => `${x(index)},${y(value)}`).join(" ");

  return (
    <svg className="weight-trend" viewBox="0 0 400 108" role="img"
      aria-label={`${signal.label} from ${values[0]} to ${values.at(-1)} ${unit}`}>
      {signal.band && (
        <>
          <rect className="goal-band" x="18" y={y(signal.band[1])} width="364" height={Math.max(2, y(signal.band[0]) - y(signal.band[1]))} />
          <text className="axis-label" x="22" y={y(signal.band[1]) - 4}>GOAL {signal.band[0]}–{signal.band[1]}</text>
        </>
      )}
      <polyline className="weight-line" points={points} fill="none" />
      {entries.map(([date, value], index) => (
        <circle key={date} cx={x(index)} cy={y(value)} r="3"><title>{date} · {value} {unit}</title></circle>
      ))}
    </svg>
  );
}

function Measure({ signal, entries, todayLog, updateToday }: {
  signal: SignalConfig;
  entries: [string, number][];
  todayLog: DayLog;
  updateToday: (patch: Partial<DayLog>) => void;
}) {
  const unit = signal.unit ?? "";
  const first = entries[0]?.[1];
  const latest = entries.at(-1)?.[1];
  const change = latest !== undefined && first !== undefined ? latest - first : 0;
  const today = todayLog[signal.key];
  const [low, high] = signal.band ?? [];
  const toBand = latest === undefined || low === undefined || high === undefined
    ? null : latest > high ? latest - high : latest < low ? low - latest : 0;

  return (
    <>
      <div className="sector-toolbar">
        <dl className="readout-strip wide">
          <div><dt>{signal.label.toUpperCase()}</dt><dd>{latest === undefined ? "—" : `${latest.toFixed(1)} ${unit}`}</dd></div>
          <div><dt>FROM START</dt><dd>{change > 0 ? "+" : ""}{change.toFixed(1)} {unit}</dd></div>
          {toBand !== null && <div><dt>TO GOAL BAND</dt><dd>{toBand === 0 ? "IN BAND" : `${toBand.toFixed(1)} ${unit}`}</dd></div>}
          <div><dt>ENTRIES</dt><dd>{entries.length}</dd></div>
        </dl>
      </div>

      <section className="weigh-in">
        <span className="console-label">LOG AGAINST TODAY</span>
        <Stepper label={`${signal.label} in ${unit}`} value={typeof today === "number" ? today : latest ?? low ?? 0}
          step={signal.step ?? 1} unit={unit} complete={typeof today === "number"}
          onChange={(value) => updateToday({ [signal.key]: value })} />
      </section>

      <Trend signal={signal} entries={entries.slice(-16)} />
    </>
  );
}

/** Every `measure` signal from mission.config.ts: watched, never scored. */
export function MetricsSector({ todayLog, measures, updateToday }: {
  todayLog: DayLog;
  measures: Record<string, [string, number][]>;
  updateToday: (patch: Partial<DayLog>) => void;
}) {
  return (
    <div className="body-sector">
      {MEASURES.map((signal) => (
        <Measure key={signal.key} signal={signal} entries={measures[signal.key] ?? []}
          todayLog={todayLog} updateToday={updateToday} />
      ))}

      <p className="body-note">
        {MEASURES.length
          ? "A measure is directional, not a verdict. It is never scored and never included in a share link."
          : "No measures configured. Add a signal with type \"measure\" in mission.config.ts to chart it here."}
      </p>
    </div>
  );
}
