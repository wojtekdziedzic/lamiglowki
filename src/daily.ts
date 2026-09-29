import type { GameModule } from './types';
import { loadJSON, saveJSON } from './storage';
import { ICONS, muteButton } from './ui';

/** Local calendar day as a number: the same for everyone on that date, used as the seed salt. */
export function today(now = new Date()): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
}

const doneKey = (day: number) => `daily.done.${day}`;
const STREAK_KEY = 'daily.streak';
interface Streak { last: number; count: number }

export function solvedToday(day = today()): Set<string> {
  return new Set(loadJSON<string[]>(doneKey(day)) ?? []);
}

/** Records a solved daily board; the streak counts days with at least one solved puzzle. */
export function markSolved(id: string, day = today()): void {
  const done = solvedToday(day);
  done.add(id);
  saveJSON(doneKey(day), [...done]);
  const s = loadJSON<Streak>(STREAK_KEY);
  if (s?.last === day) return;
  saveJSON(STREAK_KEY, { last: day, count: s?.last === day - 1 ? s.count + 1 : 1 } satisfies Streak);
}

/** Current streak: still alive if the last solved day is today or yesterday. */
export function streak(day = today()): number {
  const s = loadJSON<Streak>(STREAK_KEY);
  return s && (s.last === day || s.last === day - 1) ? s.count : 0;
}

export const dayLabel = (now = new Date()) =>
  now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

export const streakLabel = (n: number) => `Seria: ${n} ${n === 1 ? 'dzień' : 'dni'}`;

export const DAILY_ICON = `<svg viewBox="0 0 48 48" aria-hidden="true">
  <rect x="7" y="10" width="34" height="31" rx="6" fill="rgba(255,255,255,.55)" stroke="currentColor" stroke-width="2.5"/>
  <path d="M7 19h34" stroke="currentColor" stroke-width="2.5"/><path d="M16 6v8M32 6v8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M24 23.5l2.4 4.9 5.4.8-3.9 3.8.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.9-3.8 5.4-.8z" fill="#facc15" stroke="#f59e0b" stroke-width="1"/>
</svg>`;

/** Today's list: one board per game, solved ones ticked. */
export function renderDaily(root: HTMLElement, games: GameModule[], open: (id: string) => void, back: () => void): () => void {
  const done = solvedToday();
  root.innerHTML = `
    <div class="app menu">
      <header>
        <button class="icon-btn" data-back aria-label="Wróć do menu" title="Menu">${ICONS.back}</button>
        <div class="titles"><h1>Zagadka dnia</h1><span class="moves"></span></div>
      </header>
      <p class="daily-note"></p>
      <ul class="menu-grid" role="list"></ul>
    </div>`;
  root.querySelector('header')!.appendChild(muteButton());
  root.querySelector('[data-back]')!.addEventListener('click', back);
  root.querySelector('.moves')!.textContent = dayLabel();
  root.querySelector('.daily-note')!.textContent =
    `${streakLabel(streak())} · dziś ${done.size} z ${games.length}. Plansze są dziś takie same dla wszystkich.`;
  const list = root.querySelector('.menu-grid')!;
  for (const g of games) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'menu-card';
    const solved = done.has(g.id);
    btn.innerHTML = `<span class="menu-icon">${g.icon}</span>
      <span class="menu-text"><strong></strong><span class="menu-tag"></span></span>
      <span class="menu-level${solved ? ' done' : ''}"></span>`;
    btn.querySelector('strong')!.textContent = g.title;
    btn.querySelector('.menu-tag')!.textContent = g.tagline;
    btn.querySelector('.menu-level')!.textContent = solved ? 'Ułożone ✓' : 'Graj';
    btn.addEventListener('click', () => open(g.id));
    li.appendChild(btn);
    list.appendChild(li);
  }
  return () => { root.textContent = ''; };
}
