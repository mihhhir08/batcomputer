"use client";

import { Stepper } from "../ui/Stepper";
import { sound } from "../../lib/audio/console";
import { floorChecks, floorHeld, STEP_FLOOR } from "../../lib/mission/floor";
import { careerIsActive, habitImpact, instagramIsActive, score, xPostCount } from "../../lib/mission/scoring";
import { CONTENT_VOLUME_START_DATE, HABITS, type BinaryKey, type DayLog } from "../../lib/mission/types";

/**
 * The only sector that writes. Floor items sit above the fold and are visually
 * separated from everything else, because clearing three things is the job and
 * the remaining twelve are optional.
 */
export function TodaySector({
  todayLog, todayKey, jobSecuredOn, instagramStartedOn, updateToday, onStartInstagram,
}: {
  todayLog: DayLog;
  todayKey: string;
  jobSecuredOn: string | null;
  instagramStartedOn: string | null;
  updateToday: (patch: Partial<DayLog>) => void;
  onStartInstagram: () => void;
}) {
  const instagramActive = instagramIsActive(todayKey, instagramStartedOn);
  const careerActive = careerIsActive(todayKey, jobSecuredOn);
  const volumeActive = todayKey >= CONTENT_VOLUME_START_DATE;
  const posts = xPostCount(todayLog);
  const held = floorHeld(todayLog);
  const todayScore = score(todayLog, todayKey, jobSecuredOn, instagramStartedOn);

  const wasHeld = floorHeld(todayLog);
  function toggle(key: BinaryKey) {
    const next = { ...todayLog, [key]: !todayLog[key] };
    updateToday({ [key]: !todayLog[key] });
    if (!wasHeld && floorHeld(next)) sound.floorHeld();
    else sound.commit();
  }

  function setNumber(patch: Partial<DayLog>) {
    const next = { ...todayLog, ...patch };
    updateToday(patch);
    if (!wasHeld && floorHeld(next)) sound.floorHeld();
  }

  const bonusHabits = HABITS.filter((habit) =>
    habit.key !== "scalpMassage" && (habit.key !== "instagram" || instagramActive));

  return (
    <div className="today-sector">
      <section className={held ? "queue-block floor-block held" : "queue-block floor-block"}>
        <header>
          <span className="console-label">NON-NEGOTIABLE / THE FLOOR</span>
          <strong>{held ? "HELD" : `${floorChecks(todayLog).filter((c) => c.met).length}/3`}</strong>
        </header>

        <div className={todayLog.steps >= STEP_FLOOR ? "queue-row met" : "queue-row"}>
          <span className="queue-copy">
            <strong>Movement</strong>
            <small>{STEP_FLOOR.toLocaleString("en-CA")} steps</small>
          </span>
          <Stepper label="steps today" value={todayLog.steps} step={500} unit="steps"
            complete={todayLog.steps >= STEP_FLOOR} onChange={(steps) => setNumber({ steps })} />
        </div>

        {volumeActive && (
          <div className={posts > 0 ? "queue-row met" : "queue-row"}>
            <span className="queue-copy">
              <strong>Distribution · X</strong>
              <small>One post clears the floor · 15 earns full points</small>
            </span>
            <Stepper label="X posts today" value={posts} step={1} unit="posts"
              complete={posts >= 15} onChange={(xPosts) => setNumber({ xPosts, x: xPosts > 0 })} />
          </div>
        )}

        <label className={todayLog.scalpMassage ? "queue-row check met" : "queue-row check"}>
          <input type="checkbox" checked={todayLog.scalpMassage} onChange={() => toggle("scalpMassage")} />
          <span className="queue-mark" aria-hidden="true" />
          <span className="queue-copy"><strong>Recovery</strong><small>Scalp massage</small></span>
          <span className="queue-impact">Hair · 10 pts</span>
        </label>
      </section>

      <section className="queue-block">
        <header>
          <span className="console-label">BEYOND THE FLOOR / OPTIONAL</span>
          <strong>{todayScore}<small>/100</small></strong>
        </header>

        {bonusHabits.map((habit) => (
          <label key={habit.key} className={todayLog[habit.key] ? "queue-row check met" : "queue-row check"}>
            <input type="checkbox" checked={todayLog[habit.key]} onChange={() => toggle(habit.key)} />
            <span className="queue-mark" aria-hidden="true" />
            <span className="queue-copy"><strong>{habit.label}</strong><small>{habit.note}</small></span>
            <span className="queue-impact">{habit.group} · {habitImpact(habit.key, instagramActive, careerActive)} pts</span>
          </label>
        ))}

        {!instagramActive && (
          <div className="queue-row upcoming">
            <span className="queue-copy"><strong>Instagram</strong><small>Not yet activated</small></span>
            <button type="button" onClick={onStartInstagram}>ACTIVATE</button>
          </div>
        )}

        {careerActive && (
          <div className={todayLog.jobs >= 10 ? "queue-row met" : "queue-row"}>
            <span className="queue-copy"><strong>Job applications</strong><small>Target · 10</small></span>
            <Stepper label="applications today" value={todayLog.jobs} step={1} unit="sent"
              complete={todayLog.jobs >= 10} onChange={(jobs) => setNumber({ jobs })} />
          </div>
        )}

        <div className={(todayLog.water ?? 0) >= 3 ? "queue-row met" : "queue-row"}>
          <span className="queue-copy"><strong>Water</strong><small>3 L earns full points</small></span>
          <Stepper label="water in litres" value={todayLog.water ?? 0} step={0.25} unit="L"
            complete={(todayLog.water ?? 0) >= 3} onChange={(water) => setNumber({ water })} />
        </div>

        {!todayLog.recovery && (
          <button type="button" className="plan-recovery"
            onClick={() => { updateToday({ recovery: true, strength: false }); sound.commit(); }}>
            PLAN STRENGTH RECOVERY · protects the body points
          </button>
        )}
        {todayLog.recovery && (
          <div className="queue-row recovery">
            <span className="queue-copy"><strong>Recovery day</strong><small>Strength points protected</small></span>
            <button type="button" onClick={() => { updateToday({ recovery: false }); sound.toggle(); }}>RESTORE</button>
          </div>
        )}
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
