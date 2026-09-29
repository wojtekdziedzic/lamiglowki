import { CAP } from './config';
import type { State } from './rules';

export interface SolveResult {
  /** true = solved, false = proven unsolvable, null = gave up at node limit */
  solvable: boolean | null;
  /** Distinct states expanded before the first solution: the difficulty signal. */
  nodes: number;
}

// Tubes as strings (one char per ball, bottom -> top) keep hashing and copying cheap.
const enc = (c: number) => String.fromCharCode(97 + c);

const isDone = (t: string) => t.length === CAP && t.split('').every((c) => c === t[0]);
const isUniform = (t: string) => t.split('').every((c) => c === t[0]);
const solved = (s: string[]) => s.every((t) => t.length === 0 || isDone(t));
const keyOf = (s: string[]) => s.slice().sort().join('|');

/**
 * Depth-first search with a "sensible player" move order: stacking onto a
 * matching color first, empty tubes last. Node count to the first solution is
 * therefore a rough measure of how much blind exploration a level needs.
 */
export function solve(start: State, nodeLimit: number): SolveResult {
  const seen = new Set<string>();
  const stack: string[][] = [start.map((t) => t.map(enc).join(''))];
  let nodes = 0;

  while (stack.length) {
    const s = stack.pop()!;
    if (solved(s)) return { solvable: true, nodes };
    const k = keyOf(s);
    if (seen.has(k)) continue;
    seen.add(k);
    if (++nodes > nodeLimit) return { solvable: null, nodes };

    const moves: { from: number; to: number; score: number }[] = [];
    for (let i = 0; i < s.length; i++) {
      const src = s[i];
      if (!src.length || isDone(src)) continue;
      const ball = src[src.length - 1];
      const srcUniform = isUniform(src);
      const rest = src.slice(0, -1);
      let triedEmpty = false;
      for (let j = 0; j < s.length; j++) {
        if (i === j) continue;
        const dst = s[j];
        if (dst.length >= CAP) continue;
        if (!dst.length) {
          // Moving a uniform tube into an empty one is pointless; all empties are symmetric.
          if (srcUniform || triedEmpty) continue;
          triedEmpty = true;
          moves.push({ from: i, to: j, score: 0 });
          continue;
        }
        if (dst[dst.length - 1] !== ball) continue;
        let score = 2;
        if (isUniform(dst)) score += 2;
        if (!rest.length || isUniform(rest)) score += 1;
        moves.push({ from: i, to: j, score });
      }
    }
    // Stack is LIFO: push worst first so the best move is explored first.
    moves.sort((a, b) => a.score - b.score);
    for (const m of moves) {
      const n = s.slice();
      const ball = n[m.from][n[m.from].length - 1];
      n[m.from] = n[m.from].slice(0, -1);
      n[m.to] = n[m.to] + ball;
      stack.push(n);
    }
  }
  return { solvable: false, nodes };
}
