# AGENTS.md — Contexte Codex CLI pour Ephemer.name

> Document de contexte destiné à un assistant IA (Codex CLI) travaillant sur le dépôt **Ephemer.name**.
> Le ton est **vulgarisé pour un non-développeur**, mais reste **techniquement exact** : chaque information est tirée du code source réel du projet.

---

## 1. Présentation du projet

**Nom de domaine** : ephemer.name
**Marque** : « Ephemer — Ne rate plus aucune date importante »
**Nature** : Application web (Progressive Web App) qui aide ses utilisateurs à **ne plus oublier aucune date importante** (anniversaires, fêtes, événements).
**Fonctions clés** :
- Gérer une liste de **contacts** (proches, amis, famille, collègues) avec date de naissance.
- Recevoir des **rappels** (notifications push + e-mails) à J-7, J-3, J-1 et jour J.
- Générer des **messages personnalisés** (via une IA tierce) adaptés au destinataire et au ton choisi.
- Proposer des **idées cadeaux** catégorisées (loisirs, bien-être, tech, déco, gourmandise).
- Partager une **invitation** qui permet à un contact de rejoindre l'app et de remplir lui-même son profil.
- Afficher une **éphéméride** des saints du calendrier (recherche par prénom).

---

## 2. Stack technique réelle (lue dans `package.json`)

| Couche | Technologie | Version détectée |
|---|---|---|
| Framework | **Next.js** (App Router) | `^16.2.6` |
| Langage | **TypeScript** | `^5` |
| UI | **React** | `19.2.4` |
| Styles | **Tailwind CSS** | `^4` (via `@tailwindcss/postcss`) |
| Base de données / Auth | **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) | `^2.103.3` / `^0.10.3` |
| E-mails transactionnels | **Resend** | `^6.12.2` |
| Analytique | **@vercel/analytics** | `^2.0.1` |
| Lint | **ESLint** + `eslint-config-next` | `^9` / `16.2.4` |
| Déploiement | **Vercel** (avec `vercel.json` qui définit 3 crons) | n/a |

> ⚠️ Le `AGENTS.md` d'origine du repo (gardé tel quel) prévient : **« This is NOT the Next.js you know »** — la v16 a des changements cassants. Toujours lire `node_modules/next/dist/docs/` avant d'écrire du code Next.

---

## 3. Arborescence commentée (dossiers clés)

```
.
├── app/                          # Next.js App Router (chaque dossier = une URL)
│   ├── page.tsx                  # Accueil public (/) — hero + drawer auth
│   ├── layout.tsx                # Layout racine (fonts Geist, metadata PWA)
│   ├── globals.css               # Styles globaux Tailwind
│   ├── api/                      # Routes serveur (API routes, retournent du JSON)
│   │   ├── cron/                 # Endpoints appelés par les Vercel Crons
│   │   │   ├── generate-notifications/  # Cron 08:00 — génère les notifs du jour
│   │   │   └── test-notifications/      # POST manuel pour tester (auth user)
│   │   ├── delete-account/       # Suppression de compte utilisateur
│   │   ├── envoyer-newsletter/   # Cron 09:00 le 1er du mois — newsletter
│   │   ├── envoyer-rappels/      # Cron 07:00 — envoie les rappels e-mail
│   │   ├── evenements-mois/      # Donne les événements du mois courant
│   │   ├── generate-gift-ideas/  # IA — génère des idées cadeaux
│   │   ├── generate-message/     # IA — génère un message personnalisé
│   │   └── invitation-notifier/  # Notifie le propriétaire d'une invitation
│   ├── auth/callback/            # Callback OAuth Supabase
│   ├── completer-profil/         # Onboarding : compléter son profil
│   ├── conditions/               # Page légale CGU
│   ├── confidentialite/          # Politique de confidentialité (RGPD)
│   ├── connexion/                # Page de connexion (alternative au drawer)
│   ├── inscription/              # Page d'inscription
│   ├── patchnote/                # Changelog public
│   ├── reset-password/           # Réinitialisation du mot de passe
│   ├── guide-notifications/      # Mini-site d'aide aux notifications push
│   ├── invitation/[token]/       # Pages publiques d'invitation (par lien unique)
│   └── dashboard/                # Espace connecté (layout protégé dans layout.tsx)
│       ├── page.tsx              # Vue d'ensemble (dashboard d'accueil)
│       ├── layout.tsx            # Layout privé (menu latéral, top-bar)
│       ├── anniversaires/        # Liste des anniversaires à venir
│       ├── calendrier/           # Vue calendrier mensuel
│       ├── calendrier_saints/    # Calendrier des saints du jour
│       ├── ce-mois-ci/           # « Ce mois-ci » — événements du mois
│       ├── contacts/             # CRUD des contacts + page édition + nouveau
│       ├── generate/             # Générateur de message (IA)
│       ├── gift-ideas/           # Idées cadeaux (IA)
│       ├── inviter/              # Envoyer une invitation + carte de preview
│       ├── messages-programmes/  # File d'attente des messages programmés
│       ├── notifications/        # Centre de notifications
│       └── profil/               # Modifier son profil + préférences notifs
│
├── components/                   # Composants React réutilisables (« use client »)
│   ├── AuthDrawer.tsx            # Drawer d'inscription/connexion
│   ├── DrawerGlobal.tsx          # Système de drawers (état global via contexte)
│   ├── DrawerContext.tsx         # Contexte React du drawer
│   ├── MenuLateral.tsx           # Menu latéral mobile/tablette
│   ├── MenuNavigation.tsx        # Barre de navigation haute
│   ├── HeroSection.tsx           # Page d'accueil publique
│   ├── NotificationBell.tsx      # Cloche + pastille de notifications
│   ├── ProgrammerRappel.tsx      # Programmer un rappel pour un contact
│   ├── PushNotificationsGuide.tsx# Guide interactif des notifications push
│   ├── PushPermissionButton.tsx  # Bouton OS d'abonnement aux push
│   ├── InstallPWAButton.tsx      # Installer l'app sur l'écran d'accueil
│   ├── EvenementsMois.tsx        # Widget « événements du mois »
│   ├── FavorisRow.tsx            # Rangée des contacts favoris
│   ├── ContactSearchFilters.tsx  # Filtres de recherche des contacts
│   ├── StarryBackground.tsx      # Fond étoilé animé
│   ├── ProgressBar/ProgressRing  # Indicateurs de progression
│   ├── OfflineBanner.tsx         # Bandeau « hors ligne »
│   ├── IconeLuneIA.tsx           # Icône IA custom
│   ├── AppLayout.tsx, AppSelect.tsx, AccordionGroup.tsx  # Helpers UI
│
├── lib/                          # Logique métier (utilisable client + serveur)
│   ├── supabase-browser.ts       # Client Supabase navigateur (anon key)
│   ├── supabase-admin.ts         # Client Supabase serveur (service role — bypass RLS)
│   ├── resend.ts                 # Instance Resend (e-mails)
│   ├── garde-ia.ts               # Garde-fou IA : vérif session + quota journalier
│   ├── email-templates.ts        # Templates HTML des e-mails (rappels, newsletter)
│   ├── api-messages.ts           # Helpers d'appel à /api/generate-message
│   ├── saints.ts                 # Base locale des saints du calendrier (gros fichier)
│   ├── date-utils.ts             # Utilitaires de dates
│   ├── rappels.ts                # Logique de calcul des paliers (J-7, J-3, J-1, J0)
│   ├── constants.ts              # Énumérations : indicatifs, types de relations…
│   ├── gift-config.ts            # Catégories de cadeaux + marchands e-commerce
│   └── hooks/                    # Hooks React
│       ├── useContactFilters.ts
│       └── useUserProfile.ts
│
├── types/
│   └── database.ts               # Types TypeScript des tables Supabase
│
├── public/                       # Assets statiques servis tels quels
│   ├── sw.js                     # Service Worker (PWA, notifications push)
│   ├── site.webmanifest          # Manifeste PWA
│   ├── offline.html              # Page de secours hors-ligne
│   ├── next.svg / vercel.svg     # Logos par défaut Next/Vercel
│   └── file.svg / globe.svg / window.svg  # Icônes par défaut Next
│
├── .continue/rules/roledeveloper.md  # Règles pour Continue.dev
├── AGENTS.md                     # ← ce fichier (règles pour IA, Next.js 16)
├── CLAUDE.md                     # Juste `@AGENTS.md` (alias pour Claude Code)
├── eslint.config.mjs             # Config ESLint (core-web-vitals + TS)
├── next.config.ts                # Sécurité (headers), images, redirects, PWA
├── postcss.config.mjs            # Plugin Tailwind v4
├── tsconfig.json                 # Alias `@/*` → racine du projet
├── vercel.json                   # 3 crons Vercel (rappels, newsletter, notifs)
└── package.json                  # Dépendances et scripts npm
```

---

## 4. Conventions de code observées

- **App Router** exclusivement (pas de dossier `pages/`). Chaque page est `app/.../page.tsx`, chaque API est `app/.../route.ts`.
- **`"use client"`** en haut des composants interactifs (drawers, hooks, formulaires). Les layouts et pages serveur n'ont pas la directive.
- **Alias d'import** : `@/lib/...`, `@/components/...`, `@/types/...` (cf. `tsconfig.json`).
- **Commentaires en français**, abondants et pédagogiques, style « pour un débutant » (`.continue/rules/roledevelopper.md` l'exige : *« Code must be simple and beginner-friendly »*).
- **Emojis en tête de fichier** pour标识 le rôle (`🌐`, `🔐`, `📦`, `🎁`, `📡`…).
- **Deux clients Supabase** distincts :
  - `lib/supabase-browser.ts` → côté navigateur, clé **anon** (soumise aux RLS).
  - `lib/supabase-admin.ts` → côté serveur uniquement (API routes), clé **service role** (bypass RLS). ⚠️ Ne jamais l'importer dans un composant `"use client"`.
- **Sécurité des routes API** :
  - Routes cron : header `Authorization: Bearer ${CRON_SECRET}`.
  - Routes IA : vérif session utilisateur via `lib/garde-ia.ts` + quota journalier (`QUOTA_IA_JOUR`).
- **Mobile-first** (règle explicite dans `roledevelopper.md`).
- **Tailwind v4** uniquement (pas de `tailwind.config.js` ; config via `postcss.config.mjs`).
- **PWA** soignée : `sw.js` + `site.webmanifest` + page `offline.html` + bouton d'installation.
- **Headers de sécurité** globaux (`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control`) définis dans `next.config.ts`.

---

## 5. Où trouver quoi (index rapide)

| Tu cherches… | Regarde dans… |
|---|---|
| **Auth / connexion / inscription** | `app/page.tsx` + `components/AuthDrawer.tsx`, `app/inscription/`, `app/connexion/`, `app/auth/callback/route.ts`, `lib/supabase-browser.ts` |
| **Contacts (CRUD)** | `app/dashboard/contacts/`, `lib/hooks/useContactFilters.ts`, `components/ContactSearchFilters.tsx`, `types/database.ts` (table `contacts`) |
| **Éphéméride / saints** | `lib/saints.ts` (base de données locale), `app/dashboard/calendrier_saints/page.tsx` |
| **Calendrier** | `app/dashboard/calendrier/page.tsx`, `app/dashboard/ce-mois-ci/page.tsx`, `components/EvenementsMois.tsx`, `app/api/evenements-mois/route.ts` |
| **Messages (génération IA)** | `app/dashboard/generate/page.tsx`, `app/api/generate-message/route.ts`, `lib/api-messages.ts`, `lib/garde-ia.ts` |
| **Messages programmés** | `app/dashboard/messages-programmes/page.tsx`, `components/ProgrammerRappel.tsx`, `lib/rappels.ts` |
| **Notifications (centre + push)** | `app/dashboard/notifications/page.tsx`, `components/NotificationBell.tsx`, `components/PushNotificationsGuide.tsx`, `components/PushPermissionButton.tsx`, `app/guide-notifications/page.tsx` |
| **Notifications générées (cron)** | `app/api/cron/generate-notifications/route.ts` (cron 08:00) |
| **Rappels e-mail** | `app/api/envoyer-rappels/route.ts` (cron 07:00), `lib/email-templates.ts`, `lib/resend.ts` |
| **Newsletter** | `app/api/envoyer-newsletter/route.ts` (cron 09:00 le 1er), `lib/email-templates.ts` |
| **Idées cadeaux** | `app/dashboard/gift-ideas/page.tsx`, `app/api/generate-gift-ideas/route.ts`, `lib/gift-config.ts` |
| **Invitation par lien** | `app/invitation/[token]/`, `app/dashboard/inviter/`, `app/dashboard/inviter/CarteInvitation.tsx`, `app/api/invitation-notifier/route.ts` |
| **Profil utilisateur** | `app/dashboard/profil/page.tsx`, `app/completer-profil/page.tsx`, `types/database.ts` (table `profiles`) |
| **Suppression de compte** | `app/api/delete-account/route.ts` |
| **Dashboard d'accueil** | `app/dashboard/page.tsx` + `app/dashboard/layout.tsx` (menu latéral, cloche…) |
| **PWA / hors-ligne** | `public/sw.js`, `public/site.webmanifest`, `public/offline.html`, `components/OfflineBanner.tsx`, `components/InstallPWAButton.tsx` |

---

## 6. Scripts npm réels (lus dans `package.json`)

| Commande | Effet |
|---|---|
| `npm run dev` | Démarre le serveur de dev Next (`next dev`) |
| `npm run build` | Build de production (`next build`) |
| `npm run start` | Démarre le serveur de prod (`next start`) |
| `npm run lint` | Passe ESLint sur tout le projet (`eslint`) |

> Aucun script `test`, `format`, ou `typecheck` n'est défini dans `package.json`. Si tu en ajoutes un, préviens l'utilisateur.

---

## 7. Crons Vercel (lus dans `vercel.json`)

| Heure | Endpoint | Rôle |
|---|---|---|
| `0 7 * * *` (07:00 chaque jour) | `/api/envoyer-rappels` | Envoie les rappels e-mail du jour |
| `0 8 * * *` (08:00 chaque jour) | `/api/cron/generate-notifications` | Génère les notifications in-app |
| `0 9 1 * *` (09:00 le 1er du mois) | `/api/envoyer-newsletter` | Envoie la newsletter mensuelle |

---

## 8. Variables d'environnement utilisées

> ⚠️ **Ne jamais imprimer de valeur**. Si tu vois ces noms dans le code, ce sont des références — pas des secrets. Les vraies valeurs vivent uniquement dans `.env.local` (jamais commité) et dans les **Environment Variables** du projet Vercel.

**Côté serveur (API routes, Node)**
- `SUPABASE_SERVICE_ROLE_KEY` — clé admin Supabase (bypass RLS). Jamais côté client.
- `RESEND_API_KEY` — clé API Resend pour les e-mails.
- `CRON_SECRET` — secret partagé entre Vercel et les routes cron.
- `MAMMOUTH_API_KEY` — clé API pour le fournisseur IA qui génère les messages et idées cadeaux.
- `EMAIL_TEST` — utilisé par `app/api/cron/test-notifications/route.ts`.
- `QUOTA_IA_JOUR` — quota journalier d'appels IA par utilisateur (défaut : 30).

**Côté client (préfixe `NEXT_PUBLIC_`, exposées au navigateur — non secrètes)**
- `NEXT_PUBLIC_SUPABASE_URL` — URL du projet Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clé anon publique (soumise aux RLS).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — clé publique VAPID pour les push web.
- `NEXT_PUBLIC_AMAZON_TAG` — tag d'affiliation Amazon (non secret, mais tag commercial).

---

## 9. Règles pour l'IA (à respecter strictement)

1. **Ne jamais inventer ni imprimer de valeur de secret.** Si on te demande une variable d'env, ne réponds que son **nom**.
2. **Ne pas toucher aux migrations SQL** (les fichiers `supabase/migrations/**` n'existent pas dans cet export — toute modification de schéma doit passer par le dashboard Supabase après validation humaine).
3. **Ne pas ajouter de dépendance** sans demander. Le `package.json` est minimaliste (7 deps prod, 6 devDeps) et la volonté est claire.
4. **Mobile-first** systématique : dessine d'abord le mobile, puis remonte vers le desktop.
5. **Toujours retourner des fichiers complets** (règle `roledevelopper.md`). Pas de diff partiel, pas de « ajoute cette ligne ».
6. **Expliquer chaque changement** en français accessible : quoi, pourquoi, où, et quel risque.
7. **Respecter l'App Router** : pas de `pages/`, pas de `getServerSideProps`, pas de `next/router` (seulement `next/navigation`).
8. **Deux clients Supabase** : `supabase-browser` côté client, `supabaseAdmin` côté serveur uniquement.
9. **Sécurité des routes** : toute route `/api/*` doit vérifier soit le `CRON_SECRET` (cron), soit la session utilisateur (user), soit le quota IA (`lib/garde-ia.ts`).
10. **PWA** : toute nouvelle vue doit fonctionner hors-ligne (vérifier que `sw.js` ne cache pas de données privées).
11. **i18n** : tous les textes UI sont en **français**. Ne pas introduire d'anglais sauf termes techniques universels.
12. **Tailwind v4** : pas de `tailwind.config.js`. Les classes utilitaires uniquement.
13. **Ne pas renommer** les tables Supabase (`profiles`, `contacts`, `notifications`, `rappels`, `notification_preferences`) sans accord explicite — les types `types/database.ts` et les policies RLS en dépendent.

---

## 10. Garde-fous anti-régression

- ⚠️ **Si tu modifies `lib/saints.ts`** : c'est le fichier le plus long (base de saints). Diff fin, ne touche qu'à la saint demandée.
- ⚠️ **Si tu modifies `lib/email-templates.ts`** : teste l'envoi via `app/api/cron/test-notifications/route.ts` (POST authentifié).
- ⚠️ **Si tu modifies un cron** : vérifie que `vercel.json` reste cohérent et que le `CRON_SECRET` est défini sur Vercel.
- ⚠️ **Si tu touches aux types `types/database.ts`** : c'est la source de vérité TypeScript de la DB. Tout changement doit être aligné avec le schéma Supabase.

---

## 11. Scripts d'audit suggérés (voir `AUDIT-QUICKSTART.md`)

Le fichier `AUDIT-QUICKSTART.md` (livré séparément) propose un plan d'audit en 6 étapes, avec des **prompts prêts à copier-coller** pour Codex CLI, ciblés sur les modules réellement présents dans ce dépôt.
