import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isMuted } from './audio';

const native = Capacitor.isNativePlatform();

function vibrate(ms: number | number[]): void {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
}

// Haptics follow the mute toggle: a muted game should also be a quiet one.
export const haptic = {
  tap(): void {
    if (isMuted()) return;
    if (native) void Haptics.impact({ style: ImpactStyle.Light });
    else vibrate(8);
  },
  nope(): void {
    if (isMuted()) return;
    if (native) void Haptics.notification({ type: NotificationType.Warning });
    else vibrate([20, 40, 20]);
  },
  success(): void {
    if (isMuted()) return;
    if (native) void Haptics.notification({ type: NotificationType.Success });
    else vibrate(30);
  },
};
