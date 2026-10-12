# Mon profil — identité, goûts et partage réunis

## Simplification du 12 octobre 2026 — vérification locale

`npm run verify` final réussi : lint sans erreur (cinq avertissements préexistants), types, 390 tests et build. Les tests de suppression du compte ont été adaptés à la rubrique repliable sans changer leurs assertions métier. Aucun fournisseur réel appelé, aucun commit, aucune modification SQL ou nouvelle dépendance.

Recette navigateur finale sur données fictives à 320/390/1440 px, thèmes clair/sombre : les deux onglets au clic et au clavier, saisie conservée entre les onglets, champ obligatoire masqué révélé avant validation, explications repliées en haut et en bas, cases proposées cochées sans écriture, partage/IA distincts, révocation conservée après sauvegarde et retour au compte, panne/réessai, réponse perdue, conflit, hors ligne, changement de compte et export aux champs sensibles décochés. Captures de chaque onglet et résultat : `out/profile-preview/`; journal complet final : `out/profile-tabs-verify.txt`. L’ancien cache mis de côté lors du diagnostic 404 est conservé dans `.next/cache/`, hors des sources TypeScript. La proposition est propre à chaque navigateur, comme expliqué dans Permissions ci-dessous. Cette recette ne valide pas les services distants ni les téléphones réels.

## Unification du 10 octobre 2026

Livraison locale du 10 octobre 2026. L’installation SQL reste manuelle, après recette sur une copie de la base. Aucun commit, déploiement ni nouvelle dépendance.
Le SQL a depuis été appliqué humainement sur ephemer-app, comme précisé ci-dessous ; la procédure reste manuelle pour toute autre base.

**Mise à jour après installation humaine :** l’utilisateur a lancé le SQL le 10/10/2026. Le catalogue de `ephemer-app` a été contrôlé en lecture seule : les trois colonnes ajoutées, les deux RPC publiques et leurs helpers sont présents ; wrappers accessibles aux comptes authentifiés uniquement, helpers avec cible UUID et anciennes écritures privées fermés aux clients. Les types publics ont ensuite été régénérés depuis la base. Ce contrôle de métadonnées ne vaut pas recette fonctionnelle ni test de concurrence ; aucune donnée personnelle n’a été lue ni modifiée par l’assistant.

`npm run typecheck` a réussi après cette régénération ; `git diff --check` est sans erreur. Les 361 tests/build précédents restent la vérification applicative locale ; la recette réelle après installation est l’étape suivante.

## Page et sources

`/dashboard/profil` réunit Identité et anniversaire, Mes goûts, Partage avec mes étoiles et Mon compte. `/dashboard/univers` redirige vers cette page. Le menu contient une seule entrée Mon profil. Prénom seul obligatoire, anniversaire avec année facultative, bulles de centres d’intérêt et texte libre, avatar enregistré, export image, mot de passe et suppression du compte sont conservés. Les autres dates restent dans Dates.

| Information | Source après unification |
|---|---|
| E-mail vérifié, non modifiable ici | Auth Supabase |
| Prénom, nom, indicatif et téléphone | `public.profiles` |
| Anniversaire, année nullable | Événement personnel du compte et règle courante |
| Présentation, passions, plaisirs, préférences à éviter | `ephemer_social.univers_utilisateurs.valeurs` |
| Pseudonyme, partage et autorisations IA | `ephemer_social.univers_utilisateurs` |
| Avatar | Stockage actuel `avatars_utilisateurs` |

Il existait bien des copies d’anniversaire et de coordonnées dans Univers. Les tables sont conservées ; ces copies deviennent des valeurs de compatibilité, sans constituer une deuxième source après enregistrement unifié. Aucun ancien contact ni doublon du carnet n’est fusionné.

Au premier enregistrement, les valeurs non vides de Profil gagnent automatiquement. Un champ vide reprend la valeur d’Univers lorsqu’elle existe. Un pseudonyme choisi reste indépendant du prénom. Une règle d’anniversaire courante prime sur la colonne historique de naissance ; un anniversaire archivé ne ressuscite pas depuis une ancienne copie. Effacer l’anniversaire retire les règles présentes/futures et archive l’événement, en conservant l’historique. Aucun âge ni année fictive si l’année est absente.

Avant le premier enregistrement, les étoiles voient encore les anciennes informations partagées. Le formulaire prépare les valeurs communes et décoche le partage d’une coordonnée/date remplacée par une valeur différente de Profil. La permission d’année est retirée séparément si seule l’année diffère. L’accord IA sur l’identité est également retiré lorsque le prénom social change. L’utilisateur peut réactiver explicitement les cases dans le formulaire. Aucun écran de rapprochement.

## Permissions

La case Partager mes informations avec mes étoiles commande dix critères : nom, avatar, présentation, passions, plaisirs, préférences à éviter, anniversaire jour/mois, année, e-mail et téléphone. L’année ne peut être partagée sans le jour/mois ni sans année enregistrée. Un avatar invalide/absent n’est pas projeté.

Ces choix s’appliquent à toutes les étoiles actuelles et futures, après enregistrement. Décocher la case générale garde les critères en mémoire et masque toutes les informations facultatives ; le prénom ou pseudonyme minimal reste visible. Les cinq permissions IA sont retirées, identité comprise. Réactiver le partage ne réactive aucun accord IA. Mammouth AI garde ses autorisations séparées et la sélection explicite par l’étoile à chaque génération. Nom, coordonnées, anniversaire et avatar structurés restent exclus des projections IA.

Depuis le 12 octobre 2026, les coches « Étoiles » et « IA cadeaux » sont réunies près de chaque rubrique de goûts ; les coordonnées, nom, avatar et anniversaire ont leur coche Étoiles près du champ. L’accord Passions reste commun aux bulles et aux autres passions, selon le choix de l’utilisateur. L’identité sociale possède seulement son accord IA, sa visibilité minimale étant conservée. Le bloc séparé répétant les dix critères a été retiré.

Identité et anniversaire et Mes goûts sont maintenant deux onglets, sur mobile comme sur ordinateur ; Identité et anniversaire est sélectionné au départ. Les deux panneaux restent montés pour conserver la saisie, seul le panneau choisi est visible. Navigation clavier avec les flèches, Home et End ; un champ requis oublié dans un panneau masqué révèle automatiquement son onglet avant le focus de validation. La sauvegarde commune enregistre toujours l’ensemble du profil.

La proposition d’accords en haut, l’explication Étoiles/IA près des autorisations et l’information IA cadeaux en bas sont des blocs dépliables fermés au départ. Les explications complètes de transmission à Mammouth AI, portée des accords, exclusions et révocation restent accessibles. Coordonnées/avatar, catalogue des passions, aperçu et compte restent fermés au départ ; les passions choisies restent visibles.

**Nouveaux réglages demandés :** au prochain passage sur ce navigateur, tous les critères partageables et les cinq accords IA cadeaux sont proposés cochés dans le brouillon, pour les profils nouveaux comme existants. Nom, e-mail, téléphone et année renseignée sont inclus ; anniversaire/année absents restent décochés. Aucun enregistrement automatique : le profil lu, le partage distant et les données de l’export image restent inchangés jusqu’au clic Enregistrer. Le bandeau distingue la proposition des choix enregistrés. Relire permet de conserver les anciens choix ; Tout autoriser propose à nouveau l’ensemble. Les coordonnées, nom, anniversaire et avatar structurés restent exclus de l’IA.

Après une sauvegarde confirmée par relecture ou une relecture explicitement demandée, un marqueur d’interface versionné par compte est mémorisé dans ce navigateur (`ephemer:profile-permission-proposal:v1:<identifiant>` : `traite`). Il ne contient aucun champ du profil, secret ni accord et ne permet aucune relecture hors ligne. Les prochaines visites respectent les choix enregistrés, y compris une révocation. Un autre navigateur ou un effacement du stockage peut présenter de nouveau la proposition, toujours sans application automatique. Si la lecture du stockage local est refusée, aucun accord n’est reproposé automatiquement ; Tout autoriser reste disponible. Le schéma et les RPC Supabase sont inchangés, aucun SQL à installer pour cette simplification.

Les accès tiers continuent de vérifier relation active, blocage et association du contact le cas échéant. Aucun profil complet d’un tiers n’est reçu puis filtré dans le navigateur. L’aperçu utilise la même projection limitée, avec le nom facultatif. Le partage image utilise les informations personnelles enregistrées du propriétaire, avec coordonnées, année et nom décochés par défaut.

## Contrat et transaction

`lib/profile-contract.ts` définit le DTO fermé `ProfilUnifie` : `revision`, `modeIdentite`, `identite`, `valeurs`, `partage`, `iaCadeaux`, `prenom`, `nom`, `indicatif`, `tel`, `partageActif`, `partageNom`, `empreinte`. Les contrats des projections étoiles gardent leurs enveloppes ; seul `champs.nom` facultatif est ajouté.

- `lire_mon_profil()` : propriétaire déduit de la session Auth vérifiée, aucune cible fournie par le client.
- `enregistrer_mon_profil(p_operation uuid, p_donnees jsonb)` : DTO complet, révision attendue incluse, UUID stable de la tentative. La commande applicative contient uniquement `action: enregistrer`, `revision`, `operation` et `donnees`.

L’empreinte couvre le profil, l’univers, l’événement d’anniversaire et ses règles, y compris les versions à venir. Le verrou commun d’Univers puis les verrous du profil/événement couvrent la comparaison et l’écriture. Profil, goûts, anniversaire, marqueurs, permissions et accusé d’opération sont écrits dans la même transaction. Version ancienne → refus ; même UUID et même contenu → même accusé ; UUID réutilisé pour un autre contenu → refus. Aucune sauvegarde partielle.

`profiles.profil_unifie_at` marque le passage aux sources communes. `univers_utilisateurs.partage_actif` commande la visibilité ; `partage_nom` ajoute le dixième critère. L’installation initialise le partage général à partir des accords existants, sans activer de nouveau champ. `onboarding_completed_at` reste le marqueur de premier profil déjà installé avec Invitations V2.

Le premier profil et les reprises d’invitations utilisent la lecture canonique. Leur enregistrement V2 reste transactionnel, puis termine l’unification et la désactivation des publications remplacées. Après unification, un nouvel appel incompatible de premier profil demande de recharger Mon profil ; le replay déjà accepté reste possible. Les anciennes écritures publiques et privées d’Univers sont fermées aux rôles clients. Les helpers de profil avec UUID arbitraire sont privés.

Le transport vérifie le compte avant/après RPC, borne les requêtes à quinze secondes et refuse hors ligne. Les réponses dépassées sont ignorées ; changement de compte démonte le formulaire et efface son brouillon. Aucun stockage persistant privé. Double clic verrouillé ; panne avant écriture conserve UUID et saisie ; réponse perdue déclenche une relecture avant de réessayer. Un autre onglet ne remplace jamais un brouillon modifié : il bloque la sauvegarde et propose une relecture confirmée.

Export personnel version **11** : ajout `mon_profil` canonique, sans son empreinte de concurrence ; `mon_univers` et tables historiques conservés pour compatibilité. Aucun univers tiers, journal d’idempotence, secret ou résultat partiel. La lecture de toutes les sections n’est pas un instantané transactionnel.

## Installation manuelle

1. Préparer une copie jetable avec Auth, Dates lot-02 et Univers 10A/10B/10C. Invitations V2 doit déjà être installé et sa recette passer.
2. Exécuter **tout** `docs/sql/profil-unifie.sql`, sous le rôle postgres dans l’éditeur SQL. Une erreur annule la transaction ; ne pas lancer seulement un extrait. Le script refuse un second passage. Il ajoute des colonnes et remplace des fonctions, sans supprimer de table.
3. Exécuter **tout** `docs/sql/profil-unifie-recette.sql` sur cette copie. Les identités et données fictives sont annulées par ROLLBACK ; le résultat final doit annoncer la réussite. Ne pas copier ses fixtures en production.
4. Faire les essais à deux sessions et vraies connexions ci-dessous. Après validation humaine et sauvegarde habituelle, appliquer le seul fichier d’installation en production, puis livrer le code et recharger les onglets.
5. Régénérer `types/database.generated.ts` depuis le schéma réellement installé. Les DTO proposés restent dans `types/database.ts` et les adaptateurs jusqu’à cette installation.

Sans ce SQL, Mon profil affiche une erreur d’installation explicite et ne sauvegarde rien. La présence des fichiers ne prouve pas leur installation. Les anciennes recettes de catalogue 10B/10C vérifieront des empreintes historiques de fonctions et doivent être relues en tenant compte de cette évolution.

## Recette complémentaire

Sur copie, vérifier Profil prioritaire / champs vides repris, pseudonyme préservé, e-mail Auth vérifié et anniversaire sans année/29 février. Tester indépendamment les dix cases, case générale, masquage d’une valeur remplacée et révocation des cinq accords IA. Refuser utilisateur anonyme/non vérifié, tiers sans relation, blocage et appels directs aux helpers/tables.

Deux sessions du même compte : lire chacune le profil, conserver leurs DTO puis envoyer une modification depuis A et une autre depuis B. B doit échouer sans remplacer A ; après relecture, un nouvel UUID permet la sauvegarde. Refaire en modifiant l’anniversaire dans Dates entre lecture et sauvegarde. Pour la concurrence réelle, laisser A en transaction avant COMMIT et envoyer B : B attend puis constate la version différente. Vérifier le changement de prénom, l’archivage/recréation d’anniversaire, l’historique et les préférences de rappels conservées.

Couper le réseau avant sauvegarde, puis après écriture avant réponse : brouillon conservé ; même opération ne crée pas de seconde version. Changer de compte pendant une lecture/écriture ; aucune information de l’ancien compte ne doit réapparaître ni déconnecter le nouveau compte. Contrôler premier profil depuis invitation, expiration des reprises et permissions existantes, ainsi que les anciennes commandes qui demandent de recharger.

Recette visuelle locale : `node tests/profile-preview.mjs`, puis `node tests/profile-browser.mjs`. Vrais composants/CSS, persistance fictive en mémoire, aucune requête Supabase ou fournisseur. Captures dans `out/profile-preview/`. Tester aussi le parcours connecté avec `npm run dev` après installation sur copie.

La compilation syntaxique PL/pgSQL en transaction distante READ ONLY ne crée aucune fonction et n’exécute pas leurs corps. Elle ne remplace pas l’installation, la recette fonctionnelle, les ACL/RLS ou la concurrence réelle. Ces validations sur copie et les appareils Safari/iOS/Android réels restent à réaliser.

## Résultats locaux du 10/10/2026

`npm run verify` réussi : **361 tests**, génération des types Next, TypeScript et build de production. ESLint : zéro erreur, cinq avertissements préexistants. `git diff --check` sans erreur. Le premier build a rencontré un refus d’accès SWC dans la sandbox Windows ; la vérification finale hors sandbox a terminé avec le code zéro. Aucun changement de package ni des types de schéma installé.

Recette navigateur réussie à **320, 390 et 1440 px**, thèmes clair/sombre : pas de débordement horizontal, année facultative, e-mail non éditable, aperçu du nom et des passions, révocation IA lors du partage général, UUID conservé après panne, réponse perdue confirmée par relecture, brouillon conservé en conflit, blocage hors ligne, changement de compte et champs sensibles d’image décochés. Le garde natif de brouillon est accepté explicitement lors des rechargements fictifs entre formats. Résultats/captures dans `out/profile-preview/` ; serveur arrêté après recette.

SQL : contrôle distant **READ ONLY** réussi des neuf corps PL/pgSQL adaptés en blocs anonymes non exécutés (paramètres locaux, types composites remplacés par `record`, retours de valeurs remplacés par `PERFORM`) et des sept blocs anonymes de la recette, également non exécutés. Aucune fonction/colonne/fixture installée, aucune donnée personnelle distante consultée. La recette fonctionnelle préparée couvre priorité/reprise, e-mail Auth, pseudonyme, 29 février sans année, masquage de valeurs remplacées, critères mémorisés, révocation IA, replay/UUID, version ancienne et ancienne commande refusée. Son exécution et les essais concurrents sur copie restent manuels.
