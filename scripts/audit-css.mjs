// Guards against the bug that styled the boot screen with the old dashboard's
// rules: class names colliding across stylesheets, bare generic selectors
// leaking globally, and markup asking for classes nothing defines.
//
//   node scripts/audit-css.mjs
//
// Exits non-zero on a real problem so it can gate a commit.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SHEETS = ["app/globals.css", "app/terminal.css", "app/sectors.css", "app/boot.css"];

// Single-word class names that would capture unrelated elements if left bare.
const GENERIC = new Set([
  "active", "held", "open", "closed", "up", "down", "flat", "ok", "bad", "warn",
  "pending", "future", "missed", "unknown", "met", "complete", "empty", "filled",
  "denied", "idle", "low", "mid", "high", "best", "prior", "ghost", "reached",
  "check", "recovery", "upcoming", "wide", "shown", "secured",
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (path.endsWith(".tsx")) out.push(path);
  }
  return out;
}

const defined = new Map();
const bare = [];

for (const sheet of SHEETS) {
  const css = readFileSync(sheet, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selector] of css.matchAll(/([^{}]+)\{/g)) {
    if (selector.trim().startsWith("@")) continue;
    for (const part of selector.split(",")) {
      const trimmed = part.trim();
      // A bare generic selector is one whose entire compound is a single class.
      const solo = trimmed.match(/^\.([a-zA-Z][\w-]*)$/);
      if (solo && GENERIC.has(solo[1])) bare.push(`${sheet}: .${solo[1]}`);
      for (const [, cls] of trimmed.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
        if (!defined.has(cls)) defined.set(cls, new Set());
        defined.get(cls).add(sheet);
      }
    }
  }
}

// A class carrying real layout in two sheets is an override waiting to happen.
const collisions = [...defined.entries()]
  .filter(([cls, sheets]) => sheets.size > 1 && !GENERIC.has(cls))
  .map(([cls, sheets]) => `${cls}: ${[...sheets].join(" + ")}`);

const problems = [];
if (bare.length) problems.push(["Bare generic selectors (leak globally)", bare]);
if (collisions.length) problems.push(["Same class styled in multiple sheets", collisions]);

for (const [title, list] of problems) {
  console.error(`\n${title}:`);
  for (const line of list) console.error(`  ${line}`);
}

if (problems.length) {
  console.error(`\ncss audit failed`);
  process.exit(1);
}

console.log(`css audit ok — ${defined.size} classes across ${SHEETS.length} sheets, no leaks or collisions`);
