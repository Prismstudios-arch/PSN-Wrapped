import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { listConnectedPlatforms, purgeUser } from '../services/connectionService.js';

export const accountRouter = Router();

/**
 * POST /account/disconnect
 * One call that wipes everything: best-effort revoke each platform session, then
 * delete all stored tokens and cached stats. After this, Endcard holds nothing.
 */
accountRouter.post(
  '/disconnect',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    await purgeUser(userId);
    res.status(200).json({ ok: true, message: 'Disconnected. Your tokens and stats have been deleted.' });
  }),
);

/**
 * GET /account
 * Lightweight account status for the app (which platforms are connected).
 */
accountRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const connectedPlatforms = await listConnectedPlatforms(userId);
    res.status(200).json({ user: { id: userId }, connectedPlatforms });
  }),
);
