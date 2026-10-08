# Lot 08 — Cartes individuelles

**7 octobre 2026 — catalogue installé confirmé en lecture seule ; persistance et partage intégrés localement. Livraison à valider après configuration de la clé serveur et recette authentifiée.**

Le premier contrôle d’ephemer-app constatait PostgreSQL 17.6, la clé `preparations_evenements UNIQUE(user_id,id)` et l’absence des objets du lot 08. Après l’application humaine, le fichier complet `verification-lecture-seule.sql` corrigé a été exécuté en transaction READ ONLY et retourne **`lot08_catalogue_conforme`**. Trois expressions CASE utilisées dans des conditions IF ont été parenthésées pour corriger l’erreur de syntaxe signalée. L’utilisateur confirme ensuite les SQL. Aucun contenu personnel lu et aucune mutation distante exécutée par l’assistant. Ce contrôle du catalogue ne remplace pas les recettes comportementales RLS/REST/concurrence sur copie autorisée. Les types réels sont régénérés dans `types/database.generated.ts` ; l’export est maintenant en version 6.

## Ce qui est disponible maintenant

Depuis une préparation : **Ouvrir ma carte**, choisir Clair de lune, Constellation ou Aurore, saisir un message et une signature, enregistrer explicitement un brouillon privé. La reprise du message préparé est volontaire, sans import de prénom, coordonnées, notes ou profil. Les trois modèles sont gratuits. Fermer avec une saisie non enregistrée demande confirmation ; changement de compte/préparation retire l’état du formulaire.

Publier demande confirmation et fige le dernier brouillon enregistré ; les modifications non enregistrées bloquent la publication. Aperçu du brouillon et version publiée sont affichés séparément. Récupérer, copier/partager, remplacer, désactiver ou supprimer le lien sont des actions explicites. Un résultat réseau incertain peut être repris avec le même UUID, sans deuxième rotation. L’éditeur conserve la saisie après erreur/conflit et propose une relecture volontaire.

Le destinataire consulte `/carte#<secret>` sans compte. Le serveur vérifie le droit en une lecture et ne renvoie que le contenu publié. La page efface le contenu au masquage, hors ligne, à l’expiration et pendant la revalidation au retour ; une revalidation périodique borne aussi l’affichage d’une carte révoquée dans un onglet actif. Aucun stockage persistant du secret/contenu, ressource tierce ou analytique sur ce rendu. Les métadonnées sont génériques, les headers privés s’appliquent aussi aux réponses HTML/RSC et aux erreurs. Aucun upload, avatar, IA, programmation ou envoi.

La variable **`EPHEMER_CARD_LINK_KEY` est absente de `.env.local` au contrôle** (présence du nom seulement, aucune valeur imprimée). Les brouillons et la révocation fonctionnent sans cette clé ; création/récupération du lien échouent explicitement tant qu’elle n’est pas configurée manuellement. Aucune clé existante n’est modifiée et aucun secret n’est créé dans l’environnement. Voir la configuration ci-dessous et la [recette applicative](RECETTE-APPLICATION.md).

## Décisions et contrat proposé

Une carte par préparation, identité immuable et révision attendue. Brouillon vide autorisé ; message de publication non vide, 10 000 caractères maximum, signature choisie de 200 caractères maximum. Les longueurs SQL comptent les caractères Unicode ; les champs navigateur imposent une limite conservatrice en unités UTF-16 lors de la frappe.

| Ressource | Accès et cycle de vie |
|---|---|
| `public.cartes_individuelles` | Création, lecture, édition et suppression par son propriétaire connecté. Modèle fermé, versions de modèle/rendu 1, révision et dates techniques. FK composée vers la préparation du même propriétaire. |
| `public.versions_cartes` | Lecture par le propriétaire ; INSERT serveur exclusivement. Copie du message, de la signature et des identifiants de rendu ; UPDATE interdit, même à un rôle privilégié. Les anciennes versions restent privées après republication. |
| `ephemer_lot08.liens` | Serveur seulement, aucune policy/permission navigateur. Version précise, empreinte unique, secret chiffré, nonce unique, tag, expiration et révocation. Un seul droit non révoqué par carte. |
| `ephemer_lot08.operations` | Serveur seulement. UUID d’opération, demande sémantique et résultat initial pour reprendre une réponse perdue sans deuxième publication ni remplacement. Aucun message, token clair ou profil. |

Les fonctions serveur sont `SECURITY INVOKER`, `search_path=pg_catalog`, EXECUTE service_role uniquement. Les helpers purs de validation sont seuls exécutables par authenticated. Aucune RPC anonyme, aucun SECURITY DEFINER. Le schéma `ephemer_lot08` **ne doit pas être ajouté aux schémas exposés de la Data API**. RLS activées sur les quatre tables ; les tables internes n’ont aucune policy utilisateur. Les droits par défaut sont révoqués avant les GRANT minimaux.

Publication, révocation et remplacement verrouillent la carte et incrémentent sa révision dans une transaction. L’édition directe doit filtrer `(id,user_id,revision)` et soumettre `revision+1`. Un UPDATE aveugle échoue. Le retry reprend le même UUID, la même action, révision et durée ; changer ces paramètres avec cet UUID est refusé. Le matériel aléatoire d’un retry est ignoré si l’opération existe déjà : relire le droit courant après le RPC, jamais renvoyer le secret généré pour la tentative perdante. Si une autre action a révoqué/remplacé le droit entre-temps, ne pas restaurer l’ancien lien.

**Lien transférable validé par l’utilisateur.** `/carte#<secret>` : 32 octets aléatoires, base64url canonique, empreinte SHA-256 du texte canonique. La durée est 30 jours par défaut ; 7, 30, 90 ou 365 jours à la publication/remplacement. Il s’agit de périodes de 24 heures en UTC calculées par PostgreSQL, avec affichage de l’échéance en Europe/Paris. Aucun lien permanent. Modifier la durée exige un remplacement, qui invalide l’ancien secret. Une republication crée une version et un nouveau lien ; un remplacement conserve la dernière version publiée, jamais le brouillon courant. Révoquer garde le brouillon et les versions privées.

La lecture publique retourne exactement `content` (les six champs fermés du rendu) et `expiresAt`. Aucun ID de carte, compte, préparation, version, fiche contact ou note. La vérification de droit et la sélection de version se font ensemble ; expiration stricte `expires_at > clock_timestamp()`. Secret inconnu, expiré ou révoqué produit le même refus HTTP.

## Application humaine — ne pas sauter la validation

Extension avatar (lot 09) : son [contrôle combiné](../lot-09/verification-lecture-seule.sql) reprend les assertions 08 avec les seules colonnes/droits 09 autorisés. Après installation 09, utiliser ce contrôle et sa recette ; le contrôle/recette historiques 08 restent stricts sur le contrat V1. Ne pas réappliquer le schéma 08. Le lot 09 reste proposé tant que son catalogue n’est pas confirmé.

Procédure initiale conservée pour une nouvelle copie de test. **Ne pas réappliquer `schema-propose.sql` sur la cible déjà confirmée.** L’intégration locale décrite ci-dessus a eu lieu après confirmation ; les recettes réelles restent distinctes des simulations.

1. Lire le dossier entier et les contrats installés 02–07. Sauvegarder la cible, vérifier la restauration sur copie et noter le projet concerné. Inspecter les triggers Auth/contacts ; neutraliser les fournisseurs externes dans la copie de test.
2. Sur une **copie isolée autorisée**, appliquer manuellement [schema-propose.sql](schema-propose.sql). Le garde refuse une réexécution ; après une erreur, faire ROLLBACK et corriger la proposition avant de recommencer. Aucun moteur PostgreSQL local n’était disponible pour exécuter ce dossier pendant sa préparation.
3. Exécuter intégralement [verification-lecture-seule.sql](verification-lecture-seule.sql). Le marqueur attendu est `lot08_catalogue_conforme`. Comparer aussi colonnes, contraintes, defaults, index et définitions affichés au schéma proposé. Contrôler les advisors et les schémas exposés de la Data API. Un catalogue conforme ne prouve pas le comportement RLS.
4. Dans **la même session SQL**, uniquement sur la copie autorisée :

   ```sql
   SET ephemer.lot08_test_isole='CONFIRME_COPIE_ISOLEE_LOT08';
   ```

   Exécuter [verification.sql](verification.sql) en entier ; il termine par ROLLBACK. En cas d’erreur, ROLLBACK dans cette session. Ne jamais remplacer les fixtures par un compte réel. Les enveloppes cryptographiques de cette recette sont factices : elle teste le SQL, pas le déchiffrement Node. Les changements de claims ne prouvent pas la signature d’un JWT.
5. Exécuter le protocole à deux connexions ci-dessous et les essais REST réels A/B/anon. Après leur réussite et revue humaine, appliquer manuellement le schéma sur la cible puis refaire le catalogue en lecture seule.
6. Faire confirmer cette installation ; régénérer les types depuis le schéma réel. Intégrer alors les routes/persistance et l’export version 6 selon [CONTRAT-APPLICATION.md](CONTRAT-APPLICATION.md). Ne pas relancer les SQL des lots précédents.

### Deux connexions, après application sur copie autorisée

Avec comptes Auth fictifs A/B et une carte de A enregistrée, garder une révision R commune. Désactiver les prestataires externes. Les appels service_role restent exécutés exclusivement depuis un serveur de test autorisé ; aucune clé admin dans le navigateur.

- Deux publications d’UUID différents pour R : un succès, un conflit ; une seule nouvelle version/droit. Même UUID : résultat initial identique, sans doublon.
- Deux remplacements d’UUID différents pour R : un succès, un conflit, un seul nouveau lien. Les perdants n’affichent/copie jamais leur secret non installé.
- UPDATE du brouillon contre publication, tous deux pour R : un seul succès. Si la publication gagne, elle fige le texte enregistré avant l’édition perdante ; si l’édition gagne, la publication doit relire avant confirmation.
- Révocation contre remplacement/publication pour R : un succès, un conflit ; après validation du refus, proposer une nouvelle action volontaire sur la révision actuelle.
- Simuler une réponse RPC perdue, relancer le même UUID ; puis faire une autre opération et rejouer le premier UUID : le résultat initial ne doit pas réactiver l’ancien droit. Relire la carte/statut courant avant toute présentation d’un lien.
- Supprimer la carte/la préparation pendant une publication : pas de droit orphelin. Après suppression confirmée, lecture par tout secret refusée.

Vraie déconnexion/reconnexion avec JWT signé : retrouver le brouillon, les versions et le même lien actif. B ne lit ni n’édite A via REST. Anon ne lit aucune table et ne peut exécuter les RPC serveur, même avec une empreinte connue. L’API publique à jeton sera testée séparément après intégration.

## Clé serveur, export et effacement

La seule nouvelle variable prévue est **`EPHEMER_CARD_LINK_KEY`**, à configurer humainement dans les environnements serveur autorisés après revue. Format attendu : 32 octets aléatoires encodés par 64 caractères hexadécimaux. Ne jamais la publier, imprimer, placer dans un fichier suivi, préfixer NEXT_PUBLIC ou transmettre au navigateur. Ne pas réutiliser une clé Supabase/Resend/cron.

AES-256-GCM chiffre les 32 octets du secret avec un nonce aléatoire de 12 octets ; données authentifiées : version du chiffrement, UUID propriétaire/carte/droit. Ciphertext hex 64 caractères, nonce hex 24, tag hex 32. Une modification de contexte/ciphertext/tag/clé échoue. La consultation par empreinte et la révocation n’ont pas besoin de la clé ; création/récupération du lien exigent une clé valide.

Conserver la clé dans une sauvegarde de secrets autorisée distincte des exports utilisateur. Ne pas l’écraser : les enveloppes existantes deviendraient irrécupérables. Sa rotation n’est pas automatisée dans ce lot. Procédure humaine : révoquer les droits existants, configurer la nouvelle clé puis remplacer/repartager volontairement les liens. Une clé perdue empêche de récupérer le lien enregistré, mais un détenteur du secret peut encore consulter tant qu’il n’a pas été révoqué/expiré.

L’export version 6 inclut cartes, versions et métadonnées/statuts de droits paginés ; jamais empreinte, enveloppe cryptographique, secret ou opérations internes. Le RPC d’export borne chaque page à 200 lignes ; une route authentifiée vérifie l’identité pour chaque page, avec une projection fermée supplémentaire dans le navigateur. Aucun export partiel présenté comme complet.

Supprimer une carte ou sa préparation supprime versions, liens et opérations par cascades. Supprimer le compte efface tout le lot par Auth. La suppression de contact suit le lot 02 : l’événement historique est détaché/conservé, donc ses cartes choisies restent privées ou lisibles par leur droit existant ; révoquer/supprimer la carte est une action distincte. La route actuelle de suppression de compte comporte plusieurs étapes : si l’effacement Auth échoue, ne pas prétendre que les cartes ont été effacées. Pas de fichier Storage à nettoyer.

Un lien transféré peut être ouvert par son détenteur. La révocation coupe les lectures suivantes ; elle ne retire pas une copie déjà enregistrée par un destinataire. Un document de carte exporté ne doit jamais contenir son lien secret.

[retour-arriere.sql](retour-arriere.sql) verrouille les tables, refuse toute donnée et utilise DROP RESTRICT. Retirer les dépendances applicatives/export avant retour ; les dépendances SQL dynamiques ne sont pas toutes détectables. Si données ou dépendances existent : sauvegarde/réconciliation humaines, sans contournement du garde ni DROP CASCADE.

## Vérifications et limites

- Tests Node : contrat fermé, Unicode, texte hostile rendu par React, copie figée, génération/empreinte/chiffrement réels et altération refusée ; interactions de l’éditeur simulées et nettoyage des saisies. Aucun appel payant ni requête distante de données.
- **`npm run verify` final réussi : 195 tests**, TypeScript et build ; **0 erreur ESLint, 11 avertissements préexistants**. `git diff --check` réussi. Vingt et un tests du lot : contrat/crypto/rendu réels, routes HTTP/clients/éditeur/lecture testés avec base/Auth fictives, erreurs et concurrence simulées. La revue React porte sur les hooks/nettoyage, isolation du scope, accessibilité structurelle et actions explicites ; les styles V1 utilisent les utilitaires Tailwind v4 avec valeurs fixes.
- `node tests/cards-preview.mjs` : serveur de recette sur `http://127.0.0.1:3208`, composants/styles réels, texte fictif et réseau client bloqué. Compilation de l’aperçu vérifiée ; aucun navigateur disponible dans la session, donc recette visuelle/clavier non attestée.
- Recette manuelle de l’aperçu : 320/390/1280 px, clair/sombre, trois modèles, très longues chaînes, maximum Unicode, reprise/annulation, fermeture/Escape, tabulation/radios, focus rendu au déclencheur, changement de compte et secours hors ligne. Aucun débordement horizontal attendu ; à vérifier dans un vrai navigateur.
- Catalogue 08 **confirmé en lecture seule** après application humaine ; types réels régénérés. Les comportements HTTP/client sont testés avec base/Auth fictives, AES réel. Le build local a passé `node tests/cards-http-check.mjs` : HTML/RSC génériques, headers privés, secret inconnu via RPC distante en lecture seule refusé, méthodes et routes du propriétaire protégées. Aucun SQL de création/recette/rollback ou autre mutation distante exécuté par l’assistant ; vraie reconnexion, concurrence et cascades restent à recetter avec comptes fictifs autorisés.

[Cadre commun](../../PLAN-EVOLUTION-EPHEMER.md#3-cadre-commun-à-tous-les-prompts) · [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Droits des fonctions](https://supabase.com/docs/guides/database/functions)
