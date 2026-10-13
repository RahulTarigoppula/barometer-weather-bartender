import { isNative } from './native';

export type Haptic = 'light' | 'medium' | 'heavy' | 'selection' | 'warning';

let enabled = true;
export const setHapticsEnabled = (on: boolean): void => {
  enabled = on;
};

/** The §3.13 haptics map. On the web only the pin drop vibrates (12 ms); everything else is native-only. */
export async function haptic(kind: Haptic): Promise<void> {
  if (!enabled) return;
  try {
    if (!isNative()) {
      // Only after a real gesture: the opening pour happens before the user has touched anything.
      const activated = navigator.userActivation?.hasBeenActive ?? false;
      if (kind === 'medium' && activated && 'vibrate' in navigator) navigator.vibrate(12);
      return;
    }
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (kind === 'selection') await Haptics.selectionChanged();
    else if (kind === 'warning') await Haptics.notification({ type: NotificationType.Warning });
    else {
      const style = kind === 'light' ? ImpactStyle.Light : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Heavy;
      await Haptics.impact({ style });
    }
  } catch {
    // haptics are a garnish; never let them break a pour
  }
}
