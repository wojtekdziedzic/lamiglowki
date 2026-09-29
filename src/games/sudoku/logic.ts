import { mulberry32 } from '../../rng';

/** n*n cells, row-major, 0 = empty. */
export type Grid = number[];

/** Board shape: n digits, boxes of br rows x bc columns. */
export interface Spec { n: number; br: number; bc: number }

export const SPEC9: Spec = { n: 9, br: 3, bc: 3 };
export const SPEC6: Spec = { n: 6, br: 2, bc: 3 };

export interface Geometry extends Spec {
  cells: number;
  row: (i: number) => number;
  col: (i: number) => number;
  box: (i: number) => number;
  /** Indices sharing a row, column or box with i (excluding i). */
  peers: number[][];
}

const geoCache = new Map<string, Geometry>();
export function geometry(spec: Spec): Geometry {
  const key = `${spec.n}:${spec.br}:${spec.bc}`;
  let g = geoCache.get(key);
  if (g) return g;
  const { n, br, bc } = spec;
  const row = (i: number) => (i / n) | 0;
  const col = (i: number) => i % n;
  const box = (i: number) => ((row(i) / br) | 0) * (n / bc) + ((col(i) / bc) | 0);
  const peers = Array.from({ length: n * n }, (_, i) => {
    const out: number[] = [];
    for (let j = 0; j < n * n; j++) {
      if (j !== i && (row(j) === row(i) || col(j) === col(i) || box(j) === box(i))) out.push(j);
    }
    return out;
  });
  g = { ...spec, cells: n * n, row, col, box, peers };
  geoCache.set(key, g);
  return g;
}

const popcount = (m: number) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

/**
 * Backtracking with bitmasks and "fewest candidates first".
 * onSolution returns true to stop the search. Returns false if the givens conflict.
 */
function search(start: Grid, geo: Geometry, order: (mask: number) => number[], onSolution: (g: Grid) => boolean): boolean {
  const { n, cells, row, col, box } = geo;
  const all = (1 << (n + 1)) - 2; // bits 1..n
  const g = start.slice();
  const rows = new Array(n).fill(0), cols = new Array(n).fill(0), boxes = new Array(n).fill(0);
  for (let i = 0; i < cells; i++) {
    const v = g[i];
    if (!v) continue;
    const bit = 1 << v;
    if ((rows[row(i)] | cols[col(i)] | boxes[box(i)]) & bit) return false;
    rows[row(i)] |= bit; cols[col(i)] |= bit; boxes[box(i)] |= bit;
  }
  const rec = (): boolean => {
    let best = -1, bestMask = 0, bestCount = n + 1;
    for (let i = 0; i < cells; i++) {
      if (g[i]) continue;
      const mask = all & ~(rows[row(i)] | cols[col(i)] | boxes[box(i)]);
      const c = popcount(mask);
      if (c === 0) return false;
      if (c < bestCount) { best = i; bestMask = mask; bestCount = c; if (c === 1) break; }
    }
    if (best === -1) return onSolution(g);
    const r = row(best), c = col(best), b = box(best);
    for (const v of order(bestMask)) {
      const bit = 1 << v;
      g[best] = v; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      if (rec()) return true;
      g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
    }
    return false;
  };
  rec();
  return true;
}

const ascending = (mask: number) => {
  const out: number[] = [];
  for (let v = 1; mask >> v; v++) if (mask & (1 << v)) out.push(v);
  return out;
};

/** Number of solutions, counting stops at limit. */
export function countSolutions(g: Grid, spec: Spec = SPEC9, limit = 2): number {
  let count = 0;
  const ok = search(g, geometry(spec), ascending, () => ++count >= limit);
  return ok ? count : 0;
}

/** Clue target: 9x9 goes 44 down to 24; 6x6 goes 20 down to 10 (removal stalls a bit above). */
export function targetClues(l: number, spec: Spec = SPEC9): number {
  return spec.n === 9
    ? Math.max(24, 44 - Math.floor((l - 1) / 2))
    : Math.max(10, 20 - Math.floor((l - 1) / 3));
}

export function difficultyLabel(clues: number, spec: Spec = SPEC9): string {
  const share = clues / (spec.n * spec.n);
  return share >= 0.46 ? 'łatwe' : share >= 0.36 ? 'średnie' : 'trudne';
}

export interface SudokuLevel { puzzle: Grid; solution: Grid; clues: number }

/**
 * Deterministic per (level, salt); the puzzle always has exactly one solution.
 * Salt 0 is the regular level sequence; the daily puzzle passes the day number.
 */
export function generate(l: number, spec: Spec = SPEC9, salt = 0): SudokuLevel {
  const geo = geometry(spec);
  const base = spec.n === 9 ? l * 2654435761 + 99 : l * 40499 + 7;
  const rnd = mulberry32(base + salt * 1000003);
  const shuffled = <T>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  let solution: Grid = [];
  search(new Array(geo.cells).fill(0), geo, (mask) => shuffled(ascending(mask)), (s) => { solution = s.slice(); return true; });

  const puzzle = solution.slice();
  const target = targetClues(l, spec);
  let clues = geo.cells;
  for (const i of shuffled(Array.from({ length: geo.cells }, (_, k) => k))) {
    if (clues <= target) break;
    const v = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, spec, 2) === 1) clues--;
    else puzzle[i] = v;
  }
  return { puzzle, solution, clues };
}

/** Cells whose value repeats in a row, column or box. */
export function conflicts(g: Grid, spec: Spec = SPEC9): Set<number> {
  const { peers } = geometry(spec);
  const out = new Set<number>();
  for (let i = 0; i < g.length; i++) {
    if (!g[i]) continue;
    for (const j of peers[i]) if (g[j] === g[i]) { out.add(i); break; }
  }
  return out;
}
