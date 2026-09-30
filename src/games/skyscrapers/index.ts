import type { GameContext, GameModule } from '../../types';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { ICONS, gameScreen, levelFlow, observeSize, squareSize } from '../../ui';
import { clueState, duplicates, generate, sizeForLevel, type Clues } from './logic';

const ID = 'skyscrapers';
const INFO = {
  id: ID,
  title: 'Wieżowce',
  rules: [
    'Każde pole to budynek o wysokości od 1 do N. W każdym wierszu i kolumnie każda wysokość występuje raz.',
    'Liczba na brzegu mówi, ile budynków widać z tej strony: wyższy budynek zasłania niższe za nim.',
    'Stuknij pole, potem wysokość na klawiaturze.',
    'Spełniona podpowiedź blednie, złamana robi się czerwona.',
  ],
};

function mount(root: HTMLElement, ctx: GameContext): () => void {
  const flow = levelFlow(ID, ctx);
  const screen = gameScreen(root, ctx.back, INFO);
  const area = document.createElement('div');
  area.className = 'sk-area';
  const grid = document.createElement('div');
  grid.className = 'sk-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Plansza wieżowców');
  const pad = document.createElement('div');
  pad.className = 'sd-pad';
  area.append(grid, pad);
  screen.wrap.appendChild(area);

  let level = 1;
  let n = 4;
  let clues: Clues = { top: [], bottom: [], left: [], right: [] };
  let givens: number[] = [];
  let g: number[] = [];
  let selected = -1;
  let history: { i: number; v: number }[] = [];
  let won = false;
  let cellEls: HTMLElement[] = [];
  let clueEls: { side: keyof Clues; k: number; el: HTMLElement }[] = [];
  let padBtns: HTMLButtonElement[] = [];
  let lastW = 0, lastH = 0;

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
  screen.tool({ icon: ICONS.erase, label: 'Wyczyść pole', onClick: () => set(0) });
  screen.tool({
    icon: ICONS.restart, label: 'Zacznij od nowa',
    onClick: () => { g = givens.slice(); history = []; won = false; render(); },
  });

  function startLevel(l: number): void {
    level = l;
    flow.setSize(squareSize(sizeForLevel(l)));
    flow.enter(l, screen);
    const lv = generate(l, flow.salt);
    n = lv.n;
    clues = lv.clues;
    givens = lv.givens;
    g = givens.slice();
    selected = -1;
    history = [];
    won = false;
    build();
    fit();
    render();
  }

  // (n+2) x (n+2) layout: clue ring around the city, corners empty.
  function build(): void {
    grid.textContent = '';
    pad.textContent = '';
    cellEls = [];
    clueEls = [];
    const m = n + 2;
    grid.style.setProperty('--m', String(m));
    area.style.setProperty('--n', String(n));
    for (let r = 0; r < m; r++) {
      for (let c = 0; c < m; c++) {
        const inner = r > 0 && r < m - 1 && c > 0 && c < m - 1;
        if (inner) {
          const cell = document.createElement('button');
          cell.className = 'sk-cell';
          cell.dataset.i = String((r - 1) * n + (c - 1));
          grid.appendChild(cell);
          cellEls.push(cell);
          continue;
        }
        const el = document.createElement('span');
        el.className = 'sk-clue';
        const side: keyof Clues | null = r === 0 && c > 0 && c < m - 1 ? 'top'
          : r === m - 1 && c > 0 && c < m - 1 ? 'bottom'
          : c === 0 && r > 0 && r < m - 1 ? 'left'
          : c === m - 1 && r > 0 && r < m - 1 ? 'right' : null;
        if (side) {
          const k = side === 'top' || side === 'bottom' ? c - 1 : r - 1;
          el.textContent = clues[side][k] ? String(clues[side][k]) : '';
          clueEls.push({ side, k, el });
        }
        grid.appendChild(el);
      }
    }
    padBtns = [];
    for (let v = 1; v <= n; v++) {
      const b = document.createElement('button');
      b.className = 'sd-key';
      b.dataset.v = String(v);
      b.innerHTML = `<span>${v}</span><small></small>`;
      pad.appendChild(b);
      padBtns.push(b);
    }
  }

  function render(): void {
    const dup = duplicates(n, g);
    cellEls.forEach((el, i) => {
      const cls = ['sk-cell'];
      if (givens[i]) cls.push('given');
      if (i === selected) cls.push('sel');
      else if (selected >= 0 && (Math.floor(i / n) === Math.floor(selected / n) || i % n === selected % n)) cls.push('peer');
      if (dup.has(i)) cls.push('bad');
      el.className = cls.join(' ');
      el.textContent = g[i] ? String(g[i]) : '';
      el.setAttribute('aria-label', `Wiersz ${Math.floor(i / n) + 1}, kolumna ${(i % n) + 1}: ${g[i] || 'puste'}`);
    });
    for (const { side, k, el } of clueEls) {
      const clue = clues[side][k];
      const state = clue ? clueState(n, g, side, k, clue) : 'open';
      el.classList.toggle('ok', state === 'ok');
      el.classList.toggle('bad', state === 'bad');
    }
    const counts = new Array(n + 1).fill(0);
    g.forEach((v) => counts[v]++);
    padBtns.forEach((b, k) => {
      const left = n - counts[k + 1];
      b.querySelector('small')!.textContent = left > 0 ? String(left) : '';
      b.classList.toggle('used', left <= 0);
    });
    undoTool.setDisabled(!history.length);
    screen.setLevel(flow.label(level));
    screen.setStatus(`${n}×${n} · puste: ${g.filter((v) => !v).length}`);
  }

  function set(v: number): void {
    if (selected < 0 || givens[selected] || won || g[selected] === v) return;
    history.push({ i: selected, v: g[selected] });
    g[selected] = v;
    const bad = v !== 0 && duplicates(n, g).has(selected);
    if (bad) { sfx.nope(); haptic.nope(); } else { sfx.land(Math.min(v, 5)); haptic.tap(); }
    render();
    const solved = g.every((x) => x) && duplicates(n, g).size === 0
      && clueEls.every(({ side, k }) => !clues[side][k] || clueState(n, g, side, k, clues[side][k]) === 'ok');
    if (solved) {
      won = true;
      flow.won(screen, level, `Poziom ${level} zbudowany`, startLevel);
    }
  }

  grid.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.sk-cell');
    if (!el) return;
    selected = Number(el.dataset.i);
    render();
  });
  pad.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.sd-key');
    if (el) set(Number(el.dataset.v));
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key >= '1' && e.key <= String(n)) set(Number(e.key));
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') set(0);
  };
  window.addEventListener('keydown', onKey);

  function fit(): void {
    const m = n + 2;
    // m rows of cells plus one pad row (about 1.3 inner cells high) must fit.
    const cell = Math.floor(Math.max(28, Math.min(lastW / m, (lastH - 12) / (m + 1.3), 70)));
    grid.style.width = grid.style.height = cell * m + 'px';
    area.style.width = cell * m + 'px';
    area.style.setProperty('--cell', cell + 'px');
  }
  const stop = observeSize(screen.wrap, (w, h) => { lastW = w; lastH = h; fit(); });

  startLevel(flow.initial);
  return () => {
    stop();
    window.removeEventListener('keydown', onKey);
    screen.destroy();
  };
}

export const skyscrapers: GameModule = {
  id: ID,
  title: INFO.title,
  tagline: 'Ile budynków widać z brzegu?',
  dailyLevel: 15,
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="6" y="26" width="8" height="16" rx="1.5" fill="#93c5fd"/><rect x="16" y="14" width="8" height="28" rx="1.5" fill="#3b82f6"/>
    <rect x="26" y="20" width="8" height="22" rx="1.5" fill="#60a5fa"/><rect x="36" y="8" width="8" height="34" rx="1.5" fill="#1d4ed8"/>
    <text x="10" y="18" font-family="inherit" font-weight="800" font-size="11" text-anchor="middle" fill="currentColor">3</text>
  </svg>`,
  mount,
};
