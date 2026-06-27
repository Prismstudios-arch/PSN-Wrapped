import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ConnectorAuthError, ConnectorError } from '@endcard/shared';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';

/** Map a thrown error to a safe JSON response. Single place to reason about leakage. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong on our end.';
  let details: unknown;

  if (err instanceof HttpError) {
    status = err.status;
    code = err.code;
    message = err.expose ? err.message : message;
    details = err.expose ? err.details : undefined;
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'BAD_REQUEST';
    message = 'Invalid request.';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err instanceof ConnectorAuthError) {
    // The user's platform credential is no longer valid — they must reconnect.
    status = 401;
    code = err.code; // AUTH_INVALID | AUTH_EXPIRED
    message = 'Your connected account needs to be reconnected.';
  } else if (err instanceof ConnectorError) {
    status = err.code === 'RATE_LIMITED' ? 429 : 502;
    code = err.code;
    message =
      err.code === 'RATE_LIMITED'
        ? 'The platform is rate-limiting us. Please try again shortly.'
        : 'A connected platform had a problem. Please try again.';
  }

  // Log full detail server-side (never to the client) — redaction is configured in the logger.
  logger.error(
    { err, status, code, path: req.path, method: req.method },
    'request failed',
  );

  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}
