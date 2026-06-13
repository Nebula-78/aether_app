import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  PanelLeft, 
  Plus, 
  Trash2,
  ChevronDown,
  X,
  UserCircle,
  Code as CodeIcon,
  PenTool,
  BarChartHorizontal,
  Settings
} from 'lucide-react';
import SidebarItem from './SidebarItem';
import ProfileMenu from './ProfileMenu';
import { useAppStore } from '../store/useAppStore';

const PERSONAS = [
  { id: 'default', name: 'ARIA', icon: <UserCircle size={14} /> },
  { id: 'coder', name: 'Développeur', icon: <CodeIcon size={14} /> },
  { id: 'writer', name: 'Rédacteur', icon: <PenTool size={14} /> },
  { id: 'analyst', name: 'Analyste', icon: <BarChartHorizontal size={14} /> },
];

const Sidebar = ({ onOpenSettings }) => {
  const { 
    conversations, activeConvId, setActiveConvId, setMessages, setSystemPrompt,
    showSidebar, setShowSidebar, activePersona, setActivePersona, config,
    refreshConversations 
  } = useAppStore();

  const [showSearch, setShowSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);

  const startNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setSystemPrompt('');
  };

  const deleteConversation = async (id, title) => {
    const confirmed = await window.electronAPI.deleteConversationConfirm(title);
    if (!confirmed) return;

    await window.electronAPI.deleteConversation(id);
    if (activeConvId === id) {
      startNewConversation();
    }
    refreshConversations();
  };

  const renameConversation = async (id, newTitle) => {
    const list = await window.electronAPI.listConversations();
    const conv = list.find(c => c.id === id);
    if (conv) {
      const updatedConv = { ...conv, title: newTitle, updatedAt: new Date().toISOString() };
      await window.electronAPI.saveConversation(updatedConv);
      refreshConversations();
    }
  };

  const selectConversation = (conv) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages || []);
    setSystemPrompt(conv.systemPrompt || '');
  };

  useEffect(() => {
    const handleSearchShortcut = () => {
      setShowSearch(prev => !prev);
    };
    window.electronAPI?.onShortcut('shortcut:search', handleSearchShortcut);
  }, []);

  useEffect(() => {
    if (showSearch) {
      searchInputRef.current?.focus();
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [showSearch]);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const results = await window.electronAPI.searchFullText(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error("Erreur recherche:", e);
      }
    };
    
    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayedConversations = searchQuery ? searchResults : conversations;

  return (
    <aside className="w-full bg-sidebar-bg border-r border-border-subtle flex flex-col overflow-hidden select-none h-full">
      {/* Header */}
      <div className="h-[52px] flex items-center justify-between px-4">
        <span className="font-body text-lg font-medium text-txt-primary tracking-tight">ARIA</span>
        <div className="flex items-center gap-1 text-txt-secondary">
          <button 
            onClick={onOpenSettings}
            aria-label="Ouvrir les paramètres"
            className="p-1.5 hover:bg-item-hover rounded-md transition-colors cursor-pointer"
            title="Paramètres"
          >
            <Settings size={18} />
          </button>
          <button 
            onClick={() => setShowSearch(prev => !prev)}
            aria-label="Rechercher une discussion"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${showSearch ? 'bg-item-active text-txt-primary' : 'hover:bg-item-hover'}`}
            title="Rechercher (Ctrl+K)"
          >
            <Search size={18} />
          </button>
          <button 
            onClick={() => setShowSidebar(false)}
            aria-label="Réduire la barre latérale"
            className="p-1.5 hover:bg-item-hover rounded-md transition-colors cursor-pointer"
          >
            <PanelLeft size={18} />
          </button>
        </div>
      </div>

      {/* Barre de recherche (conditionnelle) */}
      {showSearch && (
        <div className="px-3 pb-2 animate-[fadeSlideIn_0.15s_ease_both]">
          <div className="relative flex items-center bg-input-bg border border-border-input rounded-md px-2 py-1.5">
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Champ de recherche"
              placeholder="Rechercher partout..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-[12px] text-txt-primary placeholder:text-txt-secondary select-text pr-5"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                aria-label="Effacer la recherche"
                className="absolute right-2 text-txt-secondary hover:text-txt-primary cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Persona Selector */}
      <div className="px-3 py-2 border-b border-border-subtle bg-main-bg/10">
        <div className="flex flex-wrap gap-1">
          {PERSONAS.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePersona(p.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                activePersona === p.id ? 'bg-accent text-white shadow-sm' : 'text-txt-secondary hover:bg-item-hover hover:text-txt-primary'
              }`}
              title={p.name}
            >
              {p.icon}
              <span className="max-w-[60px] truncate">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Nav */}
      <div className="px-2 py-2 flex flex-col gap-0.5">
        <button 
          onClick={startNewConversation}
          aria-label="Commencer une nouvelle conversation"
          className="w-full flex items-center gap-2 px-3 py-2 text-txt-secondary hover:bg-item-hover hover:text-txt-primary rounded-md transition-all text-[13px] cursor-pointer"
        >
          <Plus size={16} />
          <span>Nouvelle conversation</span>
        </button>
      </div>

      {/* Sections Scrollable */}
      <div className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar">
        {displayedConversations.length > 0 ? (
          <div>
            <h3 className="text-[11px] font-medium text-txt-secondary uppercase tracking-wider px-3 mb-1">
              {searchQuery ? 'Résultats de recherche' : 'Récents'}
            </h3>
            <div className="flex flex-col gap-0.5">
              {displayedConversations.map((conv, i) => (
                <div key={conv.id} className="relative group animate-[fadeSlideIn_0.2s_ease_both]">
                  <SidebarItem 
                    title={conv.title} 
                    active={activeConvId === conv.id} 
                    onClick={() => selectConversation(conv)}
                    onRename={(newTitle) => renameConversation(conv.id, newTitle)}
                    delay={i * 0.03} 
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id, conv.title);
                    }}
                    aria-label={`Supprimer la discussion ${conv.title}`}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-txt-secondary hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-sidebar-bg/80 backdrop-blur-sm rounded-md"
                    title="Supprimer la discussion"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            {!searchQuery && (
              <button
                onClick={() => loadConversations(page + 1)}
                className="w-full text-[11px] text-txt-secondary hover:text-accent py-2 text-center"
              >
                Charger plus...
              </button>
            )}
          </div>
        ) : searchQuery ? (
          <div className="text-center text-[12px] text-txt-secondary py-8">
            Aucun message trouvé pour "{searchQuery}"
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="border-t border-border-subtle p-3">
        {showProfileMenu && (
          <ProfileMenu 
            activeProfileId={config?.id}
            onSwitch={() => setShowProfileMenu(false)}
            onClose={() => setShowProfileMenu(false)}
            onOpenSettings={onOpenSettings}
          />
        )}
        <div 
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-3 p-2 hover:bg-item-hover rounded-md cursor-pointer transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-[13px] font-medium uppercase">
            {config?.name?.slice(0, 2) || 'IA'}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-[13px] font-medium text-txt-primary truncate">{config?.name || 'Mon Profil IA'}</div>
            <div className="text-[11px] text-txt-secondary">{config?.model || 'Modèle actif'}</div>
          </div>
          <div className="flex items-center gap-1 text-txt-secondary opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronDown size={14} />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
