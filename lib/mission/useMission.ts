"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../supabase.ts";
import { DEMO_LOGS, STORAGE, stripRetired } from "./demo.ts";
import { addDays, dateFromKey, dateKey, missionToday } from "./dates.ts";
import { EMPTY_LOG, START_DATE, type DayLog, type Logs, type SyncState } from "./types.ts";

/**
 * Owns every piece of mission state: auth, cloud sync, local fallback, and the
 * writes. Sectors render it; none of them talk to Supabase directly.
 */
export function useMission() {
  const [logs, setLogs] = useState<Logs>({});
  const [hydrated, setHydrated] = useState(false);
  const [missionDataError, setMissionDataError] = useState(false);
  const [preview, setPreview] = useState(true);
  const [startDate, setStartDate] = useState(START_DATE);
  const [jobSecuredOn, setJobSecuredOn] = useState<string | null>(null);
  const [instagramStartedOn, setInstagramStartedOn] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [syncState, setSyncState] = useState<SyncState>(isSupabaseConfigured ? "saving" : "local");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setAuthReady(true);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
      return () => data.subscription.unsubscribe();
    }
    const saved = window.localStorage.getItem(STORAGE.logs);
    const savedStart = window.localStorage.getItem(STORAGE.start);
    const savedJob = window.localStorage.getItem(STORAGE.jobSecured);
    const savedInstagram = window.localStorage.getItem(STORAGE.instagramStarted);
    queueMicrotask(() => {
      if (savedStart) setStartDate(savedStart);
      if (savedJob) setJobSecuredOn(savedJob);
      if (savedInstagram) setInstagramStartedOn(savedInstagram);
      if (saved) {
        try {
          setLogs(stripRetired(JSON.parse(saved)));
          setPreview(false);
        } catch {
          setMissionDataError(true);
          setPreview(false);
          setNotice("Mission data could not be read safely. Restore a known-good backup; the stored browser copy has not been overwritten.");
        }
      } else {
        setLogs(DEMO_LOGS);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase;
    const userId = session.user.id;

    async function loadWorkspace() {
      const [daily, profile] = await Promise.all([
        client.from("daily_logs").select("log_date,data").eq("user_id", userId),
        client.from("profiles").select("start_date,job_secured_on,instagram_started_on").eq("user_id", userId).maybeSingle(),
      ]);

      if (daily.error || profile.error) {
        const savedLogs = window.localStorage.getItem(STORAGE.logs);
        if (savedLogs) {
          try {
            setLogs(stripRetired(JSON.parse(savedLogs)));
            setPreview(false);
          } catch {
            setMissionDataError(true);
            setNotice("Cloud sync failed and the local mission copy could not be read safely. Restore a known-good backup; existing storage remains untouched.");
          }
        }
        setSyncState("error");
        if (!savedLogs) setNotice("Cloud sync could not load. No local mission copy was available; retry the connection or restore a backup.");
        setHydrated(true);
        return;
      }

      const savedLogs = window.localStorage.getItem(STORAGE.logs);
      const savedStart = window.localStorage.getItem(STORAGE.start);
      const locallyStarted = window.localStorage.getItem(STORAGE.started) === "true" || Boolean(savedStart);
      const localLogs = savedLogs ? (JSON.parse(savedLogs) as Logs) : {};
      let syncFailed = false;
      let nextLogs = stripRetired(Object.fromEntries((daily.data ?? []).map((row) => [row.log_date, row.data])));

      if (!daily.data?.length && Object.keys(localLogs).length && locallyStarted) {
        const cleaned = stripRetired(localLogs);
        const rows = Object.entries(cleaned).map(([log_date, data]) => ({ user_id: userId, log_date, data }));
        const migrated = await client.from("daily_logs").upsert(rows);
        nextLogs = cleaned;
        syncFailed = Boolean(migrated.error);
      }

      setLogs(nextLogs);
      if (profile.data?.start_date) {
        setStartDate(profile.data.start_date);
        window.localStorage.setItem(STORAGE.start, profile.data.start_date);
        window.localStorage.setItem(STORAGE.started, "true");
      }
      if (profile.data?.job_secured_on) setJobSecuredOn(profile.data.job_secured_on);
      if (profile.data?.instagram_started_on) setInstagramStartedOn(profile.data.instagram_started_on);
      if (!profile.data && locallyStarted) {
        const created = await client.from("profiles").upsert({ user_id: userId, start_date: savedStart ?? START_DATE, height_cm: 0, start_weight_kg: 0 });
        if (created.error) syncFailed = true;
        else window.localStorage.setItem(STORAGE.started, "true");
      }
      setPreview(!profile.data && !locallyStarted);
      setSyncState(syncFailed ? "error" : "saved");
      if (!syncFailed) setLastSyncedAt(new Date());
      setHydrated(true);
    }

    void loadWorkspace();
  }, [session]);

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

  // Reads preview/logs from the closure rather than nesting one state updater
  // inside another; updaters must stay pure so StrictMode can double-invoke them.
  const updateToday = useCallback((patch: Partial<DayLog>) => {
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
  }, [preview, logs, todayKey, session]);

  const startMission = useCallback(async (chosenStart = START_DATE) => {
    setPreview(false);
    setLogs({});
    setStartDate(chosenStart);
    window.localStorage.setItem(STORAGE.start, chosenStart);
    window.localStorage.setItem(STORAGE.started, "true");
    if (supabase && session) {
      setSyncState("saving");
      const { error } = await supabase.from("profiles").upsert({ user_id: session.user.id, start_date: chosenStart, height_cm: 0, start_weight_kg: 0 });
      setSyncState(error ? "error" : "saved");
      if (!error) setLastSyncedAt(new Date());
      if (error) setNotice("The challenge started here, but the cloud profile still needs to sync.");
    }
  }, [session]);

  const setJobOutcome = useCallback((date: string | null) => {
    setJobSecuredOn(date);
    if (date) window.localStorage.setItem(STORAGE.jobSecured, date);
    else window.localStorage.removeItem(STORAGE.jobSecured);
    if (supabase && session) {
      setSyncState("saving");
      supabase.from("profiles").update({ job_secured_on: date }).eq("user_id", session.user.id).then(({ error }) => {
        setSyncState(error ? "error" : "saved");
        if (!error) setLastSyncedAt(new Date());
      });
    }
    setNotice(date ? "Career goal reached. Daily applications are now retired from your score." : "The job-search goal is active again.");
  }, [session]);

  const startInstagram = useCallback(() => {
    setInstagramStartedOn(todayKey);
    window.localStorage.setItem(STORAGE.instagramStarted, todayKey);
    if (supabase && session) {
      setSyncState("saving");
      supabase.from("profiles").update({ instagram_started_on: todayKey }).eq("user_id", session.user.id).then(({ error }) => {
        setSyncState(error ? "error" : "saved");
        if (!error) setLastSyncedAt(new Date());
      });
    }
    setNotice("Instagram is active from today. Earlier scores stay unchanged.");
  }, [session, todayKey]);

  return {
    logs, setLogs, hydrated, missionDataError, preview, startDate, setStartDate,
    jobSecuredOn, setJobSecuredOn, instagramStartedOn, setInstagramStartedOn,
    notice, setNotice, syncState, setSyncState, lastSyncedAt, session, authReady,
    today, todayKey, start, end, dayNumber, daysRemaining, todayLog,
    updateToday, startMission, setJobOutcome, startInstagram,
  };
}
