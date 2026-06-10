# PROMPT_FIX_FONCTIONNEL.md
## Rendre l'app 100% fonctionnelle — supprimer le contenu statique

---

L'app actuelle est un prototype statique. Voici ce qu'il faut faire
pour la rendre entièrement fonctionnelle. Applique chaque point
dans l'ordre, avec un diff par fichier.

---

## 1. Nettoyer tout le contenu statique fictif

- Supprimer tous les items hardcodés dans la sidebar
  (Favoris, Récents, noms de conversations fictifs)
- La sidebar doit afficher une liste vide au démarrage
- Supprimer "Discussions", "Projets", "Artéfacts", "Code", "Personnaliser"
  — garder uniquement :
  - `+ Nouvelle conversation`
  - Liste des conversations sauvegardées (vide au départ)
  - Footer utilisateur (nom + plan depuis la config)
- Supprimer les quick actions (Écrire, Apprendre, Code...) —
  elles ne correspondent à rien de fonctionnel
- Le placeholder du titre hero devient : "Bonjour. Comment puis-je vous aider ?"
  (sans nom hardcodé "Steve")

---

## 2. Implémenter F1 — Connexion API (priorité absolue)

Au premier lancement, si aucun profil API n'est configuré :
afficher un écran d'onboarding centré (pas de sidebar) avec :

```
Titre        : "Configurer votre IA"
Sous-titre   : "Connectez n'importe quelle API compatible OpenAI"

Champs :
  - Nom du profil       (texte, ex: "Mon IA locale")
  - Base URL            (texte, ex: "https://api.openai.com/v1")
  - Clé API             (password, masqué par défaut)
  - Modèle              (texte libre, ex: "gpt-4o", "claude-sonnet-4-6")

Bouton : "Tester la connexion"
  → appel IPC config:test
  → affiche ● vert "Connecté" ou ● rouge + message d'erreur

Bouton : "Enregistrer et continuer" (actif seulement si test réussi)
  → appel IPC config:save
  → redirige vers l'écran principal
```

Dans `electron/main.js`, implémenter :

```js
// Sauvegarder la config avec chiffrement
ipcMain.handle('config:save', async (e, profile) => {
  const encrypted = safeStorage.encryptString(profile.apiKey)
  store.set(`profiles.${profile.id}`, {
    ...profile,
    apiKey: encrypted.toString('base64')
  })
  store.set('activeProfileId', profile.id)
  return { success: true }
})

// Charger la config
ipcMain.handle('config:load', async () => {
  const id = store.get('activeProfileId')
  if (!id) return null
  const profile = store.get(`profiles.${id}`)
  if (!profile) return null
  const decrypted = safeStorage.decryptString(
    Buffer.from(profile.apiKey, 'base64')
  )
  return { ...profile, apiKey: decrypted }
})

// Tester la connexion
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
```

Installer `electron-store` si pas déjà fait :
```bash
npm install electron-store
```

Initialiser dans `main.js` :
```js
const Store = require('electron-store')
const { safeStorage } = require('electron')
const store = new Store()
```

---

## 3. Implémenter F2 — Chat streamé

Dans `MainArea.jsx`, quand l'utilisateur envoie un message :

**État de l'app** :
```js
const [messages, setMessages] = useState([])       // historique conversation
const [input, setInput]       = useState('')        // texte input
const [streaming, setStreaming] = useState(false)   // IA en train de répondre
const [currentResponse, setCurrentResponse] = useState('') // token en cours
```

**Envoi du message** :
```js
const sendMessage = async () => {
  if (!input.trim() || streaming) return

  const userMsg = { role: 'user', content: input }
  setMessages(prev => [...prev, userMsg])
  setInput('')
  setStreaming(true)
  setCurrentResponse('')

  // Envoyer via IPC
  window.electronAPI.sendMessage([...messages, userMsg])
}
```

**Réception du stream** (dans useEffect au montage) :
```js
useEffect(() => {
  window.electronAPI.onStreamChunk((chunk) => {
    setCurrentResponse(prev => prev + chunk)
  })
  window.electronAPI.onStreamEnd((fullResponse) => {
    setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }])
    setCurrentResponse('')
    setStreaming(false)
  })
  window.electronAPI.onStreamError((error) => {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Erreur : ${error}`,
      isError: true
    }])
    setStreaming(false)
  })
}, [])
```

Dans `electron/main.js`, implémenter le streaming SSE :
```js
ipcMain.on('agent:send', async (event, messages) => {
  const profile = await getActiveProfile() // charger depuis store
  const win = BrowserWindow.fromWebContents(event.sender)

  try {
    const res = await fetch(`${profile.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${profile.apiKey}`
      },
      body: JSON.stringify({
        model: profile.model,
        messages,
        stream: true
      })
    })

    let fullResponse = ''
    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        if (line === 'data: [DONE]') continue
        try {
          const json = JSON.parse(line.slice(6))
          const chunk = json.choices?.[0]?.delta?.content
          if (chunk) {
            fullResponse += chunk
            win.webContents.send('agent:stream-chunk', chunk)
          }
        } catch {}
      }
    }

    win.webContents.send('agent:stream-end', fullResponse)
  } catch (err) {
    win.webContents.send('agent:stream-error', err.message)
  }
})
```

Ajouter dans `preload.js` :
```js
sendMessage:    (messages) => ipcRenderer.send('agent:send', messages),
onStreamChunk:  (cb) => ipcRenderer.on('agent:stream-chunk', (_, chunk) => cb(chunk)),
onStreamEnd:    (cb) => ipcRenderer.on('agent:stream-end', (_, full) => cb(full)),
onStreamError:  (cb) => ipcRenderer.on('agent:stream-error', (_, err) => cb(err)),
abortStream:    () => ipcRenderer.send('agent:abort'),
```

---

## 4. Affichage des messages dans le chat

Remplacer l'écran welcome par une vue conditionnelle :
- Si `messages.length === 0` → afficher le hero + input
- Si `messages.length > 0` → afficher la liste des messages + input en bas

**Composant `ChatMessage.jsx`** :
```jsx
// user : aligné à droite, fond --bg-active, border-radius 18px
// assistant : aligné à gauche, pas de fond, markdown rendu
// isError : texte --text-accent, italic
```

Pour le rendu Markdown, installer :
```bash
npm install react-markdown
```

Bulle "en train d'écrire" pendant le stream :
```jsx
{streaming && (
  <div className="assistant-bubble">
    {currentResponse}
    <span className="cursor-blink">▊</span>
  </div>
)}
```

---

## 5. Sauvegarder les conversations

Après chaque `stream-end`, sauvegarder automatiquement via IPC :
```js
window.electronAPI.saveConversation({
  id: conversationId,       // généré au début de la conv (Date.now())
  title: messages[0]?.content?.slice(0, 40) ?? 'Nouvelle conversation',
  messages: [...messages, { role: 'assistant', content: fullResponse }]
})
```

Dans `main.js` :
```js
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
```

Charger la liste dans la sidebar au montage :
```js
useEffect(() => {
  window.electronAPI.listConversations().then(setConversations)
}, [])
```

---

## 6. Nouvelle conversation

Bouton "+ Nouvelle conversation" dans la sidebar :
```js
const newConversation = () => {
  setMessages([])
  setConversationId(Date.now())
  setCurrentResponse('')
  setStreaming(false)
}
```

---

## Résumé des fichiers à modifier

```
electron/main.js      ← config:save/load/test + agent:send streaming + conversations
electron/preload.js   ← exposer toutes les nouvelles APIs
src/App.jsx           ← état global : profil chargé ? → onboarding ou app
src/components/
  ├── OnboardingScreen.jsx   ← NOUVEAU — config API premier lancement
  ├── Sidebar.jsx            ← liste conversations réelles, plus de hardcode
  ├── MainArea.jsx           ← état vide vs chat actif
  ├── ChatMessage.jsx        ← NOUVEAU — bulles messages
  └── InputZone.jsx          ← connecter sendMessage + streaming state
```

---

*@rokh / ohm.sh — PROMPT_FIX_FONCTIONNEL.md — VIAP v1.1*
