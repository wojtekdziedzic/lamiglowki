import { describe, expect, it } from 'vitest';
import * as lo from '../src/games/lightsout/logic';
import * as p15 from '../src/games/fifteen/logic';
import * as sd from '../src/games/sudoku/logic';
import * as bn from '../src/games/binairo/logic';
import * as qn from '../src/games/queens/logic';
import * as ms from '../src/games/minesweeper/logic';

describe('lights out', () => {
  it('is deterministic, never pre-solved, and solved by its own presses', () => {
    for (let l = 1; l <= 80; l++) {
      const a = lo.generate(l);
      expect(a.board).toEqual(lo.generate(l).board);
      expect(lo.isSolved(a.board)).toBe(false);
      const b = a.board.slice();
      a.solution.forEach((i) => lo.press(b, a.n, i));
      expect(lo.isSolved(b)).toBe(true);
    }
  });
});

describe('fifteen', () => {
  it('slides a whole line toward the gap', () => {
    const t = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    expect(p15.slide(t, 3, 6)).toBe(2);
    expect(t).toEqual([1, 2, 3, 4, 5, 6, 0, 7, 8]);
    expect(p15.slide(t, 3, 4)).toBe(0); // not in line with the gap
  });

  it('generates scrambled, solvable boards (inversion parity)', () => {
    for (let l = 1; l <= 60; l++) {
      const { n, tiles } = p15.generate(l);
      expect(p15.isSolved(tiles)).toBe(false);
      const seq = tiles.filter((v) => v);
      let inv = 0;
      for (let i = 0; i < seq.length; i++) for (let j = i + 1; j < seq.length; j++) if (seq[i] > seq[j]) inv++;
      const gapRowFromBottom = n - Math.floor(tiles.indexOf(0) / n);
      const solvable = n % 2 === 1 ? inv % 2 === 0 : (inv + gapRowFromBottom) % 2 === 1;
      expect(solvable, `level ${l}`).toBe(true);
    }
  });
});

describe('binairo', () => {
  it('generates valid puzzles with a unique solution', () => {
    for (const l of [1, 12, 35, 80]) {
      const { n, puzzle, solution } = bn.generate(l);
      expect(bn.isComplete(solution, n)).toBe(true);
      puzzle.forEach((v, i) => { if (v !== -1) expect(v).toBe(solution[i]); });
      expect(puzzle.some((v) => v === -1)).toBe(true);
      expect(bn.countSolutions(puzzle, n, 2)).toBe(1);
    }
  });

  it('flags broken rules', () => {
    const g = [0, 0, 0, 1, 1, -1, ...new Array(30).fill(-1)];
    expect([...bn.errors(g, 6)].sort()).toEqual([0, 1, 2]);
  });

  it('generates a 10x10 level fast enough for a phone', () => {
    const t0 = performance.now();
    for (let l = 60; l < 64; l++) bn.generate(l);
    const avg = (performance.now() - t0) / 4;
    console.log(`binairo 10x10 avg ${avg.toFixed(0)} ms`);
    expect(avg).toBeLessThan(400);
  });
});

describe('queens', () => {
  it('generates connected regions with exactly one solution', () => {
    for (let l = 1; l <= 70; l += 3) {
      const { n, regions, solution } = qn.generate(l);
      expect(new Set(regions).size).toBe(n);
      const sols = qn.solveAll(n, regions, 2);
      expect(sols.length, `level ${l}`).toBe(1);
      expect(sols[0]).toEqual(solution);
    }
  });

  it('flags touching queens and shared regions', () => {
    const regions = new Array(25).fill(0).map((_, i) => i % 5);
    expect([...qn.conflicts(5, regions, new Set([0, 6]))].sort()).toEqual([0, 6]); // diagonal touch
    expect(qn.conflicts(5, regions, new Set([0, 7])).size).toBe(0);
  });

  it('generates fast enough for a phone', () => {
    const t0 = performance.now();
    for (let l = 80; l < 85; l++) qn.generate(l);
    const avg = (performance.now() - t0) / 5;
    console.log(`queens 9x9 avg ${avg.toFixed(0)} ms`);
    expect(avg).toBeLessThan(300);
  });
});

describe('minesweeper', () => {
  it('keeps the first tap safe and is solvable without guessing', () => {
    let noGuess = 0, total = 0;
    for (const l of [1, 10, 25, 40, 60]) {
      const { rows, cols, mines } = ms.configForLevel(l);
      for (const first of [0, Math.floor(rows / 2) * cols + Math.floor(cols / 2)]) {
        const b = ms.generate(l, first);
        expect(b.filter(Boolean).length).toBe(mines);
        expect(b[first]).toBe(false);
        ms.neighbors(rows, cols, first).forEach((j) => expect(b[j]).toBe(false));
        total++;
        if (ms.solvableWithoutGuessing(b, rows, cols, first)) noGuess++;
      }
    }
    expect(noGuess).toBe(total);
  });

  it('is deterministic and fast enough for a phone', () => {
    expect(ms.generate(30, 5)).toEqual(ms.generate(30, 5));
    const t0 = performance.now();
    for (let l = 60; l < 65; l++) ms.generate(l, 70);
    const avg = (performance.now() - t0) / 5;
    console.log(`minesweeper max board avg ${avg.toFixed(0)} ms`);
    expect(avg).toBeLessThan(400);
  });
});

describe('sudoku', () => {
  it('generates valid puzzles with a unique solution', () => {
    for (const l of [1, 10, 30, 60]) {
      const { puzzle, solution, clues } = sd.generate(l);
      expect(sd.conflicts(solution).size).toBe(0);
      expect(solution.every((v) => v >= 1 && v <= 9)).toBe(true);
      expect(puzzle.filter((v) => v).length).toBe(clues);
      puzzle.forEach((v, i) => { if (v) expect(v).toBe(solution[i]); });
      expect(sd.countSolutions(puzzle, 2)).toBe(1);
    }
  });

  it('is deterministic and gets sparser with level', () => {
    expect(sd.generate(5).puzzle).toEqual(sd.generate(5).puzzle);
    expect(sd.generate(60).clues).toBeLessThan(sd.generate(1).clues);
  });

  it('generates fast enough for a phone', () => {
    const t0 = performance.now();
    for (let l = 50; l < 55; l++) sd.generate(l);
    expect((performance.now() - t0) / 5).toBeLessThan(300);
  });
});
