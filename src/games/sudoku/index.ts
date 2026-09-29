import type { GameModule } from '../../types';
import { clearKey, loadJSON, loadLevel, saveJSON, saveLevel } from '../../storage';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { ICONS, gameScreen, observeSize, showWin } from '../../ui';
import { PEERS, box, col, conflicts, difficultyLabel, generate, row, type Grid } from './logic';

const ID = 'sudoku';
const STATE_KEY = 'sudoku.state';

interface Saved { level: number; values: Grid; notes: number[] }
interface Change { i: number; v: number; notes: number }

function mount(root: HTMLElement, ctx: { back(): void }): () => void {
  const screen = gameScreen(root, ctx.back);
  const area = document.createElement('div');
  area.className = 'sd-area';
  const grid = document.createElement('div');
  grid.className = 'sd-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Sudoku');
  const pad = document.createElement('div');
  pad.className = 'sd-pad';
  area.append(grid, pad);
  screen.wrap.appendChild(area);

  let level = 1;
  let givens: boolean[] = [];
  let values: Grid = [];
  let notes: number[] = [];
  let clues = 0;
  let selected = -1;
  let pencil = false;
  let won = false;
  let history: Change[][] = [];

  const cells: HTMLElement[] = [];
  for (let i = 0; i < 81; i++) {
    const c = document.createElement('button');
    c.className = 'sd-cell';
    c.dataset.i = String(i);
    if (col(i) % 3 === 2 && col(i) < 8) c.classList.add('br');
    if (row(i) % 3 === 2 && row(i) < 8) c.classList.add('bb');
    grid.appendChild(c);
    cells.push(c);
  }
  const padBtns: HTMLButtonElement[] = [];
  for (let v = 1; v <= 9; v++) {
    const b = document.createElement('button');
    b.className = 'sd-key';
    b.dataset.v = String(v);
    b.innerHTML = `<span>${v}</span><small></small>`;
    pad.appendChild(b);
    padBtns.push(b);
  }

  const undoTool = screen.tool({ icon: ICONS.undo, label: 'Cofnij', onClick: () => undo() });
  const pencilTool = screen.tool({
    icon: ICONS.pencil, label: 'Notatki',
    onClick: () => { pencil = !pencil; render(); },
  });
  screen.tool({ icon: ICONS.erase, label: 'Wyczyść pole', onClick: () => erase() });
  screen.tool({
    icon: ICONS.restart, label: 'Zacznij od nowa',
    onClick: () => {
      values = values.map((v, i) => (givens[i] ? v : 0));
      notes = new Array(81).fill(0);
      history = [];
      won = false;
      persist();
      render();
    },
  });

  function startLevel(l: number, restore: boolean): void {
    level = l;
    saveLevel(ID, l);
    const lv = generate(l);
    givens = lv.puzzle.map((v) => v !== 0);
    clues = lv.clues;
    const saved = restore ? loadJSON<Saved>(STATE_KEY) : null;
    if (saved && saved.level === l && saved.values?.length === 81) {
      values = saved.values;
      notes = saved.notes;
    } else {
      values = lv.puzzle.slice();
      notes = new Array(81).fill(0);
    }
    selected = -1;
    history = [];
    won = false;
    render();
  }

  const persist = () => saveJSON(STATE_KEY, { level, values, notes } satisfies Saved);

  function apply(changes: Change[]): void {
    const before = changes.map(({ i }) => ({ i, v: values[i], notes: notes[i] }));
    changes.forEach(({ i, v, notes: n }) => { values[i] = v; notes[i] = n; });
    history.push(before);
    persist();
  }

  function enter(v: number): void {
    if (selected < 0 || givens[selected] || won) return;
    const i = selected;
    if (pencil) {
      if (values[i]) return;
      apply([{ i, v: 0, notes: notes[i] ^ (1 << v) }]);
      sfx.pick();
    } else {
      const next = values[i] === v ? 0 : v;
      const changes: Change[] = [{ i, v: next, notes: 0 }];
      // Placing a digit removes it from the notes of every peer.
      if (next) for (const j of PEERS[i]) {
        if (notes[j] & (1 << next)) changes.push({ i: j, v: values[j], notes: notes[j] & ~(1 << next) });
      }
      apply(changes);
      const bad = next !== 0 && PEERS[i].some((j) => values[j] === next);
      if (bad) { sfx.nope(); haptic.nope(); }
      else { sfx.land(2); haptic.tap(); }
    }
    render();
    checkWin();
  }

  function erase(): void {
    if (selected < 0 || givens[selected] || won) return;
    if (!values[selected] && !notes[selected]) return;
    apply([{ i: selected, v: 0, notes: 0 }]);
    sfx.pick();
    render();
  }

  function undo(): void {
    const last = history.pop();
    if (!last || won) return;
    last.forEach(({ i, v, notes: n }) => { values[i] = v; notes[i] = n; });
    persist();
    sfx.pick();
    render();
  }

  function checkWin(): void {
    if (values.some((v) => !v) || conflicts(values).size) return;
    won = true;
    clearKey(STATE_KEY);
    saveLevel(ID, level + 1);
    setTimeout(() => showWin(screen, {
      text: `Sudoku ${level} (${difficultyLabel(clues)}) rozwiązane`,
      onNext: () => startLevel(level + 1, false),
    }), 300);
  }

  function render(): void {
    const bad = conflicts(values);
    const selVal = selected >= 0 ? values[selected] : 0;
    cells.forEach((el, i) => {
      const v = values[i];
      el.className = 'sd-cell';
      if (col(i) % 3 === 2 && col(i) < 8) el.classList.add('br');
      if (row(i) % 3 === 2 && row(i) < 8) el.classList.add('bb');
      if (givens[i]) el.classList.add('given');
      if (i === selected) el.classList.add('sel');
      else if (selected >= 0 && (row(i) === row(selected) || col(i) === col(selected) || box(i) === box(selected))) el.classList.add('peer');
      if (selVal && v === selVal && i !== selected) el.classList.add('same');
      if (bad.has(i)) el.classList.add('bad');
      if (v) {
        el.textContent = String(v);
      } else if (notes[i]) {
        el.innerHTML = `<span class="sd-notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9]
          .map((d) => `<i>${notes[i] & (1 << d) ? d : ''}</i>`).join('')}</span>`;
      } else {
        el.textContent = '';
      }
      el.setAttribute('aria-label', `Wiersz ${row(i) + 1}, kolumna ${col(i) + 1}: ${v || 'puste'}`);
    });
    const counts = new Array(10).fill(0);
    values.forEach((v) => counts[v]++);
    padBtns.forEach((b, k) => {
      const left = 9 - counts[k + 1];
      b.querySelector('small')!.textContent = left > 0 ? String(left) : '';
      b.classList.toggle('used', left <= 0);
    });
    pencilTool.setPressed(pencil);
    pad.classList.toggle('pencil', pencil);
    undoTool.setDisabled(!history.length);
    screen.setTitle(`Sudoku ${level}`);
    screen.setStatus(`${difficultyLabel(clues)} · puste: ${values.filter((v) => !v).length}`);
  }

  grid.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.sd-cell');
    if (!el) return;
    selected = Number(el.dataset.i);
    render();
  });
  pad.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.sd-key');
    if (el) enter(Number(el.dataset.v));
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key >= '1' && e.key <= '9') enter(Number(e.key));
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase();
    else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const i = selected < 0 ? 40 : selected;
      const d = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key] ?? 0;
      const j = i + d;
      if (j >= 0 && j < 81 && (Math.abs(d) === 9 || row(j) === row(i))) { selected = j; render(); }
    } else if (e.key === 'n' || e.key === 'N') { pencil = !pencil; render(); }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo();
  };
  window.addEventListener('keydown', onKey);

  const stop = observeSize(screen.wrap, (w, h) => {
    // The grid plus one pad row (about 1.3 cells high) must fit.
    const side = Math.floor(Math.max(180, Math.min(w, (h - 12) / (1 + 1.3 / 9), 520)));
    area.style.width = side + 'px';
    grid.style.height = side + 'px';
    area.style.setProperty('--cell', side / 9 + 'px');
  });

  startLevel(loadLevel(ID), true);
  return () => {
    stop();
    window.removeEventListener('keydown', onKey);
    screen.destroy();
  };
}

export const sudoku: GameModule = {
  id: ID,
  title: 'Sudoku',
  tagline: 'Cyfry 1-9 bez powtórzeń',
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true" font-family="inherit" font-weight="800" font-size="11" text-anchor="middle">
    <rect x="5" y="5" width="38" height="38" rx="5" fill="rgba(255,255,255,.35)" stroke="currentColor" stroke-width="2.5"/>
    <path d="M17.7 5v38M30.3 5v38M5 17.7h38M5 30.3h38" stroke="currentColor" stroke-width="1.4" opacity=".6"/>
    <text x="11.4" y="15.5" fill="currentColor">5</text><text x="24" y="28" fill="#3b82f6">3</text><text x="36.6" y="40.6" fill="currentColor">9</text>
    <text x="36.6" y="15.5" fill="#3b82f6">1</text>
  </svg>`,
  mount,
};
