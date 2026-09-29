import { isMuted, setMuted, sfx } from './audio';
import { confetti } from './fx';
import { haptic } from './haptics';
import { loadJSON, loadLevel, saveJSON, saveLevel } from './storage';
import type { GameContext } from './types';

const svg = (body: string, width = 2.4) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  back: svg('<path d="m15 18-6-6 6-6"/>', 2.6),
  restart: svg('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>'),
  undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  tube: svg('<path d="M13 3h8"/><path d="M14 3v14a3 3 0 0 0 6 0V3"/><path d="M3 12h7"/><path d="M6.5 8.5v7"/>'),
  pencil: svg('<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="m15 5 4 4"/>'),
  flag: svg('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
  erase: svg('<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 19"/><path d="M22 21H7"/><path d="m5 11 9 9"/>'),
  sound: svg('<path d="M11 5 6 9H3v6h3l5 4z"/><path class="wave" d="M15.5 8.5a5 5 0 0 1 0 7"/><path class="wave" d="M18.5 5.5a9 9 0 0 1 0 13"/><path class="cross" d="m16 9 6 6"/><path class="cross" d="m22 9-6 6"/>', 2.2),
  info: svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><path d="M12 7.2v.1"/>', 2.4),
};

/** What the header and the rules card show for a game. */
export interface GameInfo {
  id: string;
  title: string;
  /** Short rule bullets, shown under the "i" button and on the first visit. */
  rules: string[];
}

export interface ToolOpts {
  icon: string;
  label: string;
  onClick: () => void;
  badge?: boolean;
}

export interface Tool {
  el: HTMLButtonElement;
  setBadge(v: string | number): void;
  setDisabled(v: boolean): void;
  setPressed(v: boolean): void;
}

export interface Screen {
  wrap: HTMLElement;       // flexible area between header and toolbar
  toolbar: HTMLElement;
  /** First part of the subtitle: "Poziom 12" or "Zagadka dnia". */
  setLevel(t: string): void;
  /** Rest of the subtitle: moves, board size, counters. */
  setStatus(t: string): void;
  tool(opts: ToolOpts): Tool;
  /** Registers the open win card so leaving the game also closes it. */
  setWinCloser(fn: (() => void) | null): void;
  /** False once the player has left the game. */
  readonly alive: boolean;
  destroy(): void;
}

export function muteButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'icon-btn';
  btn.title = 'Dźwięk';
  btn.innerHTML = ICONS.sound;
  const sync = () => {
    btn.setAttribute('aria-pressed', String(isMuted()));
    btn.setAttribute('aria-label', isMuted() ? 'Włącz dźwięk' : 'Wycisz dźwięk');
  };
  btn.addEventListener('click', () => { setMuted(!isMuted()); sync(); });
  sync();
  return btn;
}

/** Rules card; returns its close function. */
function showRules(info: GameInfo, onClose: () => void): () => void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay show';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `<div class="card rules-card"><h2></h2><ul class="rules"></ul><button class="primary">Rozumiem</button></div>`;
  overlay.querySelector('h2')!.textContent = info.title;
  const list = overlay.querySelector('.rules')!;
  for (const rule of info.rules) {
    const li = document.createElement('li');
    li.textContent = rule;
    list.appendChild(li);
  }
  document.body.appendChild(overlay);
  const btn = overlay.querySelector<HTMLButtonElement>('.primary')!;
  btn.focus();
  const close = () => { overlay.remove(); onClose(); };
  btn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  return close;
}

/** Standard game layout: header (back, game name, level and status, info, mute), board area, toolbar. */
export function gameScreen(root: HTMLElement, onBack: () => void, info: GameInfo): Screen {
  root.innerHTML = `
    <div class="app">
      <header>
        <button class="icon-btn" data-back aria-label="Wróć do menu" title="Menu">${ICONS.back}</button>
        <div class="titles"><h1></h1><span class="moves"></span></div>
        <button class="icon-btn" data-info aria-label="Jak grać" title="Jak grać">${ICONS.info}</button>
      </header>
      <div class="board-wrap"></div>
      <div class="toolbar"></div>
    </div>`;
  const header = root.querySelector('header')!;
  header.appendChild(muteButton());
  root.querySelector('[data-back]')!.addEventListener('click', onBack);
  root.querySelector('h1')!.textContent = info.title;
  const status = root.querySelector<HTMLElement>('.moves')!;
  const toolbar = root.querySelector<HTMLElement>('.toolbar')!;
  let closeWin: (() => void) | null = null;
  let closeRules: (() => void) | null = null;
  let alive = true;
  let levelText = '';
  let statusText = '';
  const syncSubtitle = () => { status.textContent = [levelText, statusText].filter(Boolean).join(' · '); };

  const openRules = () => {
    if (closeRules) return;
    closeRules = showRules(info, () => { closeRules = null; });
  };
  root.querySelector('[data-info]')!.addEventListener('click', openRules);
  // First visit to a game explains it once.
  const seenKey = `${info.id}.rulesSeen`;
  if (!loadJSON<boolean>(seenKey)) {
    saveJSON(seenKey, true);
    setTimeout(() => { if (alive) openRules(); }, 250);
  }

  return {
    wrap: root.querySelector<HTMLElement>('.board-wrap')!,
    toolbar,
    setLevel: (t) => { levelText = t; syncSubtitle(); },
    setStatus: (t) => { statusText = t; syncSubtitle(); },
    tool({ icon, label, onClick, badge }) {
      const el = document.createElement('button');
      el.className = 'tool';
      el.setAttribute('aria-label', label);
      el.title = label;
      el.innerHTML = icon;
      let badgeEl: HTMLSpanElement | null = null;
      if (badge) {
        badgeEl = document.createElement('span');
        badgeEl.className = 'badge';
        el.appendChild(badgeEl);
      }
      el.addEventListener('click', onClick);
      toolbar.appendChild(el);
      return {
        el,
        setBadge: (v) => { if (badgeEl) badgeEl.textContent = String(v); },
        setDisabled: (v) => { el.disabled = v; },
        setPressed: (v) => { el.setAttribute('aria-pressed', String(v)); },
      };
    },
    setWinCloser: (fn) => { closeWin = fn; },
    get alive() { return alive; },
    destroy() {
      alive = false;
      closeWin?.();
      closeRules?.();
      root.textContent = '';
    },
  };
}

export interface WinOpts {
  title?: string;
  text: string;
  button?: string;
  /** Loss card: no confetti, a gentle sound instead of the fanfare. */
  lost?: boolean;
  onNext: () => void;
}

/** Celebration card with sound and confetti. Returns a function that closes it. */
export function showWin(screen: Screen, { title = 'Brawo!', text, button = 'Następny poziom', lost = false, onNext }: WinOpts): () => void {
  if (!screen.alive) return () => {}; // the player left before a delayed card fired
  const overlay = document.createElement('div');
  overlay.className = 'overlay show';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `<div class="card"><h2></h2><p></p><button class="primary"></button></div>`;
  overlay.querySelector('h2')!.textContent = title;
  overlay.querySelector('p')!.textContent = text;
  const btn = overlay.querySelector<HTMLButtonElement>('.primary')!;
  btn.textContent = button;
  document.body.appendChild(overlay);
  btn.focus();
  if (lost) {
    sfx.nope();
    haptic.nope();
  } else {
    sfx.win();
    haptic.success();
    confetti();
  }

  const close = () => {
    overlay.remove();
    screen.setWinCloser(null);
  };
  screen.setWinCloser(close);
  btn.addEventListener('click', () => { close(); onNext(); });
  return close;
}

/**
 * Level bookkeeping shared by all games: regular play advances and persists the level,
 * the daily puzzle plays one fixed board and reports back instead.
 */
export interface LevelFlow {
  daily: boolean;
  /** Level to open with. */
  initial: number;
  /** Seed salt for the generators (0 for regular levels). */
  salt: number;
  /** Subtitle lead: "Poziom 12", or "Zagadka dnia" for the daily board. */
  label(level: number): string;
  /** Call when a level starts. */
  enter(level: number): void;
  /** Call the moment the board is solved; shows the card after a short delay. */
  won(screen: Screen, level: number, text: string, next: (level: number) => void, delayMs?: number): void;
}

export function levelFlow(id: string, ctx: GameContext): LevelFlow {
  const daily = ctx.daily;
  return {
    daily: !!daily,
    initial: daily ? daily.level : loadLevel(id),
    salt: daily ? daily.salt : 0,
    label: (level) => (daily ? 'Zagadka dnia' : `Poziom ${level}`),
    enter(level) { if (!daily) saveLevel(id, level); },
    won(screen, level, text, next, delayMs = 300) {
      // Persist right away so leaving before tapping "next" keeps the progress.
      if (daily) daily.solved();
      else saveLevel(id, level + 1);
      setTimeout(() => {
        if (daily) showWin(screen, { text: 'Zagadka dnia rozwiązana', button: 'Wróć', onNext: ctx.back });
        else showWin(screen, { text, onNext: () => next(level + 1) });
      }, delayMs);
    },
  };
}

/** Calls cb with the element's content size now and on every resize; returns the disconnect. */
export function observeSize(el: HTMLElement, cb: (w: number, h: number) => void): () => void {
  const ro = new ResizeObserver(() => cb(el.clientWidth, el.clientHeight));
  ro.observe(el);
  cb(el.clientWidth, el.clientHeight);
  return () => ro.disconnect();
}
