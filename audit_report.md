# 🔍 Audit Complet — Projet ARIA

Audit réalisé sur l'ensemble du code source (frontend React + backend Electron).
**18 fichiers analysés**, couvrant sécurité, bugs, performance, accessibilité et fonctionnalités manquantes.

---

## Tableau de Synthèse

| Sévérité | Nombre | Catégories principales |
|----------|--------|------------------------|
| 🔴 CRITIQUE | 8 | XSS, exécution shell non sandboxée, violation Rules of Hooks, UI manquante |
| 🟠 ÉLEVÉ | 10 | Closures obsolètes, corruption de config, fuites mémoire, path traversal |
| 🟡 MOYEN | 15 | `alert()`/`confirm()` bloqués en prod, listeners non nettoyés, accessibilité |
| 🔵 FAIBLE | 8 | Code mort, imports inutilisés, qualité de code |

---

## 🔴 Bugs CRITIQUES

### 1. XSS via contenu IA dans ArtifactsPanel

> [!CAUTION]
> Le contenu généré par l'IA est injecté directement dans le DOM sans sanitization.

- [ArtifactsPanel.jsx:L84](file:///home/rokh/Téléchargements/aether_app/src/components/ArtifactsPanel.jsx#L84) — `dangerouslySetInnerHTML={{ __html: artifact.content }}` pour le rendu SVG. Un SVG malveillant avec `<script>` ou `onload=` exécute du JS arbitraire dans le renderer Electron.
- [ArtifactsPanel.jsx:L90-101](file:///home/rokh/Téléchargements/aether_app/src/components/ArtifactsPanel.jsx#L90-L101) — L'iframe HTML n'a pas d'attribut `sandbox`, autorisant le scripting complet.

**Fix proposé** : Utiliser `DOMPurify.sanitize()` pour le SVG, et ajouter `sandbox="allow-scripts"` sur l'iframe (ou mieux, `sandbox=""` sans permissions).

---

### 2. Exécution de commandes shell sans sandboxing

> [!CAUTION]
> Un LLM malveillant pourrait exécuter `rm -rf ~` avec un seul clic de confirmation.

- [tools/index.js:L106-114](file:///home/rokh/Téléchargements/aether_app/electron/tools/index.js#L106-L114) — `exec()` sans timeout, sans limite de taille de sortie, sans restriction de répertoire. Le `cwd` est le home directory.
- Le tool `run_command` **contourne complètement** `getSafePath` utilisé par les autres outils.

**Fix proposé** : Ajouter `timeout: 30000`, `maxBuffer: 5 * 1024 * 1024`, un `cwd` restreint aux dossiers whitelistés, et un filtrage des commandes dangereuses.

---

### 3. Path traversal via symlinks

- [tools/index.js:L24-38](file:///home/rokh/Téléchargements/aether_app/electron/tools/index.js#L24-L38) — `path.resolve()` ne résout pas les symlinks. Un lien symbolique dans `~/` pointant vers `/etc/passwd` passe la vérification `startsWith(homeDir)`.

**Fix proposé** : Utiliser `fs.realpathSync()` avant la vérification.

---

### 4. Violation des Rules of Hooks dans TitleBar

- [TitleBar.jsx:L8-12](file:///home/rokh/Téléchargements/aether_app/src/components/TitleBar.jsx#L8-L12) — Un `return` conditionnel (`if (focusMode)`) est placé **avant** un `useEffect`. React exige que les hooks soient appelés dans le même ordre à chaque render.

**Fix proposé** : Déplacer le `useEffect` avant le `return` conditionnel, ou restructurer le composant.

---

### 5. Auto-génération de titre qui ne se déclenche jamais

- [App.jsx:L65](file:///home/rokh/Téléchargements/aether_app/src/App.jsx#L65) — `startNewConversation` met `activeConvId` à `Date.now()`, donc l'ID est toujours truthy.
- [MainArea.jsx:L117](file:///home/rokh/Téléchargements/aether_app/src/components/MainArea.jsx#L117) — La condition `if (!activeConvId)` pour générer le titre est **toujours fausse**.

**Fix proposé** : Utiliser `null` pour les nouvelles conversations et n'attribuer un ID qu'au premier enregistrement.

---

### 6. UI d'édition de message complètement manquante

- [ChatMessage.jsx:L253-255](file:///home/rokh/Téléchargements/aether_app/src/components/ChatMessage.jsx#L253-L255) — Le double-clic met `isEditing=true`, mais le rendu de l'état d'édition est vide (commentaire `// ... (code existant)` sans implémentation).

---

### 7. Sandbox Chromium désactivé

- [main.js:L42](file:///home/rokh/Téléchargements/aether_app/electron/main.js#L42) — `sandbox: false` affaiblit l'isolation des processus.

---

### 8. Rendu des citations non fonctionnel

- [ChatMessage.jsx:L244](file:///home/rokh/Téléchargements/aether_app/src/components/ChatMessage.jsx#L244) — Le mapping `text: ({ value }) => ...` n'existe pas dans ReactMarkdown v6+. Les citations `[^n]` ne s'affichent jamais.

---

## 🟠 Bugs ÉLEVÉS

### 9. Closures obsolètes dans les event listeners (MainArea)
- [MainArea.jsx:L154-164](file:///home/rokh/Téléchargements/aether_app/src/components/MainArea.jsx#L154-L164) — `handleChunk`, `handleEnd`, `handleError` capturent des valeurs obsolètes de `messages`, `systemPrompt`, `activeConvId`. Si la conversation change pendant un stream, les données sont sauvegardées dans la mauvaise conversation.

### 10. `saveConfig(profile)` corrompt potentiellement la config
- [SettingsModal.jsx:L49](file:///home/rokh/Téléchargements/aether_app/src/components/SettingsModal.jsx#L49) — Sauvegarde un objet **profil** via `saveConfig`, qui attend un objet **config complet**. Risque d'écraser toute la configuration.

### 11. Crash sur fenêtre détruite (null window)
- [main.js:L83, L329-336](file:///home/rokh/Téléchargements/aether_app/electron/main.js#L83) — `BrowserWindow.fromWebContents(event.sender)` peut retourner `null`. Aucune vérification avant `win.webContents.send(...)`.
- [window.js:L5-13](file:///home/rokh/Téléchargements/aether_app/electron/ipc/window.js#L5-L13) — Même problème pour minimize/maximize/close.

### 12. Fuite mémoire : `pendingConfirmations`
- [main.js:L65-71](file:///home/rokh/Téléchargements/aether_app/electron/main.js#L65-L71) — Si l'utilisateur ne répond jamais (ou ferme la fenêtre), la Promise n'est jamais résolue et la Map grossit indéfiniment.

### 13. Pas de bouton de stop pour le 2ème appel API
- [main.js:L268-315](file:///home/rokh/Téléchargements/aether_app/electron/main.js#L268-L315) — Le second `fetch()` (post-tools) n'a ni `AbortController`, ni timeout. Impossible à annuler.

### 14. Boutons imbriqués invalides (ProfileMenu)
- [ProfileMenu.jsx:L57-62](file:///home/rokh/Téléchargements/aether_app/src/components/ProfileMenu.jsx#L57-L62) — `<button>` dans `<button>` = HTML invalide, comportement non défini.

### 15. Pièces jointes non-images traitées comme des images
- [InputZone.jsx:L177-185](file:///home/rokh/Téléchargements/aether_app/src/components/InputZone.jsx#L177-L185) — Tous les fichiers joints sont envoyés comme `image_url`, même les PDF ou fichiers texte.

### 16. Corruption SSE sur découpe multi-octets
- [main.js:L177-184](file:///home/rokh/Téléchargements/aether_app/electron/main.js#L177-L184) — `TextDecoder` sans `{stream: true}` → caractères UTF-8 multi-octets corrompus quand ils sont découpés entre deux chunks.

### 17. Double appel `onRename` (SidebarItem)
- [SidebarItem.jsx:L31-36](file:///home/rokh/Téléchargements/aether_app/src/components/SidebarItem.jsx#L31-L36) — Enter → `onRename()` + `setIsEditing(false)` → blur se déclenche → `onRename()` à nouveau.

### 18. `run_command` affiche la mauvaise icône (ToolCallBlock)
- [ToolCallBlock.jsx:L25-26](file:///home/rokh/Téléchargements/aether_app/src/components/ToolCallBlock.jsx#L25-L26) — Le `case 'run_command'` tombe dans `case 'read_file'`, affichant `<FileText>` au lieu de `<Terminal>`.

---

## 🟡 Bugs MOYENS

| # | Fichier | Problème |
|---|---------|----------|
| 19 | [SettingsModal.jsx:L34,66,72](file:///home/rokh/Téléchargements/aether_app/src/components/SettingsModal.jsx#L34) | `confirm()`/`alert()` bloqués en Electron production |
| 20 | [ProfileMenu.jsx:L20](file:///home/rokh/Téléchargements/aether_app/src/components/ProfileMenu.jsx#L20) | Même problème `confirm()` |
| 21 | [Sidebar.jsx:L38](file:///home/rokh/Téléchargements/aether_app/src/components/Sidebar.jsx#L38) | Listener `onShortcut` jamais nettoyé → fuite mémoire |
| 22 | [App.jsx:L31](file:///home/rokh/Téléchargements/aether_app/src/App.jsx#L31) | Listener `shortcut:new-conversation` jamais nettoyé |
| 23 | [MainArea.jsx:L32-36](file:///home/rokh/Téléchargements/aether_app/src/components/MainArea.jsx#L32-L36) | Auto-scroll : closure obsolète sur `showScrollBottom` |
| 24 | [MainArea.jsx:L395-445](file:///home/rokh/Téléchargements/aether_app/src/components/MainArea.jsx#L395-L445) | Index de tableau comme `key` React → glitches visuels |
| 25 | [InputZone.jsx:L123](file:///home/rokh/Téléchargements/aether_app/src/components/InputZone.jsx#L123) | Menu commandes ne s'affiche que pour `/` exact, pas `/s` |
| 26 | [config.js:L61](file:///home/rokh/Téléchargements/aether_app/electron/ipc/config.js#L61) | HTTP 400 traité comme succès dans le test de connexion |
| 27 | [conversations.js:L109-110](file:///home/rokh/Téléchargements/aether_app/electron/ipc/conversations.js#L109-L110) | `generate-title` envoie TOUS les messages → gaspille des tokens |
| 28 | [tools/index.js:L144-148](file:///home/rokh/Téléchargements/aether_app/electron/tools/index.js#L144-L148) | Validation URL faible : `httpxyz://` passerait le filtre |
| 29 | [tools/index.js:L121-129](file:///home/rokh/Téléchargements/aether_app/electron/tools/index.js#L121-L129) | `write_file` crée des fichiers sans confirmation (risque sur `~/.bashrc`) |
| 30 | Tous les modals | Pas de focus trap, pas de `role="dialog"`, pas de fermeture par `Escape` |
| 31 | [ToolCallBlock.jsx:L96](file:///home/rokh/Téléchargements/aether_app/src/components/ToolCallBlock.jsx#L96) | `{index && (...)}` rend `0` en texte quand index vaut 0 |
| 32 | [OnboardingScreen.jsx:L18](file:///home/rokh/Téléchargements/aether_app/src/components/OnboardingScreen.jsx#L18) | Pas de try/catch sur `testConfig` → UI bloquée en état `'testing'` |
| 33 | [main.js:L185-219](file:///home/rokh/Téléchargements/aether_app/electron/main.js#L185-L219) | Ligne SSE découpée entre deux chunks → JSON parse échoue silencieusement |

---

## 🚀 Propositions d'Améliorations Fonctionnelles

### Architecture & Robustesse

| Priorité | Proposition | Impact |
|----------|-------------|--------|
| 🔴 | **Boucle multi-turn tool calling** — Actuellement, un seul round de tool calls est supporté. Si la 2ème réponse demande d'autres outils, ils sont ignorés. | Fiabilité IA |
| 🔴 | **Gestion d'état centralisée (Zustand)** — `MainArea` reçoit 18 props. Utiliser un store global réduirait le prop drilling et les bugs de synchronisation. | Maintenabilité |
| 🟠 | **Retry avec backoff exponentiel** — Les erreurs API sont immédiatement propagées sans retry. | Résilience |
| 🟠 | **Rate limiting** — Aucune protection contre le spam de messages vers l'API. | Stabilité |
| 🟠 | **Pagination des conversations** — `conversation:list` charge tout en mémoire. Problématique après 100+ conversations. | Performance |

### Fonctionnalités Manquantes

| Priorité | Proposition | Détail |
|----------|-------------|--------|
| 🔴 | **Implémentation réelle de l'édition de messages** | Le double-clic est câblé mais la UI est vide. Ajouter un textarea inline avec sauvegarde. |
| 🟠 | **Import de conversations** | L'export en `.md` existe, mais aucun import. Permettre de réimporter un `.md` ou du JSON. |
| 🟠 | **Outils `delete_file`, `move_file`, `append_file`** | Seuls `read_file` et `write_file` existent. |
| 🟠 | **Vérification de taille avant `read_file`** | Un fichier de plusieurs GB crasherait le processus avec un OOM. |
| 🟠 | **Suppression en lot de conversations** | Pas de bulk delete dans la sidebar. |
| 🟠 | **Système de notifications in-app** | Remplacer les `alert()`/`confirm()` natifs par des modals custom (qui fonctionnent aussi en prod Electron). |
| 🟡 | **Auto-update (Electron)** | Aucune configuration `publish` dans `electron-builder.yml`. Les utilisateurs doivent re-télécharger manuellement. |
| 🟡 | **Targets Linux supplémentaires** | Uniquement AppImage. Ajouter `.deb`, `.snap` ou `.flatpak`. |
| 🟡 | **Téléchargement/sauvegarde d'artifacts** | L'icône `Download` est importée dans `ArtifactsPanel` mais jamais utilisée. |
| 🟡 | **Handler macOS `activate`** | Cliquer sur l'icône dock sans fenêtre ouverte devrait recréer la fenêtre. |

### UX & Accessibilité

| Priorité | Proposition | Détail |
|----------|-------------|--------|
| 🟠 | **Focus trap dans tous les modals** | `ConfirmModal`, `SettingsModal` : le focus n'est pas piégé, l'utilisateur peut tabuler vers les éléments derrière. |
| 🟠 | **Attributs ARIA sur les modals** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`. |
| 🟠 | **Fermeture par `Escape`** | Aucun modal ne se ferme avec la touche Escape. |
| 🟡 | **`aria-label` explicite sur le textarea** | Le placeholder seul n'est pas un nom accessible fiable. |
| 🟡 | **Alternatives clavier au double-clic** | L'édition de message et le renommage de conversation n'ont aucun équivalent clavier. |

### Performance

| Priorité | Proposition | Détail |
|----------|-------------|--------|
| 🟠 | **Mémoiser `markdownComponents`** | [ChatMessage.jsx:L77](file:///home/rokh/Téléchargements/aether_app/src/components/ChatMessage.jsx#L77) — Créé à chaque render, forçant ReactMarkdown à un re-render complet. Utiliser `useMemo`. |
| 🟡 | **Sidebar : masquer via CSS plutôt que démonter** | [App.jsx:L141-156](file:///home/rokh/Téléchargements/aether_app/src/App.jsx#L141-L156) — Chaque toggle détruit/recrée l'arbre complet de la sidebar. |
| 🟡 | **Clés React stables sur les messages** | Utiliser un ID unique par message plutôt que l'index du tableau. |

---

## 📋 Plan de Priorisation Recommandé

### Phase 1 — Sécurité & Crashes (Urgent)
1. Sanitizer `dangerouslySetInnerHTML` dans `ArtifactsPanel` (DOMPurify)
2. Ajouter timeout + restrictions à `run_command`
3. Corriger `getSafePath` avec `fs.realpathSync()`
4. Ajouter des null checks sur `BrowserWindow.fromWebContents()`
5. Corriger la violation Rules of Hooks dans `TitleBar`

### Phase 2 — Bugs Fonctionnels (Important)
6. Corriger la logique d'auto-titre (`activeConvId` = null pour les nouvelles conv.)
7. Implémenter l'UI d'édition de message
8. Corriger les closures obsolètes dans `MainArea` (event listeners)
9. Corriger le type des pièces jointes dans `InputZone`
10. Remplacer `alert()`/`confirm()` par des modals custom

### Phase 3 — Améliorations (Recommandé)
11. Boucle multi-turn tool calling
12. Migration vers Zustand pour l'état global
13. Focus trap + ARIA dans les modals
14. Retry API avec backoff exponentiel
15. Pagination des conversations
