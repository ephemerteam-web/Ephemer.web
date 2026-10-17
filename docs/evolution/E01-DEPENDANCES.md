# E01 — Dépendances et compatibilité

17 octobre 2026. **Réalisation présentée à validation utilisateur.** Le périmètre E01 a été autorisé explicitement ; aucune étape suivante n’est lancée. Le bilan final des commandes figure ci-dessous, avec journaux locaux dans `out/e01/`.

## Résultat

Les cinq mises à niveau directes prévues sont effectuées, avec versions exactes et verrou npm actualisé. Les dépendances indirectes signalées ont été actualisées dans les plages compatibles de leurs parents. **Audit complet : 15 → 5 alertes ; audit des dépendances de production : 6 → 0.** Aucune alerte critique restante dans le rapport npm.

Les cinq alertes élevées restantes proviennent d’une seule chaîne de l’outillage ESLint, détaillée plus bas. Ce résultat décrit les avis npm au moment de la vérification, pas une certification générale de sécurité.

## Versions avant et après

| Paquet direct | Avant, installé | Après, installé et fixé dans package.json |
|---|---|---|
| Next.js | 16.2.6 | **16.4.2** |
| eslint-config-next | 16.2.4 | **16.4.2** |
| ESLint | 9.39.4 | **9.39.5** |
| Tailwind CSS | 4.3.0 | **4.3.3** |
| @tailwindcss/postcss | 4.3.0 | **4.3.3** |

Toutes les autres versions directes installées ont été comparées au verrou sauvegardé et sont conservées, notamment React/React DOM 19.2.4, Supabase JS 2.105.4, SSR 0.10.3, Resend 6.12.3 et TypeScript 5.9.3. Les plages déclarées de ces autres paquets ne changent pas. Aucun paquet direct, service ou script npm ajouté.

| Dépendance indirecte signalée | Avant | Après |
|---|---|---|
| @babel/core | 7.29.0 | 7.29.7 |
| baseline-browser-mapping | 2.10.30 | 2.11.29 |
| brace-expansion, branche ESLint | 1.1.14 | 1.1.21 |
| brace-expansion, branche typescript-eslint | 5.0.6 | 5.0.12 |
| browserslist | 4.28.2 | 4.29.3 |
| js-yaml | 4.1.1 | 4.3.2 |
| nanoid | 3.3.12 | 3.3.20 |
| source-map-js | 1.2.1 | 1.2.2 |
| postcss | 8.4.31 dans Next et 8.5.14 à la racine | 8.5.23, dédupliqué |
| sharp | 0.34.5 | 0.35.5 |

La dépendance `brace-expansion`, corrigée ici, est distincte de `braces`, qui conserve une alerte.

La cible Next.js reste dans la version majeure 16 et suit la [mise à jour de sécurité officielle du 14 octobre](https://nextjs.org/blog/nextjs-security-update-october-14-2026). Documentation Next locale lue avant et après mise à niveau : guide version 16, mise à niveau, guide d’agent de mise à niveau et configuration ESLint. Aucune nouvelle politique de cache, migration vers Cache Components ou fonction expérimentale activée.

## Audits et limites restantes

| Contrôle | Avant | Après |
|---|---|---|
| Audit complet | 15 : 1 faible, 1 modérée, 12 élevées, 1 critique | **5 élevées**, aucune critique/modérée/faible |
| Audit sans dépendances de développement | 6 : 1 modérée, 4 élevées, 1 critique | **0 alerte** |

Chaîne restante :

`eslint-config-next@16.4.2 → @next/eslint-plugin-next@16.4.2 → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3`.

Le défaut signalé est un épuisement de pile lors du traitement de motifs profondément imbriqués : [avis GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). npm compte le paquet affecté et ses quatre parents comme cinq alertes. Cette chaîne relève de l’outillage de lint et est absente du rapport de production. Aucun correctif de `braces` n’était publié lors de la vérification des versions ; aucun remplacement incompatible n’a été forcé.

**Action restante :** surveiller le correctif de `braces` et sa reprise par les parents, puis actualiser la chaîne et refaire lint/audits. La rétrogradation d’`eslint-config-next` vers 14.2.35 suggérée par npm n’a pas été appliquée : elle désalignerait l’outillage du framework. Aucun `npm audit fix --force`, `override` ou retrait de règle de sécurité.

npm marque aussi ESLint 9.39.5 comme version non maintenue. La version majeure 9 reste celle explicitement retenue dans E01. Une migration vers ESLint 10 doit être évaluée séparément avec ses plugins ; elle n’a pas été engagée pour contourner l’alerte `braces`.

## Changements et recettes

### Fichiers de dépendances

`package.json` et `package-lock.json` enregistrent les cinq versions directes fixées et les résolutions indirectes corrigées. La comparaison des autres paquets directs ne révèle aucun renouvellement hors périmètre.

Commandes de mise à niveau exécutées, sans correction forcée :

```powershell
npm install --save-exact next@16.4.2
npm install --save-dev --save-exact eslint-config-next@16.4.2 eslint@9.39.5 tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3
npm update @babel/core baseline-browser-mapping brace-expansion browserslist js-yaml nanoid source-map-js postcss sharp
```

### Montages de recette

Deux anciens aperçus fictifs n’étaient plus isolés des nouvelles entrées sociales :

- `tests/celebrations-preview.mjs` : le signal d’invitations de la navigation importait le contexte Supabase réel, sans configuration dans l’aperçu. Le hook Étoiles est désormais simulé avec une liste reçue vide ; les vrais composants de navigation/calendrier/partage sont conservés.
- `tests/celebration-unified-preview.mjs` : le centre Célébrations tentait de lire une session absente du faux client. Ses lectures partagées renvoient maintenant des listes fictives vides et ses commandes hors recette sont refusées explicitement.
- `tests/celebration-unified-browser.mjs` : ouverture de la rubrique des anciennes préparations, puis ciblage des boutons de cette rubrique pour éviter de confondre ses commandes avec celles du centre partagé.

Ces ajustements corrigent les montages de recette, sans désactiver les fonctions sociales dans l’application. Aucun fichier applicatif, contrat d’API, type métier, schéma, cron ou service worker modifié par E01.

### Résultats

| Vérification | Résultat / preuve |
|---|---|
| Référence `npm run verify` | **456 tests, zéro échec, types et build réussis**, zéro erreur lint/cinq avertissements. `out/e01/avant/verify.txt`. |
| Vérification après mises à niveau | **456 tests, zéro échec, types et build réussis**, zéro erreur lint/six avertissements. `out/e01/apres/verify.txt`. |
| Vérification finale après adaptation des montages | **Réussie : 456 tests, zéro échec, types et build Next 16.4.2**, zéro erreur lint/six avertissements. `out/e01/apres/verify-final.txt`. |
| HTTP sur build Next 16.4.2 local | **Réussi** : 11 références d’assets, image sociale/polices/PWA, page 404, redirection historique, page privée redirigée, API refusées sans authentification. `out/e01/apres/http-produit.txt`. |
| HTTP cartes | **Réussi** : shell HTML/RSC générique, en-têtes privés, lien inconnu refusé, méthodes et routes propriétaires protégées. `out/e01/apres/http-cartes.txt`. Aucune écriture distante. |
| Connexion / Dates / carte personnelle | **Réussi** à 320/390/1440 px, deux thèmes pour connexion/calendrier : page de connexion réelle hydratée et visibilité du mot de passe, validation native sans soumission, protection de Dates sans session ; calendrier réel sur données fictives, sélection d’un jour, Agenda/changement de mois et aperçu de carte personnelle. `out/e01/apres/navigateur-parcours-final.txt`. |
| Préparations personnelles | **Réussi** à 320/390/1440 px et deux thèmes : trois onglets, clavier, saisie conservée, modèle interrompu/repris, panne de sauvegarde, budget sans double comptage, compte, historique, ouverture de préparation et hors ligne. `out/e01/apres/navigateur-preparations-final.txt`. |
| Cartes collectives | **Réussi** à 320/390/1440 px et deux thèmes : contributions/publication, clavier, panne/reprise, changement de compte, révocation, PNG réel 1280 × 1154 et carte longue en cinq pages. `out/e01/apres/navigateur-collectif.txt`. |

Les cinq avertissements initiaux restent présents. Une nouvelle règle Next signale la navigation `window.location.assign('/')` dans `app/global-error.tsx` ; c’est un avertissement non bloquant, conservé et documenté, sans désactivation de règle ni modification du secours d’erreur globale dans cette mise à niveau. Une amélioration ultérieure devra garder un retour fonctionnel même si le layout ou le routeur est défaillant.

Les captures sont dans `out/e01/navigateur/`, `out/e01/preparations/` et `out/e01/collectif/`. Inspection visuelle du calendrier mobile clair et de l’aperçu collectif mobile sombre effectuée. Les scripts de recette supplémentaires, leurs sorties et les sauvegardes restent sous `out/e01/`, ignoré par Git. Les scripts suivis existants restent utilisables pour les recettes de préparations et cartes collectives.

**Limites :** navigateur Edge sur tailles d’écran simulées, pas de téléphone physique. La page de connexion est testée sans envoyer d’identifiants ; les parcours privés utilisent les vrais composants avec données/transports fictifs. Cela ne constitue pas une connexion Auth réelle, une recette RLS distante ou une réception email/push. Les requêtes externes du navigateur connexion/calendrier ont été bloquées ; aucun fournisseur email, push ou IA n’a été appelé. Les serveurs temporaires de recette sont arrêtés après les contrôles.

## Retour ciblé à la référence

Le dépôt était propre au démarrage, consigné dans `out/e01/avant/etat-git.txt` et `revision.txt`. `package.json` et le verrou ont été copiés avant installation ; les trois fichiers de recette d’origine sont également conservés sous `out/e01/avant/tests/`, extraits de cette référence Git propre.

1. Arrêter les serveurs locaux de cette version. Si d’autres modifications sont intervenues depuis E01, les préserver et comparer les cinq fichiers concernés avant restauration ; ne pas réinitialiser tout le dépôt.
2. Recopier uniquement les versions sauvegardées de `package.json`, `package-lock.json`, `tests/celebrations-preview.mjs`, `tests/celebration-unified-preview.mjs` et `tests/celebration-unified-browser.mjs` vers leurs chemins d’origine. Réconcilier séparément le statut documentaire d’E01 ; aucune donnée utilisateur à restaurer.
3. Exécuter `npm ci`, puis `npm run verify` et les audits. Le verrou antérieur réinstalle les anciennes dépendances et leurs alertes ; ce retour est une mesure de diagnostic temporaire, pas une correction de sécurité.

Les sauvegardes ignorées doivent être conservées si ce retour local est souhaité ; leur présence dans `out/` ne garantit pas leur archivage avec le dépôt. Aucune restauration, installation SQL, mutation de compte, modification de secret, création de commit ou publication effectuée par cette livraison.

## Validation utilisateur restante

E01 est à essayer avec `npm run dev` : connexion, Dates, préparation, carte existante et carte collective. Après cet essai, l’utilisateur peut accepter E01 en gardant la chaîne d’outillage et les avertissements documentés, ou demander une correction ciblée. E02 reste distincte et non lancée.
