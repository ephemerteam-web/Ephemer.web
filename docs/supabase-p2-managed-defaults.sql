-- Procédure séparée : rôle plateforme autorisé, PAS le SQL Editor postgres actuel.
-- Vérifier/archiver pg_default_acl pour supabase_admin avant toute application.
BEGIN;
DO $$ BEGIN
 IF NOT pg_has_role(current_user,'supabase_admin','MEMBER') AND NOT (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) THEN
   RAISE EXCEPTION 'Rôle insuffisant : ces defaults sont gérés par Supabase. Ne pas contourner cette restriction.';
 END IF;
END $$;
CREATE TABLE p2_backup_20261004.managed_defaults AS
SELECT * FROM pg_default_acl WHERE defaclrole='supabase_admin'::regrole;
REVOKE ALL ON p2_backup_20261004.managed_defaults FROM PUBLIC,anon,authenticated;
INSERT INTO p2_backup_20261004.restore_commands(kind,sql)
SELECT 'managed_default',format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin%s GRANT %s ON %s TO %s%s',
 CASE WHEN d.defaclnamespace=0 THEN '' ELSE format(' IN SCHEMA %I',n.nspname) END,
 a.privilege_type,CASE d.defaclobjtype WHEN 'r' THEN 'TABLES' WHEN 'S' THEN 'SEQUENCES' ELSE 'FUNCTIONS' END,
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,
 CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace CROSS JOIN LATERAL aclexplode(d.defaclacl) a
WHERE d.defaclrole='supabase_admin'::regrole AND d.defaclobjtype IN ('r','S','f') AND (d.defaclnamespace=0 OR n.nspname='public')
AND (a.grantee=0 OR pg_get_userbyid(a.grantee) IN ('anon','authenticated'));
-- Sans ACL globale explicite, EXECUTE sur les fonctions revient à PUBLIC.
INSERT INTO p2_backup_20261004.restore_commands(kind,sql)
SELECT 'managed_default','ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin GRANT EXECUTE ON FUNCTIONS TO PUBLIC'
WHERE NOT EXISTS(SELECT 1 FROM pg_default_acl WHERE defaclrole='supabase_admin'::regrole AND defaclnamespace=0 AND defaclobjtype='f');
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated;
COMMIT;
-- Retour arrière séparé, même rôle autorisé :
-- BEGIN;
-- DO $$ DECLARE r record; BEGIN
-- FOR r IN SELECT sql FROM p2_backup_20261004.restore_commands WHERE kind='managed_default' ORDER BY position LOOP EXECUTE r.sql; END LOOP;
-- END $$;
-- COMMIT;
