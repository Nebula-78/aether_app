# AETHER_AMELIORATIONS.md
## Analyse du projet + Propositions d'améliorations
> Analyse du code source — aether_app v1.0
> @rokh / ohm.sh — VIAP v1.1

---

## État actuel du projet

Le projet est **bien structuré et fonctionnel** pour un v1. Les fondations
sont solides : streaming SSE, tool calling avec confirmation, persistance
electron-store, personas, recherche plein-texte, export Markdown, panneau
Artifacts. Beaucoup a déjà été fait.

**Ce qui fonctionne bien :**
- Architecture main/preload/renderer propre, contextIsolation respecté
- Cycle tool calling complet (confirmation → exécution → résultat → 2ème appel)
- Nettoyage des listeners IPC (on/off pattern bien appliqué)
- Tailwind v4 + variables CSS cohérentes
- Fenêtre glissante de contexte (15 derniers messages)
- Auto-génération de titres de conversations via l'IA
- Reconnaissance vocale (Web Speech API)
- Gestion des pièces jointes (UI présente, logique partielle)

---

## Bugs identifiés à corriger en priorité

### B1 — Pièces jointes non envoyées à l'IA
**Fichier** : `InputZone.jsx` + `main.js`
**Problème** : Les fichiers joints sont transformés en `[Fichier: nom.ext]`
dans le message texte — l'IA ne voit jamais le contenu réel.
**Fix** : Lire le contenu des fichiers (base64 pour images, texte pour
les autres) et les envoyer dans le tableau `messages` en tant que
`content` multipart (format OpenAI vision).

```js
// InputZone.jsx — lire les fichiers avant envoi
const readFileAsBase64 = (file) => new Promise((resolve) => {
  const reader = new FileReader()
  reader.onload = (e) => resolve(e.target.result.split(',')[1])
  reader.readAsDataURL(file)
})
```

---

### B2 — Listeners IPC dupliqués sur re-render
**Fichier** : `MainArea.jsx`
**Problème** : Le `useEffect` qui enregistre `onStreamChunk/End/Error`
a `[activeConvId, setMessages, onConversationUpdated]` en dépendances.
À chaque changement de conversation, les anciens listeners ne sont pas
correctement nettoyés avant que les nouveaux soient ajoutés — risque
de double-exécution des handlers.
**Fix** : Stocker les références retournées et les passer à `off*` dans
le cleanup du même `useEffect`.

---

### B3 — Race condition sur `finalMessages` dans `saveAndTitle`
**Fichier** : `MainArea.jsx` — fonction `handleEnd`
**Problème** : `finalMessages` est une variable capturée dans la closure
de `setMessages`. Si `setMessages` est batché par React, `finalMessages`
peut être vide quand `saveAndTitle` s'exécute.
**Fix** : Utiliser un `useRef` pour stocker les messages courants en
parallèle de l'état, ou passer les messages directement à `saveAndTitle`.

---

### B4 — Pas de gestion d'abort du stream
**Fichier** : `main.js` — `ipcMain.on('agent:send', ...)`
**Problème** : Le canal `agent:abort` est déclaré dans `preload.js` mais
n'est pas implémenté dans `main.js`. Le bouton Stop de l'UI n'a donc
aucun effet.
**Fix** :
```js
// main.js
const activeReaders = new Map()

// Dans agent:send, stocker le reader
activeReaders.set(win.id, reader)

// Implémenter l'abort
ipcMain.on('agent:abort', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const reader = activeReaders.get(win.id)
  if (reader) {
    reader.cancel()
    activeReaders.delete(win.id)
  }
  win.webContents.send('agent:stream-end', '')
})
```

---

## Améliorations fonctionnelles

### A1 — Gestion multi-profils dans l'UI ⭐⭐⭐
**Priorité** : Haute
**État actuel** : Un seul profil possible — reconfigurer efface l'ancien.
**Proposition** : Ajouter un écran Settings accessible depuis le footer
de la sidebar avec :
- Liste des profils sauvegardés (nom + modèle + statut ●)
- Bouton "Ajouter un profil"
- Switch de profil actif en un clic
- Suppression de profil
- Accès rapide : clic sur l'avatar en bas de sidebar

---

### A2 — Bouton Stop pendant le streaming ⭐⭐⭐
**Priorité** : Haute (dépend du fix B4)
**État actuel** : Le bouton Stop n'est pas visible dans l'UI actuelle.
**Proposition** : Pendant `streaming === true`, remplacer le bouton Send
par un bouton Stop rouge dans `InputZone` :
```jsx
{streaming ? (
  <button onClick={() => window.electronAPI.abortStream()}
    className="p-2 bg-red-600/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-600/30">
    <Square size={18} />
  </button>
) : (
  <button onClick={handleSubmit} ...>
    <SendHorizontal size={18} />
  </button>
)}
```

---

### A3 — Panneau Settings complet ⭐⭐
**Priorité** : Moyenne
**État actuel** : Pas d'accès aux settings après l'onboarding.
**Proposition** : Panneau glissant depuis la droite (ou modal) avec :
- Onglet "Profils API" (voir A1)
- Onglet "Outils système" — toggle on/off par tool
- Onglet "Apparence" — taille de police, densité UI
- Onglet "Raccourcis" — liste des shortcuts disponibles
- Accès : icône ⚙️ dans le header de la sidebar

---

### A4 — Régénération de réponse ⭐⭐
**Priorité** : Moyenne
**État actuel** : Impossible de regénérer sans ressaisir le message.
**Proposition** : Bouton "↻ Régénérer" affiché au hover sur le dernier
message assistant :
```js
const handleRegenerate = () => {
  // Retirer le dernier message assistant
  const messagesWithoutLast = messages.slice(0, -1)
  setMessages(messagesWithoutLast)
  setStreaming(true)
  window.electronAPI.sendMessage({ messages: messagesWithoutLast, persona: activePersona })
}
```

---

### A5 — Édition de message utilisateur ⭐⭐
**Priorité** : Moyenne
**Proposition** : Double-clic sur un message user → textarea éditable
en place. À la validation → retronquer l'historique à ce point et
renvoyer la conversation depuis ce message.

---

### A6 — Prompt système custom par conversation ⭐⭐
**Priorité** : Moyenne
**État actuel** : Personas fixes définis dans `main.js`.
**Proposition** : Permettre à l'utilisateur de saisir un system prompt
libre via un bouton discret dans l'InputZone (icône `</>` ou "⚙").
Stocker dans `conversation.systemPrompt` et l'injecter en tête de
`messages` à chaque appel.

---

### A7 — Raccourci Ctrl+N dans la sidebar ⭐
**Priorité** : Basse
**État actuel** : Le shortcut `shortcut:new-conversation` est envoyé
depuis `main.js` mais n'est pas écouté dans `App.jsx` ou `Sidebar.jsx`.
**Fix** :
```js
// App.jsx — dans un useEffect
window.electronAPI.onShortcut('shortcut:new-conversation', startNewConversation)
```

---

## Améliorations UX / Design

### U1 — Indicateur de scroll vers le bas ⭐⭐
**Problème** : Quand l'utilisateur scrolle vers le haut pour relire,
les nouveaux chunks arrivent mais le scroll ne se fait plus (auto-scroll
ne doit pas forcer si l'utilisateur a scrollé manuellement).
**Fix** : Détecter si l'utilisateur est "en bas" avant de forcer le scroll.
```js
const isAtBottom = () => {
  const el = scrollRef.current
  return el.scrollHeight - el.scrollTop - el.clientHeight < 50
}
// Dans handleChunk : if (isAtBottom()) scroll()
// Sinon : afficher un bouton "↓ Nouveaux messages"
```

---

### U2 — Copie du message complet ⭐⭐
**Proposition** : Au hover sur un message assistant → bouton "Copier"
discret en haut à droite de la bulle (en plus du bouton copier par
bloc de code qui existe déjà).

---

### U3 — Confirmation de suppression de conversation ⭐
**Problème actuel** : Clic sur l'icône poubelle → suppression immédiate
sans confirmation. Risque de perte accidentelle.
**Fix** : Ajouter un `dialog.showMessageBox` natif Electron :
```js
ipcMain.handle('conversation:delete-confirm', async (e, title) => {
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Supprimer', 'Annuler'],
    defaultId: 1,
    message: `Supprimer "${title}" ?`,
    detail: 'Cette action est irréversible.'
  })
  return response === 0
})
```

---

### U4 — Thème et taille de texte ⭐
**Proposition** : Variable `--font-scale` dans `:root` (valeurs : 0.9 /
1.0 / 1.1) contrôlée depuis les Settings. Persister dans `electron-store`.

---

## Améliorations techniques

### T1 — Refactoriser `main.js` en modules ⭐⭐
**Problème** : `main.js` fait 400+ lignes. Difficile à maintenir.
**Proposition** : Découper en modules :
```
electron/
├── main.js           ← entry point (createWindow + lifecycle)
├── ipc/
│   ├── window.js     ← contrôles fenêtre
│   ├── config.js     ← gestion profils API
│   ├── agent.js      ← streaming + tool calling
│   └── conversations.js ← CRUD conversations
└── tools/
    ├── index.js      ← liste des tools + executeTool()
    └── definitions.js ← JSON definitions pour l'API
```

---

### T2 — Limiter la taille des conversations sauvegardées ⭐⭐
**Problème** : Pas de limite — une longue conversation avec du code
peut rapidement dépasser 1MB dans `electron-store`.
**Fix** : Tronquer le contenu des messages `tool` dans le JSON persisté
(garder max 500 chars par résultat d'outil).

---

### T3 — Gestion d'erreur réseau plus robuste ⭐
**Problème** : Si le réseau coupe pendant le stream, l'erreur est
affichée mais l'app reste en état `streaming: true`.
**Fix** : Wrapper le reader dans un try/catch avec timeout et
s'assurer que `setStreaming(false)` est toujours appelé dans le finally.

---

### T4 — Variables d'environnement pour la config de build ⭐
**Proposition** : Créer `.env.example` avec :
```
VITE_APP_NAME=Aether
VITE_DEFAULT_BASE_URL=https://api.openai.com/v1
VITE_DEFAULT_MODEL=gpt-4o
```
Utilisées dans `OnboardingScreen.jsx` pour les valeurs par défaut.

---

## Fonctionnalités futures (roadmap)

### F5 — Mode offline avec Ollama ⭐⭐⭐
Détecter automatiquement si Ollama tourne sur `localhost:11434` et
proposer de l'utiliser comme profil sans clé API.

### F6 — Tray icon ⭐⭐
App accessible depuis la barre système sans ouvrir la fenêtre.
Raccourci global configurable pour afficher/masquer.

### F7 — Mémoire persistante ⭐⭐
Injecter automatiquement un bloc de contexte en system prompt
(infos sur l'utilisateur, préférences, projets en cours).
Interface pour éditer ce contexte dans les Settings.

### F8 — Multi-fenêtres ⭐
`Ctrl+Shift+N` → nouvelle fenêtre Electron indépendante avec
sa propre conversation. Chaque fenêtre partage le même store.

### F9 — Plugins tools custom ⭐
L'utilisateur ajoute ses propres tools via un fichier
`~/.config/aether/tools/mon-tool.js` chargé dynamiquement.

### F10 — Auto-update ⭐
`electron-updater` + GitHub Releases pour les mises à jour
automatiques sans réinstallation manuelle.

---

## Récapitulatif par priorité

| Priorité | Item | Effort | Impact |
|---|---|---|---|
| 🔴 Critique | B4 — Bouton Stop (abort stream) | Faible | Élevé |
| 🔴 Critique | B1 — Pièces jointes réelles | Moyen | Élevé |
| 🟠 Haute | B2 — Listeners dupliqués | Faible | Moyen |
| 🟠 Haute | A1 — Multi-profils UI | Moyen | Élevé |
| 🟠 Haute | A2 — Bouton Stop UI | Faible | Élevé |
| 🟡 Moyenne | U1 — Scroll intelligent | Faible | Élevé |
| 🟡 Moyenne | A3 — Panneau Settings | Élevé | Élevé |
| 🟡 Moyenne | A4 — Régénération réponse | Faible | Moyen |
| 🟡 Moyenne | T1 — Refactor main.js | Moyen | Moyen |
| 🟢 Basse | U2 — Copie message | Faible | Faible |
| 🟢 Basse | U3 — Confirm suppression | Faible | Faible |
| 🟢 Basse | A7 — Fix Ctrl+N | Très faible | Faible |

---

*@rokh / ohm.sh — AETHER_AMELIORATIONS.md — VIAP v1.1*
