-- À relire puis exécuter MANUELLEMENT dans le SQL Editor, rôle postgres.
-- Une transaction unique : toute erreur annule l'ensemble, sauvegarde comprise.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('ephemer-p2-20261004'));
CREATE SCHEMA p2_backup_20261004;
REVOKE ALL ON SCHEMA p2_backup_20261004 FROM PUBLIC, anon, authenticated;
CREATE TABLE p2_backup_20261004.restore_commands (position bigint GENERATED ALWAYS AS IDENTITY, kind text NOT NULL, sql text NOT NULL);
REVOKE ALL ON ALL TABLES IN SCHEMA p2_backup_20261004 FROM PUBLIC, anon, authenticated;

-- Sauvegarder les définitions et droits RÉELS au moment de l'application.
INSERT INTO p2_backup_20261004.restore_commands(kind, sql)
SELECT 'function', pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('soumettre_invitation','repondre_invitation','notifier_invitation_remplie');
INSERT INTO p2_backup_20261004.restore_commands(kind, sql)
SELECT 'policy', format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s', policyname, tablename, permissive, cmd,
  (SELECT string_agg(CASE WHEN r='public' THEN 'PUBLIC' ELSE quote_ident(r) END, ', ') FROM unnest(roles) r),
  CASE WHEN qual IS NULL THEN '' ELSE ' USING ('||qual||')' END,
  CASE WHEN with_check IS NULL THEN '' ELSE ' WITH CHECK ('||with_check||')' END)
FROM pg_policies WHERE schemaname='public' AND tablename IN
('contacts','rappels','profiles','notification_preferences','notifications','user_push_subscriptions','quotas_ia','invitations','patch_notes','saint_du_jour');
INSERT INTO p2_backup_20261004.restore_commands(kind, sql)
SELECT 'table_grant', format('GRANT %s ON TABLE public.%I TO %s%s', a.privilege_type, c.relname,
  CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,
  CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
WHERE n.nspname='public' AND c.relname IN ('contacts','rappels','profiles','notification_preferences','notifications','user_push_subscriptions','quotas_ia','invitations','patch_notes','saint_du_jour')
AND (a.grantee=0 OR pg_get_userbyid(a.grantee) IN ('anon','authenticated'));
INSERT INTO p2_backup_20261004.restore_commands(kind, sql)
SELECT 'function_grant', format('GRANT EXECUTE ON FUNCTION %s TO %s%s',p.oid::regprocedure,
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,
 CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
WHERE n.nspname='public' AND (p.proname IN ('creer_invitation','desactiver_invitation','verifier_invitation','soumettre_invitation','repondre_invitation','incrementer_quota_ia','est_contact_lie') OR p.prorettype='trigger'::regtype)
AND (a.grantee=0 OR pg_get_userbyid(a.grantee) IN ('anon','authenticated'));
-- Enregistrer aussi le cas sans ligne explicite (EXECUTE à PUBLIC par défaut).
INSERT INTO p2_backup_20261004.restore_commands(kind, sql)
SELECT 'default_grant',format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT %s ON %s TO %s%s', owner_name, a.privilege_type,
 CASE object_type WHEN 'r' THEN 'TABLES' WHEN 'S' THEN 'SEQUENCES' ELSE 'FUNCTIONS' END,
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,
 CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
FROM (SELECT r.oid owner_id,r.rolname owner_name,t.object_type,
 coalesce(d.defaclacl,acldefault(t.object_type::"char",r.oid)) acl
 FROM pg_roles r CROSS JOIN (VALUES ('r'),('S'),('f')) t(object_type)
 LEFT JOIN pg_default_acl d ON d.defaclrole=r.oid AND d.defaclnamespace='public'::regnamespace AND d.defaclobjtype=t.object_type::"char"
 WHERE r.rolname='postgres') defaults CROSS JOIN LATERAL aclexplode(defaults.acl) a
WHERE a.grantee=0 OR pg_get_userbyid(a.grantee) IN ('anon','authenticated');
INSERT INTO p2_backup_20261004.restore_commands(kind, sql)
SELECT 'default_grant',format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO %s%s',
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,
 CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
FROM pg_roles r LEFT JOIN pg_default_acl d ON d.defaclrole=r.oid AND d.defaclnamespace=0 AND d.defaclobjtype='f'
CROSS JOIN LATERAL aclexplode(coalesce(d.defaclacl,acldefault('f',r.oid))) a
WHERE r.rolname='postgres' AND (a.grantee=0 OR pg_get_userbyid(a.grantee) IN ('anon','authenticated'));
INSERT INTO p2_backup_20261004.restore_commands(kind,sql)
SELECT 'sequence_grant',format('GRANT %s ON SEQUENCE public.%I TO %s%s',a.privilege_type,c.relname,
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,
 CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('S',c.relowner))) a
WHERE n.nspname='public' AND c.relname IN ('contacts_id_seq','rappels_id_seq')
AND (a.grantee=0 OR pg_get_userbyid(a.grantee) IN ('anon','authenticated'));
INSERT INTO p2_backup_20261004.restore_commands(kind, sql)
SELECT 'index',indexdef FROM pg_indexes WHERE schemaname='public' AND indexname IN ('idx_invitations_token','idx_quotas_ia_user_jour');

DO $$ BEGIN
 IF (SELECT count(*) FROM public.contacts WHERE relation='amis') <> 2 THEN
   RAISE EXCEPTION 'Le nombre de contacts historiques amis a changé : refaire valider la conversion ciblée.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.notifications WHERE type='invitation_remplie' AND contact_id IS NOT NULL GROUP BY contact_id HAVING count(*)>1) THEN
   RAISE EXCEPTION 'Notifications invitation déjà dupliquées : arbitrage humain nécessaire, aucune suppression automatique.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.contacts c JOIN public.invitations i ON i.id=c.invitation_id WHERE c.user_id IS DISTINCT FROM i.user_id) THEN
   RAISE EXCEPTION 'Contact et invitation de comptes différents : corriger après examen humain.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.notifications n JOIN public.contacts c ON c.id=n.contact_id WHERE n.type='invitation_remplie' AND n.user_id IS DISTINCT FROM c.user_id) THEN
   RAISE EXCEPTION 'Notification historique attribuée à un autre compte : examen humain nécessaire.';
 END IF;
 IF (SELECT count(*) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid='public.contacts'::regclass AND NOT t.tgisinternal AND p.proname='notifier_invitation_remplie')<>1 THEN
   RAISE EXCEPTION 'Le trigger de notification attendu doit être présent une seule fois.';
 END IF;
END $$;
CREATE TABLE p2_backup_20261004.relations AS SELECT id,relation FROM public.contacts WHERE relation='amis';
REVOKE ALL ON p2_backup_20261004.relations FROM PUBLIC,anon,authenticated;
UPDATE public.contacts c SET relation='ami' FROM p2_backup_20261004.relations b WHERE c.id=b.id AND c.relation='amis';

CREATE INDEX contacts_user_id_id_idx ON public.contacts(user_id,id);
CREATE UNIQUE INDEX notifications_invitation_contact_unique ON public.notifications(contact_id) WHERE type='invitation_remplie';
-- L'index notification_preferences_user_id_key porte une contrainte UNIQUE.
-- PostgreSQL ne peut le retirer en conservant cette contrainte : conserver les deux,
-- conformément à la demande de préserver contraintes uniques et clés primaires.
DROP INDEX public.idx_invitations_token;
DROP INDEX public.idx_quotas_ia_user_jour;

CREATE OR REPLACE FUNCTION public.notifier_invitation_remplie() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE hote uuid;
BEGIN
 IF NEW.invitation_id IS NULL THEN RETURN NEW; END IF;
 SELECT user_id INTO hote FROM public.invitations WHERE id=NEW.invitation_id;
 IF hote IS NULL OR hote IS DISTINCT FROM NEW.user_id THEN
   RAISE EXCEPTION 'Contact et invitation doivent appartenir au même hôte';
 END IF;
 INSERT INTO public.notifications(user_id,contact_id,type,message,event_date,jours_restants,lue)
 VALUES (hote,NEW.id,'invitation_remplie',concat('📩 ',concat_ws(' ',NEW.prenom,NULLIF(NEW.nom,'')),' a rempli sa fiche via ton invitation !'),NULL,NULL,false)
 ON CONFLICT (contact_id) WHERE type='invitation_remplie' DO NOTHING;
 -- Une erreur autre que le conflit attendu remonte : contact et compteur sont annulés.
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.soumettre_invitation(
 p_token text,p_prenom text,p_nom text DEFAULT NULL,p_date_naissance date DEFAULT NULL,p_relation text DEFAULT NULL,
 p_email text DEFAULT NULL,p_telephone_indicatif text DEFAULT NULL,p_telephone_numero text DEFAULT NULL,p_note text DEFAULT NULL)
RETURNS TABLE(succes boolean,message text,prenom_hote text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inv public.invitations%ROWTYPE; hote text; relation_normalisee text;
BEGIN
 SELECT * INTO inv FROM public.invitations WHERE token=p_token FOR UPDATE;
 IF NOT FOUND THEN RETURN QUERY SELECT false,'Ce lien n''existe pas.'::text,NULL::text; RETURN; END IF;
 IF NOT inv.actif THEN RETURN QUERY SELECT false,'Ce lien a été désactivé.'::text,NULL::text; RETURN; END IF;
 IF inv.expires_at<=now() THEN RETURN QUERY SELECT false,'Ce lien a expiré.'::text,NULL::text; RETURN; END IF;
 IF inv.nb_utilisations>=inv.max_utilisations THEN RETURN QUERY SELECT false,'Ce lien a atteint sa limite.'::text,NULL::text; RETURN; END IF;
 IF nullif(trim(p_prenom),'') IS NULL THEN RETURN QUERY SELECT false,'Le prénom est obligatoire.'::text,NULL::text; RETURN; END IF;
 relation_normalisee:=lower(trim(coalesce(p_relation,'autre')));
 IF relation_normalisee='amis' THEN relation_normalisee:='ami'; END IF;
 IF relation_normalisee NOT IN ('ami','famille','couple','pro','autre') THEN relation_normalisee:='autre'; END IF;
 INSERT INTO public.contacts(user_id,invitation_id,prenom,nom,date_naissance,relation,email,telephone_indicatif,telephone_numero,note,est_favori)
 VALUES(inv.user_id,inv.id,left(trim(p_prenom),80),nullif(left(trim(p_nom),80),''),p_date_naissance,relation_normalisee,
 nullif(left(lower(trim(p_email)),160),''),nullif(left(trim(p_telephone_indicatif),8),''),
 nullif(left(regexp_replace(coalesce(p_telephone_numero,''),'[^0-9]','','g'),20),''),nullif(left(trim(p_note),1000),''),false);
 UPDATE public.invitations SET nb_utilisations=nb_utilisations+1 WHERE id=inv.id;
 SELECT coalesce(nullif(trim(u.raw_user_meta_data->>'prenom'),''),nullif(trim(u.raw_user_meta_data->>'first_name'),''),split_part(u.email,'@',1)) INTO hote FROM auth.users u WHERE u.id=inv.user_id;
 RETURN QUERY SELECT true,'ok'::text,hote;
END $$;

CREATE OR REPLACE FUNCTION public.repondre_invitation(
 p_token text,p_prenom text,p_nom text,p_date_naissance date,p_relation text,p_email text,p_tel_indicatif text,p_tel_numero text,p_note text)
RETURNS TABLE(succes boolean,raison text,inviteur_prenom text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 RETURN QUERY SELECT r.succes,CASE r.message
  WHEN 'Ce lien n''existe pas.' THEN 'introuvable' WHEN 'Ce lien a été désactivé.' THEN 'desactive'
  WHEN 'Ce lien a expiré.' THEN 'expire' WHEN 'Ce lien a atteint sa limite.' THEN 'complet'
  WHEN 'Le prénom est obligatoire.' THEN 'prenom_manquant' ELSE r.message END,r.prenom_hote
 FROM public.soumettre_invitation(p_token,p_prenom,p_nom,p_date_naissance,coalesce(p_relation,'ami'),p_email,p_tel_indicatif,p_tel_numero,p_note) r;
END $$;

-- Un seul ensemble de politiques propriétaire avec contrôles d'écriture explicites.
DO $$ DECLARE p record; t text; key_column text; op text; allowed text[]; BEGIN
 FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename IN
 ('contacts','rappels','profiles','notification_preferences','notifications','user_push_subscriptions','quotas_ia','invitations','patch_notes','saint_du_jour') LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['contacts','rappels','profiles','notification_preferences','notifications','user_push_subscriptions','quotas_ia','invitations'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  key_column:=CASE WHEN t='profiles' THEN 'id' ELSE 'user_id' END;
  allowed:=CASE WHEN t IN ('contacts','rappels','user_push_subscriptions') THEN ARRAY['SELECT','INSERT','UPDATE','DELETE']
   WHEN t IN ('profiles','notification_preferences') THEN ARRAY['SELECT','INSERT','UPDATE']
   WHEN t='notifications' THEN ARRAY['SELECT','UPDATE','DELETE'] ELSE ARRAY['SELECT'] END;
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  FOREACH op IN ARRAY allowed LOOP
   EXECUTE format('GRANT %s ON public.%I TO authenticated',op,t);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO authenticated%s%s',t||'_p2_'||lower(op),t,op,
    CASE WHEN op='INSERT' THEN '' ELSE format(' USING ((select auth.uid())=%I)',key_column) END,
    CASE WHEN op IN ('INSERT','UPDATE') THEN format(' WITH CHECK ((select auth.uid())=%I)',key_column) ELSE '' END);
  END LOOP;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['patch_notes','saint_du_jour'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO anon,authenticated',t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon,authenticated USING (true)',t||'_public_read',t);
 END LOOP;
END $$;

-- Les sequences identitaires réellement utilisées en insertion restent accessibles.
-- Aucun privilège générique TRIGGER/TRUNCATE/REFERENCES n'est attribué aux clients.
REVOKE ALL ON SEQUENCE public.contacts_id_seq,public.rappels_id_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SEQUENCE public.contacts_id_seq,public.rappels_id_seq TO authenticated;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT p.oid::regprocedure signature,p.proname,p.prorettype FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND (p.proname IN ('creer_invitation','desactiver_invitation','verifier_invitation','soumettre_invitation','repondre_invitation','incrementer_quota_ia','est_contact_lie') OR p.prorettype='trigger'::regtype) LOOP
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC,anon,authenticated',p.signature);
  IF p.proname IN ('creer_invitation','desactiver_invitation') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated,service_role',p.signature);
  ELSIF p.proname IN ('verifier_invitation','soumettre_invitation','repondre_invitation') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon,authenticated,service_role',p.signature);
  ELSIF p.proname='incrementer_quota_ia' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',p.signature);
  END IF;
 END LOOP;
END $$;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated;
-- Le rôle SQL Editor postgres n'est pas membre de supabase_admin sur ce projet.
-- Ses defaults gérés par la plateforme sont traités dans la procédure séparée,
-- uniquement par un administrateur autorisé de la plateforme.
COMMIT;
