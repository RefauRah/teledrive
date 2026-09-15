import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function jwtMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'missing authorization header' });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      res.status(401).json({ error: 'invalid authorization header format' });
      return;
    }

    const token = parts[1];
    try {
      const decoded = jwt.verify(token, jwtSecret) as { user_id: number };
      if (!decoded || typeof decoded.user_id !== 'number') {
        res.status(401).json({ error: 'invalid token claims' });
        return;
      }
      req.userId = decoded.user_id;
      next();
    } catch {
      res.status(401).json({ error: 'invalid or expired token' });
    }
  };
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}

export function getAuthUserId(req: Request): number {
  if (typeof req.userId !== 'number') {
    throw new Error('User ID not found in request context');
  }
  return req.userId;
}
