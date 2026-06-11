# ARIA - Fonctionnalités Implémentées

ARIA est un agent d'interaction et de recherche IA de bureau, conçu pour la productivité et l'accès sécurisé au système.

## 1. Intelligence & Interaction
- **Chat Streaming (SSE)** : Réponse token par token pour une réactivité immédiate.
- **Support Multi-Modèle** : Détection automatique des modèles disponibles sur freellmapi et switch dynamique via l'interface.
- **Rendu Avancé** : Support Markdown complet (ReactMarkdown) avec coloration syntaxique haute performance (Shiki).
- **Historique** : Persistance automatique de toutes les conversations via Zustand et `electron-store`.

## 2. Système & Outils (Tool Calling)
- **Gestion des Fichiers** : Lecture, écriture et exploration de répertoires locale.
- **Shell Tool** : Exécution de commandes bash (`run_command`) avec retour `stdout/stderr` intégré.
- **Analyse de Contexte Projet** : Analyse globale de la structure d'un dossier projet (fichiers clés, architecture).
- **Intégration Presse-papiers** : Accès direct à la lecture/écriture du clipboard.
- **Sécurité (Permission Manager)** : Système strict de whitelist de dossiers et confirmation utilisateur obligatoire pour toute action sensible.

## 3. Productivité
- **VIAP Integration** : Scaffolding de fichiers via des templates pour structurer instantanément de nouveaux projets.
- **Dashboard & Quick Actions** : Tableau de bord épuré avec des accès rapides aux prompts prédéfinis.
- **Exportation** : Export des conversations en format Markdown propre (`.md`) via dialogue système.

## 4. UI/UX "Soft Glass"
- **Design Système** : Interface "Soft Glassmorphism" (Blur, transparence, typographie Fira Code/Sans).
- **Command Palette** : Pilotage complet au clavier via `Cmd+K` (recherche de commandes, navigation, projets).
- **Tray Icon & Background Mode** : Accès rapide depuis la barre système, persistance en arrière-plan.
- **Settings** : Interface dédiée pour la configuration dynamique (API, Modèle, Token, Whitelist).

## 5. Architecture
- **Isolation IPC** : Communication sécurisée `Renderer <-> Main` via `contextBridge`.
- **Persistance** : Sauvegarde des réglages utilisateur via `electron-store`.
