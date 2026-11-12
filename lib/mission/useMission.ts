"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mission } from "../../mission.config";
import { DEMO_DAYS, STORAGE, demoLogs } from "./demo";
import { addDays, dateFromKey, dateKey, missionToday } from "./dates";
import { EMPTY_LOG, type DayLog, type Logs, type SyncState } from "./types";

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
  // Until a mission is started, the clock is set so the demo days fill it.
  const [startDate, setStartDate] = useState(() => dateKey(addDays(missionToday(), -DEMO_DAYS)));
  const [notice, setNotice] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("local");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const cloudReady = useRef(false);

  const readLocal = useCallback(() => {
    const saved = window.localStorage.getItem(STORAGE.logs);
    const savedStart = window.localStorage.getItem(STORAGE.start);
    const started = window.localStorage.getItem(STORAGE.started) === "true" || Boolean(savedStart);
    if (savedStart) setStartDate(savedStart);

    if (!saved) {
      if (!started) setLogs(demoLogs(missionToday()));
      return { logs: {} as Logs, started, start: savedStart };
    }
    try {
      const parsed = JSON.parse(saved) as Logs;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not a record");
      setLogs(parsed);
      setPreview(false);
      return { logs: parsed, started: true, start: savedStart };
    } catch {
      setMissionDataError(true);
      setPreview(false);
      setNotice("Mission data could not be read safely. Restore a known-good backup; the stored browser copy has not been overwritten.");
      return { logs: {} as Logs, started, start: savedStart };
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
          window.localStorage.setItem(STORAGE.start, data.profile.startDate);
          window.localStorage.setItem(STORAGE.started, "true");
          setPreview(false);
        } else if (local.started && local.start) {
          await post({ type: "profile", startDate: local.start }).catch(() => undefined);
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
  }, [readLocal]);

  useEffect(() => {
    if (hydrated && !preview && !missionDataError) {
      window.localStorage.setItem(STORAGE.logs, JSON.stringify(logs));
    }
  }, [logs, hydrated, preview, missionDataError]);

  const today = missionToday();
  const todayKey = dateKey(today);
  const start = dateFromKey(startDate);
  const end = addDays(start, mission.days - 1);
  const dayNumber = Math.min(mission.days, Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1));
  const daysRemaining = Math.min(mission.days, Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000) + 1));
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

  const startMission = useCallback(async (chosenStart: string) => {
    setPreview(false);
    setLogs({});
    setStartDate(chosenStart);
    window.localStorage.setItem(STORAGE.start, chosenStart);
    window.localStorage.setItem(STORAGE.started, "true");
    if (cloudReady.current) await post({ type: "profile", startDate: chosenStart }).catch(() => undefined);
  }, []);

  return {
    logs, setLogs, hydrated, missionDataError, preview, startDate, setStartDate,
    notice, setNotice, syncState, setSyncState, lastSyncedAt,
    today, todayKey, start, end, dayNumber, daysRemaining, todayLog,
    updateToday, startMission,
  };
}

export type Mission = ReturnType<typeof useMission>;
