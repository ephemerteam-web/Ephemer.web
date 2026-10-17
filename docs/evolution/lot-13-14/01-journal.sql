-- PROPOSITION NON APPLIQUÉE. À valider dans Supabase avant déploiement du code.
-- Aucune modification des anciens statuts de rappels ou de leurs données.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $garde$ BEGIN
 IF to_regclass('public.email_jobs') IS NOT NULL OR to_regprocedure('public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb)') IS NOT NULL THEN
  RAISE EXCEPTION 'Journal déjà présent : comparer le catalogue, ne pas réinstaller';
 END IF;
END $garde$;

CREATE TABLE public.email_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('rappel','recap','newsletter')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rappel_id bigint,
  notification_ids uuid[] NOT NULL DEFAULT '{}',
  event_keys text[] NOT NULL DEFAULT '{}',
  source jsonb NOT NULL DEFAULT '{}',
  payload jsonb NOT NULL,
  expires_on date NOT NULL,
  state text NOT NULL CHECK (state IN ('reserved','sending','retryable','uncertain','accepted','failed','review','cancelled','expired')),
  token uuid,
  lease_until timestamptz,
  first_attempt_at timestamptz,
  resend_id text UNIQUE,
  accepted_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'unconfirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_jobs_user ON public.email_jobs(user_id, created_at);
CREATE INDEX email_jobs_rappel ON public.email_jobs(rappel_id);
CREATE INDEX email_jobs_events ON public.email_jobs USING gin(event_keys);

CREATE TABLE public.email_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.email_jobs(id) ON DELETE CASCADE,
  token uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  outcome text NOT NULL DEFAULT 'sending',
  resend_id text
);
CREATE TABLE public.email_webhook_events (
  event_id text PRIMARY KEY,
  resend_id text NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_webhook_resend ON public.email_webhook_events(resend_id, occurred_at);
CREATE TABLE public.email_cron_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cron text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  phase text NOT NULL,
  success boolean NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_cron_last_success ON public.email_cron_runs(user_id, cron, phase, completed_at DESC) WHERE success;

-- Le journal n'est jamais modifiable via un JWT utilisateur ordinaire.
ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_cron_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_jobs, public.email_attempts, public.email_webhook_events, public.email_cron_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_jobs, public.email_attempts, public.email_webhook_events, public.email_cron_runs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.email_attempts_id_seq, public.email_cron_runs_id_seq TO service_role;

-- Verrou opérationnel fermé par défaut : installer le journal ne lance aucun email.
CREATE TABLE public.email_delivery_control (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false, collective_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO public.email_delivery_control(singleton) VALUES(true);
ALTER TABLE public.email_delivery_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_delivery_control FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.claim_email_job(p_key text, p_kind text, p_user_id uuid,
  p_rappel_id bigint, p_notification_ids uuid[], p_event_keys text[], p_source jsonb,
  p_expires_on date, p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j public.email_jobs; r public.rappels; v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF NOT coalesce((SELECT enabled FROM public.email_delivery_control WHERE singleton),false) THEN RETURN jsonb_build_object('state','busy'); END IF;
  -- Ordre de verrouillage partagé avec les triggers : rappel, puis utilisateur.
  IF p_rappel_id IS NOT NULL THEN
    SELECT * INTO r FROM public.rappels WHERE id=p_rappel_id AND user_id=p_user_id FOR UPDATE;
    IF NOT FOUND OR r.statut <> 'programme' OR NOT (to_jsonb(r) @> p_source) THEN
      RETURN jsonb_build_object('state','cancelled');
    END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 47));
  SELECT * INTO j FROM public.email_jobs WHERE job_key=p_key FOR UPDATE;
  IF j.id IS NULL AND p_kind='recap' THEN
    -- Reprendre le lot déjà réservé, même si de nouveaux paliers sont apparus.
    SELECT * INTO j FROM public.email_jobs WHERE user_id=p_user_id AND kind='recap'
      AND event_keys && p_event_keys AND state IN ('reserved','sending','retryable','uncertain','review','failed')
      ORDER BY created_at LIMIT 1 FOR UPDATE;
  END IF;
  IF j.id IS NOT NULL THEN
    IF j.state='accepted' THEN RETURN jsonb_build_object('state','already_accepted','resend_id',j.resend_id); END IF;
    IF j.state IN ('review','failed','cancelled','expired') THEN RETURN jsonb_build_object('state',j.state); END IF;
    IF j.lease_until > now() THEN RETURN jsonb_build_object('state','busy'); END IF;
    IF j.state <> 'retryable' AND j.first_attempt_at <= now() - interval '23 hours' THEN
      UPDATE public.email_jobs SET state='review',updated_at=now() WHERE id=j.id;
      RETURN jsonb_build_object('state','review');
    END IF;
    IF j.expires_on < v_today THEN
      UPDATE public.email_jobs SET state=CASE WHEN j.first_attempt_at IS NOT NULL AND j.state<>'retryable' THEN 'review' ELSE 'expired' END,updated_at=now() WHERE id=j.id;
      RETURN jsonb_build_object('state',CASE WHEN j.first_attempt_at IS NOT NULL AND j.state<>'retryable' THEN 'review' ELSE 'expired' END);
    END IF;
    -- Un refus explicite 429 peut être retenté le lendemain, sans email accepté.
    IF j.state='retryable' THEN j.first_attempt_at := NULL; END IF;
  ELSE
    IF p_expires_on < v_today THEN RETURN jsonb_build_object('state','expired'); END IF;
    IF p_kind='rappel' AND p_rappel_id IS NULL THEN RAISE EXCEPTION 'Rappel obligatoire'; END IF;
    IF EXISTS (SELECT 1 FROM public.email_jobs WHERE user_id=p_user_id AND rappel_id=p_rappel_id
      AND state IN ('reserved','sending','uncertain','review','retryable')) THEN
      RETURN jsonb_build_object('state','review');
    END IF;
    INSERT INTO public.email_jobs(job_key,kind,user_id,rappel_id,notification_ids,event_keys,source,payload,expires_on,state)
      VALUES(p_key,p_kind,p_user_id,p_rappel_id,p_notification_ids,p_event_keys,p_source,p_payload,p_expires_on,'reserved') RETURNING * INTO j;
  END IF;
  j.token := gen_random_uuid();
  UPDATE public.email_jobs SET state='reserved',token=j.token,lease_until=now()+interval '10 minutes',
    first_attempt_at=j.first_attempt_at,updated_at=now() WHERE id=j.id;
  RETURN jsonb_build_object('state','reserved','id',j.id,'token',j.token,'payload',j.payload);
END;
$$;

CREATE FUNCTION public.email_occurrence_current(p_id bigint) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $occ$
DECLARE r public.rappels; o public.occurrences_evenements; e public.evenements_personnels;
BEGIN
 SELECT * INTO r FROM public.rappels WHERE id=p_id;
 IF NOT FOUND THEN RETURN false; END IF;
 IF r.occurrence_id IS NULL THEN
  IF r.source='message_programme' OR r.type_evenement NOT IN ('anniversaire','fete_prenomale') THEN RETURN true; END IF;
  RETURN NOT EXISTS(SELECT 1 FROM public.evenements_personnels x WHERE x.user_id=r.user_id AND x.contact_id IS NOT DISTINCT FROM r.contact_id AND x.type_evenement=r.type_evenement);
 END IF;
 SELECT * INTO o FROM public.occurrences_evenements WHERE id=r.occurrence_id AND user_id=r.user_id FOR SHARE;
 IF NOT FOUND OR o.annulee OR o.revision<>r.occurrence_revision OR o.date_occurrence<>r.event_date THEN RETURN false; END IF;
 SELECT * INTO e FROM public.evenements_personnels WHERE id=o.evenement_id AND user_id=r.user_id FOR SHARE;
 RETURN FOUND AND NOT e.archive AND e.rappels_actifs AND NOT e.choix_a_reconfirmer AND e.contact_id IS NOT DISTINCT FROM r.contact_id
  AND (e.arrete_apres_cycle IS NULL OR o.cycle=0 OR o.cycle<=e.arrete_apres_cycle);
END $occ$;
REVOKE ALL ON FUNCTION public.email_occurrence_current(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.email_occurrence_current(bigint) TO service_role;

CREATE FUNCTION public.begin_email_job(p_job_id uuid,p_token uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j public.email_jobs; r public.rappels; prefs public.notification_preferences; v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF NOT coalesce((SELECT enabled FROM public.email_delivery_control WHERE singleton),false) THEN RETURN jsonb_build_object('ready',false,'state','busy'); END IF;
  SELECT * INTO j FROM public.email_jobs WHERE id=p_job_id;
  IF j.rappel_id IS NOT NULL THEN SELECT * INTO r FROM public.rappels WHERE id=j.rappel_id FOR UPDATE; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(j.user_id::text,47));
  SELECT * INTO j FROM public.email_jobs WHERE id=p_job_id FOR UPDATE;
  IF j.state <> 'reserved' OR j.token IS DISTINCT FROM p_token OR j.lease_until < now() THEN
    RETURN jsonb_build_object('ready',false,'state','busy');
  END IF;
  SELECT * INTO prefs FROM public.notification_preferences WHERE user_id=j.user_id;
  IF j.expires_on < v_today THEN
    UPDATE public.email_jobs SET state='expired',updated_at=now() WHERE id=j.id;
    RETURN jsonb_build_object('ready',false,'state','expired');
  END IF;
  IF j.kind='rappel' THEN
    IF r.id IS NULL OR r.user_id<>j.user_id OR r.statut<>'programme' OR NOT(to_jsonb(r) @> j.source)
      OR r.date_envoi>v_today
      OR (r.contact_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.contacts c WHERE c.id=r.contact_id AND c.user_id=j.user_id))
      OR (r.contact_id IS NULL AND (r.occurrence_id IS NULL OR r.destinataire<>'moi'))
      OR NOT public.email_occurrence_current(j.rappel_id) THEN
      UPDATE public.email_jobs SET state='cancelled',updated_at=now() WHERE id=j.id;
      RETURN jsonb_build_object('ready',false,'state','cancelled');
    END IF;
    IF r.source IS DISTINCT FROM 'message_programme' AND (NOT coalesce(prefs.canal_email,true)
      OR NOT CASE r.type_rappel WHEN 'j7' THEN coalesce(prefs.rappel_j7,true) WHEN 'j3' THEN coalesce(prefs.rappel_j3,true) WHEN 'j1' THEN coalesce(prefs.rappel_j1,false) WHEN 'jourj' THEN coalesce(prefs.rappel_jourj,true) ELSE false END) THEN
      UPDATE public.email_jobs SET lease_until=NULL,updated_at=now() WHERE id=j.id;
      RETURN jsonb_build_object('ready',false,'state','suspended');
    END IF;
    -- Une temporisation réelle entre les envois d'un même contact/destinataire.
    IF EXISTS(SELECT 1 FROM public.email_jobs oldj
      WHERE oldj.id<>j.id AND oldj.user_id=j.user_id AND oldj.kind='rappel'
      AND oldj.source->>'contact_id'=r.contact_id::text AND oldj.source->>'destinataire'=r.destinataire
      AND oldj.state='accepted' AND oldj.accepted_at>now()-interval '1 hour') THEN
      UPDATE public.email_jobs SET lease_until=NULL,updated_at=now() WHERE id=j.id;
      RETURN jsonb_build_object('ready',false,'state','throttled');
    END IF;
  ELSIF NOT coalesce(prefs.canal_email,true) OR (j.kind='newsletter' AND NOT coalesce(prefs.newsletter_mensuelle,false)) THEN
    UPDATE public.email_jobs SET lease_until=NULL,updated_at=now() WHERE id=j.id;
    RETURN jsonb_build_object('ready',false,'state','suspended');
  END IF;
  IF j.kind='recap' AND NOT EXISTS(SELECT 1 FROM public.notifications n WHERE n.id=ANY(j.notification_ids) AND n.user_id=j.user_id AND NOT n.email_envoye) THEN
    UPDATE public.email_jobs SET state='cancelled',updated_at=now() WHERE id=j.id;
    RETURN jsonb_build_object('ready',false,'state','cancelled');
  END IF;
  IF j.kind='recap' AND EXISTS(SELECT 1 FROM unnest(j.notification_ids) nid
    LEFT JOIN public.notifications n ON n.id=nid
    LEFT JOIN public.contacts c ON c.id=n.contact_id AND c.user_id=j.user_id
    WHERE n.id IS NULL OR c.id IS NULL OR n.user_id<>j.user_id OR n.email_envoye OR n.event_date<v_today
      OR NOT CASE n.jours_restants WHEN 7 THEN coalesce(prefs.rappel_j7,true) WHEN 3 THEN coalesce(prefs.rappel_j3,true)
        WHEN 1 THEN coalesce(prefs.rappel_j1,false) WHEN 0 THEN coalesce(prefs.rappel_jourj,true) ELSE false END) THEN
    UPDATE public.email_jobs SET state=CASE WHEN first_attempt_at IS NULL THEN 'cancelled' ELSE 'review' END,lease_until=NULL,updated_at=now() WHERE id=j.id;
    RETURN jsonb_build_object('ready',false,'state','suspended');
  END IF;
  UPDATE public.email_jobs SET state='sending',first_attempt_at=coalesce(first_attempt_at,now()),updated_at=now() WHERE id=j.id;
  INSERT INTO public.email_attempts(job_id,token) VALUES(j.id,p_token);
  RETURN jsonb_build_object('ready',true,'state','sending');
END;
$$;

CREATE FUNCTION public.finish_email_job(p_job_id uuid,p_token uuid,p_outcome text,p_resend_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j public.email_jobs;
BEGIN
  IF p_outcome NOT IN ('accepted','uncertain','retryable','failed') THEN RAISE EXCEPTION 'Résultat inconnu'; END IF;
  SELECT * INTO j FROM public.email_jobs WHERE id=p_job_id;
  IF j.rappel_id IS NOT NULL THEN PERFORM 1 FROM public.rappels WHERE id=j.rappel_id FOR UPDATE; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(j.user_id::text,47));
  SELECT * INTO j FROM public.email_jobs WHERE id=p_job_id FOR UPDATE;
  IF j.state='accepted' AND j.resend_id=p_resend_id AND p_outcome='accepted' THEN RETURN; END IF;
  IF j.token IS DISTINCT FROM p_token OR j.state<>'sending' THEN RAISE EXCEPTION 'Réservation périmée'; END IF;
  IF p_outcome='accepted' AND p_resend_id IS NULL THEN RAISE EXCEPTION 'Identifiant prestataire requis'; END IF;
  UPDATE public.email_jobs SET state=p_outcome,resend_id=p_resend_id,lease_until=NULL,updated_at=now(),
    accepted_at=CASE WHEN p_outcome='accepted' THEN coalesce(accepted_at,now()) ELSE accepted_at END,
    delivery_status=coalesce((SELECT CASE e.event_type WHEN 'email.complained' THEN 'complained' WHEN 'email.bounced' THEN 'bounced'
      WHEN 'email.failed' THEN 'failed' WHEN 'email.suppressed' THEN 'suppressed' WHEN 'email.delivered' THEN 'delivered'
      WHEN 'email.delivery_delayed' THEN 'delayed' ELSE 'unconfirmed' END
      FROM public.email_webhook_events e WHERE e.resend_id=p_resend_id ORDER BY
        CASE WHEN e.event_type IN ('email.complained','email.bounced','email.failed','email.suppressed') THEN 3 WHEN e.event_type='email.delivered' THEN 2 ELSE 1 END DESC,e.occurred_at DESC LIMIT 1),'unconfirmed')
    WHERE id=j.id;
  UPDATE public.email_attempts SET outcome=p_outcome,resend_id=p_resend_id,finished_at=now() WHERE job_id=j.id AND token=p_token AND finished_at IS NULL;
  IF p_outcome='accepted' THEN
    IF j.kind='rappel' THEN UPDATE public.rappels SET statut='envoye',sent_at=now() WHERE id=j.rappel_id AND user_id=j.user_id AND statut='programme'; END IF;
    IF j.kind='recap' THEN UPDATE public.notifications SET email_envoye=true WHERE id=ANY(j.notification_ids) AND user_id=j.user_id; END IF;
  END IF;
END;
$$;

CREATE FUNCTION public.record_cron_run(p_cron text,p_user_id uuid,p_day date,p_phase text,p_success boolean) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.email_cron_runs(cron,user_id,day,phase,success) VALUES(p_cron,p_user_id,p_day,p_phase,p_success);
$$;

CREATE FUNCTION public.record_email_webhook(p_event_id text,p_resend_id text,p_type text,p_occurred_at timestamptz,p_job_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_status text; j public.email_jobs;
BEGIN
  IF p_type NOT IN ('email.sent','email.delivered','email.bounced','email.complained','email.failed','email.suppressed','email.delivery_delayed') THEN RAISE EXCEPTION 'Événement inconnu'; END IF;
  INSERT INTO public.email_webhook_events(event_id,resend_id,event_type,occurred_at) VALUES(p_event_id,p_resend_id,p_type,p_occurred_at) ON CONFLICT DO NOTHING;
  -- Le tag signé retrouve le lot même si l'écriture après acceptation a échoué.
  SELECT * INTO j FROM public.email_jobs WHERE id=p_job_id;
  IF j.id IS NOT NULL THEN
    IF j.rappel_id IS NOT NULL THEN PERFORM 1 FROM public.rappels WHERE id=j.rappel_id FOR UPDATE; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(j.user_id::text,47));
    SELECT * INTO j FROM public.email_jobs WHERE id=p_job_id FOR UPDATE;
    IF j.first_attempt_at IS NOT NULL AND j.state IN ('sending','uncertain','review','reserved','accepted') AND (j.resend_id IS NULL OR j.resend_id=p_resend_id) THEN
      UPDATE public.email_jobs SET state='accepted',resend_id=p_resend_id,lease_until=NULL,updated_at=now(),accepted_at=coalesce(accepted_at,now()) WHERE id=j.id;
      UPDATE public.email_attempts SET outcome='accepted_webhook',resend_id=p_resend_id,finished_at=now() WHERE job_id=j.id AND finished_at IS NULL;
      IF j.kind='rappel' THEN UPDATE public.rappels SET statut='envoye',sent_at=coalesce(sent_at,now()) WHERE id=j.rappel_id AND user_id=j.user_id AND statut='programme'; END IF;
      IF j.kind='recap' THEN UPDATE public.notifications SET email_envoye=true WHERE id=ANY(j.notification_ids) AND user_id=j.user_id; END IF;
    END IF;
  END IF;
  -- Recalcul depuis l'historique : un email.sent retardé ne détruit pas un delivered.
  SELECT CASE e.event_type WHEN 'email.complained' THEN 'complained' WHEN 'email.bounced' THEN 'bounced'
    WHEN 'email.failed' THEN 'failed' WHEN 'email.suppressed' THEN 'suppressed' WHEN 'email.delivered' THEN 'delivered'
    WHEN 'email.delivery_delayed' THEN 'delayed' ELSE 'unconfirmed' END INTO v_status
    FROM public.email_webhook_events e WHERE e.resend_id=p_resend_id ORDER BY
      CASE WHEN e.event_type IN ('email.complained','email.bounced','email.failed','email.suppressed') THEN 3 WHEN e.event_type='email.delivered' THEN 2 ELSE 1 END DESC,e.occurred_at DESC LIMIT 1;
  UPDATE public.email_jobs SET delivery_status=v_status WHERE resend_id=p_resend_id;
END;
$$;

CREATE FUNCTION public.my_email_status() RETURNS TABLE(rappel_id bigint,state text,resend_id text,delivery_status text,updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT DISTINCT ON (j.rappel_id) j.rappel_id,j.state,j.resend_id,j.delivery_status,j.updated_at FROM public.email_jobs j
    WHERE j.user_id=auth.uid() AND j.rappel_id IS NOT NULL ORDER BY j.rappel_id,j.created_at DESC;
$$;


-- Aucun plafond contacts/rappels ni trigger d'écriture de l'ancien dossier n'est installé ici.
REVOKE ALL ON FUNCTION public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb),
 public.begin_email_job(uuid,uuid),public.finish_email_job(uuid,uuid,text,text),
 public.record_cron_run(text,uuid,date,text,boolean),public.record_email_webhook(text,text,text,timestamptz,uuid),public.my_email_status()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb),
 public.begin_email_job(uuid,uuid),public.finish_email_job(uuid,uuid,text,text),
 public.record_cron_run(text,uuid,date,text,boolean),public.record_email_webhook(text,text,text,timestamptz,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.my_email_status() TO authenticated;
COMMIT;
