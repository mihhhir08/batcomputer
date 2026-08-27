"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_LOGS, STORAGE, stripRetired } from "./demo";
import { addDays, dateFromKey, dateKey, missionToday } from "./dates";
import { EMPTY_LOG, START_DATE, type DayLog, type Logs, type SyncState } from "./types";

// No sign-in. This is a single-operator terminal, so the browser keeps the
// authoritative copy in localStorage and mirrors it through /api/mission,
// which holds the only database credential. Cloud failures are never allowed
// to block logging: the local write always lands first.

async function post(payload: unknown) {
  const response = await fetch("/api/mission", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`save failed: ${response.status}`);
  return response.json();
}

export function useMission() {
  const [logs, setLogs] = useState<Logs>({});
  const [hydrated, setHydrated] = useState(false);
  const [missionDataError, setMissionDataError] = useState(false);
  const [preview, setPreview] = useState(true);
  const [startDate, setStartDate] = useState(START_DATE);
  const [jobSecuredOn, setJobSecuredOn] = useState<string | null>(null);
  const [instagramStartedOn, setInstagramStartedOn] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("local");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const cloudReady = useRef(false);

  const readLocal = useCallback(() => {
    const saved = window.localStorage.getItem(STORAGE.logs);
    const savedStart = window.localStorage.getItem(STORAGE.start);
    const savedJob = window.localStorage.getItem(STORAGE.jobSecured);
    const savedInstagram = window.localStorage.getItem(STORAGE.instagramStarted);
    const started = window.localStorage.getItem(STORAGE.started) === "true" || Boolean(savedStart);
    if (savedStart) setStartDate(savedStart);
    if (savedJob) setJobSecuredOn(savedJob);
    if (savedInstagram) setInstagramStartedOn(savedInstagram);

    if (!saved) {
      if (!started) setLogs(DEMO_LOGS);
      return { logs: {} as Logs, started };
    }
    try {
      const parsed = stripRetired(JSON.parse(saved));
      setLogs(parsed);
      setPreview(false);
      return { logs: parsed, started: true };
    } catch {
      setMissionDataError(true);
      setPreview(false);
      setNotice("Mission data could not be read safely. Restore a known-good backup; the stored browser copy has not been overwritten.");
      return { logs: {} as Logs, started };
    }
  }, []);

  useEffect(() => {
    const local = readLocal();
    setHydrated(true);

    const controller = new AbortController();
    const giveUp = window.setTimeout(() => controller.abort(), 7000);

    fetch("/api/mission", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then(async (data) => {
        window.clearTimeout(giveUp);
        if (!data?.configured) return setSyncState("local");
        if (data.error) return setSyncState("error");

        cloudReady.current = true;
        const cloudLogs = (data.logs ?? {}) as Logs;
        const cloudCount = Object.keys(cloudLogs).length;
        const localCount = Object.keys(local.logs).length;

        if (cloudCount) {
          // Cloud is authoritative once it has anything; local edits made while
          // offline are merged on top rather than discarded.
          const merged = { ...cloudLogs, ...local.logs };
          setLogs(merged);
          setPreview(false);
          window.localStorage.setItem(STORAGE.logs, JSON.stringify(merged));
          window.localStorage.setItem(STORAGE.started, "true");
          if (localCount && Object.keys(merged).length !== cloudCount) {
            await post({ type: "bulk", logs: local.logs }).catch(() => undefined);
          }
        } else if (localCount) {
          await post({ type: "bulk", logs: local.logs }).catch(() => undefined);
        }

        if (data.profile?.exists) {
          setStartDate(data.profile.startDate);
          setJobSecuredOn(data.profile.jobSecuredOn);
          setInstagramStartedOn(data.profile.instagramStartedOn);
          window.localStorage.setItem(STORAGE.start, data.profile.startDate);
          window.localStorage.setItem(STORAGE.started, "true");
          setPreview(false);
        } else if (local.started) {
          await post({ type: "profile", startDate: local.logs ? startDate : START_DATE }).catch(() => undefined);
        }

        setSyncState("saved");
        setLastSyncedAt(new Date());
      })
      .catch(() => {
        window.clearTimeout(giveUp);
        setSyncState("error");
      });

    return () => {
      window.clearTimeout(giveUp);
      controller.abort();
    };
    // Runs once. startDate is read only as a fallback for a first-time profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readLocal]);

  useEffect(() => {
    if (hydrated && !preview && !missionDataError) {
      window.localStorage.setItem(STORAGE.logs, JSON.stringify(logs));
    }
  }, [logs, hydrated, preview, missionDataError]);

  const today = missionToday();
  const todayKey = dateKey(today);
  const start = dateFromKey(startDate);
  const end = addDays(start, 89);
  const dayNumber = Math.min(90, Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1));
  const daysRemaining = Math.min(90, Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000) + 1));
  const todayLog = logs[todayKey] ?? EMPTY_LOG;

  const updateToday = useCallback((patch: Partial<DayLog>) => {
    const next = { ...(preview ? EMPTY_LOG : logs[todayKey] ?? EMPTY_LOG), ...patch };
    if (preview) setPreview(false);
    setLogs((current) => ({ ...(preview ? {} : current), [todayKey]: next }));
    if (!cloudReady.current) return;
    setSyncState("saving");
    post({ type: "day", date: todayKey, data: next })
      .then(() => { setSyncState("saved"); setLastSyncedAt(new Date()); })
      .catch(() => {
        setSyncState("error");
        setNotice("Cloud sync paused. Your change is saved in this browser.");
      });
  }, [preview, logs, todayKey]);

  const startMission = useCallback(async (chosenStart = START_DATE) => {
    setPreview(false);
    setLogs({});
    setStartDate(chosenStart);
    window.localStorage.setItem(STORAGE.start, chosenStart);
    window.localStorage.setItem(STORAGE.started, "true");
    if (cloudReady.current) await post({ type: "profile", startDate: chosenStart }).catch(() => undefined);
  }, []);

  const setJobOutcome = useCallback((date: string | null) => {
    setJobSecuredOn(date);
    if (date) window.localStorage.setItem(STORAGE.jobSecured, date);
    else window.localStorage.removeItem(STORAGE.jobSecured);
    if (cloudReady.current) void post({ type: "profile", jobSecuredOn: date }).catch(() => undefined);
    setNotice(date ? "Career goal reached. Daily applications are now retired from your score." : "The job-search goal is active again.");
  }, []);

  const startInstagram = useCallback(() => {
    setInstagramStartedOn(todayKey);
    window.localStorage.setItem(STORAGE.instagramStarted, todayKey);
    if (cloudReady.current) void post({ type: "profile", instagramStartedOn: todayKey }).catch(() => undefined);
    setNotice("Instagram is active from today. Earlier scores stay unchanged.");
  }, [todayKey]);

  return {
    logs, setLogs, hydrated, missionDataError, preview, startDate, setStartDate,
    jobSecuredOn, setJobSecuredOn, instagramStartedOn, setInstagramStartedOn,
    notice, setNotice, syncState, setSyncState, lastSyncedAt,
    today, todayKey, start, end, dayNumber, daysRemaining, todayLog,
    updateToday, startMission, setJobOutcome, startInstagram,
  };
}

export type Mission = ReturnType<typeof useMission>;
