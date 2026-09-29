import { mulberry32 } from '../../rng';

/**
 * n x n board split into n colored regions. Place n queens: one per row, column and region,
 * and no two queens may touch, not even diagonally.
 */
export interface QueensLevel {
  n: number;
  /** Region id per cell, row-major. */
  regions: number[];
  /** Queen column per row. */
  solution: number[];
}

export function sizeForLevel(l: number): number {
  return l <= 5 ? 5 : l <= 12 ? 6 : l <= 25 ? 7 : l <= 45 ? 8 : 9;
}

/** Counts solutions (up to limit); each solution is reported as queen column per row. */
export function solveAll(n: number, regions: number[], limit: number): number[][] {
  const out: number[][] = [];
  const cols = new Array(n).fill(false);
  const used = new Array(n).fill(false);
  const pos: number[] = [];
  const rec = (r: number): boolean => {
    if (r === n) { out.push(pos.slice()); return out.length >= limit; }
    for (let c = 0; c < n; c++) {
      const reg = regions[r * n + c];
      if (cols[c] || used[reg]) continue;
      if (r > 0 && Math.abs(pos[r - 1] - c) <= 1) continue; // touching the queen above
      cols[c] = used[reg] = true;
      pos[r] = c;
      if (rec(r + 1)) return true;
      cols[c] = used[reg] = false;
    }
    return false;
  };
  rec(0);
  return out;
}

function neighbors4(n: number, i: number): number[] {
  const r = Math.floor(i / n), c = i % n;
  const out: number[] = [];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
}

/** Whether region reg stays connected after cell `without` leaves it. */
function connectedWithout(n: number, regions: number[], reg: number, without: number): boolean {
  const cells = regions.map((v, i) => (v === reg && i !== without ? i : -1)).filter((i) => i >= 0);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]);
  const queue = [cells[0]];
  while (queue.length) {
    const i = queue.pop()!;
    for (const j of neighbors4(n, i)) {
      if (j !== without && regions[j] === reg && !seen.has(j)) { seen.add(j); queue.push(j); }
    }
  }
  return seen.size === cells.length;
}

/** Deterministic per level; the layout always has exactly one solution. */
export function generate(l: number, salt = 0): QueensLevel {
  const n = sizeForLevel(l);
  for (let attempt = 0; ; attempt++) {
    const rnd = mulberry32(l * 92821 + attempt * 6151 + 3 + salt * 1000003);

    // 1. Random non-touching queen placement (a permutation with no adjacent columns).
    const solution: number[] = [];
    const usedCols = new Array(n).fill(false);
    const place = (r: number): boolean => {
      if (r === n) return true;
      const order = Array.from({ length: n }, (_, c) => c).sort(() => rnd() - 0.5);
      for (const c of order) {
        if (usedCols[c] || (r > 0 && Math.abs(solution[r - 1] - c) <= 1)) continue;
        usedCols[c] = true;
        solution[r] = c;
        if (place(r + 1)) return true;
        usedCols[c] = false;
      }
      return false;
    };
    if (!place(0)) continue;

    // 2. Grow one region from each queen by random frontier expansion.
    const regions = new Array(n * n).fill(-1);
    const queenCell = solution.map((c, r) => r * n + c);
    queenCell.forEach((i, reg) => { regions[i] = reg; });
    let left = n * n - n;
    while (left > 0) {
      const frontier: [number, number][] = [];
      regions.forEach((reg, i) => {
        if (reg < 0) return;
        for (const j of neighbors4(n, i)) if (regions[j] < 0) frontier.push([j, reg]);
      });
      const [cell, reg] = frontier[Math.floor(rnd() * frontier.length)];
      regions[cell] = reg;
      left--;
    }

    // 3. Break every alternative solution by moving one of its queen cells into a
    //    neighbouring region; the true queen cells never move.
    const isQueen = new Set(queenCell);
    for (let fix = 0; fix < 60; fix++) {
      const sols = solveAll(n, regions, 2);
      if (sols.length === 1) return { n, regions, solution };
      const other = sols.find((s) => s.some((c, r) => c !== solution[r]))!;
      const candidates = other.map((c, r) => r * n + c).filter((i) => !isQueen.has(i));
      let moved = false;
      for (const i of candidates.sort(() => rnd() - 0.5)) {
        const targets = neighbors4(n, i).map((j) => regions[j]).filter((reg) => reg !== regions[i]);
        if (!targets.length || !connectedWithout(n, regions, regions[i], i)) continue;
        regions[i] = targets[Math.floor(rnd() * targets.length)];
        moved = true;
        break;
      }
      if (!moved) break; // stuck: start over with a new attempt
    }
  }
}

/** Cells holding a queen that breaks a rule (shared row, column, region, or touching). */
export function conflicts(n: number, regions: number[], queens: Set<number>): Set<number> {
  const bad = new Set<number>();
  const list = [...queens];
  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      const i = list[a], j = list[b];
      const ri = Math.floor(i / n), ci = i % n, rj = Math.floor(j / n), cj = j % n;
      if (ri === rj || ci === cj || regions[i] === regions[j] || (Math.abs(ri - rj) <= 1 && Math.abs(ci - cj) <= 1)) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return bad;
}
