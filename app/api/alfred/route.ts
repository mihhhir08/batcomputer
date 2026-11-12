import { NextResponse } from "next/server";
import { mission } from "../../../mission.config";
import { FLOOR } from "../../../lib/mission/floor";
import { GOALS } from "../../../lib/mission/scoring";
import { isDateKey } from "../../../lib/mission/validate";
import { hasClearance } from "../../../lib/clearance";

// Alfred speaks once a mission day. The remark is cached in memory for the
// lifetime of the serverless instance so a page refresh does not re-bill a
// token or, worse, produce a different opinion an hour later.
const cache = new Map<string, string>();

const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4.5";

const SYSTEM = `You are Alfred Pennyworth, addressing the person you have served for years.

You are not a chatbot, a coach, or a habit tracker. You are the one person permitted
to be quietly disappointed in them, and the one person who never doubts them.

Rules:
- ONE remark. Two sentences at most. Never three.
- Dry, understated, specific. British register. Address them as "${mission.honorific}" at most once.
- Cite the actual numbers you are given. Never invent a fact you were not told.
- If they have returned after a gap, acknowledge it once, without reproach, and move on.
- Never use exclamation marks, emoji, or motivational language.
- Never say "you've got this", "keep going", "amazing", "journey", or "proud of you".
- If the day is going badly, say so plainly. Do not soften it into nothing.
- If the day is going well, note it without ceremony.`;

const count = (value: unknown) => (Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0);
const goal = (value: unknown) => (GOALS.includes(value as string) ? (value as string) : "");

// Everything is coerced to a number, a date or a known goal before it reaches
// the model, so the request body cannot smuggle instructions into the prompt.
function prompt(body: Record<string, unknown>) {
  const gap = body.gap as { days?: unknown; from?: unknown; to?: unknown } | null;
  const run = body.floorRun as { current?: unknown; longest?: unknown } | undefined;
  const strongest = goal(body.strongest);
  const weakest = goal(body.weakest);
  return [
    `Mission day ${count(body.dayNumber)} of ${mission.days}. ${count(body.daysRemaining)} remain.`,
    `Today's minimum viable day: ${count(body.floorMet)}/${FLOOR.length} held${body.floorHeld === true ? " (secured)" : ""}.`,
    `Current run of secured days: ${count(run?.current)}. Longest ever: ${count(run?.longest)}.`,
    `This week's weighted score: ${count(body.weeklyScore)}/100.`,
    strongest ? `Strongest system: ${strongest}.` : "",
    weakest ? `Weakest system: ${weakest}.` : "",
    gap && isDateKey(gap.from) && isDateKey(gap.to)
      ? `They have just returned after ${count(gap.days)} days off-grid (${gap.from} to ${gap.to}).` : "",
  ].filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  // Every call can spend the operator's OpenRouter credit.
  if (!await hasClearance()) return NextResponse.json({ line: null, reason: "locked" }, { status: 401 });
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return NextResponse.json({ line: null, reason: "no key" });

  const body = await request.json().catch(() => null);
  if (!body || !isDateKey(body.date)) return NextResponse.json({ line: null, reason: "bad request" }, { status: 400 });
  const cacheKey = `${body.date}:${count(body.floorMet)}:${body.floorHeld === true}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json({ line: cached, cached: true });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 160,
        temperature: 0.8,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt(body) },
        ],
      }),
    });

    if (!response.ok) return NextResponse.json({ line: null, reason: `upstream ${response.status}` });

    const data = await response.json();
    const line = data?.choices?.[0]?.message?.content?.trim() ?? null;
    if (line) cache.set(cacheKey, line);
    return NextResponse.json({ line });
  } catch {
    // A silent Alfred is better than an error state on the command sector.
    return NextResponse.json({ line: null, reason: "unreachable" });
  }
}
