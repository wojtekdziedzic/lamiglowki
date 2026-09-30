import type { GameModule } from '../../types';
import type { GameContext } from '../../types';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { ICONS, gameScreen, levelFlow, observeSize, showWin } from '../../ui';
import { configForLevel, counts, flood, generate, neighbors, type MinesConfig } from './logic';

const ID = 'minesweeper';
const INFO = {
  id: ID,
  title: 'Saper',
  rules: [
    'Odkryj wszystkie pola bez min. Liczba mówi, ile min leży wokół pola, także po skosie.',
    'Pierwsze stuknięcie jest zawsze bezpieczne, a każdą planszę da się przejść bez zgadywania.',
    'Flagę stawiasz długim przytrzymaniem albo w trybie flagi (przycisk z flagą).',
    'Stuknięcie w liczbę, przy której stoi już komplet flag, odkrywa resztę jej sąsiadów.',
  ],
};
const LONG_PRESS_MS = 380;

const FLAG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6 4h11l-2.5 4 2.5 4H6z" fill="#ef4444"/></svg>`;
const MINE = `<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3 5.3 18.7"/></g><circle cx="12" cy="12" r="6" fill="currentColor"/><circle cx="10" cy="10" r="1.6" fill="#fff"/></svg>`;

function mount(root: HTMLElement, ctx: GameContext): () => void {
  const flow = levelFlow(ID, ctx);
  const screen = gameScreen(root, ctx.back, INFO);
  const grid = document.createElement('div');
  grid.className = 'ms-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Pole minowe');
  screen.wrap.appendChild(grid);

  let level = 1;
  let cfg: MinesConfig = configForLevel(1);
  let mines: boolean[] | null = null; // placed on the first tap
  let cnt: number[] = [];
  let revealed: boolean[] = [];
  let flagged: boolean[] = [];
  let exploded = -1;
  let over = false;
  let flagMode = false;

  const flagTool = screen.tool({
    icon: ICONS.flag, label: 'Tryb flagi',
    onClick: () => { flagMode = !flagMode; render(); },
  });
  screen.tool({ icon: ICONS.restart, label: 'Nowa plansza', onClick: () => startLevel(level) });

  function startLevel(l: number): void {
    level = l;
    const size = configForLevel(l);
    flow.setSize(`${size.cols}×${size.rows}`);
    flow.enter(l, screen);
    cfg = configForLevel(l);
    const N = cfg.rows * cfg.cols;
    mines = null;
    cnt = [];
    revealed = new Array(N).fill(false);
    flagged = new Array(N).fill(false);
    exploded = -1;
    over = false;
    grid.textContent = '';
    grid.style.setProperty('--cols', String(cfg.cols));
    for (let i = 0; i < N; i++) {
      const cell = document.createElement('button');
      cell.className = 'ms-cell';
      cell.dataset.i = String(i);
      grid.appendChild(cell);
    }
    fit();
    render();
  }

  function render(): void {
    [...grid.children].forEach((el, i) => {
      const cls = ['ms-cell'];
      let html = '';
      let label = 'zakryte';
      if (revealed[i]) {
        cls.push('open');
        if (mines?.[i]) { cls.push('mine'); html = MINE; label = 'mina'; }
        else if (cnt[i]) { cls.push(`n${cnt[i]}`); html = String(cnt[i]); label = `${cnt[i]}`; }
        else label = 'puste';
      } else if (flagged[i]) {
        cls.push('flag');
        html = FLAG;
        label = 'flaga';
        if (over && mines && !mines[i]) cls.push('wrong');
      }
      if (i === exploded) cls.push('boom');
      el.className = cls.join(' ');
      el.innerHTML = html;
      el.setAttribute('aria-label', `Wiersz ${Math.floor(i / cfg.cols) + 1}, kolumna ${(i % cfg.cols) + 1}: ${label}`);
    });
    flagTool.setPressed(flagMode);
    grid.classList.toggle('flag-mode', flagMode);
    screen.setLevel(flow.label(level));
    screen.setStatus(`${cfg.cols}×${cfg.rows} · miny: ${cfg.mines - flagged.filter(Boolean).length}`);
  }

  function toggleFlag(i: number): void {
    if (over || revealed[i]) return;
    flagged[i] = !flagged[i];
    sfx.pick();
    haptic.tap();
    render();
  }

  function open(i: number): void {
    if (over || flagged[i]) return;
    if (!mines) {
      mines = generate(level, i, flow.salt);
      cnt = counts(mines, cfg.rows, cfg.cols);
    }
    let targets = [i];
    if (revealed[i]) {
      // Chord: a satisfied number opens its remaining neighbours.
      if (!cnt[i]) return;
      const nb = neighbors(cfg.rows, cfg.cols, i);
      if (nb.filter((j) => flagged[j]).length !== cnt[i]) return;
      targets = nb.filter((j) => !revealed[j] && !flagged[j]);
      if (!targets.length) return;
    }
    const hit = targets.find((j) => mines![j]);
    if (hit !== undefined) { lose(hit); return; }
    let opened = 0;
    for (const j of targets) opened += flood(j, cnt, revealed, flagged, cfg.rows, cfg.cols).length;
    if (opened) { sfx.land(Math.min(4, Math.floor(opened / 4))); haptic.tap(); }
    render();
    checkWin();
  }

  function lose(i: number): void {
    over = true;
    exploded = i;
    screen.clock.stop(); // a lost board does not count as a solve
    mines!.forEach((m, j) => { if (m && !flagged[j]) revealed[j] = true; });
    render();
    setTimeout(() => showWin(screen, {
      title: 'Bum!', text: 'Trafiona mina. Plansza da się przejść bez zgadywania.', button: 'Jeszcze raz', lost: true,
      onNext: () => startLevel(level),
    }), 500);
  }

  function checkWin(): void {
    if (!mines || revealed.some((r, i) => !r && !mines![i])) return;
    over = true;
    mines.forEach((m, j) => { if (m) flagged[j] = true; });
    render();
    flow.won(screen, level, `Poziom ${level} rozminowany`, startLevel);
  }

  // Tap opens (or flags in flag mode); long press and right click always flag.
  let pressTimer = 0;
  let suppressClick = false;
  const cellOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.ms-cell');
  grid.addEventListener('pointerdown', (e) => {
    const el = cellOf(e);
    if (!el || e.button !== 0) return;
    suppressClick = false;
    clearTimeout(pressTimer);
    pressTimer = window.setTimeout(() => {
      suppressClick = true;
      toggleFlag(Number(el.dataset.i));
    }, LONG_PRESS_MS);
  });
  const cancelPress = () => clearTimeout(pressTimer);
  grid.addEventListener('pointerup', cancelPress);
  grid.addEventListener('pointerleave', cancelPress);
  grid.addEventListener('pointercancel', cancelPress);
  grid.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // A long press has already flagged (Android fires contextmenu too); a right click has not.
    // Right click fires no click afterwards, so it must not arm suppressClick.
    const el = cellOf(e);
    if (el && !suppressClick) toggleFlag(Number(el.dataset.i));
  });
  grid.addEventListener('click', (e) => {
    const el = cellOf(e);
    if (!el) return;
    if (suppressClick) { suppressClick = false; return; }
    const i = Number(el.dataset.i);
    if (flagMode && !revealed[i]) toggleFlag(i);
    else open(i);
  });

  let lastW = 0, lastH = 0;
  function fit(): void {
    const cell = Math.max(22, Math.floor(Math.min(lastW / cfg.cols, lastH / cfg.rows, 56)));
    grid.style.width = cfg.cols * cell + 'px';
    grid.style.height = cfg.rows * cell + 'px';
    grid.style.setProperty('--cell', cell + 'px');
  }
  const stop = observeSize(screen.wrap, (w, h) => { lastW = w; lastH = h; fit(); });

  startLevel(flow.initial);
  return () => { clearTimeout(pressTimer); stop(); screen.destroy(); };
}

export const minesweeper: GameModule = {
  id: ID,
  title: INFO.title,
  tagline: 'Bez zgadywania, sama logika',
  dailyLevel: 20,
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true" font-family="inherit" font-weight="800" font-size="12" text-anchor="middle">
    <rect x="5" y="5" width="18" height="18" rx="3" fill="currentColor" opacity=".25"/>
    <rect x="25" y="5" width="18" height="18" rx="3" fill="rgba(255,255,255,.6)"/><text x="34" y="18.5" fill="#3b82f6">1</text>
    <rect x="5" y="25" width="18" height="18" rx="3" fill="rgba(255,255,255,.6)"/><text x="14" y="38.5" fill="#22c55e">2</text>
    <rect x="25" y="25" width="18" height="18" rx="3" fill="currentColor" opacity=".25"/>
    <path d="M30 40V29" stroke="#1f2937" stroke-width="2" stroke-linecap="round"/><path d="M30 29h8l-2 3 2 3h-8z" fill="#ef4444"/>
  </svg>`,
  mount,
};
