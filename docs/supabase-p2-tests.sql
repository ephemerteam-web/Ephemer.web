-- Recette MANUELLE sur une copie de test après supabase-p2-apply.sql.
-- Données synthétiques uniquement, ROLLBACK final ; ne pas utiliser de compte réel.
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data)
VALUES ('10000000-0000-4000-8000-000000000001','p2-a@example.invalid','{"prenom":"Hôte A"}'),
       ('10000000-0000-4000-8000-000000000002','p2-b@example.invalid','{"prenom":"Hôte B"}');
INSERT INTO public.invitations(id,user_id,token,label,max_utilisations,nb_utilisations,expires_at,actif)
VALUES ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','p2-synthetic-token-a','Test P2',3,0,now()+interval '1 day',true);

DO $$ DECLARE r record; v_contact_id bigint; BEGIN
 SELECT * INTO r FROM public.soumettre_invitation('p2-synthetic-token-a','Test canonique',NULL,NULL,'amis');
 IF NOT r.succes OR r.message<>'ok' THEN RAISE EXCEPTION 'Soumission canonique refusée'; END IF;
 SELECT id INTO v_contact_id FROM public.contacts WHERE invitation_id='20000000-0000-4000-8000-000000000001' AND prenom='Test canonique';
 IF (SELECT relation FROM public.contacts WHERE id=v_contact_id)<>'ami' THEN RAISE EXCEPTION 'Relation non normalisée'; END IF;
 IF (SELECT count(*) FROM public.notifications n WHERE n.contact_id=v_contact_id AND type='invitation_remplie')<>1 THEN RAISE EXCEPTION 'Notification absente ou dupliquée'; END IF;
 -- Même contact : l'index et le conflit empêchent un second exemplaire.
 INSERT INTO public.notifications(user_id,contact_id,type,message,lue)
 VALUES('10000000-0000-4000-8000-000000000001',v_contact_id,'invitation_remplie','Test duplicat',false)
 ON CONFLICT (contact_id) WHERE type='invitation_remplie' DO NOTHING;
 IF (SELECT count(*) FROM public.notifications n WHERE n.contact_id=v_contact_id AND type='invitation_remplie')<>1 THEN RAISE EXCEPTION 'Conflit mal traité'; END IF;
 SELECT * INTO r FROM public.repondre_invitation('p2-synthetic-token-a','Test ancien',NULL,NULL,'ami',NULL,NULL,NULL,NULL);
 IF NOT r.succes OR r.raison<>'ok' THEN RAISE EXCEPTION 'Compatibilité ancienne fonction cassée'; END IF;
 IF (SELECT count(*) FROM public.notifications n JOIN public.contacts c ON c.id=n.contact_id WHERE c.invitation_id='20000000-0000-4000-8000-000000000001' AND n.type='invitation_remplie')<>2 THEN RAISE EXCEPTION 'Ancienne fonction : notification en double'; END IF;
 SELECT * INTO r FROM public.repondre_invitation('absent','Test',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
 IF r.succes OR r.raison<>'introuvable' THEN RAISE EXCEPTION 'Code ancien introuvable incorrect'; END IF;
END $$;

-- Une panne de notification doit annuler contact ET incrémentation.
CREATE FUNCTION pg_temp.p2_fail_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.message LIKE '%P2_PANNE%' THEN RAISE EXCEPTION 'panne notification synthétique'; END IF; RETURN NEW; END $$;
CREATE TRIGGER p2_fail_notification BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION pg_temp.p2_fail_notification();
DO $$ BEGIN
 BEGIN
  PERFORM public.soumettre_invitation('p2-synthetic-token-a','P2_PANNE');
  RAISE EXCEPTION 'La panne aurait dû remonter';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'panne notification synthétique' THEN RAISE; END IF;
 END;
 IF EXISTS(SELECT 1 FROM public.contacts WHERE prenom='P2_PANNE') THEN RAISE EXCEPTION 'Contact non annulé'; END IF;
 IF (SELECT nb_utilisations FROM public.invitations WHERE token='p2-synthetic-token-a')<>2 THEN RAISE EXCEPTION 'Compteur non annulé'; END IF;
 BEGIN
  INSERT INTO public.contacts(user_id,invitation_id,prenom,relation)
  VALUES('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Mauvais hôte','ami');
  RAISE EXCEPTION 'Un autre hôte aurait dû être refusé';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'Contact et invitation doivent appartenir au même hôte' THEN RAISE; END IF;
 END;
END $$;
DROP TRIGGER p2_fail_notification ON public.notifications;
DO $$ DECLARE r record; BEGIN
 PERFORM public.soumettre_invitation('p2-synthetic-token-a','Dernière place');
 SELECT * INTO r FROM public.soumettre_invitation('p2-synthetic-token-a','En trop');
 IF r.succes OR r.message<>'Ce lien a atteint sa limite.' THEN RAISE EXCEPTION 'Quota dépassé'; END IF;
 IF (SELECT nb_utilisations FROM public.invitations WHERE token='p2-synthetic-token-a')<>3 THEN RAISE EXCEPTION 'Quota incohérent'; END IF;
END $$;

-- Isolation : compte B ne voit aucune donnée du compte A et ne peut lui écrire.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.contacts WHERE user_id='10000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Fuite contacts'; END IF;
 IF EXISTS(SELECT 1 FROM public.notifications WHERE user_id='10000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Fuite notifications'; END IF;
 BEGIN
  INSERT INTO public.contacts(user_id,prenom,relation) VALUES('10000000-0000-4000-8000-000000000001','Interdit','ami');
  RAISE EXCEPTION 'Écriture autre propriétaire acceptée';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO public.contacts(user_id,prenom,relation) VALUES('10000000-0000-4000-8000-000000000002','Autorisé','ami');
 IF has_function_privilege(current_user,'public.incrementer_quota_ia(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Quota encore accessible au client'; END IF;
 IF has_table_privilege(current_user,'public.patch_notes','INSERT') OR has_table_privilege(current_user,'public.notifications','INSERT') THEN RAISE EXCEPTION 'Droits d’insertion trop larges'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
-- Attendu : aucun message d'erreur, aucune fixture persistée.
