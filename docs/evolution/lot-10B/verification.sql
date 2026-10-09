-- RECETTE MUTANTE : COPIE ISOLÉE autorisée uniquement, jamais le principal ephemer-app.
-- Neutraliser triggers/webhooks externes sur la copie AVANT les fixtures (ROLLBACK ne défait pas un envoi).
-- Même session : SET ephemer.lot10b_test_isole='CONFIRME_COPIE_ISOLEE_10B';
-- Claims SQL simulés : aucune preuve de JWT signé ou de concurrence réseau.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_setting('ephemer.lot10b_test_isole',true) IS DISTINCT FROM 'CONFIRME_COPIE_ISOLEE_10B' THEN
    RAISE EXCEPTION 'Copie isolée autorisée requise'; END IF;
  IF EXISTS(SELECT 1 FROM auth.users WHERE id IN
    ('00000000-0000-4000-8000-0000000020a1','00000000-0000-4000-8000-0000000020b2','00000000-0000-4000-8000-0000000020c3'))
    OR EXISTS(SELECT 1 FROM auth.users WHERE email LIKE 'lot10b-%@example.invalid') THEN RAISE EXCEPTION 'Fixtures déjà présentes'; END IF;
END;
$garde$;
-- Les validateurs fermés doivent refuser aussi les objets vides (agrégat NULL).
DO $validateurs$
DECLARE v jsonb:='{"presentation":"","passions":"","plaisirs":"","eviter":"","anniversaire":null,"email":"","telephone":""}';
  p jsonb:='{"presentation":false,"passions":false,"plaisirs":false,"eviter":false,"anniversaire":false,"annee":false,"email":false,"telephone":false,"avatar":false}';
BEGIN
  IF ephemer_social.valeurs_univers_valides(v) IS DISTINCT FROM true
    OR ephemer_social.valeurs_univers_valides('{}') IS DISTINCT FROM false
    OR ephemer_social.valeurs_univers_valides(jsonb_set(v,'{anniversaire}','{}')) IS DISTINCT FROM false
    OR ephemer_social.partage_univers_valide(v,p) IS DISTINCT FROM true
    OR ephemer_social.partage_univers_valide(v,'{}') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Objets vides ou valeurs initiales incorrectement validés'; END IF;
  IF ephemer_social.valeurs_univers_valides(jsonb_set(v,'{presentation}',to_jsonb(repeat('a',1001)))) IS DISTINCT FROM false
    OR ephemer_social.valeurs_univers_valides(jsonb_set(v,'{presentation}',to_jsonb(repeat('a',1000)))) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Limites des textes incorrectes'; END IF;
END;
$validateurs$;
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000020a1','lot10b-a@example.invalid',now(),false,'{}'),
  ('00000000-0000-4000-8000-0000000020b2','lot10b-b@example.invalid',now(),false,'{}'),
  ('00000000-0000-4000-8000-0000000020c3','lot10b-c@example.invalid',now(),false,'{}');
INSERT INTO public.profiles(id,prenom,nom,email) VALUES
  ('00000000-0000-4000-8000-0000000020a1','Fixture A','NOM SECRET','prive-a@example.invalid'),
  ('00000000-0000-4000-8000-0000000020b2','Fixture B','NOM SECRET','prive-b@example.invalid')
  ON CONFLICT(id) DO UPDATE SET prenom=excluded.prenom,nom=excluded.nom,email=excluded.email;
INSERT INTO ephemer_social.relations_etoiles(compte_a,compte_b,etat,origine) VALUES
  ('00000000-0000-4000-8000-0000000020a1','00000000-0000-4000-8000-0000000020b2','active','demande');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000020a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000020a1","role":"authenticated"}',true);
DO $proprietaire$
DECLARE r jsonb; d jsonb; premier jsonb;
BEGIN
  r:=public.lire_mon_univers();
  IF r->>'revision'<>'0' OR r->'valeurs'->>'email'<>'' OR r->>'identite'<>'Fixture A' OR r->'partage'->>'avatar'<>'false' THEN
    RAISE EXCEPTION 'Initialisation privée incorrecte'; END IF;
  BEGIN PERFORM 1 FROM ephemer_social.univers_utilisateurs; RAISE EXCEPTION 'Lecture directe ouverte'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM ephemer_social.identite('00000000-0000-4000-8000-0000000020b2'); RAISE EXCEPTION 'Helper ouvert'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  d:=jsonb_build_object('modeIdentite','pseudonyme','identite','Lune A','valeurs',
    '{"presentation":"<script>texte littéral</script>","passions":"Musique","plaisirs":"Livres","eviter":"SECRET","anniversaire":{"jour":29,"mois":2,"annee":2000},"email":"partage@example.invalid","telephone":"+33 6 00 00 00 00"}'::jsonb,
    'partage','{"presentation":false,"passions":true,"plaisirs":false,"eviter":false,"anniversaire":true,"annee":false,"email":false,"telephone":false,"avatar":true}'::jsonb);
  premier:=public.commander_mon_univers('enregistrer',d,0,'00000000-0000-4000-8000-0000000030a1');
  IF premier->>'revision'<>'1' OR public.commander_mon_univers('enregistrer',d,0,'00000000-0000-4000-8000-0000000030a1')<>premier
    OR public.lire_mon_univers()->>'revision'<>'1' THEN RAISE EXCEPTION 'Reprise non idempotente'; END IF;
  BEGIN PERFORM public.commander_mon_univers('enregistrer',d,0,gen_random_uuid()); RAISE EXCEPTION 'Conflit accepté'; EXCEPTION WHEN SQLSTATE 'P1009' THEN NULL; END;
  BEGIN PERFORM public.commander_mon_univers('masquer','{}',1,'00000000-0000-4000-8000-0000000030a1'); RAISE EXCEPTION 'UUID réutilisé accepté'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.commander_mon_univers('enregistrer',d||'{"user_id":"00000000-0000-4000-8000-0000000020b2"}',1,gen_random_uuid()); RAISE EXCEPTION 'Propriétaire injecté'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.commander_mon_univers('enregistrer',jsonb_set(d,'{valeurs,anniversaire,annee}','2001'),1,gen_random_uuid()); RAISE EXCEPTION '29/02 invalide accepté'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$proprietaire$;
RESET ROLE;
DO $pas_de_creation_lecture$
BEGIN
  IF EXISTS(SELECT 1 FROM ephemer_social.univers_utilisateurs WHERE user_id='00000000-0000-4000-8000-0000000020b2') THEN RAISE EXCEPTION 'Lecture a créé un univers'; END IF;
END;
$pas_de_creation_lecture$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000020b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000020b2","role":"authenticated"}',true);
DO $etoile$
DECLARE r jsonb;
BEGIN
  r:=public.consulter_univers_etoile('00000000-0000-4000-8000-0000000020a1');
  IF r<>'{"identite":"Lune A","champs":{"passions":"Musique","anniversaire":{"jour":29,"mois":2}}}'::jsonb THEN
    RAISE EXCEPTION 'Projection partagée divulgue un champ : %',r; END IF;
  BEGIN PERFORM public.consulter_univers_etoile(NULL); RAISE EXCEPTION 'NULL accepté'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.consulter_univers_etoile('00000000-0000-4000-8000-0000000020b2'); RAISE EXCEPTION 'Route tierce retourne le propriétaire'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$etoile$;
RESET ROLE;
INSERT INTO public.avatars_utilisateurs(user_id,configuration) VALUES
  ('00000000-0000-4000-8000-0000000020a1','{"format":1,"catalogVersion":1,"renderVersion":1,"faceId":"ovale","skinId":"peche","hairId":"court","hairColorId":"chataigne","clothingId":"pull","clothingColorId":"indigo","accessoryId":"aucun"}');
SET LOCAL ROLE authenticated;
DO $avatar_enregistre$
BEGIN
  IF public.consulter_univers_etoile('00000000-0000-4000-8000-0000000020a1')->'champs'->'avatar'->>'hairColorId'<>'chataigne' THEN RAISE EXCEPTION 'Avatar enregistré absent'; END IF;
END;
$avatar_enregistre$;
RESET ROLE;
UPDATE public.avatars_utilisateurs SET configuration=jsonb_set(configuration,'{hairColorId}','"cuivre"'),revision=revision+1 WHERE user_id='00000000-0000-4000-8000-0000000020a1';
SET LOCAL ROLE authenticated;
DO $avatar_actualise$
BEGIN
  IF public.consulter_univers_etoile('00000000-0000-4000-8000-0000000020a1')->'champs'->'avatar'->>'hairColorId'<>'cuivre' THEN RAISE EXCEPTION 'Avatar non actualisé'; END IF;
END;
$avatar_actualise$;
RESET ROLE;
DELETE FROM public.avatars_utilisateurs WHERE user_id='00000000-0000-4000-8000-0000000020a1';
SET LOCAL ROLE authenticated;
DO $avatar_supprime$
BEGIN
  IF public.consulter_univers_etoile('00000000-0000-4000-8000-0000000020a1')->'champs' ? 'avatar' THEN RAISE EXCEPTION 'Copie d’avatar conservée après suppression'; END IF;
END;
$avatar_supprime$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000020c3',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000020c3","role":"authenticated"}',true);
DO $non_ami$
BEGIN
  BEGIN PERFORM public.consulter_univers_etoile('00000000-0000-4000-8000-0000000020a1'); RAISE EXCEPTION 'Non ami autorisé'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$non_ami$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000020a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000020a1","role":"authenticated"}',true);
DO $masquage$
BEGIN
  PERFORM public.commander_mon_univers('masquer','{}',1,gen_random_uuid());
  IF public.lire_mon_univers()->'valeurs'->>'eviter'<>'SECRET' THEN RAISE EXCEPTION 'Masquage a effacé les valeurs'; END IF;
END;
$masquage$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000020b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000020b2","role":"authenticated"}',true);
DO $masque$
BEGIN
  IF public.consulter_univers_etoile('00000000-0000-4000-8000-0000000020a1')->'champs'<>'{}'::jsonb THEN RAISE EXCEPTION 'Partage encore visible'; END IF;
END;
$masque$;
RESET ROLE;
UPDATE ephemer_social.relations_etoiles SET etat='retiree' WHERE compte_a='00000000-0000-4000-8000-0000000020a1' AND compte_b='00000000-0000-4000-8000-0000000020b2';
SET LOCAL ROLE authenticated;
DO $ancien_ami$
BEGIN
  BEGIN PERFORM public.consulter_univers_etoile('00000000-0000-4000-8000-0000000020a1'); RAISE EXCEPTION 'Ancien ami autorisé'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$ancien_ami$;
RESET ROLE;
UPDATE ephemer_social.relations_etoiles SET etat='active' WHERE compte_a='00000000-0000-4000-8000-0000000020a1' AND compte_b='00000000-0000-4000-8000-0000000020b2';
INSERT INTO ephemer_social.blocages_etoiles(user_id,cible_id) VALUES ('00000000-0000-4000-8000-0000000020a1','00000000-0000-4000-8000-0000000020b2');
SET LOCAL ROLE authenticated;
DO $bloque$
BEGIN
  BEGIN PERFORM public.consulter_univers_etoile('00000000-0000-4000-8000-0000000020a1'); RAISE EXCEPTION 'Blocage ignoré'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$bloque$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
  BEGIN PERFORM public.lire_mon_univers(); RAISE EXCEPTION 'Anon propriétaire autorisé'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.consulter_univers_etoile('00000000-0000-4000-8000-0000000020a1'); RAISE EXCEPTION 'Anon étoile autorisé'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$anon$;
RESET ROLE;
DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-0000000020a1';
DO $cascade$
BEGIN
  IF EXISTS(SELECT 1 FROM ephemer_social.univers_utilisateurs WHERE user_id='00000000-0000-4000-8000-0000000020a1')
    OR EXISTS(SELECT 1 FROM ephemer_social.operations_univers WHERE user_id='00000000-0000-4000-8000-0000000020a1') THEN RAISE EXCEPTION 'Cascade univers incomplète'; END IF;
END;
$cascade$;
SELECT 'lot10b_recette_sql_simulee_ok' AS resultat;
ROLLBACK;
