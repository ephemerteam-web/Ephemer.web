// Prépare des fichiers complets ; n'ouvre aucune connexion à la base.
import fs from 'node:fs'
import {createHash} from 'node:crypto'

const dir='docs/evolution/lot-13-14'
const source=fs.readFileSync(dir+'/01-journal.sql','utf8')
const functions=[...source.matchAll(/CREATE FUNCTION ([\w.]+)\(([^]*?)\) RETURNS ([^]*?)LANGUAGE (\w+)[^]*? AS \$(\w*)\$([^]*?)\$\5\$;/g)].map(match=>{
 const signature=match[1]+'('+match[2].split(',').filter(Boolean).map(arg=>arg.trim().split(/\s+/).slice(1).join(' ')).join(',')+')'
 return {signature,hash:createHash('md5').update(match[6].replace(/\r/g,'').trim()).digest('hex')}
})
if(functions.length!==7)throw new Error('Sept fonctions du journal attendues')
const literal=value=>"'"+value.replaceAll("'","''")+"'"
const tables={
 email_jobs:'id,job_key,kind,user_id,rappel_id,notification_ids,event_keys,source,payload,expires_on,state,token,lease_until,first_attempt_at,resend_id,accepted_at,delivery_status,created_at,updated_at',
 email_attempts:'id,job_id,token,started_at,finished_at,outcome,resend_id',
 email_webhook_events:'event_id,resend_id,event_type,occurred_at,received_at',
 email_cron_runs:'id,cron,user_id,day,phase,success,completed_at',
 email_delivery_control:'singleton,enabled,collective_enabled',
}
// Avant 02/03 seulement : 03 renomme deux fonctions et ajoute ses wrappers.
const guard=allowServiceStatus=>`DO $journal$ DECLARE f record; oid_f oid; t record; BEGIN
 FOR f IN SELECT * FROM (VALUES
${functions.map(f=>` (${literal(f.signature)},${literal(f.hash)},${f.signature==='public.my_email_status()'})`).join(',\n')}
 ) attendu(signature,empreinte,lecture_auth) LOOP
  oid_f:=to_regprocedure(f.signature);
  IF oid_f IS NULL OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=oid_f AND md5(btrim(replace(prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))=f.empreinte AND prosecdef AND cardinality(proconfig)=1 AND proconfig[1]='search_path=""') THEN RAISE EXCEPTION 'Fonction absente ou divergente : %',f.signature; END IF;
  IF has_function_privilege('anon',oid_f,'EXECUTE') OR EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=oid_f AND a.grantee=0 AND a.privilege_type='EXECUTE')
   OR has_function_privilege('authenticated',oid_f,'EXECUTE') IS DISTINCT FROM f.lecture_auth
   OR (NOT f.lecture_auth AND NOT has_function_privilege('service_role',oid_f,'EXECUTE'))${allowServiceStatus?'':"\n   OR (f.lecture_auth AND has_function_privilege('service_role',oid_f,'EXECUTE'))"}
  THEN RAISE EXCEPTION 'Droits divergents : %',f.signature; END IF;
 END LOOP;
 FOR t IN SELECT * FROM (VALUES
${Object.entries(tables).map(([name,columns])=>` (${literal(name)},${literal(columns)})`).join(',\n')}
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
`

fs.writeFileSync(dir+'/verification-journal.sql',`-- Contrôle du socle 01 seulement, avant 02/03. Aucun contenu email lu.
BEGIN READ ONLY;
${guard(false)}SELECT 'journal_01_conforme_desactive_suite_02' AS resultat;
ROLLBACK;
`)
fs.writeFileSync(dir+'/01-bis-journal-deja-present.sql',`-- Après « Journal déjà présent », seulement si les sept corps correspondent au socle 01.
-- Ne réinstalle aucune table/fonction, ne modifie aucun email ni indicateur d'activation.
-- Corrige uniquement un droit service_role hérité des privilèges par défaut Supabase.
-- Exécuter le fichier entier humainement ; les divergences arrêtent la transaction.
BEGIN;
SET LOCAL lock_timeout='3s';
${guard(true)}REVOKE ALL ON FUNCTION public.my_email_status() FROM service_role;
${guard(false)}SELECT 'journal_01_conforme_desactive_suite_02' AS resultat;
COMMIT;
`)
console.log('Contrôle READ ONLY et correctif minimal du journal existant préparés ; aucune installation.')
