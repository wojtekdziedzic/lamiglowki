import type { GameModule } from '../../types';
import { loadLevel, saveLevel } from '../../storage';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { ICONS, gameScreen, observeSize, showWin } from '../../ui';
import { errors, generate, isComplete, type Grid } from './logic';

const ID = 'binairo';

function mount(root: HTMLElement, ctx: { back(): void }): () => void {
  const screen = gameScreen(root, ctx.back);
  const grid = document.createElement('div');
  grid.className = 'bn-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Plansza dwóch kolorów');
  screen.wrap.appendChild(grid);

  let level = 1;
  let n = 6;
  let puzzle: Grid = [];
  let g: Grid = [];
  let history: { i: number; v: number }[] = [];
  let won = false;

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
    saveLevel(ID, l);
    const lv = generate(l);
    n = lv.n;
    puzzle = lv.puzzle;
    g = puzzle.slice();
    history = [];
    won = false;
    grid.textContent = '';
    grid.style.setProperty('--n', String(n));
    for (let i = 0; i < n * n; i++) {
      const cell = document.createElement('button');
      cell.className = 'bn-cell';
      cell.dataset.i = String(i);
      cell.appendChild(document.createElement('span'));
      grid.appendChild(cell);
    }
    render();
  }

  const NAMES = ['czerwone', 'niebieskie'];
  function render(): void {
    const bad = errors(g, n);
    [...grid.children].forEach((el, i) => {
      el.className = 'bn-cell';
      if (puzzle[i] !== -1) el.classList.add('given');
      if (g[i] !== -1) el.classList.add(`c${g[i]}`);
      if (bad.has(i)) el.classList.add('bad');
      el.setAttribute('aria-label',
        `Wiersz ${Math.floor(i / n) + 1}, kolumna ${(i % n) + 1}: ${g[i] === -1 ? 'puste' : NAMES[g[i]]}${puzzle[i] !== -1 ? ', stałe' : ''}`);
    });
    undoTool.setDisabled(!history.length);
    screen.setTitle(`Poziom ${level}`);
    screen.setStatus(`${n}×${n} · puste: ${g.filter((v) => v === -1).length}`);
  }

  grid.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.bn-cell');
    if (!el || won) return;
    const i = Number(el.dataset.i);
    if (puzzle[i] !== -1) { sfx.nope(); haptic.nope(); return; }
    history.push({ i, v: g[i] });
    g[i] = g[i] === -1 ? 0 : g[i] === 0 ? 1 : -1; // empty -> red -> blue -> empty
    sfx.pick();
    haptic.tap();
    render();
    if (isComplete(g, n)) {
      won = true;
      saveLevel(ID, level + 1);
      setTimeout(() => showWin(screen, {
        text: `Poziom ${level} ułożony`,
        onNext: () => startLevel(level + 1),
      }), 300);
    }
  });

  const stop = observeSize(screen.wrap, (w, h) => {
    const side = Math.max(180, Math.floor(Math.min(w, h, 520)));
    grid.style.width = grid.style.height = side + 'px';
  });

  startLevel(loadLevel(ID));
  return () => { stop(); screen.destroy(); };
}

export const binairo: GameModule = {
  id: ID,
  title: 'Dwa kolory',
  tagline: 'Po równo, bez trzech w rzędzie',
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true">
    ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => {
      const v = [0, 1, 0, 1, 0, 1, 1, 0, 1][r * 3 + c];
      return `<circle cx="${11 + c * 13}" cy="${11 + r * 13}" r="5.4" fill="${v ? '#3b82f6' : '#ef4444'}"/>`;
    }).join('')).join('')}
  </svg>`,
  mount,
};
