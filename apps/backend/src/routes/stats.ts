import { Router } from 'express';
import { z } from 'zod';
import { PLATFORMS, type DerivedStats, type Platform } from '@endcard/shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { getCachedStats, refreshStatsForPlatform } from '../services/statsService.js';
import { listConnectedPlatforms } from '../services/connectionService.js';

export const statsRouter = Router();

const FetchBody = z.object({
  platform: z.enum(PLATFORMS).optional(),
});

/**
 * POST /stats/fetch
 * Pull fresh data from the connector(s) and write the normalized cached stats.
 * Defaults to the user's connected platform(s).
 */
statsRouter.post(
  '/fetch',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { platform } = FetchBody.parse(req.body ?? {});

    const connected = await listConnectedPlatforms(userId);
    if (connected.length === 0) {
      throw HttpError.badRequest('No connected platforms. Connect an account first.');
    }

    const targets: Platform[] = platform ? [platform] : connected;
    for (const p of targets) {
      if (!connected.includes(p)) {
        throw HttpError.badRequest(`You don't have ${p} connected.`);
      }
    }

    // PSN-only today, but loop now so multi-platform "just works" later.
    let latest: DerivedStats | null = null;
    for (const p of targets) {
      latest = await refreshStatsForPlatform(userId, p);
    }

    res.status(200).json({ stats: latest, refreshedPlatforms: targets });
  }),
);

/**
 * GET /stats
 * Return the cached snapshot for the offline-first dashboard. 204 when empty.
 */
statsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const stats = await getCachedStats(userId);
    if (!stats) {
      res.status(204).end();
      return;
    }
    res.status(200).json({ stats });
  }),
);
