-- Lot 03 — A = metadonnees READ ONLY ; B = fixtures sur COPIE ISOLEE seulement.
-- Non execute dans cette livraison. Lire README.md. Ne pas coller avec le schema.

-- A. Seule cette section est utilisable pour confirmer l'installation distante.
BEGIN READ ONLY;
SELECT n.nspname,c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) AS proprietaire_sql
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('listes_personnelles','appartenances_listes');
SELECT table_name,column_name,data_type,is_nullable,column_default
FROM information_schema.columns WHERE table_schema='public'
  AND table_name IN ('listes_personnelles','appartenances_listes') ORDER BY table_name,ordinal_position;
SELECT conrelid::regclass AS ressource,conname,pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid IN
  (to_regclass('public.listes_personnelles'),to_regclass('public.appartenances_listes'))
  OR (conrelid='public.contacts'::regclass AND contype IN ('p','u'));
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'lot03_%';
SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public' AND tablename IN ('listes_personnelles','appartenances_listes');
SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('listes_personnelles','appartenances_listes') ORDER BY 1,2,3;
SELECT table_name,column_name,grantee,privilege_type FROM information_schema.role_column_grants
WHERE table_schema='public' AND table_name IN ('listes_personnelles','appartenances_listes') ORDER BY 1,2,3,4;

DO $assertions_catalogue$
DECLARE v_table text; v_oid regclass; v_column text;
BEGIN
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('listes_personnelles','appartenances_listes')
      AND c.relkind='r' AND c.relrowsecurity)<>2 THEN
    RAISE EXCEPTION 'Deux tables ordinaires avec RLS attendues.';
  END IF;
  FOREACH v_table IN ARRAY ARRAY['listes_personnelles','appartenances_listes'] LOOP
    v_oid:=to_regclass('public.'||v_table);
    IF has_table_privilege('anon',v_oid,'SELECT') OR has_any_column_privilege('anon',v_oid,'INSERT')
      OR has_any_column_privilege('anon',v_oid,'UPDATE') OR has_table_privilege('anon',v_oid,'DELETE')
      OR NOT has_table_privilege('authenticated',v_oid,'SELECT')
      OR NOT has_table_privilege('authenticated',v_oid,'DELETE')
      OR has_table_privilege('authenticated',v_oid,'UPDATE')
      OR has_table_privilege('authenticated',v_oid,'TRUNCATE')
      OR has_table_privilege('authenticated',v_oid,'REFERENCES')
      OR has_table_privilege('authenticated',v_oid,'TRIGGER')
      OR NOT has_table_privilege('service_role',v_oid,'SELECT')
      OR has_any_column_privilege('service_role',v_oid,'INSERT')
      OR has_any_column_privilege('service_role',v_oid,'UPDATE')
      OR has_table_privilege('service_role',v_oid,'DELETE') THEN
      RAISE EXCEPTION 'Droits inattendus sur %.',v_table;
    END IF;
    FOR v_column IN SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=v_table LOOP
      IF has_column_privilege('authenticated',v_oid,v_column,'UPDATE')
        IS DISTINCT FROM (v_table='listes_personnelles' AND v_column='nom') THEN
        RAISE EXCEPTION 'Seul le nom de liste doit etre modifiable : %.%.',v_table,v_column;
      END IF;
      IF has_column_privilege('authenticated',v_oid,v_column,'INSERT')
        IS DISTINCT FROM (v_column<>'created_at') THEN
        RAISE EXCEPTION 'Droits INSERT inattendus : %.%.',v_table,v_column;
      END IF;
    END LOOP;
  END LOOP;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
    AND tablename IN ('listes_personnelles','appartenances_listes'))<>7 THEN
    RAISE EXCEPTION 'Sept policies attendues ; inspecter toute policy supplementaire.';
  END IF;
END;
$assertions_catalogue$;
COMMIT;

-- B. DESACTIVE PAR DEFAUT, avant la premiere ecriture.
-- Sur copie isolee explicitement autorisee, dans la MEME session seulement :
-- SET ephemer.lot03_test_isole = 'CONFIRME_COPIE_ISOLEE_LOT03';
-- Relire les triggers Auth/contacts/profiles de cette copie. Aucun compte reel.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_setting('ephemer.lot03_test_isole',true) IS DISTINCT FROM 'CONFIRME_COPIE_ISOLEE_LOT03' THEN
    RAISE EXCEPTION 'Recette B desactivee : copie isolee autorisee requise.';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN
    ('00000000-0000-4000-8000-0000000003a1','00000000-0000-4000-8000-0000000003b2'))
    OR EXISTS (SELECT 1 FROM public.listes_personnelles WHERE id IN
    ('00000000-0000-4000-8000-000000000311','00000000-0000-4000-8000-000000000312',
     '00000000-0000-4000-8000-000000000313','00000000-0000-4000-8000-000000000321')) THEN
    RAISE EXCEPTION 'Identifiants fictifs deja utilises : arret sans toucher aux comptes existants.';
  END IF;
END;
$garde$;
-- Triggers inspectes : create_profile, sync_profiles_to_auth, notification uniquement
-- si invitation_id est renseigne. Relire avant recette ; pas d'email Auth provoque.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('00000000-0000-4000-8000-0000000003a1','lot03-a@example.invalid','{"prenom":"Test A"}'),
 ('00000000-0000-4000-8000-0000000003b2','lot03-b@example.invalid','{"prenom":"Test B"}');
WITH fixture AS (INSERT INTO public.contacts(user_id,prenom,relation,est_favori,note)
 VALUES ('00000000-0000-4000-8000-0000000003a1','Lea','famille',true,'Note privee A') RETURNING id)
SELECT set_config('ephemer.lot03_contact_a1',(SELECT id::text FROM fixture),true);
WITH fixture AS (INSERT INTO public.contacts(user_id,prenom,relation,est_favori)
 VALUES ('00000000-0000-4000-8000-0000000003a1','Malo','ami',false) RETURNING id)
SELECT set_config('ephemer.lot03_contact_a2',(SELECT id::text FROM fixture),true);
WITH fixture AS (INSERT INTO public.contacts(user_id,prenom)
 VALUES ('00000000-0000-4000-8000-0000000003b2','Ines') RETURNING id)
SELECT set_config('ephemer.lot03_contact_b',(SELECT id::text FROM fixture),true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000003a1","role":"authenticated"}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000003a1',true);
INSERT INTO public.listes_personnelles(id,nom) VALUES
 ('00000000-0000-4000-8000-000000000311','Famille'),
 ('00000000-0000-4000-8000-000000000312','Amis proches'),
 ('00000000-0000-4000-8000-000000000313','Liste vide');
INSERT INTO public.appartenances_listes(liste_id,contact_id) VALUES
 ('00000000-0000-4000-8000-000000000311',current_setting('ephemer.lot03_contact_a1')::bigint),
 ('00000000-0000-4000-8000-000000000312',current_setting('ephemer.lot03_contact_a1')::bigint),
 ('00000000-0000-4000-8000-000000000311',current_setting('ephemer.lot03_contact_a2')::bigint);

DO $positifs_et_refus_a$
DECLARE v_count integer;
BEGIN
  IF (SELECT count(*) FROM public.appartenances_listes WHERE contact_id=current_setting('ephemer.lot03_contact_a1')::bigint)<>2 THEN
    RAISE EXCEPTION 'Appartenance multiple absente.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.appartenances_listes WHERE liste_id='00000000-0000-4000-8000-000000000313') THEN
    RAISE EXCEPTION 'La liste vide doit rester vide.';
  END IF;
  UPDATE public.listes_personnelles SET nom='Famille proche'
    WHERE id='00000000-0000-4000-8000-000000000311' AND nom='Famille';
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>1 THEN RAISE EXCEPTION 'Renommage refuse.'; END IF;
  -- Le meme ancien nom ne peut plus ecraser ce changement.
  UPDATE public.listes_personnelles SET nom='Ecrasement concurrent'
    WHERE id='00000000-0000-4000-8000-000000000311' AND nom='Famille';
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>0 THEN RAISE EXCEPTION 'Ancien nom accepte a tort.'; END IF;
  BEGIN
    INSERT INTO public.listes_personnelles(nom) VALUES ('famille proche');
    RAISE EXCEPTION 'Doublon de nom accepte';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.listes_personnelles(nom) VALUES ('  Famille  ');
    RAISE EXCEPTION 'Nom non nettoye accepte';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.listes_personnelles(nom) VALUES ('');
    RAISE EXCEPTION 'Nom vide accepte';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.listes_personnelles(nom) VALUES (repeat('x',81));
    RAISE EXCEPTION 'Nom trop long accepte';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.appartenances_listes(liste_id,contact_id) VALUES
      ('00000000-0000-4000-8000-000000000311',current_setting('ephemer.lot03_contact_a1')::bigint);
    RAISE EXCEPTION 'Doublon de paire accepte';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.appartenances_listes(liste_id,contact_id) VALUES
      ('00000000-0000-4000-8000-000000000311',current_setting('ephemer.lot03_contact_b')::bigint);
    RAISE EXCEPTION 'Contact B rattache a la liste A';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.listes_personnelles SET user_id='00000000-0000-4000-8000-0000000003b2'
      WHERE id='00000000-0000-4000-8000-000000000311';
    RAISE EXCEPTION 'Proprietaire modifie';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.appartenances_listes SET liste_id='00000000-0000-4000-8000-000000000313';
    RAISE EXCEPTION 'Appartenance reaffectee';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.listes_personnelles(user_id,nom)
      VALUES ('00000000-0000-4000-8000-0000000003b2','Injection A');
    RAISE EXCEPTION 'Creation au nom de B acceptee';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$positifs_et_refus_a$;

SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000003b2","role":"authenticated","user_metadata":{"admin":true}}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000003b2',true);
INSERT INTO public.listes_personnelles(id,nom) VALUES ('00000000-0000-4000-8000-000000000321','Famille proche');
INSERT INTO public.appartenances_listes(liste_id,contact_id) VALUES
 ('00000000-0000-4000-8000-000000000321',current_setting('ephemer.lot03_contact_b')::bigint);
DO $refus_b$
DECLARE v_count integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.listes_personnelles WHERE user_id='00000000-0000-4000-8000-0000000003a1')
    OR EXISTS (SELECT 1 FROM public.appartenances_listes WHERE user_id='00000000-0000-4000-8000-0000000003a1') THEN
    RAISE EXCEPTION 'B lit les donnees A.';
  END IF;
  UPDATE public.listes_personnelles SET nom='Attaque B' WHERE id='00000000-0000-4000-8000-000000000311';
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>0 THEN RAISE EXCEPTION 'B renomme une liste A.'; END IF;
  DELETE FROM public.listes_personnelles WHERE id='00000000-0000-4000-8000-000000000311';
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>0 THEN RAISE EXCEPTION 'B supprime une liste A.'; END IF;
  DELETE FROM public.appartenances_listes WHERE user_id='00000000-0000-4000-8000-0000000003a1';
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>0 THEN RAISE EXCEPTION 'B retire les appartenances A.'; END IF;
  BEGIN
    INSERT INTO public.appartenances_listes(liste_id,contact_id) VALUES
      ('00000000-0000-4000-8000-000000000311',current_setting('ephemer.lot03_contact_b')::bigint);
    RAISE EXCEPTION 'Liste A rattachee a B';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$refus_b$;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT set_config('request.jwt.claim.sub','',true);
DO $refus_anonyme$
BEGIN
  BEGIN PERFORM 1 FROM public.listes_personnelles; RAISE EXCEPTION 'Lecture anonyme acceptee';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM 1 FROM public.appartenances_listes; RAISE EXCEPTION 'Lecture anonyme acceptee';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.listes_personnelles(nom) VALUES ('Anonyme'); RAISE EXCEPTION 'Creation anonyme acceptee';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$refus_anonyme$;

RESET ROLE;
-- Les FK doivent aussi refuser les rattachements incoherents avec RLS contournee.
DO $fk_sans_rls$
BEGIN
  BEGIN
    INSERT INTO public.appartenances_listes(user_id,liste_id,contact_id) VALUES
     ('00000000-0000-4000-8000-0000000003a1','00000000-0000-4000-8000-000000000311',current_setting('ephemer.lot03_contact_b')::bigint);
    RAISE EXCEPTION 'FK contact insuffisante';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.appartenances_listes(user_id,liste_id,contact_id) VALUES
     ('00000000-0000-4000-8000-0000000003a1','00000000-0000-4000-8000-000000000321',current_setting('ephemer.lot03_contact_a1')::bigint);
    RAISE EXCEPTION 'FK liste insuffisante';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END;
$fk_sans_rls$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000003a1","role":"authenticated"}',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000003a1',true);
DO $retour_a_et_cascades$
BEGIN
  -- Reprise de la meme identite SQL ; ne prouve pas une reconnexion navigateur.
  IF (SELECT count(*) FROM public.appartenances_listes WHERE contact_id=current_setting('ephemer.lot03_contact_a1')::bigint)<>2 THEN
    RAISE EXCEPTION 'Appartenances perdues apres reprise A.';
  END IF;
  DELETE FROM public.listes_personnelles WHERE id='00000000-0000-4000-8000-000000000311';
  IF NOT EXISTS (SELECT 1 FROM public.contacts WHERE id=current_setting('ephemer.lot03_contact_a1')::bigint
    AND relation='famille' AND est_favori AND note='Note privee A') THEN
    RAISE EXCEPTION 'Suppression de liste a modifie le contact.';
  END IF;
  IF (SELECT count(*) FROM public.appartenances_listes WHERE contact_id=current_setting('ephemer.lot03_contact_a1')::bigint)<>1 THEN
    RAISE EXCEPTION 'Cascade de liste incorrecte.';
  END IF;
  DELETE FROM public.appartenances_listes WHERE liste_id='00000000-0000-4000-8000-000000000312'
    AND contact_id=current_setting('ephemer.lot03_contact_a1')::bigint;
  INSERT INTO public.appartenances_listes(liste_id,contact_id) VALUES
    ('00000000-0000-4000-8000-000000000312',current_setting('ephemer.lot03_contact_a1')::bigint);
  DELETE FROM public.contacts WHERE id=current_setting('ephemer.lot03_contact_a1')::bigint;
  IF EXISTS (SELECT 1 FROM public.appartenances_listes WHERE contact_id=current_setting('ephemer.lot03_contact_a1')::bigint) THEN
    RAISE EXCEPTION 'Cascade de contact incorrecte.';
  END IF;
END;
$retour_a_et_cascades$;
-- Conserver une appartenance A pour exercer reellement sa cascade Auth ensuite.
INSERT INTO public.appartenances_listes(liste_id,contact_id) VALUES
 ('00000000-0000-4000-8000-000000000312',current_setting('ephemer.lot03_contact_a2')::bigint);
-- Plus de 200 lignes pour la future recette de pagination, sans effacer de fixture.
INSERT INTO public.listes_personnelles(nom) SELECT 'Pagination '||lpad(i::text,3,'0') FROM generate_series(1,205) i;
DO $pagination$
BEGIN
  IF (SELECT count(*) FROM public.listes_personnelles WHERE nom LIKE 'Pagination %')<>205 THEN
    RAISE EXCEPTION 'Fixture de pagination incomplete.';
  END IF;
END;
$pagination$;

RESET ROLE;
-- Suppression UNIQUEMENT du compte fictif, dans la transaction rollbackee.
DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-0000000003a1';
DO $cascade_auth$
BEGIN
  IF EXISTS (SELECT 1 FROM public.listes_personnelles WHERE user_id='00000000-0000-4000-8000-0000000003a1')
    OR EXISTS (SELECT 1 FROM public.appartenances_listes WHERE user_id='00000000-0000-4000-8000-0000000003a1') THEN
    RAISE EXCEPTION 'Cascade Auth incomplete.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.listes_personnelles WHERE id='00000000-0000-4000-8000-000000000321')
    OR NOT EXISTS (SELECT 1 FROM public.appartenances_listes WHERE user_id='00000000-0000-4000-8000-0000000003b2') THEN
    RAISE EXCEPTION 'Cascade Auth A a efface une liste B.';
  END IF;
END;
$cascade_auth$;
ROLLBACK;

-- C. Concurrence, rollback et reconnexion reelle : protocoles separes du README.
-- A/B ne prouvent ni HTTP/Data API, ni deux sessions concurrentes, ni export UI.
