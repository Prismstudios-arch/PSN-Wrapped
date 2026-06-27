import { Router } from 'express';
import { availablePlatforms } from '../connectors/registry.js';

export const healthRouter = Router();

/** GET /health — liveness + which connectors are wired up. No auth. */
healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'endcard-backend',
    platforms: availablePlatforms(),
    time: new Date().toISOString(),
  });
});
