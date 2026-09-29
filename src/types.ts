/** Present when the game is opened as today's daily puzzle. */
export interface DailyContext {
  /** Difficulty to play at (a fixed mid level per game). */
  level: number;
  /** Seed salt: the day number, so everyone gets the same board that day. */
  salt: number;
  /** Mark today's puzzle for this game as solved. */
  solved(): void;
}

export interface GameContext {
  /** Return to where the game was opened from. */
  back(): void;
  daily?: DailyContext;
}

export interface GameModule {
  id: string;           // also the storage prefix and the route (#/<id>)
  title: string;
  tagline: string;
  icon: string;         // inline SVG markup for the menu card
  /** Level used for the daily puzzle: mid difficulty for this game. */
  dailyLevel: number;
  /** Render into root; returns the cleanup function. */
  mount(root: HTMLElement, ctx: GameContext): () => void;
}
