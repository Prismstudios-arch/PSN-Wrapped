import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Easing } from 'react-native';
import type { DerivedStats, LibraryItem } from '@endcard/shared';
import { Card, Row, ThemedText } from './ui';
import { useReduceMotion, useTheme } from '@/theme/ThemeProvider';
import { formatHours, formatNumber, formatRarity } from '@/lib/format';

// Deterministic gradient per game name → consistent, colorful art placeholders.
export function gameGradient(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const a = `hsl(${h}, 70%, 55%)`;
  const b = `hsl(${(h + 48) % 360}, 70%, 42%)`;
  return [a, b];
}

export function GameArtTile({ name, size = 44 }: { name: string; size?: number }) {
  const theme = useTheme();
  const [a, b] = gameGradient(name);
  return (
    <LinearGradient
      colors={[a, b]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center' }}
    >
      <ThemedText variant="bodyStrong" color="#FFFFFF">
        {name.trim().charAt(0).toUpperCase()}
      </ThemedText>
    </LinearGradient>
  );
}

/** Animated count-up; honors reduce-motion (jumps straight to the value). */
export function CountUp({
  value,
  format = formatNumber,
  variant = 'display',
  color,
  play = true,
}: {
  value: number;
  format?: (n: number) => string;
  variant?: 'display' | 'title' | 'headline';
  color?: string;
  /** When false, holds at 0 and animates once it flips true (e.g. card on screen). */
  play?: boolean;
}) {
  const reduceMotion = useReduceMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      return;
    }
    if (!play) {
      setShown(0);
      return;
    }
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => setShown(v));
    Animated.timing(anim, {
      toValue: value,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value, reduceMotion, anim, play]);

  return (
    <ThemedText variant={variant} color={color}>
      {format(Math.round(shown))}
    </ThemedText>
  );
}

export function TopGamesList({ items, max = 5 }: { items: LibraryItem[]; max?: number }) {
  const theme = useTheme();
  const top = items.slice(0, max);
  const peak = top[0]?.playtime?.totalMinutes ?? 1;
  return (
    <View style={{ gap: theme.spacing.md }}>
      {top.map((item, i) => {
        const mins = item.playtime?.totalMinutes ?? 0;
        const frac = Math.max(0.06, mins / peak);
        return (
          <Row key={item.game.id} style={{ gap: theme.spacing.md }}>
            <ThemedText variant="label" color={theme.colors.textFaint} style={{ width: 18 }}>
              {i + 1}
            </ThemedText>
            <GameArtTile name={item.game.name} />
            <View style={{ flex: 1, gap: 6 }}>
              <ThemedText variant="bodyStrong" numberOfLines={1}>
                {item.game.name}
              </ThemedText>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' }}>
                <LinearGradient
                  colors={[theme.colors.accent, theme.colors.accentPink]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: `${frac * 100}%`, height: '100%', borderRadius: 3 }}
                />
              </View>
            </View>
            <ThemedText variant="bodyStrong" color={theme.colors.accentAlt}>
              {formatHours(mins)}
            </ThemedText>
          </Row>
        );
      })}
    </View>
  );
}

export function RarestTrophyCard({ stats }: { stats: DerivedStats }) {
  const theme = useTheme();
  const r = stats.rarestAchievement;
  if (!r) return null;
  return (
    <Card tone="surfaceAlt">
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText variant="label" color={theme.colors.gold}>
          RAREST TROPHY
        </ThemedText>
        <ThemedText variant="label" color={theme.colors.gold}>
          {formatRarity(r.achievement.rarityPercent)} of players
        </ThemedText>
      </Row>
      <View style={{ height: theme.spacing.md }} />
      <ThemedText variant="headline">{r.achievement.name}</ThemedText>
      <ThemedText variant="caption" color={theme.colors.textMuted}>
        {r.gameName}
      </ThemedText>
    </Card>
  );
}

/** Compact KPI tile (e.g. "12 Platinums", "47 Games"). */
export function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const theme = useTheme();
  return (
    <Card tone="surface" style={{ flex: 1 }}>
      <ThemedText variant="title" color={accent ?? theme.colors.text}>
        {value}
      </ThemedText>
      <ThemedText variant="caption" color={theme.colors.textMuted}>
        {label}
      </ThemedText>
    </Card>
  );
}
