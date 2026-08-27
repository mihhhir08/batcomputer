"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sound } from "../../lib/audio/console.ts";

export type Command = { id: string; label: string; hint?: string; run: () => void };

/**
 * A real registry rather than a chain of string matches. Direct syntax is
 * parsed first so `log 79.4 kg` never has to appear in the list.
 */
export function CommandConsole({ commands, onClose, onDirect }: {
  commands: Command[];
  onClose: () => void;
  onDirect: (input: string) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((command) =>
      command.label.toLowerCase().includes(needle) || command.id.includes(needle));
  }, [commands, query]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setCursor(0); }, [query]);

  function submit() {
    if (onDirect(query)) {
      sound.commit();
      return onClose();
    }
    const chosen = matches[cursor];
    if (!chosen) return sound.deny();
    sound.commit();
    chosen.run();
    onClose();
  }

  return (
    <div className="console-layer" role="dialog" aria-modal="true" aria-label="Command console"
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="console-panel">
        <header>
          <span className="console-label">BATCOMPUTER // DIRECT COMMAND</span>
          <button type="button" onClick={onClose} aria-label="Close console">×</button>
        </header>

        <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <span aria-hidden="true">&gt;</span>
          <input ref={inputRef} value={query} aria-label="Command"
            placeholder="Type a command, or log 79.4 kg"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor((index) => Math.min(index + 1, matches.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor((index) => Math.max(index - 1, 0));
              }
            }} />
          <kbd>ENTER</kbd>
        </form>

        <div className="console-list">
          {matches.map((command, index) => (
            <button key={command.id} type="button"
              className={index === cursor ? "console-item active" : "console-item"}
              onPointerEnter={() => setCursor(index)}
              onClick={() => { sound.commit(); command.run(); onClose(); }}>
              <span>{command.label}</span>
              {command.hint && <em>{command.hint}</em>}
            </button>
          ))}
          {!matches.length && <p className="console-empty">No matching command.</p>}
        </div>

        <footer>Direct syntax · <code>log 79.4 kg</code> · <code>open 2026-08-12</code> · <code>close</code></footer>
      </section>
    </div>
  );
}
