import type { UserRepository, ListUsersOptions, User } from '../domain/user.js';
import type { FileRepository, ListSystemFilesOptions, SystemStorageStats, SystemFileItem } from '../domain/file.js';
import type { FolderRepository } from '../domain/folder.js';
import type { ShareRepository } from '../domain/share.js';
import type { Config } from '../infrastructure/config/config.js';
import { hashPassword } from '../infrastructure/crypto/password.js';

export interface AdminSystemStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  adminUsers: number;
  totalFiles: number;
  totalVaultFiles: number;
  totalFolders: number;
  totalShares: number;
  totalBytes: number;
  breakdown: Record<string, { bytes: number; count: number }>;
  health: {
    status: 'healthy' | 'degraded';
    uptimeSeconds: number;
    memoryUsedBytes: number;
    nodeVersion: string;
    defaultQuotaBytes: number;
  };
}

export interface AdminUserListItem extends User {
  storage_used: number;
  is_unlimited: boolean;
}

export interface CreateUserParams {
  username: string;
  password: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  role?: 'user' | 'admin';
  storage_quota_bytes?: number | null;
}

export class AdminUsecase {
  private userRepo: UserRepository;
  private fileRepo: FileRepository;
  private folderRepo: FolderRepository;
  private shareRepo: ShareRepository;
  private config: Config;

  constructor(
    userRepo: UserRepository,
    fileRepo: FileRepository,
    folderRepo: FolderRepository,
    shareRepo: ShareRepository,
    config: Config
  ) {
    this.userRepo = userRepo;
    this.fileRepo = fileRepo;
    this.folderRepo = folderRepo;
    this.shareRepo = shareRepo;
    this.config = config;
  }

  public async getSystemStats(): Promise<AdminSystemStats> {
    const [fileStats, totalFolders, totalShares, usersRes] = await Promise.all([
      this.fileRepo.getSystemStorageStats(),
      this.folderRepo.getTotalCount(),
      this.shareRepo.getTotalActiveCount(),
      this.userRepo.listAll({ limit: 1000 }),
    ]);

    const activeUsers = usersRes.users.filter((u) => !u.is_banned).length;
    const bannedUsers = usersRes.users.filter((u) => u.is_banned).length;
    const adminUsers = usersRes.users.filter((u) => u.role === 'admin').length;

    const mem = process.memoryUsage();

    return {
      totalUsers: usersRes.total,
      activeUsers,
      bannedUsers,
      adminUsers,
      totalFiles: fileStats.totalFiles,
      totalVaultFiles: fileStats.totalVaultFiles,
      totalFolders,
      totalShares,
      totalBytes: fileStats.totalBytes,
      breakdown: fileStats.breakdown,
      health: {
        status: 'healthy',
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsedBytes: mem.heapUsed,
        nodeVersion: process.version,
        defaultQuotaBytes: this.config.storageQuotaBytes,
      },
    };
  }

  public async listUsers(options: ListUsersOptions = {}): Promise<{ users: AdminUserListItem[]; total: number }> {
    const result = await this.userRepo.listAll(options);

    const enrichedUsers: AdminUserListItem[] = await Promise.all(
      result.users.map(async (u) => {
        const storageUsed = await this.fileRepo.getTotalStorageUsed(u.id);
        const isUnlimited = this.config.unlimitedPhones.includes(u.phone) || u.storage_quota_bytes === -1;
        return {
          ...u,
          storage_used: storageUsed,
          is_unlimited: isUnlimited,
        };
      })
    );

    return {
      users: enrichedUsers,
      total: result.total,
    };
  }

  public async createUser(params: CreateUserParams): Promise<User> {
    const cleanUsername = params.username.trim().replace(/^@/, '');
    if (!cleanUsername) {
      throw new Error('Username wajib diisi');
    }
    if (!params.password || params.password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter');
    }

    const existingUser = await this.userRepo.getByUsername(cleanUsername);
    if (existingUser) {
      throw new Error(`Username @${cleanUsername} sudah digunakan`);
    }

    const phone = params.phone?.trim() || `+62${Date.now().toString().slice(-9)}`;
    const existingPhone = await this.userRepo.getByPhone(phone);
    if (existingPhone) {
      throw new Error(`Nomor telepon ${phone} sudah digunakan`);
    }

    const passwordHash = hashPassword(params.password);

    return await this.userRepo.create({
      telegram_id: `admin_created_${Date.now()}`,
      phone,
      username: cleanUsername,
      first_name: params.first_name?.trim() || cleanUsername,
      last_name: params.last_name?.trim() || '',
      photo_url: '',
      session_data: '',
      role: params.role || 'user',
      password_hash: passwordHash,
      is_banned: false,
      storage_quota_bytes: params.storage_quota_bytes !== undefined ? params.storage_quota_bytes : null,
    });
  }

  public async updateUserRole(adminUserId: number, targetUserId: number, role: 'user' | 'admin'): Promise<void> {
    if (adminUserId === targetUserId && role !== 'admin') {
      throw new Error('Anda tidak dapat mencabut hak akses administrator pada akun Anda sendiri');
    }
    const targetUser = await this.userRepo.getById(targetUserId);
    if (!targetUser) {
      throw new Error('Pengguna tidak ditemukan');
    }
    await this.userRepo.updateRole(targetUserId, role);
  }

  public async updateUserBanStatus(adminUserId: number, targetUserId: number, isBanned: boolean): Promise<void> {
    if (adminUserId === targetUserId) {
      throw new Error('Anda tidak dapat menonaktifkan akun Anda sendiri');
    }
    const targetUser = await this.userRepo.getById(targetUserId);
    if (!targetUser) {
      throw new Error('Pengguna tidak ditemukan');
    }
    await this.userRepo.updateBanStatus(targetUserId, isBanned);
  }

  public async updateUserQuota(targetUserId: number, quotaBytes: number | null): Promise<void> {
    const targetUser = await this.userRepo.getById(targetUserId);
    if (!targetUser) {
      throw new Error('Pengguna tidak ditemukan');
    }
    await this.userRepo.updateQuota(targetUserId, quotaBytes);
  }

  public async resetUserVaultPin(targetUserId: number): Promise<void> {
    const targetUser = await this.userRepo.getById(targetUserId);
    if (!targetUser) {
      throw new Error('Pengguna tidak ditemukan');
    }
    await this.userRepo.setVaultPin(targetUserId, null);
  }

  public async deleteUser(adminUserId: number, targetUserId: number): Promise<void> {
    if (adminUserId === targetUserId) {
      throw new Error('Anda tidak dapat menghapus akun Anda sendiri');
    }
    const targetUser = await this.userRepo.getById(targetUserId);
    if (!targetUser) {
      throw new Error('Pengguna tidak ditemukan');
    }
    await this.userRepo.deleteUser(targetUserId);
  }

  public async listFiles(options: ListSystemFilesOptions = {}): Promise<{ files: SystemFileItem[]; total: number }> {
    return await this.fileRepo.listAllSystemFiles(options);
  }

  public async deleteFile(fileId: number): Promise<void> {
    const file = await this.fileRepo.getById(fileId);
    if (!file) {
      throw new Error('File tidak ditemukan');
    }
    await this.fileRepo.adminDeleteFile(fileId);
  }

  public getSystemConfig(): {
    storageQuotaBytes: number;
    unlimitedPhones: string[];
    allowedPhones: string[];
    port: number;
    nodeEnv: string;
  } {
    return {
      storageQuotaBytes: this.config.storageQuotaBytes,
      unlimitedPhones: this.config.unlimitedPhones,
      allowedPhones: this.config.allowedPhones,
      port: this.config.port,
      nodeEnv: process.env.NODE_ENV || 'development',
    };
  }
}
