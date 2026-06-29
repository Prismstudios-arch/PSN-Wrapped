import { Router } from 'express';
import { logger } from '../lib/logger.js';

/**
 * TEMPORARY diagnostic endpoint. The mobile app posts startup beacons here so we
 * can debug a TestFlight build from the server logs. No auth (low-risk, no data
 * read). Remove once startup is confirmed healthy.
 */
export const debugRouter = Router();

debugRouter.post('/log', (req, res) => {
  logger.info({ clientBeacon: req.body }, '📡 CLIENT BEACON');
  res.status(204).end();
});
