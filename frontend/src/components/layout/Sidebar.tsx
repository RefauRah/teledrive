import { useNavigate, useLocation } from 'react-router-dom';
import { useRef } from 'react';

interface SidebarProps {
  onCreateFolder?: () => void;
  onUploadFile?: (files: File[]) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

export default function Sidebar({ onUploadFile, isOpen = false, onClose, isCollapsed = false, onToggleCollapse, sidebarWidth = 280, onSidebarWidthChange }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isResizing = useRef(false);

  const handleMouseDown = () => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    let newWidth = e.clientX;
    if (newWidth < 220) newWidth = 220;
    if (newWidth > 600) newWidth = 600;
    onSidebarWidthChange?.(newWidth);
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFile?.(Array.from(e.target.files));
      e.target.value = ''; // Reset
    }
  };

  const navItems: NavItem[] = [
    {
      id: 'drive',
      label: 'My Files',
      icon: 'folder',
      path: '/',
    },
    {
      id: 'starred',
      label: 'Starred',
      icon: 'star',
      path: '/starred',
    },
    {
      id: 'trash',
      label: 'Trash',
      icon: 'delete',
      path: '/trash',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname.startsWith('/folder');
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside 
        className={`fixed left-0 top-0 h-screen bg-surface-container-low shadow-sm flex flex-col py-margin-desktop z-40 border-r border-surface-dim transform ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ 
          width: isCollapsed ? '80px' : `${sidebarWidth}px`, 
          transition: isResizing.current ? 'none' : 'width 300ms ease-in-out, transform 300ms ease-in-out' 
        }}
      >
        {/* Resize Handle */}
        {!isCollapsed && (
          <div 
            onMouseDown={handleMouseDown}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-50"
            title="Drag to resize"
          />
        )}
      <div className={`mb-8 flex items-center ${isCollapsed ? 'px-0 justify-center' : 'px-stack-lg'}`}>
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-3 cursor-pointer group"
          title="Go to Dashboard"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary shrink-0 transition-transform group-hover:scale-105">
            <span className="material-symbols-outlined">cloud</span>
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in zoom-in-95 duration-200 whitespace-nowrap overflow-hidden">
              <h1 className="font-headline-md text-headline-md font-bold text-primary">CloudStorage</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Secure & Fast</p>
            </div>
          )}
        </div>
      </div>
      
      <div className={`mb-6 ${isCollapsed ? 'px-3' : 'px-stack-lg'}`}>
        <input 
          type="file" 
          multiple 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />
        <button 
          onClick={handleUploadClick}
          title="Upload File"
          className={`w-full bg-primary hover:bg-surface-tint text-on-primary font-label-md text-label-md py-3 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 duration-150 ${isCollapsed ? 'px-0' : 'px-4 gap-2'}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          {!isCollapsed && <span>Upload</span>}
        </button>
      </div>
      
      <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2' : 'px-stack-sm'}`}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-r-full font-label-md text-label-md hover:bg-surface-container-highest transition-colors active:scale-95 duration-150 ${isCollapsed ? 'justify-center py-3 rounded-l-full' : 'gap-stack-md px-stack-md py-stack-sm ml-1'} ${
                active 
                  ? `bg-primary-container/10 text-primary ${!isCollapsed && 'border-l-4 border-primary'}`
                  : `text-on-surface-variant ${!isCollapsed && 'border-l-4 border-transparent'}`
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle Button */}
      <div className={`mt-auto pt-4 border-t border-surface-dim ${isCollapsed ? 'px-2' : 'px-stack-lg'}`}>
        <button 
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className={`hidden lg:flex items-center text-on-surface-variant hover:text-primary transition-colors py-2 rounded-lg hover:bg-surface-container-highest ${isCollapsed ? 'justify-center w-full' : 'gap-3 w-full px-2'}`}
        >
          <span className="material-symbols-outlined">
            {isCollapsed ? 'chevron_right' : 'chevron_left'}
          </span>
          {!isCollapsed && <span className="font-label-md text-label-md">Collapse</span>}
        </button>
      </div>
      

    </aside>
    </>
  );
}
