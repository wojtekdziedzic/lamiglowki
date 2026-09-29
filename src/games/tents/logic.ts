import { mulberry32 } from '../../rng';

/**
 * Tents: every tree gets exactly one tent on an orthogonally adjacent cell (one-to-one),
 * tents never touch each other, not even diagonally, and the numbers give the tent count
 * of each row and column.
 */
export interface TentsLevel {
  n: number;
  trees: boolean[];
  tents: boolean[];    // the unique solution
  rowCounts: number[];
  colCounts: number[];
}

export function sizeForLevel(l: number): number {
  return l <= 6 ? 6 : l <= 20 ? 7 : l <= 40 ? 8 : 9;
}

const orth = (n: number, i: number): number[] => {
  const r = Math.floor(i / n), c = i % n, out: number[] = [];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
};

export const around = (n: number, i: number): number[] => {
  const r = Math.floor(i / n), c = i % n, out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < n && cc >= 0 && cc < n) out.push(rr * n + cc);
  }
  return out;
};

/** Can every tree be paired with its own adjacent tent? (Kuhn's bipartite matching.) */
export function perfectMatching(n: number, trees: boolean[], tents: boolean[]): boolean {
  const treeCells = trees.flatMap((t, i) => (t ? [i] : []));
  const tentCount = tents.filter(Boolean).length;
  if (tentCount !== treeCells.length) return false;
  const owner = new Map<number, number>(); // tent cell -> tree cell
  const tryTree = (tree: number, seen: Set<number>): boolean => {
    for (const t of orth(n, tree)) {
      if (!tents[t] || seen.has(t)) continue;
      seen.add(t);
      const prev = owner.get(t);
      if (prev === undefined || tryTree(prev, seen)) { owner.set(t, tree); return true; }
    }
    return false;
  };
  return treeCells.every((tree) => tryTree(tree, new Set()));
}

/** All solutions up to `limit`, as tent layouts. */
export function solveAll(n: number, trees: boolean[], rowCounts: number[], colCounts: number[], limit = 2): boolean[][] {
  const N = n * n;
  // A tent can only stand next to a tree, never on one.
  const cand = Array.from({ length: N }, (_, i) => !trees[i] && orth(n, i).some((j) => trees[j]));
  // Candidate cells still ahead in each column, for the "can still reach the count" check.
  const colLeft = new Array(n).fill(0);
  cand.forEach((c, i) => { if (c) colLeft[i % n]++; });
  const tents = new Array(N).fill(false);
  const rowHave = new Array(n).fill(0), colHave = new Array(n).fill(0);
  const out: boolean[][] = [];

  const rec = (i: number): boolean => {
    if (i === N) {
      if (colHave.every((v, c) => v === colCounts[c]) && perfectMatching(n, trees, tents)) out.push(tents.slice());
      return out.length >= limit;
    }
    const r = Math.floor(i / n), c = i % n;
    if (c === 0 && r > 0 && rowHave[r - 1] !== rowCounts[r - 1]) return false; // previous row must be exact
    if (!cand[i]) return rec(i + 1);
    colLeft[c]--;
    let stop = false;
    // Place a tent here?
    const touches = around(n, i).some((j) => j < i && tents[j]);
    if (!touches && rowHave[r] < rowCounts[r] && colHave[c] < colCounts[c]) {
      tents[i] = true; rowHave[r]++; colHave[c]++;
      stop = rec(i + 1);
      tents[i] = false; rowHave[r]--; colHave[c]--;
    }
    // Leave it empty, if the column can still reach its count.
    if (!stop && colHave[c] + colLeft[c] >= colCounts[c]) stop = rec(i + 1);
    colLeft[c]++;
    return stop;
  };
  rec(0);
  return out;
}

/** Deterministic per (level, salt); always exactly one solution. */
export function generate(l: number, salt = 0): TentsLevel {
  const n = sizeForLevel(l);
  const N = n * n;
  const want = Math.round(N * 0.19);
  for (let attempt = 0; ; attempt++) {
    const rnd = mulberry32(l * 27183 + attempt * 3571 + 9 + salt * 1000003);
    const order = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    // Scatter non-touching tents, then give each one its own adjacent tree.
    const tents = new Array(N).fill(false);
    const trees = new Array(N).fill(false);
    let placed = 0;
    for (const i of order) {
      if (placed >= want) break;
      if (around(n, i).some((j) => tents[j])) continue;
      tents[i] = true;
      placed++;
    }
    let ok = true;
    for (let i = 0; i < N && ok; i++) {
      if (!tents[i]) continue;
      const spots = orth(n, i).filter((j) => !tents[j] && !trees[j]);
      if (!spots.length) { ok = false; break; }
      trees[spots[Math.floor(rnd() * spots.length)]] = true;
    }
    if (!ok) continue;
    const rowCounts = Array.from({ length: n }, (_, r) => tents.slice(r * n, r * n + n).filter(Boolean).length);
    const colCounts = Array.from({ length: n }, (_, c) => Array.from({ length: n }, (_, r) => tents[r * n + c]).filter(Boolean).length);
    if (solveAll(n, trees, rowCounts, colCounts, 2).length === 1) return { n, trees, tents, rowCounts, colCounts };
  }
}

/** Tents touching another tent (the rule most players break first). */
export function touching(n: number, tents: boolean[]): Set<number> {
  const bad = new Set<number>();
  tents.forEach((t, i) => { if (t && around(n, i).some((j) => tents[j])) bad.add(i); });
  return bad;
}
