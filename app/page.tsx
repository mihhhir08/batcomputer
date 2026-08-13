"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type BinaryKey = "x" | "linkedin" | "instagram" | "cleanFood" | "protein" | "strength" | "scalpMassage" | "careerGrowth";
type DayLog = Record<BinaryKey, boolean> & {
  jobs: number;
  steps: number;
  water: number;
  xPosts?: number;
  recovery: boolean;
  weight?: number;
  waist?: number;
  closedAt?: string | null;
};

type Logs = Record<string, DayLog>;
type GoalName = "Audience" | "Career" | "Body" | "Hair";
type SignalKey = BinaryKey | "xPosts" | "jobs" | "steps" | "water" | "weight" | "waist" | "overall" | "audience" | "career" | "body" | "hair" | "xp";

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

function UiIcon({ name }: { name: "check" | "pause" }) {
  return <svg className="ui-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    {name === "check" && <path d="m3.25 8.25 3 3 6.5-6.5" />}
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

function bestStreak(logs: Logs, dates: Date[], completed: (log: DayLog) => boolean) {
  let best = 0;
  let current = 0;
  dates.forEach((date) => {
    const log = logs[dateKey(date)];
    current = log && completed(log) ? current + 1 : 0;
    best = Math.max(best, current);
  });
  return best;
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

function MiniLine({ values, color = "#78ddeb" }: { values: number[]; color?: string }) {
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
    <defs><linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#78ddeb" stopOpacity=".22" /><stop offset="1" stopColor="#78ddeb" stopOpacity="0" /></linearGradient></defs>
    <path d={`M${x(0)} 92 L${points.replaceAll(" ", " L")} L${x(entries.length - 1)} 92 Z`} fill="url(#weight-fill)" />
    <polyline key={entries.length} className="weight-line" points={points} fill="none" />
    {entries.map(([date, value], index) => <circle key={date} cx={x(index)} cy={y(value)} r="3.5"><title>{date} · {value} kg</title></circle>)}
  </svg></div>;
}

function TrendChart({ logs, dates, startDate, jobSecuredOn, instagramStartedOn }: { logs: Logs; dates: Date[]; startDate: string; jobSecuredOn: string | null; instagramStartedOn: string | null }) {
  const colors = { Overall: "#78ddeb", Audience: "#a9dce3", Career: "#68b99b" } as const;
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
  const missionStart = new Date(`${startDate}T12:00:00Z`);
  const milestoneDays = new Set([10, 25, 45, 60, 75, 90]);

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
            <linearGradient id="momentum-bars" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.Overall} stopOpacity=".48" /><stop offset="1" stopColor={colors.Overall} stopOpacity=".04" /></linearGradient>
          </defs>
          <rect className="target-zone" x="44" y={y(100)} width="696" height={y(70) - y(100)} />
          <text x="52" y={y(70) - 7} className="target-label">TARGET BAND · 70–100</text>
          {[0, 50, 100].map((value) => (
            <g key={value}>
              <line x1="44" x2="740" y1={y(value)} y2={y(value)} className="grid-line" />
              <text x="6" y={y(value) + 4} className="axis-label">{value}%</text>
            </g>
          ))}
          {overall.observations.length > 1 && <path className="trend-area" d={areaPath(overall.observations.map(({ index, value }) => ({ x: x(index), y: y(value) })), y(0))} />}
          {overall.observations.map(({ index, value }) => (
            <rect key={`bar-${dates.length}-${dateKey(dates[index])}`} className="trend-bar" x={x(index) - barWidth / 2} y={y(value)} width={barWidth} height={y(0) - y(value)} rx="1">
              <title>{dates[index].toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })} · {value}% overall</title>
            </rect>
          ))}
          {dates.map((date, index) => {
            const day = Math.floor((date.getTime() - missionStart.getTime()) / 86400000) + 1;
            const log = logs[dateKey(date)];
            const careerEvent = jobSecuredOn === dateKey(date);
            const instagramEvent = instagramStartedOn === dateKey(date);
            if (!milestoneDays.has(day) && !log?.recovery && !careerEvent && !instagramEvent) return null;
            return <g key={`event-${dateKey(date)}`} className="chart-event">
              <line x1={x(index)} x2={x(index)} y1={y(100)} y2={y(0)} className="event-marker" />
              <circle cx={x(index)} cy={log?.recovery ? y(8) : careerEvent ? y(88) : instagramEvent ? y(82) : y(96)} r="3.5" className={log?.recovery ? "recovery-marker" : careerEvent ? "career-marker" : instagramEvent ? "activation-marker" : "milestone-marker"}>
                <title>{log?.recovery ? "Planned recovery" : careerEvent ? "Job secured" : instagramEvent ? "Instagram activated" : `Mission milestone · Day ${day}`}</title>
              </circle>
            </g>;
          })}
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
          {dates.map((date, index) => {
            const log = logs[dateKey(date)];
            if (!log) return null;
            const values = categoryScores(log, dateKey(date), jobSecuredOn, instagramStartedOn);
            const hitWidth = Math.max(16, 696 / Math.max(dates.length, 1));
            return <g key={`hit-${dateKey(date)}`} className="chart-day-hit">
              <line x1={x(index)} x2={x(index)} y1={y(100)} y2={y(0)} />
              <rect x={x(index) - hitWidth / 2} y={y(100)} width={hitWidth} height={y(0) - y(100)}>
                <title>{date.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })} · Overall {values.Overall}% · Audience {values.Audience}% · Career {values.Career}%{log.recovery ? " · Recovery planned" : ""}</title>
              </rect>
            </g>;
          })}
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
    <div className="goal-card-top"><span className="goal-dot" /><strong>{name}</strong><span className="goal-value">{Math.round(points)} / {total}</span></div>
    <div className="goal-progress" role="progressbar" aria-label={`${name} impact`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></div>
    <small>{Math.max(0, Math.round(total - points))} points remain available today</small>
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
        <span className="brand-mark"><Image src="/batcomputer-mark.svg" alt="" width={48} height={24} priority /></span>
        <h1>Access the Batcomputer.<br />Keep the evidence.</h1>
        <p>Enter your private mission terminal and sync the 90-day operation across devices.</p>
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
  const [selectedSignal, setSelectedSignal] = useState<SignalKey>("xPosts");
  const [inspectedDate, setInspectedDate] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [clock, setClock] = useState<Date | null>(null);
  const [booting, setBooting] = useState(false);
  const [syncState, setSyncState] = useState<"local" | "saving" | "saved" | "error">(isSupabaseConfigured ? "saving" : "local");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const commandInputRef = useRef<HTMLInputElement>(null);

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
    if (commandOpen) window.requestAnimationFrame(() => commandInputRef.current?.focus());
  }, [commandOpen]);

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

  useEffect(() => {
    if (!hydrated) return;
    const bootKey = "batcomputer-session-boot";
    if (window.sessionStorage.getItem(bootKey)) return;
    window.sessionStorage.setItem(bootKey, "complete");
    let finishTimer = 0;
    const startTimer = window.setTimeout(() => {
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 4000;
      setBooting(true);
      finishTimer = window.setTimeout(() => setBooting(false), duration);
    }, 0);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(finishTimer);
    };
  }, [hydrated, todayKey]);

  useEffect(() => {
    if (!inspectedDate) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setInspectedDate(null);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [inspectedDate]);

  useEffect(() => {
    const initial = window.setTimeout(() => setClock(new Date()), 0);
    const timer = window.setInterval(() => setClock(new Date()), 60000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const handleCommandKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", handleCommandKey);
    return () => window.removeEventListener("keydown", handleCommandKey);
  }, []);

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
  const weekScores = weekDates.flatMap((date) => logs[dateKey(date)] ? [score(logs[dateKey(date)], dateKey(date), jobSecuredOn, instagramStartedOn)] : []);
  const previousScores = previousWeekDates.flatMap((date) => logs[dateKey(date)] ? [score(logs[dateKey(date)], dateKey(date), jobSecuredOn, instagramStartedOn)] : []);
  const weeklyScore = average(weekScores);
  const previousScore = average(previousScores);
  const weeklyDelta = weeklyScore - previousScore;
  const weekLoggedCount = weekDates.filter((date) => Boolean(logs[dateKey(date)])).length;
  const weekClosedCount = weekDates.filter((date) => Boolean(logs[dateKey(date)]?.closedAt)).length;
  const careerActiveToday = careerIsActive(todayKey, jobSecuredOn);
  const instagramActiveToday = instagramIsActive(todayKey, instagramStartedOn);
  const contentVolumeActiveToday = todayKey >= CONTENT_VOLUME_START_DATE;
  const xPostsToday = xPostCount(todayLog);
  const todayPoints = goalPoints(todayLog, todayKey, jobSecuredOn, instagramStartedOn);
  const todayGoalScores = categoryScores(todayLog, todayKey, jobSecuredOn, instagramStartedOn);
  const todayScore = score(todayLog, todayKey, jobSecuredOn, instagramStartedOn);
  const scalpStreak = currentStreak(logs, today, (log) => log.scalpMassage);
  const totalJobs = Object.values(logs).reduce((sum, log) => sum + log.jobs, 0);
  const totalPosts = Object.entries(logs).reduce((sum, [logDate, log]) => sum + xPostCount(log) + Number(log.linkedin) + Number(instagramIsActive(logDate, instagramStartedOn) && log.instagram), 0);
  const weightEntries = Object.entries(logs).filter((entry): entry is [string, DayLog & { weight: number }] => typeof entry[1].weight === "number").sort(([a], [b]) => a.localeCompare(b));
  const latestWeight = weightEntries.at(-1)?.[1].weight ?? 0;
  const weightChange = latestWeight - 0;
  const distanceToWeightGoal = latestWeight > 0 ? latestWeight - 0 : latestWeight < 0 ? 0 - latestWeight : 0;
  const weeklyWeightEntries = weightEntries.slice(-12).map(([date, log]) => [date, log.weight] as [string, number]);
  const waistEntries = Object.entries(logs).filter((entry): entry is [string, DayLog & { waist: number }] => typeof entry[1].waist === "number" && entry[1].waist > 0).sort(([a], [b]) => a.localeCompare(b));
  const latestWaist = waistEntries.at(-1)?.[1].waist ?? 0;
  const bodyFat = 64 - 20 * (0 / (latestWaist * 2.54));
  const categoryAverage = (dates: Date[], category: GoalName) => average(dates.filter((date) => logs[dateKey(date)] && (category !== "Hair" || dateKey(date) >= WELLNESS_START_DATE)).map((date) => categoryScores(logs[dateKey(date)], dateKey(date), jobSecuredOn, instagramStartedOn)[category]));
  const weeklyCategories = (["Audience", "Career", "Body", "Hair"] as const).map((category) => ({ category, value: categoryAverage(weekDates, category) }));
  const strongestCategory = [...weeklyCategories].sort((a, b) => b.value - a.value)[0];
  const weakestCategory = [...weeklyCategories].sort((a, b) => a.value - b.value)[0];
  const previousCategories = hasPreviousWeek ? (["Audience", "Career", "Body", "Hair"] as const).map((category) => ({ category, value: categoryAverage(previousWeekDates, category) })) : [];
  const categoryChanges = weeklyCategories.map((entry) => ({ category: entry.category, change: hasPreviousWeek ? entry.value - (previousCategories.find((previous) => previous.category === entry.category)?.value ?? 0) : 0 }));
  const largestImprovement = [...categoryChanges].sort((a, b) => b.change - a.change)[0];
  const largestDecline = [...categoryChanges].sort((a, b) => a.change - b.change)[0];
  const previousWeakestCategory = hasPreviousWeek ? [...previousCategories].sort((a, b) => a.value - b.value)[0] : null;
  const correctionMovement = previousWeakestCategory ? categoryAverage(weekDates, previousWeakestCategory.category) - previousWeakestCategory.value : 0;
  const reviewAvailable = dayNumber >= 7;
  const proofLogs = Object.entries(logs).filter(([logDate]) => logDate >= startDate && logDate < todayKey);
  const proofDays: Partial<Record<BinaryKey | "jobs" | "xPosts", number>> = {
    linkedin: proofLogs.filter(([, log]) => log.linkedin).length,
    careerGrowth: proofLogs.filter(([, log]) => log.careerGrowth).length,
    scalpMassage: proofLogs.filter(([, log]) => log.scalpMassage).length,
    jobs: proofLogs.filter(([, log]) => log.jobs >= 10).length,
    xPosts: proofLogs.filter(([, log]) => xPostCount(log) >= 15).length,
  };
  const proofNote = (count: number) => `Proof: you completed this on ${count} earlier ${count === 1 ? "day" : "days"}.`;
  const categoryProofDays = (category: GoalName) => weekDates.filter((date) => categoryScores(logs[dateKey(date)] ?? EMPTY_LOG, dateKey(date), jobSecuredOn, instagramStartedOn)[category] >= 70).length;
  const strongestProofDays = categoryProofDays(strongestCategory.category);
  const weakestProofDays = categoryProofDays(weakestCategory.category);
  const evidenceSummary = strongestProofDays > 0
    ? `${strongestCategory.category} cleared 70% on ${strongestProofDays} of ${weekDayCount} challenge days.`
    : `${strongestCategory.category} leads at ${strongestCategory.value}%, but no system has cleared 70% yet.`;
  const deviationSummary = `${weakestCategory.category} averaged ${weakestCategory.value}% and cleared 70% on ${weakestProofDays} of ${weekDayCount} days${hasPreviousWeek ? `; overall score is ${weeklyDelta >= 0 ? "up" : "down"} ${Math.abs(weeklyDelta)}%` : ""}.`;
  const correctionByCategory: Record<GoalName, string> = {
    Audience: "Tomorrow, secure 15 X posts and one LinkedIn post before lower-impact work.",
    Career: careerActiveToday ? "Tomorrow, complete 10 applications or the career opportunity block before ending the day." : "Protect one career opportunity block tomorrow: skill, project, interview prep, or outreach.",
    Body: "Tomorrow, restore the body floor: clean food, protein, strength or recovery, 10,000 steps, and 3 L water.",
    Hair: "Protect tomorrow’s scalp massage. The correction is consistency, not intensity.",
  };

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
    if (date && !window.confirm("Mark the job as secured? Applications will be retired from future mission days while all historical records and scores remain unchanged.")) return;
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
    if (!window.confirm("Activate Instagram from today? Earlier Audience scores will remain unchanged; future days will assign 10 points to LinkedIn and 5 to Instagram.")) return;
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

  function runCommand(command: string) {
    const normalized = command.trim().toLowerCase();
    const weightMatch = normalized.match(/^log\s+(\d+(?:\.\d+)?)\s*kg$/);
    const dateMatch = normalized.match(/^open\s+(\d{4}-\d{2}-\d{2})$/);
    if (weightMatch) updateToday({ weight: Number(weightMatch[1]) });
    else if (dateMatch) setInspectedDate(dateMatch[1]);
    else if (normalized.includes("weakest")) document.querySelector("#weekly")?.scrollIntoView();
    else if (normalized.includes("close today")) updateToday({ closedAt: new Date().toISOString() });
    else if (normalized.includes("audience trend")) { setSelectedSignal("audience"); document.querySelector("#evidence")?.scrollIntoView(); }
    else if (normalized.includes("compare") || normalized.includes("weekly analysis") || normalized.includes("improved")) document.querySelector("#weekly")?.scrollIntoView();
    else if (normalized.includes("body")) document.querySelector("#body")?.scrollIntoView();
    else if (normalized.includes("backup") || normalized.includes("system")) document.querySelector("#system")?.scrollIntoView();
    else if (normalized.includes("recovery")) setNotice(`${recoveryDays} planned recovery ${recoveryDays === 1 ? "day" : "days"} recorded.`);
    else if (normalized.includes("application")) setNotice(`${weekDates.reduce((sum, date) => sum + (logs[dateKey(date)]?.jobs ?? 0), 0)} applications recorded this week.`);
    else if (normalized.includes("instagram")) startInstagram();
    else setNotice("Command not recognized. Choose a listed command or use “log 82 kg” / “open 2026-08-12”.");
    setCommandOpen(false);
    setCommandQuery("");
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
    link.download = `batcomputer-backup-${todayKey}.json`;
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
  const milestones = [
    { day: 1, label: "Begin" }, { day: 10, label: "Proof" }, { day: 25, label: "Rhythm" },
    { day: 45, label: "Halfway" }, { day: 60, label: "Systems locked" }, { day: 75, label: "Finish mode" }, { day: 90, label: "Transform" },
  ].map((milestone) => ({ ...milestone, date: addDays(start, milestone.day - 1).toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }) }));
  const challengeDays = Array.from({ length: 90 }, (_, index) => addDays(start, index));
  const elapsedChallengeDays = challengeDays.slice(0, dayNumber);
  const recordedChallengeDays = elapsedChallengeDays.filter((date) => Boolean(logs[dateKey(date)]));
  const challengeScore = average(recordedChallengeDays.map((date) => score(logs[dateKey(date)], dateKey(date), jobSecuredOn, instagramStartedOn)));
  const cleanDays = elapsedChallengeDays.filter((date) => logs[dateKey(date)]?.cleanFood).length;
  const strengthDays = elapsedChallengeDays.filter((date) => logs[dateKey(date)]?.strength).length;
  const recoveryDays = elapsedChallengeDays.filter((date) => logs[dateKey(date)]?.recovery).length;
  const proteinDays = elapsedChallengeDays.filter((date) => logs[dateKey(date)]?.protein).length;
  const careerGrowthDays = elapsedChallengeDays.filter((date) => logs[dateKey(date)]?.careerGrowth).length;
  const linkedInPosts = elapsedChallengeDays.filter((date) => logs[dateKey(date)]?.linkedin).length;
  const instagramPosts = elapsedChallengeDays.filter((date) => logs[dateKey(date)]?.instagram && instagramIsActive(dateKey(date), instagramStartedOn)).length;
  const totalXPosts = elapsedChallengeDays.reduce((sum, date) => sum + xPostCount(logs[dateKey(date)] ?? EMPTY_LOG), 0);
  const averageSteps = average(recordedChallengeDays.map((date) => logs[dateKey(date)].steps));
  const challengeXp = recordedChallengeDays.reduce((total, date) => {
    const logDate = dateKey(date);
    const log = logs[logDate] ?? EMPTY_LOG;
    const extraXPosts = logDate >= CONTENT_VOLUME_START_DATE ? Math.max(0, xPostCount(log) - 15) : 0;
    return total + score(log, logDate, jobSecuredOn, instagramStartedOn) * 10 + extraXPosts * 10;
  }, 0);
  const level = Math.floor(challengeXp / 1000) + 1;
  const levelXp = challengeXp % 1000;
  const nextLevelXp = 1000 - levelXp;
  const dossierCategories = (["Audience", "Career", "Body", "Hair"] as const).map((category) => ({ category, value: categoryAverage(recordedChallengeDays, category) }));
  const weekEvidence = Array.from({ length: Math.ceil(dayNumber / 7) }, (_, weekIndex) => {
    const dates = Array.from({ length: 7 }, (_, index) => addDays(start, weekIndex * 7 + index)).filter((date) => date <= today && Boolean(logs[dateKey(date)]));
    return { week: weekIndex + 1, value: average(dates.map((date) => score(logs[dateKey(date)], dateKey(date), jobSecuredOn, instagramStartedOn))) };
  }).filter((week) => week.value > 0);
  const bestWeek = [...weekEvidence].sort((a, b) => b.value - a.value)[0];
  const weakestWeek = [...weekEvidence].sort((a, b) => a.value - b.value)[0];
  const startingRfm = 64 - 20 * (0 / (0 * 2.54));
  const orderedEvidence = Object.entries(logs).filter(([logDate]) => logDate >= startDate).sort(([a], [b]) => a.localeCompare(b));
  const firstHundred = orderedEvidence.find(([logDate, log]) => score(log, logDate, jobSecuredOn, instagramStartedOn) === 100)?.[0];
  const firstAudiencePerfect = orderedEvidence.find(([logDate, log]) => categoryScores(log, logDate, jobSecuredOn, instagramStartedOn).Audience === 100)?.[0];
  const operationalMilestones = [
    { label: "First perfect Audience day", value: firstAudiencePerfect ?? "Awaiting evidence", reached: Boolean(firstAudiencePerfect) },
    { label: "First 100 score", value: firstHundred ?? "Awaiting evidence", reached: Boolean(firstHundred) },
    { label: "First 1,000 XP", value: challengeXp >= 1000 ? `Level ${level}` : `${challengeXp.toLocaleString("en-CA")} / 1,000 XP`, reached: challengeXp >= 1000 },
    { label: "Job secured", value: jobSecuredOn ?? "Career mission active", reached: Boolean(jobSecuredOn) },
    { label: "Instagram activated", value: instagramStartedOn ?? "Not active", reached: Boolean(instagramStartedOn) },
  ];
  const signalMeta: Record<SignalKey, { label: string; target: string; group: GoalName; complete: (log: DayLog) => boolean; value: (log: DayLog) => string }> = {
    x: { label: "Post on X", target: "Daily", group: "Audience", complete: (log) => log.x, value: (log) => log.x ? "Complete" : "Open" },
    linkedin: { label: "LinkedIn post", target: "1 daily", group: "Audience", complete: (log) => log.linkedin, value: (log) => log.linkedin ? "Complete" : "Open" },
    instagram: { label: "Instagram post", target: instagramStartedOn ? "1 daily" : "Upcoming", group: "Audience", complete: (log) => log.instagram, value: (log) => log.instagram ? "Complete" : "Open" },
    cleanFood: { label: "Clean food", target: "All day", group: "Body", complete: (log) => log.cleanFood, value: (log) => log.cleanFood ? "Complete" : "Open" },
    protein: { label: "Protein target", target: "Daily", group: "Body", complete: (log) => log.protein, value: (log) => log.protein ? "Complete" : "Open" },
    strength: { label: "Strength session", target: "Workout or recovery", group: "Body", complete: (log) => log.strength || log.recovery, value: (log) => log.recovery ? "Recovery" : log.strength ? "Complete" : "Open" },
    scalpMassage: { label: "Scalp massage", target: "Daily", group: "Hair", complete: (log) => log.scalpMassage, value: (log) => log.scalpMassage ? "Complete" : "Open" },
    careerGrowth: { label: "Career opportunity", target: "45 focused min", group: "Career", complete: (log) => log.careerGrowth, value: (log) => log.careerGrowth ? "Complete" : "Open" },
    xPosts: { label: "X distribution", target: "15 minimum", group: "Audience", complete: (log) => xPostCount(log) >= 15, value: (log) => `${xPostCount(log)} posts` },
    jobs: { label: "Job applications", target: "10 daily", group: "Career", complete: (log) => log.jobs >= 10, value: (log) => `${log.jobs} sent` },
    steps: { label: "Daily steps", target: "10,000", group: "Body", complete: (log) => log.steps >= 10000, value: (log) => log.steps.toLocaleString("en-CA") },
    water: { label: "Water intake", target: "3 L", group: "Body", complete: (log) => (log.water ?? 0) >= 3, value: (log) => `${log.water ?? 0} L` },
    weight: { label: "Weight", target: "goal band", group: "Body", complete: (log) => typeof log.weight === "number", value: (log) => typeof log.weight === "number" ? `${log.weight.toFixed(1)} kg` : "No entry" },
    waist: { label: "Waist", target: "Directional trend", group: "Body", complete: (log) => typeof log.waist === "number", value: (log) => typeof log.waist === "number" ? `${log.waist.toFixed(1)} in` : "No entry" },
    overall: { label: "Overall score", target: "70–100", group: "Audience", complete: (log) => score(log, todayKey, jobSecuredOn, instagramStartedOn) >= 70, value: (log) => `${score(log, todayKey, jobSecuredOn, instagramStartedOn)}%` },
    audience: { label: "Audience score", target: "35 points", group: "Audience", complete: (log) => categoryScores(log, todayKey, jobSecuredOn, instagramStartedOn).Audience >= 70, value: (log) => `${categoryScores(log, todayKey, jobSecuredOn, instagramStartedOn).Audience}%` },
    career: { label: "Career score", target: "25 points", group: "Career", complete: (log) => categoryScores(log, todayKey, jobSecuredOn, instagramStartedOn).Career >= 70, value: (log) => `${categoryScores(log, todayKey, jobSecuredOn, instagramStartedOn).Career}%` },
    body: { label: "Body score", target: "30 points", group: "Body", complete: (log) => categoryScores(log, todayKey, jobSecuredOn, instagramStartedOn).Body >= 70, value: (log) => `${categoryScores(log, todayKey, jobSecuredOn, instagramStartedOn).Body}%` },
    hair: { label: "Hair score", target: "10 points", group: "Hair", complete: (log) => log.scalpMassage, value: (log) => `${categoryScores(log, todayKey, jobSecuredOn, instagramStartedOn).Hair}%` },
    xp: { label: "Mission XP", target: `${nextLevelXp} to next level`, group: "Audience", complete: () => false, value: () => challengeXp.toLocaleString("en-CA") },
  };
  const activeSignal = signalMeta[selectedSignal];
  const signalDates = Array.from({ length: Math.min(7, dayNumber) }, (_, index) => addDays(today, index - Math.min(7, dayNumber) + 1));
  const signalStreak = currentStreak(logs, today, activeSignal.complete);
  const signalBestStreak = bestStreak(logs, elapsedChallengeDays, activeSignal.complete);
  const signalCompletedDays = elapsedChallengeDays.filter((date) => activeSignal.complete(logs[dateKey(date)] ?? EMPTY_LOG)).length;
  const signalEvidence = signalDates.flatMap((date) => logs[dateKey(date)] ? [logs[dateKey(date)]] : []);
  const signalSevenDayRate = signalEvidence.length ? Math.round((signalEvidence.filter(activeSignal.complete).length / signalEvidence.length) * 100) : 0;
  const inspectedLog = inspectedDate ? logs[inspectedDate] : undefined;
  const inspectedDateObject = inspectedDate ? new Date(`${inspectedDate}T12:00:00Z`) : null;
  const inspectedDay = inspectedDateObject ? Math.floor((inspectedDateObject.getTime() - start.getTime()) / 86400000) + 1 : 0;
  const inspectedScore = inspectedDate ? score(inspectedLog ?? EMPTY_LOG, inspectedDate, jobSecuredOn, instagramStartedOn) : 0;
  const inspectedStatus = !inspectedDate || inspectedDate > todayKey ? "Upcoming" : !inspectedLog ? "Not logged" : inspectedLog.closedAt ? (inspectedScore >= 70 ? "Closed · On target" : "Closed · Below target") : inspectedDate === todayKey ? "Open today" : "Record open";
  const inspectedSignals = inspectedDate ? [
    { label: "X distribution", value: `${xPostCount(inspectedLog ?? EMPTY_LOG)} posts`, complete: xPostCount(inspectedLog ?? EMPTY_LOG) >= 15, show: inspectedDate >= CONTENT_VOLUME_START_DATE },
    { label: "LinkedIn", value: inspectedLog?.linkedin ? "Published" : "Open", complete: Boolean(inspectedLog?.linkedin), show: true },
    { label: "Instagram", value: inspectedLog?.instagram ? "Published" : "Open", complete: Boolean(inspectedLog?.instagram), show: instagramIsActive(inspectedDate, instagramStartedOn) },
    { label: "Career opportunity", value: inspectedLog?.careerGrowth ? "Complete" : "Open", complete: Boolean(inspectedLog?.careerGrowth), show: inspectedDate >= SKILL_GROWTH_START_DATE },
    { label: "Job applications", value: `${inspectedLog?.jobs ?? 0} sent`, complete: (inspectedLog?.jobs ?? 0) >= 10, show: careerIsActive(inspectedDate, jobSecuredOn) },
    { label: "Clean food", value: inspectedLog?.cleanFood ? "Complete" : "Open", complete: Boolean(inspectedLog?.cleanFood), show: true },
    { label: "Protein", value: inspectedLog?.protein ? "Complete" : "Open", complete: Boolean(inspectedLog?.protein), show: true },
    { label: "Strength", value: inspectedLog?.recovery ? "Recovery" : inspectedLog?.strength ? "Complete" : "Open", complete: Boolean(inspectedLog?.strength || inspectedLog?.recovery), show: true },
    { label: "Steps", value: (inspectedLog?.steps ?? 0).toLocaleString("en-CA"), complete: (inspectedLog?.steps ?? 0) >= 10000, show: true },
    { label: "Water", value: `${inspectedLog?.water ?? 0} L`, complete: (inspectedLog?.water ?? 0) >= 3, show: inspectedDate >= WELLNESS_START_DATE },
    { label: "Scalp massage", value: inspectedLog?.scalpMassage ? "Complete" : "Open", complete: Boolean(inspectedLog?.scalpMassage), show: inspectedDate >= WELLNESS_START_DATE },
  ].filter((signal) => signal.show) : [];

  return (
    <main className={`app-shell${booting ? " booting" : ""}`}>
      {booting && <section className="boot-screen" role="status" aria-live="polite" aria-label="BATCOMPUTER system diagnostic">
        <div className="boot-grid" aria-hidden="true" />
        <div className="boot-rail"><span>LOCAL NODE / 01</span><span>MISSION ARCHIVE / LINKED</span><span>TACTICAL DISPLAY / READY</span></div>
        <div className="boot-core">
          <span className="boot-kicker">SECURE TERMINAL INITIALIZATION</span>
          <Image src="/batcomputer-mark.svg" alt="" width={176} height={70} priority />
          <h2>BATCOMPUTER</h2>
          <p>Mission data acquired. Interface ready.</p>
          <div className="boot-progress"><i /></div>
          <span className="boot-status">SYSTEM DIAGNOSTIC · {syncState === "error" ? "DATA LINK ATTENTION" : "NOMINAL"}</span>
        </div>
        <button type="button" onClick={() => setBooting(false)}>Skip diagnostic</button>
      </section>}
      <nav className="command-rail" aria-label="BATCOMPUTER command sections">
        {[['01','COMMAND','overview'],['02','TODAY','today'],['03','EVIDENCE','evidence'],['04','SIGNALS','signals'],['05','WEEKLY','weekly'],['06','BODY','body'],['07','MILESTONES','milestones'],['08','DOSSIER','dossier'],['09','SYSTEM','system']].map(([number, label, target]) => <a key={number} href={`#${target}`}><span>{number}</span>{label}</a>)}
        <button type="button" onClick={() => setCommandOpen(true)}><span>K</span>COMMAND</button>
      </nav>
      <section className="content" id="overview">
        <div className="screen-chrome"><span>BATCOMPUTER // ONLINE</span><i /><em>DAY STATUS // {todayLog.closedAt ? "CLOSED" : "OPEN"}</em><b>{clock ? clock.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Toronto" }) : "--:--"} ET</b></div>
        <header className="topbar">
          <div className="topbar-copy"><div className="topbar-brand"><span className="brand-mark"><Image src="/batcomputer-mark.svg" alt="" width={48} height={24} priority /></span><strong>BATCOMPUTER</strong><span className="private-mark">Cave terminal · Private</span></div><p className="topbar-date">{today.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}</p><h1><span>{daysRemaining} days remaining.</span><em>Four operational fronts. One transformation mission.</em></h1></div>
          <div className="challenge-summary">
            <div className="challenge-summary-head"><span>Active mission · 90 days</span><strong>{daysRemaining}<small>{daysRemaining === 1 ? "day left" : "days left"}</small></strong></div>
            <div className="progress-track"><span style={{ width: `${(dayNumber / 90) * 100}%` }} /></div>
            <div className="mission-window-axis"><span>Start · Aug 7</span><span>Current · Day {dayNumber}</span><span>Final dossier · Nov 4</span></div>
            <div className="xp-row"><span>Level {level.toString().padStart(2, "0")}</span><i><b style={{ width: `${levelXp / 10}%` }} /></i><strong>{challengeXp.toLocaleString("en-CA")} / {(level * 1000).toLocaleString("en-CA")} XP</strong></div>
            <div className="challenge-summary-foot"><span>Finish · {end.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })} · Next level +{nextLevelXp}</span>{session && <button onClick={() => supabase?.auth.signOut()}>Sign out</button>}</div>
          </div>
        </header>

        <div className="system-strip" aria-label="Batcomputer system status"><span><i />Terminal online</span><span>Mission day {dayNumber}</span><span>Database · {syncState === "saved" ? "linked" : syncState === "saving" ? "syncing" : syncState === "error" ? "attention" : "local"}</span><span>Clearance · Private</span></div>

        {preview && <div className="preview-banner"><span><strong>Simulation data</strong> — Preview the terminal before the mission begins.</span><div><button onClick={() => leavePreview(todayKey)}>Start today</button><button className="ghost-start" onClick={() => leavePreview(dateKey(addDays(today, -1)))}>Started yesterday</button></div></div>}
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

        <section className="dashboard-grid">
          <section className="kpi-grid" id="signals" aria-label="Key metrics">
            <article className="kpi-card featured"><div className="kpi-top"><span>Weekly score</span><span className={hasPreviousWeek && weeklyDelta >= 0 ? "delta positive" : "delta"}>{hasPreviousWeek ? `${weeklyDelta >= 0 ? "+" : ""}${weeklyDelta}%` : `Week ${challengeWeekIndex + 1}`}</span></div><div className="kpi-value">{weeklyScore}<small>/100</small></div><MiniLine values={weekScores} /><p>{weekLoggedCount} of {weekDayCount} days contain records{hasPreviousWeek ? ` · Previous week ${previousScore}` : ""}</p></article>
            <article className={jobSecuredOn ? "kpi-card job-kpi secured" : "kpi-card job-kpi"}><div className="kpi-top"><span>{jobSecuredOn ? "Career outcome" : "Job applications"}</span><span className={jobSecuredOn ? "status-dot" : "blue-dot"} /></div><div className="kpi-value">{jobSecuredOn ? "Secured" : totalJobs}<small>{jobSecuredOn ? "goal reached" : "total"}</small></div>{jobSecuredOn ? <div className="career-win-line"><span>Applications retired</span><button onClick={() => updateJobOutcome(null)}>Reopen</button></div> : <><MiniLine values={weekDates.map((date) => Math.min((logs[dateKey(date)]?.jobs ?? 0) * 10, 100))} color="#a9dce3" /><p>Daily target · 10 applications</p></>}</article>
            <article className="kpi-card"><div className="kpi-top"><span>Content published</span><span className="orange-dot" /></div><div className="kpi-value">{totalPosts}<small>posts</small></div><MiniLine values={weekDates.map((date) => {
              const log = logs[dateKey(date)] ?? EMPTY_LOG;
              return categoryScores(log, dateKey(date), jobSecuredOn, instagramStartedOn).Audience;
            })} color="#78ddeb" /><p>{instagramStartedOn ? "Across X, LinkedIn & Instagram" : "X & LinkedIn · Instagram upcoming"}</p></article>
            <article className="signal-context" aria-live="polite">
              <div className="signal-context-head"><label>Signal inspector<select aria-label="Select signal" value={selectedSignal} onChange={(event) => setSelectedSignal(event.target.value as SignalKey)}>{Object.entries(signalMeta).map(([key, signal]) => <option key={key} value={key}>{signal.label}</option>)}</select></label><em>{activeSignal.group}</em></div>
              <strong>{activeSignal.label}</strong>
              <div className="signal-reading"><span>{activeSignal.value(todayLog)}</span><small>Target · {activeSignal.target}</small></div>
              <div className="signal-history" aria-label={`${activeSignal.label} seven-day history`}>
                {signalDates.map((date) => {
                  const log = logs[dateKey(date)];
                  return <i key={dateKey(date)} className={!log ? "unknown" : activeSignal.complete(log) ? "complete" : ""} title={`${dateKey(date)} · ${log ? activeSignal.value(log) : "Unknown / unlogged"}`} />;
                })}
              </div>
              <div className="signal-proof signal-stats"><span><b>{signalStreak}</b> current streak</span><span><b>{signalBestStreak}</b> best streak</span><span><b>{signalSevenDayRate}%</b> 7-day rate</span><span><b>{signalCompletedDays}</b> mission days</span></div>
              <p>{signalEvidence.length} actual records in the last seven days. Empty positions are unknown, not failed.</p>
            </article>
          </section>

          <article className="panel chart-panel" id="evidence" data-sector="TRAJECTORY / LIVE ANALYSIS">
            <div className="panel-header"><h2>Mission telemetry</h2><div className="chart-range" role="group" aria-label="Mission chart range">{([14, 30, 90] as const).map((range) => <button type="button" key={range} className={chartRange === range ? "active" : ""} aria-pressed={chartRange === range} onClick={() => setChartRange(range)}>{range === 90 ? "90 days" : `${range} days`}</button>)}</div></div>
            <TrendChart logs={logs} dates={chartDates} startDate={startDate} jobSecuredOn={jobSecuredOn} instagramStartedOn={instagramStartedOn} />
          </article>

          <article className="panel daily-panel" id="today" data-sector="MISSION QUEUE / ACTIVE">
            <div className="panel-header"><h2>Today’s mission queue</h2><span className="score-ring" role="progressbar" aria-label="Today’s score" aria-valuenow={todayScore} aria-valuemin={0} aria-valuemax={100} style={{ "--score": `${todayScore * 3.6}deg` } as React.CSSProperties}>{todayScore}%</span></div>
            <section className="goal-balance" aria-label="Today’s impact by goal">
              <div className="goal-balance-head"><strong>Score by goal</strong><span>Weighted contribution today</span></div>
              <div className="goal-grid">
                <GoalProgress name="Audience" value={todayGoalScores.Audience} points={todayPoints.Audience} total={35} color="#78ddeb" />
                <GoalProgress name="Career" value={todayGoalScores.Career} points={todayPoints.Career} total={25} color="#68b99b" />
                <GoalProgress name="Body" value={todayGoalScores.Body} points={todayPoints.Body} total={30} color="#82b6d3" />
                <GoalProgress name="Hair" value={todayGoalScores.Hair} points={todayPoints.Hair} total={10} color="#718d9c" />
              </div>
            </section>
            <div className="habit-list">
              <section className="task-group focus-checks">
                <div className="task-group-head"><strong>Focus commitments</strong><span>High-impact work toward your goals</span></div>
                {HABITS.filter((habit) => ["linkedin", "careerGrowth", "instagram"].includes(habit.key)).map((habit) => habit.key === "instagram" && !instagramActiveToday ? (
                  <div className="habit-row upcoming-habit" key={habit.key}><span className="upcoming-mark"><UiIcon name="pause" /></span><span className="habit-copy"><strong>Instagram posting</strong><small>Part of the 90-day goal · starts when you’re ready</small></span><button onClick={startInstagram}>Start Instagram</button></div>
                ) : (
                  <label className={`habit-row${selectedSignal === habit.key ? " inspected" : ""}`} key={habit.key}>
                    <input type="checkbox" checked={todayLog[habit.key]} onChange={() => { setSelectedSignal(habit.key); updateToday({ [habit.key]: !todayLog[habit.key] }); }} />
                    <span className="custom-check"><UiIcon name="check" /></span><span className="habit-copy"><strong>{habit.label}</strong><small>{!todayLog[habit.key] && (proofDays[habit.key] ?? 0) > 0 ? proofNote(proofDays[habit.key]!) : habit.note}</small></span><span className={`group-tag ${habit.group.toLowerCase()}-tag`}>{habit.group} · {habitImpact(habit.key, instagramActiveToday, careerActiveToday)} pts</span>
                  </label>
                ))}
              </section>
              <section className="task-group focus-metrics">
                <div className="task-group-head"><strong>Measured focus</strong><span>Update the outcome, not the clock</span></div>
                {contentVolumeActiveToday && <div className={`number-row content-volume-row${selectedSignal === "xPosts" ? " inspected" : ""}`}><button type="button" className="task-copy signal-select" onClick={() => setSelectedSignal("xPosts")}><span className="task-heading"><strong>X distribution</strong><em>Audience · 20 pts</em></span><small>{xPostsToday < 15 && (proofDays.xPosts ?? 0) > 0 ? proofNote(proofDays.xPosts!) : "15 minimum · every extra post earns XP"}</small></button><MetricStepper label="X posts today" value={xPostsToday} step={1} unit="posts" complete={xPostsToday >= 15} onChange={(xPosts) => updateToday({ xPosts })} /></div>}
                {careerActiveToday ? <div className={`number-row${selectedSignal === "jobs" ? " inspected" : ""}`}><button type="button" className="task-copy signal-select" onClick={() => setSelectedSignal("jobs")}><span className="task-heading"><strong>Job applications</strong><em>Career · 12 pts</em></span><small>{todayLog.jobs < 10 && (proofDays.jobs ?? 0) > 0 ? proofNote(proofDays.jobs!) : "Target · 10 quality applications"}</small></button><div className="job-controls"><div className="stepper"><button aria-label="Remove one application" onClick={() => updateToday({ jobs: Math.max(0, todayLog.jobs - 1) })}>−</button><strong>{todayLog.jobs}</strong><button aria-label="Add one application" onClick={() => updateToday({ jobs: todayLog.jobs + 1 })}>+</button></div><button className="job-won-button" onClick={() => updateJobOutcome(todayKey)}>I got the job</button></div></div> : <div className="job-secured-row"><span><UiIcon name="check" /></span><div><strong>Job secured</strong><small>Applications retired · career opportunity work is now worth 25 points</small></div><button onClick={() => updateJobOutcome(null)}>Reopen</button></div>}
              </section>
              <section className="task-group maintenance-checks">
                <div className="task-group-head"><strong>Maintenance</strong><span>Protect the routines that keep you capable</span></div>
                {HABITS.filter((habit) => ["cleanFood", "protein", "strength", "scalpMassage"].includes(habit.key)).map((habit) => habit.key === "strength" && todayLog.recovery ? (
                  <div className="habit-row recovery-habit" key={habit.key}><span className="recovery-mark"><UiIcon name="pause" /></span><span className="habit-copy"><strong>Strength recovery</strong><small>Planned recovery · protects your 7 body points</small></span><button onClick={() => updateToday({ recovery: false })}>Restore workout</button></div>
                ) : (
                  <label className={`habit-row${selectedSignal === habit.key ? " inspected" : ""}`} key={habit.key}>
                    <input type="checkbox" checked={todayLog[habit.key]} onChange={() => { setSelectedSignal(habit.key); updateToday({ [habit.key]: !todayLog[habit.key] }); }} />
                    <span className="custom-check"><UiIcon name="check" /></span><span className="habit-copy"><strong>{habit.label}</strong><small>{habit.key === "scalpMassage" && scalpStreak ? `${scalpStreak}-day streak ${todayLog.scalpMassage ? "protected" : "at risk today"}` : !todayLog[habit.key] && (proofDays[habit.key] ?? 0) > 0 ? proofNote(proofDays[habit.key]!) : habit.note}</small></span><span className={`group-tag ${habit.group.toLowerCase()}-tag`}>{habit.group} · {habitImpact(habit.key, instagramActiveToday, careerActiveToday)} pts</span>
                  </label>
                ))}
                {!todayLog.recovery && <button className="plan-recovery" onClick={() => updateToday({ recovery: true, strength: false })}><span><UiIcon name="pause" /></span><span><strong>Plan strength recovery</strong><small>Use only when your body genuinely needs it</small></span><em>Plan day</em></button>}
              </section>
              <section className="task-group maintenance-metrics">
                <div className="task-group-head"><strong>Daily measures</strong><span>Fast updates, separate from focus time</span></div>
                <div className={`number-row${selectedSignal === "steps" ? " inspected" : ""}`}><button type="button" className="task-copy signal-select" onClick={() => setSelectedSignal("steps")}><span className="task-heading"><strong>Daily steps</strong><em>Body · 4 pts</em></span><small>Target · 10,000</small></button><MetricStepper label="steps today" value={todayLog.steps} step={500} unit="steps" complete={todayLog.steps >= 10000} onChange={(steps) => updateToday({ steps })} /></div>
                <div className={`number-row${selectedSignal === "water" ? " inspected" : ""}`}><button type="button" className="task-copy signal-select" onClick={() => setSelectedSignal("water")}><span className="task-heading"><strong>Water intake</strong><em>Body · 5 pts</em></span><small>3 L earns full points · 4 L is optional</small></button><MetricStepper label="water intake today in litres" value={todayLog.water ?? 0} step={0.25} unit="L" complete={(todayLog.water ?? 0) >= 3} onChange={(water) => updateToday({ water })} /></div>
              </section>
            </div>
            <div className={`day-close-bar${todayLog.closedAt ? " closed" : ""}`}>
              <div><span>{todayLog.closedAt ? "DAY RECORD / CLOSED" : "DAY RECORD / OPEN"}</span><strong>{todayLog.closedAt ? `${todayScore}% recorded intentionally` : "Close the day when logging is finished."}</strong><small>{todayLog.closedAt ? "You can reopen it if you notice a mistake." : "This separates a real result from missing data."}</small></div>
              <button type="button" onClick={() => updateToday({ closedAt: todayLog.closedAt ? null : new Date().toISOString() })}>{todayLog.closedAt ? "Reopen day" : `Close at ${todayScore}%`}</button>
            </div>
          </article>

          <article className="panel weekly-panel" id="weekly" data-sector="PERFORMANCE / WEEKLY VARIANCE">
            <div className="panel-header"><div><h2>Weekly mission variance</h2><span className="data-confidence">Evidence coverage · {weekLoggedCount}/{weekDayCount} recorded · {weekClosedCount} closed</span></div>{hasPreviousWeek ? <span className={weeklyDelta >= 0 ? "delta positive" : "delta"}>{weeklyDelta >= 0 ? "+" : ""}{weeklyDelta}% overall</span> : <span className="range-pill">First week</span>}</div>
            <div className="comparison-grid">
              {(["Audience", "Career", "Body", "Hair"] as const).map((category) => {
                const current = categoryAverage(weekDates, category);
                const prior = hasPreviousWeek ? categoryAverage(previousWeekDates, category) : 0;
                const change = current - prior;
                const color = { Audience: "#78ddeb", Career: "#68b99b", Body: "#82b6d3", Hair: "#718d9c" }[category];
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
            <div className="variance-summary"><div><span>Strongest signal</span><strong>{strongestCategory.category}</strong><em>{strongestCategory.value}%</em></div><div><span>Weakest signal</span><strong>{weakestCategory.category}</strong><em>{weakestCategory.value}%</em></div><div><span>Largest improvement</span><strong>{hasPreviousWeek && largestImprovement.change >= 3 ? largestImprovement.category : "No material change"}</strong><em>{hasPreviousWeek && largestImprovement.change >= 3 ? `+${largestImprovement.change}%` : "Noise filtered"}</em></div><div><span>Largest decline</span><strong>{hasPreviousWeek && largestDecline.change <= -3 ? largestDecline.category : "No material change"}</strong><em>{hasPreviousWeek && largestDecline.change <= -3 ? `${largestDecline.change}%` : "Noise filtered"}</em></div></div>
          </article>

          {reviewAvailable && <article className="panel assistant-panel case-file" data-sector="ANALYSIS / CORRECTION PROTOCOL">
            <div className="assistant-heading"><div><span className="case-id">CASE FILE / WEEK {challengeWeekIndex + 1}</span><h2>Alfred protocol · Course correction</h2></div><span className="range-pill">Days {challengeWeekIndex * 7 + 1}–{dayNumber}</span></div>
            <div className="assistant-insights"><div className="win"><p>What went well</p><strong>{evidenceSummary}</strong></div><div className="watch"><p>Weakest or declining signal</p><strong>{deviationSummary}</strong></div><div className="adjust"><p>Course correction</p><strong>{correctionByCategory[weakestCategory.category]}</strong></div><div className="follow"><p>Follow up</p><strong>{previousWeakestCategory ? `${previousWeakestCategory.category} moved ${correctionMovement > 0 ? "+" : ""}${correctionMovement} points after last week’s directive.` : "Awaiting the next weekly review to measure the correction."}</strong></div></div>
            {previousWeakestCategory && <div className="case-outcome"><span>Correction status</span><strong>{correctionMovement > 0 ? "Response detected" : correctionMovement < 0 ? "Directive needs adjustment" : "No material movement yet"}</strong><em>Evidence only</em></div>}
          </article>}

          <article className="panel heatmap-panel" data-sector="ARCHIVE / 90-DAY EVIDENCE">
            <div className="panel-header"><h2>90-day mission record</h2><span className="range-pill">{daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining</span></div>
            <div className="heatmap-wrap">
              <div className="heatmap" role="group" aria-label="90-day consistency map. Select a day to inspect its record.">
                {challengeDays.map((date, index) => {
                  const logDate = dateKey(date);
                  const log = logs[logDate];
                  const value = score(log ?? EMPTY_LOG, logDate, jobSecuredOn, instagramStartedOn);
                  const future = date.getTime() > today.getTime();
                  const intensity = future ? "future" : value >= 75 ? "high" : value >= 40 ? "mid" : value > 0 ? "low" : "empty";
                  const recordState = future ? "future" : !log ? "unlogged" : log.closedAt ? "closed" : "open";
                  const milestone = [1, 10, 25, 45, 60, 75, 90].includes(index + 1);
                  const marker = log?.recovery ? "R" : milestone ? "M" : recordState === "closed" ? "C" : recordState === "open" ? "O" : "";
                  return <button type="button" key={logDate} className={`heat-cell ${intensity} record-${recordState}${log?.recovery ? " record-recovery" : ""}${milestone ? " record-milestone" : ""}`} aria-label={`Inspect Day ${index + 1}, ${log?.recovery ? "recovery, " : milestone ? "milestone, " : ""}${recordState}, ${value}%`} aria-pressed={inspectedDate === logDate} title={`Day ${index + 1} · ${date.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })} · ${value}% · ${recordState}`} onClick={() => setInspectedDate(logDate)}><span aria-hidden="true">{marker}</span></button>;
                })}
              </div>
              <div className="heatmap-legend"><span>Score</span><i className="heat-cell empty" /><i className="heat-cell low" /><i className="heat-cell mid" /><i className="heat-cell high" /><span>Maximum</span><b /><span className="record-key open">Open</span><span className="record-key closed">Closed</span><span className="record-key unlogged">Unlogged</span><span className="record-key recovery">R Recovery</span><span className="record-key milestone">M Milestone</span></div>
            </div>
          </article>

          <article className="panel body-panel" id="body" data-sector="BIOMETRICS / BODY TELEMETRY">
            <div className="panel-header"><h2>Body telemetry</h2><span className="range-pill">Weekly check-in</span></div>
            <div className="body-metrics"><div><span>Weekly weigh-in</span><strong className="editable-metric"><input aria-label="Latest weight in kilograms" type="number" min="35" max="250" step="0.1" value={latestWeight} onChange={(event) => updateToday({ weight: Number(event.target.value) })} /><small>kg</small></strong><em>Saved against today</em></div><div><span>Change from start</span><strong>{weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} <small>kg</small></strong><em>Start</em></div><div><span>Distance to target</span><strong>{distanceToWeightGoal.toFixed(1)}<small> kg</small></strong><em>Target range · goal band</em></div><div><span>Occasional waist entry</span><strong className="editable-metric"><input aria-label="Latest waist in inches" type="number" min="20" max="80" step="0.1" value={latestWaist} onChange={(event) => updateToday({ waist: Number(event.target.value) })} /><small>in</small></strong><em>{waistEntries.length} recorded measurements</em></div><div><span>Directional RFM estimate</span><strong>{bodyFat.toFixed(1)}<small>%</small></strong><em>Height fixed · height cm</em></div><div><span>Strength frequency</span><strong>{strengthDays}<small> sessions</small></strong><em>{recoveryDays} planned recovery days</em></div><div><span>Average steps</span><strong>{averageSteps.toLocaleString("en-CA")}</strong><em>Across recorded days</em></div><div><span>Nutrition consistency</span><strong>{cleanDays}<small> clean</small></strong><em>{proteinDays} protein days</em></div></div>
            <WeightTrend entries={weeklyWeightEntries} />
            <div className="body-note"><span>i</span><p>RFM = 64 − 20 × (height cm ÷ waist in cm). This is a directional estimate only, not a clinical body-fat measurement. Weekly weight, occasional waist, strength consistency and progress photos should be interpreted together.</p></div>
          </article>

          <article className="panel photos-panel" data-sector="VISUAL / EVIDENCE ARCHIVE">
            <div className="panel-header"><h2>Visual evidence archive</h2><span className="range-pill">Private</span></div>
            <div className="photo-content">
              <div className={photo ? "photo-preview has-photo" : "photo-preview"} style={photo ? { backgroundImage: `url(${photo})` } : undefined}><span>{photo ? "Day 1" : "Your first photo"}</span></div>
              <div><h3>Let the mirror catch what the scale misses.</h3><p>Add photos at the start, Day 30, Day 60, and Day 90. They stay visible only to you.</p><label className="upload-button"><input type="file" accept="image/*" onChange={handlePhoto} />{photo ? "Replace preview" : "Add starting photo"}</label></div>
            </div>
          </article>

          <article className="panel milestone-panel" id="milestones" data-sector="TIMELINE / MISSION GATES">
            <div className="panel-header"><h2>Mission milestones</h2><span className="range-pill">90 days</span></div>
            <div className="milestone-track">
              {milestones.map((milestone) => (
                <div className={dayNumber >= milestone.day ? "milestone reached" : "milestone"} key={milestone.day}><span>{dayNumber >= milestone.day ? <UiIcon name="check" /> : milestone.day}</span><strong>Day {milestone.day}</strong><small>{milestone.label} · {milestone.date}</small></div>
              ))}
            </div>
            <div className="operational-milestones">{operationalMilestones.map((milestone) => <div className={milestone.reached ? "reached" : ""} key={milestone.label}><span>{milestone.reached ? "VERIFIED" : "PENDING"}</span><strong>{milestone.label}</strong><small>{milestone.value}</small></div>)}</div>
          </article>
          <article className="panel end-summary" id="dossier" data-sector="DOSSIER / OPERATION RECORD">
            <div className="panel-header"><div><h2>Mission dossier</h2><span className="data-confidence">Evidence captured through mission day {dayNumber}</span></div><span className="range-pill">{dayNumber >= 90 ? "Final report" : `Unlocks in ${daysRemaining} days`}</span></div>
            <div className="end-summary-grid"><div><span>Overall average</span><strong>{challengeScore}%</strong></div><div><span>Total XP · Level</span><strong>{challengeXp.toLocaleString("en-CA")} · {level}</strong></div><div><span>Weight change</span><strong>{weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg</strong></div><div><span>Waist · RFM change</span><strong>{latestWaist - 0 > 0 ? "+" : ""}{(latestWaist - 0).toFixed(1)} in · {bodyFat - startingRfm > 0 ? "+" : ""}{(bodyFat - startingRfm).toFixed(1)}%</strong></div><div><span>Clean · Protein</span><strong>{cleanDays} · {proteinDays}</strong></div><div><span>Strength · Recovery</span><strong>{strengthDays} · {recoveryDays}</strong></div><div><span>Average steps</span><strong>{averageSteps.toLocaleString("en-CA")}</strong></div><div><span>Applications · Career blocks</span><strong>{totalJobs} · {careerGrowthDays}</strong></div><div><span>X · LinkedIn · Instagram</span><strong>{totalXPosts} · {linkedInPosts} · {instagramPosts}</strong></div><div><span>Audience · Career</span><strong>{dossierCategories[0].value}% · {dossierCategories[1].value}%</strong></div><div><span>Body · Hair</span><strong>{dossierCategories[2].value}% · {dossierCategories[3].value}%</strong></div><div><span>Best · Weakest week</span><strong>{bestWeek ? `W${bestWeek.week} ${bestWeek.value}%` : "Unknown"} · {weakestWeek ? `W${weakestWeek.week} ${weakestWeek.value}%` : "Unknown"}</strong></div><div><span>Course corrections</span><strong>{Math.floor(dayNumber / 7)} reviewed · {correctionMovement > 0 ? "Response detected" : "Pending evidence"}</strong></div><div><span>Milestone states</span><strong>{jobSecuredOn ? "Job secured" : "Career active"} · {instagramStartedOn ? "Instagram active" : "Instagram pending"}</strong></div><div><span>Operation state</span><strong>{dayNumber >= 90 ? "Complete" : "In progress"}</strong></div></div>
          </article>
        </section>
        {commandOpen && <div className="command-layer" role="dialog" aria-modal="true" aria-labelledby="command-title">
          <section className="command-console">
            <div className="command-head"><div><span>BATCOMPUTER // COMMAND</span><h2 id="command-title">Isolate a signal or execute an operation.</h2></div><button type="button" onClick={() => setCommandOpen(false)} aria-label="Close command interface">×</button></div>
            <form onSubmit={(event) => { event.preventDefault(); runCommand(commandQuery); }}><span>&gt;</span><input ref={commandInputRef} value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} aria-label="Command" placeholder="Type a command…" /><kbd>ENTER</kbd></form>
            <div className="command-list">{["Show today’s weakest signal","Close today","How many applications this week?","Show Audience trend","Compare this week with last week","Open Body telemetry","Show recovery days","Generate weekly analysis","Show backup status"].filter((command) => command.toLowerCase().includes(commandQuery.toLowerCase())).map((command) => <button type="button" key={command} onClick={() => runCommand(command)}><span>{command}</span><em>RUN</em></button>)}</div>
            <p>Direct syntax: <code>log 82 kg</code> or <code>open 2026-08-12</code></p>
          </section>
        </div>}
        {inspectedDate && inspectedDateObject && <div className="record-dialog-layer">
          <section className="record-dialog" role="dialog" aria-modal="true" aria-labelledby="record-dialog-title">
            <div className="record-dialog-head">
              <div><span>MISSION ARCHIVE / DAY {inspectedDay.toString().padStart(2, "0")}</span><h2 id="record-dialog-title">{inspectedDateObject.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}</h2></div>
              <button type="button" onClick={() => setInspectedDate(null)} aria-label="Close mission record">×</button>
            </div>
            <div className="record-status-strip"><span className={inspectedLog?.closedAt ? "closed" : ""}>{inspectedStatus}</span><strong>{inspectedScore}%</strong><em>{inspectedLog ? "Evidence present" : "No evidence recorded"}</em></div>
            <div className="record-signal-grid">
              {inspectedSignals.map((signal) => <div key={signal.label} className={signal.complete ? "complete" : ""}><i><UiIcon name={signal.complete ? "check" : "pause"} /></i><span><strong>{signal.label}</strong><small>{signal.value}</small></span></div>)}
            </div>
            {typeof inspectedLog?.weight === "number" && <div className="record-weight"><span>Body telemetry</span><strong>{inspectedLog.weight.toFixed(1)} kg</strong></div>}
            <p>{inspectedStatus === "Not logged" ? "This day is absent from the evidence record. It is not automatically treated as an intentional failure." : inspectedLog?.closedAt ? "This result was intentionally closed and can be distinguished from missing data." : inspectedDate < todayKey ? "This day contains evidence but was never intentionally closed." : "Continue logging today, then close the record when you are finished."}</p>
          </section>
        </div>}
        <footer id="system"><span>BATCOMPUTER · Private operations terminal</span><div className="footer-data"><span className={`sync-state ${syncState}`}><i />{syncState === "saving" ? "CLOUD // SYNCING" : syncState === "saved" ? `CLOUD // SYNCED${lastSyncedAt ? ` · ${lastSyncedAt.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}` : ""}` : syncState === "error" ? "CLOUD // SYNC ERROR · LOCAL FALLBACK ARMED" : "LOCAL ONLY // FALLBACK ARMED"}</span><span>BACKUP // V1</span><button onClick={downloadBackup}>Download backup</button><label><input type="file" accept="application/json" onChange={restoreBackup} />Restore backup</label></div></footer>
      </section>
    </main>
  );
}
