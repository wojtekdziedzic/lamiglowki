import { mulberry32 } from '../../rng';

/** Row-major n*n cells: -1 empty, 0 or 1 (two colors). */
export type Grid = number[];

export function sizeForLevel(l: number): number {
  return l <= 10 ? 6 : l <= 30 ? 8 : 10;
}

/** Share of cells left empty: grows with level, capped (uniqueness usually stops removal earlier). */
export function emptyShare(l: number): number {
  return Math.min(0.75, 0.5 + l * 0.008);
}

const lineFull = (g: Grid, idx: number[]) => idx.every((i) => g[i] !== -1);
// Line index lists are hot in the solver: build them once per board size.
const lineCache = new Map<number, { rows: number[][]; cols: number[][] }>();
function lines(n: number) {
  let l = lineCache.get(n);
  if (!l) {
    l = {
      rows: Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c)),
      cols: Array.from({ length: n }, (_, c) => Array.from({ length: n }, (_, r) => r * n + c)),
    };
    lineCache.set(n, l);
  }
  return l;
}
const rowIdx = (n: number, r: number) => lines(n).rows[r];
const colIdx = (n: number, c: number) => lines(n).cols[c];
const sameLine = (g: Grid, a: number[], b: number[]) => a.every((i, k) => g[i] === g[b[k]]);

/** Checks every rule that involves cell i (which must be filled). */
function okAt(g: Grid, n: number, i: number): boolean {
  const r = Math.floor(i / n), c = i % n, v = g[i];
  const at = (rr: number, cc: number) => g[rr * n + cc];
  for (let s = c - 2; s <= c; s++) {
    if (s >= 0 && s + 2 < n && at(r, s) === v && at(r, s + 1) === v && at(r, s + 2) === v) return false;
  }
  for (let s = r - 2; s <= r; s++) {
    if (s >= 0 && s + 2 < n && at(s, c) === v && at(s + 1, c) === v && at(s + 2, c) === v) return false;
  }
  let rc = 0, cc = 0;
  for (let k = 0; k < n; k++) { if (at(r, k) === v) rc++; if (at(k, c) === v) cc++; }
  if (rc > n / 2 || cc > n / 2) return false;
  const ri = rowIdx(n, r);
  if (lineFull(g, ri)) {
    for (let o = 0; o < n; o++) if (o !== r) { const oi = rowIdx(n, o); if (lineFull(g, oi) && sameLine(g, ri, oi)) return false; }
  }
  const ci = colIdx(n, c);
  if (lineFull(g, ci)) {
    for (let o = 0; o < n; o++) if (o !== c) { const oi = colIdx(n, o); if (lineFull(g, oi) && sameLine(g, ci, oi)) return false; }
  }
  return true;
}

/**
 * Fills every cell where only one color passes the rules, until nothing changes.
 * Returns false on a contradiction (a cell where neither color fits).
 */
function propagate(g: Grid, n: number): boolean {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < g.length; i++) {
      if (g[i] !== -1) continue;
      g[i] = 0; const ok0 = okAt(g, n, i);
      g[i] = 1; const ok1 = okAt(g, n, i);
      g[i] = -1;
      if (!ok0 && !ok1) return false;
      if (ok0 !== ok1) { g[i] = ok0 ? 0 : 1; changed = true; }
    }
  }
  return true;
}

/**
 * Propagation plus branching on the first open cell. onSolution returns true to stop.
 * Every cell is checked with okAt when it is set, so a full grid is always valid.
 */
function search(start: Grid, n: number, order: () => number[], onSolution: (g: Grid) => boolean): void {
  const rec = (g: Grid): boolean => {
    if (!propagate(g, n)) return false;
    const i = g.indexOf(-1);
    if (i < 0) return onSolution(g);
    for (const v of order()) {
      const h = g.slice();
      h[i] = v;
      if (okAt(h, n, i) && rec(h)) return true;
    }
    return false;
  };
  rec(start.slice());
}

export function countSolutions(g: Grid, n: number, limit = 2): number {
  let count = 0;
  search(g, n, () => [0, 1], () => ++count >= limit);
  return count;
}

export interface BinairoLevel { n: number; puzzle: Grid; solution: Grid }

/** Deterministic per level; the puzzle always has exactly one solution. */
export function generate(l: number, salt = 0): BinairoLevel {
  const n = sizeForLevel(l);
  const rnd = mulberry32(l * 40503 + 17 + salt * 1000003);
  let solution: Grid = [];
  search(new Array(n * n).fill(-1), n, () => (rnd() < 0.5 ? [0, 1] : [1, 0]), (s) => { solution = s.slice(); return true; });

  const order = Array.from({ length: n * n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const puzzle = solution.slice();
  const target = Math.floor(n * n * emptyShare(l));
  let empty = 0;
  for (const i of order) {
    if (empty >= target) break;
    const v = puzzle[i];
    puzzle[i] = -1;
    if (countSolutions(puzzle, n, 2) === 1) empty++;
    else puzzle[i] = v;
  }
  return { n, puzzle, solution };
}

/** Cells breaking a rule: three in a line, too many of one color, or a duplicated full line. */
export function errors(g: Grid, n: number): Set<number> {
  const bad = new Set<number>();
  const lines: number[][] = [];
  for (let k = 0; k < n; k++) lines.push(rowIdx(n, k), colIdx(n, k));
  for (const line of lines) {
    for (let s = 0; s + 2 < n; s++) {
      const [a, b, c] = [line[s], line[s + 1], line[s + 2]];
      if (g[a] !== -1 && g[a] === g[b] && g[b] === g[c]) { bad.add(a); bad.add(b); bad.add(c); }
    }
    for (const v of [0, 1]) {
      const cells = line.filter((i) => g[i] === v);
      if (cells.length > n / 2) cells.forEach((i) => bad.add(i));
    }
  }
  const check = (get: (k: number) => number[]) => {
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const la = get(a), lb = get(b);
      if (lineFull(g, la) && lineFull(g, lb) && sameLine(g, la, lb)) [...la, ...lb].forEach((i) => bad.add(i));
    }
  };
  check((k) => rowIdx(n, k));
  check((k) => colIdx(n, k));
  return bad;
}

export const isComplete = (g: Grid, n: number): boolean => g.every((v) => v !== -1) && errors(g, n).size === 0;
