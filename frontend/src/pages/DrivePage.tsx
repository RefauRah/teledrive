import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import Sidebar from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { FileBrowser } from '../components/explorer/FileBrowser';
import { FileViewerModal } from '../components/explorer/FileViewerModal';
import { UploaderPanel } from '../components/upload/UploaderPanel';
import { SettingsView } from './SettingsView';
import {
  useFiles,
  useBreadcrumb,
  useCreateFolder,
  useRenameFolder,
  useRenameFile,
  useMoveFolder,
  useMoveFile,
  useDeleteFolder,
  useDeleteFile,
} from '../hooks/useFiles';
import { useUploadStore } from '../stores/useUploadStore';
import { VFile, VFolder, ViewMode } from '../domain/types';
import {
  listTrash,
  deleteFolder,
  deleteFile,
  restoreItem,
  emptyTrash,
  listDirectory,
  downloadFile,
  listStarred,
  toggleStar,
} from '../services/api';
import { Folder, Loader2, FolderPlus, X } from 'lucide-react';

export const DrivePage: React.FC = () => {
  const { isAuthenticated, initialize } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic routing based view states
  const getFolderIdFromPath = (path: string): string | null => {
    if (path.startsWith('/folder/')) {
      return path.substring('/folder/'.length);
    }
    return null;
  };

  const getViewFromPath = (path: string): 'drive' | 'recent' | 'trash' | 'settings' | 'starred' => {
    if (path === '/settings') return 'settings';
    if (path === '/trash') return 'trash';
    if (path === '/recent') return 'recent';
    if (path === '/starred') return 'starred';
    return 'drive';
  };

  const currentFolderId = getFolderIdFromPath(location.pathname);
  const currentView = getViewFromPath(location.pathname);

  // UI state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingFile, setViewingFile] = useState<VFile | null>(null);

  // Dialog / Modal states
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [renameItem, setRenameItem] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [renameName, setRenameName] = useState('');

  const [moveItem, setMoveItem] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [allFoldersList, setAllFoldersList] = useState<VFolder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    isDestructive: true,
    onConfirm: () => {},
  });

  // Zustand upload queue triggers
  const addFileToQueue = useUploadStore((state) => state.addFile);

  // Run initial session check
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Fetch drive files & breadcrumbs
  const { data: driveData, isLoading: isLoadingFiles, refetch } = useFiles(currentFolderId);
  const { data: breadcrumbs = [] } = useBreadcrumb(currentFolderId);

  // Mutation hooks
  const createFolderMutation = useCreateFolder(currentFolderId);
  const renameFolderMutation = useRenameFolder(currentFolderId);
  const renameFileMutation = useRenameFile(currentFolderId);
  const moveFolderMutation = useMoveFolder(currentFolderId);
  const moveFileMutation = useMoveFile(currentFolderId);
  const deleteFolderMutation = useDeleteFolder(currentFolderId);
  const deleteFileMutation = useDeleteFile(currentFolderId);

  // Handle switching views (Drive vs Trash)
  const [trashData, setTrashData] = useState<{ folders: VFolder[]; files: VFile[] }>({ folders: [], files: [] });
  const [isLoadingTrash, setIsLoadingTrash] = useState(false);

  const [starredData, setStarredData] = useState<{ folders: VFolder[]; files: VFile[] }>({ folders: [], files: [] });
  const [isLoadingStarred, setIsLoadingStarred] = useState(false);

  const fetchTrash = async () => {
    setIsLoadingTrash(true);
    try {
      const data = await listTrash();
      setTrashData(data);
    } catch (err) {
      console.error('Failed to fetch trash:', err);
    } finally {
      setIsLoadingTrash(false);
    }
  };

  const fetchStarred = async () => {
    setIsLoadingStarred(true);
    try {
      const data = await listStarred();
      setStarredData(data);
    } catch (err) {
      console.error('Failed to fetch starred:', err);
    } finally {
      setIsLoadingStarred(false);
    }
  };

  useEffect(() => {
    if (currentView === 'trash') {
      fetchTrash();
    } else if (currentView === 'starred') {
      fetchStarred();
    }
  }, [currentView]);

  const handleToggleStar = async (type: 'file' | 'folder', id: string) => {
    try {
      await toggleStar(type, id);
      refetch();
      if (currentView === 'starred') fetchStarred();
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) {
    return null;
  }

  // Handle Folder Creation
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolderMutation.mutateAsync(newFolderName);
      setNewFolderName('');
      setIsNewFolderOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Rename Item
  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameItem || !renameName.trim()) return;
    try {
      if (renameItem.type === 'folder') {
        await renameFolderMutation.mutateAsync({ id: renameItem.id, name: renameName });
      } else {
        await renameFileMutation.mutateAsync({ id: renameItem.id, name: renameName });
      }
      setRenameItem(null);
      setRenameName('');
      if (currentView === 'trash') fetchTrash();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Move Item Setup
  const openMoveModal = async (type: 'file' | 'folder', item: VFile | VFolder) => {
    setMoveItem({ type, id: item.id, name: item.name });
    setTargetFolderId(null);
    setIsLoadingFolders(true);
    try {
      const data = await listDirectory();
      setAllFoldersList(data.folders.filter((f: VFolder) => f.id !== item.id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleMove = async () => {
    if (!moveItem) return;
    try {
      if (moveItem.type === 'folder') {
        await moveFolderMutation.mutateAsync({ id: moveItem.id, parentId: targetFolderId });
      } else {
        await moveFileMutation.mutateAsync({ id: moveItem.id, parentId: targetFolderId });
      }
      setMoveItem(null);
      setTargetFolderId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete (Move to Trash / Empty Trash / Permanent Delete)
  const handleDelete = async (type: 'file' | 'folder', item: VFile | VFolder) => {
    if (currentView === 'trash') {
      // Permanent delete
      setConfirmModal({
        isOpen: true,
        title: 'Delete Permanently',
        message: `Permanently delete "${item.name}"? This cannot be undone.`,
        confirmText: 'Delete',
        isDestructive: true,
        onConfirm: async () => {
          try {
            if (type === 'folder') {
              await deleteFolder(item.id);
            } else {
              await deleteFile(item.id);
            }
            fetchTrash();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          } catch (err) {
            console.error(err);
          }
        }
      });
    } else {
      // Soft delete
      try {
        if (type === 'folder') {
          await deleteFolderMutation.mutateAsync(item.id);
        } else {
          await deleteFileMutation.mutateAsync(item.id);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteMultiple = async (items: { type: 'file' | 'folder', item: VFile | VFolder }[]) => {
    if (items.length === 0) return;
    
    if (currentView === 'trash') {
      setConfirmModal({
        isOpen: true,
        title: 'Delete Permanently',
        message: `Permanently delete ${items.length} items? This cannot be undone.`,
        confirmText: 'Delete All',
        isDestructive: true,
        onConfirm: async () => {
          try {
            await Promise.all(items.map(({ type, item }) => 
              type === 'folder' ? deleteFolder(item.id) : deleteFile(item.id)
            ));
            fetchTrash();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          } catch (err) {
            console.error(err);
          }
        }
      });
    } else {
      try {
        await Promise.all(items.map(({ type, item }) => 
          type === 'folder' ? deleteFolderMutation.mutateAsync(item.id) : deleteFileMutation.mutateAsync(item.id)
        ));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Handle Restore Item from Trash
  const handleRestore = async (type: 'file' | 'folder', item: VFile | VFolder) => {
    try {
      await restoreItem(type, item.id);
      fetchTrash();
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Empty Trash
  const handleEmptyTrash = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Empty Trash',
      message: 'Permanently delete all items in trash? This will delete files from Telegram messages as well.',
      confirmText: 'Empty Trash',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await emptyTrash();
          fetchTrash();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Handle File Download
  const handleFileDownload = async (file: VFile) => {
    try {
      await downloadFile(file.id);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file. Please try again.');
    }
  };

  // Handle Drag & Drop Upload
  const handleUpload = (files: File[]) => {
    files.forEach((file) => {
      addFileToQueue(file, currentFolderId);
    });
  };

  // Filter items by search query
  // Filter items by search query
  const folders = 
    currentView === 'trash' ? trashData.folders :
    currentView === 'starred' ? starredData.folders :
    (driveData?.folders || []);

  const files = 
    currentView === 'trash' ? trashData.files :
    currentView === 'starred' ? starredData.files :
    (driveData?.files || []);

  const filteredFolders = folders.filter((f: VFolder) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter((f: VFile) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="bg-background text-on-background font-body-lg antialiased"
      style={{ '--sidebar-width': isSidebarCollapsed ? '80px' : `${sidebarWidth}px` } as React.CSSProperties}
    >
      {/* Left Sidebar */}
      <Sidebar 
        onCreateFolder={() => setIsNewFolderOpen(true)}
        onUploadFile={handleUpload}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        sidebarWidth={sidebarWidth}
        onSidebarWidthChange={setSidebarWidth}
      />

      <Topbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuClick={() => setIsMobileMenuOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Main Content Workspace */}
      <main className="transition-all duration-300 max-lg:ml-0 lg:ml-[var(--sidebar-width)] pt-16 min-h-screen">
        {/* Page Content */}
        <div className="max-w-[1440px] mx-auto p-margin-mobile lg:p-margin-desktop">
        {/* Action Header for Trash View */}
        {currentView === 'trash' && (
          <div className="flex flex-col mb-stack-lg shrink-0 gap-2">
            <div className="flex justify-between items-start md:items-center w-full">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Trash</h2>
                <span className="text-body-sm text-on-surface-variant">
                  Items in trash will be deleted forever after 30 days.
                </span>
              </div>
              
              <button
                onClick={handleEmptyTrash}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant text-error font-label-md btn-press-anim hover:bg-error/5"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
                Empty Trash
              </button>
            </div>
          </div>
        )}

        {/* Starred View Header */}
        {currentView === 'starred' && (
          <div className="flex flex-col mb-stack-lg shrink-0 gap-2">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Starred</h2>
            <span className="text-body-sm text-on-surface-variant">
              Your starred files and folders.
            </span>
          </div>
        )}

        {/* Breadcrumbs & Title Section */}
        {currentView !== 'trash' && currentView !== 'settings' && currentView !== 'starred' && (
          <div className="mb-stack-lg shrink-0">
            {currentView === 'drive' && (
              <nav className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant mb-2">
                <button
                  onClick={() => navigate('/')}
                  className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
                >
                  <span className="material-symbols-outlined text-[18px]">home</span>
                  My Files
                </button>
                {breadcrumbs.map((crumb) => (
                  <React.Fragment key={crumb.id}>
                    <span className="material-symbols-outlined text-[16px] text-outline-variant">chevron_right</span>
                    <button
                      onClick={() => navigate(crumb.id ? `/folder/${crumb.id}` : '/')}
                      className={`hover:text-primary transition-colors font-medium ${
                        crumb.id === currentFolderId ? 'text-on-surface font-semibold pointer-events-none' : ''
                      }`}
                      disabled={crumb.id === currentFolderId}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            )}
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                {currentView === 'recent'
                  ? 'Shared'
                  : driveData?.folders?.find((f) => f.id === currentFolderId)?.name || 'My Files'}
              </h2>
              {currentView === 'drive' && (
                <button
                  onClick={() => setIsNewFolderOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-surface-container-low border border-outline-variant/60 rounded-lg hover:bg-surface-container-highest transition-colors text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
                  New Folder
                </button>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 border border-outline-variant rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-surface-container-lowest shadow-sm text-primary'
                    : 'hover:bg-surface-container-highest text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 border border-outline-variant rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-surface-container-lowest shadow-sm text-primary'
                    : 'hover:bg-surface-container-highest text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined">list</span>
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Settings View */}
        {currentView === 'settings' && (
          <div className="flex-1 overflow-y-auto pb-8">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">My Profile</h2>
            <p className="text-body-sm text-on-surface-variant mb-6">Manage your profile details, including your photo, name, and phone number.</p>
            {/* The Settings page content will be injected or imported here, but for simplicity we render the components here */}
            {/* I will create SettingsPage.tsx and we will use it directly. Actually, I can just render SettingsView here to avoid refactoring routing */}
            <SettingsView />
          </div>
        )}

        {/* File Browser Explorer */}
        {currentView !== 'settings' && (
          <FileBrowser
            folders={filteredFolders}
            files={filteredFiles}
            isLoading={
              currentView === 'trash' ? isLoadingTrash :
              currentView === 'starred' ? isLoadingStarred :
              isLoadingFiles
            }
            viewMode={viewMode}
            onNavigateFolder={(id) => {
              navigate(`/folder/${id}`);
            }}
            onFileClick={(file) => setViewingFile(file)}
            onFileDownload={handleFileDownload}
            onRename={(type, item) => {
              setRenameItem({ type, id: item.id, name: item.name });
              setRenameName(item.name);
            }}
            onMove={openMoveModal}
            onDelete={handleDelete}
            onDeleteMultiple={handleDeleteMultiple}
            onUpload={handleUpload}
            isTrash={currentView === 'trash'}
            onRestore={handleRestore}
            onToggleStar={handleToggleStar}
            currentFolderId={currentFolderId}
          />
        )}
        </div>
      </main>

      {/* Floating Upload Queue Manager */}
      <UploaderPanel />

      {/* MODAL 1: Create New Folder */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-glass bg-bg-secondary p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FolderPlus size={18} className="text-accent-primary" />
                New Folder
              </h3>
              <button
                onClick={() => setIsNewFolderOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-bg-tertiary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full h-10 px-3 rounded-lg bg-bg-tertiary border border-border-glass text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-all"
                autoFocus
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="h-9 px-4 rounded-lg bg-bg-tertiary border border-border-glass text-text-secondary text-sm font-semibold hover:bg-bg-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="h-9 px-4 rounded-lg bg-accent-primary text-text-primary text-sm font-semibold hover:bg-accent-secondary shadow-lg shadow-accent-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Rename Item */}
      {renameItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-glass bg-bg-secondary p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-text-primary">
                Rename {renameItem.type === 'folder' ? 'Folder' : 'File'}
              </h3>
              <button
                onClick={() => setRenameItem(null)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-bg-tertiary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRename} className="flex flex-col gap-4">
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-bg-tertiary border border-border-glass text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-all"
                autoFocus
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRenameItem(null)}
                  className="h-9 px-4 rounded-lg bg-bg-tertiary border border-border-glass text-text-secondary text-sm font-semibold hover:bg-bg-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameName.trim() || renameName === renameItem.name}
                  className="h-9 px-4 rounded-lg bg-accent-primary text-text-primary text-sm font-semibold hover:bg-accent-secondary shadow-lg shadow-accent-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Move Item */}
      {moveItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-glass bg-bg-secondary p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-text-primary truncate" title={`Move "${moveItem.name}"`}>
                Move &quot;{moveItem.name}&quot;
              </h3>
              <button
                onClick={() => setMoveItem(null)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-bg-tertiary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="text-sm text-text-secondary mb-1">
                Select target folder:
              </div>

              {isLoadingFolders ? (
                <div className="flex items-center justify-center py-8 text-accent-primary">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto no-scrollbar border border-border-glass rounded-lg bg-bg-tertiary p-2 flex flex-col gap-1">
                  {/* Root option */}
                  <button
                    onClick={() => setTargetFolderId(null)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                      targetFolderId === null
                        ? 'bg-accent-primary/10 text-accent-primary font-bold'
                        : 'hover:bg-bg-secondary text-text-primary'
                    }`}
                  >
                    <Folder className="text-warning" size={16} />
                    My Drive (Root)
                  </button>

                  {/* All other folders list */}
                  {allFoldersList.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => setTargetFolderId(folder.id)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                        targetFolderId === folder.id
                          ? 'bg-accent-primary/10 text-accent-primary font-bold'
                          : 'hover:bg-bg-secondary text-text-primary'
                      }`}
                    >
                      <Folder className="text-warning" size={16} />
                      {folder.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMoveItem(null)}
                  className="h-9 px-4 rounded-lg bg-bg-tertiary border border-border-glass text-text-secondary text-sm font-semibold hover:bg-bg-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMove}
                  disabled={isLoadingFolders}
                  className="h-9 px-4 rounded-lg bg-accent-primary text-text-primary text-sm font-semibold hover:bg-accent-secondary shadow-lg shadow-accent-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Move Here
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: File Preview */}
      {viewingFile && (
        <FileViewerModal 
          file={viewingFile}
          onClose={() => setViewingFile(null)}
          onDownload={() => {
            handleFileDownload(viewingFile);
            setViewingFile(null); // Optional: close modal on download
          }}
        />
      )}

      {/* MODAL 5: Confirmation */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-glass bg-bg-secondary p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-text-primary">
                {confirmModal.title}
              </h3>
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-bg-tertiary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-6">
              <p className="text-sm text-text-secondary leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="h-9 px-4 rounded-lg bg-bg-tertiary border border-border-glass text-text-secondary text-sm font-semibold hover:bg-bg-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`h-9 px-4 rounded-lg text-white text-sm font-semibold shadow-lg transition-colors ${
                    confirmModal.isDestructive 
                      ? 'bg-error hover:bg-error/90 shadow-error/25' 
                      : 'bg-accent-primary hover:bg-accent-secondary shadow-accent-primary/25'
                  }`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
