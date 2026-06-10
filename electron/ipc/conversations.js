const { ipcMain, BrowserWindow, dialog } = require('electron');
const fs = require('fs').promises;

function setupConversationHandlers(store) {
  ipcMain.on('conversation:save', (e, conv) => {
    // T2 : Limiter la taille des messages "tool" persistés
    const truncatedMessages = conv.messages.map(msg => {
      if (msg.role === 'tool' && msg.content && msg.content.length > 500) {
        return { ...msg, content: msg.content.substring(0, 500) + '... (tronqué)' };
      }
      return msg;
    });
    store.set(`conversations.${conv.id}`, { ...conv, messages: truncatedMessages });
  });

  ipcMain.handle('conversation:list', () => {
    const convs = store.get('conversations', {});
    return Object.values(convs).sort((a, b) => b.id - a.id);
  });
ipcMain.on('conversation:delete', (e, id) => {
  store.delete(`conversations.${id}`);
});

ipcMain.handle('conversation:delete-confirm', async (e, title) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['Supprimer', 'Annuler'],
    defaultId: 1,
    title: 'Confirmation',
    message: `Supprimer "${title}" ?`,
    detail: 'Cette action est irréversible.'
  });
  return response === 0;
});

ipcMain.handle('conversation:export', async (e, { title, messages }) => {
//...

    const win = BrowserWindow.fromWebContents(e.sender);
    const { filePath } = await dialog.showSaveDialog(win, {
      title: 'Exporter la conversation',
      defaultPath: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });

    if (filePath) {
      let content = `# ${title}\n\n`;
      messages.forEach(msg => {
        const role = msg.role === 'user' ? '**Utilisateur**' : '**Aether**';
        if (msg.content) {
          content += `### ${role}\n${msg.content}\n\n`;
        }
      });

      await fs.writeFile(filePath, content, 'utf8');
      return { success: true, path: filePath };
    }
    return { success: false };
  });

  ipcMain.handle('conversation:generate-title', async (e, messages) => {
    const id = store.get('activeProfileId');
    const profileEnc = store.get(`profiles.${id}`);
    if (!profileEnc) return null;
    const { safeStorage } = require('electron');
    const apiKey = safeStorage.decryptString(Buffer.from(profileEnc.apiKey, 'base64')).toString();

    try {
      const res = await fetch(`${profileEnc.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: profileEnc.model,
          messages: [
            ...messages,
            { role: 'user', content: 'Génère un titre très court (max 5 mots) pour cette conversation. Réponds uniquement avec le titre.' }
          ],
          max_tokens: 15
        })
      });
      const json = await res.json();
      return json.choices?.[0]?.message?.content?.replace(/["']/g, '') || null;
    } catch {
      return null;
    }
  });

  ipcMain.handle('conversation:search-full-text', async (e, query) => {
    const convs = store.get('conversations', {});
    const results = Object.values(convs).filter(conv => {
      const inTitle = conv.title?.toLowerCase().includes(query.toLowerCase());
      const inMessages = conv.messages?.some(m => m.content?.toLowerCase().includes(query.toLowerCase()));
      return inTitle || inMessages;
    });
    return results.sort((a, b) => b.id - a.id);
  });
}

module.exports = { setupConversationHandlers };
