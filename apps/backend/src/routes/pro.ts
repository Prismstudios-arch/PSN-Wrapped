import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { getProStatus, grantPro } from '../services/proService.js';
import { assertFriends } from '../services/friendsService.js';
import { env, isProd } from '../config/env.js';

// Pro can be granted directly in dev, or on a prod backend when ALLOW_DEV_PRO is
// set (for TestFlight). Real paid launch sets neither and wires RevenueCat.
const canDevGrant = !isProd || env.ALLOW_DEV_PRO;

export const proRouter = Router();
proRouter.use(requireAuth);

proRouter.get(
  '/status',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    res.json(await getProStatus(userId));
  }),
);

/**
 * Activate Pro. In production this is driven by the App Store via RevenueCat
 * (this endpoint would verify a receipt / be replaced by a webhook). In dev it
 * grants Pro directly so the Pro experience is testable before a store build.
 */
proRouter.post(
  '/activate',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    if (!canDevGrant) {
      throw new HttpError(501, 'PURCHASES_NOT_WIRED', 'In-app purchases go live with the App Store build.');
    }
    const plan = z.enum(['lifetime', 'season']).default('lifetime').parse((req.body ?? {}).plan);
    const expiresAt = plan === 'season' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null;
    res.json(await grantPro(userId, `dev:${plan}`, expiresAt));
  }),
);

/**
 * Gift Pro to a mutual friend. In production this requires a purchased gift; in
 * dev it grants directly (the recipient must be a consented friend).
 */
proRouter.post(
  '/gift',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { recipientId } = z.object({ recipientId: z.string().uuid() }).parse(req.body);
    await assertFriends(userId, recipientId);
    if (!canDevGrant) {
      throw new HttpError(501, 'PURCHASES_NOT_WIRED', 'Gifting goes live with the App Store build.');
    }
    await grantPro(recipientId, `gift:${userId}`, null);
    res.json({ ok: true });
  }),
);
