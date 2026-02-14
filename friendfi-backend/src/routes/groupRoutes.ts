import { Router } from 'express';
import { handleCreateGroup, handleJoinGroup, handleListMyGroups } from '../controllers/groupController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authMiddleware, handleListMyGroups);
router.post('/', authMiddleware, handleCreateGroup);
router.post('/join', authMiddleware, handleJoinGroup);

export default router;
