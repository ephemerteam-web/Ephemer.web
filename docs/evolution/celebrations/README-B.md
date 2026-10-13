# Célébrations B — invitations et organisation partagée

13 octobre 2026. **SQL installé humainement et catalogue confirmé ; activation applicative fermée en attente des recettes de droits/concurrence sur copie.** Le parcours personnel antérieur reste actif. Les permissions privées des lots 04/05 sont confirmées par colonne ; aucun ajout de droit nécessaire. Le bilan initial qui annonçait leur blocage était erroné. Voir [ACTIVATION.md](ACTIVATION.md) pour les étapes restantes et le parcours d’invitation depuis une célébration existante.

## Fichiers SQL complets et ordre humain

| Fichier | Usage et effet |
|---|---|
| [schema-propose.sql](schema-propose.sql) | Installation transactionnelle B sur copie après revue : 11 tables internes, passerelles, contrôles, intégration au blocage social et effacement Auth. Refuse un schéma déjà présent. Ne pas appliquer sur production pour tester. |
| [verification.sql](verification.sql) | READ ONLY : catalogue/RLS/permissions/points d’entrée/triggers ; résultat attendu `celebrations_b_catalogue_conforme`. Ne certifie pas les comportements métier. |
| [recette-copie.sql](recette-copie.sql) | Tests sur copie avec comptes fictifs, vrais rôles PostgreSQL et claims SQL simulés. Isolation, attente, motifs, destinataire organisateur, cadeau caché, réessai, publication minimale, source conservée, demandes acceptées/refusées et effacement. Termine par ROLLBACK. |
| [fixtures-concurrence.sql](fixtures-concurrence.sql) | Crée et conserve les fixtures **sur copie uniquement** pour deux sessions. Prévenir et désactiver tout webhook/fournisseur externe de la copie. |
| [concurrence-session-A.sql](concurrence-session-A.sql), [session-B](concurrence-session-B.sql) | Deux connexions indépendantes : acceptation/révocation, tâche rejouée, double suppression, transfert/départ et blocage/lecture. Exécution humaine seulement. |
| [concurrence-verification.sql](concurrence-verification.sql) | Assertions finales après les cinq courses ; READ ONLY. |
| [retour-arriere.sql](retour-arriere.sql) | Ferme les nouveaux droits sans supprimer les données ou les protections de révocation. Ne touche pas aux préparations privées. |

Les recettes exigent le marqueur de session `ephemer.recette_celebrations` égal à `copie_autorisee`. Le définir dans la même connexion que le script, **après avoir identifié humainement la copie**. Ce marqueur évite une exécution accidentelle ; il ne prouve pas, à lui seul, que la connexion vise une copie. Les fixtures portent des adresses example.invalid et des UUID dédiés ; elles ne sont jamais exécutées automatiquement. Désactiver tous services/crons/webhooks externes sur cette copie. Aucun secret dans les fichiers ou les résultats.

Concurrence : appliquer les fixtures sur copie, puis choisir dans les deux sessions le même `ephemer.course` parmi acceptation, tache, suppression, transfert, blocage. Lancer A puis B pendant la fenêtre de huit secondes. Exécuter les cinq cas dans cet ordre, blocage en dernier, puis le contrôle final. Inverser l’ordre de démarrage sur une copie restaurée : un départ du dernier organisateur avant transfert doit refuser ; une révocation avant acceptation interdit celle-ci. Restaurer la copie après recette ; ne jamais nettoyer des comptes réels à l’aide des UUID de fixtures.

## Contrat, séparation et autorisation

- Tables `celebrations`, `participations`, `sources`, `invitations`, `transferts`, `taches`, `commentaires`, `demandes`, `actions`, `operations`, `notifications` dans **ephemer_celebrations**, hors schéma exposé. RLS activées, aucune permission directe sur table/colonne pour anon/authenticated/service_role. Aucun nouveau groupe permanent.
- Les trois passerelles internes de commande/lecture/liste et celle de préparation d’effacement utilisent SECURITY DEFINER pour lire les tables internes ; elles contrôlent explicitement identité et ressource, avec search_path pg_catalog. Les wrappers publics sont SECURITY INVOKER. PUBLIC/anon/service_role ne peuvent exécuter ces API ; authenticated ne peut exécuter les helpers internes.
- L’acteur de coordination vient du helper social installé : compte Auth existant, adresse vérifiée, non anonyme. L’effacement propre du compte reste possible sans email confirmé. Aucun rôle, propriétaire ou identité n’est accepté dans une charge client.
- Contrat JSON fermé dans `lib/celebration-contract.ts`, transport JWT dans `celebration-data.ts`, validation serveur et limites de corps dans `celebration-server.ts`. Nouvelles fonctions absentes des types générés tant que non installées. SQL et code ne renommeront aucune table privée.
- UUID de commande stable et empreinte SHA-256 de charge canonique ; autorisation réévaluée avant tout retour d’un réessai. Cache minimal sans charge ni texte. Ressources identifiées séparément ; réinvitation/nouvelle demande après refus = nouvel UUID. Double clic ou réponse perdue = même UUID. Verrou social existant puis verrou de célébration et ligne : ordre partagé avec blocage/effacement pour sérialiser les changements de droits.
- Les tables/contraintes n’ajoutent aucun achat, paiement ou transport réel. Opérations et tombstones sans contenu conservées jusqu’à l’effacement du compte pour idempotence ; textes partagés conservés tant que la célébration existe, effacés lors de suppression ; commentaires/tâches de l’auteur retirés à son effacement. Cette politique B n’autorise aucun registre financier futur.

## API préparées

| Route | Réponse |
|---|---|
| GET/POST `/api/celebrations` | Liste paginée / commande fermée avec résultat `{ok,id}` |
| GET `/api/celebrations/detail?id=…` | Présentation et ressources autorisées, sans source privée ni champs supplémentaires |
| GET `/api/celebrations/invitations` | Présentation minimale des invitations, propositions de transfert et réponse personnelle minimale à une demande acceptée |
| GET `/api/celebrations/export` | Métadonnées actuellement autorisées et propres contributions uniquement |

Lectures : `apres` UUID nullable et `limite` de 1 à 100 pour listes/invitations ; export limité à une célébration par page pour borner les collections détaillées. Les collections enfants ne sont pas tronquées : maximum 100 tâches/commentaires/demandes par célébration, refus explicite avant dépassement. Historique et notifications = 100 dernières actions utiles, annoncé dans l’interface. Corps HTTP 20 KiB et réponse 2 MiB maximum ; une réponse trop volumineuse échoue sans export partiel. Ces bornes doivent être confrontées aux fixtures maximales avant activation ; ne pas prétendre supporter des collections illimitées.

HTTP : 401 session, 400 contrat, 404 ressource indisponible uniforme (inconnue/exclue/révoquée), 409 conflit/fermeture, 429 quota, 503 installation non activée ou indisponibilité. private/no-store, noindex et origine contrôlée. Aucun endpoint ne transmet le message brut d’une erreur SQL. Le verrou d’activation est local, jamais fourni par le navigateur.

## Parcours et règles B

- Créer seul ou à plusieurs, titre requis ; date/heure/lieu nullable. Date à choisir sans J−, occurrence fictive ou rappel. Une publication copie la date source **à cet instant**, affichée comme telle ; la date de fête reste distincte. Aucun anniversaire source modifié.
- Publier depuis privé exige sélection de tâches (aucune cochée), aperçu figé puis confirmation. Sous verrou, la date source et les titres/types sélectionnés doivent correspondre exactement à cet aperçu ; sinon conflit et nouvel aperçu requis. Copie titres/types des tâches et état À faire ; jamais brouillons, notes, coordonnées, cartes, goûts ou budget. Unicité propriétaire/préparation empêche plusieurs publications par réessai. Une suppression commune ne réécrit pas la préparation source.
- Invitations à des Étoiles actives seulement, identité Auth vérifiée, absence de blocage à émission et réponse, sept jours. 30 participants acceptés, 20 invitations pendantes, 10 nouvelles invitations par organisateur/célébration/24h. 120 commandes nouvelles par compte/heure ; réessais déjà enregistrés hors quota. Commentaires : 30 nouveaux par auteur/célébration/heure, comptés par opérations afin qu’un retrait ne réinitialise pas la limite. Demandes : une attente, trois nouvelles par compte/célébration/30 jours.
- Créateur organisateur ; chaque invité répond pour lui-même, pas d’accès aux contenus auparavant. Tâche participant attribuée seulement à lui-même ; organisateur peut choisir un responsable accepté. Révisions de tâche/commentaire propres, révision de présentation indépendante des changements secrets de tâche.
- Auteur seul édite son commentaire ; organisateur peut retirer sans réécrire. Le fil B est **coordination ordinaire** : avertissement qu’il est visible au destinataire hors surprise. Aucun fil de cadeau secret partagé avant C. Tâches cadeau/message masquées au destinataire ordinaire ; il ne peut les éditer ou en devenir responsable. Leur historique de tâche lui est également caché.
- Surprise partagée seulement avec destinataire identifié parmi les Étoiles acceptées ; aucun rapprochement par email. Exclusion du destinataire dans liste/détail/commandes/invitation/export/notifications, même organisateur. Surprise sans compte reste personnelle. Modifier mode/destinataire exige confirmation de revue ; invitations/transferts pendants fermés et participations incompatibles retirées atomiquement.
- Amitié retirée : participation déjà acceptée conservée. Blocage : **le bloqueur quitte** la célébration commune ; responsabilités libérées, invitations/transferts et notifications dépendants coupés. Dernier organisateur : maintenance, préparatifs suspendus, seulement proposition de transfert accepté ou clôture/suppression. Identité de la cible bloquée absente de cette présentation minimale. Débloquer ne restaure rien.
- Transfert en deux étapes, sept jours : le successeur accepte lui-même ; ancien organisateur devient participant ou quitte s’il était en maintenance. Dernier organisateur ne quitte une célébration active qu’après transfert accepté ou clôture explicite. Au début d’un effacement de compte, ses participations sont retirées ; la célébration sans organisateur autorisé est annulée. Un trigger Auth garantit ce traitement même pour une suppression directe du compte.
- Annuler/archiver ferment les nouvelles actions, invitations et transferts en conservant l’historique autorisé. Supprimer efface préparatifs communs et coupe lectures/écritures, sans supprimer sources privées. Demande de suppression avec motif réservé au demandeur et aux organisateurs autorisés ; invité en attente demande depuis sa présentation minimale. Refuser laisse l’espace inchangé, accepter utilise la même suppression transactionnelle. Réponse personnelle minimale après acceptation visible trente jours après décision, sans titre/date/contenu ancien et sans contournement de l’exclusion surprise ; cela n’est pas une archive de groupe.
- Export futur version 12, seulement lorsque B est activé : propres tâches/commentaires/demandes, participation personnelle et métadonnées autorisées ; pas des textes/identités des autres, invitations ou journal de groupe. Revalidation des droits avant téléchargement. Hors ligne : aucune écriture ou cache persistant, saisies en mémoire du compte courant ; refus/session/compte changé = retrait des contenus et abandon des réponses tardives.

## Activation et retour arrière

1. Revue humaine du dossier et sauvegarde/restauration **sur copie autorisée**. Compléter les contrôles de permissions effectives et corps des triggers sociaux sur cette cible ; ne pas installer sur une base différente par simple correspondance de nom.
2. Appliquer le SQL B humainement sur copie, puis `verification.sql`, recette de rôles et cinq courses. Toute erreur bloque l’activation, y compris problème de droits plateforme sur auth.users.
3. Avec vrais comptes de test créés humainement et JWT signés, exercer via HTTP et REST/RPC les mêmes rôles, URL changées, expiration, limites, perte de réponse, révocation, blocage, transfert, publication, demandes, export et effacement. Les claims SQL de la recette ne remplacent pas ce contrôle.
4. Après résultat approuvé, installation humaine sur cible et nouveau catalogue READ ONLY. Régénérer les types publics seulement maintenant ; vérifier les six signatures RPC JSON.
5. Changer **CELEBRATIONS_ENABLED** en true seulement après ces preuves ; aucune variable publique ou paramètre client ne peut activer le module. Refaire verify et recette utilisateur. Commit/déploiement humains.

Retour : remettre d’abord le verrou à false et restaurer l’application précédente ; `retour-arriere.sql` ferme les API sans DROP ni réécriture des sources. Les triggers de révocation restent installés pour éviter un état incohérent. Réactivation ultérieure par procédure revue, pas réexécution du fichier d’installation sur schéma existant.

## Vérifications réalisées et limites

Code : `npm run verify` réussi, **411 tests**, TypeScript/build, zéro erreur lint/cinq avertissements préexistants ; journal `out/celebrations-b/verify.txt`. Tests de contrat, API et composants exécutés avec transports/Auth fictifs, pas de données distantes. La recette existante privée reste couverte ; simulation d’effacement activé ajoutée.

Navigateur Edge réel avec données fictives : 320/390/1440, clair/sombre, liste/création/trois onglets, clavier, date nullable, aperçu puis publication, réponse perdue avec même opération, conflit/saisie, compte, hors ligne et révocation. **30 captures** dans `out/celebrations-b/preview/`. Aucun appel Supabase ou fournisseur ; CSP connect-src none. Les droits de rôle simulés ici ne prouvent pas les RLS distantes.

SQL : installation humaine confirmée puis catalogue READ ONLY réussi (`celebrations_b_catalogue_conforme`). Les 25 corps de fonctions installés correspondent au dossier local. Types publics régénérés après ce contrôle ; la colonne d’avatar `portrait_ia`, déjà installée, figure également dans cette régénération sans changement de son comportement. Le contrôle syntaxique PL/pgSQL antérieur utilisait des branches métier inaccessibles et des constantes pures. **Aucune mutation métier, recette de droits ou concurrence PostgreSQL effectuée par l’assistant.** Les scripts de copie/concurrence et de retour arrière n’ont pas été exécutés.

Restent à valider avant ouverture : comportements SQL sur copie, vrais rôles et JWT HTTP, courses dans les deux ordres, limites maximales, compte effacé après échec partiel, surprise/notifications/export à révocation et réception sur appareils physiques. Aucun SQL métier appliqué par l’assistant, migration, dépendance, email/IA/push réel, commit ou déploiement. Lots C/D et cartes collectives reportés.

Références consultées : [fonctions Supabase](https://supabase.com/docs/guides/database/functions), [verrous PostgreSQL 17](https://www.postgresql.org/docs/17/explicit-locking.html), [privilèges par colonne](https://www.postgresql.org/docs/17/functions-info.html#FUNCTIONS-INFO-ACCESS-TABLE).
