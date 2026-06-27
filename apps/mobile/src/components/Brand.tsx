import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './ui';
import { useTheme } from '@/theme/ThemeProvider';
import { AURORA_GRADIENT } from '@/theme/tokens';

/**
 * PSN Wrapped's mark: a gradient "card" glyph (the aurora) with a white play
 * motif — evoking the recap you share — next to the wordmark. Its own identity;
 * intentionally nothing like the PlayStation logo or its brand blue.
 */
export function BrandGlyph({ size = 40 }: { size?: number }) {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={AURORA_GRADIENT as unknown as [string, string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Play triangle = "watch your recap". */}
      <View
        style={{
          width: 0,
          height: 0,
          marginLeft: size * 0.08,
          borderTopWidth: size * 0.18,
          borderBottomWidth: size * 0.18,
          borderLeftWidth: size * 0.28,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: theme.colors.onAccent,
        }}
      />
    </LinearGradient>
  );
}

export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const glyph = size === 'lg' ? 42 : size === 'sm' ? 26 : 34;
  const variant = size === 'lg' ? 'title' : size === 'sm' ? 'bodyStrong' : 'headline';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
      <BrandGlyph size={glyph} />
      <ThemedText variant={variant} numberOfLines={1}>
        PSN Wrapped
      </ThemedText>
    </View>
  );
}

/** The legally-important line. Shown on onboarding, connect, and settings. */
export function NotAffiliated() {
  const theme = useTheme();
  return (
    <ThemedText variant="caption" color={theme.colors.textFaint} center>
      PSN Wrapped is unofficial and not affiliated with or endorsed by Sony
      Interactive Entertainment. “PlayStation Network” is referenced descriptively only.
    </ThemedText>
  );
}
