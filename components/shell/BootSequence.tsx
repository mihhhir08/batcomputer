"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Decode } from "./Decode";
import { usePrefersReducedMotion } from "../../lib/motion/useDecode";
import { sound, startHum, unlockAudio } from "../../lib/audio/console";
import type { Gap } from "../../lib/mission/gaps";
import type { SyncState } from "../../lib/mission/types";
import { PinLock } from "./PinLock";

type Check = { label: string; value: string; tone: "ok" | "pending" | "bad" };

/**
 * The boot is the briefing. It reports only what is true, stages the report so
 * it reads like a machine waking rather than a spinner, and hands over on a
 * keypress — which is also what unlocks audio in every modern browser.
 */
export function BootSequence({
  ready, authenticated, hydrated, missionDataError, syncState,
  dayNumber, daysRemaining, todayState, floorMet, floorHeld: held,
  level, gap, alfred, onEnter,
}: {
  ready: boolean;
  authenticated: boolean;
  hydrated: boolean;
  missionDataError: boolean;
  syncState: SyncState;
  dayNumber: number;
  daysRemaining: number;
  todayState: "UNLOGGED" | "OPEN" | "CLOSED";
  floorMet: number;
  floorHeld: boolean;
  level: number;
  gap: Gap | null;
  alfred: string | null;
  onEnter: () => void;
  locked: boolean;
  onCleared: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [stage, setStage] = useState(reduced ? 4 : 0);

  useEffect(() => {
    if (reduced) return setStage(4);
    const timers = [
      window.setTimeout(() => setStage(1), 420),
      window.setTimeout(() => setStage(2), 1150),
      window.setTimeout(() => setStage(3), 1950),
      window.setTimeout(() => setStage(4), 2650),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [reduced]);

  // A briefing you cannot leave is a trap. After this, the boot releases
  // whatever the backend is doing — the terminal still works offline.
  const [released, setReleased] = useState(false);
  useEffect(() => {
    const deadline = window.setTimeout(() => setReleased(true), 6000);
    return () => window.clearTimeout(deadline);
  }, []);

  const open = (ready || released) && !locked;

  // Enter on any key or click. Also the audio unlock gesture.
  useEffect(() => {
    const enter = () => {
      // Audio must never be able to block hand-over.
      try {
        unlockAudio();
        startHum();
        sound.boot();
      } catch {
        // no audio, no matter
      }
      onEnter();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Escape always works, even mid-handshake, so nobody is ever stuck here.
      if (!open && event.key !== "Escape") return;
      event.preventDefault();
      enter();
    };
    window.addEventListener("keydown", onKey);
    if (open) window.addEventListener("pointerdown", enter);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", enter);
    };
  }, [open, onEnter]);

  const checks: Check[] = [
    { label: "POWER", value: "NOMINAL", tone: "ok" },
    { label: "DISPLAY", value: "PHOSPHOR STABLE", tone: "ok" },
    { label: "IDENTITY", value: authenticated ? "VERIFIED" : "REQUIRED", tone: authenticated ? "ok" : "pending" },
    {
      label: "MISSION DATABASE",
      value: missionDataError ? "UNREADABLE" : hydrated ? "MOUNTED" : "MOUNTING",
      tone: missionDataError ? "bad" : hydrated ? "ok" : "pending",
    },
    {
      label: "DATA LINK",
      value: syncState === "saved" ? "ESTABLISHED" : syncState === "saving" ? "NEGOTIATING" : syncState === "error" ? "DEGRADED" : "LOCAL ONLY",
      tone: syncState === "saved" ? "ok" : syncState === "error" ? "bad" : "pending",
    },
    { label: "LOCAL FALLBACK", value: "ARMED", tone: "ok" },
  ];

  return (
    <section className={`boot stage-${stage}`} role="status" aria-live="polite" aria-label="Batcomputer initialisation">
      <div className="boot-glass" aria-hidden="true" />
      <div className="boot-frame" aria-hidden="true"><i /><i /><i /><i /></div>

      <div className="boot-emblem" aria-hidden="true">
        <Image src="/batcomputer-mark.svg" alt="" width={200} height={80} priority />
        <i className="boot-emblem-sweep" />
      </div>

      <header className="boot-title">
        <h1><Decode text="BATCOMPUTER" enabled={!reduced} duration={620} /></h1>
        <p>PRIVATE MISSION SYSTEM · CLEARANCE ONE</p>
      </header>

      <div className="boot-checks">
        {checks.map((check, index) => (
          <span key={check.label} className={index < stage * 2 ? "shown" : ""}>
            <b>{check.label}</b>
            <i aria-hidden="true" />
            <em className={check.tone}>{check.value}</em>
          </span>
        ))}
      </div>

      <div className="boot-briefing">
        <div className="boot-day">
          <span>MISSION DAY</span>
          <strong>{String(dayNumber).padStart(2, "0")}</strong>
          <em>{daysRemaining} REMAINING</em>
        </div>
        <div className={held ? "boot-floor held" : "boot-floor"}>
          <span>MINIMUM VIABLE DAY</span>
          <strong>{held ? "SECURED" : `${floorMet} OF 3`}</strong>
          <em>RECORD {todayState} · LEVEL {String(level).padStart(2, "0")}</em>
        </div>
      </div>

      {gap && (
        <p className="boot-gap">
          <b>SIGNAL LOST</b> {String(gap.days).padStart(2, "0")} DAYS · {gap.from} → {gap.to} · SEALED OFF-GRID
        </p>
      )}

      {alfred && <p className="boot-alfred">{alfred}</p>}

      {locked && <PinLock onCleared={onCleared} />}

      <footer className={open ? "boot-enter ready" : "boot-enter"} hidden={locked}>
        {missionDataError
          ? "USER ACTION REQUIRED"
          : open
            ? authenticated
              ? "PRESS ANY KEY TO ASSUME CONTROL"
              : "PRESS ANY KEY · IDENTITY REQUIRED"
            : "NEGOTIATING DATA LINK"}
      </footer>

      {!open && !locked && <small className="boot-bypass">ESC TO BYPASS</small>}
      {released && !ready && (
        <small className="boot-bypass warn">
          DATA LINK DID NOT ANSWER · CONTINUING ON LOCAL RECORD
        </small>
      )}
    </section>
  );
}
