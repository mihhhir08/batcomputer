// Synthesised, not sampled. Every sound here is generated from oscillators and
// filtered noise, so the whole audio layer costs zero bytes of payload and can
// be tuned by ear rather than re-exported from a file.
//
// The character is electromechanical: a mains hum under everything, relay
// clicks with a physical snap, capacitor whine on focus, servo sweeps on
// sector travel. Nothing melodic. This is a machine, not an instrument.

type Ctx = AudioContext & { _batHum?: { osc: OscillatorNode[]; gain: GainNode } };

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let enabled = true;

export function isAudioEnabled() {
  return enabled;
}

/** Browsers only permit audio inside a gesture; the boot keypress is ours. */
export function unlockAudio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    ctx = new AudioCtor() as Ctx;
    master = ctx.createGain();
    master.gain.value = enabled ? 0.5 : 0;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setAudioEnabled(next: boolean) {
  enabled = next;
  if (master && ctx) master.gain.setTargetAtTime(next ? 0.5 : 0, ctx.currentTime, 0.05);
  if (next) startHum();
  return enabled;
}

function noiseBuffer(context: AudioContext, seconds: number) {
  const frames = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Filtered noise burst. The backbone of every mechanical sound here. */
function burst(seconds: number, frequency: number, q: number, peak: number, type: BiquadFilterType = "bandpass") {
  if (!ctx || !master || !enabled) return;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, seconds);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  source.connect(filter).connect(gain).connect(master);
  source.start(now);
  source.stop(now + seconds);
  return { filter, now };
}

function tone(frequency: number, seconds: number, peak: number, type: OscillatorType = "square") {
  if (!ctx || !master || !enabled) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + seconds);
  return { osc, gain, now };
}

/** Mains hum plus its third harmonic. Runs for as long as the terminal is up. */
export function startHum() {
  if (!ctx || !master || !enabled || ctx._batHum) return;
  const gain = ctx.createGain();
  gain.gain.value = 0.012;
  const lift = ctx.createBiquadFilter();
  lift.type = "lowpass";
  lift.frequency.value = 320;
  const osc = [60, 180].map((frequency, index) => {
    const o = ctx!.createOscillator();
    o.type = index ? "triangle" : "sine";
    o.frequency.value = frequency;
    o.connect(gain);
    o.start();
    return o;
  });
  gain.connect(lift).connect(master);
  ctx._batHum = { osc, gain };
}

export const sound = {
  /** Relay snap. Logging something real. */
  commit() {
    burst(0.045, 2200, 7, 0.32);
    tone(140, 0.06, 0.09, "square");
  },
  /** Lighter contact for toggles that clear nothing. */
  toggle() {
    burst(0.03, 3000, 9, 0.18);
  },
  /** Servo travel between sectors. */
  travel(forward = true) {
    if (!ctx || !master || !enabled) return;
    const made = burst(0.22, forward ? 700 : 1500, 4, 0.14);
    if (!made) return;
    made.filter.frequency.exponentialRampToValueAtTime(forward ? 1800 : 600, made.now + 0.2);
  },
  /** Capacitor whine when a signal is put under interrogation. */
  focus() {
    tone(1180, 0.12, 0.035, "sine");
  },
  /** The floor closing. Three non-negotiables held. */
  floorHeld() {
    tone(320, 0.16, 0.07, "triangle");
    window.setTimeout(() => tone(480, 0.22, 0.06, "triangle"), 90);
  },
  /** Refusal. Low, short, unmistakably negative. */
  deny() {
    tone(90, 0.18, 0.12, "sawtooth");
  },
  /** Boot: rising sweep as the tube warms. */
  boot() {
    if (!ctx || !master || !enabled) return;
    const made = burst(1.1, 220, 1.4, 0.11, "lowpass");
    if (made) made.filter.frequency.exponentialRampToValueAtTime(2600, made.now + 1);
    tone(52, 1.2, 0.05, "sine");
  },
};
