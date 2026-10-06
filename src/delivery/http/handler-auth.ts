import type { Request, Response, NextFunction } from 'express';
import type { AuthUsecase } from '../../usecase/auth.usecase.js';
import { getAuthUserId } from './middleware.js';

export function normalizePhoneNumber(rawPhone: string): string {
  const cleaned = rawPhone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('08')) {
    return '+62' + cleaned.slice(1);
  }
  if (cleaned.startsWith('628')) {
    return '+' + cleaned;
  }
  if (cleaned.startsWith('8')) {
    return '+62' + cleaned;
  }
  return '+' + cleaned;
}

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

      const normalizedPhone = normalizePhoneNumber(phone);
      const result = await this.authUsecase.sendCode(normalizedPhone);
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

  public handleExportQrCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authUsecase.exportQrCode();
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to export QR code' });
    }
  };

  public handleCheckQrStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const txId = (req.query.transaction_id as string) || (req.body?.transaction_id as string);
      if (!txId) {
        res.status(400).json({ error: 'transaction_id is required' });
        return;
      }

      const result = await this.authUsecase.checkQrStatus(txId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to check QR status' });
    }
  };

  public handleQrPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { transaction_id, password } = req.body || {};
      if (!transaction_id) {
        res.status(400).json({ error: 'transaction_id is required' });
        return;
      }
      if (!password) {
        res.status(400).json({ error: 'password is required' });
        return;
      }

      const result = await this.authUsecase.submitQrPassword(transaction_id, password);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message || '2FA password authentication failed' });
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
