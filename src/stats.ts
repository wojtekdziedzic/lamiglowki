import { clearKey, loadJSON, saveJSON } from './storage';

/** Solve-time statistics for one board size of one game, kept on the device. */
export interface GameStats {
  solved: number;
  bestMs: number;     // 0 = none yet
  recent: number[];   // latest solve times, newest last
}

/** Board size label ("8×8", "12 probówek") -> stats. Records only compare within a size. */
export type StatsBySize = Record<string, GameStats>;

const RECENT = 10;
/** Bucket for times recorded before stats were split by size (their size is unknown). */
export const LEGACY = 'wcześniej';
const key = (id: string) => `${id}.statsBySize`;
const legacyKey = (id: string) => `${id}.stats`;

const empty = (): GameStats => ({ solved: 0, bestMs: 0, recent: [] });

export function loadStats(id: string): StatsBySize {
  const all = loadJSON<StatsBySize>(key(id)) ?? {};
  // One-time move of the old single-bucket stats so no result is lost.
  const old = loadJSON<GameStats>(legacyKey(id));
  if (old?.solved) {
    all[LEGACY] = old;
    saveJSON(key(id), all);
  }
  if (old) clearKey(legacyKey(id));
  return all;
}

/** Records a solve and reports whether it beat the previous best for that board size. */
export function recordSolve(id: string, size: string, ms: number): { record: boolean; stats: GameStats } {
  const all = loadStats(id);
  const s = all[size] ?? empty();
  // Announce a record only when it shows on the clock (whole seconds); the exact best is kept anyway.
  const record = s.bestMs > 0 && Math.round(ms / 1000) < Math.round(s.bestMs / 1000);
  s.solved++;
  if (!s.bestMs || ms < s.bestMs) s.bestMs = ms;
  s.recent = [...s.recent, ms].slice(-RECENT);
  all[size] = s;
  saveJSON(key(id), all);
  return { record, stats: s };
}

export function average(s: GameStats): number {
  return s.recent.length ? s.recent.reduce((a, b) => a + b, 0) / s.recent.length : 0;
}

/** Sizes in natural order ("6×6" before "10×10"), the legacy bucket last. */
export function sortedSizes(all: StatsBySize): string[] {
  const num = (s: string) => (s.match(/\d+/g) ?? []).map(Number);
  return Object.keys(all).sort((a, b) => {
    if (a === LEGACY) return 1;
    if (b === LEGACY) return -1;
    const [na, nb] = [num(a), num(b)];
    for (let i = 0; i < Math.max(na.length, nb.length); i++) {
      const d = (na[i] ?? 0) - (nb[i] ?? 0);
      if (d) return d;
    }
    return a.localeCompare(b);
  });
}

/** 83000 -> "1:23", 3723000 -> "1:02:03". */
export function formatTime(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
