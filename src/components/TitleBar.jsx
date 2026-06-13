import React, { useState, useEffect } from 'react';
import { Square, X, Minus, Copy } from 'lucide-react';

const TitleBar = ({ focusMode }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const platform = window.electronAPI?.platform || 'darwin';

  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await window.electronAPI?.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();
  }, []);

  if (focusMode) {
    return <div className="w-full flex bg-main-bg" style={{ height: '8px', WebkitAppRegion: 'drag' }} />;
  }

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = async () => {
    await window.electronAPI?.maximize();
    const maximized = await window.electronAPI?.isMaximized();
    setIsMaximized(maximized);
  };
  const handleClose = () => window.electronAPI?.close();

  return (
    <div 
      className="flex items-center w-full select-none"
      style={{ 
        height: 'var(--titlebar-height)', 
        background: 'var(--color-sidebar-bg)',
        borderBottom: '1px solid var(--color-border-subtle)',
        WebkitAppRegion: 'drag'
      }}
    >
      {/* macOS Controls (Left) */}
      {platform === 'darwin' && (
        <div className="flex items-center gap-2 px-3" style={{ WebkitAppRegion: 'no-drag' }}>
          <button 
            onClick={handleClose}
            aria-label="Fermer la fenêtre"
            className="w-3 h-3 rounded-full bg-[#ff5f57] border border-black/10 hover:brightness-90 transition-all cursor-pointer"
          />
          <button 
            onClick={handleMinimize}
            aria-label="Réduire la fenêtre"
            className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10 hover:brightness-90 transition-all cursor-pointer"
          />
          <button 
            onClick={handleMaximize}
            aria-label={isMaximized ? "Restaurer la fenêtre" : "Agrandir la fenêtre"}
            className="w-3 h-3 rounded-full bg-[#28c840] border border-black/10 hover:brightness-90 transition-all cursor-pointer"
          />
        </div>
      )}

      {/* Title / Spacing */}
      <div className="flex-1" />

      {/* Windows/Linux Controls (Right) */}
      {platform !== 'darwin' && (
        <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' }}>
          <button 
            onClick={handleMinimize}
            aria-label="Réduire la fenêtre"
            className="w-12 h-full flex items-center justify-center text-txt-primary hover:bg-item-hover transition-colors"
          >
            <Minus size={14} />
          </button>
          <button 
            onClick={handleMaximize}
            aria-label={isMaximized ? "Restaurer la fenêtre" : "Agrandir la fenêtre"}
            className="w-12 h-full flex items-center justify-center text-txt-primary hover:bg-item-hover transition-colors"
          >
            {isMaximized ? <Copy size={12} className="rotate-180" /> : <Square size={12} />}
          </button>
          <button 
            onClick={handleClose}
            aria-label="Fermer la fenêtre"
            className="w-12 h-full flex items-center justify-center text-txt-primary hover:bg-[#e81123] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TitleBar;
