-- COPIE uniquement, après fixtures-concurrence.sql FRESH, avant toute course édition.
-- Aucune requête Resend. Les enveloppes de fixture ne peuvent pas être déchiffrées.
BEGIN;
DO $garde$ BEGIN IF current_setting('ephemer.recette_collective',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'COPIE requise'; END IF; END $garde$;
SET LOCAL ROLE authenticated;
DO $fermer$ DECLARE c uuid:='f1300000-0000-4000-8000-000000000001'; BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ephemer.recette_a'),'role','authenticated')::text,true);
 PERFORM public.commander_carte_collective(c,jsonb_build_object('operation',gen_random_uuid(),'revision',8,'data',jsonb_build_object('action','fermer','confirmMissing',false)));
 PERFORM public.commander_carte_collective(c,jsonb_build_object('operation',gen_random_uuid(),'revision',9,'data',jsonb_build_object('action','valider')));
END $fermer$;
RESET ROLE;
DO $publier$ BEGIN
 PERFORM public.publier_carte_collective('f1300000-0000-4000-8000-000000000002',current_setting('ephemer.recette_a')::uuid,10,gen_random_uuid(),'f1300000-0000-4000-8000-000000000041',gen_random_uuid(),encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'),jsonb_build_object('format',1,'ciphertext','','nonce',repeat('0',24),'tag',repeat('0',32)),30);
 INSERT INTO ephemer_celebrations.carte_plans(id,carte,organisateur,empreinte,envoi,envoi_civil,publication_etat,email_etat,version)
 SELECT 'f1300000-0000-4000-8000-000000000042',id,current_setting('ephemer.recette_a')::uuid,empreinte,now()-interval '1 minute','{}','publie','programme','f1300000-0000-4000-8000-000000000041' FROM ephemer_celebrations.cartes_collectives WHERE id='f1300000-0000-4000-8000-000000000002';
END $publier$;
COMMIT;
