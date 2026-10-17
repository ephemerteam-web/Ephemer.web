# Évolution d’Ephemer — étapes à valider une à une

Préparé le 17 octobre 2026 à partir du [nouvel audit](AUDIT-APPLICATION-2026-10-17.md), du [bilan du plan initial](PLAN-EVOLUTION-EPHEMER.md) et de l’état local relu pour cette préparation.

**Statut : E01 autorisée et réalisée, présentée à l’essai utilisateur ; les autres étapes à réaliser restent proposées.** La création initiale du plan ne lançait aucune réalisation ; l’utilisateur a ensuite demandé explicitement l’implémentation d’E01. Les numéros E01 à E11 servent au pilotage de la suite ; les lots historiques 00–18 conservent leurs noms et leurs preuves.

**Mise à jour demandée le 17/10 : les cartes collectives sont considérées à jour pour planifier la suite.** E09 sort des travaux à réaliser ; son numéro est conservé pour éviter de décaler les références. Ce point de départ est celui demandé par l’utilisateur, sans nouvelle certification technique du déploiement. Les comptes rendus antérieurs décrivent leur état à leur date et ne sont pas réécrits comme de nouveaux résultats.

## Comment avancer

1. Nous validons le périmètre de la prochaine étape, avec ses choix visibles pour l’utilisateur.
2. L’assistant réalise cette étape et ses vérifications, puis présente les fichiers complets modifiés, le résultat, les limites et la marche à suivre pour essayer.
3. L’utilisateur teste avec `npm run dev`, confirme le résultat ou demande des ajustements.
4. L’étape suivante est proposée à validation. La validation d’une étape n’autorise pas toutes les suivantes.

Le suivi distingue **proposée → périmètre validé → en cours → prête à essayer → acceptée**. Une étape reste partielle si un de ses critères obligatoires n’est pas vérifié ; les contrôles manquants ne deviennent pas réussis par validation du plan. Un report est décidé explicitement et conserve les points ouverts.

Si un changement de base est nécessaire : préparer les fichiers complets de revue, faire valider leur contenu puis laisser l’installation à l’utilisateur. Le branchement dépendant suit la confirmation du contrat installé. Cette séquence appartient à l’étape concernée ; elle ne justifie pas de réinstaller les schémas déjà confirmés.

Les vérifications sont proportionnées : tests métier et sécurité pertinents, lint/types et build aux livraisons applicatives ; recette mobile et ordinateur pour les modifications visibles. Les transports sont simulés pour la recette ordinaire. Un essai réel utilise uniquement le périmètre et les destinataires explicitement autorisés. Aucun nouveau paquet sans accord, aucune migration automatique, aucun secret affiché, aucun commit ou déploiement par l’assistant.

Les décisions déjà prises restent acquises : quatre espaces, libellé Célébrations, contacts privés distincts des Étoiles, organisation par célébration, date canonique distincte du jour de fête organisé, anciennes cartes figées et absence de cache PWA des données privées.

## Vue d’ensemble

| Étape | Résultat attendu | Dépendance principale | Validation |
|---|---|---|---|
| E01 | Réduire les alertes des dépendances sans casser l’application. | [Bilan E01](evolution/E01-DEPENDANCES.md) : audit production 6 → 0 ; audit complet 15 → 5. | Réalisée, à essayer |
| E02 | Confirmer ce qui fonctionne réellement : inscription, invitations, partage et push. | E01 pour la livraison de la version mise à niveau. | À valider |
| E03 | Compléter le suivi email et les envois uniquement sur les points encore manquants. | Réutiliser le journal et les traitements déjà disponibles. | À valider |
| E04 | Faciliter le parcours et la reprise d’une préparation. | E02 ; inventaire des parcours déjà présents. | À valider |
| E05 | Télécharger les dates dans un fichier calendrier `.ics`. | Source canonique des dates, recette de compatibilité. | À valider |
| E06 | Recevoir les mises à jour du calendrier par un lien révocable. | E05 et stockage des abonnements validé. | À valider |
| E07 | Mesurer quelques usages utiles sans exposer les proches. | Définitions préparées avec E04 ; choix de collecte explicite. | À valider |
| E08 | Partager des envies et réserver discrètement des cadeaux. | Organisation partagée éprouvée en E02, nouveau contrat à valider. | À valider |
| E09 | Cartes collectives et partage manuel considérés à jour. | Socle acquis pour ce plan, sur le principe demandé par l’utilisateur. | Retirée des travaux à réaliser |
| E10 | Compléter la programmation des cartes si des fonctions restent absentes. | Cartes collectives acquises ; suivi email E03 pour les seuls écarts restants. | Conditionnelle, à valider |
| E11 | Étudier puis réaliser une connexion directe Google si elle apporte un gain. | E06, E07 et besoin observé ; Outlook séparément. | À valider |

E01 à E03 constituent la fiabilisation ; E04 à E07 améliorent l’usage quotidien et le calendrier ; E08 complète la collaboration. E09 est considérée acquise pour ce plan ; E10 et E11 sont conditionnelles. Les évolutions facultatives sont conservées en réserve, sans obligation de tout construire.

Si un complément email de E03 reste bloqué, nous pourrons valider explicitement le passage aux étapes indépendantes E04–E07. Seul un complément de programmation qui en dépendrait attendra sa résolution. Les réservations E08 s’appuient sur la collaboration existante sans rouvrir le chantier des cartes collectives.

## E01 — Sécurité et compatibilité des dépendances

**Bénéfice :** poursuivre l’évolution sur une version vérifiée, en traitant les alertes du nouvel audit.

- Réactualiser les avis npm et les versions installées ; distinguer les dépendances utilisées en production de l’outillage.
- Préparer une mise à niveau compatible des paquets existants, en commençant par Next.js et son outillage associé. Lire la documentation Next locale pertinente avant toute adaptation applicative.
- Appliquer les corrections compatibles dans ce périmètre, sans correction forcée globale ni ajout de bibliothèque. Si une montée majeure est indispensable, présenter son impact avant de l’engager.
- Refaire les vérifications applicatives et un parcours court : connexion, Dates, préparation, carte existante.

**Livrable :** bilan avant/après des versions et alertes, fichiers modifiés, résultats des contrôles et procédure de retour à la version précédente.

**Acceptation :** les alertes visées sont corrigées ou chacune est expliquée avec une action restante ; tests/types/build réussis et parcours principaux préservés. Un build réussi ne suffit pas à déclarer toutes les alertes résolues.

**Risque :** une mise à niveau peut modifier le comportement du framework ; les adaptations et la recette doivent rester dans le périmètre validé.

**Périmètre proposé à valider en premier :** dépendances déjà présentes et seules adaptations nécessaires à leur compatibilité ; aucune nouvelle fonctionnalité ni modification de base.

## E02 — État d’activation et parcours réels

**Bénéfice :** disposer d’une réponse fiable à « qu’est-ce qui est utilisable aujourd’hui ? ».

- Consolider une fiche d’état : code présent, installation confirmée, activation, déploiement et recette réelle. Mettre les anciens comptes rendus en perspective sans effacer leur historique.
- Réconcilier les mentions contradictoires sur Invitations V2 et le push, à partir de métadonnées et de preuves actuelles ; ne pas lire les carnets pour ce contrôle.
- Préparer puis exercer les parcours autorisés : inscription/confirmation sur un autre appareil, fiche reçue, relation Étoile, partage de profil et préparation avec participants.
- Compléter les courses et rejeux restants de Célébrations B avec deux sessions indépendantes, selon son protocole déjà accepté. Pour le push, prévoir une recette distincte sur iPhone et Android avec appareils de test autorisés.

**Livrable :** fiche d’activation et tableau des essais, avec preuve, résultat et contrôle restant. Corriger dans cette étape les défauts de ces parcours, sans ajouter de nouveau mécanisme social.

**Acceptation :** aucun prérequis installé n’est annoncé comme absent, aucun canal n’est annoncé opérationnel sans preuve ; les essais non réalisables restent explicitement ouverts. Les corrections testables sont proposées à l’utilisateur pour validation.

**Risque :** confondre activation dans le code et version déployée ; prendre deux connexions successives pour une preuve de concurrence.

## E03 — Emails et suivi des automatismes

**Bénéfice :** comprendre si un message est programmé, accepté par le fournisseur ou livré, et limiter les doubles envois.

- Partir du journal durable et des traitements déjà disponibles, notamment ceux utilisés par les cartes collectives. Relever les seuls écarts du suivi des rappels, messages et récapitulatifs ; ne pas réinstaller ou remplacer le socle acquis.
- Préparer uniquement les éventuels changements de base/configuration manquants, leur procédure humaine et leur retour arrière. Si aucun écart ne subsiste, clore l’étape par le bilan des fonctions existantes.
- Compléter si nécessaire les statuts fondés sur des preuves, les erreurs isolées, l’annulation avant prise en charge et le traitement des réponses incertaines.
- Couvrir refus, panne avant/après acceptation, répétition de traitement et doublons de webhook avec transports simulés. Préparer séparément l’essai sur une adresse explicitement autorisée.

**Livrable :** chaîne de livraison documentée, interface de suivi claire, contrôles et recette réelle préparée ou effectuée selon les autorisations.

**Acceptation :** aucun « livré » sans confirmation correspondante ; pas de renvoi automatique après résultat incertain ; une panne du journal ne déclenche pas un envoi sans suivi. Les canaux réels ne sont déclarés validés qu’après leur essai.

**Risque :** activer un envoi réel pendant une recette ordinaire ou remplacer le journal par une seconde file concurrente.

## E04 — Parcours plus simple et reprise des actions

**Bénéfice :** retrouver rapidement ce que l’on préparait et savoir pour quel événement on agit.

- Conserver le contexte de la célébration dans les idées, messages et cartes : événement, date, retour et enregistrement dans la bonne préparation.
- Distinguer les trois invitations : recevoir des renseignements, devenir Étoiles, participer à une célébration.
- Ajouter un bloc « À reprendre » sobre, calculé depuis les préparations et réponses en attente existantes. Limiter son volume ; éviter de créer un second système de tâches.
- Montrer la visibilité privée/partagée et distinguer préparation, publication et envoi. Préparer les définitions de mesure E07 sans activer de collecte supplémentaire.

**Livrable :** parcours modifiés et petite recette guidée depuis Accueil jusqu’à une préparation retrouvée après navigation.

**Acceptation :** bon événement et bonne occurrence conservés ; saisie préservée après erreur ; aucune sauvegarde dans un ancien contexte ; lecture claire sur mobile, au clavier et dans les deux thèmes.

**Risque :** surcharger l’accueil ou afficher une action privée à un autre participant.

## E05 — Export ponctuel du calendrier

**Bénéfice :** retrouver les dates sélectionnées dans son calendrier habituel.

- Ajouter dans Dates « Utiliser dans mon calendrier », avec choix du contenu, de la période et aperçu.
- Télécharger un fichier `.ics` : anniversaires, fêtes confirmées et dates personnelles autorisées. Réutiliser les occurrences canoniques et préserver les reports et le 29 février.
- Proposer un mode discret ; rendre l’ajout du nom explicite. Exclure notes, âge/année de naissance, coordonnées, messages, budgets, surprises et données sociales tierces.
- Expliquer qu’il s’agit d’une copie sans actualisation automatique. Préparer le contrat commun au futur abonnement : identifiants stables, journées entières et retraits.

**Livrable :** export utilisable et recette d’import Google/Apple/Outlook sur données fictives ; limites des clients consignées.

**Acceptation :** dates et caractères corrects, aucun événement non sélectionné, aucune année inventée, pas de fichier partiel après panne. La période couverte est visible avant téléchargement.

**Risque :** présenter la copie comme une synchronisation ; les réimportations peuvent créer des doublons selon le client. Les choix de période et de libellé sont proposés avant réalisation.

## E06 — Abonnement aux mises à jour par lien

**Bénéfice :** ajouter une fois le calendrier Ephemer et retrouver ensuite ses changements dans Google, Apple ou Outlook.

- Ajouter « Recevoir les mises à jour » et une aide propre à chaque application.
- Faire enregistrer les sélections de l’abonnement, distinctes des filtres temporaires de l’écran ; donner un lien par abonnement nommé, révocable et remplaçable.
- Préparer et faire valider le stockage et les règles d’accès. Expliquer le transfert des données sélectionnées au service externe et l’accès de toute personne possédant le lien.
- Reprendre le périmètre limité de E05 ; vérifier ajout, report, retrait, changement de liste, révocation et absence de cache public. Étudier la protection du secret dans les journaux d’hébergement.

**Livrable :** gestion des abonnements, lien iCalendar, instructions et mesures de délais observés sur les lecteurs testés.

**Acceptation :** même occurrence mise à jour sans doublon sur les clients annoncés ; retraits testés ; accès suivant bloqué après révocation. Une panne n’est pas renvoyée comme un calendrier vide. L’interface explique que les copies déjà reçues ne peuvent pas être rappelées.

**Risque :** fuite du lien ou promesse de mise à jour instantanée. Le fournisseur choisit son rythme de consultation ; une « dernière consultation » ne prouve pas l’affichage sur tous les appareils. Aucun nouveau cron nécessaire par principe pour servir ce flux.

## E07 — Mesure des usages et des difficultés

**Bénéfice :** choisir les évolutions suivantes à partir de besoins observés.

- Choisir quelques questions : les préparations sont-elles enregistrées puis reprises ? Les idées sont-elles conservées ? Les cartes sont-elles publiées ? Le calendrier externe est-il utilisé ?
- Définir ce qui est mesurable sans identifier les proches ni collecter de contenu privé ; fixer collecte, consentement, conservation et suppression avant instrumentation.
- Compter les succès confirmés, distinguer clic, téléchargement, consultation de flux et livraison ; suivre les erreurs et coûts techniques réellement disponibles.
- Compléter par des retours volontaires. Ne pas annoncer de mesure de rétention individuelle sans dispositif adapté.

**Livrable :** document `MESURE-USAGE.md`, instrumentation minimale validée et protocole de bilan après une période choisie ensemble.

**Acceptation :** données transmises inspectables sans noms, emails, dates personnelles, identifiants de proches ou liens secrets ; aucun succès compté après échec. Les données indisponibles restent « non mesurées ».

**Risque :** ajouter du suivi sans finalité précise ; la présence du paquet Analytics n’autorise ni ne démontre sa mise en service.

## E08 — Envies et réservations de cadeaux

**Bénéfice :** éviter que plusieurs participants choisissent le même cadeau et rendre les préférences utiles.

- Reprendre le lot historique 12 et la tranche C : propositions, visibilité, réservation et libération, auteur et responsable clairement définis.
- Présenter d’abord les règles visibles par organisateur, participant et destinataire de surprise ; conserver les idées privées séparées.
- Préparer le contrat de base et les essais simultanés avant le branchement. Réutiliser les célébrations, sans cercle permanent supplémentaire.

**Livrable :** envies partagées et réservations dans la célébration, avec historique nécessaire et accès contrôlés.

**Acceptation :** une réservation concurrente produit un seul gagnant ; retrait/blocage/départ correctement traités ; aucun détail de surprise révélé au destinataire ; aucune copie implicite des notes privées.

**Risque :** révéler un cadeau via un compteur ou un message d’erreur. Cette étape organise les achats déclarés ; elle n’encaisse aucun paiement.

## E09 — Cartes collectives considérées à jour

**Statut de planification : acquis sur le principe demandé par l’utilisateur.** Cette étape ne demande plus de développement, d’installation ou d’activation. Création, contributions, signatures, publication et partage manuel des cartes collectives sont pris comme point de départ de la suite.

Les évolutions futures préservent ces fonctions et les cartes historiques. Elles incluent les vérifications de non-régression adaptées aux changements réellement effectués, sans recommencer la livraison du collectif. Les documents techniques existants restent disponibles pour comprendre les contrats et les protections.

## E10 — Compléments éventuels de programmation des cartes

**Bénéfice :** préparer à l’avance une carte et connaître son traitement réel.

- Commencer par identifier ce que la version à jour couvre déjà : programmation, publication, envoi du lien, annulation/report et suivi. Si tout est couvert, retirer aussi E10 des travaux restants et consigner ce résultat.
- Pour les seuls écarts retenus ensemble, distinguer l’heure de publication de la tentative d’envoi du lien, avec fuseau et aperçu de la prochaine prise en charge.
- Réutiliser le journal durable et le planificateur existants ; aucune seconde file ni promesse de livraison à la seconde. Compléter annulation/report, retard, changement d’heure, révocation et résultat incertain uniquement si nécessaire.

**Livrable :** bilan de couverture, puis compléments de programmation et de suivi seulement si des manques sont confirmés et validés.

**Acceptation :** pas de publication anticipée, aucune tentative si droits retirés avant engagement, pas de renvoi après résultat incertain ; annulation/retard/concurrence et webhook vérifiés. Essai réel uniquement sur adresse autorisée.

**Risque :** annoncer un envoi annulé alors qu’il est déjà engagé, ou confondre acceptation du fournisseur et livraison.

## E11 — Connexion directe Google, puis éventuelles extensions

**Bénéfice :** dépasser les limites constatées de l’abonnement par lien, si elles gênent réellement les utilisateurs.

- Faire d’abord le bilan de E06/E07 : installation trop difficile, délai trop long ou autre besoin précis. Sans gain démontré, conserver le flux et différer ce connecteur.
- Proposer en premier Ephemer → calendrier Google dédié, avec permissions limitées, état de connexion et déconnexion compréhensible.
- Prévoir reprise après panne sans doublon, expiration/révocation de l’autorisation, quotas et devenir des copies. Prévenir les doublons entre abonnement et connecteur.
- Étudier Outlook dans un périmètre séparé, puis les changements dans les deux sens si demandés. Déplacer un anniversaire externe ne doit pas changer implicitement une date de naissance.

**Livrable :** décision de réalisation motivée puis, si validée, connecteur Google et recette dédiée. Chaque extension fait l’objet de sa propre validation.

**Acceptation :** gain concret par rapport au lien, droits limités, erreurs visibles et reprise fiable. Aucune lecture de tout l’agenda personnel sans nécessité validée.

**Risque :** complexité et maintenance disproportionnées ; conflits entre les données canoniques et les copies externes.

## Réserve d’évolutions, à choisir après bilan

| Sujet | Première version envisageable | Ce qui permettra de décider |
|---|---|---|
| Import de contacts | Modèle de fichier, aperçu, dates partielles et rapprochement manuel. | Besoin d’import de carnets existants ; aucun parcours CSV/vCard actuel retrouvé dans l’audit. |
| Vue « Cette semaine » | Écran réunissant dates et prochaines actions. | Utilité supplémentaire par rapport à À reprendre et aux notifications. |
| Mémoire des attentions | Retour facultatif sur ce qui a plu, retrouvé l’année suivante. | Usage de l’historique existant ; conservation privée, sans IA automatique. |
| Recherche globale | Recherche autorisée dans contacts, dates et célébrations. | Difficultés de recherche persistantes après E04. |
| Frais partagés | Dépenses et remboursements déclaratifs, sans encaissement. | Règles de visibilité, devises et conservation à valider avant conception financière. |
| Collections gratuites | Décors facultatifs liés à des actions réellement enregistrées. | Usage confirmé, absence de pression et de récompense d’invitations massives. |
| Premium / cosmétiques | Étude de valeur et de coûts, sans paiement préactivé. | Résultats du lot de mesure ; aucune mise en vente décidée dans ce plan. |

## État des validations

E01 a été **autorisée explicitement, réalisée et présentée à l’essai utilisateur** : voir le [bilan, les contrôles et les limites](evolution/E01-DEPENDANCES.md). Son acceptation après essai avec `npm run dev` reste à confirmer. E09 est **considérée acquise pour la planification**, à la demande de l’utilisateur. E02–E08 restent **proposées, non validées** ; E10 et E11 sont **conditionnelles, non validées**. Aucune étape suivante n’est lancée par la livraison d’E01.

Après chaque étape, ajouter ici : date de validation du périmètre, résultat présenté, vérifications réellement exécutées, essais utilisateur, décision et points ouverts. Puis reporter le bilan technique dans [SUIVI.md](evolution/SUIVI.md). Aucun résultat historique de l’audit ne constitue une nouvelle vérification de l’étape.
