import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Button } from '@/components/Button';
import { Card, Row, Spacer, ThemedText } from '@/components/ui';
import { Wordmark } from '@/components/Brand';
import { CardSkeleton, Shimmer } from '@/components/Shimmer';
import { CountUp, RarestTrophyCard, StatTile, TopGamesList } from '@/components/recap';
import { BestValueCard, GenreCard, HeatmapCard, MilestonesCard, TrophyBreakdownCard } from '@/components/dashboard';
import { useStats } from '@/state/useStats';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { formatHours, formatRelativeTime } from '@/lib/format';

/**
 * Home — the recap dashboard. Offline-first: renders the cached snapshot
 * instantly (or shimmer skeletons on a true cold start) and refreshes in the
 * background. Pull to refresh; auth failures offer a clean reconnect path.
 */
export default function Home() {
  const theme = useTheme();
  const { connectedPlatforms } = useSession();
  const { stats, loading, syncing, error, needsReconnect, sync } = useStats();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AuroraBackground intensity={0.6} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 120, gap: theme.spacing.lg }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={syncing} onRefresh={sync} tintColor={theme.colors.accent} />
          }
        >
          {/* Header */}
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flexShrink: 1, paddingRight: 8 }}>
              <Wordmark size="sm" />
            </View>
            {connectedPlatforms.includes('psn') ? (
              <View style={{ backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
                <ThemedText variant="label" color={theme.colors.accentAlt}>
                  PSN
                </ThemedText>
              </View>
            ) : null}
          </Row>

          {needsReconnect ? <ReconnectBanner /> : null}

          {loading && !stats ? (
            <ColdLoad />
          ) : stats ? (
            <>
              {/* Hero */}
              <Card style={{ overflow: 'hidden' }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <ThemedText variant="kicker" color={theme.colors.textMuted}>
                    YOUR PLAYTIME
                  </ThemedText>
                  <ThemedText variant="caption" color={theme.colors.textFaint}>
                    {syncing ? 'Refreshing…' : `Updated ${formatRelativeTime(stats.generatedAt)}`}
                  </ThemedText>
                </Row>
                <Spacer size={6} />
                <Row style={{ alignItems: 'flex-end', gap: 10 }}>
                  <CountUp value={stats.totals.totalMinutes} format={formatHours} />
                  <View style={{ paddingBottom: 8 }}>
                    <ThemedText variant="headline" color={theme.colors.textMuted}>
                      across {stats.totals.gameCount} games
                    </ThemedText>
                  </View>
                </Row>
              </Card>

              {/* Quick stats */}
              <Row style={{ gap: theme.spacing.md }}>
                <StatTile label="Trophies" value={stats.totals.achievementsEarned.toLocaleString()} accent={theme.colors.accentAlt} />
                <StatTile label="Platinums" value={`${stats.totals.platinums}`} accent={theme.colors.gold} />
              </Row>

              <MilestonesCard stats={stats} />

              {stats.rarestAchievement ? <RarestTrophyCard stats={stats} /> : null}

              {stats.topGames.length > 0 ? (
                <Card>
                  <ThemedText variant="label" color={theme.colors.textMuted}>
                    TOP GAMES
                  </ThemedText>
                  <Spacer size={12} />
                  <TopGamesList items={stats.topGames} max={5} />
                </Card>
              ) : null}

              <HeatmapCard stats={stats} />
              <BestValueCard items={stats.bestValue} />
              <TrophyBreakdownCard stats={stats} />
              <GenreCard stats={stats} />

              {error && !needsReconnect ? (
                <ThemedText variant="caption" color={theme.colors.danger} center>
                  {error}
                </ThemedText>
              ) : null}

              <Button label="Play your Recap ▶" onPress={() => router.push('/story')} />
            </>
          ) : (
            <EmptyState onSync={sync} syncing={syncing} error={error} />
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ReconnectBanner() {
  const theme = useTheme();
  return (
    <Pressable onPress={() => router.push('/connect')}>
      <View
        style={{
          backgroundColor: theme.colors.danger + '1A',
          borderColor: theme.colors.danger + '55',
          borderWidth: 1,
          borderRadius: theme.radius.md,
          padding: theme.spacing.lg,
        }}
      >
        <ThemedText variant="bodyStrong" color={theme.colors.danger}>
          Reconnect PlayStation
        </ThemedText>
        <Spacer size={4} />
        <ThemedText variant="caption" color={theme.colors.textMuted}>
          Your connection expired. Tap to reconnect — your stats stay until you do.
        </ThemedText>
      </View>
    </Pressable>
  );
}

function ColdLoad() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Card>
        <Shimmer width="40%" height={12} />
        <Spacer size={12} />
        <Shimmer width="55%" height={40} radius={10} />
      </Card>
      <Row style={{ gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <CardSkeleton lines={1} height={84} />
        </View>
        <View style={{ flex: 1 }}>
          <CardSkeleton lines={1} height={84} />
        </View>
      </Row>
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </View>
  );
}

function EmptyState({ onSync, syncing, error }: { onSync: () => void; syncing: boolean; error: string | null }) {
  const theme = useTheme();
  return (
    <Card>
      <ThemedText variant="headline">Let’s build your recap</ThemedText>
      <Spacer size={6} />
      <ThemedText variant="body" color={theme.colors.textMuted}>
        Pull your latest PlayStation stats to bring this to life.
      </ThemedText>
      {error ? (
        <>
          <Spacer size={10} />
          <ThemedText variant="caption" color={theme.colors.danger}>
            {error}
          </ThemedText>
        </>
      ) : null}
      <Spacer size={16} />
      <Button label="Sync my PlayStation" onPress={onSync} loading={syncing} />
    </Card>
  );
}
