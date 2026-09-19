# AUDIT-QUICKSTART — Ephemer.name

> Guide pas-à-pas pour lancer des **audits de code assistés par IA** sur le projet **Ephemer.name** (Next.js / Supabase / Resend).
> Ce document est fait pour un utilisateur **non-développeur** qui utilise l'**extension Codex dans VS Code** (interface graphique), pas le terminal.

---

## 1. C'est quoi un « audit » ici ?

Un audit, c'est demander à l'IA de **lire le code** du projet et de te rendre un rapport :

- ✅ ce qui marche bien,
- ⚠️ ce qui peut casser,
- 🐛 ce qui est buggé,
- 🔒 ce qui n'est pas sécurisé,
- 💡 ce qui peut être amélioré.

⚠️ **Important** : par défaut, un audit est en **lecture seule** — l'IA ne modifie rien. Tu valides toi-même chaque suggestion avant de l'appliquer.

---

## 2. Avant de commencer (une seule fois)

### 2.1. Ouvrir le projet dans VS Code

1. Lance **Visual Studio Code**.
2. Menu **Fichier → Ouvrir un dossier** (ou `Ctrl+K Ctrl+O`).
3. Choisis le dossier du projet `Ephemer.name` (celui qui contient `package.json`).

### 2.2. Vérifier que l'extension Codex est installée

1. Clique sur l'icône **Extensions** dans la barre latérale gauche (ou `Ctrl+Shift+X`).
2. Tape `Codex` dans la barre de recherche.
3. Si l'extension **Codex** (OpenAI) est listée avec un bouton **Install**, clique dessus. Sinon, elle est déjà installée ✅.
4. Une fois installée, tu dois **te connecter à ton compte OpenAI** quand VS Code te le demande.

### 2.3. Vérifier que `.codexignore` est bien présent

À la racine du projet (le dossier ouvert), tu dois voir un fichier `.codexignore` (il commence par un point). Il sert à dire à l'IA : « **ne lis pas ces fichiers** » — c'est crucial parce que `public/favicon.svg` fait à lui seul ~1,5 million de tokens et ferait planter l'audit.

> Si tu ne le vois pas dans VS Code, c'est normal : les fichiers qui commencent par `.` sont cachés. Clique sur **⋯ → Paramètres** puis coche **Files: Enable Render File Decorations** ou utilise **Affichage → Explorateur → ⋯ → Activer les fichiers cachés**.

---

## 3. Comment lancer un audit (méthode simple)

À chaque fois que tu veux faire un audit d'un module :

1. **Ouvre le panneau Codex** dans VS Code :
   - Raccourci : `Ctrl+Shift+P` puis tape `Codex: Open Panel` (ou `Ctrl+L` selon ta config).
   - Ou clique sur l'icône Codex dans la barre latérale.

2. **Copie-colle** un des **prompts d'audit** listés plus bas (section 5) dans la zone de chat Codex.

3. **Envoie** avec la touche `Entrée` (ou le bouton ▶︎).

4. Codex va **scanner les fichiers du projet** et te rendre un rapport en français dans la conversation.

5. **Lis le rapport**. Demande des précisions si besoin (« détaille le point 3 », « montre-moi le code concerné », etc.).

6. **Quand tu es prêt à appliquer des changements**, dis explicitement à Codex :
   > « Applique la correction 2 et 3, mais ne touche pas au reste. »

7. Codex te propose un **diff** (avant/après). Tu cliques sur **Accept** ou **Reject** dans VS Code pour chaque modification.

---

## 4. Règles d'or pour les audits

| ✅ À faire | ❌ À ne pas faire |
|---|---|
| Toujours faire un **audit en lecture seule** d'abord | Ne jamais dire « corrige tout » sans avoir lu le rapport |
| Travailler **module par module** | Ne pas coller tout le projet en un seul prompt |
| Vérifier que le **build Vercel passe** après chaque modif | Ne pas modifier les fichiers dans `.codexignore` |
| Garder une **copie de sauvegarde** ou commit Git avant | Ne jamais donner ta clé API / mot de passe dans le prompt |

---

## 5. Prompts d'audit prêts à coller

Copie-colle **un seul** de ces prompts à la fois dans le panneau Codex.

### 📦 Module 0 — Audit initial (lecture seule, vue d'ensemble)

```
Tu es un développeur senior spécialisé Next.js 14 / Supabase / Resend.
Effectue un AUDIT EN LECTURE SEULE du projet Ephemer.name. NE MODIFIE AUCUN FICHIER.

Pour chaque point, donne :
  - la liste des fichiers concernés,
  - le risque (faible / moyen / élevé),
  - une recommandation concise.

Couvre :
  1. La structure générale du projet (app/, components/, lib/, types/).
  2. La configuration Next.js (next.config.ts, tsconfig.json, postcss.config.mjs).
  3. La configuration Supabase (lib/supabase-browser.ts, lib/supabase-admin.ts) et l'usage des clés.
  4. La configuration Resend (lib/resend.ts, lib/email-templates.ts).
  5. Les variables d'environnement attendues (cherche process.env.*).
  6. La sécurité : secrets exposés, RLS Supabase, validation des entrées.
  7. Les fichiers manifestes : package.json, .gitignore, vercel.json.

Ne lis PAS public/favicon.svg (trop volumineux). Concentre-toi sur app/, components/, lib/, types/.
Termine par une note "OK pour Vercel ?" : oui / non / à surveiller.
```

### 🔐 Module 1 — Authentification Supabase

```
AUDIT EN LECTURE SEULE — module AUTH du projet Ephemer.name.

Couvre :
  - app/connexion/page.tsx
  - app/inscription/page.tsx
  - app/auth/callback/route.ts
  - app/reset-password/page.tsx
  - app/completer-profil/page.tsx
  - lib/supabase-browser.ts
  - lib/supabase-admin.ts
  - components/AuthDrawer.tsx
  - components/PushPermissionButton.tsx

Vérifie :
  1. Flux d'inscription / connexion / déconnexion cohérents.
  2. Gestion des sessions (cookies, localStorage, refresh).
  3. Redirections après login (callback, pages protégées).
  4. Sécurité : exposition de SUPABASE_SERVICE_ROLE_KEY côté client ?
  5. Messages d'erreur clairs pour l'utilisateur final en français.

Ne MODIFIE RIEN. Rends un rapport structuré.
```

### 🔔 Module 2 — Notifications (push + email)

```
AUDIT EN LECTURE SEULE — module NOTIFICATIONS du projet Ephemer.name.

Couvre :
  - public/sw.js          (service worker)
  - public/offline.html
  - app/api/cron/generate-notifications/route.ts
  - app/api/cron/test-notifications/route.ts
  - app/api/envoyer-rappels/route.ts
  - app/api/envoyer-newsletter/route.ts
  - app/api/invitation-notifier/route.ts
  - lib/rappels.ts
  - lib/email-templates.ts
  - lib/resend.ts
  - components/NotificationBell.tsx
  - components/ProgrammerRappel.tsx
  - components/PushNotificationsGuide.tsx
  - app/dashboard/notifications/page.tsx
  - app/guide-notifications/page.tsx
  - app/dashboard/messages-programmes/page.tsx

Vérifie :
  1. Le service worker ne met JAMAIS en cache des pages avec données privées.
  2. Les routes cron sont protégées (CRON_SECRET en header).
  3. Les templates email sont en français, pas de variables vides.
  4. La gestion des erreurs Resend (retry, fallback).
  5. La cohérence entre push notifications et emails (même contenu / pas de doublon).
  6. La conformité RGPD : désabonnement, suppression de compte.

Ne MODIFIE RIEN. Rends un rapport structuré.
```

### 🎨 Module 3 — UI / Composants

```
AUDIT EN LECTURE SEULE — module UI du projet Ephemer.name.

Couvre tous les fichiers dans components/ et les pages dans app/ qui affichent
du contenu (ex. app/page.tsx, app/dashboard/page.tsx, app/dashboard/profil/page.tsx, etc.).

Vérifie :
  1. Accessibilité (aria-label, contraste, navigation clavier).
  2. Responsive (mobile / tablette / desktop).
  3. Gestion du français (dates au format fr-FR, pluriels, accents).
  4. États de chargement / erreur / vide.
  5. Composants inutilisés ou dupliqués.
  6. Performance : imports lourds, useEffect inutiles, re-renders.

Ne MODIFIE RIEN. Rends un rapport structuré.
```

### 🗄️ Module 4 — Base de données & types

```
AUDIT EN LECTURE SEULE — module DATA du projet Ephemer.name.

Couvre :
  - types/database.ts
  - Tous les usages de createClient / from('xxx') dans lib/ et app/api/.
  - Les migrations SQL si présentes (cherche dans supabase/ ou migrations/).

Vérifie :
  1. Cohérence entre types TypeScript et tables Supabase.
  2. Politiques RLS : chaque table utilisateur a-t-elle un SELECT/INSERT/UPDATE/DELETE
     restreint à auth.uid() = utilisateur courant ?
  3. Les requêtes admin (lib/supabase-admin.ts) ne fuient pas côté client.
  4. Les index / performances sur les colonnes utilisées dans WHERE / ORDER BY.
  5. Les colonnes created_at / updated_at présentes.

Ne MODIFIE RIEN. Rends un rapport structuré.
```

### 🔌 Module 5 — Routes API

```
AUDIT EN LECTURE SEULE — module API du projet Ephemer.name.

Couvre tous les fichiers dans app/api/**/route.ts.

Pour chaque route, vérifie :
  1. Méthode HTTP correctement exportée (GET, POST, etc.).
  2. Validation des entrées (zod, yup, ou au moins typeof).
  3. Authentification utilisateur (vérifier session, sauf routes publiques).
  4. Gestion d'erreur avec NextResponse.json({ error }, { status }).
  5. Pas de secret en clair dans le code.
  6. Timeouts / pas de boucle infinie.

Ne MODIFIE RIEN. Rends un rapport structuré.
```

### 📱 Module 6 — PWA & Service Worker

```
AUDIT EN LECTURE SEULE — module PWA du projet Ephemer.name.

Couvre :
  - public/sw.js
  - public/offline.html
  - public/site.webmanifest
  - components/InstallPWAButton.tsx
  - components/OfflineBanner.tsx
  - app/manifest.ts ou app/manifest.json (si présent)
  - app/layout.tsx (références au manifest, theme-color, etc.)

Vérifie :
  1. Le service worker ne cache que des fichiers STATIQUES publics.
  2. Versioning du cache (CACHE_NAME bumpé à chaque changement).
  3. La page offline.html s'affiche bien quand le réseau tombe.
  4. Le manifest pointe vers des icônes existantes (icon-192.png, icon-512.png).
  5. Le bouton "Installer l'app" fonctionne (beforeinstallprompt).

Ne MODIFIE RIEN. Rends un rapport structuré.
```

---

## 6. Après chaque audit : valider sur Vercel

1. Une fois les corrections acceptées dans VS Code, **commit** sur Git :
   - Panneau **Source Control** (icône branche à gauche), tape un message, clique **Commit**.
2. **Push** sur GitHub.
3. Vercel déploie automatiquement. Attends que le build soit ✅ (badge vert sur le dashboard Vercel).
4. Si le build casse : **rollback** depuis le dashboard Vercel (Deployments → ⋯ sur le dernier déploiement réussi → Promote to Production).

---

## 7. Fichiers volumineux à NE PAS faire auditer

Ces fichiers sont exclus automatiquement grâce au fichier **`.codexignore`** à la racine :

- `public/favicon.svg` (~1,5 M tokens — ferait planter l'IA)
- Autres icônes / images binaires dans `public/`
- `node_modules/` (dépendances — inutiles à relire)
- `.next/`, `.vercel/`, `coverage/` (artefacts de build)
- `.git/` (historique Git)
- `.env*` (secrets)

👉 Si Codex te dit « je n'arrive pas à lire un fichier », c'est probablement qu'il est dans `.codexignore` — c'est **normal**.

---

## 8. En cas de problème

| Symptôme | Solution |
|---|---|
| Codex répond « je ne trouve pas le projet » | Vérifie que tu as bien ouvert **le dossier racine** (celui avec `package.json`), pas un sous-dossier. |
| Codex lit `favicon.svg` et rame | Vérifie que `.codexignore` est bien à la racine et contient `public/favicon.svg`. |
| Codex propose des modifs en anglais | Rajoute dans ton prompt : « Réponds en français, format markdown ». |
| Le build Vercel casse après une modif | Fais un **rollback** Vercel (voir section 6). |
| Codex veut toucher `next.config.ts` ou `vercel.json` | **Refuse** sauf si tu comprends exactement la conséquence — ces fichiers régissent tout le build. |

---

## 9. Résumé en 30 secondes

1. Ouvrir VS Code sur le projet Ephemer.name.
2. Ouvrir le panneau Codex (`Ctrl+L` ou `Ctrl+Shift+P` → `Codex: Open Panel`).
3. Copier-coller **un** prompt de la section 5.
4. Lire le rapport, valider chaque modif.
5. Commit + push → Vercel build → ✅.

> 🧠 **Règle d'or** : **un audit à la fois**, **une correction à la fois**, **un commit à la fois**.
