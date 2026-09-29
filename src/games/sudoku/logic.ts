import { mulberry32 } from '../../rng';

/** 81 cells, row-major, 0 = empty. */
export type Grid = number[];

export const row = (i: number) => (i / 9) | 0;
export const col = (i: number) => i % 9;
export const box = (i: number) => ((row(i) / 3) | 0) * 3 + ((col(i) / 3) | 0);

/** Indices sharing a row, column or box with i (excluding i). */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const out: number[] = [];
  for (let j = 0; j < 81; j++) {
    if (j !== i && (row(j) === row(i) || col(j) === col(i) || box(j) === box(i))) out.push(j);
  }
  return out;
});

const ALL = 0x3fe; // bits 1..9
const popcount = (m: number) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

/**
 * Backtracking with bitmasks and "fewest candidates first".
 * onSolution returns true to stop the search. Returns false if the givens conflict.
 */
function search(start: Grid, order: (mask: number) => number[], onSolution: (g: Grid) => boolean): boolean {
  const g = start.slice();
  const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (!v) continue;
    const bit = 1 << v;
    if ((rows[row(i)] | cols[col(i)] | boxes[box(i)]) & bit) return false;
    rows[row(i)] |= bit; cols[col(i)] |= bit; boxes[box(i)] |= bit;
  }
  const rec = (): boolean => {
    let best = -1, bestMask = 0, bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const mask = ALL & ~(rows[row(i)] | cols[col(i)] | boxes[box(i)]);
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
  for (let v = 1; v <= 9; v++) if (mask & (1 << v)) out.push(v);
  return out;
};

/** Number of solutions, counting stops at limit. */
export function countSolutions(g: Grid, limit = 2): number {
  let count = 0;
  const ok = search(g, ascending, () => ++count >= limit);
  return ok ? count : 0;
}

export function solve(g: Grid): Grid | null {
  let out: Grid | null = null;
  search(g, ascending, (s) => { out = s.slice(); return true; });
  return out;
}

/** Clue count target: 44 on level 1 down to the 24 floor (removal usually stalls a bit above it). */
export function targetClues(l: number): number {
  return Math.max(24, 44 - Math.floor((l - 1) / 2));
}

export function difficultyLabel(clues: number): string {
  return clues >= 38 ? 'łatwe' : clues >= 30 ? 'średnie' : 'trudne';
}

export interface SudokuLevel { puzzle: Grid; solution: Grid; clues: number }

/** Deterministic per level; the puzzle always has exactly one solution. */
export function generate(l: number): SudokuLevel {
  const rnd = mulberry32(l * 2654435761 + 99);
  const shuffled = <T>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  let solution: Grid = [];
  search(new Array(81).fill(0), (mask) => shuffled(ascending(mask)), (s) => { solution = s.slice(); return true; });

  const puzzle = solution.slice();
  const target = targetClues(l);
  let clues = 81;
  for (const i of shuffled(Array.from({ length: 81 }, (_, k) => k))) {
    if (clues <= target) break;
    const v = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) === 1) clues--;
    else puzzle[i] = v;
  }
  return { puzzle, solution, clues };
}

/** Cells whose value repeats in a row, column or box. */
export function conflicts(g: Grid): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < 81; i++) {
    if (!g[i]) continue;
    for (const j of PEERS[i]) if (g[j] === g[i]) { out.add(i); break; }
  }
  return out;
}
