import { useCallback, useEffect, useState } from 'react';
import type { DerivedStats } from '@endcard/shared';
import { api, ApiError } from '@/lib/api';
import { useSession } from './session';

/**
 * Offline-first recap stats. On mount it renders the cached snapshot instantly,
 * then refreshes from the backend in the background when the cache is missing or
 * stale. `sync()` forces a fresh pull. Auth failures surface `needsReconnect` so
 * the UI can offer a clean re-connect path (never a dead end).
 */
const STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface StatsState {
  stats: DerivedStats | null;
  loading: boolean; // initial cache load
  syncing: boolean; // pulling fresh from platform
  error: string | null;
  needsReconnect: boolean;
  sync: () => Promise<void>;
}

function isStale(stats: DerivedStats | null): boolean {
  if (!stats) return true;
  const t = Date.parse(stats.generatedAt);
  return !Number.isFinite(t) || Date.now() - t > STALE_MS;
}

export function useStats(): StatsState {
  const { token } = useSession();
  const [stats, setStats] = useState<DerivedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  const sync = useCallback(async () => {
    if (!token) return;
    setSyncing(true);
    setError(null);
    setNeedsReconnect(false);
    try {
      const res = await api.fetchStats(token);
      setStats(res.stats);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setNeedsReconnect(true);
        setError('Your PlayStation connection expired. Reconnect to refresh your recap.');
      } else {
        setError(
          err instanceof ApiError ? err.message : 'Could not refresh right now. Pull to try again.',
        );
      }
    } finally {
      setSyncing(false);
    }
  }, [token]);

  // Load cache, then background-refresh if stale/empty.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      let cached: DerivedStats | null = null;
      try {
        const res = await api.getStats(token);
        cached = res?.stats ?? null;
        if (active) setStats(cached);
      } catch {
        // missing/unreadable cache is not fatal
      } finally {
        if (active) setLoading(false);
      }
      if (active && isStale(cached)) void sync();
    })();
    return () => {
      active = false;
    };
  }, [token, sync]);

  return { stats, loading, syncing, error, needsReconnect, sync };
}
