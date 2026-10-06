# Suppression du compte

La route `app/api/delete-account/route.ts` vérifie le jeton avec Supabase Auth et utilise uniquement l'identifiant de cet utilisateur. Elle supprime ses contacts, puis son profil, puis son compte Auth. La moindre erreur de suppression arrête les étapes suivantes et renvoie HTTP 500. Une session absente ou invalide est refusée avec HTTP 401 avant tout nettoyage. Le succès est renvoyé uniquement après la réussite des trois étapes.

Le profil est conservé si la suppression des contacts échoue. Les messages d'erreur précisent le nettoyage déjà effectué ou, lorsqu'un résultat est incertain, la possibilité d'une suppression partielle. Le formulaire affiche cette erreur, conserve la session et permet de réessayer. Les nettoyages acceptent l'absence de lignes, ce qui permet de reprendre après un premier nettoyage réussi.

## Limite du schéma actuel

Selon le schéma confirmé lors de l'audit, `profiles.id` et `contacts.user_id` n'ont pas de clé étrangère vers `auth.users`. Leurs suppressions explicites sont donc nécessaires. Les invitations, préférences, quotas, rappels, abonnements push et notifications ont déjà des cascades vers Auth ; la route s'appuie sur celles-ci.

Les trois appels séparés ne garantissent pas une suppression « tout ou rien ». Si le profil ou Auth échoue après la suppression des contacts, des données ont déjà disparu. Une réponse réseau perdue peut également rendre le résultat incertain. Une écriture concurrente dans les tables sans clé étrangère peut encore créer des données orphelines. Le correctif évite le faux succès après une erreur signalée, mais ne résout pas ces limites structurelles et ne nettoie pas les anciennes données orphelines.

Pour garantir un nettoyage atomique, faire valider humainement dans le dashboard Supabase des clés étrangères avec `ON DELETE CASCADE` de ces deux colonnes vers `auth.users(id)`. Vérifier auparavant les lignes orphelines existantes et les autres contraintes. Une fois les cascades validées et testées, la route pourra supprimer uniquement Auth : le nettoyage des tables liées fera alors partie de la même transaction en base. Ce correctif ne modifie pas le schéma ni les migrations.

## Vérification locale

`node --test tests/account-deletion.test.mjs` exécute le vrai handler avec une base et Auth simulés : accès refusés, erreurs à chaque étape, exceptions, succès, isolation entre utilisateurs et reprise après suppression partielle. Aucun compte réel n'est supprimé et aucune variable d'environnement n'est chargée.

## Extension aux lots 04/05 — 6 octobre 2026

Les contrats confirmés de `preparations_evenements`, `taches_preparation`, `idees_cadeaux`, `choix_cadeaux` et `cadeaux_offerts` ont chacun une clé `user_id` vers Auth avec `ON DELETE CASCADE`. La suppression Auth finale efface donc les préparations, brouillons, notes et historiques du compte. Aucune suppression directe via service role n'est ajoutée : ses droits sur ces nouvelles tables sont volontairement limités à la lecture.

La suppression d'un contact seule détache ses références et conserve les nouveaux historiques. La suppression d'une idée détache sa référence du choix ; retirer un don lié à un choix conserve la dépense du choix. L'effacement explicite d'un événement efface ses occurrences et dépendances selon le contrat installé, après confirmation de l'utilisateur.

L'export JSON version 3 inclut les cinq tables, avec filtre propriétaire et contrôle final de session. Les tests applicatifs vérifient cet export et ses refus ; la cascade Auth doit aussi être exercée avec les fixtures SQL sur une copie autorisée, sans compte réel. Ces nouvelles cascades ne rendent pas atomique l'ensemble des anciens appels de suppression.

## Contrats proposés des lots 06/07

Les quatre nouvelles tables proposées de styles, affectations et catégories auront des cascades Auth ; contact supprimé retire seulement ses préférences, style supprimé retire ses affectations sans réécrire les anciens messages. Ces contrats sont **non installés** à cette étape. Aucune référence à une table absente n'est ajoutée à la route de suppression ni à l'export. Après confirmation et intégration : export version 4 pour les trois tables de styles, puis version 5 pour les catégories ; recette d'effacement uniquement avec comptes fictifs sur copie autorisée. Voir les dossiers [06](evolution/lot-06/README.md) et [07](evolution/lot-07/README.md).

## Installation et intégration des lots 06/07 — 6 octobre 2026

Cette étape remplace le statut proposé ci-dessus : application manuelle confirmée par l'utilisateur, `lot06_catalogue_conforme` et `lot07_catalogue_conforme` relancés par l'assistant en lecture seule, types réels régénérés. Les quatre cascades Auth et les références composées sont confirmées au catalogue. La route conserve la suppression Auth finale : aucun DELETE direct service role sur ces tables n'est ajouté. Suppression contact : affectations et intérêts retirés ; suppression style : défaut et affectations retirés, messages existants conservés. L'export version 5 inclut les quatre tables, filtre le propriétaire et refuse le changement de session. Les fixtures de suppression restent réservées à une copie autorisée, sans compte réel ; la confirmation du catalogue ne constitue pas une recette de cascade exécutée par l'assistant.
