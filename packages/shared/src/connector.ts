import type { Platform } from './platform';
import type {
  AchievementSet,
  NormalizedGame,
  Playtime,
} from './models';

/**
 * THE PLATFORM-AGNOSTIC CONTRACT
 * ------------------------------
 * A `PlatformConnector` is the ONLY place platform-specific code is allowed to
 * live. Each connector takes a platform's raw credential, exchanges it for a
 * usable session, and maps platform payloads into the normalized model.
 *
 * To add Xbox/Steam/Nintendo: implement this interface in its own folder and
 * register it. The dashboard, recap engine, AI layer, and storage do not change.
 *
 * Security contract:
 *  - `connect()` runs server-side only. The raw credential (e.g. PSN NPSSO) is
 *    the user's master session secret and must never be persisted or returned
 *    to the client.
 *  - A `ConnectorSession` holds only the derived, scoped tokens needed for
 *    subsequent reads. The backend may persist these ENCRYPTED with a TTL.
 */

/** The opaque secret a user provides to connect a platform (PSN: NPSSO token). */
export interface ConnectorCredentials {
  rawToken: string;
}

/**
 * The result of `connect()` — everything later calls need, and nothing more.
 * Serializable so the backend can encrypt and cache it.
 */
export interface ConnectorSession {
  platform: Platform;
  /** The platform's stable account identifier (PSN accountId). */
  platformUserId: string;
  /** Display handle, when the platform exposes one (PSN onlineId). */
  platformUsername?: string;
  /** Short-lived token used for data reads. */
  accessToken: string;
  /** ISO 8601 expiry of `accessToken`. */
  accessTokenExpiresAt: string;
  /** Longer-lived token used by `refresh()`. May be absent. */
  refreshToken?: string;
  /** ISO 8601 expiry of `refreshToken`, when known. */
  refreshTokenExpiresAt?: string;
}

export interface FetchAchievementsOptions {
  /**
   * Max number of titles to fetch deep, per-achievement detail for (rarity,
   * individual trophies). Connectors must cap this to stay within rate limits;
   * `titles` summaries are always returned for every game regardless.
   */
  detailLimit?: number;
  /** Max titles to enumerate at all. */
  titleLimit?: number;
}

export interface FetchLibraryOptions {
  limit?: number;
}

export interface PlatformConnector {
  readonly platform: Platform;

  /**
   * Exchange a raw credential for a scoped session. Server-side only.
   * Throws {@link ConnectorAuthError} when the credential is invalid/expired.
   */
  connect(credentials: ConnectorCredentials): Promise<ConnectorSession>;

  /**
   * Refresh an expiring session using its refresh token, returning a new
   * session. Throws {@link ConnectorAuthError} when refresh is no longer possible
   * (the user must reconnect).
   */
  refresh(session: ConnectorSession): Promise<ConnectorSession>;

  /** The user's played library, mapped to normalized games. */
  fetchLibrary(session: ConnectorSession, options?: FetchLibraryOptions): Promise<NormalizedGame[]>;

  /** Per-game playtime. Values are flagged `estimated` when not directly reported. */
  fetchPlaytime(session: ConnectorSession, options?: FetchLibraryOptions): Promise<Playtime[]>;

  /** Trophies/achievements: account summary, per-title roll-ups, and (capped) detail. */
  fetchAchievements(session: ConnectorSession, options?: FetchAchievementsOptions): Promise<AchievementSet>;

  /**
   * Best-effort revocation of the platform session. Always safe to call.
   * Endcard additionally purges all stored tokens regardless of the outcome here.
   */
  disconnect(session: ConnectorSession): Promise<void>;
}

// ---------------------------------------------------------------------------
// Connector error taxonomy (shared so the backend can map to HTTP cleanly)
// ---------------------------------------------------------------------------

export type ConnectorErrorCode =
  | 'AUTH_INVALID' // credential/token rejected — user must reconnect
  | 'AUTH_EXPIRED' // token expired and refresh failed — user must reconnect
  | 'RATE_LIMITED' // platform throttled us — back off and retry
  | 'UPSTREAM_ERROR' // platform returned an unexpected error
  | 'NOT_SUPPORTED'; // operation not available for this platform

export class ConnectorError extends Error {
  readonly code: ConnectorErrorCode;
  readonly platform: Platform;
  readonly retryable: boolean;

  constructor(
    code: ConnectorErrorCode,
    platform: Platform,
    message: string,
    options?: { retryable?: boolean; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'ConnectorError';
    this.code = code;
    this.platform = platform;
    this.retryable = options?.retryable ?? (code === 'RATE_LIMITED' || code === 'UPSTREAM_ERROR');
  }
}

/** Thrown when the user needs to reconnect (invalid/expired credential). */
export class ConnectorAuthError extends ConnectorError {
  constructor(platform: Platform, message: string, code: 'AUTH_INVALID' | 'AUTH_EXPIRED' = 'AUTH_INVALID', cause?: unknown) {
    super(code, platform, message, { retryable: false, cause });
    this.name = 'ConnectorAuthError';
  }
}
