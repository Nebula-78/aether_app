import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, SendHorizontal, Image as ImageIcon, Search, Lightbulb, FolderOpen, MoreHorizontal, History, File, Globe } from 'lucide-react';

const HeroInputZone = ({ onSend, streaming, disabled, activePersona, onPersonaChange }) => {
  const [text, setText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = (e) => {
    setText(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || disabled || streaming) return;
    
    onSend([{ type: "text", text: text.trim() }], {});
    setText('');
  };

  const handleMenuAction = (action) => {
    setShowMenu(false);
    if (action === 'image') {
      onSend('Je souhaite créer une image', { formatMode: 'prose' });
    } else if (action === 'search_web') {
      onSend('Recherche web : ', { useSearch: true });
    } else if (action === 'deep_search') {
      onSend('Recherche approfondie : ', { useSearch: true, searchDepth: 'advanced' });
    } else if (action === 'think') {
      onSend('Réfléchis étape par étape à ce problème : ', { formatMode: 'structured' });
    }
    // D'autres actions peuvent être connectées ici
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto flex items-center bg-[#222222] border border-white/5 rounded-full px-2 py-2 shadow-2xl transition-all hover:bg-[#282828] focus-within:bg-[#282828] focus-within:border-white/20">
      
      {/* Plus Button & Dropdown Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={disabled || streaming}
          className="w-10 h-10 flex items-center justify-center rounded-full text-txt-secondary hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Plus size={20} />
        </button>

        {showMenu && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-[fadeSlideIn_0.2s_ease_both]">
            <div className="flex flex-col gap-1">
              <button onClick={() => handleMenuAction('upload')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-txt-primary text-sm transition-colors text-left">
                <File size={16} className="text-txt-secondary" /> Charger des photos et des ...
              </button>
              <button onClick={() => handleMenuAction('recent')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 text-txt-primary text-sm transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <History size={16} className="text-txt-secondary" /> Fichiers récents
                </div>
                <span className="text-txt-secondary group-hover:text-white opacity-50">&gt;</span>
              </button>
              <div className="h-[1px] w-full bg-white/5 my-1" />
              <button onClick={() => handleMenuAction('image')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-txt-primary text-sm transition-colors text-left">
                <ImageIcon size={16} className="text-txt-secondary" /> Créer une image
              </button>
              <button onClick={() => handleMenuAction('think')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-txt-primary text-sm transition-colors text-left">
                <Lightbulb size={16} className="text-txt-secondary" /> Réfléchis
              </button>
              <button onClick={() => handleMenuAction('deep_search')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-txt-primary text-sm transition-colors text-left">
                <Search size={16} className="text-txt-secondary" /> Recherche approfondie
              </button>
              <button onClick={() => handleMenuAction('search_web')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-txt-primary text-sm transition-colors text-left">
                <Globe size={16} className="text-txt-secondary" /> Recherche sur le Web
              </button>
              <button onClick={() => handleMenuAction('more')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 text-txt-primary text-sm transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <MoreHorizontal size={16} className="text-txt-secondary" /> Plus
                </div>
                <span className="text-txt-secondary group-hover:text-white opacity-50">&gt;</span>
              </button>
              <div className="h-[1px] w-full bg-white/5 my-1" />
              <button onClick={() => handleMenuAction('projects')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 text-txt-primary text-sm transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <FolderOpen size={16} className="text-txt-secondary" /> Projets
                </div>
                <span className="text-txt-secondary group-hover:text-white opacity-50">&gt;</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <input
        type="text"
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled || streaming}
        placeholder="Poser une question"
        className="flex-1 bg-transparent border-none outline-none text-txt-primary placeholder:text-txt-secondary text-base px-3 h-10 w-full disabled:cursor-not-allowed"
      />

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 pr-1">
        <button
          disabled={disabled || streaming}
          className="w-10 h-10 flex items-center justify-center rounded-full text-txt-secondary hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Mic size={18} />
        </button>
        
        {text.trim() ? (
          <button
            onClick={handleSubmit}
            disabled={disabled || streaming}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 cursor-pointer shadow-lg"
          >
            <SendHorizontal size={18} />
          </button>
        ) : (
          <button
            disabled={disabled || streaming}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E55A1A] text-white hover:bg-[#F66A2B] transition-colors disabled:opacity-50 cursor-pointer shadow-lg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v16M8 8v8M16 8v8M4 11v2M20 11v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default HeroInputZone;
