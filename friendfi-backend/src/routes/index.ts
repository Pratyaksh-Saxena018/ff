import { Router } from 'express';
import authRoutes from './authRoutes';
import messageRoutes from './messageRoutes';
import disputeRoutes from './disputeRoutes';
import leaderboardRoutes from './leaderboardRoutes';
import gameRoutes from './gameRoutes';
import groupRoutes from './groupRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/messages', messageRoutes);
router.use('/disputes', disputeRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/game', gameRoutes);
router.use('/groups', groupRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
