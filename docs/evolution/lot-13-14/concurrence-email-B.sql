BEGIN;
DO $garde$ BEGIN IF current_setting('ephemer.recette_collective',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'COPIE requise'; END IF; END $garde$;
SET LOCAL ROLE service_role;
DO $worker$ DECLARE reservation jsonb; BEGIN
 reservation:=public.reserver_email_carte('f1300000-0000-4000-8000-000000000042',jsonb_build_object('format',1,'ciphertext','','nonce',repeat('0',24),'tag',repeat('0',32)));
 IF reservation->>'state'<>'busy' THEN RAISE EXCEPTION 'Second worker ne doit pas réserver'; END IF;
END $worker$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $annuler$ BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ephemer.recette_a'),'role','authenticated')::text,true);
 BEGIN
  PERFORM public.commander_carte_collective('f1300000-0000-4000-8000-000000000001',jsonb_build_object('operation',gen_random_uuid(),'revision',11,'data',jsonb_build_object('action','annuler_programmation')));
  RAISE EXCEPTION 'Annulation certaine annoncée après engagement';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
END $annuler$;
ROLLBACK;
