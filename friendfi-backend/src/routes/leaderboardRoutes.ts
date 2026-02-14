import { Router } from 'express';
import { handleGetLeaderboard, handleGetMyRank } from '../controllers/leaderboardController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', handleGetLeaderboard);
router.get('/me', authMiddleware, handleGetMyRank);

export default router;
