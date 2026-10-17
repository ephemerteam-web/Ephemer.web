-- Contrôle du socle 01 seulement, avant 02/03. Aucun contenu email lu.
BEGIN READ ONLY;
DO $journal$ DECLARE f record; oid_f oid; t record; BEGIN
 FOR f IN SELECT * FROM (VALUES
 ('public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb)','0b12dd0c6755240e8f6d93965e47727e',false),
 ('public.email_occurrence_current(bigint)','f6b6a2a5db725893255380cb4fd82c19',false),
 ('public.begin_email_job(uuid,uuid)','2cff9c895ff9d9d66d40f464b2fce225',false),
 ('public.finish_email_job(uuid,uuid,text,text)','6ad3f456a54fd0c33516d724b92c6aa1',false),
 ('public.record_cron_run(text,uuid,date,text,boolean)','f944d6d6c17a365cc91b4a88029a036b',false),
 ('public.record_email_webhook(text,text,text,timestamptz,uuid)','12b2deb9e5718d49246b70faa8b54147',false),
 ('public.my_email_status()','71e52a9e2c0b53dbb4a34f427a810b64',true)
 ) attendu(signature,empreinte,lecture_auth) LOOP
  oid_f:=to_regprocedure(f.signature);
  IF oid_f IS NULL OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=oid_f AND md5(btrim(replace(prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))=f.empreinte AND prosecdef AND cardinality(proconfig)=1 AND proconfig[1]='search_path=""') THEN RAISE EXCEPTION 'Fonction absente ou divergente : %',f.signature; END IF;
  IF has_function_privilege('anon',oid_f,'EXECUTE') OR EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=oid_f AND a.grantee=0 AND a.privilege_type='EXECUTE')
   OR has_function_privilege('authenticated',oid_f,'EXECUTE') IS DISTINCT FROM f.lecture_auth
   OR (NOT f.lecture_auth AND NOT has_function_privilege('service_role',oid_f,'EXECUTE'))
   OR (f.lecture_auth AND has_function_privilege('service_role',oid_f,'EXECUTE'))
  THEN RAISE EXCEPTION 'Droits divergents : %',f.signature; END IF;
 END LOOP;
 FOR t IN SELECT * FROM (VALUES
 ('email_jobs','id,job_key,kind,user_id,rappel_id,notification_ids,event_keys,source,payload,expires_on,state,token,lease_until,first_attempt_at,resend_id,accepted_at,delivery_status,created_at,updated_at'),
 ('email_attempts','id,job_id,token,started_at,finished_at,outcome,resend_id'),
 ('email_webhook_events','event_id,resend_id,event_type,occurred_at,received_at'),
 ('email_cron_runs','id,cron,user_id,day,phase,success,completed_at'),
 ('email_delivery_control','singleton,enabled,collective_enabled')
 ) attendu(nom,colonnes) LOOP
  oid_f:=to_regclass('public.'||t.nom);
  IF oid_f IS NULL OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=oid_f AND relkind='r' AND relrowsecurity)
   OR (SELECT string_agg(attname,',' ORDER BY attnum) FROM pg_attribute WHERE attrelid=oid_f AND attnum>0 AND NOT attisdropped) IS DISTINCT FROM t.colonnes
   OR has_table_privilege('anon',oid_f,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   OR has_table_privilege('authenticated',oid_f,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=oid_f)
   OR (t.nom='email_delivery_control' AND has_table_privilege('service_role',oid_f,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))
  THEN RAISE EXCEPTION 'Table ou protection divergente : %',t.nom; END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.email_delivery_control)<>1 OR NOT EXISTS(SELECT 1 FROM public.email_delivery_control WHERE singleton AND NOT enabled AND NOT collective_enabled) THEN RAISE EXCEPTION 'Activation déjà modifiée : examiner avant de poursuivre'; END IF;
 IF to_regprocedure('public.claim_email_job_socle(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb)') IS NOT NULL THEN RAISE EXCEPTION 'Extension 03 déjà installée : utiliser verification.sql'; END IF;
END $journal$;
SELECT 'journal_01_conforme_desactive_suite_02' AS resultat;
ROLLBACK;
