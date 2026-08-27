"use client";

import { useEffect, useRef, useState } from "react";
import { sound, unlockAudio } from "../../lib/audio/console.ts";

const LENGTH = 4;

/**
 * Four digits, masked, on the boot field. Deliberately not a form: digits are
 * captured from the keypad and submitted the moment the fourth lands.
 */
export function PinLock({ onCleared }: { onCleared: () => void }) {
  const [pin, setPin] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "denied">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function submit(candidate: string) {
    setState("checking");
    unlockAudio();
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: candidate }),
      });
      if (response.ok) {
        sound.floorHeld();
        return onCleared();
      }
    } catch {
      // fall through to denial
    }
    sound.deny();
    setState("denied");
    setPin("");
    window.setTimeout(() => setState("idle"), 900);
    inputRef.current?.focus();
  }

  function change(raw: string) {
    if (state === "checking") return;
    const digits = raw.replace(/\D/g, "").slice(0, LENGTH);
    setPin(digits);
    if (digits.length && digits.length < LENGTH) sound.toggle();
    if (digits.length === LENGTH) void submit(digits);
  }

  return (
    <section className={`pin-lock ${state}`} aria-label="Clearance required">
      <span className="console-label">CLEARANCE REQUIRED</span>

      <div className="pin-dots" onClick={() => inputRef.current?.focus()}>
        {Array.from({ length: LENGTH }, (_, index) => (
          <i key={index} className={index < pin.length ? "filled" : ""} aria-hidden="true">
            {index < pin.length ? "✳" : ""}
          </i>
        ))}
      </div>

      {/* The real field, kept off-screen so the masked dots are what is seen. */}
      <input
        ref={inputRef}
        className="pin-field"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        aria-label="Four digit PIN"
        value={pin}
        disabled={state === "checking"}
        onChange={(event) => change(event.target.value)}
      />

      <p className={state === "denied" ? "pin-note denied" : "pin-note"}>
        {state === "denied" ? "DENIED" : state === "checking" ? "VERIFYING" : "ENTER FOUR DIGITS"}
      </p>
    </section>
  );
}
