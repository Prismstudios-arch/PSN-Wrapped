import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getColors,
  radius,
  spacing,
  TEXT_SCALE_RANGE,
  typeScale,
  type ThemeColors,
} from './tokens';

/**
 * Theme + accessibility context. Everything visual reads from here so the three
 * required accessibility controls — reduce-motion, high-contrast, text-scaling —
 * are honored app-wide with no per-screen wiring.
 */
export interface AccessibilityPrefs {
  reduceMotion: boolean;
  highContrast: boolean;
  textScale: number;
}

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  /** Scale a font size by the user's text-scale, clamped to a safe range. */
  fontSize: (size: number) => number;
  type: typeof typeScale;
}

interface ThemeContextValue {
  theme: Theme;
  prefs: AccessibilityPrefs;
  /** User override of reduce-motion (system default applies until they touch it). */
  setReduceMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setTextScale: (v: number) => void;
  ready: boolean;
}

const STORAGE_KEY = 'endcard.a11y.v1';
const DEFAULT_PREFS: AccessibilityPrefs = { reduceMotion: false, highContrast: false, textScale: 1 };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function clampScale(v: number): number {
  const { min, max } = TEXT_SCALE_RANGE;
  return Math.min(max, Math.max(min, Math.round(v * 100) / 100));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_PREFS);
  const [userSetMotion, setUserSetMotion] = useState(false);
  const [ready, setReady] = useState(false);

  // Load persisted prefs once.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && raw) {
          const saved = JSON.parse(raw) as Partial<AccessibilityPrefs> & { userSetMotion?: boolean };
          setPrefs((p) => ({
            reduceMotion: saved.reduceMotion ?? p.reduceMotion,
            highContrast: saved.highContrast ?? p.highContrast,
            textScale: clampScale(saved.textScale ?? p.textScale),
          }));
          if (saved.userSetMotion) setUserSetMotion(true);
        }
      } catch {
        // ignore — fall back to defaults
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Respect the OS reduce-motion setting until the user overrides it in-app.
  useEffect(() => {
    if (userSetMotion) return;
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => active && setPrefs((p) => ({ ...p, reduceMotion: v })))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (!userSetMotion) setPrefs((p) => ({ ...p, reduceMotion: v }));
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [userSetMotion]);

  const persist = useCallback((next: AccessibilityPrefs, userMotion: boolean) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, userSetMotion: userMotion })).catch(
      () => undefined,
    );
  }, []);

  const setReduceMotion = useCallback(
    (v: boolean) => {
      setUserSetMotion(true);
      setPrefs((p) => {
        const next = { ...p, reduceMotion: v };
        persist(next, true);
        return next;
      });
    },
    [persist],
  );

  const setHighContrast = useCallback(
    (v: boolean) => {
      setPrefs((p) => {
        const next = { ...p, highContrast: v };
        persist(next, userSetMotion);
        return next;
      });
    },
    [persist, userSetMotion],
  );

  const setTextScale = useCallback(
    (v: number) => {
      setPrefs((p) => {
        const next = { ...p, textScale: clampScale(v) };
        persist(next, userSetMotion);
        return next;
      });
    },
    [persist, userSetMotion],
  );

  const theme = useMemo<Theme>(() => {
    const colors = getColors(prefs.highContrast);
    return {
      colors,
      spacing,
      radius,
      type: typeScale,
      fontSize: (size: number) => Math.round(size * prefs.textScale),
    };
  }, [prefs.highContrast, prefs.textScale]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, prefs, setReduceMotion, setHighContrast, setTextScale, ready }),
    [theme, prefs, setReduceMotion, setHighContrast, setTextScale, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useReduceMotion(): boolean {
  return useThemeContext().prefs.reduceMotion;
}
