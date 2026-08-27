import { NextResponse } from "next/server";

// Alfred speaks once a mission day. The remark is cached in memory for the
// lifetime of the serverless instance so a page refresh does not re-bill a
// token or, worse, produce a different opinion an hour later.
const cache = new Map<string, string>();

const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-haiku";

const SYSTEM = `You are Alfred Pennyworth, addressing the person you have served for years.

You are not a chatbot, a coach, or a habit tracker. You are the one person permitted
to be quietly disappointed in him, and the one person who never doubts him.

Rules:
- ONE remark. Two sentences at most. Never three.
- Dry, understated, specific. British register. Address him as "sir" at most once.
- Cite the actual numbers you are given. Never invent a fact you were not told.
- If he has returned after a gap, acknowledge it once, without reproach, and move on.
- Never use exclamation marks, emoji, or motivational language.
- Never say "you've got this", "keep going", "amazing", "journey", or "proud of you".
- If the day is going badly, say so plainly. Do not soften it into nothing.
- If the day is going well, note it without ceremony.`;

function prompt(body: Record<string, unknown>) {
  const gap = body.gap as { days: number; from: string; to: string } | null;
  const run = body.floorRun as { current: number; longest: number } | undefined;
  return [
    `Mission day ${body.dayNumber} of 90. ${body.daysRemaining} remain.`,
    `Today's minimum viable day: ${body.floorMet}/3 held${body.floorHeld ? " (secured)" : ""}.`,
    `Current run of secured days: ${run?.current ?? 0}. Longest ever: ${run?.longest ?? 0}.`,
    `This week's weighted score: ${body.weeklyScore}/100.`,
    body.strongest ? `Strongest system: ${body.strongest}.` : "",
    body.weakest ? `Weakest system: ${body.weakest}.` : "",
    gap ? `He has just returned after ${gap.days} days off-grid (${gap.from} to ${gap.to}).` : "",
  ].filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return NextResponse.json({ line: null, reason: "no key" });

  const body = await request.json();
  const cacheKey = `${body.date}:${body.floorMet}:${body.floorHeld}`;
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
