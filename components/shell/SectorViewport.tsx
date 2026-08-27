"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SECTORS, type SectorId, sectorIndex } from "../../lib/sectors";
import { usePrefersReducedMotion } from "../../lib/motion/useDecode";
import { Decode } from "./Decode";

const DISSOLVE_MS = 130;

/**
 * The display never scrolls to a section. It dissolves what it was showing
 * into scan lines and resolves the next sector in its place.
 */
export function SectorViewport({ active, children }: { active: SectorId; children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(active);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const previous = useRef(active);

  useEffect(() => {
    if (active === previous.current) return;
    const forward = sectorIndex(active) > sectorIndex(previous.current);
    previous.current = active;

    if (reduced) {
      setShown(active);
      return;
    }

    setPhase("out");
    document.documentElement.dataset.travel = forward ? "down" : "up";
    const swap = window.setTimeout(() => {
      setShown(active);
      setPhase("in");
    }, DISSOLVE_MS);
    return () => window.clearTimeout(swap);
  }, [active, reduced]);

  useEffect(() => {
    if (phase !== "in") return;
    const settle = window.setTimeout(() => setPhase("idle"), 420);
    return () => window.clearTimeout(settle);
  }, [phase]);

  const sector = SECTORS[sectorIndex(shown)];

  return (
    <section className="sector-viewport" aria-live="polite">
      <header className="sector-head">
        <span className="sector-index" aria-hidden="true">{sector.number}</span>
        <h2>
          <Decode key={`${sector.id}-label`} text={sector.label} enabled={!reduced} />
        </h2>
        <Decode
          key={`${sector.id}-caption`}
          className="sector-caption"
          text={sector.caption}
          enabled={!reduced}
        />
        <i className="sector-rule" aria-hidden="true" />
      </header>

      <div className={`sector-body phase-${phase}`} key={sector.id}>
        {children}
      </div>
    </section>
  );
}
