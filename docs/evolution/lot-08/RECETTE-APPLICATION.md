# Recette applicative du lot 08

7 octobre 2026. Catalogue confirmé en lecture seule, types réels régénérés, application intégrée localement. Aucun SQL distant appliqué par l’assistant. Cette procédure complète les tests automatisés ; elle ne prétend pas avoir été exécutée avec des comptes Auth réels.

## Configuration humaine

Configurer `EPHEMER_CARD_LINK_KEY` uniquement sur le serveur : 32 octets aléatoires encodés en 64 caractères hexadécimaux. Ne pas préfixer NEXT_PUBLIC, afficher sa valeur, réutiliser une autre clé ou la placer dans Git. Conserver une sauvegarde autorisée distincte des exports. Redémarrer le serveur après configuration. Le nom est absent de `.env.local` au contrôle ; aucune valeur n’a été modifiée.

Sans clé : vérifier sauvegarde du brouillon et révocation disponibles ; publication, remplacement et récupération doivent échouer explicitement. Une consultation déjà autorisée par un secret utilise son empreinte et reste indépendante de la clé. Une clé perdue ne permet plus la récupération ; voir la procédure de rotation dans [README](README.md#clé-serveur-export-et-effacement).

Ne pas réappliquer le schéma déjà installé. Pour les recettes RLS/cascades/concurrence, utiliser seulement une copie autorisée, des comptes fictifs A/B et les garde-fous du [dossier SQL](README.md#application-humaine--ne-pas-sauter-la-validation). Désactiver les prestataires externes dans cette copie.

## Parcours créateur et destinataire

1. `npm run dev`, connexion A, ouvrir une préparation puis **Ouvrir ma carte**. Aucune carte ne doit être créée à l’ouverture. Reprise du message uniquement après clic. Signature vide par défaut, aucun profil lu pour signer.
2. Choisir successivement les trois modèles, saisir un message hostile (`<script>alert(1)</script>` et une longue chaîne) et une signature. Tout reste du texte ; aucun lien ou HTML interprété. Enregistrer explicitement, fermer/réouvrir puis se déconnecter/reconnecter : retrouver les choix.
3. Modifier le texte : publication désactivée tant que non enregistré. Enregistrer puis publier après confirmation, 30 jours par défaut. Vérifier le texte d’avertissement sur le transfert du lien et la limite de révocation.
4. Récupérer le lien puis copier/menu natif depuis un clic séparé. Le menu natif reçoit uniquement un titre générique et l’URL. Annuler ne doit pas annoncer un partage réussi. Sans clipboard API, sélectionner/copie manuelle du champ disponible. Aucun envoi automatique.
5. Dans un navigateur privé sans session, ouvrir le lien avec fragment. Inspecter le POST même origine : secret dans le corps seulement, credentials omis. La réponse contient uniquement `content` et `expiresAt`. Ni brouillon, note, profil, coordonnées ou ID privé. Une URL `/carte` seule ou avec paramètres ne consulte rien.
6. Éditer/enregistrer un autre modèle/message/signature : le rendu publié reste identique. Remplacer le lien : même version publiée, ancien secret indisponible. Republier : nouvelle version et ancien secret indisponible. Désactiver : consultation suivante refusée, brouillon/versions conservés pour A.
7. Retrouver le même lien actif après vraie reconnexion. Tester les échéances 7/30/90/365 jours ; pour l’expiration exacte utiliser la recette isolée et une échéance courte sur copie autorisée. Inconnu/expiré/révoqué : même réponse « Cette carte est indisponible ».
8. Supprimer la carte ; tous ses secrets doivent être refusés. Sur comptes fictifs autorisés seulement, vérifier aussi suppression de préparation et compte. Suppression de contact : le lot 02 conserve l’événement historique détaché ; supprimer/révoquer la carte séparément.

## Erreurs, concurrence et confidentialité

- Deux onglets A ouverts à la même révision : édition contre publication, puis deux remplacements. Un seul succès ; l’autre garde sa saisie et demande une relecture volontaire. Ne pas adopter silencieusement la révision d’un texte différent.
- Perdre une réponse après publication/remplacement/révocation : **Reprendre la même opération** doit réutiliser son UUID et ses paramètres. Un double clic rapide ne doit pas remplacer cet UUID. Rejouer après une révocation ultérieure ne doit pas réactiver l’ancien lien.
- Coupure de réseau et timeout : aucun faux succès, texte conservé, relecture explicite. Compte changé pendant requête : ignorer le résultat ancien. B ne peut ni lire, modifier, supprimer, récupérer ou gérer une carte de A en remplaçant l’ID dans REST/API. Anon ne peut exécuter les RPC privilégiées ni lire les tables.
- Retour arrière, page masquée, perte de réseau : effacer le contenu destinataire. Au retour, revalider avant affichage. Expiration : retirer le contenu. Onglet actif : revalidation au maximum chaque minute ; une révocation refuse toute nouvelle consultation.
- Inspecter HTML/RSC/headers et métadonnées sociales : génériques, no-store, no-referrer, noindex, aucun message/secret et aucun appel tiers. Le secret n’entre pas dans chemin/query, journaux applicatifs ou suivi. Ne pas copier un lien réel dans un rapport, capture ou export.
- Export depuis **Mes données** : version 6, cartes/versions/statuts de droits paginés, aucun secret clair/chiffré, empreinte, nonce, tag ou opérations internes. Échec/changement de session : aucun téléchargement partiel.

## Mobile, clavier et hors ligne

À 320/390/1280 px, clair/sombre et réduction des animations : trois modèles, très longues chaînes, scroll du dialogue, aucun débordement horizontal. Clavier : ouverture, focus initial, tabulation, radios/flèches, labels, Escape avec confirmation de perte, retour du focus au déclencheur. Aucune animation nécessaire. A/B : aucun champ ou lien ancien affiché au changement de compte.

La PWA garde seulement sa page de secours et ses icônes publiques. Hors ligne, aucun HTML/RSC/API de carte ne doit être récupéré du cache. Une vue de secours explicite est attendue.

## Commandes et preuves

- `npm run verify` : lint, types, tests comportementaux et build. Base/Auth des tests sont fictives ; AES et rendu React sont réels.
- `npm run start -- --hostname 127.0.0.1 --port 3218`, puis `node tests/cards-http-check.mjs` : HTTP réel du build local, sans session, shell/headers/refus et RPC publique de lecture pour un secret fictif inconnu. Aucune mutation distante.
- `node tests/cards-preview.mjs` sur 3208 : composants/CSS réels, données en mémoire et réseau externe bloqué. Compilation vérifiée ; inventaire de navigateurs vide dans la session, recette visuelle non attestée.
- `git diff --check` : contrôle des espaces. Aucun commit/déploiement, dépendance ou modification de secret.

La confirmation du catalogue et les simulations ne constituent pas une preuve de reconnexion JWT réelle, des RLS par REST ou des cascades sur comptes fictifs. Consigner séparément les résultats de cette recette avant livraison.
