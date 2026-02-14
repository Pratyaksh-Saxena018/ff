import { Router } from 'express';
import {
  handleGetDispute,
  handleGetRoomDisputes,
  handleCastVote,
  handleCloseVoting,
} from '../controllers/disputeController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validateMiddleware';
import { disputeIdParamSchema, castVoteSchema } from '../utils/validationSchemas';
import { z } from 'zod';

const disputeIdParam = z.object({ disputeId: z.string().regex(/^[a-f0-9]{24}$/) });

const router = Router();

router.get('/:disputeId', authMiddleware, (req, res, next) => {
  const parsed = disputeIdParam.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid disputeId' });
  next();
}, handleGetDispute);

router.get('/room/:roomId', authMiddleware, handleGetRoomDisputes);

router.post('/:disputeId/vote', authMiddleware, validateBody(castVoteSchema), (req, res, next) => {
  const parsed = disputeIdParam.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid disputeId' });
  next();
}, handleCastVote);

router.post('/:disputeId/close-voting', authMiddleware, (req, res, next) => {
  const parsed = disputeIdParam.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid disputeId' });
  next();
}, handleCloseVoting);

export default router;
