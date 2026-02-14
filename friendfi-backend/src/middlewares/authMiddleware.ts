import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';
import { User } from '../models';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  user?: { _id: string; username: string; email: string };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const { userId } = verifyToken(token);
    const user = await User.findById(userId).select('username email').lean();
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }
    req.userId = userId;
    req.user = {
      _id: userId,
      username: user.username,
      email: user.email,
    };
    next();
  } catch (e) {
    logger.debug('Auth failed', { error: (e as Error).message });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.slice(7);
  try {
    const { userId } = verifyToken(token);
    const user = await User.findById(userId).select('username email').lean();
    if (user) {
      const u = user as { _id: { toString(): string }; username: string; email: string };
      req.userId = u._id.toString();
      req.user = { _id: u._id.toString(), username: u.username, email: u.email };
    }
    next();
  } catch {
    next();
  }
}
