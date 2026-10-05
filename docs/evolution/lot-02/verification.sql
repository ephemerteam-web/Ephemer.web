-- Lot 02 : A = controles READ ONLY ; B = recettes sur COPIE ISOLEE uniquement.
-- Non execute dans cette livraison. Lire README.md avant toute execution.

-- A. Cette partie est seule utilisable pour confirmer l'installation distante.
BEGIN READ ONLY;
SELECT n.nspname, c.relname, c.relrowsecurity,
  pg_get_userbyid(c.relowner) AS proprietaire_sql
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname='public' AND c.relname IN
  ('evenements_personnels','regles_evenements','occurrences_evenements'))
  OR (n.nspname='ephemer_lot02' AND c.relname IN ('fetes_catalogue','etat_schema'));

SELECT table_name,column_name,data_type,is_nullable
FROM information_schema.columns WHERE table_schema='public'
  AND table_name IN ('rappels','notifications')
  AND column_name IN ('contact_id','occurrence_id','occurrence_revision')
ORDER BY table_name,column_name;

SELECT c.conname,c.conrelid::regclass AS table_source,pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c WHERE c.conname LIKE 'lot02_%'
  OR c.conrelid IN (SELECT oid FROM pg_class WHERE relname IN
    ('evenements_personnels','regles_evenements','occurrences_evenements'))
ORDER BY c.conname;
SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE indexname LIKE 'lot02_%';
SELECT schemaname,tablename,policyname,cmd,roles,qual,with_check FROM pg_policies
  WHERE tablename IN ('evenements_personnels','regles_evenements','occurrences_evenements');

SELECT p.oid::regprocedure AS fonction,p.prosecdef AS security_definer,p.proconfig,p.proacl,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS client_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') AS serveur_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='ephemer_lot02' OR (n.nspname='public' AND p.proname LIKE '%_lot02');

SELECT c.oid::regclass AS ressource,
  has_table_privilege('anon',c.oid,'SELECT') AS anon_lecture,
  has_table_privilege('authenticated',c.oid,'SELECT') AS client_lecture,
  has_table_privilege('authenticated',c.oid,'INSERT') AS client_insertion,
  has_table_privilege('authenticated',c.oid,'UPDATE') AS client_modification,
  has_table_privilege('authenticated',c.oid,'DELETE') AS client_effacement
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname='public' AND c.relname IN
  ('evenements_personnels','regles_evenements','occurrences_evenements'))
  OR (n.nspname='ephemer_lot02' AND c.relname IN ('fetes_catalogue','etat_schema'));

SELECT t.tgrelid::regclass AS table_source,t.tgname,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgname LIKE 'lot02_%';
COMMIT;

-- B. ARRET PAR DEFAUT : aucun fixture avant ce garde explicite.
-- Pour TEST ISOLE approuve seulement, executer dans la MEME session avant B :
-- SET ephemer.lot02_test_isole = 'CONFIRME_COPIE_ISOLEE_LOT02';
-- Ne jamais activer ce marqueur sur ephemer-app de production.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_setting('ephemer.lot02_test_isole',true) IS DISTINCT FROM 'CONFIRME_COPIE_ISOLEE_LOT02' THEN
    RAISE EXCEPTION 'Recette B desactivee : autoriser une copie isolee, pas la production.';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN
    ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000b2')) THEN
    RAISE EXCEPTION 'Identifiants fictifs deja utilises ; ne pas toucher aux comptes existants.';
  END IF;
END;
$garde$;

-- Fixtures Auth rollbackees ; trigger create_profile inspecte au 5 octobre.
-- Relire les triggers Auth de la COPIE avant de lancer B. Aucun email d'Auth.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000000a1','lot02-a@example.invalid','{"prenom":"Test A"}'),
  ('00000000-0000-4000-8000-0000000000b2','lot02-b@example.invalid','{"prenom":"Test B"}');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
INSERT INTO public.contacts(user_id,prenom,date_naissance) VALUES
  (auth.uid(),'Marie',NULL),(auth.uid(),'Historique','1900-04-12');
SELECT set_config('ephemer.lot02_contact_a',
  (SELECT id::text FROM public.contacts WHERE user_id=auth.uid() AND prenom='Marie'),true);
SELECT set_config('ephemer.lot02_contact_historique',
  (SELECT id::text FROM public.contacts WHERE user_id=auth.uid() AND prenom='Historique'),true);

DO $positifs$
DECLARE v_birth jsonb; v_feast jsonb; v_point jsonb; v_annual jsonb; v_occ uuid; v_count integer; v_unique uuid;
BEGIN
  v_birth := public.enregistrer_evenement_lot02(jsonb_build_object(
    'id','00000000-0000-4000-8000-000000000101','revision',0,
    'contact_id',current_setting('ephemer.lot02_contact_a')::bigint,
    'type_evenement','anniversaire','titre','Anniversaire Marie','recurrence','annuelle',
    'jour',29,'mois',2,'annee_naissance',NULL));
  v_feast := public.enregistrer_evenement_lot02(jsonb_build_object(
    'id','00000000-0000-4000-8000-000000000102','revision',0,
    'contact_id',current_setting('ephemer.lot02_contact_a')::bigint,
    'type_evenement','fete_prenomale','titre','Fete Marie','recurrence','annuelle','jour',15,'mois',8));
  v_point := public.enregistrer_evenement_lot02('{
    "id":"00000000-0000-4000-8000-000000000103","revision":0,
    "type_evenement":"rencontre","titre":"Sortie unique","date":"2027-04-12"}'::jsonb);
  v_annual := public.enregistrer_evenement_lot02('{
    "id":"00000000-0000-4000-8000-000000000104","revision":0,
    "type_evenement":"mariage","titre":"Date annuelle","recurrence":"annuelle","date":"2027-12-31"}'::jsonb);
  PERFORM public.enregistrer_evenement_lot02('{
    "id":"00000000-0000-4000-8000-000000000105","revision":0,"type_evenement":"anniversaire",
    "titre":"Mon anniversaire","recurrence":"annuelle","jour":12,"mois":4,"annee_naissance":1988}'::jsonb);
  IF (SELECT date_naissance FROM public.profiles WHERE id=auth.uid()) IS DISTINCT FROM '1988-04-12'::date THEN
    RAISE EXCEPTION 'Projection de naissance du compte incorrecte';
  END IF;
  PERFORM public.materialiser_occurrences_lot02('2027-01-01','2027-12-31');
  PERFORM public.materialiser_occurrences_lot02('2028-01-01','2028-12-31');
  PERFORM public.materialiser_occurrences_lot02('2027-01-01','2027-12-31');
  IF (SELECT count(*) FROM public.occurrences_evenements WHERE evenement_id=(v_birth->>'id')::uuid) <> 2
    OR NOT EXISTS (SELECT 1 FROM public.occurrences_evenements WHERE evenement_id=(v_birth->>'id')::uuid
      AND cycle=2027 AND date_occurrence='2027-03-01')
    OR NOT EXISTS (SELECT 1 FROM public.occurrences_evenements WHERE evenement_id=(v_birth->>'id')::uuid
      AND cycle=2028 AND date_occurrence='2028-02-29') THEN
    RAISE EXCEPTION 'Echec bissextile, cycles ou unicite';
  END IF;
  IF EXISTS (SELECT 1 FROM public.regles_evenements WHERE evenement_id=(v_birth->>'id')::uuid
    AND annee_naissance IS NOT NULL) THEN RAISE EXCEPTION 'Annee inventee'; END IF;
  IF (SELECT count(*) FROM public.occurrences_evenements WHERE evenement_id=(v_point->>'id')::uuid) <> 1 THEN
    RAISE EXCEPTION 'Ponctuel reconduit';
  END IF;
  SELECT id INTO v_unique FROM public.occurrences_evenements WHERE evenement_id=(v_point->>'id')::uuid;
  INSERT INTO public.notifications(user_id,contact_id,type,message,event_date,jours_restants,
    occurrence_id,occurrence_revision) VALUES(auth.uid(),NULL,'jour_special','Fixture privee','2027-04-12',0,v_unique,1);
  BEGIN
    INSERT INTO public.notifications(user_id,contact_id,type,message,event_date,jours_restants,
      occurrence_id,occurrence_revision) VALUES(auth.uid(),NULL,'jour_special','Doublon','2027-04-13',0,v_unique,1);
    RAISE EXCEPTION 'Palier duplique apres changement de date';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  PERFORM public.modifier_occurrence_lot02(v_unique,'2027-04-13',false,1);
  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE occurrence_id=v_unique AND occurrence_revision=1
    AND NOT email_envoye) OR NOT EXISTS (SELECT 1 FROM public.occurrences_evenements WHERE id=v_unique AND revision=2) THEN
    RAISE EXCEPTION 'Revision obsolete non distinguable de occurrence courante';
  END IF;
  IF (SELECT date_naissance FROM public.contacts WHERE id=current_setting('ephemer.lot02_contact_historique')::bigint)
    IS DISTINCT FROM '1900-04-12'::date THEN RAISE EXCEPTION 'Historique ambigu converti'; END IF;
  SELECT id INTO v_occ FROM public.occurrences_evenements WHERE evenement_id=(v_birth->>'id')::uuid AND cycle=2027;
  PERFORM public.modifier_occurrence_lot02(v_occ,'2028-01-03',false,1);
  IF NOT EXISTS (SELECT 1 FROM public.occurrences_evenements WHERE id=v_occ AND cycle=2027 AND date_occurrence='2028-01-03') THEN
    RAISE EXCEPTION 'Identite perdue apres report';
  END IF;
  IF (timestamptz '2027-01-01 00:30:00+00' AT TIME ZONE 'Europe/Paris')::date <> '2027-01-01'
    OR (timestamptz '2026-06-30 22:30:00+00' AT TIME ZONE 'Europe/Paris')::date <> '2026-07-01'
    OR date '2026-03-30' - date '2026-03-28' <> 2 THEN RAISE EXCEPTION 'Date civile Paris incorrecte'; END IF;
  SELECT count(*) INTO v_count FROM public.materialiser_occurrences_lot02('2027-12-30','2028-01-04');
  IF v_count <> 2 THEN RAISE EXCEPTION 'Report hors annee non retrouve : %',v_count; END IF;
END;
$positifs$;

DO $refus_saisie$
BEGIN
  BEGIN
    PERFORM public.enregistrer_evenement_lot02(jsonb_build_object('type_evenement','fete_prenomale',
      'titre','Fete invalide','recurrence','annuelle','contact_id',current_setting('ephemer.lot02_contact_a')::bigint,
      'jour',30,'mois',4));
    RAISE EXCEPTION 'Correspondance inventee acceptee';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.enregistrer_evenement_lot02('{"type_evenement":"libre","titre":"Sans annee","date":"04-12"}');
    RAISE EXCEPTION 'Date partielle ponctuelle acceptee';
  EXCEPTION WHEN invalid_parameter_value OR invalid_datetime_format OR datetime_field_overflow THEN NULL; END;
  BEGIN
    PERFORM public.modifier_occurrence_lot02((SELECT id FROM public.occurrences_evenements
      WHERE evenement_id='00000000-0000-4000-8000-000000000101' AND cycle=2027),'2027-03-02',false,1);
    RAISE EXCEPTION 'Revision perimee acceptee';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN
    INSERT INTO public.evenements_personnels(user_id,type_evenement,titre) VALUES(auth.uid(),'libre','DML direct');
    RAISE EXCEPTION 'Mutation directe autorisee';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$refus_saisie$;

-- Nouvelle session de B : roles sociaux fictifs ne conferent aucun droit prive.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated","user_metadata":{"role":"administrateur_cercle"}}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000b2',true);
DO $isolation$
BEGIN
  IF EXISTS (SELECT 1 FROM public.evenements_personnels)
    OR EXISTS (SELECT 1 FROM public.regles_evenements)
    OR EXISTS (SELECT 1 FROM public.occurrences_evenements) THEN
    RAISE EXCEPTION 'Fuite vers B ami/membre/ex-membre/destinataire sans propriete';
  END IF;
  BEGIN
    PERFORM public.enregistrer_evenement_lot02(jsonb_build_object('type_evenement','anniversaire','titre','Contact vole',
      'recurrence','annuelle','contact_id',current_setting('ephemer.lot02_contact_a')::bigint,'jour',12,'mois',4));
    RAISE EXCEPTION 'Reference au contact de A acceptee';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.preferences_evenement_lot02('00000000-0000-4000-8000-000000000101',true,true,false,NULL,1);
    RAISE EXCEPTION 'Modification de A acceptee';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.materialiser_occurrences_serveur_lot02('00000000-0000-4000-8000-0000000000a1','2027-01-01','2027-12-31');
    RAISE EXCEPTION 'RPC serveur accessible au client';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$isolation$;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT set_config('request.jwt.claim.sub','',true);
DO $visiteur$
BEGIN
  BEGIN
    PERFORM 1 FROM public.evenements_personnels;
    RAISE EXCEPTION 'Visiteur lit dates privees';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.materialiser_occurrences_lot02('2027-01-01','2027-12-31');
    RAISE EXCEPTION 'Visiteur execute RPC';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$visiteur$;

-- A reconnecte : fete persiste, arret ne detruit pas l'histoire.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
DO $cycle_vie$
DECLARE v_before integer; v_old uuid; v_past uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.regles_evenements WHERE evenement_id='00000000-0000-4000-8000-000000000102'
    AND NOT retiree AND jour=15 AND mois=8) THEN RAISE EXCEPTION 'Fete perdue apres changement session'; END IF;
  SELECT id INTO v_old FROM public.occurrences_evenements
    WHERE evenement_id='00000000-0000-4000-8000-000000000104' AND cycle=2027;
  PERFORM public.enregistrer_evenement_lot02('{
    "id":"00000000-0000-4000-8000-000000000104","revision":1,
    "type_evenement":"mariage","titre":"Renommee","recurrence":"annuelle",
    "date":"2028-12-30","depuis_cycle":2028}');
  IF NOT EXISTS (SELECT 1 FROM public.occurrences_evenements WHERE id=v_old AND date_occurrence='2027-12-31')
    OR NOT EXISTS (SELECT 1 FROM public.occurrences_evenements
      WHERE evenement_id='00000000-0000-4000-8000-000000000104' AND cycle=2028 AND date_occurrence='2028-12-30') THEN
    RAISE EXCEPTION 'Portee de correction ou identite historique incorrecte';
  END IF;
  PERFORM public.materialiser_occurrences_lot02('2025-01-01','2025-12-31');
  SELECT id INTO v_past FROM public.occurrences_evenements
    WHERE evenement_id='00000000-0000-4000-8000-000000000101' AND cycle=2025;
  PERFORM public.enregistrer_evenement_lot02(jsonb_build_object(
    'id','00000000-0000-4000-8000-000000000101','revision',1,
    'contact_id',current_setting('ephemer.lot02_contact_a')::bigint,
    'type_evenement','anniversaire','titre','Anniversaire corrige','recurrence','annuelle',
    'jour',28,'mois',2,'annee_naissance',NULL,'depuis_cycle',2027));
  IF NOT EXISTS (SELECT 1 FROM public.occurrences_evenements WHERE id=v_past AND date_occurrence='2025-03-01')
    OR NOT EXISTS (SELECT 1 FROM public.occurrences_evenements
      WHERE evenement_id='00000000-0000-4000-8000-000000000101' AND cycle=2027
      AND date_occurrence='2028-01-03' AND date_exception) THEN
    RAISE EXCEPTION 'Historique ou exception explicite perdus';
  END IF;
  SELECT count(*) INTO v_before FROM public.occurrences_evenements
    WHERE evenement_id='00000000-0000-4000-8000-000000000104';
  PERFORM public.preferences_evenement_lot02('00000000-0000-4000-8000-000000000104',false,false,false,2028,2);
  PERFORM public.materialiser_occurrences_lot02('2029-01-01','2029-12-31');
  IF (SELECT count(*) FROM public.occurrences_evenements
    WHERE evenement_id='00000000-0000-4000-8000-000000000104') <> v_before THEN
    RAISE EXCEPTION 'Serie arretee regeneree';
  END IF;
  UPDATE public.contacts SET prenom='Prenom Sans Correspondance' WHERE id=current_setting('ephemer.lot02_contact_a')::bigint;
  IF NOT EXISTS (SELECT 1 FROM public.evenements_personnels WHERE id='00000000-0000-4000-8000-000000000102'
    AND choix_a_reconfirmer AND NOT rappels_actifs) THEN RAISE EXCEPTION 'Fete incompatible non suspendue'; END IF;
END;
$cycle_vie$;

-- Tests FK directs : admin de copie teste les contraintes, en complement des refus client ci-dessus.
RESET ROLE;
DO $references$
DECLARE v_event uuid := '00000000-0000-4000-8000-000000000101'; v_occ uuid;
BEGIN
  SELECT id INTO v_occ FROM public.occurrences_evenements WHERE evenement_id=v_event AND cycle=2028;
  BEGIN
    INSERT INTO public.regles_evenements(user_id,evenement_id,debut_cycle,jour,mois)
      VALUES('00000000-0000-4000-8000-0000000000b2',v_event,2029,1,1);
    RAISE EXCEPTION 'Reference inter-proprietaires acceptee';
  EXCEPTION WHEN foreign_key_violation OR no_data_found THEN NULL; END;
  BEGIN
    INSERT INTO public.notifications(user_id,contact_id,type,message,occurrence_id,occurrence_revision)
      VALUES('00000000-0000-4000-8000-0000000000b2',current_setting('ephemer.lot02_contact_a')::bigint,
        'anniversaire','Fixture',v_occ,1);
    RAISE EXCEPTION 'Notification inter-proprietaires acceptee';
  EXCEPTION WHEN foreign_key_violation OR check_violation THEN NULL; END;
END;
$references$;

DO $suppression$
DECLARE v_histoire uuid;
BEGIN
  SELECT id INTO v_histoire FROM public.occurrences_evenements
    WHERE evenement_id='00000000-0000-4000-8000-000000000101' AND cycle=2027;
  DELETE FROM public.contacts WHERE id=current_setting('ephemer.lot02_contact_a')::bigint;
  IF NOT EXISTS (SELECT 1 FROM public.evenements_personnels
    WHERE id='00000000-0000-4000-8000-000000000101' AND contact_id IS NULL AND archive AND NOT rappels_actifs)
    OR NOT EXISTS (SELECT 1 FROM public.occurrences_evenements WHERE id=v_histoire) THEN
    RAISE EXCEPTION 'Suppression contact : historique perdu ou serie non archivee';
  END IF;
  DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-0000000000a1';
  IF EXISTS (SELECT 1 FROM public.evenements_personnels WHERE user_id='00000000-0000-4000-8000-0000000000a1')
    OR EXISTS (SELECT 1 FROM public.regles_evenements WHERE user_id='00000000-0000-4000-8000-0000000000a1')
    OR EXISTS (SELECT 1 FROM public.occurrences_evenements WHERE user_id='00000000-0000-4000-8000-0000000000a1') THEN
    RAISE EXCEPTION 'Nouvelles donnees orphelines apres effacement Auth';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ephemer_lot02.etat_schema WHERE utilise) THEN
    RAISE EXCEPTION 'Témoin premiere utilisation perdu apres effacement ; rollback non protege';
  END IF;
END;
$suppression$;

ROLLBACK; -- Jamais remplacer par COMMIT ; voir README pour concurrence deux sessions.
