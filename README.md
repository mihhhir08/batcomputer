# BATCOMPUTER

A private 90-day mission terminal. Not a habit tracker.

## Running it

```bash
npm install
npm run dev
```

Tests run without a browser or a build:

```bash
node tests/mission.test.ts
node tests/decode.test.ts
```

## Environment

Everything is optional. Missing keys degrade to a working local-only terminal.

| Variable | Effect if absent |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Local storage only, no cloud mirror |
| `SUPABASE_SERVICE_ROLE_KEY` | Local storage only, no cloud mirror |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Share links cannot be read |
| `OPENROUTER_API_KEY` | Alfred stays silent |
| `OPENROUTER_MODEL` | Defaults to `anthropic/claude-3.5-haiku` |
| `RESEND_API_KEY` | No nightly nudge |
| `NUDGE_EMAIL` | No nightly nudge |
| `CRON_SECRET` | Cron route refuses all callers |

## How it works

**The floor and the score are separate.** Three non-negotiables decide whether a
day counts at all: 10,000 steps, one post on any channel, scalp massage. The
weighted 0–100 score decides how good it was. Everything else is bonus.

**Gaps are survivable.** Missing days seal as OFF-GRID rather than counting as
failures. Runs split into current and longest, so a break costs momentum but
never the record. Returning after silence triggers the return protocol once.

**Two voices.** ORACLE is the system chrome — cold, operational, everywhere.
ALFRED is one remark a day, generated from your actual numbers, cached per day.

**No sign-in.** One operator, one terminal. The browser holds the authoritative
copy in localStorage and mirrors it through `/api/mission`, which is the only
thing that ever sees a database credential. The route is `noindex` and the
deployment URL is the only access control — add Vercel deployment protection
if that ever stops being enough.

## Layout

```
app/
  page.tsx              composes the terminal, calculates nothing
  terminal.css          the machine: tube, rail, travel
  sectors.css           what the machine displays
  boot.css              the briefing
  api/alfred/           daily remark via OpenRouter
  api/share/            read-only snapshot creation
  dossier/[token]/      public read-only view
components/
  shell/                boot, rail, viewport, console, decode
  sectors/              the nine sectors
lib/mission/            all logic, no React except useMission
lib/motion/             decode + count-up
lib/audio/              synthesised console sound
tests/                  node-runnable assertions, no framework
```

## Invariants

Scoring is frozen. `lib/mission/scoring.ts` reproduces v1 exactly and
`tests/mission.test.ts` fails if any past day would rescore. Schema changes
stay additive while a challenge is running.

## Keyboard

| Key | Action |
|---|---|
| `1`–`9` | Jump to sector |
| `↑` `↓` | Previous / next sector |
| `⌘K` | Command console |
| Any key | Leave the boot screen |
