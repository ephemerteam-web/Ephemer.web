# Audit produit et parcours d’Ephemer — 17 octobre 2026

## 1. Conclusion et périmètre

Ephemer couvre désormais une chaîne cohérente : **retrouver une date → préparer une attention → conserver une idée → écrire un message → créer une carte → partager volontairement → retrouver le suivi**. Le socle privé du premier plan d’évolution est largement intégré. Le social a progressé jusqu’à l’organisation par célébration. Le prochain gain utile consiste à rendre cette chaîne plus facile à suivre et à faire apparaître les dates dans le calendrier déjà utilisé au quotidien.

Recommandation : traiter d’abord les points de fiabilité identifiés, puis proposer un **abonnement de calendrier par lien**, précédé d’un export `.ics` simple. Les mises à jour iraient d’Ephemer vers Google Agenda, Calendrier Apple ou Outlook. Le connecteur Google avec autorisation de compte viendrait ensuite si les utilisateurs ont besoin de mises à jour plus rapides. Les échanges dans les deux sens constituent une étape distincte.

### Nature des preuves

Audit du dépôt local et de ses comptes rendus, en lecture des fichiers applicatifs et des documents d’évolution. Les modifications déjà présentes, notamment le chantier de cartes collectives, sont conservées. Le bilan du plan original est ajouté dans [PLAN-EVOLUTION-EPHEMER.md](PLAN-EVOLUTION-EPHEMER.md#état-davancement-au-17-octobre-2026).

| Niveau | Ce que cela signifie ici |
|---|---|
| Code présent | Écrans, contrats ou traitements effectivement trouvés dans le dépôt. Un composant autonome peut encore ne pas être raccordé. |
| Installation consignée | Un précédent compte rendu mentionne une installation humaine et/ou un contrôle de catalogue. Aucune nouvelle base distante n’est inspectée dans cet audit. |
| Recette consignée | Essais d’une intervention antérieure, dont le pilote réel de Célébrations B. Leur portée et leurs limites sont conservées. |
| Contrôle exécuté aujourd’hui | Tests locaux, vérification complète et interrogation des alertes npm décrits en section 9. |
| Proposition | Évolution recommandée, sans changement applicatif, installation SQL ni activation automatique. |

Pas de nouvelle recette connectée de production, de test utilisateur observé, de mesure de performance ou de certification d’accessibilité pendant cet audit. L’analyse UX est une lecture des parcours et des états d’interface ; les frictions proposées doivent être confirmées auprès d’utilisateurs. Aucun email, push ou appel IA réel déclenché.

## 2. Inventaire fonctionnel actuel

« Intégré » ci-dessous décrit le code local. Le domaine actuellement déployé n’a pas été comparé à ce dépôt.

| Espace / fonction | Ce que l’utilisateur peut faire dans le parcours codé | État et limite |
|---|---|---|
| Compte et connexion | S’inscrire, confirmer son email, se connecter, réinitialiser son mot de passe, compléter son premier profil. | Parcours présents ; confirmation sur un autre appareil et disponibilité des RPC Invitations V2 à confirmer sur la cible. |
| Accueil | Voir saint du jour illustré, anniversaires, fêtes et dates personnelles du jour et des 30 prochains jours, anniversaires récents et favoris. | Intégré, tous les contacts inclus, occurrences dédupliquées ; pas de filtre de liste sur l’accueil. |
| Navigation | Passer entre Accueil, Dates, Mes proches et Célébrations ; accéder au profil, réglages et données. | Intégré, barre mobile et ordinateur ; signal d’invitations reçues sur Mes proches. |
| Dates | Consulter Mois/Agenda, choisir un jour, filtrer par liste et type, chercher un saint, ouvrir les décomptes anniversaires/fêtes. | Intégré ; sélection au clavier, détails adaptés au mobile. |
| Dates personnelles | Saisir une naissance sans année, confirmer une fête, créer une date ponctuelle ou annuelle, reporter/annuler une occurrence, archiver ou suspendre des rappels. | Intégré, calcul d’occurrences partagé ; règles civiles Paris et 29 février conservées. Pas d’année inventée. |
| Contacts privés | Créer et modifier des fiches, rechercher, filtrer, retrouver favoris et coordonnées ; traiter des correspondances dans les parcours de rapprochement. | Intégré ; les correspondances ne sont pas une fusion automatique. Aucun parcours d’import CSV/vCard trouvé dans le code actuel, malgré des mentions historiques. |
| Listes personnelles | Créer, renommer et supprimer une liste, affecter plusieurs listes à un contact, filtrer Contacts/Dates. | Intégré ; supprimer une liste ne supprime pas les contacts. |
| Invitations au carnet | Faire remplir une fiche par lien, traiter les correspondances/homonymes et choisir une reprise après inscription. | Parcours V2 présents ; installation et vraie reprise à confirmer, documentation d’activation encore ambiguë. |
| Étoiles | Demander une relation, accepter/refuser, retirer/bloquer, associer volontairement une étoile à une fiche privée. | Intégré 10A ; une relation acceptée ne crée pas automatiquement un contact. |
| Mon profil | Enregistrer identité, anniversaire, goûts, pseudonyme et critères de partage ; voir l’aperçu et gérer les accords IA. | Intégré, catalogue unifié consigné comme confirmé. Sauvegarde commune aux deux onglets. |
| Avatar | Personnaliser un dessin ou préparer un portrait IA depuis un selfie ; retrouver l’avatar enregistré, agrandir/télécharger le portrait. | Intégré ; génération IA soumise à session/quota. Les anciennes cartes restent figées. |
| Préparation personnelle | Ouvrir une occurrence, ajouter des tâches ou un modèle, enregistrer un message, suivre la progression et consulter l’historique. | Intégré, une préparation par occurrence ; progression déclarative. |
| Idées et cadeaux | Conserver une idée par titre/lien, filtrer, demander des suggestions IA, choisir un cadeau, noter achat/don/réaction et conserver l’historique. | Intégré ; bibliothèque privée, aucun achat ou encaissement marchand réalisé. |
| Budget personnel | Voir estimations, dépenses et inconnus par devise, avec synthèse par préparation. | Intégré ; pas de conversion automatique, ni double comptage d’un achat devenu cadeau offert. |
| Messages et styles | Générer un message, choisir ton/longueur/formule/emojis, ajouter sa signature, conserver un style personnel ou par contact. | Intégré, consentement par source/champ ; enregistrer ou copier ne prouve pas un envoi. |
| Messages programmés | Planifier, retrouver les statuts disponibles, annuler ou reprogrammer selon le traitement. | Code présent ; dépendance au journal durable et à la configuration réelle. Pas de garantie générale de livraison. |
| Cartes individuelles | Enregistrer un brouillon, prévisualiser, publier une copie figée, partager/révoquer un lien et exporter une image. | Intégré ; publication, partage du lien et réception sont des actions différentes. |
| Organisation partagée | Créer une célébration avec date facultative, inviter des Étoiles, accepter/refuser, gérer tâches/commentaires, transférer ou clôturer. | B activé dans le code, catalogue corrigé et pilote réel consignés ; déploiement non vérifié ici, concurrence réelle encore partielle. |
| Surprises | Exclure le destinataire identifié des préparatifs de surprise ; conserver les sources privées lors d’une publication sélectionnée. | Contrat et contrôles B présents ; ne pas promettre de reconnaître une personne utilisant une autre identité. |
| Cartes collectives | Contrats, rendu V3, contributions et programmation préparés en composants autonomes. | **Non livré : verrou collectif fermé**, schéma proposé, routes/transports/cron non raccordés. |
| Notifications | Cloche et centre, rappels configurables, résumé du jour, préférences email et push par appareil. | Intégré côté application ; résumé push codé, installation déclarée humainement. Réception sur téléphone non démontrée ici. |
| Récapitulatif et newsletter | Recevoir un récapitulatif et une newsletter mensuelle selon les réglages et traitements prévus. | Traitements présents dans les crons existants ; leur livraison dépend du même socle email à confirmer. |
| Partage en image | Sélectionner des champs, voir un aperçu, préparer les PNG localement, partager les fichiers ou les télécharger. | Intégré ; ce partage ne crée pas de lien et ne publie pas automatiquement le contenu. Le collectif reste une extension préparée. |
| Données personnelles | Exporter ses données en JSON, consulter un diagnostic simulé, demander l’effacement du compte. | Export version 12 avec B actif ; pagination et contrôle de session, sans instantané global. Effacement réel complet et cascades à valider sur données de test. |
| PWA et thèmes | Installer l’application, utiliser les thèmes clair/sombre et un écran de secours hors ligne. | Intégré ; après rechargement hors ligne, le carnet privé n’est pas disponible. |
| Calendrier externe | Actuellement, partager une représentation en image. | **Aucun export `.ics`, flux `webcal` ou connecteur calendrier trouvé** dans les routes, composants et bibliothèques inspectés. Le JSON du compte ne remplit pas cette fonction. |

Principales preuves locales : [navigation](../lib/navigation.ts), [accueil](../components/HomeDates.tsx), [calendrier](../components/CalendarExperience.tsx), [préparations](../components/PreparationScreen.tsx), [organisation partagée](../components/celebrations/CelebrationExperience.tsx), [contrat B](../lib/celebration-contract.ts), [export du compte](../lib/user-data.ts), [cartes collectives préparées](evolution/lot-13-14/README.md).

## 3. Expérience utilisateur et cheminement des actions

### Découvrir et préparer une date

**Accueil → événement à venir → Préparer cet événement → Célébrations → tâches, idées, message et carte.**

L’accueil répond à « qu’est-ce qui approche ? ». Le calendrier sert à explorer une période et la préparation à agir. L’occurrence évite de reprendre l’an prochain les tâches déjà cochées cette année. Les modèles permettent de démarrer sans remplir un long formulaire ; l’option sans achat préserve les attentions simples.

Friction probable : on passe d’une date à plusieurs outils spécialisés. Le contexte existe dans les liens, mais peut devenir moins évident après avoir ouvert la bibliothèque, un générateur ou la synthèse de budget. Proposer un rappel visuel constant « Pour cet anniversaire · date · Retour à ma célébration » et une action « Enregistrer dans cette préparation ». À tester sans ajouter d’étape obligatoire.

### Ajouter un proche et ses renseignements

**Mes proches → nouveau contact ou invitation au carnet → vérifier les renseignements → enregistrer → Dates → préparation.**

Le carnet fonctionne pour une personne sans compte Ephemer. La naissance partielle réduit la saisie et évite d’inventer une année. Une correspondance de nom n’autorise pas une fusion silencieuse.

Friction probable : trois opérations proches portent le mot invitation : remplir une fiche, devenir une Étoile et participer à une célébration. Leurs conséquences diffèrent. Renforcer les libellés « Recevoir ses informations », « Devenir Étoiles » et « Participer à cette célébration », avec une phrase indiquant ce qui sera visible après acceptation.

### Enrichir une relation avec le partage social

**Mes proches → Étoiles → demande → acceptation → informations autorisées → association facultative à un contact → suggestions cadeaux avec accords IA.**

Cette séparation protège le carnet privé : le profil partagé d’un proche ne remplace pas automatiquement les notes personnelles. Le partage et l’utilisation par l’IA sont deux choix distincts.

Point d’attention : les critères et accords sont proposés cochés au prochain passage, conformément au choix produit du 12/10, puis appliqués seulement après Enregistrer. Une nouvelle proposition peut réapparaître sur un autre navigateur. Sans remettre en cause ce choix, ajouter un récapitulatif très lisible avant sauvegarde : « Voici ce que tes Étoiles verront » et « Voici ce qui peut être transmis pour les idées cadeaux », avec action de relecture.

### Préparer une carte et la transmettre

**Préparation → carte → enregistrer le brouillon → aperçu → publier une version → partager son lien**, ou **préparer une image → partager/télécharger**.

Le contenu publié est figé : modifier le profil ou son avatar ne modifie pas les anciennes cartes. Le partage d’une image conserve une copie chez le destinataire ; la révocation du lien ne peut pas rappeler une image déjà enregistrée.

Amélioration : afficher une progression courte « Brouillon / Version publiée / Lien disponible », puis distinguer « lien copié » et « fichier téléchargé » d’une éventuelle livraison email. Il n’existe pas de preuve générale de lecture après un partage manuel.

### Organiser à plusieurs

**Mes célébrations → créer seul ou sélectionner une préparation → choisir les éléments à partager → aperçu → confirmer → inviter une Étoile → réponse de celle-ci → tâches/commentaires**.

Une création seule passe d’abord en mode partagé, puis l’organisateur choisit les personnes à inviter. La copie partagée et la préparation privée sont distinctes ; les modifications ultérieures du privé ne se propagent pas automatiquement. La date de fête organisée peut différer de l’anniversaire canonique.

Le dispositif actuel évite l’administration d’un groupe permanent. En contrepartie, le rôle, la visibilité et la date choisie doivent rester évidents. Afficher « Ma préparation privée » ou « Partagé avec les participants », les personnes autorisées et la différence entre « anniversaire le 22 » et « fête organisée le 24 ». Les onglets partagés Idées/Frais comportent encore des annonces d’étapes futures : mieux expliquer leur disponibilité avant d’y conduire l’utilisateur.

### Retrouver ce qui reste à faire

**Notification → écran concerné → action → confirmation → retour à la préparation et à son état courant.**

Les chargements, erreurs et réessais sont prévus ; les formulaires protègent la saisie et plusieurs opérations reprennent le même identifiant après une réponse perdue. Le centre de notifications et les historiques existent. Il manque une vue transversale simple de la prochaine action : « choisir une idée », « relire le message », « répondre à une invitation ».

Proposition : un bloc « À reprendre » limité à quelques éléments utiles. Il se calcule depuis les objets existants et ne crée pas un second système de tâches. Une préparation complétée ne doit jamais être interprétée comme un cadeau effectivement remis ou un message reçu.

## 4. Suivi : ce qui est connu, déclaré ou non confirmé

| Action | Suivi disponible / frontière actuelle | Présentation recommandée |
|---|---|---|
| Modifier une fiche ou un profil | Saisie privée, enregistrement confirmé, conflits et erreurs. | « Modifications non enregistrées », puis succès après réponse validée. |
| Cocher une tâche | Progression déclarée par la personne ; historique de préparation. | « Tâche terminée », sans en déduire une preuve externe. |
| Noter un achat ou un don | Historique et budget déclaratifs. | « Achat déclaré » / « offert », sans prétendre vérifier une transaction. |
| Demander une relation ou une participation | Attente, acceptation, refus/retrait et accès selon le contrat concerné. | Type d’invitation et conséquence de la réponse visibles. |
| Publier une carte | Une version figée devient accessible par son lien autorisé. | « Version publiée » ; l’envoi reste une action séparée. |
| Copier un lien ou partager un PNG | Geste du navigateur ; annulation possible ; pas de preuve universelle de réception. | « Lien copié » ou « image téléchargée ». |
| Envoyer un email programmé | Code de journalisation et webhook présents, mais socle distant/configuration non validés globalement. | Séparer programmé, pris en charge, accepté, livré confirmé, échec et incertain, uniquement si ces preuves existent. |
| Recevoir un push | Permission appareil et tentative ne prouvent pas l’affichage effectif sur le téléphone. | Expliquer les conditions et proposer une recette réelle distincte du diagnostic simulé. |
| Synchroniser un futur calendrier | Le serveur pourrait connaître une consultation du flux, pas son affichage dans toutes les applications. | « Dernière consultation du lien », jamais « Tous tes appareils sont à jour » sur cette seule preuve. |

Le suivi technique et le suivi produit ont des buts différents. Le premier explique les pannes et les envois incertains. Le second mesure si une personne arrive à préparer une attention. Ils ne doivent pas collecter noms de proches, contenus privés, dates de naissance ni liens secrets dans un outil d’analytique.

## 5. Points à fiabiliser et écarts documentaires

| Priorité | Constat et preuve | Action / condition de clôture |
|---|---|---|
| P1 | Audit npm du jour : 15 alertes, dont une critique attribuée à Next.js. | Préparer une mise à niveau compatible, lire les avis et refaire la recette. La présence d’un avis ne prouve pas une exploitation. Aucun `audit fix --force`. |
| P1 | Le dernier contrôle consigné dans le dossier 13–14 indique l’absence de `email_jobs` et de webhook Resend configuré ; le traitement dépend du journal durable. | Confirmer l’état actuel par métadonnées, installer humainement le socle validé si nécessaire, configurer le webhook et faire un essai explicitement autorisé sur adresse de test. Ne pas promettre des envois fiables avant ces preuves. |
| P1 | B a un catalogue corrigé et un pilote fonctionnel, mais pas de course réelle validée entre deux sessions indépendantes ni de rejeu réseau réel complet. | Recette dédiée de concurrence, retrait/blocage/transfert et réponse perdue selon le protocole B déjà accepté ; le GO humain ne vaut pas résultat de test. |
| P1 | `docs/INVITATIONS.md` dit encore « SQL proposé, pas installé », alors que Profil unifié est consigné installé et déclare ce préalable. | Consolider le statut réel d’Invitations V2 et la configuration Auth. Tester une nouvelle inscription et sa confirmation sur un autre appareil. L’audit n’en déduit ni présence ni absence actuelle. |
| P2 | Guide push : installation SQL confirmée par l’utilisateur et drapeau Vercel configuré ; AGENTS conserve encore une formulation « activation distante non effectuée ». | Aligner les documents après contrôle du catalogue, de la paire configurée et du déploiement, sans afficher de secrets ; vérifier réception iOS/Android. |
| P2 | Les documents chronologiques contiennent des états successifs : B fermé, puis local, puis GO production. | Distinguer clairement une synthèse d’activation actuelle et l’historique. Conserver les anciennes preuves sans les réinterpréter ; le GO de B ne débloque pas les cartes collectives. |
| P2 | Export personnel étendu ; suppression réelle et cascades non éprouvées exhaustivement avec les nouvelles fonctions. | Recette synthétique d’export, retrait d’accès et effacement, sans supprimer de compte réel. Ne pas confondre export et sauvegarde restaurable. |
| P2 | Nombreuses recettes par tailles d’écran ; pas de validation complète actuelle sur appareils physiques. | iPhone installé, Android, partage natif, téléchargements, clavier/zoom/animations réduites, ancienne PWA et mise à jour. |
| P2 | Aucun dispositif de mesure produit conforme au lot 16 trouvé dans le code examiné. | Définir un petit nombre de succès utiles, sans contenus privés, puis observer les usages avant d’élargir l’offre. |
| P2 | D’anciens comptes rendus évoquent un import de contacts ; aucun parcours CSV/vCard actuel trouvé. La page Confidentialité évoque aussi cette capacité. | Confirmer le périmètre produit et aligner les textes ; considérer l’import accompagné comme une évolution à construire, pas comme une fonction acquise. |

Le premier audit signalait aussi des droits trop larges de fonctions Supabase. Les comptes rendus ultérieurs consignent des corrections, dont la fermeture du quota client au lot 10C. Cet audit ne rouvre pas ces problèmes sur la seule base du document du 4 octobre et ne certifie pas de nouveau les droits distants. Leur clôture doit être reliée au dernier catalogue, pas à l’ancien état.

## 6. Calendrier externe : export, abonnement et synchronisation

### Trois niveaux de service

| Solution | Fonctionnement pour la personne | Mises à jour | Effort relatif / recommandation |
|---|---|---|---|
| Télécharger un fichier `.ics` | Télécharger puis importer des dates dans son calendrier. | Copie ponctuelle, aucune actualisation automatique. Réimporter peut créer des doublons selon le lecteur. | Faible à moyen ; première livraison utile et brique commune au flux. |
| S’abonner à un lien iCalendar | Ajouter une fois l’adresse du calendrier Ephemer dans son application habituelle. | L’application relit le flux périodiquement ; Ephemer reste la source, lecture seule. | Moyen ; **première réponse recommandée au besoin exprimé**. |
| Connecter Google ou Outlook par leur API | Autoriser un accès précis à un calendrier dédié ; Ephemer y crée/modifie/supprime ses copies. | Traitement automatique contrôlé côté Ephemer, soumis aux files, quotas et incidents. | Élevé ; deuxième étape si le flux est insuffisant. Les changements externes ne remontent pas automatiquement sans travail supplémentaire. |
| Synchroniser dans les deux sens | Modifier aussi certaines données depuis le calendrier externe et les reprendre dans Ephemer. | Détection des changements et résolution des conflits indispensables. | Très élevé ; étude séparée après choix des champs modifiables et des règles métier. |

Importer un fichier et s’abonner à une adresse sont deux fonctions différentes. Outlook précise que l’import reste figé et que l’actualisation d’un abonnement peut dépasser 24 heures. Aucun délai instantané ne doit donc être promis pour un flux. [Documentation Microsoft](https://support.microsoft.com/fr-fr/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web).

### Compatibilité et aide à prévoir

- **Google Agenda** : l’ajout d’un agenda par URL se fait dans le navigateur sur ordinateur selon l’aide actuelle, pas depuis les applications mobiles. Prévoir un guide court et la copie du lien ; la compatibilité du flux privé par secret devra être testée. « Public » dans ce parcours signifie accessible au serveur lecteur sans session Ephemer, pas un annuaire à publier. [Aide Google](https://support.google.com/calendar/answer/37100?hl=fr).
- **Calendrier Apple** : ajout d’un abonnement par adresse web sur iPhone, iPad et Mac ; le choix du compte iCloud permet de le retrouver sur les appareils concernés. Prévoir des instructions adaptées à la version du système. [Assistance Apple](https://support.apple.com/fr-fr/102301).
- **Outlook** : entrée « S’abonner à partir du web », distincte du chargement d’un fichier. Délai variable, potentiellement supérieur à une journée. [Aide Microsoft](https://support.microsoft.com/fr-fr/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web).
- **Autres outils** : proposer une adresse HTTPS iCalendar générique, puis tester chaque client revendiqué. `webcal` peut faciliter l’ouverture d’un abonnement, mais n’est pas une garantie universelle ni un mécanisme de protection.

### Parcours proposé dans Ephemer

**Dates → Utiliser dans mon calendrier → choisir le contenu → aperçu → Télécharger une copie ou Activer les mises à jour → choisir son application → instructions → gérer le lien.**

Sur mobile, garder deux choix lisibles : **« Télécharger les dates »** et **« Recevoir les mises à jour »**. Expliquer avant activation : « Ton application de calendrier consulte ce lien à son rythme. Modifie tes dates dans Ephemer. » Montrer la période couverte et le nombre d’événements ; une erreur de lecture ne produit pas un faux calendrier vide.

Première version recommandée : anniversaires, fêtes **confirmées** et dates personnelles du propriétaire, sélectionnés explicitement. Choix de toutes les dates ou d’une liste privée ; filtre du flux enregistré indépendamment du filtre temporaire à l’écran. Une modification de liste modifie son contenu lors de la prochaine consultation. Les saints publics restent une option séparée et désactivée au départ.

Mode discret proposé par défaut : « Anniversaire à célébrer » ou « Date personnelle », sans nom ; nom du proche ajoutable après aperçu explicite. Pas d’année de naissance, âge, téléphone, email, note, goût, message, achat, budget, avatar ou lien de carte/invitation. Pas d’alarmes exportées par défaut, pour éviter les doublons avec Ephemer ; les réglages propres du calendrier externe peuvent néanmoins créer leurs alertes.

Les dates masquées ne partent pas automatiquement au motif qu’elles gardent des rappels. Les séries à reconfirmer, occurrences annulées et événements archivés sont exclus. Les profils d’Étoiles ne sont pas recopiés dans le flux. Les surprises et toutes les célébrations partagées sont hors première version, même quand l’abonné y participe ; leur éventuel export exige une étude des droits et de la confidentialité propre.

### Un lien pratique, mais qui transmet des données

Le lecteur externe ne dispose pas des cookies Ephemer. Le flux nécessite donc une adresse à secret d’accès, **révocable**, avec autorisation contrôlée côté serveur à chaque lecture. C’est une future exception de lecture par capacité à faire valider dans le contrat de routes, à la manière des liens de cartes ; pas une ouverture des tables privées. La création, le réglage et la révocation du flux restent authentifiés.

La personne doit voir avant activation : « Le service de calendrier choisi recevra les informations sélectionnées. Toute personne possédant ce lien pourra aussi les consulter. » Ce transfert est un choix nouveau, distinct du partage avec les Étoiles et des accords IA. Les copies déjà importées, affichées ou conservées par le fournisseur ne peuvent pas être rappelées.

Prévoir un lien séparé par abonnement nommé, par exemple un pour Google et un pour Apple : désactiver l’un sans couper les autres. Conserver une empreinte du secret côté serveur, permettre son remplacement, ne jamais réutiliser les secrets de session, d’invitation ou de carte. Le secret ne peut pas rester dans un fragment d’URL : les serveurs lecteurs ne le recevraient pas. Sa présence dans l’adresse impose d’étudier et de masquer les chemins/paramètres dans les journaux de l’hébergement, d’exclure la route des analyses de pages et de ne jamais enregistrer l’URL complète dans un journal métier.

Réponse sans cache public, sans indexation et sans conservation par le service worker. Toute réponse conditionnelle éventuelle passe d’abord par le contrôle d’accès. Une révocation interdit les lectures suivantes ; elle n’efface pas immédiatement les événements déjà affichés chez Google/Apple/Outlook. Une simple propriété iCalendar « privé » ne remplace pas cette autorisation.

### Contrat technique à préparer avant réalisation

Les choix suivants sont des propositions de conception, pas des contrats déjà installés :

1. Réutiliser la source canonique des occurrences et les contrôles de propriétaire ; aucune seconde base de dates. Paginer intégralement et refuser une lecture partielle.
2. Exporter d’abord des occurrences explicites sur une fenêtre annoncée, proposition : un mois passé et 24 mois à venir. Cela préserve les reports et la règle actuelle du 29 février. Les dates hors fenêtre ne sont pas promises ; documenter le renouvellement de la fenêtre.
3. Donner à chaque occurrence un identifiant iCalendar stable et opaque, lié à l’événement et au cycle, pas à sa date affichée. Un report conserve cet identifiant ; l’occurrence de l’année suivante en reçoit un autre. Ne pas exposer d’identifiant Auth ou de contact dans les UID.
4. Fournir des dates de journée entière pour les anniversaires, avec fin exclusive le lendemain. Une éventuelle heure de célébration demanderait une gestion explicite du fuseau et des changements d’heure. Préserver les révisions et dates de modification ; échapper les caractères, respecter UTF-8, les retours de ligne et les limites de lignes du format. Ces points relèvent du standard [iCalendar, RFC 5545](https://www.rfc-editor.org/rfc/rfc5545).
5. Définir un mécanisme de retrait compatible avec les lecteurs ciblés : absence dans le flux, statut d’annulation ou conservation temporaire d’une annulation selon les essais. Ne pas promettre qu’une suppression sera répercutée sans doublon avant ces essais. Un changement de sélection doit retirer les anciennes occurrences exportées.
6. Ne pas transformer une panne de source en flux vide ou `304` trompeur. Ne pas ajouter un cron pour produire le flux : calcul borné lors de la consultation, quotas et protection contre les abus à concevoir. Les ressources d’hébergement/base restent consommées.
7. Préparer le dossier de stockage des abonnements, révocations et accès minimaux sous `docs/`, pour installation humaine après validation. Ajouter cette fonction aux parcours export/effacement du compte. Toute bibliothèque nouvelle doit être autorisée avant ajout.

### Recette d’acceptation calendrier

Sur calendriers et données synthétiques : ajout, renommage, changement de date, annulation, suppression, changement de liste, année suivante, 29 février, accents/emojis et grand carnet. Même occurrence après modification = un seul événement. Deux consultations simultanées ne doivent créer aucun objet métier. Un flux ne doit jamais accéder au compte voisin.

Tester Google Agenda, Apple et Outlook avec le même jeu de dates : mesurer les délais **observés**, la propagation des suppressions et les doublons ; noter version/client/date. Tester lien révoqué/remplacé, compte supprimé, source en panne, connexion externe indisponible et absence d’exposition des données exclues dans le fichier. Une consultation du flux ne prouve pas que l’utilisateur l’a affiché. L’écran de gestion doit employer ce vocabulaire exact.

### Quand construire un connecteur Google, puis Outlook ?

Le connecteur devient utile si le délai d’abonnement empêche un usage constaté, si l’installation mobile est trop difficile ou si des mises à jour pilotées sont nécessaires. Première cible : **Ephemer écrit dans un calendrier dédié**, sans demander de lire tout l’agenda personnel. Utiliser les permissions les plus étroites réellement suffisantes, un parcours de connexion/déconnexion explicite et des jetons serveur protégés ; prévoir refus, expiration, révocation, limites et vérification OAuth selon les scopes retenus. [Permissions Google Calendar](https://developers.google.com/workspace/calendar/api/auth).

Conserver une correspondance occurrence/export externe, reprendre les écritures sans duplication après panne et indiquer la dernière opération confirmée. La déconnexion doit expliquer si les copies restent et proposer leur nettoyage lorsque l’autorisation le permet. Éviter qu’un utilisateur conserve à la fois le flux et le connecteur pour les mêmes dates sans avertissement de doublons.

Si les modifications externes doivent remonter, Google fournit une synchronisation incrémentale et des notifications de changements : les notifications ne contiennent pas le détail et ne sont pas garanties sans perte ; les canaux expirent et nécessitent renouvellement/réconciliation. Ces outils ne règlent pas les conflits produit. [Synchronisation Google](https://developers.google.com/workspace/calendar/api/guides/sync), [notifications Google](https://developers.google.com/workspace/calendar/api/guides/push).

Côté Microsoft, étudier ensuite Graph et ses requêtes delta sur une fenêtre ainsi que les notifications de changements. Ce serait un connecteur séparé, pas une conséquence automatique du travail Google. [Delta événements](https://learn.microsoft.com/en-us/graph/delta-query-events), [notifications Outlook](https://learn.microsoft.com/en-us/graph/outlook-change-notifications-overview).

Exemple de décision à trancher avant les deux sens : déplacer « Anniversaire de Camille » dans Google doit-il changer une date de naissance, ou simplement le jour où l’on souhaite le célébrer ? Recommandation : garder les anniversaires et fêtes canoniques dans Ephemer ; expérimenter d’abord un retour externe sur une date personnelle explicitement modifiable, avec confirmation et historique.

## 7. Améliorations évolutives proposées

Les numéros ci-dessous sont des repères de proposition ; ils ne remplacent pas les lots 00–18 et ne lancent aucun développement.

| Proposition | Bénéfice et emplacement | Effort relatif / dépendance | Critère de réussite / risque à maîtriser |
|---|---|---|---|
| A — À reprendre | Accueil : quelques préparations et réponses prioritaires, lien vers l’action précise. | Moyen, objets existants. | Une personne retrouve ce qu’elle préparait sans recherche ; aucune notification culpabilisante ou tâche dupliquée. |
| B — Contexte constant | Générateurs, idées et cartes : nom de l’événement, date, retour et enregistrement dans la préparation. | Faible à moyen, navigation existante. | Retour au bon événement et à la bonne occurrence ; aucune sauvegarde dans le contexte précédent. |
| C — Invitations plus explicites | Mes proches/Célébrations : distinguer carnet, Étoile et participation, avec aperçu des accès. | Faible à moyen, pas de nouveau système social. | Les utilisateurs savent dire ce que chaque acceptation partage ; ne pas élargir implicitement les droits. |
| D — Calendrier externe | Dates : export `.ics`, puis abonnement révocable. | Moyen ; source commune puis stockage de liens validé humainement. | Mise à jour et retrait sans doublon sur les clients testés, avec délai annoncé honnêtement. |
| E — Réservations discrètes | Célébration : liste d’envies, réservation/libération d’un cadeau et suggestion alternative. | Élevé, lot 12 / tranche C à construire. | Deux personnes concurrentes ne réservent pas le même cadeau ; surprise non dévoilée ; aucun encaissement. |
| F — Achever les cartes collectives | Signatures et contributions, fermeture, aperçu et publication explicite. | Élevé, finir 13 puis raccorder 14 au socle durable. | Droits, retrait et publication figée réellement testés ; programmation seulement après preuve du journal/envoi. |
| G — Récapitulatif personnel hebdomadaire | Vue « Cette semaine » : dates, tâches proches et célébrations à préparer. | Moyen ; commencer en écran, puis étudier un canal facultatif. | Vue utile sans second centre de notifications ; pas de nouveau cron sans justification/validation. |
| H — Import accompagné | Carnet : modèle téléchargeable, aperçu des champs et des dates partielles, résolution manuelle des doublons. | Moyen à élevé, parcours d’import à construire dans le code actuel. | Import compréhensible et réversible par lot ; aucune fusion automatique d’homonymes. |
| I — Mémoire personnelle | Après une célébration : retour facultatif « ce qui a plu », idées à garder pour l’an prochain. | Moyen, historique cadeau existant. | Retrouver l’information au prochain événement ; pas de transmission IA automatique. |
| J — Mesure minimale | Reprendre le lot 16 : préparation enregistrée/reprise, idée conservée, carte publiée, erreurs et coûts techniques. | Moyen, définitions et confidentialité avant instrumentation. | Succès après confirmation, données agrégées sans contenu privé ; aucune rétention individuelle prétendue sans dispositif adapté. |
| K — Connecteurs Google/Outlook | Réglages calendrier : synchronisation vers un calendrier dédié et suivi des incidents. | Élevé, après D et mesure de sa limite. | Écritures reprenables, révocation gérée, permissions limitées, aucune duplication avec le flux. |
| L — Collections facultatives | Quelques décors gratuits liés aux préparations réelles, masquables. | Moyen à élevé, lot 15 ; attendre les usages. | Encourager sans classement, série quotidienne ni récompense d’envois massifs ; attribution atomique. |

Les frais partagés et remboursements méritent une étude séparée après les réservations : préciser qui voit les montants, les dettes déclaratives, les devises et la conservation après suppression. Ne pas introduire une cagnotte ou un paiement dans cette amélioration d’organisation.

Une recherche globale par nom, date ou célébration peut aussi être testée après le bloc « À reprendre » si les utilisateurs peinent encore à retrouver un élément. La recherche doit respecter les accès et ne pas produire d’index privé hors ligne par défaut.

## 8. Ordre de réalisation conseillé

| Étape | Travail concret | Condition de passage |
|---|---|---|
| 1 — Fiabiliser | Alertes de dépendances ; statut unique des activations ; journal email/webhook ; recettes B restantes et inscription. | Responsabilités et preuves documentées ; pas de promesse de canal non vérifié. |
| 2 — Fluidifier | Contexte constant, invitations explicites et bloc À reprendre. Mesure minimale préparée en parallèle. | Recette mobile/clavier et retours d’utilisateurs, sans nouvelle complexité de navigation. |
| 3 — Exporter | Télécharger un `.ics` pour les occurrences sélectionnées. | Dates exactes, contenu limité, tests d’import sur les clients annoncés. |
| 4 — S’abonner | Lien révocable, gestion des sélections et aide Google/Apple/Outlook. | Recette de mises à jour/retraits, délai observé et transfert tiers expliqués. |
| 5 — Compléter le collectif | Réservations lot 12 ; cartes lot 13 ; envoi lot 14 uniquement après fiabilisation. | Droits réels, concurrence, effacement et surprises testés ; ordre affiné selon les usages. |
| 6 — Connecter davantage | API Google si le besoin est confirmé, puis Outlook. | Gain observé par rapport au flux ; maintenance et autorisations soutenables. |
| 7 — Expérimenter | Collections, éventuellement premium/cosmétiques après mesure. | Valeur et coûts documentés ; socle gratuit et confidentialité conservés. |

Les efforts sont relatifs, sans estimation calendaire ni prix inventé. Aucun nouvel abonnement fournisseur n’est décidé. Un flux réduit la dépendance à une API propriétaire, mais consomme toujours des ressources serveur et de base. Les connecteurs ajoutent maintenance, surveillance et gestion des autorisations.

## 9. Vérifications de cet audit et livrables

- `npm test` relancé : **440 tests réussis, zéro échec**, avec bases et transports simulés ; journal `out/audit-2026-10-17-tests.txt`.
- `npm run verify` final réussi : **442 tests, zéro échec, TypeScript et build réussis ; zéro erreur lint et cinq avertissements préexistants**. Journal `out/audit-2026-10-17-verify-final.txt`. Le premier passage complet avait passé lint/types/tests, puis rencontré un refus d’accès Windows lors de la compilation SWC ; la relance autorisée hors bac à sable a réussi. Le dépôt évoluait aussi dans le chantier collectif déjà présent : le nombre final de tests diffère donc du premier passage autonome de 440 tests.
- `npm audit --json` relancé avec accès au registre après un échec DNS dans le bac à sable : **15 alertes : 1 faible, 1 modérée, 12 élevées, 1 critique**. Rapport local `out/audit-2026-10-17-dependances.json`. Le code de sortie 1 signale les alertes. Aucun paquet installé ou corrigé.
- Recherche des routes et traitements `.ics`, iCalendar, webcal et API Google Calendar : aucune implémentation trouvée dans le périmètre applicatif inspecté. Recherche d’Analytics/événements produit : aucune instrumentation trouvée dans `app`, `components`, `lib` ; dépendance déclarée seulement.
- Documentation officielle calendrier consultée le 17/10/2026, citée près des propositions concernées. Ce travail documentaire n’est pas une recette de compatibilité du futur flux.
- Liens vers les fichiers locaux des deux nouveaux livrables contrôlés : aucun fichier cible manquant. Contrôle des espaces de fin de ligne du diff documentaire réussi.

Livrables : ce rapport, l’état d’avancement ajouté au plan initial et une entrée dans [SUIVI.md](evolution/SUIVI.md). Aucun code applicatif, migration, secret, dépendance, réglage distant ou commit modifié par cette intervention. Les essais et travaux collectifs déjà présents ne sont pas présentés comme des fonctionnalités activées par cet audit.
