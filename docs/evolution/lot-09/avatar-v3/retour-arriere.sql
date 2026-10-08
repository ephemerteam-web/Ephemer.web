-- Retour humain seulement, refuse toute configuration non V1 et dependance ulterieure.
-- Aucune suppression, aucune reecriture de donnee, aucun CASCADE.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.avatars_utilisateurs,public.cartes_individuelles,public.versions_cartes IN ACCESS EXCLUSIVE MODE;
DO $presence09$
BEGIN
 IF to_regclass('public.avatars_utilisateurs') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='ephemer_lot09') THEN
  RAISE EXCEPTION 'Lot 09 absent : ne pas integrer la persistance';
 END IF;
END;
$presence09$;
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
   WHEN 'public.cartes_individuelles' THEN ARRAY['id','user_id','preparation_id','modele_id','modele_version','rendu_version','message','signature','revision','created_at','updated_at','avatar_signature']
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
  expected_i:=CASE WHEN t='public.cartes_individuelles' THEN ARRAY['id','user_id','preparation_id','modele_id','modele_version','rendu_version','message','signature','avatar_signature'] ELSE ARRAY[]::text[] END;
  expected_u:=CASE WHEN t='public.cartes_individuelles' THEN ARRAY['modele_id','modele_version','rendu_version','message','signature','revision','avatar_signature'] ELSE ARRAY[]::text[] END;
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
DO $catalogue09$
DECLARE v regclass:='public.avatars_utilisateurs'::regclass; c text; r record;
 a jsonb:='{"format":1,"catalogVersion":1,"renderVersion":1,"faceId":"ovale","skinId":"miel","hairId":"court","hairColorId":"nuit","clothingId":"pull","clothingColorId":"indigo","accessoryId":"aucun"}';
 s jsonb;
BEGIN
 IF has_schema_privilege('anon','ephemer_lot09','USAGE,CREATE') OR has_schema_privilege('authenticated','ephemer_lot09','CREATE')
  OR has_schema_privilege('service_role','ephemer_lot09','CREATE') OR NOT has_schema_privilege('authenticated','ephemer_lot09','USAGE')
  OR NOT has_schema_privilege('service_role','ephemer_lot09','USAGE') THEN RAISE EXCEPTION 'Droits schema 09 divergents'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=v)
  OR (SELECT array_agg(attname::text ORDER BY attnum) FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped)
    IS DISTINCT FROM ARRAY['user_id','configuration','revision','created_at','updated_at'] THEN RAISE EXCEPTION 'Table/colonnes/RLS avatar divergentes'; END IF;
 IF (SELECT array_agg(data_type||':'||is_nullable ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='avatars_utilisateurs')
  IS DISTINCT FROM ARRAY['uuid:NO','jsonb:NO','bigint:NO','timestamp with time zone:NO','timestamp with time zone:NO'] THEN RAISE EXCEPTION 'Types avatar divergents'; END IF;
 IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='avatars_utilisateurs' AND column_name='revision') IS DISTINCT FROM '1'
  OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='avatars_utilisateurs'
   AND ((column_name IN ('user_id','configuration') AND column_default IS NOT NULL) OR (column_name IN ('created_at','updated_at') AND column_default IS DISTINCT FROM 'now()'))) THEN
  RAISE EXCEPTION 'Defauts avatar divergents';
 END IF;
 IF has_table_privilege('anon',v,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege('anon',v,'SELECT,INSERT,UPDATE,REFERENCES')
  OR has_table_privilege('service_role',v,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege('service_role',v,'SELECT,INSERT,UPDATE,REFERENCES')
  OR NOT has_table_privilege('authenticated',v,'SELECT') OR NOT has_table_privilege('authenticated',v,'DELETE')
  OR has_table_privilege('authenticated',v,'INSERT,UPDATE,TRUNCATE,REFERENCES,TRIGGER') THEN RAISE EXCEPTION 'Droits avatar divergents'; END IF;
 FOR c IN SELECT attname FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped LOOP
  IF has_column_privilege('authenticated',v,c,'INSERT') IS DISTINCT FROM (c IN ('user_id','configuration'))
   OR has_column_privilege('authenticated',v,c,'UPDATE') IS DISTINCT FROM (c IN ('configuration','revision'))
   OR has_column_privilege('authenticated',v,c,'REFERENCES') THEN RAISE EXCEPTION 'Droit colonne avatar divergent : %',c; END IF;
 END LOOP;
 IF (SELECT count(*) FROM pg_policy WHERE polrelid=v)<>4 OR (SELECT count(DISTINCT polcmd) FROM pg_policy WHERE polrelid=v)<>4
  OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=v AND (NOT polpermissive OR polroles<>ARRAY[(SELECT oid FROM pg_roles WHERE rolname='authenticated')]
   OR polcmd NOT IN ('r','a','w','d')
   OR (polcmd IN ('r','w','d') AND regexp_replace(pg_get_expr(polqual,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id')
   OR (polcmd IN ('a','w') AND regexp_replace(pg_get_expr(polwithcheck,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id'))) THEN RAISE EXCEPTION 'Policies avatar divergentes'; END IF;
 IF (SELECT count(*) FROM pg_constraint WHERE conrelid=v)<>4
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND contype='p' AND NOT condeferrable AND pg_get_constraintdef(oid)='PRIMARY KEY (user_id)')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='f' AND confdeltype='c' AND pg_get_constraintdef(oid)='FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='c' AND pg_get_constraintdef(oid)='CHECK (ephemer_lot09.avatar_valide(configuration))')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='c' AND regexp_replace(pg_get_constraintdef(oid),'[[:space:]()]','','g')='CHECKrevision>=1ANDrevision<=''9007199254740991''::bigint') THEN RAISE EXCEPTION 'Contraintes avatar divergentes'; END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgrelid=v AND NOT tgisinternal)<>1
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=v AND NOT tgisinternal AND tgenabled='O' AND tgtype=23 AND tgfoid=to_regprocedure('ephemer_lot09.verifier_revision()')) THEN RAISE EXCEPTION 'Trigger avatar divergent'; END IF;
 IF (SELECT data_type||':'||is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='cartes_individuelles' AND column_name='avatar_signature') IS DISTINCT FROM 'jsonb:YES'
  OR (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='cartes_individuelles' AND column_name='avatar_signature') IS NOT NULL
  OR (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='cartes_individuelles' AND column_name='rendu_version') IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'Colonne/defauts signature divergents'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.cartes_individuelles'::regclass AND conname='cartes_individuelles_rendu_version_check' AND convalidated
  AND pg_get_expr(conbin,conrelid)='(rendu_version = ANY (ARRAY[1, 2]))')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.cartes_individuelles'::regclass AND conname='lot09_avatar_signature_check' AND convalidated
   AND pg_get_expr(conbin,conrelid)='(((rendu_version = 1) AND (avatar_signature IS NULL)) OR ((rendu_version = 2) AND ((avatar_signature IS NULL) OR ephemer_lot09.avatar_valide(avatar_signature))))')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.versions_cartes'::regclass AND conname='versions_cartes_contenu_check' AND convalidated
   AND pg_get_expr(conbin,conrelid)='((ephemer_lot08.snapshot_valide(contenu) OR ephemer_lot09.snapshot_valide(contenu)) AND ephemer_lot08.message_non_vide((contenu ->> ''message''::text)))') THEN
  RAISE EXCEPTION 'Contraintes de signature/publication divergentes : comparer les definitions affichees';
 END IF;
 IF (SELECT count(*) FROM pg_proc WHERE pronamespace='ephemer_lot09'::regnamespace)<>3
  OR (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='publier_carte_lot09')<>1 THEN RAISE EXCEPTION 'Fonctions 09 divergentes'; END IF;
 IF to_regprocedure('ephemer_lot09.avatar_valide(jsonb)') IS NULL OR to_regprocedure('ephemer_lot09.snapshot_valide(jsonb)') IS NULL
  OR to_regprocedure('ephemer_lot09.verifier_revision()') IS NULL OR to_regprocedure('public.publier_carte_lot09(uuid,uuid,bigint,uuid,integer,uuid,text,text,text,text)') IS NULL THEN RAISE EXCEPTION 'Signatures 09 divergentes'; END IF;
 FOR r IN SELECT p.*,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='ephemer_lot09' OR (n.nspname='public' AND p.proname='publier_carte_lot09') LOOP
  IF r.prosecdef OR r.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog'] OR has_function_privilege('anon',r.oid,'EXECUTE')
   OR r.prokind<>'f' OR r.prorettype IS DISTINCT FROM (CASE r.proname WHEN 'verifier_revision' THEN 'trigger'::regtype WHEN 'publier_carte_lot09' THEN 'jsonb'::regtype ELSE 'boolean'::regtype END)
   OR has_function_privilege('authenticated',r.oid,'EXECUTE') IS DISTINCT FROM (r.proname IN ('avatar_valide','snapshot_valide'))
   OR has_function_privilege('service_role',r.oid,'EXECUTE') IS DISTINCT FROM (r.proname<>'verifier_revision')
   OR (r.proname IN ('avatar_valide','snapshot_valide') AND r.provolatile<>'i') THEN RAISE EXCEPTION 'Securite fonction 09 divergente : %',r.proname; END IF;
  -- Empreintes du SOURCE uniquement, aucune empreinte de lien ou donnee personnelle.
  IF md5(replace(r.prosrc,chr(13),'')) IS DISTINCT FROM (CASE r.nspname||'.'||r.proname
   WHEN 'ephemer_lot09.avatar_valide' THEN 'b08e78c871247baa78be156e9d8444c9'
   WHEN 'ephemer_lot09.snapshot_valide' THEN '465917de9491e1f4ced8aa6bac37c47b'
   WHEN 'ephemer_lot09.verifier_revision' THEN '97e9fab68605e4d3e5efc73fcae2abdd'
   WHEN 'public.publier_carte_lot09' THEN 'db6e4514a52a55965e840aef38ecff04' END) THEN RAISE EXCEPTION 'Corps fonction 09 divergent : %',r.proname; END IF;
 END LOOP;
 s:=jsonb_build_object('format',2,'templateId','clair_de_lune','templateVersion',1,'renderVersion',2,'message','Bonjour','signature','Signature','avatar',a);
 IF NOT ephemer_lot09.avatar_valide(a) OR ephemer_lot09.avatar_valide(NULL) OR ephemer_lot09.avatar_valide('null'::jsonb)
  OR ephemer_lot09.avatar_valide(a||'{"faceId":["ovale"]}') OR ephemer_lot09.avatar_valide(a||'{"html":"<svg/>"}')
  OR ephemer_lot09.avatar_valide(a||'{"catalogVersion":2}') OR NOT ephemer_lot09.snapshot_valide(s)
  OR NOT ephemer_lot09.snapshot_valide(s||'{"avatar":null}') OR ephemer_lot09.snapshot_valide(s-'avatar')
  OR ephemer_lot09.snapshot_valide(s||'{"profil":{"email":"prive@example.invalid"}}') THEN RAISE EXCEPTION 'Validateurs 09 divergents'; END IF;
END;
$catalogue09$;
DO $dependances_v3$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_depend d WHERE d.refclassid='pg_proc'::regclass AND d.refobjid='ephemer_lot09.avatar_valide(jsonb)'::regprocedure
  AND NOT (d.classid='pg_constraint'::regclass AND d.objid IN (SELECT oid FROM pg_constraint WHERE
   (conrelid='public.avatars_utilisateurs'::regclass AND conname='avatars_utilisateurs_configuration_check')
   OR (conrelid='public.cartes_individuelles'::regclass AND conname='lot09_avatar_signature_check')))) THEN
  RAISE EXCEPTION 'Dependance ulterieure du validateur : arret';
 END IF;
END;
$dependances_v3$;
DO $refus_donnees_v3$
DECLARE a jsonb;
BEGIN
 FOR a IN SELECT configuration FROM public.avatars_utilisateurs UNION ALL
  SELECT avatar_signature FROM public.cartes_individuelles WHERE avatar_signature IS NOT NULL UNION ALL
  SELECT contenu->'avatar' FROM public.versions_cartes WHERE contenu ? 'avatar' AND contenu->'avatar'<>'null'::jsonb LOOP
  IF NOT (SELECT (CASE WHEN jsonb_typeof(p)='object' THEN
  (SELECT count(*)=10 AND bool_and(k=ANY(ARRAY['format','catalogVersion','renderVersion','faceId','skinId','hairId','hairColorId','clothingId','clothingColorId','accessoryId'])) FROM jsonb_object_keys(p) AS keys(k))
  AND p->'format'='1'::jsonb AND p->'catalogVersion'='1'::jsonb AND p->'renderVersion'='1'::jsonb
  AND p->'faceId' IN ('"ovale"'::jsonb,'"rond"'::jsonb,'"anguleux"'::jsonb)
  AND p->'skinId' IN ('"porcelaine"'::jsonb,'"peche"'::jsonb,'"sable"'::jsonb,'"miel"'::jsonb,'"ambre"'::jsonb,'"cuivre"'::jsonb,'"brun"'::jsonb,'"ebene"'::jsonb)
  AND p->'hairId' IN ('"sans"'::jsonb,'"rase"'::jsonb,'"court"'::jsonb,'"carre"'::jsonb,'"long"'::jsonb,'"boucles"'::jsonb)
  AND p->'hairColorId' IN ('"nuit"'::jsonb,'"chataigne"'::jsonb,'"cuivre"'::jsonb,'"soleil"'::jsonb,'"argent"'::jsonb,'"prune"'::jsonb)
  AND p->'clothingId' IN ('"pull"'::jsonb,'"tunique"'::jsonb,'"veste"'::jsonb)
  AND p->'clothingColorId' IN ('"indigo"'::jsonb,'"sauge"'::jsonb,'"rose"'::jsonb,'"ocre"'::jsonb,'"brume"'::jsonb,'"prune"'::jsonb)
  AND p->'accessoryId' IN ('"aucun"'::jsonb,'"lune"'::jsonb,'"etoile"'::jsonb,'"halo"'::jsonb)
 ELSE false END IS TRUE) FROM (SELECT a AS p) original) THEN
   RAISE EXCEPTION 'Configuration V3 ou inconnue presente : retour arriere refuse';
  END IF;
 END LOOP;
END;
$refus_donnees_v3$;
CREATE OR REPLACE FUNCTION ephemer_lot09.avatar_valide(p jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
 SELECT CASE WHEN jsonb_typeof(p)='object' THEN
  (SELECT count(*)=10 AND bool_and(k=ANY(ARRAY['format','catalogVersion','renderVersion','faceId','skinId','hairId','hairColorId','clothingId','clothingColorId','accessoryId'])) FROM jsonb_object_keys(p) AS keys(k))
  AND p->'format'='1'::jsonb AND p->'catalogVersion'='1'::jsonb AND p->'renderVersion'='1'::jsonb
  AND p->'faceId' IN ('"ovale"'::jsonb,'"rond"'::jsonb,'"anguleux"'::jsonb)
  AND p->'skinId' IN ('"porcelaine"'::jsonb,'"peche"'::jsonb,'"sable"'::jsonb,'"miel"'::jsonb,'"ambre"'::jsonb,'"cuivre"'::jsonb,'"brun"'::jsonb,'"ebene"'::jsonb)
  AND p->'hairId' IN ('"sans"'::jsonb,'"rase"'::jsonb,'"court"'::jsonb,'"carre"'::jsonb,'"long"'::jsonb,'"boucles"'::jsonb)
  AND p->'hairColorId' IN ('"nuit"'::jsonb,'"chataigne"'::jsonb,'"cuivre"'::jsonb,'"soleil"'::jsonb,'"argent"'::jsonb,'"prune"'::jsonb)
  AND p->'clothingId' IN ('"pull"'::jsonb,'"tunique"'::jsonb,'"veste"'::jsonb)
  AND p->'clothingColorId' IN ('"indigo"'::jsonb,'"sauge"'::jsonb,'"rose"'::jsonb,'"ocre"'::jsonb,'"brume"'::jsonb,'"prune"'::jsonb)
  AND p->'accessoryId' IN ('"aucun"'::jsonb,'"lune"'::jsonb,'"etoile"'::jsonb,'"halo"'::jsonb)
 ELSE false END IS TRUE;
$fn$;
ALTER TABLE public.avatars_utilisateurs DROP CONSTRAINT avatars_utilisateurs_configuration_check;
ALTER TABLE public.avatars_utilisateurs ADD CONSTRAINT avatars_utilisateurs_configuration_check CHECK(ephemer_lot09.avatar_valide(configuration));
ALTER TABLE public.cartes_individuelles DROP CONSTRAINT lot09_avatar_signature_check;
ALTER TABLE public.cartes_individuelles ADD CONSTRAINT lot09_avatar_signature_check CHECK(
 (rendu_version=1 AND avatar_signature IS NULL)
 OR (rendu_version=2 AND (avatar_signature IS NULL OR ephemer_lot09.avatar_valide(avatar_signature)))
);
ALTER TABLE public.versions_cartes DROP CONSTRAINT versions_cartes_contenu_check;
ALTER TABLE public.versions_cartes ADD CONSTRAINT versions_cartes_contenu_check CHECK(
 (ephemer_lot08.snapshot_valide(contenu) OR ephemer_lot09.snapshot_valide(contenu))
 AND ephemer_lot08.message_non_vide(contenu->>'message')
);
DO $presence09$
BEGIN
 IF to_regclass('public.avatars_utilisateurs') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='ephemer_lot09') THEN
  RAISE EXCEPTION 'Lot 09 absent : ne pas integrer la persistance';
 END IF;
END;
$presence09$;
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
   WHEN 'public.cartes_individuelles' THEN ARRAY['id','user_id','preparation_id','modele_id','modele_version','rendu_version','message','signature','revision','created_at','updated_at','avatar_signature']
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
  expected_i:=CASE WHEN t='public.cartes_individuelles' THEN ARRAY['id','user_id','preparation_id','modele_id','modele_version','rendu_version','message','signature','avatar_signature'] ELSE ARRAY[]::text[] END;
  expected_u:=CASE WHEN t='public.cartes_individuelles' THEN ARRAY['modele_id','modele_version','rendu_version','message','signature','revision','avatar_signature'] ELSE ARRAY[]::text[] END;
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
DO $catalogue09$
DECLARE v regclass:='public.avatars_utilisateurs'::regclass; c text; r record;
 a jsonb:='{"format":1,"catalogVersion":1,"renderVersion":1,"faceId":"ovale","skinId":"miel","hairId":"court","hairColorId":"nuit","clothingId":"pull","clothingColorId":"indigo","accessoryId":"aucun"}';
 s jsonb;
BEGIN
 IF has_schema_privilege('anon','ephemer_lot09','USAGE,CREATE') OR has_schema_privilege('authenticated','ephemer_lot09','CREATE')
  OR has_schema_privilege('service_role','ephemer_lot09','CREATE') OR NOT has_schema_privilege('authenticated','ephemer_lot09','USAGE')
  OR NOT has_schema_privilege('service_role','ephemer_lot09','USAGE') THEN RAISE EXCEPTION 'Droits schema 09 divergents'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=v)
  OR (SELECT array_agg(attname::text ORDER BY attnum) FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped)
    IS DISTINCT FROM ARRAY['user_id','configuration','revision','created_at','updated_at'] THEN RAISE EXCEPTION 'Table/colonnes/RLS avatar divergentes'; END IF;
 IF (SELECT array_agg(data_type||':'||is_nullable ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='avatars_utilisateurs')
  IS DISTINCT FROM ARRAY['uuid:NO','jsonb:NO','bigint:NO','timestamp with time zone:NO','timestamp with time zone:NO'] THEN RAISE EXCEPTION 'Types avatar divergents'; END IF;
 IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='avatars_utilisateurs' AND column_name='revision') IS DISTINCT FROM '1'
  OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='avatars_utilisateurs'
   AND ((column_name IN ('user_id','configuration') AND column_default IS NOT NULL) OR (column_name IN ('created_at','updated_at') AND column_default IS DISTINCT FROM 'now()'))) THEN
  RAISE EXCEPTION 'Defauts avatar divergents';
 END IF;
 IF has_table_privilege('anon',v,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege('anon',v,'SELECT,INSERT,UPDATE,REFERENCES')
  OR has_table_privilege('service_role',v,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege('service_role',v,'SELECT,INSERT,UPDATE,REFERENCES')
  OR NOT has_table_privilege('authenticated',v,'SELECT') OR NOT has_table_privilege('authenticated',v,'DELETE')
  OR has_table_privilege('authenticated',v,'INSERT,UPDATE,TRUNCATE,REFERENCES,TRIGGER') THEN RAISE EXCEPTION 'Droits avatar divergents'; END IF;
 FOR c IN SELECT attname FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped LOOP
  IF has_column_privilege('authenticated',v,c,'INSERT') IS DISTINCT FROM (c IN ('user_id','configuration'))
   OR has_column_privilege('authenticated',v,c,'UPDATE') IS DISTINCT FROM (c IN ('configuration','revision'))
   OR has_column_privilege('authenticated',v,c,'REFERENCES') THEN RAISE EXCEPTION 'Droit colonne avatar divergent : %',c; END IF;
 END LOOP;
 IF (SELECT count(*) FROM pg_policy WHERE polrelid=v)<>4 OR (SELECT count(DISTINCT polcmd) FROM pg_policy WHERE polrelid=v)<>4
  OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=v AND (NOT polpermissive OR polroles<>ARRAY[(SELECT oid FROM pg_roles WHERE rolname='authenticated')]
   OR polcmd NOT IN ('r','a','w','d')
   OR (polcmd IN ('r','w','d') AND regexp_replace(pg_get_expr(polqual,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id')
   OR (polcmd IN ('a','w') AND regexp_replace(pg_get_expr(polwithcheck,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id'))) THEN RAISE EXCEPTION 'Policies avatar divergentes'; END IF;
 IF (SELECT count(*) FROM pg_constraint WHERE conrelid=v)<>4
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND contype='p' AND NOT condeferrable AND pg_get_constraintdef(oid)='PRIMARY KEY (user_id)')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='f' AND confdeltype='c' AND pg_get_constraintdef(oid)='FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='c' AND pg_get_constraintdef(oid)='CHECK (ephemer_lot09.avatar_valide(configuration))')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND convalidated AND contype='c' AND regexp_replace(pg_get_constraintdef(oid),'[[:space:]()]','','g')='CHECKrevision>=1ANDrevision<=''9007199254740991''::bigint') THEN RAISE EXCEPTION 'Contraintes avatar divergentes'; END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgrelid=v AND NOT tgisinternal)<>1
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=v AND NOT tgisinternal AND tgenabled='O' AND tgtype=23 AND tgfoid=to_regprocedure('ephemer_lot09.verifier_revision()')) THEN RAISE EXCEPTION 'Trigger avatar divergent'; END IF;
 IF (SELECT data_type||':'||is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='cartes_individuelles' AND column_name='avatar_signature') IS DISTINCT FROM 'jsonb:YES'
  OR (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='cartes_individuelles' AND column_name='avatar_signature') IS NOT NULL
  OR (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='cartes_individuelles' AND column_name='rendu_version') IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'Colonne/defauts signature divergents'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.cartes_individuelles'::regclass AND conname='cartes_individuelles_rendu_version_check' AND convalidated
  AND pg_get_expr(conbin,conrelid)='(rendu_version = ANY (ARRAY[1, 2]))')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.cartes_individuelles'::regclass AND conname='lot09_avatar_signature_check' AND convalidated
   AND pg_get_expr(conbin,conrelid)='(((rendu_version = 1) AND (avatar_signature IS NULL)) OR ((rendu_version = 2) AND ((avatar_signature IS NULL) OR ephemer_lot09.avatar_valide(avatar_signature))))')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.versions_cartes'::regclass AND conname='versions_cartes_contenu_check' AND convalidated
   AND pg_get_expr(conbin,conrelid)='((ephemer_lot08.snapshot_valide(contenu) OR ephemer_lot09.snapshot_valide(contenu)) AND ephemer_lot08.message_non_vide((contenu ->> ''message''::text)))') THEN
  RAISE EXCEPTION 'Contraintes de signature/publication divergentes : comparer les definitions affichees';
 END IF;
 IF (SELECT count(*) FROM pg_proc WHERE pronamespace='ephemer_lot09'::regnamespace)<>3
  OR (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='publier_carte_lot09')<>1 THEN RAISE EXCEPTION 'Fonctions 09 divergentes'; END IF;
 IF to_regprocedure('ephemer_lot09.avatar_valide(jsonb)') IS NULL OR to_regprocedure('ephemer_lot09.snapshot_valide(jsonb)') IS NULL
  OR to_regprocedure('ephemer_lot09.verifier_revision()') IS NULL OR to_regprocedure('public.publier_carte_lot09(uuid,uuid,bigint,uuid,integer,uuid,text,text,text,text)') IS NULL THEN RAISE EXCEPTION 'Signatures 09 divergentes'; END IF;
 FOR r IN SELECT p.*,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='ephemer_lot09' OR (n.nspname='public' AND p.proname='publier_carte_lot09') LOOP
  IF r.prosecdef OR r.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog'] OR has_function_privilege('anon',r.oid,'EXECUTE')
   OR r.prokind<>'f' OR r.prorettype IS DISTINCT FROM (CASE r.proname WHEN 'verifier_revision' THEN 'trigger'::regtype WHEN 'publier_carte_lot09' THEN 'jsonb'::regtype ELSE 'boolean'::regtype END)
   OR has_function_privilege('authenticated',r.oid,'EXECUTE') IS DISTINCT FROM (r.proname IN ('avatar_valide','snapshot_valide'))
   OR has_function_privilege('service_role',r.oid,'EXECUTE') IS DISTINCT FROM (r.proname<>'verifier_revision')
   OR (r.proname IN ('avatar_valide','snapshot_valide') AND r.provolatile<>'i') THEN RAISE EXCEPTION 'Securite fonction 09 divergente : %',r.proname; END IF;
  -- Empreintes du SOURCE uniquement, aucune empreinte de lien ou donnee personnelle.
  IF md5(replace(r.prosrc,chr(13),'')) IS DISTINCT FROM (CASE r.nspname||'.'||r.proname
   WHEN 'ephemer_lot09.avatar_valide' THEN '9a1f3932a42cde6228f16b4dd0c197b7'
   WHEN 'ephemer_lot09.snapshot_valide' THEN '465917de9491e1f4ced8aa6bac37c47b'
   WHEN 'ephemer_lot09.verifier_revision' THEN '97e9fab68605e4d3e5efc73fcae2abdd'
   WHEN 'public.publier_carte_lot09' THEN 'db6e4514a52a55965e840aef38ecff04' END) THEN RAISE EXCEPTION 'Corps fonction 09 divergent : %',r.proname; END IF;
 END LOOP;
 s:=jsonb_build_object('format',2,'templateId','clair_de_lune','templateVersion',1,'renderVersion',2,'message','Bonjour','signature','Signature','avatar',a);
 IF NOT ephemer_lot09.avatar_valide(a) OR ephemer_lot09.avatar_valide(NULL) OR ephemer_lot09.avatar_valide('null'::jsonb)
  OR ephemer_lot09.avatar_valide(a||'{"faceId":["ovale"]}') OR ephemer_lot09.avatar_valide(a||'{"html":"<svg/>"}')
  OR ephemer_lot09.avatar_valide(a||'{"catalogVersion":2}') OR NOT ephemer_lot09.snapshot_valide(s)
  OR NOT ephemer_lot09.snapshot_valide(s||'{"avatar":null}') OR ephemer_lot09.snapshot_valide(s-'avatar')
  OR ephemer_lot09.snapshot_valide(s||'{"profil":{"email":"prive@example.invalid"}}') THEN RAISE EXCEPTION 'Validateurs 09 divergents'; END IF;
END;
$catalogue09$;
COMMIT;
