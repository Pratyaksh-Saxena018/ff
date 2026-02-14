import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorMiddleware(
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  const status = err.statusCode ?? 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  res.status(status).json({ success: false, error: message });
}
