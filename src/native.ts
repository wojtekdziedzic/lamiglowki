import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export interface NativeHooks {
  /** Hardware back button; return true if handled, false to leave the app. */
  onBack(): boolean;
}

/** Native-only tweaks; no-op in the browser. */
export function initNative(hooks: NativeHooks): void {
  if (!Capacitor.isNativePlatform()) return;
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  // Style.Dark = light icons for the dark background, and vice versa.
  const sync = () => void StatusBar.setStyle({ style: dark.matches ? Style.Dark : Style.Light }).catch(() => {});
  sync();
  dark.addEventListener('change', sync);
  void App.addListener('backButton', () => {
    if (!hooks.onBack()) void App.exitApp();
  });
}
