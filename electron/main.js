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
  default: "Tu es ARIA (AI Research & Interaction Agent), un assistant IA utile, honnête et inoffensif. Tu as accès à des outils pour interagir avec le système de fichiers (lecture, écriture, création de dossiers) et exécuter des commandes. N'hésite pas à utiliser ces outils lorsque l'utilisateur te demande d'effectuer des tâches sur son ordinateur.",
  coder: "Tu es un ingénieur logiciel expert. Tu as accès à des outils système. Utilise-les pour manipuler des fichiers, créer des structures de dossiers et exécuter du code si nécessaire.",
  writer: "Tu es un écrivain professionnel. Tu as accès aux fichiers système pour lire ou écrire tes brouillons.",
  analyst: "Tu es un analyste de données. Tu as accès aux outils système pour lire des fichiers et exécuter des scripts d'analyse."
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#00000000',
    transparent: true,
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

ipcMain.on('agent:send', async (event, { messages, persona = 'default' }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  
  const id = store.get('activeProfileId')
  const profileEnc = store.get(`profiles.${id}`)
  if (!profileEnc) {
    win.webContents.send('agent:stream-error', "Aucun profil configuré")
    return
  }
  
  const apiKey = safeStorage.decryptString(Buffer.from(profileEnc.apiKey, 'base64')).toString()

  let optimizedMessages = messages.length > 15 ? messages.slice(-15) : messages;

  // Si le message est un tableau (avec images), on ne peut pas le transformer en texte simple
  // On conserve le format structuré pour l'API.
  const systemPrompt = PERSONAS[persona] || PERSONAS.default;
  
  // On reconstruit les messages pour s'assurer que le prompt système est là
  const finalMessages = [];
  if (!optimizedMessages.some(m => m.role === 'system')) {
    finalMessages.push({ role: 'system', content: systemPrompt });
  }
  
  finalMessages.push(...optimizedMessages);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(`${profileEnc.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: profileEnc.model,
        messages: finalMessages,
        tools,
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
        const result = await executeTool(tc.function.name, parsedArgs, win, askToolConfirmation)
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
