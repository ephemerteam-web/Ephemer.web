# Activation des célébrations à plusieurs

17 octobre 2026. **Le correctif est installé humainement et le catalogue corrigé est conforme**, confirmé par l’utilisateur puis par une vérification indépendante READ ONLY. **GO production demandé explicitement par l’utilisateur après la recette pilote et l’annonce des limites. Le module est activé dans le code pour le développement et la production.** Aucun déploiement effectué par l’assistant ; les courses et rejeux réseau réels restent non testés.

À la demande de l’utilisateur, une deuxième base Supabase n’est plus obligatoire pour cette tranche. Le protocole actuel est [GO-PRODUCTION.md](GO-PRODUCTION.md). Les anciennes recettes de copie restent protégées et ne doivent jamais être exécutées dans la base de l’application.

## Ordre restant

1. Installation du correctif et [vérification en lecture seule](verification-production.sql) **terminées** : `celebrations_production_catalogue_conforme`. Ne pas réinstaller `schema-propose.sql`.
2. `CELEBRATIONS_ENABLED=true` active le module sans variable supplémentaire, en développement comme en production. `npm run verify` prépare et contrôle le build ; le commit et le déploiement restent humains.
3. Parcours fonctionnels réels effectués avec les deux comptes successivement : [résultats](RECETTE-PILOTE.md). Restent les courses et rejeux réels avec deux profils indépendants ; les changements successifs de session ne les prouvent pas. Utiliser uniquement des célébrations dédiées depuis l’application, sans SQL de données de test.
4. Le GO production a été demandé explicitement par l’utilisateur, avec les contrôles non effectués conservés comme limites documentées ; cela ne les transforme pas en réussites. Le commit et le déploiement restent humains. L’effacement d’un compte réel n’est pas testé ; cette limite et les courses non observées doivent être consignées.

Les préconditions du correctif et douze scénarios SQL synthétiques passent en READ ONLY. `npm run verify` réussit après correction du formulaire : **418 tests**, TypeScript/build, zéro erreur lint et cinq avertissements préexistants. Navigateur à 320/390/1440 px, deux thèmes, clavier, panne réseau, changement de compte et révocation : réussi avec données fictives. Les contrôles réels effectués ensuite avec les deux comptes sont consignés dans [RECETTE-PILOTE.md](RECETTE-PILOTE.md) ; les courses entre sessions indépendantes restent non effectuées.

## Boutons disponibles après activation

- **Préparation personnelle existante** : « Inviter des Étoiles à cette célébration » → sélectionner les éléments → vérifier l’aperçu → confirmer → inviter depuis la copie partagée. Notes, coordonnées, brouillons et budget restent privés.
- **Célébration créée seul** : Organisation → Participants → « Inviter des Étoiles » → confirmer le passage à plusieurs → choisir une Étoile → « Inviter cette Étoile ». La célébration garde son identifiant ; aucune invitation implicite.
- **Célébration déjà partagée** : Organisation → Participants → « Inviter des Étoiles ». Le destinataire répond lui-même.

Une surprise exclut son destinataire de tous les accès. Sans identité valide, son partage est suspendu et sa clôture reste possible pour un organisateur autorisé.

L’activation applicative générale est préparée dans le code. Aucun SQL métier, installation SQL, déploiement ou suppression de compte exécuté par l’assistant.

Vérification finale après activation production : **440 tests réussis**, TypeScript et build terminés, zéro erreur lint/cinq avertissements préexistants. Journal : `out/celebrations-production/verify-go-production.txt`. Les courses et rejeux réels restent non effectués.
