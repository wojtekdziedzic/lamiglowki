import { mulberry32 } from '../../rng';

export interface MinesConfig { rows: number; cols: number; mines: number }

/** Portrait-friendly boards; size and density grow with level. */
export function configForLevel(l: number): MinesConfig {
  const rows = Math.min(14, 9 + Math.floor(l / 6));
  const cols = Math.min(10, 8 + Math.floor(l / 12));
  const density = Math.min(0.19, 0.12 + l * 0.0025);
  return { rows, cols, mines: Math.round(rows * cols * density) };
}

export function neighbors(rows: number, cols: number, i: number): number[] {
  const r = Math.floor(i / cols), c = i % cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
  }
  return out;
}

export function counts(mines: boolean[], rows: number, cols: number): number[] {
  return mines.map((_, i) => neighbors(rows, cols, i).filter((j) => mines[j]).length);
}

/**
 * Reveals i and, through zero cells, everything connected to it (in place).
 * Returns the newly revealed cells. Never call it on a mine.
 */
export function flood(i: number, cnt: number[], revealed: boolean[], flagged: boolean[], rows: number, cols: number): number[] {
  const out: number[] = [];
  const stack = [i];
  while (stack.length) {
    const k = stack.pop()!;
    if (revealed[k] || flagged[k]) continue;
    revealed[k] = true;
    out.push(k);
    if (cnt[k] === 0) for (const j of neighbors(rows, cols, k)) if (!revealed[j]) stack.push(j);
  }
  return out;
}

/**
 * Plays the board with pure deduction (single-cell rules plus the subset rule).
 * True when every safe cell gets revealed without a guess.
 */
export function solvableWithoutGuessing(mines: boolean[], rows: number, cols: number, first: number): boolean {
  const N = rows * cols;
  const cnt = counts(mines, rows, cols);
  const revealed = new Array(N).fill(false);
  const flagged = new Array(N).fill(false);
  flood(first, cnt, revealed, flagged, rows, cols);
  const safeTotal = N - mines.filter(Boolean).length;

  for (;;) {
    let progress = false;
    const cons: { cells: number[]; need: number }[] = [];
    for (let i = 0; i < N; i++) {
      if (!revealed[i] || !cnt[i]) continue;
      const nb = neighbors(rows, cols, i);
      const cells = nb.filter((j) => !revealed[j] && !flagged[j]);
      if (!cells.length) continue;
      cons.push({ cells, need: cnt[i] - nb.filter((j) => flagged[j]).length });
    }
    const open = (cells: number[]) => { for (const j of cells) if (!revealed[j]) flood(j, cnt, revealed, flagged, rows, cols); progress = true; };
    const flag = (cells: number[]) => { for (const j of cells) flagged[j] = true; progress = true; };

    for (const c of cons) {
      if (c.need === 0) open(c.cells);
      else if (c.need === c.cells.length) flag(c.cells);
    }
    if (!progress) {
      // Subset rule: if A's unknowns are inside B's, the difference holds B.need - A.need mines.
      outer: for (const a of cons) for (const b of cons) {
        if (a === b || a.cells.length >= b.cells.length) continue;
        if (!a.cells.every((x) => b.cells.includes(x))) continue;
        const diff = b.cells.filter((x) => !a.cells.includes(x));
        const d = b.need - a.need;
        if (d === 0) { open(diff); break outer; }
        if (d === diff.length) { flag(diff); break outer; }
      }
    }
    if (!progress) break;
  }
  return revealed.filter(Boolean).length === safeTotal;
}

/**
 * Mines are placed after the first tap: the tapped cell and its neighbours are always safe,
 * and the layout is picked so it can be finished by logic alone. Deterministic per (level, first tap).
 */
export function generate(l: number, first: number, salt = 0): boolean[] {
  const { rows, cols, mines } = configForLevel(l);
  const N = rows * cols;
  const safe = new Set([first, ...neighbors(rows, cols, first)]);
  let last: boolean[] = [];
  for (let attempt = 0; attempt < 300; attempt++) {
    const rnd = mulberry32(l * 48271 + first * 131 + attempt * 7907 + salt * 1000003);
    const pool = Array.from({ length: N }, (_, i) => i).filter((i) => !safe.has(i));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const board = new Array(N).fill(false);
    pool.slice(0, mines).forEach((i) => { board[i] = true; });
    last = board;
    if (solvableWithoutGuessing(board, rows, cols, first)) return board;
  }
  return last; // very rare: may need one guess
}
