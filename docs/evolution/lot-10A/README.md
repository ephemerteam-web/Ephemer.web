# Ephemer — 10A, ouverture sociale

**État au 9 octobre 2026 : schéma installé humainement et intégration applicative disponible localement, gratuitement.** Catalogue complet confirmé sur ephemer-app : `lot10a_catalogue_conforme`, types réels régénérés. `npm run verify` réussi : **260 tests**, TypeScript/build, 0 erreur lint et 11 avertissements préexistants. Recette navigateur à 320/1280 px sur données fictives. Les vrais JWT, la concurrence PostgreSQL et les cascades de suppression sur copie autorisée restent reportés ; aucune mutation distante exécutée par l’assistant. Le [cadrage utilisateur](../OUVERTURE-SOCIALE.md) fixe ensuite 10B Univers et 10C Cadeaux avec double accord.

## Ce qui est prêt à relire

| Fichier | Rôle |
|---|---|
| [schema-propose.sql](schema-propose.sql) | Relations, demandes, liens, blocages, associations au carnet, quota, idempotence, notifications et export |
| [verification-lecture-seule.sql](verification-lecture-seule.sql) | Contrôle des objets, droits, RLS et empreintes des fonctions après installation humaine |
| [verification.sql](verification.sql) | Recette avec comptes fictifs sur copie isolée autorisée, terminée par ROLLBACK |
| [retour-arriere.sql](retour-arriere.sql) | Désinstallation avant toute donnée sociale ; refus dès qu’une table contient une ligne |
| [CONTRAT-APPLICATION.md](CONTRAT-APPLICATION.md) | Routes et interface à intégrer après confirmation du schéma |
| [RECETTE-APPLICATION.md](RECETTE-APPLICATION.md) | JWT réels, concurrence, mobile, confidentialité et critères de livraison |

Les routes `/api/etoiles` et ses consultations/reconnaissance/associations/export utilisent le JWT vérifié de l’appelant, un client par requête et aucune clé administrateur. Le validateur [etoiles-contract.ts](../../../lib/etoiles-contract.ts) ferme entrées et projections ; bigint conservés en texte et réponses privées bornées. Les types Supabase sont régénérés depuis le schéma installé.

`/dashboard/etoiles` propose relations, demandes reçues/envoyées, associations privées, blocages et liens révocables. La navigation et les fiches contacts y donnent accès. Une étoile sans fiche peut choisir un contact ou préparer un brouillon avec son prénom ; l’enregistrement et l’association restent volontaires. `/etoile#<secret>` retire le fragment et exige connexion vérifiée puis clic explicite. Le secret est remis une fois, sans stockage persistant ni récupération.

État commun au compte, reconnaissance sur toutes les pages de 100, relecture après action/retour de fenêtre et toutes les 60 secondes visibles, annulation des réponses dépassées et nettoyage au changement de compte. Une tentative conserve son UUID pour la reprise. Notifications des deux sources réunies, clés `(source,id)`, marquage propriétaire et suppression explicitement limitée aux rappels. Export **version 8** et notice actualisés.

## Constat vérifié dans le projet actuel

Lecture de métadonnées uniquement sur **ephemer-app**, le 9 octobre : PostgreSQL 17.6, `pgcrypto` dans `extensions`, contacts propriétaires et profils présents. Le premier contrôle précédait l’installation ; après confirmation humaine, le contrôle complet confirme le schéma social, les sources de fonctions, droits, RLS et contraintes. Aucun carnet, compte utilisateur ou secret consulté.

L’ancienne `est_contact_lie` cherche une adresse dans le carnet d’un autre compte ; elle ne vérifie pas les deux carnets. Le nouveau mécanisme applique bien la réciprocité demandée. La proposition retire les droits ordinaires sur l’ancienne fonction, conservée pour inspection ; aucun appel applicatif actuel trouvé.

Les notifications de rappel imposent une référence à un contact ou une occurrence. La table distincte `notifications_etoiles` conserve ce contrat ; ses notifications sont maintenant réunies avec les rappels dans la cloche et le centre, sans droit de suppression sociale côté client.

## Choix de cette proposition

- Une paire triée d’identifiants Auth possède au plus une relation. Les adresses de connexion vérifiées servent à la première reconnaissance ; les e-mails libres du profil n’interviennent jamais.
- Une relation retirée reste enregistrée comme retirée. Le blocage est directionnel, mais interdit toute relation dans les deux sens. Débloquer ne restaure rien ; une demande fraîche acceptée est nécessaire.
- Les fiches correspondantes reçoivent une association privée. Changement d’e-mail ou suppression d’une fiche n’effacent pas l’amitié. Aucune note, date, préférence, événement ou rappel n’est modifié.
- Reconnaissance par pages de 100 contacts maximum ; réponses avec curseur bigint sous forme de texte. Les lectures sont paginées, jusqu’à 100 éléments par appel.
- Demandes par e-mail : même réponse pour adresse inscrite, inconnue ou bloquée, sans identité cible. Les demandes envoyées n’exposent ni compte résolu ni indicateur de blocage. Une inscription vérifiée ultérieure peut recevoir sa demande pendant 30 jours.
- Les demandes reçues affichent le prénom du demandeur : envoyer une demande signifie partager cette identité minimale. Les amis voient uniquement `profiles.prenom`, tronqué à 80 caractères, ou « Une étoile ». Les noms complets et coordonnées restent privés. Le pseudonyme éditable appartient à 10B. Les comptes bloqués n’exposent aucun profil à jour.
- 20 nouvelles demandes par jour civil **Europe/Paris**, demandes sans compte incluses. Doublons en attente et reprise de la même opération n’en consomment pas une seconde. Aucun e-mail, push externe ou envoi automatique dans ce lot.
- Liens valables 7 jours, révocables, cinq liens actifs maximum par compte. Secret aléatoire de 32 octets, empreinte SHA-256 stockée. Le visiteur authentifié demande une relation au créateur ; ouvrir le lien n’accepte rien.
- Le secret d’un lien est remis **une seule fois**, sans conservation claire ni chiffrée. Une reprise de création renvoie le même identifiant, sans secret. Après perte de réponse ou reconnexion, révoquer puis créer volontairement un autre lien. Cette limite doit être expliquée dans l’interface.
- Toute commande porte un UUID d’opération. Rejouer la même opération renvoie son résultat, sans réappliquer l’action ; la réutiliser avec une autre commande est refusée. Une réponse ancienne ne constitue pas une preuve de l’état actuel : toujours relire.
- Un verrou transactionnel commun sérialise les écritures sociales pour garantir une paire unique et les transitions. Adapté à une première version à trafic limité ; mesurer l’attente avant lancement. À plus grande échelle, prévoir des verrous par paire/compte avec ordre fixe et nouvelle recette de concurrence.
- Les tables sociales privées sont sans droits de lecture/écriture client et sans policies ouvrantes. Des fonctions étroites vérifient `auth.uid()` et l’adresse Auth vérifiée. Les notifications autorisent seulement la lecture propriétaire et la modification de `lue`. Aucun UUID de propriétaire fourni par le navigateur n’est utilisé.

Les dates d’expiration rendent demandes et liens inutilisables ; **elles ne suppriment pas automatiquement les lignes**. L’historique demeure jusqu’à suppression du compte, y compris le journal d’idempotence. Avant ouverture publique, arrêter une durée de conservation des demandes/adresses et un mécanisme de purge testé, sans perdre les traces de retrait/blocage pendant la vie du compte. La notice décrit les fonctions intégrées et ce chantier restant.

Les clés vers Auth portent `ON DELETE CASCADE`, confirmé au catalogue. L’export version 8 couvre les cinq projections sociales et notifications propriétaires, sans secret, empreinte, profil tiers ou résolution silencieuse de destinataire. La suppression complète reste à recetter avec un compte fictif autorisé sur copie ; aucune suppression réelle effectuée.

## Passage à l’intégration

1. Revue humaine du dossier et sauvegarde. Vérifier que `ephemer_social` n’est pas ajouté aux schémas exposés par l’API.
2. Sur copie isolée autorisée, appliquer la proposition et exécuter le contrôle puis la recette. Inspecter les triggers Auth/webhooks auparavant ; ROLLBACK ne retire pas un appel externe déjà parti.
3. Faire la recette REST/concurrence avec comptes fictifs. Le fichier SQL à claims simulés ne la remplace pas. En l’absence de copie, conserver explicitement ce report ; ne pas lancer la recette mutante sur le principal.
4. Après validation, application humaine sur la cible et confirmation du catalogue en lecture seule. Régénérer alors les types réels.
5. Intégration locale effectuée : `/dashboard/etoiles`, demandes depuis les contacts, pastilles, lien partagé, cloche, export, nettoyage par compte et notice. Recetter avec vraies sessions avant ouverture publique.
6. Livrer 10B : univers et partage explicite, sans copie du carnet ; puis 10C : double accord pour les suggestions cadeaux.

L’IA actuelle sait déjà utiliser des champs privés choisis pour un appel. 10C ajoutera une source différente avec autorisation de l’auteur **et** sélection par le demandeur, relues côté serveur. Ne pas assimiler ces deux accords. La fermeture de l’ancienne RPC de quota, déjà documentée dans l’audit, devra aussi être confirmée avant cette étape.

## Vérifications de cette préparation

Vingt-cinq tests spécifiques exécutent les validateurs, routes HTTP, transports et composants réels, avec Auth/RPC fictifs : entrées, neutralité, UUID/reprises, bigint/pagination, erreurs/conflits, état par compte, secret unique, création volontaire, sources de notifications et export. Ils ne prouvent ni droits JWT réels, ni concurrence SQL. Recette navigateur et limites dans [RECETTE-APPLICATION.md](RECETTE-APPLICATION.md), résultats globaux dans [SUIVI.md](../SUIVI.md).

Les fichiers SQL restent inchangés depuis la validation humaine. Leur contrôle de catalogue complet est conforme ; `verification.sql` et le retour arrière n’ont pas été exécutés. Faute de copie isolée, recette mutante et concurrency/JWT réels explicitement reportés. Aucun commit, dépendance, migration, déploiement, envoi ou modification distante par l’assistant.
