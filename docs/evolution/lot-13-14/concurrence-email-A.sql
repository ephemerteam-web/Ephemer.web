BEGIN;
DO $garde$ BEGIN IF current_setting('ephemer.recette_collective',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'COPIE requise'; END IF; END $garde$;
SET LOCAL ROLE service_role;
DO $worker$ DECLARE reservation jsonb; BEGIN
 reservation:=public.reserver_email_carte('f1300000-0000-4000-8000-000000000042',jsonb_build_object('format',1,'ciphertext','','nonce',repeat('0',24),'tag',repeat('0',32)));
 IF reservation->>'state'<>'reserved' OR NOT (public.engager_email_carte((reservation->>'id')::uuid,(reservation->>'token')::uuid)->>'ready')::boolean THEN RAISE EXCEPTION 'Réservation/engagement attendu'; END IF;
 PERFORM pg_sleep(5); -- Démarrer B ici ; ne jamais imprimer le jeton de réservation.
END $worker$;
COMMIT;
