import React, { useState, useEffect, useCallback } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import MainArea from './components/MainArea';
import ArtifactsPanel from './components/ArtifactsPanel';
import OnboardingScreen from './components/OnboardingScreen';
import ConfirmModal from './components/ConfirmModal';
import SettingsModal from './components/SettingsModal';

function App() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [confirmData, setConfirmData] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [activePersona, setActivePersona] = useState('default');
  const [showSettings, setShowSettings] = useState(false);

  // Écouter les demandes de confirmation de tools
  useEffect(() => {
    const handleConfirmRequest = (data) => {
      setConfirmData(data);
    };
    
    window.electronAPI?.onToolConfirm(handleConfirmRequest);
    window.electronAPI?.onShortcut('shortcut:new-conversation', startNewConversation);

    return () => {
      window.electronAPI?.offToolConfirm(handleConfirmRequest);
    };
  }, []);

  const handleConfirmResponse = (id, confirmed) => {
    window.electronAPI?.confirmTool(id, confirmed);
    setConfirmData(null);
  };

  // Charger la config au démarrage
  useEffect(() => {
    window.electronAPI.loadConfig().then(loadedConfig => {
      setConfig(loadedConfig);
      setLoading(false);
    });
  }, []);

  // Charger les conversations
  const refreshConversations = useCallback(async () => {
    const list = await window.electronAPI.listConversations();
    setConversations(list);
  }, []);

  useEffect(() => {
    if (config) {
      refreshConversations();
    }
  }, [config, refreshConversations]);

  // Nouvelle conversation
  const startNewConversation = useCallback(() => {
    setActiveConvId(Date.now());
    setMessages([]);
    setSystemPrompt('');
  }, []);

  // Sélectionner une conversation
  const selectConversation = useCallback((conv) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages || []);
    setSystemPrompt(conv.systemPrompt || '');
  }, []);

  // Supprimer une conversation
  const deleteConversation = useCallback(async (id, title) => {
    const confirmed = await window.electronAPI.deleteConversationConfirm(title);
    if (!confirmed) return;

    await window.electronAPI.deleteConversation(id);
    if (activeConvId === id) {
      startNewConversation();
    }
    refreshConversations();
  }, [activeConvId, startNewConversation, refreshConversations]);

  // Renommer une conversation
  const renameConversation = useCallback(async (id, newTitle) => {
    const list = await window.electronAPI.listConversations();
    const conv = list.find(c => c.id === id);
    if (conv) {
      const updatedConv = { ...conv, title: newTitle, updatedAt: new Date().toISOString() };
      await window.electronAPI.saveConversation(updatedConv);
      refreshConversations();
    }
  }, [refreshConversations]);

  const handlePersonaChange = useCallback((personaId) => {
    setActivePersona(personaId);
    
    const personaPrompts = {
      default: "Tu es ARIA (AI Research & Interaction Agent), un assistant IA utile, honnête et inoffensif. Tu as accès à des outils pour interagir avec le système de fichiers (lecture, écriture, création de dossiers) et exécuter des commandes. N'hésite pas à utiliser ces outils lorsque l'utilisateur te demande d'effectuer des tâches sur son ordinateur.",
      coder: "Tu es un ingénieur logiciel expert. Tu as accès à des outils système. Utilise-les pour manipuler des fichiers, créer des structures de dossiers et exécuter du code si nécessaire.",
      writer: "Tu es un écrivain professionnel. Tu as accès aux fichiers système pour lire ou écrire tes brouillons.",
      analyst: "Tu es un analyste de données. Tu as accès aux outils système pour lire des fichiers et exécuter des scripts d'analyse."
    };

    const newPrompt = personaPrompts[personaId] || personaPrompts.default;
    setSystemPrompt(newPrompt);
    
    if (activeConvId) {
      window.electronAPI.listConversations().then(list => {
        const conv = list.find(c => c.id === activeConvId);
        if (conv) {
          window.electronAPI.saveConversation({ ...conv, systemPrompt: newPrompt });
        }
      });
    }
  }, [activeConvId]);

  if (loading) {
    return <div className="h-screen bg-main-bg flex items-center justify-center text-txt-secondary">Chargement...</div>;
  }

  if (!config) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-main-bg">
        <TitleBar />
        <OnboardingScreen onConfigSaved={setConfig} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-main-bg text-txt-primary">
      <TitleBar />
      
      <div className="flex flex-1 overflow-hidden relative">
        <div 
          className={`h-full transition-all duration-300 ease-in-out overflow-hidden ${showSidebar ? 'w-[280px]' : 'w-0'}`}
        >
          <div className="w-[280px] h-full">
            <Sidebar 
              conversations={conversations} 
              activeId={activeConvId}
              onSelect={selectConversation}
              onNew={startNewConversation}
              onDelete={deleteConversation}
              onRename={renameConversation}
              userProfile={config}
              onToggle={() => setShowSidebar(false)}
              activePersona={activePersona}
              onPersonaChange={handlePersonaChange}
              onOpenSettings={() => setShowSettings(true)}
            />
          </div>
        </div>
        
        <MainArea 
          activeConvId={activeConvId}
          setActiveConvId={setActiveConvId}
          messages={messages}
          setMessages={setMessages}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          onConversationUpdated={refreshConversations}
          startNewConversation={startNewConversation}
          showSidebar={showSidebar}
          onToggleSidebar={() => setShowSidebar(true)}
          setActiveArtifact={setActiveArtifact}
          activePersona={activePersona}
        />

        {/* Panneau Artifacts (3ème colonne) */}
        <div 
          className={`h-full transition-all duration-300 ease-in-out border-l border-border-subtle overflow-hidden ${activeArtifact ? 'w-[500px]' : 'w-0'}`}
        >
          <div className="w-[500px] h-full">
            <ArtifactsPanel 
              artifact={activeArtifact} 
              onClose={() => setActiveArtifact(null)} 
            />
          </div>
        </div>
      </div>

      {confirmData && (
        <ConfirmModal 
          data={confirmData} 
          onConfirm={(confirmed) => handleConfirmResponse(confirmData.id, confirmed)} 
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
