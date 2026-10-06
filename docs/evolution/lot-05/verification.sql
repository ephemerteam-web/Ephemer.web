-- Lot 05 — A = metadonnees READ ONLY ; B = fixtures isolees DESACTIVEES.
-- Ne pas coller ce fichier avec le schema. Lire README.md.
-- A uniquement peut confirmer l'installation distante, sans lire de donnees privees.
-- Pour une execution EN ENTIER sans B, utiliser verification-lecture-seule.sql.
BEGIN READ ONLY;
SELECT n.nspname,c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) AS proprietaire_sql
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('idees_cadeaux','choix_cadeaux','cadeaux_offerts');
SELECT table_name,column_name,data_type,is_nullable,column_default
FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('idees_cadeaux','choix_cadeaux','cadeaux_offerts')
ORDER BY table_name,ordinal_position;
SELECT conrelid::regclass,conname,pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid IN (to_regclass('public.idees_cadeaux'),to_regclass('public.choix_cadeaux'),to_regclass('public.cadeaux_offerts'));
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('idees_cadeaux','choix_cadeaux','cadeaux_offerts');
SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public' AND tablename IN ('idees_cadeaux','choix_cadeaux','cadeaux_offerts');
SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('idees_cadeaux','choix_cadeaux','cadeaux_offerts') ORDER BY 1,2,3;
SELECT table_name,column_name,grantee,privilege_type FROM information_schema.role_column_grants
WHERE table_schema='public' AND table_name IN ('idees_cadeaux','choix_cadeaux','cadeaux_offerts') ORDER BY 1,2,3,4;
SELECT tgrelid::regclass,pg_get_triggerdef(oid) FROM pg_trigger
WHERE NOT tgisinternal AND tgrelid IN (to_regclass('public.idees_cadeaux'),to_regclass('public.choix_cadeaux'),to_regclass('public.cadeaux_offerts'));
SELECT n.nspname,p.proname,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='ephemer_lot05' OR (n.nspname='public' AND p.proname IN ('choisir_idee_lot05','noter_cadeau_offert_lot05','budget_cadeaux_lot05'));
DO $catalogue$
DECLARE v_table text; v_oid regclass; v_col text; v_insert text[]; v_update text[]; v_rpc text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['idees_cadeaux','choix_cadeaux','cadeaux_offerts'] LOOP
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
    IF v_table='idees_cadeaux' THEN
      v_insert:=ARRAY['id','user_id','contact_id','titre','note','lien_marchand','prix_estime_centimes','devise_estimee','archivee'];
      v_update:=ARRAY['contact_id','titre','note','lien_marchand','prix_estime_centimes','devise_estimee','archivee','revision'];
    END IF;
    IF v_table='choix_cadeaux' THEN
      v_insert:=ARRAY['id','user_id','preparation_id','idee_id','titre','prix_estime_centimes','devise_estimee','etat','montant_depense_centimes','devise_depensee','date_achat'];
      v_update:=ARRAY['titre','prix_estime_centimes','devise_estimee','etat','montant_depense_centimes','devise_depensee','date_achat','revision'];
    END IF;
    IF v_table='cadeaux_offerts' THEN
      v_insert:=ARRAY['id','user_id','contact_id','destinataire_historique','occurrence_id','choix_id','titre','date_don','reaction','achat_declare','montant_depense_centimes','devise_depensee','date_achat'];
      v_update:=ARRAY['contact_id','destinataire_historique','occurrence_id','titre','date_don','reaction','achat_declare','montant_depense_centimes','devise_depensee','date_achat','revision'];
    END IF;
    FOR v_col IN SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=v_table LOOP
      IF has_column_privilege('authenticated',v_oid,v_col,'INSERT') IS DISTINCT FROM (v_col=ANY(v_insert))
        OR has_column_privilege('authenticated',v_oid,v_col,'UPDATE') IS DISTINCT FROM (v_col=ANY(v_update)) THEN
        RAISE EXCEPTION 'Droit colonne divergent : %.%',v_table,v_col;
      END IF;
    END LOOP;
  END LOOP;
  FOREACH v_rpc IN ARRAY ARRAY['public.choisir_idee_lot05(uuid,uuid,uuid)','public.noter_cadeau_offert_lot05(uuid,uuid,date,text)','public.budget_cadeaux_lot05(date,date)'] LOOP
    IF to_regprocedure(v_rpc) IS NULL THEN RAISE EXCEPTION 'RPC absente : %',v_rpc; END IF;
    IF (SELECT prosecdef FROM pg_proc WHERE oid=to_regprocedure(v_rpc))
      OR has_function_privilege('anon',to_regprocedure(v_rpc),'EXECUTE')
      OR has_function_privilege('service_role',to_regprocedure(v_rpc),'EXECUTE')
      OR NOT has_function_privilege('authenticated',to_regprocedure(v_rpc),'EXECUTE') THEN
      RAISE EXCEPTION 'Contrat EXECUTE/invoker divergent : %',v_rpc;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='ephemer_lot05' AND
      (p.prosecdef OR has_function_privilege('anon',p.oid,'EXECUTE'))) THEN
    RAISE EXCEPTION 'Helper privilegie ou public inattendu.';
  END IF;
END;
$catalogue$;
COMMIT;

-- B : uniquement COPIE ISOLEE AUTORISEE ; triggers Auth/contacts inspectes.
-- MEME session : SET ephemer.lot05_test_isole='CONFIRME_COPIE_ISOLEE_LOT05';
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_setting('ephemer.lot05_test_isole',true) IS DISTINCT FROM 'CONFIRME_COPIE_ISOLEE_LOT05' THEN
    RAISE EXCEPTION 'B desactive : copie isolee autorisee requise.';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN
    ('00000000-0000-4000-8000-0000000005a1','00000000-0000-4000-8000-0000000005b2'))
    OR EXISTS (SELECT 1 FROM public.evenements_personnels WHERE id='00000000-0000-4000-8000-000000000501') THEN
    RAISE EXCEPTION 'Identifiants fictifs deja utilises : arret.';
  END IF;
END;
$garde$;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000005a1','lot05-a@example.invalid','{"prenom":"Test A"}'),
  ('00000000-0000-4000-8000-0000000005b2','lot05-b@example.invalid','{"prenom":"Test B"}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000005b2","role":"authenticated"}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000005b2',true);
INSERT INTO public.contacts(user_id,prenom) VALUES(auth.uid(),'Contact B');
SELECT set_config('ephemer.lot05_contact_b',(SELECT id::text FROM public.contacts WHERE user_id=auth.uid()),true);
INSERT INTO public.idees_cadeaux(id,titre) VALUES('00000000-0000-4000-8000-000000000512','Idee B');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000005a1","role":"authenticated"}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000005a1',true);
INSERT INTO public.contacts(user_id,prenom) VALUES(auth.uid(),'Contact A');
SELECT set_config('ephemer.lot05_contact_a',(SELECT id::text FROM public.contacts WHERE user_id=auth.uid()),true);
SELECT public.enregistrer_evenement_lot02(jsonb_build_object(
  'id','00000000-0000-4000-8000-000000000501','revision',0,
  'contact_id',current_setting('ephemer.lot05_contact_a')::bigint,
  'type_evenement','mariage','titre','Attention annuelle','recurrence','annuelle','date','2027-05-10'));
SELECT public.materialiser_occurrences_lot02('2027-01-01','2027-12-31');
SELECT public.materialiser_occurrences_lot02('2028-01-01','2028-12-31');
SELECT set_config('ephemer.lot05_occurrence',(SELECT id::text FROM public.occurrences_evenements
  WHERE evenement_id='00000000-0000-4000-8000-000000000501' AND cycle=2027),true);
SELECT set_config('ephemer.lot05_preparation',
  (public.ouvrir_preparation_lot04(current_setting('ephemer.lot05_occurrence')::uuid)).id::text,true);

-- Idee autonome : aucun evenement/contact n'est requis.
INSERT INTO public.idees_cadeaux(id,titre,note,lien_marchand,prix_estime_centimes) VALUES
 ('00000000-0000-4000-8000-000000000511','Petit cadeau','Note privee jamais transmise','https://example.invalid/cadeau',10);
INSERT INTO public.idees_cadeaux(id,contact_id,titre) VALUES
 ('00000000-0000-4000-8000-000000000513',current_setting('ephemer.lot05_contact_a')::bigint,'Idee durable');
DO $liens_et_montants$
DECLARE v_lien text;
BEGIN
  FOREACH v_lien IN ARRAY ARRAY['javascript:alert(1)','data:text/html,test','//example.invalid',
    'http://','https://a b.invalid','https://user:pass@example.invalid','https://example.invalid:99999',
    'https://example.invalid/<script>','https://example.invalid/'||chr(10)] LOOP
    BEGIN
      INSERT INTO public.idees_cadeaux(titre,lien_marchand) VALUES('Invalide',v_lien);
      RAISE EXCEPTION 'Lien dangereux/invalide accepte : %',v_lien;
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
  IF NOT ephemer_lot05.lien_valide('http://example.invalid:8080/path?q=ok')
    OR NOT ephemer_lot05.lien_valide('https://[::1]/')
    OR NOT ephemer_lot05.lien_valide(NULL) THEN RAISE EXCEPTION 'Lien http/https valide refuse'; END IF;
  BEGIN INSERT INTO public.idees_cadeaux(titre,prix_estime_centimes) VALUES('Negatif',-1);
    RAISE EXCEPTION 'Montant negatif accepte'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO public.idees_cadeaux(titre,prix_estime_centimes) VALUES('Trop grand',9007199254740992);
    RAISE EXCEPTION 'Montant non sur JS accepte'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO public.idees_cadeaux(titre,prix_estime_centimes,devise_estimee) VALUES('Sans devise',10,NULL);
    RAISE EXCEPTION 'Montant sans devise accepte'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO public.idees_cadeaux(titre,devise_estimee) VALUES('Devise invalide','JPY');
    RAISE EXCEPTION 'Devise hors catalogue acceptee'; EXCEPTION WHEN check_violation THEN NULL; END;
END;
$liens_et_montants$;
DO $selection$
DECLARE v_c public.choix_cadeaux; v_retry public.choix_cadeaux;
BEGIN
  v_c:=public.choisir_idee_lot05('00000000-0000-4000-8000-000000000521',
    current_setting('ephemer.lot05_preparation')::uuid,'00000000-0000-4000-8000-000000000511');
  v_retry:=public.choisir_idee_lot05('00000000-0000-4000-8000-000000000529',
    current_setting('ephemer.lot05_preparation')::uuid,'00000000-0000-4000-8000-000000000511');
  IF v_c.id<>v_retry.id THEN RAISE EXCEPTION 'Idee selectionnee deux fois'; END IF;
  UPDATE public.idees_cadeaux SET prix_estime_centimes=999,revision=2
    WHERE id='00000000-0000-4000-8000-000000000511' AND revision=1;
  IF (SELECT prix_estime_centimes FROM public.choix_cadeaux WHERE id=v_c.id)<>10 THEN
    RAISE EXCEPTION 'Edition idee reecrit estimation historique';
  END IF;
  BEGIN UPDATE public.idees_cadeaux SET titre='Aveugle' WHERE id='00000000-0000-4000-8000-000000000511';
    RAISE EXCEPTION 'UPDATE sans revision accepte'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  UPDATE public.choix_cadeaux SET etat='achete',montant_depense_centimes=10,devise_depensee='EUR',
    date_achat='2027-05-01',revision=2 WHERE id=v_c.id AND revision=1;
  PERFORM public.choisir_idee_lot05('00000000-0000-4000-8000-00000000052a',
    (public.ouvrir_preparation_lot04((SELECT id FROM public.occurrences_evenements
      WHERE evenement_id='00000000-0000-4000-8000-000000000501' AND cycle=2028))).id,
    '00000000-0000-4000-8000-000000000511');
  IF (SELECT count(*) FROM public.choix_cadeaux WHERE idee_id='00000000-0000-4000-8000-000000000511')<>2 THEN
    RAISE EXCEPTION 'Reselection annee suivante impossible';
  END IF;
END;
$selection$;
INSERT INTO public.choix_cadeaux(id,preparation_id,titre,etat,montant_depense_centimes,devise_depensee,date_achat,
  prix_estime_centimes,devise_estimee) VALUES
 ('00000000-0000-4000-8000-000000000522',current_setting('ephemer.lot05_preparation')::uuid,'Achat 20','achete',20,'EUR','2027-05-02',30,'EUR'),
 ('00000000-0000-4000-8000-000000000523',current_setting('ephemer.lot05_preparation')::uuid,'Achat inconnu','achete',NULL,'EUR','2027-05-02',NULL,'EUR'),
 ('00000000-0000-4000-8000-000000000524',current_setting('ephemer.lot05_preparation')::uuid,'Zero connu','achete',0,'EUR','2027-05-02',NULL,'EUR'),
 ('00000000-0000-4000-8000-000000000525',current_setting('ephemer.lot05_preparation')::uuid,'Sans date','achete',5,'EUR',NULL,NULL,'EUR'),
 ('00000000-0000-4000-8000-000000000526',current_setting('ephemer.lot05_preparation')::uuid,'Sans date ni montant','achete',NULL,'EUR',NULL,NULL,'EUR'),
 ('00000000-0000-4000-8000-000000000527',current_setting('ephemer.lot05_preparation')::uuid,'Prevu 40','prevu',NULL,NULL,NULL,40,'EUR'),
 ('00000000-0000-4000-8000-000000000528',current_setting('ephemer.lot05_preparation')::uuid,'Prevu inconnu','prevu',NULL,NULL,NULL,NULL,'EUR'),
 ('00000000-0000-4000-8000-00000000052b',current_setting('ephemer.lot05_preparation')::uuid,'Prevu USD','prevu',NULL,NULL,NULL,10,'USD');
SELECT public.noter_cadeau_offert_lot05('00000000-0000-4000-8000-000000000531',
 '00000000-0000-4000-8000-000000000521','2027-05-10','Reaction volontaire');
SELECT public.noter_cadeau_offert_lot05('00000000-0000-4000-8000-00000000053a',
 '00000000-0000-4000-8000-000000000521','2027-05-11','Retry sans ecrasement');
INSERT INTO public.cadeaux_offerts(id,destinataire_historique,titre,date_don,achat_declare,
  montant_depense_centimes,devise_depensee,date_achat) VALUES
 ('00000000-0000-4000-8000-000000000532','Proche sans fiche','Don direct USD','2027-05-10',true,40,'USD','2027-05-01'),
 ('00000000-0000-4000-8000-000000000533','Proche sans fiche','Attention sans achat','2027-05-10',false,NULL,NULL,NULL);
DO $budget$
DECLARE v_b record; v_c public.choix_cadeaux; v_p public.preparations_evenements; v_n integer;
BEGIN
  SELECT * INTO v_b FROM public.budget_cadeaux_lot05('2027-05-01','2027-06-01') WHERE devise='EUR';
  IF NOT FOUND OR v_b.prevu<>'0.40' OR v_b.depense<>'0.30' OR v_b.nb_prevu_inconnu<>1
    OR v_b.nb_depense_inconnu<>1 OR v_b.nb_depense_sans_date<>2 OR v_b.depense_sans_date<>'0.05'
    OR v_b.nb_depense_sans_date_inconnu<>1 THEN RAISE EXCEPTION 'Budget EUR incorrect : %',row_to_json(v_b); END IF;
  SELECT * INTO v_b FROM public.budget_cadeaux_lot05('2027-01-01','2028-01-01') WHERE devise='USD';
  IF NOT FOUND OR v_b.depense<>'0.40' OR v_b.prevu<>'0.10' THEN RAISE EXCEPTION 'Devises melangees'; END IF;
  IF (SELECT count(*) FROM public.cadeaux_offerts WHERE choix_id='00000000-0000-4000-8000-000000000521')<>1
    OR (SELECT date_don FROM public.cadeaux_offerts WHERE id='00000000-0000-4000-8000-000000000531')<>'2027-05-10'::date THEN
    RAISE EXCEPTION 'Don duplique ou retry modifie historique';
  END IF;
  BEGIN
    INSERT INTO public.cadeaux_offerts(destinataire_historique,occurrence_id,contact_id,choix_id,titre,date_don,
      achat_declare,montant_depense_centimes,devise_depensee,date_achat)
      VALUES('A',current_setting('ephemer.lot05_occurrence')::uuid,current_setting('ephemer.lot05_contact_a')::bigint,
        '00000000-0000-4000-8000-000000000522','Double depense','2027-05-10',true,20,'EUR','2027-05-02');
    RAISE EXCEPTION 'Duplication depense dans don acceptee';
  EXCEPTION WHEN check_violation THEN NULL; END;
  v_p:=public.enregistrer_preparation_lot04(current_setting('ephemer.lot05_preparation')::uuid,1,'ouverte',true);
  SELECT * INTO v_b FROM public.budget_cadeaux_lot05('2027-05-01','2027-06-01') WHERE devise='EUR';
  IF v_b.prevu<>'0.00' OR v_b.depense<>'0.30' THEN RAISE EXCEPTION 'Sans achat efface depense ou garde prevision'; END IF;
  PERFORM public.enregistrer_preparation_lot04(v_p.id,2,'ouverte',false);
  PERFORM public.noter_cadeau_offert_lot05('00000000-0000-4000-8000-000000000534',
    '00000000-0000-4000-8000-000000000527','2027-05-10',NULL);
  SELECT * INTO v_b FROM public.budget_cadeaux_lot05('2027-05-01','2027-06-01') WHERE devise='EUR';
  IF v_b.prevu<>'0.00' OR v_b.depense<>'0.30' OR
    (SELECT etat FROM public.choix_cadeaux WHERE id='00000000-0000-4000-8000-000000000527')<>'prevu' THEN
    RAISE EXCEPTION 'Don implique achat ou reste compte en prevision';
  END IF;
  DELETE FROM public.cadeaux_offerts WHERE id IN
    ('00000000-0000-4000-8000-000000000531','00000000-0000-4000-8000-000000000534');
  SELECT * INTO v_b FROM public.budget_cadeaux_lot05('2027-05-01','2027-06-01') WHERE devise='EUR';
  IF v_b.depense<>'0.30' OR v_b.prevu<>'0.40' THEN RAISE EXCEPTION 'Retrait don annule achat'; END IF;
  PERFORM public.noter_cadeau_offert_lot05('00000000-0000-4000-8000-000000000531',
    '00000000-0000-4000-8000-000000000521','2027-05-10','Historique conserve');
  -- Revision perimee : aucun UPDATE effectif, jamais ecraser la ligne courante.
  UPDATE public.choix_cadeaux SET titre='Ancien onglet',revision=2
    WHERE id='00000000-0000-4000-8000-000000000521' AND revision=1;
  GET DIAGNOSTICS v_n=ROW_COUNT;
  IF v_n<>0 THEN RAISE EXCEPTION 'Ancienne revision ecrase choix'; END IF;
  -- Deux montants individuels surs JS, total superieur : somme NUMERIC exacte.
  INSERT INTO public.cadeaux_offerts(id,destinataire_historique,titre,date_don,achat_declare,
    montant_depense_centimes,devise_depensee,date_achat) VALUES
    ('00000000-0000-4000-8000-000000000538','A','Grand 1','2027-05-10',true,9007199254740991,'EUR','2027-05-01'),
    ('00000000-0000-4000-8000-000000000539','A','Grand 2','2027-05-10',true,9007199254740991,'EUR','2027-05-01');
  SELECT * INTO v_b FROM public.budget_cadeaux_lot05('2027-05-01','2027-06-01') WHERE devise='EUR';
  IF v_b.depense<>'180143985094820.12' THEN RAISE EXCEPTION 'Somme arrondie/perdue : %',v_b.depense; END IF;
  DELETE FROM public.cadeaux_offerts WHERE id IN
    ('00000000-0000-4000-8000-000000000538','00000000-0000-4000-8000-000000000539');
  BEGIN PERFORM public.budget_cadeaux_lot05('2027-06-01','2027-05-01');
    RAISE EXCEPTION 'Periode inversee acceptee'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$budget$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000005b2","role":"authenticated"}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000005b2',true);
DO $isolation$
DECLARE v_n integer;
BEGIN
  IF (SELECT count(*) FROM public.idees_cadeaux)<>1 OR EXISTS(SELECT 1 FROM public.choix_cadeaux)
    OR EXISTS(SELECT 1 FROM public.cadeaux_offerts)
    OR EXISTS(SELECT 1 FROM public.budget_cadeaux_lot05('2027-05-01','2027-06-01')) THEN
    RAISE EXCEPTION 'B lit donnees ou agregats A';
  END IF;
  UPDATE public.idees_cadeaux SET titre='Vol',revision=3 WHERE id='00000000-0000-4000-8000-000000000511';
  GET DIAGNOSTICS v_n=ROW_COUNT; IF v_n<>0 THEN RAISE EXCEPTION 'B modifie A'; END IF;
  DELETE FROM public.cadeaux_offerts WHERE id='00000000-0000-4000-8000-000000000531';
  GET DIAGNOSTICS v_n=ROW_COUNT; IF v_n<>0 THEN RAISE EXCEPTION 'B supprime A'; END IF;
  BEGIN INSERT INTO public.idees_cadeaux(user_id,titre) VALUES('00000000-0000-4000-8000-0000000005a1','Vol');
    RAISE EXCEPTION 'Usurpation acceptee'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.idees_cadeaux(contact_id,titre)
    VALUES(current_setting('ephemer.lot05_contact_a')::bigint,'Contact etranger');
    RAISE EXCEPTION 'Contact etranger accepte'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN INSERT INTO public.choix_cadeaux(preparation_id,titre)
    VALUES(current_setting('ephemer.lot05_preparation')::uuid,'Preparation etrangere');
    RAISE EXCEPTION 'Preparation etrangere acceptee'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN PERFORM public.choisir_idee_lot05('00000000-0000-4000-8000-000000000541',
    current_setting('ephemer.lot05_preparation')::uuid,'00000000-0000-4000-8000-000000000511');
    RAISE EXCEPTION 'RPC selection etrangere acceptee'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.cadeaux_offerts(destinataire_historique,titre,date_don,choix_id)
    VALUES('Vol','Vol','2027-05-10','00000000-0000-4000-8000-000000000521');
    RAISE EXCEPTION 'Don rattache a choix etranger'; EXCEPTION WHEN check_violation OR foreign_key_violation THEN NULL; END;
END;
$isolation$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT set_config('request.jwt.claim.sub','',true);
DO $anon$
BEGIN
  BEGIN PERFORM 1 FROM public.idees_cadeaux; RAISE EXCEPTION 'Anon lit';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.idees_cadeaux(titre) VALUES('Vol'); RAISE EXCEPTION 'Anon cree';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.choix_cadeaux SET etat='abandonne',revision=2; RAISE EXCEPTION 'Anon modifie';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN DELETE FROM public.cadeaux_offerts; RAISE EXCEPTION 'Anon supprime';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.budget_cadeaux_lot05('2027-05-01','2027-06-01'); RAISE EXCEPTION 'Anon lit budget';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$anon$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000005a1","role":"authenticated"}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000005a1',true);
DO $historique$
DECLARE v_b record;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.cadeaux_offerts WHERE id='00000000-0000-4000-8000-000000000531'
    AND reaction='Historique conserve') THEN RAISE EXCEPTION 'Historique absent apres changement session simule'; END IF;
  DELETE FROM public.idees_cadeaux WHERE id='00000000-0000-4000-8000-000000000511';
  IF NOT EXISTS(SELECT 1 FROM public.choix_cadeaux WHERE id='00000000-0000-4000-8000-000000000521'
    AND idee_id IS NULL AND titre='Petit cadeau' AND prix_estime_centimes=10 AND montant_depense_centimes=10
    AND revision=3) THEN RAISE EXCEPTION 'Effacement idee perd snapshot ou bloque FK'; END IF;
  -- Le report de l'occurrence bouge les previsions, jamais les achats declares.
  PERFORM public.modifier_occurrence_lot02(current_setting('ephemer.lot05_occurrence')::uuid,'2027-06-10',false,1);
  SELECT * INTO v_b FROM public.budget_cadeaux_lot05('2027-05-01','2027-06-01') WHERE devise='EUR';
  IF v_b.prevu<>'0.00' OR v_b.depense<>'0.30' THEN RAISE EXCEPTION 'Report deplace achats'; END IF;
  SELECT * INTO v_b FROM public.budget_cadeaux_lot05('2027-06-01','2027-07-01') WHERE devise='EUR';
  IF v_b.prevu<>'0.40' OR v_b.depense<>'0.00' THEN RAISE EXCEPTION 'Report ne deplace pas prevision'; END IF;
  DELETE FROM public.contacts WHERE id=current_setting('ephemer.lot05_contact_a')::bigint;
  IF NOT EXISTS(SELECT 1 FROM public.idees_cadeaux WHERE id='00000000-0000-4000-8000-000000000513'
      AND contact_id IS NULL AND revision=2)
    OR NOT EXISTS(SELECT 1 FROM public.cadeaux_offerts WHERE id='00000000-0000-4000-8000-000000000531'
      AND contact_id IS NULL AND destinataire_historique='Contact A') THEN
    RAISE EXCEPTION 'Suppression contact perd historique ou bloque FK';
  END IF;
  UPDATE public.cadeaux_offerts SET reaction='Reaction corrigee',revision=3
    WHERE id='00000000-0000-4000-8000-000000000531' AND revision=2;
  PERFORM public.supprimer_evenement_lot02('00000000-0000-4000-8000-000000000501',
    (SELECT revision FROM public.evenements_personnels WHERE id='00000000-0000-4000-8000-000000000501'),true);
  IF EXISTS(SELECT 1 FROM public.choix_cadeaux) OR EXISTS(SELECT 1 FROM public.cadeaux_offerts
    WHERE id='00000000-0000-4000-8000-000000000531') OR NOT EXISTS(SELECT 1 FROM public.cadeaux_offerts
    WHERE id='00000000-0000-4000-8000-000000000532') THEN
    RAISE EXCEPTION 'Cascade evenement efface mauvais perimetre';
  END IF;
END;
$historique$;
RESET ROLE;
-- Uniquement compte FICTIF A, annule ensuite ; ne teste pas la route HTTP complete.
DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-0000000005a1';
DO $cascade_auth$
BEGIN
  IF EXISTS(SELECT 1 FROM public.idees_cadeaux WHERE user_id='00000000-0000-4000-8000-0000000005a1')
    OR EXISTS(SELECT 1 FROM public.cadeaux_offerts WHERE user_id='00000000-0000-4000-8000-0000000005a1')
    OR NOT EXISTS(SELECT 1 FROM public.idees_cadeaux WHERE id='00000000-0000-4000-8000-000000000512') THEN
    RAISE EXCEPTION 'Cascade Auth/isolation incomplete';
  END IF;
END;
$cascade_auth$;
ROLLBACK;
-- C : vrais JWT, reconnexion, concurrence deux sessions et export : README.md.
