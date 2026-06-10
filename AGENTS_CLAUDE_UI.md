# AGENTS_CLAUDE_UI.md
## Design System — Claude Desktop App (Dark)
> Extrait du template : Interface Claude.ai — sidebar + zone principale
> Mode : Electron Desktop
> Généré par VIAP v1.1 — @rokh / ohm.sh

---

## 1. Palette de couleurs

```css
:root {
  /* Fonds */
  --bg-sidebar:       #1a1a1a;   /* sidebar gauche */
  --bg-main:          #0d0d0d;   /* zone principale / fond global */
  --bg-input:         #1e1e1e;   /* zone de saisie */
  --bg-hover:         #252525;   /* état hover sur items sidebar */
  --bg-active:        #2a2a2a;   /* item sélectionné */
  --bg-badge:         #2e2e2e;   /* badges (ex: "Mettre à niveau") */

  /* Texte */
  --text-primary:     #e8e6e3;   /* texte principal */
  --text-secondary:   #8a8a8a;   /* labels, métadonnées */
  --text-muted:       #555555;   /* texte désactivé, séparateurs */
  --text-accent:      #cc785c;   /* accent chaud — couleur signature */

  /* Accents */
  --accent-primary:   #cc785c;   /* orange-brun chaud (logo, titres) */
  --accent-secondary: #e8956d;   /* variante plus claire hover */
  --accent-badge:     #3a2a20;   /* fond badge orange tenu */

  /* Bordures */
  --border-subtle:    #282828;   /* séparateurs entre zones */
  --border-input:     #333333;   /* contour zone de saisie */

  /* Titlebar */
  --titlebar-bg:      #1a1a1a;   /* identique sidebar */
  --titlebar-height:  38px;

  /* Sidebar */
  --sidebar-width:    280px;
  --sidebar-min:      220px;
  --sidebar-max:      340px;
}
```

---

## 2. Typographie

```css
/* Fonts à importer */
@import url('https://fonts.googleapis.com/css2?family=Tiempos+Headline:wght@400&family=Söhne:wght@300;400;500&display=swap');

/* Fallback si fonts propriétaires indisponibles */
/* Display : utiliser 'Playfair Display' ou 'DM Serif Display' */
/* Corps : utiliser 'DM Sans' ou 'Outfit' */

:root {
  /* Famille */
  --font-display: 'Tiempos Headline', 'Playfair Display', Georgia, serif;
  --font-body:    'Söhne', 'DM Sans', 'Outfit', sans-serif;

  /* Échelle */
  --text-xs:   11px;   /* métadonnées, timestamps */
  --text-sm:   12px;   /* items sidebar, badges */
  --text-base: 13px;   /* corps sidebar, labels nav */
  --text-md:   14px;   /* texte input, contenu principal */
  --text-lg:   16px;   /* titres de section */
  --text-xl:   22px;   /* sous-titres zone principale */
  --text-hero: 42px;   /* titre d'accueil "Steve est de retour !" */

  /* Poids */
  --fw-light:   300;
  --fw-regular: 400;
  --fw-medium:  500;

  /* Interlignage */
  --lh-tight:   1.2;
  --lh-base:    1.5;
  --lh-loose:   1.7;

  /* Règles de mélange */
  /* - Display serif : titres hero uniquement */
  /* - Sans-serif : tout le reste */
  /* - Jamais de serif dans la sidebar */
}
```

### Hiérarchie typographique

| Élément | Font | Taille | Poids | Couleur |
|---|---|---|---|---|
| Titre hero ("Steve est de retour !") | Display | 42px | 400 | `var(--text-primary)` |
| Logo "Claude" | Body | 16px | 500 | `var(--text-primary)` |
| Section label sidebar ("Favoris", "Récents") | Body | 11px | 500 | `var(--text-secondary)` uppercase |
| Item sidebar | Body | 13px | 400 | `var(--text-primary)` |
| Placeholder input | Body | 14px | 300 | `var(--text-secondary)` |
| Badge texte | Body | 11px | 500 | `var(--text-accent)` |
| Nom utilisateur | Body | 13px | 500 | `var(--text-primary)` |
| Sous-titre utilisateur | Body | 11px | 400 | `var(--text-secondary)` |

---

## 3. Espacement — Grille 8px

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Padding sidebar */
  --sidebar-px: var(--space-3);   /* 12px horizontal */
  --sidebar-py: var(--space-2);   /* 8px vertical items */

  /* Padding zone principale */
  --main-px:  var(--space-8);     /* 32px horizontal */
  --main-py:  var(--space-10);    /* 40px vertical */

  /* Border-radius */
  --radius-sm:  6px;    /* badges, boutons petits */
  --radius-md:  10px;   /* items sidebar hover */
  --radius-lg:  16px;   /* zone de saisie */
  --radius-xl:  24px;   /* boutons quick-action */
}
```

---

## 4. Layout général (Desktop)

```
┌──────────────────────────────────────────────────────────────┐
│ TITLEBAR [hauteur: 38px] [draggable] [boutons: droit/gauche] │
├────────────────────┬─────────────────────────────────────────┤
│                    │                                         │
│   SIDEBAR          │        ZONE PRINCIPALE                  │
│   280px fixe       │        flex-1                           │
│                    │                                         │
│   ┌─ Logo ──────┐  │    ┌─ Titre hero ─────────────────┐    │
│   ├─ Nav top ───┤  │    │  "X est de retour !"          │    │
│   ├─ Favoris ───┤  │    └──────────────────────────────┘    │
│   ├─ Récents ───┤  │                                         │
│   │  (scroll)   │  │    ┌─ Zone de saisie ──────────────┐   │
│   └─ User ──────┘  │    │  [+] Placeholder    [🎤] [📊] │   │
│                    │    └──────────────────────────────┘    │
│                    │                                         │
│                    │    ┌─ Quick actions ───────────────┐   │
│                    │    │  [Écrire] [Apprendre] [Code]   │   │
│                    │    └──────────────────────────────┘    │
│                    │                                         │
└────────────────────┴─────────────────────────────────────────┘
```

### Contraintes de fenêtre

```js
// Dans electron/main.js
{
  width:     1280,
  height:    800,
  minWidth:  900,
  minHeight: 600,
  frame:     false,        // titlebar custom
  titleBarStyle: 'hidden', // macOS
}
```

---

## 5. Composants — Documentation par zone

### 5.1 TitleBar Custom

```css
.titlebar {
  height: var(--titlebar-height);  /* 38px */
  background: var(--titlebar-bg);
  -webkit-app-region: drag;        /* zone draggable */
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
}

.titlebar__controls {
  -webkit-app-region: no-drag;     /* boutons non-draggables */
  display: flex;
  gap: var(--space-2);
}

/* Boutons macOS-style ou custom Windows */
.titlebar__btn {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
}
.titlebar__btn--close    { background: #ff5f57; }
.titlebar__btn--minimize { background: #ffbd2e; }
.titlebar__btn--maximize { background: #28c840; }
```

---

### 5.2 Sidebar

```css
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-min);
  max-width: var(--sidebar-max);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

/* Header sidebar : logo + icônes */
.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--sidebar-px);
  height: 52px;
}

.sidebar__logo {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  font-weight: var(--fw-medium);
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

/* Bouton "Nouvelle conversation" */
.sidebar__new-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--sidebar-px);
  color: var(--text-secondary);
  font-size: var(--text-base);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.sidebar__new-btn:hover,
.sidebar__new-btn:focus-visible {
  background: var(--bg-hover);
  color: var(--text-primary);
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
}

/* Section label */
.sidebar__section-label {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: var(--space-4) var(--sidebar-px) var(--space-1);
}

/* Item de conversation */
.sidebar__item {
  padding: var(--space-2) var(--sidebar-px);
  font-size: var(--text-base);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.12s ease;
}
.sidebar__item:hover        { background: var(--bg-hover); }
.sidebar__item:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
}
.sidebar__item--active { background: var(--bg-active); }

/* Badge inline (ex: "Mettre à niveau") */
.sidebar__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: var(--accent-badge);
  color: var(--accent-primary);
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent-primary);
}

/* Zone scrollable des items */
.sidebar__scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 var(--space-1);
  scrollbar-width: thin;
  scrollbar-color: var(--bg-hover) transparent;
}
.sidebar__scroll::-webkit-scrollbar       { width: 4px; }
.sidebar__scroll::-webkit-scrollbar-thumb { 
  background: var(--bg-hover);
  border-radius: 2px;
}

/* Footer utilisateur */
.sidebar__user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--sidebar-px);
  border-top: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background 0.12s ease;
}
.sidebar__user:hover { background: var(--bg-hover); }

.sidebar__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  color: white;
  flex-shrink: 0;
}

.sidebar__user-name    { font-size: var(--text-base); font-weight: var(--fw-medium); }
.sidebar__user-plan    { font-size: var(--text-xs); color: var(--text-secondary); }
```

---

### 5.3 Zone Principale — État Vide (Welcome)

```css
.main {
  flex: 1;
  background: var(--bg-main);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--main-py) var(--main-px);
  gap: var(--space-8);
}

/* Titre hero */
.main__hero {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-hero);
  font-weight: var(--fw-regular);
  color: var(--text-primary);
  letter-spacing: -1px;
  line-height: var(--lh-tight);
}

.main__hero-icon {
  color: var(--accent-primary);
  font-size: 38px;  /* astérisque / logo */
}

/* Zone de saisie */
.input-zone {
  width: 100%;
  max-width: 680px;
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.input-zone__field {
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-body);
  font-size: var(--text-md);
  font-weight: var(--fw-light);
  color: var(--text-primary);
  resize: none;
  min-height: 44px;
  caret-color: var(--accent-primary);
}
.input-zone__field::placeholder { color: var(--text-secondary); }

.input-zone__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.input-zone__attach {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-input);
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}
.input-zone__attach:hover { border-color: var(--accent-primary); color: var(--accent-primary); }

.input-zone__model {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
}

/* Quick actions */
.quick-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: center;
  max-width: 680px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-xl);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.quick-action-btn:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
  background: var(--bg-hover);
}
.quick-action-btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

---

## 6. États clavier (focus management desktop)

```css
/* Règle globale : jamais de focus ring browser par défaut */
* { outline: none; }

/* Focus visible uniquement au clavier (pas au clic) */
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Exceptions par composant (voir ci-dessus) */
```

**Raccourcis clavier à implémenter via IPC :**

| Raccourci | Action |
|---|---|
| `Ctrl+N` | Nouvelle conversation |
| `Ctrl+K` | Recherche dans les discussions |
| `Ctrl+,` | Ouvrir les paramètres |
| `Ctrl+W` | Fermer la fenêtre |
| `Ctrl+M` | Minimize |
| `Escape` | Annuler / fermer modal |
| `Tab` | Navigation sidebar → input → actions |

---

## 7. Effets visuels & animations

```css
/* Apparition sidebar items au chargement */
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}

.sidebar__item {
  animation: fadeSlideIn 0.2s ease forwards;
}
.sidebar__item:nth-child(1) { animation-delay: 0.05s; }
.sidebar__item:nth-child(2) { animation-delay: 0.08s; }
.sidebar__item:nth-child(3) { animation-delay: 0.11s; }
/* etc. — jusqu'à 10 items */

/* Hero title reveal */
@keyframes heroReveal {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.main__hero {
  animation: heroReveal 0.4s ease 0.1s both;
}

.input-zone {
  animation: heroReveal 0.4s ease 0.2s both;
}

.quick-actions {
  animation: heroReveal 0.4s ease 0.3s both;
}

/* Transition sidebar collapse (optionnel) */
.sidebar {
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 8. Patterns UI natifs à simuler

| Comportement natif | Solution CSS/Electron |
|---|---|
| Fenêtre draggable | `-webkit-app-region: drag` sur titlebar |
| Boutons de contrôle fenêtre | `ipcRenderer.send('window:close/minimize/maximize')` |
| Scrollbar système | `scrollbar-width: thin` + custom webkit |
| Menu contextuel clic droit | `ipcMain.handle` + `Menu.buildFromTemplate` |
| Raccourcis globaux | `globalShortcut.register` dans main.js |
| Tray icon | `new Tray(iconPath)` dans main.js |
| Auto-resize textarea | `rows` dynamique via JS |
| Tooltip natif | `title=""` ou composant custom (éviter le natif) |

---

## 9. Tokens JSON (Tailwind / Figma)

```json
{
  "color": {
    "bg": {
      "sidebar":  "#1a1a1a",
      "main":     "#0d0d0d",
      "input":    "#1e1e1e",
      "hover":    "#252525",
      "active":   "#2a2a2a"
    },
    "text": {
      "primary":   "#e8e6e3",
      "secondary": "#8a8a8a",
      "muted":     "#555555",
      "accent":    "#cc785c"
    },
    "accent": {
      "primary":   "#cc785c",
      "secondary": "#e8956d",
      "badge":     "#3a2a20"
    },
    "border": {
      "subtle": "#282828",
      "input":  "#333333"
    }
  },
  "spacing": {
    "1": "4px",  "2": "8px",  "3": "12px", "4": "16px",
    "5": "20px", "6": "24px", "8": "32px", "10": "40px"
  },
  "radius": {
    "sm": "6px", "md": "10px", "lg": "16px", "xl": "24px"
  },
  "font": {
    "display": "Tiempos Headline, Playfair Display, Georgia, serif",
    "body":    "Söhne, DM Sans, Outfit, sans-serif"
  }
}
```

---

## 10. Checklist de cohérence

Avant de livrer, vérifier :

```
[ ] Fond principal #0d0d0d — pas de blanc ou gris clair parasite
[ ] Accent orange #cc785c présent uniquement : logo, focus rings, badges
[ ] Pas de valeur CSS hardcodée — tout en variables
[ ] Focus visible au clavier sur TOUS les éléments interactifs
[ ] -webkit-app-region: drag sur titlebar, no-drag sur boutons
[ ] Scrollbar customisée dans la sidebar (pas la scrollbar système)
[ ] Fonts chargées avec font-display: swap
[ ] minWidth 900px respecté — tester à 900px
[ ] Animations désactivées si prefers-reduced-motion
[ ] Contenu sidebar tronqué avec text-overflow: ellipsis
[ ] Avatar utilisateur avec initiales fallback
[ ] Aucun lorem ipsum dans le livrable
```

```css
/* Accessibilité mouvement */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

*@rokh / ohm.sh — AGENTS_CLAUDE_UI.md — VIAP v1.1*
