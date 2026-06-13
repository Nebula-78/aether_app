import React, { useEffect, useCallback } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import MainArea from './components/MainArea';
import ArtifactsPanel from './components/ArtifactsPanel';
import OnboardingScreen from './components/OnboardingScreen';
import ConfirmModal from './components/ConfirmModal';
import SettingsModal from './components/SettingsModal';
import { useAppStore } from './store/useAppStore';

function App() {
  const { 
    config, setConfig, 
    loading, setLoading, 
    conversations, 
    activeConvId, setActiveConvId, 
    messages, setMessages, 
    systemPrompt, setSystemPrompt, 
    confirmData, setConfirmData, 
    showSidebar, setShowSidebar, 
    activeArtifact, setActiveArtifact, 
    activePersona, setActivePersona, 
    showSettings, setShowSettings, 
    focusMode, setFocusMode,
    loadConversations, refreshConversations
  } = useAppStore();

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

  useEffect(() => {
    if (config) {
      loadConversations(0);
    }
  }, [config, loadConversations]);

  // Nouvelle conversation
  const startNewConversation = useCallback(() => {
    setActiveConvId(null);
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
      default: "Tu es ARIA (AI Research & Interaction Agent). Adopte un style pédagogique, éditorial et équilibré, similaire à celui de Claude AI. Structure tes réponses de manière fluide : commence par une introduction contextuelle, utilise des titres clairs, des listes à puces pour les points clés, et réserve les tableaux uniquement pour des données purement statistiques ou des comparaisons directes. Évite le 'trop-plein' visuel et privilégie la clarté narrative.",
      coder: "Tu es un ingénieur logiciel expert. Comme un mentor technique, explique le 'pourquoi' avant le 'comment'. Utilise des blocs de code clairs, des listes d'étapes logiques et évite les tableaux sauf pour des comparatifs de complexité ou de compatibilité.",
      writer: "Tu es un écrivain professionnel spécialisé dans la clarté et l'élégance. Ta narration doit être fluide et immersive. Évite toute structure rigide comme les tableaux ou les listes trop mécaniques, sauf si le format l'exige (ex: script).",
      analyst: "Tu es un analyste de données capable de synthétiser des informations complexes. Ne te contente pas de lister des chiffres : interprète-les. Utilise des tableaux pour la précision brute, mais accompagne-les toujours d'une analyse textuelle approfondie et de listes d'insights."
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
    <div className={`flex flex-col h-screen overflow-hidden bg-main-bg text-txt-primary transition-all duration-500`}>
      <TitleBar focusMode={focusMode} />
      
      <div className="flex flex-1 overflow-hidden relative">
        {!focusMode && showSidebar && (
          <div className="w-[280px] h-full shrink-0 border-r border-border-subtle animate-[fadeSlideIn_0.3s_ease_both]">
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
        )}
        <MainArea 
          onConversationUpdated={refreshConversations}
          onNewConversation={startNewConversation}
          onSelectConversation={selectConversation}
          onToggleSidebar={() => setShowSidebar(true)}
          onPersonaChange={handlePersonaChange}
          userProfile={config}
        />

        {/* Panneau Artifacts (3ème colonne) */}
        <div 
          className={`h-full transition-all duration-300 ease-in-out border-l border-border-subtle overflow-hidden ${activeArtifact ? 'w-[500px]' : 'w-0'}`}
        >
          <div className="w-[500px] h-full">
            <ArtifactsPanel />

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
