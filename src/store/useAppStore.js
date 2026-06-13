import { create } from 'zustand';

export const useAppStore = create((set) => ({
  config: null,
  loading: true,
  conversations: [],
  activeConvId: null,
  messages: [],
  systemPrompt: '',
  confirmData: null,
  showSidebar: true,
  activeArtifact: null,
  activePersona: 'default',
  showSettings: false,
  focusMode: false,
  page: 0,

  setConfig: (config) => set({ config }),
  setLoading: (loading) => set({ loading }),
  setConversations: (conversations) => set({ conversations }),
  setActiveConvId: (activeConvId) => set({ activeConvId }),
  setMessages: (messages) => set({ messages }),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  setConfirmData: (confirmData) => set({ confirmData }),
  setShowSidebar: (showSidebar) => set({ showSidebar }),
  setActiveArtifact: (activeArtifact) => set({ activeArtifact }),
  setActivePersona: (activePersona) => set({ activePersona }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setFocusMode: (focusMode) => set({ focusMode }),
  
  loadConversations: async (page = 0) => {
    const list = await window.electronAPI.listConversations({ limit: 20, offset: page * 20 });
    set((state) => ({ 
      conversations: page === 0 ? list : [...state.conversations, ...list],
      page: page
    }));
  },
  refreshConversations: async () => {
    const list = await window.electronAPI.listConversations({ limit: 20, offset: 0 });
    set({ conversations: list, page: 0 });
  },
}));
