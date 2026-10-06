# Modèle métier et permissions — Ephemer

**État d’implémentation au 5 octobre 2026 :** schémas privés des lots 02/03 appliqués manuellement et confirmés en lecture seule, code intégré localement. Voir [le suivi actuel](SUIVI.md#intégration-après-installation--5-octobre-2026) pour leurs preuves et recettes restantes. Les objets de préparation, cartes, profil partagé, étoiles et constellations ci-dessous restent une conception pour les lots futurs.

Version de conception : **5 octobre 2026 — lot 01, vocabulaire et univers précisés au lot 03**. Base locale : `main`, commit `6cc97c2`. Ce document décrit des objets et règles proposés, pas des tables, colonnes ou procédures installées. Aucun code applicatif ni schéma distant n’est modifié.

Cadre : [plan d’évolution, section 3](../PLAN-EVOLUTION-EPHEMER.md#3-cadre-commun-à-tous-les-prompts), [AGENTS.md](../../AGENTS.md) et [situation vérifiée au lot 00](SUIVI.md). Les décisions simples sont fixées ci-dessous. Les choix de confidentialité nécessitant validation sont regroupés en V1–V4 ; ils restent des propositions avant livraison des lots concernés.

## 1. Point de départ et frontières métier

### Réutiliser ce qui existe sans lui changer de sens

| Objet ou règle existant | Réutilisation prévue | Limite actuelle à conserver visible |
|---|---|---|
| `auth.users` et `profiles` | Identité du compte et profil personnel privé. L’identifiant Auth détermine le propriétaire, jamais un identifiant libre fourni par le client. | [Types générés](../../types/database.generated.ts) : profil privé avec naissance, email et téléphone. Aucun profil partagé installé. Ne pas ouvrir la lecture de ces lignes pour créer le social. |
| `contacts` | Fiche privée, identifiant numérique existant, propriétaire, relation descriptive, favoris, coordonnées, naissance et note. | `relation = ami` décrit un contact ; ce n’est pas une amitié acceptée. `contacts.note` reste une note privée, pas un stockage JSON de listes, préparations, contributions ou réservations. Le formulaire d’invitation actuel assemble aussi des intérêts dans cette note : ne pas les extraire ni les publier automatiquement. |
| `invitations` | Liens existants pour recueillir une fiche dans le carnet de l’hôte. | Pas une demande d’amitié ni une adhésion à un cercle. Les incohérences distantes de relation/notification du lot 00 restent ouvertes. Les futurs liens sociaux auront un contrat et des droits distincts. |
| `rappels`, `notifications`, `notification_preferences` | Programmations et alertes privées actuelles ; préférences J-7/J-3/J-1/Jour J réutilisées. | Un rappel ne représente ni une série d’événements, ni une tâche, ni une carte. « Accepté par Resend » n’est pas « livré ». Aucun nouveau statut ne sera écrit dans ces tables pour simuler la feuille de route. |
| Dates et fêtes | [Dates civiles](../../lib/calendar-day.ts), [qualité de naissance](../../lib/contact-quality.ts), [choix de fête](../../lib/name-days.ts) et [préférences](../../lib/notification-preferences.ts). | La naissance partielle et la fête choisie ne sont pas encore persistées. Le 29 février est observé le 1er mars les années ordinaires. L’année 2000 utilisée par un helper pour valider jour/mois n’est jamais une année de naissance à enregistrer. |
| Générateurs, export et effacement | Gardes IA et minimisation existantes ; extension explicite de [l’export](../../lib/user-data.ts) et de [l’effacement](../account-deletion.md) à chaque nouveau lot. | Journal email non installé, droits de quota encore trop larges et suppression actuelle non atomique : voir C1–C5 du suivi. Les notes, envies, historique, budgets, signatures et messages enregistrés ne partent pas vers l’IA. |

### Quatre notions distinctes

- **Contact privé** : fiche possédée par un compte ; peut désigner une personne sans compte ou un compte associé explicitement. Deux utilisateurs peuvent avoir leur propre fiche pour la même personne, sans fusion ni accès réciproque.
- **Ami accepté** : relation entre deux comptes, obtenue après demande et acceptation. Elle autorise seulement les partages explicitement accordés ; aucun droit sur leurs carnets.
- **Liste personnelle** : classement privé de contacts, avec appartenance multiple. « Famille » peut être une liste personnelle ; elle ne devient pas un groupe partagé.
- **Cercle** : espace privé de coordination entre comptes ayant accepté d’en être membres. Rôles initiaux : administrateur et membre. Une amitié et une appartenance au cercle sont deux droits distincts.

Un compte peut être ami sans appartenir à un cercle, ou rester membre d’un cercle après retrait d’une amitié. Cette dernière distinction doit être expliquée dans l’interface ; politique proposée à valider en V4.

### Vocabulaire produit retenu au lot 03

Décision utilisateur du **5 octobre 2026** : **Mes contacts** pour le carnet privé, **Mes étoiles** pour les relations réciproques acceptées, **Mes constellations** pour les cercles privés et **Mon univers** pour la fiche que chacun renseigne et choisit de partager. Les noms techniques ami/cercle restent utiles au contrat ; leur harmonisation dans le code attend l’implémentation concernée. « Contacts liés » ne doit pas devenir un synonyme d’amitié sur la seule preuve d’une invitation de fiche remplie.

Les actions restent explicites : « Ajouter à mes étoiles », « Accepter », « Refuser », « Créer une constellation », « Inviter dans cette constellation ». Le parcours social prévu est **invitation dédiée → acceptation réciproque → partage choisi des univers → participation éventuelle à une constellation**. Deux étoiles ne créent aucune constellation automatiquement. L’invitation existante pour recueillir une fiche privée ne vaut pas cette acceptation sociale.

Les listes personnelles du [dossier SQL lot 03](lot-03/README.md) restent un classement privé avec appartenance multiple ; leurs noms ne sont ni des étoiles ni des constellations. Ce contrat est proposé, non installé ; aucune nouvelle entrée sociale dans la navigation ne découle de cette décision éditoriale.

## 2. Noyau privé : dates, occurrences et préparation

### Événement, série et identité d’occurrence

Un **événement personnel** appartient au propriétaire d’un contact ou au compte pour une date qui ne vise pas un contact. Il décrit une occasion et sa règle de date. Le noyau initial comprend anniversaire, fête choisie et date personnelle libre. Rencontre, mariage, adoption et réussite sont des libellés de date personnelle ; elles sont **ponctuelles par défaut**. L’anniversaire et la fête sont annuels. Une autre occasion n’est annuelle que sur choix explicite.

Une naissance est absente ou contient jour/mois, avec année facultative. Jour et mois vont ensemble ; aucune année fictive. L’année connue permet l’âge, calculé à la date de l’occurrence. Les anciennes valeurs ambiguës, notamment 1900, ne sont pas transformées sans décision de migration humaine. Une date ponctuelle exige une année réelle ; elle ne se reconduit pas. Une fête choisie conserve la correspondance explicite ; un renommage du prénom qui la rend incompatible demande une nouvelle sélection et suspend ce rappel, sans choisir silencieusement la première fête.

Une **occurrence** est une réalisation datée de cet événement. Sa date civile est `YYYY-MM-DD` ; le jour métier reste `Europe/Paris`. Le noyau ne promet pas d’heure d’envoi. Pour une série annuelle, la règle calcule une occurrence par année de cycle, avec la règle existante du 29 février.

| Identité logique proposée | Garantie |
|---|---|
| Événement personnel | Identifiant stable indépendant du titre, prénom ou date. Pour les anciens contacts : un seul événement anniversaire par propriétaire/contact et un seul événement de fête choisie. Les dates libres distinctes restent possibles, même le même jour. |
| Occurrence annuelle | Unicité `(identifiant de série, année de cycle)`. L’année de cycle est l’année de référence lors de la création, pas une valeur recalculée après un report. |
| Occurrence ponctuelle | Une seule occurrence pour l’identifiant de l’événement ponctuel. Corriger sa date ne crée pas un deuxième événement. |
| Préparation privée | Au plus une préparation du propriétaire pour l’identifiant d’occurrence. Un double clic ou deux onglets doivent retrouver le même objet. |

Une date n’est **pas** une clé d’identité. Exemple : corriger l’anniversaire 2027 du 12 au 13 avril conserve son occurrence et sa préparation. Reporter explicitement cette occurrence à janvier 2028 conserve la clé de cycle 2027 ; l’occurrence annuelle 2028 reste un objet distinct. Ne pas fusionner automatiquement deux occurrences au même jour.

### Modifications et historique

- Renommer un événement ou un contact ne réinitialise pas la préparation. Les futurs écrans utilisent le libellé courant ; l’historique d’un cadeau offert conserve le libellé minimal saisi au moment du don.
- Modifier une règle demande sa portée : **cette occurrence** ou **cette année et les suivantes**. Dans le deuxième cas, les cycles passés restent inchangés. Une modification de naissance peut corriger l’année connue sans perdre les préparations.
- Toute occurrence future déjà matérialisée dans la portée conserve son identifiant et reçoit la nouvelle date ; une annulation garde son identité et l’historique. Arrêter la série empêche les nouvelles occurrences après le cycle choisi. Une occurrence historique n’est pas supprimée pour faire disparaître une coche.
- Les alertes en attente doivent être recalculées ou annulées pour la nouvelle date après autorisation. Un message explicitement programmé n’est pas déplacé silencieusement : proposer confirmer son report ou l’annuler. Une carte déjà publiée reste une version figée jusqu’à action explicite de révocation/republication.
- Suppression d’un événement sans historique : effacement de ses occurrences et préparations après confirmation. Avec historique : proposer archivage (fin de récurrence, contenu toujours privé) ou effacement explicite de l’ensemble ; prévenir de la perte des cadeaux/tâches associés. Supprimer le compte suit la politique complète de la section 7.

**Passage d’année :** occurrence 2027 et occurrence 2028 ont deux préparations. Aucune coche, réservation, dépense ou brouillon de message n’est reconduit. Une idée durable peut être sélectionnée à nouveau explicitement. « Sans achat » est un choix de préparation, pas un montant dépensé égal à zéro ni une livraison.

### Registre des données privées proposées

Les noms ci-dessous sont métier ; leur stockage physique sera décidé dans le dossier SQL du lot, pas dans ce document.

| Donnée et minimum utile | Propriétaire et relations | Visibilité | Cycle de vie |
|---|---|---|---|
| Contact et note existants | Compte propriétaire ; association facultative et consentie à un autre compte. | Propriétaire uniquement. | Création/modification/archivage/effacement. La suppression d’une liste, amitié ou adhésion ne supprime pas la fiche. L’effacement du contact avertit des dépendances ; l’historique nouveau peut conserver un libellé privé sans coordonnées, avec référence détachée selon le contrat SQL validé. Ne pas annoncer ce comportement pour les cascades actuelles de rappels/notifications. |
| Liste et appartenance | Liste du propriétaire ; paire liste/contact unique, tous deux du même propriétaire. | Propriétaire uniquement, y compris nom et nombre de fiches. | Renommer, ajouter/retirer ; supprimer la liste efface seulement les appartenances. Aucun cercle n’est créé. |
| Événement et occurrence | Compte ; contact facultatif du même propriétaire ; identité stable définie ci-dessus. | Propriétaire uniquement. | Calcul puis persistance lorsqu’une action/histoire en dépend ; correction, exception datée, arrêt, annulation, archivage ou effacement explicite. Ne pas générer toutes les années d’avance. |
| Préparation, tâche et brouillon de message | Compte ; occurrence obligatoire, tâches enfants. | Propriétaire uniquement. | Préparation ouverte/terminée/abandonnée ; tâche à faire/faite/abandonnée, réouvrable. « Message prêt » indique un brouillon manuel, pas son envoi. Suppression avec préparation ou compte. |
| Idée cadeau | Compte ; contact facultatif, sans occurrence obligatoire. Titre, note, lien facultatif, estimation et devise facultatives. | Propriétaire uniquement. | Enregistrer toute l’année, modifier, archiver/supprimer. Sélection pour une occurrence par association explicite, sans déplacer l’idée ni dupliquer son prix dans le budget. |
| Choix de cadeau pour une préparation | Compte ; préparation et idée facultative, un choix identifiable. | Propriétaire uniquement. | Prévu/acheté/abandonné ; estimation et montant payé séparés. Un choix peut être créé sans idée préalable. Il n’est pas un cadeau offert avant confirmation du don. |
| Cadeau offert | Compte ; choix de cadeau et occurrence facultatifs, destinataire privé. Libellé, date de don, dépense connue ou inconnue, réaction facultative. | Propriétaire uniquement. | Confirmation manuelle du don ; correction/effacement de l’historique par le propriétaire. Une relation unique au choix empêche de compter une dépense deux fois. Conserver une idée ne signifie pas qu’un achat a eu lieu. |
| Style personnel (lot 06 facultatif) | Compte ; défaut du compte ou affectation à son contact. Paramètres fermés et signature locale. | Propriétaire uniquement. | Enregistrer/modifier/supprimer ; suppression ne réécrit pas les messages ou cartes déjà figés. Aucun texte libre personnel ajouté au prompt IA. |

Montants exacts, positifs ou nuls, avec devise ; absence de montant distincte de zéro. Budget prévu calculé sur les choix encore prévus et dépenses sur la date d’achat déclarée, une seule fois par choix/don associé. Sommes séparées par devise ; aucune conversion implicite. Annuler un don n’annule pas automatiquement un achat ; corriger explicitement la dépense. Prix marchand, stock et livraison ne sont pas déduits d’une estimation ou d’un lien. Liens http/https uniquement, sans extraction distante automatique ; pas d’upload photo dans le noyau.

## 3. Cartes et avatars : publier un contenu limité

| Donnée | Propriétaire et relations | Visibilité | Cycle de vie |
|---|---|---|---|
| Carte individuelle et brouillon | Créateur ; préparation facultative, modèle autorisé, texte et signature choisis. | Créateur uniquement. | Modifier le brouillon, prévisualiser, publier une version, révoquer ou supprimer. Pas d’envoi automatique au lot 08. |
| Version publiée | Même responsable de publication que la carte ; copie figée du seul contenu choisi, de la mise en page et de l’avatar/signature. | Créateur ; tiers uniquement par lien valide. | Version immuable : édition du brouillon, changement d’avatar ou modèle n’altèrent pas sa lecture. Nouvelle publication explicite ; une version révoquée n’est plus servie. Effacement ou retrait de contributions selon section 7. |
| Droit de lecture par lien | Créateur de carte ; version publiée précise, secret aléatoire, expiration et état de révocation. | Secret connu du créateur et de son détenteur, jamais exposé par une liste publique ou un export. | Copier/partager à l’initiative du créateur ; révoquer ou remplacer. Proposition simple : expiration par défaut 30 jours, modifiable explicitement. Remplacer révoque l’ancien droit. L’expiration du lien n’efface pas le brouillon privé. |
| Avatar personnel | Compte ; configuration versionnée d’éléments autorisés d’un catalogue. | Privé ; partage explicite dans profil partagé ou signature publiée. | Sauvegarder/annuler/reset ; fallback sûr pour une ancienne configuration. Pas de selfie, reconnaissance, génération IA ni SVG/HTML arbitraire. Copies publiées stables sous réserve de retrait/effacement V3. |

Un lien valide donne la lecture d’une **version**, jamais du contact, profil privé, préparation, liste, carte brouillon, cercle ou autres versions. Le destinataire connecté n’obtient aucun droit supplémentaire par son identité sur une carte individuelle. Un lien transféré peut être ouvert par son détenteur : ce partage par possession est à valider en V2, puis à expliquer au créateur.

Validation du droit côté serveur à chaque lecture, avant accès aux données privées ; pas de lecture anonyme des tables. Métadonnées sociales génériques, pas d’indexation, cache public, analytics de contenu ou fuite du secret vers des tiers. Ne pas conserver de page personnelle dans le service worker. Aucune pièce privée ni objet Storage public ne peut contourner la révocation ; si des fichiers sont ajoutés ultérieurement, leur accès et purge doivent suivre la même politique. Le noyau conserve les compositions de modèles autorisés sans upload.

Une future programmation (lot 14) référencera la version validée et le droit de lecture, sans dupliquer le socle email. Révocation/suppression bloque les tâches encore en attente ; une acceptation prestataire passée ne peut être annulée. La publication est distincte de la tentative d’envoi et de la livraison confirmée. Les RPC absentes du journal email restent un blocage, pas une fonctionnalité disponible.

## 4. Social, cercles et collaboration : extensions ultérieures

### Profil partagé et amitié

Le profil partagé, nommé **Mon univers**, est un objet logique séparé du profil privé. Orientation utilisateur retenue au lot 03 : prénom ou pseudonyme, avatar, dates choisies, « Ce qui me passionne », « Ce qui me fait plaisir », « Ce que je préfère éviter » et envies, renseignés par la personne elle-même. La liste d’envies garde son cycle de vie propre ; ne pas la dupliquer dans un texte de profil. Les dates partagées restent distinctes des dates et naissances du carnet privé.

Ces champs seront **désactivés par défaut, sélectionnés explicitement pour des étoiles ou constellations autorisées**, avec retrait possible. Pas de partage implicite d’email, téléphone, année de naissance, notes ou autres champs privés. Aucun annuaire ni sondage par email. Les nouvelles étoiles ne reçoivent pas automatiquement les partages antérieurs. L’ajout d’un membre à une constellation ne sélectionne aucun nouveau champ ; les droits de lecture suivent uniquement la portée de partage explicitement choisie, à préciser en V1 avant le SQL social.

**Mes notes personnelles** restent écrites et visibles seulement par le propriétaire du contact, même si cette personne devient une étoile. Aucun intérêt ancien assemblé dans `contacts.note` n’est extrait ou publié automatiquement. Les préférences d’univers pourront d’abord guider les filtres et la sélection locale des cadeaux. Leur transmission éventuelle au fournisseur IA demandera un choix explicite et un contrat revu ; aucune extension du prompt actuel ni consentement présumé par l’amitié.

Un droit de partage est détenu par l’auteur de l’univers et dépend d’une amitié toujours acceptée pour la portée étoile, ou d’une adhésion active à la constellation autorisée pour la portée cercle. Sa révocation coupe les lectures suivantes et retire les projections liées. L’identité minimale choisie en rejoignant un cercle (pseudonyme de membre) a un contrat distinct ; elle n’autorise pas la lecture du profil privé ou de l’univers entier. Les lots 10–12 préciseront et feront valider V1 avant de créer ces autorisations ; aucun droit social nouveau n’est livré par le lot 03.

Retirer ce partage ne modifie pas une signature déjà publiée par consentement distinct dans une carte figée. Son retrait suit la révocation des versions concernées, section 7 ; la suppression du compte retire aussi ces signatures.

Associer une fiche privée à un compte exige le choix du propriétaire de la fiche et l’accord du compte cible. Même email, même nom ou soumission de la fiche d’invitation ne valent pas cet accord. La fiche conserve ses valeurs privées ; les champs partagés apparaissent comme une projection distincte avec provenance, sans écraser coordonnées ou notes. Pas de synchronisation silencieuse. Après retrait du partage, supprimer la projection et sa liaison exploitable ; les informations déjà saisies indépendamment dans le carnet privé restent sous contrôle de son propriétaire.

### Registre social et collaboratif

| Donnée | Propriétaire/responsable et liens | Visibilité | Cycle de vie |
|---|---|---|---|
| Mon univers et autorisations | Compte source pour ses champs ; autorisations aux étoiles ou constellations choisies. | Source et lecteur bénéficiant encore du droit explicite ; pas de profil privé ni note. | Tout désactivé initialement ; activer/modifier/retirer. Retrait d’amitié coupe les droits étoile ; départ coupe les droits de la constellation, indépendamment des autres partages. Effacement du compte supprime champs et droits. Contrat physique en attente de V1. |
| Lien social et demande d’amitié | Lien de son émetteur ; demande entre émetteur et destinataire authentifiés. | Émetteur et destinataire pour leur demande ; détenteur du lien limité à l’action proposée et identité de présentation consentie. | Lien dédié : révocable, un usage réussi, sept jours par défaut. En attente → acceptée/refusée/annulée ; un demandeur n’accepte jamais à la place du destinataire. Unicité de paire non ordonnée ; rejouer ou croiser les demandes ne crée ni deuxième relation ni acceptation silencieuse. |
| Relation acceptée et blocage | Relation commune aux deux comptes ; blocage détenu par son auteur, non lisible par la cible. | Deux participants pour la relation ; personne extérieure. | Chaque participant peut retirer l’amitié ; blocage interrompt relation, partages directs et nouvelles demandes. Déblocage ne restaure pas ces droits. Aucune nouvelle relation automatique. Portée sur cercle indépendant proposée en V4. |
| Cercle et adhésion | Créateur administrateur initial ; cercle administré par ses administrateurs actifs. Adhésion liée à un compte. | Membres actifs pour nom/description et pseudonymes de membres ; pas de carnet privé. | Invitation dédiée par administrateur à un ami accepté, acceptation personnelle puis membre. Refus/révocation avant entrée ; départ/retrait coupe immédiatement l’accès. Invitation et acceptation vérifient encore l’amitié à cet instant. Au moins un administrateur, transferts décrits section 7. |
| Événement partagé et occurrence de cercle | Cercle responsable ; créateur organisateur, occurrence propre au cercle. Publication explicite de titre/date/destinataire nécessaires. | Membres autorisés ; surprise réservée aux organisateurs non destinataires. | Copie minimale d’une occurrence privée ou création dans le cercle ; provenance privée invisible aux membres. Unicité pour une même occurrence source publiée dans le même cercle, sans fusion entre sources distinctes. Ne pas ajouter de contacts à leurs carnets. Mettre à jour explicitement les champs partagés, arrêter/annuler/effacer dans le cercle indépendamment de la série privée. |
| Préparation partagée et tâche | Cercle ; occurrence partagée obligatoire. Auteur de tâche et éventuel membre assigné identifiés. | Membres actifs autorisés pour cet événement ; bénéficiaire d’une surprise exclu. | Une préparation commune par occurrence partagée, distincte des préparations privées. Administrateur/organisateur crée et attribue ; membres ajoutent leurs tâches et modifient celles qui leur sont assignées. Départ libère les affectations ; états métier ne prouvent ni achat externe ni envoi. |
| Commentaire et historique de coordination | Auteur pour son texte ; cercle pour l’espace et les transitions métier. | Même périmètre que la préparation partagée. | Commentaire attaché à l’événement, pas de chat général. Auteur modifie/retire son texte, administrateur peut modérer sans le réécrire à sa place. Historique minimal : action/date, sans contenu des messages, notes, montants ou valeurs avant/après. Effets de départ/effacement en V3. |
| Liste d’envies et envie | Compte bénéficiaire. Titre, lien facultatif, estimation/devise, préférence ; quantité demandée positive, défaut 1. | Privée par défaut ; amis sélectionnés ou un cercle choisi, modes exclusifs au noyau. Aucun lien public. | Propriétaire modifie ses envies. Changement de portée retire l’accès des anciens lecteurs. Nouveau membre d’un cercle autorisé selon cette portée après acceptation ; les futurs amis doivent être sélectionnés. Effacement de l’envie clôt ses réservations sans révéler leur existence au bénéficiaire. |
| Réservation discrète | Compte réservant ; envie et quantité, droits actuels sur la liste et contexte de participation. | Réservant pour ses données ; autres participants autorisés pour disponibilité/quantités seulement. Bénéficiaire exclu, même propriétaire de la liste ou administrateur du cercle. | Au plus la quantité demandée en réservations actives ; acquisition atomique, annulation et marqueur « acheté » manuel. Pas d’expiration automatique initiale ; libération sur départ, retrait d’accès ou suppression. Aucun achat marchand ni paiement exécuté. |
| Carte collective et contributions | Cercle pour carte ; organisateur responsable de publication ; chaque auteur possède son texte et sa signature. | Brouillon aux organisateurs/contributeurs actifs autorisés, jamais au bénéficiaire. Après publication : version limitée par lien. | Contributions connectées seulement, une contribution par auteur/carte initialement. Auteur édite avant fermeture ; organisateur choisit mise en page, masque/retire sans usurper. Fermeture bloque les éditions ; publication atomique fige les contributions retenues. Retrait/effacement suit V3. |

Les demandes en attente expirent après sept jours. À clôture, conserver seulement la relation acceptée ou le blocage actif nécessaire ; ne pas constituer un historique des demandes refusées ou annulées. Retirer l’amitié efface sa relation et ses droits dépendants. Débloquer efface le blocage, sans recréer de relation. Les droits de lien révoqués ou expirés ne sont plus utilisables, même si leur référence technique reste nécessaire jusqu’au nettoyage de leurs dépendances.

Une invitation de cercle appartient au cercle et désigne un administrateur émetteur et un compte invité. Seuls cet administrateur encore autorisé et l’invité lisent sa présentation minimale (nom du cercle et identité choisie de l’émetteur), sans liste des membres ni préparatifs. Elle expire après sept jours, peut être révoquée et n’accepte qu’une adhésion du compte ciblé ; supprimer son état en attente à clôture. Posséder un lien sans être ce compte ne donne aucun droit. L’invité authentifié peut accepter/refuser sa propre invitation avant d’être membre ; ce droit ponctuel n’est pas le droit de lecture du cercle dans la matrice.

Une publication dans un cercle ne transforme jamais une préparation privée en espace partagé. Les champs nécessaires sont choisis et prévisualisés ; aucune copie de `contacts.note`, coordonnées, budget privé, idée privée ou historique de cadeaux. Une idée peut être proposée au groupe par **nouvelle contribution explicitement sélectionnée**, sans exposer la fiche d’origine. Les montants personnels restent privés, sauf note de coordination volontaire dont l’auteur accepte la visibilité de groupe.

### Surprises et réservations : exclusion réelle

L’événement surprise référence explicitement son bénéficiaire. S’il a un compte, son identifiant est une exclusion obligatoire. Les autres organisateurs sont des membres actifs explicitement autorisés. **L’exclusion du bénéficiaire prime le rôle administrateur et tous les droits de membre sur ces préparatifs.** Il peut lire le cercle ordinaire et ses propres envies, sans voir les organisateurs de la surprise, tâches, commentaires, budgets, cartes brouillons, réservations ou historiques secrets. Il ne peut se promouvoir organisateur ou modifier cette exclusion. Un autre administrateur autorisé gère ce contexte ; aucun espace surprise pour soi-même.

Si le bénéficiaire n’a pas de compte, utiliser une désignation choisie pour l’événement, sans publier sa fiche privée. Lors d’une association ultérieure à un compte, valider l’identité et retirer tout droit incompatible dans la même opération ; en cas d’incertitude, suspendre le partage secret jusqu’à clarification. Pas de rapprochement automatique par email. Proposition à valider en V2.

Les réservations sont séparées des lignes d’envies lisibles par leur propriétaire. Pas de booléen « réservé », compteur, identité de réservant, timestamp modifié par réservation ou agrégat exposé au bénéficiaire. Ses réponses, erreurs, export et notifications restent identiques, qu’une réservation existe ou non. Les participants autorisés peuvent apprendre la disponibilité, sans découvrir l’identité ou le budget d’un autre réservant. Réserver sa propre envie est refusé sans interrogation révélatrice.

Modifier une quantité ou retirer une envie s’applique sans réponse conditionnée par l’état secret : clôturer les réservations concernées et avertir uniquement les réservants encore autorisés. Un marqueur « acheté » ne prouve pas un achat et ne peut être conservé comme réservation d’une personne dont l’accès est révoqué. Libérer cette réservation n’annule pas un achat réel ; préciser ce risque de coordination aux participants, sans prévenir le bénéficiaire des réservations.

## 5. Matrices lecture/création/modification/suppression

**L** lire, **C** créer, **M** modifier, **S** supprimer/retirer/révoquer ; **—** aucun droit. S ne signifie pas forcément effacement physique immédiat : suivre le cycle de vie. « Propriétaire » désigne l’auteur ou responsable de l’objet, pas la personne décrite par un contact. Les colonnes ami/administrateur/membre n’accordent aucun droit sur une donnée privée d’autrui. Un autre utilisateur peut créer ses propres objets en devenant leur propriétaire.

Suffixes : **g** droit de partage explicite encore valide ; **t** lien de version publiée valide ; **a** seulement sa contribution ; **r** responsable actif/administrateur autorisé ; **o** organisateur autorisé non bénéficiaire ; **x** exclusivement acceptation/refus de sa demande ou départ de sa propre adhésion.

Les droits sont réévalués à chaque opération, y compris par API directe. Un ex-membre garde ses objets privés personnels ; il perd tous les droits fondés sur le cercle. Pour les ressources secrètes, l’exclusion destinataire l’emporte sur les autres colonnes. Aucun rôle n’autorise l’édition d’une version publiée en place.

### Données privées, partage individuel et social

| Ressource | Propriétaire | Ami accepté | Admin cercle | Membre | Destinataire surprise | Ex-membre | Visiteur avec lien |
|---|---|---|---|---|---|---|---|
| Contact, notes, listes et appartenances privées | LCMS | — | — | — | — | — | — |
| Événement/occurrence/préparation/tâche privée | LCMS | — | — | — | — | — | — |
| Idée, choix de cadeau, cadeau offert, dépenses, style privé | LCMS | — | — | — | — | — | — |
| Profil personnel privé et avatar enregistré | LCMS | — | — | — | — | — | — |
| Mon univers et droit associé | LCMS | Lg si étoile choisie | Lg si étoile choisie ou constellation autorisée | Lg si étoile choisie ou constellation autorisée | Lg, sans préparatifs | Lg si droit étoile ou autre constellation autorisée subsiste | — |
| Demande et relation d’amitié | LC ; S annuler/retirer, pas accepter sa demande | L ; Mx accepter/refuser si destinataire, S retirer | — par rôle de cercle | — par rôle de cercle | Même droit de participant social, sans surprise | Même droit de participant social indépendant | Aucun carnet/profil ; usage limité d’un lien social valide après authentification |
| Carte individuelle brouillon | LCMS | — | — | — | — | — | — |
| Version individuelle publiée et droit de lien | LC ; M/S révoquer ou republier | Lt | Lt | Lt | Lt | Lt si non révoqué | Lt, aucun C/M/S |
| Liste d’envies et envies du bénéficiaire | LCMS, sans réservation | Lg | Lg si cercle sélectionné | Lg si cercle sélectionné | LCMS sur sa liste, aucun secret | Lg seulement si partage ami indépendant subsiste | — |

Le lien social n’est pas le lien de carte : il propose une relation à un compte authentifié, puis cesse après acceptation/expiration/révocation. Un lien de carte ne permet aucune contribution ou demande implicite.

### Espace de cercle et données secrètes

| Ressource | Propriétaire/auteur | Ami accepté seul | Admin cercle | Membre actif | Destinataire surprise | Ex-membre | Visiteur avec lien |
|---|---|---|---|---|---|---|---|
| Métadonnées du cercle | LCMSr | — | LMSr ; création de son propre cercle possible | L | L comme membre, sans surprise | — | — |
| Adhésions, pseudonymes de membres | L ; M/Sr pour rôles/retrait | — | LCM/Sr pour inviter, rôle, retrait ; jamais accepter pour autrui | L ; M/Sx pour accepter invitation, identité choisie, quitter | Même périmètre ordinaire, pas liste secrète des organisateurs | — | — |
| Événement ordinaire, préparation et tâches partagées | LC ; M/Sa ou r selon attribution | — | LCMSr | L ; Ca ; Ma/Sa sur ses tâches, M sur tâche assignée | Même droit pour un événement ordinaire | — | — |
| Événement surprise, préparation et tâches secrètes | Même droit si o | — | Même droit seulement si o | Même droit seulement si o | —, même administrateur | — | — |
| Commentaires et historique de préparation | L ; Ca/Ma/Sa sur son commentaire, historique non réécrit | — | L ; Ca/Ma ; S pour modération, pas M du texte d’autrui | L ; Ca/Ma/Sa sur son commentaire | — sur surprise ; droit ordinaire ailleurs | — | — |
| Réservation et disponibilité | La/Ca/Ma/Sa pour réservant autorisé | Disponibilité si g ; La/Ca/Ma/Sa sur sa réservation | Même droit de participant ; aucun privilège sur secrets d’autrui | Même droit si g/o | —, même propriétaire de l’envie/admin | — ; réservation libérée | — |
| Carte collective brouillon/contributions | L ; Ca/Ma/Sa avant fermeture ; retrait possible après fermeture | — | Lo ; C/M mise en page si responsable ; S modération, pas M texte d’autrui | Lo ; Ca/Ma/Sa avant fermeture ; retrait possible après fermeture | — | — ; retrait automatique au départ proposé V3 | — |
| Version collective publiée et lien | Lo pour gestion si encore membre ; retrait de sa contribution selon V3 | Lt | LCo ; M/S révoquer/republier si responsable | Lt ; aucune édition en place | Lt uniquement après publication | — par ancien rôle ; Lt uniquement pour version ne contenant plus sa contribution et droit non révoqué | Lt, jamais accès au cercle ni contribution |

Pour un événement ordinaire, seul son auteur organisateur ou un administrateur le modifie/efface ; un membre crée son propre événement ou sa tâche, pas celui d’autrui. Affecter une tâche à un autre membre exige le droit d’organisation. L’historique est produit par le serveur, jamais par écriture de fausses actions côté client. Retirer une contribution après fermeture n’autorise pas à la réécrire : appliquer la procédure de révocation/republication, section 7.

### Garanties à traduire lors du lot SQL

- Identité authentifiée, propriétaire et contexte de visibilité vérifiés ensemble. Les références doivent interdire une appartenance liste/contact de propriétaires différents, une préparation sur une occurrence inaccessible, une tâche/contribution hors cercle et une réservation sans droit actuel.
- Contraintes et transitions atomiques : identité d’occurrence/préparation, paire d’amitié, acceptation d’adhésion, quantité réservée et publication d’une carte fermée. Aucune séquence « lire puis écrire » côté navigateur ne suffit en concurrence.
- Données publiques limitées par contrat : profil partagé distinct, signatures publiées distinctes, réservations distinctes des envies. Masquer une colonne dans l’UI ou limiter un `select` applicatif ne protège pas une lecture directe. Les [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) filtrent des lignes : concevoir aussi les frontières de colonnes/ressources et les droits de lecture.
- Fonctions privilégiées : privilèges minimaux, droits `EXECUTE` explicites, identité et ressources contrôlées, `search_path` sûr ; pas de `SECURITY DEFINER` pour contourner une erreur. [Documentation des accès privilégiés](https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0028_anon_security_definer_function_executable). Pas de RLS de membres se réinterrogeant récursivement sans stratégie vérifiée.
- Export, agrégats, Realtime, notifications, recherche, fichiers et réponses d’erreur respectent le même droit. Une liste vide ou un refus générique pour le bénéficiaire ne confirme pas l’existence d’une surprise. Révocation prise en compte avant chaque lecture/écriture et au départ d’une réponse ; invalider les abonnements et données client correspondants. Pas d’autorisation uniquement dans un JWT ancien ou un état UI.
- Aucun contenu personnel, secret de lien ou détail de surprise dans le cache public PWA, les métadonnées sociales, journaux et mesures d’usage. Les nouveaux écrans peuvent offrir le secours hors ligne explicite ; aucun carnet privé hors ligne promis.

## 6. Cas ambigus tranchés et validation humaine

| Cas | Choix du modèle |
|---|---|
| Plusieurs proches ou listes pour la même personne | Fiches indépendantes par compte ; appartenance multiple au sein d’un carnet. Aucun rapprochement global par email, aucune fusion automatique. |
| Même occasion deux fois dans l’année | Deux événements ponctuels explicitement créés ou deux séries distinctes ; pas deux occurrences de la même série pour le même cycle. |
| Une idée réutilisée ou offerte deux années | Idée durable ; deux choix/dons pour deux occurrences. Progrès et dépenses ne traversent pas automatiquement l’année. |
| Cadeau acheté puis offert | Une dépense attachée au choix, référencée dans le don, sans duplication. « Offert » et « acheté » sont des déclarations manuelles distinctes. |
| Changement de prix, avatar, texte ou modèle | Estimation modifiable sans réécrire une dépense confirmée ; nouvelle version de carte, pas changement rétroactif d’une publication. |
| Amitié retirée mais cercle commun | Partage ami révoqué, adhésion de cercle distincte. Quitter le cercle est une action séparée, expliquée ; V4 à valider. |
| Envie modifiée alors qu’un cadeau est réservé | Ne pas révéler au bénéficiaire l’état de réservation par un refus d’édition. Mettre à jour et clôturer les réservations incompatibles atomiquement ; avertir les seuls réservants autorisés. |
| Carte publiée puis retrait d’un auteur | Version figée révoquée, contenu retiré selon V3 ; nouvelle publication explicite par le responsable. Une copie déjà téléchargée ne peut pas être effacée à distance. |

**Validations humaines avant les fonctionnalités concernées :**

| Décision | Proposition retenue pour la conception, encore à valider | Lot et conséquence en attente |
|---|---|---|
| V1 — Consentement au partage | Mon univers séparé des notes, champs choisis pour étoiles ou constellations autorisées selon l’orientation utilisateur du lot 03 ; liaison contact/compte consentie des deux côtés ; portée unique privée/amis choisis/cercle pour envies. | Avant SQL social et lots 10–12 : valider le contrat précis de champs, destinataires et révocation. Aucune lecture du profil privé, publication automatique ou transmission IA implicite. |
| V2 — Publication et surprises | Lecture de carte par possession d’un lien transférable, expirant et révocable ; signatures/avatars choisis explicitement. Exclusion du bénéficiaire liée à son compte, supérieure au rôle administrateur. | Avant SQL cartes/social et lots 08, 11–13. Les contenus publics par lien et la séparation des secrets doivent être validés comme changements de confidentialité. Un ex-membre peut encore lire une version par un lien valide indépendant de son ancien rôle ; aucun lien collectif contenant sa contribution retirée ne reste valide. |
| V3 — Devenir des contributions | Départ/retrait d’un membre supprime ses commentaires, signatures et contributions ; conserve seulement l’état neutre utile des tâches. Révoquer les versions contenant une contribution retirée, puis republier sans elle si souhaité. Suppression du compte suit la même règle, sans garder son identité sous un simple pseudonyme. | Avant lots 11–13. Le départ d’un signataire peut casser un lien déjà distribué ; informer tous les auteurs à la contribution et le responsable à la publication. Ne pas conserver arbitrairement des textes personnels « anonymisés » qui pourraient encore identifier l’auteur. |
| V4 — Blocage et administration | Blocage coupe les relations directes, sans expulser un membre d’un cercle indépendant ; le cercle commun reste annoncé. Dernier administrateur : transfert accepté ou dissolution explicite ; suppression de son compte sans transfert dissout le cercle. | Avant lot 10 pour blocage, puis 11. Valider la portée du blocage et la suppression possible de données partagées lors d’une dissolution. Aucun transfert forcé ni cercle sans responsable actif. |

La création des prochains schémas, les reprises des anciennes naissances et les FK/cascades nécessitent aussi la validation humaine prévue par AGENTS.md : voir le prochain dossier SQL. Aucun changement physique n’est décidé comme déjà compatible. Les durées des fournisseurs, logs et sauvegardes restent [à confirmer](../p3-confidentialite-a-confirmer.md) ; aucune durée réglementaire ou garantie d’effacement de sauvegarde n’est inventée.

## 7. Révocation, départ, export et effacement

### Retrait de droits et conservation utile

| Action | Accès coupé et tâches à arrêter | Données conservées ou retirées selon les propositions ci-dessus |
|---|---|---|
| Retrait d’amitié, blocage ou partage de profil retiré | Droits directs du profil, envies partagées aux amis et liaison/projection ; demandes en attente annulées si blocage. Réservations dont ce partage est l’unique droit libérées. | Carnets et notes privés indépendants préservés ; aucun nouveau droit après déblocage. Cercle commun séparé selon V4. |
| Départ ou retrait du cercle | Lecture/écriture/export/Realtime de toutes ses ressources de cercle à la requête suivante, invitations émises devenues inautorisées et nouveaux rappels de groupe ; réservations de ce contexte libérées. | Préparations/idées privées préservées. Affectations de tâches libérées ; remplacer le contenu personnel retiré par une tâche neutre sans auteur identifiable, ou retirer la tâche si elle n’a pas de sens sans son contenu. Commentaires, signatures et contributions retirés ; versions associées révoquées selon V3. |
| Départ du dernier administrateur | Transfert à un membre qui accepte, avant départ ; sinon confirmation de dissolution. | Dissolution : effacer l’espace et ses dépendances, révoquer ses publications/liens et arrêter ses tâches ; pas d’effacement des carnets privés des membres. Suppression du compte sans transfert accepté suit la dissolution proposée V4. |
| Retrait d’une contribution collective | Auteur demande le retrait, ou modération par responsable ; aucune réécriture de sa voix. | Retirer du brouillon ; si publiée, révoquer d’abord toutes les versions concernées, enlever contenu/signature/identité puis permettre une nouvelle publication avec les auteurs restants. Les autres contributions ne sont pas supprimées. |
| Révocation, remplacement, expiration ou suppression d’une carte | Lecture par ancien secret coupée ; tâches d’envoi encore en attente annulées. Aucun email pris en charge ne peut être « désenvoyé ». | Révocation seule garde le brouillon privé ; suppression efface brouillon, versions et droits, puis les fichiers éventuels. Un lien remplacé n’accède ni à l’ancienne version ni à la nouvelle. |
| Suppression d’une envie/changement de visibilité | Anciens lecteurs exclus ; réservations dépendantes clôturées, sans réponse révélatrice au bénéficiaire. | Dépenses/cadeaux privés déjà déclarés par un acheteur restent ses données ; aucune donnée secrète de réservation ajoutée à l’export du bénéficiaire. |

Une nouvelle adhésion après départ ne restaure pas les anciennes permissions, contributions ou réservations. Elle ouvre seulement le contenu actuellement visible à ce rôle, à l’exception de toute surprise dont le compte est bénéficiaire. Les autorisations sont vérifiées à la réservation et à chaque modification, pas seulement au moment de l’invitation.

Si le responsable d’une carte ou d’un événement secret part, transférer cette responsabilité à un organisateur actif non bénéficiaire qui accepte. À défaut, suspendre la publication et révoquer les liens encore actifs de cette carte ; aucun administrateur bénéficiaire ne récupère les préparatifs secrets. La reprise exige un nouveau responsable autorisé. Le transfert ne conserve pas les contributions personnelles retirées selon V3.

### Export

Chaque nouveau lot persistant étend l’export versionné et documente son périmètre. Pour le propriétaire : contact/notes, listes, dates/règles/occurrences, préparations/tâches/messages privés, idées/choix/dons/montants, styles, avatar, profil partagé et ses choix d’accès, cartes/contributions qu’il possède, demandes/relations qui le concernent et ses propres réservations encore autorisées.

Pour un cercle, un membre peut exporter ses contributions et les métadonnées non sensibles nécessaires à les situer **uniquement tant qu’il y a accès**. Aucun export global du carnet ou des secrets d’autres membres ; un administrateur n’obtient pas les profils privés ou réservations d’autrui. Un ex-membre n’a pas un accès d’archive au groupe. Ses données privées indépendantes restent exportables. L’export du bénéficiaire comprend ses envies, jamais les réservations, identité des organisateurs, carte brouillon ou compteurs secrets.

Exclure tokens, clés, données de session, réponses de fournisseur et identités privées d’autrui. Une copie de carte publiée exportée n’emporte pas un droit de lecture du cercle. Réévaluer l’autorisation et le compte pendant l’export ; si un droit est retiré ou une page échoue, ne pas télécharger un résultat présenté comme complet. Indiquer si l’export n’offre pas un instantané transactionnel, comme aujourd’hui.

### Suppression de compte

Politique proposée V3/V4 : interrompre les nouveaux traitements de ce compte, retirer ses droits/adhésions/relations et invitations sociales, libérer ses réservations, révoquer les liens de ses cartes individuelles et les versions collectives contenant ses contributions ; retirer contenu et signatures associés. Les cercles dont il n’est pas le dernier administrateur restent sous leurs autres responsables. Sans transfert accepté pour un cercle qu’il est seul à administrer, le dissoudre explicitement selon V4.

Effacer ses objets privés et les nouvelles données/fichiers associés. Conserver seulement les états collectifs non personnels nécessaires aux autres membres, pas son pseudonyme, avatar ou texte sous prétexte d’anonymisation. Enlever les projections de son profil partagé chez autrui. **Ne pas supprimer les fiches et notes privées saisies indépendamment par les autres utilisateurs** : détacher l’association au compte supprimé, sans synchronisation ni droit de consultation résiduel. Les contributions des autres auteurs restent sous leurs droits, sauf dissolution de leur espace.

Le dossier SQL doit rendre cohérents ces effacements, références et annulations, traiter les erreurs/reprises et bloquer la course avec une nouvelle écriture. Un succès n’est annoncé qu’après nettoyage vérifié ; aucun faux « tout ou rien » avec les appels séparés actuels. Les limites actuelles d’effacement et les sauvegardes externes restent documentées. Toute recette réelle d’effacement se fait sur comptes de test explicitement autorisés ; aucun compte réel supprimé au lot 01.

## 8. Extensions par lots et prochaine préparation SQL

| Tranche | Minimum à ajouter au moment du lot | Réutilisation et préalables |
|---|---|---|
| Privé — 02 | Contrat naissance partielle/fête, événements/règles et identité d’occurrence ; opt-out de rappel par événement qui suspend ce seul événement sans changer les préférences globales. | Dates civiles/saints/préférences existantes, pas d’année sentinelle ; projet cible et contrat historique confirmés. Aucun schéma de cercle dans ce dossier. |
| Privé — 03 puis 04–05 | Listes et appartenances ; préparations/tâches/brouillons par occurrence ; idées/choix/dons/montants. | Contacts privés existants, pagination et générateurs minimisés. Export/effacement et garanties d’unicité/possession par lot. |
| Facultatif — 06–07 | Styles et choix personnels, tri local des suggestions. | Quota sécurisé après C2 ; aucun envoi de notes/historique. Pas de schéma marchand ni API commerciale implicite. |
| Cartes — 08–09 | Brouillon/version publiée/droit par lien, puis configuration avatar versionnée. | V2 validée, publication cohérente et révocation ; Storage traité uniquement si nécessaire et validé. Aucun social ajouté pour rendre un lien lisible. |
| Social — 10 | Profil partagé et autorisations, liens sociaux/demandes/paire acceptée/blocage, association consentie au contact. | V1/V4 validées, C1/C2 ; pas de lecture globale de `profiles`, pas de détournement des invitations de fiches. |
| Collaboration — 11 puis 12–13 | Cercle/adhésions, événements/préparations/tâches/commentaires partagés ; envies et réservations séparées ; cartes collectives et contributions. | Matrices et V1–V4 validées ; refus destinataire/ex-membre directs et tests de concurrence. Chaque dossier ajoute seulement les objets de son lot. |
| Livraison — 14 ; recette — 18 | Liaison à file durable confirmée, puis contrôle complet des droits, persistance et parcours. | C5 du lot 00 ; aucune promesse de livraison avec une procédure SQL seulement proposée. Pas de paiement, cagnotte, chat général ou contribution anonyme dans ce modèle initial. |

**Prochaine action : valider et tester les dossiers SQL préparés des lots 02 et 03**, puis appliquer manuellement chaque contrat retenu et le confirmer en lecture seule avant son intégration applicative. Le lot 03 peut avancer indépendamment du lot 02. La conception des cartes/social ne bloque pas ces tranches privées. Ne pas préparer toutes les tables de la feuille de route ; ne pas modifier `supabase/migrations/**` ou les types pour faire semblant que ces contrats existent.

## 9. Jeu fictif et scénarios de recette attendus

Ce jeu est descriptif ; aucun compte, UUID, lien secret ou envoi n’est créé. Les identifiants ci-dessous sont des noms de fixtures, pas des valeurs à injecter en production.

| Fixture | Données et droits |
|---|---|
| Compte A — Léa | Contact privé CA « Malo », naissance 12/04, année inconnue, note « Préfère les sorties calmes ». Listes Famille et Amis proches ; CA dans les deux. |
| Compte B — Malo | Ami accepté de A après demande de A et acceptation de B. Partage à A son pseudonyme et jour/mois ; email/année/notes non partagés. Association CA/B consentie ; aucune note de A visible par B. |
| Compte C — Inès | Administratrice du cercle « Atelier avril », avec A comme membre organisatrice, B comme membre bénéficiaire de la surprise et D comme autre participant. |
| Compte D — Noé | Membre puis ex-membre de ce cercle pour tester la révocation ; ami de B seulement s’il est explicitement indiqué par le scénario. |
| Série SA et occurrences OA27/OA28 | Anniversaire de CA : cycle 2027 au 12/04/2027 et cycle 2028 au 12/04/2028. Préparation PA27, cadeau choisi « Billet expo », estimation 20 EUR ; PA28 créée ensuite, aucune tâche cochée. |
| Idée IA et don DA | Idée privée sans événement « Billet expo ». Don DA pour OA27, dépense réelle 18 EUR le 10/04/2027, don déclaré le 12/04. Budget : 18 EUR dépensés, pas 36 EUR en comptant choix et don. |
| Événement ponctuel EP | « Sortie commune », 20/06/2027, une occurrence ; aucune apparition automatique en juin 2028. |
| Occurrence partagée OC27 | Publication explicite dans le cercle de « Anniversaire de Malo » et date, avec A/C/D organisateurs, B exclu. Pas de CA, note ou budget privés dans la réponse partagée. |
| Envie WB et réservation RD | Liste de B partagée au cercle : « Livre illustré », quantité 1. D réserve ; A voit l’indisponibilité sans l’identité de D. B voit la même envie avant/après réservation. Départ de D libère RD. |
| Carte KC et publication VC | Carte collective sur OC27 : A écrit son texte, D le sien. Fermeture puis publication avec signatures choisies ; lecture par lien valide limitée à VC. Départ de D retire sa contribution et révoque VC selon V3 ; nouvelle publication sans D si C la confirme. |
| Visiteur V | Détenteur d’un droit de lecture de carte valide ; aucun droit de cercle, de brouillon, d’export ou de contribution. |

### Scénarios positifs et refus à vérifier dans les lots d’implémentation

1. **Isolation privée :** B ami, C administratrice et V avec lien ne lisent ni CA/notes, ni IA, PA27, budget ou export de A. Changer un identifiant dans une API ne donne aucun droit.
2. **Listes :** A classe CA dans deux listes ; supprimer l’une garde CA et l’autre appartenance. Rattacher le contact de B à la liste de A est refusé, même par écriture directe.
3. **Dates :** naissance partielle sans âge, 29 février en 2027 → 1er mars, en 2028 → 29 février ; aucune donnée 1900 convertie seule. EP ne réapparaît pas l’année suivante.
4. **Identité et concurrence :** deux créations simultanées de OA27/PA27 donnent le même objet ; date corrigée au 13 avril garde son identifiant et ses tâches. OA28 est nouvelle et sans coches. Arrêt de SA conserve l’historique et arrête les cycles futurs.
5. **Historique cadeau :** choix acheté puis don DA compte une seule dépense ; absence de prix reste inconnue ; devises différentes restent deux totaux. Le don n’envoie aucun texte à l’IA.
6. **Amitié :** A n’accepte pas sa propre demande au nom de B ; lien expiré/révoqué/rejoué refusé, demandes croisées sans double paire. Révoquer le partage de B retire la projection chez A, pas sa note privée. Même email ne crée ni lien de compte ni révélation d’existence.
7. **Adhésion :** C invite, D accepte pour lui-même ; C ne peut accepter pour D. Retrait de D coupe toutes les lectures/écritures/Realtime de cercle ; une demande ou JWT précédemment valide ne suffit plus. Une nouvelle adhésion ne ressuscite pas RD ou les contributions retirées.
8. **Surprise :** B ne lit pas OC27, tâches, commentaire, carte brouillon ni organisateurs via API, agrégats, export ou notification. Le même refus persiste si B est administrateur. C/A ne publient pas la note privée de CA par association indirecte.
9. **Réservation concurrente :** A et D réservent la dernière unité ; un seul succès. B reçoit les mêmes champs/compteurs/statuts d’édition et d’export avant/après ; sa tentative de consulter/réserver sa propre envie ne sonde pas la réservation. D parti ne modifie plus RD.
10. **Carte :** V lit VC valide, jamais KC brouillon ou le cercle. Un secret révoqué/expiré ou un autre identifiant de version est refusé. Texte hostile rendu comme texte, sans exécution ; avatar futur de A ne change pas VC.
11. **Contribution :** A ne réécrit pas le texte de D ; C peut le retirer sans le signer sous son nom. Édition après fermeture refusée. Publication concurrente avec retrait produit une version cohérente ou échoue, jamais une publication contenant un contenu déjà retiré.
12. **Départ/effacement :** retrait de D révoque VC avant toute nouvelle lecture et nettoie son texte/signature ; les autres contributions restent. Suppression de C avec seul rôle administrateur exige transfert accepté ou dissolution selon V4. Supprimer A ne supprime pas les notes indépendantes d’autrui ; aucun lien ou traitement actif de A ne subsiste.
13. **Export et panne :** bénéficiaire sans réservations ; ex-membre sans archive de groupe ; export coupé si compte/droit change ou lecture échoue. Aucun fichier partiel présenté comme complet. Vérifier aussi les accès indirects aux fichiers et aux notifications.

Ces scénarios sont une recette attendue, **pas des tests exécutés**. Les tests futurs doivent exercer les comportements et rôles clients sur une copie de test, y compris concurrence/persistance ; une recherche de chaîne dans un fichier ou un appel admin seul ne valide pas les permissions. Les seules vérifications du lot 01 sont la cohérence documentaire, les références locales et l’absence de modification applicative/distance. Les preuves d’exécution du lot 00 restent dans le suivi, sans les présenter comme une validation de ce modèle futur.

## Amendement de consentement demandé le 6 octobre 2026

Lors de l'intégration des lots 04/05, l'utilisateur demande une personnalisation IA facultative par champ, puis confirme le périmètre : prénom, âge calculé et note du contact. Cela autorise une exception explicite à la minimisation précédente pour ces trois champs uniquement. Les cases sont décochées par défaut et remises à zéro après chaque demande ; le serveur relit uniquement le contact du compte authentifié, puis transmet seulement les valeurs cochées à Mammouth AI. Aucune préférence globale ni table de consentement n'est ajoutée dans cette version. Les coordonnées, la naissance exacte, les idées privées, réactions, budgets et brouillons restent exclus. Voir la [recette applicative des lots 04/05](lot-04-05-recette-app.md).

## Décisions des lots 06/07 — 6 octobre 2026

- Trois objets privés de styles au [lot 06](lot-06/README.md), et catégories de cadeaux par contact au [lot 07](lot-07/README.md). Les contrats sont désormais installés par l'utilisateur et confirmés par l'assistant en lecture seule. Types réels régénérés, sauvegardes et affectations intégrées localement ; export version 5. Les simulations applicatives ne remplacent pas la recette authentifiée sur la cible.
- L’utilisateur choisit des **idées à rechercher seulement**, sans catalogue de produits. Les intérêts sont destinés à une sauvegarde explicite par contact puis à un tri local, sans extraction des notes ni transmission de l’historique.
- L’utilisateur autorise explicitement l’envoi du **plafond de recherche saisi et de sa devise** à Mammouth AI. Ce paramètre temporaire n’est ni un plafond enregistré, ni une dépense, ni le budget lot 05 ; il ne garantit aucun prix marchand. Les cinq devises existantes restent séparées.
- Longueur, tutoiement/vouvoiement, emojis et mode cadeau sont des options fermées. Nom du style et signature restent locaux ; la signature est ajoutée une fois au résultat final, sans modifier les anciens messages. Tous les tons restent gratuits.
- Le consentement personnel reste limité au prénom, âge calculé et note du contact, par demande et remis à zéro. Cocher la note autorise son contenu (maximum 4 000 caractères), pas une prétendue garantie sur l’entraînement du fournisseur ; la notice invite à vérifier ce contenu. Les autres champs et autres notes restent exclus.
