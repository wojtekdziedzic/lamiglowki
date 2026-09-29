import { mulberry32 } from '../../rng';

/** Lit cells, row-major, n*n. */
export type Board = boolean[];

export function sizeForLevel(l: number): number {
  return l <= 5 ? 3 : l <= 15 ? 4 : l <= 40 ? 5 : 6;
}

/** Number of scrambling presses: grows with level, capped so boards stay readable. */
export function pressesForLevel(l: number, n: number): number {
  return Math.min(Math.floor(n * n * 0.6), 2 + Math.ceil(l / 2));
}

/** Toggles cell i and its orthogonal neighbours (in place). */
export function press(board: Board, n: number, i: number): void {
  const r = Math.floor(i / n), c = i % n;
  const flip = (rr: number, cc: number) => {
    if (rr >= 0 && rr < n && cc >= 0 && cc < n) board[rr * n + cc] = !board[rr * n + cc];
  };
  flip(r, c); flip(r - 1, c); flip(r + 1, c); flip(r, c - 1); flip(r, c + 1);
}

export const isSolved = (board: Board): boolean => board.every((v) => !v);

export interface LightsLevel {
  n: number;
  board: Board;
  /** The presses that built the board; pressing them again solves it. */
  solution: number[];
}

/**
 * Deterministic per level. Built backwards from a dark board, so it is always solvable.
 * Presses are distinct cells because pressing a cell twice cancels out.
 */
export function generate(l: number): LightsLevel {
  const n = sizeForLevel(l);
  const k = pressesForLevel(l, n);
  for (let attempt = 0; ; attempt++) {
    const rnd = mulberry32(l * 7717 + attempt * 104729 + 13);
    const cells = Array.from({ length: n * n }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const solution = cells.slice(0, k);
    const board: Board = new Array(n * n).fill(false);
    solution.forEach((i) => press(board, n, i));
    // Some press sets cancel out completely on 4x4 / 5x5; never hand out a finished board.
    if (!isSolved(board)) return { n, board, solution };
  }
}
