import type { GameContext, GameModule } from '../../types';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { ICONS, gameScreen, levelFlow, observeSize } from '../../ui';
import { N, errors, generate, isComplete, type Edge, type Grid } from './logic';

const ID = 'tango';
const INFO = {
  id: ID,
  title: 'Słońca i księżyce',
  rules: [
    'W każdym wierszu i kolumnie są trzy słońca i trzy księżyce.',
    'Nigdy trzy takie same symbole obok siebie, ani w poziomie, ani w pionie.',
    'Znak "=" między polami: oba symbole są takie same. Znak "×": są różne.',
    'Stuknięcie stawia słońce, drugie księżyc, trzecie czyści pole. Pola z białym tłem są stałe.',
  ],
};
const GAP = 4;

const SUN = `<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#f59e0b" stroke-width="2" stroke-linecap="round"><path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3M4.8 4.8l2.1 2.1M17.1 17.1l2.1 2.1M4.8 19.2l2.1-2.1M17.1 6.9l2.1-2.1"/></g><circle cx="12" cy="12" r="5.2" fill="#facc15" stroke="#f59e0b" stroke-width="1.2"/></svg>`;
const MOON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 3.2a9 9 0 1 0 5.3 13.6A7.2 7.2 0 0 1 15.5 3.2z" fill="#60a5fa" stroke="#2563eb" stroke-width="1.2"/></svg>`;

function mount(root: HTMLElement, ctx: GameContext): () => void {
  const flow = levelFlow(ID, ctx);
  const screen = gameScreen(root, ctx.back, INFO);
  const board = document.createElement('div');
  board.className = 'tg-board';
  const grid = document.createElement('div');
  grid.className = 'tg-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Plansza słońc i księżyców');
  const signs = document.createElement('div');
  signs.className = 'tg-signs';
  board.append(grid, signs);
  screen.wrap.appendChild(board);

  let level = 1;
  let puzzle: Grid = [];
  let edges: Edge[] = [];
  let g: Grid = [];
  let history: { i: number; v: number }[] = [];
  let won = false;

  for (let i = 0; i < N * N; i++) {
    const cell = document.createElement('button');
    cell.className = 'tg-cell';
    cell.dataset.i = String(i);
    grid.appendChild(cell);
  }

  const undoTool = screen.tool({
    icon: ICONS.undo, label: 'Cofnij',
    onClick: () => {
      const last = history.pop();
      if (!last || won) return;
      g[last.i] = last.v;
      sfx.pick();
      render();
    },
  });
  screen.tool({
    icon: ICONS.restart, label: 'Zacznij od nowa',
    onClick: () => { g = puzzle.slice(); history = []; won = false; render(); },
  });

  function startLevel(l: number): void {
    level = l;
    flow.enter(l);
    const lv = generate(l, flow.salt);
    puzzle = lv.puzzle;
    edges = lv.edges;
    g = puzzle.slice();
    history = [];
    won = false;
    placeSigns();
    render();
  }

  // Signs sit on the shared edge of two cells, in percent so they follow any board size.
  function placeSigns(): void {
    signs.textContent = '';
    const pitch = 100 / N;
    for (const e of edges) {
      const ra = Math.floor(e.a / N), ca = e.a % N;
      const horizontal = e.b === e.a + 1;
      const el = document.createElement('span');
      el.className = 'tg-sign';
      el.textContent = e.eq ? '=' : '×';
      el.style.left = `${(horizontal ? ca + 1 : ca + 0.5) * pitch}%`;
      el.style.top = `${(horizontal ? ra + 0.5 : ra + 1) * pitch}%`;
      signs.appendChild(el);
    }
  }

  const NAMES = ['słońce', 'księżyc'];
  function render(): void {
    const bad = errors(g, edges);
    [...grid.children].forEach((el, i) => {
      el.className = 'tg-cell';
      if (puzzle[i] !== -1) el.classList.add('given');
      if (bad.has(i)) el.classList.add('bad');
      el.innerHTML = g[i] === 0 ? SUN : g[i] === 1 ? MOON : '';
      el.setAttribute('aria-label',
        `Wiersz ${Math.floor(i / N) + 1}, kolumna ${(i % N) + 1}: ${g[i] === -1 ? 'puste' : NAMES[g[i]]}${puzzle[i] !== -1 ? ', stałe' : ''}`);
    });
    undoTool.setDisabled(!history.length);
    screen.setLevel(flow.label(level));
    screen.setStatus(`puste: ${g.filter((v) => v === -1).length}`);
  }

  grid.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.tg-cell');
    if (!el || won) return;
    const i = Number(el.dataset.i);
    if (puzzle[i] !== -1) { sfx.nope(); haptic.nope(); return; }
    history.push({ i, v: g[i] });
    g[i] = g[i] === -1 ? 0 : g[i] === 0 ? 1 : -1; // empty -> sun -> moon -> empty
    sfx.pick();
    haptic.tap();
    render();
    if (isComplete(g, edges)) {
      won = true;
      flow.won(screen, level, `Poziom ${level} ułożony`, startLevel);
    }
  });

  const stop = observeSize(screen.wrap, (w, h) => {
    const side = Math.max(180, Math.floor(Math.min(w, h, 480)));
    board.style.width = board.style.height = side + 'px';
    board.style.setProperty('--cell', (side - GAP * (N - 1)) / N + 'px');
  });

  startLevel(flow.initial);
  return () => { stop(); screen.destroy(); };
}

export const tango: GameModule = {
  id: ID,
  title: INFO.title,
  tagline: 'Po trzy w rzędzie, znaki = i ×',
  dailyLevel: 20,
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="4" y="12" width="18" height="18" rx="4" fill="rgba(255,255,255,.6)"/><rect x="26" y="12" width="18" height="18" rx="4" fill="rgba(255,255,255,.6)"/>
    <circle cx="13" cy="21" r="5" fill="#facc15" stroke="#f59e0b" stroke-width="1.4"/>
    <path d="M37 15.6a6 6 0 1 0 3.6 9.1 4.8 4.8 0 0 1-3.6-9.1z" fill="#60a5fa" stroke="#2563eb" stroke-width="1"/>
    <text x="24" y="25" font-family="inherit" font-weight="800" font-size="10" text-anchor="middle" fill="currentColor">×</text>
  </svg>`,
  mount,
};
