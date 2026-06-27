import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Service-role Supabase client. Bypasses Row Level Security, so it is used ONLY
 * inside backend services that have already authorized the caller. It is never
 * exposed to the app. RLS still protects the data path the app uses directly
 * (with its scoped JWT).
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { 'x-endcard-service': 'backend' },
    },
  },
);
