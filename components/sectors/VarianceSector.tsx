"use client";

import { GOAL_COLORS, type GoalName } from "../../lib/mission/types.ts";

export function VarianceSector({
  weeklyCategories, previousCategories, hasPreviousWeek, weeklyScore, previousScore,
  weeklyDelta, weekIndex, weekDayCount, weekLoggedCount, weekClosedCount, strongest, weakest,
}: {
  weeklyCategories: { category: GoalName; value: number }[];
  previousCategories: { category: GoalName; value: number }[];
  hasPreviousWeek: boolean;
  weeklyScore: number;
  previousScore: number;
  weeklyDelta: number;
  weekIndex: number;
  weekDayCount: number;
  weekLoggedCount: number;
  weekClosedCount: number;
  strongest: { category: GoalName; value: number };
  weakest: { category: GoalName; value: number };
}) {
  return (
    <div className="variance-sector">
      <div className="sector-toolbar">
        <div className="variance-headline">
          <span className="console-label">WEEK {String(weekIndex + 1).padStart(2, "0")} / DAYS 1–{weekDayCount}</span>
          <strong>{weeklyScore}<small>/100</small></strong>
          {hasPreviousWeek && (
            <em className={weeklyDelta >= 0 ? "delta up" : "delta down"}>
              {weeklyDelta >= 0 ? "▲" : "▼"} {Math.abs(weeklyDelta)}% vs {previousScore}
            </em>
          )}
        </div>
        <dl className="readout-strip">
          <div><dt>RECORDED</dt><dd>{weekLoggedCount}/{weekDayCount}</dd></div>
          <div><dt>CLOSED</dt><dd>{weekClosedCount}</dd></div>
        </dl>
      </div>

      <div className="variance-grid">
        {weeklyCategories.map(({ category, value }) => {
          const prior = previousCategories.find((entry) => entry.category === category)?.value ?? 0;
          const change = hasPreviousWeek ? value - prior : 0;
          return (
            <section key={category} className="variance-card" style={{ "--goal": GOAL_COLORS[category] } as React.CSSProperties}>
              <header>
                <span><i />{category}</span>
                <em className={!hasPreviousWeek ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat"}>
                  {hasPreviousWeek ? `${change > 0 ? "↑" : change < 0 ? "↓" : "→"} ${Math.abs(change)}%` : "WEEK 1"}
                </em>
              </header>
              <strong className="variance-value">{value}<small>%</small></strong>
              <div className="variance-bars">
                <div><span>NOW</span><i><b style={{ width: `${value}%` }} /></i></div>
                {hasPreviousWeek && <div className="prior"><span>PRIOR</span><i><b style={{ width: `${prior}%` }} /></i></div>}
              </div>
            </section>
          );
        })}
      </div>

      <div className="variance-summary">
        <div><span className="console-label">STRONGEST</span><strong>{strongest.category}</strong><em>{strongest.value}%</em></div>
        <div><span className="console-label">WEAKEST</span><strong>{weakest.category}</strong><em>{weakest.value}%</em></div>
      </div>
    </div>
  );
}
