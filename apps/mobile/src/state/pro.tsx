import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type ProStatusDTO } from '@/lib/api';
import { useSession } from './session';

/**
 * Pro entitlement state. Reads /pro/status and exposes actions. In production
 * `activate`/`gift` are driven by the App Store (RevenueCat); in dev they grant
 * directly so the Pro experience is fully testable.
 */
interface ProContextValue {
  isPro: boolean;
  status: ProStatusDTO | null;
  loading: boolean;
  refresh: () => Promise<void>;
  activate: (plan?: 'lifetime' | 'season') => Promise<void>;
  gift: (recipientId: string) => Promise<void>;
}

const ProContext = createContext<ProContextValue | null>(null);

export function ProProvider({ children }: { children: ReactNode }) {
  const { token, status: sessionStatus } = useSession();
  const [status, setStatus] = useState<ProStatusDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) {
      setStatus(null);
      setLoading(false);
      return;
    }
    try {
      setStatus(await api.pro.status(token));
    } catch {
      // leave previous status; not fatal
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (sessionStatus === 'signedIn') void refresh();
    else if (sessionStatus === 'signedOut') {
      setStatus(null);
      setLoading(false);
    }
  }, [sessionStatus, refresh]);

  const activate = useCallback(
    async (plan: 'lifetime' | 'season' = 'lifetime') => {
      if (!token) return;
      const next = await api.pro.activate(token, plan);
      setStatus(next);
    },
    [token],
  );

  const gift = useCallback(
    async (recipientId: string) => {
      if (!token) return;
      await api.pro.gift(token, recipientId);
    },
    [token],
  );

  const value = useMemo<ProContextValue>(
    () => ({ isPro: status?.isPro ?? false, status, loading, refresh, activate, gift }),
    [status, loading, refresh, activate, gift],
  );

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro(): ProContextValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used within ProProvider');
  return ctx;
}
