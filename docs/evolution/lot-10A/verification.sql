-- RECETTE MUTANTE : copie isolee autorisee UNIQUEMENT, jamais ephemer-app principal.
-- Inspecter/neutraliser triggers et webhooks externes sur cette copie avant execution.
-- Meme session : SET ephemer.lot10a_test_isole='CONFIRME_COPIE_ISOLEE_10A';
-- Roles/claims SQL simules : ceci ne prouve ni un JWT signe ni la concurrence REST.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_setting('ephemer.lot10a_test_isole',true) IS DISTINCT FROM 'CONFIRME_COPIE_ISOLEE_10A' THEN
    RAISE EXCEPTION 'Recette desactivee : copie isolee autorisee requise'; END IF;
  IF to_regnamespace('ephemer_social') IS NULL THEN RAISE EXCEPTION '10A absent'; END IF;
  IF EXISTS(SELECT 1 FROM auth.users WHERE id IN
    ('00000000-0000-4000-8000-0000000010a1','00000000-0000-4000-8000-0000000010b2',
     '00000000-0000-4000-8000-0000000010c3','00000000-0000-4000-8000-0000000010d4','00000000-0000-4000-8000-0000000010e5'))
    OR EXISTS(SELECT 1 FROM auth.users WHERE email LIKE 'lot10a-%@example.invalid')
    OR EXISTS(SELECT 1 FROM public.contacts WHERE id BETWEEN 900001001 AND 900001010) THEN
    RAISE EXCEPTION 'Fixtures deja presentes : arret'; END IF;
END;
$garde$;
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data) VALUES
 ('00000000-0000-4000-8000-0000000010a1','lot10a-a@example.invalid',now(),false,'{"prenom":"Fixture A"}'),
 ('00000000-0000-4000-8000-0000000010b2','lot10a-b@example.invalid',now(),false,'{"prenom":"Fixture B"}'),
 ('00000000-0000-4000-8000-0000000010c3','lot10a-c@example.invalid',now(),false,'{"prenom":"Fixture C"}'),
 ('00000000-0000-4000-8000-0000000010e5','lot10a-u@example.invalid',null,false,'{"prenom":"Non verifie"}');
INSERT INTO public.profiles(id,prenom,nom,email) VALUES
 ('00000000-0000-4000-8000-0000000010a1','Fixture A','NOM PRIVE','profil-libre@example.invalid'),
 ('00000000-0000-4000-8000-0000000010b2','Fixture B','NOM PRIVE','profil-libre-b@example.invalid'),
 ('00000000-0000-4000-8000-0000000010c3','Fixture C','NOM PRIVE','profil-libre-c@example.invalid')
 ON CONFLICT(id) DO UPDATE SET prenom=excluded.prenom,nom=excluded.nom,email=excluded.email;
INSERT INTO public.contacts(id,user_id,prenom,email,note) OVERRIDING SYSTEM VALUE VALUES
 (900001001,'00000000-0000-4000-8000-0000000010a1','B',' LOT10A-B@EXAMPLE.INVALID ','NOTE PRIVEE'),
 (900001002,'00000000-0000-4000-8000-0000000010a1','B doublon','lot10a-b@example.invalid','NOTE PRIVEE'),
 (900001003,'00000000-0000-4000-8000-0000000010a1','C','lot10a-c@example.invalid','NOTE PRIVEE'),
 (900001004,'00000000-0000-4000-8000-0000000010a1','U','lot10a-u@example.invalid','NOTE PRIVEE'),
 (900001005,'00000000-0000-4000-8000-0000000010e5','A','lot10a-a@example.invalid','NOTE PRIVEE');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000010a1","role":"authenticated"}',true);
DO $unilaterale$
DECLARE result jsonb;
BEGIN
  result:=public.reconnaitre_etoiles(NULL,100);
  IF (result->>'nouvelles')::integer<>0 OR jsonb_array_length(public.lire_etoiles('actives')->'items')<>0 THEN
    RAISE EXCEPTION 'Correspondance unilaterale ou non verifiee acceptee'; END IF;
  BEGIN PERFORM public.lire_etoiles(NULL); RAISE EXCEPTION 'Vue NULL acceptee'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.lire_etoiles('actives',NULL,NULL); RAISE EXCEPTION 'Limite NULL acceptee'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM 1 FROM ephemer_social.relations_etoiles; RAISE EXCEPTION 'Table privee lisible'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM ephemer_social.identite('00000000-0000-4000-8000-0000000010b2'); RAISE EXCEPTION 'Helper identite ouvert'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.commander_etoiles('creer_lien','{"user_id":"00000000-0000-4000-8000-0000000010b2"}',gen_random_uuid()); RAISE EXCEPTION 'Proprietaire injecte'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$unilaterale$;
RESET ROLE;
INSERT INTO public.contacts(id,user_id,prenom,email,note) OVERRIDING SYSTEM VALUE VALUES
 (900001006,'00000000-0000-4000-8000-0000000010b2','A','lot10a-a@example.invalid','NOTE PRIVEE');
SET LOCAL ROLE authenticated;
DO $reciproque$
DECLARE result jsonb; encore jsonb; items jsonb;
BEGIN
  result:=public.reconnaitre_etoiles(NULL,1);
  IF (result->>'nouvelles')::integer<>1 OR result->>'apres'<>'900001001' THEN RAISE EXCEPTION 'Reconnaissance/pagination incorrecte'; END IF;
  encore:=public.reconnaitre_etoiles((result->>'apres')::bigint,100);
  IF (encore->>'nouvelles')::integer<>0 THEN RAISE EXCEPTION 'Doublon de relation'; END IF;
  items:=public.lire_etoiles('actives')->'items';
  IF jsonb_array_length(items)<>1 OR items->0->>'identite'<>'Fixture B'
    OR (items->0 ?| ARRAY['email','nom','note','date_naissance','telephone_numero']) THEN RAISE EXCEPTION 'Projection minimale incorrecte'; END IF;
  IF jsonb_array_length(public.lire_associations_etoiles()->'items')<>2 THEN RAISE EXCEPTION 'Doublons de fiches non associes'; END IF;
END;
$reciproque$;
RESET ROLE;
UPDATE auth.users SET email='lot10a-b-new@example.invalid' WHERE id='00000000-0000-4000-8000-0000000010b2';
DELETE FROM public.contacts WHERE id IN (900001001,900001002);
SET LOCAL ROLE authenticated;
DO $persistance$
BEGIN
  IF jsonb_array_length(public.lire_etoiles('actives')->'items')<>1
    OR jsonb_array_length(public.lire_associations_etoiles()->'items')<>0 THEN
    RAISE EXCEPTION 'Email ou suppression de fiche a casse l amitie'; END IF;
  PERFORM public.commander_etoiles('bloquer','{"etoileId":"00000000-0000-4000-8000-0000000010b2"}',gen_random_uuid());
  PERFORM public.commander_etoiles('debloquer','{"etoileId":"00000000-0000-4000-8000-0000000010b2"}',gen_random_uuid());
END;
$persistance$;
RESET ROLE;
INSERT INTO public.contacts(id,user_id,prenom,email,note) OVERRIDING SYSTEM VALUE VALUES
 (900001001,'00000000-0000-4000-8000-0000000010a1','B','lot10a-b-new@example.invalid','NOTE PRIVEE');
SET LOCAL ROLE authenticated;
DO $non_restoration$
BEGIN
  PERFORM public.reconnaitre_etoiles(NULL,100);
  IF jsonb_array_length(public.lire_etoiles('actives')->'items')<>0 THEN RAISE EXCEPTION 'Retrait restaure automatiquement'; END IF;
END;
$non_restoration$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000010b2","role":"authenticated"}',true);
DO $redemande$
BEGIN
  PERFORM public.commander_etoiles('demander','{"email":"lot10a-a@example.invalid"}',gen_random_uuid());
END;
$redemande$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000010a1","role":"authenticated"}',true);
DO $accepter$
DECLARE d jsonb; r jsonb; encore jsonb; op uuid:=gen_random_uuid();
BEGIN
  d:=(public.lire_etoiles('recues')->'items')->0;
  r:=public.commander_etoiles('accepter',jsonb_build_object('demandeId',d->>'id'),op);
  encore:=public.commander_etoiles('accepter',jsonb_build_object('demandeId',d->>'id'),op);
  IF r<>encore OR jsonb_array_length(public.lire_etoiles('actives')->'items')<>1 THEN RAISE EXCEPTION 'Acceptation/retry incorrect'; END IF;
  BEGIN PERFORM public.commander_etoiles('refuser',jsonb_build_object('demandeId',d->>'id'),op); RAISE EXCEPTION 'UUID reutilise'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$accepter$;
DO $neutre$
DECLARE connu jsonb; inconnu jsonb;
BEGIN
  connu:=public.commander_etoiles('demander','{"email":"lot10a-c@example.invalid"}',gen_random_uuid());
  inconnu:=public.commander_etoiles('demander','{"email":"lot10a-d@example.invalid"}',gen_random_uuid());
  IF connu<>inconnu OR connu<>'{"ok":true,"message":"Demande enregistree."}'::jsonb THEN RAISE EXCEPTION 'Recherche non neutre'; END IF;
END;
$neutre$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010c3',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000010c3","role":"authenticated"}',true);
DO $croisee$
BEGIN
  PERFORM public.commander_etoiles('demander','{"email":"lot10a-a@example.invalid"}',gen_random_uuid());
  PERFORM set_config('ephemer.lot10a_demande_croisee',(public.lire_etoiles('recues')->'items')->0->>'id',true);
END;
$croisee$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000010a1","role":"authenticated"}',true);
DO $croisee_acceptee$
DECLARE d jsonb; op uuid:=gen_random_uuid(); resultat jsonb;
BEGIN
  d:=(public.lire_etoiles('recues')->'items')->0;
  resultat:=public.commander_etoiles('accepter',jsonb_build_object('demandeId',d->>'id'),op);
  IF jsonb_array_length(public.lire_etoiles('actives')->'items')<>2 THEN RAISE EXCEPTION 'Demandes croisees incorrectes'; END IF;
  PERFORM public.commander_etoiles('retirer','{"etoileId":"00000000-0000-4000-8000-0000000010c3"}',gen_random_uuid());
  PERFORM public.commander_etoiles('accepter',jsonb_build_object('demandeId',d->>'id'),op);
  IF jsonb_array_length(public.lire_etoiles('actives')->'items')<>1 THEN RAISE EXCEPTION 'Replay restaure un retrait'; END IF;
  IF EXISTS(SELECT 1 FROM public.notifications_etoiles WHERE user_id<>auth.uid()) THEN RAISE EXCEPTION 'Notifications d autrui'; END IF;
  UPDATE public.notifications_etoiles SET lue=true WHERE user_id<>auth.uid();
  IF FOUND THEN RAISE EXCEPTION 'Notification d autrui modifiee'; END IF;
  BEGIN UPDATE public.notifications_etoiles SET user_id='00000000-0000-4000-8000-0000000010b2'; RAISE EXCEPTION 'Reaffectation notification'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.notifications_etoiles(user_id,type) VALUES(auth.uid(),'demande_etoile'); RAISE EXCEPTION 'Notification inventee'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$croisee_acceptee$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010c3',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000010c3","role":"authenticated"}',true);
DO $liens$
DECLARE r jsonb; retry jsonb; op uuid:=gen_random_uuid();
BEGIN
  BEGIN PERFORM public.commander_etoiles('accepter',jsonb_build_object('demandeId',current_setting('ephemer.lot10a_demande_croisee')),gen_random_uuid()); RAISE EXCEPTION 'Demande croisee annulee acceptee'; EXCEPTION WHEN SQLSTATE 'P1009' THEN NULL; END;
  r:=public.commander_etoiles('creer_lien','{}',op);
  retry:=public.commander_etoiles('creer_lien','{}',op);
  IF NOT (r ? 'token') OR retry ? 'token' OR r->>'lienId'<>retry->>'lienId' THEN RAISE EXCEPTION 'Lien/secret/retry incorrect'; END IF;
  PERFORM set_config('ephemer.lot10a_token',r->>'token',true);
  PERFORM set_config('ephemer.lot10a_lien',r->>'lienId',true);
END;
$liens$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000010a1","role":"authenticated"}',true);
DO $demande_lien$
BEGIN
  PERFORM public.commander_etoiles('demander_lien',jsonb_build_object('token',current_setting('ephemer.lot10a_token')),gen_random_uuid());
  IF jsonb_array_length(public.lire_etoiles('actives')->'items')<>1 THEN RAISE EXCEPTION 'Lien cree une amitie sans acceptation'; END IF;
END;
$demande_lien$;
RESET ROLE;
UPDATE ephemer_social.liens_etoiles SET created_at=now()-interval '8 days',expires_at=now()-interval '1 day'
  WHERE id=current_setting('ephemer.lot10a_lien')::uuid;
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data) VALUES
 ('00000000-0000-4000-8000-0000000010d4','lot10a-d@example.invalid',now(),false,'{"prenom":"Inscription tardive"}');
SET LOCAL ROLE authenticated;
DO $expire$
BEGIN
  BEGIN PERFORM public.commander_etoiles('demander_lien',jsonb_build_object('token',current_setting('ephemer.lot10a_token')),gen_random_uuid()); RAISE EXCEPTION 'Lien expire accepte'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$expire$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010d4',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000010d4","role":"authenticated"}',true);
DO $tardive$
DECLARE d jsonb;
BEGIN
  PERFORM public.reconnaitre_etoiles(NULL,100);
  d:=(public.lire_etoiles('recues')->'items')->0;
  IF d IS NULL OR d='null'::jsonb THEN RAISE EXCEPTION 'Demande non recue apres inscription'; END IF;
  PERFORM public.commander_etoiles('accepter',jsonb_build_object('demandeId',d->>'id'),gen_random_uuid());
END;
$tardive$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010e5',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000010e5","role":"authenticated"}',true);
DO $non_verifie$
BEGIN
  BEGIN PERFORM public.reconnaitre_etoiles(NULL,100); RAISE EXCEPTION 'Compte non verifie admis'; EXCEPTION WHEN invalid_authorization_specification THEN NULL; END;
END;
$non_verifie$;
RESET ROLE;
INSERT INTO ephemer_social.quotas_demandes(user_id,jour,total) VALUES
 ('00000000-0000-4000-8000-0000000010a1',(now() AT TIME ZONE 'Europe/Paris')::date,0)
 ON CONFLICT(user_id,jour) DO UPDATE SET total=0;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000010a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000010a1","role":"authenticated"}',true);
DO $quota_export$
DECLARE i integer; op uuid:=gen_random_uuid(); r jsonb; retry jsonb; donnees jsonb;
BEGIN
  FOR i IN 1..20 LOOP
    donnees:=jsonb_build_object('email','lot10a-inconnu-'||i||'@example.invalid');
    r:=public.commander_etoiles('demander',donnees,CASE WHEN i=1 THEN op ELSE gen_random_uuid() END);
  END LOOP;
  retry:=public.commander_etoiles('demander','{"email":"lot10a-inconnu-1@example.invalid"}',op);
  IF r<>retry THEN RAISE EXCEPTION 'Retry quota non neutre'; END IF;
  PERFORM public.commander_etoiles('demander','{"email":"lot10a-inconnu-1@example.invalid"}',gen_random_uuid());
  BEGIN PERFORM public.commander_etoiles('demander','{"email":"lot10a-inconnu-21@example.invalid"}',gen_random_uuid()); RAISE EXCEPTION 'Quota depasse'; EXCEPTION WHEN SQLSTATE 'P1020' THEN NULL; END;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.lire_etoiles('envoyees')->'items') item
    WHERE item ?| ARRAY['destinataire_id','identite','neutralisee']) THEN RAISE EXCEPTION 'Enumeration du destinataire'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.exporter_etoiles('liens')->'items') item
    WHERE item ?| ARRAY['token','empreinte']) THEN RAISE EXCEPTION 'Export de secrets'; END IF;
END;
$quota_export$;
RESET ROLE;
DO $cascades$
BEGIN
  DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-0000000010d4';
  IF EXISTS(SELECT 1 FROM ephemer_social.relations_etoiles WHERE compte_a='00000000-0000-4000-8000-0000000010d4' OR compte_b='00000000-0000-4000-8000-0000000010d4')
    OR EXISTS(SELECT 1 FROM ephemer_social.demandes_etoiles WHERE auteur_id='00000000-0000-4000-8000-0000000010d4' OR destinataire_id='00000000-0000-4000-8000-0000000010d4')
    OR EXISTS(SELECT 1 FROM ephemer_social.operations_etoiles WHERE user_id='00000000-0000-4000-8000-0000000010d4')
    OR EXISTS(SELECT 1 FROM public.notifications_etoiles WHERE user_id='00000000-0000-4000-8000-0000000010d4') THEN RAISE EXCEPTION 'Cascade incomplete'; END IF;
  IF EXISTS(SELECT 1 FROM public.contacts WHERE id BETWEEN 900001001 AND 900001010 AND note IS DISTINCT FROM 'NOTE PRIVEE') THEN RAISE EXCEPTION 'Note privee ecrasee'; END IF;
END;
$cascades$;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
DO $anon$
BEGIN
  BEGIN PERFORM public.reconnaitre_etoiles(NULL,100); RAISE EXCEPTION 'Anon reconnu'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.lire_etoiles('actives'); RAISE EXCEPTION 'Anon lit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM 1 FROM public.notifications_etoiles; RAISE EXCEPTION 'Anon lit notifications'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$anon$;
RESET ROLE;
SELECT 'lot10a_recette_sql_reussie_simulation_roles' AS resultat;
ROLLBACK;
