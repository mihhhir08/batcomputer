"use client";

import { SECTORS, type SectorId, sectorIndex } from "../../lib/sectors.ts";

/**
 * The marker is one element that travels, not nine that light up. The rail
 * reads as a physical position indicator on a continuous surface.
 */
export function SectorRail({ active, onSelect, floorHeld, onConsole }: {
  active: SectorId;
  onSelect: (id: SectorId) => void;
  floorHeld: boolean;
  onConsole: () => void;
}) {
  const index = sectorIndex(active);

  return (
    <nav className="sector-rail" aria-label="Batcomputer sectors">
      <div className="rail-brand" aria-hidden="true">
        <i className={floorHeld ? "rail-pulse held" : "rail-pulse"} />
      </div>

      <div className="rail-track" style={{ "--active-index": index } as React.CSSProperties}>
        <span className="rail-marker" aria-hidden="true" />
        {SECTORS.map((sector) => (
          <button
            key={sector.id}
            type="button"
            className={sector.id === active ? "rail-item active" : "rail-item"}
            aria-current={sector.id === active ? "true" : undefined}
            onClick={() => onSelect(sector.id)}
          >
            <span className="rail-number">{sector.number}</span>
            <span className="rail-label">{sector.label}</span>
          </button>
        ))}
      </div>

      <button type="button" className="rail-console" onClick={onConsole}>
        <span className="rail-number">⌘K</span>
        <span className="rail-label">CONSOLE</span>
      </button>
    </nav>
  );
}
