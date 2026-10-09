# Recette 10B — preuves et tests restants

## Intégration après installation humaine, le 9 octobre 2026

- Installation confirmée par l'utilisateur, puis contrôle combiné distant en READ ONLY : **`lot10b_catalogue_conforme`**. Types régénérés depuis le schéma réel. Aucun contenu personnel lu ou modification distante par l'assistant.
- Page/navigation Mon univers, routes JWT par requête, consultation depuis chaque étoile et contact associé, avatar valide enregistré distinct du repli, export **9** propriétaire et confidentialité intégrés. Aucune modification automatique du carnet, aucun usage IA.
- Dix tests supplémentaires d'intégration : HTTP/auth/origine/entrées fermées et volumes, contrats propriétaire/partagé, RPC avec JWT utilisateur et clients distincts, changement de compte/annulation/hors ligne, export complet ou refus, revalidation/effacement des panneaux, réponse périmée et source d'avatar absente/invalide. Auth, RPC et réponses réseau simulés ; aucune preuve de vrais JWT ou de concurrence PostgreSQL.
- **`npm run verify` final réussi : 288 tests, TypeScript et build**, zéro erreur lint et onze avertissements préexistants. `git diff --check` et contrôle local des empreintes réussis. Build : `/dashboard/univers`, `/api/univers` et `/api/univers/etoile` présents ; aucune lecture de compte réel dans les tests.
- Navigateur réel : vrais `UniversScreen`, formulaire, panneaux d'étoile/contact, CSS et adaptateur navigateur ; Auth et réponses HTTP fictives en mémoire, réseau externe interdit. **320×900 et 1280×900**, client/scroll 305/305 et 1265/1265, sans débordement horizontal, sombre/clair.
- Enregistrement par Entrée, identité pseudonyme, avatar partagé, normalisation de l'email, 29/02 avec année 2000 gardée privée et coordonnées masquées. Consultation depuis étoile sans fiche et contact : identité sociale Polaris distincte du nom privé Camille, aucun texte privé ni année dans la projection affichée. Perte d'association retire seulement le bloc contact ; retrait/hors ligne retire les deux panneaux. Ouverture au clavier, masquage confirmé/annulé avec Échap et focus restitué, valeurs conservées, changement de compte sans ancien contenu attestés.
- Captures `out/univers-preview/integration-mobile.png`, `integration-desktop.png`, `integration-proprietaire-desktop.png`. L'aperçu n'exécute pas les routes serveur réelles ni les RPC distantes. Serveur et onglet arrêtés, dimensions du navigateur rétablies. Aucun commit/déploiement/dépendance/envoi externe.

## Préparation effectuée avant installation, le 9 octobre 2026

- Métadonnées distantes seulement, transactions READ ONLY : contrôle complet 10A conforme, deux tables 10B absentes, fonction d’identité et validateur d’avatar installés inspectés. Aucun contenu personnel, secret ou mutation distant.
- Dix-huit tests nouveaux : contrats TypeScript réels (dates, permissions, Unicode/volumes, projection sans année, avatar valide, React échappé), formulaire réel avec service fictif (saisie, reprise UUID, réponse perdue, doubles clics, masquage sans effacer, conflit/relecture, fermeture/hors ligne) et dossier/empreintes/retour arrière. Ces tests ne compilent pas PL/pgSQL et ne prouvent aucune RLS.
- **`npm run verify` final après correction de focus : 278 tests réussis**, TypeScript/build, lint zéro erreur et onze avertissements préexistants. Le déclencheur reste focalisable avec aria-disabled et verrou pendant le dialogue ; retour du focus au bouton attesté après confirmation et annulation. `git diff --check` réussi, catalogue/empreintes cohérents. Aucun moteur PostgreSQL/Docker local disponible ; le SQL proposé reste non compilé/non exécuté.
- Navigateur IAB réel, vrais composants/CSS, données fictives en mémoire, réseau externe interdit : 320×900 et 1280×900, sombre/clair. À 320, document client/scroll 305/305 px ; dialogue 304 px. À 1280, client/scroll 1265/1265 px. Aucun débordement horizontal.
- Prénom/pseudonyme, texte `<script>` littéral, goûts, 29/02/2000 gardé personnel avec aperçu 29/02 seul, avatar enregistré partagé puis rendu modifié depuis la source fictive. Sauvegarde par Entrée, panne et saisie conservée/reprise, réponse perdue reconnue, masquage confirmé/annulé par Échap, focus restitué au bouton dans les deux cas, champs privés conservés. Hors ligne : boutons désactivés ; passage au compte B : formulaire/permissions/aperçu A absents.
- Captures : `out/univers-preview/recette-mobile.png`, `recette-desktop.png`, `recette-clair.png`. Aperçu `node tests/univers-preview.mjs`, lancement hors sandbox autorisé pour accès IAB. Serveur et onglets arrêtés, dimensions du navigateur rétablies. Données fictives uniquement ; aucune page applicative active, sauvegarde Supabase réelle ou permission distante testée.

## Après installation humaine, sur copie isolée autorisée

Le contrôle combiné `lot10b_catalogue_conforme` a passé sur le schéma installé. La recette mutante SQL demande le réglage de garde `ephemer.lot10b_test_isole=CONFIRME_COPIE_ISOLEE_10B` dans la même session, reste terminée par ROLLBACK et crée seulement des fixtures `example.invalid`. Neutraliser les triggers/webhooks externes avant les fixtures. Elle couvre défaut sans auto-insertion, propriété et helpers fermés, pseudonyme, champs/année masqués, idempotence/conflit/injection d’UUID, dates impossibles, avatar actuel/supprimé, masquage sans effacement, non-ami/retrait/blocage/anon et cascade Auth. **Non exécutée** faute de copie isolée autorisée ; le schéma principal est désormais installé.

## JWT signés et REST

Sur la copie, créer A/B/C avec adresses vérifiées et un compte non vérifié/anonyme ; employer leurs vrais JWT et une requête anon. Ne jamais imprimer les tokens. A/B amis actifs, C non ami, une demande non acceptée et une relation retirée. Tester directement les trois RPC ainsi que les routes applicatives après branchement :

1. A lit/modifie seulement son univers ; B ne reçoit que les champs activés, C/demande en attente/ancien ami/compte bloqué sont refusés. Appels directs aux tables et helpers refusés. Vérifier les deux directions de blocage et les sessions d’un compte supprimé.
2. Année invisible absente du JSON, pas simplement masquée par CSS. Les coordonnées masquées, textes privés et nom complet du profil sont également absents ; réponse d’adresse 10A toujours neutre.
3. Modifier l’avatar enregistré de A : B voit le nouveau rendu au prochain chargement autorisé ; les essais/annulations n’ont aucun effet. Retirer le partage ou l’avatar supprime le champ. Avatar personnel et cartes publiées restent indépendants.
4. Retirer une permission/relation, puis relancer une consultation : refus ou nouvelle projection. La vue ouverte se vide à la revalidation ; hors ligne, masquage de page ou compte changé, elle retire immédiatement le contenu tiers. Ancienne réponse lente ignorée.
5. Sauvegarde/masquage avec réponse volontairement perdue : relecture et reprise du même UUID, aucune deuxième révision. Rejouer une ancienne opération après une nouvelle modification : relire l’état courant, aucun retour à l’ancien partage.
6. Export **9** : toutes les données habituelles et l’univers propriétaire enregistré, aucun univers tiers/journal/secret ; panne intermédiaire ou changement de compte interdit le téléchargement.
7. Supprimer un compte fixture : univers/opérations en cascade, relations/associations/notifications comme 10A. Ne jamais supprimer un compte réel pour la recette.

## Concurrence PostgreSQL et interface intégrée

Deux sessions réelles : enregistrements avec même révision/différents UUID (un gagnant, un conflit), même UUID simultané (une seule écriture), masquage contre sauvegarde (révision protège, perdant conserve saisie), retrait/blocage pendant une consultation. Une lecture commencée avant validation du retrait peut finir avec son instantané ; les consultations commencées après validation ne doivent rien révéler. Mesurer attente du verrou commun et charge des lectures à 60 secondes ; aucun appel fournisseur ou réseau dans la transaction.

Recetter aussi les panneaux depuis étoiles avec/sans fiche, deux fiches associées à une étoile, perte d’association, suppression de contact sans retrait d’amitié et absence de modification des notes/événements/rappels. À 320/390/1280 px, clavier seul et clair/sombre : aperçu sous/à côté du formulaire, cases/labels accessibles, confirmations/focus, relecture après conflit, garde de brouillon/navigation et noms très longs. La recette actuelle autonome ne couvre pas ces écrans non encore branchés.

Tous les essais JWT signés, concurrence, cascades distantes et reconnexion réelle restent **reportés**. Maintenir la conservation/purge, débit global et coût du verrou comme conditions avant ouverture publique. Aucun commit ni déploiement.
