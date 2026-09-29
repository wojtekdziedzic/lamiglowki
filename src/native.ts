import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/** Native-only tweaks; no-op in the browser. */
export function initNative(): void {
  if (!Capacitor.isNativePlatform()) return;
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  // Style.Dark = light icons for the dark background, and vice versa.
  const sync = () => void StatusBar.setStyle({ style: dark.matches ? Style.Dark : Style.Light }).catch(() => {});
  sync();
  dark.addEventListener('change', sync);
}
