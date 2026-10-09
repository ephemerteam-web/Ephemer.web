-- RECETTE MUTANTE : uniquement sur COPIE ISOLÉE autorisée, jamais sur ephemer-app.
-- Neutraliser triggers/webhooks externes avant les fixtures : ROLLBACK ne défait pas un envoi.
-- Même session : SET ephemer.lot10c_test_isole='CONFIRME_COPIE_ISOLEE_10C';
-- Claims simulés, aucune preuve de JWT signé ou de concurrence réseau.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_user<>'postgres' OR current_setting('ephemer.lot10c_test_isole',true) IS DISTINCT FROM 'CONFIRME_COPIE_ISOLEE_10C' THEN
    RAISE EXCEPTION 'Copie isolee autorisee requise'; END IF;
  IF EXISTS(SELECT 1 FROM auth.users WHERE id IN ('00000000-0000-4000-8000-0000000040a1','00000000-0000-4000-8000-0000000040b2','00000000-0000-4000-8000-0000000040c3'))
    OR EXISTS(SELECT 1 FROM auth.users WHERE email LIKE 'lot10c-%@example.invalid') THEN RAISE EXCEPTION 'Fixtures presentes'; END IF;
END;
$garde$;
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000040a1','lot10c-a@example.invalid',now(),false,'{}'),
  ('00000000-0000-4000-8000-0000000040b2','lot10c-b@example.invalid',now(),false,'{}'),
  ('00000000-0000-4000-8000-0000000040c3','lot10c-c@example.invalid',now(),false,'{}');
INSERT INTO public.profiles(id,prenom,nom,email) VALUES
  ('00000000-0000-4000-8000-0000000040a1','Fixture A','Secret privé','lot10c-a@example.invalid'),
  ('00000000-0000-4000-8000-0000000040b2','Fixture B','Secret privé','lot10c-b@example.invalid');
INSERT INTO ephemer_social.relations_etoiles(compte_a,compte_b,etat,origine) VALUES
  ('00000000-0000-4000-8000-0000000040a1','00000000-0000-4000-8000-0000000040b2','active','demande');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000040a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000040a1","role":"authenticated"}',true);
DO $proprietaire$
DECLARE r jsonb; d jsonb; op uuid:=gen_random_uuid(); premier jsonb;
BEGIN
  r:=public.lire_mon_univers();
  IF r->'iaCadeaux'<>'{"identite":false,"presentation":false,"passions":false,"plaisirs":false,"eviter":false}'::jsonb THEN
    RAISE EXCEPTION 'Permissions initiales ouvertes'; END IF;
  BEGIN PERFORM 1 FROM ephemer_social.univers_utilisateurs; RAISE EXCEPTION 'Lecture directe ouverte'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.incrementer_quota_ia(NULL); RAISE EXCEPTION 'Quota accessible'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  d:=r-'revision';
  d:=jsonb_set(d,'{valeurs,passions}','"Musique"');
  d:=jsonb_set(d,'{valeurs,presentation}','"<script>texte littéral</script>"');
  d:=jsonb_set(d,'{valeurs,email}','"secret@example.invalid"');
  d:=jsonb_set(d,'{valeurs,anniversaire}','{"jour":29,"mois":2,"annee":2000}');
  d:=jsonb_set(d,'{partage,passions}','true');
  d:=jsonb_set(d,'{partage,email}','true');
  d:=jsonb_set(d,'{partage,anniversaire}','true');
  d:=jsonb_set(d,'{partage,annee}','true');
  d:=jsonb_set(d,'{iaCadeaux,passions}','true');
  premier:=public.commander_mon_univers('enregistrer',d,0,op);
  IF public.commander_mon_univers('enregistrer',d,0,op)<>premier OR public.lire_mon_univers()->>'revision'<>'1' THEN
    RAISE EXCEPTION 'Reprise non idempotente'; END IF;
  BEGIN PERFORM public.commander_mon_univers('enregistrer',d-'iaCadeaux',1,gen_random_uuid()); RAISE EXCEPTION 'Ancien contrat accepte'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.commander_mon_univers('enregistrer',jsonb_set(d,'{iaCadeaux,presentation}','true'),1,gen_random_uuid()); RAISE EXCEPTION 'Champ masque autorise'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.commander_mon_univers('enregistrer',jsonb_set(d,'{iaCadeaux,email}','true'),1,gen_random_uuid()); RAISE EXCEPTION 'Coordonnee autorisee'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.commander_mon_univers('enregistrer',d,0,gen_random_uuid()); RAISE EXCEPTION 'Conflit ignore'; EXCEPTION WHEN SQLSTATE 'P1009' THEN NULL; END;
END;
$proprietaire$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000040b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000040b2","role":"authenticated"}',true);
DO $etoile_sans_fiche$
DECLARE r jsonb;
BEGIN
  r:=public.consulter_univers_cadeaux('00000000-0000-4000-8000-0000000040a1');
  IF r<>'{"revision":1,"revisionRelation":1,"champs":{"passions":"Musique"}}'::jsonb THEN RAISE EXCEPTION 'Champ interdit divulgue'; END IF;
  IF public.resoudre_univers_cadeaux('00000000-0000-4000-8000-0000000040a1',ARRAY['passions'],1,1,NULL)<>r THEN RAISE EXCEPTION 'Resolution differente'; END IF;
  BEGIN PERFORM public.resoudre_univers_cadeaux('00000000-0000-4000-8000-0000000040a1',ARRAY['identite'],1,1,NULL); RAISE EXCEPTION 'Identite sans accord'; EXCEPTION WHEN SQLSTATE 'P1009' THEN NULL; END;
  BEGIN PERFORM public.resoudre_univers_cadeaux('00000000-0000-4000-8000-0000000040a1',ARRAY['passions','passions'],1,1,NULL); RAISE EXCEPTION 'Doublon accepte'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.resoudre_univers_cadeaux('00000000-0000-4000-8000-0000000040a1',ARRAY['email'],1,1,NULL); RAISE EXCEPTION 'Coordonnee selectionnee'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.resoudre_univers_cadeaux('00000000-0000-4000-8000-0000000040a1',NULL,1,1,NULL); RAISE EXCEPTION 'Selection NULL'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.resoudre_univers_cadeaux('00000000-0000-4000-8000-0000000040a1',ARRAY['passions'],1,1,9223372036854775807); RAISE EXCEPTION 'Association inventee'; EXCEPTION WHEN SQLSTATE 'P1009' THEN NULL; END;
END;
$etoile_sans_fiche$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000040a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000040a1","role":"authenticated"}',true);
DO $modification_persistante$
DECLARE d jsonb:=public.lire_mon_univers()-'revision';
BEGIN
  PERFORM public.commander_mon_univers('enregistrer',jsonb_set(d,'{valeurs,passions}','"Livres"'),1,gen_random_uuid());
  IF public.lire_mon_univers()->'iaCadeaux'->>'passions'<>'true' THEN RAISE EXCEPTION 'Accord retire par changement texte'; END IF;
END;
$modification_persistante$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000040b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000040b2","role":"authenticated"}',true);
DO $ancienne_selection$
BEGIN
  BEGIN PERFORM public.resoudre_univers_cadeaux('00000000-0000-4000-8000-0000000040a1',ARRAY['passions'],1,1,NULL); RAISE EXCEPTION 'Ancienne selection acceptee'; EXCEPTION WHEN SQLSTATE 'P1009' THEN NULL; END;
  IF public.resoudre_univers_cadeaux('00000000-0000-4000-8000-0000000040a1',ARRAY['passions'],2,1,NULL)->'champs'->>'passions'<>'Livres' THEN RAISE EXCEPTION 'Texte non actualise'; END IF;
END;
$ancienne_selection$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000040a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000040a1","role":"authenticated"}',true);
DO $masquage$
BEGIN
  PERFORM public.commander_mon_univers('masquer','{}',2,gen_random_uuid());
  IF public.lire_mon_univers()->'iaCadeaux'->>'passions'<>'false' OR public.lire_mon_univers()->'valeurs'->>'passions'<>'Livres' THEN
    RAISE EXCEPTION 'Masquage conserve accord ou efface valeur'; END IF;
END;
$masquage$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000040b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000040b2","role":"authenticated"}',true);
DO $aucun_champ$
BEGIN
  IF public.consulter_univers_cadeaux('00000000-0000-4000-8000-0000000040a1')->'champs'<>'{}'::jsonb THEN RAISE EXCEPTION 'Autorisation encore visible'; END IF;
END;
$aucun_champ$;
RESET ROLE;
UPDATE ephemer_social.relations_etoiles SET etat='retiree',revision=revision+1 WHERE compte_a='00000000-0000-4000-8000-0000000040a1';
SET LOCAL ROLE authenticated;
DO $ancien_ami$
BEGIN
  BEGIN PERFORM public.consulter_univers_cadeaux('00000000-0000-4000-8000-0000000040a1'); RAISE EXCEPTION 'Ancien ami autorise'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$ancien_ami$;
RESET ROLE;
UPDATE ephemer_social.relations_etoiles SET etat='active',revision=revision+1 WHERE compte_a='00000000-0000-4000-8000-0000000040a1';
SET LOCAL ROLE authenticated;
DO $relation_renouvelee$
BEGIN
  BEGIN PERFORM public.resoudre_univers_cadeaux('00000000-0000-4000-8000-0000000040a1',ARRAY['passions'],3,1,NULL); RAISE EXCEPTION 'Ancienne relation acceptee'; EXCEPTION WHEN SQLSTATE 'P1009' THEN NULL; END;
END;
$relation_renouvelee$;
RESET ROLE;
INSERT INTO ephemer_social.blocages_etoiles(user_id,cible_id) VALUES ('00000000-0000-4000-8000-0000000040a1','00000000-0000-4000-8000-0000000040b2');
SET LOCAL ROLE authenticated;
DO $bloque$
BEGIN
  BEGIN PERFORM public.consulter_univers_cadeaux('00000000-0000-4000-8000-0000000040a1'); RAISE EXCEPTION 'Blocage ignore'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$bloque$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000040c3',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000040c3","role":"authenticated"}',true);
DO $non_ami$
BEGIN
  BEGIN PERFORM public.consulter_univers_cadeaux('00000000-0000-4000-8000-0000000040a1'); RAISE EXCEPTION 'Non ami autorise'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$non_ami$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
  BEGIN PERFORM public.consulter_univers_cadeaux('00000000-0000-4000-8000-0000000040a1'); RAISE EXCEPTION 'Anon autorise'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.incrementer_quota_ia(NULL); RAISE EXCEPTION 'Quota accessible anon'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$anon$;
RESET ROLE;
DELETE FROM auth.users WHERE id IN ('00000000-0000-4000-8000-0000000040a1','00000000-0000-4000-8000-0000000040b2','00000000-0000-4000-8000-0000000040c3');
DO $cascade$
BEGIN
  IF EXISTS(SELECT 1 FROM ephemer_social.univers_utilisateurs WHERE user_id='00000000-0000-4000-8000-0000000040a1')
    OR EXISTS(SELECT 1 FROM ephemer_social.operations_univers WHERE user_id='00000000-0000-4000-8000-0000000040a1') THEN RAISE EXCEPTION 'Cascade incomplete'; END IF;
END;
$cascade$;
SELECT 'lot10c_recette_sql_simulee_ok' AS resultat;
ROLLBACK;
