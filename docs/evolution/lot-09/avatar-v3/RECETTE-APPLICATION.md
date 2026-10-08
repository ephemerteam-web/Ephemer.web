# Recette V3

## Effectué

Contrats TypeScript et SVG React réels ; interactions du harnais, stockage et routes HTTP simulés. 169 expressions SQL proposées évaluées réellement en READ ONLY, zéro divergence. **Extension appliquée humainement, catalogue V3 confirmé par le fichier complet en READ ONLY (`avatar_v3_catalogue_conforme`), types réels régénérés par Supabase avant intégration, le 8 octobre 2026.** Aucun profil distant écrit pour la recette.

**Vérification finale : `npm run verify` réussi, 230 tests, TypeScript et build de production ; lint zéro erreur, onze avertissements préexistants. `git diff --check` et contrôle des fichiers nouveaux réussis.** Tests supplémentaires : stockage V3 avec réponse perdue sans double écriture, conflit sans écrasement, entrée hostile refusée avant réseau, copie profonde des accessoires, ouverture/annulation des profils historiques sans écriture, panne de lecture et réponse tardive ignorée. Le HTML des trois modèles avec avatar V1 est identique aux empreintes prises avant branchement. Les routes HTTP réelles utilisent une base/identité simulées : publication V3, réponse publique fermée et absence de lecture du profil ; export 7 avec configuration V3 complète.

Navigateur réel : atelier à 1080 px et palettes à 320 px, clavier et Échap restituant le focus, changement de base conservant bouche/coiffure/vêtement. Palette fusionnée yeux/couleur : les deux portraits complets reflètent le choix bleu/violet ; portrait interne visible au défilement (top 21 px, bottom 161 px), page 320 px et palette 303 px sans débordement. Les exemples sont fictifs, aucune écriture distante. Toutes les combinaisons et tous les accessoires n’ont pas été inspectés dans le navigateur.

Après branchement : **Valider les modifications** ferme l’atelier avec succès explicite et rend le focus à **Personnaliser mon avatar**. Sourire choisi aux flèches, conservé dans le stockage fictif après remontage A → B → A ; B retrouve son défaut séparé. Ouverture : focus sur le premier choix actif. Palette fusionnée yeux/couleur à 320 px : sélection Bleu, portrait entier toujours visible, page 320/palette 303 sans débordement. Échap annule Bleu, puis l’atelier, focus restitué à chaque niveau. Ces actions utilisent les vrais composants avec le stockage fictif décrit ci-dessous, pas une reconnexion Supabase réelle.

## Aperçu local

Lancer `node tests/avatars-preview.mjs` et ouvrir `http://127.0.0.1:3209/`. Aucun compte distant. Ouvrir l’atelier, puis Bouche : quatre sourires distincts, flèches du clavier, focus visible, utilisation/annulation. Tester les palettes fusionnées yeux/couleur, coiffure/couleur, vêtement/couleur, visage/teint et accessoires simultanés. Dans chaque pop-up, le portrait entier doit réagir aux deux groupes et rester visible au défilement ; annuler restaure les deux choix.

À 320 px et sur ordinateur : aucun débordement horizontal de page/atelier/palette, deux colonnes mobile. Échap dans la palette restaure son choix et rend le focus à la catégorie sans fermer l’atelier ; Échap dans l’atelier annule tout. Réouvrir retrouve la version enregistrée (défaut s’il n’existe aucune ligne). Homme/Femme conserve les autres choix. **Valider les modifications** utilise ici un stockage simulé en mémoire, qui survit au remontage A → B → A mais pas au rechargement de la page. Pour la sauvegarde réelle : `npm run dev`, `/dashboard/profil`, compte authentifié.

## SQL isolé et parcours réels restants

[verification.sql](verification.sql) est **mutant**, exclusivement sur copie isolée autorisée. Examiner les triggers Auth et neutraliser les prestataires externes. Dans **le même envoi/session**, placer `SET ephemer.avatar_v3_test_isole='CONFIRME_COPIE_ISOLEE_AVATAR_V3';` avant le fichier complet. Le marqueur est une déclaration humaine, pas une détection de cible ; jamais sur le projet principal. ROLLBACK final, résultat attendu `avatar_v3_recette_isolee_conforme`. Recette 09 complète augmentée de sauvegarde V3, configurations hostiles, isolation, publication/retry et stabilité/rotation/révocation.

Claims SQL simulés : ils ne prouvent ni JWT signé, reconnexion, concurrence à deux connexions ni crypto HTTP. Parcours réels encore à effectuer :

- Vrais comptes A/B : isolation REST/RPC, refus anonyme et changement de compte pendant lecture/écriture.
- Valider → reconnexion → autre appareil : avatar complet retrouvé. Hors ligne : erreur explicite.
- Conflit conserve la saisie ; réponse perdue vérifiée avant toute deuxième écriture.
- Publication V3 inchangée après modification du profil/brouillon ; anciennes cartes/avatars V1 exacts ; projection sans profil privé.
- Publication contre édition, rotation/révocation/expiration et retry sans réactivation ; export 7 sans secret.
- Desktop/mobile/clavier, annulation et petite signature ; cascades exclusivement sur comptes fictifs autorisés.

L’absence de branche/projet gratuit ne justifie pas de lever le garde. Aucune recette mutante effectuée dans cette tranche.
