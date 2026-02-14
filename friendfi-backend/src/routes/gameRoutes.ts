import { Router } from 'express';
import {
  handleMatchmakingStatus,
  handleEndGame,
  handleGetGameHistory,
} from '../controllers/gameController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validateMiddleware';
import { endGameSchema } from '../utils/validationSchemas';

const router = Router();

router.get('/matchmaking', authMiddleware, handleMatchmakingStatus);
router.post('/end', authMiddleware, validateBody(endGameSchema), handleEndGame);
router.get('/history', authMiddleware, handleGetGameHistory);

export default router;
