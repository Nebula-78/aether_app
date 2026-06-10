import React, { useState, useEffect } from 'react';
import { Plus, Check, Trash2, UserCircle, Loader2, CheckCircle2, XCircle, Settings } from 'lucide-react';

const ProfileForm = ({ onSave, onCancel }) => {
  const [config, setConfig] = useState({
    name: '',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o'
  });
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleTest = async () => {
    if (!config.apiKey || !config.baseUrl) return;
    setStatus('testing');
    const result = await window.electronAPI.testConfig(config);
    if (result.success) {
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'Erreur inconnue');
    }
  };

  const handleSave = async () => {
    const profile = { ...config, id: Date.now().toString() };
    const result = await window.electronAPI.saveConfig(profile);
    if (result.success) {
      onSave(profile);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-txt-primary">Nouveau Profil</h4>
      <input type="text" placeholder="Nom" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} className="w-full bg-input-bg border border-border-input rounded-lg px-4 py-2 text-sm" />
      <input type="text" placeholder="URL" value={config.baseUrl} onChange={e => setConfig({...config, baseUrl: e.target.value})} className="w-full bg-input-bg border border-border-input rounded-lg px-4 py-2 text-sm" />
      <input type="password" placeholder="Clé API" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} className="w-full bg-input-bg border border-border-input rounded-lg px-4 py-2 text-sm" />
      <input type="text" placeholder="Modèle" value={config.model} onChange={e => setConfig({...config, model: e.target.value})} className="w-full bg-input-bg border border-border-input rounded-lg px-4 py-2 text-sm" />
      
      <div className="flex gap-2">
        <button onClick={handleTest} className="flex-1 px-3 py-2 text-sm bg-item-hover rounded-lg">Test</button>
        <button onClick={handleSave} disabled={status !== 'success'} className="flex-1 px-3 py-2 text-sm bg-accent text-white rounded-lg disabled:opacity-50">Sauvegarder</button>
      </div>
    </div>
  );
};

const ProfileMenu = ({ activeProfileId, onSwitch, onClose }) => {
  const [profiles, setProfiles] = useState({});
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    window.electronAPI.listProfiles().then(setProfiles);
  }, []);

  const handleSwitch = async (id) => {
    await window.electronAPI.switchProfile(id);
    onSwitch(id);
    onClose();
    window.location.reload(); 
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await window.electronAPI.deleteProfile(id);
    const newProfiles = { ...profiles };
    delete newProfiles[id];
    setProfiles(newProfiles);
  };

  if (showAdd) {
    return <div className="p-4"><ProfileForm onSave={() => { setShowAdd(false); window.electronAPI.listProfiles().then(setProfiles); }} onCancel={() => setShowAdd(false)} /></div>;
  }

  return (
    <div className="absolute bottom-16 left-4 w-64 bg-sidebar-bg border border-border-subtle rounded-xl shadow-2xl p-2 z-50 animate-[fadeSlideIn_0.2s_ease_both]">
      <div className="text-[11px] font-medium text-txt-secondary uppercase tracking-wider px-3 py-2">
        Profils API
      </div>
      <div className="flex flex-col gap-1">
        {Object.entries(profiles).map(([id, profile]) => (
          <button
            key={id}
            onClick={() => handleSwitch(id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
              activeProfileId === id ? 'bg-item-active text-txt-primary' : 'text-txt-secondary hover:bg-item-hover hover:text-txt-primary'
            }`}
          >
            <UserCircle size={16} className={activeProfileId === id ? 'text-accent' : ''} />
            <span className="flex-1 text-left truncate">{profile.name}</span>
            {activeProfileId === id && <Check size={14} className="text-accent" />}
            {Object.keys(profiles).length > 1 && (
              <button onClick={(e) => handleDelete(e, id)} className="p-1 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            )}
          </button>
        ))}
      </div>
      <div className="border-t border-border-subtle mt-2 pt-2">
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-txt-secondary hover:text-accent hover:bg-item-hover rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span>Ajouter un profil</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileMenu;
