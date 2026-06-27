import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { derivePersona } from '../services/personaService.js';
import { getCachedStats } from '../services/statsService.js';
import { getOrGenerateCommentary } from '../services/recapService.js';
import { HttpError } from '../lib/httpError.js';

export const recapRouter = Router();

// Per-USER daily cap on AI commentary requests (cached hits are cheap; this
// bounds fresh generations even if someone hammers regenerate). Keyed by user id.
const aiLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthedRequest).userId ?? req.ip ?? 'anon',
  message: { error: { code: 'AI_RATE_LIMITED', message: 'Daily AI limit reached. Try again tomorrow.' } },
});

const CommentaryBody = z.object({ regenerate: z.boolean().optional() });

/**
 * POST /recap/commentary — opt-in AI commentary (+ persona). Generates at most
 * once per recap snapshot; cached thereafter.
 */
recapRouter.post(
  '/commentary',
  requireAuth,
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { regenerate } = CommentaryBody.parse(req.body ?? {});
    const result = await getOrGenerateCommentary(userId, { regenerate: regenerate ?? false });
    res.status(200).json(result);
  }),
);

/**
 * GET /recap/persona — the deterministic persona only (free, no LLM, no tokens).
 * Lets the app show a persona even when AI commentary is off.
 */
recapRouter.get(
  '/persona',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const stats = await getCachedStats(userId);
    if (!stats) throw HttpError.badRequest('Sync your stats first.');
    res.status(200).json({ persona: derivePersona(stats) });
  }),
);
