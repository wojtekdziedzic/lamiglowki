import './style.css';
import type { GameModule } from './types';
import { renderMenu } from './menu';
import { initNative } from './native';
import { ballsort } from './games/ballsort';
import { lightsout } from './games/lightsout';
import { fifteen } from './games/fifteen';
import { sudoku } from './games/sudoku';
import { binairo } from './games/binairo';

const GAMES: GameModule[] = [ballsort, sudoku, binairo, lightsout, fifteen];

const root = document.getElementById('root')!;
let cleanup: (() => void) | null = null;

const currentId = () => location.hash.replace(/^#\/?/, '');

function route(): void {
  cleanup?.();
  const game = GAMES.find((g) => g.id === currentId());
  cleanup = game
    ? game.mount(root, { back: goMenu })
    : renderMenu(root, GAMES, (id) => { location.hash = `#/${id}`; });
}

function goMenu(): void {
  location.hash = '#/';
}

window.addEventListener('hashchange', route);

// Android back: from a game return to the menu, from the menu leave the app.
initNative({ onBack: () => { if (currentId()) { goMenu(); return true; } return false; } });

route();
