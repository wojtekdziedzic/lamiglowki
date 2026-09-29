import './style.css';
import { CAP, COLORS } from './config';
import { isSolved, isTubeDone, type State } from './rules';
import { generate } from './generator';
import { Game } from './game';
import { loadLevel, saveLevel } from './storage';
import { isMuted, setMuted, sfx } from './audio';
import { haptic } from './haptics';
import { bounce, confetti, reducedMotion } from './fx';
import { initNative } from './native';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const boardEl = $('board');
const game = new Game();
let selected = -1;
let busy = false;

// ---------- level cache (next level is prepared while the win card is shown) ----------
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

// ---------- rendering ----------
interface RenderOpts {
  hidden?: { tube: number; index: number };
  closing?: number;
}

function render(opts: RenderOpts = {}): void {
  boardEl.textContent = '';
  game.tubes.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'tube';
    const done = isTubeDone(t);
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
      if (opts.hidden && opts.hidden.tube === i && opts.hidden.index === k) b.classList.add('hidden');
      el.appendChild(b);
    });
    if (done) {
      const cork = document.createElement('div');
      cork.className = 'cork';
      el.appendChild(cork);
    }
    boardEl.appendChild(el);
  });
  $('title').textContent = `Poziom ${game.level}`;
  $('moves').textContent = `Ruchy: ${game.moves}`;
  $('undoBadge').textContent = String(game.undosLeft);
  $('tubeBadge').textContent = String(game.extraTubesLeft);
  $<HTMLButtonElement>('btnUndo').disabled = !game.canUndo;
  $<HTMLButtonElement>('btnTube').disabled = game.extraTubesLeft <= 0;
  fitBoard();
}

// Pick column count and tube width so the whole board fits the available area
function fitBoard(): void {
  const wrap = boardEl.parentElement!;
  const W = wrap.clientWidth, H = wrap.clientHeight;
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
window.addEventListener('resize', () => { if (!busy) fitBoard(); });

const tubeEl = (i: number) => boardEl.children[i] as HTMLElement;

function shake(i: number): void {
  const el = tubeEl(i);
  el.classList.remove('nope');
  void el.offsetWidth;
  el.classList.add('nope');
  sfx.nope();
  haptic.nope();
}

// ---------- game flow ----------
function startLevel(l: number): void {
  saveLevel(l);
  game.start(l, levelLayout(l));
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

function doMove(from: number, to: number): void {
  const fromRect = (tubeEl(from).lastElementChild as HTMLElement).getBoundingClientRect();
  const color = game.tubes[from][game.tubes[from].length - 1];

  game.move(from, to);
  selected = -1;
  const height = game.tubes[to].length - 1;
  const closing = isTubeDone(game.tubes[to]) ? to : undefined;
  // Render without the closing flag first so the cork animates only after the ball lands.
  render({ hidden: { tube: to, index: height } });

  const destBall = tubeEl(to).children[height] as HTMLElement;
  const toRect = destBall.getBoundingClientRect();
  const destTubeRect = tubeEl(to).getBoundingClientRect();

  if (reducedMotion() || !destBall.animate) { land(destBall, height, closing); return; }

  busy = true;
  const fly = document.createElement('div');
  fly.className = 'ball fly';
  fly.style.setProperty('--c', COLORS[color]);
  fly.style.setProperty('--rot', `${(color * 47) % 360}deg`);
  fly.style.width = fromRect.width + 'px';
  fly.style.height = fromRect.height + 'px';
  fly.style.left = '0px';
  fly.style.top = '0px';
  boardEl.parentElement!.appendChild(fly);

  const aboveY = destTubeRect.top - fromRect.height * 1.1;
  const hoverY = Math.min(fromRect.top, aboveY);
  const anim = fly.animate([
    { transform: `translate(${fromRect.left}px, ${fromRect.top}px)` },
    { transform: `translate(${fromRect.left}px, ${hoverY}px)`, offset: 0.15 },
    { transform: `translate(${toRect.left}px, ${aboveY}px)`, offset: 0.6 },
    { transform: `translate(${toRect.left}px, ${toRect.top}px)` },
  ], { duration: 360, easing: 'ease-in-out' });
  // Animations stall while the page is hidden (app sent to background mid-move):
  // a timer guarantees the move completes and input is never locked.
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    anim.cancel();
    fly.remove();
    busy = false;
    land(destBall, height, closing);
  };
  anim.onfinish = finish;
  setTimeout(finish, 600);
}

function land(destBall: HTMLElement, height: number, closing?: number): void {
  destBall.classList.remove('hidden');
  bounce(destBall);
  sfx.land(height);
  haptic.tap();
  if (closing !== undefined) {
    render({ closing });
    setTimeout(() => { sfx.close(); haptic.success(); }, 120);
  }
  if (isSolved(game.tubes)) {
    busy = true;
    setTimeout(() => {
      busy = false;
      $('winText').textContent = `Poziom ${game.level} ukończony w ${game.moves} ruchach`;
      $('winOverlay').classList.add('show');
      $('btnNext').focus();
      sfx.win();
      confetti();
      prefetch(game.level + 1);
    }, 450);
  }
}

// ---------- events ----------
boardEl.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('.tube');
  if (t) onTubeTap(Number(t.dataset.i));
});
boardEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = (e.target as HTMLElement).closest<HTMLElement>('.tube');
  if (!t) return;
  e.preventDefault();
  const i = Number(t.dataset.i);
  onTubeTap(i);
  tubeEl(i)?.focus();
});
$('btnUndo').addEventListener('click', () => {
  if (busy || !game.undo()) return;
  selected = -1;
  sfx.pick();
  render();
});
$('btnTube').addEventListener('click', () => {
  if (busy || !game.addTube()) return;
  selected = -1;
  sfx.pick();
  render();
});
$('btnRestart').addEventListener('click', () => {
  if (busy) return;
  game.reset(); // also removes the extra tube
  selected = -1;
  render();
});
$('btnNext').addEventListener('click', () => {
  $('winOverlay').classList.remove('show');
  startLevel(game.level + 1);
});

const muteBtn = $('btnMute');
function syncMute(): void {
  muteBtn.setAttribute('aria-pressed', String(isMuted()));
  muteBtn.setAttribute('aria-label', isMuted() ? 'Włącz dźwięk' : 'Wycisz dźwięk');
}
muteBtn.addEventListener('click', () => { setMuted(!isMuted()); syncMute(); });
syncMute();

initNative();
startLevel(loadLevel());
