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

export function isTubeDone(t: Tube): boolean {
  return t.length === CAP && t.every((c) => c === t[0]);
}

export function isSolved(state: State): boolean {
  return state.every((t) => t.length === 0 || isTubeDone(t));
}
