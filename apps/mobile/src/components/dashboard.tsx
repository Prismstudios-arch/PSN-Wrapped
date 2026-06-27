import { View } from 'react-native';
import type { DerivedStats, PlayHeatmap, ValuePerHourItem } from '@endcard/shared';
import { Card, Row, Spacer, ThemedText } from './ui';
import { GameArtTile } from './recap';
import { useTheme } from '@/theme/ThemeProvider';
import { formatHours } from '@/lib/format';

// Display Mon→Sun even though PSN day index is 0=Sun.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function peakWindow(heatmap: PlayHeatmap): string {
  const hourTotals = new Array<number>(24).fill(0);
  for (const day of heatmap) for (let h = 0; h < 24; h++) hourTotals[h] += day[h] ?? 0;
  let peak = 0;
  for (let h = 1; h < 24; h++) if ((hourTotals[h] ?? 0) > (hourTotals[peak] ?? 0)) peak = h;
  if (peak >= 0 && peak < 6) return 'late at night';
  if (peak < 12) return 'in the morning';
  if (peak < 18) return 'in the afternoon';
  return 'in the evening';
}

/** "When you game" — a 7×24 activity grid from trophy timestamps. */
export function HeatmapCard({ stats }: { stats: DerivedStats }) {
  const theme = useTheme();
  const heatmap = stats.heatmap;
  if (!heatmap) return null;

  let max = 0;
  for (const day of heatmap) for (const v of day) if (v > max) max = v;
  if (max === 0) return null;

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText variant="label" color={theme.colors.textMuted}>
          WHEN YOU GAME
        </ThemedText>
        <ThemedText variant="caption" color={theme.colors.textFaint}>
          by trophy times
        </ThemedText>
      </Row>
      <Spacer size={14} />
      <View style={{ gap: 3 }}>
        {DAY_ORDER.map((dayIdx, i) => {
          const row = heatmap[dayIdx] ?? [];
          return (
            <Row key={dayIdx} style={{ gap: 4 }}>
              <ThemedText variant="caption" color={theme.colors.textFaint} style={{ width: 12 }}>
                {DAY_LABELS[i]}
              </ThemedText>
              <Row style={{ flex: 1, gap: 2 }}>
                {Array.from({ length: 24 }).map((_, h) => {
                  const v = row[h] ?? 0;
                  const intensity = v / max;
                  return (
                    <View
                      key={h}
                      style={{
                        flex: 1,
                        aspectRatio: 1,
                        borderRadius: 2,
                        backgroundColor: v === 0 ? theme.colors.surfaceAlt : theme.colors.accent,
                        opacity: v === 0 ? 0.4 : 0.3 + 0.7 * intensity,
                      }}
                    />
                  );
                })}
              </Row>
            </Row>
          );
        })}
      </View>
      <Spacer size={10} />
      <Row style={{ justifyContent: 'space-between', paddingLeft: 16 }}>
        <ThemedText variant="caption" color={theme.colors.textFaint}>
          12a
        </ThemedText>
        <ThemedText variant="caption" color={theme.colors.textFaint}>
          12p
        </ThemedText>
        <ThemedText variant="caption" color={theme.colors.textFaint}>
          11p
        </ThemedText>
      </Row>
      <Spacer size={10} />
      <ThemedText variant="body" color={theme.colors.textMuted}>
        You pop the most trophies{' '}
        <ThemedText variant="bodyStrong" color={theme.colors.accentAlt}>
          {peakWindow(heatmap)}
        </ThemedText>
        .
      </ThemedText>
    </Card>
  );
}

const TIER_META: { key: 'platinum' | 'gold' | 'silver' | 'bronze'; label: string; color: string }[] = [
  { key: 'platinum', label: 'Platinum', color: '#7FD7FF' },
  { key: 'gold', label: 'Gold', color: '#FFC247' },
  { key: 'silver', label: 'Silver', color: '#C7C7D6' },
  { key: 'bronze', label: 'Bronze', color: '#C8803C' },
];

/** Trophy-tier breakdown — a stacked bar + legend. Real PSN data (no genre needed). */
export function TrophyBreakdownCard({ stats }: { stats: DerivedStats }) {
  const theme = useTheme();
  const tiers = stats.achievementProfile?.earnedByTier;
  if (!tiers) return null;
  const total = TIER_META.reduce((s, t) => s + (tiers[t.key] ?? 0), 0);
  if (total === 0) return null;

  return (
    <Card>
      <ThemedText variant="label" color={theme.colors.textMuted}>
        TROPHY CABINET
      </ThemedText>
      <Spacer size={14} />
      <Row style={{ height: 14, borderRadius: 7, overflow: 'hidden' }}>
        {TIER_META.map((t) => {
          const v = tiers[t.key] ?? 0;
          if (v === 0) return null;
          return <View key={t.key} style={{ flex: v, backgroundColor: t.color }} />;
        })}
      </Row>
      <Spacer size={14} />
      <View style={{ gap: theme.spacing.sm }}>
        {TIER_META.map((t) => (
          <Row key={t.key} style={{ justifyContent: 'space-between' }}>
            <Row style={{ gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.color }} />
              <ThemedText variant="body" color={theme.colors.textMuted}>
                {t.label}
              </ThemedText>
            </Row>
            <ThemedText variant="bodyStrong">{(tiers[t.key] ?? 0).toLocaleString()}</ThemedText>
          </Row>
        ))}
      </View>
    </Card>
  );
}

/** "Time well spent" — your biggest time investments, framed positively. */
export function BestValueCard({ items }: { items: ValuePerHourItem[] }) {
  const theme = useTheme();
  if (items.length === 0) return null;
  const top = items.slice(0, 3);
  return (
    <Card>
      <ThemedText variant="label" color={theme.colors.textMuted}>
        TIME WELL SPENT
      </ThemedText>
      <Spacer size={4} />
      <ThemedText variant="caption" color={theme.colors.textFaint}>
        The games you got the most out of.
      </ThemedText>
      <Spacer size={14} />
      <View style={{ gap: theme.spacing.md }}>
        {top.map((item) => (
          <Row key={item.gameId} style={{ gap: theme.spacing.md }}>
            <GameArtTile name={item.gameName} size={40} />
            <ThemedText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
              {item.gameName}
            </ThemedText>
            <ThemedText variant="bodyStrong" color={theme.colors.gold}>
              {formatHours(item.totalMinutes)}
            </ThemedText>
          </Row>
        ))}
      </View>
    </Card>
  );
}

/**
 * Milestones — the healthy-engagement card. Celebrates the most impressive thing
 * reached and dangles the next target as a curiosity hook. Never a guilt-trip.
 */
export function MilestonesCard({ stats }: { stats: DerivedStats }) {
  const theme = useTheme();
  const ms = stats.milestones ?? [];
  const reached = [...ms].filter((m) => m.reached).sort((a, b) => b.threshold - a.threshold);
  const top = reached[0];
  const next = [...ms]
    .filter((m) => !m.reached)
    .map((m) => ({ m, prog: m.threshold > 0 ? m.value / m.threshold : 0 }))
    .sort((a, b) => b.prog - a.prog)[0];

  if (!top && !next) return null;

  return (
    <Card tone="surfaceAlt">
      {top ? (
        <>
          <ThemedText variant="label" color={theme.colors.gold}>MILESTONE UNLOCKED</ThemedText>
          <Spacer size={6} />
          <ThemedText variant="headline">🏆 {top.label}</ThemedText>
        </>
      ) : null}
      {next ? (
        <>
          {top ? <Spacer size={16} /> : null}
          <ThemedText variant="caption" color={theme.colors.textMuted}>
            Next up: {next.m.label} — {Math.min(99, Math.round(next.prog * 100))}% there
          </ThemedText>
          <Spacer size={8} />
          <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.surface, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, Math.round(next.prog * 100))}%`, height: '100%', backgroundColor: theme.colors.accentAlt }} />
          </View>
        </>
      ) : null}
    </Card>
  );
}

/** Genre breakdown — only renders when a metadata source has populated genres. */
export function GenreCard({ stats }: { stats: DerivedStats }) {
  const theme = useTheme();
  if (!stats.genres || stats.genres.length === 0) return null;
  return (
    <Card>
      <ThemedText variant="label" color={theme.colors.textMuted}>
        YOUR TASTE
      </ThemedText>
      <Spacer size={14} />
      <View style={{ gap: theme.spacing.md }}>
        {stats.genres.slice(0, 5).map((g) => (
          <View key={g.genre} style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <ThemedText variant="body">{g.genre}</ThemedText>
              <ThemedText variant="caption" color={theme.colors.textMuted}>
                {Math.round(g.share * 100)}%
              </ThemedText>
            </Row>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(g.share * 100)}%`, height: '100%', backgroundColor: theme.colors.accent }} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
