import type { ConnectorSession, Platform } from '@endcard/shared';
import { ConnectorAuthError } from '@endcard/shared';
import { supabaseAdmin } from '../lib/supabase.js';
import { open, seal } from '../lib/crypto.js';
import { env } from '../config/env.js';
import { HttpError } from '../lib/httpError.js';
import { getConnector } from '../connectors/registry.js';

/**
 * Owns the lifecycle of a user's platform connection and the secure handling of
 * derived tokens.
 *
 * SECURITY POSTURE
 *  - The raw platform credential (PSN NPSSO) is NEVER written to the database.
 *  - The derived access + refresh tokens are sealed with AES-256-GCM before
 *    storage and bounded by TOKEN_TTL_MINUTES.
 *  - `purge()` deletes the ciphertext and all cached stats in one shot.
 */

interface ConnectionRow {
  id: string;
  user_id: string;
  platform: Platform;
  platform_user_id: string;
  platform_username: string | null;
  access_token_enc: string;
  refresh_token_enc: string | null;
  access_token_expires_at: string | null;
  refresh_token_expires_at: string | null;
  created_at: string;
}

function ttlDeadline(createdAt: string): number {
  return new Date(createdAt).getTime() + env.TOKEN_TTL_MINUTES * 60_000;
}

/**
 * Connect (or reconnect) a user from a freshly-minted connector session.
 * Reuses the existing Endcard user when the same platform account reconnects,
 * so a user's id is stable across token refreshes and re-logins.
 *
 * @returns the Endcard user id.
 */
export async function connectUser(session: ConnectorSession): Promise<string> {
  const existing = await supabaseAdmin
    .from('platform_connections')
    .select('id, user_id')
    .eq('platform', session.platform)
    .eq('platform_user_id', session.platformUserId)
    .maybeSingle();

  if (existing.error) throw HttpError.upstream('Could not look up your connection.');

  let userId = existing.data?.user_id ?? null;
  const displayName = session.platformUsername ?? null;

  if (!userId) {
    const created = await supabaseAdmin
      .from('users')
      .insert({ display_name: displayName })
      .select('id')
      .single();
    if (created.error || !created.data) throw HttpError.upstream('Could not create your account.');
    userId = created.data.id;
  } else if (displayName) {
    // Keep the public handle (used for friend search) fresh on reconnect.
    await supabaseAdmin.from('users').update({ display_name: displayName }).eq('id', userId);
  }

  const sealedAccess = seal(session.accessToken).ciphertext;
  const sealedRefresh = session.refreshToken ? seal(session.refreshToken).ciphertext : null;

  const upsert = await supabaseAdmin
    .from('platform_connections')
    .upsert(
      {
        user_id: userId,
        platform: session.platform,
        platform_user_id: session.platformUserId,
        platform_username: session.platformUsername ?? null,
        access_token_enc: sealedAccess,
        refresh_token_enc: sealedRefresh,
        access_token_expires_at: session.accessTokenExpiresAt,
        refresh_token_expires_at: session.refreshTokenExpiresAt ?? null,
      },
      { onConflict: 'user_id,platform' },
    )
    .select('id')
    .single();

  if (upsert.error) throw HttpError.upstream('Could not save your connection.');
  return userId;
}

/** Load a connection row for a user+platform, or null. */
async function loadConnection(userId: string, platform: Platform): Promise<ConnectionRow | null> {
  const { data, error } = await supabaseAdmin
    .from('platform_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle();
  if (error) throw HttpError.upstream('Could not load your connection.');
  return (data as ConnectionRow | null) ?? null;
}

/** The platforms a user currently has connected. */
export async function listConnectedPlatforms(userId: string): Promise<Platform[]> {
  const { data, error } = await supabaseAdmin
    .from('platform_connections')
    .select('platform')
    .eq('user_id', userId);
  if (error) throw HttpError.upstream('Could not load your connections.');
  return (data ?? []).map((r) => r.platform as Platform);
}

/**
 * Produce a usable {@link ConnectorSession} for a user+platform, refreshing the
 * access token if it has expired and rotating the stored tokens. Throws a
 * {@link ConnectorAuthError} (→ 401) when the user must reconnect.
 */
export async function getUsableSession(userId: string, platform: Platform): Promise<ConnectorSession> {
  const row = await loadConnection(userId, platform);
  if (!row) throw new ConnectorAuthError(platform, 'No connection for this platform; please connect.', 'AUTH_INVALID');

  if (Date.now() > ttlDeadline(row.created_at)) {
    throw new ConnectorAuthError(platform, 'This connection has aged out; please reconnect.', 'AUTH_EXPIRED');
  }

  const accessExpiresAt = row.access_token_expires_at ?? new Date(0).toISOString();
  let session: ConnectorSession = {
    platform,
    platformUserId: row.platform_user_id,
    ...(row.platform_username ? { platformUsername: row.platform_username } : {}),
    accessToken: open(row.access_token_enc),
    accessTokenExpiresAt: accessExpiresAt,
    ...(row.refresh_token_enc ? { refreshToken: open(row.refresh_token_enc) } : {}),
    ...(row.refresh_token_expires_at ? { refreshTokenExpiresAt: row.refresh_token_expires_at } : {}),
  };

  // Refresh a bit early to avoid mid-request expiry.
  const skewMs = 60_000;
  if (Date.now() > new Date(accessExpiresAt).getTime() - skewMs) {
    const connector = getConnector(platform);
    session = await connector.refresh(session);
    await persistRefreshedSession(userId, session);
  }

  return session;
}

/** Persist rotated tokens after a refresh. */
export async function persistRefreshedSession(userId: string, session: ConnectorSession): Promise<void> {
  const { error } = await supabaseAdmin
    .from('platform_connections')
    .update({
      access_token_enc: seal(session.accessToken).ciphertext,
      refresh_token_enc: session.refreshToken ? seal(session.refreshToken).ciphertext : null,
      access_token_expires_at: session.accessTokenExpiresAt,
      refresh_token_expires_at: session.refreshTokenExpiresAt ?? null,
    })
    .eq('user_id', userId)
    .eq('platform', session.platform);
  if (error) throw HttpError.upstream('Could not update your session.');
}

/**
 * Disconnect everything: best-effort revoke each platform session, then delete
 * all connections and cached stats. After this call Endcard holds no tokens and
 * no derived data for the user.
 */
export async function purgeUser(userId: string): Promise<void> {
  const { data: rows } = await supabaseAdmin
    .from('platform_connections')
    .select('*')
    .eq('user_id', userId);

  for (const row of (rows as ConnectionRow[] | null) ?? []) {
    try {
      const connector = getConnector(row.platform);
      await connector.disconnect({
        platform: row.platform,
        platformUserId: row.platform_user_id,
        accessToken: open(row.access_token_enc),
        accessTokenExpiresAt: row.access_token_expires_at ?? new Date(0).toISOString(),
        ...(row.refresh_token_enc ? { refreshToken: open(row.refresh_token_enc) } : {}),
      });
    } catch {
      // Best-effort: a failed upstream revoke must not block local deletion.
    }
  }

  // Delete derived data and tokens. (cached_stats also cascades via FK, but be explicit.)
  await supabaseAdmin.from('cached_stats').delete().eq('user_id', userId);
  await supabaseAdmin.from('platform_connections').delete().eq('user_id', userId);
}
