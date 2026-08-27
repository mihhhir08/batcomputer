/**
 * Nine sectors, one viewport. The rail does not scroll the page to an anchor;
 * it swaps what the display is showing. There is no page scroll in v2.
 */
export const SECTORS = [
  { id: "command",    number: "01", label: "COMMAND",    caption: "MISSION STATE / FLOOR STATUS" },
  { id: "today",      number: "02", label: "TODAY",      caption: "ACTIVE QUEUE / DIRECT ENTRY" },
  { id: "trajectory", number: "03", label: "TRAJECTORY", caption: "SCAN FIELD / LIVE ANALYSIS" },
  { id: "signals",    number: "04", label: "SIGNALS",    caption: "INTERROGATION / SINGLE SIGNAL" },
  { id: "variance",   number: "05", label: "VARIANCE",   caption: "PERFORMANCE / WEEK OVER WEEK" },
  { id: "body",       number: "06", label: "BODY",       caption: "BIOMETRICS / MASS TELEMETRY" },
  { id: "archive",    number: "07", label: "ARCHIVE",    caption: "90-DAY RECORD / EVIDENCE MAP" },
  { id: "dossier",    number: "08", label: "DOSSIER",    caption: "CASE FILE / OPERATION RECORD" },
  { id: "system",     number: "09", label: "SYSTEM",     caption: "LINK STATE / ARCHIVE CONTROL" },
] as const;

export type SectorId = (typeof SECTORS)[number]["id"];

export const DEFAULT_SECTOR: SectorId = "command";

export function sectorAt(index: number) {
  return SECTORS[(index + SECTORS.length) % SECTORS.length];
}

export function sectorIndex(id: SectorId) {
  return SECTORS.findIndex((sector) => sector.id === id);
}

/** 1-9 jump straight to a sector, the way a real console would. */
export function sectorForDigit(key: string): SectorId | null {
  const digit = Number(key);
  if (!Number.isInteger(digit) || digit < 1 || digit > SECTORS.length) return null;
  return SECTORS[digit - 1].id;
}
