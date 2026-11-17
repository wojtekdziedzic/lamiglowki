import { FREE_LEVELS, buy, canBuy, playUrl, priceString, restore } from './premium';

export interface PaywallOpts {
  /** The full version was bought or restored. */
  onUnlocked(): void;
  /** Closed without unlocking. */
  onClose(): void;
}

/** Card offering the one-time unlock; returns its close function (no callback). */
export function showPaywall({ onUnlocked, onClose }: PaywallOpts): () => void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay show';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="card paywall">
      <h2>Pełna wersja</h2>
      <p class="paywall-text"></p>
      <ul class="rules">
        <li>wszystkie poziomy we wszystkich 11 grach</li>
        <li>jednorazowo, bez subskrypcji i bez reklam</li>
        <li>zagadka dnia zostaje darmowa</li>
      </ul>
      <p class="paywall-status" role="status"></p>
      <button class="primary" data-buy>Odblokuj</button>
      <div class="paywall-more">
        <button class="text-btn" data-restore>Przywróć zakup</button>
        <button class="text-btn" data-close>Nie teraz</button>
      </div>
    </div>`;
  overlay.querySelector('.paywall-text')!.textContent =
    `Darmowe ${FREE_LEVELS} poziomów tej gry za Tobą. Gratulacje!`;
  const status = overlay.querySelector<HTMLElement>('.paywall-status')!;
  const buyBtn = overlay.querySelector<HTMLButtonElement>('[data-buy]')!;
  const restoreBtn = overlay.querySelector<HTMLButtonElement>('[data-restore]')!;
  document.body.appendChild(overlay);
  buyBtn.focus();

  let open = true;
  const close = () => {
    open = false;
    overlay.remove();
  };
  const busy = (v: boolean) => {
    buyBtn.disabled = v;
    restoreBtn.disabled = v;
  };
  const unlockedNow = () => {
    close();
    onUnlocked();
  };

  void canBuy().then(async (ok) => {
    if (!open) return;
    if (!ok) {
      // Website APK or browser: purchases only work in the Google Play version.
      buyBtn.textContent = 'Pobierz z Google Play';
      restoreBtn.hidden = true;
      return;
    }
    const price = await priceString();
    if (open && price) buyBtn.textContent = `Odblokuj za ${price}`;
  });

  buyBtn.addEventListener('click', async () => {
    if (buyBtn.textContent === 'Pobierz z Google Play') {
      window.open(playUrl, '_blank');
      return;
    }
    busy(true);
    status.textContent = '';
    const result = await buy();
    if (!open) return;
    busy(false);
    if (result === 'unlocked') unlockedNow();
    else if (result === 'pending') status.textContent = 'Płatność oczekuje. Poziomy odblokują się, gdy Google ją potwierdzi.';
    else if (result === 'error') status.textContent = 'Nie udało się. Sprawdź internet i spróbuj ponownie.';
    else if (result === 'unavailable') status.textContent = 'Zakupy działają tylko w wersji z Google Play.';
  });
  restoreBtn.addEventListener('click', async () => {
    busy(true);
    status.textContent = '';
    const ok = await restore();
    if (!open) return;
    busy(false);
    if (ok) unlockedNow();
    else status.textContent = 'Nie znaleziono zakupu na tym koncie Google.';
  });
  overlay.querySelector('[data-close]')!.addEventListener('click', () => {
    close();
    onClose();
  });
  return close;
}
