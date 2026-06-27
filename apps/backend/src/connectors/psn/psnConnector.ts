import {
  ConnectorError,
  emptyTierRecord,
  makeEntityId,
  type AchievementProfileSummary,
  type AchievementSet,
  type AchievementTier,
  type AchievementTitleSummary,
  type ConnectorCredentials,
  type ConnectorSession,
  type FetchAchievementsOptions,
  type FetchLibraryOptions,
  type NormalizedAchievement,
  type NormalizedGame,
  type PlatformConnector,
  type Playtime,
} from '@endcard/shared';
import { parseIsoDurationToMinutes } from '../../lib/duration.js';
import { createTtlMemo, mapWithConcurrency } from '../../lib/concurrency.js';
import {
  authPayload,
  getTitleTrophies,
  getUserPlayedGames,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
  getUserTrophyProfileSummary,
  psnAuthFromNpsso,
  psnAuthFromRefresh,
  psnGetMe,
  psnGuarded,
} from './psnClient.js';

const PLATFORM = 'psn' as const;

// Bounds that keep us comfortably inside PSN's rate limits on a single sync.
const LIBRARY_PAGE_SIZE = 200;
const LIBRARY_MAX = 500;
const TITLE_PAGE_SIZE = 200;
const TITLE_MAX = 500;
const DEFAULT_DETAIL_LIMIT = 20; // titles we fetch per-trophy detail for (rarest hunt)
const DETAIL_CONCURRENCY = 4;

// ── Boundary types: the subset of PSN payloads we actually read. ──────────────
interface PsnPlayedTitle {
  titleId?: string;
  name?: string;
  localizedName?: string;
  imageUrl?: string;
  localizedImageUrl?: string;
  category?: string;
  playCount?: number;
  playDuration?: string; // ISO 8601 duration, e.g. "PT47H17M9S"
  firstPlayedDateTime?: string;
  lastPlayedDateTime?: string;
}
interface PsnTierCounts {
  bronze?: number;
  silver?: number;
  gold?: number;
  platinum?: number;
}
interface PsnTrophyTitle {
  npServiceName?: 'trophy' | 'trophy2';
  npCommunicationId: string;
  trophyTitleName?: string;
  trophyTitleIconUrl?: string;
  definedTrophies?: PsnTierCounts;
  earnedTrophies?: PsnTierCounts;
  progress?: number;
  lastUpdatedDateTime?: string;
}
interface PsnTrophyDef {
  trophyId: number;
  trophyName?: string;
  trophyDetail?: string;
  trophyIconUrl?: string;
  trophyType?: AchievementTier;
  trophyEarnedRate?: string;
}
interface PsnEarnedTrophy {
  trophyId: number;
  earned?: boolean;
  earnedDateTime?: string;
  trophyType?: AchievementTier;
  trophyEarnedRate?: string;
}

/**
 * PSN's "played games" list includes media apps (YouTube, Netflix, Spotify,
 * Twitch, BBC iPlayer…) alongside real games, which badly skews a gaming recap.
 * Game categories end in `_game` (e.g. `ps5_native_game`, `ps4_game`); every
 * app category contains `app` (`ps5_native_media_app`,
 * `ps4_videoservice_web_app`, `ps5_web_based_media_app`). A missing category is
 * kept (better to include an unknown than drop a real game).
 */
function isGameTitle(category?: string): boolean {
  if (!category) return true;
  return !category.includes('app');
}

function editionsFromCategory(category?: string): string[] | undefined {
  switch (category) {
    case 'ps5_native_game':
      return ['PS5'];
    case 'ps4_game':
      return ['PS4'];
    case 'ps3_game':
      return ['PS3'];
    case 'pspc_game':
      return ['PC'];
    default:
      return undefined;
  }
}

function sumTiers(counts: PsnTierCounts | undefined): number {
  if (!counts) return 0;
  return (counts.bronze ?? 0) + (counts.silver ?? 0) + (counts.gold ?? 0) + (counts.platinum ?? 0);
}

function tierRecordFrom(counts: PsnTierCounts | undefined): Record<AchievementTier, number> {
  const rec = emptyTierRecord();
  rec.bronze = counts?.bronze ?? 0;
  rec.silver = counts?.silver ?? 0;
  rec.gold = counts?.gold ?? 0;
  rec.platinum = counts?.platinum ?? 0;
  return rec;
}

function nowPlusSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

/**
 * The PlayStation Network connector — Endcard's first concrete
 * {@link PlatformConnector}. Every PSN-specific assumption lives here.
 */
export class PsnConnector implements PlatformConnector {
  readonly platform = PLATFORM;

  // Avoid duplicate `getUserPlayedGames` calls when fetchLibrary + fetchPlaytime
  // run back-to-back in one sync. Keyed by accessToken; short TTL.
  private readonly playedGamesMemo = createTtlMemo<PsnPlayedTitle[]>(15_000);

  async connect(credentials: ConnectorCredentials): Promise<ConnectorSession> {
    const tokens = await psnAuthFromNpsso(credentials.rawToken);
    const me = await psnGetMe(tokens.accessToken);
    return {
      platform: PLATFORM,
      platformUserId: me.accountId,
      ...(me.onlineId ? { platformUsername: me.onlineId } : {}),
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: nowPlusSeconds(tokens.expiresInSeconds),
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: nowPlusSeconds(tokens.refreshTokenExpiresInSeconds),
    };
  }

  async refresh(session: ConnectorSession): Promise<ConnectorSession> {
    if (!session.refreshToken) {
      throw new ConnectorError('AUTH_EXPIRED', PLATFORM, 'No refresh token available; reconnect required', {
        retryable: false,
      });
    }
    const tokens = await psnAuthFromRefresh(session.refreshToken);
    return {
      ...session,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: nowPlusSeconds(tokens.expiresInSeconds),
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: nowPlusSeconds(tokens.refreshTokenExpiresInSeconds),
    };
  }

  private async getPlayedTitles(session: ConnectorSession, max: number): Promise<PsnPlayedTitle[]> {
    return this.playedGamesMemo.get(session.accessToken, async () => {
      const auth = authPayload(session.accessToken);
      const collected: PsnPlayedTitle[] = [];
      let offset = 0;
      for (;;) {
        const page = (await psnGuarded('played games', () =>
          getUserPlayedGames(auth, session.platformUserId, { limit: LIBRARY_PAGE_SIZE, offset }),
        )) as unknown as { titles?: PsnPlayedTitle[]; totalItemCount?: number };
        const titles = page.titles ?? [];
        collected.push(...titles);
        offset += titles.length;
        const total = page.totalItemCount ?? collected.length;
        if (titles.length === 0 || collected.length >= total || collected.length >= max) break;
      }
      // Drop media apps so the recap is about games, not YouTube/Netflix.
      return collected.filter((t) => isGameTitle(t.category)).slice(0, max);
    });
  }

  async fetchLibrary(session: ConnectorSession, options?: FetchLibraryOptions): Promise<NormalizedGame[]> {
    const titles = await this.getPlayedTitles(session, options?.limit ?? LIBRARY_MAX);
    return titles
      .filter((t) => t.titleId)
      .map((t): NormalizedGame => {
        const editions = editionsFromCategory(t.category);
        const cover = t.localizedImageUrl ?? t.imageUrl;
        return {
          id: makeEntityId(PLATFORM, t.titleId as string),
          platform: PLATFORM,
          nativeId: t.titleId as string,
          name: t.localizedName ?? t.name ?? 'Unknown title',
          ...(cover ? { iconUrl: cover, coverUrl: cover } : {}),
          ...(editions ? { editions } : {}),
        };
      });
  }

  async fetchPlaytime(session: ConnectorSession, options?: FetchLibraryOptions): Promise<Playtime[]> {
    const titles = await this.getPlayedTitles(session, options?.limit ?? LIBRARY_MAX);
    return titles
      .filter((t) => t.titleId)
      .map((t): Playtime => {
        const totalMinutes = parseIsoDurationToMinutes(t.playDuration);
        return {
          gameId: makeEntityId(PLATFORM, t.titleId as string),
          // PSN reports real play duration → not estimated. Absent → undefined, not zero.
          ...(totalMinutes !== undefined ? { totalMinutes } : {}),
          ...(typeof t.playCount === 'number' ? { sessionCount: t.playCount } : {}),
          ...(t.firstPlayedDateTime ? { firstPlayedAt: t.firstPlayedDateTime } : {}),
          ...(t.lastPlayedDateTime ? { lastPlayedAt: t.lastPlayedDateTime } : {}),
          estimated: false,
        };
      });
  }

  async fetchAchievements(session: ConnectorSession, options?: FetchAchievementsOptions): Promise<AchievementSet> {
    const detailLimit = options?.detailLimit ?? DEFAULT_DETAIL_LIMIT;
    const titleMax = options?.titleLimit ?? TITLE_MAX;

    const [profile, titleSummaries] = await Promise.all([
      this.fetchProfileSummary(session),
      this.fetchTitleSummaries(session, titleMax),
    ]);

    // Hunt for the rarest EARNED trophy among the most-progressed titles.
    const detailTargets = [...titleSummaries.raw]
      .filter((t) => sumTiers(t.earnedTrophies) > 0)
      .sort((a, b) => sumTiers(b.earnedTrophies) - sumTiers(a.earnedTrophies))
      .slice(0, detailLimit);

    const detailed = await mapWithConcurrency(detailTargets, DETAIL_CONCURRENCY, (title) =>
      this.fetchTitleTrophies(session, title),
    );

    return {
      profile,
      titles: titleSummaries.normalized,
      achievements: detailed.flat(),
    };
  }

  private async fetchProfileSummary(session: ConnectorSession): Promise<AchievementProfileSummary> {
    const auth = authPayload(session.accessToken);
    const summary = (await psnGuarded('trophy summary', () =>
      getUserTrophyProfileSummary(auth, session.platformUserId),
    )) as unknown as { trophyLevel?: number | string; earnedTrophies?: PsnTierCounts };

    const earnedByTier = tierRecordFrom(summary.earnedTrophies);
    const totalEarned = earnedByTier.bronze + earnedByTier.silver + earnedByTier.gold + earnedByTier.platinum;
    const level = typeof summary.trophyLevel === 'string' ? Number(summary.trophyLevel) : summary.trophyLevel;
    return {
      platform: PLATFORM,
      ...(typeof level === 'number' && !Number.isNaN(level) ? { level } : {}),
      earnedByTier,
      totalEarned,
    };
  }

  private async fetchTitleSummaries(
    session: ConnectorSession,
    max: number,
  ): Promise<{ normalized: AchievementTitleSummary[]; raw: PsnTrophyTitle[] }> {
    const auth = authPayload(session.accessToken);
    const raw: PsnTrophyTitle[] = [];
    let offset = 0;
    for (;;) {
      const page = (await psnGuarded('trophy titles', () =>
        getUserTitles(auth, session.platformUserId, { limit: TITLE_PAGE_SIZE, offset }),
      )) as unknown as { trophyTitles?: PsnTrophyTitle[]; totalItemCount?: number };
      const titles = page.trophyTitles ?? [];
      raw.push(...titles);
      offset += titles.length;
      const total = page.totalItemCount ?? raw.length;
      if (titles.length === 0 || raw.length >= total || raw.length >= max) break;
    }
    const bounded = raw.slice(0, max);

    const normalized = bounded.map((t): AchievementTitleSummary => {
      const earnedCount = sumTiers(t.earnedTrophies);
      const totalCount = sumTiers(t.definedTrophies);
      return {
        gameId: makeEntityId(PLATFORM, t.npCommunicationId),
        platform: PLATFORM,
        name: t.trophyTitleName ?? 'Unknown title',
        earnedCount,
        totalCount,
        progressPercent: t.progress ?? (totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0),
        earnedByTier: tierRecordFrom(t.earnedTrophies),
        ...(t.trophyTitleIconUrl ? { iconUrl: t.trophyTitleIconUrl } : {}),
        ...(t.lastUpdatedDateTime ? { lastUpdatedAt: t.lastUpdatedDateTime } : {}),
      };
    });

    return { normalized, raw: bounded };
  }

  private async fetchTitleTrophies(
    session: ConnectorSession,
    title: PsnTrophyTitle,
  ): Promise<NormalizedAchievement[]> {
    const auth = authPayload(session.accessToken);
    const npServiceName = title.npServiceName ?? 'trophy2';
    const gameId = makeEntityId(PLATFORM, title.npCommunicationId);

    // Definitions (names, icons, global rarity) + this user's earned status.
    const [defsResp, earnedResp] = await Promise.all([
      psnGuarded('title trophy definitions', () =>
        getTitleTrophies(auth, title.npCommunicationId, 'all', { npServiceName }),
      ) as Promise<{ trophies?: PsnTrophyDef[] }>,
      psnGuarded('title trophies earned', () =>
        getUserTrophiesEarnedForTitle(auth, session.platformUserId, title.npCommunicationId, 'all', { npServiceName }),
      ) as Promise<{ trophies?: PsnEarnedTrophy[] }>,
    ]);

    const earnedById = new Map<number, PsnEarnedTrophy>();
    for (const e of earnedResp.trophies ?? []) earnedById.set(e.trophyId, e);

    const out: NormalizedAchievement[] = [];
    for (const def of defsResp.trophies ?? []) {
      const earned = earnedById.get(def.trophyId);
      if (!earned?.earned) continue; // we only surface trophies the user actually has
      const rateStr = earned.trophyEarnedRate ?? def.trophyEarnedRate;
      const rarity = rateStr !== undefined ? Number(rateStr) : undefined;
      out.push({
        id: makeEntityId(PLATFORM, title.npCommunicationId, String(def.trophyId)),
        gameId,
        platform: PLATFORM,
        name: def.trophyName ?? 'Unknown trophy',
        ...(def.trophyDetail ? { description: def.trophyDetail } : {}),
        ...(def.trophyIconUrl ? { iconUrl: def.trophyIconUrl } : {}),
        tier: (earned.trophyType ?? def.trophyType ?? 'bronze') as AchievementTier,
        earned: true,
        ...(earned.earnedDateTime ? { earnedAt: earned.earnedDateTime } : {}),
        ...(rarity !== undefined && !Number.isNaN(rarity) ? { rarityPercent: rarity } : {}),
      });
    }
    return out;
  }

  async disconnect(_session: ConnectorSession): Promise<void> {
    // PSN has no token-revocation endpoint exposed by psn-api. The session
    // simply expires. Endcard's `/account/disconnect` deletes the stored
    // (encrypted) tokens, which is the meaningful action for the user.
    return;
  }
}

export const psnConnector = new PsnConnector();
