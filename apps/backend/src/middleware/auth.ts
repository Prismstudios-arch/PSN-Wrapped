import type { NextFunction, Request, Response } from 'express';
import { verifyAppToken } from '../lib/jwt.js';
import { HttpError } from '../lib/httpError.js';

/** Shape attached to authenticated requests. */
export interface AuthedRequest extends Request {
  userId: string;
}

/**
 * Require a valid Endcard session JWT (Bearer). Populates `req.userId`.
 * The JWT is HS256-signed with the Supabase JWT secret, so the same token also
 * authorizes the app's direct, RLS-protected Supabase reads.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw HttpError.unauthorized('Missing Bearer token');
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const claims = verifyAppToken(token);
    (req as AuthedRequest).userId = claims.sub;
    next();
  } catch (err) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Invalid or expired session', { cause: err });
  }
}
