import { pino } from 'pino';
import { env, isProd } from '../config/env.js';

/**
 * Structured logger. In dev we pretty-print; in prod we emit JSON.
 * Never log raw tokens or credentials — redact aggressively.
 */
export const logger = pino({
  level: isProd ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'token',
      'npsso',
      'accessToken',
      'refreshToken',
      '*.token',
      '*.npsso',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[redacted]',
  },
  transport: isProd
    ? undefined
    : {
        target: 'pino/file',
        options: { destination: 1 },
      },
  base: { service: 'endcard-backend', env: env.NODE_ENV },
});
