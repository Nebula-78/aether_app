const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Contrôles fenêtre
  minimize:      () => ipcRenderer.send('window:minimize'),
  maximize:      () => ipcRenderer.send('window:maximize'),
  close:         () => ipcRenderer.send('window:close'),
  isMaximized:   () => ipcRenderer.invoke('window:isMaximized'),

  // Config API (F1)
  saveConfig:    (profile) => ipcRenderer.invoke('config:save', profile),
  loadConfig:    () => ipcRenderer.invoke('config:load'),
  testConfig:    (config) => ipcRenderer.invoke('config:test', config),
  listProfiles:  () => ipcRenderer.invoke('config:list'),
  deleteProfile: (id) => ipcRenderer.invoke('config:delete', id),
  switchProfile: (id) => ipcRenderer.invoke('config:switch', id),

  // Chat & Stream (F2)
  sendMessage:   (data) => ipcRenderer.send('agent:send', data),
  abortStream:   () => ipcRenderer.send('agent:abort'),
  onStreamChunk: (cb) => {
    const wrapped = (_event, ...args) => cb(...args);
    ipcRenderer.on('agent:stream-chunk', wrapped);
    return wrapped; // Return it so it can be cleaned up
  },
  offStreamChunk: (wrapped) => ipcRenderer.removeListener('agent:stream-chunk', wrapped),
  
  onStreamEnd:   (cb) => {
    const wrapped = (_event, ...args) => cb(...args);
    ipcRenderer.on('agent:stream-end', wrapped);
    return wrapped;
  },
  offStreamEnd:  (wrapped) => ipcRenderer.removeListener('agent:stream-end', wrapped),
  
  onStreamError: (cb) => {
    const wrapped = (_event, ...args) => cb(...args);
    ipcRenderer.on('agent:stream-error', wrapped);
    return wrapped;
  },
  offStreamError: (wrapped) => ipcRenderer.removeListener('agent:stream-error', wrapped),

  // Agent Tools (F3)
  onToolConfirm: (cb) => {
    const wrapped = (_event, ...args) => cb(...args);
    ipcRenderer.on('tool:confirm', wrapped);
    return wrapped;
  },
  offToolConfirm: (wrapped) => ipcRenderer.removeListener('tool:confirm', wrapped),
  confirmTool: (id, confirmed) => ipcRenderer.send('tool:confirmed', { id, confirmed }),

  onToolCalls: (cb) => {
    const wrapped = (_event, ...args) => cb(...args);
    ipcRenderer.on('agent:tool-calls', wrapped);
    return wrapped;
  },
  offToolCalls: (wrapped) => ipcRenderer.removeListener('agent:tool-calls', wrapped),

  onToolStatus: (cb) => {
    const wrapped = (_event, ...args) => cb(...args);
    ipcRenderer.on('agent:tool-status', wrapped);
    return wrapped;
  },
  offToolStatus: (wrapped) => ipcRenderer.removeListener('agent:tool-status', wrapped),

  onToolResult: (cb) => {
    const wrapped = (_event, ...args) => cb(...args);
    ipcRenderer.on('agent:tool-result', wrapped);
    return wrapped;
  },
  offToolResult: (wrapped) => ipcRenderer.removeListener('agent:tool-result', wrapped),
  
  // Conversations (F4)
  saveConversation: (conv) => ipcRenderer.send('conversation:save', conv),
  listConversations: () => ipcRenderer.invoke('conversation:list'),
  deleteConversation: (id) => ipcRenderer.send('conversation:delete', id),
  deleteConversationConfirm: (title) => ipcRenderer.invoke('conversation:delete-confirm', title),
  generateTitle: (messages) => ipcRenderer.invoke('conversation:generate-title', messages),
  searchFullText: (query) => ipcRenderer.invoke('conversation:search-full-text', query),
  exportConversation: (data) => ipcRenderer.invoke('conversation:export', data),

  // Écouter les raccourcis depuis main
  onShortcut: (channel, callback) => {
    const validChannels = ['shortcut:new-conversation', 'shortcut:search']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },

  // Infos plateforme
  platform: process.platform
})
