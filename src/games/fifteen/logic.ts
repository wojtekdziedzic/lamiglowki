import { mulberry32 } from '../../rng';

/** Row-major tile values, 0 = the gap. */
export type Tiles = number[];

export function sizeForLevel(l: number): number {
  return l <= 5 ? 3 : l <= 25 ? 4 : 5;
}

export function solved(n: number): Tiles {
  return Array.from({ length: n * n }, (_, i) => (i === n * n - 1 ? 0 : i + 1));
}

export const isSolved = (t: Tiles): boolean => t.every((v, i) => v === (i === t.length - 1 ? 0 : i + 1));

/**
 * Slides every tile between index i and the gap one step toward the gap.
 * Returns the number of tiles moved (0 if i is not in the gap's row or column).
 */
export function slide(t: Tiles, n: number, i: number): number {
  const g = t.indexOf(0);
  const gr = Math.floor(g / n), gc = g % n, r = Math.floor(i / n), c = i % n;
  if (i === g || (r !== gr && c !== gc)) return 0;
  const step = r === gr ? (c > gc ? 1 : -1) : (r > gr ? n : -n);
  let cur = g, moved = 0;
  while (cur !== i) {
    t[cur] = t[cur + step];
    cur += step;
    moved++;
  }
  t[i] = 0;
  return moved;
}

/** Deterministic per level; scrambled by legal moves from the solved state, so always solvable. */
export function generate(l: number, salt = 0): { n: number; tiles: Tiles } {
  const n = sizeForLevel(l);
  const steps = Math.min(400, 20 + l * 8);
  const rnd = mulberry32(l * 31337 + 7 + salt * 1000003);
  const t = solved(n);
  let prev = -1;
  for (let s = 0; s < steps || isSolved(t); s++) {
    const g = t.indexOf(0);
    const gr = Math.floor(g / n), gc = g % n;
    const opts = [g - n, g + n, gc > 0 ? g - 1 : -1, gc < n - 1 ? g + 1 : -1]
      .filter((i) => i >= 0 && i < n * n && i !== prev && (Math.floor(i / n) === gr || i % n === gc));
    const pick = opts[Math.floor(rnd() * opts.length)];
    slide(t, n, pick);
    prev = g; // do not immediately undo the previous move
  }
  return { n, tiles: t };
}
