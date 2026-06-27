import {
  DERIVED_STATS_SCHEMA_VERSION,
  type AchievementSet,
  type DerivedStats,
  type LibraryItem,
  type NormalizedGame,
  type Platform,
  type Playtime,
  type RarestAchievement,
  type ValuePerHourItem,
} from '@endcard/shared';
import { supabaseAdmin } from '../lib/supabase.js';
import { HttpError } from '../lib/httpError.js';
import { getConnector } from '../connectors/registry.js';
import { getUsableSession } from './connectionService.js';
import { logger } from '../lib/logger.js';

const TOP_GAMES_COUNT = 8;
const BEST_VALUE_COUNT = 5;

/**
 * Fetch fresh data from a platform connector and normalize it into the
 * recap-ready {@link DerivedStats} snapshot, then cache it. This is the only
 * code that turns raw connector output into the shape the app consumes.
 *
 * Known PSN data limits (documented, not faked):
 *  - No per-session timestamps → no time-of-day heatmap from PSN alone.
 *  - No genre metadata → `genres` is empty until a metadata source is added.
 *  - No price data → "best value" uses a most-hours proxy for now.
 */
export async function refreshStatsForPlatform(userId: string, platform: Platform): Promise<DerivedStats> {
  const session = await getUsableSession(userId, platform);
  const connector = getConnector(platform);

  const [library, playtime, achievements] = await Promise.all([
    connector.fetchLibrary(session),
    connector.fetchPlaytime(session),
    connector.fetchAchievements(session),
  ]);

  const stats = buildDerivedStats(platform, library, playtime, achievements);
  await cacheStats(userId, stats);
  logger.info({ userId, platform, games: stats.totals.gameCount }, 'stats refreshed');
  return stats;
}

/** Pure transform: normalized connector outputs → DerivedStats. Easy to unit-test. */
export function buildDerivedStats(
  platform: Platform,
  library: NormalizedGame[],
  playtime: Playtime[],
  achievements: AchievementSet,
): DerivedStats {
  const playtimeByGame = new Map(playtime.map((p) => [p.gameId, p]));
  const titleSummaryByGame = new Map(achievements.titles.map((t) => [t.gameId, t]));
  const gameNameById = new Map(library.map((g) => [g.id, g.name]));

  const items: LibraryItem[] = library.map((game) => {
    const pt = playtimeByGame.get(game.id);
    const ach = titleSummaryByGame.get(game.id);
    return {
      game,
      ...(pt ? { playtime: pt } : {}),
      ...(ach ? { achievements: ach } : {}),
    };
  });

  const minutesOf = (item: LibraryItem): number => item.playtime?.totalMinutes ?? 0;
  const byPlaytimeDesc = [...items].sort((a, b) => minutesOf(b) - minutesOf(a));

  const totalMinutes = playtime.reduce((sum, p) => sum + (p.totalMinutes ?? 0), 0);

  const topGames = byPlaytimeDesc.slice(0, TOP_GAMES_COUNT);

  const bestValue: ValuePerHourItem[] = byPlaytimeDesc
    .filter((item) => minutesOf(item) > 0)
    .slice(0, BEST_VALUE_COUNT)
    .map((item) => ({
      gameId: item.game.id,
      gameName: item.game.name,
      totalMinutes: minutesOf(item),
      ...(item.game.iconUrl ? { iconUrl: item.game.iconUrl } : {}),
    }));

  const rarestAchievement = findRarest(achievements, gameNameById, titleSummaryByGame);

  const achievementsEarned =
    achievements.profile.totalEarned ||
    achievements.titles.reduce((sum, t) => sum + t.earnedCount, 0);
  const platinums = achievements.profile.earnedByTier.platinum;

  // "When you game" — derived from trophy earned-at timestamps (PSN gives no
  // per-session times). UTC buckets; a good proxy for active play windows.
  const heatmap = buildHeatmap(achievements.achievements);

  const milestones = buildMilestones({
    hours: Math.round(totalMinutes / 60),
    trophies: achievementsEarned,
    platinums,
    games: library.length,
    rarestRarity: rarestAchievement?.achievement.rarityPercent,
  });

  return {
    schemaVersion: DERIVED_STATS_SCHEMA_VERSION,
    platforms: [platform],
    generatedAt: new Date().toISOString(),
    totals: {
      totalMinutes,
      gameCount: library.length,
      achievementsEarned,
      platinums,
    },
    topGames,
    ...(rarestAchievement ? { rarestAchievement } : {}),
    bestValue,
    // PSN exposes no genre metadata; left empty until an enrichment source is added.
    genres: [],
    ...(heatmap ? { heatmap } : {}),
    achievementProfile: achievements.profile,
    milestones,
  };
}

/**
 * Celebratory milestones — the healthy-engagement backbone. Every entry is a
 * thing to be proud of or curious about (a next target to chase), never a nag.
 */
function buildMilestones(v: {
  hours: number;
  trophies: number;
  platinums: number;
  games: number;
  rarestRarity: number | undefined;
}): import('@endcard/shared').Milestone[] {
  const out: import('@endcard/shared').Milestone[] = [];
  const add = (
    kind: import('@endcard/shared').MilestoneKind,
    label: string,
    value: number,
    threshold: number,
    description?: string,
  ): void => {
    out.push({ id: `${kind}-${threshold}`, kind, label, value, threshold, reached: value >= threshold, ...(description ? { description } : {}) });
  };

  for (const t of [100, 500, 1000, 5000, 10000]) add('hours', `${t.toLocaleString()} hours played`, v.hours, t);
  for (const t of [100, 500, 1000, 2500, 5000]) add('trophies', `${t.toLocaleString()} trophies earned`, v.trophies, t);
  for (const t of [1, 10, 25, 50, 100]) add('platinums', `${t}${t === 1 ? 'st' : 'th'} platinum`, v.platinums, t);
  for (const t of [25, 50, 100, 250]) add('games', `${t} games played`, v.games, t);
  if (v.rarestRarity !== undefined && v.rarestRarity < 1) {
    add('rareTrophy', 'Top 1% rarity trophy', 1, 1, 'You own a trophy fewer than 1% of players have.');
  }
  return out;
}

/**
 * Build a 7×24 (day-of-week × hour, UTC) activity grid from trophy earned-at
 * timestamps. Returns undefined when there isn't enough signal to be meaningful.
 */
function buildHeatmap(achievements: AchievementSet['achievements']): number[][] | undefined {
  const grid: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  let count = 0;
  for (const a of achievements) {
    if (!a.earnedAt) continue;
    const d = new Date(a.earnedAt);
    if (Number.isNaN(d.getTime())) continue;
    const row = grid[d.getUTCDay()];
    if (!row) continue;
    row[d.getUTCHours()] = (row[d.getUTCHours()] ?? 0) + 1;
    count++;
  }
  return count >= 8 ? grid : undefined;
}

function findRarest(
  achievements: AchievementSet,
  gameNameById: Map<string, string>,
  titleSummaryByGame: Map<string, { name: string }>,
): RarestAchievement | undefined {
  let rarest: RarestAchievement | undefined;
  let lowestRate = Number.POSITIVE_INFINITY;
  for (const a of achievements.achievements) {
    if (!a.earned || a.rarityPercent === undefined) continue;
    if (a.rarityPercent < lowestRate) {
      lowestRate = a.rarityPercent;
      const gameName = gameNameById.get(a.gameId) ?? titleSummaryByGame.get(a.gameId)?.name ?? 'a game';
      rarest = { achievement: a, gameName };
    }
  }
  return rarest;
}

/** Upsert the snapshot for a user. One row per user (unified across platforms later). */
export async function cacheStats(userId: string, stats: DerivedStats): Promise<void> {
  const { error } = await supabaseAdmin
    .from('cached_stats')
    .upsert(
      {
        user_id: userId,
        schema_version: stats.schemaVersion,
        stats,
        generated_at: stats.generatedAt,
      },
      { onConflict: 'user_id' },
    );
  if (error) throw HttpError.upstream('Could not cache your stats.');
}

/** Read the cached snapshot for a user (used by the app's offline-first dashboard). */
export async function getCachedStats(userId: string): Promise<DerivedStats | null> {
  const { data, error } = await supabaseAdmin
    .from('cached_stats')
    .select('stats')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw HttpError.upstream('Could not read your stats.');
  return (data?.stats as DerivedStats | undefined) ?? null;
}
