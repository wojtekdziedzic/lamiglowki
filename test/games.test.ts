import { describe, expect, it } from 'vitest';
import * as lo from '../src/games/lightsout/logic';
import * as p15 from '../src/games/fifteen/logic';
import * as sd from '../src/games/sudoku/logic';
import * as bn from '../src/games/binairo/logic';
import * as qn from '../src/games/queens/logic';
import * as ms from '../src/games/minesweeper/logic';
import * as tg from '../src/games/tango/logic';
import * as sk from '../src/games/skyscrapers/logic';

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

describe('tango', () => {
  it('generates valid puzzles with signs and a unique solution', () => {
    for (let l = 1; l <= 60; l += 7) {
      const { puzzle, solution, edges } = tg.generate(l);
      expect(tg.isComplete(solution, edges)).toBe(true);
      puzzle.forEach((v, i) => { if (v !== -1) expect(v).toBe(solution[i]); });
      edges.forEach((e) => expect((solution[e.a] === solution[e.b])).toBe(e.eq));
      expect(tg.countSolutions(puzzle, edges, 2), `level ${l}`).toBe(1);
    }
  });

  it('flags a violated sign', () => {
    const g = new Array(36).fill(-1);
    g[0] = 0; g[1] = 1;
    expect([...tg.errors(g, [{ a: 0, b: 1, eq: true }])].sort()).toEqual([0, 1]);
    expect(tg.errors(g, [{ a: 0, b: 1, eq: false }]).size).toBe(0);
  });

  it('is deterministic and fast', () => {
    expect(tg.generate(9).puzzle).toEqual(tg.generate(9).puzzle);
    const t0 = performance.now();
    for (let l = 40; l < 45; l++) tg.generate(l);
    expect((performance.now() - t0) / 5).toBeLessThan(300);
  });
});

describe('skyscrapers', () => {
  it('counts visible buildings', () => {
    expect(sk.visible([1, 2, 3, 4])).toBe(4);
    expect(sk.visible([4, 3, 2, 1])).toBe(1);
    expect(sk.visible([2, 1, 4, 3])).toBe(2);
  });

  it('generates Latin squares whose clues and givens pin one solution', () => {
    for (const l of [1, 8, 9, 20, 26, 45]) {
      const { n, clues, givens, solution } = sk.generate(l);
      for (let k = 0; k < n; k++) {
        expect(new Set(solution.slice(k * n, k * n + n)).size).toBe(n);
        expect(new Set(Array.from({ length: n }, (_, r) => solution[r * n + k])).size).toBe(n);
      }
      const full = sk.cluesOf(n, solution);
      for (const side of ['top', 'bottom', 'left', 'right'] as const) {
        clues[side].forEach((v, k) => { if (v) expect(v).toBe(full[side][k]); });
      }
      givens.forEach((v, i) => { if (v) expect(v).toBe(solution[i]); });
      const sols = sk.countSolutions(n, clues, givens, 2);
      expect(sols.length, `level ${l}`).toBe(1);
      expect(sols[0]).toEqual(solution);
    }
  });

  it('generates a 6x6 level fast enough for a phone', () => {
    const t0 = performance.now();
    for (let l = 40; l < 44; l++) sk.generate(l);
    const avg = (performance.now() - t0) / 4;
    console.log(`skyscrapers 6x6 avg ${avg.toFixed(0)} ms`);
    expect(avg).toBeLessThan(400);
  });
});

describe('daily seeds', () => {
  // Same day -> same board for everyone; salt 0 must keep the regular level sequence.
  const day = 20725;
  const cases: [string, (salt: number) => unknown][] = [
    ['lightsout', (s) => lo.generate(20, s).board],
    ['fifteen', (s) => p15.generate(10, s).tiles],
    ['binairo', (s) => bn.generate(15, s).puzzle],
    ['queens', (s) => qn.generate(30, s).regions],
    ['minesweeper', (s) => ms.generate(20, 40, s)],
    ['tango', (s) => tg.generate(20, s).puzzle],
    ['skyscrapers', (s) => sk.generate(15, s).clues],
    ['sudoku6', (s) => sd.generate(15, sd.SPEC6, s).puzzle],
  ];
  for (const [name, gen] of cases) {
    it(`${name}: deterministic per day and different from the regular level`, () => {
      expect(gen(day)).toEqual(gen(day));
      expect(gen(day)).not.toEqual(gen(0));
    });
  }
});

describe('sudoku', () => {
  it('generates valid puzzles with a unique solution', () => {
    for (const l of [1, 10, 30, 60]) {
      const { puzzle, solution, clues } = sd.generate(l);
      expect(sd.conflicts(solution).size).toBe(0);
      expect(solution.every((v) => v >= 1 && v <= 9)).toBe(true);
      expect(puzzle.filter((v) => v).length).toBe(clues);
      puzzle.forEach((v, i) => { if (v) expect(v).toBe(solution[i]); });
      expect(sd.countSolutions(puzzle, sd.SPEC9, 2)).toBe(1);
    }
  });

  it('6x6 uses 2x3 boxes and keeps a unique solution', () => {
    for (const l of [1, 15, 40]) {
      const { puzzle, solution, clues } = sd.generate(l, sd.SPEC6);
      expect(solution.length).toBe(36);
      expect(sd.conflicts(solution, sd.SPEC6).size).toBe(0);
      expect(solution.every((v) => v >= 1 && v <= 6)).toBe(true);
      expect(puzzle.filter((v) => v).length).toBe(clues);
      expect(sd.countSolutions(puzzle, sd.SPEC6, 2)).toBe(1);
    }
    // Box of cell (1,2) spans rows 0-1 and columns 0-2
    const geo = sd.geometry(sd.SPEC6);
    expect(geo.box(1 * 6 + 2)).toBe(geo.box(0));
    expect(geo.box(2 * 6 + 0)).not.toBe(geo.box(0));
  });

  it('salt 0 keeps the regular sequence and other salts differ', () => {
    expect(sd.generate(7, sd.SPEC9, 0).puzzle).toEqual(sd.generate(7).puzzle);
    expect(sd.generate(7, sd.SPEC9, 20000).puzzle).not.toEqual(sd.generate(7).puzzle);
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
