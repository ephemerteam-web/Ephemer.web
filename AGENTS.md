# AGENTS.md — Contexte réel d’Ephemer.name

Mise à jour : 10 octobre 2026. Ce document décrit le code local ; il ne certifie pas que les propositions SQL ou variables serveur sont installées en production. Les explications doivent rester accessibles à une personne non développeuse.

## Règle de travail avec les assistants IA

> **Ne jamais créer de commit.** Après les modifications, l’assistant exécute les vérifications adaptées et communique leurs résultats. L’utilisateur vérifie ensuite l’application avec `npm run dev` et effectue lui-même le commit.

**Next.js 16 : « This is NOT the Next.js you know ».** Lire les pages utiles dans `node_modules/next/dist/docs/` avant d’écrire du code Next. Utiliser App Router, `next/navigation` et les paramètres asynchrones des pages serveur.

## 1. Produit et navigation

Ephemer — Ne rate plus aucune date importante — est une application web et PWA française.

Les quatre espaces principaux sont **Accueil · Dates · Mes proches · Célébrations**. `components/MainSpaces.tsx` affiche quatre onglets en bas sur mobile et une barre sur ordinateur. Une petite étoile brillante signale sur Mes proches les invitations reçues en attente ; elle disparaît après traitement et respecte la réduction des animations. `MenuNavigation` donne les accès aux espaces, décomptes et outils ; `MenuLateral` réunit profil, univers, thème, notifications, données et déconnexion.

- **Accueil** : un seul bloc `HomeDates` « Aujourd'hui et à venir » réunit la carte illustrée SaintDuJour, anniversaires/fêtes/dates personnelles du jour et des trente prochains jours, puis les anniversaires récents. Chaque occurrence apparaît une fois ; un seul message vide pour les dates personnelles. Tous les contacts sont inclus (pas seulement les favoris), les favoris ont leur rangée distincte. Aucun sélecteur de liste ni bouton de gestion des dates personnelles sur l'accueil ; ces outils restent dans Dates/Contacts.
- **Dates** : calendrier Mois/Agenda, filtres anniversaires/fêtes/dates personnelles, recherche publique de saints. Les pages `/dashboard/anniversaires` et `/dashboard/calendrier_saints` présentent de nouveau les décomptes J‑… en cartes ou liste compacte, avec filtres et tri. Elles utilisent les mêmes occurrences que le calendrier et sont accessibles par `DatesNav` et le menu. Seule l'ancienne URL ce-mois-ci redirige vers l'agenda ; paramètres conservés.
- **Mes proches** : Contacts privés, Étoiles sociales et Invitations réunis par une navigation, avec des modèles et autorisations distincts. Une étoile n’est pas automatiquement une fiche contact.
- **Célébrations** : préparations par occurrence, tâches et messages privés, cartes personnelles, idées/cadeaux offerts, budget par devise, styles et messages programmés. Une préparation ne constitue jamais une preuve d’envoi. L’ancienne URL gift-ideas redirige vers `/dashboard/idees?vue=suggestions`, en gardant contactId, etoileId, eventType et occurrenceId.
- **Mon univers** : identité, présentation et préférences du propriétaire ; champs partagés et permissions IA cadeaux explicites. Le rendu d’un univers tiers reste une projection limitée par son propriétaire.

Le libellé produit retenu est **Célébrations**. Les noms techniques historiques `AttentionShared`, `attention-data` et `/contacts/[id]/attentions` restent compatibles.

## 2. Stack et dépendances

| Couche | Code déclaré dans package.json |
|---|---|
| Framework | Next.js `^16.2.6` (installation vérifiée : 16.2.6) |
| Interface | React / React DOM 19.2.4, TypeScript `^5` |
| Styles | Tailwind CSS v4, thèmes clair/sombre et fond céleste |
| Données/Auth | Supabase JS `^2.103.3`, SSR `^0.10.3` |
| Emails | Resend `^6.12.2` |
| Images locales | html-to-image 1.11.13, chargé au clic de préparation |
| Push serveur | web-push 3.6.7 ; @types/web-push 3.6.4 en développement |
| Autres | @vercel/analytics `^2.0.1`, ESLint `^9`, eslint-config-next 16.2.4 |

Les nouvelles bibliothèques n’ajoutent aucun service payant. Les quotas d’hébergement, base de données, email et fournisseur IA restent applicables. L’audit npm du 10/10/2026 signale 15 alertes (dont une critique sur la version Next installée), à traiter séparément ; aucun `npm audit fix --force` n’a été appliqué.

**Champs de formulaire** : les styles communs dans `app/globals.css` harmonisent les champs de saisie, sélecteurs et zones de texte avec la palette céleste. Fond doux, angles de 14 px, taille de texte de 16 px, focus doré visible, erreur via `aria-invalid` ou validation native après interaction, état désactivé et réduction des animations. Les espacements horizontaux restent adaptés aux icônes ; les contrôles spécialisés gardent leur forme. Aucun composant ni code Uiverse n'est importé : exemples utilisés comme inspiration, sans dépendance supplémentaire. Voir `docs/FORMULAIRES.md`.

## 3. Structure et index utile

| Domaine | Fichiers principaux |
|---|---|
| Auth privée | `proxy.ts`, `app/dashboard/layout.tsx`, `DashboardUserContext`, `lib/supabase-browser.ts`, `lib/supabase-admin.ts` |
| Navigation | `lib/navigation.ts`, `lib/legacy-navigation.ts`, `MainSpaces`, `DatesNav`, `PendingInvitationStar`, `ClosePeopleNav`, `MenuNavigation`, `MenuLateral`, `AttentionShared` |
| Contacts/listes | `app/dashboard/contacts/`, `DrawerGlobal`, `PrivateLists`, `lib/private-lists.ts`, `lib/hooks/useContacts.ts`, `usePrivateLists.ts` |
| Événements datés | `lib/personal-events.ts`, `personal-event-data.ts`, `calendar-day.ts`, `occurrence-reminders.ts`, `components/PersonalDates.tsx` |
| Calendrier/saints | `app/dashboard/calendrier/page.tsx`, `CalendarExperience`, `SaintDuJour`, `lib/saints.ts`, `name-days.ts` |
| Préparations/idées/budget | `PreparationScreen`, `GiftLibrary`, `IdeasHub`, `BudgetScreen`, `ContactAttentions`, `lib/attention-data.ts` |
| Messages/styles/IA | `app/dashboard/generate/`, `messages-programmes/`, `styles/`, `MessageStyles`, `GeneratorAttention`, `lib/garde-ia.ts`, `ai-options.ts`, `ai-consent*`, `cadeaux-server.ts` |
| Cartes personnelles | `components/cards/`, `lib/cards.ts`, `card-data.ts`, `card-server.ts`, `card-snapshot-v2.ts`, `card-link-crypto.ts`, `app/api/cartes/`, `app/carte/` |
| Export image | `ShareImageButton`, `lib/share-image.ts`, `lib/image-projections.ts` |
| Étoiles/univers | `components/etoiles/`, `components/univers/`, `lib/etoiles-*`, `univers-*`, `cadeaux-social-contract.ts`, `app/api/etoiles/`, `app/api/univers/` |
| Avatar | `app/dashboard/avatar/`, `components/avatars/`, `lib/avatar-*`, `lib/avatars.ts` |
| Notifications | `NotificationBell`, `DailySummary`, `app/dashboard/notifications/`, `lib/social-notifications.ts`, `notification-preferences.ts` |
| Push quotidien | `PushPermissionButton`, `PushNotificationsGuide`, `lib/push-device.ts`, `daily-digest.ts`, `daily-push.ts`, `daily-push-journal.ts`, `app/api/push/status/route.ts` |
| Email durable | `lib/email-delivery.ts`, `email-journal.ts`, `email-templates.ts`, `app/api/webhooks/resend/` |
| Données/diagnostic | `app/dashboard/donnees/`, `lib/user-data.ts`, `diagnostic.ts`, `app/api/cron/test-notifications/` |
| PWA/sécurité | `public/sw.js`, `site.webmanifest`, `offline.html`, `next.config.ts`, `OfflineBanner`, `InstallPWAButton` |
| Types | `types/database.generated.ts` (schéma), `types/database.ts` (alias) |
| Vérifications/documentation | `tests/`, `tools/`, `docs/evolution/`, `docs/p3-*`, `docs/sql/` |

Les propositions SQL dans `docs/` sont des dossiers à valider/installer humainement. Leur présence ne prouve pas qu’elles sont appliquées. Ne pas modifier `supabase/migrations/**` ni appliquer de SQL automatiquement.

## 4. Notifications et crons

| Horaire UTC | Route | Fonction |
|---|---|---|
| 07:00 chaque jour | `/api/envoyer-rappels` | Rappels email et messages programmés selon les règles existantes |
| 08:00 chaque jour | `/api/cron/generate-notifications` | Notifications in-app, récapitulatif email durable, résumé push quotidien si configuré |
| 09:00 le 1er du mois | `/api/envoyer-newsletter` | Newsletter mensuelle |

Tous les crons exigent `CRON_SECRET` dans le header Authorization. Le jour métier est en Europe/Paris ; 08:00 UTC correspond à 09:00 en hiver et 10:00 en été. Aucun cron supplémentaire n’est ajouté. Le POST test-notifications est une simulation authentifiée, sans vrai email/push.

**Messages programmés** : l'absence du journal email ne déclenche plus le bandeau général « Le suivi des emails est indisponible » ni son bouton Réessayer. La liste reste accessible avec les statuts disponibles, sans déduire une livraison confirmée. Les erreurs de chargement ou d'action restent affichées.

**Push quotidien** : canal_push doit être actif, appareil autorisé et journal serveur disponible. Une tentative au maximum par compte/endpoint/jour ; un refus, crash ou résultat incertain après réservation ne déclenche aucun renvoi ce jour. Les réservations sont conservées trente jours. Le push regroupe seulement J0 avec rappels actifs : anniversaires, fêtes confirmées et dates personnelles ; pas de fête déduite non confirmée, date archivée/annulée ou série à reconfirmer. Une date masquée au calendrier peut garder ses rappels actifs et apparaît alors dans le résumé authentifié.

Sans événement, aucun push par défaut. L’option « Inclure les saints du jour », décochée par défaut, est enregistrée par appareil dans `subscription.ephemer.saints` et peut provoquer un résumé seul. Pas de nouveau push social. Sur l’écran verrouillé, le détail personnel reste générique ; les saints publics peuvent être nommés. Le clic ouvre Notifications sans marquage automatique comme lu.

**Activation distante non effectuée** : suivre `docs/NOTIFICATIONS-PUSH-QUOTIDIENNES.md` et relire `docs/sql/daily-push.sql`. L’API authentifiée `/api/push/status` ne retourne qu’un booléen. Le journal a ses RPC réservées au rôle serveur ; les types DB générés restent inchangés avant installation. Valider RLS/permissions et réception sur vrais téléphones après configuration. iOS/iPadOS exige l’application installée sur l’écran d’accueil (16.4+).

## 5. Partage en image

`ShareImageButton` construit un aperçu contenant seulement les champs sélectionnés. Coordonnées, année/âge, notes, réactions, brouillons de tâches, données financières et lien secret d’invitation sont décochés par défaut. Le titre est inclus par défaut et peut aussi être décoché. Les cartes personnelles conservent leur moteur V1/V2 et leur avatar figé ; retirer signature/avatar dans l’export ne modifie pas le brouillon ni la publication.

La préparation crée des fichiers PNG localement (1280 px de large, pages de 4096 px de haut maximum, coupure entre lignes/illustrations). Pas de capture de boutons, de menus ou de la page entière ; pas de publication, d’URL créée ni d’image privée envoyée au serveur. Le dernier clic Partager appelle l’API native avec les fichiers déjà préparés ; sinon téléchargement explicite. Fermeture/changement de contenu/compte invalide les fichiers et résultats tardifs. Les URLs blob sont révoquées.

Entrées : carte privée/publiée, contact dans sa fiche, agenda/calendrier, préparation/tâches, idées/suggestions/cadeaux, budget, invitation, messages programmés et **son propre univers enregistré**. Aucun export d’univers tiers. SaintDuJour partage son image originale et propose le téléchargement quand le partage fichier est indisponible.

La recette navigateur utilise des données fictives ; Safari/iPhone/Android réels restent à valider. Les données privées ne sont pas conservées pour pouvoir les relire après rechargement hors ligne.

## 6. Scripts npm réels

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm test` | Tests Node avec bases/transports simulés |
| `npm run typecheck` | next typegen puis tsc --noEmit |
| `npm run verify` | lint → typecheck → tests → build, arrêt sur erreur |

Ces scripts existaient déjà avant le plan Célébrations. Aucun script npm n’a été ajouté. Les tests utilisent Node avec `stripTypeScriptTypes` (voir `docs/p3-exploitation.md`). Ne pas appeler un fournisseur email/IA/push réel dans la recette ordinaire.

## 7. Conventions et sécurité

React interactif utilise `'use client'`, imports `@/`, commentaires et interface français, mobile d’abord, Tailwind v4 et tokens de thème. Les formulaires distinguent saisie privée, enregistrement et publication. Les copies de cartes/avatar historiques ne doivent jamais être réécrites implicitement.

`supabase-browser` utilise la clé publique et les RLS. `supabaseAdmin` est serveur uniquement et privilégie une identité Auth vérifiée avant tout accès privé. Les nouvelles API privées utilisent un Bearer vérifié ; les API publiques à lien secret gardent leur protocole strict et protections existantes. IA : session vérifiée, quota et consentement explicite. `/api/invitation-notifier` reste désactivée (410).

Le service worker ne met en cache que les assets publics autorisés ; API, RSC, contacts et images privées ne sont pas conservés. Un clic push refuse les destinations externes. Les en-têtes de sécurité et les règles de cache sont dans `next.config.ts` et `proxy.ts`.

## 8. Variables d’environnement (noms uniquement)

Ne jamais afficher leurs valeurs ni lire/imprimer `.env.local` dans un résultat.

- Serveur : `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `CRON_SECRET`, `MAMMOUTH_API_KEY`, `QUOTA_IA_JOUR`, `EPHEMER_CARD_LINK_KEY`.
- Nouveau push serveur : `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `EPHEMER_DAILY_PUSH_ENABLED`.
- Publiques navigateur : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_AMAZON_TAG`.

Le préfixe public n’est jamais utilisé pour une clé privée. La paire VAPID doit correspondre ; l’activation échoue sinon. Ne pas générer/imprimer de secrets dans les conversations ou le dépôt.

## 9. Règles pour l'IA (à respecter strictement)

1. **Ne jamais inventer ni imprimer de valeur de secret.** Si on te demande une variable d'env, ne réponds que son **nom**.
2. **Ne pas toucher aux migrations SQL** (les fichiers `supabase/migrations/**` n'existent pas dans cet export — toute modification de schéma doit passer par le dashboard Supabase après validation humaine).
3. **Ne pas ajouter de dépendance** sans demander. Les bibliothèques gratuites `html-to-image`, `web-push` et les types associés ont été autorisés pour le plan Célébrations. Toute autre nouvelle dépendance exige un accord.
4. **Mobile-first** systématique : dessine d'abord le mobile, puis remonte vers le desktop.
5. **Toujours retourner des fichiers complets** (règle `roledevelopper.md`). Pas de diff partiel, pas de « ajoute cette ligne ».
6. **Expliquer chaque changement** en français accessible : quoi, pourquoi, où, et quel risque.
7. **Respecter l'App Router** : pas de `pages/`, pas de `getServerSideProps`, pas de `next/router` (seulement `next/navigation`).
8. **Deux clients Supabase** : `supabase-browser` côté client, `supabaseAdmin` côté serveur uniquement.
9. **Sécurité des routes** : toute route `/api/*` doit vérifier soit le `CRON_SECRET` (cron), soit la session utilisateur (user), soit le quota IA (`lib/garde-ia.ts`).
10. **PWA** : toute nouvelle vue doit avoir un secours hors ligne. Les données privées ne sont pas mises en cache par `sw.js` ; une connexion est requise pour les relire.
11. **i18n** : tous les textes UI sont en **français**. Ne pas introduire d'anglais sauf termes techniques universels.
12. **Tailwind v4** : pas de `tailwind.config.js`. Les classes utilitaires uniquement.
13. **Ne pas renommer** les tables Supabase (`profiles`, `contacts`, `notifications`, `rappels`, `notification_preferences`) sans accord explicite — les types `types/database.ts` et les policies RLS en dépendent.

---

## 10. Garde-fous anti-régression

- ⚠️ **Si tu modifies `lib/saints.ts`** : c'est le fichier le plus long (base de saints). Diff fin, ne touche qu'à la saint demandée.
- ⚠️ **Si tu modifies `lib/email-templates.ts`** : teste l'envoi via `app/api/cron/test-notifications/route.ts` (POST authentifié).
- ⚠️ **Si tu modifies un cron** : vérifie que `vercel.json` reste cohérent et que le `CRON_SECRET` est défini sur Vercel.
- ⚠️ **Si tu touches aux types** : `types/database.generated.ts` reflète le schéma installé ; `types/database.ts` en dérive les alias métier. Ne pas ajouter une table future aux types générés avant son installation humaine. Les contrats SQL proposés restent confinés dans leurs adaptateurs.

---


## 11. État de recette et documents

Voir `docs/AUDIT-PARCOURS-2026-10-10.md` pour les scénarios, corrections et limites de cette livraison. Voir `docs/NOTIFICATIONS-PUSH-QUOTIDIENNES.md` pour l’activation manuelle. Ne pas confondre un build et des transports simulés réussis avec une validation Supabase ou une réception sur téléphone réel.
