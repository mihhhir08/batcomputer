"use client";

import { sound } from "../../lib/audio/console.ts";

/** Direct entry. The number is the truth; the buttons are just faster. */
export function Stepper({ label, value, step, unit, complete, onChange }: {
  label: string;
  value: number;
  step: number;
  unit: string;
  complete: boolean;
  onChange: (value: number) => void;
}) {
  const move = (amount: number) => {
    const next = Math.max(0, Math.round((value + amount) * 100) / 100);
    if (next === value) return sound.deny();
    sound.toggle();
    onChange(next);
  };

  return (
    <div className={complete ? "stepper complete" : "stepper"}>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => move(-step)} disabled={value <= 0}>−</button>
      <label className="stepper-value">
        <input
          aria-label={label}
          inputMode="decimal"
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
        />
        <span>{unit}</span>
      </label>
      <button type="button" aria-label={`Increase ${label}`} onClick={() => move(step)}>+</button>
    </div>
  );
}
