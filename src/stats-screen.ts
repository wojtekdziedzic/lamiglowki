import type { GameModule } from './types';
import { ICONS, muteButton } from './ui';
import { average, formatTime, loadStats, sortedSizes } from './stats';

export const STATS_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 20h16"/><path d="M7 16v-5"/><path d="M12 16V6"/><path d="M17 16v-8"/></svg>`;

/** Per game and board size: solve count, best time and recent average. */
export function renderStats(root: HTMLElement, games: GameModule[], back: () => void): () => void {
  root.innerHTML = `
    <div class="app menu">
      <header>
        <button class="icon-btn" data-back aria-label="Wróć do menu" title="Menu">${ICONS.back}</button>
        <div class="titles"><h1>Statystyki</h1><span class="moves">Rekordy osobno dla każdego rozmiaru planszy</span></div>
      </header>
      <ul class="menu-grid" role="list"></ul>
    </div>`;
  root.querySelector('header')!.appendChild(muteButton());
  root.querySelector('[data-back]')!.addEventListener('click', back);
  const list = root.querySelector('.menu-grid')!;
  for (const g of games) {
    const all = loadStats(g.id);
    const sizes = sortedSizes(all);
    const li = document.createElement('li');
    li.className = 'menu-card stats-card';
    li.innerHTML = `<span class="menu-icon">${g.icon}</span>
      <span class="menu-text"><strong></strong><span class="stats-rows"></span></span>`;
    li.querySelector('strong')!.textContent = g.title;
    const rows = li.querySelector('.stats-rows')!;
    if (!sizes.length) {
      rows.innerHTML = '<span class="menu-tag">Jeszcze nie ułożone</span>';
    }
    for (const size of sizes) {
      const s = all[size];
      const row = document.createElement('span');
      row.className = 'stats-row';
      row.innerHTML = '<b></b><span></span><em></em>';
      row.querySelector('b')!.textContent = size;
      row.querySelector('span')!.textContent = `${s.solved}× · śr. ${formatTime(average(s))}`;
      row.querySelector('em')!.innerHTML = `<small>rekord</small> ${formatTime(s.bestMs)}`;
      rows.appendChild(row);
    }
    list.appendChild(li);
  }
  return () => { root.textContent = ''; };
}
