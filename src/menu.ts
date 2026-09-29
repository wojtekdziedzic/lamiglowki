import type { GameModule } from './types';
import { loadLevel } from './storage';
import { muteButton } from './ui';

export function renderMenu(root: HTMLElement, games: GameModule[], open: (id: string) => void): () => void {
  root.innerHTML = `
    <div class="app menu">
      <header><h1>Łamigłówki</h1></header>
      <ul class="menu-grid" role="list"></ul>
    </div>`;
  root.querySelector('header')!.appendChild(muteButton());
  const list = root.querySelector('.menu-grid')!;
  for (const g of games) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'menu-card';
    btn.innerHTML = `<span class="menu-icon">${g.icon}</span>
      <span class="menu-text"><strong></strong><span class="menu-tag"></span></span>
      <span class="menu-level"></span>`;
    btn.querySelector('strong')!.textContent = g.title;
    btn.querySelector('.menu-tag')!.textContent = g.tagline;
    btn.querySelector('.menu-level')!.textContent = `Poziom ${loadLevel(g.id)}`;
    btn.addEventListener('click', () => open(g.id));
    li.appendChild(btn);
    list.appendChild(li);
  }
  return () => { root.textContent = ''; };
}
