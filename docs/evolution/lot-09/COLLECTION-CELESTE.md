# Collection céleste — assets V2

**Historique de prototype :** cette collection est remplacée dans l’interface par [Avatar V3](avatar-v3/README.md). Son catalogue/moteur restent archivés et ne sont pas admis dans le contrat de persistance V1/V3.

8 octobre 2026 : illustrations et atelier d’essai disponibles. **Cette collection n’est pas encore enregistrable.** Le schéma installé et les fonctions de persistance restent ceux du catalogue V1 confirmé.

## Direction artistique

Deux références fournies par l’utilisateur : portrait aux cheveux roux ondulés et vêtement crème, portrait aux cheveux courts châtains et pull bleu, tous deux sur un fond bleu nuit avec croissant doré et étoiles. Direction confirmée ensuite par l’utilisateur : **plus cartoon, ronds et joyeux**. La palette céleste et les compositions de départ reprennent les références ; les proportions deviennent plus expressives : grandes têtes aux joues rondes, grands yeux avec reflets, sourcils courbes, sourires ouverts et petites touches roses. Les silhouettes, mèches et plis sont dessinés en SVG. Les images fournies ne sont pas copiées dans les assets publics.

Deux compositions de départ : **Reflets de lune** et **Éclat solaire**. Tous les éléments peuvent être changés indépendamment du genre du portrait : trois visages, huit teints, neuf coiffures, six couleurs de cheveux, quatre vêtements et sept couleurs de vêtement.

Douze choix d’accessoire ou finition, un à la fois : aucun, pendentif lune, broche étoile, halo, lunettes rondes, lunettes dorées, boucles de lune, couronne étoilée, barrette comète, foulard céleste, casque audio et barbe courte. Aucun achat.

## Utilisation actuelle

Dans **Mon Profil → Ton avatar → Essayer la collection céleste**, ouvrir l’atelier : modèles de départ volontaires, aperçu immédiat, vignettes pour les formes, couleurs nommées, radios natives et focus visible. Réinitialiser et fermer sont explicites. Fermer ou changer de compte abandonne les essais. Pas de requête, stockage navigateur, sauvegarde fictive ni modification du profil ou d’une carte. Le choix enregistré actuel continue d’utiliser l’éditeur V1.

Les éléments vivent dans `lib/avatar-collection-v2.ts` et `components/avatars/AvatarRendererV2.tsx`. Le format garde dix propriétés fermées : `format: 1`, `catalogVersion: 2`, `renderVersion: 2` et les sept identifiants de choix. Aucune propriété supplémentaire, version mixte, couleur arbitraire, HTML ou SVG fourni par l’utilisateur n’est accepté. Décors et vignettes sont ignorés par les lecteurs d’écran ; le portrait principal porte un nom accessible. Aucun ID SVG partagé, filtre, ressource extérieure ou animation.

Les moteurs et catalogues V1, les snapshots publiés, les routes publiques et la persistance sont intacts. Le validateur de sauvegarde refuse encore les configurations V2. **Ne pas contourner ce refus en remplaçant les numéros de version par 1** : cela changerait la signification des données et le rendu historique.

## Activation ultérieure de la sauvegarde

Le contrat SQL confirmé autorise exclusivement `catalogVersion: 1` / `renderVersion: 1` et les identifiants historiques. Pour rendre V2 enregistrable, préparer une extension revue du validateur `ephemer_lot09.avatar_valide`, autorisant précisément les deux versions et leurs catalogues respectifs, sans modifier les moteurs V1. Faire appliquer l’extension humainement, contrôler le catalogue en lecture seule, puis connecter un validateur et un dispatcher V1/V2 communs à l’éditeur, au profil et aux signatures de carte. Les copies dans les publications doivent garder leur propre version. Adapter le contrôle combiné 09, les recettes, l’export et le retour arrière, qui doit refuser les configurations V2 présentes. Aucun SQL d’extension n’est appliqué ni présenté comme confirmé dans cette livraison d’assets.

## Contrôles

Les tests `avatar-collection.test.mjs` vérifient les identifiants, les versions, les configurations hostiles, le rendu React/SVG de chaque option, les accessoires distincts, les radios contrôlés, l’annulation, les modèles volontaires et l’absence de faux enregistrement. Les tests V1 et des cartes vérifient la compatibilité historique.

Recette autonome : `node tests/avatars-preview.mjs`, puis ouvrir `http://127.0.0.1:3209`. Les vrais composants/CSS sont rendus avec exemples fictifs, sans accès distant. Le serveur interdit les connexions sortantes côté navigateur. La recette ne prouve aucune persistance Supabase.

Vérifications effectuées : `npm run verify` réussi, **215 tests**, TypeScript et build ; lint sans erreur et 11 avertissements préexistants. `git diff --check` et contrôle des fichiers nouveaux réussis. Revue React : composants contrôlés, modal existante, aucun effet réseau, radios natifs et noms accessibles. Navigateur réel à 1080 px et 320 px, thèmes clair et sombre : portraits et vignettes rendus ; sur mobile, page 320/dialogue 303 sans débordement horizontal. Choix des lunettes, changement par flèche au clavier, fermeture par Échap et focus restitué au bouton contrôlés. Aucun essai enregistré ni compte distant utilisé.
