-- Exécuter le fichier entier après installation humaine sur copie. Ne lit aucun contenu.
BEGIN READ ONLY;
DO $catalogue$ DECLARE f record; oid_f oid; t text; BEGIN
FOR f IN SELECT * FROM (VALUES
('public.email_occurrence_current(bigint)','f6b6a2a5db725893255380cb4fd82c19',false,true,true),
('public.finish_email_job(uuid,uuid,text,text)','6ad3f456a54fd0c33516d724b92c6aa1',false,true,true),
('public.record_cron_run(text,uuid,date,text,boolean)','f944d6d6c17a365cc91b4a88029a036b',false,true,true),
('public.record_email_webhook(text,text,text,timestamptz,uuid)','12b2deb9e5718d49246b70faa8b54147',false,true,true),
('public.my_email_status()','71e52a9e2c0b53dbb4a34f427a810b64',true,false,true),
('ephemer_celebrations.carte_objet(jsonb,text[])','a07a2e8a1021494385e67d22bc801aca',false,false,false),
('ephemer_celebrations.carte_texte(jsonb,integer,boolean)','b4a54341fb49f61132f62cd0eed56eee',false,false,false),
('ephemer_celebrations.carte_signature(jsonb)','584b433b5c4b0c1fc14cde71bba3fec4',false,false,false),
('ephemer_celebrations.carte_empreinte(jsonb)','229028887735665ef851f1787038895b',false,false,false),
('ephemer_celebrations.carte_verrou(uuid)','77bb66de8cf99a5387d6725151e79500',false,false,false),
('ephemer_celebrations.carte_exclue(uuid,uuid)','1b6d78f9a34377a316de98be713746f4',false,false,false),
('ephemer_celebrations.carte_autorisee(uuid,uuid,boolean)','02a4edb1659c258adee4e8abf000f638',false,false,false),
('ephemer_celebrations.carte_arreter(uuid)','a2f856f98e769d0d84b7074ea3abdb63',false,false,false),
('ephemer_celebrations.carte_retirer(uuid,uuid)','20e5f41c9d7530617ff6ec6164016130',false,false,false),
('ephemer_celebrations.carte_snapshot(uuid)','60d1eaf6c288a85b5892571b47ccc141',false,false,false),
('ephemer_celebrations.carte_horaire(jsonb)','4d85fc1c7f54d1405e3d4da8594621c8',false,false,false),
('public.lire_carte_collective(uuid)','6b2d45ec776df5695561716b4c21fd24',true,false,true),
('public.commander_carte_collective(uuid,jsonb)','4859574bb6c37adb42ff47867c283082',true,false,true),
('public.publier_carte_collective(uuid,uuid,bigint,uuid,uuid,uuid,text,jsonb,integer,uuid)','3b6f8a3e047aecdbddbec20dda41c234',false,true,true),
('public.consulter_carte_collective(text)','2710443b8f7e11c0c64c17140c4b201c',false,true,true),
('ephemer_celebrations.carte_membre_change()','0bdd0ef10293721b48d57108d7ee64e7',false,false,true),
('ephemer_celebrations.carte_auth_change()','33ee2548367902e0de84051ffd06ae33',false,false,true),
('ephemer_celebrations.carte_evenement_change()','c7d18d3372636fb306bfa869f782778c',false,false,true),
('ephemer_celebrations.carte_avant_suppression()','8a47ff9b06764caa384082890c55809e',false,false,true),
('public.exporter_mes_contributions_collectives(uuid)','f92eb034a1246120cf42503ae656181c',true,false,true),
('ephemer_celebrations.carte_envoi_valide(uuid)','a75de06dbb1e864d3abe9dbaf9a046df',false,false,false),
('public.lire_echeances_cartes(integer)','34d8c56eb81e029015afa71ec4039a9e',false,true,true),
('public.lire_enveloppe_carte(uuid)','d3c6a2f2a0cdfe988fe6577b6abd80bb',false,true,true),
('public.reserver_email_carte(uuid,jsonb)','264e922ff1890b9e107344b308b4c84f',false,true,true),
('public.engager_email_carte(uuid,uuid)','0a88cd467904c501032377a9f1b6bf61',false,true,true),
('public.claim_email_job_socle(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb)','0b12dd0c6755240e8f6d93965e47727e',false,false,true),
('public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb)','c696e36d95db5619ec0cce99be834278',false,true,true),
('public.begin_email_job_socle(uuid,uuid)','2cff9c895ff9d9d66d40f464b2fce225',false,false,true),
('public.begin_email_job(uuid,uuid)','1cdba5179408568debb8e05fb4a4bedc',false,true,true)
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
