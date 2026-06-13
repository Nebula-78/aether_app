import React, { useState, useEffect } from 'react';
import { Check, Trash2, UserCircle, Settings, Plus } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const ProfileMenu = ({ activeProfileId, onSwitch, onClose, onOpenSettings }) => {
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    window.electronAPI.listProfiles().then(setProfiles);
  }, []);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleSwitch = async (id) => {
    await window.electronAPI.switchProfile(id);
    onSwitch(id);
    onClose();
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const executeDelete = async (confirmed) => {
    if (confirmed && confirmDeleteId) {
      await window.electronAPI.deleteProfile(confirmDeleteId);
      const newProfiles = { ...profiles };
      delete newProfiles[confirmDeleteId];
      setProfiles(newProfiles);
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="absolute bottom-16 left-4 w-64 bg-sidebar-bg border border-border-subtle rounded-xl shadow-2xl p-2 z-50 animate-[fadeSlideIn_0.2s_ease_both]">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-medium text-txt-secondary uppercase tracking-wider">
          Profils API
        </span>
        <button 
          onClick={() => { onOpenSettings(); onClose(); }}
          className="text-txt-secondary hover:text-accent transition-colors"
          title="Gérer les profils"
        >
          <Settings size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
        {Object.entries(profiles).map(([id, profile]) => (
          <div
            key={id}
            onClick={() => handleSwitch(id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors group cursor-pointer ${
              activeProfileId === id ? 'bg-item-active text-txt-primary' : 'text-txt-secondary hover:bg-item-hover hover:text-txt-primary'
            }`}
          >
            <UserCircle size={16} className={activeProfileId === id ? 'text-accent' : 'opacity-50'} />
            <span className="flex-1 text-left truncate font-medium">{profile.name}</span>
            {activeProfileId === id ? (
              <Check size={14} className="text-accent" />
            ) : (
              <button 
                onClick={(e) => handleDeleteClick(e, id)} 
                className="p-1 text-txt-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border-subtle mt-2 pt-2">
        <button
          onClick={() => { onOpenSettings(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-txt-secondary hover:text-accent hover:bg-item-hover rounded-lg transition-colors font-medium"
        >
          <Plus size={16} />
          <span>Gérer les profils</span>
        </button>
      </div>

      {confirmDeleteId && (
        <ConfirmModal
          data={{ type: 'generic', title: "Supprimer le profil", message: "Voulez-vous vraiment supprimer ce profil ?" }}
          onConfirm={executeDelete}
        />
      )}
    </div>
  );
};

export default ProfileMenu;
