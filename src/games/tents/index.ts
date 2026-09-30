import type { GameContext, GameModule } from '../../types';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { ICONS, gameScreen, levelFlow, observeSize } from '../../ui';
import { generate, touching } from './logic';

const ID = 'tents';
const INFO = {
  id: ID,
  title: 'Namioty',
  rules: [
    'Przy każdym drzewie stoi dokładnie jeden namiot, tuż obok (nie po skosie).',
    'Namioty nie stykają się ze sobą, nawet rogami.',
    'Liczby przy wierszach i kolumnach mówią, ile stoi w nich namiotów.',
    'Stuknięcie stawia trawę (tu na pewno nie ma namiotu), drugie namiot, trzecie czyści pole.',
  ],
};

const TREE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 5 11h3.5L4 17h16l-4.5-6H19z" fill="#16a34a" stroke="#15803d" stroke-width="1" stroke-linejoin="round"/><rect x="10.5" y="17" width="3" height="5" rx="1" fill="#92400e"/></svg>`;
const TENT = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.5 20h19z" fill="#f97316" stroke="#c2410c" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 9.5 8.5 20h7z" fill="#7c2d12"/></svg>`;

type Mark = 0 | 1 | 2; // empty, grass (no tent here), tent

function mount(root: HTMLElement, ctx: GameContext): () => void {
  const flow = levelFlow(ID, ctx);
  const screen = gameScreen(root, ctx.back, INFO);
  const grid = document.createElement('div');
  grid.className = 'te-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Pole kempingowe');
  screen.wrap.appendChild(grid);

  let level = 1;
  let n = 6;
  let trees: boolean[] = [];
  let solution: boolean[] = [];
  let rowCounts: number[] = [];
  let colCounts: number[] = [];
  let marks: Mark[] = [];
  let history: { i: number; m: Mark }[] = [];
  let won = false;
  let cellEls: HTMLElement[] = [];
  let rowClueEls: HTMLElement[] = [];
  let colClueEls: HTMLElement[] = [];

  const undoTool = screen.tool({
    icon: ICONS.undo, label: 'Cofnij',
    onClick: () => {
      const last = history.pop();
      if (!last || won) return;
      marks[last.i] = last.m;
      sfx.pick();
      render();
    },
  });
  screen.tool({
    icon: ICONS.restart, label: 'Zacznij od nowa',
    onClick: () => { marks = marks.map(() => 0); history = []; won = false; render(); },
  });

  function startLevel(l: number): void {
    level = l;
    flow.enter(l, screen);
    const lv = generate(l, flow.salt);
    n = lv.n;
    trees = lv.trees;
    solution = lv.tents;
    rowCounts = lv.rowCounts;
    colCounts = lv.colCounts;
    marks = new Array(n * n).fill(0);
    history = [];
    won = false;
    build();
    fit();
    render();
  }

  // (n+1) x (n+1): column counts on top, row counts on the left.
  function build(): void {
    grid.textContent = '';
    grid.style.setProperty('--m', String(n + 1));
    cellEls = [];
    rowClueEls = [];
    colClueEls = [];
    grid.appendChild(document.createElement('span'));
    for (let c = 0; c < n; c++) {
      const el = document.createElement('span');
      el.className = 'te-clue';
      el.textContent = String(colCounts[c]);
      grid.appendChild(el);
      colClueEls.push(el);
    }
    for (let r = 0; r < n; r++) {
      const clue = document.createElement('span');
      clue.className = 'te-clue';
      clue.textContent = String(rowCounts[r]);
      grid.appendChild(clue);
      rowClueEls.push(clue);
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const cell = document.createElement('button');
        cell.className = trees[i] ? 'te-cell tree' : 'te-cell';
        cell.dataset.i = String(i);
        if (trees[i]) cell.innerHTML = TREE;
        grid.appendChild(cell);
        cellEls.push(cell);
      }
    }
  }

  function render(): void {
    const tents = marks.map((m) => m === 2);
    const bad = touching(n, tents);
    cellEls.forEach((el, i) => {
      if (trees[i]) {
        el.setAttribute('aria-label', `Wiersz ${Math.floor(i / n) + 1}, kolumna ${(i % n) + 1}: drzewo`);
        return;
      }
      el.className = 'te-cell';
      if (marks[i] === 1) el.classList.add('grass');
      if (bad.has(i)) el.classList.add('bad');
      el.innerHTML = marks[i] === 2 ? TENT : '';
      el.setAttribute('aria-label',
        `Wiersz ${Math.floor(i / n) + 1}, kolumna ${(i % n) + 1}: ${['puste', 'trawa', 'namiot'][marks[i]]}`);
    });
    const clueState = (el: HTMLElement, have: number, want: number) => {
      el.classList.toggle('ok', have === want);
      el.classList.toggle('bad', have > want);
    };
    for (let k = 0; k < n; k++) {
      clueState(rowClueEls[k], tents.slice(k * n, k * n + n).filter(Boolean).length, rowCounts[k]);
      clueState(colClueEls[k], Array.from({ length: n }, (_, r) => tents[r * n + k]).filter(Boolean).length, colCounts[k]);
    }
    undoTool.setDisabled(!history.length);
    screen.setLevel(flow.label(level));
    screen.setStatus(`${n}×${n} · namioty: ${tents.filter(Boolean).length}/${trees.filter(Boolean).length}`);
  }

  grid.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.te-cell');
    if (!el || won) return;
    const i = Number(el.dataset.i);
    if (trees[i]) { sfx.nope(); haptic.nope(); return; }
    history.push({ i, m: marks[i] });
    marks[i] = ((marks[i] + 1) % 3) as Mark; // empty -> grass -> tent -> empty
    if (marks[i] === 2) { sfx.land(2); haptic.tap(); } else sfx.pick();
    render();
    // The solution is unique, so matching it is the same as satisfying every rule.
    if (marks.every((m, k) => (m === 2) === solution[k])) {
      won = true;
      flow.won(screen, level, `Poziom ${level}: kemping gotowy`, startLevel);
    }
  });

  let lastW = 0, lastH = 0;
  function fit(): void {
    const cell = Math.floor(Math.max(26, Math.min(lastW / (n + 1), lastH / (n + 1), 64)));
    grid.style.width = grid.style.height = cell * (n + 1) + 'px';
    grid.style.setProperty('--cell', cell + 'px');
  }
  const stop = observeSize(screen.wrap, (w, h) => { lastW = w; lastH = h; fit(); });

  startLevel(flow.initial);
  return () => { stop(); screen.destroy(); };
}

export const tents: GameModule = {
  id: ID,
  title: INFO.title,
  tagline: 'Namiot przy każdym drzewie',
  dailyLevel: 20,
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M14 6 6 18h4.5L5 26h18l-5.5-8H22z" fill="#16a34a" stroke="#15803d" stroke-width="1" stroke-linejoin="round"/><rect x="12.5" y="26" width="3" height="6" rx="1" fill="#92400e"/>
    <path d="M33 18 22 40h22z" fill="#f97316" stroke="#c2410c" stroke-width="1.4" stroke-linejoin="round"/><path d="M33 27l-4 13h8z" fill="#7c2d12"/>
  </svg>`,
  mount,
};
