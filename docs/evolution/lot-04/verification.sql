-- Lot 04 — A = metadonnees READ ONLY ; B = fixtures isolees DESACTIVEES.
-- Ne pas coller ce fichier avec le schema. Lire README.md.
-- A uniquement peut confirmer l'installation distante, sans lire de donnees privees.
-- Pour une execution EN ENTIER sans B, utiliser verification-lecture-seule.sql.
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
COMMIT;

-- B : ne lancer QUE sur copie isolee autorisee, triggers Auth/contacts relus.
-- Dans la MEME session : SET ephemer.lot04_test_isole='CONFIRME_COPIE_ISOLEE_LOT04';
-- SET ROLE/claims simule les roles SQL, pas la verification cryptographique d'un JWT.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_setting('ephemer.lot04_test_isole',true) IS DISTINCT FROM 'CONFIRME_COPIE_ISOLEE_LOT04' THEN
    RAISE EXCEPTION 'B desactive : copie isolee autorisee requise.';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN
    ('00000000-0000-4000-8000-0000000004a1','00000000-0000-4000-8000-0000000004b2'))
    OR EXISTS (SELECT 1 FROM public.evenements_personnels WHERE id IN
    ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000402')) THEN
    RAISE EXCEPTION 'Identifiants fictifs deja utilises : arret.';
  END IF;
END;
$garde$;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000004a1','lot04-a@example.invalid','{"prenom":"Test A"}'),
  ('00000000-0000-4000-8000-0000000004b2','lot04-b@example.invalid','{"prenom":"Test B"}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000004a1","role":"authenticated"}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000004a1',true);
SELECT public.enregistrer_evenement_lot02('{"id":"00000000-0000-4000-8000-000000000401","revision":0,
  "type_evenement":"mariage","titre":"Attention annuelle","recurrence":"annuelle","date":"2027-04-12"}');
SELECT public.materialiser_occurrences_lot02('2027-01-01','2027-12-31');
SELECT public.materialiser_occurrences_lot02('2028-01-01','2028-12-31');
SELECT set_config('ephemer.lot04_occurrence_a',(SELECT id::text FROM public.occurrences_evenements
  WHERE evenement_id='00000000-0000-4000-8000-000000000401' AND cycle=2027),true);
DO $preparation$
DECLARE v_p public.preparations_evenements; v_p2 public.preparations_evenements;
  v_t public.taches_preparation; v_t2 public.taches_preparation; v_occ uuid:=current_setting('ephemer.lot04_occurrence_a')::uuid;
BEGIN
  v_p:=public.ouvrir_preparation_lot04(v_occ);
  v_p2:=public.ouvrir_preparation_lot04(v_occ);
  IF v_p.id<>v_p2.id OR (SELECT count(*) FROM public.preparations_evenements WHERE occurrence_id=v_occ)<>1 THEN
    RAISE EXCEPTION 'Preparation dupliquee';
  END IF;
  PERFORM set_config('ephemer.lot04_preparation_a',v_p.id::text,true);
  v_t:=public.ajouter_tache_lot04('00000000-0000-4000-8000-000000000411',v_p.id,'message','Preparer un message');
  v_t2:=public.ajouter_tache_lot04('00000000-0000-4000-8000-000000000411',v_p.id,'message','Preparer un message');
  IF v_t.id<>v_t2.id THEN RAISE EXCEPTION 'Retry tache duplique'; END IF;
  v_t2:=public.ajouter_tache_lot04('00000000-0000-4000-8000-000000000412',v_p.id,'message','Autre titre');
  IF v_t.id<>v_t2.id THEN RAISE EXCEPTION 'Action predefinie dupliquee'; END IF;
  PERFORM public.ajouter_tache_lot04('00000000-0000-4000-8000-000000000413',v_p.id,'libre','Faire un gateau');
  PERFORM public.ajouter_tache_lot04('00000000-0000-4000-8000-000000000414',v_p.id,'libre','Trouver une recette');
  BEGIN
    PERFORM public.enregistrer_tache_lot04(v_t.id,1,v_t.titre,'   ','faite');
    RAISE EXCEPTION 'Message vide declare pret';
  EXCEPTION WHEN check_violation THEN NULL; END;
  v_t:=public.enregistrer_tache_lot04(v_t.id,1,v_t.titre,'Brouillon prive conserve','a_faire');
  BEGIN
    PERFORM public.enregistrer_tache_lot04(v_t.id,1,v_t.titre,'Ecrasement','faite');
    RAISE EXCEPTION 'Ancienne revision acceptee';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN
    UPDATE public.taches_preparation SET titre='UPDATE aveugle' WHERE id=v_t.id;
    RAISE EXCEPTION 'UPDATE sans revision accepte';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  v_t:=public.enregistrer_tache_lot04(v_t.id,2,v_t.titre,v_t.brouillon_texte,'abandonnee');
  v_t:=public.enregistrer_tache_lot04(v_t.id,3,v_t.titre,v_t.brouillon_texte,'a_faire');
  v_t:=public.enregistrer_tache_lot04(v_t.id,4,v_t.titre,v_t.brouillon_texte,'faite');
  IF v_t.revision<>5 OR v_t.brouillon_texte<>'Brouillon prive conserve' THEN RAISE EXCEPTION 'Brouillon/reouverture perdu'; END IF;
  v_p:=public.enregistrer_preparation_lot04(v_p.id,1,'terminee',true);
  v_p:=public.enregistrer_preparation_lot04(v_p.id,2,'abandonnee',true);
  v_p:=public.enregistrer_preparation_lot04(v_p.id,3,'ouverte',false);
  BEGIN
    PERFORM public.enregistrer_preparation_lot04(v_p.id,1,'terminee',false);
    RAISE EXCEPTION 'Preparation ecrasee';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  v_p2:=public.ouvrir_preparation_lot04((SELECT id FROM public.occurrences_evenements
    WHERE evenement_id='00000000-0000-4000-8000-000000000401' AND cycle=2028));
  IF v_p2.id=v_p.id OR v_p2.etat<>'ouverte' OR v_p2.sans_achat OR EXISTS
    (SELECT 1 FROM public.taches_preparation WHERE preparation_id=v_p2.id) THEN
    RAISE EXCEPTION 'Nouvelle annee reutilise la progression';
  END IF;
  PERFORM public.modifier_occurrence_lot02(v_occ,'2028-01-03',false,1);
  IF (public.ouvrir_preparation_lot04(v_occ)).id<>v_p.id OR
    NOT EXISTS (SELECT 1 FROM public.occurrences_evenements WHERE id=v_occ AND cycle=2027 AND date_occurrence='2028-01-03') THEN
    RAISE EXCEPTION 'Report change identite ou cycle';
  END IF;
  PERFORM public.enregistrer_evenement_lot02('{"id":"00000000-0000-4000-8000-000000000401","revision":1,
    "type_evenement":"mariage","titre":"Attention renommee","recurrence":"annuelle","date":"2027-04-13","depuis_cycle":2027}');
  PERFORM public.modifier_occurrence_lot02(v_occ,'2028-01-03',true,
    (SELECT revision FROM public.occurrences_evenements WHERE id=v_occ));
  PERFORM public.preferences_evenement_lot02('00000000-0000-4000-8000-000000000401',true,false,true,NULL,2);
  IF (public.ouvrir_preparation_lot04(v_occ)).id<>v_p.id OR NOT EXISTS
    (SELECT 1 FROM public.taches_preparation WHERE id=v_t.id AND etat='faite') THEN
    RAISE EXCEPTION 'Annulation/archivage detruit historique';
  END IF;
END;
$preparation$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000004b2","role":"authenticated"}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000004b2',true);
SELECT public.enregistrer_evenement_lot02('{"id":"00000000-0000-4000-8000-000000000402","revision":0,
  "type_evenement":"libre","titre":"Date B","date":"2027-05-01"}');
SELECT public.materialiser_occurrences_lot02('2027-01-01','2027-12-31');
SELECT public.ouvrir_preparation_lot04((SELECT id FROM public.occurrences_evenements
  WHERE evenement_id='00000000-0000-4000-8000-000000000402'));
DO $compte_b$
DECLARE v_nombre integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.preparations_evenements WHERE user_id<>'00000000-0000-4000-8000-0000000004b2')
    OR EXISTS (SELECT 1 FROM public.taches_preparation) THEN RAISE EXCEPTION 'B lit A'; END IF;
  UPDATE public.preparations_evenements SET etat='terminee',revision=5
    WHERE id=current_setting('ephemer.lot04_preparation_a')::uuid;
  GET DIAGNOSTICS v_nombre=ROW_COUNT;
  IF v_nombre<>0 THEN RAISE EXCEPTION 'B modifie A'; END IF;
  DELETE FROM public.taches_preparation WHERE id='00000000-0000-4000-8000-000000000411';
  GET DIAGNOSTICS v_nombre=ROW_COUNT;
  IF v_nombre<>0 THEN RAISE EXCEPTION 'B supprime A'; END IF;
  BEGIN
    PERFORM public.ouvrir_preparation_lot04(current_setting('ephemer.lot04_occurrence_a')::uuid);
    RAISE EXCEPTION 'B ouvre occurrence A';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.enregistrer_tache_lot04('00000000-0000-4000-8000-000000000411',5,'Vol','Vol','faite');
    RAISE EXCEPTION 'B modifie tache A';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.preparations_evenements(user_id,occurrence_id)
      VALUES('00000000-0000-4000-8000-0000000004a1',current_setting('ephemer.lot04_occurrence_a')::uuid);
    RAISE EXCEPTION 'B usurpe A';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.preparations_evenements(occurrence_id) VALUES(current_setting('ephemer.lot04_occurrence_a')::uuid);
    RAISE EXCEPTION 'Reference occurrence etrangere acceptee';
  EXCEPTION WHEN insufficient_privilege OR foreign_key_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.taches_preparation(preparation_id,type_tache,titre)
      VALUES(current_setting('ephemer.lot04_preparation_a')::uuid,'libre','Vol');
    RAISE EXCEPTION 'Reference preparation etrangere acceptee';
  EXCEPTION WHEN insufficient_privilege OR foreign_key_violation THEN NULL; END;
END;
$compte_b$;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT set_config('request.jwt.claim.sub','',true);
DO $anon$
BEGIN
  BEGIN PERFORM 1 FROM public.preparations_evenements; RAISE EXCEPTION 'Anon lit';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.ouvrir_preparation_lot04(current_setting('ephemer.lot04_occurrence_a')::uuid);
    RAISE EXCEPTION 'Anon execute RPC'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.taches_preparation(preparation_id,type_tache,titre)
    VALUES(current_setting('ephemer.lot04_preparation_a')::uuid,'libre','Vol'); RAISE EXCEPTION 'Anon cree';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.preparations_evenements SET etat='terminee',revision=5; RAISE EXCEPTION 'Anon modifie';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN DELETE FROM public.taches_preparation; RAISE EXCEPTION 'Anon supprime';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$anon$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000004a1","role":"authenticated"}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000004a1',true);
DO $retour_a$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.taches_preparation WHERE
    id='00000000-0000-4000-8000-000000000411' AND brouillon_texte='Brouillon prive conserve' AND etat='faite') THEN
    RAISE EXCEPTION 'Donnees perdues apres changement de session simule';
  END IF;
  BEGIN
    PERFORM public.supprimer_evenement_lot02('00000000-0000-4000-8000-000000000401',3,false);
    RAISE EXCEPTION 'Effacement sans confirmation';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM public.supprimer_evenement_lot02('00000000-0000-4000-8000-000000000401',3,true);
  IF EXISTS (SELECT 1 FROM public.preparations_evenements) OR EXISTS (SELECT 1 FROM public.taches_preparation) THEN
    RAISE EXCEPTION 'Cascade evenement incomplete';
  END IF;
END;
$retour_a$;
RESET ROLE;
-- Effacement du seul compte FICTIF B ; tout est annule au ROLLBACK.
DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-0000000004b2';
DO $cascade_auth$
BEGIN
  IF EXISTS (SELECT 1 FROM public.preparations_evenements WHERE user_id='00000000-0000-4000-8000-0000000004b2') THEN
    RAISE EXCEPTION 'Cascade Auth incomplete';
  END IF;
END;
$cascade_auth$;
ROLLBACK;
-- C : concurrence a deux sessions et vraie reconnexion : protocole dans README.md.
