# Lots 06/07 — Recette applicative

## Contrats confirmés

Application et conformité des SQL signalées par l'utilisateur le 6 octobre 2026. L'assistant a relancé les deux scripts de catalogue dans des transactions READ ONLY sur ephemer-app : `lot06_catalogue_conforme` et `lot07_catalogue_conforme`. Les types ont été régénérés depuis ce projet avant de brancher la persistance. Aucun SQL de mutation, contenu privé ni compte réel utilisé dans ce contrôle. **Ne pas relancer les schémas.** Les dossiers [06](lot-06/README.md) et [07](lot-07/README.md) conservent les procédures de sauvegarde et retour arrière.

## Parcours disponibles avec npm run dev

Depuis le générateur, ouvrir « Mes styles » (`/dashboard/styles`). Créer, modifier, supprimer et choisir explicitement le défaut du compte. Dans la fiche contact (édition ou attentions), choisir son style et ses catégories de centres d'intérêt.

Le générateur applique le style du contact, sinon le défaut du compte, sinon les réglages actuels. Une modification temporaire ou l'application d'un autre style pour cette demande ne réécrit aucun style enregistré. Les six tons restent gratuits. Copier, partager, enregistrer le brouillon et programmer utilisent le même texte final : signature ajoutée une seule fois localement. Ni nom du style ni signature ne sont envoyés à l'IA. Changer de destinataire et terminer une tentative remettent le consentement à zéro ; erreur de génération conserve le résultat précédent.

Dans « Mes idées », combiner recherche, contact, archives, connu/inconnu et plafond d'estimation : pas de conversion de devise, zéro distinct de l'inconnu. Les suggestions reprennent les catégories enregistrées du contact ; une modification temporaire ne les sauvegarde pas. « Enregistrer ces intérêts pour ce contact » est une action explicite. Catégories et titres déjà offerts filtrent localement ; absence de résultat propose d'élargir les filtres, sans génération automatique. Le plafond envoyé est un objectif, pas une promesse de prix.

Les cartes présentent les détails sans retournement, le choix du marchand et une mention d'affiliation seulement si le tag est configuré. Sans achat masque les liens marchands. Enregistrer une suggestion n'invente pas d'estimation. « Déjà offert ? » ouvre une déclaration explicite : aucun achat ou dépense supposé. Depuis une préparation, destinataire canonique et occurrence sont conservés.

## Sauvegardes et export

Chaque création garde son UUID après erreur réseau. Relire le même UUID confirme une réponse perdue sans duplicata ; si la saisie a changé entre les tentatives, comparer explicitement avec la création déjà réussie. Les mises à jour et suppressions exigent la révision connue, filtrent le propriétaire et refusent un conflit. Un rechargement en arrière-plan ne remplace pas la révision d'une préférence en cours de saisie. Les erreurs gardent les champs ; copier avant le rechargement proposé.

L'export **version 5** contient styles, défaut, affectations contact et intérêts, avec les objets antérieurs. Il refuse une panne ou un changement de compte. Les cascades Auth/contact/style sont présentes au catalogue ; la route conserve sa suppression Auth finale. Supprimer un style retire ses affectations et conserve les messages existants.

## Vérifications locales et limites

- Tests Node sur le vrai formulaire et les routes : priorité contact/défaut/temporaire, signature locale, options fermées, corps réellement envoyé au fournisseur simulé, consentement par champ, tailles, prix/stock/livraison refusés.
- `tests/personal-preferences.test.mjs` : persistance simulée, retry UUID, conflit de révision, unicité, colonnes autorisées, rechargement en arrière-plan, reprise des catégories, propriétaire et export.
- `tests/styles-suggestions-preview.mjs` : recette interactive sur les vrais composants et CSS, avec base, Auth et IA fictives, sans connexion externe. Artefacts sous `out/styles-suggestions-preview/`. Vérifier 320/390/1280 px, clair/sombre, styles et affectations, intérêts, retries, erreurs, consentement, signature, compte changé et clavier.
- Le secours hors ligne est une vue publique ; aucun carnet privé n'est conservé dans le service worker.

**Aucun appel IA facturé dans les tests automatiques.** Les simulations ne prouvent ni une reconnexion JWT réelle ni les comportements RLS distants. Le catalogue a été confirmé réellement ; les mutations applicatives sur la cible restent à valider.

## Recette authentifiée avant livraison

Sur la cible, enregistrer style et intérêts, fermer la session puis se reconnecter : retrouver le défaut, le choix contact, la signature et les catégories. Vérifier leur export. Dans deux sessions, modifier la même révision : une seule sauvegarde doit réussir, la seconde garde sa saisie. Tester REST A/B/anon et les cascades uniquement sur une copie autorisée avec comptes fictifs. L'assistant ne supprime aucun compte réel et ne lance aucune mutation distante pour cette recette. Garder la validation du parcours réel distincte de celle des simulations.
