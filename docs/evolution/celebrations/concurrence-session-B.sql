-- Session B sur COPIE. Même marqueur et course que A. Deux vraies connexions exigées.
BEGIN;
SET LOCAL lock_timeout='20s';
DO $garde$ BEGIN IF current_setting('ephemer.recette_celebrations',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'Copie autorisee requise'; END IF; END $garde$;
SET LOCAL ROLE authenticated;
DO $course$ DECLARE v text:=current_setting('ephemer.course',true); r jsonb; m uuid; BEGIN
 IF v='acceptation' THEN
  PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  BEGIN PERFORM public.commander_celebrations('revoquer','{"id":"52000000-0000-4000-8000-000000000001","invitation":"54000000-0000-4000-8000-000000000001"}','58000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'Revocation apres acceptation devrait refuser'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 ELSIF v='tache' THEN
  PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  r:=public.lire_celebration('52000000-0000-4000-8000-000000000002');
  SELECT (x->>'id')::uuid INTO m FROM jsonb_array_elements(r->'participants') x WHERE x->>'compte'='51000000-0000-4000-8000-000000000001';
  PERFORM public.commander_celebrations('ajouter_tache',jsonb_build_object('id','52000000-0000-4000-8000-000000000002','tache','57000000-0000-4000-8000-000000000001','titre','Tache concurrente','type','libre','responsable',m,'echeance',NULL),'56000000-0000-4000-8000-000000000002');
 ELSIF v='suppression' THEN
  PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  PERFORM public.commander_celebrations('supprimer','{"id":"52000000-0000-4000-8000-000000000003","revision":1,"confirmer":true}','56000000-0000-4000-8000-000000000003');
 ELSIF v='transfert' THEN
  PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  PERFORM public.commander_celebrations('quitter','{"id":"52000000-0000-4000-8000-000000000004","cloturer":false}','58000000-0000-4000-8000-000000000004');
 ELSIF v='blocage' THEN
  PERFORM set_config('request.jwt.claims','{"sub":"51000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
  BEGIN PERFORM public.lire_celebration('52000000-0000-4000-8000-000000000005'); RAISE EXCEPTION 'Lecture apres blocage devrait refuser'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 ELSE RAISE EXCEPTION 'Choisir une course documentee'; END IF;
END $course$;
COMMIT;
-- Vérifier ensuite les assertions finales, en rôle administrateur de la COPIE.
