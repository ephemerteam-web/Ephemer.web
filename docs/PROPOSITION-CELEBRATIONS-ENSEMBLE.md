# Proposition — Célébrations ensemble

Date : 13 octobre 2026.
Statut : brouillon produit et prompt à valider. Aucune autorisation d’implémentation,
d’installation SQL ou de déploiement n’est donnée par ce document.

## Choix exprimés par l’utilisateur

- Réunir Mes préparations, Boîte à idées et cadeaux et Budget cadeaux autour de l’événement.
- Inviter directement à un événement ; aucun cercle à créer ni à administrer.
- Utiliser les listes de contacts existantes comme aide à la sélection des invités.
- Proposer un budget facultatif, avec partage des frais et calcul des remboursements.
- Masquer toute la préparation d’une surprise à son destinataire ; seuls les organisateurs
  choisis y accèdent.
- Simplifier la sélection de cadeaux avec ajout rapide, propositions communes, étoiles
  de soutien et sondages pour prendre une décision.
- Utiliser des étoiles plutôt que des cœurs : une étoile de soutien par personne et
  proposition, retirable, avec compteur ; aucune notation sur cinq étoiles.
- Appeler les événements collaboratifs « Célébrations » dans l’interface.
- Permettre à l’organisateur, administrateur des participants de la célébration, de
  la supprimer. Les invités peuvent lui demander cette suppression ; il accepte ou refuse.

Ces choix remplacent la proposition de cercles du lot 11. Une liste de contacts reste
privée : elle ne représente pas un groupe de comptes ayant accepté un accès partagé.

## Parcours proposé

Dans Célébrations, afficher les célébrations à venir, mes invitations et les archives.
Le bouton principal est « Organiser une célébration ». On peut aussi démarrer depuis une
date existante : anniversaire, fête, date personnelle. Création libre pour un réveillon,
un repas ou une sortie, sans devoir créer une fiche contact.

Chaque événement présente titre, date, lieu facultatif, temps restant, participants et
prochaine action. Trois onglets suffisent :

| Onglet | Utilité |
|---|---|
| Organisation | Tâches, responsables, échéances, sondages de date/lieu/activité et commentaires attachés à l’événement. |
| Idées et cadeaux | Ajout rapide, propositions soutenues par des étoiles, sondage de choix, envies autorisées et réservation discrète. |
| Frais | Budget indicatif facultatif, dépenses, répartition et remboursements déclarés. |

Les participants se gèrent depuis l’en-tête. Aucun onglet Cercles. L’onglet Frais reste
discret tant que cette fonction n’est pas activée. Les modèles Anniversaire, Réveillon
et Repas entre amis proposent quelques tâches modifiables, sans créer une longue liste
automatiquement. Les suggestions IA existantes restent accessibles à la demande.

Pour choisir un cadeau : proposer avec un titre ou un lien, soutenir les idées avec
une étoile, voter si nécessaire, confirmer le choix puis « Je m’en occupe ». Le soutien
et le vote n’engagent pas financièrement. « Je participe aux frais » est une action
distincte et volontaire. Les sondages restent dans les onglets concernés, sans ajouter
un quatrième espace de navigation.

L’organisateur est l’administrateur du groupe de participants de cette célébration,
sans création d’un cercle permanent. Il dispose de « Supprimer la célébration » avec
confirmation explicite. Les invités disposent de « Demander la suppression » ; leur
demande est examinée par l’organisateur et ne supprime rien automatiquement.

« Mes envies » et « Mes inspirations » sont des accès secondaires de Célébrations :
les envies sont écrites par leur destinataire ; les inspirations sont privées et conservées
toute l’année. L’historique des cadeaux et le récapitulatif personnel mensuel/annuel
restent accessibles en second niveau. Messages, cartes individuelles et styles existants
restent utilisables dans leur contexte ; aucune carte collective n’est promise dans ce lot.

## Prompt proposé, à transmettre après validation

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3, et AGENTS.md.
Lis le code réel et docs/evolution/MODELE-METIER.md avant de travailler.

Objectif : faire de Célébrations un module simple pour organiser seul ou avec ses amis
un anniversaire, une fête, un réveillon, un repas ou une sortie. Fusionne les parcours
Mes préparations, Boîte à idées et cadeaux et Budget cadeaux autour d’un événement.
Intègre les envies et réservations discrètes du lot 12, ainsi que la collaboration du
lot 11, en remplaçant explicitement les cercles par des invitations à chaque événement.
Ne crée aucun écran Cercles ni nouveau groupe permanent à administrer.
Appelle les événements collaboratifs « Célébrations » dans tous les textes de l’interface :
« Organiser une célébration », « Mes célébrations », « Inviter à la célébration » et
« Supprimer la célébration ». Le mot événement peut rester technique pour les dates,
occurrences et contrats existants ; ne renomme pas leurs tables ou routes implicitement.
Simplifie la sélection des cadeaux et donne au groupe un parcours continu : proposer,
soutenir avec des étoiles, décider par sondage si utile, puis prendre en charge.

1. Séquence de livraison

Commence par un dossier de conception : navigation, parcours mobile, matrice des droits,
modèle des données, reprise de l’existant, cycle de vie, recettes et retour arrière.
Signale les écarts avec MODELE-METIER : accès par événement plutôt que cercle, partage
des envies à un événement, étoiles/sondages, demandes de suppression et suppression par
l’organisateur, frais partagés et conservation des soldes après départ ou suppression.
Prépare le SQL de revue sous docs/evolution/ sans l’appliquer. Les nouveaux contrats
restent isolés ; ne les ajoute pas aux types générés avant installation confirmée.

La validation de ce prompt autorise la préparation locale dans son périmètre. Elle ne
remplace pas la validation humaine du schéma, son installation ni les tests d’accès
et de concurrence sur une copie de base. Avant toute persistance collaborative,
confirme en lecture seule le schéma installé et les permissions.

Découpe l’implémentation vérifiable en : unification du parcours personnel ; invitations
et organisation partagée ; idées/étoiles/sondages et envies/réservations ; frais et
remboursements. Garde une
vision produit commune. N’active pas une partie dont les garanties ne sont pas validées.
Ne crée aucun commit, n’ajoute aucune dépendance sans accord et ne déploie pas.

2. Point d’entrée et écran célébration

Conserve les quatre espaces Accueil, Dates, Mes proches, Célébrations.
Célébrations ouvre « Mes célébrations », à venir et archivées, avec mes invitations
en attente et le bouton « Organiser une célébration ». Prévois les filtres Tous, Seul,
À plusieurs, avec accords adaptés aux libellés affichés.

Création depuis une occurrence existante ou libre : titre obligatoire, date et
lieu/heure facultatifs tant qu’ils sont à décider, organisation seul ou à plusieurs.
Un événement sans date reste « Date à choisir », sans compte à rebours, occurrence
datée fictive ou rappel programmé. Une occurrence existante garde sa date canonique.
Pour un anniversaire, distingue
la date d’anniversaire et une éventuelle date de fête ; ne modifie pas la naissance.
Une préparation reste liée à une occurrence précise ; chaque année garde son historique.

Dans l’événement : en-tête compact, participants et trois onglets Organisation,
Idées et cadeaux, Frais. Saisie conservée entre onglets. Budget facultatif et replié
au départ. Propose des modèles de tâches Anniversaire, Réveillon et Repas entre amis,
que l’utilisateur prévisualise puis choisit d’ajouter.

3. Invitations directes et droits

Invite des comptes Étoiles ayant une relation acceptée, sans annuaire public ni recherche
d’email révélant l’existence d’un compte. Chaque invité accepte ou refuse pour lui-même.
L’organisateur ne peut pas accepter à sa place. Invitation révocable et expirante,
sans accès aux contenus avant acceptation. Définis limites anti-abus et réessais idempotents.

Une liste de contacts peut présélectionner des personnes, jamais accorder des accès.
Un contact privé n’est pas un compte : propose le parcours social existant pour les
personnes sans compte, sans association automatique par email et sans accès anonyme
aux préparatifs. Aucun message externe n’est envoyé automatiquement dans cette livraison.

Rôles limités à organisateur (administrateur du groupe de cette célébration) et participant.
Créateur organisateur initial ; transfert
accepté à un autre membre autorisé. Départ du dernier organisateur : transfert accepté
ou clôture explicite, jamais de responsabilité imposée ni événement actif sans responsable.
Définis aussi suppression du compte, refus, blocage, retrait d’amitié et réinvitation.
Une participation à un événement est distincte de l’amitié : explique sa révocation
séparée et les effets retenus du blocage avant validation du schéma.

Une invitation ou son acceptation ne partage ni carnet, ni notes de contact, ni goûts
non autorisés, ni idées/budget privés. Publier depuis une préparation privée crée une
projection minimale prévisualisée et explicitement confirmée, pas l’ouverture des
tables privées. Les modifications ultérieures de la source privée ne se propagent
pas silencieusement. Ne duplique pas une publication lors d’un double clic ou réessai.

Suppression et demandes de suppression :
- L’organisateur administrateur peut supprimer sa célébration après une confirmation
  qui explique les conséquences. Distingue Supprimer, Annuler et Archiver dans l’interface.
- Les invités concernés peuvent « Demander la suppression » avec motif facultatif.
  Les participants acceptés utilisent l’écran de la célébration ; un invité encore en
  attente utilise seulement la présentation minimale de son invitation, sans accès
  supplémentaire aux préparatifs. Invitation expirée/révoquée et ex-membre : refus.
- Une demande ne supprime, ne clôture et ne suspend pas la célébration. Seul un
  organisateur administrateur actuellement autorisé peut l’accepter ou la refuser.
  Le demandeur retrouve le statut En attente, Acceptée ou Refusée ; une seule demande
  en attente par compte et célébration, avec protection contre les réessais et abus.
- Accepter une demande déclenche la même suppression que l’action directe, avec la
  même confirmation et les mêmes contrôles. Refuser laisse la célébration inchangée.
  Les autres participants ne lisent pas automatiquement les motifs des demandes.
- La suppression révoque les accès partagés à la prochaine requête, ferme les invitations,
  demandes et sondages, arrête les nouvelles notifications et empêche toute nouvelle
  tâche, réservation, dépense ou contribution. Libère les réservations concernées sans
  dévoiler leur existence au destinataire ; une libération n’annule pas un achat réel.
- Ne supprime pas la date personnelle source, le contact, la liste d’envies du destinataire
  ni les idées, achats, cartes et historiques privés indépendants des participants.
  La disparition de la préparation commune ne doit pas effacer ou solder artificiellement
  des dépenses ou dettes. Définis le devenir des écritures et soldes résiduels dans le
  dossier de conception, avec conservation minimale/anonymisation si retenue, sans
  conserver un accès d’archive aux contenus supprimés. Valide cette politique avant SQL.
- Vérifie droits et état côté base et serveur, même pour un appel direct ou un ancien
  écran resté ouvert. Suppression et acceptation répétées sont idempotentes ; les
  demandes concurrentes ne provoquent pas plusieurs suppressions. Une demande ou son
  résultat ne révèle jamais une surprise à un compte exclu, même administrateur ailleurs.

4. Organisation et surprises

Tâches facultatives : cadeau, carte/message, gâteau, repas, boissons, décoration, appel,
sortie et tâche libre ; titre, responsable accepté, échéance facultative et progression.
L’organisateur crée/attribue ; un participant peut créer sa tâche et mettre à jour celles
qui lui sont autorisées. Ne lui permets pas d’attribuer des engagements aux autres.
Le serveur vérifie rôle et ressource pour chaque opération.

Un fil de commentaires attaché à l’événement suffit ; aucun chat général. Auteur édite
ou retire son commentaire ; organisateur modère sans réécrire à sa place. Historique
minimal des actions produit par le serveur, sans copie de texte sensible ou de montants.

Mode Surprise : toute la préparation, son existence dans les listes/compteurs et ses
contenus sont invisibles au destinataire. Accès réservé aux organisateurs choisis,
tous membres acceptés et non destinataires. L’exclusion du compte destinataire prime
tout rôle, y compris organisateur. Invitations, exports, recherche, agrégats, frais,
erreurs, notifications et abonnements ne doivent pas révéler la surprise.

Garantis cette exclusion dans la base et au serveur, y compris accès directs et changement
d’ID. Pour un destinataire sans compte, aucune association approximative ; une association
ultérieure exige identité validée et retrait atomique des droits incompatibles.
Suspendre le partage secret si cette exclusion ne peut pas être garantie.
Changer de mode ou de destinataire exige une revue des accès ; avertir qu’un contenu
déjà vu ne peut pas être effacé de la mémoire d’un ancien lecteur.

5. Idées, envies et réservations

Remplace les formulaires successifs par un ajout rapide dans Idées et cadeaux :
un titre ou un lien HTTP/HTTPS valide suffit ; prix, devise et commentaire facultatifs.
Si seul un lien est fourni, affiche un libellé neutre modifiable ; aucun scraping,
extraction distante automatique ou titre/prix marchand inventé. Ne rends pas un montant
obligatoire pour proposer ou choisir un cadeau.

Réunis les propositions des amis, les envies auxquelles le lecteur a droit et les
suggestions existantes dans ce même onglet, avec leur provenance clairement indiquée.
Propose directement « Proposer pour cet événement », sans obliger à enregistrer d’abord
une inspiration dans la bibliothèque privée. Les suggestions ne sont ajoutées au groupe
qu’après sélection explicite ; pas de génération IA automatique à l’ouverture.
Évite les propositions en double pour une même envie ou suggestion reprise, sans fusionner
arbitrairement deux textes différents. Présente d’abord trois à cinq propositions utiles,
avec « Voir toutes les propositions » et aucun contenu perdu.

Une idée privée, une proposition au groupe et une envie de son destinataire ont des
propriétaires et droits distincts. Conserve les inspirations privées sans événement.
Proposer une inspiration au groupe exige sélection et aperçu explicites ; aucune note
privée n’est reprise automatiquement. Suggestions IA facultatives : garde session,
quota et consentements actuels ; aucun commentaire, frais ou préparatif transmis par défaut.

Mes envies : liste et articles avec titre, lien facultatif, estimation/devise facultative,
préférence et quantité positive, 1 par défaut. Privée par défaut ; partage au choix à des
amis acceptés sélectionnés ou à des participants autorisés d’un événement choisi.
Un nouveau participant n’accède pas automatiquement à une liste sans règle explicitement
consentie. Le propriétaire peut toujours modifier ou retirer ses envies.

Dans une surprise invisible à son destinataire, utilise uniquement ses listes déjà
partagées aux amis concernés : ne lui demande pas de sélectionner cet événement secret.
Chaque lecteur conserve son propre droit sur la liste ; l’afficher dans un événement
ne donne aucun droit aux autres participants et ne copie pas les envies sans consentement.

Réservations stockées séparément des envies visibles au propriétaire. Les autres lecteurs
autorisés voient seulement la disponibilité utile ; le réservant voit ses propres
réservations. L’auteur de l’envie ne reçoit ni statut, identité, compteur, date de changement,
agrégat, notification, export ou erreur permettant de déduire une réservation.
Ne pas bloquer son édition à cause d’une réservation secrète.

Réserve atomiquement une unité disponible, tous événements et contextes confondus pour
la même envie : deux personnes visant la dernière unité ne peuvent pas obtenir deux succès.
Un cadeau commun a une seule réservation responsable ; les cofinanceurs ne réservent
pas chacun l’article. Annulation possible ; pas d’expiration automatique initiale.
Choisi, réservé, acheté déclaré et offert déclaré sont distincts. Aucun état n’atteste
un achat marchand, un paiement ou une livraison réelle.

Retrait d’accès/départ/suppression libère les réservations de ce contexte. Changement
d’envie/quantité clôt atomiquement les réservations incompatibles, sans fuite au propriétaire.
Même acheté déclaré, une réservation ne conserve pas un accès révoqué ; expliquer aux
organisateurs autorisés qu’une libération n’annule pas un achat réel et qu’ils doivent
vérifier avant de racheter. Une nouvelle adhésion ne restaure pas l’ancienne réservation.

6. Étoiles de soutien et décision collective

Chaque participant accepté et autorisé peut soutenir une proposition avec une étoile.
Étoile vide : « Soutenir cette idée » ; étoile remplie : « Retirer mon soutien ».
Affiche le nombre de soutiens, par exemple « 4 soutiens » à côté de l’étoile. Pas de cœur,
de notation sur cinq étoiles ou de score personnel. Distingue ce soutien des relations
sociales Étoiles du site et des favoris privés ; il concerne uniquement cette proposition.

Une seule étoile par compte et proposition, retirable ; chacun peut soutenir plusieurs
propositions. Unicité et réessais idempotents garantis dans la base. L’utilisateur
peut modifier uniquement son propre soutien. Trie les idées par soutiens actifs,
avec un ordre stable en cas d’égalité, et conserve l’accès à toutes les propositions.
Les comptes invités en attente, retirés ou non autorisés ne votent pas. Un départ/retrait
retire le soutien des compteurs actifs ; une réinvitation ne le restaure pas.

Une étoile n’est ni une réservation, ni un achat, ni une participation financière.
Les idées les plus soutenues ne sont jamais achetées ou choisies automatiquement.
L’organisateur peut confirmer explicitement une proposition ou lancer un sondage de choix.
Si titre, lien ou prix d’une proposition change substantiellement, informe les participants
autorisés et demande de renouveler les soutiens ; ne transfère pas les soutiens existants
vers une proposition différente. Un simple retrait puis réessai ne contourne pas cette règle.

Après décision : « Cadeau retenu », puis « Je m’en occupe » pour prendre en charge la
tâche et tenter la réservation atomique si une envie est liée. Si elle n’est plus disponible,
explique le résultat aux seuls lecteurs autorisés ; aucun faux succès ou achat déclaré.
« Je participe aux frais » est une action volontaire distincte, sans réservation supplémentaire
et sans dette créée par une étoile ou un vote. Le partage se règle ensuite dans Frais.

7. Sondages attachés à l’événement

Ajoute des sondages simples dans les onglets existants :
- Organisation : Quelle date ?, Quel lieu ?, Quelle activité ?
- Idées et cadeaux : Quel cadeau choisissons-nous ?

Organisateur crée le sondage, choisit les options, le type de réponse et une éventuelle
date limite, puis l’ouvre. Cadeau/lieu/activité : un choix par personne par défaut.
Date : plusieurs disponibilités possibles. Chaque participant autorisé répond pour
lui-même, peut modifier sa réponse tant que le sondage est ouvert et voit les résultats
agrégés ainsi que sa réponse. Pas d’identité des votants exposée par défaut.

Garantis atomiquement la règle de réponse et les conflits vote/clôture. Après date limite,
le serveur refuse les votes même si l’écran n’a pas encore été rafraîchi ; aucun nouveau
cron requis. Affiche votes exprimés et absence de réponse sans inventer de majorité.
Une égalité reste visible ; aucun gagnant décidé arbitrairement. L’organisateur confirme
le choix final, y compris s’il diffère du résultat, sans modifier les votes des autres.
Changer les options après ouverture exige une nouvelle consultation et des votes à
renouveler, jamais une réaffectation silencieuse. Départ/retrait invalide les votes actifs.

Un sondage de date fixe la date de célébration après confirmation, sans déplacer une
naissance ou fête canonique. Confirme explicitement les effets sur les tâches et rappels.
Un vote cadeau ne bloque pas la modification de l’envie par son propriétaire, ne réserve
pas automatiquement l’article et ne crée pas une participation aux frais.

Étoiles, sondages cadeaux, résultats et décisions ont les mêmes protections que les
préparatifs concernés. Même pour un événement ordinaire, le destinataire ne voit pas
les discussions de ses cadeaux, soutiens, votes, réservations ou compteurs secrets.
Il peut accéder aux sondages ordinaires de date/lieu auxquels il est autorisé.
Pour une surprise, il est exclu de tous les sondages et soutiens de cette préparation,
y compris via requêtes directes, agrégats, exports, notifications et erreurs.
Le propriétaire d’une envie ne découvre pas qu’elle a été proposée ou soumise au vote.
Réévalue les droits sur la liste pour lire ou soutenir une proposition issue d’une envie ;
un sondage ne permet pas de recopier ses champs à des participants non autorisés.

8. Frais facultatifs et partage des dépenses

Intègre dans l’onglet Frais les fonctions de partage usuelles : dépense, qui a payé,
personnes concernées, répartition, soldes et propositions de remboursement. Utilise
l’identité graphique d’Ephemer, sans reprendre la marque ou l’interface d’un autre service.
Activation volontaire par l’organisateur ; possible aussi pour une préparation personnelle.

Budget indicatif par devise ; dépenses cadeau, nourriture, boissons, décoration, sortie
ou autre. Montants exacts en unités monétaires entières, jamais calculés en flottants.
Pour chaque dépense : titre, date, montant/devise, un payeur initial, participants concernés,
partage égal, par parts ou montants personnalisés. Exclure simplement une personne qui
ne participe pas à cette dépense ; aucun destinataire exclu d’une surprise dans les frais.
Valide que les parts totalisent exactement le montant et répartis les centimes restants
selon une règle déterministe expliquée. Pas de conversion automatique entre devises.

Affiche Prévu, Dépensé et Soldes séparément. Montant inconnu différent de zéro.
Calcule qui doit combien à qui ; simplifie les transferts sans promettre une optimisation
mathématique globale. Les remboursements déclarés réduisent les soldes, sans modifier
le total des dépenses. Un remboursement n’est jamais une nouvelle dépense.
Permets déclaration partielle, contestation/correction et confirmation par le receveur ;
la suggestion seule ne solde rien. Distingue déclaré et confirmé sans certification bancaire.

Exemple de recette : Alice paie 90 EUR, Bruno 30 EUR, Chloé 0 EUR, répartition égale à trois.
Chacun supporte 40 EUR. Bruno rembourse 10 EUR et Chloé 40 EUR à Alice. Total dépensé :
120 EUR, y compris après les remboursements. Trois soldes nuls après confirmation.

Les participants acceptés voient les dépenses volontairement partagées de leur événement.
Les autres achats restent privés. Payeur/auteur modifie ses saisies autorisées ; définir
les corrections par l’organisateur et l’information des personnes concernées. Personne
ne peut confirmer une réception à la place du receveur ni falsifier une écriture d’autrui.

Une dépense liée à un cadeau est enregistrée une seule fois. Réutilise la même référence
pour le cadeau et les frais. Une synthèse personnelle sépare avance payée et part à charge,
sans recopier le total collectif dans les dépenses personnelles de chaque participant.

Au départ/retrait ou à la suppression de la célébration : arrêter immédiatement accès
et notifications, sans effacer ni
redistribuer silencieusement les dettes existantes. Propose une politique de conservation
minimale des écritures et d’anonymisation pour les membres restants, cohérente avec
l’effacement du compte et à valider avant le SQL. Un ex-membre n’a aucun accès d’archive
au groupe. Définis la correction autorisée et le traitement des soldes non réglés.
En préparation surprise, un remboursement ne peut pas être notifié au destinataire.

Aucun paiement intégré, cagnotte, connexion bancaire, relance externe automatique
ou justificatif uploadé dans ce lot. Les règlements sont effectués en dehors d’Ephemer.

9. Existant, interface et notifications

Conserve préparations, idées, cadeaux offerts, cartes et montants historiques. Aucun
élargissement automatique de visibilité ni suppression de données pour simplifier le menu.
Réduis les entrées principales ; Mes envies, Inspirations, Historique et synthèse
personnelle sont secondaires. Préserve les anciennes URL et paramètres contextuels
par accès compatible ou redirection testée, sans perdre une saisie privée.
Les cartes individuelles et messages gardent leurs protections ; cartes collectives reportées.

Interface française, mobile d’abord, thèmes clair/sombre, clavier, focus visible,
réduction des animations. Prévois chargement, vide utile, erreur, refus, conflit,
invitation expirée et succès. Pas d’achat requis pour organiser un événement.
Étoiles actionnables au clavier, libellé accessible, état activé annoncé et contraste
visible dans les deux thèmes ; ne repose pas uniquement sur la couleur ou l’animation.

Notifications in-app utiles : invitation, tâche attribuée, changement important et frais
déclarés si cette option est active, nouveau sondage ou décision confirmée. Pas de
notification à chaque étoile ou vote ; regroupe les informations utiles. Vérifie les
droits actuels à leur création et lecture. Demande de suppression : informe uniquement
les organisateurs administrateurs autorisés ; réponse au seul demandeur encore autorisé.
En cas de suppression, une information minimale peut être fournie aux personnes
précédemment autorisées sans rouvrir les contenus ni révéler la surprise à son destinataire.
Départ/retrait coupe les nouvelles notifications et l’accès au détail ancien.
Aucun nouveau cron ou push social ; pas de vrais emails/push dans la recette ordinaire.
Hors ligne : secours explicite, aucune conservation publique de données privées.
Invalide les données en mémoire au changement de compte et lors d’un refus/révocation.

10. Vérifications et condition de livraison

Teste les parcours seuls et à plusieurs, anniversaire surprise et réveillon ordinaire.
Teste organisateur, participant accepté, invité en attente, refusé, non-membre, ex-membre
et destinataire, y compris destinataire organisateur. Vérifie API et accès base directs,
changement d’ID, export, notifications, étoiles, sondages, réservations, finances et agrégats.
Révocation appliquée à la prochaine requête ; transferts/départs simultanés cohérents.
Teste suppression directe par organisateur, refus de suppression directe par participant,
demande d’invité acceptée/refusée, invitation en attente sans lecture des préparatifs,
demande d’ex-membre refusée, motifs privés, organisateur révoqué et double validation.
Après suppression, teste anciennes URL, API/base directes, écritures concurrentes,
notifications, réservations et préservation des données privées sources. Aucun accès
partagé restant, achat annulé fictivement, solde effacé ou dette déclarée réglée.

Teste concurrence réelle sur copie pour acceptation, tâche ajoutée avec réessai,
dernière réservation, soutien ajouté/retiré avec réessai, vote/clôture simultanés et
dépense/remboursement rejoué ou modifié simultanément.
Teste un seul soutien par compte/proposition, plusieurs idées soutenues, compteurs après
départ, refus de modifier le vote d’autrui, choix unique ou disponibilités multiples,
égalité, absence de votes, expiration et changement d’options. Aucun soutien ou vote
ne crée de réservation, achat, dépense ou dette. Le destinataire ne peut déduire
les choix de cadeaux depuis une liste d’envies, un compteur, une erreur ou son export.
Teste centimes, parts inégales, remboursement partiel, devises séparées, montant inconnu,
annulation/correction et départ avec solde. Aucun double comptage ou faux solde réglé.
Teste les anciennes préparations et les URL historiques, sans accès privé élargi.

Exécute npm run verify et recette navigateur à 320/390/1440 px dans les deux thèmes.
Présente les fichiers complets, les résultats, limites et contrôles restant à réaliser.
Mets à jour docs/evolution/SUIVI.md. Distingue local/simulé, base de test et production.
Prépare la procédure de déploiement et retour arrière, sans exécuter le déploiement.
La mise en production demande ensuite validation humaine du résultat et des prérequis.
```

Référence pour les fonctions de répartition et soldes :
[fonctionnalités officielles Tricount](https://www.tricount.com/features).
Le parcours et les règles proposés ci-dessus sont propres à Ephemer.
