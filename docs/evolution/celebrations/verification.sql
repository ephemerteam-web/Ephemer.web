-- Catalogue seulement, à exécuter humainement APRÈS installation sur copie.
BEGIN READ ONLY;
DO $verification$ DECLARE r record; n integer; BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='ephemer_celebrations') THEN RAISE EXCEPTION 'Schema B absent'; END IF;
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='ephemer_celebrations' AND c.relkind='r';
  IF n<>11 THEN RAISE EXCEPTION 'Nombre de tables B inattendu'; END IF;
  FOR r IN SELECT c.oid,c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='ephemer_celebrations' AND c.relkind='r' LOOP
    IF NOT r.relrowsecurity OR has_any_column_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,REFERENCES')
      OR has_any_column_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,REFERENCES')
      OR has_any_column_privilege('service_role',r.oid,'SELECT,INSERT,UPDATE,REFERENCES')
      OR has_table_privilege('authenticated',r.oid,'DELETE,TRUNCATE') THEN RAISE EXCEPTION 'Table interne ouverte : %',r.relname; END IF;
  END LOOP;
  FOR r IN SELECT p.oid,p.proname,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='ephemer_celebrations' LOOP
    IF has_function_privilege('public',r.oid,'EXECUTE') OR has_function_privilege('anon',r.oid,'EXECUTE') OR has_function_privilege('service_role',r.oid,'EXECUTE') THEN RAISE EXCEPTION 'Fonction interne ouverte : %',r.proname; END IF;
    IF has_function_privilege('authenticated',r.oid,'EXECUTE') IS DISTINCT FROM (r.proname IN ('commander','lire','lister','preparer_effacement')) THEN RAISE EXCEPTION 'Surface RPC incorrecte : %',r.proname; END IF;
    IF NOT ('search_path=pg_catalog'=ANY(r.proconfig)) THEN RAISE EXCEPTION 'search_path non ferme'; END IF;
  END LOOP;
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND p.proname IN ('commander_celebrations','lire_celebration','lire_celebrations','lire_invitations_celebrations','exporter_celebrations','preparer_effacement_celebrations')
    AND NOT p.prosecdef AND has_function_privilege('authenticated',p.oid,'EXECUTE') AND NOT has_function_privilege('public',p.oid,'EXECUTE') AND NOT has_function_privilege('anon',p.oid,'EXECUTE') AND NOT has_function_privilege('service_role',p.oid,'EXECUTE');
  IF n<>6 THEN RAISE EXCEPTION 'RPC publiques incorrectes'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ephemer_social.blocages_etoiles'::regclass AND tgname='celebrations_blocage' AND tgenabled='O')
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND tgname='celebrations_effacement' AND tgenabled='O') THEN RAISE EXCEPTION 'Revocation transactionnelle absente'; END IF;
END $verification$;
SELECT 'celebrations_b_catalogue_conforme' AS resultat;
COMMIT;
