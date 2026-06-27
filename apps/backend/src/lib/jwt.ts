import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Mint a Supabase-compatible session JWT (HS256, signed with the project JWT
 * secret) so the app can talk to Supabase under Row Level Security as exactly
 * one user. The app never receives a backend secret or a platform credential —
 * only this scoped JWT, whose `sub` is the Endcard user id.
 */
const ISSUER = 'endcard-backend';
// App session lifetime. Long-lived because the sensitive platform tokens are
// refreshed separately server-side; this JWT only scopes the app to one user.
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface AppTokenClaims {
  sub: string; // Endcard user id (== Supabase auth.users / public.users id)
  role: 'authenticated';
  aud: 'authenticated';
  iss: string;
  iat: number;
  exp: number;
}

export function issueAppToken(userId: string): { token: string; expiresAt: string } {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = nowSeconds + ACCESS_TTL_SECONDS;
  const token = jwt.sign(
    {
      sub: userId,
      role: 'authenticated',
      aud: 'authenticated',
      iss: ISSUER,
      iat: nowSeconds,
      exp,
    } satisfies AppTokenClaims,
    env.SUPABASE_JWT_SECRET,
    { algorithm: 'HS256' },
  );
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifyAppToken(token: string): AppTokenClaims {
  const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET, {
    algorithms: ['HS256'],
    audience: 'authenticated',
  });
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('Invalid token payload');
  }
  return decoded as AppTokenClaims;
}
