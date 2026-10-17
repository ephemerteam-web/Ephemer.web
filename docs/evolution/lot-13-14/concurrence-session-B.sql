-- Démarrer pendant les cinq secondes de A. Si A gagne : 40001 attendu ; ROLLBACK ensuite.
BEGIN;
DO $garde$ BEGIN IF current_setting('ephemer.recette_collective',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'COPIE requise'; END IF; END $garde$;
SET LOCAL ROLE authenticated;
DO $fermeture$ BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ephemer.recette_a'),'role','authenticated')::text,true);
 PERFORM public.commander_carte_collective('f1300000-0000-4000-8000-000000000001',jsonb_build_object('operation','f1300000-0000-4000-8000-000000000032','revision',8,'data',jsonb_build_object('action','fermer','confirmMissing',false)));
END $fermeture$;
COMMIT;
