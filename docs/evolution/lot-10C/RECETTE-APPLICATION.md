# Recette 10C — intégration locale au 9 octobre 2026

## Preuves disponibles

- Installation effectuée humainement et confirmation fournie par l'utilisateur. Contrôle distant **de métadonnées seulement** : **`lot10c_catalogue_conforme`**. Il vérifie le catalogue combiné 10A/10B/10C, RLS, droits, contraintes et empreintes ; le compteur `incrementer_quota_ia(uuid)` est fermé à PUBLIC/anon/authenticated et ouvert au serveur. Aucun compte, carnet, univers ou secret réel consulté.
- Types TypeScript régénérés depuis le schéma installé : `types/database.generated.ts`. Les types bigint du générateur restent numériques, mais les nouveaux transports de contacts utilisent des chaînes pour préserver la précision.
- `npm run verify` **final réussi : 324 tests, TypeScript et build Next 16.2.6**, zéro erreur lint et 11 avertissements préexistants. Une première tentative de build dans le sandbox a échoué sur une canonicalisation Windows refusée ; la relance hors sandbox autorisée a réussi. Aucun contournement des protections du navigateur.
- `git diff --check` et `node tools/prepare-lot10c-dossier.mjs --check` : réussis. Le contrôle des fichiers est local ; il n'exécute aucune installation.
- Aucun commit, déploiement, nouvelle dépendance, migration ou mutation distante par l'assistant. Le changement indépendant dans `app/invitation/[token]/FormulaireInvitation.tsx` est conservé.

## Simulations HTTP, orchestration et React

Les routes, contrats, logique de génération, prompt et composants réels sont exécutés avec Auth/RPC/base/fournisseur fictifs. Les tests ne représentent pas une validation de vrais JWT ou de la concurrence PostgreSQL.

Couverture :
- Cinq permissions initialement refusées ; champs fermés, partage exigé, identité séparée, textes futurs conservant leur accord.
- Enregistrement atomique des valeurs/partage/IA, reprise avec le même UUID, réponse perdue reconnue par relecture, double clic, conflit conservant le brouillon, masquage gardant les valeurs et l'accord distinct d'identité.
- Refus d'une sauvegarde ancienne sans `iaCadeaux`. Projection de consultation 10B inchangée ; projection cadeaux distincte et sans coordonnées/date/avatar.
- Session vérifiée avant/après, origine, requêtes/réponses bornées, réponses privées sans cache, bigint transmis exactement, champs inconnus/doublons/texte social fourni par le navigateur refusés.
- Seuls les champs privés cochés et les champs sociaux autorisés/sélectionnés relus atteignent le fournisseur simulé ; sources distinctes et textes hostiles traités comme données.
- Refus avant quota pour sélection obsolète ou association incompatible ; nouvelle résolution juste avant fournisseur ; retrait avant envoi bloque la transmission, retrait/session changée au retour écarte le résultat.
- Pas de retry fournisseur ; échec efface les choix et conserve les autres réglages. Génération générale et étoile sans contact ; aucune création automatique.
- Focus/60 secondes visibles, changement de révision, ancienne réponse, changement de compte/relation, page masquée, hors ligne et perte d'association.
- Export **10** contenant les valeurs et permissions du propriétaire seulement ; ancien carnet, idées privées et messages IA couverts par les tests de non-régression. Échec d'une lecture refuse l'export partiel.

Les fichiers `cadeaux-social-integration.test.mjs` et `cadeaux-social-state.test.mjs` complètent les contrats/orchestration/composants préparés. Les tests 10B actifs ont été alignés sur le nouveau DTO propriétaire ; leurs contrats historiques restent testés séparément.

## Recette navigateur intégrée

`node tests/cadeaux-social-preview.mjs` puis `http://127.0.0.1:3212`. Vrais composants React/CSS, vrai transport navigateur de Mon univers et des cadeaux, Auth/réponses HTTP/persistance **fictifs en mémoire**, fournisseur simulé ; CSP `connect-src 'none'`. Aucun réseau distant.

Exécuté :
- 320 × 900 : largeur utile/scroll 305/305 ; 1280 × 900 : 1265/1265. Aucun débordement horizontal.
- Accord auteur avec Espace et sauvegarde avec Entrée ; champ disponible pour le demandeur mais décoché. Choix du demandeur avec Espace puis génération avec Entrée : sélection effacée.
- Étoile sans fiche ; corps navigateur contenant noms des champs, UUID et révisions, aucun texte social.
- Contact associé choisi volontairement, groupe privé distinct avec valeurs visibles ; échec fournisseur simulé effaçant les deux sélections.
- Modification enregistrée du texte : accord auteur conservé, nouveaux contenus relus et deux sélections effacées.
- Perte d'association : combinaison désactivée, contenu social retiré ; bouton **Continuer sans fiche contact** rétablit volontairement le parcours social seul.
- **Garder cette idée** puis **Enregistrer** : une seule écriture fictive dans `idees_cadeaux`, `contact_id:null` ; aucun contact inséré.
- Hors ligne : projection et résultats issus du social retirés, génération désactivée ; retour en ligne relit les informations. Retrait de relation : source effacée et étoile inaccessible.
- Changement entre le compte auteur et demandeur : composants remontés par compte, aucun ancien brouillon ou choix réutilisé.
- Captures : `out/lot10c/preview/integration-mobile.png` et `integration-desktop.png`. Serveur/onglet temporaires arrêtés et viewport rétabli à la fin.

Les contrôles du menu après retrait et du lien étoile/contact incompatible sont également couverts par les tests d'état. Le parcours avec une préparation et la non-régression des messages restent couverts par les tests locaux, sans simulation d'un déploiement complet connecté à Supabase.

## Recettes distantes explicitement reportées

1. **Vrais JWT A/B/C/anon** : propriétaire, étoile active, demande en attente, ancienne relation, blocage et utilisateur non connecté ; appels directs REST/RPC, impossibilité d'obtenir des champs masqués, quota client fermé et quota serveur autorisé.
2. **Copie isolée autorisée** : exécuter `verification.sql` avec son garde après neutralisation des triggers/webhooks externes. Fixtures `lot10c-*@example.invalid` et ROLLBACK ; claims SQL simulés, donc distincts des vrais JWT. Les cascades et droits sur données ne sont pas validés par le seul catalogue.
3. **Concurrence PostgreSQL et réseau** : deux onglets, retrait/blocage/permissions/association pendant une résolution et un fournisseur lent, réelle réponse perdue, verrou commun et fenêtres lecture/envoi. Ne pas maintenir de verrou DB pendant l'appel HTTP.
4. **Un appel fournisseur réel autorisé** : données fictives choisies, un seul quota, sortie bornée ; aucun appel payant effectué dans cette livraison. Les simulations n'attestent pas la politique de conservation/entraînement de Mammouth AI.
5. **Déploiement complet** : aligner le code sur le contrat 10C avant usage public, puis reprendre la recette authentifiée avec l'environnement effectivement déployé.

Une révocation après transmission ne peut annuler les données déjà reçues par le fournisseur ou consultées par une étoile. L'export n'inclut pas les journaux/sauvegardes de prestataires. Conservation/purge, limitation de débit globale et coût du verrou social restent des conditions documentées avant ouverture publique.
