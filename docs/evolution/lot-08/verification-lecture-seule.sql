-- Catalogue uniquement, executable EN ENTIER ; aucune fixture ni mutation.
-- Apres installation du lot 09, utiliser ../lot-09/verification-lecture-seule.sql : controle combine 08+09.
-- Compare aussi les definitions affichees au schema propose ; ne prouve pas les comportements RLS.
BEGIN READ ONLY;
SELECT table_schema,table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns
 WHERE (table_schema='public' AND table_name IN ('cartes_individuelles','versions_cartes')) OR table_schema='ephemer_lot08' ORDER BY 1,2,ordinal_position;
SELECT conrelid::regclass,conname,pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid IN (to_regclass('public.cartes_individuelles'),to_regclass('public.versions_cartes'),to_regclass('ephemer_lot08.liens'),to_regclass('ephemer_lot08.operations')) ORDER BY 1,2;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
 WHERE (schemaname='public' AND tablename IN ('cartes_individuelles','versions_cartes')) OR schemaname='ephemer_lot08' ORDER BY 1,2,3;
SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes
 WHERE (schemaname='public' AND tablename IN ('cartes_individuelles','versions_cartes')) OR schemaname='ephemer_lot08' ORDER BY 1,2,3;
SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='ephemer_lot08' OR (n.nspname='public' AND p.proname IN ('gerer_partage_carte_lot08','consulter_carte_lot08','lire_partage_carte_lot08','exporter_liens_cartes_lot08')) ORDER BY n.nspname,p.proname;
DO $catalogue$
DECLARE t text; v regclass; c text; f text; r record; expected_columns text[]; expected_i text[]; expected_u text[];
BEGIN
 IF current_setting('server_version_num')::integer<170000 OR NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='ephemer_lot08')
  OR has_schema_privilege('anon','ephemer_lot08','USAGE') OR has_schema_privilege('anon','ephemer_lot08','CREATE')
  OR has_schema_privilege('authenticated','ephemer_lot08','CREATE') OR has_schema_privilege('service_role','ephemer_lot08','CREATE')
  OR NOT has_schema_privilege('authenticated','ephemer_lot08','USAGE') OR NOT has_schema_privilege('service_role','ephemer_lot08','USAGE') THEN
  RAISE EXCEPTION 'Prerequis/droits schema divergents';
 END IF;
 FOREACH t IN ARRAY ARRAY['public.cartes_individuelles','public.versions_cartes','ephemer_lot08.liens','ephemer_lot08.operations'] LOOP
  v:=to_regclass(t);
  IF v IS NULL OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=v) THEN RAISE EXCEPTION 'Table/RLS absente : %',t; END IF;
  expected_columns:=CASE t
   WHEN 'public.cartes_individuelles' THEN ARRAY['id','user_id','preparation_id','modele_id','modele_version','rendu_version','message','signature','revision','created_at','updated_at']
   WHEN 'public.versions_cartes' THEN ARRAY['id','user_id','carte_id','revision_publication','contenu','created_at']
   WHEN 'ephemer_lot08.liens' THEN ARRAY['id','user_id','carte_id','version_id','revision_creation','empreinte','secret_format','secret_chiffre','nonce','tag','expires_at','revoked_at','created_at']
   ELSE ARRAY['id','user_id','carte_id','action','revision_attendue','duree_jours','revision_resultat','version_id','lien_id','created_at'] END;
  IF (SELECT array_agg(attname::text ORDER BY attnum) FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped) IS DISTINCT FROM expected_columns THEN
   RAISE EXCEPTION 'Colonnes divergentes : %',t;
  END IF;
  IF has_table_privilege('anon',v,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   OR has_any_column_privilege('anon',v,'SELECT,INSERT,UPDATE,REFERENCES') THEN RAISE EXCEPTION 'Droits anon ouverts : %',t; END IF;
  IF has_table_privilege('authenticated',v,'INSERT,UPDATE,TRUNCATE,REFERENCES,TRIGGER') THEN RAISE EXCEPTION 'Droits authenticated trop larges : %',t; END IF;
  IF has_table_privilege('authenticated',v,'SELECT') IS DISTINCT FROM (t IN ('public.cartes_individuelles','public.versions_cartes'))
    OR has_table_privilege('authenticated',v,'DELETE') IS DISTINCT FROM (t='public.cartes_individuelles') THEN RAISE EXCEPTION 'Lecture/effacement divergent : %',t; END IF;
  expected_i:=CASE WHEN t='public.cartes_individuelles' THEN ARRAY['id','user_id','preparation_id','modele_id','modele_version','rendu_version','message','signature'] ELSE ARRAY[]::text[] END;
  expected_u:=CASE WHEN t='public.cartes_individuelles' THEN ARRAY['modele_id','modele_version','rendu_version','message','signature','revision'] ELSE ARRAY[]::text[] END;
  FOR c IN SELECT attname FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped LOOP
   IF has_column_privilege('authenticated',v,c,'INSERT') IS DISTINCT FROM (c=ANY(expected_i))
    OR has_column_privilege('authenticated',v,c,'UPDATE') IS DISTINCT FROM (c=ANY(expected_u))
    OR has_column_privilege('authenticated',v,c,'SELECT') IS DISTINCT FROM (t IN ('public.cartes_individuelles','public.versions_cartes')) THEN
     RAISE EXCEPTION 'Droit colonne divergent : %.%',t,c;
   END IF;
   IF has_column_privilege('service_role',v,c,'UPDATE') IS DISTINCT FROM ((t='public.cartes_individuelles' AND c='revision') OR (t='ephemer_lot08.liens' AND c='revoked_at')) THEN
    RAISE EXCEPTION 'UPDATE serveur divergent : %.%',t,c;
   END IF;
   IF has_column_privilege('service_role',v,c,'INSERT') IS DISTINCT FROM (t<>'public.cartes_individuelles') THEN RAISE EXCEPTION 'INSERT serveur divergent : %.%',t,c; END IF;
  END LOOP;
  IF NOT has_table_privilege('service_role',v,'SELECT')
   OR has_table_privilege('service_role',v,'INSERT') IS DISTINCT FROM (t<>'public.cartes_individuelles')
   OR has_table_privilege('service_role',v,'DELETE') IS DISTINCT FROM (t='public.cartes_individuelles')
   OR has_table_privilege('service_role',v,'UPDATE,TRUNCATE,REFERENCES,TRIGGER') THEN RAISE EXCEPTION 'Droits serveur divergents : %',t; END IF;
  IF t IN ('public.cartes_individuelles','public.versions_cartes') THEN
   IF (SELECT count(*) FROM pg_policy WHERE polrelid=v)<>(CASE WHEN t='public.cartes_individuelles' THEN 4 ELSE 1 END)
    OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=v AND (NOT polpermissive OR polroles<>ARRAY[(SELECT oid FROM pg_roles WHERE rolname='authenticated')]
      OR polcmd NOT IN ('r','a','w','d')
      OR (polcmd IN ('r','w','d') AND regexp_replace(pg_get_expr(polqual,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id')
      OR (polcmd IN ('a','w') AND regexp_replace(pg_get_expr(polwithcheck,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id')))
    OR (SELECT count(DISTINCT polcmd) FROM pg_policy WHERE polrelid=v)<>(CASE WHEN t='public.cartes_individuelles' THEN 4 ELSE 1 END)
    OR (t='public.versions_cartes' AND NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=v AND polcmd='r')) THEN
     RAISE EXCEPTION 'Policies divergentes : %',t;
   END IF;
  ELSIF EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=v) THEN RAISE EXCEPTION 'Policy privee inattendue : %',t; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='f' AND confrelid='auth.users'::regclass AND confdeltype='c') THEN
   RAISE EXCEPTION 'Cascade Auth absente : %',t;
  END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.cartes_individuelles'::regclass AND convalidated AND contype='f'
  AND confrelid='public.preparations_evenements'::regclass AND confdeltype='c' AND pg_get_constraintdef(oid)='FOREIGN KEY (user_id, preparation_id) REFERENCES preparations_evenements(user_id, id) ON DELETE CASCADE')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.cartes_individuelles'::regclass AND convalidated AND contype='u' AND NOT condeferrable AND pg_get_constraintdef(oid)='UNIQUE (user_id, preparation_id)') THEN
  RAISE EXCEPTION 'Reference/unicite preparation divergente';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.versions_cartes'::regclass AND convalidated AND contype='f'
   AND confrelid='public.cartes_individuelles'::regclass AND confdeltype='c' AND array_length(conkey,1)=2)
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ephemer_lot08.liens'::regclass AND convalidated AND contype='f'
   AND confrelid='public.versions_cartes'::regclass AND confdeltype='c' AND array_length(conkey,1)=3) THEN RAISE EXCEPTION 'References composees divergentes'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_lot08.lot08_un_lien_actif') AND indisunique AND indisvalid
  AND indrelid='ephemer_lot08.liens'::regclass AND regexp_replace(pg_get_expr(indpred,indrelid),'[[:space:]()]','','g')='revoked_atISNULL'
  AND (SELECT array_agg(a.attname::text ORDER BY k.n) FROM unnest(indkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=indrelid AND a.attnum=k.attnum)=ARRAY['user_id','carte_id']) THEN
  RAISE EXCEPTION 'Unicite lien actif divergente';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.cartes_individuelles'::regclass AND NOT tgisinternal AND tgenabled='O' AND tgtype=23 AND tgfoid=to_regprocedure('ephemer_lot08.verifier_revision()'))
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.versions_cartes'::regclass AND NOT tgisinternal AND tgenabled='O' AND tgtype=19 AND tgfoid=to_regprocedure('ephemer_lot08.version_immuable()')) THEN RAISE EXCEPTION 'Triggers divergents'; END IF;
 FOREACH f IN ARRAY ARRAY['public.gerer_partage_carte_lot08(uuid,uuid,bigint,uuid,text,integer,uuid,text,text,text,text)','public.consulter_carte_lot08(text)','public.lire_partage_carte_lot08(uuid,uuid,boolean)','public.exporter_liens_cartes_lot08(uuid,uuid,integer)'] LOOP
  IF to_regprocedure(f) IS NULL OR has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('authenticated',f,'EXECUTE')
   OR NOT has_function_privilege('service_role',f,'EXECUTE') THEN RAISE EXCEPTION 'RPC absente ou ouverte : %',f; END IF;
 END LOOP;
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ephemer_lot08')<>4
  OR (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('gerer_partage_carte_lot08','consulter_carte_lot08','lire_partage_carte_lot08','exporter_liens_cartes_lot08'))<>4 THEN RAISE EXCEPTION 'Fonctions divergentes'; END IF;
 FOR r IN SELECT p.*,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='ephemer_lot08' OR (n.nspname='public' AND p.proname IN ('gerer_partage_carte_lot08','consulter_carte_lot08','lire_partage_carte_lot08','exporter_liens_cartes_lot08')) LOOP
  IF r.prosecdef OR r.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog'] OR has_function_privilege('anon',r.oid,'EXECUTE') THEN RAISE EXCEPTION 'Fonction divergente : %',r.proname; END IF;
  IF r.nspname='ephemer_lot08' AND (has_function_privilege('authenticated',r.oid,'EXECUTE') IS DISTINCT FROM (r.proname IN ('snapshot_valide','message_non_vide'))
   OR has_function_privilege('service_role',r.oid,'EXECUTE') IS DISTINCT FROM (r.proname IN ('snapshot_valide','message_non_vide'))) THEN RAISE EXCEPTION 'Droits helper divergents'; END IF;
  IF r.nspname='public' AND (has_function_privilege('authenticated',r.oid,'EXECUTE') OR NOT has_function_privilege('service_role',r.oid,'EXECUTE')) THEN RAISE EXCEPTION 'Droits RPC divergents'; END IF;
  -- Empreintes de SOURCE SQL, jamais des secrets : controle du corps complet, CRLF normalise.
  IF md5(replace(r.prosrc,chr(13),'')) IS DISTINCT FROM (CASE r.nspname||'.'||r.proname
   WHEN 'ephemer_lot08.snapshot_valide' THEN '8ecbf6566de8b781e586a037e4f1da24'
   WHEN 'ephemer_lot08.message_non_vide' THEN '64f3c8238a54fabfa1973c9c59213434'
   WHEN 'ephemer_lot08.verifier_revision' THEN '4b1a95332bde4050717a3a80006aea93'
   WHEN 'ephemer_lot08.version_immuable' THEN '764fa1b59514d69f4cd956c8ad71be4d'
   WHEN 'public.gerer_partage_carte_lot08' THEN '4d03f31414f01ec16b0559c0937d2ff8'
   WHEN 'public.consulter_carte_lot08' THEN '8b717660c4a2f282de3fe4fef433cf94'
   WHEN 'public.lire_partage_carte_lot08' THEN 'fa96f6cca173b0c82e58e2e7281ddb52'
   WHEN 'public.exporter_liens_cartes_lot08' THEN '8c70a4ddc3c95fe0c69ffe106240b741' END) THEN RAISE EXCEPTION 'Corps fonction divergent : %',r.proname; END IF;
 END LOOP;
 IF NOT ephemer_lot08.snapshot_valide('{"format":1,"templateId":"clair_de_lune","templateVersion":1,"renderVersion":1,"message":"","signature":""}'::jsonb)
  OR ephemer_lot08.snapshot_valide('{"format":1}'::jsonb) OR ephemer_lot08.snapshot_valide('null'::jsonb)
  OR NOT ephemer_lot08.message_non_vide('message') OR ephemer_lot08.message_non_vide(chr(160)||chr(65279)) OR ephemer_lot08.message_non_vide(NULL) THEN RAISE EXCEPTION 'Validateur divergent'; END IF;
END;
$catalogue$;
SELECT 'lot08_catalogue_conforme' AS controle;
COMMIT;
