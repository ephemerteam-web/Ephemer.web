# Contrat d’intégration 10A — après confirmation du schéma

Ce contrat est intégré dans le code local au 9 octobre 2026, après confirmation humaine et contrôle du catalogue `lot10a_catalogue_conforme`. Les recettes avec vrais JWT et concurrence restent reportées ; voir [RECETTE-APPLICATION.md](RECETTE-APPLICATION.md).

## Authentification et transport

Les opérations utilisent le JWT de la session, validé par `auth.getUser`. Créer un client Supabase **par requête**, avec clé anon publique et `Authorization: Bearer <session>` ; pas de session persistante serveur ni de RPC sociale avec la clé service role. L’acteur SQL est `auth.uid()`, vérifié à nouveau dans Auth. Il faut être connecté avec adresse vérifiée ; l’inscription anonyme est refusée.

Réponses privées `Cache-Control: no-store`, erreurs françaises sans texte SQL. Ne jamais journaliser corps, token, adresses ou JWT. POST avec origine étrangère refusée ; ne pas accepter de propriétaire, de nom de table ou de filtre arbitraire. Limiter le flux brut à 4 Kio avant parsing, puis appliquer `commandeEtoile`, puis transmettre seulement sa projection. Le SQL valide aussi clés/types/tailles : un appel direct à RPC ne contourne pas les règles.

| Route proposée | Opération SQL | Retour attendu |
|---|---|---|
| POST `/api/etoiles/reconnaitre` | `reconnaitre_etoiles(p_apres,p_limite)` | `{ok,nouvelles,apres}` ; contact cursor texte ou null |
| GET `/api/etoiles` | `lire_etoiles(p_vue,p_apres,p_limite)` | `{items}` ; vues actives/recues/envoyees/bloquees/liens |
| GET `/api/etoiles/associations` | `lire_associations_etoiles(p_apres,p_limite)` | contact bigint texte, etoile_id, relation_id |
| POST `/api/etoiles` | `commander_etoiles(p_action,p_donnees,p_operation)` | résultat fermé, selon commande |
| GET `/api/etoiles/export` | `exporter_etoiles(p_vue,p_apres,p_limite)` | cinq projections propriétaire paginées |

Les paramètres de lecture sont fermés ; pas de `userId`. Curseurs UUID pour les étoiles ; chaînes décimales bigint pour les contacts. Épuiser les pages, ne pas s’arrêter au premier lot ni trier les bigint lexicalement. Pour l’export, curseur UUID sauf associations, paginer chaque vue et les notifications propriétaires. Refuser un export partiel ou un changement de session et n’effectuer le téléchargement qu’après contrôle final. Passer la version à 8 uniquement à cette intégration.

Les trois commandes `demander*` donnent HTTP 202 avec **le même corps** `{ok:true,message:"Demande enregistrée."}` pour toute adresse valide et opération admise. Pas de profil dans le retour ou le suivi envoyé. Transformer le texte SQL ASCII en français à la frontière HTTP. Une adresse invalide donne 400, absence de session 401, adresse non vérifiée 403, quota 429, conflit `P1009` 409. Autres cibles indisponibles : réponse 403 générique. Ces réponses ne promettent pas une durée réseau identique ; mesurer l’énumération temporelle et ajouter une limitation de débit globale avant l’ouverture publique.

UUID d’opération créé avant le premier POST, conservé en mémoire pendant la tentative et les retries. Une même commande reprend exactement le même UUID et le même contenu canonique. Changer le contenu impose une nouvelle tentative explicite. Pas de retry automatique après refus métier. Toujours relire l’état après mutation, y compris après réponse d’idempotence : une acceptation ancienne ne restaure pas une relation retirée.

## Commandes fermées

Enveloppe `{action,donnees,operation}`. Identifiants UUID ; `contactId` chaîne décimale positive dans l’intervalle bigint PostgreSQL.

| Action | Seuls champs de `donnees` |
|---|---|
| demander | email |
| demander_contact | contactId |
| demander_lien | token |
| accepter / refuser / annuler | demandeId |
| retirer / bloquer / debloquer | etoileId |
| creer_lien | aucun |
| revoquer_lien | lienId |
| associer_contact | contactId, etoileId |

La reconnaissance utilise uniquement Auth et les carnets réciproques. Réciproque après refus d’une demande peut toujours créer une relation si aucune relation retirée ni blocage n’existe : le refus concerne cette demande ; le blocage interdit la relation. Retirer ou bloquer neutralise les demandes anciennes de cette paire. Une nouvelle demande après déblocage doit pouvoir être acceptée, sans faire renaître une ancienne demande neutralisée. Les demandes croisées créent une seule relation ; la seconde acceptation peut renvoyer 409, suivie d’une relecture montrant la relation.

## Mes étoiles — disposition mobile d’abord

Entrée dédiée dans la navigation, avec badge des demandes reçues. En tête : titre, courte explication de la reconnaissance réciproque, boutons **Ajouter une étoile** et **Partager mon lien**. Puis trois onglets **Mes étoiles**, **Reçues**, **Envoyées**, chacun avec compteur issu d’une lecture complète. Blocages et liens disponibles par un panneau secondaire.

Une carte active présente le prénom, le motif du lien et **Voir dans mon carnet** si une association existe. Le menu propose Retirer/Bloquer avec confirmation expliquant la perte d’accès. Sans fiche, **Ajouter à mon carnet** ouvre le formulaire existant prérempli seulement avec l’identité minimale ; aucune insertion automatique. Avant création, proposer de choisir une fiche existante et l’associer explicitement. Une étoile peut avoir plusieurs fiches associées ; ce n’est pas un doublon de relation.

Cartes reçues : prénom du demandeur, expiration, Accepter/Refuser, menu Bloquer. Cartes envoyées : adresse saisie, état, expiration, Annuler si encore en attente ; aucune identité résolue. Les contacts affichent une pastille uniquement quand l’association et la relation sont actives. Garder l’invitation actuelle de collecte de fiche privée, avec libellé distinct **Inviter à compléter sa fiche**.

Afficher chargement, absence de résultat et erreur de lecture distinctement. Préserver les saisies en cas d’échec ; prévenir avant abandon. Utiliser dialogues, contexte utilisateur, scopes d’annulation et garde des brouillons existants. Retours tardifs de l’ancien compte ignorés ; vider listes, saisies, liens, tentatives et badges à la déconnexion ou au changement de compte. Aucune persistance dans localStorage, IndexedDB, cache HTTP ou service worker.

Au dashboard et après changement de carnet : reconnaissance paginée, une séquence par compte, puis actualisation des lectures. Limiter les rafales, annuler l’ancienne séquence ; ne pas lancer une boucle non bornée au rendu. Une séquence doit épuiser les pages pour ne pas ignorer les grands carnets. Erreurs visibles, pas de succès inventé. Revalider au retour de fenêtre et après mutation. Hors ligne, afficher le bandeau et désactiver les opérations ; ne pas inventer de relation à partir d’un cache. Conserver le service worker à sa liste fermée de fichiers publics.

## Lien partagé et notifications

Page d’entrée générique `/etoile#<secret>`, distincte d’`/invitation/[token]`. Aucun nom du créateur dans HTML, metadata ou URL serveur. Retirer le fragment après lecture en mémoire ; ne pas le conserver au fil d’une redirection OAuth. Après reconnexion demander à rouvrir le lien. Le POST ne part qu’après clic **Demander à devenir une étoile**, jamais à l’affichage.

Pas d’analytique ni de ressource tierce sur cette entrée ; no-store/no-referrer/noindex et exclusion du cache PWA. Secret canonique de 43 caractères. Création : copie/menu natif sur clic distinct avec expiration et explication de remise unique. Annulation du menu ne vaut pas partage. Un secret perdu se remplace par révocation puis nouvelle création explicite ; aucune récupération depuis le journal d’opérations.

Réunir notifications personnelles et sociales dans la cloche sans confondre leurs tables ni leurs clés. Type de source fermé, lecture propriétaire, clic social ouvre Mes étoiles ; marquage `lue` uniquement. Compteur et liste actualisés après lecture/acceptation/retrait. Ne jamais fabriquer contact_id ou occurrence_id pour une demande entre comptes.

## Suite

10B crée `UniversPartage`, valeurs/permissions et pseudonyme, avec aperçu de la portée « toutes mes étoiles actuelles et futures ». Les anciennes notes et textes d’invitation ne sont pas copiés. 10C permet l’IA sur chaque champ partagé seulement avec les deux accords, relus avant l’appel fournisseur. Pas de coordonnées ni date de naissance exacte. Ces contrats feront chacun l’objet d’un dossier SQL humain séparé ; ils ne sont pas simulés dans les types Supabase actuels.
