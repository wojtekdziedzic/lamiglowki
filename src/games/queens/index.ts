import type { GameModule } from '../../types';
import type { GameContext } from '../../types';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { ICONS, gameScreen, levelFlow, observeSize } from '../../ui';
import { conflicts, generate } from './logic';

const ID = 'queens';
const INFO = {
  id: ID,
  title: 'Królowe',
  rules: [
    'W każdym wierszu, każdej kolumnie i każdym kolorowym regionie stoi dokładnie jedna królowa.',
    'Królowe nie mogą się stykać, także po skosie.',
    'Stuknięcie stawia krzyżyk (tu nie ma królowej), drugie królowę, trzecie czyści pole.',
    'Królowe łamiące zasady podświetlają się na czerwono.',
  ],
};

// Pastel region colors, readable with dark marks in both themes
const REGION_COLORS = [
  '#f9a8a8', '#fcd58a', '#b8e68f', '#8fd8e6', '#b3b8f5',
  '#e6a8e6', '#f5c6a0', '#a8e6c8', '#d6d0c4', '#c8b0f0',
];

const CROWN = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18l-1.5-10-4.5 4-3-6-3 6-4.5-4z" fill="currentColor"/><rect x="3" y="19.5" width="18" height="2.5" rx="1" fill="currentColor"/></svg>`;

type Mark = 0 | 1 | 2; // empty, X, queen

function mount(root: HTMLElement, ctx: GameContext): () => void {
  const flow = levelFlow(ID, ctx);
  const screen = gameScreen(root, ctx.back, INFO);
  const grid = document.createElement('div');
  grid.className = 'qn-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Plansza z kolorowymi regionami');
  screen.wrap.appendChild(grid);

  let level = 1;
  let n = 5;
  let regions: number[] = [];
  let marks: Mark[] = [];
  let history: { i: number; m: Mark }[] = [];
  let won = false;

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
    regions = lv.regions;
    marks = new Array(n * n).fill(0);
    history = [];
    won = false;
    grid.textContent = '';
    grid.style.setProperty('--n', String(n));
    grid.style.setProperty('--cell', grid.clientWidth / n + 'px');
    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n), c = i % n;
      const cell = document.createElement('button');
      cell.className = 'qn-cell';
      cell.dataset.i = String(i);
      cell.style.setProperty('--rc', REGION_COLORS[regions[i] % REGION_COLORS.length]);
      // Thick edges where the region changes
      if (r > 0 && regions[i - n] !== regions[i]) cell.classList.add('et');
      if (c > 0 && regions[i - 1] !== regions[i]) cell.classList.add('el');
      grid.appendChild(cell);
    }
    render();
  }

  function queens(): Set<number> {
    return new Set(marks.flatMap((m, i) => (m === 2 ? [i] : [])));
  }

  function render(): void {
    const q = queens();
    const bad = conflicts(n, regions, q);
    [...grid.children].forEach((el, i) => {
      el.classList.toggle('queen', marks[i] === 2);
      el.classList.toggle('x', marks[i] === 1);
      el.classList.toggle('bad', bad.has(i));
      el.innerHTML = marks[i] === 2 ? CROWN : marks[i] === 1 ? '<span class="qn-x">×</span>' : '';
      el.setAttribute('aria-label',
        `Wiersz ${Math.floor(i / n) + 1}, kolumna ${(i % n) + 1}, region ${regions[i] + 1}: ${['puste', 'krzyżyk', 'królowa'][marks[i]]}`);
    });
    undoTool.setDisabled(!history.length);
    screen.setLevel(flow.label(level));
    screen.setStatus(`${n}×${n} · królowe: ${q.size}/${n}`);
  }

  grid.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.qn-cell');
    if (!el || won) return;
    const i = Number(el.dataset.i);
    history.push({ i, m: marks[i] });
    marks[i] = ((marks[i] + 1) % 3) as Mark; // empty -> X -> queen -> empty
    if (marks[i] === 2) { sfx.land(2); haptic.tap(); } else sfx.pick();
    render();
    const q = queens();
    if (q.size === n && conflicts(n, regions, q).size === 0) {
      won = true;
      flow.won(screen, level, `Poziom ${level} rozwiązany`, startLevel);
    } else if (marks[i] === 2 && conflicts(n, regions, q).has(i)) {
      sfx.nope();
      haptic.nope();
    }
  });

  const stop = observeSize(screen.wrap, (w, h) => {
    const side = Math.max(180, Math.floor(Math.min(w, h, 520)));
    grid.style.width = grid.style.height = side + 'px';
    grid.style.setProperty('--cell', side / n + 'px');
  });

  startLevel(flow.initial);
  return () => { stop(); screen.destroy(); };
}

export const queens: GameModule = {
  id: ID,
  title: INFO.title,
  tagline: 'Jedna w rzędzie, kolumnie i kolorze',
  dailyLevel: 30,
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="5" y="5" width="19" height="19" rx="3" fill="#f9a8a8"/><rect x="24" y="5" width="19" height="19" rx="3" fill="#b8e68f"/>
    <rect x="5" y="24" width="19" height="19" rx="3" fill="#8fd8e6"/><rect x="24" y="24" width="19" height="19" rx="3" fill="#fcd58a"/>
    <path d="M9 19h11l-1-7-3 3-2-4-2 4-3-3z" fill="#1f2937"/><path d="M28 38h11l-1-7-3 3-2-4-2 4-3-3z" fill="#1f2937"/>
  </svg>`,
  mount,
};
