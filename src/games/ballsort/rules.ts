import { CAP } from './config';

export type Tube = number[]; // color ids, bottom -> top
export type State = Tube[];

export const top = (t: Tube): number | undefined => t[t.length - 1];

export const cloneState = (s: State): State => s.map((t) => t.slice());

export function canMove(state: State, from: number, to: number): boolean {
  if (from === to) return false;
  const a = state[from], b = state[to];
  if (!a.length || b.length >= CAP) return false;
  return !b.length || top(a) === top(b);
}

/** Length of the same-color run on top of the tube. */
export function topRun(t: Tube): number {
  let k = 0;
  while (k < t.length && t[t.length - 1 - k] === t[t.length - 1]) k++;
  return k;
}

/** How many balls one move carries: the whole top run, limited by free space. 0 if illegal. */
export function moveCount(state: State, from: number, to: number): number {
  if (!canMove(state, from, to)) return 0;
  return Math.min(topRun(state[from]), CAP - state[to].length);
}

export function isTubeDone(t: Tube): boolean {
  return t.length === CAP && t.every((c) => c === t[0]);
}

export function isSolved(state: State): boolean {
  return state.every((t) => t.length === 0 || isTubeDone(t));
}
