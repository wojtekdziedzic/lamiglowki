import type { GameContext, GameModule } from '../../types';
import { clearKey, loadJSON, saveJSON } from '../../storage';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { ICONS, gameScreen, levelFlow, observeSize } from '../../ui';
import { SPEC6, SPEC9, conflicts, difficultyLabel, generate, geometry, type Grid, type Spec } from './logic';

interface Saved { level: number; values: Grid; notes: number[] }
interface Change { i: number; v: number; notes: number }

function createMount(id: string, spec: Spec, label: string) {
  const geo = geometry(spec);
  const { n, cells: N, row, col, box, peers } = geo;
  const STATE_KEY = `${id}.state`;

  return function mount(root: HTMLElement, ctx: GameContext): () => void {
    const flow = levelFlow(id, ctx);
    const screen = gameScreen(root, ctx.back);
    const area = document.createElement('div');
    area.className = 'sd-area';
    area.style.setProperty('--n', String(n));
    const grid = document.createElement('div');
    grid.className = 'sd-grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', label);
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

    // Box edges get a thick line; the outer border is drawn by the grid itself.
    const edgeClasses = (i: number) => {
      const cls = ['sd-cell'];
      if (col(i) % spec.bc === spec.bc - 1 && col(i) < n - 1) cls.push('br');
      if (row(i) % spec.br === spec.br - 1 && row(i) < n - 1) cls.push('bb');
      if (col(i) === n - 1) cls.push('last-col');
      if (row(i) === n - 1) cls.push('last-row');
      return cls;
    };

    const cellEls: HTMLElement[] = [];
    for (let i = 0; i < N; i++) {
      const c = document.createElement('button');
      c.className = edgeClasses(i).join(' ');
      c.dataset.i = String(i);
      grid.appendChild(c);
      cellEls.push(c);
    }
    const padBtns: HTMLButtonElement[] = [];
    for (let v = 1; v <= n; v++) {
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
        notes = new Array(N).fill(0);
        history = [];
        won = false;
        persist();
        render();
      },
    });

    function startLevel(l: number, restore: boolean): void {
      level = l;
      flow.enter(l);
      const lv = generate(l, spec, flow.salt);
      givens = lv.puzzle.map((v) => v !== 0);
      clues = lv.clues;
      const saved = restore && !flow.daily ? loadJSON<Saved>(STATE_KEY) : null;
      if (saved && saved.level === l && saved.values?.length === N) {
        values = saved.values;
        notes = saved.notes;
      } else {
        values = lv.puzzle.slice();
        notes = new Array(N).fill(0);
      }
      selected = -1;
      history = [];
      won = false;
      render();
    }

    // Mid-game state is kept for regular levels only; the daily board is short enough.
    const persist = () => { if (!flow.daily) saveJSON(STATE_KEY, { level, values, notes } satisfies Saved); };

    function apply(changes: Change[]): void {
      const before = changes.map(({ i }) => ({ i, v: values[i], notes: notes[i] }));
      changes.forEach(({ i, v, notes: m }) => { values[i] = v; notes[i] = m; });
      history.push(before);
      persist();
    }

    function enter(v: number): void {
      if (selected < 0 || givens[selected] || won || v > n) return;
      const i = selected;
      if (pencil) {
        if (values[i]) return;
        apply([{ i, v: 0, notes: notes[i] ^ (1 << v) }]);
        sfx.pick();
      } else {
        const next = values[i] === v ? 0 : v;
        const changes: Change[] = [{ i, v: next, notes: 0 }];
        // Placing a digit removes it from the notes of every peer.
        if (next) for (const j of peers[i]) {
          if (notes[j] & (1 << next)) changes.push({ i: j, v: values[j], notes: notes[j] & ~(1 << next) });
        }
        apply(changes);
        const bad = next !== 0 && peers[i].some((j) => values[j] === next);
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
      last.forEach(({ i, v, notes: m }) => { values[i] = v; notes[i] = m; });
      persist();
      sfx.pick();
      render();
    }

    function checkWin(): void {
      if (values.some((v) => !v) || conflicts(values, spec).size) return;
      won = true;
      if (!flow.daily) clearKey(STATE_KEY);
      flow.won(screen, level, `Poziom ${level} (${difficultyLabel(clues, spec)}) rozwiązany`, (l) => startLevel(l, false));
    }

    function render(): void {
      const bad = conflicts(values, spec);
      const selVal = selected >= 0 ? values[selected] : 0;
      const digits = Array.from({ length: n }, (_, k) => k + 1);
      cellEls.forEach((el, i) => {
        const v = values[i];
        const cls = edgeClasses(i);
        if (givens[i]) cls.push('given');
        if (i === selected) cls.push('sel');
        else if (selected >= 0 && (row(i) === row(selected) || col(i) === col(selected) || box(i) === box(selected))) cls.push('peer');
        if (selVal && v === selVal && i !== selected) cls.push('same');
        if (bad.has(i)) cls.push('bad');
        el.className = cls.join(' ');
        if (v) {
          el.textContent = String(v);
        } else if (notes[i]) {
          el.innerHTML = `<span class="sd-notes">${digits.map((d) => `<i>${notes[i] & (1 << d) ? d : ''}</i>`).join('')}</span>`;
        } else {
          el.textContent = '';
        }
        el.setAttribute('aria-label', `Wiersz ${row(i) + 1}, kolumna ${col(i) + 1}: ${v || 'puste'}`);
      });
      const counts = new Array(n + 1).fill(0);
      values.forEach((v) => counts[v]++);
      padBtns.forEach((b, k) => {
        const left = n - counts[k + 1];
        b.querySelector('small')!.textContent = left > 0 ? String(left) : '';
        b.classList.toggle('used', left <= 0);
      });
      pencilTool.setPressed(pencil);
      pad.classList.toggle('pencil', pencil);
      undoTool.setDisabled(!history.length);
      screen.setTitle(flow.title(level, spec.n === 9 ? 'Sudoku' : 'Poziom'));
      screen.setStatus(`${difficultyLabel(clues, spec)} · puste: ${values.filter((v) => !v).length}`);
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
      if (e.key >= '1' && e.key <= String(n)) enter(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase();
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const i = selected < 0 ? Math.floor(N / 2) : selected;
        const d = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[e.key] ?? 0;
        const j = i + d;
        if (j >= 0 && j < N && (Math.abs(d) === n || row(j) === row(i))) { selected = j; render(); }
      } else if (e.key === 'n' || e.key === 'N') { pencil = !pencil; render(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo();
    };
    window.addEventListener('keydown', onKey);

    const stop = observeSize(screen.wrap, (w, h) => {
      // The grid plus one pad row (about 1.3 cells high) must fit.
      const side = Math.floor(Math.max(180, Math.min(w, (h - 12) / (1 + 1.3 / n), 520)));
      area.style.width = side + 'px';
      grid.style.height = side + 'px';
      area.style.setProperty('--cell', side / n + 'px');
    });

    startLevel(flow.initial, true);
    return () => {
      stop();
      window.removeEventListener('keydown', onKey);
      screen.destroy();
    };
  };
}

export const sudoku: GameModule = {
  id: 'sudoku',
  title: 'Sudoku',
  tagline: 'Cyfry 1-9 bez powtórzeń',
  dailyLevel: 20,
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true" font-family="inherit" font-weight="800" font-size="11" text-anchor="middle">
    <rect x="5" y="5" width="38" height="38" rx="5" fill="rgba(255,255,255,.35)" stroke="currentColor" stroke-width="2.5"/>
    <path d="M17.7 5v38M30.3 5v38M5 17.7h38M5 30.3h38" stroke="currentColor" stroke-width="1.4" opacity=".6"/>
    <text x="11.4" y="15.5" fill="currentColor">5</text><text x="24" y="28" fill="#3b82f6">3</text><text x="36.6" y="40.6" fill="currentColor">9</text>
    <text x="36.6" y="15.5" fill="#3b82f6">1</text>
  </svg>`,
  mount: createMount('sudoku', SPEC9, 'Sudoku'),
};

export const sudoku6: GameModule = {
  id: 'sudoku6',
  title: 'Sudoku 6x6',
  tagline: 'Szybka partia na dwie minuty',
  dailyLevel: 15,
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true" font-family="inherit" font-weight="800" font-size="12" text-anchor="middle">
    <rect x="5" y="5" width="38" height="38" rx="5" fill="rgba(255,255,255,.35)" stroke="currentColor" stroke-width="2.5"/>
    <path d="M24 5v38M5 17.7h38M5 30.3h38" stroke="currentColor" stroke-width="1.6" opacity=".6"/>
    <text x="14.5" y="15.8" fill="currentColor">6</text><text x="33.5" y="28.4" fill="#3b82f6">2</text><text x="14.5" y="41" fill="currentColor">4</text>
  </svg>`,
  mount: createMount('sudoku6', SPEC6, 'Sudoku 6x6'),
};
