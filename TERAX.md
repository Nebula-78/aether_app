# TERAX.md
## Mémoire agent — Claude Desktop App
> Point d'entrée unique. Lire ce fichier en premier, toujours.
> @rokh / ohm.sh — VIAP v1.1

---

## Identité du projet

| Champ | Valeur |
|---|---|
| **Nom** | claude-desktop |
| **Type** | App desktop — agent IA local |
| **Mode** | `electron` |
| **Owner** | @rokh / ohm.sh |
| **Stack** | React 19 + Vite 5 + Tailwind CSS v3 + Electron |
| **Déploiement** | electron-builder → `.exe` / `.AppImage` |
| **Statut** | 🟡 En cours — scaffold à générer |

---

## Fichiers de contexte

| Fichier | Rôle | Lire en |
|---|---|---|
| `TERAX.md` | Ce fichier — mémoire et point d'entrée | 1er |
| `AGENTS_CLAUDE_UI.md` | Design system complet (couleurs, typo, composants, CSS) | 2ème |
| `PROMPT_CLAUDE_UI.md` | Instructions de génération (structure, IPC, composants, ordre) | 3ème |
| `FEATURES_CLAUDE_UI.md` | Brief fonctionnel (F1 config API, F2 chat, F3 agent système, F4 conversations) | 4ème |

> **Règle absolue** : lire les 4 fichiers avant de générer la moindre ligne de code.

---

## Structure cible du projet

```
claude-desktop/
├── TERAX.md
├── AGENTS_CLAUDE_UI.md
├── PROMPT_CLAUDE_UI.md
├── FEATURES_CLAUDE_UI.md
├── electron/
│   ├── main.js          ← BrowserWindow, ipcMain, tools système, shortcuts
│   └── preload.js       ← contextBridge — API exposée au renderer
├── src/
│   ├── main.jsx
│   ├── App.jsx          ← Layout : TitleBar + Sidebar + MainArea
│   ├── index.css        ← Variables CSS globales + reset
│   └── components/
│       ├── TitleBar.jsx
│       ├── Sidebar.jsx
│       ├── SidebarItem.jsx
│       ├── MainArea.jsx
│       ├── InputZone.jsx
│       ├── QuickActions.jsx
│       ├── ChatMessage.jsx      ← Bulle message (user + assistant)
│       ├── ToolCallBlock.jsx    ← Affichage outil utilisé + résultat
│       ├── ConfirmModal.jsx     ← Confirmation avant action système
│       └── SettingsPanel.jsx    ← Config profils API + toggle tools
├── public/
│   └── icon.png
├── package.json
├── vite.config.js
├── tailwind.config.js
└── electron-builder.yml
```

---

## Design system — tokens express

```css
--bg-main:         #0d0d0d   /* fond global */
--bg-sidebar:      #1a1a1a   /* sidebar */
--bg-input:        #1e1e1e   /* zone de saisie */
--bg-hover:        #252525
--bg-active:       #2a2a2a
--text-primary:    #e8e6e3
--text-secondary:  #8a8a8a
--accent-primary:  #cc785c   /* orange-brun — couleur signature */
--border-subtle:   #282828
--border-input:    #333333
--font-display:    'Playfair Display', serif   /* hero uniquement */
--font-body:       'DM Sans', sans-serif       /* tout le reste */
--titlebar-height: 38px
--sidebar-width:   280px
```

> Référence complète → `AGENTS_CLAUDE_UI.md`

---

## Fonctionnalités MVP

| ID | Fonctionnalité | Complexité |
|---|---|---|
| F1 | Connexion base URL + API key (multi-profils, chiffrés) | Moyenne |
| F2 | Chat streamé (SSE token par token, markdown, stop) | Moyenne |
| F3 | Agent système — 10 tools (run_command, read/write_file, clipboard...) | Haute |
| F4 | Gestion conversations (save, rename, delete, search) | Faible |

> Détail complet → `FEATURES_CLAUDE_UI.md`

---

## Canaux IPC — résumé

| Canal clé | Direction | Usage |
|---|---|---|
| `window:minimize/maximize/close` | R → M | Contrôles titlebar |
| `config:save / config:load / config:test` | R ↔ M | Profils API |
| `agent:run` | R ↔ M | Envoyer message + tools |
| `agent:stream-chunk / end / error` | M → R | Streaming SSE |
| `agent:abort` | R → M | Stop génération |
| `tool:confirm / tool:confirmed` | M ↔ R | Confirmation action système |
| `conversation:save / list / delete` | R ↔ M | Persistance |

> Tableau complet (19 canaux) → `FEATURES_CLAUDE_UI.md` section 3

---

## Commandes utiles

```bash
# Développement
npm run electron:dev         # Lance Vite + Electron en parallèle

# Build
npm run electron:build       # Build renderer + package Electron

# Distribution
npm run dist:win             # .exe Windows (NSIS)
npm run dist:linux           # .AppImage Linux

# Debug renderer
# DevTools s'ouvre automatiquement en mode dev (detached)
```

---

## Instructions pour l'agent

```
1. Lire AGENTS_CLAUDE_UI.md → mémoriser toutes les variables CSS
2. Lire PROMPT_CLAUDE_UI.md → suivre l'ordre de génération section 11
3. Lire FEATURES_CLAUDE_UI.md → comprendre les 4 fonctionnalités et les 19 canaux IPC
4. Générer dans l'ordre : main.js → preload.js → index.css → TitleBar → Sidebar → ...
5. Proposer un diff à chaque composant — ne jamais générer tout d'un coup
6. Jamais de valeur CSS hardcodée — toujours var(--)
7. Jamais de nodeIntegration: true
8. Jamais d'accès Node.js depuis le renderer — tout passe par contextBridge
9. run_command et write_file : toujours passer par tool:confirm avant exécution
10. Mettre à jour l'historique ci-dessous après chaque session
```

---

## Historique des sessions

| Date | Session | Travail effectué | Statut |
|---|---|---|---|
| 2026-06-09 | #01 | Génération AGENTS + PROMPT + FEATURES + TERAX | ✅ Scaffold prêt |
| 2026-06-10 | #02 | Fix TitleBar Linux, recherche & renommage sidebar, implémentation complète F3 (10 actions système + Confirmation IPC + UI blocks) | ✅ F1-F4 100% Fonctionnels |

---

*@rokh / ohm.sh — TERAX.md — VIAP v1.1 — claude-desktop*
