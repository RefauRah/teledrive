import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createServer } from '../src/delivery/http/server.js';
import { VFSUsecase } from '../src/usecase/vfs.usecase.js';

class MockFolderRepo {
  folders: any[] = [];
  async listByParent() { return this.folders; }
  async create(f: any) { const n = { id: 1, ...f, is_starred: false }; this.folders.push(n); return n; }
  async getById() { return null; }
  async update() {}
  async softDelete() {}
  async restore() {}
  async listTrashed() { return []; }
  async permanentDelete() {}
  async getBreadcrumb() { return []; }
  async listStarred() { return []; }
}

class MockFileRepo {
  files: any[] = [];
  async listByFolder() { return this.files; }
  async create(f: any) { const n = { id: 1, ...f, is_starred: false }; this.files.push(n); return n; }
  async getById() { return null; }
  async update() {}
  async softDelete() {}
  async restore() {}
  async listTrashed() { return []; }
  async permanentDelete() {}
  async permanentDeleteAllTrashed() {}
  async listStarred() { return []; }
}

describe('HTTP API Endpoints', () => {
  const jwtSecret = 'test_jwt_secret_123';
  let server: http.Server;
  let baseUrl: string;
  let validToken: string;

  before(async () => {
    const mockFolderRepo = new MockFolderRepo() as any;
    const mockFileRepo = new MockFileRepo() as any;
    const mockVfs = new VFSUsecase(mockFolderRepo, mockFileRepo, {} as any);

    const mockAuth: any = {
      sendCode: async (phone: string) => ({ transaction_id: 'mock-tx-123' }),
      signIn: async (txId: string, code: string) => ({
        token: jwt.sign({ user_id: 1 }, jwtSecret),
        user: { id: 1, phone: '+628123', first_name: 'Test' },
      }),
      updateProfile: async () => ({ id: 1, first_name: 'Updated' }),
    };

    const mockStream: any = {
      upload: async () => ({ id: 1, name: 'uploaded.txt', size: 10 }),
      getFileMetadata: async () => ({ id: 1, name: 'file.txt', size: 5, mime_type: 'text/plain' }),
      download: async (_uid: number, _fid: number, writer: any) => {
        writer.write(Buffer.from('hello'));
      },
    };

    const app = createServer(jwtSecret, mockAuth, mockVfs, mockStream);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const addr = server.address() as any;
    baseUrl = `http://localhost:${addr.port}`;

    validToken = jwt.sign({ user_id: 1 }, jwtSecret, { expiresIn: '1h' });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('POST /api/auth/send-code should return transaction_id', async () => {
    const res = await fetch(`${baseUrl}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+628123456789' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.transaction_id, 'mock-tx-123');
  });

  it('GET /api/vfs/list without token should return 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/vfs/list`);
    assert.equal(res.status, 401);
  });

  it('GET /api/vfs/list with valid token should return 200 and listing', async () => {
    const res = await fetch(`${baseUrl}/api/vfs/list`, {
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.ok(Array.isArray(body.folders));
    assert.ok(Array.isArray(body.files));
  });

  it('POST /api/vfs/folders should create folder', async () => {
    const res = await fetch(`${baseUrl}/api/vfs/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({ name: 'New Folder' }),
    });

    assert.equal(res.status, 201);
    const body = await res.json() as any;
    assert.equal(body.name, 'New Folder');
  });

  it('POST /api/vfs/upload should succeed with X-File-Size and X-File-Name', async () => {
    const fileContent = 'sample file content';
    const res = await fetch(`${baseUrl}/api/vfs/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent('test_video.mp4'),
        'X-File-Size': Buffer.byteLength(fileContent).toString(),
        Authorization: `Bearer ${validToken}`,
      },
      body: fileContent,
    });

    assert.equal(res.status, 201);
    const body = await res.json() as any;
    assert.equal(body.id, 1);
  });

  it('POST /api/vfs/upload should reject files exceeding 2GB with 400 error', async () => {
    const overLimitSize = 3 * 1024 * 1024 * 1024; // 3GB
    const res = await fetch(`${baseUrl}/api/vfs/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': 'huge.bin',
        'X-File-Size': overLimitSize.toString(),
        Authorization: `Bearer ${validToken}`,
      },
      body: 'small-chunk',
    });

    assert.equal(res.status, 400);
    const body = await res.json() as any;
    assert.match(body.error, /exceeds maximum allowed size/i);
  });

  it('POST /api/vfs/upload should reject invalid or 0 file size with clear error', async () => {
    const res = await fetch(`${baseUrl}/api/vfs/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': 'unknown.bin',
        'X-File-Size': '0',
        Authorization: `Bearer ${validToken}`,
      },
      body: 'chunk',
    });

    assert.equal(res.status, 400);
    const body = await res.json() as any;
    assert.match(body.error, /size/i);
  });
});
