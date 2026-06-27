import type { Platform } from './platform';

/**
 * ENDCARD NORMALIZED MODEL
 * ------------------------
 * Every connector maps its raw, platform-specific payloads into these shapes.
 * Downstream layers (dashboard, recap engine, AI commentary, sharing) consume
 * ONLY these types. They never see a PSN trophy or a Steam achievement directly.
 *
 * Design rules:
 *  - Fields a given platform cannot provide are optional, never faked.
 *  - When a value is inferred rather than reported, it is flagged (`estimated`).
 *  - `id` fields are stable and namespaced by platform so two platforms can
 *    never collide and a unified cross-platform recap is possible.
 */

/** Stable Endcard id, e.g. "psn:NPWR12345_00" or "psn:concept:10000". */
export type EntityId = string;

export function makeEntityId(platform: Platform, ...parts: string[]): EntityId {
  return [platform, ...parts].join(':');
}

// ---------------------------------------------------------------------------
// Games & library
// ---------------------------------------------------------------------------

/** Which device/edition a title ran on, kept as free-form platform-reported strings. */
export interface NormalizedGame {
  /** Endcard-stable id: `${platform}:${nativeId}`. */
  id: EntityId;
  platform: Platform;
  /** The platform's own identifier (PSN titleId/concept id, Steam appId, ...). */
  nativeId: string;
  name: string;
  /** Square icon / app art. */
  iconUrl?: string;
  /** Wider key art / hero image, when the platform exposes one. */
  coverUrl?: string;
  /** e.g. ['PS5'] or ['PS4','PS5']. Free-form, platform-reported. */
  editions?: string[];
  genres?: string[];
  /** ISO 8601 date string. */
  releaseDate?: string;
}

/** Per-game playtime, however the platform expresses it. */
export interface Playtime {
  gameId: EntityId;
  /** Total minutes played. Undefined when the platform does not expose it. */
  totalMinutes?: number;
  /** Number of distinct play sessions, when known. */
  sessionCount?: number;
  /** ISO 8601. */
  firstPlayedAt?: string;
  /** ISO 8601. */
  lastPlayedAt?: string;
  /**
   * True when the value is inferred/approximate rather than reported by the
   * platform. PSN reports real `playDuration`, but other connectors may estimate.
   */
  estimated: boolean;
}

/**
 * A discrete play session. PSN does not expose true sessions, so the PSN
 * connector does not emit these — the type exists so connectors that DO
 * (e.g. Steam Deck activity) can populate it without a model change.
 */
export interface PlaySession {
  gameId: EntityId;
  startedAt: string; // ISO 8601
  endedAt?: string; // ISO 8601
  durationMinutes?: number;
}

// ---------------------------------------------------------------------------
// Achievements / trophies
// ---------------------------------------------------------------------------

/**
 * Normalized "achievement". PSN trophies, Xbox achievements, and Steam
 * achievements all collapse into this. `tier` carries the platform's native
 * weighting concept (PSN: bronze/silver/gold/platinum); platforms without
 * tiers use 'standard'.
 */
export type AchievementTier = 'standard' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface NormalizedAchievement {
  id: EntityId;
  gameId: EntityId;
  platform: Platform;
  name: string;
  description?: string;
  iconUrl?: string;
  tier: AchievementTier;
  earned: boolean;
  /** ISO 8601, present when earned and the platform reports the timestamp. */
  earnedAt?: string;
  /**
   * Global rarity as a percentage of players who own/earned it (0–100).
   * Lower = rarer. Undefined when the platform does not publish rarity.
   */
  rarityPercent?: number;
}

/** Per-title roll-up of achievement progress (cheap to fetch for every game). */
export interface AchievementTitleSummary {
  gameId: EntityId;
  platform: Platform;
  name: string;
  earnedCount: number;
  totalCount: number;
  /** 0–100. */
  progressPercent: number;
  /** PSN-style breakdown; platforms without tiers leave these at 0. */
  earnedByTier: Record<AchievementTier, number>;
  iconUrl?: string;
  lastUpdatedAt?: string; // ISO 8601
}

/** Account-wide achievement standing. */
export interface AchievementProfileSummary {
  platform: Platform;
  /** Platform's headline "level" (PSN trophy level), when present. */
  level?: number;
  earnedByTier: Record<AchievementTier, number>;
  totalEarned: number;
}

/** What a connector's `fetchAchievements` returns. */
export interface AchievementSet {
  profile: AchievementProfileSummary;
  titles: AchievementTitleSummary[];
  /**
   * Flattened individual achievements. May be a SUBSET of all achievements
   * (connectors cap deep per-title fetches for rate-limit safety); `titles`
   * always covers every game even when `achievements` does not.
   */
  achievements: NormalizedAchievement[];
}

// ---------------------------------------------------------------------------
// Derived stats — the cached, recap-ready aggregate
// ---------------------------------------------------------------------------

export interface LibraryItem {
  game: NormalizedGame;
  playtime?: Playtime;
  achievements?: AchievementTitleSummary;
}

export interface RarestAchievement {
  achievement: NormalizedAchievement;
  gameName: string;
}

/** A single "best value" entry: lots of hours for little money/effort, framed positively. */
export interface ValuePerHourItem {
  gameId: EntityId;
  gameName: string;
  totalMinutes: number;
  iconUrl?: string;
}

export interface GenreSlice {
  genre: string;
  minutes: number;
  share: number; // 0–1
}

/** 7x24 grid of play intensity ([dayOfWeek 0=Sun][hour 0–23] => weight). */
export type PlayHeatmap = number[][];

export type MilestoneKind = 'hours' | 'trophies' | 'platinums' | 'rareTrophy' | 'games';

/** A celebratory milestone — drives "healthy engagement" (never guilt). */
export interface Milestone {
  id: string;
  kind: MilestoneKind;
  label: string;
  description?: string;
  reached: boolean;
  value: number; // the user's current value
  threshold: number; // the milestone target
}

/**
 * The normalized, recap-ready snapshot persisted in `cached_stats`. This is the
 * ONLY shape the dashboard, recap engine, and AI layer read. It is intentionally
 * platform-neutral and serializable to JSON.
 */
export interface DerivedStats {
  schemaVersion: number;
  /** Which platforms contributed to this snapshot (enables unified recaps later). */
  platforms: Platform[];
  generatedAt: string; // ISO 8601

  totals: {
    totalMinutes: number;
    gameCount: number;
    achievementsEarned: number;
    platinums: number;
  };

  topGames: LibraryItem[];
  rarestAchievement?: RarestAchievement;
  bestValue: ValuePerHourItem[];
  genres: GenreSlice[];
  heatmap?: PlayHeatmap;
  achievementProfile?: AchievementProfileSummary;
  milestones?: Milestone[];
}

export const DERIVED_STATS_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Recap Battles — mutually-consented comparison of two players
// ---------------------------------------------------------------------------

export interface BattlePlayer {
  userId: string;
  displayName: string;
}

export interface BattleCategory {
  key: string;
  label: string;
  a: number;
  b: number;
  winner: 'a' | 'b' | 'tie';
  /** How to render the values. */
  format: 'hours' | 'number' | 'rarity';
  /** For rarity, lower wins; otherwise higher wins. */
  lowerWins?: boolean;
}

export interface BattleResult {
  a: BattlePlayer;
  b: BattlePlayer;
  categories: BattleCategory[];
  /** 0–100 gaming-taste compatibility. */
  compatibility: number;
  overallWinner: 'a' | 'b' | 'tie';
}

export function emptyTierRecord(): Record<AchievementTier, number> {
  return { standard: 0, bronze: 0, silver: 0, gold: 0, platinum: 0 };
}
