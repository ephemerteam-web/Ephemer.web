-- Lot 06 : catalogue uniquement, executable EN ENTIER ; aucune fixture.
-- Les resultats detailles sont a comparer au schema propose. Ne prouve pas la recette RLS.
BEGIN READ ONLY;
SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns
 WHERE table_schema='public' AND table_name IN ('styles_messages','preferences_styles_messages','styles_messages_contacts') ORDER BY 1,ordinal_position;
SELECT conrelid::regclass,conname,pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid IN (to_regclass('public.styles_messages'),to_regclass('public.preferences_styles_messages'),to_regclass('public.styles_messages_contacts'));
SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('styles_messages','preferences_styles_messages','styles_messages_contacts');
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('styles_messages','preferences_styles_messages','styles_messages_contacts');
SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ephemer_lot06';
DO $catalogue$
DECLARE v regclass; c text; allowed_i text[]; allowed_u text[];
BEGIN
  v:=to_regclass('public.styles_messages');
  IF v IS NULL OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=v) THEN RAISE EXCEPTION 'Table/RLS absente : styles_messages'; END IF;
  IF (SELECT count(*) FROM pg_policy WHERE polrelid=v)<>4
    OR (SELECT count(DISTINCT polcmd) FROM pg_policy WHERE polrelid=v AND polcmd IN ('r','a','w','d') AND polpermissive AND polroles=ARRAY[(SELECT oid FROM pg_roles WHERE rolname='authenticated')])<>4
    OR EXISTS (SELECT 1 FROM pg_policy WHERE polrelid=v AND
     ((polcmd IN ('r','w','d') AND regexp_replace(pg_get_expr(polqual,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id')
      OR (polcmd IN ('a','w') AND regexp_replace(pg_get_expr(polwithcheck,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id'))) THEN RAISE EXCEPTION 'Policies divergentes : styles_messages'; END IF;
  IF has_table_privilege('anon',v,'SELECT') OR has_table_privilege('anon',v,'DELETE')
    OR has_any_column_privilege('anon',v,'INSERT') OR has_any_column_privilege('anon',v,'UPDATE')
    OR NOT has_table_privilege('authenticated',v,'SELECT') OR NOT has_table_privilege('authenticated',v,'DELETE')
    OR has_table_privilege('authenticated',v,'INSERT') OR has_table_privilege('authenticated',v,'UPDATE')
    OR has_table_privilege('authenticated',v,'TRUNCATE') OR has_table_privilege('authenticated',v,'REFERENCES') OR has_table_privilege('authenticated',v,'TRIGGER')
    OR NOT has_table_privilege('service_role',v,'SELECT') OR has_table_privilege('service_role',v,'DELETE')
    OR has_any_column_privilege('service_role',v,'INSERT') OR has_any_column_privilege('service_role',v,'UPDATE') THEN RAISE EXCEPTION 'Droits divergents : styles_messages'; END IF;
  allowed_i:=ARRAY['id','user_id','nom','ton','longueur','adresse','emojis','signature'];
  allowed_u:=ARRAY['nom','ton','longueur','adresse','emojis','signature','revision'];
  FOR c IN SELECT attname FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped LOOP
    IF has_column_privilege('authenticated',v,c,'INSERT') IS DISTINCT FROM (c=ANY(allowed_i)) OR
      has_column_privilege('authenticated',v,c,'UPDATE') IS DISTINCT FROM (c=ANY(allowed_u)) THEN RAISE EXCEPTION 'Droit colonne divergent : %.%',v,c; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=v AND NOT tgisinternal AND tgenabled='O' AND tgtype=23 AND tgfoid=to_regprocedure('ephemer_lot06.verifier_revision()')) THEN RAISE EXCEPTION 'Trigger revision absent : %',v; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='f' AND confrelid='auth.users'::regclass AND confdeltype='c') THEN RAISE EXCEPTION 'Cascade Auth absente : %',v; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=v AND contype='u' AND convalidated AND NOT condeferrable AND pg_get_constraintdef(oid)='UNIQUE (user_id, id)') THEN RAISE EXCEPTION 'Unicite absente : %',v; END IF;
  v:=to_regclass('public.preferences_styles_messages');
  IF v IS NULL OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=v) THEN RAISE EXCEPTION 'Table/RLS absente : preferences_styles_messages'; END IF;
  IF (SELECT count(*) FROM pg_policy WHERE polrelid=v)<>4
    OR (SELECT count(DISTINCT polcmd) FROM pg_policy WHERE polrelid=v AND polpermissive AND polroles=ARRAY[(SELECT oid FROM pg_roles WHERE rolname='authenticated')])<>4
    OR EXISTS (SELECT 1 FROM pg_policy WHERE polrelid=v AND
     ((polcmd IN ('r','w','d') AND regexp_replace(pg_get_expr(polqual,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id')
      OR (polcmd IN ('a','w') AND regexp_replace(pg_get_expr(polwithcheck,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id'))) THEN RAISE EXCEPTION 'Policies divergentes : preferences_styles_messages'; END IF;
  IF has_table_privilege('anon',v,'SELECT') OR has_table_privilege('anon',v,'DELETE')
    OR has_any_column_privilege('anon',v,'INSERT') OR has_any_column_privilege('anon',v,'UPDATE')
    OR NOT has_table_privilege('authenticated',v,'SELECT') OR NOT has_table_privilege('authenticated',v,'DELETE')
    OR has_table_privilege('authenticated',v,'INSERT') OR has_table_privilege('authenticated',v,'UPDATE')
    OR has_table_privilege('authenticated',v,'TRUNCATE') OR has_table_privilege('authenticated',v,'REFERENCES') OR has_table_privilege('authenticated',v,'TRIGGER')
    OR NOT has_table_privilege('service_role',v,'SELECT') OR has_table_privilege('service_role',v,'DELETE')
    OR has_any_column_privilege('service_role',v,'INSERT') OR has_any_column_privilege('service_role',v,'UPDATE') THEN RAISE EXCEPTION 'Droits divergents : preferences_styles_messages'; END IF;
  allowed_i:=ARRAY['id','user_id','style_id'];
  allowed_u:=ARRAY['style_id','revision'];
  FOR c IN SELECT attname FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped LOOP
    IF has_column_privilege('authenticated',v,c,'INSERT') IS DISTINCT FROM (c=ANY(allowed_i)) OR
      has_column_privilege('authenticated',v,c,'UPDATE') IS DISTINCT FROM (c=ANY(allowed_u)) THEN RAISE EXCEPTION 'Droit colonne divergent : %.%',v,c; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=v AND NOT tgisinternal AND tgenabled='O' AND tgtype=23 AND tgfoid=to_regprocedure('ephemer_lot06.verifier_revision()')) THEN RAISE EXCEPTION 'Trigger revision absent : %',v; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='f' AND confrelid='auth.users'::regclass AND confdeltype='c') THEN RAISE EXCEPTION 'Cascade Auth absente : %',v; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='f' AND confrelid='public.styles_messages'::regclass AND confdeltype='c' AND array_length(conkey,1)=2) THEN RAISE EXCEPTION 'Reference composee absente : %',v; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=v AND contype='u' AND convalidated AND NOT condeferrable AND pg_get_constraintdef(oid)='UNIQUE (user_id)') THEN RAISE EXCEPTION 'Unicite absente : %',v; END IF;
  v:=to_regclass('public.styles_messages_contacts');
  IF v IS NULL OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=v) THEN RAISE EXCEPTION 'Table/RLS absente : styles_messages_contacts'; END IF;
  IF (SELECT count(*) FROM pg_policy WHERE polrelid=v)<>4
    OR (SELECT count(DISTINCT polcmd) FROM pg_policy WHERE polrelid=v AND polpermissive AND polroles=ARRAY[(SELECT oid FROM pg_roles WHERE rolname='authenticated')])<>4
    OR EXISTS (SELECT 1 FROM pg_policy WHERE polrelid=v AND
     ((polcmd IN ('r','w','d') AND regexp_replace(pg_get_expr(polqual,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id')
      OR (polcmd IN ('a','w') AND regexp_replace(pg_get_expr(polwithcheck,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id'))) THEN RAISE EXCEPTION 'Policies divergentes : styles_messages_contacts'; END IF;
  IF has_table_privilege('anon',v,'SELECT') OR has_table_privilege('anon',v,'DELETE')
    OR has_any_column_privilege('anon',v,'INSERT') OR has_any_column_privilege('anon',v,'UPDATE')
    OR NOT has_table_privilege('authenticated',v,'SELECT') OR NOT has_table_privilege('authenticated',v,'DELETE')
    OR has_table_privilege('authenticated',v,'INSERT') OR has_table_privilege('authenticated',v,'UPDATE')
    OR has_table_privilege('authenticated',v,'TRUNCATE') OR has_table_privilege('authenticated',v,'REFERENCES') OR has_table_privilege('authenticated',v,'TRIGGER')
    OR NOT has_table_privilege('service_role',v,'SELECT') OR has_table_privilege('service_role',v,'DELETE')
    OR has_any_column_privilege('service_role',v,'INSERT') OR has_any_column_privilege('service_role',v,'UPDATE') THEN RAISE EXCEPTION 'Droits divergents : styles_messages_contacts'; END IF;
  allowed_i:=ARRAY['id','user_id','contact_id','style_id'];
  allowed_u:=ARRAY['style_id','revision'];
  FOR c IN SELECT attname FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped LOOP
    IF has_column_privilege('authenticated',v,c,'INSERT') IS DISTINCT FROM (c=ANY(allowed_i)) OR
      has_column_privilege('authenticated',v,c,'UPDATE') IS DISTINCT FROM (c=ANY(allowed_u)) THEN RAISE EXCEPTION 'Droit colonne divergent : %.%',v,c; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=v AND NOT tgisinternal AND tgenabled='O' AND tgtype=23 AND tgfoid=to_regprocedure('ephemer_lot06.verifier_revision()')) THEN RAISE EXCEPTION 'Trigger revision absent : %',v; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='f' AND confrelid='auth.users'::regclass AND confdeltype='c') THEN RAISE EXCEPTION 'Cascade Auth absente : %',v; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='f' AND confrelid='public.contacts'::regclass AND confdeltype='c' AND array_length(conkey,1)=2) THEN RAISE EXCEPTION 'Reference composee absente : %',v; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='f' AND confrelid='public.styles_messages'::regclass AND confdeltype='c' AND array_length(conkey,1)=2) THEN RAISE EXCEPTION 'Reference composee absente : %',v; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=v AND contype='u' AND convalidated AND NOT condeferrable AND pg_get_constraintdef(oid)='UNIQUE (user_id, contact_id)') THEN RAISE EXCEPTION 'Unicite absente : %',v; END IF;
  IF to_regprocedure('ephemer_lot06.verifier_revision()') IS NULL OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ephemer_lot06' AND (p.prosecdef OR has_function_privilege('anon',p.oid,'EXECUTE') OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog'])) THEN RAISE EXCEPTION 'Helper divergent'; END IF;
END;
$catalogue$;
SELECT 'lot06_catalogue_conforme' AS controle;
COMMIT;
