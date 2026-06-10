import React, { useState, useEffect } from 'react';
import { X, UserCircle, Wrench, Palette, Keyboard, Trash2, Plus, Check, Save } from 'lucide-react';

const SettingsModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('profils');
  const [profiles, setProfiles] = useState({});
  const [fontScale, setFontScale] = useState(1);
  const [systemPrompt, setSystemPrompt] = useState(''); 

  useEffect(() => {
    window.electronAPI.listProfiles().then(setProfiles);
    window.electronAPI.loadConfig().then(config => {
      if (config && config.defaultSystemPrompt) {
        setSystemPrompt(config.defaultSystemPrompt);
      }
    });
  }, []);

  const handleDelete = async (id) => {
    await window.electronAPI.deleteProfile(id);
    const newProfiles = { ...profiles };
    delete newProfiles[id];
    setProfiles(newProfiles);
  };

  const handleSaveApparence = (scale) => {
    setFontScale(scale);
    document.documentElement.style.setProperty('--font-scale', scale);
  };

  const handleSaveSystemPrompt = async () => {
    const currentConfig = await window.electronAPI.loadConfig();
    await window.electronAPI.saveConfig({ ...currentConfig, defaultSystemPrompt: systemPrompt });
    alert("Prompt système par défaut sauvegardé !");
  };

  const tabs = [
    { id: 'profils', label: 'Profils API', icon: <UserCircle size={16} /> },
    { id: 'apparence', label: 'Apparence', icon: <Palette size={16} /> },
    { id: 'prompt', label: 'Prompt Système', icon: <Wrench size={16} /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-main-bg border border-border-subtle rounded-2xl shadow-2xl w-full max-w-2xl h-[500px] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-sidebar-bg border-r border-border-subtle p-4 flex flex-col gap-2">
          <h2 className="text-lg font-medium text-txt-primary mb-4 px-2">Paramètres</h2>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                activeTab === tab.id ? 'bg-item-active text-txt-primary' : 'text-txt-secondary hover:bg-item-hover'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-medium text-txt-primary">
              {tabs.find(t => t.id === activeTab).label}
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-item-hover rounded-full text-txt-secondary hover:text-txt-primary">
              <X size={20} />
            </button>
          </div>
          
          <div className="text-txt-secondary text-sm">
            {activeTab === 'profils' && (
              <div className="space-y-4">
                {Object.entries(profiles).map(([id, profile]) => (
                  <div key={id} className="flex items-center gap-3 p-3 bg-sidebar-bg rounded-lg border border-border-subtle">
                    <UserCircle size={20} />
                    <div className="flex-1">
                      <div className="text-txt-primary font-medium">{profile.name}</div>
                      <div className="text-xs">{profile.model}</div>
                    </div>
                    <button onClick={() => handleDelete(id)} className="p-1 hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'apparence' && (
              <div className="space-y-4">
                <label className="block text-txt-primary">Échelle de police : {fontScale}</label>
                <input type="range" min="0.8" max="1.2" step="0.1" value={fontScale} onChange={(e) => handleSaveApparence(parseFloat(e.target.value))} className="w-full" />
              </div>
            )}

            {activeTab === 'prompt' && (
              <div className="space-y-4">
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full h-32 bg-input-bg border border-border-input rounded-lg p-2 text-sm text-txt-primary outline-none focus:border-accent"
                  placeholder="Prompt système global par défaut..."
                />
                <button onClick={handleSaveSystemPrompt} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm">
                  <Save size={16} /> Sauvegarder
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
