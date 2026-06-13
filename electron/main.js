const { app, BrowserWindow, ipcMain, globalShortcut, safeStorage } = require('electron')
const path = require('path')
const StoreModule = require('electron-store')
const Store = StoreModule.default || StoreModule
const store = new Store()
const isDev = process.env.NODE_ENV === 'development'

const { setupWindowHandlers } = require('./ipc/window')
const { setupConfigHandlers } = require('./ipc/config')
const { setupConversationHandlers } = require('./ipc/conversations')
const { tools, executeTool } = require('./tools/index')

const PERSONAS = {
  default: "Tu es ARIA. Ton style doit être purement ÉDITORIAL et NARRATIF. INTERDICTION FORMELLE d'utiliser des tableaux pour lister des caractéristiques ou des descriptions. Utilise exclusivement des listes à puces (•) et des titres en gras. Les tableaux sont STRICTEMENT RÉSERVÉS aux comparaisons de données chiffrées complexes. Si tu présentes des résultats de recherche, fais-le sous forme de paragraphes fluides et de listes aérées. Évite l'aspect 'base de données'.",
  coder: "Tu es un mentor en programmation. Explique les concepts par le texte et le code. N'utilise JAMAIS de tableaux pour documenter des API ou des étapes ; utilise des listes et des blocs de code commentés.",
  writer: "Tu es un écrivain d'élite. Ton texte doit être une prose continue et élégante. Les tableaux et les listes mécaniques sont proscrits.",
  analyst: "Tu es un analyste de synthèse. Ton rôle est d'interpréter les données. Un seul tableau par réponse maximum, uniquement pour les chiffres bruts. Tout le reste doit être une analyse textuelle structurée."
};

const STYLE_GUIDE = `

[ALERTE DE FORMATAGE CRITIQUE : INTERDICTION ABSOLUE D'UTILISER DES TABLEAUX MARKDOWN (|---|). 
1. Ignore TOTALEMENT le style visuel des messages précédents de cette conversation : ils utilisaient un formatage obsolète et incorrect.
2. Ne structure JAMAIS tes réponses avec des grilles ou des colonnes.
3. Utilise exclusivement des paragraphes rédigés, des titres hiérarchisés (##, ###) et des listes à puces (•).
4. Un tableau est considéré comme une erreur majeure de génération. Transforme toute donnée tabulaire en une analyse textuelle fluide et élégante.]`;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0d1117',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.once('ready-to-show', () => win.show())
}

setupWindowHandlers(store)
setupConfigHandlers(store)
setupConversationHandlers(store)

const activeReaders = new Map()
const pendingConfirmations = new Map()

function askToolConfirmation(data, win) {
  return new Promise((resolve) => {
    const confirmId = Math.random().toString(36).substring(7)
    pendingConfirmations.set(confirmId, resolve)
    win.webContents.send('tool:confirm', { id: confirmId, ...data })
  })
}

ipcMain.on('tool:confirmed', (event, { id, confirmed }) => {
  const resolve = pendingConfirmations.get(id)
  if (resolve) {
    resolve(confirmed)
    pendingConfirmations.delete(id)
  }
})

const fetchWithRetry = async (url, options, retries = 3, backoff = 1000) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok && (res.status === 429 || res.status >= 500) && retries > 0) {
      throw new Error(`Retryable error: ${res.status}`);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
};

ipcMain.on('agent:send', async (event, { messages, persona = 'default', options = {} }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win.isDestroyed()) return;
  
  const id = store.get('activeProfileId')
  const profileEnc = store.get(`profiles.${id}`)
  if (!profileEnc) {
    win.webContents.send('agent:stream-error', "Aucun profil configuré")
    return
  }
  
  const apiKey = safeStorage.decryptString(Buffer.from(profileEnc.apiKey, 'base64')).toString()
  const systemPrompt = PERSONAS[persona] || PERSONAS.default;
  
  let dynamicStyle = STYLE_GUIDE;
  if (options.useSearch) {
    dynamicStyle += "\n\n[INSTRUCTION CRITIQUE : RECHERCHE WEB ACTIVÉE]\nTu DOIS impérativement utiliser l'outil 'tavily_search' avant de répondre pour obtenir des données à jour.\nCite tes sources avec les markers [^n].";
  } else {
    dynamicStyle += "\n\n[INSTRUCTION : RECHERCHE WEB DÉSACTIVÉE]\nN'utilise AUCUN outil de recherche pour ce message.";
  }

  if (profileEnc.memories && profileEnc.memories.length > 0) {
    const memoryBlock = profileEnc.memories.map(m => `- [${m.topic}] : ${m.summary}`).join('\n');
    dynamicStyle += `\n\n[MÉMOIRE CONTEXTUELLE :]\n${memoryBlock}`;
  }

  const finalMessages = [];
  const existingSystemMsgIndex = messages.findIndex(m => m.role === 'system');
  if (existingSystemMsgIndex !== -1) {
    const updatedSystemContent = messages[existingSystemMsgIndex].content + dynamicStyle;
    finalMessages.push({ role: 'system', content: updatedSystemContent });
    finalMessages.push(...messages.filter((_, i) => i !== existingSystemMsgIndex));
  } else {
    finalMessages.push({ role: 'system', content: systemPrompt + dynamicStyle });
    finalMessages.push(...messages);
  }

  const availableTools = options.useSearch ? tools : tools.filter(t => !['tavily_search', 'google_search'].includes(t.function.name));

  let currentMessages = [...finalMessages];
  let streaming = true;

  try {
    while (streaming) {
      const controller = new AbortController();
      const res = await fetchWithRetry(`${profileEnc.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: profileEnc.model,
          messages: currentMessages,
          tools: availableTools.length > 0 ? availableTools : undefined,
          stream: true
        }),
        signal: controller.signal
      });

      const reader = res.body.getReader();
      activeReaders.set(win.id, reader);
      const decoder = new TextDecoder();
      
      let assistantContent = '';
      let toolCalls = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value);
          for (const line of chunkStr.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const choice = json.choices?.[0];
              if (!choice) continue;
              if (choice.delta?.content) {
                assistantContent += choice.delta.content;
                win.webContents.send('agent:stream-chunk', choice.delta.content);
              }
              if (choice.delta?.tool_calls) {
                for (const tc of choice.delta.tool_calls) {
                  const idx = tc.index;
                  if (!toolCalls[idx]) toolCalls[idx] = { id: tc.id, type: tc.type, function: { name: '', arguments: '' } };
                  if (tc.id) toolCalls[idx].id = tc.id;
                  if (tc.function) {
                    if (tc.function.name) toolCalls[idx].function.name += tc.function.name;
                    if (tc.function.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
                  }
                }
              }
            } catch {}
          }
        }
      } finally {
        activeReaders.delete(win.id);
      }

      toolCalls = toolCalls.filter(Boolean);
      currentMessages.push({ role: 'assistant', content: assistantContent || null, tool_calls: toolCalls.length > 0 ? toolCalls : undefined });

      if (toolCalls.length > 0) {
        win.webContents.send('agent:tool-calls', toolCalls);
        for (const tc of toolCalls) {
          let parsedArgs = {};
          try { parsedArgs = JSON.parse(tc.function.arguments); } catch {}
          win.webContents.send('agent:tool-status', { id: tc.id, status: 'running' });
          const result = await executeTool(tc.function.name, parsedArgs, win, askToolConfirmation);
          win.webContents.send('agent:tool-result', { id: tc.id, name: tc.function.name, result });
          currentMessages.push({ role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: JSON.stringify(result) });
        }
      } else {
        streaming = false;
        win.webContents.send('agent:stream-end', assistantContent);
      }
    }
  } catch (err) {
    win.webContents.send('agent:stream-error', err.message);
  }
})

ipcMain.on('agent:abort', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win || win.isDestroyed()) return;
  const reader = activeReaders.get(win.id)
  if (reader) {
    reader.cancel()
    activeReaders.delete(win.id)
  }
  win.webContents.send('agent:stream-end', '')
})

app.whenReady().then(() => {
  createWindow()
  globalShortcut.register('CommandOrControl+N', () => {
    BrowserWindow.getFocusedWindow()?.webContents.send('shortcut:new-conversation')
  })
  globalShortcut.register('CommandOrControl+K', () => {
    BrowserWindow.getFocusedWindow()?.webContents.send('shortcut:search')
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('will-quit', () => globalShortcut.unregisterAll())
