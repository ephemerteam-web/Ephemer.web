# Recette réelle Célébrations — 17 octobre 2026

**Parcours fonctionnels ci-dessous validés ; GO général non donné, courses réelles restantes.** Les deux comptes pilotes ont été connectés manuellement par l’utilisateur dans le navigateur intégré. Les observations ci-dessous proviennent de l’application locale reliée à la base actuelle, sans injection de données par SQL, sans compte créé/supprimé par l’assistant et sans fournisseur externe.

A désigne le premier compte organisateur ; B, l’Étoile « Alexandre » ajoutée et identifiée par l’utilisateur. Les deux identités affichées portent le même prénom. Aucun identifiant de connexion ou jeton n’est conservé dans ce document. Les sessions sont successives dans un même contexte de navigateur : **aucune concurrence entre deux comptes n’est prouvée par ces essais**.

## Objets dédiés

| Objet | Identifiant de recette | État observé |
|---|---|---|
| RECETTE CÉLÉBRATIONS · Validation du 17 octobre | `0318f6a6-67c9-47cf-9020-74d7b02b7343` | Transfert accepté : B organisateur et destinataire ordinaire. A retiré explicitement, lecture ensuite refusée. |
| RECETTE CÉLÉBRATIONS · Surprise de contrôle | `ee1afefb-52ca-41ec-8b31-33f98e5bfa0f` | Surprise destinée à B, inaccessible à B. |
| RECETTE CÉLÉBRATIONS · Copie de la préparation | `16f84138-fc2e-4311-87a8-995cee004c41` | Supprimée après confirmation ponctuelle de l’utilisateur ; source privée relue et conservée. |
| RECETTE CÉLÉBRATIONS · Invitations refusées | `fa7a97b1-227b-4519-b788-5cba1e00f6a9` | A organisateur seul. Première invitation révoquée, nouvelle invitation ensuite refusée par B. |

La préparation privée de l’événement de test préexistant « Le test collectif » a reçu une seule tâche nommée `RECETTE · Source privée à conserver`, ensuite modifiée en `RECETTE · Source privée modifiée après publication` et marquée faite. La date de l’événement n’a pas été modifiée.

La trace de publication de cette préparation est conservée après suppression, selon le contrat B. Ce scénario ne doit pas être réutilisé pour tenter de recréer le même partage supprimé.

## Contrôles déjà réussis

| Contrôle réel | Preuve observée |
|---|---|
| Catalogue corrigé | `celebrations_production_catalogue_conforme`, confirmé par l’utilisateur puis réexécuté indépendamment en READ ONLY. |
| API sans session | Les quatre routes de lecture Célébrations renvoient 401 ; `no-store` sous le serveur de développement. Aucun contenu privé. |
| Création libre | Création personnelle sans date, « Date à choisir », titre de recette visible après relecture. |
| Tâche facultative | Ajout sans responsable/échéance, passage à faite sans attribution implicite. Défaut du formulaire corrigé et couvert pour organisateur/auteur participant. |
| Passage à plusieurs | Confirmation explicite sur la même célébration ; aucune invitation avant choix volontaire de l’Étoile. |
| Invitation | B reçoit seulement titre/date/émetteur/expiration ; aucun préparatif avant acceptation. |
| Révocation et nouvelle invitation | Sur la création dédiée, première invitation révoquée par A, retirée de sa liste d’attente ; nouvelle invitation explicite ensuite enregistrée, sans collision d’identifiant. |
| Refus personnel | B refuse cette nouvelle invitation ; sa carte disparaît et il n’intègre pas les participants. Aucun rejeu d’ancienne requête signée n’a été effectué. |
| Accès direct en attente | Détail de la célébration refusé à B avant acceptation : message uniforme, aucun contenu ancien. |
| Surprise | Absente de la liste et des invitations de B ; URL directe refusée sans titre ni contenu. |
| Acceptation personnelle | B accepte avec sa session et devient participant ; préparatifs ensuite lisibles. |
| Droits de commentaire | B ajoute et modifie son propre commentaire ; celui d’A n’offre pas d’édition à B. A retrouve une commande de retrait, sans édition du texte de B. Les commandes malveillantes directes ne sont pas certifiées par la seule absence de bouton. |
| Tâche participant | B crée sa propre tâche ; aucune attribution à autrui proposée dans son formulaire. |
| Export personnel B | Export réel version 12 téléchargé via Données et diagnostic, puis contrôle limité à la collection Célébrations : une participation personnelle, la tâche de B, le commentaire actuel de B ; aucun contenu d’A, invitation, transfert, historique de groupe ou surprise destinée à B. Le fichier personnel reste dans Téléchargements, hors archive de code. |
| Demande privée | B dépose un motif de recette, retrouve sa demande en attente ; A autorisé voit le motif puis refuse. La célébration et ses préparatifs restent disponibles après refus. |
| Destinataire ordinaire | A désigne B avec revue explicite des accès, puis ajoute une tâche cadeau réservée aux autres. Après transfert, B organisateur ne voit ni cette tâche ni les types cadeau/message dans sa création de tâche. |
| Transfert accepté | A propose, reste organisateur pendant l’attente. B accepte dans sa propre session ; B devient organisateur, A participant. |
| Retrait et ex-membre | B retire A de la création dédiée. A reconnecté ne peut plus lire le détail par URL directe ; aucun ancien titre, tâche ou commentaire réaffiché. |
| Publication depuis privé | A sélectionne uniquement sa tâche de recette, vérifie l’aperçu et confirme. Date source canonique `2026-10-22`, date de célébration distincte `2026-10-24`. |
| Indépendance de la copie | Après publication, titre et progression privés modifiés ; la copie conserve l’ancien titre et l’état à faire. |
| Suppression et source conservée | Après accord ponctuel explicite de l’utilisateur, seule la copie partagée est supprimée ; ses préparatifs deviennent indisponibles. Rechargement de la source : titre privé modifié, état fait et date du 22/10 intacts. |
| Tailles, thèmes et clavier | Page réelle de la célébration d’invitations à 320/390/1440 px, clair/sombre : aucun débordement horizontal. End/Home passent entre Frais et Organisation ; thème clair et taille initiale restaurés ensuite. Six captures dans `out/celebrations-production/`. |

Une tentative de tâche a reçu 401 puis l’écran de connexion avant la reconnexion manuelle d’A ; aucun succès annoncé sur cette tentative. La même opération fonctionnelle a ensuite réussi après reconnexion. La cause initiale de déconnexion n’est pas attribuée sans preuve à un défaut SQL.

## Contrôles restants

- Rejouer réellement les mêmes commandes signées après réponse perdue et après retrait ; les simulations locales et les contrôles d’URL ne prouvent pas ces rejeux réseau réels.
- Courses entre deux sessions indépendantes : acceptation/révocation, transfert/départ, création de tâche rejouée et suppression concurrente. Aucun chevauchement observé ici.
- Blocage uniquement après certitude d’absence d’autres célébrations communes affectées. Aucun blocage effectué à ce stade ; ne pas considérer le déblocage comme une restauration d’amitié ou de participation.
- Aucun compte réel supprimé, aucune invalidation volontaire d’Auth. Les limites sur l’effacement, le destinataire devenu invalide, les quotas maximaux et les appareils physiques restent explicites.

La recette ne remplace pas le dossier [GO-PRODUCTION.md](GO-PRODUCTION.md). Le module est ouvert en développement seulement ; un build de production reste fermé jusqu’à décision fondée sur les résultats réels restants.
