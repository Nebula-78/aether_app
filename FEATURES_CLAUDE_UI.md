# FEATURES_CLAUDE_UI.md
## Brief fonctionnel — Claude Desktop App (Dark)
> Mode : Electron Desktop
> Type : Agent IA local avec exécution d'actions système
> Généré par VIAP v1.1 — @rokh / ohm.sh

---

## 1. Vision produit

Une app desktop qui permet à l'utilisateur de **connecter n'importe quelle
API IA compatible** (OpenAI, Anthropic, Ollama, freellmapi, etc.) et de
lui déléguer des **actions concrètes sur l'ordinateur** — ouvrir des
fichiers, lancer des commandes, manipuler le presse-papier, prendre des
screenshots, etc.

L'interface reproduit l'expérience Claude.ai en dark theme, mais
fonctionne entièrement en local avec l'API de l'utilisateur.

---

## 2. Fonctionnalités MVP

### F1 — Connexion API IA

**Objectif** : L'utilisateur renseigne une base URL + une clé API pour
pointer vers n'importe quel provider compatible OpenAI Chat Completions.

**Comportement attendu** :
- Écran de configuration accessible via ⚙️ dans la sidebar ou au
  premier lancement (onboarding)
- Champs : `Base URL`, `API Key`, `Modèle` (texte libre ou liste)
- Bouton "Tester la connexion" → requête ping vers `GET /models` ou
  `POST /chat/completions` avec message vide
- Statut visuel : ● vert (connecté) / ● rouge (erreur) / ● gris (non configuré)
- Les credentials sont persistés localement via `electron-store`
  (chiffrés, jamais exposés au renderer directement)
- Support multi-profils : l'utilisateur peut sauvegarder plusieurs
  configurations (ex: "Claude via freellmapi", "Ollama local", "GPT-4o")

**Providers testés / supportés** :
```
OpenAI            → https://api.openai.com/v1
Anthropic*        → https://api.anthropic.com/v1  (*format légèrement différent)
Ollama            → http://localhost:11434/v1
freellmapi        → URL personnalisée
Tout proxy        → compatible OpenAI Chat Completions
```

---

### F2 — Chat avec l'IA

**Objectif** : Interface de chat classique — envoyer un message, recevoir
une réponse streamée.

**Comportement attendu** :
- Messages envoyés via `POST /chat/completions` avec `stream: true`
- Affichage token par token dans la bulle de réponse (streaming SSE)
- Historique de la conversation maintenu en mémoire (pas de persistence
  côté serveur — tout est local)
- Markdown rendu dans les réponses (gras, code, listes)
- Bloc de code avec bouton "Copier"
- Indicateur de frappe (3 points animés) pendant la réponse
- Bouton "Stop" pour interrompre le stream en cours
- Gestion d'erreur : afficher le message d'erreur API dans la bulle

---

### F3 — Exécution d'actions système via l'IA

**Objectif** : L'IA peut exécuter des actions réelles sur l'ordinateur
via un système de **tools** (function calling).

**Architecture** :
```
Utilisateur → message → Renderer
Renderer → ipcRenderer.invoke('agent:run', { message, tools }) → Main
Main → POST /chat/completions (avec tools) → API IA
API IA → tool_call JSON → Main
Main → exécute l'action système → résultat
Main → renvoie résultat à l'API IA (tool_result)
Main → réponse finale → Renderer → affichage
```

**Actions système disponibles (MVP)** :

| Tool name | Description | API Node.js |
|---|---|---|
| `run_command` | Exécuter une commande shell | `child_process.exec` |
| `read_file` | Lire le contenu d'un fichier | `fs.readFile` |
| `write_file` | Écrire dans un fichier | `fs.writeFile` |
| `list_directory` | Lister les fichiers d'un dossier | `fs.readdir` |
| `open_file` | Ouvrir un fichier avec l'app par défaut | `shell.openPath` |
| `open_url` | Ouvrir une URL dans le navigateur | `shell.openExternal` |
| `copy_to_clipboard` | Copier du texte | `clipboard.writeText` |
| `read_clipboard` | Lire le presse-papier | `clipboard.readText` |
| `take_screenshot` | Capturer l'écran | `desktopCapturer` |
| `get_system_info` | OS, RAM, CPU, uptime | `os` module |

**Sécurité** :
- `run_command` demande une **confirmation utilisateur** avant exécution
  (dialog modal avec la commande affichée)
- `write_file` demande confirmation si le fichier existe déjà
- Chemin limité au home directory par défaut (configurable)
- L'utilisateur peut désactiver chaque tool individuellement dans les settings

**Affichage dans le chat** :
```
[Outil utilisé : run_command]
$ npm run build

→ résultat affiché en bloc de code
→ puis réponse textuelle de l'IA
```

---

### F4 — Gestion des conversations

**Objectif** : Sauvegarder, nommer et retrouver les conversations passées.

**Comportement attendu** :
- Chaque conversation sauvegardée en JSON dans `userData/conversations/`
  via `electron-store` ou `fs` directement
- Titre auto-généré depuis le premier message (premiers 40 caractères)
- Renommer une conversation (double-clic sur le titre dans la sidebar)
- Supprimer une conversation (clic droit → menu contextuel → Supprimer)
- Nouvelle conversation vide : Ctrl+N ou bouton sidebar
- Recherche dans les titres : Ctrl+K ouvre un input de filtre

---

## 3. Canaux IPC — tableau complet

| Canal | Direction | Description |
|---|---|---|
| `window:minimize` | R → M | Minimiser la fenêtre |
| `window:maximize` | R → M | Maximiser / restaurer |
| `window:close` | R → M | Fermer l'app |
| `window:isMaximized` | R ↔ M | État maximize (invoke) |
| `config:save` | R → M | Sauvegarder config API (baseUrl, apiKey, model) |
| `config:load` | R ↔ M | Charger config au démarrage |
| `config:test` | R ↔ M | Tester la connexion API (invoke → boolean + message) |
| `agent:run` | R ↔ M | Envoyer message + tools, retourner réponse finale |
| `agent:stream-chunk` | M → R | Chunk de stream SSE (token par token) |
| `agent:stream-end` | M → R | Fin du stream |
| `agent:stream-error` | M → R | Erreur pendant le stream |
| `agent:abort` | R → M | Interrompre le stream en cours |
| `tool:confirm` | M → R | Demander confirmation à l'utilisateur avant action |
| `tool:confirmed` | R → M | Réponse de l'utilisateur (oui/non) |
| `conversation:save` | R → M | Persister une conversation |
| `conversation:list` | R ↔ M | Lister les conversations sauvegardées |
| `conversation:delete` | R → M | Supprimer une conversation |
| `shortcut:new-conversation` | M → R | Raccourci Ctrl+N |
| `shortcut:search` | M → R | Raccourci Ctrl+K |

---

## 4. Persistance des données

```
userData/                          ← electron app.getPath('userData')
├── config.json                    ← profils API (chiffrés avec safeStorage)
└── conversations/
    ├── conv_1718000000000.json
    ├── conv_1718001000000.json
    └── ...
```

**Structure d'une conversation** :
```json
{
  "id": "conv_1718000000000",
  "title": "Automatiser le build npm",
  "createdAt": "2026-06-09T10:00:00Z",
  "updatedAt": "2026-06-09T10:15:00Z",
  "profileId": "freellmapi",
  "messages": [
    { "role": "user",      "content": "Lance le build de mon projet" },
    { "role": "assistant", "content": "Je lance `npm run build`..." },
    { "role": "tool",      "name": "run_command", "result": "..." }
  ]
}
```

**Structure d'un profil API** :
```json
{
  "id": "freellmapi",
  "name": "freellmapi",
  "baseUrl": "https://...",
  "apiKey": "sk-...",
  "model": "claude-sonnet-4-6",
  "isDefault": true
}
```

---

## 5. Écrans / états de l'app

| État | Description |
|---|---|
| **Onboarding** | Premier lancement — aucun profil configuré → modal de configuration |
| **Welcome** | Profil configuré, aucune conversation active — écran hero + input |
| **Chat actif** | Conversation en cours — historique + input |
| **Streaming** | IA en train de répondre — indicateur + bouton stop |
| **Tool confirm** | L'IA veut exécuter une action — modal de confirmation |
| **Settings** | Panel de configuration des profils API + tools |
| **Erreur API** | Connexion échouée — message + bouton reconfigurer |

---

## 6. Fonctionnalités futures (post-MVP)

```
[ ] Mode vocal : entrée micro + synthèse vocale (Web Speech API)
[ ] Mémoire persistante : contexte injecté automatiquement en system prompt
[ ] Plugins tools : l'utilisateur ajoute ses propres tools via un fichier JS
[ ] Multi-fenêtre : plusieurs conversations en parallèle
[ ] Thème clair
[ ] Export conversation en Markdown / PDF
[ ] Tray icon : accès rapide sans ouvrir la fenêtre principale
[ ] Auto-update : electron-updater
```

---

## 7. Contraintes de sécurité à respecter

```
✓ apiKey jamais logguée en console, jamais exposée au renderer
✓ Utiliser electron.safeStorage.encryptString pour chiffrer les clés
✓ contextIsolation: true + nodeIntegration: false obligatoires
✓ Toute action système passe par main.js — jamais depuis le renderer
✓ run_command et write_file : confirmation obligatoire avant exécution
✓ Limiter les paths accessibles au home directory par défaut
✓ Pas de eval() ni de code dynamique dans le renderer
```

---

*@rokh / ohm.sh — FEATURES_CLAUDE_UI.md — VIAP v1.1*
