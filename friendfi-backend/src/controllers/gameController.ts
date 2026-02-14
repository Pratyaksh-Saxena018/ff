import { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { canJoinMatchmaking, endGameSession, getGameHistory } from '../services/gameService';
import { endGameSchema } from '../utils/validationSchemas';

export async function handleMatchmakingStatus(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  const { allowed, restrictedPool } = await canJoinMatchmaking(req.userId);
  res.json({ success: true, allowed, restrictedPool });
}

export async function handleEndGame(req: AuthRequest, res: Response): Promise<void> {
  const body = endGameSchema.parse(req.body);
  const { xpDistributed } = await endGameSession(body.playerIds, body.result ?? {});
  res.json({ success: true, xpDistributed });
}

export async function handleGetGameHistory(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const history = await getGameHistory(req.userId, limit);
  res.json({ success: true, history });
}
