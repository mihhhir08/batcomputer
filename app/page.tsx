"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase.ts";
import { useMission } from "../lib/mission/useMission.ts";
import { analyse } from "../lib/mission/analytics.ts";
import { floorHeld, floorMetCount } from "../lib/mission/floor.ts";
import { returnGap } from "../lib/mission/gaps.ts";
import { buildBackup, downloadBackup, parseBackup } from "../lib/mission/backup.ts";
import { dateKey } from "../lib/mission/dates.ts";
import { GOAL_COLORS, type GoalName } from "../lib/mission/types.ts";
import type { SignalKey } from "../lib/mission/signals.ts";
import { DEFAULT_SECTOR, SECTORS, sectorAt, sectorForDigit, sectorIndex, type SectorId } from "../lib/sectors.ts";
import { sound } from "../lib/audio/console.ts";

import { SignIn } from "../components/SignIn.tsx";
import { BootSequence } from "../components/shell/BootSequence.tsx";
import { SectorRail } from "../components/shell/SectorRail.tsx";
import { SectorViewport } from "../components/shell/SectorViewport.tsx";
import { CommandConsole, type Command } from "../components/shell/CommandConsole.tsx";
import { CommandSector } from "../components/sectors/CommandSector.tsx";
import { TodaySector } from "../components/sectors/TodaySector.tsx";
import { TrajectorySector } from "../components/sectors/TrajectorySector.tsx";
import { SignalsSector } from "../components/sectors/SignalsSector.tsx";
import { VarianceSector } from "../components/sectors/VarianceSector.tsx";
import { BodySector } from "../components/sectors/BodySector.tsx";
import { ArchiveSector } from "../components/sectors/ArchiveSector.tsx";
import { DossierSector } from "../components/sectors/DossierSector.tsx";
import { SystemSector } from "../components/sectors/SystemSector.tsx";

const GAP_ACK_KEY = "batcomputer-gap-ack";

export default function Terminal() {
  const mission = useMission();
  const {
    logs, setLogs, hydrated, missionDataError, preview, startDate, setStartDate,
    jobSecuredOn, setJobSecuredOn, instagramStartedOn, setInstagramStartedOn,
    notice, setNotice, syncState, setSyncState, lastSyncedAt, session, authReady,
    today, todayKey, start, dayNumber, daysRemaining, todayLog,
    updateToday, startMission, setJobOutcome, startInstagram,
  } = mission;

  const [sector, setSector] = useState<SectorId>(DEFAULT_SECTOR);
  const [booting, setBooting] = useState(true);
  const [bootLeaving, setBootLeaving] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [range, setRange] = useState<14 | 30 | 90>(14);
  const [signal, setSignal] = useState<SignalKey>("floor");
  const [clock, setClock] = useState<Date | null>(null);
  const [gapAcked, setGapAcked] = useState(true);
  const [alfred, setAlfred] = useState<string | null>(null);
  const [alfredPending, setAlfredPending] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const stats = useMemo(
    () => analyse(logs, start, today, jobSecuredOn, instagramStartedOn),
    [logs, start, today, jobSecuredOn, instagramStartedOn],
  );
  const gap = useMemo(() => returnGap(logs, start, today), [logs, start, today]);
  const held = floorHeld(todayLog);
  const bootReady = authReady && (!isSupabaseConfigured || !session || hydrated);
  const authenticated = !isSupabaseConfigured || Boolean(session);
  const todayState = !logs[todayKey] ? "UNLOGGED" : logs[todayKey].closedAt ? "CLOSED" : "OPEN";

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000);
    setClock(new Date());
    return () => window.clearInterval(timer);
  }, []);

  // A sealed gap is announced once. The acknowledgement is keyed to the gap
  // itself so a later silence still gets its own return protocol.
  useEffect(() => {
    if (!gap) return;
    setGapAcked(window.localStorage.getItem(GAP_ACK_KEY) === `${gap.from}:${gap.to}`);
  }, [gap]);

  const acknowledgeGap = useCallback(() => {
    if (gap) window.localStorage.setItem(GAP_ACK_KEY, `${gap.from}:${gap.to}`);
    setGapAcked(true);
    sound.commit();
  }, [gap]);

  const goto = useCallback((next: SectorId) => {
    setSector((current) => {
      if (current === next) return current;
      sound.travel(sectorIndex(next) > sectorIndex(current));
      return next;
    });
  }, []);

  const finishBoot = useCallback(() => {
    setBootLeaving(true);
    window.setTimeout(() => setBooting(false), 260);
  }, []);

  useEffect(() => {
    if (booting) return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setConsoleOpen((open) => !open);
        return;
      }
      if (event.key === "Escape") return setConsoleOpen(false);
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      const digit = sectorForDigit(event.key);
      if (digit) {
        event.preventDefault();
        return goto(digit);
      }
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        return goto(sectorAt(sectorIndex(sector) + 1).id);
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        return goto(sectorAt(sectorIndex(sector) - 1).id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [booting, goto, sector]);

  // Alfred's daily remark. Cached server-side; one call per mission day.
  useEffect(() => {
    if (booting || preview || !hydrated) return;
    let cancelled = false;
    setAlfredPending(true);
    fetch("/api/alfred", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: todayKey,
        dayNumber,
        daysRemaining,
        floorHeld: held,
        floorMet: floorMetCount(todayLog),
        weeklyScore: stats.weeklyScore,
        weakest: stats.weakest?.category,
        strongest: stats.strongest?.category,
        floorRun: stats.floorRun,
        gap: gap ? { days: gap.days, from: gap.from, to: gap.to } : null,
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (!cancelled) setAlfred(data?.line ?? null); })
      .catch(() => { if (!cancelled) setAlfred(null); })
      .finally(() => { if (!cancelled) setAlfredPending(false); });
    return () => { cancelled = true; };
    // Re-runs only when the mission day or the floor verdict changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booting, preview, hydrated, todayKey, held]);

  function handleRestore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void file.text().then(async (raw) => {
      try {
        const backup = parseBackup(raw);
        if (!window.confirm("Merge this backup into the mission? Matching dates use the backup copy.")) return;
        const merged = { ...logs, ...backup.logs };
        setLogs(merged);
        setStartDate(backup.profile?.startDate ?? startDate);
        setJobSecuredOn(backup.profile?.jobSecuredOn ?? jobSecuredOn);
        setInstagramStartedOn(backup.profile?.instagramStartedOn ?? instagramStartedOn);
        window.localStorage.setItem("momentum-90-logs", JSON.stringify(merged));
        if (supabase && session) {
          setSyncState("saving");
          const rows = Object.entries(backup.logs).map(([log_date, data]) => ({ user_id: session.user.id, log_date, data }));
          const result = rows.length ? await supabase.from("daily_logs").upsert(rows) : null;
          setSyncState(result?.error ? "error" : "saved");
        }
        setNotice("Backup merged. Dates absent from the file were preserved.");
      } catch {
        setNotice("Restore failed. Local mission data was left unchanged.");
        sound.deny();
      }
    });
  }

  async function generateShare() {
    setSharing(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ logs, startDate, jobSecuredOn, instagramStartedOn }),
      });
      const data = await response.json();
      if (data?.url) {
        setShareUrl(data.url);
        setNotice("Read-only link generated. Body metrics are stripped from the snapshot.");
      } else {
        setNotice("Share link could not be generated.");
      }
    } catch {
      setNotice("Share link could not be generated.");
    }
    setSharing(false);
  }

  const commands: Command[] = useMemo(() => [
    ...SECTORS.map((entry) => ({
      id: `go-${entry.id}`,
      label: `Go to ${entry.label}`,
      hint: entry.number,
      run: () => goto(entry.id),
    })),
    { id: "close", label: "Close today's record", hint: "CLOSE", run: () => updateToday({ closedAt: new Date().toISOString() }) },
    { id: "reopen", label: "Reopen today's record", run: () => updateToday({ closedAt: null }) },
    { id: "recovery", label: "Plan strength recovery", run: () => updateToday({ recovery: true, strength: false }) },
    { id: "weakest", label: `Show weakest system · ${stats.weakest?.category ?? "—"}`, run: () => goto("variance") },
    { id: "backup", label: "Download a backup", run: () => downloadBackup(buildBackup(logs, { startDate, jobSecuredOn, instagramStartedOn }), todayKey) },
  ], [goto, updateToday, stats.weakest, logs, startDate, jobSecuredOn, instagramStartedOn, todayKey]);

  function runDirect(input: string) {
    const text = input.trim().toLowerCase();
    const weight = text.match(/^log\s+(\d+(?:\.\d+)?)\s*kg$/);
    if (weight) { updateToday({ weight: Number(weight[1]) }); return true; }
    const open = text.match(/^open\s+(\d{4}-\d{2}-\d{2})$/);
    if (open) { goto("archive"); return true; }
    if (text === "close") { updateToday({ closedAt: new Date().toISOString() }); return true; }
    return false;
  }

  const boot = booting && (
    <div className={bootLeaving ? "boot-leaving" : undefined}>
      <BootSequence
        ready={bootReady} authenticated={authenticated} hydrated={hydrated}
        missionDataError={missionDataError} syncState={syncState}
        dayNumber={dayNumber} daysRemaining={daysRemaining} todayState={todayState}
        floorMet={floorMetCount(todayLog)} floorHeld={held} level={stats.level}
        gap={gap && !gapAcked ? gap : null} alfred={alfred} onEnter={finishBoot}
      />
    </div>
  );

  if (isSupabaseConfigured && !authReady) return <>{boot}<main className="loading-shell" aria-hidden="true">Mounting mission database…</main></>;
  if (isSupabaseConfigured && !session) return <>{boot}<SignIn /></>;

  const dossierCategories = (["Audience", "Career", "Body", "Hair"] as GoalName[])
    .map((category) => ({ category, value: stats.categoryAverage(stats.recorded, category) }));

  return (
    <>
      {boot}
      <main className="terminal">
        <div className="tube-scan" aria-hidden="true" />

        <div className="terminal-chrome">
          <span className="chrome-live"><i />BATCOMPUTER</span>
          <span>MISSION DAY <b>{String(dayNumber).padStart(2, "0")}</b>/90</span>
          <span>RECORD <b>{todayState}</b></span>
          <span>FLOOR <b>{held ? "HELD" : `${floorMetCount(todayLog)}/3`}</b></span>
          <span className="chrome-spacer" />
          <span>LINK <b>{syncState === "saved" ? "OK" : syncState.toUpperCase()}</b></span>
          <span><b>{clock ? clock.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Toronto" }) : "--:--"}</b> ET</span>
        </div>

        <SectorRail active={sector} onSelect={goto} floorHeld={held} onConsole={() => setConsoleOpen(true)} />

        <SectorViewport active={sector}>
          {notice && (
            <div className="notice-bar" role="status">
              {notice}
              <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button>
            </div>
          )}

          {preview && (
            <div className="notice-bar">
              Simulation data. Start the mission to begin recording.
              <button type="button" onClick={() => void startMission(todayKey)}>START TODAY</button>
            </div>
          )}

          {sector === "command" && (
            <CommandSector
              todayLog={todayLog} todayKey={todayKey} jobSecuredOn={jobSecuredOn}
              instagramStartedOn={instagramStartedOn} dayNumber={dayNumber} daysRemaining={daysRemaining}
              level={stats.level} xp={stats.xp} nextLevelXp={stats.nextLevelXp}
              gap={gap} gapAcknowledged={gapAcked} onAcknowledgeGap={acknowledgeGap}
              alfred={alfred} alfredPending={alfredPending}
              longestFloorRun={stats.floorRun.longest} currentFloorRun={stats.floorRun.current}
              onOpenToday={() => goto("today")}
            />
          )}

          {sector === "today" && (
            <TodaySector
              todayLog={todayLog} todayKey={todayKey} jobSecuredOn={jobSecuredOn}
              instagramStartedOn={instagramStartedOn} updateToday={updateToday}
              onStartInstagram={() => {
                if (window.confirm("Activate Instagram from today? Earlier Audience scores stay unchanged.")) startInstagram();
              }}
            />
          )}

          {sector === "trajectory" && (
            <TrajectorySector
              logs={logs} today={today} dayNumber={dayNumber} range={range} onRange={setRange}
              jobSecuredOn={jobSecuredOn} instagramStartedOn={instagramStartedOn}
              weeklyScore={stats.weeklyScore} challengeScore={stats.challengeScore} floorDays={stats.floorDays}
            />
          )}

          {sector === "signals" && (
            <SignalsSector
              logs={logs} start={start} today={today} todayKey={todayKey}
              selected={signal} onSelect={setSignal} jobSecuredOn={jobSecuredOn}
              instagramStartedOn={instagramStartedOn} dayNumber={dayNumber}
            />
          )}

          {sector === "variance" && (
            <VarianceSector
              weeklyCategories={stats.weeklyCategories} previousCategories={stats.previousCategories}
              hasPreviousWeek={stats.hasPreviousWeek} weeklyScore={stats.weeklyScore}
              previousScore={stats.previousScore} weeklyDelta={stats.weeklyDelta}
              weekIndex={stats.weekIndex} weekDayCount={stats.weekDayCount}
              weekLoggedCount={stats.weekLoggedCount} weekClosedCount={stats.weekClosedCount}
              strongest={stats.strongest} weakest={stats.weakest}
            />
          )}

          {sector === "body" && (
            <BodySector todayLog={todayLog} weights={stats.weights} updateToday={updateToday} />
          )}

          {sector === "archive" && (
            <ArchiveSector
              logs={logs} start={start} todayKey={todayKey}
              jobSecuredOn={jobSecuredOn} instagramStartedOn={instagramStartedOn}
            />
          )}

          {sector === "dossier" && (
            <DossierSector
              start={start} dayNumber={dayNumber} daysRemaining={daysRemaining}
              challengeScore={stats.challengeScore} xp={stats.xp} level={stats.level}
              floorDays={stats.floorDays} floorRun={stats.floorRun}
              weekEvidence={stats.weekEvidence} bestWeek={stats.bestWeek}
              dossierCategories={dossierCategories} caseEntries={[]}
            />
          )}

          {sector === "system" && (
            <SystemSector
              syncState={syncState} lastSyncedAt={lastSyncedAt} missionDataError={missionDataError}
              startDate={startDate} dayNumber={dayNumber} logCount={Object.keys(logs).length}
              onBackup={() => downloadBackup(buildBackup(logs, { startDate, jobSecuredOn, instagramStartedOn }), todayKey)}
              onRestore={handleRestore}
              onSignOut={() => supabase?.auth.signOut()}
              signedIn={Boolean(session)}
              shareUrl={shareUrl} onShare={generateShare}
              onRevokeShare={() => { setShareUrl(null); setNotice("Share link revoked."); }}
              sharing={sharing}
            />
          )}
        </SectorViewport>

        {consoleOpen && (
          <CommandConsole commands={commands} onClose={() => setConsoleOpen(false)} onDirect={runDirect} />
        )}
      </main>
    </>
  );
}
