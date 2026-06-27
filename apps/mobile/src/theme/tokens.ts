/**
 * ENDCARD — "Midnight Aurora" design tokens.
 *
 * Endcard's OWN identity: a near-black base with an iridescent violet→teal→pink
 * aurora. Deliberately NOT PlayStation blue. Every screen reads colors from
 * here (via the ThemeProvider) so the high-contrast accessibility mode and any
 * future per-recap palettes are one swap, not a rewrite.
 */

export const aurora = {
  violet: '#7C5CFF',
  teal: '#19E3C2',
  pink: '#FF5DA2',
} as const;

/** The signature gradient — used on the wordmark, primary buttons, hero art. */
export const AURORA_GRADIENT = [aurora.violet, aurora.teal, aurora.pink] as const;
export const AURORA_BUTTON_GRADIENT = [aurora.violet, aurora.pink] as const;
/** Subtle backdrop wash behind dark screens. */
export const HERO_GRADIENT = ['#1B1140', '#0B0B12'] as const;

export interface ThemeColors {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  hairline: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentAlt: string;
  accentPink: string;
  gold: string;
  success: string;
  danger: string;
  onAccent: string;
}

const base: ThemeColors = {
  bg: '#0B0B12',
  bgElevated: '#10101A',
  surface: '#16161F',
  surfaceAlt: '#1C1C2A',
  border: '#2A2A3D',
  hairline: 'rgba(255,255,255,0.08)',
  text: '#F4F4FB',
  textMuted: '#A6A6C2',
  textFaint: '#6E6E88',
  accent: aurora.violet,
  accentAlt: aurora.teal,
  accentPink: aurora.pink,
  gold: '#FFC247',
  success: aurora.teal,
  danger: '#FF6B6B',
  onAccent: '#0B0B12',
};

/** High-contrast overrides: brighter text, stronger separators. */
const highContrast: ThemeColors = {
  ...base,
  bg: '#000000',
  bgElevated: '#0B0B14',
  surface: '#17172A',
  surfaceAlt: '#22223A',
  border: '#4A4A78',
  hairline: 'rgba(255,255,255,0.18)',
  text: '#FFFFFF',
  textMuted: '#D6D6EC',
  textFaint: '#A0A0C0',
  accent: '#9C84FF',
  accentAlt: '#54F0D6',
  accentPink: '#FF86BC',
};

export function getColors(isHighContrast: boolean): ThemeColors {
  return isHighContrast ? highContrast : base;
}

/** 4-pt spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/** Typographic ramp. `size` is multiplied by the user's text-scale at runtime. */
export const typeScale = {
  display: { size: 40, lineHeight: 44, weight: '800' as const, letterSpacing: -0.5 },
  title: { size: 28, lineHeight: 34, weight: '800' as const, letterSpacing: -0.3 },
  headline: { size: 22, lineHeight: 28, weight: '700' as const, letterSpacing: -0.2 },
  body: { size: 16, lineHeight: 23, weight: '500' as const, letterSpacing: 0 },
  bodyStrong: { size: 16, lineHeight: 23, weight: '700' as const, letterSpacing: 0 },
  label: { size: 13, lineHeight: 18, weight: '700' as const, letterSpacing: 0.3 },
  caption: { size: 12, lineHeight: 16, weight: '500' as const, letterSpacing: 0.2 },
  kicker: { size: 12, lineHeight: 16, weight: '800' as const, letterSpacing: 3 },
} as const;

export type TypeVariant = keyof typeof typeScale;

/** Clamp the user's text-scale to a sane, layout-safe range. */
export const TEXT_SCALE_RANGE = { min: 0.85, max: 1.4, step: 0.05 } as const;
