import type { GameModule } from '../../types';
import { COLORS } from '../../palette';
import type { GameContext } from '../../types';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { ICONS, gameScreen, levelFlow, observeSize } from '../../ui';
import { generate, isSolved, slide, type Tiles } from './logic';

const ID = 'fifteen';
const INFO = {
  id: ID,
  title: 'Piętnastka',
  rules: [
    'Stuknij kafelek w tym samym wierszu albo kolumnie co puste pole: przesunie się razem z kafelkami pomiędzy.',
    'Ułóż kafelki po kolei od lewej do prawej i z góry na dół, puste pole na końcu.',
    'Kafelek na swoim miejscu ma białą obwódkę, a kolor podpowiada jego wiersz.',
  ],
};

function mount(root: HTMLElement, ctx: GameContext): () => void {
  const flow = levelFlow(ID, ctx);
  const screen = gameScreen(root, ctx.back, INFO);
  const board = document.createElement('div');
  board.className = 'p15-board';
  board.setAttribute('aria-label', 'Plansza z kafelkami');
  screen.wrap.appendChild(board);

  let level = 1;
  let n = 3;
  let start: Tiles = [];
  let tiles: Tiles = [];
  let moves = 0;
  let won = false;
  const els = new Map<number, HTMLButtonElement>();

  screen.tool({
    icon: ICONS.restart, label: 'Zacznij poziom od nowa',
    onClick: () => { tiles = start.slice(); moves = 0; won = false; render(); },
  });

  function startLevel(l: number): void {
    level = l;
    flow.enter(l);
    const lv = generate(l, flow.salt);
    n = lv.n;
    start = lv.tiles;
    tiles = start.slice();
    moves = 0;
    won = false;
    build();
    render();
  }

  function build(): void {
    board.textContent = '';
    els.clear();
    board.style.setProperty('--n', String(n));
    for (let v = 1; v < n * n; v++) {
      const el = document.createElement('button');
      el.className = 'p15-tile';
      el.textContent = String(v);
      el.dataset.v = String(v);
      // Color by the tile's home row: sorted rows read as colored stripes.
      el.style.setProperty('--c', COLORS[Math.floor((v - 1) / n) % COLORS.length]);
      board.appendChild(el);
      els.set(v, el);
    }
  }

  function render(): void {
    tiles.forEach((v, i) => {
      if (!v) return;
      const el = els.get(v)!;
      el.style.transform = `translate(${(i % n) * 100}%, ${Math.floor(i / n) * 100}%)`;
      el.classList.toggle('home', v === i + 1);
    });
    screen.setLevel(flow.label(level));
    screen.setStatus(`Ruchy: ${moves}`);
  }

  board.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.p15-tile');
    if (!el || won) return;
    const moved = slide(tiles, n, tiles.indexOf(Number(el.dataset.v)));
    if (!moved) { sfx.nope(); haptic.nope(); return; }
    moves += moved;
    sfx.land(Math.min(moved, 3));
    haptic.tap();
    render();
    if (isSolved(tiles)) {
      won = true;
      flow.won(screen, level, `Ułożone w ${moves} ruchach`, startLevel);
    }
  });

  const stop = observeSize(screen.wrap, (w, h) => {
    const side = Math.max(160, Math.floor(Math.min(w, h, 520)));
    board.style.width = board.style.height = side + 'px';
  });

  startLevel(flow.initial);
  return () => { stop(); screen.destroy(); };
}

export const fifteen: GameModule = {
  id: ID,
  title: INFO.title,
  tagline: 'Przesuwaj kafelki po kolei',
  dailyLevel: 10,
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true" font-family="inherit" font-weight="800" font-size="12" text-anchor="middle">
    <rect x="5" y="5" width="18" height="18" rx="4" fill="#ef4444"/><text x="14" y="18.5" fill="#fff">1</text>
    <rect x="25" y="5" width="18" height="18" rx="4" fill="#ef4444"/><text x="34" y="18.5" fill="#fff">2</text>
    <rect x="5" y="25" width="18" height="18" rx="4" fill="#22c55e"/><text x="14" y="38.5" fill="#fff">3</text>
  </svg>`,
  mount,
};
