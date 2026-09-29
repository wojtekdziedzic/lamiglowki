// Synthesized sound effects (Web Audio): no asset files, no licensing.
import { loadMuted, saveMuted } from './storage';

let ctx: AudioContext | null = null;
let muted = loadMuted();

export const isMuted = (): boolean => muted;
export function setMuted(v: boolean): void {
  muted = v;
  saveMuted(v);
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface Tone {
  freq: number;
  to?: number;          // glide target frequency
  dur: number;          // seconds
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone({ freq, to, dur, type = 'sine', gain = 0.18, delay = 0 }: Tone): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  pick(): void {
    tone({ freq: 520, to: 780, dur: 0.09, type: 'triangle', gain: 0.12 });
  },
  /** Glass "clink"; pitch rises as the tube fills (height 0 = bottom). */
  land(height: number): void {
    const f = 880 * Math.pow(1.12, height);
    tone({ freq: f, dur: 0.16, gain: 0.16 });
    tone({ freq: f * 2.76, dur: 0.07, gain: 0.05 });
  },
  nope(): void {
    tone({ freq: 180, to: 120, dur: 0.14, type: 'square', gain: 0.06 });
  },
  /** A tube got sorted: cork "pop". */
  close(): void {
    tone({ freq: 300, to: 900, dur: 0.08, type: 'triangle', gain: 0.14 });
    tone({ freq: 1320, dur: 0.18, gain: 0.08, delay: 0.07 });
  },
  win(): void {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.14, delay: i * 0.11 }));
  },
};
