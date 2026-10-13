-- Session A sur COPIE, fixtures-concurrence.sql préalablement validé/appliqué humainement.
-- Même session : SET ephemer.recette_celebrations='copie_autorisee'; SET ephemer.course='acceptation';
-- Courses : acceptation, tache, suppression, transfert, blocage. Blocage en dernier.
BEGIN;
DO $garde$ BEGIN IF current_setting('ephemer.recette_celebrations',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'Copie autorisee requise'; END IF; END $garde$;
SET LOCAL ROLE authenticated;
DO $course$ DECLARE v text:=current_setting('ephemer.course',true); r jsonb; m uuid; BEGIN
 IF v='acceptation' THEN
  PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
  PERFORM public.commander_celebrations('accepter','{"id":"52000000-0000-4000-8000-000000000001","invitation":"54000000-0000-4000-8000-000000000001"}','56000000-0000-4000-8000-000000000001');
 ELSIF v='tache' THEN
  PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  r:=public.lire_celebration('52000000-0000-4000-8000-000000000002');
  SELECT (x->>'id')::uuid INTO m FROM jsonb_array_elements(r->'participants') x WHERE x->>'compte'='51000000-0000-4000-8000-000000000001';
  PERFORM public.commander_celebrations('ajouter_tache',jsonb_build_object('id','52000000-0000-4000-8000-000000000002','tache','57000000-0000-4000-8000-000000000001','titre','Tache concurrente','type','libre','responsable',m,'echeance',NULL),'56000000-0000-4000-8000-000000000002');
 ELSIF v='suppression' THEN
  PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  PERFORM public.commander_celebrations('supprimer','{"id":"52000000-0000-4000-8000-000000000003","revision":1,"confirmer":true}','56000000-0000-4000-8000-000000000003');
 ELSIF v='transfert' THEN
  PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
  PERFORM public.commander_celebrations('accepter_transfert','{"id":"52000000-0000-4000-8000-000000000004","transfert":"55000000-0000-4000-8000-000000000001"}','56000000-0000-4000-8000-000000000004');
 ELSIF v='blocage' THEN
  PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  PERFORM public.commander_etoiles('bloquer','{"etoileId":"51000000-0000-4000-8000-000000000002"}','56000000-0000-4000-8000-000000000005');
 ELSE RAISE EXCEPTION 'Choisir une course documentee'; END IF;
END $course$;
-- Pendant cette fenêtre, lancer B dans une AUTRE connexion PostgreSQL.
SELECT pg_sleep(8);
COMMIT;
