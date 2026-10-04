-- Retour arrière MANUEL : remet les anciennes autorisations, y compris trop larges.
-- Les contacts et réponses d'invitation créés après application sont conservés.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('ephemer-p2-20261004'));
DO $$ DECLARE p record; BEGIN
 IF to_regclass('p2_backup_20261004.restore_commands') IS NULL THEN RAISE EXCEPTION 'Sauvegarde P2 absente'; END IF;
 FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename IN
 ('contacts','rappels','profiles','notification_preferences','notifications','user_push_subscriptions','quotas_ia','invitations','patch_notes','saint_du_jour') LOOP
  EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
 END LOOP;
 FOR p IN SELECT sql FROM p2_backup_20261004.restore_commands WHERE kind IN ('function','policy') ORDER BY position LOOP EXECUTE p.sql; END LOOP;
 FOR p IN SELECT c.oid::regclass signature FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
 AND c.relname IN ('contacts','rappels','profiles','notification_preferences','notifications','user_push_subscriptions','quotas_ia','invitations','patch_notes','saint_du_jour') LOOP
  EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC,anon,authenticated',p.signature);
 END LOOP;
 FOR p IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
 AND (p.proname IN ('creer_invitation','desactiver_invitation','verifier_invitation','soumettre_invitation','repondre_invitation','incrementer_quota_ia','est_contact_lie') OR p.prorettype='trigger'::regtype) LOOP
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC,anon,authenticated',p.signature);
 END LOOP;
 REVOKE ALL ON SEQUENCE public.contacts_id_seq,public.rappels_id_seq FROM PUBLIC,anon,authenticated;
 FOR p IN SELECT sql FROM p2_backup_20261004.restore_commands WHERE kind IN ('table_grant','function_grant','default_grant','sequence_grant') ORDER BY position LOOP EXECUTE p.sql; END LOOP;
END $$;
DROP INDEX public.notifications_invitation_contact_unique;
DROP INDEX public.contacts_user_id_id_idx;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT sql FROM p2_backup_20261004.restore_commands WHERE kind IN ('index','constraint') ORDER BY position LOOP EXECUTE p.sql; END LOOP;
END $$;
UPDATE public.contacts c SET relation=b.relation FROM p2_backup_20261004.relations b WHERE c.id=b.id AND c.relation='ami';
COMMIT;
-- Conserver le schéma privé de sauvegarde jusqu'à la fin de la recette.
