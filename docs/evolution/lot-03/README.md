# Lot 03 — Listes personnelles privées

**5 octobre 2026 — application manuelle confirmée, contrat distant vérifié en lecture seule ; interface, types, API et export intégrés localement.** Recette avec comptes A/B sur copie isolée restante. Voir [le suivi actuel](../SUIVI.md#intégration-après-installation--5-octobre-2026). Ne pas réexécuter `schema-propose.sql` sur ce projet.

**Historique avant installation :** le filtre « Favoris uniquement » avait été livré seul, en attendant les nouvelles tables. Les sections suivantes conservent le dossier de revue et les métadonnées initiales ; l’état actuel est celui du suivi.

Cadre : [section 3 du plan](../../PLAN-EVOLUTION-EPHEMER.md#3-cadre-commun-à-tous-les-prompts), [AGENTS.md](../../../AGENTS.md), [modèle métier](../MODELE-METIER.md) et [suivi](../SUIVI.md). Le lot 03 est autonome ; le dossier du lot 02 n’est ni appliqué ni réécrit ici.

## 1. Schéma réel inspecté et fichiers

Branche `main`, commit `6cc97c2`. Connecteur Supabase, requêtes de catalogues en `BEGIN READ ONLY` : projet `ephemer-app`, référence `zwjdgkvlqwplffxfykrl`, PostgreSQL 17.6.1.104. Dix tables publiques, toutes avec RLS ; aucune table de listes ni d’événements du lot 02. `contacts.id` est un bigint obligatoire ; `contacts.user_id` un UUID nullable. Les seules contraintes de contacts sont sa clé primaire et la FK d’invitation ; aucune unicité propriétaire/identifiant ni FK vers Auth.

Les triggers Auth, contacts et profiles ont été relus : création de profil et synchronisation des prénoms/noms ; notification de contact uniquement avec `invitation_id` renseigné. Aucun de ces triggers inspectés n’envoie d’email. Les seuls champs Auth obligatoires sans default sont `id`. Relire les triggers de la **copie** avant les fixtures : cette preuve ne garantit pas qu’un autre environnement est identique.

| Fichier | Usage |
|---|---|
| [schema-propose.sql](schema-propose.sql) | Proposition transactionnelle à relire, tester sur copie puis appliquer manuellement. Elle refuse une installation déjà présente. |
| [verification.sql](verification.sql) | A : catalogues et assertions en lecture seule. B : comptes fictifs et tests clients, désactivés par défaut, rollbackés sur copie isolée seulement. |
| [retour-arriere.sql](retour-arriere.sql) | Retour transactionnel réservé aux tables vides, sans destruction en cascade des dépendances. |

Les noms de tables représentent un **contrat proposé**, pas des objets installés. Aucun `supabase/migrations/**`, secret, dépendance, déploiement ou commit modifié. Schémas exposés par la Data API non confirmés : `pgrst.db_schemas` vaut NULL dans la session inspectée. Rattachement des environnements Vercel et réglages Auth non vérifiés dans ce lot.

## 2. Données, références et cycle de vie

| Donnée | Propriétaire, visibilité et durée |
|---|---|
| `listes_personnelles` | Compte Auth propriétaire ; UUID, nom et date de création. Lecture privée exclusivement. Persiste jusqu’à sa suppression ou celle du compte. |
| `appartenances_listes` | Même propriétaire que la liste et le contact ; UUID, références et date de création. Lecture privée exclusivement. Persiste jusqu’au retrait, à la suppression de la liste, du contact ou du compte. |

Une fiche peut appartenir à plusieurs listes ; la paire liste/contact est unique. Les FK **composées** imposent le propriétaire aux deux ressources, même en contournant les RLS avec un admin. L’insertion client vérifie également leur accessibilité par des sous-requêtes soumises aux RLS ; pas de boucle récursive sur les appartenances.

Le nom est nettoyé avant envoi : espaces de début/fin retirés, longueur de 1 à 80 caractères PostgreSQL. La base refuse un nom entouré d’espaces ASCII ; elle ne le réécrit pas avec un trigger. `lower(btrim(nom))` est unique par propriétaire : « Famille » et « famille » sont un doublon chez A, mais B peut avoir son propre « Famille ». Les accents ne sont pas supprimés. La future validation client compte les caractères Unicode, pas les unités UTF-16.

Suppression de liste : ses appartenances seulement ; aucun contact effacé. Suppression de contact : ses appartenances seulement, les autres comportements historiques restent inchangés. Suppression Auth : cascades sur les deux tables nouvelles. Le manque de FK Auth de `contacts` et `profiles` n’est pas corrigé par ce lot ; le nettoyage serveur actuel conserve ses limites non atomiques.

Les anciennes relations et favoris ne créent aucune liste automatique. Aucun contact historique, naissance, note ou invitation n’est modifié. Les contacts sans propriétaire restent en place et ne peuvent pas être rattachés. Une modification de propriétaire d’un contact déjà classé est refusée par la FK tant que ses appartenances existent.

La clé unique `(user_id,id)` de contacts est réutilisée si une contrainte non différée compatible existe. Sinon, la proposition ajoute `lot03_contacts_owner_id` et l’identifie par commentaire pour le rollback. Le dossier du lot 02 doit être **relu** s’il est appliqué ensuite, afin de réutiliser cette clé plutôt que multiplier les indexes équivalents.

Indexes : unicité du nom par propriétaire, clé propriétaire/identifiant des listes, paire liste/contact, pagination propriétaire/identifiant des appartenances, recherches et cascades propriétaire/liste et propriétaire/contact. Aucun index ou default historique réécrit.

## 3. Permissions minimales

| Rôle | Listes | Appartenances |
|---|---|---|
| `authenticated`, propriétaire | SELECT, INSERT des champs id/user_id/nom, UPDATE du nom uniquement, DELETE ; RLS par opération. | SELECT, INSERT des références et identifiants, DELETE ; RLS par opération. Aucun UPDATE. |
| Autre compte, ami, membre ou administrateur de constellation, ex-membre, destinataire, visiteur avec lien | Aucun droit sur les lignes du propriétaire. | Aucun droit sur les lignes du propriétaire. |
| `anon` / `PUBLIC` | Aucun privilège accordé. | Aucun privilège accordé. |
| `service_role` | SELECT uniquement. | SELECT uniquement. |

Les defaults de grants existants sont larges : le script retire les droits des rôles clients et serveur sur les **deux tables nouvelles**, puis accorde explicitement ceux de la matrice. `created_at` est produit par le default et non fourni/modifié par un client. Identifiants et propriétaire ne sont pas modifiables. Aucun TRUNCATE, REFERENCES ou TRIGGER client. Les administrateurs plateforme gardent leurs privilèges techniques.

L’identité RLS vient de `auth.uid()`, jamais de `user_metadata`. La policy UPDATE de liste comporte `USING` et `WITH CHECK`. RLS et droits de colonnes sont complémentaires : masquer un champ dans l’interface ne protège pas la base. **Aucune fonction créée**, donc aucun nouveau droit EXECUTE ou `search_path` à définir ; aucune nécessité de `SECURITY DEFINER`. Aucun Storage et aucun fichier à effacer.

`service_role` contourne les RLS : le futur endpoint mensuel devra vérifier le token avec `getUser`, puis filtrer explicitement liste, appartenances et contacts par ce propriétaire. L’octroi SELECT ne vaut pas preuve de cette autorisation applicative, encore non implémentée.

Sources officielles consultées : [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [droits par colonne](https://supabase.com/docs/guides/database/postgres/column-level-security), [changelog](https://supabase.com/changelog).

## 4. Application progressive et retour arrière

1. Confirmer le projet et l’environnement cible, ses colonnes, contraintes, grants, defaults et triggers. Lire les quatre fichiers. Vérifier que les nouvelles tables ne sont pas exposées par une configuration contraire aux droits attendus.
2. Sauvegarder le schéma/permissions/contraintes et les contacts historiques ; vérifier une restauration sur copie. Après utilisation, sauvegarder aussi les deux tables nouvelles, avec leurs UUID et références, et les comptes de référence. Ne pas déposer ces exports privés dans Git.
3. Sur **copie isolée explicitement autorisée**, appliquer manuellement `schema-propose.sql`. Exécuter A puis B, les scénarios de concurrence et le rollback. Les services externes, crons et intégrations sortantes de la copie doivent être désactivés. Le marqueur B ne détecte pas techniquement une copie : c’est une déclaration humaine, jamais à activer en production.
4. Après revue des résultats, appliquer manuellement sur la cible validée. Relire A et confirmer les grants effectifs/Data API. Sans ces preuves, conserver l’application actuelle sans appeler les nouvelles tables.
5. Régénérer les types depuis Supabase, puis intégrer les parcours locaux décrits ci-dessous. Ne pas activer les écritures avant extension de l’export et vérification de l’effacement.

Le script de schéma est une transaction, avec timeouts de verrouillage/exécution ; une erreur empêche l’ensemble des changements de valider. Après erreur SQL Editor, terminer la transaction en échec avec `ROLLBACK` si la session l’a conservée. Ne pas masquer une divergence par `IF NOT EXISTS` et ne pas relancer une installation existante.

Le rollback verrouille avant son contrôle, refuse tant que listes ou appartenances existent et utilise `RESTRICT` pour les objets. Il ne retire que la clé contacts identifiée comme ajoutée par ce lot ; une clé préexistante est conservée. Toute dépendance d’un autre lot fait échouer la transaction entière. **Ne pas vider les tables pour faire passer le garde.** Après utilisation, toute décision de retrait exige sauvegarde, rapprochement avec l’export et traitement explicite des nouvelles données ; pas de restauration CSV de naissances ou de suppression silencieuse. Répéter le rollback n’est pas prévu.

## 5. Recettes préparées, non exécutées

A fournit tables, colonnes, contraintes, indexes, policies et grants effectifs, avec assertions RLS/permissions. Relire aussi les expressions de policies et FK affichées ; les assertions de catalogues seules ne prouvent pas l’isolation réelle.

B s’arrête **avant sa première écriture** sans déclaration de copie isolée. Les UUID fictifs sont contrôlés avant insertion. Les emails utilisent `example.invalid`. Toutes les mutations de B sont dans une transaction terminée par ROLLBACK. Les valeurs de séquences de contacts peuvent néanmoins avancer sur la copie : PostgreSQL ne rollbacke pas les séquences. Aucun compte réel n’est utilisé ou supprimé.

B exerce A, B et `anon`, sans création de fonctions de test : création/renommage, noms doublons/invalides, appartenance multiple, refus de contact/liste d’un autre propriétaire, usurpation de propriétaire, absence de droit UPDATE d’appartenance, métadonnée `admin` sans effet, lecture/renommage/suppression entre comptes refusés, FK testées aussi par admin, liste vide, retrait/ajout, cascades de liste/contact/Auth et maintien des valeurs relation/favori/note. Une fixture de 205 listes prépare la pagination. La reprise du rôle A **n’est pas une reconnexion navigateur** ; une transaction unique ne prouve pas la concurrence.

### Concurrence et rollback sur copie : deux connexions SQL distinctes

Utiliser un compte de test A déjà provisionné sur la copie et un de ses contacts. Noter son UUID et l’identifiant réel du contact. Dans **chaque transaction cliente**, exécuter `SET LOCAL ROLE authenticated`, puis définir `request.jwt.claims` avec `sub`/`role` et `request.jwt.claim.sub` avec le même UUID. Ne pas utiliser un compte de production. Les exemples `:a`, `:liste`, `:contact` ci-dessous désignent ces valeurs à remplacer, pas des variables du SQL Editor.

| Scénario | Connexion 1 | Connexion 2 et résultat attendu |
|---|---|---|
| Nom concurrent | BEGIN + identité A ; `INSERT INTO public.listes_personnelles(nom) VALUES ('Course lot03');` ; laisser ouvert. | BEGIN + identité A ; insérer `'course lot03'` ; attend le premier COMMIT, puis échoue avec 23505. Faire ROLLBACK en connexion 2. Une seule liste après relecture. Si le premier fait ROLLBACK, le second peut réussir. |
| Paire concurrente | BEGIN + identité A ; `INSERT INTO public.appartenances_listes(liste_id,contact_id) VALUES (:liste,:contact);` ; laisser ouvert. | Même insertion avec la même identité ; après premier COMMIT, 23505 puis ROLLBACK. Une seule appartenance. La future UI relit cette paire avant de reconnaître un succès déjà obtenu. |
| Renommage concurrent | BEGIN + identité A ; `UPDATE public.listes_personnelles SET nom='Premier' WHERE id=:liste AND nom='Course lot03' RETURNING id;` ; laisser ouvert. | Même condition d’ancien nom, nouveau nom `'Second'`. Après premier COMMIT, zéro ligne retournée ; signaler le conflit, recharger, ne pas écraser. |
| Suppression pendant ajout | BEGIN + identité A ; supprimer une liste vide sans COMMIT. | Ajouter à cette liste dans une seconde transaction : après validation de la suppression, pas d’appartenance orpheline (refus RLS/FK). Tester aussi l’ordre inverse : ajout validé puis suppression, cascade de la seule appartenance. |
| Retour arrière avec données | Conserver au moins une liste de test, puis lancer `retour-arriere.sql` comme admin sur la copie. | Le garde doit échouer avant DROP ; ROLLBACK, puis vérifier liste/contact intacts. Supprimer ensuite **explicitement les seules fixtures autorisées**, sauvegarde faite, et tester le rollback vide. |

Ces fixtures de concurrence peuvent être validées par COMMIT **sur la copie** afin d’être visibles des deux connexions. Les nettoyer par leurs identifiants connus, jamais par un DELETE général, et réappliquer le schéma avant les autres recettes si le rollback a été testé.

Recette HTTP/Auth après intégration : déconnexion/reconnexion réelle A, puis connexion B ; A retrouve ses appartenances, B ne voit ni noms ni compteurs ni contacts A. Appels directs avec token B et identifiants A refusés. Refaire après changement de session pendant une requête. Anonyme : 401 sur le endpoint mensuel ; UUID invalide : 400 ; liste absente/inaccessible : même 404 ; liste vide personnelle : 200 et zéro événement.

Export après intégration : plus de 200 listes/appartenances, toutes présentes dans le JSON versionné, filtres d’écran sans effet sur le périmètre d’export ; erreur ou changement de compte empêche le téléchargement. Effacement de compte fictif via l’API : vérifier nouvelles cascades et maintien des annonces d’erreur/incomplétude actuelles. Ces parcours attendent l’interface et ne sont pas exécutés ici.

## 6. Intégration applicative restant à faire après confirmation

- Types générés réels pour les deux tables ; lectures avec [pagination existante](../../../lib/pagination.ts), filtre propriétaire et protection [des réponses tardives](../../../lib/request-scope.ts). Données en mémoire de page uniquement ; pas de localStorage, IndexedDB ou cache privé PWA.
- Dans Mes contacts, filtre Liste + Favoris uniquement, combinables avec recherche/relation/tri ; réutiliser [useContactFilters](../../../lib/hooks/useContactFilters.ts). Sélecteur « Toutes les listes » par défaut. Modal existante « Gérer mes listes » pour CRUD et cases à cocher par contact ; suggestions de noms, pas de listes automatiques. Actions séparées, succès après confirmation, saisie conservée et erreurs explicites. Aucun UPDATE global d’appartenances.
- Renommage avec condition sur l’ancien nom et contrôle de la ligne retournée ; zéro ligne = conflit/inaccessibilité, pas faux succès. Ajout : INSERT, si 23505 relire la paire possédée ; ne pas utiliser un upsert UPDATE. Suppression : confirmer que les contacts restent. Changement de session : ignorer les réponses de l’ancien compte et vider l’état.
- Sélecteur identique calendrier, dashboard, anniversaires à venir, événements mensuels ; contacts filtrés avant calcul des dates. Saints publics conservés. Chaque écran revient à Toutes les listes à l’ouverture ; aucun changement du moteur de dates dans ce lot.
- `GET /api/evenements-mois?liste=<UUID>` facultatif ; identité et propriétaire vérifiés avant lecture admin. Validation UUID, 400 invalide, même 404 pour liste absente/inaccessible, 200 vide pour liste personnelle vide. Sans paramètre : comportement existant. Pas de données privées dans logs/analytics.
- [Export](../../../lib/user-data.ts) : ajouter les deux ensembles paginés, augmenter la version actuelle, mêmes contrôles de session et refus d’export incomplet. [Suppression de compte](../../../app/api/delete-account/route.ts) : vérifier les cascades nouvelles, conserver le nettoyage et les limites structurelles existants.
- Recette mobile/desktop/clavier : modal, labels, focus, liste vide, erreur, actions en cours, noms longs, filtre combiné et réglette alphabétique. Secours hors ligne explicite ; aucune promesse de carnet privé hors ligne. Tests comportementaux existants sans nouveau framework, puis `npm run verify`.

## 7. Résumé à valider humainement

Valider **deux tables privées**, leurs noms et le maximum de 80 caractères, l’unicité sans distinction de casse, les FK composées/cascades, les droits par colonne et les index. Confirmer la cible, la sauvegarde/restauration, les résultats des recettes isolées et la possibilité de retrait avant application. Aucune donnée partagée, nouveau Storage, RPC ou `SECURITY DEFINER` nécessaire.

Le vocabulaire Étoiles/Constellations/Mon univers est consigné au modèle ; les préférences et envies partagées attendent les lots sociaux et leurs contrats de confidentialité. Le présent dossier ne transmet rien à l’IA. **Prochaine étape : test/revue et application manuelle, puis contrôle distant en lecture seule ; l’intégration applicative demeure en attente.**
