import {
  DERIVED_STATS_SCHEMA_VERSION,
  emptyTierRecord,
  type DerivedStats,
} from '@endcard/shared';

/**
 * A fake-but-gorgeous recap shown BEFORE anyone connects an account — the
 * "demo-first" hook. It is clearly a sample (the UI labels it as such) and uses
 * a fictional player so we never imply real data. Shapes match the real
 * DerivedStats exactly, so the same cards render it.
 */
const platinumTier = { ...emptyTierRecord(), bronze: 612, silver: 138, gold: 41, platinum: 12 };

export const DEMO_RECAP: DerivedStats = {
  schemaVersion: DERIVED_STATS_SCHEMA_VERSION,
  platforms: ['psn'],
  generatedAt: '2025-12-31T12:00:00.000Z',
  totals: {
    totalMinutes: 41760, // 696h
    gameCount: 47,
    achievementsEarned: 803,
    platinums: 12,
  },
  topGames: [
    { game: { id: 'demo:1', platform: 'psn', nativeId: '1', name: 'Elden Ring' }, playtime: { gameId: 'demo:1', totalMinutes: 11280, estimated: false } },
    { game: { id: 'demo:2', platform: 'psn', nativeId: '2', name: 'Baldur’s Gate 3' }, playtime: { gameId: 'demo:2', totalMinutes: 8940, estimated: false } },
    { game: { id: 'demo:3', platform: 'psn', nativeId: '3', name: 'Hades II' }, playtime: { gameId: 'demo:3', totalMinutes: 5220, estimated: false } },
    { game: { id: 'demo:4', platform: 'psn', nativeId: '4', name: 'Helldivers 2' }, playtime: { gameId: 'demo:4', totalMinutes: 4680, estimated: false } },
    { game: { id: 'demo:5', platform: 'psn', nativeId: '5', name: 'Stardew Valley' }, playtime: { gameId: 'demo:5', totalMinutes: 3960, estimated: false } },
    { game: { id: 'demo:6', platform: 'psn', nativeId: '6', name: 'Returnal' }, playtime: { gameId: 'demo:6', totalMinutes: 2880, estimated: false } },
  ],
  rarestAchievement: {
    gameName: 'Returnal',
    achievement: {
      id: 'demo:t1',
      gameId: 'demo:6',
      platform: 'psn',
      name: 'Whence It Came',
      description: 'Reached the final biome without dying.',
      tier: 'gold',
      earned: true,
      earnedAt: '2025-08-14T22:11:00.000Z',
      rarityPercent: 0.3,
    },
  },
  bestValue: [
    { gameId: 'demo:5', gameName: 'Stardew Valley', totalMinutes: 3960 },
    { gameId: 'demo:3', gameName: 'Hades II', totalMinutes: 5220 },
    { gameId: 'demo:1', gameName: 'Elden Ring', totalMinutes: 11280 },
  ],
  genres: [
    { genre: 'RPG', minutes: 22200, share: 0.53 },
    { genre: 'Roguelike', minutes: 8100, share: 0.19 },
    { genre: 'Co-op Shooter', minutes: 6300, share: 0.15 },
    { genre: 'Cozy', minutes: 5160, share: 0.13 },
  ],
  achievementProfile: {
    platform: 'psn',
    level: 318,
    earnedByTier: platinumTier,
    totalEarned: 803,
  },
};

/** A flattering archetype derived from the demo data — previews the Persona system (Phase 4). */
export const DEMO_PERSONA = {
  title: 'The Lore Archivist',
  blurb: 'You don’t just finish games — you live in them. Deep RPG runs, rare endings, and the patience to platinum what others abandon.',
};
