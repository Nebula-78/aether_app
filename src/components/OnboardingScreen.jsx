import React, { useState } from 'react';
import { Settings, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const OnboardingScreen = ({ onConfigSaved }) => {
  const [config, setConfig] = useState({
    name: '',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o'
  });

  const [status, setStatus] = useState('idle'); // idle, testing, success, error
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
    const profile = {
      ...config,
      id: Date.now().toString(),
    };
    const result = await window.electronAPI.saveConfig(profile);
    if (result.success) {
      onConfigSaved(profile);
    }
  };

  return (
    <div className="flex-1 bg-main-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-sidebar-bg border border-border-subtle rounded-2xl p-8 shadow-2xl animate-[heroReveal_0.4s_ease_both]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent mb-4">
            <Settings size={28} />
          </div>
          <h1 className="text-2xl font-display text-txt-primary mb-2 text-center">Configurer votre IA</h1>
          <p className="text-txt-secondary text-sm text-center">Connectez n'importe quelle API compatible OpenAI</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-txt-secondary uppercase tracking-wider mb-1.5 ml-1">Nom du profil</label>
            <input 
              type="text"
              placeholder="Ex: Mon IA locale"
              value={config.name}
              onChange={(e) => setConfig({...config, name: e.target.value})}
              className="w-full bg-input-bg border border-border-input rounded-lg px-4 py-2.5 text-sm text-txt-primary focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-txt-secondary uppercase tracking-wider mb-1.5 ml-1">Base URL</label>
            <input 
              type="text"
              placeholder="Ex: https://api.openai.com/v1"
              value={config.baseUrl}
              onChange={(e) => setConfig({...config, baseUrl: e.target.value})}
              className="w-full bg-input-bg border border-border-input rounded-lg px-4 py-2.5 text-sm text-txt-primary focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-txt-secondary uppercase tracking-wider mb-1.5 ml-1">Clé API</label>
            <input 
              type="password"
              placeholder="sk-..."
              value={config.apiKey}
              onChange={(e) => setConfig({...config, apiKey: e.target.value})}
              className="w-full bg-input-bg border border-border-input rounded-lg px-4 py-2.5 text-sm text-txt-primary focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-txt-secondary uppercase tracking-wider mb-1.5 ml-1">Modèle</label>
            <input 
              type="text"
              placeholder="Ex: gpt-4o, claude-3-5-sonnet"
              value={config.model}
              onChange={(e) => setConfig({...config, model: e.target.value})}
              className="w-full bg-input-bg border border-border-input rounded-lg px-4 py-2.5 text-sm text-txt-primary focus:border-accent transition-colors"
            />
          </div>

          <div className="pt-2">
            <button 
              onClick={handleTest}
              disabled={status === 'testing' || !config.apiKey}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border-input text-sm font-medium text-txt-primary hover:bg-item-hover transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'testing' ? <Loader2 size={18} className="animate-spin" /> : null}
              {status === 'success' ? <CheckCircle2 size={18} className="text-green-500" /> : null}
              {status === 'error' ? <XCircle size={18} className="text-accent" /> : null}
              <span>{status === 'success' ? 'Connecté' : status === 'error' ? 'Échec' : 'Tester la connexion'}</span>
            </button>
            {status === 'error' && <p className="text-[11px] text-accent mt-1 text-center">{errorMessage}</p>}
          </div>

          <button 
            onClick={handleSave}
            disabled={status !== 'success'}
            className="w-full py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-txt-muted shadow-lg shadow-accent/20"
          >
            Enregistrer et continuer
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
