# Suivi des corrections — Ephemer.name

## État actuel après reprise

**Dernière intervention : lot produit traité dans les limites du schéma ; phases 6 (socle UI) et 7 (thèmes) compilées. 35 tests simulés réussis, lint sans erreur (37 avertissements). Revue mobile statique effectuée, recette visuelle sur appareils non réalisée. Plusieurs demandes serveur restent partielles : voir le tableau ci-dessous, ne pas les considérer comme livrées intégralement.**

### Nouveau lot demandé — dix améliorations, puis phases 6 et 7

État Git propre au début de cette intervention : le travail précédent est désormais dans la base locale. Aucun commit créé par l'agent. La référence graphique fournie par l'utilisateur est ivoire/bleu nuit/or céleste ; phase 6 = harmonisation UI, phase 7 = mode clair. Adresse confirmée : 23 route du Mont Agel, 06320 La Turbie ; adresse de support non confirmée.

Premier contrôle du lot produit : 32 tests simulés réussis ; lint final 0 erreur/37 avertissements après correction d'un paragraphe JSX mal placé dans le générateur cadeaux. Build compilé mais contrôle TypeScript en échec sur l'inférence Supabase de la sélection variable de l'export (`lib/user-data.ts`). Correction ciblée : résultat explicitement typé `Record<string, unknown>`, aucune colonne inventée. Phases 6 et 7 non commencées à ce stade ; relance du build obligatoire avant poursuite.

**Résultat après correction : build réussi, TypeScript et 35 pages. Lot produit local validé avant phase 6.**

| Demande | Réalisation et limites |
|---|---|
| Journal de livraison | `delivery-status.ts` et messages programmés distinguent programmé, accepté par Resend (non livré), annulé et état inconnu. Les autres états ne sont pas inventés. Journal d'événements durable, identifiant Resend, verrou de traitement et webhook vérifié nécessaires pour le suivi complet ; aucun nouveau statut SQL écrit. |
| Naissance partielle | Modèle métier jour/mois/année nullable et validation ; retrait de la sentinelle 1900 de l'invitation ; âge inconnu pour les données historiques ambiguës. Sans schéma/RPC adaptés, la saisie partielle explique le blocage et demande une date complète connue ou trois champs vides. Le jour/mois seul n'est PAS encore persisté. Aucune donnée historique convertie. |
| Fête prénomale | Choix explicite parmi toutes les correspondances normalisées dans le générateur, pour le message courant. Réinitialisation du formulaire de programmation si le choix change. Préférence persistante et unification des autres calendriers restent dépendantes du modèle de données. |
| Récurrence | UI explicite : prochaine occurrence proposée pour un anniversaire ; date manuelle ponctuelle ; chaque message programmé est un envoi unique. Aucune reconduction annuelle d'un mariage/rendez-vous. Série récurrente persistante non implémentée sans schéma dédié. |
| Confidentialité IA | Liste fermée côté serveur et minimisation navigateur : occasion, relation, ton seulement ; suppression noms/notes/coordonnées/âges/dates et détails libres du prompt. Prénom ajouté localement après réponse. Texte UI et confidentialité alignés sur Mammouth AI ; timeout et erreurs sans réponse brute du fournisseur. Personnalisation par notes/âge volontairement retirée. |
| Diagnostic | Route de simulation déjà sans effets depuis phase 3 ; renvoie désormais événements et destinataire du récapitulatif, affichés dans `/dashboard/donnees`. Refus en cas d'erreur de préférences. Aucun envoi ni insertion. La lecture contacts de ce diagnostic reste soumise à la limite de réponse Supabase : ce n'est pas un audit exhaustif des gros comptes. |
| Doublons | Prévisualisation d'import existante conservée, rapprochement sur email/téléphone/nom complet avant import ou création, confirmation explicite des correspondances (peuvent être homonymes ou coordonnées partagées). Comparaison interne au lot et avec les contacts existants. Pas de fusion ni suppression automatique ; concurrence et fusion atomique restent à traiter côté serveur. |
| Alertes automatismes | Contrôle manuel du stock de rappels en retard dans la nouvelle page, sans faux diagnostic de cron absent. Surveillance automatique des passages, échecs répétés et volumes bloquée sans journal serveur et canal d'alerte validé. |
| Promesses publiques | Avertissement explicite dans les guides et paramètres : push non opérationnels. Adresse postale fictive remplacée dans les templates par l'adresse postale validée : 23 route du Mont Agel, 06320 La Turbie. Support existant non harmonisé faute de validation (deux adresses différentes). Revue juridique complète et autres promesses marketing restent à valider humainement. |
| Export | Export JSON depuis profil/menu : compte (ID/email), profil, contacts, rappels, notifications, préférences et métadonnées d'invitations ; lectures RLS filtrées au propriétaire et paginées, aucun téléchargement partiel sur erreur, vérification de session avant téléchargement. Tokens d'invitation, sessions, clés push, sauvegardes et journaux tiers exclus. Pas d'instantané transactionnel, limite navigateur explicite 100 000 lignes/table. |

Fichiers du lot produit : routes `api/generate-message`, `api/generate-gift-ideas`, `api/cron/test-notifications` ; pages `confidentialite`, `guide-notifications`, invitation, dashboard `generate`, `gift-ideas`, `anniversaires`, `messages-programmes`, `notifications`, `contacts/nouveau`, `profil`, nouvelle `donnees` ; composants `MenuNavigation`, `PushNotificationsGuide` ; `lib/api-messages.ts`, `lib/constants.ts`, `lib/date-utils.ts`, `lib/email-templates.ts`, nouveaux `ai-privacy.ts`, `contact-quality.ts`, `delivery-status.ts`, `name-days.ts`, `user-data.ts` ; `tests/product-improvements.test.mjs` et ce journal.

Commandes du lot : état Git, lectures ciblées, `npm run lint`, `npm run build` (premier échec TypeScript documenté, seconde exécution réussie), `node --test` sur les six fichiers de tests (32/32). Aucun email ni appel IA réel. Reprise : conserver la séparation état constaté/état non mesuré ; ne pas créer de colonnes, RPC ou webhook fictifs pour lever les limites ci-dessus.

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

## Phase 6 — Harmonisation UI (socle local validé)

Statut Git relu ; lot produit préservé. Composants partagés Button/Input/Card/Notice/PageHeading, palette sémantique sombre préparant le clair, focus clavier visible, réduction des animations, décor céleste vectoriel commun inspiré du fond fourni. Suppression de la duplication visuelle AppLayout/StarryBackground, décor mutualisé du dashboard. Adoption dans données/diagnostic, reset et programmation ; sélecteurs cohérents. La migration de chaque ancien formulaire vers les primitives reste progressive.

Fichiers : `components/ui.tsx`, `components/CelestialBackdrop.tsx`, `components/AppLayout.tsx`, `components/StarryBackground.tsx`, `components/AppSelect.tsx`, `components/ProgrammerRappel.tsx`, `app/globals.css`, `app/dashboard/layout.tsx`, `app/dashboard/donnees/page.tsx`, `app/reset-password/page.tsx`, ce journal.

Contrôles : `npm run lint` 0 erreur/37 avertissements ; `npm run build` réussi, TypeScript et 35 pages. Aucun appel fonctionnel distant. Reprise : les rôles canvas/surface/ink/muted/action doivent rester cohérents ; ne pas réintroduire des couleurs de fond fixes dans les composants communs.

## Phase 7 — Mode clair (périmètre annoncé avant édition)

Nouveaux `lib/theme.ts`, `components/ThemeControl.tsx`, tests de thème ; `app/globals.css` et `app/layout.tsx`. Conversion des couleurs de présentation dans les fichiers suivants (sans changement de requêtes métier) :

- `app/completer-profil/page.tsx`
- `app/conditions/page.tsx`
- `app/confidentialite/page.tsx`
- `app/connexion/page.tsx`
- `app/dashboard/anniversaires/page.tsx`
- `app/dashboard/calendrier/page.tsx`
- `app/dashboard/calendrier_saints/page.tsx`
- `app/dashboard/ce-mois-ci/page.tsx`
- `app/dashboard/contacts/[id]/edit/page.tsx`
- `app/dashboard/contacts/nouveau/page.tsx`
- `app/dashboard/contacts/page.tsx`
- `app/dashboard/donnees/page.tsx`
- `app/dashboard/generate/page.tsx`
- `app/dashboard/gift-ideas/page.tsx`
- `app/dashboard/inviter/CarteInvitation.tsx`
- `app/dashboard/inviter/page.tsx`
- `app/dashboard/layout.tsx`
- `app/dashboard/messages-programmes/page.tsx`
- `app/dashboard/notifications/page.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/profil/page.tsx`
- `app/guide-notifications/page.tsx`
- `app/inscription/page.tsx`
- `app/invitation/[token]/FormulaireInvitation.tsx`
- `app/invitation/[token]/LienInvalide.tsx`
- `app/invitation/[token]/page.tsx`
- `app/layout.tsx`
- `app/page.tsx`
- `app/patchnote/page.tsx`
- `app/reset-password/page.tsx`
- `components/AccordionGroup.tsx`
- `components/AppLayout.tsx`
- `components/AppSelect.tsx`
- `components/AuthDrawer.tsx`
- `components/ContactSearchFilters.tsx`
- `components/DrawerContext.tsx`
- `components/DrawerGlobal.tsx`
- `components/EvenementsMois.tsx`
- `components/FavorisRow.tsx`
- `components/HeroSection.tsx`
- `components/IconeLuneIA.tsx`
- `components/InstallPWAButton.tsx`
- `components/MenuLateral.tsx`
- `components/MenuNavigation.tsx`
- `components/NotificationBell.tsx`
- `components/OfflineBanner.tsx`
- `components/PWARegistration.tsx`
- `components/ProgrammerRappel.tsx`
- `components/ProgressBar.tsx`
- `components/ProgressRing.tsx`
- `components/PushNotificationsGuide.tsx`
- `components/PushPermissionButton.tsx`
- `components/StarryBackground.tsx`

Également `lib/constants.ts` pour les badges partagés. Les SVG exclus et images restent intacts.

### Phase 7 — Résultat et contrôles

- Palette inspirée du fond utilisateur : ivoire chaud / bleu nuit / or, variantes sémantiques `canvas`, `surface`, `ink`, `muted`, `accent`, `action`, états. Sombre par défaut ; sélecteur clair/sombre/système dans les navigations et le pied de page global. Choix enregistré localement, synchronisé entre contrôles/onglets ; stockage refusé géré sans bloquer l'UI. Initialisation statique avant peinture pour respecter le choix dès le chargement. Pas de dépendance ajoutée.
- Conversion des couleurs de présentation dans les pages et composants annoncés : textes secondaires opaques plutôt que blanc à faible opacité, surfaces/formulaires/menus lisibles dans les deux modes, accents centralisés. Couleurs officielles OAuth et certaines illustrations/catégories restent intentionnellement fixes. Les emails gardent leur propre rendu, indépendant du thème web.
- Page offline autonome adaptée aux deux thèmes ; worker passé à `ephemer-static-v5` pour renouveler cette ressource publique. Politique de cache privé inchangée. Test du worker actualisé et réussi.
- Contrôles finaux : `npm run lint` **0 erreur / 37 avertissements** ; `npm run build` **succès, TypeScript et 35 pages** ; `node --test` des sept fichiers **35/35**. Tests de thème : choix système/explicite, stockage refusé et contraste ≥ 4,5:1 pour neuf couples de tokens dans les deux thèmes. Cela ne constitue pas une certification de contraste de toutes les compositions avec transparence.
- L'outil d'aperçu a d'abord déclenché des erreurs ESLint (imports CommonJS, puis composant anonyme) ; conversion ESM et nom du composant corrigés, sans désactivation de règle. Une exécution de tests a rencontré EPERM dans le bac à sable, puis a réussi avec l'autorisation d'exécution adaptée. Aucun téléchargement de dépendance.
- `tests/ui-preview.mjs` : rendu SSR de vrais composants avec Supabase neutralisé, aucune hydratation, aucune action de formulaire, CSP interdisant les connexions. Six contrôles HTTP locaux réussis (connexion, reset, données × clair/sombre). Serveur local arrêté après contrôles. `npm run dev` non lancé : l'aperçu isolé évite les services réels. Pas de capture visuelle : navigateur intégré indisponible et inventaire des navigateurs vide dans cette session.
- `git diff --check` a signalé deux espaces finaux dans le menu, supprimés. Aucun fichier d'environnement, migration, clé ou donnée distante modifié ; aucun commit ni déploiement.
- Références : [Tailwind — tokens et variables](https://tailwindcss.com/docs/theme), [Next — NextResponse](https://nextjs.org/docs/app/api-reference/functions/next-response).

### Complément mobile demandé

Revue statique transversale des pages App Router et composants visuels (grilles, largeurs, hauteur des panneaux, champs, actions, texte long). Fichiers supplémentaires : `public/offline.html`, `public/sw.js`, `tests/phase5-pwa.test.mjs`, outil d'aperçu et tests de thème.

Corrections :
- navigation publique autorisant le retour à la ligne ; menu dashboard compact ; champs nom/prénom des formulaires concernés empilés sur petit écran ; cartes de raccourcis empilées sous 380 px ; calendrier conservé sur sept colonnes ;
- panneau auth limité à 90dvh et défilant, menus latéraux en hauteur dynamique, modal d'import en 90dvh ; marges basses adaptées à la zone système ; panneau cloche positionné entre les marges gauche/droite sans calcul de largeur fragile ;
- champs rétractables dans les grilles/flex, textes longs sécables, police des champs à 16 px jusqu'à 640 px pour limiter le zoom automatique iOS ; boutons/champs de 44 px de hauteur minimale sur pointeur tactile ; zoom utilisateur toujours autorisé ;
- animations réduites si l'appareil le demande ; retrait de l'opacité du texte des anneaux de progression qui rendait les événements éloignés illisibles.

**Limite explicite : on ne peut pas affirmer « tout est responsive » sur la seule base du code.** La recette visuelle tactile reste à faire à 320, 360, 390, 768 et 1280 px, en clair et sombre, puis paysage/clavier ouvert/zoom 200 %, Safari iOS installé et Chrome Android. Vérifier connexion/reset, invitation, édition/import contacts, générateurs/cartes cadeaux, calendrier et panneau détail, cloche/menus, messages longs et export. L'aperçu sans réseau couvre uniquement la structure SSR des trois écrans mentionnés ; aucun parcours authentifié ni interaction mobile réelle validé.

### Reprise et priorités restantes

1. Valider un modèle Supabase avant toute persistance : naissance jour/mois/année nullable, préférence prénomale, série d'événements/récurrence, journal de traitement/livraison. Demandes 1–4 et 8 donc **partielles**, pas artificiellement complétées par de nouveaux champs supposés.
2. Définir ensuite le webhook Resend vérifié, la conservation des identifiants et des états, les reprises et alertes automatiques. Aucun expéditeur push ajouté ; invitations toujours bloquées comme précédemment.
3. Fusion de doublons : prévoir le déplacement transactionnel des relations (rappels/notifications/invitations), arbitrage champ par champ et vérification RLS avant de proposer une suppression. Le présent lot n'effectue que le rapprochement/confirmation de création, sans fusion.
4. Confirmer l'adresse de support (emails : `ephemer.team@gmail.com`, page confidentialité : `contact@ephemer.name`) et les mentions de l'exploitant. L'adresse postale fournie est intégrée sans inventer de raison sociale/SIRET.
5. Recette mobile et accessibilité complète avant déploiement ; conserver les contrôles de contraste et les tests simulés. En cas de problème de thème, corriger le token ou composant concerné, sans masquer les débordements globalement ni réintroduire un fond sombre fixe.

Commandes finales de revue (les fichiers non suivis doivent être ouverts séparément) :

```powershell
npm run lint
npm run build
node --test tests/phase1-security.test.mjs tests/phase2-auth.test.mjs tests/phase3-delivery.test.mjs tests/phase4-dates.test.mjs tests/phase5-pwa.test.mjs tests/product-improvements.test.mjs tests/theme.test.mjs
git status --short
git diff --check
git diff
# Aperçu statique isolé facultatif, arrêter avec Ctrl+C :
node tests/ui-preview.mjs
```

## Suivi du 19 septembre 2026 — régression visuelle signalée sur localhost

- Signalement : fond blanc dans les deux choix, textes pâles, lune démesurée et perte de charme. Capture fournie par l’utilisateur, sur localhost:3000 ; aucun commit requis pour voir les modifications locales.
- État Git : toutes les modifications du lot précédent étaient présentes ; conservées intégralement. Aucun reset, suppression, commit ou déploiement.
- Diagnostic confirmé : les deux cartes principales avaient reçu le même dégradé neutre ; le SVG de décor était étiré par `preserveAspectRatio="xMidYMin slice"` sur toute la surface. Ces choix appauvrissaient le rendu et agrandissaient excessivement la lune.
- Diagnostic NON confirmé : la cause exacte du fond blanc dans le navigateur de l’utilisateur. La feuille CSS actuellement servie par localhost:3000/connexion contient bien les palettes, le fond du body et les règles clair/sombre. Plusieurs couleurs de la capture correspondent à des styles antérieurs aux fichiers actuels. Un état ancien après actualisation à chaud/cache reste une hypothèse, pas une preuve. Ne pas considérer ce symptôme résolu tant que le parcours connecté n’est pas revérifié.
- Limite de la validation précédente : tests de valeurs et compilation sans validation du rendu réel ; ils ne pouvaient pas détecter le problème observé.
- Fichiers corrigés : app/globals.css (sélecteur sombre explicite et palettes des cartes), components/CelestialBackdrop.tsx (lune dimensionnée, décor inférieur indépendant), app/dashboard/page.tsx (deux cartes distinctes), tests/theme.test.mjs (contraste des cartes et émission réelle des classes Tailwind), ce journal.
- Vérifications : `node --test tests/theme.test.mjs` : 4/4 ; `npm run lint` : 0 erreur, 37 avertissements ; `npm run build` : réussi, TypeScript et 35 pages ; `git diff --check` : réussi.
- Contrôle visuel : outil navigateur intégré indisponible ; Chrome headless installé a permis des captures de l’aperçu SSR isolé de connexion (clair et sombre à 1280 × 900), sans données utilisateur ni appels Supabase. Les thèmes sont distincts et les textes lisibles. Une première capture a révélé une limite rectangulaire du décor, corrigée ensuite en séparant les motifs hauts/bas. Ce n’est pas un test du changement interactif de thème, ni du dashboard authentifié, ni une certification responsive. Aucun paquet installé.
- Reprise : recharger localhost avec Ctrl+Maj+R, tester successivement Clair puis Sombre. Si le blanc persiste, inspecter dans le navigateur concerné l’attribut data-theme de html, les styles calculés --canvas/background-color, la feuille CSS chargée et l’erreur du badge Next ; ne pas attribuer arbitrairement la cause au cache. Préserver les modifications locales et ne pas vider de données utilisateur.

## Suivi du 19 septembre 2026 — vérification des layouts après nouveau signalement

- Nouvelle capture utilisateur : sur /dashboard, Sombre et Clair produisent toujours le même fond blanc. Incident toujours ouvert ; le contrôle isolé précédent ne prouve pas la correction du dashboard.
- Lecture : app/layout.tsx importe globals.css ; app/dashboard/layout.tsx emploie bg-canvas et les couleurs sémantiques. AppLayout et DrawerGlobal ne définissent pas de thème concurrent. Recherche ciblée des CSS, styles globaux et mutations data-theme : aucun fond blanc fixe couvrant le dashboard identifié dans les sources inspectées.
- Vérification HTTP : le serveur localhost:3000 sert les variables --canvas et les nouvelles palettes des cartes. Le JS de connexion contient le décor dimensionné actuel, sans l'ancien preserveAspectRatio slice. Cela ne permet pas de déterminer les styles effectivement chargés dans l'onglet utilisateur.
- Test interactif réel : Chrome headless, profil temporaire distinct, page Next.js http://localhost:3000/connexion, toutes les requêtes externes bloquées via interception réseau. Sélection du contrôle réel Clair → Sombre → Clair, après hydratation. Valeurs calculées body/main : rgb(250, 246, 239) → rgb(11, 20, 37) → rgb(250, 246, 239). Texte main : rgb(23, 52, 86) → rgb(247, 242, 233) → rgb(23, 52, 86). Le layout racine et le changement interactif fonctionnent dans ce contexte. Aucun compte, cookie utilisateur, envoi ou accès de production utilisé.
- Limite : pas d'accès à l'onglet Chrome connecté de l'utilisateur ; aucun contournement de l'authentification du dashboard. Un relevé limité à data-theme, --canvas, couleurs calculées du body et URLs CSS a été demandé à l'utilisateur. Cause exacte toujours non confirmée ; ne pas conclure arbitrairement à un cache ou à un layout défectueux.
- Modifications de ce suivi : journal uniquement, toutes les modifications existantes préservées. Pas de relance lint/build pour cette seule documentation ; dernière compilation et dernier lint réussis au suivi précédent.
- Prochaine étape : comparer le relevé navigateur utilisateur aux valeurs ci-dessus, puis corriger uniquement la cause démontrée. Aucun nouveau correctif visuel spéculatif.


## Interrupteur de thème dans le menu latéral — 19 septembre 2026

- L’utilisateur confirme que les thèmes fonctionnent désormais. Aucun diagnostic définitif supplémentaire sur l’ancien affichage blanc n’est établi.
- Demande : remplacer le sélecteur par un interrupteur soleil/lune inspiré du markup Uiverse/JkHuger fourni, bleu nuit et or, uniquement dans MenuLateral.
- Fichiers : components/ThemeControl.tsx, components/MenuLateral.tsx, components/HeroSection.tsx, app/layout.tsx, app/dashboard/layout.tsx, lib/theme.ts, public/offline.html, public/sw.js, tests/theme.test.mjs, tests/phase5-pwa.test.mjs, ce journal.
- Interrupteur natif checkbox/role switch, libellé « Mode sombre », focus visible, zone 80 × 44 px, icône soleil/lune décorative et transitions respectant la réduction des animations globale. Menu fermé rendu inert pour éviter les contrôles hors écran accessibles au clavier.
- Aucun sélecteur dans les headers ou le footer. ThemeSync reste monté au niveau racine sans interface, pour suivre les changements du système sur toutes les pages. Sans préférence explicite : système automatique. Après clic : choix clair/sombre mémorisé ; les anciens choix explicites restent conservés, y compris après rechargement. L’ancienne valeur system reste compatible sans option visible. Synchronisation entre onglets et repli mémoire si stockage indisponible.
- Page hors ligne alignée sur ce défaut automatique ; cache public incrémenté de v5 à v6 pour livrer son nouveau contenu, sans élargir les ressources cachées.
- Commandes : node --test tests/theme.test.mjs tests/phase5-pwa.test.mjs (premier essai EPERM du sandbox, relance autorisée réussie : 11/11) ; npm run lint (0 erreur, 37 avertissements) ; npm run build (TypeScript et 35 pages réussis) ; recherche des usages ThemeControl (menu latéral uniquement), git diff --check (espace résiduel retiré).
- Limite : rendu et interaction du nouvel interrupteur dans le menu connecté non vérifiés visuellement dans cette passe. À contrôler : ouverture du menu, clic/espace, mobile, rechargement et préférence système sans choix mémorisé. Aucun nouveau paquet, aucune modification SQL/secrets/production, aucun commit ; modifications antérieures préservées.
- Avant commit : git status --short puis git diff ; examiner aussi les fichiers non suivis.

## Correctif d’exécution du thème — 19 septembre 2026

- Incident signalé : Next.js signalait un script rencontré pendant le rendu React dans `app/layout.tsx`, puis `ThemeSync` était interprété comme un élément différé invalide.
- Cause : l’initialisation avait été ajoutée avec une balise HTML `<script>` dans le layout React et un composant client de synchronisation était monté dans le layout racine.
- Correction : remplacement par `next/script`, avec identifiant et stratégie `beforeInteractive`, conformément au mécanisme Next.js prévu pour un script critique du layout racine. `ThemeSync` est supprimé. Le script reste autonome, applique le thème avant le premier rendu et suit les changements du système tant qu’aucun choix clair/sombre n’est mémorisé.
- Fichiers modifiés : `app/layout.tsx`, `components/ThemeControl.tsx`, `lib/theme.ts`, `tests/theme.test.mjs`, ce journal.
- Vérifications : `node --test tests/theme.test.mjs` : 4/4 ; `npm run build` : réussi, TypeScript et 35 pages ; `npm run lint` : 0 erreur, 37 avertissements existants.
- Reprise : arrêter puis relancer `npm run dev` afin de vider l’état HMR déjà chargé, puis recharger `/dashboard`. Aucun commit, secret, migration, appel distant ou donnée utilisateur modifiée.

## Correctif sans script React — 19 septembre 2026 (validation dev complétée ci-dessous)

- Second incident signalé : `next/script` avec `beforeInteractive` déclenchait encore l’avertissement React pendant un rendu côté client. L’état Turbopack référençait aussi un ancien import de `ThemeControl` dans `HeroSection`, alors que cet import n’existait plus dans le fichier source.
- Correction : suppression complète de `next/script`, de `THEME_INIT` et de toute balise script liée au thème dans le layout. Le premier rendu suit maintenant le système uniquement en CSS avec `prefers-color-scheme`. Un composant client autonome, `components/ThemeRuntime.tsx`, applique ensuite la préférence enregistrée et écoute les changements du système, du stockage et du bouton.
- Fichiers concernés : `app/layout.tsx`, `app/globals.css`, `components/ThemeRuntime.tsx`, `lib/theme.ts`, `tests/theme.test.mjs`, ce journal. Aucun retour de `ThemeControl` dans `HeroSection` ou les headers/footer.
- Vérifications : 11/11 tests thème et PWA réussis ; `npm run lint` : 0 erreur, 37 avertissements existants ; `npm run build` : TypeScript et 35 pages réussis ; serveur de production local neuf sur le port 3100 puis Chrome headless avec réseau externe bloqué : contenu rendu, thème clair système appliqué, aucune erreur console et aucun overlay Next.js. Serveur arrêté après contrôle.
- Point important pour le développement : l’erreur de module mentionnant `HeroSection` provient d’un graphe de modules Turbopack ancien. Après cette correction, arrêter complètement le processus `npm run dev`, le relancer, puis ouvrir la page. Un simple rechargement peut conserver le graphe cassé.
- Aucun commit, suppression de cache utilisateur, migration, secret, appel distant ou donnée utilisateur modifiée.

## Cache HTTP des modules en développement — 19 septembre 2026

- Incident persistant : module ThemeControl demandé par HeroSection malgré la suppression de cet import. Les précédentes validations en production ne couvraient pas le mode développement ; leur conclusion était trop large.
- État Git vérifié, toutes les modifications préexistantes conservées. Sources relues : next.config.ts, package.json, HeroSection, PWARegistration et la stratégie de cache du service worker. Le worker actuel ne cache pas les chunks Next.js.
- Anomalie mesurée AVANT correction, avec `npm run dev -- --port 3000` : trois chunks `/_next/static/chunks/*.js` répondent 200 avec `Cache-Control: public, max-age=3600, must-revalidate`. La règle générique sur les extensions JS/CSS de next.config.ts s'appliquait aussi aux fichiers internes Next.js. Le navigateur pouvait ainsi conserver pendant une heure des modules devenus incompatibles. Ce mécanisme explique une incohérence de versions ; le contenu exact du cache de l'onglet utilisateur n'a pas été inspecté.
- Correction limitée à next.config.ts : exclusion de `/_next/` de la règle des assets publics et règle `no-store, must-revalidate` en développement. Aucun changement de bundler ni de dépendance.
- Mesure APRÈS redémarrage automatique de Next : les trois mêmes URLs de chunks répondent 200 avec `Cache-Control: no-store, must-revalidate`.
- Vérification réelle en DEV/Turbopack : Chrome headless neuf, profil temporaire, tous les appels externes bloqués, navigation `/` → `/connexion` → `/`. Trois pages avec contenu, thème appliqué, aucune exception JavaScript, aucune erreur console et aucun overlay d'erreur. Ce contrôle ne couvre pas le dashboard authentifié.
- `npm run lint` : 0 erreur, 37 avertissements existants ; `npm run build` : réussi, TypeScript et 35 pages. Serveur de développement laissé disponible sur http://localhost:3000 pour la reprise utilisateur.
- Les réponses déjà présentes dans un ancien cache ne peuvent pas recevoir rétroactivement le nouvel en-tête. Pour l'ancien onglet : ouvrir F12, cocher Network/Réseau → Disable cache/Désactiver le cache puis recharger. Ne pas effacer les cookies ou données du compte. Si nécessaire, comparer avec une fenêtre privée avant toute autre modification.
- Aucun commit, aucune suppression de fichier/cache, aucune modification de secrets ou de ressources distantes. Avant commit : `git status --short` puis `git diff -- next.config.ts AUDIT-CORRECTIONS.md`.
