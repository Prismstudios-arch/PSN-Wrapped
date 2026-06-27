import * as Haptics from 'expo-haptics';

/**
 * Haptics helpers. Thin wrappers so call sites read intent ("tap", "success")
 * and so we can globally gate haptics later if needed. All are best-effort and
 * never throw (haptics are unavailable on some devices/simulators).
 */
export const haptics = {
  tap(): void {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  select(): void {
    Haptics.selectionAsync().catch(() => undefined);
  },
  success(): void {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning(): void {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
  error(): void {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
  },
};
