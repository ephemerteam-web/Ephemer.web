# Contrat applicatif V3

## Livré avant confirmation

`lib/avatar-collection-v3.ts` définit le contrat fermé et le défaut Homme/clair/châtaigne/mèche/amande/marron/sourire doux/sweat orange, sans accessoire. `avatar-render-config.ts` et `AvatarRenderer.tsx` préparent le dispatcher V1/V3. `AvatarRendererV3.tsx` sépare les couches SVG locales. `AvatarEditorV3.tsx` regroupe les catégories et ouvre une palette native, avec utilisation/annulation. `AvatarPreviewV3.tsx` reste autonome, sans sauvegarde.

## Branchement effectué après contrôle conforme et types réels

8 octobre 2026 : fichier de contrôle combiné exécuté en entier en READ ONLY, `avatar_v3_catalogue_conforme`, puis types réels régénérés par Supabase. Les garanties suivantes sont intégrées ; leurs tests de persistance utilisent des clients simulés. Les parcours authentifiés distants restent à recetter.

1. `avatar-data.ts` accepte `AvatarRenderConfig`. Un profil invalide utilise un défaut V3 expliqué, sans réécriture automatique. Une copie publiée invalide est refusée. Un avatar historique valide conserve son moteur dans les cartes.
2. Profil : seulement **Avatar** et le nouvel éditeur ; **Valider les modifications**, sauvegarde réelle explicite par `saveAvatar`, états chargement/réussite/erreur/conflit. Un profil V1 existant est préservé en base jusqu’à validation volontaire d’un avatar V3 ; aucune conversion enregistrée silencieuse. L’ancien éditeur n’est plus proposé.
3. Conserver révision attendue, lecture préalable, reconnaissance d’une écriture réussie, vérification après réponse perdue et relecture volontaire conservant la saisie. Protéger réponses tardives/changement de compte ; annulation sans écriture.
4. `card-snapshot-v2.ts` accepte `avatarRenderConfig`, avatar facultatif, snapshot à sept champs inchangé et copie profonde. `CardRendererV2` change uniquement l’appel au dispatcher ; les empreintes HTML des trois modèles avec avatar V1, capturées avant branchement, sont identiques après intégration.
5. Ajouter/Actualiser/Retirer copie l’avatar enregistré sur action volontaire, modifie la saisie et exige sauvegarde du brouillon. Publication RPC 09 actuelle ; aucune lecture de profil/contact pendant la consultation.
6. Export 7 complet/versionné sans secret. Maintenir protections HTTP, révocation/expiration, absence d’indexation/cache public/appel tiers/stockage persistant navigateur.

Les colonnes JSON restent génériques, mais la régénération réelle et sa provenance précèdent l’intégration. Après application V3, utiliser le contrôle combiné de ce dossier : le contrôle historique 09 refuse volontairement le nouveau corps de fonction.
