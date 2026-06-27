import * as psnApiNS from 'psn-api';
import type { AuthorizationPayload } from 'psn-api';
import { ConnectorAuthError, ConnectorError } from '@endcard/shared';

// CJS/ESM interop: psn-api ships as CommonJS, and Node's static detection of its
// named exports differs by version (works on Node 24, fails on Node 20). Binding
// the functions at runtime from the module's default/namespace works everywhere.
const psnApi = (psnApiNS as unknown as { default?: typeof psnApiNS }).default ?? psnApiNS;
const {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  exchangeRefreshTokenForAuthTokens,
  getProfileFromUserName,
  getTitleTrophies,
  getUserPlayedGames,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
  getUserTrophyProfileSummary,
} = psnApi;

/**
 * Thin wrapper around `psn-api` that:
 *  - normalizes its error surface into Endcard's ConnectorError taxonomy, and
 *  - keeps every direct PSN call in one file so the connector logic above reads cleanly.
 *
 * This is the ONLY module in the codebase that imports `psn-api`.
 */

const PLATFORM = 'psn' as const;

function toConnectorError(operation: string, err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes('401') || lower.includes('unauthor') || lower.includes('invalid_grant') || lower.includes('access token')) {
    throw new ConnectorAuthError(PLATFORM, `PSN rejected the session during ${operation}`, 'AUTH_EXPIRED', err);
  }
  if (lower.includes('429') || lower.includes('rate') || lower.includes('too many')) {
    throw new ConnectorError('RATE_LIMITED', PLATFORM, `PSN rate-limited ${operation}`, { retryable: true, cause: err });
  }
  throw new ConnectorError('UPSTREAM_ERROR', PLATFORM, `PSN error during ${operation}: ${message}`, { cause: err });
}

async function guarded<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    return toConnectorError(operation, err);
  }
}

export interface PsnAuthTokens {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresInSeconds: number;
}

export async function psnAuthFromNpsso(npsso: string): Promise<PsnAuthTokens> {
  // NPSSO → access code → auth tokens. The NPSSO is never persisted.
  let accessCode: string;
  try {
    accessCode = await exchangeNpssoForAccessCode(npsso);
  } catch (err) {
    // A bad/expired NPSSO fails here; treat as a credential problem, not an outage.
    throw new ConnectorAuthError(PLATFORM, 'That PlayStation token was not accepted. Please grab a fresh one.', 'AUTH_INVALID', err);
  }
  const tokens = await guarded('token exchange', () => exchangeAccessCodeForAuthTokens(accessCode));
  return {
    accessToken: tokens.accessToken,
    expiresInSeconds: tokens.expiresIn,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresInSeconds: tokens.refreshTokenExpiresIn,
  };
}

export async function psnAuthFromRefresh(refreshToken: string): Promise<PsnAuthTokens> {
  const tokens = await guarded('token refresh', () => exchangeRefreshTokenForAuthTokens(refreshToken)).catch((err) => {
    throw new ConnectorAuthError(PLATFORM, 'Your PlayStation connection expired. Please reconnect.', 'AUTH_EXPIRED', err);
  });
  return {
    accessToken: tokens.accessToken,
    expiresInSeconds: tokens.expiresIn,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresInSeconds: tokens.refreshTokenExpiresIn,
  };
}

export function authPayload(accessToken: string): AuthorizationPayload {
  return { accessToken };
}

/** Resolve the authenticated user's own accountId + onlineId via the "me" alias. */
export async function psnGetMe(accessToken: string): Promise<{ accountId: string; onlineId?: string }> {
  const result = await guarded('profile lookup', () => getProfileFromUserName(authPayload(accessToken), 'me'));
  const accountId = result.profile?.accountId;
  if (!accountId) {
    throw new ConnectorError('UPSTREAM_ERROR', PLATFORM, 'PSN did not return an account id for the connected user');
  }
  return { accountId, onlineId: result.profile?.onlineId };
}

// Re-export the raw read functions (already guard them at the call site via `guarded`).
export {
  getUserPlayedGames,
  getUserTitles,
  getUserTrophyProfileSummary,
  getTitleTrophies,
  getUserTrophiesEarnedForTitle,
  guarded as psnGuarded,
};
