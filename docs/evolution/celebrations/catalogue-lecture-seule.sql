-- À utiliser uniquement pour les métadonnées ; aucune lecture de contenu personnel.
BEGIN READ ONLY;
SELECT n.nspname AS schema, c.relname, c.relrowsecurity, c.relforcerowsecurity, c.relacl,
  has_any_column_privilege('authenticated',c.oid,'INSERT') AS insertion_sur_colonnes,
  has_any_column_privilege('authenticated',c.oid,'UPDATE') AS modification_sur_colonnes
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND (n.nspname='ephemer_celebrations'
 OR (n.nspname='public' AND c.relname IN ('preparations_evenements','taches_preparation','idees_cadeaux','choix_cadeaux','cadeaux_offerts')))
ORDER BY n.nspname,c.relname;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='ephemer_celebrations' OR (schemaname='public' AND tablename IN ('preparations_evenements','taches_preparation','idees_cadeaux','choix_cadeaux','cadeaux_offerts'));
SELECT p.proname,pg_get_function_identity_arguments(p.oid),p.proacl,p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='ephemer_celebrations' OR (n.nspname='public' AND p.proname ~ '(celebr|lot04|lot05|reservation|sondage|soutien)');
COMMIT;
