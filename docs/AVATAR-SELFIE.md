# Avatar céleste à partir d’un selfie

## Livraison et utilisation

`components/avatars/SelfieAvatarGenerator.tsx` prépare une photo, demande sa transformation, montre l’avatar reçu et permet son téléchargement. La page Avatar propose deux outils : **Avatar personnalisable** (sélection initiale) et **Photo avec IA**. Après génération, **Valider et enregistrer** conserve le portrait et le montre immédiatement sur Mon profil et dans les badges du menu. Générer seul ne remplace rien. Changer d’option efface seulement les aperçus temporaires ; le portrait validé reste enregistré, même après rechargement ou reconnexion.

Contrat public : `ownerId: string`, `onGenerated?: (avatar: GeneratedSelfieAvatar) => void` et `allowSave?: boolean` (désactivé par défaut). Le résultat contient `file: File` et `promptVersion: 'celeste-cartoon-v1'`. Le callback intervient après vérification du compte ; il ne réalise aucune sauvegarde. La page Avatar active `allowSave`, dans `DashboardAvatarProvider`. Un conteneur externe ne doit pas conserver une URL blob appartenant au composant.

## Activation de l’enregistrement — étape manuelle indispensable

Dans le projet Supabase **ephemer-app**, ouvrir **SQL Editor → New query**, copier le fichier complet [`docs/sql/avatar-ia.sql`](sql/avatar-ia.sql), puis **Run**, après revue et sauvegarde. Le script est transactionnel et prévu pour une seule installation. Il ajoute `portrait_ia` à la ligne privée existante, son contrôle de contenu et un déclencheur qui retire le portrait lorsqu’un avatar personnalisable est validé. Aucune nouvelle table, aucun bucket, aucun service supplémentaire. Les règles existantes limitent lecture/écriture/suppression au propriétaire connecté. L’installation est volontairement manuelle selon `AGENTS.md` ; la présence du fichier ne prouve pas son installation.

Le contrôle du catalogue distant du 10/10/2026, sans données personnelles, confirme la RLS propriétaire et la suppression en cascade à la suppression Auth. La colonne `portrait_ia` n’est pas encore installée. Tant qu’elle manque, la validation affiche une explication et conserve l’aperçu, sans annoncer de succès. Les types générés restent ceux du schéma installé ; l’adaptateur de la future colonne est isolé dans `lib/avatar-data.ts`.

Après installation, créer un portrait, cliquer **Valider et enregistrer**, ouvrir Mon profil, recharger, se reconnecter et vérifier le même portrait. Valider ensuite un avatar personnalisable : il remplace le portrait et retire son image de la ligne. Contrôler également l’export et la suppression sur un compte de recette. Le fichier [`docs/sql/avatar-ia-verification.sql`](sql/avatar-ia-verification.sql) contrôle en lecture seule la colonne, la contrainte, le déclencheur et les droits après installation.

Le portrait de profil est un JPEG 500 × 500, qualité 0,82, sans métadonnées et limité à 128 Kio. Une image trop volumineuse reste téléchargeable, mais ne peut pas être enregistrée. Il est conservé avec la version du prompt et la révision dans la même ligne Supabase, sous forme encodée ; seul le portrait courant est stocké. Ce choix évite un stockage de fichiers distinct et conserve l’export et la suppression existants. À grande échelle, prévoir une migration vers un stockage privé : 1 000 portraits au plafond représentent environ 170 Mio de données encodées, hors index et autres données. Les quotas Supabase existants s’appliquent.

La révision lue avant génération est exigée à la validation. Une modification concurrente provoque un conflit ; une réponse perdue est relue sans nouvelle écriture. L’identité est vérifiée avant et après les échanges. Déconnexion, changement de compte ou fermeture invalident l’interface tardive ; une écriture déjà reçue par Supabase peut néanmoins avoir réussi et doit être vérifiée en rouvrant le profil.

Le portrait IA est réservé au profil personnel et aux badges du dashboard. Les cartes existantes, nouveaux choix d’avatar illustré pour les cartes, export visuel et projections sociales gardent leur contrat illustré. Le portrait privé est inclus dans l’export JSON personnel par la lecture propriétaire de `avatars_utilisateurs`, et supprimé avec la ligne du compte ; aucune diffusion automatique à un tiers.

Exemple complet pour réutiliser le composant dans un autre conteneur client :

```tsx
'use client'

import { useDashboardUser } from '@/components/DashboardUserContext'
import SelfieAvatarGenerator from '@/components/avatars/SelfieAvatarGenerator'

export default function MonPortraitCeleste() {
  const user = useDashboardUser()
  return <SelfieAvatarGenerator ownerId={user.id} />
}
```

## Configuration Cloudflare

La connexion Cloudflare dans Codex ne configure pas les secrets du site. L’administrateur doit confirmer **Workers Free** dans le compte destiné à la génération avant d’activer le service. Aucun forfait payant, crédit AI Gateway ni service secondaire n’est activé par cette livraison. Le drapeau d’activation est une décision d’administration, pas une preuve automatique du forfait.

Le forfait **Workers Free — Active** a été confirmé par l’utilisateur pendant l’intégration. L’accès en lecture aux modèles et la disponibilité du modèle choisi ont été vérifiés avec le token local, sans génération réelle. L’activation locale est enregistrée dans `.env.local` ; elle exige un redémarrage du serveur de développement. L’environnement distant de l’hébergeur doit être configuré séparément avant un déploiement.

Variables **serveur**, à renseigner dans l’environnement local et celui de l’hébergeur :

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `EPHEMER_AVATAR_AI_ENABLED`

Créer le token depuis Workers AI → Use REST API → Create a Workers AI API Token, limité au compte concerné, avec Workers AI Read/Edit. Enregistrer le secret dans le gestionnaire d’environnement, jamais dans le dépôt ou la conversation. Activer le drapeau uniquement après vérification du forfait et configuration de cet accès. Tant qu’il est absent ou désactivé, la route répond « La création d’avatars attend sa configuration Cloudflare », sans consommer le quota IA.

Workers Free fournit 10 000 neurones par jour, partagés avec les autres usages Workers AI du compte. Une fois l’allocation dépassée, Cloudflare refuse les appels. Workers Paid peut facturer les dépassements : garder Workers Free est la condition de gratuité de l’inférence. Les quotas existants d’hébergement restent applicables. [Tarification](https://developers.cloudflare.com/workers-ai/platform/pricing/) et [configuration REST](https://developers.cloudflare.com/workers-ai/get-started/rest-api/).

## Traitement et limites

- Source JPEG/PNG/WebP jusqu’à 10 Mo et 40 mégapixels ; HEIC, SVG et GIF refusés. Le navigateur doit pouvoir décoder la photo. Le composant ne détecte pas automatiquement le nombre de visages : la consigne demande une seule personne.
- Réencodage dans le navigateur en JPEG, côté maximal 500 px, proportions et orientation conservées, transparence sur fond blanc, métadonnées retirées. La photo préparée reste sous 512 Kio ; la requête multipart est limitée à 1 Mio, y compris sans `Content-Length`.
- `POST /api/avatars/generate` exige un Bearer vérifié par Supabase. Seuls les champs `photo` et `consent` sont admis, une fois chacun. Le serveur vérifie signature, dimensions et consentement, puis utilise `consommerQuotaIA` pour le compte vérifié. Le quota est partagé avec les autres générations IA ; une tentative envoyée à Cloudflare reste consommée même si elle échoue.
- Le modèle fixe est `@cf/black-forest-labs/flux-2-klein-4b`. Une seule référence binaire : le selfie courant en image 0. La référence artistique `assets/avatars/selfie-style-v1.jpg` reste sur disque pour les fixtures de recette ; elle n’est plus lue ni envoyée par le serveur. Le style et le décor lunaire sont décrits uniquement par le prompt.
- Prompt fixe dans `lib/selfie-avatar-server.ts`, identifiant `celeste-cartoon-v1`. La retouche compatible du 12 octobre 2026 conserve cet identifiant, contrôlé par le navigateur et l’enregistrement du portrait. Il couvre donc le texte initial et sa retouche ; il ne permet pas de distinguer leurs rendus. Une nouvelle version distincte nécessiterait aussi de prévoir la lecture des anciens portraits et la mise à jour SQL manuelle du contrôle d’enregistrement.
- Sortie carrée 1024 × 1024, jusqu’à 8 Mio, type réel JPEG/PNG/WebP vérifié. Réponse binaire `no-store`, en-tête `X-Ephemer-Avatar-Prompt`. Erreurs JSON `{ error: { code, message } }`, messages français sans détail privé du fournisseur.
- Appel Cloudflare limité à 60 secondes, route avec marge de 90 secondes pour la préparation/authentification. Aucun réessai automatique. Le composant peut interrompre l’attente ; une interruption n’annule pas un calcul déjà effectué par Cloudflare.
- Selfie et aperçus uniquement en mémoire dans l’application. Seul le portrait explicitement validé est conservé dans la ligne privée Supabase. Aucun localStorage/IndexedDB, journal de photo ou cache PWA ajouté. La transformation transmet la photo à Cloudflare, après consentement explicite. [Politique de données du fournisseur](https://developers.cloudflare.com/workers-ai/platform/data-usage/).
- Changer de photo/compte, se déconnecter, effacer ou démonter le composant invalide les opérations en attente et révoque les URL blob. Hors ligne, une image déjà générée reste téléchargeable pendant que le composant est ouvert ; la génération exige une connexion.

La ressemblance et la pose sont des objectifs du prompt, pas une garantie pour chaque selfie. Un profil très marqué ou un visage peu lisible peut conduire le modèle à inventer des détails. Il faut évaluer les vrais résultats avant une ouverture aux utilisateurs.

## Première retouche du prompt — 12 octobre 2026 (historique)

La première retouche demandait une illustration 2D fidèle avec une stylisation modérée. Le selfie (image 0) fournissait l’identité et les accessoires ; la référence artistique (image 1) fournissait les contours dessinés, les couleurs, les ombres et le décor céleste. Les lunettes étaient demandées seulement lorsqu’elles figuraient sur le selfie.

Cette première version conservait le vêtement crème et les deux images d’entrée. Elle a été remplacée par la retouche ci-dessous. Le choix de compatibilité conserve `celeste-cartoon-v1` ; aucun portrait enregistré n’est réécrit et aucun contrat, fichier SQL ou dépendance n’est modifié.

## Rendu actuel : selfie seul et vêtement fidèle — 12 octobre 2026

Le selfie courant est désormais la seule référence visuelle. Le prompt demande une illustration 2D avec une stylisation légère et conserve les proportions, les asymétries, l’orientation de la tête, l’expression, l’âge apparent, la carnation, la couleur des yeux, la coiffure et la pilosité visibles. Il ne classe pas automatiquement la personne comme homme ou femme et n’ajoute aucun champ de déclaration. Les lunettes sont reprises avec leur forme et leur couleur uniquement si elles figurent sur la photo ; sinon, les yeux et les tempes sont demandés dégagés.

Le t-shirt reprend la couleur du vêtement visible, ou sa couleur dominante s’il est multicolore. Le crème est réservé au cas où aucun vêtement n’est visible. Le fond reste bleu nuit, avec une grande lune croissante ivoire et dorée et des étoiles ; les détails de la lune et la position des étoiles peuvent légèrement varier entre les générations. La suppression de l’image artistique retire l’influence possible de son personnage et de son vêtement. La ressemblance et la couleur restent des objectifs à contrôler sur de vrais résultats, sans garantie automatique.

## Contrôle des anciennes photos — 12 octobre 2026

Le parcours local ne récupère aucune ancienne photo depuis Cloudflare. Chaque appel construit un nouveau formulaire contenant exactement le selfie de la requête courante (`input_image_0`), le texte courant du prompt et les dimensions. Aucun `input_image_1`, identifiant d’image stockée, historique de conversation ou ancien portrait enregistré n’est transmis. L’appel va directement à Workers AI, sans AI Gateway ; les requêtes et la réponse applicative utilisent `no-store`, et le service worker ne met pas cette API en cache. Changer de photo efface les aperçus et invalide les résultats tardifs.

La référence artistique `assets/avatars/selfie-style-v1.jpg` est maintenant réservée aux tests. Elle n’intervient plus dans les générations. Les aperçus temporaires sont révoqués au remplacement, à l’effacement, à la déconnexion, au changement de compte et à la fermeture ; une ancienne réponse ignorée ne peut pas recréer un aperçu ou être transmise au parent. Seul le portrait explicitement enregistré est conservé dans le compte et n’est jamais réinjecté dans la génération.

**Aucune suppression distante n’a été vérifiée.** L’application ne crée pas de fichier dans Cloudflare Images, R2 ou un autre stockage Cloudflare et ne reçoit pas d’identifiant de photo permettant une suppression ultérieure. La [politique Workers AI](https://developers.cloudflare.com/workers-ai/platform/data-usage/) décrit l’usage des contenus et leur stockage lorsque des services associés sont utilisés ; elle ne constitue pas une preuve individuelle de suppression immédiate. Aucun accès Cloudflare ni navigateur connecté n’était disponible lors de ce contrôle. Une certification distante nécessiterait un contrôle du compte ou une confirmation du fournisseur. Aucun appel de suppression fictif ni message « supprimé de Cloudflare » n’est ajouté.

Le test ciblé envoie deux JPEG de fixture distincts au même serveur simulé, contrôle les octets de chaque entrée, les seuls champs transmis et le prompt courant, puis vérifie qu’une photo vide ne déclenche aucune reprise. Il ne réalise aucune génération réelle. La [documentation du modèle](https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/) décrit les références binaires fournies dans chaque requête ; la [politique Workers AI](https://developers.cloudflare.com/workers-ai/platform/data-usage/) indique que les contenus ne servent pas à entraîner les modèles sans consentement explicite. Ce contrôle du code et du transport simulé ne certifie ni le texte déployé sur l’hébergeur ni l’existence ou la suppression d’images chargées séparément dans un autre service Cloudflare.

Avant la suppression de la référence artistique, le contrôle local des anciennes photos avait réussi : `node --test tests/selfie-avatar.test.mjs tests/portrait-avatar.test.mjs`, 20 tests sur 20 ; contrôle des espaces du diff réussi. Ce premier contrôle complétait seulement le test et la documentation, sans modification du comportement, SQL, service distant ou commit.

## Recette

`node --test tests/selfie-avatar.test.mjs` teste la session, le consentement, les champs fermés, les tailles/signatures/dimensions, le quota, le multipart Cloudflare, les erreurs, l’expiration et la revérification du compte après réception. Les transports et identités sont simulés.

`node --test tests/portrait-avatar.test.mjs` couvre le portrait borné, la création/remplacement, la révision concurrente, la réponse perdue, la colonne absente, la session et l’interruption, la reprise dans le contexte et les badges. La recette `avatar-choice-browser.mjs` couvre aussi la validation, la réouverture du fournisseur simulé sans nouvelle génération, le changement de compte pendant une sauvegarde et le retour à l’avatar personnalisable.

`node tests/selfie-avatar-preview.mjs` expose le vrai composant sur `http://127.0.0.1:3220`, avec un compte et un résultat fictifs. Aucune génération réelle ; les appels externes sont interdits. `node tests/selfie-avatar-browser.mjs` utilise Edge et l’installation locale existante de Puppeteer pour contrôler 320/390/1440 px, deux thèmes, téléchargement hors ligne, erreurs et résultats tardifs après changement de photo/compte. Les captures et résultats sont dans `out/selfie-avatar-preview/`. Les chemins Edge/Puppeteer de la recette sont propres à cet ordinateur.

Pour la page Avatar intégrée : `node tests/selfie-avatar-preview.mjs --page` expose la page réelle sur `http://127.0.0.1:3221`, avec les mêmes services fictifs. `node tests/avatar-choice-browser.mjs` vérifie les deux outils sur les trois largeurs et les deux thèmes, le groupe radio au clavier, la sauvegarde personnalisable, le nettoyage au changement d’option et le choix réinitialisé au changement de compte. Les captures sont dans `out/avatar-choice-preview/`.

Exécuter ensuite `npm run verify`. Aucun commit automatique.

Recette locale du 10 octobre 2026 : `npm run verify` réussi, 373 tests, compilation et build réussis, zéro erreur lint et cinq avertissements préexistants. Recette Edge réussie sur les trois largeurs et les deux thèmes, téléchargement hors ligne et nettoyage des résultats tardifs inclus. La référence artistique est confirmée dans les fichiers tracés de la route pour le déploiement. Aucun appel réel à Cloudflare, aucune modification de base distante et aucun commit.

Extension d’enregistrement du 10 octobre 2026 : `npm run verify` réussi, 380 tests et build, zéro erreur lint/cinq avertissements préexistants. Les sept tests de portrait ont aussi été exécutés après la dernière vérification d’identité. Recette Edge de la page réussie à 320/390/1440 px, deux thèmes, avec validation IA, badge de profil, réouverture sans nouvelle génération, conflit, colonne absente, sauvegarde tardive après changement de compte et retour personnalisable. Transports et base simulés ; aucune installation SQL distante, aucune génération réelle et aucun commit. La persistance réelle et le déclencheur SQL restent à valider après installation manuelle.

Retouche du 12 octobre 2026 : les 19 tests ciblés selfie/portrait passent. `npm run verify` réussi après relance hors du bac à sable (le premier lancement a rencontré `spawn EPERM`) : 380 tests, contrôle des types et build réussis, zéro erreur lint et cinq avertissements préexistants dans des fichiers non modifiés. Le journal local est `out/selfie-prompt-verify.txt`. Fournisseurs et bases simulés, aucune génération réelle, aucune modification SQL et aucun commit. La recette visuelle du nouveau rendu reste à effectuer.

Rendu selfie seul du 12 octobre 2026 : 27 tests ciblés selfie/portrait/PWA réussis, dont le transport A → B à une seule image, les requêtes `no-store` et l’exclusion de l’API avatar du service worker. `npm run verify` final réussi avec 386 tests, contrôle des types et build ; zéro erreur lint et cinq avertissements préexistants. Les tests ciblés ont d’abord rencontré `spawn EPERM` dans le bac à sable ; leur relance et la vérification complète ont été autorisées hors du bac à sable. Journal : `out/selfie-only-verify.txt`.

Recette navigateur selfie seul réussie à 320/390/1440 px dans les deux thèmes, sans erreur ni débordement. Deux images de même nom mais de contenus différents ont des empreintes distinctes dans les requêtes simulées. Révocation des anciens aperçus et exclusion des résultats tardifs après remplacement, effacement, fermeture et changement de compte vérifiées, ainsi que déconnexion, téléchargement hors ligne, erreurs et conversion PNG/WebP. Les captures à 320 px sombre et 390 px clair ont été inspectées. Résultats : `out/selfie-avatar-preview/browser-results.json`. Aucune photo personnelle ni génération réelle, aucune suppression distante vérifiée, aucune modification SQL, aucune dépendance ajoutée et aucun commit. La ressemblance, les lunettes et les couleurs du rendu réel restent à comparer dans l’application.

Après configuration, ouvrir la page Avatar authentifiée et choisir **Photo avec IA** pour comparer des selfies de différentes apparences, sans lunettes, avec lunettes, avec pilosité, avec différentes couleurs de vêtements et de trois quarts. Privilégier un visage net, bien éclairé et cadré de près. Contrôler les proportions et particularités du visage, les cheveux, l’âge apparent, l’expression, la présence conditionnelle des lunettes, la couleur du t-shirt, l’orientation de la tête, le cadrage circulaire, la stylisation légère et la grande lune. Une seule génération ne suffit pas à confirmer l’absence d’ajouts indésirables. Cette validation visuelle réelle reste à effectuer pour le rendu selfie seul ; elle n’est pas remplacée par les tests simulés. Vérifier également la sélection de fichier et le téléchargement sur iPhone/Android réels.
