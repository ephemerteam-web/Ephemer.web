# Suivi des corrections — Ephemer.name

## État actuel après reprise

Les lots locaux des phases 2 à 5 ont été réalisés et compilent. Le blocage lint initial est levé. Les tests de services restent simulés : aucune validation distante ni déploiement. Les alertes d'invitation (phase 1) restent suspendues ; l'envoi push de bout en bout reste bloqué faute de service émetteur identifié. Les premières sections conservent l'historique des contrôles et échecs précédents.

## Cadre et état initial

- Ordre demandé : 1. invitations/emails ; 2. authentification ; 3. envois automatiques ; 4. dates/programmation ; 5. PWA/push.
- Aucun commit, aucune migration, aucune modification de secret ou de fichier `.env`.
- Aucun test d'envoi réel, aucune suppression de données, aucun appel applicatif de production.
- Modifications présentes avant intervention et préservées : `AGENTS.md`, `README.md` ; fichiers non suivis `AUDIT-QUICKSTART.md`, `codexignore.md`.
- Le document Supabase initial décrit les colonnes et politiques. Il confirme `contacts.invitation_id` et le type **date** de `rappels.date_envoi`. Le complément reçu pendant la phase fournit les deux RPC d'invitation ainsi que les contraintes, indexes et politiques de `contacts`/`notifications`. Les droits EXECUTE, les triggers et la preuve d'activation RLS restent non fournis.
- L'hypothèse d'un `date_envoi` SQL de type timestamp dans l'audit initial est donc écartée. Les problèmes de conversion client UTC/date locale restent à examiner en phase 4.
- Les commandes lint/build sont désormais explicitement autorisées. Les outils pourront charger leurs dépendances et Next son environnement ; aucun fichier d'environnement n'est inspecté ni affiché par l'agent.
- Documentation Next consultée sur le site officiel (Route Handlers) : les fichiers locaux de `node_modules` restent exclus de l'inspection.

## Phase 1 — Invitations et emails

**État : phase 1 partielle, build et TypeScript réussis ; arrêt sur échec du lint global. Phase non déclarée terminée. Aucune phase suivante commencée.**

### Fichiers modifiés/créés

- `app/api/invitation-notifier/route.ts`
- `app/invitation/[token]/FormulaireInvitation.tsx`
- `app/dashboard/inviter/CarteInvitation.tsx`
- `lib/email-html.ts` (nouveau)
- `lib/email-templates.ts`
- `app/api/cron/generate-notifications/route.ts`
- `app/api/cron/test-notifications/route.ts`
- `tests/phase1-security.test.mjs` (nouveau)
- `AUDIT-CORRECTIONS.md` (nouveau)

### Corrections

- Échappement des textes insérés dans le HTML des rappels, newsletters et deux récapitulatifs. Les sujets et les données en base ne sont pas transformés en entités HTML.
- Fermeture conservatoire de l'ancien endpoint public : réponse 410 sans accès DB ni Resend. La possession du token de lien n'est pas une preuve d'une nouvelle soumission.
- Retrait de son appel après `soumettre_invitation`. Le contrat et l'appel de cette RPC restent inchangés.
- Retrait du QR généré par un tiers, qui recevait le token d'invitation. Copier et partager restent disponibles. Aucun remplacement par une dépendance non autorisée.
- Tests sans réseau : rendu des emails avec textes hostiles et données françaises, récapitulatifs avec Resend simulé, refus de l'ancien endpoint.
- Les changements aux deux crons portent uniquement sur l'échappement HTML ; leur planification n'a pas changé. `vercel.json` a été relu. La présence du secret distant n'a pas été vérifiée, les appels de production étant interdits.

### Limites fonctionnelles explicites

- **L'alerte automatique d'invitation à l'hôte est suspendue** dans cette version locale. L'ajout du contact via la RPC existante est conservé, mais non testé contre la production.
- **Le QR n'est plus proposé**. Un générateur local pourra être évalué ultérieurement ; aucune nouvelle dépendance n'est ajoutée.
- Cette mesure ferme la voie d'envoi rejouable ; elle ne constitue pas la réimplémentation complète du workflow d'alerte.
- Les définitions RPC reçues confirment le blocage : `soumettre_invitation` verrouille correctement l'invitation avec `FOR UPDATE`, mais ne renseigne pas `contacts.invitation_id` et ne renvoie ni ID du contact ni preuve de soumission. Sélectionner le dernier contact de l'hôte ne permet pas un ciblage fiable. Une éventuelle liaison par trigger reste non vérifiée. Aucun SQL ni contrat RPC n'a été inventé ou modifié.
- L'index unique `idx_notifications_unique_palier` existe sur `(user_id, contact_id, type, event_date, jours_restants)`. Il protège les combinaisons non nulles identiques ; il ne fournit pas à lui seul une preuve de soumission ni un verrou d'envoi email. Les FK du contact d'invitation (`SET NULL`) et des notifications (`CASCADE`) sont confirmées par l'export.
- Pour rétablir sûrement les alertes, préparer séparément un contrat de soumission avec identification fiable du contact et déduplication durable. Sa mise en place DB exige une intervention distincte, non autorisée dans ces phases. Les droits d'exécution RPC et les triggers éventuels restent à vérifier sans données personnelles.
- Pas d'envoi à l'endpoint de test existant : les tests restent simulés conformément à la demande, prioritaire sur le garde-fou d'envoi mentionné dans AGENTS.md.

### Commandes et résultats

- `git status --short` avant intervention et après validation : modifications préexistantes conservées ; seuls les six fichiers source annoncés et les trois nouveaux fichiers ci-dessus ont été ajoutés à l'intervention. Aucun commit.
- Lectures ciblées avec `rg`/PowerShell, consultation du schéma fourni et des configurations/scripts. Aucun fichier secret inspecté.
- Une première édition par script Python a échoué sur un repère Unicode après avoir écrit le seul endpoint. Le texte de cet endpoint a été corrigé avec `apply_patch` ; les autres éditions ont été effectuées avec ce même outil et le diff vérifié.
- `node --test tests/phase1-security.test.mjs` : premier essai bloqué par `spawn EPERM` dans le bac à sable ; relance autorisée hors bac à sable **réussie, 8/8 tests**. `stripTypeScriptTypes` émet un avertissement expérimental sous Node 25.9.0 ; ces tests nécessitent Node >= 22.13. Resend entièrement simulé, aucun email réel.
- `npm run lint` : **échec, code 1 : 175 erreurs et 45 avertissements**. Relance diagnostique `npm run lint -- --format json`, résultats agrégés en mémoire (aucun fichier de sortie), même échec. Les erreurs touchent notamment le JSX, les types `any` et les Hooks React ; détails ci-dessous.
- `npm run build` : premier essai bloqué au téléchargement Google Fonts (`Geist`/`Geist Mono`). Relance autorisée hors bac à sable **réussie, code 0** : compilation, vérification TypeScript et génération des 34 pages statiques effectuées.
- Avertissement Next restant : `metadataBase` absent, résolution des images sociales sur `http://localhost:3000` pendant le build. Configuration non modifiée dans cette phase.
- `git diff --check` : **réussi** ; avertissements Git de normalisation LF/CRLF seulement.
- Pas de serveur de développement lancé : le parcours d'invitation dépend de Supabase distant. Aucun test fonctionnel contre la production, aucune validation distante RLS/RPC/Resend. Le build ne démontre pas le bon fonctionnement de ces services.

### Diagnostic lint et correction ciblée proposée

Les fichiers source non modifiés comportent déjà de nombreuses erreurs ; dans les fichiers modifiés, le diff laisse en place les constructions signalées. Il n'y a pas eu de mesure lint complète avant édition : ne pas assimiler ce constat à une comparaison automatisée de baseline.

| Périmètre | Erreurs | Avertissements | Diagnostic |
|---|---:|---:|---|
| `app/api/cron/generate-notifications/route.ts` | 4 | 0 | Types `any` existants |
| `app/api/cron/test-notifications/route.ts` | 6 | 1 | Types `any`, import inutilisé |
| `app/dashboard/inviter/CarteInvitation.tsx` | 1 | 0 | `Date.now()` pendant le rendu (`react-hooks/purity`) |
| `app/invitation/[token]/FormulaireInvitation.tsx` | 18 | 0 | Apostrophes JSX, lien interne HTML, restauration d'état dans un effet |
| `lib/email-templates.ts` | 0 | 2 | Variables inutilisées |
| Nouvel endpoint fermé, helper HTML et tests | 0 | 0 | Aucun diagnostic lint |

Autres foyers principaux : `app/conditions/page.tsx` (21 erreurs), `app/confidentialite/page.tsx` (33), `app/guide-notifications/page.tsx` et `components/PushNotificationsGuide.tsx` (15 chacun), pages dashboard et composants de notification. Le lint JSON permet de retrouver les emplacements exacts sans modifier les fichiers.

Correction ciblée recommandée avant reprise : traiter un lot de remise au vert du lint, annoncé séparément. Dans les invitations, rendre l'horloge et la restauration du brouillon compatibles avec les règles React, employer `Link` pour la navigation interne et encoder les apostrophes JSX ; typer les données des récapitulatifs d'après le schéma fourni. Traiter ensuite les mêmes diagnostics dans les fichiers existants concernés, sans désactiver globalement les règles ni utiliser de correction automatique globale. Relancer tests, lint et build avant toute phase 2.

### Reprise

Ne pas commencer la phase 2 avant résolution de l'échec lint et validation de la phase 1. Le build est actuellement vert ; conserver ce point de reprise. Ne pas réactiver l'ancien endpoint pour contourner le blocage SQL. Pour les phases suivantes, relire le statut Git, préserver les changements présents, annoncer les fichiers et s'arrêter au premier contrôle en échec comme demandé.

## Phases suivantes

## Reprise autorisée — levée du blocage lint

- Statut Git relu : toutes les modifications de la première intervention et celles de l'utilisateur conservées.
- Corrections JSX aux emplacements signalés (apostrophes/guillemets), types explicites pour sessions, récapitulatifs, erreurs et import de contacts ; suppression des conversions `any` du drawer.
- Nouveaux `lib/hooks/useBrowserValue.ts` et `lib/hooks/useClock.ts` : snapshots navigateur compatibles SSR et horloge partagée. Bannière réseau abonnée à online/offline. Restauration du brouillon avant initialisation du formulaire et sauvegarde protégée contre le refus du stockage.
- Trois exemptions **locales commentées** de `react-hooks/set-state-in-effect` restent pour le déclenchement de chargements réseau (`NotificationBell`, `EvenementsMois`, centre notifications), dont les mises à jour suivent les réponses asynchrones. Aucune règle globale modifiée ; les mises à jour synchrones de capacités navigateur ont été remplacées.
- Fichiers du lot : API `cron/generate-notifications`, `cron/test-notifications`, `envoyer-newsletter`, `envoyer-rappels`, `evenements-mois` ; pages `conditions`, `confidentialite`, `connexion`, `guide-notifications`, dashboard `anniversaires`, `calendrier`, `calendrier_saints`, `contacts/nouveau`, `generate`, `gift-ideas`, `notifications`, accueil et `profil` ; `CarteInvitation`, `FormulaireInvitation`, `LienInvalide` ; composants `AuthDrawer`, `EvenementsMois`, `InstallPWAButton`, `NotificationBell`, `OfflineBanner`, `ProgrammerRappel`, `PushNotificationsGuide`, `PushPermissionButton` et les deux hooks ci-dessus.
- Commandes : diagnostics ESLint JSON en mémoire ; éditions ciblées ; `npm run lint` **réussi (0 erreur, 45 avertissements)** ; `npm run build` **réussi avec TypeScript**, après relance autorisée pour Google Fonts ; `node --test tests/phase1-security.test.mjs` **8/8**, après relance autorisée (EPERM) ; `git diff --check` réussi.
- Les avertissements restants concernent surtout du code inutilisé et des dépendances de hooks. `metadataBase` manque encore. Aucun envoi ou parcours connecté de production exécuté.
- Les alertes d'invitation restent suspendues, pour les raisons SQL documentées. Le blocage technique lint est levé ; la remise en service de ces alertes n'est pas déclarée terminée.
- Références consultées : [React — useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore), [Next — Link](https://nextjs.org/docs/app/api-reference/components/link).

## Phase 2 — Authentification (corrections locales validées)

Statut Git relu avant la phase. Harmonisation cookies/PKCE, vérification serveur des pages privées, contrôle d'erreur callback et réparation des URL de récupération. Aucun changement de RLS ni de configuration Supabase. Les anciennes sessions localStorage peuvent nécessiter une reconnexion ; aucun contenu du stockage n'est supprimé par la migration.

- Fichiers : `lib/supabase-browser.ts`, nouveau `proxy.ts`, `app/auth/callback/route.ts`, `app/connexion/page.tsx`, `app/inscription/page.tsx`, `app/reset-password/page.tsx`, `app/dashboard/layout.tsx`, `app/dashboard/profil/page.tsx`, `app/dashboard/anniversaires/page.tsx`, `app/dashboard/calendrier_saints/page.tsx`, `components/MenuLateral.tsx`, `app/invitation/[token]/FormulaireInvitation.tsx`, `tests/phase2-auth.test.mjs` et ce journal.
- Auth browser en cookies PKCE via le package déjà installé ; proxy `getUser` avec transmission des cookies renouvelés et `private, no-store`. Layout privé masqué jusqu'à vérification et réaction à SIGNED_OUT. Callback invalide redirigé vers erreur explicite ; destination limitée au dashboard/reset. URL de reset corrigée des deux côtés ; contrôle de session avant changement du mot de passe. Déconnexion ne simule plus un succès en cas d'erreur.
- `npm run lint` : succès, 0 erreur/44 avertissements. `npm run build` : succès, TypeScript compris. `node --test tests/phase2-auth.test.mjs` : 3/3 (cookies, refus sans session, code invalide et redirection externe). Tests entièrement simulés.
- À vérifier en environnement de développement isolé : OAuth Google/Facebook, confirmation email, récupération dans le même navigateur/PWA (PKCE), fermeture/réouverture et refresh prolongé. Ancien lien de récupération à renouveler si incompatible avec PKCE. Les autorisations de redirection Supabase doivent inclure `/auth/callback` et `/auth/callback?next=/reset-password` pour les origines utilisées. Aucun réglage distant changé.
- Références : [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [Next Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy). En cas de problème, distinguer URL refusée par Auth, absence de cookie PKCE et panne réseau avant de modifier la protection ; ne jamais remplacer la vérification serveur par la simple lecture d'un cookie.

## Phase 3 — Envois automatiques (corrections locales validées)

Statut Git relu. Aucun SQL inventé. Risques élevés confirmés : marquage global email_envoye sans contrôle Resend et refus systématique du cron newsletter sans secret URL. Les clés d'idempotence Resend ne remplacent pas un journal transactionnel permanent.

- Fichiers : `app/api/envoyer-rappels/route.ts`, `app/api/envoyer-newsletter/route.ts`, les deux routes `app/api/cron/*/route.ts`, `app/dashboard/notifications/page.tsx`, `tests/phase3-delivery.test.mjs`, ce journal.
- Newsletter authentifiée par header uniquement. Cron notifications refuse un secret absent. Les erreurs préférences/Resend/écriture remontent ; seuls les IDs inclus dans le récapitulatif sont marqués. Comptage des insertions effectivement retournées par l'upsert.
- Rappels : retrait du mode force anticipé et du destinataire de secours EMAIL_TEST, refus des destinations inconnues/incomplètes, vérification du propriétaire du contact avant l'envoi admin, expéditeur fixe et réponse HTTP en échec lorsque nécessaire. Les clés Resend sont stables par rappel, newsletter utilisateur/mois et récapitulatif utilisateur/jour.
- Route de test convertie en simulation : lectures du compte authentifié seulement, aucune écriture ni envoi. L'ancien générateur HTML interne est conservé pour le test de non-régression, mais n'est plus appelé par la route.
- `npm run lint` : 0 erreur/43 avertissements après retrait de deux variables devenues inutiles (premier contrôle : deux erreurs prefer-const corrigées dans ce lot). `npm run build` : succès avec TypeScript. Tests cumulés : phase 1 (8), phase 2 (3), phase 3 (5) réussis ; les deux premiers échecs phase 3 venaient de fixtures UTC corrigées pour correspondre au calcul local, qui est traité en phase 4.
- Limites : idempotence Resend conservée 24h seulement ; absence de journal durable newsletter et de verrou transactionnel d'envoi, courses annulation/envoi, pagination Supabase et durées de cron encore à traiter. Une clé réutilisée avec un contenu modifié peut être refusée par Resend : cette erreur reste visible, sans marquage abusif. Aucune garantie « exactement une fois » revendiquée.
- Référence : [Resend — idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys). `vercel.json` relu et inchangé. La présence du secret distant et la délivrabilité ne sont pas vérifiées. Reprise : vérifier d'abord le retour Resend et le marquage des IDs, ne jamais élargir l'update pour masquer une erreur.

## Phase 4 — Dates et programmation (corrections locales validées)

Statut Git relu. Convention retenue : date civile côté formulaire, jour courant Europe/Paris pour les crons, sans nouvelle variable d'environnement. Le schéma fourni ne stocke pas de fuseau utilisateur. Aucun historique de données converti.

- Fichiers : nouveau `lib/calendar-day.ts`, `lib/date-utils.ts`, `lib/rappels.ts`, `components/ProgrammerRappel.tsx`, `app/dashboard/generate/page.tsx`, `app/dashboard/messages-programmes/page.tsx`, les deux crons, les deux routes email, `tests/phase3-delivery.test.mjs`, nouveau `tests/phase4-dates.test.mjs`, ce journal.
- Dates SQL `date` écrites en YYYY-MM-DD sans conversion UTC ; le jour courant est programmable, même après minuit. Passage des crons une fois/jour : un rappel créé après le passage peut partir au passage suivant, indiqué dans l'UI. Aucun horaire individuel n'est promis par ce schéma.
- Anniversaires calculés sans débordement setMonth/setDate, différence de jours indépendante du changement d'heure. 29 février observé le 1er mars hors année bissextile (comportement antérieur rendu explicite). Date manuelle conservée avec son année. Remontage du formulaire de programmation si contact/événement/message changent ; reprogrammation immédiate désactivée après succès.
- Les rappels encore « programme » restent en attente et annulables même si leur date est dépassée ; ils ne sont plus faussement classés comme envoyés. Les approximations fixes de Pâques/fêtes des parents ne sont plus utilisées : date explicite requise via date personnalisée tant qu'un calendrier pays n'est pas défini.
- Vérifications : `node --test` sur les quatre fichiers de tests **20/20** ; `npm run lint` **0 erreur/42 avertissements** ; `npm run build` **succès avec TypeScript**. Cas testés : fins janvier/mars, nouvelle année, 29 février, dates invalides, minuit Paris, changements d'heure, jour courant et date SQL écrite.
- Limites : fuseau par utilisateur absent ; contrôles de programmation encore côté client/RLS existante, sans nouvelle RPC atomique. Les dates anciennes en base n'ont pas été réparées. Le helper historique `programmerRappels` n'a aucun appel dans le dépôt et ses types j30 restent à rationaliser séparément. Reprise : préserver les dates civiles ; ne pas convertir les colonnes date en timestamps pour contourner un décalage.

## Phase 5 — PWA et push (partie locale validée ; émetteur push non identifié)

Statut Git relu. Risque critique de confidentialité confirmé dans le code existant : cache de toutes les navigations HTTP 200 malgré le commentaire contraire. Le nouveau worker ne conservera que des fichiers publics explicitement autorisés et retirera ses anciens caches à l'activation. Aucun cache distant ni navigateur réel n'a été purgé pendant les tests.

- Fichiers : `public/sw.js`, `public/offline.html`, `public/site.webmanifest`, `app/layout.tsx`, `next.config.ts`, `components/InstallPWAButton.tsx`, `components/PushPermissionButton.tsx`, `components/MenuLateral.tsx`, nouveaux `components/PWARegistration.tsx`, `lib/push-device.ts`, `tests/phase5-pwa.test.mjs`, ce journal.
- Worker v4 : cache limité aux quatre ressources publiques explicites, aucun stockage de navigation/RSC/API/image privée. Page de secours ou réponse 503 si le cache est absent. Suppression des seuls anciens caches `ephemer-*` après installation réussie et prise de contrôle dans `waitUntil`. Pas de rechargement automatique d'un formulaire pendant une mise à jour.
- Enregistrement global en production, indépendant de l'autorisation push, vérification de mise à jour au retour de visibilité. En développement, le composant global ne l'enregistre pas ; une activation push explicite peut le faire. Les assets public/ non versionnés ne sont plus déclarés immuables un an. Le worker garde sa revalidation immédiate.
- Manifeste : identité explicite conservant le start_url historique `/dashboard`, retrait de la capture inexistante. Icônes référencées présentes (existence/taille vérifiées, pas de lecture des images exclues). Icônes maskable à contrôler visuellement sur appareils. Texte offline corrigé ; zoom mobile réautorisé ; `metadataBase` ajouté (avertissement build disparu).
- Abonnements : recherche, mise à jour et désactivation limitées à `(user_id, endpoint)` du navigateur courant. Réutilisation d'un abonnement connu ; renouvellement si aucune liaison accessible pour le compte courant. Les erreurs DB ne sont plus traitées comme un succès. Déconnexion explicite désabonne le navigateur avant de fermer la session ; si cela échoue, elle demande de réessayer. L'attente d'activation worker est bornée à 15 secondes.
- Notifications OS génériques pour éviter des noms/messages personnels sur écran verrouillé ; destination de clic limitée au même domaine et au dashboard. Un abonnement enregistré ne vaut pas preuve de livraison. Le bouton d'installation distingue prompt disponible, guide et application déjà installée.
- Vérifications : `node --test` des cinq fichiers **27/27** ; `npm run lint` **0 erreur/40 avertissements** ; `npm run build` **succès avec TypeScript et 34 pages générées**. Cache, offline, purge, clic malveillant et désabonnement testés avec objets simulés ; aucune suppression réelle ni requête d'envoi.
- Dernière relecture : valeurs de secours du drawer placées avant les données du contact (pour ne pas écraser un téléphone déjà chargé), correction de deux accents altérés lors d'éditions shell et attente worker bornée. Ces ajustements sont inclus dans les contrôles finaux.
- Références : [MDN — updateViaCache](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache), [MDN — getSubscription](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/getSubscription).

### Blocages et reprise externe

1. **Push** : aucun émetteur, clé privée VAPID ou Edge Function d'envoi présent dans le périmètre inspecté. Seul le nom de la variable publique existante est utilisé. Fournir le code/configuration du service existant sans secrets, s'il existe. Ne pas inventer de backend ou déclarer les push opérationnels. Restent l'unicité atomique des endpoints, le nettoyage serveur des 404/410 et la rotation des abonnements ; aucune contrainte SQL nouvelle appliquée. Tester iOS installé/Android et reprise après fermeture sur un environnement isolé.
2. **Invitations** : RPC sans ID du contact retourné ni association invitation_id explicite ; remise en service des alertes toujours bloquée, comme en phase 1.
3. **Emails** : journal durable/verrou d'envoi absent, fenêtre idempotente Resend limitée ; vérifier les volumes/pagination et les reprises après panne avant de conclure à une fiabilité complète. Aucun email réel ni webhook de livraison testé.
4. **Auth** : vérifier les redirect URLs et les parcours OAuth/email/PKCE avec comptes de développement ; une reconnexion peut être nécessaire après passage des sessions localStorage aux cookies. Le proxy ne remplace pas les RLS ni l'autorisation des API.
5. **Production** : aucune correction n'est déployée. Le risque de l'ancien cache subsiste chez les clients tant qu'ils n'ont pas installé/activé le worker corrigé. Vérifier cette activation et la disparition de l'ancien cache sur une PWA de test avant déploiement.

### Vérification externe en lecture seule — 19 septembre 2026

À la demande explicite de l'utilisateur, consultation des inventaires administratifs Supabase, Vercel et GitHub. Aucun endpoint applicatif appelé, aucune fonction exécutée, aucun envoi, secret ou contenu de sauvegarde SQL lu ; aucune ressource distante modifiée.

- **Supabase** : le seul projet accessible, `ephemer-app`, retourne une liste vide d'Edge Functions. Aucun expéditeur Edge déployé dans ce projet au moment de la vérification.
- **Vercel** : l'équipe accessible ne liste que `ephemer-web`. Le dernier déploiement de production retourné est READY et lié à `ephemerteam-web/Ephemer.web`, commit `0e4b0379cb1c5e583efab02886364b85a275e57c`, également tête de la branche principale inspectée. Aucun projet backend distinct trouvé. La lecture détaillée du projet échoue à cause d'une incohérence du connecteur (`projectId` déclaré, `idOrName` exigé en interne) : configuration effective des fonctions/crons non confirmée par cet outil.
- **GitHub** : deux dépôts accessibles, `Ephemer.web` et `supabase-backup`. Arborescences complètes de leurs branches principales inspectées (non tronquées), sans lire les fichiers exclus. Aucun dossier Edge Functions ni workflow dans l'application. Le seul workflow de `supabase-backup`, `.github/workflows/backup.yml`, effectue un `pg_dump` quotidien à 02:00 UTC puis sauvegarde le résultat dans ce dépôt privé ; aucun envoi push. Seuls les noms de secrets `DATABASE_URL` et `GITHUB_TOKEN` apparaissent dans ce workflow, leurs valeurs n'ont pas été consultées. Les dumps SQL n'ont pas été ouverts.
- **Services tiers** : aucune intégration FCM, OneSignal ou Pusher identifiée dans le code local inspecté ; pas d'accès administratif à ces services pour exclure un compte indépendant, ni aux dépôts/comptes non partagés avec les connecteurs.

Conclusion : aucun service d'envoi push identifié dans le périmètre réellement accessible. Aucun endpoint, mécanisme d'authentification serveur ou nom de variable privée d'expéditeur ne peut être fourni sans l'inventer. Le format client existant reste celui de `PushSubscription.toJSON()` (`endpoint`, `expirationTime`, `keys.p256dh`, `keys.auth`), enregistré avec l'utilisateur authentifié dans `user_push_subscriptions.subscription`. La seule variable VAPID constatée côté application est `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ; cela ne constitue pas un expéditeur. La phase 5 reste limitée aux protections et au fonctionnement local PWA/abonnements.

Cette vérification n'a modifié que le présent journal après les contrôles finaux ; elle ne nécessite pas un nouveau build du code inchangé.

### Commandes de reprise et revue Git

```powershell
npm run lint
npm run build
node --test tests/phase1-security.test.mjs tests/phase2-auth.test.mjs tests/phase3-delivery.test.mjs tests/phase4-dates.test.mjs tests/phase5-pwa.test.mjs
git status --short
git diff --check
git diff -- app components lib public/sw.js public/offline.html public/site.webmanifest next.config.ts
```

Relire aussi les nouveaux fichiers non suivis, notamment `proxy.ts`, les helpers et tests : `git diff` seul ne les montre pas. Ne pas utiliser `git add .` sans revue, car `AGENTS.md`, `README.md`, `AUDIT-QUICKSTART.md` et `codexignore.md` contiennent les changements préexistants de l'utilisateur. Aucun commit créé. Aucun fichier `.env`, secret, migration SQL ou configuration distante modifié. Le serveur de développement n'a pas été lancé : les parcours intégrés auraient utilisé les services de production ; ils restent à valider dans un environnement isolé.
