/**
 * Application HTTP error. Thrown by routes/services and translated to a JSON
 * response by the error-handling middleware. Keeps user-facing messages clean
 * and machine-readable via `code`.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly expose: boolean;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: { expose?: boolean; details?: unknown; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    // 4xx messages are safe to show the user; 5xx are not, by default.
    this.expose = options?.expose ?? status < 500;
    this.details = options?.details;
  }

  static badRequest(message: string, details?: unknown): HttpError {
    return new HttpError(400, 'BAD_REQUEST', message, { details });
  }
  static unauthorized(message = 'Authentication required'): HttpError {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Not allowed'): HttpError {
    return new HttpError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Not found'): HttpError {
    return new HttpError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string): HttpError {
    return new HttpError(409, 'CONFLICT', message);
  }
  static tooManyRequests(message = 'Slow down a moment'): HttpError {
    return new HttpError(429, 'RATE_LIMITED', message);
  }
  static upstream(message = 'A connected platform had a problem'): HttpError {
    return new HttpError(502, 'UPSTREAM_ERROR', message);
  }
}
