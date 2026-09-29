import { mulberry32 } from '../../rng';

/**
 * n x n Latin square of building heights 1..n. A clue on the edge says how many buildings
 * are visible from that side (taller ones hide the shorter ones behind them). 0 = no clue.
 */
export interface Clues { top: number[]; bottom: number[]; left: number[]; right: number[] }
export interface SkyLevel { n: number; clues: Clues; givens: number[]; solution: number[] }

export function sizeForLevel(l: number): number {
  return l <= 8 ? 4 : l <= 25 ? 5 : 6;
}

export function visible(line: number[]): number {
  let max = 0, count = 0;
  for (const h of line) if (h > max) { max = h; count++; }
  return count;
}

/**
 * Can a line whose first `len` cells (read from `start` in steps of `step`) are filled
 * still show exactly `clue` buildings? Allocation-free: this is the solver's hot path.
 */
function prefixOk(g: number[], start: number, step: number, len: number, n: number, clue: number): boolean {
  if (!clue) return true;
  let max = 0, seen = 0;
  for (let k = 0, i = start; k < len; k++, i += step) if (g[i] > max) { max = g[i]; seen++; }
  if (len === n || max === n) return seen === clue; // nothing behind the tallest counts
  return seen + 1 <= clue && seen + (n - len) >= clue; // the tallest is still to come
}

export function countSolutions(n: number, clues: Clues, givens: number[], limit = 2): number[][] {
  const out: number[][] = [];
  const g = givens.slice();
  const rowUsed = new Array(n).fill(0), colUsed = new Array(n).fill(0);
  for (let i = 0; i < n * n; i++) {
    if (!g[i]) continue;
    const bit = 1 << g[i], r = Math.floor(i / n), c = i % n;
    if ((rowUsed[r] | colUsed[c]) & bit) return out;
    rowUsed[r] |= bit; colUsed[c] |= bit;
  }
  // Cells fill row by row, so row r is known up to column c and column c down to row r.
  const lineChecks = (i: number): boolean => {
    const r = Math.floor(i / n), c = i % n;
    if (!prefixOk(g, r * n, 1, c + 1, n, clues.left[r])) return false;
    if (!prefixOk(g, c, n, r + 1, n, clues.top[c])) return false;
    if (c === n - 1 && !prefixOk(g, r * n + n - 1, -1, n, n, clues.right[r])) return false;
    if (r === n - 1 && !prefixOk(g, (n - 1) * n + c, -n, n, n, clues.bottom[c])) return false;
    return true;
  };

  const rec = (i: number): boolean => {
    if (i === n * n) { out.push(g.slice()); return out.length >= limit; }
    const r = Math.floor(i / n), c = i % n;
    if (givens[i]) return lineChecks(i) && rec(i + 1);
    for (let v = 1; v <= n; v++) {
      const bit = 1 << v;
      if ((rowUsed[r] | colUsed[c]) & bit) continue;
      g[i] = v; rowUsed[r] |= bit; colUsed[c] |= bit;
      if (lineChecks(i) && rec(i + 1)) return true;
      g[i] = 0; rowUsed[r] &= ~bit; colUsed[c] &= ~bit;
    }
    return false;
  };
  rec(0);
  return out;
}

export function cluesOf(n: number, grid: number[]): Clues {
  const row = (r: number) => grid.slice(r * n, r * n + n);
  const col = (c: number) => Array.from({ length: n }, (_, r) => grid[r * n + c]);
  const idx = Array.from({ length: n }, (_, k) => k);
  return {
    top: idx.map((c) => visible(col(c))),
    bottom: idx.map((c) => visible(col(c).reverse())),
    left: idx.map((r) => visible(row(r))),
    right: idx.map((r) => visible(row(r).reverse())),
  };
}

/** Deterministic per (level, salt); always exactly one solution. */
export function generate(l: number, salt = 0): SkyLevel {
  const n = sizeForLevel(l);
  const rnd = mulberry32(l * 15551 + 11 + salt * 1000003);
  const shuffle = <T>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Random Latin square: cyclic base with shuffled rows, columns and symbols.
  const rows = shuffle(Array.from({ length: n }, (_, k) => k));
  const cols = shuffle(Array.from({ length: n }, (_, k) => k));
  const sym = shuffle(Array.from({ length: n }, (_, k) => k + 1));
  const solution = Array.from({ length: n * n }, (_, i) => sym[(rows[Math.floor(i / n)] + cols[i % n]) % n]);

  const clues = cluesOf(n, solution);
  const givens = new Array(n * n).fill(0);
  // All clues are not always enough: reveal a cell where two solutions disagree until unique.
  for (;;) {
    const sols = countSolutions(n, clues, givens, 2);
    if (sols.length <= 1) break;
    const diff = sols[0].findIndex((v, i) => v !== sols[1][i]);
    givens[diff] = solution[diff];
  }

  // Remove clues while the answer stays unique; early levels keep a few extra.
  const target = Math.max(0, 4 * n - 2 - Math.floor(l / 2));
  const slots = shuffle(['top', 'bottom', 'left', 'right'].flatMap((side) =>
    Array.from({ length: n }, (_, k) => [side as keyof Clues, k] as const)));
  let count = 4 * n;
  for (const [side, k] of slots) {
    if (count <= target) break;
    const keep = clues[side][k];
    clues[side][k] = 0;
    if (countSolutions(n, clues, givens, 2).length === 1) count--;
    else clues[side][k] = keep;
  }
  for (const i of shuffle(Array.from({ length: n * n }, (_, k) => k))) {
    if (!givens[i]) continue;
    givens[i] = 0;
    if (countSolutions(n, clues, givens, 2).length !== 1) givens[i] = solution[i];
  }
  return { n, clues, givens, solution };
}

/** Cells repeating a height in their row or column. */
export function duplicates(n: number, g: number[]): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < n * n; i++) {
    if (!g[i]) continue;
    const r = Math.floor(i / n), c = i % n;
    for (let k = 0; k < n; k++) {
      if (k !== c && g[r * n + k] === g[i]) bad.add(i);
      if (k !== r && g[k * n + c] === g[i]) bad.add(i);
    }
  }
  return bad;
}

/** Clue state for a full line: 'ok', 'bad', or 'open' while the line has gaps. */
export function clueState(n: number, g: number[], side: keyof Clues, k: number, clue: number): 'ok' | 'bad' | 'open' {
  const line = side === 'left' || side === 'right'
    ? g.slice(k * n, k * n + n)
    : Array.from({ length: n }, (_, r) => g[r * n + k]);
  if (line.some((v) => !v)) return 'open';
  const seen = visible(side === 'right' || side === 'bottom' ? line.reverse() : line);
  return seen === clue ? 'ok' : 'bad';
}
