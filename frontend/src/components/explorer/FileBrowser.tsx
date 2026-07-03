import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { VFile, VFolder, ViewMode, ContextMenuState } from '../../domain/types';
import { FileCard } from './FileCard';
import { FileRow } from './FileRow';
import { ContextMenu } from './ContextMenu';

interface FileBrowserProps {
  folders: VFolder[];
  files: VFile[];
  isLoading: boolean;
  viewMode: ViewMode;
  onNavigateFolder: (id: string) => void;
  onFileClick: (file: VFile) => void;
  onFileDownload: (file: VFile) => void;
  onRename: (type: 'file' | 'folder', item: VFile | VFolder) => void;
  onMove: (type: 'file' | 'folder', item: VFile | VFolder) => void;
  onDelete: (type: 'file' | 'folder', item: VFile | VFolder) => void;
  onDeleteMultiple?: (items: SelectedItem[]) => void;
  onUpload: (files: File[]) => void;
  isTrash?: boolean;
  onRestore?: (type: 'file' | 'folder', item: VFile | VFolder) => void;
  onToggleStar?: (type: 'file' | 'folder', id: string) => void;
  currentFolderId?: string | null;
}

export type SelectedItem = { type: 'file' | 'folder', item: VFile | VFolder };

export const FileBrowser: React.FC<FileBrowserProps> = ({
  folders,
  files,
  isLoading,
  viewMode,
  onNavigateFolder,
  onFileClick,
  onFileDownload,
  onRename,
  onMove,
  onDelete,
  onDeleteMultiple,
  onUpload,
  isTrash = false,
  onRestore,
  onToggleStar,
  currentFolderId,
}) => {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    setSelectedItems([]);
  }, [currentFolderId, isTrash]);

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles);
      }
    },
    noClick: true, // Don't trigger file selector on root click
  });

  const handleSelectItem = (item: VFile | VFolder, type: 'file' | 'folder') => {
    setSelectedItems(prev => {
      const exists = prev.some(i => i.item.id === item.id && i.type === type);
      if (exists) {
        return prev.filter(i => !(i.item.id === item.id && i.type === type));
      }
      return [...prev, { item, type }];
    });
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    type: 'file' | 'folder',
    item: VFile | VFolder
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      item,
    });
    // Add to selection if not already selected
    setSelectedItems(prev => {
      const exists = prev.some(i => i.item.id === item.id && i.type === type);
      if (!exists) return [...prev, { type, item }];
      return prev;
    });
  };

  const handleDeleteSelected = () => {
    if (onDeleteMultiple) {
      onDeleteMultiple(selectedItems);
    } else {
      selectedItems.forEach(({ type, item }) => onDelete(type, item));
    }
    setSelectedItems([]);
  };

  const handleDownloadSelected = () => {
    selectedItems.forEach(({ type, item }) => {
      if (type === 'file') onFileDownload(item as VFile);
    });
    setSelectedItems([]);
  };

  const hasItems = folders.length > 0 || files.length > 0;
  const isAllSelected = hasItems && selectedItems.length === (folders.length + files.length);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems([
        ...folders.map(f => ({ type: 'folder' as const, item: f })),
        ...files.map(f => ({ type: 'file' as const, item: f }))
      ]);
    }
  };

  const isSingleItemSelected = selectedItems.length === 1;
  const singleItem = isSingleItemSelected ? selectedItems[0] : null;
  const isStarred = singleItem 
    ? (singleItem.type === 'folder' 
        ? folders.find(f => f.id === singleItem.item.id)?.isStarred 
        : files.find(f => f.id === singleItem.item.id)?.isStarred)
    : false;
  const handleToggleStarSelected = async () => {
    if (!onToggleStar) return;
    for (const item of selectedItems) {
      await onToggleStar(item.type, item.item.id);
    }
  };

  return (
    <div
      {...getRootProps()}
      onClick={handleClearSelection}
      className="relative flex-1 overflow-y-auto no-scrollbar outline-none flex flex-col min-h-0"
    >
      <input {...getInputProps()} />

      {/* Drag & Drop Overlay */}
      {isDragActive && !isTrash && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm border-2 border-dashed border-primary m-4 rounded-2xl flex flex-col items-center justify-center gap-4 z-40 animate-in fade-in duration-200">
          <div className="p-4 rounded-full bg-primary/10 border border-primary/20 animate-bounce">
            <span className="material-symbols-outlined text-primary text-[48px] filled">cloud_upload</span>
          </div>
          <p className="text-xl font-bold text-on-background">
            Drop your files here to upload
          </p>
          <p className="text-sm text-on-surface-variant">
            Upload up to 2GB per file directly to Telegram
          </p>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="h-4 bg-surface-container w-24 rounded animate-pulse" />
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-36 bg-surface-container-low border border-outline-variant/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="border border-outline-variant/60 rounded-xl overflow-hidden animate-pulse">
              <div className="h-10 bg-surface-container/40 border-b border-outline-variant/40" />
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 bg-surface-container-lowest border-b border-outline-variant/40" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasItems && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <div className="p-4 rounded-full bg-surface-container border border-outline-variant text-on-surface-variant shrink-0 w-16 h-16 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">folder_open</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-on-surface">This folder is empty</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              {isTrash
                ? 'No items in the Trash.'
                : 'Drag & drop files here to upload, or use the "New Folder" button.'}
            </p>
          </div>
        </div>
      )}

      {/* Grid View */}
      {!isLoading && hasItems && viewMode === 'grid' && (
        <div className="pb-8">
          {selectedItems.length > 0 && (
            <div className="mb-4 flex items-center justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-outline-variant/60 hover:bg-surface-container-low transition-colors text-on-surface"
              >
                <input type="checkbox" checked={isAllSelected} onChange={() => {}} className="pointer-events-none rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 bg-white" />
                Select All
              </button>
            </div>
          )}
          {/* Folders Section */}
          {folders.length > 0 && (
            <div className="mb-stack-lg">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Folders</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
                {folders.map((folder) => (
                  <FileCard
                    key={`folder-${folder.id}`}
                    {...folder}
                    type="folder"
                    isSelected={selectedItems.some(i => i.item.id === folder.id && i.type === 'folder')}
                    onSelect={() => handleSelectItem(folder, 'folder')}
                    onClick={() => handleSelectItem(folder, 'folder')}
                    onDoubleClick={() => !isTrash && onNavigateFolder(folder.id)}
                    onContextMenu={(e) => handleContextMenu(e, 'folder', folder)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {files.length > 0 && (
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Files</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
                {files.map((file) => (
                  <FileCard
                    key={`file-${file.id}`}
                    {...file}
                    type="file"
                    isSelected={selectedItems.some(i => i.item.id === file.id && i.type === 'file')}
                    onSelect={() => handleSelectItem(file, 'file')}
                    onClick={() => handleSelectItem(file, 'file')}
                    onDoubleClick={() => !isTrash && onFileClick(file)}
                    onContextMenu={(e) => handleContextMenu(e, 'file', file)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {!isLoading && hasItems && viewMode === 'list' && (
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/60 text-xs font-semibold uppercase tracking-wider text-on-surface-variant bg-surface-container-low/40">
                <th className="w-10 py-3 text-center cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}>
                  {selectedItems.length > 0 && (
                    <input type="checkbox" checked={isAllSelected} onChange={() => {}} className="pointer-events-none rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 bg-white" />
                  )}
                </th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4 hidden md:table-cell">Type</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4 hidden lg:table-cell">Modified</th>
              </tr>
            </thead>
            <tbody>
              {/* Folders */}
              {folders.map((folder) => (
                <FileRow
                  key={`folder-${folder.id}`}
                  item={folder}
                  type="folder"
                  selected={selectedItems.some(i => i.item.id === folder.id && i.type === 'folder')}
                  onClick={() => handleSelectItem(folder, 'folder')}
                  onDoubleClick={() => !isTrash && onNavigateFolder(folder.id)}
                  onContextMenu={(e) => handleContextMenu(e, 'folder', folder)}
                />
              ))}

              {/* Files */}
              {files.map((file) => (
                <FileRow
                  key={`file-${file.id}`}
                  item={file}
                  type="file"
                  selected={selectedItems.some(i => i.item.id === file.id && i.type === 'file')}
                  onClick={() => handleSelectItem(file, 'file')}
                  onDoubleClick={() => !isTrash && onFileClick(file)}
                  onContextMenu={(e) => handleContextMenu(e, 'file', file)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Context Menu Portal */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onOpen={
            contextMenu.type === 'folder' && !isTrash
              ? () => onNavigateFolder(contextMenu.item.id)
              : undefined
          }
          onDownload={
            contextMenu.type === 'file' && !isTrash
              ? () => onFileDownload(contextMenu.item as VFile)
              : undefined
          }
          onRename={() => onRename(contextMenu.type, contextMenu.item)}
          onMove={() => onMove(contextMenu.type, contextMenu.item)}
          onDelete={() => onDelete(contextMenu.type, contextMenu.item)}
          onRestore={
            isTrash && onRestore
              ? () => onRestore(contextMenu.type, contextMenu.item)
              : undefined
          }
          onToggleStar={
            onToggleStar && !isTrash
              ? () => onToggleStar(contextMenu.type, contextMenu.item.id)
              : undefined
          }
        />
      )}

      {/* Contextual Action Bar */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-surface-container-highest shadow-lg rounded-full border border-outline-variant/30 px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-8 fade-in">
          <span className="text-on-surface font-label-lg whitespace-nowrap">
            {selectedItems.length} selected
          </span>
          <div className="w-px h-6 bg-outline-variant/50"></div>
          
          <div className="flex items-center gap-2">
            {!isTrash && (
              <button
                onClick={handleDownloadSelected}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-primary/10 rounded-full flex items-center justify-center tooltip-trigger"
                title="Download"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
              </button>
            )}

            {!isTrash && onToggleStar && (
              <button
                onClick={handleToggleStarSelected}
                className="p-2 text-on-surface-variant hover:text-amber-500 transition-colors hover:bg-amber-500/10 rounded-full flex items-center justify-center tooltip-trigger"
                title={isStarred ? "Unstar" : "Star"}
              >
                <span className={`material-symbols-outlined text-[20px] ${isStarred ? 'text-amber-500 filled' : ''}`}>
                  star
                </span>
              </button>
            )}


            
            <button
              onClick={handleDeleteSelected}
              className="p-2 text-on-surface-variant hover:text-error transition-colors hover:bg-error/10 rounded-full flex items-center justify-center tooltip-trigger"
              title="Delete"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
            
            <button
              onClick={handleClearSelection}
              className="p-2 text-on-surface-variant hover:text-on-surface transition-colors hover:bg-on-surface/10 rounded-full flex items-center justify-center tooltip-trigger ml-2"
              title="Clear Selection"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
