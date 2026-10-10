-- Contrôle du catalogue uniquement, après installation humaine. Aucune donnée privée lue.
BEGIN TRANSACTION READ ONLY;
SELECT column_name, data_type, is_nullable FROM information_schema.columns
 WHERE table_schema='public' AND table_name='avatars_utilisateurs' AND column_name='portrait_ia';
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid='public.avatars_utilisateurs'::regclass AND conname='avatars_portrait_ia_check';
SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger
 WHERE tgrelid='public.avatars_utilisateurs'::regclass AND NOT tgisinternal;
SELECT relrowsecurity FROM pg_class WHERE oid='public.avatars_utilisateurs'::regclass;
SELECT policyname, cmd, roles, qual, with_check FROM pg_policies
 WHERE schemaname='public' AND tablename='avatars_utilisateurs';
SELECT has_column_privilege('authenticated','public.avatars_utilisateurs','portrait_ia','SELECT') AS owner_select,
 has_column_privilege('authenticated','public.avatars_utilisateurs','portrait_ia','INSERT') AS owner_insert,
 has_column_privilege('authenticated','public.avatars_utilisateurs','portrait_ia','UPDATE') AS owner_update,
 has_column_privilege('anon','public.avatars_utilisateurs','portrait_ia','SELECT') AS anonymous_select;
SELECT ephemer_lot09.portrait_ia_valide(NULL,1) AS null_allowed,
 ephemer_lot09.portrait_ia_valide('{}'::jsonb,1) AS invalid_object_refused,
 ephemer_lot09.portrait_ia_valide('{"image":"https://example.invalid","revision":1,"promptVersion":"celeste-cartoon-v1"}'::jsonb,1) AS external_image_refused;
ROLLBACK;
