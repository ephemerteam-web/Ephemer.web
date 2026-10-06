-- Lot 04 — controle de catalogue uniquement, executable EN ENTIER.
-- Aucune fixture ni mutation. Ne prouve pas la recette RLS entre comptes.
-- Lot 04 — A = metadonnees READ ONLY ; B = fixtures isolees DESACTIVEES.
-- Ne pas coller ce fichier avec le schema. Lire README.md.
-- A uniquement peut confirmer l'installation distante, sans lire de donnees privees.
BEGIN READ ONLY;
SELECT n.nspname,c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) AS proprietaire_sql
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('preparations_evenements','taches_preparation');
SELECT table_name,column_name,data_type,is_nullable,column_default
FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('preparations_evenements','taches_preparation')
ORDER BY table_name,ordinal_position;
SELECT conrelid::regclass,conname,pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid IN (to_regclass('public.preparations_evenements'),to_regclass('public.taches_preparation'));
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('preparations_evenements','taches_preparation');
SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public' AND tablename IN ('preparations_evenements','taches_preparation');
SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('preparations_evenements','taches_preparation') ORDER BY 1,2,3;
SELECT table_name,column_name,grantee,privilege_type FROM information_schema.role_column_grants
WHERE table_schema='public' AND table_name IN ('preparations_evenements','taches_preparation') ORDER BY 1,2,3,4;
SELECT tgrelid::regclass,pg_get_triggerdef(oid) FROM pg_trigger
WHERE NOT tgisinternal AND tgrelid IN (to_regclass('public.preparations_evenements'),to_regclass('public.taches_preparation'));
SELECT n.nspname,p.proname,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='ephemer_lot04' OR (n.nspname='public' AND p.proname IN ('ouvrir_preparation_lot04','enregistrer_preparation_lot04','ajouter_tache_lot04','enregistrer_tache_lot04'));
DO $catalogue$
DECLARE v_table text; v_oid regclass; v_col text; v_insert text[]; v_update text[]; v_rpc text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['preparations_evenements','taches_preparation'] LOOP
    v_oid:=to_regclass('public.'||v_table);
    IF v_oid IS NULL OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=v_oid) THEN
      RAISE EXCEPTION 'Table/RLS absente : %',v_table;
    END IF;
    IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename=v_table)<>4
      OR (SELECT count(DISTINCT cmd) FROM pg_policies WHERE schemaname='public' AND tablename=v_table
        AND roles=ARRAY['authenticated']::name[])<>4 THEN
      RAISE EXCEPTION 'Quatre policies proprietaire attendues : %',v_table;
    END IF;
    IF has_table_privilege('anon',v_oid,'SELECT') OR has_table_privilege('anon',v_oid,'DELETE')
      OR has_any_column_privilege('anon',v_oid,'INSERT') OR has_any_column_privilege('anon',v_oid,'UPDATE')
      OR NOT has_table_privilege('authenticated',v_oid,'SELECT')
      OR NOT has_table_privilege('authenticated',v_oid,'DELETE')
      OR has_table_privilege('authenticated',v_oid,'INSERT') OR has_table_privilege('authenticated',v_oid,'UPDATE')
      OR has_table_privilege('authenticated',v_oid,'TRUNCATE')
      OR has_table_privilege('authenticated',v_oid,'REFERENCES')
      OR has_table_privilege('authenticated',v_oid,'TRIGGER')
      OR NOT has_table_privilege('service_role',v_oid,'SELECT')
      OR has_table_privilege('service_role',v_oid,'DELETE')
      OR has_any_column_privilege('service_role',v_oid,'INSERT')
      OR has_any_column_privilege('service_role',v_oid,'UPDATE') THEN
      RAISE EXCEPTION 'Droits inattendus : %',v_table;
    END IF;
    IF v_table='preparations_evenements' THEN
      v_insert:=ARRAY['id','user_id','occurrence_id','etat','sans_achat'];
      v_update:=ARRAY['etat','sans_achat','revision'];
    END IF;
    IF v_table='taches_preparation' THEN
      v_insert:=ARRAY['id','user_id','preparation_id','type_tache','titre','brouillon_texte','etat'];
      v_update:=ARRAY['titre','brouillon_texte','etat','revision'];
    END IF;
    FOR v_col IN SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=v_table LOOP
      IF has_column_privilege('authenticated',v_oid,v_col,'INSERT') IS DISTINCT FROM (v_col=ANY(v_insert))
        OR has_column_privilege('authenticated',v_oid,v_col,'UPDATE') IS DISTINCT FROM (v_col=ANY(v_update)) THEN
        RAISE EXCEPTION 'Droit colonne divergent : %.%',v_table,v_col;
      END IF;
    END LOOP;
  END LOOP;
  FOREACH v_rpc IN ARRAY ARRAY['public.ouvrir_preparation_lot04(uuid)','public.enregistrer_preparation_lot04(uuid,bigint,text,boolean)','public.ajouter_tache_lot04(uuid,uuid,text,text)','public.enregistrer_tache_lot04(uuid,bigint,text,text,text)'] LOOP
    IF to_regprocedure(v_rpc) IS NULL THEN RAISE EXCEPTION 'RPC absente : %',v_rpc; END IF;
    IF (SELECT prosecdef FROM pg_proc WHERE oid=to_regprocedure(v_rpc))
      OR has_function_privilege('anon',to_regprocedure(v_rpc),'EXECUTE')
      OR has_function_privilege('service_role',to_regprocedure(v_rpc),'EXECUTE')
      OR NOT has_function_privilege('authenticated',to_regprocedure(v_rpc),'EXECUTE') THEN
      RAISE EXCEPTION 'Contrat EXECUTE/invoker divergent : %',v_rpc;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='ephemer_lot04' AND
      (p.prosecdef OR has_function_privilege('anon',p.oid,'EXECUTE'))) THEN
    RAISE EXCEPTION 'Helper privilegie ou public inattendu.';
  END IF;
END;
$catalogue$;
SELECT 'lot04_catalogue_conforme' AS controle;
COMMIT;

