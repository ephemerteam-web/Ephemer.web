# Recette du lot 09

## Application intégrée et aperçu fictif

`npm run dev` : rectangle du profil ou cercle du menu latéral → **`/avatar` → Personnaliser mon avatar**, puis préparation → **Ouvrir ma carte** → **Ajouter mon avatar**. La sauvegarde utilise les tables installées. Publication/récupération nécessitent la clé serveur 08 configurée humainement.

`node tests/cards-preview.mjs` sur `http://127.0.0.1:3208` : vrais composants/styles profil et cartes, faux comptes A/B et données en mémoire, aucun compte ni API distant. `node tests/avatars-preview.mjs` sur `http://127.0.0.1:3209` : vrais composants de page avatar, éditeur, badges et menu, profil d’exemple fictif et navigation simulée. Sauvegarde temporaire en mémoire ; aucun compte distant.

- À 320/390/1280 px et dans les deux thèmes : tous les visages/coiffures/teints/vêtements/accessoires, textes visibles, boutons au moins 44 px et aucun débordement horizontal. Trois modèles de signature avec longues chaînes à vérifier aussi dans les composants de carte.
- Clavier : Tab, Shift+Tab, flèches des radios, Espace, select, Échap ; légendes et noms de couleurs compréhensibles. Focus confiné au dialogue puis rendu au déclencheur. Pas d’animation, y compris avec prefers-reduced-motion.
- Choisir et annuler/Échap : choix enregistrés retrouvés. Réinitialiser les choix ne sauvegarde rien. Enregistrer puis fermer/rouvrir : choix sauvegardés repris ; vérifier une vraie reconnexion dans l’application. Changement de compte fictif : états séparés par remontage. Aucune configuration dans le cache/service worker ou stockage navigateur persistant.

## Résultats du 8 octobre 2026

- Page `/avatar` et trois aperçus partagés : `npm run verify` réussi (235 tests, TypeScript, build). Nettoyage d’un avertissement du nouveau contexte, puis lint ciblé et 15 tests avatar/Auth/PWA réussis ; 11 avertissements préexistants restent sur le dépôt. Tests simulés : sauvegarde confirmée, résultat tardif, compte étranger, essais annulés, accès depuis profil/menu, refus sans session et secours hors ligne sans cache privé.
- Navigateur réel sur données fictives : rectangle → `/avatar`, changement de bouche au clavier, sauvegarde avec focus restitué, portrait dans le menu et cercle → `/avatar`. La reconnexion et l’enregistrement sur un compte réel restent à recetter ; ces essais n’en donnent aucune preuve.

- Catalogue réel confirmé par le fichier READ ONLY entier (`lot09_catalogue_conforme`), types réels régénérés. 211 tests Node, TypeScript, lint (0 erreur, 11 avertissements préexistants), build et diff-check réussis.
- Navigateur à 320 px, vrais composants/CSS avec base fictive : choix au clavier, sauvegarde/reprise, annulation Échap et focus, aperçu de carte avec avatar, texte hostile littéral et longues chaînes sans débordement. Confirmation native de publication : outil navigateur bloqué ; publication interactive, desktop, partage et secours restent non attestés. Ces comportements sont couverts en simulation Node.
- Recette SQL mutante reportée explicitement par l’utilisateur faute de copie disponible. Garder le script protégé et ne jamais le lancer sur la cible principale. JWT/REST A/B/anon, reconnexion réelle, concurrence SQL, cascade et retour arrière restent à effectuer sur environnement autorisé.

## Après application humaine sur copie isolée autorisée

Exécuter les catalogues et la recette protégée selon README. Ne pas utiliser les comptes/script de fixture sur la cible principale. Lire/neutraliser triggers Auth et fournisseurs externes. Les claims du script SQL simulent Auth, pas un JWT signé. Recetter ensuite REST avec de vrais comptes fictifs A/B et leurs JWT dans un environnement autorisé, sans afficher les tokens.

- A sauvegarde puis se déconnecte/reconnecte : mêmes choix. B ne peut lire/modifier/effacer A ni usurper son user_id, y compris REST direct. Anon ne lit pas les avatars, cartes ou versions et ne peut appeler les RPC serveur. A ne peut insérer une version publiée.
- JSON incomplet, clé supplémentaire, version/identifiant inconnus, tableau à la place d’un ID, markup et couleur CSS arbitraire : refus en SQL et dans le contrat TypeScript. Dates/identité/révision initiale ne sont pas modifiables par le navigateur.
- Deux éditeurs d’avatar sur la même révision : un succès, un conflit, saisie perdante conservée ; relecture explicite. Réponse de sauvegarde perdue : lecture puis reconnaissance du résultat attendu, sans écrasement/doublon. Échec de lecture ne signifie pas « aucun avatar ».
- Ajouter volontairement l’avatar à une carte, enregistrer puis publier : copie identique dans preview/signature publique. Le profil reste privé. Modifier ou retirer l’avatar du profil, modifier le modèle/avatar du brouillon : publication précédente identique, anciennes cartes V1 inchangées.
- Aucune lecture du profil pendant consultation/publication. Réponse publique exclusivement contenu publié et expiration, aucune fiche, email, notes, ID privé ou configuration non choisie. Textes hostiles échappés sans exécution, lien personnel non interprété.
- Remplacement du lien conserve la version/copied-avatar publiée. Republication crée une copie et un lien nouveaux ; ancien refusé. Révocation/expiration et revalidation au retour/hors ligne retirent le contenu affiché. Copier/menu natif reste manuel ; annuler le partage sans faux succès.

## Deux connexions et réponses perdues

Sur une carte fictive de révision R, garder les deux connexions ouvertes :

- Édition du brouillon/avatar contre publication pour R : un seul succès, publication de la copie enregistrée uniquement ; saisie perdante préservée, jamais remplacée par un rechargement automatique.
- Deux publications ou deux remplacements pour R avec UUID distincts : un succès/un conflit et un seul nouveau droit ; les secrets des tentatives perdantes ne sont jamais affichés. Conserver les scénarios de concurrence 08.
- Rejouer un UUID de publication V2 après réponse perdue : même résultat initial, aucune version supplémentaire. Modifier entre-temps l’avatar profil/draft ne change pas ce résultat. Après révocation/remplacement, rejouer cet UUID ne réactive pas l’ancien lien ; état courant relu avant copie.
- Une publication V1 via la nouvelle RPC conserve le format/moteur V1. L’ancienne RPC 08 refuse un brouillon V2 plutôt que publier sans avatar.

## Export, cascades et retour arrière

Après intégration : export version 7, avatar propriétaire et copies de cartes, métadonnées des droits sans aucun secret/empreinte/enveloppe. Export interrompu au changement de compte/erreur et jamais téléchargé partiellement. Vérifier une suppression de préparation et Auth uniquement sur comptes fictifs autorisés ; supprimer l’avatar personnel ne change pas les copies publiées.

Sur une copie jetable avec schéma 09 mais données 09 absentes : rollback 09, puis contrôle 08 conforme. Avec un avatar, un brouillon V2, une publication V2 ou une dépendance ultérieure : rollback refusé. Vérifier restauration de sauvegarde, sans effacer des données pour passer le garde. DROP RESTRICT protège les dépendances enregistrées ; les références SQL dynamiques nécessitent aussi une revue humaine.

Consigner chaque résultat avec environnement/date : simulation Node, expressions SQL réelles READ ONLY, catalogue installé, vrais JWT/REST, concurrence ou navigateur. Ne jamais présenter un cas non exécuté comme réussi. Les recettes mutantes et authentifiées restent à effectuer.
