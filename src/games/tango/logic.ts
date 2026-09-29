import { mulberry32 } from '../../rng';

/**
 * 6x6 suns (0) and moons (1), -1 = empty. Rules: three of each per row and column,
 * never three of a kind side by side, and every edge sign holds:
 * "=" joins equal neighbours, "x" joins different ones.
 */
export const N = 6;
export type Grid = number[];

export interface Edge { a: number; b: number; eq: boolean } // a < b, orthogonal neighbours

export interface TangoLevel { puzzle: Grid; solution: Grid; edges: Edge[] }

type EdgeIndex = { other: number; eq: boolean }[][];

function indexEdges(edges: Edge[]): EdgeIndex {
  const idx: EdgeIndex = Array.from({ length: N * N }, () => []);
  for (const e of edges) {
    idx[e.a].push({ other: e.b, eq: e.eq });
    idx[e.b].push({ other: e.a, eq: e.eq });
  }
  return idx;
}

/** Checks every rule that involves cell i (which must be filled). */
function okAt(g: Grid, idx: EdgeIndex, i: number): boolean {
  const r = Math.floor(i / N), c = i % N, v = g[i];
  const at = (rr: number, cc: number) => g[rr * N + cc];
  for (let s = c - 2; s <= c; s++) {
    if (s >= 0 && s + 2 < N && at(r, s) === v && at(r, s + 1) === v && at(r, s + 2) === v) return false;
  }
  for (let s = r - 2; s <= r; s++) {
    if (s >= 0 && s + 2 < N && at(s, c) === v && at(s + 1, c) === v && at(s + 2, c) === v) return false;
  }
  let rc = 0, cc = 0;
  for (let k = 0; k < N; k++) { if (at(r, k) === v) rc++; if (at(k, c) === v) cc++; }
  if (rc > N / 2 || cc > N / 2) return false;
  for (const { other, eq } of idx[i]) {
    if (g[other] !== -1 && (g[other] === v) !== eq) return false;
  }
  return true;
}

/** Fills cells where only one symbol fits; false on a contradiction. */
function propagate(g: Grid, idx: EdgeIndex): boolean {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < g.length; i++) {
      if (g[i] !== -1) continue;
      g[i] = 0; const ok0 = okAt(g, idx, i);
      g[i] = 1; const ok1 = okAt(g, idx, i);
      g[i] = -1;
      if (!ok0 && !ok1) return false;
      if (ok0 !== ok1) { g[i] = ok0 ? 0 : 1; changed = true; }
    }
  }
  return true;
}

function search(start: Grid, edges: Edge[], order: () => number[], onSolution: (g: Grid) => boolean): void {
  const idx = indexEdges(edges);
  const rec = (g: Grid): boolean => {
    if (!propagate(g, idx)) return false;
    const i = g.indexOf(-1);
    if (i < 0) return onSolution(g);
    for (const v of order()) {
      const h = g.slice();
      h[i] = v;
      if (okAt(h, idx, i) && rec(h)) return true;
    }
    return false;
  };
  rec(start.slice());
}

export function countSolutions(g: Grid, edges: Edge[], limit = 2): number {
  let count = 0;
  search(g, edges, () => [0, 1], () => ++count >= limit);
  return count;
}

/** Givens and signs shrink with level (uniqueness usually stops removal a bit earlier). */
export const givensTarget = (l: number) => Math.max(4, 14 - Math.floor(l / 3));
export const edgesTarget = (l: number) => Math.max(3, 10 - Math.floor(l / 5));

/** Deterministic per (level, salt); always exactly one solution. */
export function generate(l: number, salt = 0): TangoLevel {
  const rnd = mulberry32(l * 69621 + 5 + salt * 1000003);
  const shuffle = <T>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  let solution: Grid = [];
  search(new Array(N * N).fill(-1), [], () => (rnd() < 0.5 ? [0, 1] : [1, 0]), (s) => { solution = s.slice(); return true; });

  // Every orthogonal pair is a candidate sign; start with a generous random set.
  const pairs: [number, number][] = [];
  for (let i = 0; i < N * N; i++) {
    if (i % N < N - 1) pairs.push([i, i + 1]);
    if (i + N < N * N) pairs.push([i, i + N]);
  }
  let edges: Edge[] = shuffle(pairs).slice(0, 12).map(([a, b]) => ({ a, b, eq: solution[a] === solution[b] }));

  const puzzle = solution.slice();
  let givens = N * N;
  const target = givensTarget(l);
  for (const i of shuffle(Array.from({ length: N * N }, (_, k) => k))) {
    if (givens <= target) break;
    const v = puzzle[i];
    puzzle[i] = -1;
    if (countSolutions(puzzle, edges) === 1) givens--;
    else puzzle[i] = v;
  }
  const eTarget = edgesTarget(l);
  for (const e of shuffle(edges.slice())) {
    if (edges.length <= eTarget) break;
    const without = edges.filter((x) => x !== e);
    if (countSolutions(puzzle, without) === 1) edges = without;
  }
  return { puzzle, solution, edges };
}

/** Cells breaking a rule: three in a line, too many of one symbol, or a violated sign. */
export function errors(g: Grid, edges: Edge[]): Set<number> {
  const bad = new Set<number>();
  const lines: number[][] = [];
  for (let k = 0; k < N; k++) {
    lines.push(Array.from({ length: N }, (_, c) => k * N + c), Array.from({ length: N }, (_, r) => r * N + k));
  }
  for (const line of lines) {
    for (let s = 0; s + 2 < N; s++) {
      const [a, b, c] = [line[s], line[s + 1], line[s + 2]];
      if (g[a] !== -1 && g[a] === g[b] && g[b] === g[c]) { bad.add(a); bad.add(b); bad.add(c); }
    }
    for (const v of [0, 1]) {
      const cells = line.filter((i) => g[i] === v);
      if (cells.length > N / 2) cells.forEach((i) => bad.add(i));
    }
  }
  for (const e of edges) {
    if (g[e.a] !== -1 && g[e.b] !== -1 && (g[e.a] === g[e.b]) !== e.eq) { bad.add(e.a); bad.add(e.b); }
  }
  return bad;
}

export const isComplete = (g: Grid, edges: Edge[]): boolean => g.every((v) => v !== -1) && errors(g, edges).size === 0;
