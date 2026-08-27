import assert from "node:assert/strict";
import { decodeFrame, decodeTicks } from "../lib/motion/decode";

const text = "MISSION DAY 21";

assert.equal(decodeFrame(text, 1), text, "a finished decode is the plain text");
assert.equal(decodeFrame(text, 0).length, text.length, "length never changes mid-decode");
assert.notEqual(decodeFrame(text, 0), text, "nothing is settled at the start");

// Whitespace must survive every frame or the layout jumps while resolving.
for (const p of [0, 0.15, 0.4, 0.75, 0.99]) {
  const frame = decodeFrame(text, p);
  assert.deepEqual(
    [...frame].map((c, i) => (text[i] === " " ? c : "x")),
    [...text].map((c) => (c === " " ? " " : "x")),
    `spaces hold at progress ${p}`,
  );
}

// The wavefront only ever moves forward.
let settledBefore = -1;
for (const p of [0, 0.2, 0.5, 0.8, 1]) {
  const settled = [...decodeFrame(text, p)].filter((c, i) => c === text[i] && text[i] !== " ").length;
  assert.ok(settled >= settledBefore, `progress ${p} never un-resolves a character`);
  settledBefore = settled;
}

// Deterministic: the same frame twice is the same string, so React can re-render freely.
assert.equal(decodeFrame(text, 0.3, 7), decodeFrame(text, 0.3, 7), "frames are pure");
assert.notEqual(decodeFrame(text, 0.3, 7), decodeFrame(text, 0.3, 8), "but they do move between ticks");

assert.equal(decodeFrame("", 0.5), "", "empty text is safe");
assert.ok(decodeTicks(420, 45) > 1, "a decode is more than one frame");

console.log("decode ok");
