import { loadJSON, saveJSON } from './storage';

/** Solve-time statistics per game, kept on the device. */
export interface GameStats {
  solved: number;
  bestMs: number;     // 0 = none yet
  recent: number[];   // latest solve times, newest last
}

const RECENT = 10;
const key = (id: string) => `${id}.stats`;

export function loadStats(id: string): GameStats {
  return loadJSON<GameStats>(key(id)) ?? { solved: 0, bestMs: 0, recent: [] };
}

/** Records a solve and reports whether it beat the previous best. */
export function recordSolve(id: string, ms: number): { record: boolean; stats: GameStats } {
  const s = loadStats(id);
  const record = s.bestMs > 0 && ms < s.bestMs;
  s.solved++;
  if (!s.bestMs || ms < s.bestMs) s.bestMs = ms;
  s.recent = [...s.recent, ms].slice(-RECENT);
  saveJSON(key(id), s);
  return { record, stats: s };
}

export function average(s: GameStats): number {
  return s.recent.length ? s.recent.reduce((a, b) => a + b, 0) / s.recent.length : 0;
}

/** 83000 -> "1:23", 3723000 -> "1:02:03". */
export function formatTime(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
