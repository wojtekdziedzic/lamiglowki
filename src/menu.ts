import type { GameModule } from './types';
import { loadLevel } from './storage';
import { muteButton } from './ui';
import { DAILY_ICON, solvedToday, streak, streakLabel } from './daily';

export function renderMenu(root: HTMLElement, games: GameModule[], open: (route: string) => void): () => void {
  root.innerHTML = `
    <div class="app menu">
      <header><h1>Łamigłówki</h1></header>
      <ul class="menu-grid" role="list"></ul>
    </div>`;
  root.querySelector('header')!.appendChild(muteButton());
  const list = root.querySelector('.menu-grid')!;

  const card = (icon: string, title: string, tag: string, badge: string, route: string, extra = '') => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = `menu-card ${extra}`.trim();
    btn.innerHTML = `<span class="menu-icon">${icon}</span>
      <span class="menu-text"><strong></strong><span class="menu-tag"></span></span>
      <span class="menu-level"></span>`;
    btn.querySelector('strong')!.textContent = title;
    btn.querySelector('.menu-tag')!.textContent = tag;
    btn.querySelector('.menu-level')!.textContent = badge;
    btn.addEventListener('click', () => open(route));
    li.appendChild(btn);
    list.appendChild(li);
  };

  const done = solvedToday().size;
  card(DAILY_ICON, 'Zagadka dnia', `Dziś ułożone: ${done} z ${games.length}`, streakLabel(streak()), 'daily', 'daily-card');
  for (const g of games) card(g.icon, g.title, g.tagline, `Poziom ${loadLevel(g.id)}`, g.id);
  return () => { root.textContent = ''; };
}
