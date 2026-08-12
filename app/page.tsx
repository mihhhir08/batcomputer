"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type BinaryKey = "x" | "linkedin" | "instagram" | "cleanFood" | "protein" | "strength" | "scalpMassage" | "careerGrowth";
type FocusKey = "x" | "linkedin" | "jobs" | "careerGrowth";
type DayPlan = {
  capacityMinutes: number;
  approved: boolean;
  allocations: Record<FocusKey, number>;
  planFit?: "yes" | "tight" | "no";
  friction?: FocusKey | "none";
};
type DayLog = Record<BinaryKey, boolean> & {
  jobs: number;
  steps: number;
  water: number;
  xPosts?: number;
  recovery: boolean;
  weight?: number;
  waist?: number;
  plan?: DayPlan;
};

type Logs = Record<string, DayLog>;
type GoalName = "Audience" | "Career" | "Body" | "Hair";

const START_DATE = "2026-08-07";
const WELLNESS_START_DATE = "2026-08-08";
const CONTENT_VOLUME_START_DATE = "2026-08-08";
const SKILL_GROWTH_START_DATE = "2026-08-08";
const WEIGHTED_SCORE_START_DATE = "2026-08-08";
const EMPTY_LOG: DayLog = {
  x: false,
  linkedin: false,
  instagram: false,
  cleanFood: false,
  protein: false,
  strength: false,
  scalpMassage: false,
  careerGrowth: false,
  jobs: 0,
  steps: 0,
  water: 0,
  recovery: false,
};

const DEFAULT_PLAN: DayPlan = {
  capacityMinutes: 180,
  approved: false,
  allocations: { x: 35, linkedin: 25, jobs: 60, careerGrowth: 45 },
};

const HABITS: { key: BinaryKey; label: string; note: string; group: GoalName }[] = [
  { key: "x", label: "Post on X", note: "Build daily distribution", group: "Audience" },
  { key: "linkedin", label: "Post on LinkedIn", note: "Build authority and opportunity", group: "Audience" },
  { key: "instagram", label: "Post on Instagram", note: "Build the new channel", group: "Audience" },
  { key: "careerGrowth", label: "Career opportunity block", note: "45 focused min · skill, project, interview prep or outreach", group: "Career" },
  { key: "cleanFood", label: "Clean food only", note: "Whole foods, no junk", group: "Body" },
  { key: "protein", label: "Protein target", note: "Hit your daily target", group: "Body" },
  { key: "strength", label: "Kettlebell strength", note: "Complete the session", group: "Body" },
  { key: "scalpMassage", label: "Scalp massage", note: "Daily consistency for healthier hair", group: "Hair" },
];

const DEMO_LOGS: Logs = {
  "2026-08-01": { ...EMPTY_LOG, x: true, linkedin: true, cleanFood: true, protein: true, strength: true, jobs: 10, steps: 10420 },
  "2026-08-02": { ...EMPTY_LOG, x: true, instagram: true, cleanFood: true, protein: true, jobs: 8, steps: 9210 },
  "2026-08-03": { ...EMPTY_LOG, x: true, linkedin: true, instagram: true, cleanFood: true, protein: true, strength: true, jobs: 10, steps: 11320 },
  "2026-08-04": { ...EMPTY_LOG, x: true, linkedin: true, cleanFood: true, strength: true, jobs: 7, steps: 8720 },
  "2026-08-05": { ...EMPTY_LOG, x: true, linkedin: true, instagram: true, cleanFood: true, protein: true, strength: true, jobs: 10, steps: 12040 },
  "2026-08-06": { ...EMPTY_LOG, x: true, linkedin: true, instagram: true, cleanFood: true, protein: true, strength: true, jobs: 9, steps: 10110 },
};

function UiIcon({ name }: { name: "arrow" | "back" | "check" | "focus" | "pause" }) {
  return <svg className="ui-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    {name === "arrow" && <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />}
    {name === "back" && <path d="M13 8H4M7.5 4.5 4 8l3.5 3.5" />}
    {name === "check" && <path d="m3.25 8.25 3 3 6.5-6.5" />}
    {name === "focus" && <><circle cx="8" cy="8" r="2.25" /><path d="M6 2H3a1 1 0 0 0-1 1v3M10 2h3a1 1 0 0 1 1 1v3M6 14H3a1 1 0 0 1-1-1v-3M10 14h3a1 1 0 0 0 1-1v-3" /></>}
    {name === "pause" && <><path d="M5.5 4.25v7.5M10.5 4.25v7.5" /></>}
  </svg>;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function careerIsActive(logDate: string, jobSecuredOn: string | null) {
  return !jobSecuredOn || logDate < jobSecuredOn;
}

function instagramIsActive(logDate: string, instagramStartedOn: string | null) {
  return Boolean(instagramStartedOn && logDate >= instagramStartedOn);
}

function xPostCount(log: DayLog) {
  return typeof log.xPosts === "number" ? log.xPosts : Number(log.x);
}

function legacyScore(log: DayLog, logDate: string, jobSecuredOn: string | null, instagramStartedOn: string | null) {
  const instagramActive = instagramIsActive(logDate, instagramStartedOn);
  const wellnessActive = logDate >= WELLNESS_START_DATE;
  const contentVolumeActive = logDate >= CONTENT_VOLUME_START_DATE;
  const activeHabits = HABITS.filter((habit) => (habit.key !== "instagram" || instagramActive) && (habit.key !== "strength" || !log.recovery) && (habit.key !== "scalpMassage" || wellnessActive) && (habit.key !== "x" || !contentVolumeActive) && (habit.key !== "careerGrowth" || logDate >= SKILL_GROWTH_START_DATE));
  const binaries = activeHabits.reduce((sum, habit) => sum + Number(Boolean(log[habit.key])), 0);
  const steps = Math.min(log.steps / 10000, 1);
  const water = wellnessActive ? Math.min((log.water ?? 0) / 3, 1) : 0;
  const xExecution = contentVolumeActive ? Math.min(xPostCount(log) / 15, 1) : 0;
  const jobs = Math.min(log.jobs / 10, 1);
  const careerActive = careerIsActive(logDate, jobSecuredOn);
  return Math.round(((binaries + steps + water + xExecution + (careerActive ? jobs : 0)) / (activeHabits.length + 1 + Number(wellnessActive) + Number(contentVolumeActive) + Number(careerActive))) * 100);
}

function xImpact(posts: number) {
  if (posts >= 15) return 20;
  if (posts >= 10) return 14;
  if (posts >= 5) return 7;
  return 0;
}

function waterImpact(litres: number) {
  if (litres >= 3) return 5;
  if (litres >= 2) return 3;
  if (litres >= 1) return 1;
  return 0;
}

function goalPoints(log: DayLog, logDate: string, jobSecuredOn: string | null, instagramStartedOn: string | null) {
  const instagramActive = instagramIsActive(logDate, instagramStartedOn);
  const careerActive = careerIsActive(logDate, jobSecuredOn);
  return {
    Audience: xImpact(xPostCount(log)) + Number(log.linkedin) * (instagramActive ? 10 : 15) + Number(instagramActive && log.instagram) * 5,
    Career: careerActive ? Math.min(log.jobs / 10, 1) * 12 + Number(log.careerGrowth) * 13 : Number(log.careerGrowth) * 25,
    Body: Number(log.cleanFood) * 7 + Number(log.protein) * 7 + Number(log.strength || log.recovery) * 7 + Math.min(log.steps / 10000, 1) * 4 + waterImpact(log.water ?? 0),
    Hair: Number(log.scalpMassage) * 10,
  } satisfies Record<GoalName, number>;
}

function score(log: DayLog, logDate: string, jobSecuredOn: string | null, instagramStartedOn: string | null) {
  if (logDate < WEIGHTED_SCORE_START_DATE) return legacyScore(log, logDate, jobSecuredOn, instagramStartedOn);
  return Math.round(Object.values(goalPoints(log, logDate, jobSecuredOn, instagramStartedOn)).reduce((sum, value) => sum + value, 0));
}

function categoryScores(log: DayLog, logDate: string, jobSecuredOn: string | null, instagramStartedOn: string | null) {
  if (logDate >= WEIGHTED_SCORE_START_DATE) {
    const points = goalPoints(log, logDate, jobSecuredOn, instagramStartedOn);
    return {
      Overall: score(log, logDate, jobSecuredOn, instagramStartedOn),
      Audience: Math.round((points.Audience / 35) * 100),
      Career: Math.round((points.Career / 25) * 100),
      Body: Math.round((points.Body / 30) * 100),
      Hair: Math.round((points.Hair / 10) * 100),
    };
  }
  const instagramActive = instagramIsActive(logDate, instagramStartedOn);
  const xSignal = logDate >= CONTENT_VOLUME_START_DATE ? Math.min(xPostCount(log) / 15, 1) : Number(log.x);
  const wellnessSignals = logDate >= WELLNESS_START_DATE ? [Boolean(log.scalpMassage), Math.min((log.water ?? 0) / 3, 1)] : [];
  const bodySignals = [log.cleanFood, log.protein, ...(log.recovery ? [] : [log.strength]), Math.min(log.steps / 10000, 1), ...wellnessSignals];
  const careerSignals = [...(careerIsActive(logDate, jobSecuredOn) ? [Math.min(log.jobs / 10, 1)] : []), ...(logDate >= SKILL_GROWTH_START_DATE ? [Number(Boolean(log.careerGrowth))] : [])];
  return {
    Overall: score(log, logDate, jobSecuredOn, instagramStartedOn),
    Body: Math.round((bodySignals.reduce<number>((sum, value) => sum + Number(value), 0) / bodySignals.length) * 100),
    Audience: Math.round(((xSignal + Number(log.linkedin) + (instagramActive ? Number(log.instagram) : 0)) / (instagramActive ? 3 : 2)) * 100),
    Career: careerSignals.length ? Math.round((careerSignals.reduce((sum, value) => sum + value, 0) / careerSignals.length) * 100) : 100,
    Hair: 0,
  };
}

function habitImpact(key: BinaryKey, instagramActive: boolean, careerActive: boolean) {
  return { x: 20, linkedin: instagramActive ? 10 : 15, instagram: 5, cleanFood: 7, protein: 7, strength: 7, scalpMassage: 10, careerGrowth: careerActive ? 13 : 25 }[key];
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function currentStreak(logs: Logs, today: Date, completed: (log: DayLog) => boolean) {
  let cursor = completed(logs[dateKey(today)] ?? EMPTY_LOG) ? today : addDays(today, -1);
  let streak = 0;
  while (streak < 90 && completed(logs[dateKey(cursor)] ?? EMPTY_LOG)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function curvePath(points: { x: number; y: number }[]) {
  if (points.length === 1) return `M${points[0].x - 9},${points[0].y} H${points[0].x + 9}`;
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const control = (point.x - previous.x) * 0.45;
    return `${path} C${previous.x + control},${previous.y} ${point.x - control},${point.y} ${point.x},${point.y}`;
  }, `M${points[0].x},${points[0].y}`);
}

function areaPath(points: { x: number; y: number }[], bottom: number) {
  return `${curvePath(points)} L${points.at(-1)!.x},${bottom} L${points[0].x},${bottom} Z`;
}

function MiniLine({ values, color = "#ff5d35" }: { values: number[]; color?: string }) {
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${38 - (value / 100) * 34}`).join(" ");
  return (
    <svg className="mini-line" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 38H100" className="chart-baseline" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function WeightTrend({ entries }: { entries: [string, number][] }) {
  if (!entries.length) return <div className="weight-empty">Your first weekly weigh-in will start the trend.</div>;
  const values = entries.map(([, value]) => value);
  const minimum = Math.min(...values) - 0.5;
  const maximum = Math.max(...values) + 0.5;
  const x = (index: number) => 18 + (index / Math.max(entries.length - 1, 1)) * 364;
  const y = (value: number) => 15 + ((maximum - value) / Math.max(maximum - minimum, 1)) * 70;
  const points = entries.map(([, value], index) => `${x(index)},${y(value)}`).join(" ");
  return <div className="weight-trend"><svg viewBox="0 0 400 108" role="img" aria-label={`Weight trend from ${values[0]} to ${values.at(-1)} kilograms`}>
    <defs><linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e58a69" stopOpacity=".2" /><stop offset="1" stopColor="#e58a69" stopOpacity="0" /></linearGradient></defs>
    <path d={`M${x(0)} 92 L${points.replaceAll(" ", " L")} L${x(entries.length - 1)} 92 Z`} fill="url(#weight-fill)" />
    <polyline key={entries.length} className="weight-line" points={points} fill="none" />
    {entries.map(([date, value], index) => <circle key={date} cx={x(index)} cy={y(value)} r="3.5"><title>{date} · {value} kg</title></circle>)}
  </svg></div>;
}

function TrendChart({ logs, dates, jobSecuredOn, instagramStartedOn }: { logs: Logs; dates: Date[]; jobSecuredOn: string | null; instagramStartedOn: string | null }) {
  const colors = { Overall: "#ff7a59", Audience: "#58a6ff", Career: "#3fb950" } as const;
  const series = (Object.keys(colors) as (keyof typeof colors)[]).map((name) => ({
    name,
    observations: dates.flatMap((date, index) => {
      const log = logs[dateKey(date)];
      return log ? [{ index, value: categoryScores(log, dateKey(date), jobSecuredOn, instagramStartedOn)[name as keyof ReturnType<typeof categoryScores>] }] : [];
    }),
  }));
  const x = (index: number) => dates.length === 1 ? 392 : 44 + (index / (dates.length - 1)) * 696;
  const y = (value: number) => 18 + ((100 - value) / 100) * 190;
  const barWidth = Math.max(3, Math.min(22, 620 / dates.length));
  const overall = series[0];

  return (
    <>
      <div className="chart-legend" aria-label="Metrics shown in chart">
        {series.map(({ name }) => (
          <span key={name} className="chart-key"><i style={{ background: colors[name] }} />{name}</span>
        ))}
      </div>
      <div className="trend-wrap">
        <svg className="trend-chart" viewBox="0 0 760 245" role="img" aria-label="Overall, audience, and career daily score trends">
          <defs>
            <linearGradient id="momentum-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.Overall} stopOpacity=".22" /><stop offset="1" stopColor={colors.Overall} stopOpacity="0" /></linearGradient>
            <linearGradient id="momentum-bars" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff7a59" stopOpacity=".72" /><stop offset="1" stopColor="#ff7a59" stopOpacity=".16" /></linearGradient>
          </defs>
          {[0, 50, 100].map((value) => (
            <g key={value}>
              <line x1="44" x2="740" y1={y(value)} y2={y(value)} className="grid-line" />
              <text x="6" y={y(value) + 4} className="axis-label">{value}%</text>
            </g>
          ))}
          {overall.observations.length > 1 && <path className="trend-area" d={areaPath(overall.observations.map(({ index, value }) => ({ x: x(index), y: y(value) })), y(0))} />}
          {overall.observations.map(({ index, value }) => (
            <rect key={`bar-${dates.length}-${dateKey(dates[index])}`} className="trend-bar" x={x(index) - barWidth / 2} y={y(value)} width={barWidth} height={y(0) - y(value)} rx={Math.min(5, barWidth / 2)}>
              <title>{dates[index].toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })} · {value}% overall</title>
            </rect>
          ))}
          {series.map(({ name, observations }) => {
            const points = observations.map(({ index, value }) => ({ x: x(index), y: y(value) }));
            const lastPoint = points.at(-1);
            if (!lastPoint) return null;
            return <g key={`${name}-${dates.length}`}>
              <path className="trend-line" d={curvePath(points)} fill="none" stroke={colors[name]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <circle className="trend-point" cx={lastPoint.x} cy={lastPoint.y} r={name === "Overall" ? "4" : "3.2"} fill={colors[name]}><title>{name} · {observations.at(-1)?.value}%</title></circle>
            </g>;
          })}
          {overall.observations.length <= 1 && <text x="392" y="218" textAnchor="middle" className="baseline-note">{overall.observations.length ? "First check-in saved · add another day to compare the trends" : "No check-ins in this range yet"}</text>}
          {dates.map((date, index) => (index === 0 || index === dates.length - 1) && (
            <text key={dateKey(date)} x={x(index)} y="235" textAnchor="middle" className="axis-label">
              {date.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })}
            </text>
          ))}
        </svg>
      </div>
    </>
  );
}

function GoalProgress({ name, value, points, total, color }: { name: GoalName; value: number; points: number; total: number; color: string }) {
  return <div className="goal-card" style={{ "--goal-color": color } as React.CSSProperties}>
    <div className="goal-card-top"><span className="goal-dot" /><strong>{name}</strong><span className="goal-value">{value}%</span></div>
    <div className="goal-progress" role="progressbar" aria-label={`${name} impact`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></div>
    <small>{Math.round(points)} of {total} impact points</small>
  </div>;
}

function MetricStepper({ label, value, step, unit, complete, onChange }: { label: string; value: number; step: number; unit: string; complete: boolean; onChange: (value: number) => void }) {
  const move = (amount: number) => onChange(Math.max(0, Math.round((value + amount) * 100) / 100));
  return (
    <div className={`metric-stepper${complete ? " complete" : ""}`}>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => move(-step)} disabled={value <= 0}>−</button>
      <label className="metric-value"><input aria-label={label} inputMode="decimal" type="number" min="0" step={step} value={value || ""} placeholder="0" onChange={(event) => onChange(Math.max(0, Number(event.target.value)))} /><span>{unit}</span></label>
      <button type="button" aria-label={`Increase ${label}`} onClick={() => move(step)}>+</button>
    </div>
  );
}

const FOCUS_META: Record<FocusKey, { label: string; why: string; firstStep: string }> = {
  x: { label: "X distribution", why: "Daily distribution compounds the audience behind every future opportunity.", firstStep: "Draft the first useful idea, publish it, then keep the cadence moving." },
  linkedin: { label: "LinkedIn publishing", why: "One thoughtful post builds authority where career opportunities can find you.", firstStep: "Write the hook first. The rest of the post only needs to support it." },
  jobs: { label: "Job applications", why: "Consistent applications keep the opportunity pipeline alive until the outcome changes.", firstStep: "Find the first suitable role and submit one careful application." },
  careerGrowth: { label: "Career opportunity block", why: "Skill, project, interview, or outreach work improves the quality of future opportunities.", firstStep: "Choose one concrete output you can finish inside this block." },
};

function FocusView({ task, minutes, log, onBack, onUpdate, onBlocked }: { task: FocusKey; minutes: number; log: DayLog; onBack: () => void; onUpdate: (patch: Partial<DayLog>) => void; onBlocked: () => void }) {
  const meta = FOCUS_META[task];
  const complete = task === "x" ? xPostCount(log) >= 15 : task === "jobs" ? log.jobs >= 10 : Boolean(log[task]);
  return <main className="focus-shell">
    <section className="focus-workspace">
      <button className="focus-back" onClick={onBack}><UiIcon name="back" />Back to today</button>
      <div className="focus-copy">
        <span>{minutes} planned minutes</span>
        <h1>{meta.label}</h1>
        <p>{meta.why}</p>
      </div>
      <div className="focus-next-step"><strong>Begin here</strong><p>{meta.firstStep}</p></div>
      <div className="focus-control">
        {task === "x" && <MetricStepper label="X posts today" value={xPostCount(log)} step={1} unit="posts" complete={complete} onChange={(xPosts) => onUpdate({ xPosts })} />}
        {task === "jobs" && <div className="stepper focus-job-stepper"><button aria-label="Remove one application" onClick={() => onUpdate({ jobs: Math.max(0, log.jobs - 1) })}>−</button><strong>{log.jobs}</strong><button aria-label="Add one application" onClick={() => onUpdate({ jobs: log.jobs + 1 })}>+</button></div>}
        {(task === "linkedin" || task === "careerGrowth") && <button className={complete ? "focus-complete done" : "focus-complete"} onClick={() => onUpdate({ [task]: !complete })}>{complete ? <><UiIcon name="check" />Completed</> : "Mark complete"}</button>}
      </div>
      <div className="focus-actions"><button onClick={onBlocked}>I’m blocked</button><button onClick={onBack}>Return to plan <UiIcon name="arrow" /></button></div>
    </section>
  </main>;
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function sendLink() {
    if (!supabase || !email) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setMessage(error ? error.message : "Check your inbox for your private sign-in link.");
    setSending(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="brand-mark"><Image src="/momentum-logo.png" alt="" width={30} height={30} priority /></span>
        <h1>Build momentum.<br />Keep the evidence.</h1>
        <p>Create your free workspace and sync your 90-day transformation across devices.</p>
        <label>Email address<input type="email" value={email} placeholder="you@example.com" onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendLink()} /></label>
        <button onClick={sendLink} disabled={sending || !email}>{sending ? "Sending…" : "Email me a sign-in link"}</button>
        {message && <div className="auth-message" role="status">{message}</div>}
        <small>Passwordless · Private · Encrypted in transit</small>
      </section>
    </main>
  );
}

export default function Home() {
  const [logs, setLogs] = useState<Logs>({});
  const [hydrated, setHydrated] = useState(false);
  const [preview, setPreview] = useState(true);
  const [startDate, setStartDate] = useState(START_DATE);
  const [jobSecuredOn, setJobSecuredOn] = useState<string | null>(null);
  const [instagramStartedOn, setInstagramStartedOn] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [chartRange, setChartRange] = useState<14 | 30 | 90>(14);
  const [activeFocus, setActiveFocus] = useState<FocusKey | null>(null);
  const [syncState, setSyncState] = useState<"local" | "saving" | "saved" | "error">(isSupabaseConfigured ? "saving" : "local");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setAuthReady(true);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
      return () => data.subscription.unsubscribe();
    }
    const saved = window.localStorage.getItem("momentum-90-logs");
    const savedStart = window.localStorage.getItem("momentum-90-start");
    const savedJobDate = window.localStorage.getItem("momentum-90-job-secured");
    const savedInstagramDate = window.localStorage.getItem("momentum-90-instagram-started");
    queueMicrotask(() => {
      if (savedStart) setStartDate(savedStart);
      if (savedJobDate) setJobSecuredOn(savedJobDate);
      if (savedInstagramDate) setInstagramStartedOn(savedInstagramDate);
      if (saved) {
        setLogs(JSON.parse(saved));
        setPreview(false);
      } else {
        setLogs(DEMO_LOGS);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase;
    async function loadWorkspace() {
      const [daily, profile] = await Promise.all([
        client.from("daily_logs").select("log_date,data").eq("user_id", session!.user.id),
        client.from("profiles").select("start_date,job_secured_on,instagram_started_on").eq("user_id", session!.user.id).maybeSingle(),
      ]);
      if (daily.error || profile.error) {
        setSyncState("error");
        setNotice("Cloud sync could not load. Your browser copy remains untouched.");
        setHydrated(true);
        return;
      }
      const savedLogs = window.localStorage.getItem("momentum-90-logs");
      const savedStart = window.localStorage.getItem("momentum-90-start");
      const locallyStarted = window.localStorage.getItem("momentum-90-started") === "true" || Boolean(savedStart);
      const localLogs = savedLogs ? JSON.parse(savedLogs) as Logs : {};
      let syncFailed = false;
      let nextLogs = Object.fromEntries((daily.data ?? []).map((row) => [row.log_date, { ...EMPTY_LOG, ...row.data }]));
      if (!daily.data?.length && Object.keys(localLogs).length && locallyStarted) {
        const rows = Object.entries(localLogs).map(([log_date, data]) => ({ user_id: session!.user.id, log_date, data: { ...EMPTY_LOG, ...data } }));
        const migrated = await client.from("daily_logs").upsert(rows);
        nextLogs = localLogs;
        syncFailed = Boolean(migrated.error);
      }
      setLogs(nextLogs);
      if (profile.data?.start_date) {
        setStartDate(profile.data.start_date);
        window.localStorage.setItem("momentum-90-start", profile.data.start_date);
        window.localStorage.setItem("momentum-90-started", "true");
      }
      if (profile.data?.job_secured_on) setJobSecuredOn(profile.data.job_secured_on);
      if (profile.data?.instagram_started_on) setInstagramStartedOn(profile.data.instagram_started_on);
      if (!profile.data && locallyStarted) {
        const created = await client.from("profiles").upsert({ user_id: session!.user.id, start_date: savedStart ?? START_DATE, height_cm: 0, start_weight_kg: 0, waist_in: 0 });
        if (created.error) syncFailed = true;
        else window.localStorage.setItem("momentum-90-started", "true");
      }
      setPreview(!profile.data && !locallyStarted);
      setSyncState(syncFailed ? "error" : "saved");
      if (!syncFailed) setLastSyncedAt(new Date());
      setHydrated(true);
    }
    void loadWorkspace();
    client.storage.from("progress-photos").list(session.user.id, { limit: 1, sortBy: { column: "created_at", order: "desc" } }).then(async ({ data }) => {
      if (!data?.[0]) return;
      const { data: signed } = await client.storage.from("progress-photos").createSignedUrl(`${session.user.id}/${data[0].name}`, 3600);
      if (signed?.signedUrl) setPhoto(signed.signedUrl);
    });
  }, [session]);

  useEffect(() => {
    if (hydrated && !preview) window.localStorage.setItem("momentum-90-logs", JSON.stringify(logs));
  }, [logs, hydrated, preview]);

  const torontoToday = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const today = new Date(`${torontoToday}T12:00:00Z`);
  const todayKey = dateKey(today);
  const todayLog = logs[todayKey] ?? EMPTY_LOG;
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = addDays(start, 89);
  const dayNumber = Math.min(90, Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1));
  const daysRemaining = Math.min(90, Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000) + 1));
  const visibleChartDays = preview ? chartRange : Math.min(chartRange, dayNumber);
  const chartEnd = today > end ? end : today;
  const chartDates = Array.from({ length: visibleChartDays }, (_, index) => addDays(chartEnd, index - visibleChartDays + 1));
  const challengeWeekIndex = Math.floor((dayNumber - 1) / 7);
  const weekDayCount = ((dayNumber - 1) % 7) + 1;
  const challengeWeekStart = addDays(start, challengeWeekIndex * 7);
  const weekDates = Array.from({ length: weekDayCount }, (_, index) => addDays(challengeWeekStart, index));
  const hasPreviousWeek = challengeWeekIndex > 0;
  const previousWeekDates = hasPreviousWeek ? Array.from({ length: weekDayCount }, (_, index) => addDays(challengeWeekStart, index - 7)) : [];
  const weekScores = weekDates.map((date) => score(logs[dateKey(date)] ?? EMPTY_LOG, dateKey(date), jobSecuredOn, instagramStartedOn));
  const previousScores = previousWeekDates.map((date) => score(logs[dateKey(date)] ?? EMPTY_LOG, dateKey(date), jobSecuredOn, instagramStartedOn));
  const weeklyScore = average(weekScores);
  const previousScore = average(previousScores);
  const weeklyDelta = weeklyScore - previousScore;
  const careerActiveToday = careerIsActive(todayKey, jobSecuredOn);
  const instagramActiveToday = instagramIsActive(todayKey, instagramStartedOn);
  const contentVolumeActiveToday = todayKey >= CONTENT_VOLUME_START_DATE;
  const xPostsToday = xPostCount(todayLog);
  const todayPoints = goalPoints(todayLog, todayKey, jobSecuredOn, instagramStartedOn);
  const todayGoalScores = categoryScores(todayLog, todayKey, jobSecuredOn, instagramStartedOn);
  const todayScore = score(todayLog, todayKey, jobSecuredOn, instagramStartedOn);
  const scalpStreak = currentStreak(logs, today, (log) => log.scalpMassage);
  const xPostsRemaining = Math.max(0, 15 - xPostsToday);
  const distributionComplete = xPostsRemaining === 0 && todayLog.linkedin;
  const todayPlan = todayLog.plan ?? DEFAULT_PLAN;
  const focusComplete = (key: FocusKey) => key === "x" ? xPostsToday >= 15 : key === "jobs" ? todayLog.jobs >= 10 : Boolean(todayLog[key]);
  const focusItems = (["x", "linkedin", ...(careerActiveToday ? ["jobs" as const] : []), "careerGrowth"] as FocusKey[]).map((key) => ({ key, ...FOCUS_META[key], minutes: todayPlan.allocations[key], complete: focusComplete(key) }));
  const plannedMinutes = focusItems.reduce((sum, item) => sum + item.minutes, 0);
  const bufferMinutes = Math.max(0, todayPlan.capacityMinutes - plannedMinutes);
  const planOverage = Math.max(0, plannedMinutes - todayPlan.capacityMinutes);
  const planExecution = plannedMinutes ? Math.round((focusItems.filter((item) => item.complete).reduce((sum, item) => sum + item.minutes, 0) / plannedMinutes) * 100) : 0;
  const mustWinKey: FocusKey = !focusComplete("x") ? "x" : !focusComplete("linkedin") ? "linkedin" : focusItems.find((item) => !item.complete)?.key ?? "careerGrowth";
  const totalJobs = Object.values(logs).reduce((sum, log) => sum + log.jobs, 0);
  const totalPosts = Object.entries(logs).reduce((sum, [logDate, log]) => sum + xPostCount(log) + Number(log.linkedin) + Number(instagramIsActive(logDate, instagramStartedOn) && log.instagram), 0);
  const weightEntries = Object.entries(logs).filter((entry): entry is [string, DayLog & { weight: number }] => typeof entry[1].weight === "number").sort(([a], [b]) => a.localeCompare(b));
  const latestWeight = weightEntries.at(-1)?.[1].weight ?? 0;
  const weightChange = latestWeight - 0;
  const weeklyWeightEntries = weightEntries.slice(-12).map(([date, log]) => [date, log.weight] as [string, number]);
  const bodyFat = 64 - 20 * (0 / (0 * 2.54));
  const categoryAverage = (dates: Date[], category: GoalName) => average(dates.filter((date) => category !== "Hair" || dateKey(date) >= WELLNESS_START_DATE).map((date) => categoryScores(logs[dateKey(date)] ?? EMPTY_LOG, dateKey(date), jobSecuredOn, instagramStartedOn)[category]));
  const weeklyCategories = (["Audience", "Career", "Body", "Hair"] as const).map((category) => ({ category, value: categoryAverage(weekDates, category) }));
  const strongestCategory = [...weeklyCategories].sort((a, b) => b.value - a.value)[0];
  const weakestCategory = [...weeklyCategories].sort((a, b) => a.value - b.value)[0];
  const reviewAvailable = dayNumber >= 7;

  function updateToday(patch: Partial<DayLog>) {
    const next = { ...(preview ? EMPTY_LOG : logs[todayKey] ?? EMPTY_LOG), ...patch };
    if (preview) setPreview(false);
    setLogs((current) => ({ ...(preview ? {} : current), [todayKey]: next }));
    if (supabase && session) {
      setSyncState("saving");
      supabase.from("daily_logs").upsert({ user_id: session.user.id, log_date: todayKey, data: next }).then(({ error }) => {
        if (error) {
          setSyncState("error");
          setNotice("Cloud sync paused. Your latest change is still saved in this browser.");
        } else {
          setSyncState("saved");
          setLastSyncedAt(new Date());
        }
      });
    }
  }

  function updatePlan(patch: Partial<DayPlan>) {
    updateToday({ plan: { ...todayPlan, ...patch } });
  }

  function updatePlanMinutes(key: FocusKey, amount: number) {
    updatePlan({ allocations: { ...todayPlan.allocations, [key]: Math.max(15, todayPlan.allocations[key] + amount) }, approved: false });
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    if (supabase && session) {
      setSyncState("saving");
      const path = `${session.user.id}/day-${dayNumber}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
      const { error } = await supabase.storage.from("progress-photos").upload(path, file);
      setSyncState(error ? "error" : "saved");
      if (!error) setLastSyncedAt(new Date());
      setNotice(error ? "The preview is ready, but the private upload did not finish." : "Photo saved privately to your transformation timeline.");
    } else {
      setNotice("Photo preview added. Supabase will keep it private after cloud sync is connected.");
    }
  }

  async function leavePreview(chosenStart = START_DATE) {
    setPreview(false);
    setLogs({});
    setStartDate(chosenStart);
    window.localStorage.setItem("momentum-90-start", chosenStart);
    window.localStorage.setItem("momentum-90-started", "true");
    if (supabase && session) {
      setSyncState("saving");
      const { error } = await supabase.from("profiles").upsert({ user_id: session.user.id, start_date: chosenStart, height_cm: 0, start_weight_kg: 0, waist_in: 0 });
      setSyncState(error ? "error" : "saved");
      if (!error) setLastSyncedAt(new Date());
      if (error) setNotice("The challenge started here, but the cloud profile still needs to sync.");
    }
    if (!supabase || !session) setNotice(`Your 90-day workspace is ready. The challenge begins ${new Date(`${chosenStart}T12:00:00Z`).toLocaleDateString("en-CA", { month: "long", day: "numeric", timeZone: "UTC" })}.`);
  }

  function updateJobOutcome(date: string | null) {
    setJobSecuredOn(date);
    if (date) window.localStorage.setItem("momentum-90-job-secured", date);
    else window.localStorage.removeItem("momentum-90-job-secured");
    if (supabase && session) {
      setSyncState("saving");
      supabase.from("profiles").update({ job_secured_on: date }).eq("user_id", session.user.id).then(({ error }) => {
        setSyncState(error ? "error" : "saved");
        if (!error) setLastSyncedAt(new Date());
      });
    }
    setNotice(date ? "Career goal reached. Daily applications are now retired from your score." : "The job-search goal is active again.");
  }

  function startInstagram() {
    setInstagramStartedOn(todayKey);
    window.localStorage.setItem("momentum-90-instagram-started", todayKey);
    if (supabase && session) {
      setSyncState("saving");
      supabase.from("profiles").update({ instagram_started_on: todayKey }).eq("user_id", session.user.id).then(({ error }) => {
        setSyncState(error ? "error" : "saved");
        if (!error) setLastSyncedAt(new Date());
      });
    }
    setNotice("Instagram is active from today. Earlier scores stay unchanged.");
  }

  function downloadBackup() {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: { startDate, jobSecuredOn, instagramStartedOn },
      logs,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `momentum-90-backup-${todayKey}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice("A versioned backup of your challenge analytics was downloaded.");
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as { version?: number; profile?: { startDate?: string; jobSecuredOn?: string | null; instagramStartedOn?: string | null }; logs?: Logs };
      if (backup.version !== 1 || !backup.logs || Array.isArray(backup.logs)) throw new Error("Invalid backup");
      if (!window.confirm("Merge this backup into your current challenge? Matching dates will use the backup copy.")) return;
      const mergedLogs = { ...logs, ...backup.logs };
      const restoredStart = backup.profile?.startDate ?? startDate;
      const restoredJobDate = backup.profile && "jobSecuredOn" in backup.profile ? backup.profile.jobSecuredOn ?? null : jobSecuredOn;
      const restoredInstagramDate = backup.profile && "instagramStartedOn" in backup.profile ? backup.profile.instagramStartedOn ?? null : instagramStartedOn;
      if (supabase && session) {
        setSyncState("saving");
        const profileResult = await supabase.from("profiles").upsert({ user_id: session.user.id, start_date: restoredStart, job_secured_on: restoredJobDate, instagram_started_on: restoredInstagramDate });
        const rows = Object.entries(backup.logs).map(([log_date, data]) => ({ user_id: session.user.id, log_date, data }));
        const logsResult = rows.length ? await supabase.from("daily_logs").upsert(rows) : null;
        if (profileResult.error || logsResult?.error) throw new Error("Cloud restore failed");
        setSyncState("saved");
        setLastSyncedAt(new Date());
      }
      setLogs(mergedLogs);
      setStartDate(restoredStart);
      setJobSecuredOn(restoredJobDate);
      setInstagramStartedOn(restoredInstagramDate);
      window.localStorage.setItem("momentum-90-logs", JSON.stringify(mergedLogs));
      window.localStorage.setItem("momentum-90-start", restoredStart);
      if (restoredJobDate) window.localStorage.setItem("momentum-90-job-secured", restoredJobDate);
      else window.localStorage.removeItem("momentum-90-job-secured");
      if (restoredInstagramDate) window.localStorage.setItem("momentum-90-instagram-started", restoredInstagramDate);
      else window.localStorage.removeItem("momentum-90-instagram-started");
      setNotice("Backup merged successfully. Existing dates not in the backup were preserved.");
    } catch {
      if (supabase && session) setSyncState("error");
      setNotice("Restore could not be completed. Your local challenge data was left unchanged.");
    }
  }

  if (isSupabaseConfigured && !authReady) return <main className="loading-shell">Preparing your private workspace…</main>;
  if (isSupabaseConfigured && !session) return <SignIn />;
  if (activeFocus) return <FocusView task={activeFocus} minutes={todayPlan.allocations[activeFocus]} log={todayLog} onBack={() => setActiveFocus(null)} onUpdate={updateToday} onBlocked={() => {
    setNotice(`Make it smaller: ${FOCUS_META[activeFocus].firstStep}`);
    setActiveFocus(null);
  }} />;

  const milestones = [
    { day: 1, label: "Begin" }, { day: 10, label: "Proof" }, { day: 25, label: "Rhythm" },
    { day: 45, label: "Halfway" }, { day: 60, label: "Identity" }, { day: 75, label: "Finish mode" }, { day: 90, label: "Transform" },
  ].map((milestone) => ({ ...milestone, date: addDays(start, milestone.day - 1).toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }) }));
  const challengeDays = Array.from({ length: 90 }, (_, index) => addDays(start, index));
  const elapsedChallengeDays = challengeDays.slice(0, dayNumber);
  const challengeScore = average(elapsedChallengeDays.map((date) => score(logs[dateKey(date)] ?? EMPTY_LOG, dateKey(date), jobSecuredOn, instagramStartedOn)));
  const cleanDays = elapsedChallengeDays.filter((date) => logs[dateKey(date)]?.cleanFood).length;
  const strengthDays = elapsedChallengeDays.filter((date) => logs[dateKey(date)]?.strength).length;
  const averageSteps = average(elapsedChallengeDays.map((date) => logs[dateKey(date)]?.steps ?? 0));
  const challengeXp = elapsedChallengeDays.reduce((total, date) => {
    const logDate = dateKey(date);
    const log = logs[logDate] ?? EMPTY_LOG;
    const extraXPosts = logDate >= CONTENT_VOLUME_START_DATE ? Math.max(0, xPostCount(log) - 15) : 0;
    return total + score(log, logDate, jobSecuredOn, instagramStartedOn) * 10 + extraXPosts * 10;
  }, 0);
  const level = Math.floor(challengeXp / 1000) + 1;
  const levelXp = challengeXp % 1000;

  return (
    <main className="app-shell">
      <section className="content" id="overview">
        <header className="topbar">
          <div className="topbar-copy"><div className="topbar-brand"><span className="brand-mark"><Image src="/momentum-logo.png" alt="" width={30} height={30} priority /></span><strong>Momentum</strong><span className="private-mark">Private workspace</span></div><p className="topbar-date">{today.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}</p><h1><span>Build the evidence.</span><em>Use the day well.</em></h1></div>
          <div className="challenge-summary">
            <div className="challenge-summary-head"><span>90-day challenge</span><strong>{daysRemaining}<small>{daysRemaining === 1 ? "day left" : "days left"}</small></strong></div>
            <div className="progress-track"><span style={{ width: `${(dayNumber / 90) * 100}%` }} /></div>
            <div className="xp-row"><span>Level {level}</span><i><b style={{ width: `${levelXp / 10}%` }} /></i><strong>{levelXp.toLocaleString("en-CA")} XP</strong></div>
            <div className="challenge-summary-foot"><span>Finish · {end.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</span>{session && <button onClick={() => supabase?.auth.signOut()}>Sign out</button>}</div>
          </div>
        </header>

        {preview && <div className="preview-banner"><span><strong>Preview data</strong> — See how your analytics will feel once you build momentum.</span><div><button onClick={() => leavePreview(todayKey)}>Start today</button><button className="ghost-start" onClick={() => leavePreview(dateKey(addDays(today, -1)))}>Started yesterday</button></div></div>}
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

        <section className="dashboard-grid">
          <article className={todayPlan.approved ? "panel plan-panel approved" : "panel plan-panel"}>
            <div className="plan-header">
              <div><h2>{todayPlan.approved ? "Today’s committed plan" : "Your proposed focus plan"}</h2><p>{todayPlan.approved ? `${planExecution}% of planned focus completed` : "Review the allocation, then commit to the day."}</p></div>
              <div className="capacity-control"><span>Daily capacity</span><div><button aria-label="Reduce daily focus capacity" onClick={() => updatePlan({ capacityMinutes: Math.max(180, todayPlan.capacityMinutes - 15), approved: false })} disabled={todayPlan.capacityMinutes <= 180}>−</button><strong>{Math.floor(todayPlan.capacityMinutes / 60)}<small>h</small> {todayPlan.capacityMinutes % 60 ? <>{todayPlan.capacityMinutes % 60}<small>m</small></> : null}</strong><button aria-label="Increase daily focus capacity" onClick={() => updatePlan({ capacityMinutes: todayPlan.capacityMinutes + 15, approved: false })}>+</button></div></div>
            </div>
            <section className="must-win">
              <div className="must-win-copy"><h3>{distributionComplete ? `Must win: ${FOCUS_META[mustWinKey].label}` : "Must win: complete today’s distribution"}</h3><p>{distributionComplete ? FOCUS_META[mustWinKey].why : "Reach 15 X posts and publish once on LinkedIn before lower-impact work takes over the day."}</p></div>
              {todayPlan.approved ? <button onClick={() => setActiveFocus(mustWinKey)}><UiIcon name="focus" />Focus</button> : <span className="approval-required">Approve the plan below</span>}
            </section>
            <div className="plan-ledger">
              {focusItems.map((item) => <div className={item.complete ? "plan-row complete" : "plan-row"} key={item.key}>
                <span className="plan-status">{item.complete ? <UiIcon name="check" /> : <i />}</span>
                <span className="plan-task"><strong>{item.label}</strong><small>{item.why}</small></span>
                <span className="plan-duration">{item.minutes} min</span>
                {!todayPlan.approved ? <span className="plan-adjust"><button aria-label={`Reduce time for ${item.label}`} onClick={() => updatePlanMinutes(item.key, -5)}>−</button><button aria-label={`Increase time for ${item.label}`} onClick={() => updatePlanMinutes(item.key, 5)}>+</button></span> : <button className="plan-focus" onClick={() => setActiveFocus(item.key)}>{item.complete ? "Review" : "Start"}<UiIcon name="arrow" /></button>}
              </div>)}
              <div className={planOverage ? "plan-row buffer over" : "plan-row buffer"}><span className="plan-status"><i /></span><span className="plan-task"><strong>{planOverage ? "Plan exceeds capacity" : "Flex buffer"}</strong><small>{planOverage ? "Reduce a block or increase today’s capacity before committing." : "Space for transitions, delays, and the unexpected."}</small></span><span className="plan-duration">{planOverage ? `+${planOverage}` : bufferMinutes} min</span></div>
            </div>
            <div className="plan-footer">
              <div className="capacity-bar" role="progressbar" aria-label="Planned focus capacity" aria-valuenow={Math.min(100, Math.round((plannedMinutes / todayPlan.capacityMinutes) * 100))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, (plannedMinutes / todayPlan.capacityMinutes) * 100)}%` }} /></div>
              {!todayPlan.approved ? <button className="commit-plan" disabled={Boolean(planOverage)} onClick={() => updatePlan({ approved: true })}>Commit to this plan <UiIcon name="arrow" /></button> : <><div className="day-review"><span>Did this plan fit?</span>{(["yes", "tight", "no"] as const).map((fit) => <button className={todayPlan.planFit === fit ? "active" : ""} key={fit} onClick={() => updatePlan({ planFit: fit })}>{fit === "yes" ? "Yes" : fit === "tight" ? "Barely" : "No"}</button>)}</div><button className="replan" onClick={() => updatePlan({ approved: false })}>Replan today</button></>}
            </div>
          </article>

          <section className="kpi-grid" aria-label="Key metrics">
            <article className="kpi-card featured"><div className="kpi-top"><span>Weekly score</span><span className={hasPreviousWeek && weeklyDelta >= 0 ? "delta positive" : "delta"}>{hasPreviousWeek ? `${weeklyDelta >= 0 ? "+" : ""}${weeklyDelta}%` : `Week ${challengeWeekIndex + 1}`}</span></div><div className="kpi-value">{weeklyScore}<small>/100</small></div><MiniLine values={weekScores} /><p>{hasPreviousWeek ? `Previous week · ${previousScore}` : `${weekDayCount} of 7 days recorded`}</p></article>
            <article className={jobSecuredOn ? "kpi-card job-kpi secured" : "kpi-card job-kpi"}><div className="kpi-top"><span>{jobSecuredOn ? "Career outcome" : "Job applications"}</span><span className={jobSecuredOn ? "status-dot" : "blue-dot"} /></div><div className="kpi-value">{jobSecuredOn ? "Secured" : totalJobs}<small>{jobSecuredOn ? "goal reached" : "total"}</small></div>{jobSecuredOn ? <div className="career-win-line"><span>Applications retired</span><button onClick={() => updateJobOutcome(null)}>Reopen</button></div> : <><MiniLine values={weekDates.map((date) => Math.min((logs[dateKey(date)]?.jobs ?? 0) * 10, 100))} color="#2879ff" /><p>Daily target · 10 applications</p></>}</article>
            <article className="kpi-card"><div className="kpi-top"><span>Content published</span><span className="orange-dot" /></div><div className="kpi-value">{totalPosts}<small>posts</small></div><MiniLine values={weekDates.map((date) => {
              const log = logs[dateKey(date)] ?? EMPTY_LOG;
              return categoryScores(log, dateKey(date), jobSecuredOn, instagramStartedOn).Audience;
            })} color="#f5a623" /><p>{instagramStartedOn ? "Across X, LinkedIn & Instagram" : "X & LinkedIn · Instagram upcoming"}</p></article>
          </section>

          <article className="panel chart-panel">
            <div className="panel-header"><h2>Daily score trend</h2><div className="chart-range" role="group" aria-label="Momentum chart range">{([14, 30, 90] as const).map((range) => <button type="button" key={range} className={chartRange === range ? "active" : ""} aria-pressed={chartRange === range} onClick={() => setChartRange(range)}>{range === 90 ? "90 days" : `${range} days`}</button>)}</div></div>
            <TrendChart logs={logs} dates={chartDates} jobSecuredOn={jobSecuredOn} instagramStartedOn={instagramStartedOn} />
          </article>

          <article className="panel daily-panel" id="today">
            <div className="panel-header"><h2>Today’s weighted commitments</h2><span className="score-ring" role="progressbar" aria-label="Today’s score" aria-valuenow={todayScore} aria-valuemin={0} aria-valuemax={100} style={{ "--score": `${todayScore * 3.6}deg` } as React.CSSProperties}>{todayScore}%</span></div>
            <section className="goal-balance" aria-label="Today’s impact by goal">
              <div className="goal-balance-head"><strong>Score by goal</strong><span>Weighted contribution today</span></div>
              <div className="goal-grid">
                <GoalProgress name="Audience" value={todayGoalScores.Audience} points={todayPoints.Audience} total={35} color="#ff6b43" />
                <GoalProgress name="Career" value={todayGoalScores.Career} points={todayPoints.Career} total={25} color="#16b364" />
                <GoalProgress name="Body" value={todayGoalScores.Body} points={todayPoints.Body} total={30} color="#48a0f8" />
                <GoalProgress name="Hair" value={todayGoalScores.Hair} points={todayPoints.Hair} total={10} color="#d28b31" />
              </div>
            </section>
            <div className="habit-list">
              <section className="task-group focus-checks">
                <div className="task-group-head"><strong>Focus commitments</strong><span>High-impact work from the plan</span></div>
                {HABITS.filter((habit) => ["linkedin", "careerGrowth", "instagram"].includes(habit.key)).map((habit) => habit.key === "instagram" && !instagramActiveToday ? (
                  <div className="habit-row upcoming-habit" key={habit.key}><span className="upcoming-mark"><UiIcon name="pause" /></span><span className="habit-copy"><strong>Instagram posting</strong><small>Part of the 90-day goal · starts when you’re ready</small></span><button onClick={startInstagram}>Start Instagram</button></div>
                ) : (
                  <label className="habit-row" key={habit.key}>
                    <input type="checkbox" checked={todayLog[habit.key]} onChange={() => updateToday({ [habit.key]: !todayLog[habit.key] })} />
                    <span className="custom-check"><UiIcon name="check" /></span><span className="habit-copy"><strong>{habit.label}</strong><small>{habit.note}</small></span><span className={`group-tag ${habit.group.toLowerCase()}-tag`}>{habit.group} · {habitImpact(habit.key, instagramActiveToday, careerActiveToday)} pts</span>
                  </label>
                ))}
              </section>
              <section className="task-group focus-metrics">
                <div className="task-group-head"><strong>Measured focus</strong><span>Update the outcome, not the clock</span></div>
                {contentVolumeActiveToday && <div className="number-row content-volume-row"><span className="task-copy"><span className="task-heading"><strong>X distribution</strong><em>Audience · 20 pts</em></span><small>15 minimum · every extra post earns XP</small></span><MetricStepper label="X posts today" value={xPostsToday} step={1} unit="posts" complete={xPostsToday >= 15} onChange={(xPosts) => updateToday({ xPosts })} /></div>}
                {careerActiveToday ? <div className="number-row"><span className="task-copy"><span className="task-heading"><strong>Job applications</strong><em>Career · 12 pts</em></span><small>Target · 10 quality applications</small></span><div className="job-controls"><div className="stepper"><button aria-label="Remove one application" onClick={() => updateToday({ jobs: Math.max(0, todayLog.jobs - 1) })}>−</button><strong>{todayLog.jobs}</strong><button aria-label="Add one application" onClick={() => updateToday({ jobs: todayLog.jobs + 1 })}>+</button></div><button className="job-won-button" onClick={() => updateJobOutcome(todayKey)}>I got the job</button></div></div> : <div className="job-secured-row"><span><UiIcon name="check" /></span><div><strong>Job secured</strong><small>Applications retired · career opportunity work is now worth 25 points</small></div><button onClick={() => updateJobOutcome(null)}>Reopen</button></div>}
              </section>
              <section className="task-group maintenance-checks">
                <div className="task-group-head"><strong>Maintenance</strong><span>Protect the routines that keep you capable</span></div>
                {HABITS.filter((habit) => ["cleanFood", "protein", "strength", "scalpMassage"].includes(habit.key)).map((habit) => habit.key === "strength" && todayLog.recovery ? (
                  <div className="habit-row recovery-habit" key={habit.key}><span className="recovery-mark"><UiIcon name="pause" /></span><span className="habit-copy"><strong>Strength recovery</strong><small>Planned recovery · protects your 7 body points</small></span><button onClick={() => updateToday({ recovery: false })}>Restore workout</button></div>
                ) : (
                  <label className="habit-row" key={habit.key}>
                    <input type="checkbox" checked={todayLog[habit.key]} onChange={() => updateToday({ [habit.key]: !todayLog[habit.key] })} />
                    <span className="custom-check"><UiIcon name="check" /></span><span className="habit-copy"><strong>{habit.label}</strong><small>{habit.key === "scalpMassage" && scalpStreak ? `${scalpStreak}-day streak ${todayLog.scalpMassage ? "protected" : "at risk today"}` : habit.note}</small></span><span className={`group-tag ${habit.group.toLowerCase()}-tag`}>{habit.group} · {habitImpact(habit.key, instagramActiveToday, careerActiveToday)} pts</span>
                  </label>
                ))}
                {!todayLog.recovery && <button className="plan-recovery" onClick={() => updateToday({ recovery: true, strength: false })}><span><UiIcon name="pause" /></span><span><strong>Plan strength recovery</strong><small>Use only when your body genuinely needs it</small></span><em>Plan day</em></button>}
              </section>
              <section className="task-group maintenance-metrics">
                <div className="task-group-head"><strong>Daily measures</strong><span>Fast updates, separate from focus time</span></div>
                <div className="number-row"><span className="task-copy"><span className="task-heading"><strong>Daily steps</strong><em>Body · 4 pts</em></span><small>Target · 10,000</small></span><MetricStepper label="steps today" value={todayLog.steps} step={500} unit="steps" complete={todayLog.steps >= 10000} onChange={(steps) => updateToday({ steps })} /></div>
                <div className="number-row"><span className="task-copy"><span className="task-heading"><strong>Water intake</strong><em>Body · 5 pts</em></span><small>3 L earns full points · 4 L is optional</small></span><MetricStepper label="water intake today in litres" value={todayLog.water ?? 0} step={0.25} unit="L" complete={(todayLog.water ?? 0) >= 3} onChange={(water) => updateToday({ water })} /></div>
              </section>
            </div>
          </article>

          <article className="panel weekly-panel" id="weekly">
            <div className="panel-header"><h2>This week vs. last week</h2>{hasPreviousWeek ? <span className={weeklyDelta >= 0 ? "delta positive" : "delta"}>{weeklyDelta >= 0 ? "+" : ""}{weeklyDelta}% overall</span> : <span className="range-pill">First week</span>}</div>
            <div className="comparison-grid">
              {(["Audience", "Career", "Body", "Hair"] as const).map((category) => {
                const current = categoryAverage(weekDates, category);
                const prior = hasPreviousWeek ? categoryAverage(previousWeekDates, category) : 0;
                const change = current - prior;
                const color = { Audience: "#ff6b43", Career: "#16b364", Body: "#48a0f8", Hair: "#d28b31" }[category];
                return <section className="comparison-card" key={category} style={{ "--category-color": color } as React.CSSProperties}>
                  <div className="comparison-card-head"><span><i />{category}</span><em className={!hasPreviousWeek ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat"}>{hasPreviousWeek ? `${change > 0 ? "↑" : change < 0 ? "↓" : "→"} ${Math.abs(change)}%` : "Week 1"}</em></div>
                  <div className="comparison-score"><strong>{current}</strong><span>%<small>this week</small></span></div>
                  <div className="week-bars" role="img" aria-label={hasPreviousWeek ? `${category}: ${current}% this week, ${prior}% for the same period last week` : `${category}: ${current}% in the first challenge week`}>
                    <div><span>This week</span><i><b style={{ width: `${current}%` }} /></i><strong>{current}</strong></div>
                    {hasPreviousWeek && <div className="previous"><span>Last week</span><i><b style={{ width: `${prior}%` }} /></i><strong>{prior}</strong></div>}
                  </div>
                </section>;
              })}
            </div>
          </article>

          {reviewAvailable && <article className="panel assistant-panel">
            <div className="assistant-heading"><h2>Weekly review: what the data suggests</h2><span className="range-pill">Days {challengeWeekIndex * 7 + 1}–{dayNumber}</span></div>
            <div className="assistant-insights"><div className="win"><p>Strongest</p><strong>{strongestCategory.category} led the week at {strongestCategory.value}%.</strong></div><div className="watch"><p>Needs attention</p><strong>{weakestCategory.category} was the lowest system at {weakestCategory.value}%.</strong></div><div className="adjust"><p>Next move</p><strong>{hasPreviousWeek ? weeklyDelta >= 0 ? `Protect the routines creating your +${weeklyDelta}% momentum.` : `Simplify the next week and rebuild ${weakestCategory.category.toLowerCase()} consistency first.` : `Carry your strongest ${strongestCategory.category.toLowerCase()} routine into Week 2.`}</strong></div></div>
          </article>}

          <article className="panel heatmap-panel">
            <div className="panel-header"><h2>90-day consistency</h2><span className="range-pill">{daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining</span></div>
            <div className="heatmap-wrap">
              <div className="heatmap" role="img" aria-label="90-day consistency map">
                {challengeDays.map((date, index) => {
                  const value = score(logs[dateKey(date)] ?? EMPTY_LOG, dateKey(date), jobSecuredOn, instagramStartedOn);
                  const future = date.getTime() > today.getTime();
                  const intensity = future ? "future" : value >= 75 ? "high" : value >= 40 ? "mid" : value > 0 ? "low" : "empty";
                  return <span key={dateKey(date)} className={`heat-cell ${intensity}`} title={`Day ${index + 1} · ${date.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })} · ${value}%`} />;
                })}
              </div>
              <div className="heatmap-legend"><span>Less</span><i className="heat-cell empty" /><i className="heat-cell low" /><i className="heat-cell mid" /><i className="heat-cell high" /><span>Momentum</span></div>
            </div>
          </article>

          <article className="panel body-panel" id="body">
            <div className="panel-header"><h2>Weekly weight trend</h2><span className="range-pill">Weekly check-in</span></div>
            <div className="body-metrics"><div><span>Weekly weigh-in</span><strong className="editable-metric"><input aria-label="Latest weight in kilograms" type="number" min="35" max="250" step="0.1" value={latestWeight} onChange={(event) => updateToday({ weight: Number(event.target.value) })} /><small>kg</small></strong><em>Saved against today</em></div><div><span>Change from start</span><strong>{weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} <small>kg</small></strong><em>Start</em></div><div><span>RFM estimate</span><strong>{bodyFat.toFixed(1)}<small>%</small></strong><em>Directional estimate</em></div><div><span>Goal</span><strong>goal <small>kg</small></strong><em>Retain strength and muscle</em></div></div>
            <WeightTrend entries={weeklyWeightEntries} />
            <div className="body-note"><span>i</span><p>Scale weight is only one signal. Use the trend with strength consistency and progress photos; the body-fat figure is a directional estimate from your starting measurements.</p></div>
          </article>

          <article className="panel photos-panel">
            <div className="panel-header"><h2>Visual progress</h2><span className="range-pill">Private</span></div>
            <div className="photo-content">
              <div className={photo ? "photo-preview has-photo" : "photo-preview"} style={photo ? { backgroundImage: `url(${photo})` } : undefined}><span>{photo ? "Day 1" : "Your first photo"}</span></div>
              <div><h3>Let the mirror catch what the scale misses.</h3><p>Add photos at the start, Day 30, Day 60, and Day 90. They stay visible only to you.</p><label className="upload-button"><input type="file" accept="image/*" onChange={handlePhoto} />{photo ? "Replace preview" : "Add starting photo"}</label></div>
            </div>
          </article>

          <article className="panel milestone-panel" id="milestones">
            <div className="panel-header"><h2>Challenge milestones</h2><span className="range-pill">90 days</span></div>
            <div className="milestone-track">
              {milestones.map((milestone) => (
                <div className={dayNumber >= milestone.day ? "milestone reached" : "milestone"} key={milestone.day}><span>{dayNumber >= milestone.day ? <UiIcon name="check" /> : milestone.day}</span><strong>Day {milestone.day}</strong><small>{milestone.label} · {milestone.date}</small></div>
              ))}
            </div>
          </article>
          {dayNumber >= 90 && <article className="panel end-summary">
            <div className="panel-header"><h2>Day 90: your transformation, documented</h2><span className="range-pill">Final report</span></div>
            <div className="end-summary-grid"><div><span>Overall momentum</span><strong>{challengeScore}%</strong></div><div><span>Weight change</span><strong>{weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg</strong></div><div><span>Clean-eating days</span><strong>{cleanDays}</strong></div><div><span>Strength sessions</span><strong>{strengthDays}</strong></div><div><span>Average steps</span><strong>{averageSteps.toLocaleString("en-CA")}</strong></div><div><span>Applications · Posts</span><strong>{totalJobs} · {totalPosts}</strong></div></div>
          </article>}
        </section>
        <footer><span>Momentum · Your private transformation OS</span><div className="footer-data"><span className={`sync-state ${syncState}`}><i />{syncState === "saving" ? "Saving to cloud…" : syncState === "saved" ? `Cloud saved${lastSyncedAt ? ` · ${lastSyncedAt.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}` : ""}` : syncState === "error" ? "Cloud sync needs attention" : "Saved in this browser"}</span><button onClick={downloadBackup}>Download backup</button><label><input type="file" accept="application/json" onChange={restoreBackup} />Restore backup</label></div></footer>
      </section>
    </main>
  );
}
