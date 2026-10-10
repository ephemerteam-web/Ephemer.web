# Audit des parcours et mise en œuvre — 10 octobre 2026

## Résultat produit

La navigation principale suit quatre noms communs : **Accueil · Dates · Mes proches · Célébrations**. Les pages Anniversaires et Fêtes des saints sont rétablies avec leurs décomptes, accessibles depuis Dates et le menu. Ce mois-ci et les anciennes suggestions cadeaux restent accessibles par redirection ; aucun contact, message, carte ou événement n'est migré ou supprimé. L'export image est local. Le push quotidien est implémenté et son activation distante est documentée.

## Parcours utilisateurs

| Situation | Parcours retenu | Amélioration |
|---|---|---|
| Camille veut savoir quoi célébrer aujourd'hui | Accueil, puis Dates | Les anniversaires non favoris apparaissent aussi ; les favoris ont leur rangée distincte |
| Camille organise un anniversaire | Dates → Préparer → Célébrations | Une préparation reste attachée à l'occurrence datée, avec tâches, message et cadeau |
| Camille conserve une idée toute l'année | Célébrations → Idées et cadeaux → Mes idées | La bibliothèque, les suggestions et les cadeaux offerts sont réunis |
| Camille veut trouver un cadeau pour une étoile | Mes proches → Étoiles → suggestions | Le lien conserve etoileId et son contexte, avec les consentements IA existants |
| Camille souhaite envoyer une jolie carte sans lien | Carte personnelle → Partager en image | Préparation d'un PNG privé, aperçu, puis partage fichier ou téléchargement ; aucune publication implicite |
| Camille partage une fiche ou un budget | Bouton Partager en image | Coordonnées, année, notes et montants sont décochés par défaut ; le titre est lui aussi sélectionnable |
| Camille veut présenter ses goûts | Mon univers → Partager en image | Seul son univers enregistré est exportable ; aucun bouton dans les univers tiers |
| Camille veut un rappel sur son téléphone | Notifications → Paramètres | Un résumé maximum par appareil et jour ; option saints publics facultative |
| Camille ne veut rien recevoir les jours vides | Push actif, saints facultatifs décochés | Aucun push sans date personnelle avec rappel actif |

## Redondances corrigées

- Le calendrier Mois/Agenda conserve ses filtres et la recherche publique des saints. À la demande de l'utilisateur, Anniversaires et Fêtes des saints disposent aussi de leurs vues dédiées avec anneaux J‑…, filtres 7/30 jours et tri ; les trois vues sont reliées dans Dates.
- Deux entrées donnaient accès aux mêmes suggestions cadeaux. L'ancienne route gift-ideas redirige vers l'onglet Suggestions du même espace Idées et cadeaux, sans perdre les paramètres de contact, étoile, événement ou occurrence.
- Les liens étaient dispersés dans une navigation longue. Quatre espaces principaux, une navigation Contacts/Étoiles/Invitations et les outils de Célébrations donnent un accès commun aux fonctions.
- La liste d'anniversaires de l'accueil était limitée aux favoris. Elle utilise maintenant tous les contacts. Le sélecteur de liste et la gestion des dates personnelles ont été retirés de l'accueil. Un seul bloc « Aujourd'hui et à venir » regroupe la carte illustrée du saint, toutes les dates du jour et des trente prochains jours, puis les anniversaires récents. Les anciens blocs et leurs messages vides redondants ont été supprimés.
- Une étoile brillante sur Mes proches indique les invitations reçues en attente, dans la barre principale et le menu. Elle reste cachée pendant le chargement, hors ligne ou en cas d'erreur, et respecte la préférence de réduction des animations.
- Le bandeau « Le suivi des emails est indisponible » et son bouton Réessayer ne s'affichent plus dans Messages programmés. Les erreurs de chargement ou d'action restent visibles ; l'absence du journal ne transforme aucun envoi en livraison confirmée.
- Les champs des formulaires ont été harmonisés dans les thèmes clair/sombre : fond doux, angles communs, focus doré, erreur et désactivation, sans modifier les validations ni ajouter de dépendance. Voir [les choix de présentation](FORMULAIRES.md).
- Les libellés « attentions » visibles ont été remplacés par Célébrations, préparatifs, cadeaux ou cartes selon leur sens. Les identifiants techniques et URL historiques sont conservés.

## Distinctions utiles conservées

Contacts privés et Étoiles sociales n'ont pas les mêmes droits et ne doivent pas être fusionnés. Une préparation/tâche terminée ne signifie pas qu'un message est envoyé. Les préférences de rappel dans la cloche/email et le résumé push quotidien ont des règles distinctes, maintenant expliquées dans les paramètres. L'export d'image n'est pas une publication par lien, ni l'export JSON du compte.

## Notifications push

La génération quotidienne existante à 08:00 UTC appelle un expéditeur Web Push si le canal, la paire VAPID et le drapeau serveur sont valides. Les dates du jour sont sélectionnées avec les règles métier : annulations, archives, séries à reconfirmer, rappels suspendus et fêtes seulement déduites du prénom sont exclus. Les événements masqués au calendrier peuvent conserver leurs rappels actifs ; le résumé authentifié les affiche.

Chaque envoi doit obtenir une réservation atomique en base. Une seconde exécution, un doublon de ligne d'abonnement ou une réponse perdue ne provoque aucun renvoi ce jour-là. Le journal conserve seulement compte, empreinte d'endpoint, date et heure de réservation ; il ne contient ni message ni clé. Un résultat incertain peut donc faire perdre un résumé. Les noms privés restent dans l'application ; seuls les saints publics peuvent apparaître sur l'écran verrouillé.

Voir [le guide d'activation](NOTIFICATIONS-PUSH-QUOTIDIENNES.md). Les variables VAPID étaient déjà présentes sur Vercel ; le drapeau d'activation a été ajouté via le connecteur. L'utilisateur confirme avoir installé le SQL le 10 octobre 2026. Aucun SQL n'a été appliqué par l'assistant, aucun secret généré ou affiché, aucun push réel envoyé et aucun déploiement réalisé. Le contrôle serveur affiche indisponible tant que l'installation n'est pas prête.

## Partage des cartes

Les champs sont sélectionnés dans un dialogue natif avec aperçu. Les PNG sont créés en mémoire dans le navigateur avec html-to-image, chargé à la demande. Largeur 1280 px ; pages de hauteur maximale 4096 px coupées entre lignes/illustrations. Un élément indivisible trop haut est refusé explicitement. Pas de capture globale de l'écran, pas de proxy d'image privé et aucun stockage distant.

Les moteurs de cartes historiques restent inchangés. Message, signature et avatar viennent du snapshot privé ou publié choisi, jamais d'un profil relu pendant le rendu. La signature et l'avatar peuvent être retirés dans l'export uniquement. Les données sensibles sont exclues par défaut dans les autres cartes. L'image originale SaintDuJour garde son circuit existant avec repli sur téléchargement.

Le navigateur ouvre le partage natif seulement après préparation des fichiers. Une annulation conserve les fichiers sans annoncer un envoi. Le téléchargement reste accessible. Fermeture, changement de contenu ou de compte invalide les résultats tardifs et libère les URLs blob.

## Vérifications et limites

Les vérifications finales réussissent : **338 tests passent**, TypeScript et build de production réussissent ; ESLint rapporte **0 erreur et 6 avertissements existants**. La recette navigateur initiale vérifie aussi un téléchargement réel du PNG sur disque et ses dimensions/contenu. La recette complémentaire à 320/390/1440 px vérifie l'accueil unifié, les décomptes et filtres, les liens de navigation, l'étoile des invitations, l'absence du bandeau email, les champs uniformes, le focus/erreur/désactivation et les thèmes. Aucun script npm n'a été ajouté. Le build a nécessité une exécution hors sandbox après un refus d'accès du compilateur Windows ; ce refus n'était pas un défaut du code.

Les tests Node utilisent de fausses bases et de faux transports. Les tests ajoutés couvrent J0 et jours vides, fêtes confirmées, annulation/archives, doublons/concurrence et résultat incertain, journal absent, filtrage des endpoints, configuration VAPID fermée, isolation propriétaire, projections d'images, pagination, paramètres historiques et anniversaire non favori.

La recette Edge utilise les vrais composants et CSS avec des données fictives : largeurs 320/390/1440, navigation et filtres URL, thèmes, dialogue/Escape/focus, sélection sans données sensibles, présence réelle de pixels dans les PNG, avatar, annulation de partage fichier, téléchargement effectif et texte long en six pages. Une inspection visuelle a détecté puis permis de corriger un défaut de rasterisation vide. Le partage natif du système est simulé pour vérifier son annulation ; sa réception sur téléphone réel n'est pas attestée. Les captures de cette recette restent dans `out/celebrations-preview/`, ignoré par Git. Le serveur fictif peut être lancé par `node tests/celebrations-preview.mjs`.

Les vérifications authentifiées en production, permissions/RLS du nouveau journal, concurrence PostgreSQL réelle et réception sur iPhone/Android restent à effectuer après configuration. Le service worker conserve uniquement les assets publics et la page de secours ; les données privées ne sont pas ajoutées au cache hors ligne.

L'audit npm effectué après installation des deux bibliothèques signale **15 alertes : 1 faible, 1 modérée, 12 élevées, 1 critique**, notamment dans Next.js et des dépendances d'outillage. Ce chantier n'a pas changé la version du framework ni appliqué de correction forcée. Prévoir une mise à niveau compatible puis la même recette complète avant exposition. [Avis de sécurité Next.js signalé par npm](https://github.com/advisories/GHSA-p293-qw3h-jr36).

`AGENTS.md` a été réécrit d'après le dépôt actuel : scripts de test/vérification, types générés, cartes/avatars/univers/Étoiles, nouvelle navigation et statut réel du push. Aucun commit n'a été créé ; la modification déjà présente dans `docs/evolution/lot-10C/RECETTE-APPLICATION.md` a été conservée.
