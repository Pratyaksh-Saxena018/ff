import { Router } from 'express';
import { handleSignUp, handleLogin, handleGetProfile } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validateMiddleware';
import { signUpSchema, loginSchema } from '../utils/validationSchemas';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware';

const router = Router();

router.post('/signup', authRateLimiter, validateBody(signUpSchema), handleSignUp);
router.post('/login', authRateLimiter, validateBody(loginSchema), handleLogin);
router.get('/profile', authMiddleware, handleGetProfile);

export default router;
