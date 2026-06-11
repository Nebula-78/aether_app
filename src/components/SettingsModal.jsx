import React, { useState, useEffect } from 'react';
import { X, UserCircle, Wrench, Palette, Keyboard, Trash2, Plus, Check, Save, Search, Loader2 } from 'lucide-react';

const SettingsModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('profils');
  const [profiles, setProfiles] = useState({});
  const [fontScale, setFontScale] = useState(1);
  const [systemPrompt, setSystemPrompt] = useState(''); 
  const [tavilyKey, setTavilyKey] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProfile, setNewProfile] = useState({
    name: '',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o'
  });
  const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, error

  useEffect(() => {
    refreshProfiles();
    window.electronAPI.loadConfig().then(config => {
      if (config) {
        if (config.defaultSystemPrompt) setSystemPrompt(config.defaultSystemPrompt);
        if (config.tavilyApiKey) setTavilyKey(config.tavilyApiKey);
      }
    });
  }, []);

  const refreshProfiles = () => {
    window.electronAPI.listProfiles().then(setProfiles);
  };

  const handleDelete = async (id) => {
    if (confirm("Supprimer ce profil ?")) {
      await window.electronAPI.deleteProfile(id);
      refreshProfiles();
    }
  };

  const handleTestProfile = async () => {
    if (!newProfile.apiKey || !newProfile.baseUrl) return;
    setTestStatus('testing');
    const result = await window.electronAPI.testConfig(newProfile);
    setTestStatus(result.success ? 'success' : 'error');
  };

  const handleSaveProfile = async () => {
    const profile = { ...newProfile, id: Date.now().toString() };
    const result = await window.electronAPI.saveConfig(profile);
    if (result.success) {
      setShowAddForm(false);
      setNewProfile({ name: '', baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o' });
      setTestStatus('idle');
      refreshProfiles();
    }
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

  const handleSaveTavilyKey = async () => {
    const currentConfig = await window.electronAPI.loadConfig();
    await window.electronAPI.saveConfig({ ...currentConfig, tavilyApiKey: tavilyKey });
    alert("Clé Tavily sauvegardée !");
  };

  const tabs = [
    { id: 'profils', label: 'Profils API', icon: <UserCircle size={16} /> },
    { id: 'recherche', label: 'Recherche', icon: <Search size={16} /> },
    { id: 'apparence', label: 'Apparence', icon: <Palette size={16} /> },
    { id: 'prompt', label: 'Prompt Système', icon: <Keyboard size={16} /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-[fadeSlideIn_0.2s_ease_both]">
      <div className="bg-main-bg border border-border-subtle rounded-2xl shadow-2xl w-full max-w-2xl h-[550px] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-sidebar-bg border-r border-border-subtle p-4 flex flex-col gap-2">
          <h2 className="text-lg font-medium text-txt-primary mb-4 px-2">Paramètres</h2>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowAddForm(false); }}
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
        <div className="flex-1 p-6 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-medium text-txt-primary">
              {tabs.find(t => t.id === activeTab).label}
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-item-hover rounded-full text-txt-secondary hover:text-txt-primary">
              <X size={20} />
            </button>
          </div>
          
          <div className="text-txt-secondary text-sm flex-1">
            {activeTab === 'profils' && (
              <div className="space-y-4">
                {!showAddForm ? (
                  <>
                    <div className="space-y-2">
                      {Object.entries(profiles).map(([id, profile]) => (
                        <div key={id} className="flex items-center gap-3 p-3 bg-sidebar-bg rounded-lg border border-border-subtle group">
                          <UserCircle size={20} className="text-txt-secondary" />
                          <div className="flex-1">
                            <div className="text-txt-primary font-medium">{profile.name}</div>
                            <div className="text-xs opacity-60">{profile.model}</div>
                          </div>
                          <button onClick={() => handleDelete(id)} className="p-1.5 text-txt-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setShowAddForm(true)}
                      className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-border-subtle rounded-lg hover:border-accent hover:text-accent transition-all text-xs font-medium"
                    >
                      <Plus size={14} /> Ajouter un profil
                    </button>
                  </>
                ) : (
                  <div className="space-y-3 p-4 bg-sidebar-bg rounded-xl border border-border-subtle animate-[fadeSlideIn_0.2s_ease_both]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-txt-primary uppercase tracking-wider">Nouveau Profil</span>
                      <button onClick={() => setShowAddForm(false)} className="text-txt-secondary hover:text-txt-primary"><X size={14} /></button>
                    </div>
                    <input type="text" placeholder="Nom du profil (ex: OpenAI Perso)" value={newProfile.name} onChange={e => setNewProfile({...newProfile, name: e.target.value})} className="w-full bg-input-bg border border-border-input rounded-lg px-3 py-2 text-sm text-txt-primary outline-none focus:border-accent" />
                    <input type="text" placeholder="Base URL" value={newProfile.baseUrl} onChange={e => setNewProfile({...newProfile, baseUrl: e.target.value})} className="w-full bg-input-bg border border-border-input rounded-lg px-3 py-2 text-sm text-txt-primary outline-none focus:border-accent" />
                    <input type="password" placeholder="Clé API" value={newProfile.apiKey} onChange={e => setNewProfile({...newProfile, apiKey: e.target.value})} className="w-full bg-input-bg border border-border-input rounded-lg px-3 py-2 text-sm text-txt-primary outline-none focus:border-accent" />
                    <input type="text" placeholder="Modèle par défaut" value={newProfile.model} onChange={e => setNewProfile({...newProfile, model: e.target.value})} className="w-full bg-input-bg border border-border-input rounded-lg px-3 py-2 text-sm text-txt-primary outline-none focus:border-accent" />
                    
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={handleTestProfile} 
                        disabled={testStatus === 'testing' || !newProfile.apiKey}
                        className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium transition-all ${
                          testStatus === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                          testStatus === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                          'bg-item-hover text-txt-primary hover:bg-accent hover:text-white'
                        }`}
                      >
                        {testStatus === 'testing' ? <Loader2 size={14} className="animate-spin" /> : 
                         testStatus === 'success' ? <Check size={14} /> : 
                         testStatus === 'error' ? <X size={14} /> : null}
                        {testStatus === 'testing' ? 'Test...' : 'Tester la connexion'}
                      </button>
                      <button 
                        onClick={handleSaveProfile}
                        disabled={testStatus !== 'success'}
                        className="flex-1 p-2 bg-accent text-white rounded-lg text-xs font-medium disabled:opacity-30 disabled:grayscale transition-all"
                      >
                        Sauvegarder
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'recherche' && (
              <div className="space-y-6">
                <div className="bg-sidebar-bg p-4 rounded-xl border border-border-subtle space-y-4">
                  <div>
                    <h4 className="text-txt-primary font-medium mb-1">Intégration Tavily</h4>
                    <p className="text-xs text-txt-secondary mb-4">
                      Tavily permet à ARIA d'effectuer des recherches sur le web en temps réel pour obtenir des informations fraîches.
                    </p>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">Clé API Tavily</label>
                      <input 
                        type="password" 
                        placeholder="tvly-..." 
                        value={tavilyKey} 
                        onChange={e => setTavilyKey(e.target.value)} 
                        className="w-full bg-input-bg border border-border-input rounded-lg px-3 py-2 text-sm text-txt-primary outline-none focus:border-accent" 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleSaveTavilyKey} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    <Save size={16} /> Sauvegarder la configuration
                  </button>
                </div>
                
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                  <p className="text-xs text-blue-400 leading-relaxed">
                    💡 Vous pouvez obtenir une clé API gratuite sur <a href="https://tavily.com" target="_blank" rel="noreferrer" className="underline">tavily.com</a>. Le modèle gratuit permet jusqu'à 1000 recherches par mois.
                  </p>
                </div>
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
