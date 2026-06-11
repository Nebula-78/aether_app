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
    backgroundColor: '#0d1117', // Correspond à --color-main-bg pour éviter les flashs noirs
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

// Setup modular IPC handlers
setupWindowHandlers(store)
setupConfigHandlers(store)
setupConversationHandlers(store)

// --- IPC — Chat & Streaming ---
const activeReaders = new Map()

// Confirmation Promise registry
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

ipcMain.on('agent:send', async (event, { messages, persona = 'default', options = {} }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  
  const id = store.get('activeProfileId')
  const profileEnc = store.get(`profiles.${id}`)
  if (!profileEnc) {
    win.webContents.send('agent:stream-error', "Aucun profil configuré")
    return
  }
  
  const apiKey = safeStorage.decryptString(Buffer.from(profileEnc.apiKey, 'base64')).toString()

  let optimizedMessages = messages.length > 15 ? messages.slice(-15) : messages;

  const systemPrompt = PERSONAS[persona] || PERSONAS.default;
  
  // Construction du STYLE_GUIDE dynamique
  let dynamicStyle = STYLE_GUIDE;

  // Gestion impérative de la recherche (Phase 5)
  if (options.useSearch) {
    dynamicStyle += "\n\n[INSTRUCTION CRITIQUE : RECHERCHE WEB ACTIVÉE]";
    dynamicStyle += "\nTu DOIS impérativement utiliser l'outil 'tavily_search' avant de répondre pour obtenir des données à jour.";
    dynamicStyle += "\nCite tes sources avec les markers [^n].";
  } else {
    dynamicStyle += "\n\n[INSTRUCTION : RECHERCHE WEB DÉSACTIVÉE]";
    dynamicStyle += "\nN'utilise AUCUN outil de recherche pour ce message.";
  }

  // Injection de la mémoire contextuelle (Phase 4)
  if (profileEnc.memories && profileEnc.memories.length > 0) {
    const memoryBlock = profileEnc.memories
      .map(m => `- [${m.topic}] : ${m.summary}`)
      .join('\n');
    dynamicStyle += `\n\n[MÉMOIRE CONTEXTUELLE (Souvenirs des conversations passées) :]\n${memoryBlock}\n[Utilise ces informations si elles sont pertinentes pour la discussion actuelle.]`;
  }

  if (options.formatMode === 'prose') {
    dynamicStyle += "\n- MODE PROSE ACTIVÉ : Interdiction absolue des tableaux. Narration fluide uniquement.";
  } else if (options.formatMode === 'structured') {
    dynamicStyle += "\n- MODE STRUCTURÉ ACTIVÉ : Utilise des titres, des listes et des tableaux pour organiser l'information de manière dense.";
  }

  // Ajout des consignes de citations si la recherche est possible
  if (options.useSearch) {
    dynamicStyle += "\n- CITATIONS : Utilise des markers [^n] pour citer tes sources à partir des résultats d'outils (ex: [^1], [^2]).";
  }

  const finalMessages = [];
  const existingSystemMsgIndex = optimizedMessages.findIndex(m => m.role === 'system');
  
  if (existingSystemMsgIndex !== -1) {
    const updatedSystemContent = optimizedMessages[existingSystemMsgIndex].content + dynamicStyle;
    finalMessages.push({ role: 'system', content: updatedSystemContent });
    finalMessages.push(...optimizedMessages.filter((_, i) => i !== existingSystemMsgIndex));
  } else {
    finalMessages.push({ role: 'system', content: systemPrompt + dynamicStyle });
    finalMessages.push(...optimizedMessages);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    // Filtrer les outils si la recherche n'est pas demandée (sauf pour les outils système de base)
    const availableTools = options.useSearch 
      ? tools 
      : tools.filter(t => !['tavily_search', 'google_search'].includes(t.function.name));

    const res = await fetch(`${profileEnc.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: profileEnc.model,
        messages: finalMessages,
        tools: availableTools.length > 0 ? availableTools : undefined,
        stream: true
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error: ${res.status} - ${errText}`);
    }

    let textResponse = ''
    let toolCalls = []
    const reader = res.body.getReader()
    activeReaders.set(win.id, reader)
    const decoder = new TextDecoder()

    try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
    
          const chunkStr = decoder.decode(value)
          const lines = chunkStr.split('\n')
          
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            
            try {
              const json = JSON.parse(data)
              const choice = json.choices?.[0]
              if (!choice) continue
    
              const content = choice.delta?.content
              if (content) {
                textResponse += content
                win.webContents.send('agent:stream-chunk', content)
              }
    
              const deltaToolCalls = choice.delta?.tool_calls
              if (deltaToolCalls) {
                for (const tc of deltaToolCalls) {
                  const idx = tc.index
                  if (!toolCalls[idx]) {
                    toolCalls[idx] = { id: tc.id, type: tc.type, function: { name: '', arguments: '' } }
                  }
                  if (tc.id) toolCalls[idx].id = tc.id
                  if (tc.type) toolCalls[idx].type = tc.type
                  if (tc.function) {
                    if (tc.function.name) toolCalls[idx].function.name += tc.function.name
                    if (tc.function.arguments) toolCalls[idx].function.arguments += tc.function.arguments
                  }
                }
              }
            } catch {}
          }
        }
    } finally {
        activeReaders.delete(win.id)
    }

    toolCalls = toolCalls.filter(Boolean)

    if (toolCalls.length > 0) {
      win.webContents.send('agent:tool-calls', toolCalls)

      const toolResults = []
      for (const tc of toolCalls) {
        let parsedArgs = {}
        try {
          parsedArgs = JSON.parse(tc.function.arguments)
        } catch {}

        win.webContents.send('agent:tool-status', { id: tc.id, status: 'running' })
        console.log(`[Main] Exécution de l'outil: ${tc.function.name} avec args:`, tc.function.arguments);
        const result = await executeTool(tc.function.name, parsedArgs, win, askToolConfirmation)
        console.log(`[Main] Résultat de l'outil ${tc.function.name}:`, result.error ? 'ERROR' : 'SUCCESS');
        win.webContents.send('agent:tool-result', { id: tc.id, name: tc.function.name, result })

        toolResults.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(result)
        })
      }

      const updatedMessages = [
        ...optimizedMessages,
        {
          role: 'assistant',
          content: textResponse || null,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments
            }
          }))
        },
        ...toolResults
      ]

      const secondRes = await fetch(`${profileEnc.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: profileEnc.model,
          messages: updatedMessages,
          stream: true
        })
      })

      if (!secondRes.ok) {
        const errText = await secondRes.text();
        throw new Error(`API Error context: ${secondRes.status} - ${errText}`);
      }

      const secondReader = secondRes.body.getReader()
      activeReaders.set(win.id, secondReader)
      let finalResponse = ''

      try {
        while (true) {
          const { done, value } = await secondReader.read()
          if (done) break

          const chunkStr = decoder.decode(value)
          const lines = chunkStr.split('\n')
          
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            
            try {
              const json = JSON.parse(data)
              const content = json.choices?.[0]?.delta?.content
              if (content) {
                finalResponse += content
                win.webContents.send('agent:stream-chunk', content)
              }
            } catch {}
          }
        }
      } finally {
        activeReaders.delete(win.id)
      }

      win.webContents.send('agent:stream-end', (textResponse ? textResponse + '\n\n' : '') + finalResponse, {
        toolCalls,
        toolResults
      })
    } else {
      win.webContents.send('agent:stream-end', textResponse)
    }
  } catch (err) {
    win.webContents.send('agent:stream-error', err.message)
  }
})

ipcMain.on('agent:abort', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const reader = activeReaders.get(win.id)
  if (reader) {
    reader.cancel()
    activeReaders.delete(win.id)
  }
  win.webContents.send('agent:stream-end', '')
})

// --- App Lifecycle ---
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
