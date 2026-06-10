# PROMPT_CLAUDE_UI.md
## Instructions de génération — Claude Desktop App (Dark)
> Mode : Electron Desktop
> Stack : React 19 + Vite + Tailwind CSS v3 + Electron
> Généré par VIAP v1.1 — @rokh / ohm.sh

---

## 1. Identité du projet

**Nom** : Claude Desktop UI Clone
**Type** : Application desktop — interface de chat IA
**Cible** : App locale, usage personnel / démonstration freelance
**Référence visuelle** : Interface Claude.ai (dark theme)
**Design system** : `AGENTS_CLAUDE_UI.md`

---

## 2. Stack technique

```
Renderer  →  React 19 + Vite 5 + Tailwind CSS v3
Main      →  Electron (Node.js) — BrowserWindow, ipcMain, Menu
Preload   →  contextBridge — pont sécurisé main ↔ renderer
Build     →  electron-builder
Icônes    →  lucide-react
Fonts     →  Google Fonts (Playfair Display + DM Sans)
```

**Dépendances exactes à installer** :
```bash
npm create vite@latest claude-desktop -- --template react
cd claude-desktop
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install lucide-react
npm install --save-dev electron electron-builder concurrently cross-env wait-on
```

---

## 3. Structure de fichiers à générer

```
claude-desktop/
├── electron/
│   ├── main.js          ← BrowserWindow, ipcMain, menus, shortcuts
│   └── preload.js       ← contextBridge, API exposée au renderer
├── src/
│   ├── main.jsx         ← ReactDOM.createRoot
│   ├── App.jsx          ← Layout racine : TitleBar + Sidebar + Main
│   ├── index.css        ← Variables CSS globales + reset
│   └── components/
│       ├── TitleBar.jsx         ← Barre de titre custom (frame:false)
│       ├── Sidebar.jsx          ← Sidebar gauche complète
│       ├── SidebarItem.jsx      ← Item de conversation (réutilisable)
│       ├── MainArea.jsx         ← Zone principale (welcome state)
│       ├── InputZone.jsx        ← Zone de saisie avec toolbar
│       └── QuickActions.jsx     ← Boutons d'action rapide
├── public/
│   └── icon.png
├── package.json
├── vite.config.js
├── tailwind.config.js
├── electron-builder.yml
├── TERAX.md
├── AGENTS_CLAUDE_UI.md
└── PROMPT_CLAUDE_UI.md
```

---

## 4. Design system — Variables CSS clés

Coller dans `src/index.css` **avant** les directives Tailwind :

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=DM+Sans:wght@300;400;500&display=swap');

:root {
  --bg-sidebar:      #1a1a1a;
  --bg-main:         #0d0d0d;
  --bg-input:        #1e1e1e;
  --bg-hover:        #252525;
  --bg-active:       #2a2a2a;
  --bg-badge:        #3a2a20;

  --text-primary:    #e8e6e3;
  --text-secondary:  #8a8a8a;
  --text-muted:      #555555;
  --text-accent:     #cc785c;

  --accent-primary:  #cc785c;
  --accent-hover:    #e8956d;

  --border-subtle:   #282828;
  --border-input:    #333333;

  --font-display:    'Playfair Display', Georgia, serif;
  --font-body:       'DM Sans', sans-serif;

  --titlebar-height: 38px;
  --sidebar-width:   280px;
  --radius-sm:       6px;
  --radius-md:       10px;
  --radius-lg:       16px;
  --radius-xl:       24px;
}

* { margin: 0; padding: 0; box-sizing: border-box; outline: none; }
body { 
  background: var(--bg-main); 
  color: var(--text-primary);
  font-family: var(--font-body);
  overflow: hidden;            /* desktop : pas de scroll global */
  user-select: none;           /* comportement natif desktop */
}
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. Configuration Electron

### `electron/main.js` — à générer avec exactement ce comportement :

```js
const { app, BrowserWindow, ipcMain, globalShortcut, shell } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'

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

// IPC — contrôles fenêtre
ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender).minimize())
ipcMain.on('window:maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  win.isMaximized() ? win.unmaximize() : win.maximize()
})
ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender).close())

// IPC — état fenêtre (pour le bouton maximize)
ipcMain.handle('window:isMaximized', (e) => 
  BrowserWindow.fromWebContents(e.sender).isMaximized()
)

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
```

### `electron/preload.js` — à générer avec exactement ces APIs :

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Contrôles fenêtre
  minimize:      () => ipcRenderer.send('window:minimize'),
  maximize:      () => ipcRenderer.send('window:maximize'),
  close:         () => ipcRenderer.send('window:close'),
  isMaximized:   () => ipcRenderer.invoke('window:isMaximized'),

  // Écouter les raccourcis depuis main
  onShortcut: (channel, callback) => {
    const validChannels = ['shortcut:new-conversation', 'shortcut:search']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },

  // Infos plateforme (pour adapter les boutons titlebar)
  platform: process.platform
})
```

---

## 6. Canaux IPC — tableau de référence

| Canal | Direction | Déclencheur | Action |
|---|---|---|---|
| `window:minimize` | renderer → main | Clic bouton minimize | `win.minimize()` |
| `window:maximize` | renderer → main | Clic bouton maximize | `win.maximize/unmaximize()` |
| `window:close` | renderer → main | Clic bouton close | `win.close()` |
| `window:isMaximized` | renderer ↔ main | Au montage TitleBar | Retourne boolean |
| `shortcut:new-conversation` | main → renderer | Ctrl+N | Vider la conversation active |
| `shortcut:search` | main → renderer | Ctrl+K | Focus barre de recherche |

---

## 7. Composants — comportement attendu

### `TitleBar.jsx`
- Hauteur `38px`, fond `var(--bg-sidebar)`, `-webkit-app-region: drag`
- Boutons de contrôle à **gauche** (style macOS) : close `#ff5f57`, minimize `#ffbd2e`, maximize `#28c840`
- Sur Windows (`platform === 'win32'`) : boutons à droite, style rectangulaire
- Boutons en `-webkit-app-region: no-drag`
- État maximize : icône bascule entre Maximize et Restore

### `Sidebar.jsx`
- Largeur fixe `var(--sidebar-width)` = 280px
- Header : logo "Claude" (texte, pas image) + icônes Search + Toggle sidebar
- Navigation : `+ Nouvelle conversation`, `Discussions`, `Projets`, `Artéfacts`, `Code` (avec badge "Mettre à niveau"), `Personnaliser`
- Section "Favoris" avec 3 items de démo
- Section "Récents" avec tri, 8 items de démo tronqués à 1 ligne
- Footer : avatar initiales "SK", nom "Steve Kouadio", plan "Forfait Free", icônes download + chevron
- Scroll interne uniquement sur la zone des items (pas la sidebar entière)
- Scrollbar custom webkit fine (4px)

### `MainArea.jsx`
- Centré verticalement et horizontalement
- Titre hero : icône astérisque `var(--accent-primary)` + "Steve est de retour !" en `var(--font-display)` 42px
- `InputZone` en dessous
- `QuickActions` en dessous de l'input
- Animations d'apparition staggered (voir AGENTS.md section 7)

### `InputZone.jsx`
- Textarea auto-resize (min 1 ligne, max 5 lignes)
- Toolbar bas : bouton `+` (attach), texte "Sonnet 4.6" + "Faible" (chevron), icônes micro + barres audio
- Fond `var(--bg-input)`, border `var(--border-input)`, radius `var(--radius-lg)`
- Caret color `var(--accent-primary)`
- `user-select: text` (exception au `user-select: none` global)

### `QuickActions.jsx`
- 5 boutons pill : `✏️ Écrire`, `🎓 Apprendre`, `</> Code`, `☕ Vie quotidienne`, `🔷 Depuis Drive`
- Border `var(--border-input)`, radius `var(--radius-xl)`
- Hover : border s'éclaircit, fond `var(--bg-hover)`, texte `var(--text-primary)`

---

## 8. Configuration Vite + Tailwind

### `vite.config.js`
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',   // OBLIGATOIRE pour Electron (chemins relatifs)
  server: { port: 5173 }
})
```

### `tailwind.config.js`
```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sidebar:  '#1a1a1a',
        main:     '#0d0d0d',
        accent:   '#cc785c',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body:    ['DM Sans', 'sans-serif'],
      }
    }
  },
  plugins: []
}
```

### `package.json` — scripts à inclure
```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev":            "vite",
    "build":          "vite build",
    "electron:dev":   "concurrently \"vite\" \"wait-on http://localhost:5173 && cross-env NODE_ENV=development electron .\"",
    "electron:build": "npm run build && electron-builder",
    "dist:win":       "npm run build && electron-builder --win",
    "dist:linux":     "npm run build && electron-builder --linux"
  }
}
```

---

## 9. `electron-builder.yml`

```yaml
appId: sh.ohm.claudedesktop
productName: Claude Desktop
copyright: "@rokh / ohm.sh"
directories:
  output: dist-electron
files:
  - dist/**
  - electron/**
  - package.json
win:
  target: nsis
  icon: public/icon.ico
linux:
  target: AppImage
  icon: public/icon.png
mac:
  target: dmg
  icon: public/icon.icns
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

---

## 10. Contraintes négatives — ce qu'il ne faut PAS faire

```
✗ Pas de valeur CSS hardcodée — toujours var(--...)
✗ Pas de nodeIntegration: true dans BrowserWindow
✗ Pas d'appel Node.js direct depuis le renderer (fs, path...)
✗ Pas de lorem ipsum dans le contenu livré
✗ Pas de fond blanc ou clair dans l'UI — tout reste dark
✗ Pas de Inter, Roboto, Arial — uniquement Playfair Display + DM Sans
✗ Pas de scroll global sur body — chaque zone scrolle indépendamment
✗ Pas de border-radius > 24px
✗ Pas de couleur vive hors de --accent-primary (#cc785c)
✗ Pas d'image placeholder — utiliser des initiales pour les avatars
✗ Pas de génération tout-en-un — générer composant par composant
```

---

## 11. Ordre de génération recommandé pour Terax

```
1. electron/main.js + electron/preload.js
2. package.json (scripts) + vite.config.js + tailwind.config.js
3. src/index.css (variables CSS + reset)
4. src/components/TitleBar.jsx
5. src/components/SidebarItem.jsx
6. src/components/Sidebar.jsx
7. src/components/QuickActions.jsx
8. src/components/InputZone.jsx
9. src/components/MainArea.jsx
10. src/App.jsx (assemblage final)
11. src/main.jsx
12. electron-builder.yml
```

---

## 12. Prompt court — variante Cursor / Copilot

```
Dark Electron desktop app. React 19 + Vite + Tailwind + Electron.
Frame:false, titlebar custom 38px draggable. Sidebar 280px fixed dark
(#1a1a1a) + main area (#0d0d0d). Accent orange-brown #cc785c.
Fonts: Playfair Display (hero) + DM Sans (rest). IPC: minimize,
maximize, close. Welcome screen with staggered fade-in animations.
No hardcoded CSS values — CSS variables only. See AGENTS_CLAUDE_UI.md.
```

---

## 13. Prompt court — variante v0.dev

```
Build a dark Electron-style desktop app UI with React and Tailwind.
Fixed sidebar 280px with conversation list, scrollable items, user
footer with avatar initials. Main area centered welcome screen with
serif display title and chat input zone. Color scheme: bg #0d0d0d,
sidebar #1a1a1a, accent #cc785c. Custom titlebar 38px with traffic
light buttons. Fonts: Playfair Display + DM Sans.
```

---

*@rokh / ohm.sh — PROMPT_CLAUDE_UI.md — VIAP v1.1*
