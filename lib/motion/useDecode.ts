"use client";

import { useEffect, useState } from "react";
import { DECODE_MS, DECODE_TICK_MS, decodeFrame } from "./decode.ts";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/**
 * Resolves `text` on mount and on every change. Starts settled so the server
 * render and the reduced-motion path are both just the plain string.
 */
export function useDecode(text: string, enabled = true, duration = DECODE_MS) {
  const reduced = usePrefersReducedMotion();
  const [frame, setFrame] = useState(text);

  useEffect(() => {
    if (!enabled || reduced) {
      setFrame(text);
      return;
    }
    let raf = 0;
    const started = performance.now();
    const step = (now: number) => {
      const elapsed = now - started;
      const progress = Math.min(1, elapsed / duration);
      setFrame(decodeFrame(text, progress, Math.floor(elapsed / DECODE_TICK_MS)));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, enabled, reduced, duration]);

  return frame;
}

/** Counts up to a number instead of scrambling it. Values read as instruments. */
export function useCountUp(value: number, duration = 520) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    let raf = 0;
    const started = performance.now();
    const from = shown;
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      // ease-out so the needle settles rather than stopping dead
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(from + (value - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // `shown` is read as the animation's start point only; tracking it would restart the tween.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced, duration]);

  return shown;
}
