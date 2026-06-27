import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import {
  acceptRequest,
  listFriends,
  removeFriend,
  searchUsers,
  sendRequest,
} from '../services/friendsService.js';
import { buildBattle } from '../services/battleService.js';

export const friendsRouter = Router();

friendsRouter.use(requireAuth);

friendsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    res.json(await listFriends(userId));
  }),
);

friendsRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const q = z.string().default('').parse(req.query.q ?? '');
    res.json({ results: await searchUsers(userId, q) });
  }),
);

const TargetBody = z.object({ targetId: z.string().uuid() });
const RequesterBody = z.object({ requesterId: z.string().uuid() });
const UserBody = z.object({ userId: z.string().uuid() });

friendsRouter.post(
  '/request',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { targetId } = TargetBody.parse(req.body);
    await sendRequest(userId, targetId);
    res.json({ ok: true });
  }),
);

friendsRouter.post(
  '/accept',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { requesterId } = RequesterBody.parse(req.body);
    await acceptRequest(userId, requesterId);
    res.json({ ok: true });
  }),
);

friendsRouter.post(
  '/remove',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const { userId: otherId } = UserBody.parse(req.body);
    await removeFriend(userId, otherId);
    res.json({ ok: true });
  }),
);

/** Recap Battle vs a mutual friend. */
friendsRouter.get(
  '/:id/battle',
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthedRequest;
    const otherId = z.string().uuid().parse(req.params.id);
    res.json({ battle: await buildBattle(userId, otherId) });
  }),
);
