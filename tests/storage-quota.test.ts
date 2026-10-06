import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamUsecase } from '../src/usecase/stream.usecase.js';
import type { Config } from '../src/infrastructure/config/config.js';

class MockFileRepo {
  private usedSize: number = 0;
  constructor(initialUsed: number = 0) {
    this.usedSize = initialUsed;
  }
  async getTotalStorageUsed(_userId: number): Promise<number> {
    return this.usedSize;
  }
  async create(file: any): Promise<any> {
    this.usedSize += file.size;
    return { id: 1, ...file };
  }
  async getById(): Promise<any> { return null; }
  async listByFolder(): Promise<any[]> { return []; }
  async update(): Promise<void> {}
  async updateCaption(): Promise<void> {}
  async softDelete(): Promise<void> {}
  async restore(): Promise<void> {}
  async listTrashed(): Promise<any[]> { return []; }
  async permanentDelete(): Promise<void> {}
  async permanentDeleteAllTrashed(): Promise<void> {}
  async listStarred(): Promise<any[]> { return []; }
  async listAll(): Promise<any[]> { return []; }
}

class MockUserRepo {
  private users: Record<number, any> = {
    1: { id: 1, phone: '+628111111111', session_data: 'session1' },
    2: { id: 2, phone: '+628999999999', session_data: 'session2' }, // whitelisted
  };
  async getById(id: number): Promise<any> {
    return this.users[id] || null;
  }
  async getByPhone(): Promise<any> { return null; }
  async create(u: any): Promise<any> { return u; }
  async updateProfile(): Promise<any> { return null; }
}

const mockPool: any = {
  getClient: async () => ({}),
};

const mockUploader: any = {
  uploadFile: async () => ({ messageId: 100, chatId: '12345', fileId: 'tg-file-1' }),
  uploadChunk: async () => {},
  completeChunkUpload: async () => ({ messageId: 101, chatId: '12345', fileId: 'tg-file-2' }),
};

const mockDownloader: any = {
  downloadFile: async () => {},
};

describe('Storage Quota Enforcement (10 GB Limit)', () => {
  const config: Config = {
    telegramApiId: 12345,
    telegramApiHash: 'hash',
    tursoDatabaseUrl: 'file:test.db',
    jwtSecret: 'secret',
    encryptionKey: Buffer.alloc(32),
    allowedPhones: [],
    unlimitedPhones: ['+628999999999'], // whitelisted
    storageQuotaBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    port: 8080,
  };

  it('should allow normal uploads within 10 GB limit', async () => {
    const fileRepo = new MockFileRepo(1 * 1024 * 1024 * 1024) as any; // 1 GB used
    const userRepo = new MockUserRepo() as any;
    const streamUC = new StreamUsecase(fileRepo, userRepo, mockPool, mockUploader, mockDownloader, config);

    const uploaded = await streamUC.upload(1, null, 'doc.pdf', 500 * 1024 * 1024, Buffer.from('data'));
    assert.equal(uploaded.name, 'doc.pdf');
    assert.equal(uploaded.size, 500 * 1024 * 1024);
  });

  it('should reject uploads exceeding 10 GB limit for regular users', async () => {
    // Current usage: 9.8 GB, uploading 500 MB (total 10.3 GB > 10 GB)
    const fileRepo = new MockFileRepo(9.8 * 1024 * 1024 * 1024) as any;
    const userRepo = new MockUserRepo() as any;
    const streamUC = new StreamUsecase(fileRepo, userRepo, mockPool, mockUploader, mockDownloader, config);

    await assert.rejects(
      async () => {
        await streamUC.upload(1, null, 'huge.zip', 500 * 1024 * 1024, Buffer.from('data'));
      },
      /Kapasitas penyimpanan 10 GB terlampaui/
    );
  });

  it('should reject completeChunkUpload when quota is exceeded', async () => {
    const fileRepo = new MockFileRepo(9.9 * 1024 * 1024 * 1024) as any;
    const userRepo = new MockUserRepo() as any;
    const streamUC = new StreamUsecase(fileRepo, userRepo, mockPool, mockUploader, mockDownloader, config);

    await assert.rejects(
      async () => {
        await streamUC.completeChunkUpload(1, null, 'f-123', 5, 'movie.mp4', 200 * 1024 * 1024, false);
      },
      /Kapasitas penyimpanan 10 GB terlampaui/
    );
  });

  it('should allow whitelisted user to exceed 10 GB without limit', async () => {
    // User 2 is whitelisted (+628999999999), currently using 15 GB
    const fileRepo = new MockFileRepo(15 * 1024 * 1024 * 1024) as any;
    const userRepo = new MockUserRepo() as any;
    const streamUC = new StreamUsecase(fileRepo, userRepo, mockPool, mockUploader, mockDownloader, config);

    const uploaded = await streamUC.upload(2, null, 'extra.iso', 1024 * 1024 * 1024, Buffer.from('data'));
    assert.equal(uploaded.name, 'extra.iso');
  });

  it('should calculate correct storage usage and percentage', async () => {
    const fileRepo = new MockFileRepo(2.5 * 1024 * 1024 * 1024) as any; // 2.5 GB
    const userRepo = new MockUserRepo() as any;
    const streamUC = new StreamUsecase(fileRepo, userRepo, mockPool, mockUploader, mockDownloader, config);

    const usageNormal = await streamUC.getStorageUsage(1);
    assert.equal(usageNormal.isUnlimited, false);
    assert.equal(usageNormal.quotaBytes, 10737418240);
    assert.equal(usageNormal.usedBytes, 2.5 * 1024 * 1024 * 1024);
    assert.equal(usageNormal.usedPercentage, 25);

    const usageUnlimited = await streamUC.getStorageUsage(2);
    assert.equal(usageUnlimited.isUnlimited, true);
    assert.equal(usageUnlimited.usedPercentage, 0);
  });
});
