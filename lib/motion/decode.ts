// Text does not appear on this machine. It resolves.
// Pure frame function first, hook on top, so the timing can be tested.

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/\\|<>=+*#%&░▒▓";

/** Deterministic per (index, tick) so a frame never flickers between renders. */
function glyphFor(index: number, tick: number) {
  const hash = (index * 2654435761 + tick * 40503) >>> 0;
  return GLYPHS[hash % GLYPHS.length];
}

/**
 * Resolves left to right. Characters ahead of the wavefront scramble, those
 * behind it are settled. Whitespace never scrambles so layout cannot jump.
 */
export function decodeFrame(text: string, progress: number, tick = 0) {
  if (progress >= 1) return text;
  if (progress <= 0 && text.length) return text.replace(/\S/g, (_, i: number) => glyphFor(i, tick));

  const settled = Math.floor(text.length * progress);
  let out = "";
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (index < settled || char === " " || char === "\n") out += char;
    else out += glyphFor(index, tick);
  }
  return out;
}

export const DECODE_MS = 420;
export const DECODE_TICK_MS = 45;

/** Frames the shell should render for a decode of the given duration. */
export function decodeTicks(duration = DECODE_MS, tickMs = DECODE_TICK_MS) {
  return Math.max(1, Math.round(duration / tickMs));
}
