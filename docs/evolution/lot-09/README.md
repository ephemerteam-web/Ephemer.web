# Lot 09 — Avatar personnel et signature des cartes

**État actuel, 8 octobre 2026 :** [Avatar V3 intégré](avatar-v3/README.md), palettes fusionnées et sauvegarde **Valider les modifications** dans le compte. Extension appliquée humainement, catalogue `avatar_v3_catalogue_conforme` confirmé en READ ONLY et types réels régénérés avant branchement. Le socle décrit ci-dessous est historique : son éditeur V1 et l’aperçu V2 ont été remplacés dans l’interface ; leurs moteurs restent conservés pour les anciennes cartes. Ne pas réappliquer ce schéma historique.

**8 octobre 2026 — intégration locale disponible, catalogue installé confirmé ; recette distante sur copie reportée à la demande de l’utilisateur.**

L’utilisateur a appliqué manuellement le schéma et son contrôle en lecture seule. L’assistant a ensuite exécuté le fichier complet `verification-lecture-seule.sql` en transaction READ ONLY sur ephemer-app : résultat **`lot09_catalogue_conforme`**. Ce contrôle inclut les contrats 08 et 09, RLS, grants de tables/colonnes/fonctions, contraintes, triggers et empreintes des sources SQL. Les types réels ont été régénérés dans `types/database.generated.ts` ; le wrapper `types/database.ts` est conservé. Aucun contenu personnel lu ni SQL distant mutant exécuté par l’assistant.

## Disponible dans l’application

**Nouvelle collection visuelle, 8 octobre :** portraits SVG cartoon, ronds et souriants, palette céleste inspirée des deux références fournies, nouvelles coiffures, vêtement à capuche et douze accessoires/finitions. Accessible depuis le profil par **Essayer la collection céleste**. Ses choix sont **temporaires** : le schéma confirmé accepte seulement V1, donc aucune sauvegarde V2 ni modification de carte. Le catalogue et le moteur historiques restent intacts. Voir [COLLECTION-CELESTE.md](COLLECTION-CELESTE.md) pour les assets et le préalable précis à leur enregistrement.

Dans **Mon Profil → Ton avatar → Personnaliser mon avatar**, composer un avatar gratuit : trois visages, six coiffures, huit teints, six couleurs de cheveux, trois vêtements, six couleurs de vêtement et quatre accessoires (aucun, lune, étoile, halo). Illustrations SVG originales, sans ressource externe, selfie, reconnaissance, génération IA, animation, dépendance ou achat.

L’aperçu est immédiat ; **Enregistrer mon avatar**, **Annuler**, **Réinitialiser les choix** et **Relire la version enregistrée** sont explicites. Réinitialiser ne sauvegarde rien. Le profil utilise la configuration enregistrée ou le défaut. Configuration inconnue : défaut et explication, aucune réécriture automatique. Une panne de lecture est distincte d’une absence de ligne.

`lib/avatar-data.ts` vérifie la session avant/après et utilise le client navigateur soumis aux RLS propriétaires. Création limitée à user_id/configuration ; modification limitée à configuration/révision et filtrée par propriétaire/révision attendue. Avant toute écriture, lecture du résultat éventuel précédent ; après réponse perdue, vérification de configuration et révision attendues sans écriture automatique. Un conflit garde les choix, bloque une nouvelle sauvegarde et propose une relecture volontaire, qui conserve la saisie. Les composants sont remontés par compte, avec réponses tardives ignorées et aucune configuration dans un stockage navigateur persistant.

Depuis une préparation, ouvrir la carte puis utiliser **Ajouter mon avatar**, **Actualiser depuis mon profil** ou **Retirer l’avatar**. Ces actions modifient seulement la saisie ; enregistrer le brouillon reste obligatoire avant publication. Elles copient l’avatar enregistré (ou le défaut expliqué en absence de ligne), jamais une configuration ancienne illisible. Modifier le profil ne rafraîchit aucune carte.

Les nouvelles cartes utilisent le format/rendu 2, avatar facultatif. Les brouillons existants restent V1 tant qu’aucun avatar n’y est ajouté ; retirer un avatar conserve V2. Le rendu V1 reste intact. Le moteur V2 conserve sa composition, sa palette et son avatar validé. La consultation publique refuse les versions/configurations inconnues, sans défaut substitué. Aperçu privé et publication actuelle sont séparés.

La publication HTTP appelle `publier_carte_lot09`, qui verrouille la carte, valide sa révision et réutilise les opérations/liens 08. Les brouillons V1 sont délégués à la publication historique. Remplacement, révocation et consultation continuent d’utiliser les fonctions 08 inchangées. Le contenu public provient seulement du snapshot publié : aucun profil, contact, email, note, identifiant privé ou lecture d’avatar personnel côté serveur.

L’export personnel est en **version 7** : avatar privé du compte, copies des brouillons et snapshots publiés V1/V2, statuts des liens. Secrets, empreintes, nonce/tag, opérations et tokens restent exclus. Lecture paginée par propriétaire, ordre user_id pour les avatars, arrêt en cas d’erreur ou changement de compte. La politique de confidentialité est actualisée.

## Configuration et partage

Aucune variable nouvelle. La clé de partage du lot 08, **`EPHEMER_CARD_LINK_KEY`**, reste à configurer manuellement : le contrôle local du format retourne faux (aucune valeur imprimée ou modifiée). Sauvegarder l’avatar et le brouillon reste possible ; publication/remplacement/récupération du lien sont bloqués explicitement tant que cette clé est absente ou invalide. La révocation reste possible. Conserver cette clé pour retrouver les liens après reconnexion, selon la procédure 08.

Partage manuel uniquement, après copie ou menu natif. Toute personne possédant le lien peut ouvrir la carte, y compris après transfert ; la révocation bloque les consultations suivantes sans retirer une copie déjà faite. Le secret reste dans le fragment, puis dans le corps POST. Cache public, indexation, analytique/tiers et stockage persistant sont exclus. La revalidation 08 au retour/hors ligne/expiration reste inchangée. Le service worker n’admet que sa liste fermée de fichiers publics.

## Contrôles effectués et limites

- **Catalogue réel READ ONLY conforme**, types réels régénérés. Cela ne prouve pas les comportements d’écriture des RLS ni la concurrence distante.
- **211 tests Node réussis** : contrats fermés, configurations hostiles, SVG/React réels, compatibilité exacte V1, copies stables V2, validation publique et absence de lecture de profil, révisions/conflits, réponses perdues sans deuxième écriture, session changée, export 7, ajout/actualisation/retrait explicites et publication séparée du brouillon. Identités/base et interactions des tests sont simulées ; primitives cryptographiques et rendu React sont réels.
- **106 cas des expressions SQL proposés évalués réellement en READ ONLY** lors de la première tranche, sans divergence : 88 avatars et 18 snapshots. Pas de création de fonction ni de fixture. Le contrôle combiné a maintenant aussi validé les fonctions installées par leurs définitions.
- **`npm run verify` réussi** : lint (0 erreur, 11 avertissements préexistants), TypeScript, 211 tests et build de production. `git diff --check` réussi.
- **HTTP réel du build local** : shell HTML/RSC générique, no-store/no-referrer/noindex/CSP, liens fictifs inconnus refusés par lecture RPC distante et routes propriétaire sans session refusées. Aucun accès authentifié ni écriture distante ; serveur de production local arrêté après contrôle.
- Recette navigateur réelle avec composants/CSS et **base fictive en mémoire**, réseau externe interdit : à **320 px**, absence de débordement horizontal (page 320, dialogue 303), radios au clavier, sauvegarde et reprise des choix, annulation par Échap et focus rendu au déclencheur. Carte V2 avec copie d’avatar et texte hostile/longue chaîne : aperçu et brouillon enregistrés, texte affiché littéralement, aucun débordement. La confirmation native de publication a bloqué le navigateur ; le parcours interactif publié, desktop, copie/menu natif et revalidation visuelle restent à recetter. Le serveur d’aperçu a été arrêté.
- **`verification.sql` non exécuté**, à la demande explicite de l’utilisateur faute de copie isolée disponible. Son garde reste intact. Aucun test mutant sur le projet principal, aucun compte réel supprimé. Isolation réelle A/B/anon par JWT/REST, reconnexion réelle, concurrence SQL et cascades restent à vérifier dans un environnement autorisé.

Aperçu autonome : `node tests/avatars-preview.mjs` (port 3209). Parcours profil/cartes avec faux comptes A/B et données en mémoire : `node tests/cards-preview.mjs` (port 3208). Ce dernier utilise les vrais composants, mais simule la persistance ; il ne prouve aucune sauvegarde Supabase. Les contrôles Node complètent cette recette visuelle.

## Dossier SQL conservé pour revue et recette ultérieure

- [schema-propose.sql](schema-propose.sql) : schéma déjà appliqué humainement ; **ne pas le réappliquer**.
- [verification-lecture-seule.sql](verification-lecture-seule.sql) : contrôle combiné complet 08+09 utilisé après installation.
- [verification.sql](verification.sql) : recette mutante **sur copie isolée autorisée exclusivement**, neutralisation des prestataires externes et triggers Auth examinés, comptes fictifs réservés et ROLLBACK final. Définir le marqueur indiqué en commentaire puis lancer le fichier complet dans la même session de la copie. Le marqueur est une déclaration humaine, pas une détection automatique de la cible.
- [retour-arriere.sql](retour-arriere.sql) : retour uniquement humain, après sauvegarde et retrait des dépendances applicatives ; refuse avatars/brouillons/publications V2 et dépendances ultérieures. DROP RESTRICT, aucun effacement forcé.
- [CONTRAT-APPLICATION.md](CONTRAT-APPLICATION.md) et [RECETTE-APPLICATION.md](RECETTE-APPLICATION.md) : contrats branchés et protocole de tests restant à effectuer.

Après installation 09, utiliser son contrôle combiné. Le contrôle historique 08 refuse volontairement les colonnes supplémentaires ; sa recette historique considère encore le rendu 2 comme invalide. La recette 09 reprend les cas 08 avec rendu inconnu 3 et tests d’avatar.

Aucune dépendance, modification de secret, migration, mutation distante par l’assistant, programmation, appel payant, commit ou déploiement.

[Cadre commun](../../PLAN-EVOLUTION-EPHEMER.md#3-cadre-commun-à-tous-les-prompts) · [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
