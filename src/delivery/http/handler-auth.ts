import type { Request, Response, NextFunction } from 'express';
import type { AuthUsecase } from '../../usecase/auth.usecase.js';
import { getAuthUserId } from './middleware.js';

export class AuthHandler {
  private authUsecase: AuthUsecase;

  constructor(authUsecase: AuthUsecase) {
    this.authUsecase = authUsecase;
  }

  public handleSendCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone } = req.body || {};
      if (!phone || typeof phone !== 'string') {
        res.status(400).json({ error: 'phone number is required' });
        return;
      }

      const result = await this.authUsecase.sendCode(phone);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to send code' });
    }
  };

  public handleSignIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transaction_id, code, password } = req.body || {};
      if (!transaction_id) {
        res.status(400).json({ error: 'transaction_id is required' });
        return;
      }
      if (!code) {
        res.status(400).json({ error: 'code is required' });
        return;
      }

      const result = await this.authUsecase.signIn(transaction_id, code, password);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Sign in failed' });
    }
  };

  public handleUpdateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { first_name, last_name, phone, photo_url } = req.body || {};

      if (!first_name) {
        res.status(400).json({ error: 'first_name is required' });
        return;
      }

      const updatedUser = await this.authUsecase.updateProfile(
        userId,
        first_name,
        last_name || '',
        phone || '',
        photo_url || ''
      );

      res.status(200).json(updatedUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update profile' });
    }
  };
}
