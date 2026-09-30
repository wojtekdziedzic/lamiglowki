import type { GameModule } from './types';
import { ICONS, muteButton } from './ui';
import { average, formatTime, loadStats } from './stats';

export const STATS_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 20h16"/><path d="M7 16v-5"/><path d="M12 16V6"/><path d="M17 16v-8"/></svg>`;

/** Per-game solve count, best time and recent average. */
export function renderStats(root: HTMLElement, games: GameModule[], back: () => void): () => void {
  root.innerHTML = `
    <div class="app menu">
      <header>
        <button class="icon-btn" data-back aria-label="Wróć do menu" title="Menu">${ICONS.back}</button>
        <div class="titles"><h1>Statystyki</h1><span class="moves">Czas ułożenia w każdej grze</span></div>
      </header>
      <ul class="menu-grid" role="list"></ul>
    </div>`;
  root.querySelector('header')!.appendChild(muteButton());
  root.querySelector('[data-back]')!.addEventListener('click', back);
  const list = root.querySelector('.menu-grid')!;
  for (const g of games) {
    const s = loadStats(g.id);
    const li = document.createElement('li');
    li.className = 'menu-card stats-card';
    li.innerHTML = `<span class="menu-icon">${g.icon}</span>
      <span class="menu-text"><strong></strong><span class="menu-tag"></span></span>
      <span class="stats-best"></span>`;
    li.querySelector('strong')!.textContent = g.title;
    li.querySelector('.menu-tag')!.textContent = s.solved
      ? `Ułożone: ${s.solved} · średnio ${formatTime(average(s))} (ostatnie ${s.recent.length})`
      : 'Jeszcze nie ułożone';
    const best = li.querySelector<HTMLElement>('.stats-best')!;
    if (s.bestMs) best.innerHTML = `<small>rekord</small>${formatTime(s.bestMs)}`;
    list.appendChild(li);
  }
  return () => { root.textContent = ''; };
}
