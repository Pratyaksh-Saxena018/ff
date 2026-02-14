import { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { getLeaderboard, getKarmaRank } from '../services/karmaService';

export async function handleGetLeaderboard(req: AuthRequest, res: Response): Promise<void> {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const leaderboard = await getLeaderboard(limit);
  res.json({ success: true, leaderboard });
}

export async function handleGetMyRank(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  const { rank, total } = await getKarmaRank(req.userId);
  res.json({ success: true, rank, total });
}
