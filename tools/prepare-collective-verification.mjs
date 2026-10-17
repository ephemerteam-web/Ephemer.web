// Catalogue seulement : écrit le contrôle à relire ; aucune requête ni secret.
import fs from 'node:fs'
import {createHash} from 'node:crypto'
const dir='docs/evolution/lot-13-14',functions=new Map()
for(const file of ['01-journal.sql','02-cartes.sql','03-envoi.sql']){
 const sql=fs.readFileSync(dir+'/'+file,'utf8')
 const events=[...sql.matchAll(/CREATE FUNCTION ([\w.]+)\(([^]*?)\) RETURNS ([^]*?)LANGUAGE (\w+)[^]*? AS \$(\w*)\$([^]*?)\$\5\$;/g)].map(match=>({index:match.index,match}))
 for(const match of sql.matchAll(/ALTER FUNCTION ([\w.]+)\(([^]*?)\) RENAME TO (\w+);/g))events.push({index:match.index,rename:match})
 for(const event of events.sort((a,b)=>a.index-b.index)){
  if(event.rename){const[,old,args,name]=event.rename,oldKey=old+'('+args+')',definition=functions.get(oldKey);if(!definition)throw new Error('Renommage inattendu : '+oldKey);functions.delete(oldKey);functions.set(old.slice(0,old.lastIndexOf('.')+1)+name+'('+args+')',definition);continue}
  const[,name,args,,, ,body]=event.match
  const signature=name+'('+args.replace(/ DEFAULT (NULL|true|false|\d+)/gi,'').split(',').filter(Boolean).map(arg=>arg.trim().split(/\s+/).slice(1).join(' ')).join(',')+')'
  const header=event.match[0].split(/\sAS\s+\$\w*\$/)[0]
  functions.set(signature,{md5:createHash('md5').update(body.replace(/\r/g,'').trim()).digest('hex'),definer:/SECURITY DEFINER/i.test(header)})
 }
}
const auth=['public.lire_carte_collective(uuid)','public.commander_carte_collective(uuid,jsonb)','public.exporter_mes_contributions_collectives(uuid)','public.my_email_status()']
const service=['public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb)','public.begin_email_job(uuid,uuid)','public.finish_email_job(uuid,uuid,text,text)','public.record_cron_run(text,uuid,date,text,boolean)','public.record_email_webhook(text,text,text,timestamptz,uuid)','public.email_occurrence_current(bigint)','public.publier_carte_collective(uuid,uuid,bigint,uuid,uuid,uuid,text,jsonb,integer,uuid)','public.consulter_carte_collective(text)','public.lire_echeances_cartes(integer)','public.lire_enveloppe_carte(uuid)','public.reserver_email_carte(uuid,jsonb)','public.engager_email_carte(uuid,uuid)']
const literal=value=>"'"+value.replaceAll("'","''")+"'"
let sql=`-- Exécuter le fichier entier après installation humaine sur copie. Ne lit aucun contenu.
BEGIN READ ONLY;
DO $catalogue$ DECLARE f record; oid_f oid; t text; BEGIN
FOR f IN SELECT * FROM (VALUES
${[...functions].map(([signature,definition])=>`(${literal(signature)},${literal(definition.md5)},${auth.includes(signature)},${service.includes(signature)},${definition.definer})`).join(',\n')}
) attendu(signature,empreinte,acces_auth,acces_service,definer) LOOP
 oid_f:=to_regprocedure(f.signature);
 IF oid_f IS NULL OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=oid_f AND md5(btrim(replace(prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))=f.empreinte) THEN RAISE EXCEPTION 'Corps absent ou divergent : %',f.signature; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=oid_f AND prosecdef=f.definer AND cardinality(proconfig)=1 AND proconfig[1] IN ('search_path=""','search_path=','search_path=pg_catalog')) THEN RAISE EXCEPTION 'Contexte de sécurité divergent : %',f.signature; END IF;
 IF has_function_privilege('anon',oid_f,'EXECUTE') OR has_function_privilege('authenticated',oid_f,'EXECUTE') IS DISTINCT FROM f.acces_auth OR has_function_privilege('service_role',oid_f,'EXECUTE') IS DISTINCT FROM f.acces_service THEN RAISE EXCEPTION 'Droits divergents : %',f.signature; END IF;
END LOOP;
FOREACH t IN ARRAY ARRAY['cartes_collectives','carte_exclusions','carte_invitations','carte_contributions','carte_signalements','carte_versions','carte_plans','carte_operations'] LOOP
 oid_f:=to_regclass('ephemer_celebrations.'||t);
 IF oid_f IS NULL OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=oid_f AND relrowsecurity) OR has_table_privilege('anon',oid_f,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',oid_f,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('service_role',oid_f,'SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Table ouverte ou RLS absente : %',t; END IF;
END LOOP;
IF (SELECT count(*) FROM pg_trigger WHERE tgname IN ('carte_auth_change','carte_membre_change','carte_evenement_change','carte_avant_suppression') AND NOT tgisinternal AND tgenabled='O')<>4 THEN RAISE EXCEPTION 'Nettoyage transactionnel incomplet'; END IF;
oid_f:=to_regclass('public.email_delivery_control');
IF oid_f IS NULL OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=oid_f AND relrowsecurity) OR has_table_privilege('anon',oid_f,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',oid_f,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('service_role',oid_f,'SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Contrôle opérationnel ouvert'; END IF;
END $catalogue$;
SELECT 'collectif_13_14_catalogue_conforme_recette_requise' AS resultat;
ROLLBACK;
`
fs.writeFileSync(dir+'/verification.sql',sql)
console.log(functions.size+' signatures et empreintes préparées ; aucun catalogue distant modifié.')
const extraSource=fs.readFileSync(dir+'/04-raccordement.sql','utf8')
const extraFunctions=[...extraSource.matchAll(/CREATE FUNCTION ([\w.]+)\(([^]*?)\) RETURNS ([^]*?)LANGUAGE (\w+)[^]*? AS \$(\w*)\$([^]*?)\$\5\$;/g)].map(match=>{
 const signature=match[1]+'('+match[2].split(',').filter(Boolean).map(arg=>arg.trim().split(/\s+/).slice(1).join(' ')).join(',')+')'
 return {signature,hash:createHash('md5').update(match[6].replace(/\r/g,'').trim()).digest('hex')}
})
if(extraFunctions.length!==3)throw new Error('Trois fonctions de raccordement attendues')
const privacyFunctions=[...extraSource.matchAll(/CREATE OR REPLACE FUNCTION ([\w.]+)\(([^]*?)\)\s+RETURNS ([^]*?)LANGUAGE (\w+)[^]*?\bAS \$(\w*)\$([^]*?)\$\5\$;/g)].map(match=>({
 signature:match[1]+'('+match[2].split(',').filter(Boolean).map(arg=>arg.trim().split(/\s+/).slice(1).join(' ')).join(',')+')',
 hash:createHash('md5').update(match[6].replace(/\r/g,'').trim()).digest('hex'),definer:/SECURITY DEFINER/.test(match[0].split(/\bAS \$/)[0]),
}))
if(privacyFunctions.length!==2)throw new Error('Deux protections B attendues : lancer prepare-collective-privacy.mjs')
const extraCheck=`DO $raccordement$ DECLARE f record; o oid; BEGIN
 FOR f IN SELECT * FROM (VALUES
${[...extraFunctions.map(f=>`(${literal(f.signature)},${literal(f.hash)},${f.signature==='public.collectif_disponible()'},${f.signature!=='public.collectif_disponible()'},true,'search_path=""')`),...privacyFunctions.map(f=>`(${literal(f.signature)},${literal(f.hash)},${f.definer},false,${f.definer},'search_path=pg_catalog')`)].join(',\n')}
 ) attendu(signature,empreinte,auth,service,definer,contexte) LOOP
  o:=to_regprocedure(f.signature);
  IF o IS NULL OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=o AND md5(btrim(replace(prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))=f.empreinte AND prosecdef=f.definer AND cardinality(proconfig)=1 AND proconfig[1]=f.contexte) THEN RAISE EXCEPTION 'Raccordement absent ou divergent : %',f.signature; END IF;
  IF has_function_privilege('anon',o,'EXECUTE') OR has_function_privilege('authenticated',o,'EXECUTE') IS DISTINCT FROM f.auth OR has_function_privilege('service_role',o,'EXECUTE') IS DISTINCT FROM f.service THEN RAISE EXCEPTION 'Droits de raccordement divergents : %',f.signature; END IF;
 END LOOP;
END $raccordement$;
DO $reference$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ephemer_celebrations.carte_plans'::regclass AND conname='carte_plans_organisateur_fkey' AND confrelid='auth.users'::regclass AND confdeltype='c') THEN RAISE EXCEPTION 'Nettoyage des plans à effacement absent'; END IF;
END $reference$;
`
const extended=sql.replace("SELECT 'collectif_13_14_catalogue_conforme_recette_requise' AS resultat;",extraCheck+"SELECT 'collectif_13_14_raccordement_conforme_recette_distante_non_effectuee' AS resultat;")
fs.writeFileSync(dir+'/verification-raccordement.sql',extended)
// Décision utilisateur du 17/10 : essais sur copie/pilotes explicitement écartés.
const checks=extended.slice(extended.indexOf('DO $catalogue$'),extended.lastIndexOf("SELECT 'collectif_13_14_raccordement"))
fs.writeFileSync(dir+'/activation.sql',`-- ACTIVATION HUMAINE sur la base actuelle, après 04 et configuration serveur.
-- Le demandeur a explicitement choisi de passer les essais distants et les courses.
-- Ce choix n'est pas une preuve de recette. Aucun test réel n'est déclaré réussi.
-- Vérifier auparavant EPHEMER_CARD_LINK_KEY, RESEND_WEBHOOK_SECRET et le webhook signé.
-- Ce fichier ouvre AUSSI rappel/recap/newsletter ; aucun ancien envoi dû ne doit être repris implicitement.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL ephemer.collectif_go='go_humain_sans_recette_distante';
${checks}DO $go$ BEGIN
 IF current_setting('ephemer.collectif_go',true) IS DISTINCT FROM 'go_humain_sans_recette_distante' THEN RAISE EXCEPTION 'Décision explicite requise'; END IF;
 IF EXISTS(SELECT 1 FROM public.rappels WHERE statut='programme' AND date_envoi<=(now() AT TIME ZONE 'Europe/Paris')::date)
 OR EXISTS(SELECT 1 FROM public.email_jobs WHERE state IN ('reserved','sending','retryable','uncertain','review')) THEN
  RAISE EXCEPTION 'Envois historiques ou engagements présents : revue nécessaire avant activation';
 END IF;
 IF (SELECT count(*) FROM public.email_delivery_control)<>1 THEN RAISE EXCEPTION 'Contrôle opérationnel absent'; END IF;
END $go$;
UPDATE public.email_delivery_control SET collective_enabled=true,enabled=true WHERE singleton;
SELECT 'collectif_active_sur_GO_humain_recette_distante_non_effectuee' AS resultat;
COMMIT;
`)
console.log('37 fonctions collectives + 2 protections B, activation humaine sans copie préparées, aucun SQL exécuté.')
