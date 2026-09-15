import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Api } from 'telegram';
import type { AuthRepository } from '../domain/auth.js';
import type { User, UserRepository } from '../domain/user.js';
import type { Config } from '../infrastructure/config/config.js';
import { isPhoneAllowed } from '../infrastructure/config/config.js';
import type { ClientPool } from '../infrastructure/telegram/client-pool.js';
import { SessionStore } from '../infrastructure/telegram/session-store.js';
import type { StringSession } from 'telegram/sessions/index.js';

export interface SendCodeResult {
  transaction_id: string;
}

export interface SignInResult {
  token: string;
  user: User;
}

export class AuthUsecase {
  private authRepo: AuthRepository;
  private userRepo: UserRepository;
  private config: Config;
  private clientPool: ClientPool;

  constructor(
    authRepo: AuthRepository,
    userRepo: UserRepository,
    config: Config,
    clientPool: ClientPool
  ) {
    this.authRepo = authRepo;
    this.userRepo = userRepo;
    this.config = config;
    this.clientPool = clientPool;
  }

  public async sendCode(phone: string): Promise<SendCodeResult> {
    if (!isPhoneAllowed(this.config, phone)) {
      throw new Error(`Phone number ${phone} is not allowed`);
    }

    const sessionStore = new SessionStore(null, this.config.encryptionKey, 0);
    const client = await this.clientPool.startTempClient(sessionStore);

    let phoneCodeHash = '';
    try {
      const sendCodeResult = await client.sendCode(
        {
          apiId: this.config.telegramApiId,
          apiHash: this.config.telegramApiHash,
        },
        phone
      );
      phoneCodeHash = sendCodeResult.phoneCodeHash;
    } catch (err: any) {
      await client.disconnect().catch(() => {});
      throw new Error(`Failed to send auth code: ${err.message || err}`);
    }

    const txId = uuidv4();
    this.clientPool.registerTempClient(txId, client, sessionStore);

    try {
      await this.authRepo.create({
        id: txId,
        phone,
        phone_code_hash: phoneCodeHash,
      });
    } catch (err: any) {
      await this.clientPool.removeTempClient(txId);
      throw new Error(`Failed to store auth transaction: ${err.message || err}`);
    }

    return { transaction_id: txId };
  }

  public async signIn(transactionId: string, code: string, password?: string): Promise<SignInResult> {
    const authTx = await this.authRepo.getById(transactionId);
    if (!authTx) {
      throw new Error('Invalid or expired transaction');
    }

    const temp = this.clientPool.getTempClient(transactionId);
    if (!temp) {
      throw new Error('Sign-in transaction expired or not found');
    }

    const { client, sessionStore } = temp;

    let tgUser: any = null;

    try {
      const authResult = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: authTx.phone,
          phoneCodeHash: authTx.phone_code_hash,
          phoneCode: code,
        })
      );

      if (authResult instanceof Api.auth.Authorization) {
        tgUser = authResult.user;
      } else if (authResult instanceof Api.auth.AuthorizationSignUpRequired) {
        await this.clientPool.removeTempClient(transactionId);
        throw new Error('Sign up is required but not supported');
      }
    } catch (err: any) {
      const errMsg = err.errorMessage || err.message || '';
      if (errMsg.includes('SESSION_PASSWORD_NEEDED') || errMsg.includes('2FA')) {
        if (!password) {
          throw new Error('SESSION_PASSWORD_NEEDED');
        }

        try {
          // Check 2FA password via GramJS
          await (client as any).signInWithPassword({
            password,
          });
          const me = await client.getMe();
          tgUser = me;
        } catch (pwErr: any) {
          throw new Error(`2FA authentication failed: ${pwErr.errorMessage || pwErr.message || pwErr}`);
        }
      } else {
        if (!errMsg.includes('PASSWORD_HASH_INVALID')) {
          await this.clientPool.removeTempClient(transactionId);
        }
        throw new Error(`Sign in failed: ${errMsg}`);
      }
    }

    if (!tgUser) {
      // Fallback getMe if not set
      tgUser = await client.getMe();
    }

    if (!tgUser) {
      throw new Error('Failed to get user information after sign in');
    }

    // Persist session
    const sessionString = (client.session as StringSession).save();
    await sessionStore.saveSessionString(sessionString);
    const encryptedSession = sessionStore.getEncryptedSession();

    const telegramIdStr = tgUser.id.toString();
    const existingUser = await this.userRepo.getByTelegramId(telegramIdStr);

    let user: User;
    if (existingUser) {
      if (encryptedSession) {
        await this.userRepo.updateSession(existingUser.id, encryptedSession);
      }
      user = existingUser;
    } else {
      user = await this.userRepo.create({
        telegram_id: telegramIdStr,
        phone: authTx.phone,
        username: tgUser.username || '',
        first_name: tgUser.firstName || '',
        last_name: tgUser.lastName || '',
        photo_url: '',
        session_data: encryptedSession,
      });
    }

    this.clientPool.promoteTempClientToActive(transactionId, user.id);

    try {
      await this.authRepo.delete(transactionId);
    } catch (delErr) {
      console.warn(`Warning: failed to delete auth transaction ${transactionId}:`, delErr);
    }

    const token = this.generateJwt(user.id);

    return {
      token,
      user,
    };
  }

  public generateJwt(userId: number): string {
    return jwt.sign({ user_id: userId }, this.config.jwtSecret, {
      expiresIn: '7d',
    });
  }

  public async updateProfile(
    userId: number,
    firstName: string,
    lastName: string,
    phone: string,
    photoUrl: string
  ): Promise<User> {
    const user = await this.userRepo.getById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.first_name = firstName;
    user.last_name = lastName;
    user.phone = phone;
    user.photo_url = photoUrl;

    await this.userRepo.update({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      phone,
      photo_url: photoUrl,
    });

    return user;
  }
}
