import './style.css';
import type { GameModule } from './types';
import { renderMenu } from './menu';
import { markSolved, renderDaily, today } from './daily';
import { renderStats } from './stats-screen';
import { initNative } from './native';
import { ballsort } from './games/ballsort';
import { lightsout } from './games/lightsout';
import { fifteen } from './games/fifteen';
import { sudoku, sudoku6 } from './games/sudoku';
import { binairo } from './games/binairo';
import { queens } from './games/queens';
import { minesweeper } from './games/minesweeper';
import { tango } from './games/tango';
import { skyscrapers } from './games/skyscrapers';
import { tents } from './games/tents';

const GAMES: GameModule[] = [
  ballsort, sudoku, sudoku6, queens, tango, skyscrapers, tents, minesweeper, binairo, lightsout, fifteen,
];

const root = document.getElementById('root')!;
let cleanup: (() => void) | null = null;

// Routes: #/ menu, #/<game>, #/daily list, #/daily/<game> today's board.
const currentRoute = () => location.hash.replace(/^#\/?/, '');
const go = (route: string) => { location.hash = `#/${route}`; };

function route(): void {
  cleanup?.();
  const [head, sub] = currentRoute().split('/');
  if (head === 'daily') {
    const game = GAMES.find((g) => g.id === sub);
    if (game) {
      const day = today();
      cleanup = game.mount(root, {
        back: () => go('daily'),
        daily: { level: game.dailyLevel, salt: day, solved: () => markSolved(game.id, day) },
      });
    } else {
      cleanup = renderDaily(root, GAMES, (id) => go(`daily/${id}`), () => go(''));
    }
    return;
  }
  if (head === 'stats') {
    cleanup = renderStats(root, GAMES, () => go(''));
    return;
  }
  const game = GAMES.find((g) => g.id === head);
  cleanup = game ? game.mount(root, { back: () => go('') }) : renderMenu(root, GAMES, go);
}

window.addEventListener('hashchange', route);

// Android back: one level up (daily game -> daily list -> menu), from the menu leave the app.
initNative({
  onBack: () => {
    const r = currentRoute();
    if (!r) return false;
    go(r.startsWith('daily/') ? 'daily' : '');
    return true;
  },
});

route();
