import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body) as T;
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: e.flatten().fieldErrors,
        });
        return;
      }
      next(e);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query) as T;
      (req as unknown as { query: T }).query = parsed;
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: e.flatten().fieldErrors,
        });
        return;
      }
      next(e);
    }
  };
}
