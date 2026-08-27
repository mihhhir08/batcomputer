import { createClient } from "@supabase/supabase-js";

// Server-rendered, read-only, no client bundle and no write path. Whatever a
// visitor sends this route, the worst it can do is render a snapshot.

export const dynamic = "force-dynamic";

type Snapshot = {
  startDate: string;
  dayNumber: number;
  daysRemaining: number;
  challengeScore: number;
  floorDays: number;
  floorRun: { current: number; longest: number };
  level: number;
  xp: number;
  categories: { category: string; value: number }[];
  weekEvidence: { week: number; value: number }[];
  days: { key: string; score: number | null }[];
};

async function load(token: string): Promise<Snapshot | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const { data } = await createClient(url, anon)
    .from("shared_dossiers").select("snapshot").eq("token", token).maybeSingle();
  return (data?.snapshot as Snapshot) ?? null;
}

export default async function SharedDossier({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const snapshot = await load(token);

  if (!snapshot) {
    return (
      <main className="dossier-public empty">
        <h1>NO SUCH DOSSIER</h1>
        <p>This link has been revoked, or never existed.</p>
      </main>
    );
  }

  return (
    <main className="dossier-public">
      <header>
        <span className="console-label">BATCOMPUTER // SHARED DOSSIER · READ ONLY</span>
        <h1>90-DAY OPERATION</h1>
        <p>Day {snapshot.dayNumber} of 90 · {snapshot.daysRemaining} remaining</p>
      </header>

      <dl className="readout-strip wide">
        <div><dt>MISSION AVG</dt><dd>{snapshot.challengeScore}%</dd></div>
        <div><dt>FLOOR HELD</dt><dd>{snapshot.floorDays}d</dd></div>
        <div><dt>RECORD RUN</dt><dd>{snapshot.floorRun.longest}d</dd></div>
        <div><dt>LEVEL</dt><dd>{String(snapshot.level).padStart(2, "0")}</dd></div>
      </dl>

      <section className="dossier-block">
        <span className="console-label">SYSTEM AVERAGES</span>
        <div className="dossier-bars">
          {snapshot.categories.map(({ category, value }) => (
            <div key={category}>
              <span>{category}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}%</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="dossier-block">
        <span className="console-label">DAILY RECORD</span>
        <div className="archive-map">
          {snapshot.days.map((day, index) => {
            const band = day.score === null ? "offGrid" : day.score >= 75 ? "high" : day.score >= 40 ? "mid" : "low";
            return (
              <span key={day.key} className={`archive-cell ${band}`} title={`Day ${index + 1}`}>
                {index + 1}
              </span>
            );
          })}
        </div>
      </section>

      <footer>
        <p>A snapshot, not a live view. Body metrics and per-habit detail are not included.</p>
      </footer>
    </main>
  );
}
