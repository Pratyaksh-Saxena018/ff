import { Response } from 'express';
import { signUp, login, getProfile } from '../services/authService';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { signUpSchema, loginSchema } from '../utils/validationSchemas';

export async function handleSignUp(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = signUpSchema.parse(req.body);
    const { user, token } = await signUp(body);
    res.status(201).json({ success: true, user, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign up failed';
    const status = message.includes('already') ? 400 : 500;
    res.status(status).json({ success: false, error: message });
  }
}

export async function handleLogin(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const { user, token } = await login(body);
    res.json({ success: true, user, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    const status = message.toLowerCase().includes('invalid') ? 401 : 500;
    res.status(status).json({ success: false, error: message });
  }
}

export async function handleGetProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  const user = await getProfile(req.userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  const { passwordHash: _, ...rest } = user as unknown as { passwordHash: string; [k: string]: unknown };
  res.json({ success: true, user: rest });
}
