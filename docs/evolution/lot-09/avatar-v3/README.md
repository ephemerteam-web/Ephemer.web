# Avatar V3 — enregistrement dans le compte intégré

**8 octobre 2026 : extension appliquée humainement et résultat `avatar_v3_catalogue_conforme` confirmé par le fichier complet en READ ONLY sur ephemer-app. Types réels régénérés par Supabase dans `types/database.generated.ts`, puis intégration applicative réalisée.** Aucune mutation distante effectuée par l’assistant. Ne pas réappliquer les schémas.

8 octobre 2026. Deux bases Homme/Femme, quatre bouches, huit yeux, huit coiffures plus Sans cheveux, huit vêtements, trois visages, palettes nommées et accessoires combinables. Les bases concernent uniquement le dessin, aucun champ d’identité. SVG original local, tous les choix gratuits, sans dépendance, animation ou appel payant.

L’interface affiche seulement **Avatar** et **Personnaliser mon avatar** : l’éditeur classique est retiré, ses moteurs sont conservés pour les publications historiques. L’atelier regroupe les seize choix en douze catégories : visage/teint, coiffure/couleur, yeux/couleur, vêtement/couleur, base, bouche, fond et cinq accessoires. Un clic ouvre leur palette en pop-up ; le portrait complet reste visible et se met à jour pendant les choix. Bouches et yeux agrandis, couleurs nommées, radios au clavier. **Utiliser ce choix** revient à l’atelier ; **Annuler ce choix** ou Échap restaure la sélection précédente, couleurs comprises. Réinitialiser et fermer sont explicites. Les essais restent en mémoire jusqu’à **Valider les modifications**, sans stockage navigateur persistant.

## Enregistrement dans le compte

Dans **`/avatar` → Personnaliser mon avatar**, **Valider les modifications** écrit réellement dans `avatars_utilisateurs`, avec session vérifiée, RLS propriétaire et révision attendue. La page s’ouvre depuis le rectangle du profil ou le cercle du menu latéral. L’éditeur est retiré de la page profil. Création/modification explicites ; une réponse perdue est relue avant toute nouvelle écriture. Après conflit, la saisie reste intacte et le bouton attend **Relire la version enregistrée**. Cette relecture conserve les choix en cours. Annuler n’écrit rien. Changer de compte remonte l’éditeur et ignore ses réponses tardives.

Le portrait enregistré apparaît dans le rectangle du profil, le bouton du header et le cercle du menu. Un contexte commun recharge l’avatar à l’ouverture et au retour sur la fenêtre, puis diffuse les sauvegardes confirmées. Les essais et les annulations ne modifient pas ces aperçus. Pendant une lecture indisponible, l’initiale reste disponible. `/avatar` est réécrit vers `/dashboard/avatar` pour conserver le layout privé et les protections de brouillon ; Auth, absence de cache public et secours hors ligne restent applicables. Aucune modification SQL requise.

Ordre du plan et du cadre commun, section 3, respecté :

1. Revoir [schema-propose.sql](schema-propose.sql), puis **application humaine uniquement**. Il remplace le validateur et revalide trois contraintes. Ne pas réappliquer les schémas historiques 08/09.
2. Exécuter [verification-lecture-seule.sql](verification-lecture-seule.sql) **en entier**. Résultat attendu : `avatar_v3_catalogue_conforme`.
3. Résultat confirmé à distance ; types réels régénérés avant le branchement (les colonnes JSON restent génériques).
4. **Valider les modifications**, dispatcher et copie volontaire dans les cartes connectés selon [CONTRAT-APPLICATION.md](CONTRAT-APPLICATION.md). Export toujours en version 7.

Un avatar V1 valide reste enregistré jusqu’à validation volontaire d’un avatar V3. L’éditeur montre le nouveau défaut avec une explication ; aucune conversion ni écriture silencieuse. Une configuration inconnue produit également un défaut expliqué et reste conservée en base. Une panne de lecture bloque l’édition, distincte d’une absence de ligne.

L’extension est **installée et son catalogue confirmé**. Aucune recette mutante sur le projet principal. Faute de copie disponible, conserver le garde de [verification.sql](verification.sql).

## Contrat et compatibilité

`AvatarConfigV3` contient exactement `format:2`, `catalogVersion:3`, `renderVersion:3`, onze identifiants et un objet `accessories` fermé à cinq identifiants. Refus des champs supplémentaires, mauvaises formes JSON, versions inconnues, couleurs libres, SVG/HTML et données de profil. La collection V2 expérimentale, jamais enregistrée, est refusée par le contrat de persistance.

Les moteurs historiques sont intacts. Le dispatcher accepte V1/V3 et restitue exactement le SVG V1. La composition des cartes format/rendu 2 est conservée ; leur avatar facultatif accepte maintenant les deux configurations. **Ajouter mon avatar / Actualiser depuis mon profil / Retirer l’avatar** modifie seulement la saisie : enregistrer le brouillon est obligatoire avant publication. Modifier le profil ne synchronise aucun brouillon/publication. La consultation valide strictement la copie publiée, sans relire le profil.

`CREATE OR REPLACE FUNCTION` conserve les droits. Les trois contraintes sont recréées et validées dans une transaction verrouillée, pour contrôler les données existantes après changement du validateur. [Documentation PostgreSQL 17](https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS). Aucune nouvelle table/colonne ou permission propriétaire ; RLS inchangées. [Documentation Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

[retour-arriere.sql](retour-arriere.sql) refuse toute configuration non V1 dans profil/brouillon/publication et toute dépendance ultérieure du validateur. Restauration du corps V1 exact, contraintes revalidées, aucune suppression/réécriture/CASCADE.

## Vérifications

**`npm run verify` : résultat final consigné dans [RECETTE-APPLICATION.md](RECETTE-APPLICATION.md).** Tests, TypeScript et build de production ; 0 erreur lint, 11 avertissements préexistants. `git diff --check` et contrôle des fichiers nouveaux font partie de la livraison.

- Tests Node : catalogues, identifiants hostiles, copie profonde, annulation des palettes, conservation des choix au changement de base, concordance SQL/TypeScript, sauvegarde V3, conflit, réponse perdue et export 7 avec base simulée. HTML des trois modèles de cartes avec avatar V1 comparé aux empreintes capturées avant intégration : exactement identique. Routes HTTP simulées V3 : projection sans profil privé et aucune lecture de profil.
- SVG React réel : **1 152 combinaisons** des deux bases, huit teints, neuf coiffures et huit vêtements avec accessoires simultanés. Chaque option produit un rendu distinct ; toutes les combinaisons n’ont pas été inspectées visuellement.
- **169 expressions SQL réelles en READ ONLY, zéro divergence**, sans création de fonction ni modification de catalogue. Ce test ne prouve pas l’installation ni les écritures RLS.
- Aperçu : `node tests/avatars-preview.mjs`, [ouvrir l’atelier](http://127.0.0.1:3209/), vrais composants/CSS, **sauvegarde simulée**, exemples fictifs et réseau client interdit. Remontage au changement de compte fictif. Pour l’enregistrement réel, lancer `npm run dev` et ouvrir `/dashboard/profil` avec son compte.
- [RECETTE-APPLICATION.md](RECETTE-APPLICATION.md) distingue les contrôles locaux et les recettes distantes restantes.

Aucun SQL distant mutant, secret, dépendance, migration, commit ou déploiement. Le branchement réel est livré ; les écritures avec vrais JWT, reconnexion/autre appareil, conflits distants et cascades restent à recetter sur des comptes fictifs autorisés.
