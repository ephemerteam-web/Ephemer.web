# Célébrations — conception et livraison progressive

13 octobre 2026. Ce dossier applique la demande dans `docs/PROPOSITION-CELEBRATIONS-ENSEMBLE.md`, sans modifier cette proposition déjà éditée par l’utilisateur. Ce n’est pas une attestation d’installation ou de recette distante.

## Situation et quatre tranches

| Tranche | Préparation locale | Condition d’activation |
|---|---|---|
| A — parcours personnel | Liste à venir/historique, écran Organisation / Idées et cadeaux / Frais, modèles prévisualisés, ajout d’idée par titre ou lien, synthèse par célébration. Reprise des occurrences et protections privées existantes. | Contrats privés installés ; vérifier les droits d’écriture effectifs. Les créations libres sans date exigent B et restent absentes de A. |
| B — invitations et organisation partagée | Correctif humain et catalogue corrigé conformes au 17/10 ; module ouvert en développement, parcours fonctionnels réels contrôlés. | Courses et rejeux réseau avec deux sessions indépendantes restant avant le GO général ; voir GO-PRODUCTION.md. |
| C — propositions, soutiens, sondages, envies et réservations | Conception uniquement, sans DDL dans le dossier B. | B puis dossier SQL et procédures propres, fixtures multi-comptes et courses réelles sur copie. |
| D — frais et remboursements | Politique proposée et règles de calcul décrites ; **aucun DDL financier avant validation de la conservation**. | Approbation de la politique, dossier SQL financier, contrôles exacts et confirmation par le receveur. |

Au premier contrôle du 13/10, catalogue du projet `ephemer-app` lu seulement : tables privées, RLS et procédures des lots 04/05 présentes, pas de schéma B à cet instant. Depuis, l’utilisateur a installé B : nouveau catalogue READ ONLY conforme et 25 corps de fonctions identiques au dossier, types publics régénérés. Le protocole B a été remplacé le 17/10, sur demande utilisateur, par un correctif humain et une recette pilote sans copie ; voir [GO-PRODUCTION.md](GO-PRODUCTION.md). Les recettes de copie existantes restent protégées et non exécutées. Aucun contenu personnel lu et aucune écriture distante par l’assistant.

**Permissions privées confirmées :** le premier diagnostic examinait seulement les droits de table et omettait les droits de colonne. INSERT/UPDATE sur les colonnes nécessaires, SELECT et RLS des cinq tables privées sont confirmés par contrôle du catalogue et par le résultat communiqué par l’utilisateur. Aucun nouveau GRANT n’est nécessaire. Ce contrôle ne remplace pas une recette de persistance avec de vrais comptes ; les tests locaux utilisent des services fictifs.

## Écarts explicites avec MODELE-METIER

Ce dossier remplace, pour les lots 11/12 de cette demande, l’accès par cercle/constellation par **une adhésion à une célébration**. Aucun groupe permanent, écran Cercles ou administration parallèle. Les étoiles sociales restent les relations acceptées ; une étoile de soutien appartient seulement à une proposition. Ajouts au modèle initial : souhaits partagés à des membres nommément consentis d’une célébration ; soutiens révisables ; consultations sans gagnant automatique ; demandes de suppression privées ; frais partagés facultatifs ; conservation limitée des soldes sans archive du contenu supprimé. Les cartes collectives sont reportées. Mon profil prime sur l’ancien Univers selon le contrat actuel.

## Navigation et parcours mobile

Les quatre espaces ne changent pas. `/dashboard/preparations` devient « Mes célébrations ». À venir puis historique en A ; à venir puis archivées explicitement en B, et invitations en attente dans une section séparée. Filtres Tous / Seul / À plusieurs : le dernier reste indisponible tant que B n’est pas validé ; aucune fausse liste vide collaborative. Inspirations, Historique, Mes envies et synthèse personnelle sont secondaires (Mes envies seulement avec C).

« Organiser une célébration » : en A, sélectionner une occurrence personnelle déjà enregistrée, ou rejoindre Dates pour créer une date. En B, création directe titre obligatoire, seul/à plusieurs, date/heure/lieu facultatifs. Sans date : « Date à choisir », pas de J−, occurrence fictive ou rappel. Si une occurrence est liée, sa date canonique reste lisible et immuable depuis cette célébration ; date de fête distincte nullable. Aucun changement implicite de naissance. Un cycle annuel garde son historique et ne reconduit aucune tâche.

Écran compact : titre, date canonique/date de fête, lieu/heure, participants acceptés ; trois onglets Organisation, Idées et cadeaux, Frais. Les panneaux restent montés pour conserver la saisie ; les contrôles du panneau masqué sortent du clavier. Flèches, Début/Fin et focus visible pour les onglets. Budget facultatif fermé au départ. Modèles Anniversaire/Réveillon/Repas : aperçu avant clic d’ajout, UUID stable par tâche, reprise des seules tâches non confirmées après panne ; jamais ajout automatique.

Ajout rapide : titre ou URL http(s), libellé neutre « Idée à découvrir » pour lien seul ; estimation/devise/commentaire facultatifs dans une rubrique repliée. Aucun scraping. A conserve les inspirations privées ; B/C proposent directement sans créer d’inspiration préalable. Afficher provenance (proposition personnelle, inspiration sélectionnée, envie autorisée, suggestion). Quatre propositions initiales, puis « Voir toutes les propositions ». Une suggestion IA exige un clic et les gardes actuelles ; aucune génération à l’ouverture.

## Matrice des droits

Toutes les autorisations sont réévaluées **à chaque requête**, dans la base et le serveur ; UUID opaque ou bouton caché ne suffit pas. Exclusion destinataire surprise prioritaire sur tout rôle. Pour une célébration ordinaire, son destinataire peut lire Organisation mais pas le compartiment Cadeaux (propositions, coûts cadeaux, soutiens, sondages cadeaux, réservations). Ne pas lui montrer de compteurs indiquant ce compartiment.

| Ressource/action | Organisateur accepté autorisé | Participant accepté autorisé | Invité en attente non expiré | Ex-membre / autre / destinataire surprise |
|---|---|---|---|---|
| Présentation et Organisation | Lire/modifier | Lire | Présentation minimale seulement | Refus générique |
| Inviter, révoquer, retirer, annuler, archiver | Oui | Non ; quitter pour soi | Refuser pour soi | Refus |
| Accepter invitation | Pour soi seulement | Pour soi seulement | Pour soi seulement | Refus |
| Tâches | Créer/attribuer à un membre accepté | Créer pour soi, modifier ses tâches autorisées | Non | Refus |
| Commentaires | Ajouter, modérer en retirant | Ajouter, éditer/retirer son texte | Non | Refus |
| Cadeaux/soutiens/votes | Si non destinataire et droits sur l’envie | Même condition ; soutien/vote pour soi | Non | Refus |
| Ouvrir/clore/décider sondage | Oui, jamais voter pour autrui | Non | Non | Refus |
| Supprimer célébration | Oui avec confirmation | Non | Non | Refus |
| Demander suppression | Possible ; suppression directe proposée | Une demande privée en attente | Depuis présentation minimale | Refus |
| Motif/statut demande | Organisateur autorisé ; réponse | Seulement sa demande/réponse | Seulement sa demande/réponse | Refus |
| Frais partagés activés | Voir, saisir ses dépenses ; correction tracée | Voir, saisir ses dépenses | Non | Refus ; pas d’archive après départ |
| Confirmer remboursement | Receveur uniquement | Receveur uniquement | Non | Hors accès groupe : mécanisme résiduel à valider |
| Carnet / note / budget privé / goûts non consentis | Aucun droit nouveau | Aucun droit nouveau | Aucun | Aucun |

Lecture des envies : toujours droit **personnel actuel** au partage de cette liste. L’accès à la célébration seul ne suffit pas. Auteur d’envie exclu des réservations et de toute projection cadeau secrète, même administrateur. Autorisation du lecteur intersectée avec compartiment cadeau et partage actuel, avant lecture de champs/résultats. Aucun téléchargement collectif ne contourne cette intersection.

## Invitations, relation et cycle de vie

Proposition anti-abus à valider : 30 participants acceptés maximum, 20 invitations actives, 10 invitations nouvelles par organisateur/célébration/24h ; expiration sept jours contrôlée à lecture/acceptation, aucun cron. Pas d’annuaire ni lookup email. Invitation à un compte Étoiles accepté ; relation revérifiée au moment d’émettre/accepter. UUID stable de commande et empreinte : même UUID/même charge retrouve son résultat seulement si le droit est encore valable ; même UUID/autre charge refusé. Verrou de célébration sérialise acceptation/révocation/clôture. L’organisateur ne répond jamais pour l’invité. Une réinvitation crée une nouvelle génération de participation, sans restaurer tâches, votes, soutiens ou réservations.

Retirer l’amitié ne retire pas une participation déjà acceptée. Politique B retenue : la personne qui bloque quitte le partage ; débloquer ne restaure aucune participation. Si elle est le dernier organisateur, les préparatifs sont suspendus et seuls une clôture ou un transfert accepté peuvent résoudre la situation. Le dossier B propose l’intégration transactionnelle au blocage social sous un verrou commun ; elle n’est pas installée.

Créateur = organisateur initial. Transfert proposé puis accepté par un membre autorisé ; rôle actuel gardé jusqu’à confirmation atomique. Dernier organisateur : transfert accepté ou clôture explicite. Effacement du compte : participations retirées et célébration annulée si aucun organisateur autorisé ne reste ; surprise suspendue si son destinataire perd son compte. Aucun organisateur nommé d’office. Courses départ/transfert/suppression sous même verrou.

Publication B depuis privé = sélection + aperçu figé + confirmation. Copie présentation choisie et titres/types des tâches sélectionnées ; date canonique de la source conservée séparément de la date de fête. Une source modifiée depuis l’aperçu provoque un conflit. Aucun brouillon, note, coordonnées, budget, goûts ou historique copié ; les idées partagées attendent C. Référence technique privée, unicité propriétaire/source et absence de propagation des éditions ultérieures. Changement de mode/destinataire : confirmation de revue obligatoire et révocations atomiques des accès incompatibles, sans retirer des mémoires un contenu déjà vu. Surprise sans identité fiable conservée personnelle ; perte du compte destinataire suspend son partage. Aucun rapprochement par email.

États : active, annulée, archivée, supprimée, suspendue. Annuler conserve l’historique autorisé mais ferme nouvelles actions/réservations/consultations ; archiver rend l’historique consultable aux membres actuels ; supprimer révoque tout contenu partagé, invitations et consultations à la prochaine requête. A ne renomme pas « abandonnée » en suppression ni n’offre une suppression commune via DELETE privé.

Demandes : motif facultatif (500 caractères), une en attente par compte/célébration, plafond proposé 3 nouvelles demandes/30 jours ; statuts En attente/Acceptée/Refusée. Accepter = même confirmation et transaction que suppression directe ; refuser laisse l’espace inchangé. Verrou commun empêche plusieurs suppressions. Demande fermée à suppression sans révéler un autre motif ; notification uniquement aux organisateurs autorisés et réponse au seul demandeur encore autorisé. Demande d’ex-membre/expiration/révocation refusée même depuis ancien écran.

## Modèle proposé et frontières

Le dossier B propose le schéma interne `ephemer_celebrations`, sans accès direct aux tables. Six procédures publiques contrôlées assurent les lectures, commandes et l’effacement propre du compte. Contrats TypeScript isolés et module désactivé tant que l’installation humaine et les recettes ne sont pas confirmées. Aucune table privée renommée, aucun type généré anticipant une installation. Les objets C ci-dessous restent conceptuels et ne figurent pas dans le SQL B.

| Objet nouveau | Contenu minimal / invariants |
|---|---|
| Célébration | Titre, créateur, date de fête nullable, occurrence privée source nullable, état/révision, surprise, destinataire validé. Lien source privé du seul auteur ; seule projection sélectionnée lisible. |
| Participation | Célébration/compte/génération, rôle organisateur/participant, état accepté/retiré ; unicité membre courant. |
| Invitation / transfert | Émetteur/destinataire, expiration, commande stable et état. Aucun secret anonyme de préparation. |
| Tâche / commentaire / action | Responsable accepté, auteur et révision ; historique action/id/date sans texte ni montant. Pas d’usurpation auteur. |
| Demande de suppression | Demandeur, motif privé, statut/révision ; index partiel une attente ; décision autorisée. |
| Proposition | Champs sélectionnés titre/lien/estimation nullable, origine opaque, révision ; destinataire exclu ; pas note source. Unicité origine par célébration, pas déduplication de textes différents. |
| Soutien | Proposition/compte/génération/révision de proposition ; unicité, retirable. Compteur seulement des membres actuels et version courante. |
| Sondage / option / réponse | Type date/lieu/activité/cadeau, version, fermé/ouvert, limite nullable ; réponse d’un compte ; mode unique ou multiple selon type. Résultats agrégés, pas identité par défaut. |
| Liste/envie/partage | Propriétaire, quantité positive défaut 1, préférence, titre/lien/estimation ; lecteurs explicitement choisis ; pas d’adhésion automatique pour nouveau membre. |
| Réservation | Table séparée, envie/réservant/contexte/génération, quantité 1 ; état distinct réservation/achat déclaré/don déclaré/libérée. Non lisible au propriétaire. |
| Commande | Acteur/UUID/empreinte/résultat minimal ; autorisation avant retour d’un résultat ancien ; suppression des traces sensibles à révocation. |

Propriétaire modifie/retire toujours son envie. Une réservation n’écrit pas updated_at de l’envie ou liste, et n’affecte pas son export, erreurs, compteur ou notification. Verrou de ligne envie **global à tous contextes** pour disponibilité puis insertion ; dernière unité = un succès. Prise en charge d’un cadeau lié = transaction tâche + réservation ; aucune tâche faussement réussie si indisponible. Achat déclaré ne constitue pas preuve marchande. Retrait/quantité/partage/départ/suppression libère atomiquement les réservations incompatibles ; une nouvelle adhésion ne les restaure pas. Les organisateurs autorisés voient l’avertissement « Une libération n’annule pas un achat réel ; vérifie avant de racheter ». Destinataire jamais informé.

Soutiens : étoile vide « Soutenir cette idée », remplie « Retirer mon soutien », aria-pressed et nombre de soutiens ; aucun cœur/notation/favori social. Tri soutiens décroissant puis date/UUID stable. Soutien n’achète ni ne réserve ni ne crée de dette. Changement titre/lien/prix : nouvelle révision, soutiens invalidés et renouvellement demandé ; supprimer/rejouer une commande ne restaure pas l’ancienne révision. « Cadeau retenu » confirmé par organisateur puis « Je m’en occupe » volontaire, et « Je participe aux frais » séparé.

Sondages : organisateur prépare puis ouvre. Date multiple, cadeau/lieu/activité unique par défaut. Verrou sondage puis réponse ; refus après limite serveur et après clôture ; égalité et absence de réponse affichées. Départ invalide réponse active. Options modifiées = nouvelle consultation/version avec votes à renouveler. Décision explicite, aucun gagnant automatique. Date de fête seule déplacée ; demander confirmation des conséquences sur échéances/rappels, sans déplacer anniversaire ou message programmé. Vote cadeau n’altère pas l’envie ni les réservations.

## Frais, exactitude et conservation à valider avant SQL D

Frais activés volontairement. Budget indicatif par devise, aucun paiement/cagnotte/banque/upload/relance externe. Centimes entiers (numeric entier ou bigint avec limites), pas de flottants ni conversion. Dépense titre/date/montant/devise/payeur, lignes de répartition sur personnes acceptées, cadeau facultatif unique. Égal : quotient entier puis centimes restants aux UUID triés ; par parts : quotient pondéré puis plus grands restes, égalité départagée UUID ; personnalisé : somme exacte obligatoire. Dépense cadeau unique, référence commune cadeau/frais, pas copie dans chaque budget individuel. Synthèse avance payée et part à charge séparées.

Soldes par devise = avances − parts + remboursements envoyés confirmés − reçus confirmés. Montant inconnu hors total, distinct de zéro. Propositions de transfert déterministes, sans promettre minimum global. Remboursement proposé/déclaré/confirmé/contesté/corrigé ; seul receveur confirme réception, jamais administrateur pour lui. Déclaration partielle possible ; seul confirmé réduit le solde. Ne modifie jamais total dépensé. Correction d’une écriture : contre-écriture/version, information aux personnes encore autorisées ; auteur/payeur modifie ses saisies, organisateur demande une correction plutôt que falsifier une dépense d’autrui.

Recette Alice/Bruno/Chloé : avances 90/30/0 EUR, parts 40/40/40 ; soldes +50/−10/−40. Bruno → Alice 10 et Chloé → Alice 40, confirmés par Alice : zéro chacun, dépenses toujours 120. Avant confirmation, soldes inchangés.

**Politique proposée, non approuvée :** à départ, garder chez les membres restants seulement écritures nécessaires et alias « Participant parti », sans coordonnées, commentaires, cadeaux ni identité exposée inutilement ; ne pas redistribuer les parts. Ex-membre sans archive de groupe. À suppression, isoler un registre résiduel sans titre/date/lieu de célébration, uniquement créances propres, devise, contrepartie pseudonyme et état ; pas de lecture des autres dettes ou préparatifs. Accessible aux seules parties encore habilitées, jamais au destinataire exclu. Effacement compte : retirer identité directe ; conserver montants contestés minimaux seulement selon base/durée décidées humainement. Durée, droit d’accès résiduel, moyens de contestation et effet de l’effacement restent à valider ; aucune durée légale inventée. Sans décision, **D bloqué, pas de tables financières proposées à installer**. Une dette n’est jamais effacée ou dite réglée pour faciliter la suppression.

## Reprise, export, notifications et hors ligne

Aucun changement de propriétaires, champs anciens ou cartes/avatar figés. Anciennes URL `/dashboard/preparer/[occurrence]`, `/dashboard/preparations`, `/dashboard/idees`, `/dashboard/budget`, gift-ideas et paramètres conservés. Pas de migration automatique des sources vers le partagé. Inspirations sans célébration et cadeaux historiques restent accessibles. Export personnel existant inchangé ; B/C doivent ajouter seulement les objets autorisés, sans surprise/réservations du destinataire et sans partage par export. Effacement compte étendu avant activation ; suppression commune ne supprime ni source date/contact/envie ni historiques privés indépendants.

Notifications in-app B/C : invitation, attribution, modification importante, consultation et décision ; frais D seulement opt-in. Aucun bruit par soutien/vote, cron ou push social. Contrôler droits à création **et lecture**, détails supprimés à révocation ; contenu minimal seulement aux anciennes personnes autorisées en cas de suppression. Aucun email externe automatique. Aucune nouvelle notification dans A.

Hors ligne : secours existant public et message explicite « Connexion requise pour retrouver tes célébrations ». Rien de privé en SW/localStorage/IndexedDB. Compte changé : démontage des panneaux et brouillons privés, réponses anciennes ignorées. Refus/révocation : retirer données en mémoire et fichiers préparés ; ne pas remettre d’anciens résultats à l’écran. Pas de Realtime avant politique filtrée et tests de révocation.

## Recette et déploiement/retour arrière

Contrôles A : verify ; navigateur réel sur composants avec données fictives 320/390/1440 et clair/sombre ; onglets/saisie/clavier, modèle choisi/reprise partielle, inconnu/zéro/devise/cadeau offert non doublé, filtres historique, chargement/erreur/hors ligne/changement de compte. Ceci ne prouve pas une sauvegarde distante.

B : protocole sans copie du 17/10 dans GO-PRODUCTION.md. C/D : copie autorisée et JWT organisateur, membre, attente, refusé, ex-membre, non-membre, destinataire dont organisateur. Exercer directement API/base/changement UUID/export/notification/agrégats. Refus uniforme sans révélation de surprise. Course acceptation/révocation, dernier organisateur/transfert, task/retry, suppression/double décision/demande concurrente, dernière unité intercontextes, soutien/retrait/version, vote/clôture/expiration, dépense/correction/remboursement. Tester édition envie avant/après réservation avec réponse identique, pas timestamp/erreur secret. Après suppression : anciens écrans refusés, réservations libérées, sources privées intactes, aucun solde supprimé ni achat annulé fictivement. Ces contrôles restent **non exécutés**.

Ordre B révisé le 17/10 : correctif humain sur le schéma installé → catalogue corrigé → activation locale → recette réelle avec deux comptes pilotes → décision GO → déploiement humain. La copie Supabase n’est plus obligatoire pour B. Les scripts anciens de copie ne doivent pas être lancés dans la base actuelle. C/D gardent leur protocole de conception et leurs propres préalables. Aucun SQL n’est appliqué automatiquement.

Retour arrière A : restaurer les fichiers applicatifs modifiés depuis la copie pré-livraison ; aucune donnée modifiée par installation locale. B/C/D : désactiver d’abord les nouvelles écritures, révoquer droits/notifications/réservations puis conserver la sauvegarde chiffrée minimale nécessaire ; ne pas DROP un registre avec soldes. Documenter la restauration sur copie avant installation, sans rouvrir des contenus supprimés. Aucun commit ou déploiement automatique.

Références officielles consultées : [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) pour la distinction grants/policies ; [verrous PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html) pour les transactions concurrentes. Le changelog Markdown n’a pas pu être lu avec le navigateur documentaire (type non accepté) ; ne pas en déduire une vérification exhaustive des nouveautés.
