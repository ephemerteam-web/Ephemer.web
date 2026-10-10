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
- Le modèle fixe est `@cf/black-forest-labs/flux-2-klein-4b`. Deux références binaires : le selfie en image 0 et `assets/avatars/selfie-style-v1.jpg` en image 1. Cette dernière est le portrait cartoon à grande lune validé pendant la conception, redimensionné à 500 × 500. Il est livré avec le serveur, sans téléchargement externe.
- Prompt fixe dans `lib/selfie-avatar-server.ts`, version `celeste-cartoon-v1`. Il demande de préserver l’identité du selfie et de reprendre uniquement le style de la référence. Une évolution du rendu demande une nouvelle version du prompt et une recette visuelle.
- Sortie carrée 1024 × 1024, jusqu’à 8 Mio, type réel JPEG/PNG/WebP vérifié. Réponse binaire `no-store`, en-tête `X-Ephemer-Avatar-Prompt`. Erreurs JSON `{ error: { code, message } }`, messages français sans détail privé du fournisseur.
- Appel Cloudflare limité à 60 secondes, route avec marge de 90 secondes pour la préparation/authentification. Aucun réessai automatique. Le composant peut interrompre l’attente ; une interruption n’annule pas un calcul déjà effectué par Cloudflare.
- Selfie et aperçus uniquement en mémoire dans l’application. Seul le portrait explicitement validé est conservé dans la ligne privée Supabase. Aucun localStorage/IndexedDB, journal de photo ou cache PWA ajouté. La transformation transmet la photo à Cloudflare, après consentement explicite. [Politique de données du fournisseur](https://developers.cloudflare.com/workers-ai/platform/data-usage/).
- Changer de photo/compte, se déconnecter, effacer ou démonter le composant invalide les opérations en attente et révoque les URL blob. Hors ligne, une image déjà générée reste téléchargeable pendant que le composant est ouvert ; la génération exige une connexion.

La ressemblance et la pose sont des objectifs du prompt, pas une garantie pour chaque selfie. Un profil très marqué ou un visage peu lisible peut conduire le modèle à inventer des détails. Il faut évaluer les vrais résultats avant une ouverture aux utilisateurs.

## Recette

`node --test tests/selfie-avatar.test.mjs` teste la session, le consentement, les champs fermés, les tailles/signatures/dimensions, le quota, le multipart Cloudflare, les erreurs, l’expiration et la revérification du compte après réception. Les transports et identités sont simulés.

`node --test tests/portrait-avatar.test.mjs` couvre le portrait borné, la création/remplacement, la révision concurrente, la réponse perdue, la colonne absente, la session et l’interruption, la reprise dans le contexte et les badges. La recette `avatar-choice-browser.mjs` couvre aussi la validation, la réouverture du fournisseur simulé sans nouvelle génération, le changement de compte pendant une sauvegarde et le retour à l’avatar personnalisable.

`node tests/selfie-avatar-preview.mjs` expose le vrai composant sur `http://127.0.0.1:3220`, avec un compte et un résultat fictifs. Aucune génération réelle ; les appels externes sont interdits. `node tests/selfie-avatar-browser.mjs` utilise Edge et l’installation locale existante de Puppeteer pour contrôler 320/390/1440 px, deux thèmes, téléchargement hors ligne, erreurs et résultats tardifs après changement de photo/compte. Les captures et résultats sont dans `out/selfie-avatar-preview/`. Les chemins Edge/Puppeteer de la recette sont propres à cet ordinateur.

Pour la page Avatar intégrée : `node tests/selfie-avatar-preview.mjs --page` expose la page réelle sur `http://127.0.0.1:3221`, avec les mêmes services fictifs. `node tests/avatar-choice-browser.mjs` vérifie les deux outils sur les trois largeurs et les deux thèmes, le groupe radio au clavier, la sauvegarde personnalisable, le nettoyage au changement d’option et le choix réinitialisé au changement de compte. Les captures sont dans `out/avatar-choice-preview/`.

Exécuter ensuite `npm run verify`. Aucun commit automatique.

Recette locale du 10 octobre 2026 : `npm run verify` réussi, 373 tests, compilation et build réussis, zéro erreur lint et cinq avertissements préexistants. Recette Edge réussie sur les trois largeurs et les deux thèmes, téléchargement hors ligne et nettoyage des résultats tardifs inclus. La référence artistique est confirmée dans les fichiers tracés de la route pour le déploiement. Aucun appel réel à Cloudflare, aucune modification de base distante et aucun commit.

Extension d’enregistrement du 10 octobre 2026 : `npm run verify` réussi, 380 tests et build, zéro erreur lint/cinq avertissements préexistants. Les sept tests de portrait ont aussi été exécutés après la dernière vérification d’identité. Recette Edge de la page réussie à 320/390/1440 px, deux thèmes, avec validation IA, badge de profil, réouverture sans nouvelle génération, conflit, colonne absente, sauvegarde tardive après changement de compte et retour personnalisable. Transports et base simulés ; aucune installation SQL distante, aucune génération réelle et aucun commit. La persistance réelle et le déclencheur SQL restent à valider après installation manuelle.

Après configuration, ouvrir la page Avatar authentifiée et choisir **Photo avec IA** pour comparer les deux selfies fournis : portrait frontal, trois quarts, cheveux et pilosité différents. Contrôler la ressemblance, la pose, le cadrage circulaire, le style cartoon et la grande lune, puis ajuster le prompt/version si nécessaire. Cette validation visuelle réelle n’est pas remplacée par les tests simulés. Vérifier également la sélection de fichier et le téléchargement sur iPhone/Android réels.
