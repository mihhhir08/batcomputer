"use client";

import { useCountUp } from "../../lib/motion/useDecode";
import { Decode } from "../shell/Decode";
import { floorChecks, floorHeld } from "../../lib/mission/floor";
import { score } from "../../lib/mission/scoring";
import type { Gap } from "../../lib/mission/gaps";
import type { DayLog } from "../../lib/mission/types";

/**
 * The sector you land on. Answers three questions in order: does today count
 * yet, what did the machine notice, and how far through the mission are you.
 */
export function CommandSector({
  todayLog, todayKey, jobSecuredOn, instagramStartedOn, dayNumber, daysRemaining,
  level, xp, nextLevelXp, gap, gapAcknowledged, onAcknowledgeGap, alfred, alfredPending,
  longestFloorRun, currentFloorRun, onOpenToday,
}: {
  todayLog: DayLog;
  todayKey: string;
  jobSecuredOn: string | null;
  instagramStartedOn: string | null;
  dayNumber: number;
  daysRemaining: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  gap: Gap | null;
  gapAcknowledged: boolean;
  onAcknowledgeGap: () => void;
  alfred: string | null;
  alfredPending: boolean;
  longestFloorRun: number;
  currentFloorRun: number;
  onOpenToday: () => void;
}) {
  const checks = floorChecks(todayLog);
  const held = floorHeld(todayLog);
  const met = checks.filter((check) => check.met).length;
  const todayScore = score(todayLog, todayKey, jobSecuredOn, instagramStartedOn);
  const shownScore = Math.round(useCountUp(todayScore));

  return (
    <div className="command-sector">
      {gap && !gapAcknowledged && (
        <section className="return-protocol" role="status">
          <div className="return-head">
            <Decode text={`SIGNAL LOST // ${String(gap.days).padStart(2, "0")} DAYS`} />
            <span>{gap.from} → {gap.to}</span>
          </div>
          <p>
            Those days are sealed as <b>OFF-GRID</b>. They are not failures and they
            do not count against your record. Your longest run of {longestFloorRun} days
            still stands.
          </p>
          <button type="button" onClick={onAcknowledgeGap}>ACKNOWLEDGE · RESUME OPERATION</button>
        </section>
      )}

      <div className="command-grid">
        <section className={held ? "floor-console held" : "floor-console"}>
          <header>
            <span className="console-label">TODAY / MINIMUM VIABLE DAY</span>
            <strong className={held ? "floor-verdict held" : "floor-verdict"}>
              <Decode text={held ? "DAY SECURED" : `${met} OF 3 HELD`} />
            </strong>
          </header>
          <ul className="floor-checks">
            {checks.map((check) => (
              <li key={check.key} className={check.met ? "met" : ""}>
                <i aria-hidden="true" />
                <span className="floor-name">{check.label}</span>
                <span className="floor-detail">{check.detail}</span>
                <span className="floor-reading">{check.reading}</span>
              </li>
            ))}
          </ul>
          <footer>
            <span>RUN · {currentFloorRun}d</span>
            <span>RECORD · {longestFloorRun}d</span>
            <button type="button" onClick={onOpenToday}>OPEN QUEUE →</button>
          </footer>
        </section>

        <section className="mission-console">
          <div className="mission-day">
            <span className="console-label">MISSION DAY</span>
            <strong>{String(dayNumber).padStart(2, "0")}</strong>
            <em>{daysRemaining} REMAINING</em>
          </div>
          <div className="mission-score">
            <span className="console-label">TODAY / WEIGHTED</span>
            <strong>{shownScore}<small>/100</small></strong>
          </div>
          <div className="mission-level">
            <span className="console-label">LEVEL {String(level).padStart(2, "0")}</span>
            <i><b style={{ width: `${((xp % 1000) / 1000) * 100}%` }} /></i>
            <em>{nextLevelXp} XP TO NEXT</em>
          </div>
        </section>
      </div>

      <section className="alfred-console">
        <header>
          <span className="console-label">ALFRED</span>
          <i aria-hidden="true" />
        </header>
        {alfredPending && !alfred && <p className="alfred-pending">Composing.</p>}
        {alfred && <p className="alfred-line">{alfred}</p>}
        {!alfred && !alfredPending && (
          <p className="alfred-pending">No remark today, sir. The record speaks plainly enough.</p>
        )}
      </section>
    </div>
  );
}
