# Lot 07 — Intérêts privés et suggestions cadeaux

**6 octobre 2026 — contrat installé et confirmé.** L'utilisateur confirme l'application manuelle et la conformité des SQL. L'assistant a relancé le catalogue distant en lecture seule : `lot07_catalogue_conforme`, puis régénéré les types depuis Supabase. Les intérêts sont enregistrables explicitement depuis la fiche contact et les suggestions ; ils sont repris après rechargement et utilisés seulement dans les filtres locaux. Aucune mutation distante exécutée par l'assistant. La recette applicative authentifiée reste à confirmer sur le projet cible ; voir [la recette](../lot-06-07-recette-app.md).

## Contrat proposé

Une table `preferences_cadeaux_contacts` : propriétaire, contact, catégories fermées (loisir, bien_etre, tech, decoration, gourmand), sans doublon ni NULL. Tableau vide autorisé. Aucun intérêt extrait de contacts.note, aucun champ libre ou consentement persistant.

Les catégories guident seulement le tri local. Le plafond de recherche, sa devise et le mode d'attention sont des paramètres temporaires autorisés pour Mammouth AI, distincts des dépenses et du budget lot 05. La sauvegarde des catégories est une action explicite ; une modification temporaire ne les réécrit pas. Aucun catalogue produit : pas de prix vérifié, stock, scraping, upload ou API commerciale.


Chaque table possède UUID, propriétaire Auth, révision 1–9 007 199 254 740 991 et dates techniques. FK composées vers le même propriétaire. Quatre RLS par opération ; droits INSERT/UPDATE limités aux colonnes nécessaires. Identité/contact/dates techniques immuables. SELECT/DELETE authentifiés, SELECT serveur seulement, aucun droit anon. Helpers SECURITY INVOKER avec search_path fixe ; aucun nouveau RPC public.

## Application humaine

Procédure initiale conservée pour référence. **Le schéma est déjà installé : ne pas le relancer.** L'export actuel est en version 5 et inclut `preferences_cadeaux_contacts` avec les styles et leurs affectations.

1. Relire le schéma complet et les contrats des lots 02–05 installés. La clé contacts UNIQUE(user_id,id) et PostgreSQL 17 ont été confirmés en lecture seule. Le schéma refuse une réexécution.
2. **Sauvegarder avant application**, vérifier une restauration sur copie et consigner le projet cible. Les sauvegardes des fournisseurs ne sont pas un export applicatif.
3. Tester le schéma et la recette sur une copie isolée autorisée, sans compte réel. Relire les triggers Auth/contacts ; neutraliser tout prestataire externe dans cette copie.
4. Appliquer manuellement `schema-propose.sql` dans le SQL Editor du projet validé. Aucun `supabase/migrations` à modifier.
5. Exécuter **entièrement** `verification-lecture-seule.sql`. Le marqueur attendu est `lot07_catalogue_conforme` ; comparer aussi colonnes, contraintes, index et fonctions affichés au schéma proposé. Ce contrôle ne prouve pas les comportements RLS.
6. Faire confirmer le catalogue en lecture seule, puis régénérer les types réels et intégrer les sauvegardes. Ne pas relancer les schémas des lots précédents.

## Recette isolée

`verification.sql` contient uniquement la recette mutante et se termine par ROLLBACK. Elle est volontairement protégée par un témoin de session. Dans **la même session**, sur la copie autorisée uniquement :

```sql
SET ephemer.lot07_test_isole='CONFIRME_COPIE_ISOLEE_LOT07';
```

Puis exécuter la recette. En cas d'erreur, faire ROLLBACK dans cette session. Le script utilise seulement des UUID fictifs, des emails example.invalid et des contacts aux IDs négatifs vérifiés libres. Ne jamais remplacer ces fixtures par un compte réel. SET ROLE/claims teste le rôle SQL, pas la vérification cryptographique du JWT. Aucun email ni appel IA dans la recette.

Tests inclus : création et retry sans doublon, valeurs inconnues, révision périmée/UPDATE aveugle, isolation A/B, falsification de propriétaire, référence étrangère, droits anon, reprise sous A, suppression contact/style selon le lot et cascade Auth.

### Deux connexions et vraie reconnexion

Sur la copie autorisée, préparer deux comptes de test via Auth et un contact de A. Dans deux sessions client A, créer simultanément les préférences du même contact avec deux UUID : une seule ligne peut exister, le second INSERT reçoit un conflit d'unicité. Avec un UUID identique, relire l'UUID après un résultat réseau incertain ; ne pas écraser les valeurs déjà enregistrées. Pour deux modifications attendues sur la même révision, un seul UPDATE filtré (id, user_id, revision) doit réussir, l'autre doit renvoyer zéro ligne. Garder la saisie perdante et proposer une relecture explicite, sans retry aveugle.

Après intégration applicative : enregistrer, fermer la session, se reconnecter avec le vrai JWT de A et retrouver le choix ; B et anon ne doivent ni lire ni modifier ces lignes par REST. Révoquer la session ou changer de compte doit vider les états privés. Ces essais restent **à exécuter**, ils ne sont pas attestés par les tests simulés.

## Export, suppression et retour arrière

L'export paginé actuel version 5 inclut `preferences_cadeaux_contacts` avec les styles et leurs affectations de l'extension 4. Il filtre le propriétaire et s'arrête sur erreur/changement de compte. La cascade Auth nettoie les nouveaux objets sans ouvrir leurs écritures au client admin. Aucune préférence dans le cache PWA, les journaux, l'analytique ou le prompt IA.

`retour-arriere.sql` verrouille les tables et **refuse toute présence de données**. DROP RESTRICT refuse les dépendances de catalogue ultérieures ; aucune suppression CASCADE. Avant rollback, retirer aussi les dépendances applicatives/exports et vérifier les dépendances dynamiques non détectables par PostgreSQL. Si données ou dépendances existent, sauvegarde et réconciliation manuelles sont obligatoires. Ne pas contourner le garde-fou.

[Cadre commun](../../PLAN-EVOLUTION-EPHEMER.md#3-cadre-commun-à-tous-les-prompts) · [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
