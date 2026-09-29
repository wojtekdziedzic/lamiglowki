import { describe, expect, it } from 'vitest';
import { CAP, COLORS, EMPTY_TUBES } from '../src/games/ballsort/config';
import { canMove, isSolved, isTubeDone, moveCount, topRun } from '../src/games/ballsort/rules';
import { Game } from '../src/games/ballsort/game';
import { solve } from '../src/games/ballsort/solver';
import { colorsForLevel, generate } from '../src/games/ballsort/generator';

describe('rules', () => {
  it('allows moves onto empty or matching tops only', () => {
    const s = [[0, 1], [1], [], [0, 0, 0, 0]];
    expect(canMove(s, 0, 1)).toBe(true);
    expect(canMove(s, 0, 2)).toBe(true);
    expect(canMove(s, 1, 0)).toBe(true);
    expect(canMove(s, 0, 3)).toBe(false); // full
    expect(canMove(s, 2, 0)).toBe(false); // empty source
    expect(canMove(s, 0, 0)).toBe(false);
  });

  it('detects done tubes and solved boards', () => {
    expect(isTubeDone([2, 2, 2, 2])).toBe(true);
    expect(isTubeDone([2, 2, 2])).toBe(false);
    expect(isSolved([[1, 1, 1, 1], [], [0, 0, 0, 0]])).toBe(true);
    expect(isSolved([[1, 1, 1, 0], [0, 0, 0, 1]])).toBe(false);
  });
});

describe('group moves', () => {
  it('moves the whole same-color run, limited by free space', () => {
    expect(topRun([0, 1, 1])).toBe(2);
    expect(moveCount([[0, 1, 1], []], 0, 1)).toBe(2);
    expect(moveCount([[0, 1, 1], [2, 2, 1]], 0, 1)).toBe(1); // only one slot free
    expect(moveCount([[0, 1, 1], [2]], 0, 1)).toBe(0);
  });

  it('undoes a group move as one step', () => {
    const g = new Game();
    g.start(1, [[0, 1, 1], [0, 0, 0], [1, 1], []]);
    expect(g.move(0, 3)).toBe(2);
    expect(g.moves).toBe(1);
    expect(g.undo()).toBe(true);
    expect(g.tubes[0]).toEqual([0, 1, 1]);
    expect(g.tubes[3]).toEqual([]);
  });
});

describe('solver', () => {
  it('solves a trivial board and rejects an impossible one', () => {
    expect(solve([[0, 1, 0, 1], [1, 0, 1, 0], []], 10000).solvable).toBe(true);
    expect(solve([[0, 1, 0, 1], [1, 0, 1, 0]], 10000).solvable).toBe(false);
  });
});

describe('generator', () => {
  it('is deterministic per level', () => {
    for (const l of [1, 7, 40, 250]) expect(generate(l).tubes).toEqual(generate(l).tubes);
  });

  it('produces well-formed, solvable levels 1..200', () => {
    for (let l = 1; l <= 200; l++) {
      const { tubes } = generate(l);
      const n = colorsForLevel(l);
      expect(tubes.length).toBe(n + EMPTY_TUBES);
      const counts = new Array(COLORS.length).fill(0);
      tubes.flat().forEach((c) => counts[c]++);
      expect(counts.slice(0, n).every((c) => c === CAP)).toBe(true);
      expect(solve(tubes, 200000).solvable, `level ${l}`).toBe(true);
    }
  });

  it('gets harder with level once the palette is full', () => {
    const avg = (from: number, to: number) => {
      let sum = 0, n = 0;
      for (let l = from; l <= to; l++) if (l % 5) { sum += generate(l).nodes; n++; }
      return sum / n;
    };
    expect(avg(260, 300)).toBeGreaterThan(avg(20, 60) * 2);
  });

  it('generates a full-palette level fast enough for a phone', () => {
    const t0 = performance.now();
    for (const l of [500, 501, 502, 503]) generate(l);
    const avg = (performance.now() - t0) / 4;
    console.log(`avg generate() at level ~500: ${avg.toFixed(0)} ms`);
    expect(avg).toBeLessThan(300);
  });
});
