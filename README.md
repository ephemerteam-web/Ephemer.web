# Ephemer.name

> **Ne rate plus aucune date importante.**
> Application web (PWA) qui gère anniversaires, fêtes, idées cadeaux et messages personnalisés.

---

## 🎯 Présentation

**Ephemer.name** aide ses utilisateurs à :

- 📅 Suivre les **dates importantes** de leurs proches (anniversaires, fêtes, événements).
- 🔔 Recevoir des **rappels** (notifications push + e-mails) à J-7, J-3, J-1 et jour J.
- ✍️ Générer des **messages personnalisés** via une IA tierce, adaptés au destinataire et au ton choisi.
- 🎁 Trouver des **idées cadeaux** classées par catégorie (loisirs, bien-être, tech, déco, gourmandise).
- 📩 Envoyer des **invitations** par lien unique pour enrichir son carnet de contacts.
- ⛪ Consulter une **éphéméride** des saints du calendrier (recherche par prénom).

---

## 🧰 Stack technique

| Couche | Technologie |
|---|---|
| Framework | **Next.js 16** (App Router) |
| Langage | **TypeScript** |
| UI | **React 19** + **Tailwind CSS 4** |
| Backend / Auth | **Supabase** (PostgreSQL + Auth + RLS) |
| E-mails | **Resend** |
| Analytique | **@vercel/analytics** |
| Déploiement | **Vercel** (avec 3 crons) |

> ⚠️ Le fichier `AGENTS.md` à la racine prévient : il s'agit d'une version récente de Next.js avec des changements cassants. Toujours consulter `node_modules/next/dist/docs/` avant d'écrire du code Next.

---

## 🚀 Installation (développement local)

### Pré-requis

- **Node.js** ≥ 20 (recommandé)
- **npm** (ou pnpm/yarn)
- Un projet **Supabase** (URL + clés)
- Un compte **Resend** (clé API)
- Une clé **IA** (le projet référence `MAMMOUTH_API_KEY`)

### Étapes

```bash
# 1. Cloner le projet
git clone <url-du-repo> ephemer
cd ephemer

# 2. Installer les dépendances
npm install

# 3. Créer le fichier d'environnement local
cp .env.example .env.local    # s'il existe, sinon créer .env.local manuellement
# → remplir les variables listées dans la section « Variables d'environnement » ci-dessous

# 4. Lancer le serveur de dev
npm run dev
```

L'application est alors accessible sur **http://localhost:3000**.

---

## 📜 Scripts npm

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement Next (`next dev`) |
| `npm run build` | Build de production (`next build`) |
| `npm run start` | Serveur de production (`next start`) |
| `npm run lint` | Lint ESLint (`eslint`) |

---

## 🗂️ Structure du projet

```
.
├── app/                  # App Router (pages + API routes)
│   ├── api/              # Routes serveur (cron, IA, notifications…)
│   ├── auth/callback/    # Callback OAuth Supabase
│   ├── connexion/, inscription/, reset-password/
│   ├── conditions/, confidentialite/, patchnote/
│   ├── dashboard/        # Espace privé (contacts, calendrier, profil…)
│   ├── guide-notifications/
│   ├── invitation/[token]/  # Pages publiques d'invitation
│   ├── page.tsx          # Accueil public
│   ├── layout.tsx        # Layout racine (fonts Geist, metadata PWA)
│   └── globals.css
│
├── components/           # Composants React réutilisables (« use client »)
│
├── lib/                  # Logique métier + clients (Supabase, Resend, IA…)
│   ├── supabase-browser.ts  # Client Supabase navigateur
│   ├── supabase-admin.ts    # Client Supabase serveur (bypass RLS)
│   ├── resend.ts            # Instance Resend
│   ├── garde-ia.ts          # Garde-fou IA (session + quota)
│   ├── email-templates.ts   # Templates HTML d'e-mails
│   ├── saints.ts            # Base locale des saints du calendrier
│   ├── rappels.ts, date-utils.ts, constants.ts, gift-config.ts
│   ├── api-messages.ts
│   └── hooks/               # Hooks React
│
├── types/
│   └── database.ts       # Types TypeScript des tables Supabase
│
├── public/               # Assets statiques (PWA, icônes par défaut)
│   ├── sw.js, site.webmanifest, offline.html
│   └── *.svg
│
├── .continue/rules/      # Règles pour Continue.dev
├── AGENTS.md             # Règles pour les assistants IA (incl. Codex CLI)
├── CLAUDE.md             # Alias `@AGENTS.md`
├── eslint.config.mjs
├── next.config.ts        # Sécurité (headers), images, redirects, PWA
├── postcss.config.mjs    # Tailwind v4
├── tsconfig.json         # Alias `@/*` → racine
├── vercel.json           # 3 crons Vercel
└── package.json
```

---

## ⏰ Tâches planifiées (Vercel Crons)

| Heure | Endpoint | Rôle |
|---|---|---|
| `07:00` chaque jour | `/api/envoyer-rappels` | Envoie les rappels e-mail |
| `08:00` chaque jour | `/api/cron/generate-notifications` | Génère les notifications in-app |
| `09:00` le 1er du mois | `/api/envoyer-newsletter` | Envoie la newsletter mensuelle |

Toutes les routes cron sont protégées par le header `Authorization: Bearer ${CRON_SECRET}`.

---

## 🔐 Variables d'environnement

> ⚠️ **Ne jamais committer de secrets.** Les vraies valeurs vivent dans `.env.local` (ignoré par Git) et dans **Vercel → Settings → Environment Variables**.

### Côté serveur (privé — jamais exposées au navigateur)

| Variable | Rôle |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin Supabase (bypass RLS). Serveur uniquement. |
| `RESEND_API_KEY` | Clé API Resend (envoi d'e-mails). |
| `CRON_SECRET` | Secret partagé entre Vercel et les routes cron. |
| `MAMMOUTH_API_KEY` | Clé du fournisseur IA pour les messages et idées cadeaux. |
| `EMAIL_TEST` | Adresse e-mail de test pour la route de test. |
| `QUOTA_IA_JOUR` | Quota journalier d'appels IA par utilisateur (défaut : 30). |

### Côté client (préfixe `NEXT_PUBLIC_` — exposées publiquement, non secrètes)

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (soumise aux RLS). |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clé publique VAPID pour les push web. |
| `NEXT_PUBLIC_AMAZON_TAG` | Tag d'affiliation Amazon (public). |

---

## 🌐 Déploiement

### Vercel (recommandé)

1. **Importer** le repo GitHub dans Vercel (New Project → Import).
2. **Définir toutes les variables d'environnement** listées ci-dessus (Production, Preview, Development).
3. **Ne pas modifier** `vercel.json` (il déclare les 3 crons automatiquement).
4. **Connecter le domaine** `ephemer.name` (Settings → Domains).
5. **Activer** `@vercel/analytics` (déjà installé via la dépendance).

> Les images Supabase sont autorisées via `images.remotePatterns` dans `next.config.ts` (`**.supabase.co`).

### Supabase

1. **Créer le projet** Supabase (région proche des utilisateurs).
2. **Importer le schéma** SQL (fichier de migrations non présent dans cet export — à demander au mainteneur).
3. **Activer** Auth → Email + Magic Link (cf. `app/inscription/page.tsx`).
4. **Définir les RLS** sur les tables `profiles`, `contacts`, `notifications`, `rappels`, `notification_preferences` (politiques attendues par `lib/supabase-browser.ts`).
5. **Récupérer** la `service role key` (Settings → API) → mettre dans `SUPABASE_SERVICE_ROLE_KEY` côté Vercel uniquement.

### Resend

1. **Créer** un compte sur resend.com.
2. **Vérifier** le domaine d'envoi (`ephemer.name` ou sous-domaine).
3. **Générer** une clé API → mettre dans `RESEND_API_KEY` côté Vercel.

---

## 🧪 Tester les crons en local

```bash
# Exemple : tester la génération de notifications
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/generate-notifications
```

Pour tester sans attendre l'heure planifiée, il existe aussi un endpoint manuel :
`POST /api/cron/test-notifications` (authentifié par token de session utilisateur).

---

## 📜 Conventions de code

- **App Router** exclusivement.
- **Mobile-first** systématique.
- **Commentaires en français**, pédagogiques.
- **Deux clients Supabase** : navigateur (`supabase-browser`) vs serveur (`supabase-admin`).
- **Routes API sécurisées** : `CRON_SECRET` ou session utilisateur.
- **Tailwind v4** uniquement (pas de `tailwind.config.js`).
- **PWA** complète : `sw.js`, manifest, page offline.

Voir `AGENTS.md` pour le détail complet des règles destinées aux assistants IA.

---

## 📄 Pages légales

- `/conditions` — Conditions générales d'utilisation.
- `/confidentialite` — Politique de confidentialité (RGPD).
- `/patchnote` — Changelog public.

---

## 📚 Ressources

- [Documentation Next.js 16](https://nextjs.org/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Resend](https://resend.com/docs)
- [Documentation Tailwind v4](https://tailwindcss.com/docs)
- [Documentation Vercel](https://vercel.com/docs)
