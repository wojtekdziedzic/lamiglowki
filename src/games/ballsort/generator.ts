import { CAP, COLORS, EMPTY_TUBES } from './config';
import { mulberry32 } from '../../rng';
import { isTubeDone, type State } from './rules';
import { solve } from './solver';

const NODE_LIMIT = 40000;
const MAX_ATTEMPTS = 40;
/** Candidates compared once the full palette is reached. */
const CANDIDATES = 10;

export function colorsForLevel(l: number): number {
  return Math.min(COLORS.length, 3 + Math.floor((l - 1) / 2));
}

/** First level that uses every color; from here difficulty comes from layout, not color count. */
export const FULL_PALETTE_LEVEL = 2 * (COLORS.length - 3) + 1;

/**
 * Which candidate to pick, as a percentile of solver effort (0 = easiest).
 * Ramps up slowly; every 5th level is a breather.
 */
export function targetPercentile(l: number): number {
  const base = Math.min(1, 0.3 + Math.max(0, l - FULL_PALETTE_LEVEL) / 350);
  return l % 5 === 0 ? Math.max(0, base - 0.4) : base;
}

function shuffled(colors: number, rnd: () => number): State | null {
  const pool: number[] = [];
  for (let c = 0; c < colors; c++) for (let k = 0; k < CAP; k++) pool.push(c);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const state: State = [];
  for (let t = 0; t < colors; t++) state.push(pool.slice(t * CAP, t * CAP + CAP));
  for (let e = 0; e < EMPTY_TUBES; e++) state.push([]);
  return state.some(isTubeDone) ? null : state; // no pre-solved tubes
}

export interface Generated {
  tubes: State;
  /** Solver effort of the chosen layout (0 if the fallback was used). */
  nodes: number;
}

/** Deterministic: the same level number always yields the same layout. */
export function generate(l: number): Generated {
  const colors = colorsForLevel(l);
  const want = colors < COLORS.length ? 1 : CANDIDATES;
  const found: Generated[] = [];
  let fallback: State | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS && found.length < want; attempt++) {
    const state = shuffled(colors, mulberry32(l * 9973 + attempt * 7919));
    if (!state) continue;
    fallback ??= state;
    const r = solve(state, NODE_LIMIT);
    if (r.solvable === true) found.push({ tubes: state, nodes: r.nodes });
  }
  if (!found.length) return { tubes: fallback!, nodes: 0 }; // extremely rare; extra tube helps

  found.sort((a, b) => a.nodes - b.nodes);
  const idx = Math.round(targetPercentile(l) * (found.length - 1));
  return found[idx];
}
