import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { HttpError } from './lib/httpError.js';
import { authRouter } from './routes/auth.js';
import { statsRouter } from './routes/stats.js';
import { accountRouter } from './routes/account.js';
import { healthRouter } from './routes/health.js';
import { recapRouter } from './routes/recap.js';
import { friendsRouter } from './routes/friends.js';
import { proRouter } from './routes/pro.js';

/** Build the configured Express app (no `listen`, so it's testable in isolation). */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '64kb' }));
  app.use(pinoHttp({ logger }));

  // Baseline limiter for the whole API; sensitive routes add stricter limits.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/stats', statsRouter);
  app.use('/account', accountRouter);
  app.use('/recap', recapRouter);
  app.use('/friends', friendsRouter);
  app.use('/pro', proRouter);

  // 404 → structured error.
  app.use((req, _res, next) => {
    next(HttpError.notFound(`No route for ${req.method} ${req.path}`));
  });

  app.use(errorHandler);
  return app;
}
