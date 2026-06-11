const { ipcMain, safeStorage } = require('electron');

function setupConfigHandlers(store) {
  ipcMain.handle('config:save', async (e, profile) => {
    try {
      const encrypted = safeStorage.encryptString(profile.apiKey);
      const dataToSave = {
        ...profile,
        apiKey: encrypted.toString('base64')
      };
      
      if (profile.tavilyApiKey) {
        dataToSave.tavilyApiKey = safeStorage.encryptString(profile.tavilyApiKey).toString('base64');
      }
      
      store.set(`profiles.${profile.id}`, dataToSave);
      store.set('activeProfileId', profile.id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('config:load', async () => {
    const id = store.get('activeProfileId');
    if (!id) return null;
    const profile = store.get(`profiles.${id}`);
    if (!profile) return null;
    try {
      const decrypted = safeStorage.decryptString(
        Buffer.from(profile.apiKey, 'base64')
      );
      const result = { ...profile, apiKey: decrypted.toString() };
      
      if (profile.tavilyApiKey) {
        result.tavilyApiKey = safeStorage.decryptString(
          Buffer.from(profile.tavilyApiKey, 'base64')
        ).toString();
      }
      
      return result;
    } catch (err) {
      return null;
    }
  });

  ipcMain.handle('config:test', async (e, { baseUrl, apiKey, model }) => {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        })
      });
      if (res.ok || res.status === 400) return { success: true };
      return { success: false, error: `HTTP ${res.status}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('config:list', async () => {
    return store.get('profiles') || {};
  });

  ipcMain.handle('config:delete', async (e, id) => {
    store.delete(`profiles.${id}`);
    if (store.get('activeProfileId') === id) {
       store.delete('activeProfileId');
    }
    return { success: true };
  });

  ipcMain.handle('config:switch', async (e, id) => {
    store.set('activeProfileId', id);
    return { success: true };
  });
}

module.exports = { setupConfigHandlers };
