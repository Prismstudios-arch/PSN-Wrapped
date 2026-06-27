import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import type { BattleCategory, BattleResult } from '@endcard/shared';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Button } from '@/components/Button';
import { Card, Row, Spacer, ThemedText } from '@/components/ui';
import { useReduceMotion, useTheme } from '@/theme/ThemeProvider';
import { useSession } from '@/state/session';
import { api, ApiError } from '@/lib/api';
import { AURORA_GRADIENT } from '@/theme/tokens';
import { formatHours, formatRarity } from '@/lib/format';
import { haptics } from '@/lib/haptics';

function fmt(c: BattleCategory, side: 'a' | 'b'): string {
  const v = side === 'a' ? c.a : c.b;
  if (c.format === 'hours') return formatHours(v * 60);
  if (c.format === 'rarity') return v >= 101 ? '—' : formatRarity(v);
  return v.toLocaleString();
}

export default function Battle() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { token } = useSession();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const [battle, setBattle] = useState<BattleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reveal = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (!token || !params.id) return;
    let active = true;
    api.friends
      .battle(token, params.id)
      .then((r) => {
        if (!active) return;
        setBattle(r.battle);
        haptics.success();
        if (!reduceMotion) {
          Animated.spring(reveal, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }).start();
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : 'Could not load the battle.');
        haptics.error();
      });
    return () => {
      active = false;
    };
  }, [token, params.id, reveal, reduceMotion]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AuroraBackground intensity={0.6} />
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 20 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <ThemedText variant="headline">Recap Battle</ThemedText>
          <Pressable onPress={() => router.back()} hitSlop={14} accessibilityRole="button" accessibilityLabel="Close">
            <ThemedText variant="headline" color={theme.colors.textMuted}>✕</ThemedText>
          </Pressable>
        </Row>

        {error ? (
          <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
            <ThemedText variant="headline" center>{error}</ThemedText>
            <Button label="Back" variant="secondary" onPress={() => router.back()} />
          </View>
        ) : !battle ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : (
          <Animated.View
            style={{
              flex: 1,
              opacity: reveal,
              transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
            }}
          >
            <Spacer size={16} />
            {/* Versus header */}
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <PlayerChip name={battle.a.displayName} side="a" winner={battle.overallWinner} />
              <ThemedText variant="title" color={theme.colors.textFaint}>vs</ThemedText>
              <PlayerChip name={battle.b.displayName} side="b" winner={battle.overallWinner} />
            </Row>

            <Spacer size={18} />

            {/* Compatibility */}
            <LinearGradient
              colors={AURORA_GRADIENT as unknown as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: theme.radius.lg, padding: 2 }}
            >
              <View style={{ backgroundColor: theme.colors.bg, borderRadius: theme.radius.lg - 2, padding: 18, alignItems: 'center' }}>
                <ThemedText variant="label" color={theme.colors.accentPink}>TASTE COMPATIBILITY</ThemedText>
                <Spacer size={6} />
                <ThemedText variant="display">{battle.compatibility}%</ThemedText>
              </View>
            </LinearGradient>

            <Spacer size={16} />

            {/* Categories */}
            <View style={{ gap: 8 }}>
              {battle.categories.map((c) => (
                <Card key={c.key} padded={false}>
                  <Row style={{ padding: theme.spacing.md, alignItems: 'center' }}>
                    <ThemedText
                      variant="bodyStrong"
                      color={c.winner === 'a' ? theme.colors.accentAlt : theme.colors.textMuted}
                      style={{ flex: 1, textAlign: 'left' }}
                    >
                      {fmt(c, 'a')}
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.colors.textFaint} style={{ flex: 1, textAlign: 'center' }}>
                      {c.label}
                    </ThemedText>
                    <ThemedText
                      variant="bodyStrong"
                      color={c.winner === 'b' ? theme.colors.accentAlt : theme.colors.textMuted}
                      style={{ flex: 1, textAlign: 'right' }}
                    >
                      {fmt(c, 'b')}
                    </ThemedText>
                  </Row>
                </Card>
              ))}
            </View>

            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                <ThemedText variant="title" center>
                  {battle.overallWinner === 'tie'
                    ? '🤝 Dead heat!'
                    : `🎉 ${(battle.overallWinner === 'a' ? battle.a : battle.b).displayName} wins!`}
                </ThemedText>
              </View>
              <Button label="Done" onPress={() => router.back()} />
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function PlayerChip({ name, side, winner }: { name: string; side: 'a' | 'b'; winner: 'a' | 'b' | 'tie' }) {
  const theme = useTheme();
  const isWinner = winner === side;
  return (
    <View style={{ alignItems: 'center', flex: 1, gap: 6 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: isWinner ? 2 : 0,
          borderColor: theme.colors.gold,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ThemedText variant="headline">{name.trim().charAt(0).toUpperCase()}</ThemedText>
      </View>
      <ThemedText variant="caption" numberOfLines={1} color={isWinner ? theme.colors.gold : theme.colors.textMuted}>
        {name}
      </ThemedText>
    </View>
  );
}
