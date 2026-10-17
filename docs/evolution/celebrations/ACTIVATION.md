# Activation des célébrations à plusieurs

17 octobre 2026. **Le correctif est installé humainement et le catalogue corrigé est conforme**, confirmé par l’utilisateur puis par une vérification indépendante READ ONLY. **Le module est ouvert localement avec `npm run dev`** pour les deux comptes pilotes. Les builds de production restent fermés jusqu’au GO général après recette réelle.

À la demande de l’utilisateur, une deuxième base Supabase n’est plus obligatoire pour cette tranche. Le protocole actuel est [GO-PRODUCTION.md](GO-PRODUCTION.md). Les anciennes recettes de copie restent protégées et ne doivent jamais être exécutées dans la base de l’application.

## Ordre restant

1. Installation du correctif et [vérification en lecture seule](verification-production.sql) **terminées** : `celebrations_production_catalogue_conforme`. Ne pas réinstaller `schema-propose.sql`.
2. Lancer `npm run dev`. `CELEBRATIONS_ENABLED` est activé en développement uniquement, sans variable supplémentaire. Un build de production reste fermé pendant la recette.
3. Parcours fonctionnels réels effectués avec les deux comptes successivement : [résultats](RECETTE-PILOTE.md). Restent les courses et rejeux réels avec deux profils indépendants ; les changements successifs de session ne les prouvent pas. Utiliser uniquement des célébrations dédiées depuis l’application, sans SQL de données de test.
4. Donner le GO général après réussite réelle des parcours et contrôles. Le commit et le déploiement restent humains. L’effacement d’un compte réel n’est pas testé ; cette limite et les courses non observées doivent être consignées.

Les préconditions du correctif et douze scénarios SQL synthétiques passent en READ ONLY. `npm run verify` réussit après correction du formulaire : **418 tests**, TypeScript/build, zéro erreur lint et cinq avertissements préexistants. Navigateur à 320/390/1440 px, deux thèmes, clavier, panne réseau, changement de compte et révocation : réussi avec données fictives. Les contrôles réels effectués ensuite avec les deux comptes sont consignés dans [RECETTE-PILOTE.md](RECETTE-PILOTE.md) ; les courses entre sessions indépendantes restent non effectuées.

## Boutons disponibles localement

- **Préparation personnelle existante** : « Inviter des Étoiles à cette célébration » → sélectionner les éléments → vérifier l’aperçu → confirmer → inviter depuis la copie partagée. Notes, coordonnées, brouillons et budget restent privés.
- **Célébration créée seul** : Organisation → Participants → « Inviter des Étoiles » → confirmer le passage à plusieurs → choisir une Étoile → « Inviter cette Étoile ». La célébration garde son identifiant ; aucune invitation implicite.
- **Célébration déjà partagée** : Organisation → Participants → « Inviter des Étoiles ». Le destinataire répond lui-même.

Une surprise exclut son destinataire de tous les accès. Sans identité valide, son partage est suspendu et sa clôture reste possible pour un organisateur autorisé.

Aucune commande SQL métier, installation, activation générale ou suppression de compte n’a été exécutée par l’assistant.
