"use client";

import { useDecode } from "../../lib/motion/useDecode.ts";

/**
 * Scrambled glyphs are decoration; assistive tech gets the settled string.
 */
export function Decode({ text, enabled = true, className, duration }: {
  text: string;
  enabled?: boolean;
  className?: string;
  duration?: number;
}) {
  const frame = useDecode(text, enabled, duration);
  return (
    <span className={className}>
      <span aria-hidden="true">{frame}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
