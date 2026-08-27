"use client";

import { type ChangeEvent, useState } from "react";
import { isAudioEnabled, setAudioEnabled, sound } from "../../lib/audio/console.ts";
import type { SyncState } from "../../lib/mission/types.ts";

const LINK_STATE: Record<SyncState, { text: string; tone: string }> = {
  saved: { text: "LINK ESTABLISHED", tone: "ok" },
  saving: { text: "SYNCHRONISING", tone: "pending" },
  error: { text: "LINK DEGRADED · LOCAL FALLBACK ARMED", tone: "bad" },
  local: { text: "LOCAL ONLY · NO CLOUD CONFIGURED", tone: "pending" },
};

/** navigator.clipboard fails on some contexts; fall back to a selection copy. */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(field);
      return ok;
    } catch {
      return false;
    }
  }
}

export function SystemSector({
  syncState, lastSyncedAt, missionDataError, startDate, dayNumber, logCount,
  onBackup, onRestore, shareUrl, onShare, onRevokeShare, sharing,
}: {
  syncState: SyncState;
  lastSyncedAt: Date | null;
  missionDataError: boolean;
  startDate: string;
  dayNumber: number;
  logCount: number;
  onBackup: () => void;
  onRestore: (event: ChangeEvent<HTMLInputElement>) => void;
  shareUrl: string | null;
  onShare: () => void;
  onRevokeShare: () => void;
  sharing: boolean;
}) {
  const [audioOn, setAudioOn] = useState(isAudioEnabled());
  const [copied, setCopied] = useState(false);
  const link = LINK_STATE[syncState];

  return (
    <div className="system-sector">
      <section className={`system-block link-${link.tone}`}>
        <span className="console-label">DATA LINK</span>
        <strong>{link.text}</strong>
        <small>
          {lastSyncedAt ? `Last verified ${lastSyncedAt.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}` : "Not yet verified this session"}
        </small>
        {missionDataError && <p className="system-alert">Mission data could not be read safely. Restore a known-good backup; nothing has been overwritten.</p>}
      </section>

      <section className="system-block">
        <span className="console-label">OPERATION</span>
        <dl className="readout-strip wide">
          <div><dt>START</dt><dd>{startDate}</dd></div>
          <div><dt>DAY</dt><dd>{String(dayNumber).padStart(2, "0")}/90</dd></div>
          <div><dt>RECORDS</dt><dd>{logCount}</dd></div>
        </dl>
      </section>

      <section className="system-block">
        <span className="console-label">ARCHIVE CONTROL</span>
        <div className="system-actions">
          <button type="button" onClick={() => { onBackup(); sound.commit(); }}>DOWNLOAD BACKUP</button>
          <label className="system-upload">
            <input type="file" accept="application/json" onChange={onRestore} />
            RESTORE FROM FILE
          </label>
        </div>
        <small>Backups merge by date. Existing days not present in the file are preserved.</small>
      </section>

      <section className="system-block">
        <span className="console-label">EXTERNAL VIEW</span>
        {shareUrl ? (
          <>
            <div className="share-link">
              <code>{shareUrl}</code>
              <button type="button" onClick={() => {
                void copyText(shareUrl).then((ok) => {
                  setCopied(ok);
                  ok ? sound.commit() : sound.deny();
                  if (!ok) window.prompt("Copy this link", shareUrl);
                  window.setTimeout(() => setCopied(false), 1600);
                });
              }}>{copied ? "COPIED" : "COPY"}</button>
            </div>
            <small>Read-only. Body metrics are stripped. There is no write path on that route.</small>
            <button type="button" className="ghost" onClick={() => { onRevokeShare(); sound.deny(); }}>REVOKE LINK</button>
          </>
        ) : (
          <>
            <button type="button" disabled={sharing} onClick={() => { onShare(); sound.commit(); }}>
              {sharing ? "GENERATING…" : "GENERATE READ-ONLY LINK"}
            </button>
            <small>Creates a snapshot anyone with the link can read. Weight is never included.</small>
          </>
        )}
      </section>

      <section className="system-block">
        <span className="console-label">TERMINAL</span>
        <div className="system-actions">
          <button type="button" onClick={() => {
            const next = setAudioEnabled(!audioOn);
            setAudioOn(next);
            if (next) sound.toggle();
          }}>
            AUDIO · {audioOn ? "ON" : "OFF"}
          </button>
        </div>
      </section>
    </div>
  );
}
