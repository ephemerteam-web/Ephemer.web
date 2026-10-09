# Contrat applicatif 10B — après confirmation du catalogue

**État actuel : intégré localement le 9 octobre 2026 après installation humaine et contrôle distant `lot10b_catalogue_conforme`.** Types régénérés depuis le schéma réel ; documentation Next 16 locale lue avant les routes. Les recettes JWT signés/concurrence/cascades restent reportées explicitement. Changements 10A conservés, aucun commit ou déploiement.

## Interfaces et données

`MonUnivers` contient `revision`, `modeIdentite` (`prenom`/`pseudonyme`), `identite`, `valeurs` et `partage`. `valeurs` contient exactement `presentation`, `passions`, `plaisirs`, `eviter`, `anniversaire`, `email`, `telephone`. L’anniversaire vaut null ou `{jour,mois,annee:number|null}`. Les neuf booléens de `partage` correspondent aux six champs textuels, anniversaire, année et avatar. Aucune autorisation IA dans cette tranche.

`UniversPartage` contient seulement `{identite,champs}`. `champs` est un objet fermé à champs facultatifs ; un anniversaire partagé possède jour/mois, et **aucune clé année** lorsque celle-ci est masquée. L’avatar est une configuration V1/V3 valide sans référence externe. Aucun identifiant propriétaire, note privée, champ masqué ou permission brute n’y apparaît. Utiliser `universPartage()` avant affichage ; ne jamais obtenir la ligne entière d’un tiers pour la filtrer dans le navigateur.

`commandeUnivers()` ferme l’enveloppe `{action,revision,operation,donnees}`. Pour `enregistrer`, les données sont exactement les quatre champs de MonUnivers hors révision. Pour `masquer`, `donnees={}`. UUID d’opération en texte ; révision entière sûre, initiale 0. Une même tentative reprend le même UUID et les mêmes données canoniques, y compris la révision. Nouvelle saisie : nouvelle tentative explicite. Le résultat fermé contient seulement `{ok:true,revision}` ; il impose ensuite une relecture.

Limites : 80 caractères pour l’identité, 1 000 par texte, email 320, téléphone 32 ; valeurs 24 Kio, corps HTTP 32 Kio, réponse 128 Kio. Refuser champs inconnus, mauvais types, dates impossibles, Unicode invalide, caractères de contrôle et URL/markup libre d’avatar. Les textes hostiles restent des données rendues par React, jamais HTML interprété. Conserver les IDs de contacts 10A en texte sans conversion numérique.

## Routes et Supabase

| Route intégrée | Opération installée appelée avec le JWT utilisateur |
|---|---|
| `GET /api/univers` | `lire_mon_univers()` |
| `POST /api/univers` | `commander_mon_univers(p_action,p_donnees,p_revision,p_operation)` |
| `GET /api/univers/etoile?etoileId=<uuid>` | `consulter_univers_etoile(p_etoile)` |

Le masquage passe par le POST avec `action=masquer`. Pour l’export, réutiliser la lecture propriétaire authentifiée, sans API qui accepterait un propriétaire arbitraire. Un UUID absent, personnel ou non autorisé sur la route tierce est refusé ; réponse 403 générique pour non-ami, relation retirée, blocage ou compte inconnu.

Créer un client par requête avec clé anon et bearer utilisateur, vérifier `auth.getUser(token)` puis compte non anonyme et email vérifié. Jamais de service role. Reprendre les protections HTTP de 10A : vérification d’origine, bearer borné, paramètres uniques fermés, JSON borné, timeouts et erreurs sans contenu SQL. `private,no-store`, no-referrer/noindex, Vary Authorization ; aucune journalisation des corps ou JWT. Mapper 401 session absente/invalide, 403 acteur/accès refusé, 400 entrée invalide, 409 `P1009`, 413 volume et 503 indisponibilité. Aucun cache HTTP/RSC/service worker ni stockage navigateur.

Adapter le transport navigateur au `UniversService` préparé : vérifier le compte avant/après chaque requête, abortSignal et hors ligne. Service stable, remontage par compte. `UniversForm` conserve la saisie et l’UUID, relit après chaque mutation même en cas d’erreur ; un résultat ancien n’est pas une preuve de l’état courant. Confirmation du masquage, bouton focalisable durant l’opération avec `aria-disabled` et verrou ; hors ligne, véritable désactivation.

## Édition et consultation

Monter `/dashboard/univers` et sa navigation : trois blocs, aperçu dessous sur mobile/à droite sur desktop. Au premier chargement, seul le prénom minimal 10A peut servir d’identité ; aucune insertion automatique ni reprise des coordonnées/notes. Les changements de partage restent un brouillon jusqu’au bouton d’enregistrement. L’aperçu porte explicitement sur les changements à enregistrer et toutes les étoiles actuelles/futures.

Fournir **uniquement l’avatar réellement enregistré et valide** à `avatarEnregistre`, jamais le repli du contexte d’avatar personnel ou les choix de l’atelier. Relire sa source au retour de fenêtre et actualiser après sauvegarde personnelle. En lecture tierce, seul le RPC résout cet avatar, sans ouvrir les droits de lecture de la table privée.

Ajouter un panneau de consultation réutilisable depuis chaque étoile active, même sans fiche. Dans le drawer et la fiche associée, utiliser ce panneau dans un bloc distinct `Son univers partagé`. Trouver l’association privée courante via le contexte 10A ; une perte d’association enlève seulement ce panneau du contact, pas l’amitié. Ne copier aucune valeur dans le carnet ni créer/modifier événement/rappel.

Charger seulement les univers ouverts, rafraîchir focus/retour visible/60 secondes et après action sociale. Annuler/effacer les contenus tiers dès que relation/blocage/perte d’association sont constatés, hors ligne, masquage de page ou changement de compte. Sur erreur de validation/403/panne, retirer l’ancien contenu plutôt que présenter un accès supposé valide. Refuser les réponses dépassées même si l’annulation réseau est ignorée. Ne pas charger tous les univers au dashboard.

Le formulaire personnel rafraîchit aussi à 60 secondes/focus ; une version distante ne remplace jamais une saisie sale. Relecture destructive de la saisie : confirmation explicite. Protéger navigation/fermeture avec le garde de brouillon existant ; généraliser alors son libellé « attentions » à « modifications » pour inclure l’univers. Pas de persistance du brouillon dans localStorage/IndexedDB.

## Export et livraison

Après intégration, format **9** : ajouter le MonUnivers enregistré du propriétaire (identité, valeurs privées, permissions, révision), sans univers des étoiles, avatar tiers ou journal d’idempotence. L’avatar propriétaire existe déjà dans l’export ; pas de duplication. Lire toutes les autres tables/projections 10A comme aujourd’hui ; session avant/après, aucun export partiel. Documenter la projection et l’absence d’instantané transactionnel dans les limitations.

Actualiser la confidentialité pour les fonctions réellement branchées, l’audience, le masquage, les données déjà vues, l’avatar courant et l’absence d’usage IA. Cascade Auth des deux nouvelles tables ; tester uniquement avec fixtures autorisées. La rétention du journal propriétaire et la purge devront être arrêtées avant lancement, sans effacer les tombstones de retrait/blocage 10A.

Pas de nouvelles notifications lors d’une modification d’univers dans cette version, pas de profil public, recherche de comptes, constellations, adresse postale ou achat. 10C reste une tranche séparée avec permissions IA initialement refusées et double accord relu côté serveur.
