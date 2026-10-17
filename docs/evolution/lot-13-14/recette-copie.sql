-- RECETTE SUR COPIE UNIQUEMENT. Ne pas enlever les gardes, ne pas créer de comptes Auth ici.
-- Prérequis de SESSION à renseigner humainement sur la copie :
-- ephemer.recette_collective = copie_autorisee
-- ephemer.recette_a / ephemer.recette_b / ephemer.recette_r = UUID de trois comptes SYNTHÉTIQUES vérifiés.
-- Aucune adresse n'est imprimée. Les mutations de cette recette sont annulées par ROLLBACK.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $garde$ DECLARE a uuid; b uuid; r uuid; BEGIN
 IF current_setting('ephemer.recette_collective',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'COPIE autorisée requise'; END IF;
 a:=current_setting('ephemer.recette_a')::uuid;b:=current_setting('ephemer.recette_b')::uuid;r:=current_setting('ephemer.recette_r')::uuid;
 IF a=b OR a=r OR b=r OR (SELECT count(*) FROM auth.users WHERE id IN (a,b,r) AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL AND NOT is_anonymous)<>3 THEN RAISE EXCEPTION 'Trois comptes synthétiques distincts vérifiés requis'; END IF;
 IF EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations WHERE id='f1300000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Fixture déjà présente : arrêter'; END IF;
 INSERT INTO ephemer_celebrations.celebrations(id,titre,mode,surprise,destinataire) VALUES('f1300000-0000-4000-8000-000000000001','RECETTE COLLECTIVE · jetable','partage',false,r);
 INSERT INTO ephemer_celebrations.participations(id,celebration,compte,role) VALUES('f1300000-0000-4000-8000-000000000011','f1300000-0000-4000-8000-000000000001',a,'organisateur'),('f1300000-0000-4000-8000-000000000012','f1300000-0000-4000-8000-000000000001',b,'participant');
 PERFORM set_config('ephemer.recette_adresse',(SELECT email FROM auth.users WHERE id=r),true);
END $garde$;
SET LOCAL ROLE authenticated;
DO $parcours$ DECLARE c uuid:='f1300000-0000-4000-8000-000000000001'; k uuid:='f1300000-0000-4000-8000-000000000002'; d jsonb; op uuid; lecture jsonb; revision bigint;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ephemer.recette_a'),'role','authenticated')::text,true);
 PERFORM public.commander_carte_collective(c,jsonb_build_object('operation',gen_random_uuid(),'revision',0,'data',jsonb_build_object('action','creer','id',k,'title','Une carte de recette','templateId','clair_de_lune','recipientEmail',current_setting('ephemer.recette_adresse'))));
 op:=gen_random_uuid();d:=jsonb_build_object('operation',op,'revision',1,'data',jsonb_build_object('action','inviter','participation','f1300000-0000-4000-8000-000000000012'));
 PERFORM public.commander_carte_collective(c,d);PERFORM public.commander_carte_collective(c,d);
 lecture:=public.lire_carte_collective(c);IF (lecture->>'revision')::bigint<>2 OR jsonb_array_length(lecture->'contributions')<>0 THEN RAISE EXCEPTION 'Rejeu ou signature implicite incorrect'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ephemer.recette_b'),'role','authenticated')::text,true);
 PERFORM public.commander_carte_collective(c,jsonb_build_object('operation',gen_random_uuid(),'revision',2,'data',jsonb_build_object('action','confirmer','consent',true,'content',jsonb_build_object('message','Texte synthétique','signature','Signature synthétique','avatar',NULL))));
 BEGIN
  PERFORM public.commander_carte_collective(c,jsonb_build_object('operation',gen_random_uuid(),'revision',3,'data',jsonb_build_object('action','valider')));
  RAISE EXCEPTION 'Participant devenu organisateur';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ephemer.recette_a'),'role','authenticated')::text,true);
 PERFORM public.commander_carte_collective(c,jsonb_build_object('operation',gen_random_uuid(),'revision',3,'data',jsonb_build_object('action','fermer','confirmMissing',true)));
 PERFORM public.commander_carte_collective(c,jsonb_build_object('operation',gen_random_uuid(),'revision',4,'data',jsonb_build_object('action','valider')));
 lecture:=public.lire_carte_collective(c);IF lecture->'validated' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Validation absente'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ephemer.recette_b'),'role','authenticated')::text,true);
 BEGIN
  PERFORM public.commander_carte_collective(c,jsonb_build_object('operation',gen_random_uuid(),'revision',5,'data',jsonb_build_object('action','confirmer','consent',true,'content',jsonb_build_object('message','Trop tard','signature','','avatar',NULL))));
  RAISE EXCEPTION 'Contribution après fermeture';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF jsonb_array_length(public.exporter_mes_contributions_collectives(c)->'contributions')<>1 THEN RAISE EXCEPTION 'Export propre incorrect'; END IF;
END $parcours$;
RESET ROLE;
DO $publication$ DECLARE c uuid:='f1300000-0000-4000-8000-000000000001'; k uuid:='f1300000-0000-4000-8000-000000000002'; h text; resultat jsonb; BEGIN
 h:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');
 -- Enveloppe de fixture INUTILISABLE : aucun lien réel ou email n'est créé/testé.
 resultat:=public.publier_carte_collective(k,current_setting('ephemer.recette_a')::uuid,5,gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),h,jsonb_build_object('format',1,'ciphertext','','nonce',repeat('0',24),'tag',repeat('0',32)),30);
 IF (public.consulter_carte_collective(h)->'content'->'contributions'->0->>'message') IS DISTINCT FROM 'Texte synthétique' THEN RAISE EXCEPTION 'Version publiée incorrecte'; END IF;
 UPDATE ephemer_celebrations.participations SET etat='partie' WHERE id='f1300000-0000-4000-8000-000000000012';
 IF public.consulter_carte_collective(h) IS NOT NULL OR EXISTS(SELECT 1 FROM ephemer_celebrations.carte_contributions WHERE carte=k) THEN RAISE EXCEPTION 'Départ sans retrait/révocation'; END IF;
END $publication$;
SELECT 'parcours_synthetique_SQL_ok_JWT_REST_et_courses_encore_requis' AS resultat;
ROLLBACK;
