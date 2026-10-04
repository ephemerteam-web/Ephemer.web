# P1 — Réserver le compteur IA au serveur

## État de la correction

**Préparée, non appliquée dans Supabase. Validation humaine requise avant exécution.**

Inspection du 4 octobre 2026 sur le projet `ephemer-app` :

- Signature : `public.incrementer_quota_ia(p_user_id uuid)`, résultat `integer`.
- Fonction `SECURITY DEFINER`, propriétaire `postgres`.
- Droits `EXECUTE` présents pour `PUBLIC`, `anon`, `authenticated` et `service_role`.
- Le serveur appelle déjà cette fonction avec `supabaseAdmin`, après vérification du token par `auth.getUser`. L'identifiant provient de l'utilisateur vérifié, pas du corps de la requête.

La correction concerne uniquement les permissions de cette fonction. Aucun changement des tables, des policies RLS, du corps de la fonction ou du quota journalier. Le propriétaire `postgres` garde ses droits d'administration.

## SQL proposé pour le dashboard Supabase

À exécuter uniquement après validation, dans le SQL Editor du projet `ephemer-app`. La transaction vérifie les permissions avant de les valider ; une exception doit conduire à un `ROLLBACK`, pas à une poursuite du script.

```sql
BEGIN;

REVOKE EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid)
TO service_role;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.incrementer_quota_ia(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.incrementer_quota_ia(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.incrementer_quota_ia(uuid)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'Permissions du compteur IA non conformes : annuler la transaction';
  END IF;
END;
$$;

COMMIT;
```

Le retrait à `PUBLIC` est indispensable : tous les rôles bénéficient de ses droits. Le script est réexécutable. Il ne modifie pas les droits par défaut des autres fonctions du projet.

## Vérifications après application

### 1. Contrôle sans écriture

```sql
SELECT
  has_function_privilege('anon', 'public.incrementer_quota_ia(uuid)', 'EXECUTE') AS anon,
  has_function_privilege('authenticated', 'public.incrementer_quota_ia(uuid)', 'EXECUTE') AS authenticated,
  has_function_privilege('service_role', 'public.incrementer_quota_ia(uuid)', 'EXECUTE') AS service_role;
```

Résultat attendu : `false`, `false`, `true`.

### 2. Appel anonyme refusé

Exécuter séparément ce bloc. Le paramètre nul suffit pour contrôler le droit d'exécution : la fonction doit être refusée avant d'exécuter son corps. La transaction en lecture seule empêche toute consommation de quota si les droits sont encore incorrects.

```sql
BEGIN READ ONLY;
SET LOCAL ROLE anon;
SELECT public.incrementer_quota_ia(NULL::uuid);
ROLLBACK;
```

Résultat attendu : SQLSTATE `42501`, `permission denied for function incrementer_quota_ia`. Si l'éditeur interrompt le bloc à l'erreur, exécuter `ROLLBACK` avant le test suivant. Une erreur de lecture seule ou de paramètre nul n'est pas une réussite du test.

### 3. Appel connecté ordinaire refusé

```sql
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT public.incrementer_quota_ia(NULL::uuid);
ROLLBACK;
```

Même résultat attendu : `42501`, refus d'exécution. Aucun JWT réel ni identifiant de compte n'est nécessaire pour vérifier ce droit SQL.

### 4. Parcours serveur préservé

Les tests locaux de `tests/ai-quota-guard.test.mjs` vérifient avec un client simulé : refus d'une session absente ou invalide sans appel RPC ; utilisation exclusive de l'identifiant vérifié ; succès sous le quota ; limite `429` ; refus en cas d'erreur RPC.

Ces tests ne remplacent pas une vérification réelle après application. Depuis un compte de test connecté disposant de quota, lancer une génération dans l'application et vérifier qu'elle réussit avec un seul incrément pour ce compte. Ce test consomme volontairement une génération ; ne pas le lancer à l'insu d'un utilisateur. Ne jamais exposer de clé serveur pour tester la fonction depuis le navigateur.

## Suivi

Ne considérer ce P1 comme corrigé qu'après exécution validée et réussite des contrôles SQL et du parcours serveur. Toute recréation ultérieure de la fonction doit préserver ces permissions. Ne pas rétablir l'accès public pour contourner une erreur serveur : vérifier d'abord le rôle réellement utilisé par le client admin.

Références : [permissions des fonctions Supabase](https://supabase.com/docs/guides/troubleshooting/how-can-i-revoke-execution-of-a-postgresql-function-2GYb0A), [sécurisation de l'API Supabase](https://supabase.com/docs/guides/api/securing-your-api).

Aucun commit par l'assistant. L'utilisateur vérifie les changements locaux avec `npm run dev` et effectue lui-même le commit.
