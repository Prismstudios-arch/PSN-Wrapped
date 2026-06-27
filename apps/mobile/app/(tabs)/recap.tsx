import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Card, Spacer, ThemedText, Row } from '@/components/ui';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Button } from '@/components/Button';
import { CountUp, RarestTrophyCard, TopGamesList } from '@/components/recap';
import { useStats } from '@/state/useStats';
import { useTheme } from '@/theme/ThemeProvider';
import { formatHours } from '@/lib/format';
import { haptics } from '@/lib/haptics';

/**
 * Recap — a live preview of the recap, with the entry point into the full-screen
 * Story Player (the immersive swipeable experience).
 */
export default function Recap() {
  const theme = useTheme();
  const { stats, loading, sync, syncing } = useStats();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AuroraBackground intensity={0.7} />
      <Screen scroll tabBarInset>
        <ThemedText variant="kicker" color={theme.colors.accentAlt}>
          YOUR RECAP
        </ThemedText>
        <Spacer size={6} />
        <ThemedText variant="title">The story so far</ThemedText>
        <Spacer size={20} />

        {loading ? (
          <Card>
            <ThemedText variant="body" color={theme.colors.textMuted}>
              Loading…
            </ThemedText>
          </Card>
        ) : stats ? (
          <View style={{ gap: theme.spacing.lg }}>
            <Button label="Play your Recap ▶" onPress={() => router.push('/story')} hapticStyle="success" />

            <Card style={{ overflow: 'hidden' }}>
              <ThemedText variant="kicker" color={theme.colors.textMuted}>
                TOTAL PLAYTIME
              </ThemedText>
              <Spacer size={6} />
              <CountUp value={stats.totals.totalMinutes} format={formatHours} />
            </Card>

            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <ThemedText variant="label" color={theme.colors.textMuted}>
                  TOP GAMES
                </ThemedText>
              </Row>
              <Spacer size={12} />
              <TopGamesList items={stats.topGames} max={5} />
            </Card>

            <RarestTrophyCard stats={stats} />

            <Button
              label="Refresh my stats"
              variant="secondary"
              onPress={() => {
                haptics.tap();
                sync();
              }}
              loading={syncing}
            />
          </View>
        ) : (
          <Card>
            <ThemedText variant="headline">No recap yet</ThemedText>
            <Spacer size={6} />
            <ThemedText variant="body" color={theme.colors.textMuted}>
              Sync your PlayStation from the Home tab to generate your recap.
            </ThemedText>
          </Card>
        )}
      </Screen>
    </View>
  );
}
