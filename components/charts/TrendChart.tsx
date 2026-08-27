"use client";

import { dateKey } from "../../lib/mission/dates";
import { categoryScores } from "../../lib/mission/scoring";
import { GOAL_COLORS, type Logs } from "../../lib/mission/types";

type Point = { x: number; y: number };
type Observation = { index: number; value: number };

function curve(points: Point[]) {
  if (points.length === 1) return `M${points[0].x - 9},${points[0].y} H${points[0].x + 9}`;
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const control = (point.x - previous.x) * 0.45;
    return `${path} C${previous.x + control},${previous.y} ${point.x - control},${point.y} ${point.x},${point.y}`;
  }, `M${points[0].x},${points[0].y}`);
}

/**
 * Splits a series wherever a day is missing. A break in the line is the honest
 * shape of a gap; joining across it would draw progress that never happened.
 */
function segments(observations: Observation[]) {
  const out: Observation[][] = [];
  let run: Observation[] = [];
  observations.forEach((observation) => {
    if (run.length && observation.index !== run.at(-1)!.index + 1) {
      out.push(run);
      run = [];
    }
    run.push(observation);
  });
  if (run.length) out.push(run);
  return out;
}

export function TrendChart({ logs, dates, jobSecuredOn, instagramStartedOn }: {
  logs: Logs;
  dates: Date[];
  jobSecuredOn: string | null;
  instagramStartedOn: string | null;
}) {
  const series = (["Overall", "Audience", "Career"] as const).map((name) => ({
    name,
    color: name === "Overall" ? "#78ddeb" : GOAL_COLORS[name as "Audience" | "Career"],
    observations: dates.flatMap((date, index) => {
      const log = logs[dateKey(date)];
      if (!log) return [];
      const values = categoryScores(log, dateKey(date), jobSecuredOn, instagramStartedOn);
      return [{ index, value: values[name] }];
    }),
  }));

  const x = (index: number) => (dates.length === 1 ? 392 : 44 + (index / (dates.length - 1)) * 696);
  const y = (value: number) => 18 + ((100 - value) / 100) * 190;
  const overall = series[0];

  // Runs of missing days inside the visible window, drawn as dark bands.
  const holes: { from: number; to: number }[] = [];
  let holeStart = -1;
  dates.forEach((date, index) => {
    const missing = !logs[dateKey(date)];
    if (missing && holeStart < 0) holeStart = index;
    if (!missing && holeStart >= 0) {
      holes.push({ from: holeStart, to: index - 1 });
      holeStart = -1;
    }
  });
  if (holeStart >= 0) holes.push({ from: holeStart, to: dates.length - 1 });

  return (
    <div className="trend-wrap">
      <div className="chart-legend">
        {series.map(({ name, color }) => (
          <span key={name} className="chart-key"><i style={{ background: color }} />{name}</span>
        ))}
        <span className="chart-key off-grid"><i />Off-grid</span>
      </div>

      <svg className="trend-chart" viewBox="0 0 760 245" role="img"
        aria-label="Overall, audience and career trends with off-grid days shown as breaks">
        <rect className="target-zone" x="44" y={y(100)} width="696" height={y(70) - y(100)} />
        <text x="52" y={y(70) - 7} className="target-label">TARGET BAND · 70–100</text>

        {[0, 50, 100].map((value) => (
          <g key={value}>
            <line x1="44" x2="740" y1={y(value)} y2={y(value)} className="grid-line" />
            <text x="6" y={y(value) + 4} className="axis-label">{value}%</text>
          </g>
        ))}

        {holes.map((hole) => {
          const left = x(Math.max(0, hole.from - 0.5));
          const right = x(Math.min(dates.length - 1, hole.to + 0.5));
          return (
            <g key={`hole-${hole.from}`} className="off-grid-band">
              <rect x={left} y={y(100)} width={Math.max(2, right - left)} height={y(0) - y(100)} />
              {right - left > 26 && (
                <text x={(left + right) / 2} y={y(50)} textAnchor="middle">OFF-GRID</text>
              )}
            </g>
          );
        })}

        {series.map(({ name, color, observations }) =>
          segments(observations).map((segment, segmentIndex) => (
            <path
              key={`${name}-${segmentIndex}`}
              className="trend-line"
              d={curve(segment.map(({ index, value }) => ({ x: x(index), y: y(value) })))}
              fill="none"
              stroke={color}
              strokeWidth={name === "Overall" ? 3 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )))}

        {overall.observations.map(({ index, value }) => (
          <circle key={`dot-${index}`} className="trend-dot" cx={x(index)} cy={y(value)} r="2.6">
            <title>
              {dates[index].toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })} · {value}%
            </title>
          </circle>
        ))}

        {dates.map((date, index) => (index === 0 || index === dates.length - 1) && (
          <text key={dateKey(date)} x={x(index)} y="235" textAnchor="middle" className="axis-label">
            {date.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })}
          </text>
        ))}

        {!overall.observations.length && (
          <text x="392" y="120" textAnchor="middle" className="baseline-note">NO RECORDS IN THIS WINDOW</text>
        )}
      </svg>
    </div>
  );
}
