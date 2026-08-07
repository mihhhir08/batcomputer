"use client";

import { ChangeEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type BinaryKey = "x" | "linkedin" | "instagram" | "cleanFood" | "protein" | "strength";
type DayLog = Record<BinaryKey, boolean> & {
  jobs: number;
  steps: number;
  weight?: number;
  waist?: number;
};

type Logs = Record<string, DayLog>;

const START_DATE = "2026-08-07";
const EMPTY_LOG: DayLog = {
  x: false,
  linkedin: false,
  instagram: false,
  cleanFood: false,
  protein: false,
  strength: false,
  jobs: 0,
  steps: 0,
};

const HABITS: { key: BinaryKey; label: string; note: string; group: string }[] = [
  { key: "cleanFood", label: "Clean food only", note: "Whole foods, no junk", group: "Body" },
  { key: "protein", label: "Protein target", note: "Hit your daily target", group: "Body" },
  { key: "strength", label: "Kettlebell strength", note: "Complete the session", group: "Body" },
  { key: "x", label: "Post on X", note: "One useful idea", group: "Content" },
  { key: "linkedin", label: "Post on LinkedIn", note: "Show your work", group: "Content" },
  { key: "instagram", label: "Post on Instagram", note: "Build the new channel", group: "Content" },
];

const DEMO_LOGS: Logs = {
  "2026-08-01": { ...EMPTY_LOG, x: true, linkedin: true, cleanFood: true, protein: true, strength: true, jobs: 10, steps: 10420 },
  "2026-08-02": { ...EMPTY_LOG, x: true, instagram: true, cleanFood: true, protein: true, jobs: 8, steps: 9210 },
  "2026-08-03": { ...EMPTY_LOG, x: true, linkedin: true, instagram: true, cleanFood: true, protein: true, strength: true, jobs: 10, steps: 11320 },
  "2026-08-04": { ...EMPTY_LOG, x: true, linkedin: true, cleanFood: true, strength: true, jobs: 7, steps: 8720 },
  "2026-08-05": { ...EMPTY_LOG, x: true, linkedin: true, instagram: true, cleanFood: true, protein: true, strength: true, jobs: 10, steps: 12040 },
  "2026-08-06": { ...EMPTY_LOG, x: true, linkedin: true, instagram: true, cleanFood: true, protein: true, strength: true, jobs: 9, steps: 10110 },
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function score(log: DayLog) {
  const binaries = HABITS.reduce((sum, habit) => sum + Number(log[habit.key]), 0);
  const steps = Math.min(log.steps / 10000, 1);
  const jobs = Math.min(log.jobs / 10, 1);
  return Math.round(((binaries + steps + jobs) / 8) * 100);
}

function categoryScores(log: DayLog) {
  return {
    Overall: score(log),
    Body: Math.round(((Number(log.cleanFood) + Number(log.protein) + Number(log.strength) + Math.min(log.steps / 10000, 1)) / 4) * 100),
    Content: Math.round(((Number(log.x) + Number(log.linkedin) + Number(log.instagram)) / 3) * 100),
    Career: Math.round(Math.min(log.jobs / 10, 1) * 100),
  };
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function MiniLine({ values, color = "#e58a69" }: { values: number[]; color?: string }) {
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${38 - (value / 100) * 34}`).join(" ");
  return (
    <svg className="mini-line" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 38H100" className="chart-baseline" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TrendChart({ logs, dates }: { logs: Logs; dates: Date[] }) {
  const [visible, setVisible] = useState<Record<string, boolean>>({ Overall: true, Body: true, Content: true, Career: true });
  const colors: Record<string, string> = { Overall: "#e58a69", Body: "#8dbce5", Content: "#d8ad72", Career: "#78c69c" };
  const series = Object.keys(colors).map((name) => ({
    name,
    values: dates.map((date) => categoryScores(logs[dateKey(date)] ?? EMPTY_LOG)[name as keyof ReturnType<typeof categoryScores>]),
  }));
  const x = (index: number) => 44 + (index / Math.max(dates.length - 1, 1)) * 696;
  const y = (value: number) => 18 + ((100 - value) / 100) * 190;

  return (
    <>
      <div className="chart-legend" aria-label="Chart series">
        {series.map(({ name }) => (
          <button key={name} className={visible[name] ? "legend-chip active" : "legend-chip"} onClick={() => setVisible((old) => ({ ...old, [name]: !old[name] }))}>
            <span style={{ background: colors[name] }} />{name}
          </button>
        ))}
      </div>
      <div className="trend-wrap">
        <svg className="trend-chart" viewBox="0 0 760 245" role="img" aria-label="Daily momentum trend by category">
          {[0, 25, 50, 75, 100].map((value) => (
            <g key={value}>
              <line x1="44" x2="740" y1={y(value)} y2={y(value)} className="grid-line" />
              <text x="6" y={y(value) + 4} className="axis-label">{value}%</text>
            </g>
          ))}
          {series.map(({ name, values }) => visible[name] && (
            <polyline
              key={name}
              points={values.map((value, index) => `${x(index)},${y(value)}`).join(" ")}
              fill="none"
              stroke={colors[name]}
              strokeWidth={name === "Overall" ? 3.5 : 2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {dates.map((date, index) => index % 2 === 0 && (
            <text key={dateKey(date)} x={x(index)} y="235" textAnchor="middle" className="axis-label">
              {date.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })}
            </text>
          ))}
        </svg>
      </div>
    </>
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
        <span className="brand-mark">M</span>
        <p className="eyebrow">Your private workspace</p>
        <h1>Build momentum.<br />Keep the evidence.</h1>
        <p>Sign in to sync your 90-day transformation across devices.</p>
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
  const [photo, setPhoto] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
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
    queueMicrotask(() => {
      if (savedStart) setStartDate(savedStart);
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
    Promise.all([
      client.from("daily_logs").select("log_date,data").eq("user_id", session.user.id),
      client.from("profiles").select("start_date").eq("user_id", session.user.id).maybeSingle(),
    ]).then(([daily, profile]) => {
      if (daily.data) setLogs(Object.fromEntries(daily.data.map((row) => [row.log_date, { ...EMPTY_LOG, ...row.data }])));
      if (profile.data?.start_date) setStartDate(profile.data.start_date);
      setPreview(!profile.data);
      setHydrated(true);
    });
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
  const chartDates = Array.from({ length: 14 }, (_, index) => addDays(today, index - 13));
  const weekDates = chartDates.slice(-7);
  const previousWeekDates = chartDates.slice(0, 7);
  const weekScores = weekDates.map((date) => score(logs[dateKey(date)] ?? EMPTY_LOG));
  const previousScores = previousWeekDates.map((date) => score(logs[dateKey(date)] ?? EMPTY_LOG));
  const weeklyScore = average(weekScores);
  const previousScore = average(previousScores);
  const weeklyDelta = weeklyScore - previousScore;
  const completedToday = HABITS.filter((habit) => todayLog[habit.key]).length + Number(todayLog.steps >= 10000) + Number(todayLog.jobs >= 10);
  const totalJobs = Object.values(logs).reduce((sum, log) => sum + log.jobs, 0);
  const totalPosts = Object.values(logs).reduce((sum, log) => sum + Number(log.x) + Number(log.linkedin) + Number(log.instagram), 0);
  const latestWeight = Object.entries(logs).sort(([a], [b]) => b.localeCompare(a)).find(([, log]) => log.weight)?.[1].weight ?? 0;
  const bodyFat = 64 - 20 * (0 / (0 * 2.54));

  function updateToday(patch: Partial<DayLog>) {
    const next = { ...(preview ? EMPTY_LOG : logs[todayKey] ?? EMPTY_LOG), ...patch };
    if (preview) setPreview(false);
    setLogs((current) => ({ ...(preview ? {} : current), [todayKey]: next }));
    if (supabase && session) {
      supabase.from("daily_logs").upsert({ user_id: session.user.id, log_date: todayKey, data: next }).then(({ error }) => error && setNotice("Cloud sync paused. Your latest change is still visible here."));
    }
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    if (supabase && session) {
      const path = `${session.user.id}/day-${dayNumber}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
      const { error } = await supabase.storage.from("progress-photos").upload(path, file);
      setNotice(error ? "The preview is ready, but the private upload did not finish." : "Photo saved privately to your transformation timeline.");
    } else {
      setNotice("Photo preview added. Supabase will keep it private after cloud sync is connected.");
    }
  }

  function leavePreview(chosenStart = START_DATE) {
    setPreview(false);
    setLogs({});
    setStartDate(chosenStart);
    window.localStorage.setItem("momentum-90-start", chosenStart);
    if (supabase && session) {
      supabase.from("profiles").upsert({ user_id: session.user.id, start_date: chosenStart, height_cm: 0, start_weight_kg: 0, waist_in: 0 });
    }
    setNotice(`Your 90-day workspace is ready. The challenge begins ${new Date(`${chosenStart}T12:00:00Z`).toLocaleDateString("en-CA", { month: "long", day: "numeric", timeZone: "UTC" })}.`);
  }

  if (isSupabaseConfigured && !authReady) return <main className="loading-shell">Preparing your private workspace…</main>;
  if (isSupabaseConfigured && !session) return <SignIn />;

  const milestones = [
    { day: 1, label: "Begin" }, { day: 10, label: "Proof" }, { day: 25, label: "Rhythm" },
    { day: 45, label: "Halfway" }, { day: 60, label: "Identity" }, { day: 75, label: "Finish mode" }, { day: 90, label: "Transform" },
  ].map((milestone) => ({ ...milestone, date: addDays(start, milestone.day - 1).toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }) }));
  const challengeDays = Array.from({ length: 90 }, (_, index) => addDays(start, index));

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">M</span><span>Momentum</span></div>
        <nav aria-label="Primary navigation">
          <a className="nav-item active" href="#overview"><span>01</span>Overview</a>
          <a className="nav-item" href="#today"><span>02</span>Daily check-in</a>
          <a className="nav-item" href="#body"><span>03</span>Body progress</a>
          <a className="nav-item" href="#milestones"><span>04</span>Milestones</a>
        </nav>
        <div className="challenge-card">
          <div className="eyebrow">90-day challenge</div>
          <div className="challenge-days"><strong>{dayNumber}</strong><span>/ 90</span></div>
          <div className="progress-track"><span style={{ width: `${(dayNumber / 90) * 100}%` }} /></div>
          <p>Finish line · {end.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</p>
        </div>
        <div className="profile"><span className="avatar">MC</span><span><strong>Mihir</strong><small>Private workspace</small></span><button aria-label={session ? "Sign out" : "Profile menu"} onClick={() => session && supabase?.auth.signOut()}>{session ? "↗" : "•••"}</button></div>
      </aside>

      <section className="content" id="overview">
        <header className="topbar">
          <div><div className="mobile-brand">Momentum</div><p className="eyebrow">{today.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })} · Day {dayNumber}</p><h1>Your transformation, in motion.</h1></div>
          <div className="top-actions"><button className="secondary-button" onClick={() => document.getElementById("weekly")?.scrollIntoView({ behavior: "smooth" })}>Weekly review</button></div>
        </header>

        {preview && <div className="preview-banner"><span><strong>Preview data</strong> — See how your analytics will feel once you build momentum.</span><div><button onClick={() => leavePreview("2026-08-07")}>Start Aug 7</button><button className="ghost-start" onClick={() => leavePreview("2026-08-08")}>Start Aug 8</button></div></div>}
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

        <section className="kpi-grid" aria-label="Key metrics">
          <article className="kpi-card featured"><div className="kpi-top"><span>Weekly momentum</span><span className={weeklyDelta >= 0 ? "delta positive" : "delta"}>{weeklyDelta >= 0 ? "+" : ""}{weeklyDelta}%</span></div><div className="kpi-value">{weeklyScore}<small>/100</small></div><MiniLine values={weekScores} /><p>vs. {previousScore} last week</p></article>
          <article className="kpi-card"><div className="kpi-top"><span>Today’s commitments</span><span className="status-dot" /></div><div className="kpi-value">{completedToday}<small>/8</small></div><div className="segmented-progress">{Array.from({ length: 8 }, (_, i) => <span key={i} className={i < completedToday ? "filled" : ""} />)}</div><p>{8 - completedToday === 0 ? "Daily mission complete" : `${8 - completedToday} actions to close the day`}</p></article>
          <article className="kpi-card"><div className="kpi-top"><span>Job applications</span><span className="blue-dot" /></div><div className="kpi-value">{totalJobs}<small>total</small></div><MiniLine values={weekDates.map((date) => Math.min((logs[dateKey(date)]?.jobs ?? 0) * 10, 100))} color="#8dbce5" /><p>Daily target · 10 applications</p></article>
          <article className="kpi-card"><div className="kpi-top"><span>Content published</span><span className="orange-dot" /></div><div className="kpi-value">{totalPosts}<small>posts</small></div><MiniLine values={weekDates.map((date) => {
            const log = logs[dateKey(date)] ?? EMPTY_LOG;
            return ((Number(log.x) + Number(log.linkedin) + Number(log.instagram)) / 3) * 100;
          })} color="#d8ad72" /><p>Across X, LinkedIn & Instagram</p></article>
        </section>

        <section className="dashboard-grid">
          <article className="panel chart-panel">
            <div className="panel-header"><div><p className="eyebrow">All systems</p><h2>Momentum trend</h2></div><span className="range-pill">Last 14 days</span></div>
            <TrendChart logs={logs} dates={chartDates} />
          </article>

          <article className="panel daily-panel" id="today">
            <div className="panel-header"><div><p className="eyebrow">Daily operating system</p><h2>Today’s commitments</h2></div><span className="score-ring" style={{ "--score": `${score(todayLog) * 3.6}deg` } as React.CSSProperties}>{score(todayLog)}%</span></div>
            <div className="habit-list">
              {HABITS.map((habit) => (
                <label className="habit-row" key={habit.key}>
                  <input type="checkbox" checked={todayLog[habit.key]} onChange={() => updateToday({ [habit.key]: !todayLog[habit.key] })} />
                  <span className="custom-check">✓</span><span className="habit-copy"><strong>{habit.label}</strong><small>{habit.note}</small></span><span className={`group-tag ${habit.group.toLowerCase()}-tag`}>{habit.group}</span>
                </label>
              ))}
              <div className="number-row"><span><strong>Daily steps</strong><small>Target · 10,000</small></span><div className="number-control"><input aria-label="Steps today" type="number" min="0" step="500" value={todayLog.steps || ""} placeholder="0" onChange={(e) => updateToday({ steps: Math.max(0, Number(e.target.value)) })} /><span>steps</span></div></div>
              <div className="number-row"><span><strong>Job applications</strong><small>Target · 10</small></span><div className="stepper"><button aria-label="Remove one application" onClick={() => updateToday({ jobs: Math.max(0, todayLog.jobs - 1) })}>−</button><strong>{todayLog.jobs}</strong><button aria-label="Add one application" onClick={() => updateToday({ jobs: todayLog.jobs + 1 })}>+</button></div></div>
            </div>
          </article>

          <article className="panel weekly-panel" id="weekly">
            <div className="panel-header"><div><p className="eyebrow">Week over week</p><h2>Where you’re gaining</h2></div><span className={weeklyDelta >= 0 ? "delta positive" : "delta"}>{weeklyDelta >= 0 ? "+" : ""}{weeklyDelta}% overall</span></div>
            <div className="comparison-chart">
              {(["Body", "Content", "Career"] as const).map((category) => {
                const current = average(weekDates.map((date) => categoryScores(logs[dateKey(date)] ?? EMPTY_LOG)[category]));
                const prior = average(previousWeekDates.map((date) => categoryScores(logs[dateKey(date)] ?? EMPTY_LOG)[category]));
                return <div className="comparison-row" key={category}><span>{category}</span><div className="bar-stack"><i className="prior" style={{ width: `${prior}%` }} /><i className="current" style={{ width: `${current}%` }} /></div><strong>{current}%</strong></div>;
              })}
              <div className="bar-key"><span><i className="prior" />Previous week</span><span><i className="current" />This week</span></div>
            </div>
          </article>

          <article className="panel recovery-panel">
            <div className="recovery-icon">↗</div><p className="eyebrow">Momentum mode</p><h2>One choice gets you moving again.</h2><p>A missed action never resets your progress. Complete the next smallest commitment and keep the trend alive.</p><button onClick={() => document.getElementById("today")?.scrollIntoView({ behavior: "smooth" })}>Choose the next action</button>
          </article>

          <article className="panel heatmap-panel">
            <div className="panel-header"><div><p className="eyebrow">Consistency map</p><h2>Your 90 days, one square at a time</h2></div><span className="range-pill">{Math.max(0, dayNumber - 1)} days logged</span></div>
            <div className="heatmap-wrap">
              <div className="heatmap" role="img" aria-label="90-day consistency map">
                {challengeDays.map((date, index) => {
                  const value = score(logs[dateKey(date)] ?? EMPTY_LOG);
                  const future = date.getTime() > today.getTime();
                  const intensity = future ? "future" : value >= 75 ? "high" : value >= 40 ? "mid" : value > 0 ? "low" : "empty";
                  return <span key={dateKey(date)} className={`heat-cell ${intensity}`} title={`Day ${index + 1} · ${date.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })} · ${value}%`} />;
                })}
              </div>
              <div className="heatmap-legend"><span>Less</span><i className="heat-cell empty" /><i className="heat-cell low" /><i className="heat-cell mid" /><i className="heat-cell high" /><span>Momentum</span></div>
            </div>
          </article>

          <article className="panel body-panel" id="body">
            <div className="panel-header"><div><p className="eyebrow">Body recomposition</p><h2>Signals, not verdicts</h2></div><span className="range-pill">Baseline</span></div>
            <div className="body-metrics"><div><span>Latest weight</span><strong className="editable-metric"><input aria-label="Latest weight in kilograms" type="number" min="35" max="250" step="0.1" value={latestWeight} onChange={(event) => updateToday({ weight: Number(event.target.value) })} /><small>kg</small></strong><em>Start</em></div><div><span>Waist</span><strong>0 <small>in</small></strong><em>Next check · Day 30</em></div><div><span>RFM estimate</span><strong>{bodyFat.toFixed(1)}<small>%</small></strong><em>Directional estimate</em></div><div><span>Goal</span><strong>6–7 <small>kg</small></strong><em>Fat loss target</em></div></div>
            <div className="body-note"><span>i</span><p>Because muscle gain can mask fat loss on the scale, progress is judged across weight, waist, strength consistency, and photos.</p></div>
          </article>

          <article className="panel photos-panel">
            <div className="panel-header"><div><p className="eyebrow">Visual progress</p><h2>Progress photos</h2></div><span className="range-pill">Private</span></div>
            <div className="photo-content">
              <div className={photo ? "photo-preview has-photo" : "photo-preview"} style={photo ? { backgroundImage: `url(${photo})` } : undefined}><span>{photo ? "Day 1" : "Your first photo"}</span></div>
              <div><h3>Let the mirror catch what the scale misses.</h3><p>Add photos at the start, Day 30, Day 60, and Day 90. They stay visible only to you.</p><label className="upload-button"><input type="file" accept="image/*" onChange={handlePhoto} />{photo ? "Replace preview" : "Add starting photo"}</label></div>
            </div>
          </article>

          <article className="panel milestone-panel" id="milestones">
            <div className="panel-header"><div><p className="eyebrow">The road ahead</p><h2>Challenge milestones</h2></div><span className="range-pill">90 days</span></div>
            <div className="milestone-track">
              {milestones.map((milestone) => (
                <div className={dayNumber >= milestone.day ? "milestone reached" : "milestone"} key={milestone.day}><span>{dayNumber >= milestone.day ? "✓" : milestone.day}</span><strong>Day {milestone.day}</strong><small>{milestone.label} · {milestone.date}</small></div>
              ))}
            </div>
          </article>
        </section>
        <footer><span>Momentum · Your private transformation OS</span><span>Toronto time · {isSupabaseConfigured ? "Private cloud sync active" : "Data saved locally in this preview"}</span></footer>
      </section>
    </main>
  );
}
