import type { Logs } from "./types";

export type Backup = {
  version: 1;
  exportedAt: string;
  profile: { startDate: string };
  logs: Logs;
};

export function buildBackup(logs: Logs, profile: Backup["profile"]): Backup {
  return { version: 1, exportedAt: new Date().toISOString(), profile, logs };
}

export function downloadBackup(backup: Backup, todayKey: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `batcomputer-backup-${todayKey}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Throws on anything that is not a v1 backup, so a bad file cannot merge. */
export function parseBackup(raw: string): Backup {
  const parsed = JSON.parse(raw) as Partial<Backup>;
  const days = parsed.logs && typeof parsed.logs === "object" && !Array.isArray(parsed.logs) ? Object.values(parsed.logs) : null;
  if (parsed.version !== 1 || !days || days.some((day) => !day || typeof day !== "object" || Array.isArray(day))) {
    throw new Error("Not a version 1 BATCOMPUTER backup");
  }
  return parsed as Backup;
}
