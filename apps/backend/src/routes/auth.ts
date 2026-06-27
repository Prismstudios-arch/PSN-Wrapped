import { Router } from 'express';
import { z } from 'zod';
import { PLATFORMS, isImplemented } from '@endcard/shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import { issueAppToken } from '../lib/jwt.js';
import { getConnector } from '../connectors/registry.js';
import { connectUser, listConnectedPlatforms } from '../services/connectionService.js';
import { rateLimit } from 'express-rate-limit';

export const authRouter = Router();

// Connecting is the most sensitive + most abusable endpoint — limit it tightly.
const connectLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const ConnectBody = z.object({
  platform: z.enum(PLATFORMS),
  // PSN: the NPSSO token. Treated as the user's master credential — never stored.
  token: z.string().min(8, 'That token looks too short.').max(4096),
});

/**
 * POST /auth/connect
 * Exchange a platform credential for an Endcard session. The raw token is used
 * once server-side and never persisted; only derived (encrypted) tokens are kept.
 */
authRouter.post(
  '/connect',
  connectLimiter,
  asyncHandler(async (req, res) => {
    const { platform, token } = ConnectBody.parse(req.body);
    if (!isImplemented(platform)) {
      throw HttpError.badRequest(`${platform} isn't available yet — PlayStation Network is supported today.`);
    }

    const connector = getConnector(platform);
    const session = await connector.connect({ rawToken: token });
    const userId = await connectUser(session);
    const { token: appToken, expiresAt } = issueAppToken(userId);
    const connectedPlatforms = await listConnectedPlatforms(userId);

    res.status(200).json({
      token: appToken,
      expiresAt,
      user: { id: userId },
      connection: {
        platform: session.platform,
        platformUsername: session.platformUsername ?? null,
      },
      connectedPlatforms,
    });
  }),
);
