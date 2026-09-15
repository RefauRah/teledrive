import type { Client } from '@libsql/client';
import { TelegramClient } from 'telegram';
import { SessionStore } from './session-store.js';

interface PoolEntry {
  client: TelegramClient;
  lastUsed: number;
}

interface TempPoolEntry {
  client: TelegramClient;
  sessionStore: SessionStore;
  createdAt: number;
}

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const TEMP_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

export class ClientPool {
  private apiId: number;
  private apiHash: string;
  private db: Client;
  private encryptionKey: Buffer;

  private clients = new Map<number, PoolEntry>();
  private tempClients = new Map<string, TempPoolEntry>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(apiId: number, apiHash: string, db: Client, encryptionKey: Buffer) {
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.db = db;
    this.encryptionKey = encryptionKey;

    this.cleanupTimer = setInterval(() => this.evictIdle(), CLEANUP_INTERVAL);
  }

  public async getClient(userId: number, encryptedSession?: string): Promise<TelegramClient> {
    const existing = this.clients.get(userId);
    if (existing && existing.client.connected) {
      existing.lastUsed = Date.now();
      return existing.client;
    }

    const sessionStore = new SessionStore(this.db, this.encryptionKey, userId);
    if (encryptedSession) {
      sessionStore.setEncryptedSession(encryptedSession);
    }

    const sessionString = await sessionStore.getSessionString();
    const stringSession = sessionStore.createGramJSSession(sessionString);

    const client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    this.clients.set(userId, {
      client,
      lastUsed: Date.now(),
    });

    return client;
  }

  public async startTempClient(sessionStore: SessionStore): Promise<TelegramClient> {
    const stringSession = sessionStore.createGramJSSession();
    const client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
      connectionRetries: 5,
    });

    await client.connect();
    return client;
  }

  public registerTempClient(txId: string, client: TelegramClient, sessionStore: SessionStore): void {
    this.tempClients.set(txId, {
      client,
      sessionStore,
      createdAt: Date.now(),
    });
  }

  public getTempClient(txId: string): { client: TelegramClient; sessionStore: SessionStore } | null {
    const entry = this.tempClients.get(txId);
    if (!entry) return null;
    return { client: entry.client, sessionStore: entry.sessionStore };
  }

  public async removeTempClient(txId: string): Promise<void> {
    const entry = this.tempClients.get(txId);
    if (entry) {
      this.tempClients.delete(txId);
      try {
        await entry.client.disconnect();
      } catch {
        // ignore error on disconnect
      }
    }
  }

  public promoteTempClientToActive(txId: string, userId: number): boolean {
    const entry = this.tempClients.get(txId);
    if (entry) {
      this.tempClients.delete(txId);
      this.clients.set(userId, {
        client: entry.client,
        lastUsed: Date.now(),
      });
      return true;
    }
    return false;
  }

  public async removeClient(userId: number): Promise<void> {
    const entry = this.clients.get(userId);
    if (entry) {
      this.clients.delete(userId);
      try {
        await entry.client.disconnect();
      } catch {
        // ignore error on disconnect
      }
    }
  }

  private async evictIdle(): Promise<void> {
    const now = Date.now();

    for (const [userId, entry] of this.clients.entries()) {
      if (now - entry.lastUsed > IDLE_TIMEOUT) {
        console.log(`Evicting idle Telegram client for user ${userId}`);
        this.clients.delete(userId);
        try {
          await entry.client.disconnect();
        } catch {
          // ignore
        }
      }
    }

    for (const [txId, entry] of this.tempClients.entries()) {
      if (now - entry.createdAt > TEMP_IDLE_TIMEOUT) {
        console.log(`Evicting expired temp client for transaction ${txId}`);
        this.tempClients.delete(txId);
        try {
          await entry.client.disconnect();
        } catch {
          // ignore
        }
      }
    }
  }

  public async close(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    for (const entry of this.clients.values()) {
      try {
        await entry.client.disconnect();
      } catch {
        // ignore
      }
    }
    this.clients.clear();

    for (const entry of this.tempClients.values()) {
      try {
        await entry.client.disconnect();
      } catch {
        // ignore
      }
    }
    this.tempClients.clear();
  }
}
