import { EXTRA_TUBE_LIMIT, UNDO_LIMIT } from './config';
import { canMove, cloneState, type State } from './rules';

export interface Move { from: number; to: number }

/** Pure game state; no DOM. */
export class Game {
  level = 1;
  initial: State = [];
  tubes: State = [];
  history: Move[] = [];
  undosLeft = UNDO_LIMIT;
  extraTubesLeft = EXTRA_TUBE_LIMIT;
  moves = 0;

  start(level: number, initial: State): void {
    this.level = level;
    this.initial = initial;
    this.reset();
  }

  /** Back to the level's starting layout; also drops the extra tube and refills limits. */
  reset(): void {
    this.tubes = cloneState(this.initial);
    this.history = [];
    this.moves = 0;
    this.undosLeft = UNDO_LIMIT;
    this.extraTubesLeft = EXTRA_TUBE_LIMIT;
  }

  canMove(from: number, to: number): boolean {
    return canMove(this.tubes, from, to);
  }

  move(from: number, to: number): boolean {
    if (!this.canMove(from, to)) return false;
    this.tubes[to].push(this.tubes[from].pop()!);
    this.history.push({ from, to });
    this.moves++;
    return true;
  }

  get canUndo(): boolean {
    return this.history.length > 0 && this.undosLeft > 0;
  }

  undo(): boolean {
    if (!this.canUndo) return false;
    const { from, to } = this.history.pop()!;
    this.tubes[from].push(this.tubes[to].pop()!);
    this.undosLeft--;
    this.moves = Math.max(0, this.moves - 1);
    return true;
  }

  addTube(): boolean {
    if (this.extraTubesLeft <= 0) return false;
    this.tubes.push([]);
    this.extraTubesLeft--;
    return true;
  }
}
