import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE, type Transaction } from '@capgo/native-purchases';

/** One-time Google Play product that unlocks every level of every game. */
export const PRODUCT_ID = 'unlock_all';
/** Regular levels playable for free in each game; the daily puzzle is always free. */
export const FREE_LEVELS = 10;

const KEY = 'premium.unlocked';
const PLAY_URL = 'https://play.google.com/store/apps/details?id=cloud.dziedzic.lamiglowki';

function cached(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
function cache(v: boolean): void {
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* storage unavailable */ }
}

let unlocked = cached();

export const isUnlocked = (): boolean => unlocked;

/** Whether this level needs the full version. */
export const isLocked = (level: number): boolean => level > FREE_LEVELS && !unlocked;

const owns = (purchases: Transaction[]) =>
  purchases.some((p) => p.productIdentifier === PRODUCT_ID && (p.purchaseState ?? '1') === '1');

/** Google Play billing is only there in the Play build on a phone with Play services. */
async function billing(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    return (await NativePurchases.isBillingSupported()).isBillingSupported;
  } catch {
    return false;
  }
}

/**
 * Syncs the unlock with Google Play on start: restores it on a new phone and drops it
 * after a refund. Offline or without Play the last known state stays.
 */
export async function refreshPremium(): Promise<void> {
  if (!(await billing())) return;
  try {
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    unlocked = owns(purchases);
    cache(unlocked);
  } catch {
    /* keep the cached state */
  }
}

/** Price as Google Play shows it to this user, e.g. "9,99 zł"; null when unknown. */
export async function priceString(): Promise<string | null> {
  if (!(await billing())) return null;
  try {
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [PRODUCT_ID],
      productType: PURCHASE_TYPE.INAPP,
    });
    return products[0]?.priceString ?? null;
  } catch {
    return null;
  }
}

export type BuyResult = 'unlocked' | 'pending' | 'cancelled' | 'unavailable' | 'error';

export async function buy(): Promise<BuyResult> {
  if (!(await billing())) return 'unavailable';
  try {
    const t = await NativePurchases.purchaseProduct({
      productIdentifier: PRODUCT_ID,
      productType: PURCHASE_TYPE.INAPP,
    });
    if ((t.purchaseState ?? '1') !== '1') return 'pending';
    unlocked = true;
    cache(true);
    return 'unlocked';
  } catch (err) {
    const text = String((err as { message?: string })?.message ?? err).toLowerCase();
    return /cancel/.test(text) ? 'cancelled' : 'error';
  }
}

/** Asks Google Play again, e.g. after reinstalling; true when the unlock is there. */
export async function restore(): Promise<boolean> {
  if (!(await billing())) return false;
  try {
    await NativePurchases.restorePurchases();
  } catch {
    /* getPurchases below still answers */
  }
  await refreshPremium();
  return unlocked;
}

export const canBuy = billing;
export const playUrl = PLAY_URL;
