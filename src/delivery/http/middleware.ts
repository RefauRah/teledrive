import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRepository } from '../../domain/user.js';

// Extend Express Request interface to include userId and userRole
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: 'user' | 'admin';
    }
  }
}

export function jwtMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (!token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ error: 'missing authorization header' });
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as { user_id: number; role?: 'user' | 'admin' };
      if (!decoded || typeof decoded.user_id !== 'number') {
        res.status(401).json({ error: 'invalid token claims' });
        return;
      }
      req.userId = decoded.user_id;
      req.userRole = decoded.role || 'user';
      next();
    } catch {
      res.status(401).json({ error: 'invalid or expired token' });
    }
  };
}

export function adminMiddleware(userRepo: UserRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: 'Autentikasi diperlukan' });
      return;
    }

    try {
      const user = await userRepo.getById(req.userId);
      if (!user) {
        res.status(401).json({ error: 'Pengguna tidak ditemukan' });
        return;
      }

      if (user.is_banned) {
        res.status(403).json({ error: 'Akun Anda telah dinonaktifkan oleh administrator' });
        return;
      }

      if (user.role !== 'admin') {
        res.status(403).json({ error: 'Akses ditolak: Memerlukan hak akses administrator' });
        return;
      }

      next();
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal memverifikasi hak akses admin' });
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
