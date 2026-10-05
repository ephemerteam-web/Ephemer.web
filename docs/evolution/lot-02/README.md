# Lot 02 — Dossier SQL de revue des dates et événements privés

**5 octobre 2026 — application manuelle confirmée puis contrat inspecté en lecture seule sur ephemer-app.** Types régénérés et code intégré localement ; recette authentifiée isolée restante. Voir [l’état actuel dans le suivi](../SUIVI.md#intégration-après-installation--5-octobre-2026). Ne pas réexécuter `schema-propose.sql` sur ce projet.

Les sections suivantes décrivent le dossier de revue et l’état historique **avant application** (base locale `main`, `6cc97c2`) ; elles ne doivent pas être interprétées comme une absence actuelle du schéma.

Cadre : [plan, section 3 et Prompt SQL](../../PLAN-EVOLUTION-EPHEMER.md#prompt-sql--préparer-le-schéma-du-prochain-lot-sans-lappliquer), [modèle métier](../MODELE-METIER.md), [AGENTS.md](../../../AGENTS.md) et [suivi](../SUIVI.md). Aucun SQL distant de mutation, nouveau déploiement, dépendance, migration, changement de secret ou code applicatif. Aucune donnée réelle lue ou modifiée ; seules des métadonnées et expressions SQL constantes sont consultées. Aucune recette de mutation distante, même avec `ROLLBACK`, n’est exécutée.

## 1. État réellement confirmé

Lectures du connecteur Supabase au 5 octobre 2026, toutes les requêtes de catalogue dans `BEGIN READ ONLY` / `COMMIT` :

- `list_projects` : seul projet retourné, **ephemer-app**, référence `zwjdgkvlqwplffxfykrl`, état `ACTIVE_HEALTHY`, PostgreSQL **17.6.1.104**. Le contrôle local de `NEXT_PUBLIC_SUPABASE_URL` confirme la correspondance avec ce projet, sans imprimer sa valeur. Le rattachement des configurations Vercel preview/production n’est pas confirmé.
- Dix tables `public`, toutes avec RLS : `contacts`, `invitations`, `notification_preferences`, `notifications`, `patch_notes`, `profiles`, `quotas_ia`, `rappels`, `saint_du_jour`, `user_push_subscriptions`. Aucun événement, règle ou occurrence proposé ci-dessous ; aucun schéma `ephemer_lot02`.
- `contacts.id` : `bigint`, PK ; `user_id` : `uuid` nullable ; `date_naissance` : `date` nullable. Aucune naissance partielle ni fête choisie persistée. FK d’invitation seule sur contacts ; aucune FK vers Auth sur son propriétaire.
- `profiles.id` : UUID non nullable ; prénom texte et naissance date nullables. Son trigger `trg_sync_profiles_to_auth` intervient après INSERT ou UPDATE de prénom/nom ; la fonction inspectée copie ces deux champs vers les métadonnées Auth, sans appel externe. Une mise à jour de naissance seule ne déclenche pas cette synchronisation.
- `notifications.contact_id` et `rappels.contact_id` sont actuellement `bigint NOT NULL`, FK vers contacts avec cascade ; leur propriétaire a une FK vers Auth avec cascade. Aucune colonne de référence à une occurrence.
- Index unique existant de notification : `(user_id, contact_id, type, event_date, jours_restants)`. Cette identité par date ne suffit pas après correction d’une occurrence ; elle est conservée pour les données anciennes.
- `rappels.type_rappel` accepte seulement `j30`, `j7`, `jourj` ; statuts `programme`, `envoye`, `annule`. Le dossier ne modifie pas ces enums/checks, ne crée pas de faux statut de livraison et n’y ajoute pas J-1/J-3 : les paliers du récapitulatif in-app ont déjà un autre contrat.
- Trigger contacts `trg_notifier_invitation` : après insertion ; aucune notification si `invitation_id` est NULL. Trigger Auth `on_signup` : appelle `create_profile`, qui insère id/email/prénom/nom dans profiles. Définitions inspectées pour préparer les fixtures, sans les appeler. Le seul champ Auth non nullable sans défaut est `id` dans les métadonnées consultées.
- Les anciennes policies/droits du lot 00 sont encore présents. Ce dossier ajoute les droits minimaux des objets nouveaux ; il ne prétend pas régler le quota, le rapprochement, les invitations P2, les defaults gérés ou le journal email absent.

Le changelog Supabase et la documentation officielle ont été consultés : [changelog](https://supabase.com/changelog), [tables et FK](https://supabase.com/docs/guides/database/tables), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). L’index Markdown du changelog n’était pas lisible par l’outil Web ; la page HTML a été lue. Aucun changement de SDK n’est nécessaire pour ce dossier.

## 2. Périmètre et source des données

Seulement le noyau **privé** du lot 02 : naissance partielle, fête choisie, date personnelle ponctuelle ou annuelle, versions de règle, occurrences, visibilité et suspension de rappel. Aucune table de préparation, liste, cadeau, carte, avatar, ami, cercle, envie, réservation, paiement ou récompense. Les garanties d’amitié/réservation/publication des futurs lots ne sont pas introduites maintenant. Aucun Storage, fichier uploadé ou règle de bucket à ajouter.

La naissance et le choix de fête sont portés par leurs événements/règles privés. `contacts.note` reste inchangé. Un seul événement anniversaire et un seul événement fête par propriétaire/contact, ou pour le compte lui-même sans contact. L’origine contact/compte reste explicite même après détachement d’un contact supprimé. Cette organisation évite une deuxième représentation indépendante de la naissance partielle dans contacts/profiles.

**Source canonique après sauvegarde explicite :** événement et règle, même si l’événement est masqué, suspendu ou archivé. Pour un contact ou son propre profil sans événement anniversaire enregistré, le futur lecteur utilise encore sa date historique ; 1900 reste ambigu, âge inconnu, aucune conversion persistée. Aucune création automatique d’événement ou reprise de masse dans ce SQL.

Lorsqu’un utilisateur confirme une naissance, la RPC met aussi à jour `contacts.date_naissance` ou son propre `profiles.date_naissance` pour les lecteurs anciens : vraie date uniquement si l’année est explicitement connue, sinon NULL. Cette projection n’est plus la source métier. Le trigger interdit ensuite un ancien formulaire qui tenterait une date différente du contrat enregistré. Supprimer explicitement l’événement anniversaire efface cette projection pour éviter une réapparition par fallback. **Ces changements ne surviennent pas à l’application du schéma vide**, seulement à une action explicite dans le futur parcours.

Pour les fêtes, le choix est obligatoire avant toute nouvelle occurrence validée. Les fêtes calculées historiquement sans choix pourront être proposées à confirmer dans la future UI ; elles ne deviennent pas automatiquement une préférence. Les anciens messages/rappels restent des programmations anciennes avec `occurrence_id = NULL`.

## 3. Tables, références et contraintes proposées

| Objet | Données minimales et propriété | Intégrité et cycle de vie |
|---|---|---|
| `evenements_personnels` | UUID, propriétaire Auth, origine contact/compte, contact facultatif, type/titre, récurrence, visibilité, rappels, confirmation de fête, archivage, arrêt après cycle, révision. | FK Auth cascade ; FK `(user_id, contact_id)` vers contacts du même propriétaire. Anniversaire/fête annuels, issus du contact choisi ou du profil du compte courant. Date personnelle ponctuelle par défaut ; annuelle uniquement explicitement. |
| `regles_evenements` | UUID, propriétaire/événement, intervalle de cycles, jour/mois, année de naissance facultative, date ponctuelle ou clé de fête, état retiré. | FK composée vers le bon événement ; contrôle de calendrier et correspondance de fête. Intervalles actifs sans chevauchement, sous verrou du parent. Anciennes versions conservées, jamais remplacées en écrasant l’historique. |
| `occurrences_evenements` | UUID, propriétaire/événement/règle, cycle, date civile, libellé historique, exception, annulation, révision. | FK composée vers la règle du même propriétaire et événement ; clé unique `(evenement_id, cycle)`. Identité immuable, date cohérente sauf exception explicite. Archive/arrêt ne suppriment pas l’historique. |
| `ephemer_lot02.fetes_catalogue` | Référence non personnelle : prénom normalisé, mois/jour. | 483 correspondances uniques issues des 366 entrées actuelles de `SAINTS`. Privé au sens Data API, accessible seulement aux fonctions contrôlées ; aucune saisie utilisateur. FK de règle vers une correspondance réelle. |
| `ephemer_lot02.etat_schema` | Une ligne technique, témoin de première utilisation. | Passe irréversiblement à « utilisé » dans les transactions de mutation ; protège le retour arrière même si tous les événements sont ensuite effacés. Aucun nom, contenu ou historique utilisateur. |
| Extensions `notifications` et `rappels` | `occurrence_id` et `occurrence_revision` facultatifs ; `contact_id` devient nullable pour une date du compte. | FK composée occurrence/propriétaire et vérification du contact associé ; contact ou occurrence obligatoire. Les anciennes lignes restent inchangées. Révision d’alerte obsolète distinguable de la révision courante. |

`cycle = 0` est uniquement une **clé technique ponctuelle**, jamais une année de naissance ou une date. Une série annuelle utilise l’année de référence, de 1 à 9999. Reporter le cycle 2027 à janvier 2028 garde son UUID et son cycle 2027 ; l’anniversaire 2028 reste distinct. La date `YYYY-MM-DD` n’est jamais la clé de dédoublonnage.

Le 29 février est observé le **1er mars** les années non bissextiles, y compris 2100. L’année 2000 sert seulement à vérifier jour/mois en mémoire SQL, comme dans les helpers actuels ; elle n’est jamais enregistrée comme naissance inconnue. Une année connue est valide et ne décrit pas une naissance future. Une date personnelle ponctuelle exige une année réelle.

Les FK ne suffisent pas seules à déterminer les types de règles : les triggers vérifient la forme et l’identité d’occurrence. Les insertions concurrentes ne peuvent pas créer deux occurrences du même cycle. L’index nouveau de palier `(user_id, occurrence_id, type, jours_restants)`, avec NULL traités comme identiques, évite aussi un doublon après modification de date ; l’index historique est conservé.

Indexes : propriétaire/événement/début de cycle pour règles, propriétaire/date/id pour lecture paginée des occurrences, contact et règle pour relations/cascades, occurrence des rappels pour nettoyage. La contrainte unique composée contacts est additive ; le PK existant rend ses paires non dupliquées. Les anciennes lignes sans propriétaire ne sont pas « réparées » ou adoptées automatiquement.

## 4. Droits et fonctions contrôlées

| Rôle | Lecture des trois tables personnelles | Création/modification/suppression | Catalogue et témoin privés |
|---|---|---|---|
| `anon` / visiteur, même avec lien | Aucun privilège. | Aucun EXECUTE des nouvelles entrées. | Aucun accès. |
| `authenticated` | SELECT, RLS `(select auth.uid()) = user_id`. | Pas de DML direct ; RPC cliente, identité dérivée de `auth.uid()` et compte Auth encore existant. Ressource et références contrôlées à chaque mutation. | Aucun accès aux tables ; USAGE du schéma seulement pour appeler les fonctions explicitement autorisées. |
| Ami, membre, administrateur, ex-membre ou destinataire d’un contact | Exactement le droit de son compte sur ses propres données. Aucun rôle social n’ouvre les dates privées d’autrui. | Même règle ; aucun droit dérivé de `user_metadata`. | Aucun accès. |
| `service_role` | SELECT privilégié pour le travail serveur, filtre de propriétaire toujours requis dans le code futur. | Seulement RPC de matérialisation serveur explicitement accordée ; pas de DML direct nouveau. Pas d’appel à la place d’un utilisateur via la RPC cliente. | Aucun accès direct aux tables. |
| Propriétaire SQL / plateforme autorisée | Administration et application humaines. | Revue, sauvegarde et opérations nécessaires. | Administration technique. |

Les tables nouvelles ont RLS activée et seulement une policy SELECT propriétaire. Pas de policies INSERT/UPDATE/DELETE permissives : la voie de mutation passe par les RPC. `REVOKE ALL` retire les grants hérités de `PUBLIC`, `anon`, `authenticated` et `service_role` sur ces objets, puis accorde le minimum. Les defaults gérés antérieurs restent un sujet C1 distinct.

Les entrées `public` sont **SECURITY INVOKER**. Les mutations atomiques contrôlées sont **SECURITY DEFINER** dans `ephemer_lot02`, à laisser hors schémas exposés par la Data API. Ce privilège répond à un besoin précis : clients sans DML direct, contrôle des références, écriture de plusieurs tables/version/projection dans une seule transaction. Toutes les fonctions ont `search_path = pg_catalog` et des noms de ressources qualifiés ; tous les EXECUTE implicites sont retirés, helpers et triggers inclus. La fonction serveur acceptant `p_user` est réservée à `service_role` ; les entrées clientes n’acceptent aucun propriétaire fourni librement.

La plateforme doit confirmer les schémas exposés et le propriétaire SQL des nouvelles fonctions après installation. Exposer `ephemer_lot02` ne fait pas partie du dossier. Une fonction ne doit pas être rendue publique pour résoudre une erreur de permission. Aucun objet `public` SECURITY DEFINER nouveau.

### Contrat RPC à confirmer avant les types et le code

| Entrée publique | Usage et garde |
|---|---|
| `enregistrer_evenement_lot02(p_donnees jsonb)` | Création/édition atomique. Clés admises : `id`, `revision`, `contact_id`, `type_evenement`, `titre`, `recurrence`, `jour`, `mois`, `annee_naissance`, `date`, `depuis_cycle`. JSON complet du formulaire, pas de `user_id`, note ou métadonnées. |
| `materialiser_occurrences_lot02(p_debut date, p_fin date)` | Compte courant ; fenêtre technique bornée à 400 jours pour éviter une génération sans limite. Utiliser plusieurs fenêtres paginées, aucune limite produit/abonnement. Une période déjà demandée retrouve les mêmes UUID. |
| `materialiser_occurrences_serveur_lot02(p_user uuid, p_debut date, p_fin date)` | Même calcul, entrée uniquement serveur autorisé ; compte cible existant. Aucune livraison ou génération IA. |
| `modifier_occurrence_lot02(p_id uuid, p_date date, p_annulee boolean, p_revision bigint)` | Exception/annulation de cette occurrence ; clé de cycle/UUID conservée. Révision attendue obligatoire ; conflits `40001`, relire avant nouvel essai. |
| `preferences_evenement_lot02(p_id uuid, p_visible boolean, p_rappels boolean, p_archive boolean, p_arret integer, p_revision bigint)` | Masquage indépendant du rappel, suspension, archivage et arrêt après cycle. Choix de fête incompatible à reconfirmer avant réactivation. |
| `supprimer_evenement_lot02(p_id uuid, p_revision bigint, p_confirmer boolean)` | Effacement explicite de règles/occurrences/alertes liées, avec confirmation ; archivage proposé pour garder l’histoire. Aucune suppression de contact ou compte par cette entrée. |

Création : `revision = 0`, UUID stable créé pour la tentative par le futur client ; rejouer ce même UUID restitue l’objet existant sans écraser un formulaire ultérieur. Sans UUID fourni, une nouvelle ressource est demandée. Modification : UUID existant et révision lue. Une collision sur anniversaire/fête du même contact est refusée par l’unicité ; l’UI doit retrouver la ressource existante, pas inventer une deuxième série.

Types anniversaire/fête : `recurrence = annuelle`, jour/mois, année nullable pour anniversaire seulement, sans champ `date` ; `contact_id` omis désigne le profil du compte courant, jamais un profil tiers fourni librement. Type personnel ponctuel : `date` complète, pas de jour/mois ; récurrence omise = ponctuelle. Type personnel annuel : choix explicite et `date` complète du premier cycle ; jour/mois extraits de cette date. Aucun changement de type, contact ou récurrence d’un événement existant : créer explicitement un nouvel événement et archiver l’ancien, en conservant son historique.

Changer la règle depuis une année conserve les versions antérieures et les UUID matérialisés. Les occurrences futures non exceptionnelles dans la portée sont mises à jour ; les occurrences passées et les reports explicites restent inchangés. Une portée annuelle de modification doit commencer cette année ou plus tard ; une correction historique isolée utilise l’entrée d’exception. Renommer conserve les identités ; les nouveaux écrans emploient le titre courant, l’historique garde le libellé enregistré.

Renommer un contact ou son propre profil avec un prénom normalisé différent suspend sa fête enregistrée et demande confirmation, même si une date pourrait rester compatible. Aucune sélection silencieuse de la première correspondance. Le prochain formulaire peut présenter les correspondances via `nameDays` puis réenregistrer le choix et les préférences souhaitées.

## 5. Alertes, effacement et export

Le SQL fournit une référence d’occurrence et une révision, **sans remettre en service les envois**. L’ancien statut de rappel est conservé. Après correction, annulation, archivage, arrêt ou suspension, le futur consommateur doit comparer date/révision/état/préférences juste avant réservation et envoi ; une alerte obsolète ne doit pas être livrée. Le dossier n’annonce pas une annulation concurrente du prestataire déjà prise en charge : C5 et journal email restent non installés.

Les programmations manuelles ne se déplacent pas automatiquement : présenter confirmation de report ou annulation. Les automatiques peuvent être recalculées sur l’occurrence actuelle. Un palier déjà accepté ne doit pas être réémis par simple changement de date. Les paliers utiles/reprises existants sont réutilisés ; un événement sans contact utilise son titre sans prénom inventé. Ne jamais cocher `email_envoye` pour prétendre à une délivrabilité réelle.

La suppression d’un contact archive ses événements, coupe leurs rappels et détache sa référence ; les occurrences/règles privées restent sous le compte avec le libellé minimal. La suppression de son propre profil archive aussi les événements d’origine compte avant l’étape Auth. Les cascades historiques contacts → rappels/notifications restent celles déjà installées ; ne pas promettre leur conservation. L’effacement Auth supprime les **nouvelles** tables et leurs alertes liées par cascade ; il ne corrige pas les limites anciennes contacts/profiles sans FK ou l’actuelle route non atomique.

L’implémentation devra étendre [l’export](../../../lib/user-data.ts) aux trois tables personnelles et à leurs références/révisions, par propriétaire, avec pagination et refus sur erreur/changement de compte. Catalogue et témoin ne sont pas des données personnelles exportables. L’effacement doit aussi être vérifié via le parcours complet de compte de test autorisé ; aucun faux succès si une phase échoue. Pas de données privées dans les logs, PWA, analytics ou prompts IA.

## 6. Application progressive et sauvegardes

1. Confirmer le projet cible pour chaque environnement, le modèle privé approuvé, le contrat proposé et les grants. Les décisions sociales V1–V4 restent avant leurs lots, sans bloquer ces dates privées. Corriger les écarts utiles C1/C4 dans leur dossier validé ; ne pas réexécuter aveuglément P2.
2. Sauvegarder schéma, contraintes, indexes, grants/policies, triggers et données des contacts/profiles/rappels/notifications dans un emplacement restreint, avec procédure de restauration vérifiée. Le dossier n’ouvre aucune sauvegarde et ne crée pas de dump privé dans Git.
3. Sur une **copie isolée autorisée**, appliquer [schema-propose.sql](schema-propose.sql), tester [verification.sql](verification.sql), contrôler advisors et exposition Data API, puis revoir les défauts observés. Pas d’installation distante automatique par l’assistant. Aucune recette B en production.
4. Avant toute utilisation, tester également [retour-arriere.sql](retour-arriere.sql) sur copie vide ; réappliquer la proposition sur cette copie pour les tests suivants. La proposition échoue si ses objets existent déjà, plutôt que de masquer une divergence avec `IF NOT EXISTS`.
5. Après validation humaine finale, application manuelle sur cible, puis **partie A seulement** pour confirmer tables, signatures, contraintes, grants et triggers. Régénérer les types à partir de ce contrat réel ; pas d’invention dans `database.generated.ts`.
6. Implémenter le lot 02 localement : moteur commun avec `calendar-day.ts`, `date-utils.ts`, `name-days.ts`, lecture canonique + fallback legacy, formulaires, préférences, export/effacement, consommateurs et tests. Les tableaux/dashboard/calendrier/API mensuelle/favoris/anniversaires/newsletter/rappels doivent utiliser la même occurrence. La préparation future réutilisera cette clé, sans table ajoutée au lot 02.
7. Activer les nouvelles écritures seulement après adaptation cohérente de **tous** ces consommateurs, dont les crons. Un ancien lecteur ne peut comprendre une naissance partielle projetée NULL. Ne pas ouvrir un parcours partiellement branché et annoncer la persistance au moyen de localStorage. Déploiement hors de ce dossier ; envois C5 toujours bloqués indépendamment.

### Retour arrière

Le script ne s’applique automatiquement qu’**avant la première utilisation**. Il verrouille les tables avant ses contrôles, exige le témoin inutilisé et des tables/liaisons nouvelles vides, puis retire les objets dans l’ordre, sans `CASCADE`. Un objet d’un lot ultérieur qui dépend d’eux bloque le retrait. Les anciennes contraintes/grants/indexes/policies et triggers n’ont pas été remplacés ; seuls les ajouts nommés et la nullabilité vérifiée des liens sont retirés/restaurés.

Après une écriture, même après effacement des événements, il **refuse**. Une année inconnue ne peut pas être repliée sans perte dans une date complète. Ne pas remettre une année sentinelle. Il faut fermer les écritures, sauvegarder les trois tables nouvelles et les projections modifiées dans contacts/profiles, conserver l’application compatible ou préparer une réconciliation manuelle validée. Une restauration ancienne peut perdre des changements légitimes postérieurs : ne pas restaurer aveuglément un dump ou mettre le témoin à false. Aucun script automatique de destruction après utilisation n’est proposé.

## 7. Recettes préparées et niveau de preuve

`verification.sql` sépare **A**, métadonnées en lecture seule, de **B**, assertions et fixtures Auth/contacts dans une transaction terminée par `ROLLBACK`. B s’arrête par défaut **avant la première écriture**. Son marqueur d’activation est réservé à une copie isolée vérifiée humainement ; il ne prouve pas à lui seul que la connexion vise le bon projet. Relire les triggers Auth de la copie avant fixtures. Identifiants fictifs fixes, domaine `example.invalid`, pas d’email, mot de passe, session réelle ou destinataire de test envoyé.

Fixtures du 5 octobre 2026, dates 2027/2028 : adapter et relire ces dates si le test est lancé après 2028 ; le serveur ne reçoit pas d’horloge falsifiée dans ses RPC. Les insertions Auth servent au contexte RLS fictif et déclenchent le `create_profile` actuellement inspecté. Elles ne testent pas un OAuth, un login navigateur, un rafraîchissement ou une reconnexion réelle.

| Scénario préparé | Vérification attendue |
|---|---|
| Propriétaire A, année absente et 29 février | Année NULL en base ; 2027 → 1er mars, 2028 → 29 février ; deux cycles/UUID distincts, demandes répétées sans doublon. |
| Date civile et année suivante | SQL `date`, jour Paris aux frontières UTC, différence civile au changement d’heure ; occurrence reportée en janvier garde son cycle. |
| Date personnelle ponctuelle/annuelle | Une seule occurrence ponctuelle, aucune répétition 2028 ; une annuelle apparaît après choix explicite, à partir de son premier cycle. |
| Fête choisie | Marie → 15 août valide parmi six correspondances ; 30 avril refusé. Choix retrouvé après changement du contexte Auth SQL et retour à A ; prénom incompatible suspendu. |
| Mutation, version et historique | Revision périmée refusée ; correction 2028 garde 2027 ; correction anniversaire garde une occurrence passée et une exception. Arrêt conserve les lignes historiques, masque/suspension persistés. |
| Alerte sans contact | Contact NULL permis seulement avec occurrence ; unique palier même si date corrigée ; ancienne révision reste identifiée comme obsolète. Aucun faux envoi. |
| B, même déclaré ami/admin/membre/ex-membre/destinataire | SELECT RLS ne voit pas A ; RPC sur événement/contact de A refusée ; revendication dans `user_metadata` inopérante ; DML nouveau direct refusé. Pas de tables sociales créées pour ces fixtures. |
| Visiteur non connecté / serveur | `anon` ne lit pas les tables et n’exécute pas les RPC ; RPC acceptant propriétaire cible refusée au client. Droits serveur contrôlés séparément par métadonnées et test ci-dessous. |
| FK et suppression | Contraintes inter-propriétaires refusées ; contact supprimé → événements archivés/détachés et histoire conservée ; Auth supprimé → nouvelles données sans orphelins ; témoin reste utilisé. |
| Legacy | Date 1900 intacte hors validation explicite ; anciennes programmations gardent liens/contraintes ; pas de backfill ni d’année inventée. |

**Concurrence à exécuter en plus, non simulée par une simple transaction :**

- Préparer sur la copie un compte A et un anniversaire persistés, distincts des fixtures rollbackées. Deux connexions en rôle `authenticated`, même identité A simulée par `request.jwt.claims` et `request.jwt.claim.sub` : appeler simultanément `materialiser_occurrences_lot02` sur la même fenêtre. Une transaction garde son verrou jusqu’au commit ; la seconde attend ou doit réessayer après `lock_timeout`, puis retrouve les mêmes `(evenement_id,cycle)` et UUID. Compter une ligne par cycle, pas deux. Ce contexte SQL ne teste pas la signature cryptographique du JWT.
- Deux éditions avec la même révision : première commit ; seconde doit refuser `40001`, sans écrasement ni règle active qui chevauche. Une répétition réseau de création avec le même UUID/revision 0 ne doit pas créer de deuxième objet.
- Corriger une occurrence pendant une réservation/envoi ne sera testé qu’avec le journal C5 installé et un environnement d’envoi explicitement autorisé. La présence d’un numéro de révision ne prouve pas la prise en charge de cette course.
- Copier des événements A et un contact B sous l’administrateur de **test** pour vérifier directement le FK composé, en complément des refus par rôles clients. Rôle `service_role` : matérialisation autorisée, DML nouveau direct refusé ; rôle `authenticated` : fonction serveur refusée.
- Sur une copie fraîche sans première utilisation, rollback autorisé ; après création puis effacement d’un événement, rollback refusé par témoin. Avec une transaction qui écrit pendant le rollback, les verrous doivent empêcher un contrôle « vide » devenu obsolète. Tout échec doit laisser le contrat intact ou la transaction rollbackée.

Les scripts peuvent bloquer sur leur délai technique de verrou ; cela n’autorise pas à supprimer un contrôle ou à accorder plus de droits. Prévoir retry/relecture dans l’application, pas de boucle automatique d’envoi.

### Vérifications réellement exécutées pendant cette préparation

- Lectures de catalogue/contraintes/indexes/policies/triggers et fonctions historiques, projet indiqué section 1 ; aucune requête sur des fiches ou comptes réels.
- Sept assertions SQL **constantes en lecture seule** vraies : normalisation disponible, clé Hélène → helene, 29 février 2027/2028/2100, jour Paris et distance civile. Elles vérifient les primitives PostgreSQL, **pas les fonctions proposées**, qui n’existent pas sur le projet.
- `node --test tests/phase4-dates.test.mjs tests/product-improvements.test.mjs` : **9 tests existants réussis**, dont dates et requêtes simulées. Ils attestent la base locale réutilisable, pas l’installation du dossier.
- Catalogue généré depuis le fichier local actuel : **483 paires prénom/date**, dates validées et doublons retirés ; SHA-256 de `lib/saints.ts` : `8f5e8ff3be339347c99f540cde90439e7cb2d26d92d9083e593c6a7b850c0977`. Le fichier source n’est pas modifié. Le catalogue doit être revu si ce hash change avant application.
- Relecture statique et contrôles documentaires/Git ; aucune compilation/exécution de ces fonctions ni des recettes B ou du rollback. Aucun exécutable PostgreSQL/Docker/Supabase détecté dans le PATH pour une copie locale ; aucune dépendance installée pour contourner cette limite.

Restent non vérifiés : installation SQL et compilation des fonctions, tests A/B sur schéma installé, concurrence de connexions, exposition Data API effective (`pgrst.db_schemas` non renseigné dans la session inspectée), rattachement des environnements Vercel et validité des secrets, reprise de données historiques, reconnexion/browser et UX clavier/mobile, export/effacement complets, journal email/C5, fournisseurs et crons de production. Le lot applicatif 02 n’est pas livré à ce stade.

## 8. Résumé concret pour validation humaine

Valider les **trois tables privées**, leurs versions et occurrences, la naissance canonique dans la règle avec projection legacy nullable, les fêtes contrôlées par catalogue figé, l’extension nullable des alertes, les RPC privées privilégiées avec wrappers invoker, et le **rollback interdit après première utilisation**. Les choix réversibles de date, masquage/suspension et archivage suivent le modèle du lot 01 ; aucun partage nouveau n’est introduit.

Confirmer d’abord cible et sauvegarde, puis relire et éprouver le dossier sur copie isolée. Après validation, l’utilisateur applique manuellement le SQL dans Supabase ; l’assistant pourra alors confirmer son installation en lecture seule et reprendre le Prompt 02. Ce dossier s’arrête avant application.
