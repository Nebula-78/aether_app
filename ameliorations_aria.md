# Propositions d'améliorations — ARIA

> Interface observée : chat principal + mode recherche (tavily_search visible)

---

## 1. Mode Chat

### 1.1 Expérience conversationnelle

**Mémoire contextuelle inter-sessions**
- Permettre à l'utilisateur d'activer une mémoire persistante (résumé automatique des conversations précédentes injecté dans le contexte).
- Bouton "Mémoriser ce fil" pour sauvegarder un contexte important.

**Réponses structurées à la demande**
- Permettre de basculer entre mode "prose fluide" et mode "réponse structurée" (titres, bullets, tableau) via un toggle visible dans l'interface.
- Raccourci clavier : `Ctrl+Shift+F` pour formater la dernière réponse différemment.

**Citations et sources inline**
- Lorsque la recherche web est activée, afficher les sources directement dans la réponse sous forme de footnotes cliquables, pas seulement dans le bloc de résultat brut.

**Historique des prompts**
- Accès rapide aux 10 derniers prompts envoyés via une icône "Historique" dans la barre de saisie.
- Possibilité de réutiliser ou modifier un prompt passé sans le réécrire.

**Personnalisation du ton**
- Ajouter un sélecteur de ton dans les paramètres : `Formel / Neutre / Décontracté / Technique`.
- Ce réglage influence le style de rédaction de toutes les réponses.

---

### 1.2 Interface utilisateur

**Barre de saisie enrichie**
- Ajouter un bouton "Fichier" clairement visible (au lieu d'une icône `+` ambiguë).
- Indicateur de longueur du message (tokens estimés) pour éviter les troncatures.

**Raccourcis dans le chat**
| Raccourci | Action |
|-----------|--------|
| `/search` | Active la recherche web pour ce message uniquement |
| `/code` | Active le mode code avec coloration syntaxique |
| `/resume` | Génère un résumé du fil de conversation |
| `/export` | Exporte la conversation en `.md` ou `.pdf` |

**Bulles de réponse différenciées**
- Distinguer visuellement les réponses générées depuis la mémoire interne vs celles enrichies par une recherche web (badge coloré ou icône discrète).

**Mode focus**
- Option plein écran sans distractions (cache la sidebar, la barre de navigation) pour les sessions de travail intensif.

---

## 2. Mode Research

### 2.1 Pipeline de recherche

**Transparence de la recherche**
- Afficher un panneau latéral collapsible détaillant :
  - Les requêtes envoyées (query)
  - Les sources consultées (URLs)
  - Le score de pertinence de chaque résultat
- Actuellement, le bloc `tavily_search` est visible mais les détails sont tronqués (`"search_depth": …`).

**Contrôle de la profondeur**
- Slider "Profondeur de recherche" : `Rapide (1 source)` → `Standard (5 sources)` → `Approfondie (10+ sources)`.
- Mode "Contradictoire" : recherche activement des points de vue opposés sur un sujet.

**Multi-sources configurables**
- Permettre de choisir les moteurs/sources : Tavily, Brave Search, PubMed, arXiv, Wikipedia, etc.
- Pouvoir exclure des domaines (ex: exclure les sites de contenu sponsorisé).

---

### 2.2 Présentation des résultats

**Rapport structuré automatique**
- Après une recherche, proposer automatiquement un bouton "Générer un rapport" qui structure les résultats en :
  - Résumé exécutif (3-5 lignes)
  - Points clés
  - Sources et liens
  - Limites / incertitudes

**Comparaison de sources**
- Vue "tableau" pour comparer les informations issues de plusieurs sources sur un même sujet (utile pour des recherches factuelles ou produits).

**Timeline automatique**
- Pour les sujets factuels ou historiques, générer automatiquement une chronologie visuelle des événements trouvés.

**Export enrichi**
- Le bouton "Exporter (.md)" déjà présent pourrait être enrichi :
  - Export `.pdf` avec mise en page propre
  - Export `.docx` avec titres et sources formatées
  - Export "notion-ready" (blocs compatibles Notion)

---

### 2.3 Workflow et collaboration

**Recherches sauvegardées**
- Sauvegarder une session de recherche avec son contexte complet pour la reprendre plus tard.
- Nommer et organiser les sessions en "projets".

**Mode itératif**
- Après un premier résultat de recherche, suggérer automatiquement 3 questions de suivi pertinentes pour approfondir.

**Annotations utilisateur**
- Permettre à l'utilisateur d'annoter directement dans les résultats : mettre en surbrillance, ajouter une note, marquer une source comme "fiable" ou "à vérifier".

---

## 3. Améliorations transversales

| Priorité | Amélioration | Impact |
|----------|-------------|--------|
| 🔴 Haute | Citations inline avec liens cliquables | Crédibilité et vérifiabilité |
| 🔴 Haute | Profondeur de recherche configurable | Contrôle utilisateur |
| 🟡 Moyenne | Raccourcis `/commandes` dans le chat | Productivité |
| 🟡 Moyenne | Export enrichi (PDF, DOCX) | Utilisation professionnelle |
| 🟡 Moyenne | Mémoire inter-sessions | Continuité de travail |
| 🟢 Basse | Mode focus plein écran | Confort visuel |
| 🟢 Basse | Timeline automatique pour recherches historiques | Clarté |

---

*Document généré le 11 juin 2026 — Basé sur l'analyse de l'interface ARIA (screenshot fourni)*
