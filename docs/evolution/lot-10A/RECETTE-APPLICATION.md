# Recette et critères de livraison 10A

**Schéma confirmé et intégration locale effectuée le 9 octobre 2026.** Le catalogue complet a retourné `lot10a_catalogue_conforme` sur ephemer-app ; types régénérés depuis la base. Tests HTTP/client/composants exécutés avec Auth/RPC fictifs. Recette navigateur effectuée à 320 et 1280 px, sur les vrais composants/styles avec données fictives en mémoire et réseau externe interdit. Les étapes REST avec JWT réels, concurrence PostgreSQL et suppressions de comptes fictifs sur copie restent **non exécutées**. `verification.sql` reste interdit sur le principal ; le catalogue en lecture seule ne remplace pas ces essais.

## Vérifié localement

- Contrats fermés et bornés ; vérification de session, client par requête et transmission du JWT testés avec transports fictifs. Réponses neutres, codes d’erreur, remise unique du secret et projections sans données cachées. Pagination de 245 associations, parcours complet des reconnaissances et cinq projections d’export, refus d’une page défectueuse ou d’un changement de compte.
- Composants réels : UUID stable après réponse perdue simulée, relecture après succès/conflit/erreur, confirmation annulée, hors ligne, réponses tardives ignorées, actualisation visible à 60 secondes, prénom seul en brouillon, choix d’une fiche existante et aucune insertion automatique. Panne/notifications/export testés avec base fictive ; ces tests ne simulent pas les permissions SQL ou la concurrence du moteur.
- Navigateur : largeur 320 px sans débordement horizontal (contenu 305 px hors barre de défilement), dialogue 304 px ; desktop 1280 px, dialogue 608 px. Thèmes sombre/clair, Entrée pour ouvrir/accepter/associer et Échap avec focus restitué. Demande après panne conservée puis reprise, association et pastille sur une fiche, acceptation puis nouveau contact enregistré seulement au clic explicite. Deux notifications de même UUID, séparées par source, marquage social indépendant et suppression des rappels laissant la notification sociale.
- Copie manuelle d’un lien fictif, révocation avec confirmation et fermeture du panneau après retrait du bouton. Blocage/déblocage et compte B affichant des listes et compteur vides. Entrée publique avec fragment supprimé et demande uniquement après clic. Le menu natif de partage réel, de vraies expirations/révocations et les cascades sur comptes distants restent à effectuer.
- Reproduction de l’aperçu : `node tests/etoiles-preview.mjs`, port local 3210. Aucun accès Supabase, envoi externe ou donnée persistante. L’environnement Windows a nécessité le lancement autorisé hors du bac à sable pour rendre le port accessible au navigateur. Serveur et onglet de recette arrêtés ; captures dans `out/etoiles-preview/recette-desktop.jpg` et `recette-mobile.jpg`.

Les résultats finaux de lint, TypeScript, tests et build sont consignés dans [SUIVI.md](../SUIVI.md). La conservation/purge, la limitation de débit globale et la recette distante sont toujours des conditions avant ouverture publique.

## Base isolée et permissions

Revoir le SQL complet, appliquer sur copie et lancer `verification-lecture-seule.sql`. Attendu : `lot10a_catalogue_conforme`, sans accès à des lignes privées. Le contrôle compare notamment les corps des fonctions, droits et propriétaires ; il ne prouve pas leur comportement métier. Le propriétaire attendu est `postgres`, comme le SQL Editor Supabase. Si un autre propriétaire est volontairement utilisé, refaire la revue et le contrôle correspondant.

Inspecter/neutraliser les triggers et webhooks externes puis lancer `verification.sql` avec son garde explicite. Attendu : recette terminée et ROLLBACK. Claims SQL simulés, pas des JWT signés. En cas d’erreur, ROLLBACK explicite avant autre commande. Ce fichier couvre réciprocité, fiche doublée, e-mail Auth distinct du profil, non-vérifié, pagination, relation indépendante du carnet, retrait/déblocage, demandes croisées, retry, lien expiré, inscription tardive, neutralité du corps, quota, accès direct et cascade.

Avec de **vraies sessions A/B/C et anon** via REST, vérifier ensuite :

- Toutes les tables `ephemer_social` sont inaccessibles ; pas de schéma exposé ajouté. Les helpers internes ne s’appellent pas. Anon et service role ne peuvent appeler les commandes sociales.
- A ne lit ni modifie les notifications de B. A ne peut créer une notification, changer son propriétaire ou sa référence ; il peut modifier seulement `lue` sur les siennes.
- B/C ne peuvent accepter/refuser/annuler une demande qui ne leur appartient pas. Retrait/blocage de UUID aléatoire ne donne aucun profil. Export propriétaire fermé, aucun secret ni résolution d’un destinataire envoyé.
- Une adresse de profil libre, un compte non vérifié ou anonyme ne créent pas de relation. La vérification par Auth fonctionne après vraie inscription/reconnexion. Changement d’adresse vérifiée ne casse pas une relation existante.
- Une demande inconnue apparaît seulement pour le titulaire Auth vérifié, pas pour un autre compte ayant saisi cette adresse dans son profil. Une demande expirée n’est pas liée après inscription. Refuser et annuler retirent la notification ; expiration ne permet plus d’accepter.
- Un lien révoqué/expiré ne permet plus de demander. Un lien valide ouvre seulement une entrée générique et nécessite un clic. Un compte bloqué ne peut accéder à une nouvelle identité ; déblocage ne restaure ni relation ni demande ancienne.

Comparer les réponses pour adresses inscrite, inconnue et bloquée : corps/status de demande identiques tant que format et quota sont valides. Inspecter aussi lecture des demandes envoyées, erreurs et durées ; aucune identité ni état de blocage révélé. La neutralité du corps ne garantit pas à elle seule l’absence d’énumération temporelle. Fixer une limitation de débit globale et vérifier le coût du verrou commun avant ouverture publique.

## Concurrence réelle — deux sessions indépendantes

Les essais dans une seule transaction ne sont pas une preuve de concurrence.

| Essai simultané | Résultat à exiger |
|---|---|
| Reconnaissance A et B avec carnets réciproques | une relation et une notification par compte |
| Même demande / UUID, réponse du premier POST perdue | une demande, un quota consommé, même résultat |
| Même UUID, commandes différentes | une acceptée, l’autre refusée, aucun effet additionnel |
| A demande B et B demande A, puis acceptation parallèle | une relation ; relecture cohérente après conflit |
| Acceptation et retrait/blocage simultanés | ordre transactionnel cohérent, aucune activation traversant un blocage |
| 21 nouvelles demandes simultanées du même compte | au plus 20 enregistrées pour le jour Paris, une erreur de quota |
| Création de lien et retry simultanés | un lien ; aucun secret reconstitué ou seconde création involontaire |

Après retrait, rejouer un ancien UUID d’acceptation : résultat ancien possible, mais relation toujours retirée. Puis nouvelle demande acceptée : activation volontaire, une seule relation, pas d’anciennes notifications. Après blocage puis déblocage, vérifier qu’un nouveau UUID de demande fonctionne même s’il existait une demande neutralisée. Faire aussi demandes par contact, par lien et par adresse.

## Interface et données personnelles

Recette à 320 px et sur desktop, thèmes clair/sombre : pas de débordement, onglets accessibles, commandes au clavier, focus et confirmations, dates d’expiration lisibles. Tester vide/chargement/erreur et perte de réseau. Une attente ou annulation ne doit pas afficher un faux succès.

Grands carnets de plus de 100 contacts : reconnaissance et associations épuisent les pages, sans omission ou doublon. Plusieurs fiches pour une étoile restent privées ; proposer l’ajout manuel si aucune fiche, sans insertion ni duplication automatique.

Déconnexion/changement de compte pendant lecture, saisie, acceptation ou création de lien : aucune donnée, réponse ou secret de A affiché sous B. Vérifier scopes d’annulation et invalidation des drafts. Inspecter stockage navigateur et service worker : aucune donnée sociale persistée. Hors ligne, commandes désactivées ; aucune réactivation basée sur cache.

Exporter avec le format 8 : relations et retraits propres, demandes autorisées, blocages propres, associations, notifications et statuts de liens. Aucun hash, token ou journal d’opération. Toutes les pages sont incluses, changement de session ou erreur intermédiaire empêche le téléchargement. Supprimer un compte fictif par la route réelle : données sociales/notifications/associations supprimées des deux côtés, historique de carnet de l’autre préservé.

## Avant de dire « livré »

Lint, TypeScript, tests pertinents et build passent ; catalogue réel conforme ; vraie authentification et permissions recettées ; parcours mobile/desktop vérifiés ; export/suppression et notice actualisés. Décision de conservation et purge appliquée avant ouverture publique. Toute recette reportée doit rester écrite comme reportée.

Pour 10B/10C, ajouter ensuite les tests d’accès ami/ancien ami/non-ami, retrait de champ, double accord retiré juste avant génération, absence d’envoi de coordonnées/dates exactes et absence d’écrasement du carnet. Aucun de ces tests n’est revendiqué pour 10A.
