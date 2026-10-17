-- COPIE uniquement ; fixtures-concurrence.sql a préparé une carte ouverte en révision 8.
BEGIN;
DO $garde$ BEGIN IF current_setting('ephemer.recette_collective',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'COPIE requise'; END IF; END $garde$;
SET LOCAL ROLE authenticated;
DO $edition$ BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ephemer.recette_a'),'role','authenticated')::text,true);
 PERFORM public.commander_carte_collective('f1300000-0000-4000-8000-000000000001',jsonb_build_object('operation','f1300000-0000-4000-8000-000000000031','revision',8,'data',jsonb_build_object('action','confirmer','consent',true,'content',jsonb_build_object('message','Édition session A','signature','Auteur synthétique','avatar',NULL))));
 PERFORM pg_sleep(5); -- Démarrer B pendant cette fenêtre ; un lancement successif ne prouve pas la course.
END $edition$;
COMMIT;
