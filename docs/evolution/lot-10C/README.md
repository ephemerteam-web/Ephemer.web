# Lot 10C — Cadeaux avec double accord IA

**État au 9 octobre 2026 : SQL installé humainement et catalogue confirmé en lecture seule (`lot10c_catalogue_conforme`), intégration locale terminée.** Les types ont été régénérés depuis ce schéma réel. Aucun commit, déploiement, ajout de dépendance ou mutation distante par l'assistant.

Décisions : cadeaux uniquement, gratuitement ; cinq permissions séparées initialement refusées ; l'accord couvre les prochaines versions enregistrées du texte ; le demandeur sélectionne les champs à chaque tentative. Aucune copie dans le carnet. Les messages IA suivent séparément.

## Installation déjà confirmée

Aucun SQL d'installation à relancer sur le projet **ephemer-app** (`zwjdgkvlqwplffxfykrl`). Pour une future installation sur une copie revue et sauvegardée, conserver cet ordre :

1. **[schema-propose.sql](schema-propose.sql)**, fichier entier. Il contient d'abord le contrôle complet 10A + 10B, puis la transaction d'installation et sa confirmation locale. Aucun `SET` séparé n'est nécessaire. Ne copier ni un extrait ni un affichage de différences. L'installation ferme également le compteur IA aux clients ordinaires.
2. **[verification-lecture-seule.sql](verification-lecture-seule.sql)**, fichier entier. Attendre **`lot10c_catalogue_conforme`**, puis communiquer ce résultat pour le branchement et la régénération des types depuis le schéma installé.

Si une instruction échoue, exécuter `ROLLBACK;` avant toute nouvelle requête et transmettre l'erreur complète. Ne pas poursuivre avec un fragment et ne pas rejouer une installation déjà présente.

**Le code local est aligné sur le contrat 10C installé. Une version déployée encore en 10B ne peut plus lire le nouveau DTO propriétaire ni sauvegarder son ancien format : coordonner sa mise à jour avant ouverture.** Les valeurs et journaux restent conservés ; les commandes anciennes sont refusées et ne réactivent aucune autorisation. Ne pas appliquer ce changement sur un environnement utilisé par une version déployée 10B sans fenêtre de maintenance et mise à jour coordonnée. Aucun déploiement n'est prévu dans ce chantier.

Ne pas lancer `fonctions-cadeaux.sql` ou `catalogue-cadeaux.sql` seuls : ce sont des fragments du dossier. `verification.sql` est une recette mutante réservée à une **copie isolée autorisée**, pas au projet principal. `retour-arriere.sql` ne sert qu'à un retour explicitement validé.

## Fonctionnalités intégrées

- SQL : une colonne privée `ia_cadeaux`, aucun nouveau stockage de contenus, deux fonctions 10B adaptées, deux helpers et deux RPC de cadeaux ; RLS et droits directs fermés conservés.
- Contrats fermés distincts : propriétaire 10C, projection éligible, sélection par appel, résolution exacte ; bigint de contacts conservés en texte.
- Orchestration injectable testée : session, lecture privée propriétaire, prévalidation sociale, quota, nouvelle résolution, fournisseur, vérification finale. Elle est branchée au générateur actif par `lib/cadeaux-server.ts` ; le garde messages conserve son comportement.
- Mon univers enregistre les cinq accords avec ses valeurs et permissions ; le générateur sépare les sources privées et sociales, conserve les choix seulement pour chaque tentative et fonctionne sans contact. Liens depuis Mes étoiles et leur panneau. Aperçu intégré fictif avec `node tests/cadeaux-social-preview.mjs`, puis `http://127.0.0.1:3212`.
- Export **10** : valeurs, permissions et accords du propriétaire uniquement ; notice de confidentialité actualisée après intégration.
- Lectures visibles au focus/60 secondes, annulation et purge en mémoire par compte, retrait/perte d'association/hors ligne ; reprise volontaire sans fiche après perte d'association. Aucun nouveau stockage navigateur.
- Contrôles combinés et retour générés par `node tools/prepare-lot10c-dossier.mjs` ; `--check` compare les fichiers sans les écrire.

## Retour sans perte

[retour-arriere.sql](retour-arriere.sql) restaure le fonctionnement des deux fonctions 10B et ferme toutes les entrées de cadeaux sociaux. Il conserve la colonne, ses valeurs et les journaux. Sa contrainte devient structurelle pour permettre les sauvegardes 10B, sans usage des permissions dormantes. Le compteur reste fermé aux clients.

Même session, après revue : définir `ephemer.lot10c_retour` à `CONFIRME_RETOUR_10B_SANS_PERTE`, puis lancer le retour entier et [verification-retour-lecture-seule.sql](verification-retour-lecture-seule.sql). Attendu : `lot10c_retour_conforme`. Revenir aussi au code 10B. Une réactivation ultérieure exige un dossier spécifique revu, une remise à zéro explicite des autorisations dormantes et un nouveau consentement ; ne pas rejouer la proposition initiale. Les anciens contrôles exacts 10A/10B ne sont plus adaptés à la colonne conservée.

## Recette et livraison

Vérifier localement avec `npm run dev` les pages `/dashboard/univers`, `/dashboard/etoiles` et `/dashboard/gift-ideas`. La livraison est locale, sans commit ni déploiement. Les simulations HTTP/React et la recette navigateur intégrée ne remplacent pas les essais avec de vrais JWT, la concurrence PostgreSQL, les cascades sur copie ou un appel fournisseur réel. Ces essais distants restent explicitement reportés. Voir [CONTRAT-APPLICATION.md](CONTRAT-APPLICATION.md) et [RECETTE-APPLICATION.md](RECETTE-APPLICATION.md).

Les conditions de conservation/purge, limitation de débit et coût du verrou commun 10A restent requises avant ouverture publique.
