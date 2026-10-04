# Plan d’évolution Ephemer — fonctionnalités et prompts Codex

Document préparé le 4 octobre 2026 à partir de la discussion produit et du dépôt local.

Objectif : développer des fonctionnalités utiles, les proposer gratuitement au lancement, puis décider lesquelles méritent une offre premium ou des achats cosmétiques après observation de leur usage. Ce document prépare le travail ; il ne lance aucune implémentation, aucun changement Supabase et aucun paiement.

## 1. Direction produit

Ephemer aide à préparer une attention personnelle au bon moment : retrouver une idée, choisir un cadeau, écrire un message, créer une carte et organiser les préparatifs avec ses proches.

Trois distinctions structurent le projet :

- **Contact personnel** : fiche privée gérée par son propriétaire, y compris pour une personne sans compte Ephemer.
- **Ami Ephemer** : relation acceptée entre deux comptes, avec des informations explicitement partagées.
- **Cercle** : groupe privé de comptes qui participent à des événements et préparatifs communs. Une liste personnelle de contacts n’est pas automatiquement un cercle partagé.

Au lancement, conserver un socle gratuit utile. Les limites techniques de coût et de prévention des abus restent nécessaires, même sans offre payante. Les nombres de contacts, quotas et prix évoqués dans la discussion sont des hypothèses, pas des décisions déjà prises.

Première expérience cible : depuis le prochain anniversaire d’un contact, ouvrir sa fiche de préparation, enregistrer une idée cadeau, préparer un message et retrouver les éléments après reconnexion. Puis ajouter une carte signée par son avatar. Le partage à plusieurs vient ensuite.

## 2. Ordre de réalisation

| Lot | Livrable | Dépendances | Priorité |
|---|---|---|---|
| 00 | État réel, corrections restantes et suivi | Aucune | Préalable |
| 01 | Modèle métier et règles de visibilité | 00 | Préalable |
| SQL | Dossier de schéma pour le lot choisi ; validation humaine | 01 puis à répéter selon le lot | Préalable à la persistance |
| 02 | Dates personnelles, naissance partielle, fête choisie | Schéma de dates validé | Socle |
| 03 | Listes personnelles de contacts | Schéma privé validé | Première version |
| 04 | Fiche de préparation d’un événement | 02 | Première version |
| 05 | Boîte à idées, historique et budget | 04 | Première version |
| 06 | Styles de messages personnels | Schéma privé validé, garde IA existant | Première version, facultatif |
| 07 | Suggestions cadeaux plus utiles | 05 | Première version, facultatif |
| 08 | Cartes virtuelles individuelles | 04, schéma cartes et partage validé | Deuxième version |
| 09 | Avatar personnalisable et signature | 08 | Deuxième version |
| 10 | Amitiés entre comptes | Schéma social validé | Troisième version |
| 11 | Cercles privés et préparatifs partagés | 04, 10 | Troisième version |
| 12 | Listes d’envies et réservation de cadeaux | 10, 11 | Troisième version |
| 13 | Cartes collectives | 08, 09, 11 | Troisième version |
| 14 | Programmation fiable des cartes | 08, socle de livraison réellement validé | Après fiabilisation des envois |
| 15 | Constellation, objectifs et collections gratuites | 04, 09 | Expérimentation |
| 16 | Mesure d’usage et amélioration | Instrumenter progressivement dès 04 | Transversal |
| 17 | Décision premium et achats cosmétiques | Résultats de 16 | Plus tard, pas de paiement maintenant |
| 18 | Recette complète et préparation de livraison | À répéter à chaque version | Transversal |

Ne pas exécuter tous les prompts d’un coup. Livrer une version utilisable, la vérifier, puis poursuivre. Le numéro donne un ordre pratique ; les lots facultatifs peuvent attendre.

**Point de décision après 05** : les utilisateurs enregistrent-ils des idées et reviennent-ils préparer leurs événements ?

**Point de décision après 09** : créent-ils des cartes, les partagent-ils et utilisent-ils leur avatar ?

**Point de décision après 13** : invitent-ils réellement d’autres personnes à participer ?

## 3. Cadre commun à tous les prompts

Chaque prompt ci-dessous renvoie à cette section. Codex doit la relire au début du lot.

1. Lire `AGENTS.md`, les instructions applicables et l’état Git. Préserver les modifications présentes et ne jamais créer de commit. Travailler uniquement sur le lot demandé.
2. Lire les fichiers réels avant de proposer une structure. `AUDIT-GLOBAL-2026-10-04.md` décrit un état historique ; `AUDIT-CORRECTIONS.md`, `docs/corrections-p2.md` et le code peuvent contenir des avancées ultérieures. Vérifier ce qui est encore vrai.
3. Lire les documents Next.js 16 locaux pertinents avant de modifier du code Next. Pour Supabase et les fournisseurs externes, consulter les compétences applicables et leur documentation officielle actuelle.
4. Ne pas ajouter de dépendance, modifier les secrets ou déployer. Ne pas envoyer d’e-mail réel, supprimer un compte réel ou déclencher un appel IA facturé dans une recette automatique. Préparer les essais réels avec leur environnement et destinataire de test explicites ; respecter les validations exigées par AGENTS.md.
5. **Base de données : aucune application de SQL distant et aucune modification de `supabase/migrations/**`.** Préparer les changements dans un dossier de revue distinct sous `docs/evolution/`. L’utilisateur les valide et les applique dans le dashboard Supabase. Une procédure proposée n’est pas une procédure installée. Vérifier en lecture seule le schéma appliqué avant d’en dépendre. En l’absence de preuve, livrer seulement les parties indépendantes et indiquer précisément ce qui reste bloqué.
6. Ne pas fabriquer de tables, colonnes, RPC ou statuts dans le code pour faire passer la compilation. Mettre à jour les types après confirmation du contrat réel. Réutiliser les protections de session, quotas, pagination, dates civiles et livraison déjà présentes.
7. Interfaces françaises, mobile-first, cohérentes avec les thèmes et composants existants. Prévoir chargement, vide, erreur, refus d’accès, saisie conservée et action réussie. Navigation au clavier, labels, focus et réduction des animations. Réutiliser notamment le composant modal existant s’il convient.
8. Les données privées ne doivent pas entrer dans le cache public du service worker, les métadonnées sociales, les journaux ou l’analytique. Le fonctionnement hors ligne peut être une vue de secours explicite ; ne pas promettre un carnet privé hors ligne si aucun stockage sécurisé n’est conçu.
9. Chaque ressource doit être autorisée côté serveur et/ou par des règles de base adaptées, même si l’utilisateur appelle directement l’API. Un contrôle dans l’interface ne suffit pas. Les contrôles serveur utilisant un client admin doivent vérifier explicitement l’identité et le droit sur la ressource.
10. Une carte consultable sans compte exige un lien secret validé côté serveur, limité à son contenu publié, révocable et éventuellement expirant. Ce n’est pas une ouverture anonyme des tables privées. Les opérations de création, édition, publication et partage restent authentifiées. Documenter cette lecture par lien comme une exception fonctionnelle précise aux routes privées habituelles.
11. Toutes les fonctions nouvelles sont gratuites durant cette phase. Ne pas introduire de paiement, paywall, monnaie virtuelle, abonnement fictif, badge de livraison fictif ou promesse de push opérationnel. Maintenir des protections de coût réelles côté serveur.
12. Exécuter les vérifications adaptées : lint, TypeScript sans émission, tests existants pertinents et tests métier/sécurité du lot ; build aux étapes de livraison. Utiliser les outils déjà présents sans ajouter de framework. Pour une vraie modification visuelle, effectuer une recette navigateur mobile et desktop si les outils le permettent. Distinguer tests simulés, tests réels et vérifications impossibles.
13. Ne pas écrire de tests qui ne font que chercher une chaîne dans un fichier pour conclure à la sécurité. Tester les comportements, les refus, la concurrence et la persistance lorsque cela compte. Les tests simulés ne prouvent pas que les RLS distantes sont correctement installées.
14. Créer ou compléter `docs/evolution/SUIVI.md` : lot, décisions, fichiers, schéma confirmé, contrôles, résultats, limites et prochaine étape. Expliquer en français quoi, pourquoi et risque ; fournir les fichiers complets selon AGENTS.md. Ne jamais déclarer un lot terminé si sa persistance, son autorisation ou son parcours principal ne fonctionne pas.

## 4. Comment utiliser les prompts

Copier un seul bloc dans une conversation Codex ouverte sur ce dépôt. Pour les lots importants, utiliser une conversation distincte après la validation du lot précédent. Ne pas lancer simultanément deux lots qui éditent le même code.

Les lots 00 et 01 sont un diagnostic et une conception. Le prompt SQL prépare un résultat à relire, sans l’appliquer. Les autres prompts demandent une implémentation locale dans les limites du cadre commun.

Les dossiers et noms de nouveaux documents ci-dessous sont des propositions de livrables. Ils ne désignent pas des tables ou fonctions déjà installées.

## Prompt 00 — Faire le point avant de commencer

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.

Prépare le démarrage de l’évolution produit Ephemer, sans modifier le code applicatif.
Lis AGENTS.md, l’état Git, l’audit historique, le suivi des corrections, les documents
Supabase disponibles et les fichiers nécessaires pour confirmer l’état actuel.

Classe les sujets : déjà livré, seulement simulé, SQL préparé mais non appliqué,
encore incomplet. Vérifie particulièrement session et autorisations, confidentialité IA,
quotas, suppression/export des données, préférences, invitations, cache PWA et envois.
Ne relance pas des corrections déjà résolues et ne présente pas l’audit ancien comme actuel.

Crée docs/evolution/SUIVI.md avec cette situation de départ, les commandes pertinentes
réellement disponibles et les préalables qui bloquent les prochains lots.
Présente un ordre de corrections ciblées à effectuer avant les fonctionnalités concernées.
N’applique aucun SQL, ne contacte aucun destinataire et ne corrige pas tout le dépôt dans ce lot.

Acceptation : les corrections restantes sont reliées à une preuve actuelle et à un lot
concerné ; les dépendances distantes non vérifiées sont identifiées explicitement.
```

## Prompt 01 — Définir les données et les permissions

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.

Conçois le modèle métier minimal pour les nouvelles expériences. Livrable :
docs/evolution/MODELE-METIER.md. Ne modifie pas le code applicatif ni le schéma distant.

Distingue contact privé, ami accepté, liste personnelle et cercle partagé.
Décris : événement récurrent et occurrence datée, préparation, idée cadeau, cadeau offert,
carte brouillon/publiée, avatar, demande d’amitié, membre de cercle, envie et réservation.
Réutilise les objets existants lorsque leur sens convient ; ne surcharge pas contacts.note.
Prévois des extensions par lots : privé, cartes, social, collaboration. Ne crée pas
le schéma de toute la feuille de route d’un coup.

Une préparation appartient à une occurrence : refaire apparaître un anniversaire l’année
suivante ne doit pas reprendre les coches « cadeau acheté » de l’année précédente.
Distingue les séries des événements ponctuels et identifie les occurrences sans doublons.

Produis une matrice lecture/création/modification/suppression pour propriétaire, ami,
administrateur de cercle, membre, destinataire de surprise, ex-membre et visiteur avec lien.
Sépare les notes privées et le profil partagé. Masquer une colonne dans l’UI ne la protège pas.
Définis départ de cercle, retrait d’amitié, révocation, export et suppression de compte,
y compris le devenir des contributions partagées et des liens publiés.

Décris les cas métier ambigus et tranche les choix réversibles simples. Signale seulement
les décisions de confidentialité ou de schéma qui exigent validation humaine.
Inclue un petit jeu de données fictives et les scénarios de refus attendus.
Acceptation : chaque donnée a un propriétaire, une visibilité et un cycle de vie explicites.
```

## Prompt SQL — Préparer le schéma du prochain lot, sans l’appliquer

À réutiliser avant chaque lot nécessitant de nouvelles données. Remplacer le numéro entre crochets par le lot choisi ; ce n’est pas un prompt d’application en production.

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Lot à préparer : [NUMÉRO DU LOT].

À partir du modèle métier approuvé et du schéma réel confirmé en lecture seule,
prépare uniquement les changements indispensables à ce lot dans docs/evolution/lot-NN/.
Si le schéma n’est pas accessible, indique les métadonnées nécessaires et ne fabrique
pas de procédure prétendument compatible.

Livre : schema-propose.sql, verification.sql, retour-arriere.sql et README.md.
Ne touche pas à supabase/migrations et n’exécute aucune mutation SQL distante.
Explique les nouvelles tables/colonnes, références, contraintes, indexes utiles,
droits minimaux et RLS par opération. Gère aussi les droits EXECUTE des fonctions,
leurs validations d’identité et leur search_path ; évite SECURITY DEFINER sans nécessité.
Pour le Storage, prépare également les règles d’accès et la suppression des fichiers.

Prévois les garanties atomiques requises par ce lot : unicité d’une relation d’amitié,
acceptation d’invitation, réservation de cadeau, publication ou récompense unique.
Pour les relations partagées, les foreign keys doivent empêcher de rattacher une donnée
à un contact, groupe ou événement inaccessible au demandeur.

Prépare des tests positifs et négatifs avec comptes fictifs sur un environnement de test :
propriétaire A, autre compte B, membre puis ex-membre, destinataire et visiteur non connecté.
Les tests doivent passer par les rôles client concernés, pas seulement par un admin.
Une RLS de cercle ne doit pas se réinterroger récursivement sans stratégie sûre.

Explique les données historiques concernées et une application progressive. Aucun retour
arrière ne doit effacer silencieusement les nouvelles données : préciser les sauvegardes
et les cas où le rollback ne peut plus être automatique.

Termine par un résumé concret à valider humainement. Arrête-toi avant application.
Après application manuelle, le prochain lot devra vérifier les contrats en lecture seule.
```

## Prompt 02 — Unifier les dates et les événements personnels

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 02 après confirmation de son schéma validé.

Permets un anniversaire connu par jour/mois avec année facultative, une fête prénomale
choisie parmi les correspondances existantes, et des dates personnelles : rencontre,
mariage, adoption, réussite ou événement libre. Une date personnelle est ponctuelle par
défaut ; l’utilisateur choisit explicitement une récurrence annuelle lorsque pertinente.

Réutilise lib/calendar-day.ts, lib/date-utils.ts et lib/name-days.ts après lecture.
N’invente aucune année de naissance. Ne convertis pas automatiquement les anciennes dates
ambiguës. L’âge n’apparaît que si l’année est connue. Conserve et explique la règle du
29 février existante, sauf décision produit explicitement validée.

Sauvegarde réellement les préférences dans le contrat approuvé. Utilise les mêmes
occurrences dans calendrier, dashboard, événements du mois, préparation et rappels.
Prévois renommage, modification de date et arrêt d’une série sans perdre l’historique.
Ajoute un masquage ou une suspension de rappel par événement si le contrat le prévoit.

Acceptation : tests de changement d’année, année bissextile, date partielle, fuseau Paris,
événement ponctuel non reconduit, fête choisie retrouvée après reconnexion et absence
de doublons d’occurrence. Les anciens contacts et rappels restent utilisables.
```

## Prompt 03 — Créer des listes personnelles de contacts

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 03 avec son schéma confirmé.

Ajoute des listes privées personnalisables : Famille, Amis proches, Collègues, etc.
Un contact peut appartenir à plusieurs listes. Une liste personnelle n’est ni un cercle
partagé ni une relation d’amitié entre comptes. Conserve relation et favoris existants.

Permets créer, renommer, supprimer une liste et ajouter/retirer des contacts.
La suppression d’une liste ne supprime aucun contact. Intègre le filtre aux contacts,
au calendrier et aux événements à venir, en réutilisant les filtres et pagination existants.
Sur mobile, garde une sélection claire sans multiplier les entrées de navigation.

Acceptation : appartenance multiple persistante après reconnexion, filtre combinable
avec recherche/favoris, listes vides, absence d’accès entre comptes, impossibilité de
rattacher le contact d’un autre propriétaire et messages explicites en cas d’erreur.
```

## Prompt 04 — Préparer une attention pour un événement

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 04 avec son schéma confirmé et les occurrences du lot 02.

Depuis dashboard, calendrier et fiche contact, ouvre « Préparer cet événement ».
Présente date, temps restant et actions facultatives : choisir un cadeau, préparer un
message, créer une carte lorsqu’elle sera disponible, prévoir un appel ou une sortie.
Prévois une option « sans achat ». L’utilisateur peut ajouter une tâche simple.

Réutilise les générateurs actuels et transmet leur contexte sans exposer les notes privées.
Avant le lot cartes, ne présente pas un bouton inactif comme une fonction livrée.
Sauvegarde progression et brouillons selon le modèle approuvé. « Message prêt »,
« cadeau acheté » et « e-mail livré » sont des états différents et ne s’impliquent pas.

Chaque préparation vise une occurrence précise. Conserve l’historique ; initialise
une préparation distincte pour l’année suivante. Permets abandonner ou réouvrir une tâche.

Acceptation : préparation retrouvée après reconnexion, modification d’un événement
correctement traitée, aucun faux état de livraison, aucune duplication de préparation,
aucun accès aux préparatifs d’un autre compte et parcours utilisable sur petit écran.
```

## Prompt 05 — Boîte à idées, mémoire des cadeaux et budget

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 05 avec son schéma confirmé.

Dans la fiche contact et la préparation, enregistre une idée toute l’année : titre,
note facultative, lien marchand facultatif, prix estimé facultatif et devise.
Commence par texte et lien ; reporte l’upload photo si aucun Storage privé n’est validé.
Permets utiliser l’idée pour une occurrence puis noter manuellement le cadeau offert.
L’historique peut garder une réaction saisie volontairement par l’utilisateur.

Distingue prix estimé et montant réellement dépensé. Présente un budget mensuel et
annuel : prévu, dépensé et sans montant connu. Ne mélange pas plusieurs devises sans
conversion explicite. N’envoie pas ces notes à un prestataire IA.

Valide les liens http/https ; aucune extraction automatique de page distante dans ce lot.
Une URL enregistrée ne doit pas devenir du HTML ou provoquer une requête serveur arbitraire.
Ajoute les nouveaux objets à l’export et à la politique de suppression du compte.

Acceptation : idée enregistrée sans événement, cadeau de l’année précédente retrouvé,
montants exacts sans erreur d’arrondi, pas de double comptage, distinction des données
inconnues, validation des liens et isolation réelle entre utilisateurs.
```

## Prompt 06 — Enregistrer son style de message

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 06 avec son schéma confirmé.

Ajoute des styles personnels enregistrés : ton, longueur, tutoiement/vouvoiement,
présence d’emojis et formule de signature ajoutée localement. Un style peut être choisi
pour un contact ou utilisé par défaut. Conserve les tons actuels accessibles gratuitement.

Lis lib/ai-privacy.ts, lib/message-generator.ts, lib/garde-ia.ts et les routes IA.
La promesse actuelle exclut noms, coordonnées, notes, dates et détails libres transmis
à Mammouth AI. Préserve cette protection. Commence avec des paramètres fermés non personnels,
validés côté serveur ; adapte la notice de manière exacte si de nouveaux paramètres
techniques sont transmis. La signature reste locale.

Ne réintroduis pas les souvenirs, messages historiques ou notes dans les prompts IA
sans une conception distincte de consentement et une validation humaine préalable.
Préserve quota serveur, timeout, limites de taille et validation des réponses.

Acceptation : styles retrouvés après reconnexion, choix par contact, refus d’options
inconnues, tests du contenu réellement transmis au fournisseur et de l’ajout local
de signature, aucune génération réelle facturée dans les tests automatiques.
```

## Prompt 07 — Améliorer les suggestions cadeaux

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 07, en réutilisant lib/gift-config.ts, lib/gift-ideas.ts et le lot 05.

Ajoute un budget, des catégories de centres d’intérêt choisies explicitement et des
options expérience, personnalisé, dernière minute ou sans achat. Permets enregistrer
une suggestion dans la boîte à idées et signaler un cadeau déjà offert.
Les intérêts personnels et l’historique servent d’abord à un tri local de catégories ;
ne les transmets pas à l’IA si cela change la politique de confidentialité actuelle.

Distingue « idée à rechercher » et « produit vérifié ». Les liens actuels de recherche
marchands ne sont pas un catalogue produit et ne garantissent ni prix ni stock.
Pour une première sélection réelle, utiliser des références éditoriales vérifiées,
avec provenance et date de vérification ; ne pas inventer images, livraison ou prix.
Pas de scraping ni nouvelle API commerciale sans cadrage séparé des accès et coûts.

Conserve les tags affiliés existants uniquement lorsqu’ils sont réellement configurés.
Ne prétends pas qu’un lien marchand est affilié sans preuve. Présente une information
claire sur l’affiliation et garde le choix du marchand à l’utilisateur.

Acceptation : filtres utiles, suggestion enregistrable, absence de fuite de notes,
pas de prix halluciné, budget respecté dans les sélections dont le prix est confirmé,
et liens valides. Les données externes invérifiables sont signalées ou omises.
```

## Prompt 08 — Cartes virtuelles individuelles

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 08 après confirmation du schéma des cartes et du mécanisme de partage.

Crée une petite collection de cartes cohérentes avec Ephemer, rendues sans nouvelle
dépendance : quelques compositions HTML/CSS/SVG originales et accessibles.
Depuis une préparation, choisir un modèle, saisir un message, prévisualiser, enregistrer
un brouillon et publier une version. Tous les modèles initiaux sont gratuits.
Si l’upload photo est reporté faute de Storage validé, ne simule pas sa persistance.

Le destinataire consulte la carte publiée sans compte via un lien secret aléatoire,
révocable et avec expiration configurable. Valide ce droit côté serveur et ne renvoie
que la version publiée, jamais le brouillon, la fiche contact ou les notes du propriétaire.
Un visiteur ne peut ni éditer ni énumérer les cartes. Évite cache public, indexation,
prévisualisation sociale contenant le message personnel et fuite du lien vers des tiers.
Un lien transféré peut être ouvert par son détenteur : explique-le au créateur.

Permets désactiver ou remplacer le lien. Préserve une signature et une mise en page
stables dans la version publiée, même si le modèle ou l’avatar évoluent ensuite.
Partager se fait par copie ou menu natif, à l’initiative de l’utilisateur.
Pas de programmation ni d’envoi automatique dans ce lot.

Acceptation : consultation privée sans compte, brouillon inaccessible, lien révoqué
refusé, expiration, texte hostile rendu sans exécution, rendu mobile et clavier.
```

## Prompt 09 — Avatar personnalisé et signature des cartes

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 09 avec son schéma confirmé et les cartes du lot 08.

Ajoute un avatar illustré composé d’éléments prédéfinis : visages, coiffures, couleurs,
vêtements et quelques accessoires célestes. Les caractéristiques permettant de se
représenter sont gratuites. Commence avec un petit catalogue original cohérent avec Ephemer.
Pas de selfie, reconnaissance faciale ou génération d’image IA dans cette version.

Utilise un format de configuration versionné et des identifiants d’éléments autorisés,
pas du SVG/HTML arbitraire fourni par l’utilisateur. Rendu commun entre profil,
prévisualisation et signature de carte. Une carte publiée conserve son avatar choisi.
Prévois une apparence par défaut et une récupération sûre d’une configuration ancienne.

Éditeur utilisable sur mobile et au clavier ; aperçu, sauvegarde et annulation explicites.
Animations légères facultatives respectant prefers-reduced-motion. Aucun achat maintenant.

Acceptation : choix persistants après reconnexion, configurations invalides refusées,
aucune dépendance ou appel payant ajouté, rendu stable des cartes déjà publiées et
aucune exposition de profil privé dans une carte partagée.
```

## Prompt 10 — Relations d’amitié acceptées

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 10 après confirmation du schéma social et de ses règles d’accès.

Ajoute « Mes amis » avec demandes en attente, accepter, refuser, retirer l’amitié,
bloquer et débloquer. Une relation est acceptée des deux côtés ; une fiche contact
créée par invitation ne devient pas automatiquement une amitié entre comptes.
Les contacts sans compte continuent de fonctionner.

Commence avec des liens d’invitation dédiés, expirants et à usage contrôlé,
que l’utilisateur copie ou partage lui-même. Préserve les invitations de fiches existantes.
Pas d’annuaire public ni de recherche par email révélant l’existence d’un compte.
Le serveur garantit unicité de la paire et transitions atomiques, y compris demandes croisées.

Chaque compte choisit son profil partagé : prénom/pseudonyme, avatar, jour/mois de naissance.
Année, email, téléphone et notes restent privés par défaut. Le partage peut être retiré.
N’associe pas automatiquement une fiche personnelle à un compte sur la seule égalité
d’un email ; propose une association explicite et conserve les notes du propriétaire.
Définis les effets d’une modification du profil partagé et du retrait de consentement.

Acceptation : tests à deux comptes, lien expiré, acceptation répétée, demandes croisées,
blocage et retrait, absence d’énumération, absence de lecture de données privées et
pas de privilège permettant au demandeur d’accepter à la place du destinataire.
```

## Prompt 11 — Cercles privés et organisation à plusieurs

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 11 après confirmation du schéma et des tests d’accès.

Ajoute des cercles privés : créer, nommer, inviter, accepter, quitter et retirer un membre.
Limite les rôles initiaux à administrateur et membre. Prévois transfert d’administration
et départ du dernier administrateur. Rejoindre un cercle ne partage pas le carnet personnel.

Permets publier explicitement un événement dans un cercle puis attribuer des tâches :
cadeau, carte, gâteau, appel. Chaque membre peut mettre à jour les tâches qui lui sont
autorisées. Affiche un historique minimal des actions, sans journal de données sensibles.
Pas de chat général ; commence avec un commentaire de coordination attaché à l’événement.

Les préparatifs d’une surprise sont réservés aux organisateurs autorisés, même si le
destinataire appartient au cercle. Cette exclusion doit être garantie dans la base et
le serveur, pas simplement cachée dans l’UI ou dans un email.
Ne partage pas les notes privées d’un contact lors de la publication d’un événement.
Le retrait ou départ d’un membre doit arrêter les nouveaux accès et notifications.

Acceptation : membres/ex-membres/non-membres/destinataire testés directement sur les
ressources, aucun contournement par changement d’ID, ajout de tâche simultané cohérent,
et révocation appliquée à la prochaine requête. Un contenu déjà vu ne peut pas être « dévu ».
```

## Prompt 12 — Listes d’envies et réservation discrète

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 12 après confirmation du modèle envies/réservations.

Permets créer une liste d’envies avec titre, lien facultatif, budget indicatif et préférence.
Visibilité choisie par le propriétaire : privée, amis acceptés sélectionnés ou cercle choisi.
Ne rends aucune liste publique par défaut. Le destinataire peut modifier ses envies.

Les participants autorisés réservent ou indiquent manuellement « acheté » pour éviter
les doublons. Les réservations restent invisibles au destinataire, y compris via requête
directe, agrégats, export, notifications et réponses d’erreur. Sépare ces données de la
liste visible à son propriétaire. Une réservation ne prouve pas un achat marchand.

Garantis atomiquement une réservation active pour la quantité prévue. Autorise annulation
et expiration éventuelle ; gère deux personnes réservant en même temps et le départ
d’un participant sans révéler la surprise au destinataire.
Ne collecte ni paiements ni cagnotte dans ce lot.

Acceptation : deux réservations concurrentes ne produisent pas deux succès, le
destinataire ne peut pas déduire le statut secret depuis l’API, et la visibilité change
réellement quand un partage ou une amitié est retiré. Documente le devenir des réservations.
```

## Prompt 13 — Cartes collectives signées par les proches

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 13 après confirmation du contrat des contributions.

Depuis un événement partagé, un organisateur crée une carte collective et invite les
membres autorisés à contribuer. Chaque participant ajoute son texte et son avatar,
prévisualise et peut modifier sa propre contribution avant fermeture.
Commence avec des contributeurs connectés ; l’invitation anonyme à contribuer est reportée.

Définis précisément les droits de l’organisateur : masquer/retirer une contribution,
sans usurper son auteur. Prévois signalement au responsable du cercle, blocage et limites
de contenu. N’autorise pas HTML arbitraire, liens exécutables ou fichiers non contrôlés.
Le destinataire ne lit ni le brouillon ni les contributions avant publication.

À publication, fige une version consultable selon le mécanisme du lot 08. Le départ
d’un membre, sa suppression de compte et le retrait de sa contribution suivent la
politique validée ; une carte partagée ne devient pas un accès au cercle.
Le lien du destinataire sert à lire ; il ne donne jamais le droit de contribuer.

Acceptation : auteur modifie seulement son texte, non-membre et destinataire exclus des
brouillons, pas de contribution après fermeture, publication cohérente malgré édition
simultanée et avatars/signatures stables dans la version publiée.
```

## Prompt 14 — Programmer la publication et l’envoi d’une carte

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente le lot 14 seulement après vérification du socle de livraison installé.
Relis docs/sql/email-reliability.sql, lib/email-delivery.ts, les crons et les webhooks
disponibles : un fichier local ne prouve pas que son schéma existe à distance.

Permets programmer une carte validée pour une date et une heure explicites selon le
fuseau convenu. Distingue moment de publication et tentative d’envoi du lien par email.
Une carte collective doit être fermée avant la programmation. Prévois annulation et
report avant prise en charge, ainsi que la révocation du lien.

Réutilise la file durable confirmée, avec traitement atomique, identifiant fournisseur,
idempotence, reprise après panne et statut exact : programmé, pris en charge, accepté
par le fournisseur, livré si confirmé, échec ou annulé. Ne crée pas un second cron fragile.
Si ces garanties exigent un nouveau schéma, prépare le dossier SQL et arrête la partie dépendante.
Une acceptation fournisseur ne signifie pas livraison. Le retrait d’une carte doit
bloquer les tâches encore en attente ; définir la course avec un envoi déjà pris en charge.

Respecte les règles existantes de destinataires, consentement, quotas et prévention
des abus. Tests avec fournisseur simulé ; prépare séparément un essai réel sur adresse
de test explicitement autorisée. Vérifie la cohérence de vercel.json si nécessaire.

Acceptation : concurrence de workers, panne avant/après acceptation, retries, changement
d’heure, tâche en retard, annulation et absence de publication anticipée vérifiés.
Ne promets pas une livraison à la seconde si le planificateur ne le permet pas.
```

## Prompt 15 — Gamification douce et collections gratuites

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Implémente une expérience facultative de constellation et des récompenses cosmétiques gratuites.

Propose quelques étapes liées aux vrais usages : première préparation enregistrée,
première carte créée, anniversaire préparé. L’interface ne demande pas de connexion
quotidienne, ne classe pas les proches et ne punit pas les événements oubliés.
Permets masquer cette expérience. La progression ne doit pas gêner les fonctions principales.

Débloque des accessoires ou décors du catalogue avatar ; aucune vente ni monnaie
virtuelle. Les critères de récompense doivent être explicables. Un événement « acheté »
coché par l’utilisateur reste déclaratif, pas un achat marchand vérifié.

Garantis une attribution unique et atomique par action éligible. Le navigateur ne peut
pas s’attribuer directement des objets ; aucun droit payant futur ne doit dépendre
d’un score client. Préserve les objets déjà obtenus lors d’un changement de règle.
Ne récompense pas automatiquement un achat affilié ni l’envoi massif d’invitations.

Acceptation : action rejouée ou simultanée sans double récompense, aucune injection
d’identifiant cosmétique, désactivation possible, animations réduites et aucun coût externe.
```

## Prompt 16 — Observer l’usage sans exposer les proches

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Prépare puis implémente une mesure minimale des lots effectivement livrés.

Questions : crée-t-on des préparations ? revient-on les compléter ? enregistre-t-on des
idées ? publie-t-on des cartes ? utilise-t-on l’avatar ? invite-t-on des contributeurs ?
Lis l’analytique existante et vérifie ses possibilités réelles avant de l’utiliser.
Ne transmets ni noms, emails, messages, dates de naissance, notes, IDs de contacts,
tokens, URLs de cartes ou identifiants de groupes. Évite que le suivi automatique des
pages collecte les secrets présents dans les chemins ; exclure ces pages si nécessaire.

Définis des événements anonymes/agrégés adaptés et la politique de consentement,
conservation et suppression selon le dispositif choisi. Aucun nouvel outil payant.
Sans identifiant pseudonyme autorisé, ne prétends pas mesurer une rétention individuelle.
Sépare mesures possibles, calculs agrégés et questions restant à explorer par entretiens.
Ne déclenche pas de faux achat ou de faux paywall pour mesurer une conversion.

Livre docs/evolution/MESURE-USAGE.md : définitions, événements, doublons à éviter,
coûts suivis côté serveur, contrôles de confidentialité et protocole de bilan.
Les clics marchands ne sont pas des ventes ; les revenus affiliés viennent des relevés
du partenaire. Si aucun coût fournisseur réel n’est disponible, indique « non mesuré ».

Acceptation : payloads inspectables sans donnée personnelle, pages à lien secret exclues
de la collecte sensible, succès compté après résultat confirmé et échecs non comptés comme succès.
```

## Prompt 17 — Décider du premium et préparer la monétisation future

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Ce lot est une étude fondée sur les usages constatés. N’active aucun paiement ni restriction.

À partir des résultats de MESURE-USAGE et des retours disponibles, compare : abonnement
annuel, packs de cartes, packs cosmétiques et affiliation. Distingue preuve, hypothèse
et données manquantes. Ne transforme pas le tarif de 24,90 €/an en décision automatique.
Si les résultats sont insuffisants, propose le prochain test produit plutôt qu’une boutique.

Prépare docs/evolution/MONETISATION.md avec trois niveaux : socle gratuit conservé,
avantages candidats au premium, cosmétiques candidats à l’achat permanent.
Évite de faire payer l’export, la suppression, la confidentialité ou la fiabilité essentielle.
Les caractéristiques de représentation de l’avatar restent accessibles gratuitement.
Pas d’IA illimitée sans financement de son coût récurrent.

Décris le modèle futur de droits côté serveur : abonnement actif, objets possédés,
catalogue inclus, achats permanents, remboursement, expiration et mode gratuit pilote.
L’expiration d’un abonnement ne doit ni supprimer les contacts ni casser les cartes
déjà publiées. Un achat à vie et un accès pendant l’abonnement sont deux droits distincts.

Prépare le périmètre d’une future intégration de paiement web de la PWA, sa validation
humaine, ses besoins de dépendances et ses tests de webhook signés/idempotents.
Les règles des stores ne deviennent pertinentes qu’en cas de distribution native.
Ne crée pas encore de compte fournisseur, produit tarifaire, session de paiement,
abonnement ou script SQL de facturation. Toutes les fonctionnalités restent gratuites.
```

## Prompt 18 — Vérifier une version de bout en bout

```text
Applique le cadre commun de docs/PLAN-EVOLUTION-EPHEMER.md, section 3.
Version à vérifier : [LOTS EFFECTIVEMENT LIVRÉS].

Effectue une recette complète des parcours disponibles, avec données fictives et
comptes de test autorisés. Ne simule pas la livraison des lots absents.
Premier parcours : contact -> événement -> préparation -> idée -> message -> carte
avec avatar -> publication -> consultation du destinataire -> révocation.
Second parcours si livré : invitation -> amitié acceptée -> cercle -> préparatifs
de surprise -> réservation -> carte collective -> sortie du cercle et refus d’accès.

Vérifie téléphone et desktop, clavier, réduction des animations, réseau lent,
perte de connexion, reconnexion, expiration de session, actualisation, pagination,
erreurs de sauvegarde et deux actions simultanées. Confirme la persistance réelle.
La vue hors ligne ne doit pas récupérer des contenus privés d’un autre compte.

Teste les accès directs et RLS avec les rôles réels sur l’environnement autorisé.
Les simulations seules ne suffisent pas pour valider les règles distantes.
Vérifie export/suppression des nouvelles données, fichiers et relations partagées
sur données synthétiques uniquement. Relis les pages publiques et confidentialité
pour qu’elles décrivent les fonctions réellement opérationnelles.

Exécute lint, TypeScript, tests pertinents et build. Corrige les régressions de cette
version dans son périmètre. Documente les problèmes préexistants séparément.
Livre un bilan : réalisé, vérifié réellement, vérifié par simulation, restant à valider,
et procédure de déploiement/retour arrière. Aucun commit ni déploiement automatique.
```

## 5. Règles pour les étapes futures

- **Aucune obligation de tout construire.** Après chaque version, les usages orientent la suite.
- **L’envoi automatique dépend de sa fiabilité réelle.** Commencer par la création et le partage manuel des cartes.
- **Le social commence privé.** Annuaire public, fil de publications, messagerie générale et invitations massives sont hors périmètre initial.
- **Le cadeau collectif commence par la coordination.** Cagnottes, encaissement, achat direct et livraison physique demanderaient un projet commercial distinct.
- **Les images utilisateur viennent après leur stockage maîtrisé.** Le texte, les liens et les illustrations prédéfinies suffisent pour tester la première expérience.
- **La monétisation n’est pas préactivée.** Construire gratuitement, mesurer, puis autoriser séparément un projet de paiement si la valeur est confirmée.

Référence technique pour la conception des accès Supabase : [Row Level Security — documentation officielle](https://supabase.com/docs/guides/database/postgres/row-level-security). Les règles appliquées doivent être testées sur le projet et les rôles concernés ; cette référence ne constitue pas une preuve de sécurité du dépôt.
