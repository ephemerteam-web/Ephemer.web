# Audit global d’Ephemer — 4 octobre 2026

## Avis général

L’application possède un socle utile et plusieurs protections déjà solides : authentification vérifiée côté serveur, cloisonnement des tables par utilisateur, protection du cache PWA, échappement des emails et limitation des données envoyées à l’IA. La priorité est maintenant de fiabiliser les rappels et de fermer deux accès privilégiés dans Supabase.

Je déconseille d’élargir l’usage avant de traiter les constats P1. Ce n’est pas la preuve d’une exploitation ou d’une fuite massive : les problèmes décrits ci-dessous sont établis par le code, le schéma et des simulations. Aucun test offensif n’a été exécuté sur les données réelles.

## Périmètre et résultats

Audit du code local : routes API, authentification, contacts, générateurs, calendrier, invitations, notifications, emails, PWA, configuration et tests. Inspection en lecture seule du schéma, des fonctions, contraintes, index et règles d’accès du projet Supabase connecté **ephemer-app**. Aucune fiche personnelle n’a été consultée. Le lien exact entre ce projet connecté et chaque environnement déployé reste à confirmer dans la configuration de déploiement.

| Vérification | Résultat |
|---|---|
| Tests présents dans le dépôt | 46 réussis lors du dernier passage, contre 39 au début ; des changements ont été apportés par ailleurs pendant l’audit |
| Simulations supplémentaires de l’audit | 5 réussies : elles reproduisent cinq comportements problématiques, sans appel à des services réels |
| TypeScript | Vérification indépendante réussie : `tsc --noEmit --incremental false` |
| ESLint | Dernier passage : 1 erreur, 38 avertissements ; l’erreur du test du générateur a été corrigée par ailleurs pendant l’audit |
| Build de production | Échec lors du téléchargement de Geist/Geist Mono depuis Google, y compris après relance avec accès réseau ; build complet non validé |
| Audit des dépendances | `npm audit --json` et `npm audit --omit=dev --json` : aucune vulnérabilité connue signalée |
| Supabase | RLS activée sur les 10 tables publiques ; deux fonctions présentent des accès problématiques confirmés |
| Interface publiée | Accueil public chargé, avec redirection vers www.ephemer.name ; vérification interactive interrompue par une indisponibilité de la session navigateur |

**Limites :** pas de recette complète avec compte utilisateur, pas de mesure Lighthouse, pas de contrôle sur un vrai iPhone/Android, pas d’envoi Resend/Mammouth/push, pas de suppression réelle de compte. Les réglages Vercel, les journaux de livraison, les configurations OAuth/SMTP et les sauvegardes n’ont pas été inspectés. Les tests simulés ne valident pas le déploiement ni toutes les règles d’accès entre deux comptes réels.

**Intervention :** aucun code applicatif, secret, réglage distant ou schéma n’a été modifié par cet audit. Aucun commit. Seuls ce rapport et un script de simulations placé hors du dépôt ont été créés. Les modifications déjà présentes et celles arrivées pendant l’audit ont été conservées.

## Ce qui est déjà bien protégé

- [proxy.ts](C:/Users/alex0/ephemer/proxy.ts) vérifie l’identité avec Supabase Auth, renouvelle les cookies et protège les réponses privées contre la mise en cache. Le callback limite la destination de redirection.
- Les routes cron refusent l’accès si le secret manque ou si l’en-tête ne correspond pas. Les routes IA vérifient la session avant l’appel payant.
- [public/sw.js](C:/Users/alex0/ephemer/public/sw.js) ne conserve que quelques fichiers publics explicitement autorisés. Les pages privées, API, réponses RSC et ressources externes ne sont pas mises en cache. La notification affichée sur l’écran verrouillé reste générique.
- Les champs personnels sont échappés dans les emails. Les requêtes IA excluent les noms, coordonnées, notes et dates de naissance ; le prénom est ajouté au message après génération.
- L’export personnel est paginé, filtré par propriétaire et interrompu en cas d’erreur. Les tokens d’invitation et clés push sont exclus.
- L’index unique des notifications confirme la protection contre les doublons par contact, événement et palier. Les invitations vérifient l’expiration et le nombre d’utilisations, et verrouillent leur compteur lors d’une soumission.
- Les tests couvrent notamment les changements d’heure, le 29 février, les caches privés, l’échappement HTML et la séparation des appareils push. Les contrastes des principales couleurs de thème sont testés ; cela ne constitue pas une certification de toute l’interface.

## Corrections prioritaires — P1

### 1. Le quota IA peut être consommé par quelqu’un d’autre

**Confirmé dans Supabase.** `public.incrementer_quota_ia(p_user_id)` est une fonction `SECURITY DEFINER`, exécutable par `anon` et `authenticated`. Elle accepte l’identifiant fourni et incrémente le compteur sans vérifier l’appelant. La protection RLS de `quotas_ia` ne s’applique pas à ce chemin privilégié.

**Conséquence :** un tiers connaissant l’identifiant d’un compte peut consommer son quota et bloquer ses générations. Cela ne donne pas directement accès aux messages ni à la clé du prestataire.

**Recommandation :** réserver cette fonction au rôle serveur utilisé par [lib/garde-ia.ts](C:/Users/alex0/ephemer/lib/garde-ia.ts:44), retirer les droits publics et tester le refus des appels anonymes et connectés ordinaires. Valider les changements de droits dans Supabase avant application.

### 2. Une fonction révèle la présence d’un email chez d’autres utilisateurs

**Confirmé dans Supabase.** `public.est_contact_lie(mon_user_id, email_du_contact)` s’exécute avec des privilèges élevés. Un utilisateur connecté peut l’appeler avec un identifiant libre et une adresse email. Elle recherche cette adresse dans les contacts d’autres comptes, sans vérifier que l’identifiant fourni correspond à l’appelant. Son `search_path` n’est pas fixé, ce que signale aussi l’outil de sécurité Supabase.

**Conséquence :** possibilité de sonder l’existence d’une adresse dans les carnets d’autres utilisateurs. La réponse est un booléen ; aucun carnet complet n’est retourné par cette fonction.

**Recommandation :** retirer l’accès à cette fonction actuellement inutilisée par l’écran Contacts. Si le rapprochement entre comptes est réintroduit, le concevoir avec un consentement explicite et une règle d’autorisation propre. Fixer le `search_path` si la fonction est conservée.

Les fonctions publiques d’invitation ne doivent pas toutes être fermées automatiquement : certaines doivent volontairement fonctionner sans connexion, à partir d’un lien secret. La [documentation Supabase sur RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) explique pourquoi les chemins privilégiés doivent être examinés séparément.

### 3. Un récapitulatif en échec peut être perdu définitivement

**Confirmé par lecture et simulation.** [generate-notifications/route.ts](C:/Users/alex0/ephemer/app/api/cron/generate-notifications/route.ts:96) ne traite que les paliers correspondant exactement au jour courant. L’envoi des notifications en attente dépend en plus de la présence d’un palier actif ce jour-là. Un email J-1 en échec hier n’est pas repris aujourd’hui si le jour J est désactivé. Les autres anciens paliers ne sont pas réconciliés non plus. Une erreur sur un utilisateur interrompt la boucle avant les suivants.

**Conséquence :** certains utilisateurs ne reçoivent rien après une panne ponctuelle, malgré des préférences correctes. Le cron peut laisser une partie des comptes sans traitement.

**Recommandation :** séparer la génération des événements et la livraison des notifications en attente ; définir quels rappels tardifs doivent encore être envoyés ; isoler les erreurs par utilisateur ; conserver le dernier traitement réussi et un historique durable. Vercel ne relance pas automatiquement une invocation en échec et demande de prévoir les passages manqués ou répétés. [Documentation Vercel](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

**Critère de validation :** simuler un échec Resend, reprendre le lendemain sans nouveau palier actif et vérifier une seule livraison utile ; vérifier que l’échec du premier compte n’empêche pas le suivant.

### 4. Les préférences d’alertes bloquent aussi les messages programmés

**Confirmé par simulation.** [envoyer-rappels/route.ts](C:/Users/alex0/ephemer/app/api/envoyer-rappels/route.ts:123) applique `canal_email` et `rappel_jourj` à toutes les lignes, sans distinguer `source: message_programme`. Or [lib/rappels.ts](C:/Users/alex0/ephemer/lib/rappels.ts) enregistre tous les messages manuels comme `jourj`, y compris lorsqu’ils sont planifiés à J-7 ou à une date libre.

**Conséquence :** un message explicitement programmé pour un contact peut être ignoré parce que l’expéditeur a désactivé ses propres alertes. Il reste « programmé » ; une réactivation ultérieure peut rendre un ancien message éligible à un envoi tardif.

**Recommandation :** définir séparément les préférences des alertes personnelles et l’autorisation d’envoyer des messages programmés. Si une préférence globale doit tout suspendre, expliquer cette règle au moment de programmer et afficher les messages suspendus. Prévoir une décision explicite pour les messages en retard.

### 5. La suppression d’un compte peut annoncer un succès incomplet

**Confirmé dans le code, le schéma et une simulation.** [delete-account/route.ts](C:/Users/alex0/ephemer/app/api/delete-account/route.ts:28) continue après une erreur de suppression du profil ou des contacts. Si Auth réussit ensuite, la réponse est un succès. La base n’a pas de clé étrangère de `profiles.id` ni de `contacts.user_id` vers `auth.users` : ces deux nettoyages ne sont donc pas garantis par une cascade.

Les invitations, préférences, quotas, rappels, abonnements push et notifications disposent bien de cascades vers Auth. Il serait inexact d’affirmer qu’ils sont tous laissés derrière.

**Conséquence :** données personnelles orphelines possibles, ou compte partiellement vidé si Auth échoue après les premières suppressions.

**Recommandation :** rendre l’opération reprenable, vérifier chaque étape et ne déclarer la suppression complète qu’après contrôle. Étudier des relations de suppression cohérentes pour profils et contacts, avec validation humaine du schéma. Tester les échecs à chaque étape, sans utiliser un vrai compte en production.

### 6. Les envois d’emails ne disposent pas d’un suivi durable suffisant

**Confirmé dans le code et le schéma.** Les clés d’idempotence Resend existent, mais les identifiants d’emails ne sont pas conservés durablement dans `rappels`. Il n’y a pas de journal des tentatives, de verrou de traitement ni de webhook de livraison dans ce dépôt. Un email accepté suivi d’une erreur d’écriture reste potentiellement à retraiter. La protection d’idempotence du prestataire expire après 24 heures. [Documentation Resend](https://resend.com/docs/dashboard/emails/idempotency-keys)

**Conséquence :** risque de renvoi après expiration de cette fenêtre, impossibilité de savoir réellement si l’email a été livré ou refusé, et risque d’envoi malgré une annulation intervenant entre lecture et traitement.

**Recommandation :** conserver l’identifiant Resend, l’état de traitement et les tentatives ; réserver atomiquement les messages à traiter ; intégrer les retours de livraison avec vérification de signature. Le texte actuel « livraison non confirmée » est honnête et doit rester tant que ce suivi manque.

### 7. Les limites contre l’abus d’envoi sont déclarées mais pas appliquées

**Confirmé dans le périmètre inspecté.** [lib/constants.ts](C:/Users/alex0/ephemer/lib/constants.ts:97) définit des plafonds de contacts, rappels et une temporisation, mais ils ne sont utilisés dans aucun contrôle. Les utilisateurs peuvent insérer leurs rappels directement dans Supabase ; la politique d’insertion vérifie le propriétaire, sans plafond métier ni restriction aux champs autorisés par le formulaire.

**Conséquence :** un compte malveillant peut constituer une grande file de messages vers ses destinataires, avec un risque pour le coût, le délai de traitement et la réputation du domaine d’envoi. L’audit n’a pas créé de file abusive et n’affirme pas l’absence de protections externes non inspectées.

**Recommandation :** définir des plafonds réalistes et les faire respecter dans le chemin d’écriture serveur ou dans une fonction transactionnelle autorisée. Contrôler les tailles, les adresses et les statuts initiaux, sans compter uniquement sur l’interface. Distinguer ces limites du quota IA, qui possède déjà un compteur serveur.

## Corrections fonctionnelles et qualité — P2

| Constat confirmé | Effet et recommandation |
|---|---|
| **J-3 invisible dans les réglages** | `rappel_j3` est vrai par défaut dans la base et dans le cron, faux dans les valeurs par défaut de l’écran ; aucun bouton J-3 n’est affiché. L’utilisateur ne peut pas piloter normalement ce palier. Ajouter le réglage et harmoniser les valeurs par défaut. [Notifications](C:/Users/alex0/ephemer/app/dashboard/notifications/page.tsx:154) |
| **Email automatique absent si les préférences n’existent pas** | Le cron teste `prefs?.canal_email` sans valeur de repli, alors que l’écran affiche email activé par défaut. La base inspectée ne montre pas de trigger de création des préférences à l’inscription. Harmoniser le comportement des nouveaux comptes et tester le cas sans ligne de préférences. [Cron](C:/Users/alex0/ephemer/app/api/cron/generate-notifications/route.ts:134) |
| **Invitations : chemin actif sans alerte à l’hôte** | Le formulaire appelle `soumettre_invitation`, qui crée le contact sans `invitation_id`. Le trigger de notification ignore ces contacts. L’ancienne fonction `repondre_invitation` utilise un autre chemin et peut cumuler sa propre notification avec celle du trigger. Unifier la soumission et une notification durable unique. Le endpoint HTTP d’alerte est déjà volontairement suspendu ; ne pas le réactiver sans preuve serveur. [Formulaire](C:/Users/alex0/ephemer/app/invitation/[token]/FormulaireInvitation.tsx:122) |
| **Relation “ami” / “amis” incompatible** | L’invitation et sa fonction SQL utilisent `amis`, alors que les constantes et les gardes IA attendent `ami`. Les contacts invités peuvent perdre leur catégorie dans les filtres ou tomber sur une relation de repli. Choisir une valeur unique, normaliser les données historiques après validation et vérifier invitation → filtre → génération. |
| **29 février incohérent selon la vue** | Simulation : pour février 2027, l’API renvoie `jour: 29` et une date réelle au 1er mars. Les fonctions centrales ont déjà choisi le 1er mars, mais l’API mensuelle et la newsletter ne réutilisent pas cette règle. Centraliser les dates civiles, valider mois/année et vérifier aussi les fuseaux négatifs. [API mensuelle](C:/Users/alex0/ephemer/app/api/evenements-mois/route.ts:57) |
| **Occasions cadeaux mal reconnues** | L’interface transmet `fete_prenomale`, mais l’API attend `fete_prenom` ; mariage et naissance n’ont pas de correspondance non plus. La simulation confirme un prompt d’« occasion spéciale » pour une fête. Partager les constantes avec le générateur de messages ; vérifier qu’une réponse contient des idées utilisables avant de renvoyer un succès. [API cadeaux](C:/Users/alex0/ephemer/app/api/generate-gift-ideas/route.ts:16) |
| **Push préparé mais pas envoyé** | Le navigateur enregistre les abonnements et le worker sait afficher une notification, mais aucun expéditeur push n’existe dans le dépôt et aucune Edge Function n’est déployée dans le projet inspecté. L’interface signale déjà cette limite. Choisir de livrer le canal complet ou de présenter clairement une préparation ; l’autorisation du téléphone ne suffit pas. [Bouton push](C:/Users/alex0/ephemer/components/PushPermissionButton.tsx) |
| **Nouveau formulaire : doublons et validation insuffisants** | Le chemin courant `/contacts/nouveau` insère le lot sans utiliser la détection de doublons présente dans `nouveau_old`. Les emails sont saisis hors d’un formulaire avec validation de soumission ; `type=email` seul ne bloque pas l’enregistrement. Réutiliser les contrôles métier, signaler les doublons sans fusion automatique et protéger les saisies non enregistrées lors d’une navigation. [Formulaire](C:/Users/alex0/ephemer/app/dashboard/contacts/nouveau/page.tsx:215) |
| **Chargements non paginés et index manquants** | Les crons chargent profils, contacts ou rappels sans pagination. Les listes principales font de même ; l’export constitue une bonne exception. Le plafond API du projet n’a pas été lu, mais la limite Supabase par défaut est de 1 000 lignes. `contacts` ne possède aucun index sur `user_id`. Paginer les traitements avec un ordre stable, traiter par lots et étudier un index propriétaire/tri. [Documentation Supabase](https://supabase.com/docs/reference/python/select) |
| **Accessibilité incomplète** | Les cartes cadeaux se retournent avec un clic sur un `div`, sans commande clavier équivalente. Plusieurs panneaux n’ont ni gestion complète du focus ni fermeture Échap. Des libellés de formulaire ne sont pas reliés à leur champ. Prioriser clavier, bouton explicite, retour du focus, état annoncé et vrais labels ; les contrastes de thème déjà testés ne couvrent pas ces points. [Cartes cadeaux](C:/Users/alex0/ephemer/app/dashboard/gift-ideas/page.tsx:89), [AuthDrawer](C:/Users/alex0/ephemer/components/AuthDrawer.tsx) |
| **Brouillons personnels conservés sans expiration** | L’invitation sauvegarde nom, email, téléphone, naissance et notes dans `localStorage`, jusqu’au succès. Aucun effacement temporel n’est prévu pour les formulaires abandonnés. Informer l’utilisateur, proposer l’effacement et prévoir une expiration. Le cache PWA ne contient pas ces données ; le stockage local est un sujet distinct. |
| **Hygiène Supabase à compléter** | Politiques et index dupliqués ; droits larges par défaut pour `anon`/`authenticated` ; politique d’administration de `patch_notes` contenant encore une adresse d’exemple. Le diagnostic signale aussi la protection contre les mots de passe compromis désactivée. Réduire les droits au nécessaire, supprimer les doublons après comparaison et vérifier les possibilités du plan Auth. [Sécurité des mots de passe](https://supabase.com/docs/guides/auth/password-security) |

La date de naissance sans année et le choix durable d’une fête ne sont pas entièrement pris en charge par le schéma actuel. Ne pas ajouter une année fictive pour contourner cette limite. Une évolution métier et SQL validée est nécessaire si ces fonctionnalités sont souhaitées.

## Entretien et amélioration produit — P3

1. **Rendre la livraison vérifiable.** Ajouter une commande de tests standard et un contrôle automatique lint + TypeScript + tests + build. Ne pas présenter les résultats d’un ancien audit comme l’état actuel : ce dépôt a évolué pendant cette vérification. Corriger l’effet du formulaire contacts, dernière erreur lint restante. Le nom de variable interdit dans le nouveau test du générateur a été corrigé par ailleurs et n’apparaît plus lors du contrôle final.
2. **Sortir les sauvegardes de l’arborescence des routes.** `nouveau_old/page.tsx` et `generate_old/page.tsx` sont de vraies routes Next.js, pas seulement des archives. Elles augmentent la surface à maintenir et les avertissements. Conserver leur contenu hors de `app/` si nécessaire, puis retirer ces routes après validation. Les anciens liens `/contacts/rapide` doivent être vérifiés après sa suppression.
3. **Aligner les types avec le schéma réel.** Les types manuels omettent des tables et `email_envoye`, et déclarent certains champs non nuls alors que SQL accepte `null`. Générer les types de référence et typer les clients Supabase pour détecter plus tôt les sélections et écritures invalides. Ajouter une frontière `server-only` au client admin pour prévenir un import client accidentel.
4. **Prévoir la panne dans chaque écran.** Certaines lectures Contacts/Invitations remplacent une erreur par une liste vide. Préférer une erreur explicite avec réessai, et compléter les écrans Next d’erreur/404. L’authentification est parfois répétée dans le proxy, le layout et la page : mesurer ces appels et mutualiser ce qui peut l’être sans affaiblir les vérifications serveur.
5. **Clarifier les notifications.** Le diagnostic simule correctement sans envoyer, mais l’écran affiche toujours « notifications créées / emails envoyés », tous deux à zéro. Afficher les événements prévus et le destinataire. La cloche ne charge que les 30 dernières notifications : son compteur et « tout marquer lu » ne représentent donc pas forcément toutes les anciennes non lues.
6. **Stabiliser les builds et les assets.** Examiner le problème réseau des polices ; des fichiers locaux via `next/font/local` peuvent rendre la compilation moins dépendante de Google. Ne pas changer le rendu sans validation. `og-image.png` et `safari-pinned-tab.svg` sont référencés mais absents dans le dépôt inspecté. Les principales icônes PWA existent. [Documentation Next sur les polices](https://nextjs.org/docs/app/api-reference/components/font)
7. **Harmoniser les promesses de personnalisation.** Les notes et intérêts restent volontairement exclus des requêtes IA. Le texte « plus de notes = cadeaux plus pertinents » est donc trompeur dans l’état actuel. Expliquer que les suggestions utilisent surtout l’occasion et la relation. Retirer les contraintes de date inutiles lorsqu’elles ne servent pas à générer les cadeaux.
8. **Clarifier le hors ligne.** Le worker affiche une page de secours publique ; il ne permet pas de consulter les contacts hors connexion. C’est cohérent avec la confidentialité, mais il faut présenter précisément cette capacité dans l’aide produit.
9. **Établir un calendrier opérationnel exact.** Les expressions Vercel sont en UTC : le cron `0 7 * * *` passe vers 09 h à Paris en été, 08 h en hiver ; ce n’est pas 07 h locale. Les autres tâches sont décalées de la même façon. Confirmer l’heure souhaitée et documenter les retards possibles. [Documentation Vercel](https://vercel.com/docs/cron-jobs)
10. **Rendre les informations de confidentialité concrètes.** La date de mise à jour est calculée à l’affichage, les adresses de support diffèrent et plusieurs durées de conservation restent vagues. Fixer une date de version, un contact vérifié, l’identité de l’exploitant et les durées applicables aux brouillons, logs et sauvegardes. Cette vérification technique n’est pas une validation juridique. [Guide CNIL sur la conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees)

## Ordre de réalisation conseillé

| Lot | Travail | Résultat attendu |
|---|---|---|
| 1 — Protéger | Quota IA, fonction de rapprochement, permissions utiles et limites d’envoi | Aucun appel ordinaire ne touche un autre compte ; file d’envoi bornée |
| 2 — Fiabiliser | Reprise après échec, isolation par utilisateur, traitement des messages suspendus, suppression complète | Une panne ne fait pas perdre les rappels ; aucun succès d’effacement incomplet |
| 3 — Rendre cohérent | J-3, nouveaux comptes, invitations, relation ami/amis, dates et occasions cadeaux | Même règle entre formulaire, base, calendrier et cron |
| 4 — Vérifier la livraison | Journal durable, identifiant Resend, verrou et retours de livraison | Envoi traçable, distinction claire entre accepté et livré |
| 5 — Consolider | Contacts, accessibilité, pagination, types, routes anciennes, build et automatisation des contrôles | Application maintenable et recette reproductible |
| 6 — Compléter le produit | Canal push complet, dates partielles, choix durable des fêtes, textes et mentions | Fonctionnalités annoncées conformes à leur fonctionnement réel |

Avant un prochain déploiement, vérifier sur un environnement de test : deux comptes isolés, inscription sans préférences, invitation expirée/rejouée, message suspendu/réactivé, annulation pendant traitement, panne Resend suivie d’une reprise, suppression avec échec intermédiaire, février non bissextile, plus d’une page de données, parcours clavier et installation PWA sur iPhone/Android.

**Décision de déploiement : à surveiller, validation incomplète.** L’accueil public répond, mais le build local n’est pas validé et les P1 touchent la confidentialité, l’effacement et la fiabilité des rappels. Aucun déploiement ni correction n’a été effectué par cet audit.
