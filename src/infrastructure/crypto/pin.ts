import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

/**
 * Hashes a vault PIN using scrypt with a unique random salt
 */
export function hashVaultPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a PIN against a stored salt:hash string using constant-time comparison
 */
export function verifyVaultPin(pin: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) return false;

  try {
    const hash = crypto.scryptSync(pin, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (hashBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Generates a short-lived scoped JWT for the private vault
 */
export function generateVaultToken(userId: number, jwtSecret: string): string {
  return jwt.sign(
    { user_id: userId, scope: 'private_vault' },
    jwtSecret,
    { expiresIn: '2h' }
  );
}

/**
 * Validates a vault token for a specific user
 */
export function verifyVaultToken(token: string, userId: number, jwtSecret: string): boolean {
  try {
    const decoded = jwt.verify(token, jwtSecret) as { user_id: number; scope: string };
    return decoded.user_id === userId && decoded.scope === 'private_vault';
  } catch {
    return false;
  }
}
