---
name: electron-streaming-management
description: Procédure pour gérer le streaming de messages Electron : ajout d'abort, lecture de fichiers et communication IPC bidirectionnelle.
source: auto-skill
extracted_at: '2026-06-10T15:32:52.796Z'
---

Pour gérer efficacement le streaming de messages dans une application Electron (notamment avec des outils d'IA) :

1. **Backend (main.js)** :
   - Maintenir un `Map` (ex: `activeReaders`) pour stocker les `reader` des flux actifs par ID de fenêtre.
   - Ajouter un écouteur `ipcMain.on('agent:abort')` qui appelle `reader.cancel()` et libère le lecteur.
   - Envoyer un événement `agent:stream-end` pour confirmer l'arrêt au front-end.

2. **Interface (preload.js)** :
   - Exposer `abortStream: () => ipcRenderer.send('agent:abort')` via `contextBridge`.

3. **Front-end (React)** :
   - **Lecture de fichiers** : Utiliser `FileReader` pour convertir les fichiers (images) en base64 avant l'envoi (`Promise` + `readAsDataURL`).
   - **Bouton Stop** : Conditionner l'affichage du bouton d'envoi selon l'état `streaming`. Si `streaming === true`, afficher un bouton Stop qui appelle `window.electronAPI.abortStream()`.
   - **Gestion IPC** : Toujours utiliser le motif `on/off` (via des wrappers retournant la fonction de nettoyage) dans les `useEffect` pour éviter les listeners dupliqués lors des re-rendus.

4. **Robustesse** :
   - S'assurer que `setStreaming(false)` est appelé dans un bloc `finally` pour garantir le retour à l'état normal en cas d'erreur réseau ou d'arrêt forcé.
