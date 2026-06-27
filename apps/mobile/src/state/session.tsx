import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Platform } from '@endcard/shared';
import { api, ApiError } from '@/lib/api';
import { clearSession, isExpired, loadSession, saveSession, type StoredSession } from '@/lib/storage';

/**
 * App-wide auth/session state. Holds the Endcard session JWT (in the keychain)
 * and which platforms are connected. Drives the onboarding-vs-app routing gate.
 */
export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

interface SessionContextValue {
  status: SessionStatus;
  userId: string | null;
  token: string | null;
  connectedPlatforms: Platform[];
  /** Connect a platform with its raw credential (PSN: NPSSO). Throws ApiError on failure. */
  connect: (platform: Platform, credential: string) => Promise<void>;
  /** Disconnect + wipe everything server-side, then sign out locally. */
  disconnect: () => Promise<void>;
  /** Re-read connected platforms from the backend. */
  refreshAccount: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [session, setSession] = useState<StoredSession | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Platform[]>([]);

  // Restore a saved session on launch.
  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await loadSession();
      if (!active) return;
      if (saved && !isExpired(saved)) {
        setSession(saved);
        setStatus('signedIn');
        // Best-effort refresh of connection list; don't block sign-in on it.
        api
          .account(saved.token)
          .then((res) => active && setConnectedPlatforms(res.connectedPlatforms))
          .catch(() => undefined);
      } else {
        if (saved) await clearSession();
        setStatus('signedOut');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const connect = useCallback(async (platform: Platform, credential: string) => {
    const res = await api.connect(platform, credential);
    const next: StoredSession = { token: res.token, userId: res.user.id, expiresAt: res.expiresAt };
    await saveSession(next);
    setSession(next);
    setConnectedPlatforms(res.connectedPlatforms);
    setStatus('signedIn');
  }, []);

  const disconnect = useCallback(async () => {
    if (session) {
      try {
        await api.disconnect(session.token);
      } catch (err) {
        // If the token is already invalid, that's fine — we're signing out anyway.
        if (!(err instanceof ApiError) || err.status < 400) {
          // network or unexpected error: still proceed to local sign-out
        }
      }
    }
    await clearSession();
    setSession(null);
    setConnectedPlatforms([]);
    setStatus('signedOut');
  }, [session]);

  const refreshAccount = useCallback(async () => {
    if (!session) return;
    try {
      const res = await api.account(session.token);
      setConnectedPlatforms(res.connectedPlatforms);
    } catch {
      // ignore transient errors
    }
  }, [session]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      userId: session?.userId ?? null,
      token: session?.token ?? null,
      connectedPlatforms,
      connect,
      disconnect,
      refreshAccount,
    }),
    [status, session, connectedPlatforms, connect, disconnect, refreshAccount],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
