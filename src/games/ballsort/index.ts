import type { GameContext, GameModule } from '../../types';
import { CAP, COLORS } from './config';
import { isSolved, isTubeDone, topRun, type State } from './rules';
import { generate } from './generator';
import { Game } from './game';
import { sfx } from '../../audio';
import { haptic } from '../../haptics';
import { bounce, reducedMotion } from '../../fx';
import { ICONS, gameScreen, levelFlow, observeSize } from '../../ui';

const ID = 'ballsort';
const INFO = {
  id: ID,
  title: 'Sortuj kulki',
  rules: [
    'Stuknij probówkę, żeby podnieść górne kulki, potem stuknij probówkę docelową.',
    'Kulki kładziesz tylko na kulkę tego samego koloru albo do pustej probówki.',
    'Cała grupa tego samego koloru z góry przeskakuje naraz, ile się zmieści.',
    'Cel: każda probówka w jednym kolorze.',
    'Na poziom masz 5 cofnięć i 1 dodatkową probówkę.',
  ],
};

// Level cache survives leaving the game; the next level is prepared while the win card shows.
const cache = new Map<number, State>();
function levelLayout(l: number): State {
  let s = cache.get(l);
  if (!s) { s = generate(l).tubes; cache.set(l, s); }
  return s;
}
function prefetch(l: number): void {
  const run = () => { if (!cache.has(l)) cache.set(l, generate(l).tubes); };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1500 });
  else setTimeout(run, 300);
}

function mount(root: HTMLElement, ctx: GameContext): () => void {
  const flow = levelFlow(ID, ctx);
  const screen = gameScreen(root, ctx.back, INFO);
  const boardEl = document.createElement('div');
  boardEl.className = 'board';
  boardEl.setAttribute('role', 'group');
  boardEl.setAttribute('aria-label', 'Probówki');
  screen.wrap.appendChild(boardEl);

  const game = new Game();
  let selected = -1;
  let busy = false;
  let alive = true;

  screen.tool({
    icon: ICONS.restart, label: 'Zacznij poziom od nowa',
    onClick: () => {
      if (busy) return;
      game.reset(); // also removes the extra tube
      selected = -1;
      render();
    },
  });
  const undoTool = screen.tool({
    icon: ICONS.undo, label: 'Cofnij ruch', badge: true,
    onClick: () => {
      if (busy || !game.undo()) return;
      selected = -1;
      sfx.pick();
      render();
    },
  });
  const tubeTool = screen.tool({
    icon: ICONS.tube, label: 'Dodaj pustą probówkę', badge: true,
    onClick: () => {
      if (busy || !game.addTube()) return;
      selected = -1;
      sfx.pick();
      render();
    },
  });

  interface RenderOpts {
    /** Balls at index >= from in this tube are still in flight. */
    hidden?: { tube: number; from: number };
    closing?: number;
  }

  function render(opts: RenderOpts = {}): void {
    boardEl.textContent = '';
    game.tubes.forEach((t, i) => {
      const el = document.createElement('div');
      el.className = 'tube';
      const done = isTubeDone(t);
      // The selected tube lifts its whole top run: that is what the next move carries.
      const lift = i === selected ? t.length - topRun(t) : Infinity;
      if (i === selected) el.classList.add('sel');
      if (done) el.classList.add('done');
      if (opts.closing === i) el.classList.add('closing');
      el.style.setProperty('--cap', String(CAP));
      el.style.setProperty('--empty', String(CAP - t.length));
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Probówka ${i + 1}, kulek: ${t.length}${done ? ', ułożona' : ''}`);
      el.dataset.i = String(i);
      t.forEach((c, k) => {
        const b = document.createElement('div');
        b.className = 'ball';
        b.style.setProperty('--c', COLORS[c]);
        b.style.setProperty('--rot', `${(c * 47) % 360}deg`);
        if (opts.hidden && opts.hidden.tube === i && k >= opts.hidden.from) b.classList.add('hidden');
        if (k >= lift) b.classList.add('lift');
        el.appendChild(b);
      });
      if (done) {
        const cork = document.createElement('div');
        cork.className = 'cork';
        el.appendChild(cork);
      }
      boardEl.appendChild(el);
    });
    screen.setLevel(flow.label(game.level));
    screen.setStatus(`Ruchy: ${game.moves}`);
    undoTool.setBadge(game.undosLeft);
    tubeTool.setBadge(game.extraTubesLeft);
    undoTool.setDisabled(!game.canUndo);
    tubeTool.setDisabled(game.extraTubesLeft <= 0);
    fitBoard();
  }

  // Pick column count and tube width so the whole board fits the available area
  function fitBoard(): void {
    const W = screen.wrap.clientWidth, H = screen.wrap.clientHeight;
    const n = game.tubes.length;
    if (!W || !H || !n) return;
    let best = { tw: 0, cols: n };
    for (let cols = Math.min(n, 8); cols >= 2; cols--) {
      const rows = Math.ceil(n / cols);
      // width: cols tubes + gaps (0.36 tw) + rim overhang (~14px)
      const twW = (W - 14) / (cols + (cols - 1) * 0.36);
      // height: step = 0.864 tw; tube = step*CAP + 0.28 tw; row gap 0.9 tw; top lift pad 1.2 step
      const tubeH = 0.864 * CAP + 0.28;
      const twH = (H - 8) / (rows * tubeH + (rows - 1) * 0.9 + 1.04);
      const tw = Math.min(twW, twH, 64);
      if (tw > best.tw + 0.5) best = { tw, cols };
    }
    const tw = Math.max(24, Math.floor(best.tw));
    boardEl.style.setProperty('--tw', tw + 'px');
    boardEl.style.width = (best.cols * tw + (best.cols - 1) * tw * 0.36 + 1) + 'px';
  }
  const stopObserve = observeSize(screen.wrap, () => { if (!busy) fitBoard(); });

  const tubeEl = (i: number) => boardEl.children[i] as HTMLElement;

  function shake(i: number): void {
    const el = tubeEl(i);
    el.classList.remove('nope');
    void el.offsetWidth;
    el.classList.add('nope');
    sfx.nope();
    haptic.nope();
  }

  function startLevel(l: number): void {
    flow.enter(l);
    game.start(l, flow.daily ? generate(l, flow.salt).tubes : levelLayout(l));
    cache.delete(l - 1);
    selected = -1;
    render();
  }

  function onTubeTap(i: number): void {
    if (busy) return;
    const t = game.tubes[i];
    const pickable = t.length > 0 && !isTubeDone(t);
    if (selected === -1) {
      if (pickable) { selected = i; sfx.pick(); haptic.tap(); render(); }
      else if (t.length) shake(i);
      return;
    }
    if (selected === i) { selected = -1; render(); return; }
    if (game.canMove(selected, i)) {
      doMove(selected, i);
    } else if (pickable) {
      selected = i; sfx.pick(); haptic.tap(); render();
    } else {
      shake(i);
    }
  }

  const FLIGHT_MS = 360;
  const STAGGER_MS = 80;

  function doMove(from: number, to: number): void {
    const count = game.moveCount(from, to);
    // Top ball first: it leads the group and lands lowest in the destination.
    const srcBalls = [...tubeEl(from).querySelectorAll<HTMLElement>('.ball')].slice(-count).reverse();
    const fromRects = srcBalls.map((b) => b.getBoundingClientRect());
    const color = game.tubes[from][game.tubes[from].length - 1];

    game.move(from, to);
    selected = -1;
    const base = game.tubes[to].length - count;
    const closing = isTubeDone(game.tubes[to]) ? to : undefined;
    // Render without the closing flag first so the cork animates only after the balls land.
    render({ hidden: { tube: to, from: base } });

    const destBalls = [...tubeEl(to).querySelectorAll<HTMLElement>('.ball')].slice(base);
    const destTubeRect = tubeEl(to).getBoundingClientRect();

    if (reducedMotion() || !destBalls[0]?.animate) {
      destBalls.forEach((b, k) => landBall(b, base + k));
      finishMove(closing);
      return;
    }

    busy = true;
    let pending = count;
    destBalls.forEach((destBall, k) => {
      const fromRect = fromRects[k];
      const toRect = destBall.getBoundingClientRect();
      const fly = document.createElement('div');
      fly.className = 'ball fly';
      fly.style.setProperty('--c', COLORS[color]);
      fly.style.setProperty('--rot', `${(color * 47) % 360}deg`);
      fly.style.width = fromRect.width + 'px';
      fly.style.height = fromRect.height + 'px';
      fly.style.left = '0px';
      fly.style.top = '0px';
      // Hold the ball at its start until its staggered flight begins.
      fly.style.transform = `translate(${fromRect.left}px, ${fromRect.top}px)`;
      screen.wrap.appendChild(fly);

      const aboveY = destTubeRect.top - fromRect.height * 1.1;
      const hoverY = Math.min(fromRect.top, aboveY);
      const anim = fly.animate([
        { transform: `translate(${fromRect.left}px, ${fromRect.top}px)` },
        { transform: `translate(${fromRect.left}px, ${hoverY}px)`, offset: 0.15 },
        { transform: `translate(${toRect.left}px, ${aboveY}px)`, offset: 0.6 },
        { transform: `translate(${toRect.left}px, ${toRect.top}px)` },
      ], { duration: FLIGHT_MS, delay: k * STAGGER_MS, easing: 'ease-in-out' });
      // Animations stall while the page is hidden (app sent to background mid-move):
      // a timer guarantees the move completes and input is never locked.
      let finished = false;
      const finish = () => {
        if (finished || !alive) return;
        finished = true;
        anim.cancel();
        fly.remove();
        landBall(destBall, base + k);
        if (--pending === 0) { busy = false; finishMove(closing); }
      };
      anim.onfinish = finish;
      setTimeout(finish, FLIGHT_MS + k * STAGGER_MS + 250);
    });
  }

  function landBall(destBall: HTMLElement, height: number): void {
    destBall.classList.remove('hidden');
    bounce(destBall);
    sfx.land(height);
    haptic.tap();
  }

  function finishMove(closing?: number): void {
    if (closing !== undefined) {
      render({ closing });
      setTimeout(() => { sfx.close(); haptic.success(); }, 120);
    }
    if (isSolved(game.tubes)) {
      busy = true;
      flow.won(screen, game.level, `Poziom ${game.level} ukończony w ${game.moves} ruchach`, startLevel, 450);
      setTimeout(() => { busy = false; }, 450);
      if (!flow.daily) prefetch(game.level + 1);
    }
  }

  const onClick = (e: MouseEvent) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.tube');
    if (t) onTubeTap(Number(t.dataset.i));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = (e.target as HTMLElement).closest<HTMLElement>('.tube');
    if (!t) return;
    e.preventDefault();
    const i = Number(t.dataset.i);
    onTubeTap(i);
    tubeEl(i)?.focus();
  };
  boardEl.addEventListener('click', onClick);
  boardEl.addEventListener('keydown', onKey);

  startLevel(flow.initial);

  return () => {
    alive = false;
    stopObserve();
    screen.destroy();
  };
}

export const ballsort: GameModule = {
  id: ID,
  title: INFO.title,
  tagline: 'Ułóż kolory w probówkach',
  dailyLevel: 30,
  icon: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M10 8v26a6 6 0 0 0 12 0V8" fill="rgba(255,255,255,.35)" stroke="currentColor" stroke-width="2.5"/>
    <path d="M26 8v26a6 6 0 0 0 12 0V8" fill="rgba(255,255,255,.35)" stroke="currentColor" stroke-width="2.5"/>
    <circle cx="16" cy="34" r="4.6" fill="#ef4444"/><circle cx="16" cy="24.5" r="4.6" fill="#3b82f6"/><circle cx="16" cy="15" r="4.6" fill="#facc15"/>
    <circle cx="32" cy="34" r="4.6" fill="#22c55e"/><circle cx="32" cy="24.5" r="4.6" fill="#22c55e"/>
  </svg>`,
  mount,
};
