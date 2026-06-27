import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage for the one credential the app holds: the Endcard session JWT.
 * It is kept in the device keychain/keystore (expo-secure-store), never in plain
 * AsyncStorage. The app never stores a backend secret or a raw PSN token.
 */
const SESSION_KEY = 'endcard.session.v1';

export interface StoredSession {
  token: string;
  userId: string;
  expiresAt: string; // ISO 8601
}

export async function saveSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.token || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function isExpired(session: StoredSession): boolean {
  const t = Date.parse(session.expiresAt);
  return Number.isFinite(t) && t <= Date.now();
}
