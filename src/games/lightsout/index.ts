import type { GameModule } from '../../types';
import type { GameContext } from '../../types';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { ICONS, gameScreen, levelFlow, observeSize } from '../../ui';
import { generate, isSolved, press, type Board } from './logic';

const ID = 'lightsout';
const INFO = {
  id: ID,
  title: 'Zgaś światła',
  rules: [
    'Stuknięcie przełącza pole i jego sąsiadów: nad, pod, z lewej i z prawej.',
    'Cel: zgasić wszystkie światła.',
    'Dwa stuknięcia w to samo pole się znoszą, więc kolejność nie ma znaczenia.',
  ],
};

function mount(root: HTMLElement, ctx: GameContext): () => void {
  const flow = levelFlow(ID, ctx);
  const screen = gameScreen(root, ctx.back, INFO);
  const grid = document.createElement('div');
  grid.className = 'lo-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Plansza świateł');
  screen.wrap.appendChild(grid);

  let level = 1;
  let n = 3;
  let start: Board = [];
  let board: Board = [];
  let moves = 0;
  let won = false;

  screen.tool({
    icon: ICONS.restart, label: 'Zacznij poziom od nowa',
    onClick: () => { board = start.slice(); moves = 0; won = false; render(); },
  });

  function startLevel(l: number): void {
    level = l;
    flow.enter(l, screen);
    const lv = generate(l, flow.salt);
    n = lv.n;
    start = lv.board;
    board = start.slice();
    moves = 0;
    won = false;
    build();
    render();
  }

  function build(): void {
    grid.textContent = '';
    grid.style.setProperty('--n', String(n));
    for (let i = 0; i < n * n; i++) {
      const cell = document.createElement('button');
      cell.className = 'lo-cell';
      cell.dataset.i = String(i);
      grid.appendChild(cell);
    }
  }

  function render(): void {
    [...grid.children].forEach((el, i) => {
      el.classList.toggle('on', board[i]);
      el.setAttribute('aria-label', `Pole ${Math.floor(i / n) + 1}, ${(i % n) + 1}: ${board[i] ? 'zapalone' : 'zgaszone'}`);
    });
    screen.setLevel(flow.label(level));
    const lit = board.filter(Boolean).length;
    screen.setStatus(`Ruchy: ${moves} · zapalone: ${lit}`);
  }

  grid.addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.lo-cell');
    if (!cell || won) return;
    press(board, n, Number(cell.dataset.i));
    moves++;
    sfx.pick();
    haptic.tap();
    render();
    if (isSolved(board)) {
      won = true;
      flow.won(screen, level, `Wszystko zgaszone w ${moves} ruchach`, startLevel, 250);
    }
  });

  const stop = observeSize(screen.wrap, (w, h) => {
    const side = Math.max(160, Math.floor(Math.min(w, h, 520)));
    grid.style.width = grid.style.height = side + 'px';
  });

  startLevel(flow.initial);
  return () => { stop(); screen.destroy(); };
}

export const lightsout: GameModule = {
  id: ID,
  title: INFO.title,
  tagline: 'Każde kliknięcie przełącza sąsiadów',
  dailyLevel: 20,
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true">
    ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => {
      const on = [1, 3, 4, 5, 7].includes(r * 3 + c);
      return `<rect x="${6 + c * 13}" y="${6 + r * 13}" width="10" height="10" rx="2.5" fill="${on ? '#facc15' : 'currentColor'}" opacity="${on ? 1 : 0.25}"/>`;
    }).join('')).join('')}
  </svg>`,
  mount,
};
