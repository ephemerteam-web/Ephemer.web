# Suppression du compte

La route `app/api/delete-account/route.ts` vérifie le jeton avec Supabase Auth et utilise uniquement l'identifiant de cet utilisateur. Elle supprime ses contacts, puis son profil, puis son compte Auth. La moindre erreur de suppression arrête les étapes suivantes et renvoie HTTP 500. Une session absente ou invalide est refusée avec HTTP 401 avant tout nettoyage. Le succès est renvoyé uniquement après la réussite des trois étapes.

Le profil est conservé si la suppression des contacts échoue. Les messages d'erreur précisent le nettoyage déjà effectué ou, lorsqu'un résultat est incertain, la possibilité d'une suppression partielle. Le formulaire affiche cette erreur, conserve la session et permet de réessayer. Les nettoyages acceptent l'absence de lignes, ce qui permet de reprendre après un premier nettoyage réussi.

## Limite du schéma actuel

Selon le schéma confirmé lors de l'audit, `profiles.id` et `contacts.user_id` n'ont pas de clé étrangère vers `auth.users`. Leurs suppressions explicites sont donc nécessaires. Les invitations, préférences, quotas, rappels, abonnements push et notifications ont déjà des cascades vers Auth ; la route s'appuie sur celles-ci.

Les trois appels séparés ne garantissent pas une suppression « tout ou rien ». Si le profil ou Auth échoue après la suppression des contacts, des données ont déjà disparu. Une réponse réseau perdue peut également rendre le résultat incertain. Une écriture concurrente dans les tables sans clé étrangère peut encore créer des données orphelines. Le correctif évite le faux succès après une erreur signalée, mais ne résout pas ces limites structurelles et ne nettoie pas les anciennes données orphelines.

Pour garantir un nettoyage atomique, faire valider humainement dans le dashboard Supabase des clés étrangères avec `ON DELETE CASCADE` de ces deux colonnes vers `auth.users(id)`. Vérifier auparavant les lignes orphelines existantes et les autres contraintes. Une fois les cascades validées et testées, la route pourra supprimer uniquement Auth : le nettoyage des tables liées fera alors partie de la même transaction en base. Ce correctif ne modifie pas le schéma ni les migrations.

## Vérification locale

`node --test tests/account-deletion.test.mjs` exécute le vrai handler avec une base et Auth simulés : accès refusés, erreurs à chaque étape, exceptions, succès, isolation entre utilisateurs et reprise après suppression partielle. Aucun compte réel n'est supprimé et aucune variable d'environnement n'est chargée.
