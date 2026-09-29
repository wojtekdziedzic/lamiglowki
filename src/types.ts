export interface GameContext {
  /** Return to the game menu. */
  back(): void;
}

export interface GameModule {
  id: string;           // also the storage prefix and the route (#/<id>)
  title: string;
  tagline: string;
  icon: string;         // inline SVG markup for the menu card
  /** Render into root; returns the cleanup function. */
  mount(root: HTMLElement, ctx: GameContext): () => void;
}
