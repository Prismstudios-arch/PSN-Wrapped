import { supabaseAdmin } from '../lib/supabase.js';
import { HttpError } from '../lib/httpError.js';

/**
 * Pro entitlements, backed by `public.pro_status`. In production the source of
 * truth is a payments provider (RevenueCat) writing here via webhook; the dev
 * grant below lets us build and test the Pro experience without a store build.
 */
export interface ProStatus {
  isPro: boolean;
  tier: 'free' | 'pro';
  since: string | null;
  expiresAt: string | null;
  source: string | null;
}

const FREE: ProStatus = { isPro: false, tier: 'free', since: null, expiresAt: null, source: null };

export async function getProStatus(userId: string): Promise<ProStatus> {
  const { data, error } = await supabaseAdmin
    .from('pro_status')
    .select('tier, since, expires_at, source')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw HttpError.upstream('Could not read your membership.');
  if (!data || data.tier !== 'pro') return FREE;
  const expired = data.expires_at ? Date.parse(data.expires_at) < Date.now() : false;
  return {
    isPro: !expired,
    tier: expired ? 'free' : 'pro',
    since: data.since ?? null,
    expiresAt: data.expires_at ?? null,
    source: data.source ?? null,
  };
}

export async function grantPro(
  userId: string,
  source: string,
  expiresAt: string | null = null,
): Promise<ProStatus> {
  const { error } = await supabaseAdmin.from('pro_status').upsert(
    {
      user_id: userId,
      tier: 'pro',
      source,
      since: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw HttpError.upstream('Could not update your membership.');
  return getProStatus(userId);
}
