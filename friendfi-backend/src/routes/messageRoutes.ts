import { Router } from 'express';
import { handleSendMessage, handleGetRoomMessages } from '../controllers/messageController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validateMiddleware';
import { sendMessageSchema } from '../utils/validationSchemas';

const router = Router();

router.post('/', authMiddleware, validateBody(sendMessageSchema), handleSendMessage);
router.get('/room/:roomId', authMiddleware, handleGetRoomMessages);

export default router;
