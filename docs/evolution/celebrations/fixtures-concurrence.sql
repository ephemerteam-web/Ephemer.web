-- COPIE ISOLEE, webhooks/services externes désactivés. Préparation humaine des deux sessions.
-- Confirmer la copie dans la même session : SET ephemer.recette_celebrations='copie_autorisee';
BEGIN;
DO $garde$ BEGIN
  IF current_setting('ephemer.recette_celebrations',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'Copie autorisee requise'; END IF;
  IF EXISTS(SELECT 1 FROM auth.users WHERE id IN ('51000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000003')) THEN RAISE EXCEPTION 'Fixtures deja presentes : restaurer la copie'; END IF;
END $garde$;
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous,aud,role) VALUES
 ('51000000-0000-4000-8000-000000000001','concurrence-a@example.invalid',now(),false,'authenticated','authenticated'),
 ('51000000-0000-4000-8000-000000000002','concurrence-b@example.invalid',now(),false,'authenticated','authenticated'),
 ('51000000-0000-4000-8000-000000000003','concurrence-c@example.invalid',now(),false,'authenticated','authenticated');
INSERT INTO ephemer_social.relations_etoiles(compte_a,compte_b,etat,origine) VALUES
 ('51000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000002','active','demande'),
 ('51000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000003','active','demande');
SET LOCAL ROLE authenticated;
DO $fixtures$ DECLARE c uuid; inv uuid; n integer; BEGIN
 FOR n IN 1..5 LOOP
  c:=('52000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  inv:=('54000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  PERFORM public.commander_celebrations('creer',jsonb_build_object('id',c,'titre','Course fictive '||n,'date',NULL,'heure',NULL,'lieu',NULL,'mode','partage','surprise',false,'destinataire',NULL),gen_random_uuid());
  PERFORM public.commander_celebrations('inviter',jsonb_build_object('id',c,'invitation',inv,'cible','51000000-0000-4000-8000-000000000002'),gen_random_uuid());
  IF n<>1 THEN
   PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
   PERFORM public.commander_celebrations('accepter',jsonb_build_object('id',c,'invitation',inv),gen_random_uuid());
  END IF;
 END LOOP;
 PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 PERFORM public.commander_celebrations('inviter','{"id":"52000000-0000-4000-8000-000000000004","invitation":"54000000-0000-4000-8000-000000000006","cible":"51000000-0000-4000-8000-000000000003"}',gen_random_uuid());
 PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
 PERFORM public.commander_celebrations('accepter','{"id":"52000000-0000-4000-8000-000000000004","invitation":"54000000-0000-4000-8000-000000000006"}',gen_random_uuid());
 PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 PERFORM public.commander_celebrations('proposer_transfert','{"id":"52000000-0000-4000-8000-000000000004","transfert":"55000000-0000-4000-8000-000000000001","cible":"51000000-0000-4000-8000-000000000003"}',gen_random_uuid());
END $fixtures$;
RESET ROLE;
COMMIT;
