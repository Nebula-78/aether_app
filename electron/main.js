const { app, BrowserWindow, ipcMain, globalShortcut, shell, safeStorage, dialog } = require('electron')
const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')
const os = require('os')
const { exec } = require('child_process')
const StoreModule = require('electron-store')
const Store = StoreModule.default || StoreModule
const store = new Store()
const isDev = process.env.NODE_ENV === 'development'

const PERSONAS = {
  default: "Tu es Aether, un assistant IA utile, honnête et inoffensif. Tu réponds de manière concise et précise.",
  coder: "Tu es un ingénieur logiciel expert de classe mondiale. Tu écris du code propre, efficace et bien documenté. Tu privilégies les solutions modernes et les meilleures pratiques.",
  writer: "Tu es un écrivain et éditeur professionnel. Tu excels dans la rédaction créative, la correction de textes et l'adaptation du style à l'audience ciblée.",
  analyst: "Tu es un analyste de données et stratège expert. Tu es capable de décortiquer des problèmes complexes, d'analyser des tendances et de fournir des recommandations basées sur des faits."
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,              // titlebar custom
    titleBarStyle: 'hidden',   // macOS
    backgroundColor: '#0d0d0d',
    show: false,               // éviter flash blanc au démarrage
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Charger le renderer
  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Afficher quand prêt (évite flash)
  win.once('ready-to-show', () => win.show())
}

// --- IPC — contrôles fenêtre ---
ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender).minimize())
ipcMain.on('window:maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  win.isMaximized() ? win.unmaximize() : win.maximize()
})
ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender).close())

ipcMain.handle('window:isMaximized', (e) => 
  BrowserWindow.fromWebContents(e.sender).isMaximized()
)

// --- IPC — Config API (F1) ---
ipcMain.handle('config:save', async (e, profile) => {
  try {
    const encrypted = safeStorage.encryptString(profile.apiKey)
    store.set(`profiles.${profile.id}`, {
      ...profile,
      apiKey: encrypted.toString('base64')
    })
    store.set('activeProfileId', profile.id)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('config:load', async () => {
  const id = store.get('activeProfileId')
  if (!id) return null
  const profile = store.get(`profiles.${id}`)
  if (!profile) return null
  try {
    const decrypted = safeStorage.decryptString(
      Buffer.from(profile.apiKey, 'base64')
    )
    return { ...profile, apiKey: decrypted.toString() }
  } catch (err) {
    return null
  }
})

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
    })
    if (res.ok || res.status === 400) return { success: true }
    return { success: false, error: `HTTP ${res.status}` }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// --- IPC — Chat & Streaming (F2 & F3) ---

const tools = [
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Exécute une commande shell sur la machine de l'utilisateur. Attention: nécessite une confirmation.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "La commande shell à exécuter." }
        },
        required: ["command"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Lit le contenu d'un fichier spécifié.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Chemin absolu ou relatif vers le fichier." }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Écrit ou écrase un fichier spécifié avec le contenu fourni.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Chemin absolu ou relatif vers le fichier." },
          content: { type: "string", description: "Le contenu à écrire." }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "Liste les fichiers et dossiers dans un répertoire spécifié.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Le chemin du répertoire à lister." }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_file",
      description: "Ouvre un fichier avec l'application système par défaut.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Chemin vers le fichier." }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_url",
      description: "Ouvre une URL dans le navigateur par défaut de l'utilisateur.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "L'URL complète à ouvrir." }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "copy_to_clipboard",
      description: "Copie le texte spécifié dans le presse-papier de l'utilisateur.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Le texte à copier." }
        },
        required: ["text"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_clipboard",
      description: "Lit le texte actuellement présent dans le presse-papier de l'utilisateur.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "take_screenshot",
      description: "Prend une capture d'écran et l'enregistre. Peut spécifier un dossier de destination.",
      parameters: {
        type: "object",
        properties: {
          directory: { type: "string", description: "Dossier de destination (ex: 'Images'). Par défaut à la racine." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_system_info",
      description: "Récupère des informations système (OS, RAM, CPU, Uptime).",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

// Helper to resolve path and restrict it to home directory by default
function getSafePath(filePath) {
  const homeDir = os.homedir();
  let resolved = path.resolve(filePath);
  if (!path.isAbsolute(filePath)) {
    resolved = path.join(homeDir, filePath);
  }
  if (!resolved.startsWith(homeDir)) {
    throw new Error("Accès refusé : Le chemin doit être dans votre dossier personnel (home directory).");
  }
  return resolved;
}

// Confirmation Promise registry
const pendingConfirmations = new Map();

function askToolConfirmation(data, win) {
  return new Promise((resolve) => {
    const confirmId = Math.random().toString(36).substring(7);
    pendingConfirmations.set(confirmId, resolve);
    win.webContents.send('tool:confirm', { id: confirmId, ...data });
  });
}

ipcMain.on('tool:confirmed', (event, { id, confirmed }) => {
  const resolve = pendingConfirmations.get(id);
  if (resolve) {
    resolve(confirmed);
    pendingConfirmations.delete(id);
  }
});

async function executeTool(name, args, win) {
  try {
    switch (name) {
      case 'run_command': {
        const { command } = args;
        const confirmed = await askToolConfirmation({ name, command }, win);
        if (!confirmed) {
          return { error: "Action annulée par l'utilisateur." };
        }
        return new Promise((resolve) => {
          exec(command, { cwd: os.homedir() }, (error, stdout, stderr) => {
            resolve({
              stdout: stdout || '',
              stderr: stderr || '',
              exitCode: error ? error.code : 0
            });
          });
        });
      }
      
      case 'read_file': {
        const safePath = getSafePath(args.path);
        const content = await fs.readFile(safePath, 'utf8');
        return { content };
      }
      
      case 'write_file': {
        const safePath = getSafePath(args.path);
        if (fsSync.existsSync(safePath)) {
          const confirmed = await askToolConfirmation({ name, path: args.path, exists: true }, win);
          if (!confirmed) {
            return { error: "Écriture annulée par l'utilisateur." };
          }
        }
        await fs.writeFile(safePath, args.content, 'utf8');
        return { success: true, message: `Fichier écrit dans ${args.path}` };
      }
      
      case 'list_directory': {
        const safePath = getSafePath(args.path || '.');
        const files = await fs.readdir(safePath, { withFileTypes: true });
        return {
          files: files.map(f => ({
            name: f.name,
            isDirectory: f.isDirectory(),
            isFile: f.isFile()
          }))
        };
      }
      
      case 'open_file': {
        const safePath = getSafePath(args.path);
        await shell.openPath(safePath);
        return { success: true };
      }
      
      case 'open_url': {
        const urlStr = args.url;
        if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
          throw new Error("L'URL doit commencer par http:// ou https://");
        }
        await shell.openExternal(urlStr);
        return { success: true };
      }
      
      case 'copy_to_clipboard': {
        const { clipboard } = require('electron');
        clipboard.writeText(args.text);
        return { success: true };
      }
      
      case 'read_clipboard': {
        const { clipboard } = require('electron');
        return { text: clipboard.readText() };
      }
      
      case 'take_screenshot': {
        const { desktopCapturer, screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        
        const sources = await desktopCapturer.getSources({ 
          types: ['screen'], 
          thumbnailSize: { width: width * 2, height: height * 2 } // High res
        });

        if (sources.length > 0) {
          const png = sources[0].thumbnail.toPNG();
          const filename = `screenshot_${Date.now()}.png`;
          
          let targetDir = os.homedir();
          if (args.directory) {
            try {
              const potentialPath = getSafePath(args.directory);
              if (fsSync.existsSync(potentialPath) && fsSync.lstatSync(potentialPath).isDirectory()) {
                targetDir = potentialPath;
              } else {
                // Créer le dossier si possible
                await fs.mkdir(potentialPath, { recursive: true });
                targetDir = potentialPath;
              }
            } catch (e) {}
          }

          const screenshotPath = path.join(targetDir, filename);
          await fs.writeFile(screenshotPath, png);
          return { success: true, path: screenshotPath, message: `Capture d'écran enregistrée dans ${targetDir} sous ${filename}` };
        }
        throw new Error("Aucun écran détecté.");
      }
      
      case 'get_system_info': {
        return {
          platform: os.platform(),
          release: os.release(),
          arch: os.arch(),
          totalMemGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
          freeMemGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
          uptimeHours: (os.uptime() / 3600).toFixed(2),
          cpus: os.cpus().map(c => c.model).filter((v, i, a) => a.indexOf(v) === i)
        };
      }
      
      default:
        throw new Error(`Outil inconnu : ${name}`);
    }
  } catch (err) {
    return { error: err.message };
  }
}

ipcMain.on('agent:send', async (event, { messages, persona = 'default' }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  
  const id = store.get('activeProfileId')
  const profileEnc = store.get(`profiles.${id}`)
  if (!profileEnc) {
    win.webContents.send('agent:stream-error', "Aucun profil configuré")
    return
  }
  
  const apiKey = safeStorage.decryptString(Buffer.from(profileEnc.apiKey, 'base64')).toString()

  // Optimisation du contexte (fenêtre glissante : les 15 derniers messages)
  let optimizedMessages = messages.length > 15 ? messages.slice(-15) : messages;

  // Injection du Persona (System Message)
  const systemPrompt = PERSONAS[persona] || PERSONAS.default;
  if (!optimizedMessages.some(m => m.role === 'system')) {
    optimizedMessages = [{ role: 'system', content: systemPrompt }, ...optimizedMessages];
  }

  try {
    const res = await fetch(`${profileEnc.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: profileEnc.model,
        messages: optimizedMessages,
        tools,
        stream: true
      })
    })

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error: ${res.status} - ${errText}`);
    }

    let textResponse = ''
    let toolCalls = []
    const reader = res.body.getReader()
    const decoder = new TextDecoder()

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

    toolCalls = toolCalls.filter(Boolean)

    if (toolCalls.length > 0) {
      // Envoyer les tool calls au renderer pour affichage
      win.webContents.send('agent:tool-calls', toolCalls)

      const toolResults = []
      for (const tc of toolCalls) {
        let parsedArgs = {}
        try {
          parsedArgs = JSON.parse(tc.function.arguments)
        } catch {}

        win.webContents.send('agent:tool-status', { id: tc.id, status: 'running' })
        const result = await executeTool(tc.function.name, parsedArgs, win)
        win.webContents.send('agent:tool-result', { id: tc.id, name: tc.function.name, result })

        toolResults.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(result)
        })
      }

      // Appeler une seconde fois avec les résultats des outils
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
      let finalResponse = ''

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

// --- IPC — Conversations (F4) ---
ipcMain.on('conversation:save', (e, conv) => {
  store.set(`conversations.${conv.id}`, conv)
})

ipcMain.handle('conversation:list', () => {
  const convs = store.get('conversations', {})
  return Object.values(convs).sort((a, b) => b.id - a.id)
})

ipcMain.on('conversation:delete', (e, id) => {
  store.delete(`conversations.${id}`)
})

ipcMain.handle('conversation:export', async (e, { title, messages }) => {
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
})

ipcMain.handle('conversation:generate-title', async (e, messages) => {
  const id = store.get('activeProfileId')
  const profileEnc = store.get(`profiles.${id}`)
  if (!profileEnc) return null
  const apiKey = safeStorage.decryptString(Buffer.from(profileEnc.apiKey, 'base64')).toString()

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
    })
    const json = await res.json()
    return json.choices?.[0]?.message?.content?.replace(/["']/g, '') || null
  } catch {
    return null
  }
})

ipcMain.handle('conversation:search-full-text', async (e, query) => {
  const convs = store.get('conversations', {})
  const results = Object.values(convs).filter(conv => {
    const inTitle = conv.title?.toLowerCase().includes(query.toLowerCase());
    const inMessages = conv.messages?.some(m => m.content?.toLowerCase().includes(query.toLowerCase()));
    return inTitle || inMessages;
  });
  return results.sort((a, b) => b.id - a.id);
})

// --- App Lifecycle ---
app.whenReady().then(() => {
  createWindow()

  // Raccourcis globaux
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
