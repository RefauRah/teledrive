export interface Folder {
  id: number;
  user_id: number;
  name: string;
  parent_id: number | null;
  is_starred: boolean;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface BreadcrumbItem {
  id: number;
  name: string;
}

export interface FolderRepository {
  create(folder: { user_id: number; name: string; parent_id: number | null }): Promise<Folder>;
  getById(id: number): Promise<Folder | null>;
  listByParent(userId: number, parentId: number | null): Promise<Folder[]>;
  update(folder: Pick<Folder, 'id' | 'name' | 'parent_id' | 'is_starred'>): Promise<void>;
  softDelete(id: number): Promise<void>;
  restore(id: number): Promise<void>;
  listTrashed(userId: number): Promise<Folder[]>;
  permanentDelete(id: number): Promise<void>;
  getBreadcrumb(folderId: number, userId: number): Promise<BreadcrumbItem[]>;
  listStarred(userId: number): Promise<Folder[]>;
}
