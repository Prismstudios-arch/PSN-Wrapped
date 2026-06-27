import Constants from 'expo-constants';
import type { BattleResult, DerivedStats, Platform } from '@endcard/shared';

export interface PublicUserDTO {
  id: string;
  displayName: string | null;
}
export type FriendStatusDTO = 'none' | 'pending_out' | 'pending_in' | 'accepted' | 'blocked';
export interface FriendSearchDTO extends PublicUserDTO {
  status: FriendStatusDTO;
}
export interface FriendsList {
  friends: PublicUserDTO[];
  incoming: PublicUserDTO[];
  outgoing: PublicUserDTO[];
}
export interface ProStatusDTO {
  isPro: boolean;
  tier: 'free' | 'pro';
  since: string | null;
  expiresAt: string | null;
  source: string | null;
}

/**
 * Typed client for the Endcard backend. The app talks ONLY to our backend —
 * never directly to a platform API, and it never holds a backend secret.
 *
 * The session token returned by /auth/connect is the only credential the app
 * stores; Phase 2 wires it into secure storage and the connect flow.
 */
/**
 * Resolve the backend base URL. During development on a physical device (Expo
 * Go), `localhost` would point at the phone, not your computer — so we rewrite
 * the host to the Expo dev server's LAN IP automatically. In production this
 * just returns the configured URL.
 */
function resolveBaseUrl(): string {
  const configured = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'http://localhost:4000';
  const isLocal = /localhost|127\.0\.0\.1/.test(configured);
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;
  if (isLocal && hostUri) {
    const host = hostUri.split(':')[0];
    const port = configured.split(':').pop();
    if (host) return `http://${host}:${port}`;
  }
  return configured;
}

const API_BASE_URL: string = resolveBaseUrl();

export interface Persona {
  title: string;
  blurb: string;
}

export interface RecapCommentary {
  persona: Persona;
  commentary: string;
  model: string | null;
  cached: boolean;
}

export interface ConnectResponse {
  token: string;
  expiresAt: string;
  user: { id: string };
  connection: { platform: Platform; platformUsername: string | null };
  connectedPlatforms: Platform[];
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, body: ApiErrorShape) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
  }
}

async function request<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; token?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : undefined;

  if (!res.ok) {
    const errBody = (json as { error?: ApiErrorShape } | undefined)?.error ?? {
      code: 'UNKNOWN',
      message: `Request failed (${res.status})`,
    };
    throw new ApiError(res.status, errBody);
  }
  return json as T;
}

export const api = {
  baseUrl: API_BASE_URL,

  connect(platform: Platform, token: string): Promise<ConnectResponse> {
    return request<ConnectResponse>('/auth/connect', { method: 'POST', body: { platform, token } });
  },

  fetchStats(token: string, platform?: Platform): Promise<{ stats: DerivedStats; refreshedPlatforms: Platform[] }> {
    return request('/stats/fetch', { method: 'POST', token, body: platform ? { platform } : {} });
  },

  getStats(token: string): Promise<{ stats: DerivedStats } | undefined> {
    return request('/stats', { method: 'GET', token });
  },

  account(token: string): Promise<{ user: { id: string }; connectedPlatforms: Platform[] }> {
    return request('/account', { method: 'GET', token });
  },

  commentary(token: string, regenerate = false): Promise<RecapCommentary> {
    return request('/recap/commentary', { method: 'POST', token, body: { regenerate } });
  },

  persona(token: string): Promise<{ persona: Persona }> {
    return request('/recap/persona', { method: 'GET', token });
  },

  disconnect(token: string): Promise<{ ok: boolean; message: string }> {
    return request('/account/disconnect', { method: 'POST', token });
  },

  friends: {
    list(token: string): Promise<FriendsList> {
      return request('/friends', { method: 'GET', token });
    },
    search(token: string, q: string): Promise<{ results: FriendSearchDTO[] }> {
      return request(`/friends/search?q=${encodeURIComponent(q)}`, { method: 'GET', token });
    },
    request(token: string, targetId: string): Promise<{ ok: boolean }> {
      return request('/friends/request', { method: 'POST', token, body: { targetId } });
    },
    accept(token: string, requesterId: string): Promise<{ ok: boolean }> {
      return request('/friends/accept', { method: 'POST', token, body: { requesterId } });
    },
    remove(token: string, userId: string): Promise<{ ok: boolean }> {
      return request('/friends/remove', { method: 'POST', token, body: { userId } });
    },
    battle(token: string, id: string): Promise<{ battle: BattleResult }> {
      return request(`/friends/${id}/battle`, { method: 'GET', token });
    },
  },

  pro: {
    status(token: string): Promise<ProStatusDTO> {
      return request('/pro/status', { method: 'GET', token });
    },
    activate(token: string, plan: 'lifetime' | 'season' = 'lifetime'): Promise<ProStatusDTO> {
      return request('/pro/activate', { method: 'POST', token, body: { plan } });
    },
    gift(token: string, recipientId: string): Promise<{ ok: boolean }> {
      return request('/pro/gift', { method: 'POST', token, body: { recipientId } });
    },
  },
};
