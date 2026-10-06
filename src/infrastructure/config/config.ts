import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  telegramApiId: number;
  telegramApiHash: string;
  tursoDatabaseUrl: string;
  tursoAuthToken?: string;
  jwtSecret: string;
  encryptionKey: Buffer;
  allowedPhones: string[];
  unlimitedPhones: string[];
  storageQuotaBytes: number;
  port: number;
}

export const DEFAULT_STORAGE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

export function loadConfig(): Config {
  const apiIdStr = process.env.TELEGRAM_API_ID;
  if (!apiIdStr) {
    throw new Error('TELEGRAM_API_ID is required');
  }
  const telegramApiId = parseInt(apiIdStr, 10);
  if (isNaN(telegramApiId)) {
    throw new Error('TELEGRAM_API_ID must be an integer');
  }

  const telegramApiHash = process.env.TELEGRAM_API_HASH;
  if (!telegramApiHash) {
    throw new Error('TELEGRAM_API_HASH is required');
  }

  const tursoDatabaseUrl =
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'file:teledrive.db';

  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN || undefined;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }

  const encKeyHex = process.env.ENCRYPTION_KEY;
  if (!encKeyHex) {
    throw new Error('ENCRYPTION_KEY is required');
  }
  const encryptionKey = Buffer.from(encKeyHex, 'hex');
  if (encryptionKey.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be 32 bytes (64 hex characters), got ${encryptionKey.length} bytes`
    );
  }

  const phonesStr = process.env.ALLOWED_PHONES || '';
  const allowedPhones = phonesStr
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const unlimitedStr = process.env.UNLIMITED_PHONES || process.env.WHITELIST_UNLIMITED_PHONES || '';
  const unlimitedPhones = unlimitedStr
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const quotaStr = process.env.STORAGE_QUOTA_BYTES || '';
  const storageQuotaBytes = quotaStr ? parseInt(quotaStr, 10) : DEFAULT_STORAGE_QUOTA_BYTES;

  const port = parseInt(process.env.PORT || '8080', 10);

  return {
    telegramApiId,
    telegramApiHash,
    tursoDatabaseUrl,
    tursoAuthToken,
    jwtSecret,
    encryptionKey,
    allowedPhones,
    unlimitedPhones,
    storageQuotaBytes,
    port,
  };
}

export function isPhoneAllowed(config: Config, phone: string): boolean {
  if (config.allowedPhones.length === 0) {
    return true;
  }
  return config.allowedPhones.includes(phone);
}

export function isUserUnlimitedStorage(config: Config, userPhone?: string): boolean {
  if (!userPhone) return false;
  if (!config.unlimitedPhones || config.unlimitedPhones.length === 0) {
    return false;
  }
  return config.unlimitedPhones.includes(userPhone);
}
