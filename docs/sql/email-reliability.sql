-- PROPOSITION NON APPLIQUÉE. À valider dans Supabase avant déploiement du code.
-- Aucune modification des anciens statuts de rappels ou de leurs données.
BEGIN;

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

CREATE FUNCTION public.claim_email_job(p_key text, p_kind text, p_user_id uuid,
  p_rappel_id bigint, p_notification_ids uuid[], p_event_keys text[], p_source jsonb,
  p_expires_on date, p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j public.email_jobs; r public.rappels; v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
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

CREATE FUNCTION public.begin_email_job(p_job_id uuid,p_token uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j public.email_jobs; r public.rappels; prefs public.notification_preferences; v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
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
      OR r.date_envoi>v_today OR NOT EXISTS(SELECT 1 FROM public.contacts c WHERE c.id=r.contact_id AND c.user_id=j.user_id) THEN
      UPDATE public.email_jobs SET state='cancelled',updated_at=now() WHERE id=j.id;
      RETURN jsonb_build_object('ready',false,'state','cancelled');
    END IF;
    IF r.source IS DISTINCT FROM 'message_programme' AND (NOT coalesce(prefs.canal_email,true)
      OR NOT CASE r.type_rappel WHEN 'j7' THEN coalesce(prefs.rappel_j7,true) WHEN 'jourj' THEN coalesce(prefs.rappel_jourj,true) ELSE false END) THEN
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

-- Plafonds proposés : 50 contacts, 100 rappels par mois d'envoi, une heure entre
-- deux acceptations pour un même contact/destinataire. Le quota IA est indépendant.
CREATE TABLE public.email_monthly_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL,
  used integer NOT NULL CHECK(used>=0),
  PRIMARY KEY(user_id,month)
);
ALTER TABLE public.email_monthly_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_monthly_usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_monthly_usage TO service_role;
-- Amorcer avec les lignes connues ; les anciennes lignes déjà supprimées sont inconnues.
INSERT INTO public.email_monthly_usage(user_id,month,used)
  SELECT user_id,date_trunc('month',date_envoi)::date,count(*)::integer FROM public.rappels GROUP BY user_id,date_trunc('month',date_envoi)::date;

CREATE FUNCTION public.guard_contact_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.role()='service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Propriétaire invalide'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text,47));
  IF TG_OP='INSERT' AND (SELECT count(*) FROM public.contacts WHERE user_id=NEW.user_id)>=50 THEN RAISE EXCEPTION 'Limite de 50 contacts atteinte'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_contact_limit BEFORE INSERT OR UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.guard_contact_limit();

CREATE FUNCTION public.guard_rappel_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_contact public.contacts; v_month date; v_used integer; v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF auth.role()='service_role' OR auth.uid() IS NULL THEN RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,47));
  IF TG_OP<>'INSERT' THEN
    IF OLD.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Propriétaire invalide'; END IF;
    IF EXISTS(SELECT 1 FROM public.email_jobs WHERE rappel_id=OLD.id AND (state='sending' OR (state='reserved' AND first_attempt_at IS NOT NULL))) THEN
      RAISE EXCEPTION 'Envoi en traitement : annulation ou modification trop tardive';
    END IF;
    IF EXISTS(SELECT 1 FROM public.email_jobs WHERE rappel_id=OLD.id AND state IN ('uncertain','review')) THEN
      RAISE EXCEPTION 'Envoi incertain : rapprochement requis avant toute modification';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    IF NEW.id<>OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.contact_id<>OLD.contact_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.sent_at IS DISTINCT FROM OLD.sent_at
      OR NEW.source IS DISTINCT FROM OLD.source OR NEW.type_rappel IS DISTINCT FROM OLD.type_rappel
      OR NEW.type_evenement IS DISTINCT FROM OLD.type_evenement OR NEW.destinataire IS DISTINCT FROM OLD.destinataire
      OR NEW.email_destinataire IS DISTINCT FROM OLD.email_destinataire OR NEW.ton IS DISTINCT FROM OLD.ton
      OR NEW.event_date IS DISTINCT FROM OLD.event_date OR NEW.event_description IS DISTINCT FROM OLD.event_description
      OR NEW.sujet_email IS DISTINCT FROM OLD.sujet_email OR OLD.statut='envoye' OR NEW.statut NOT IN ('programme','annule') THEN
      RAISE EXCEPTION 'Champs ou transition non autorisés';
    END IF;
    -- Les anciennes lignes invalides doivent tout de même pouvoir être annulées.
    IF NEW.statut='annule' AND (to_jsonb(NEW)-'statut')=(to_jsonb(OLD)-'statut') THEN
      UPDATE public.email_jobs SET state='cancelled',lease_until=NULL,updated_at=now() WHERE rappel_id=OLD.id AND state IN ('reserved','retryable');
      RETURN NEW;
    END IF;
  END IF;
  IF NEW.user_id IS DISTINCT FROM auth.uid() OR NEW.statut IS NULL OR NEW.statut NOT IN ('programme','annule')
    OR (TG_OP='INSERT' AND (NEW.statut<>'programme' OR NEW.sent_at IS NOT NULL
      OR abs(extract(epoch FROM (NEW.created_at-now())))>60)) THEN RAISE EXCEPTION 'État initial invalide'; END IF;
  SELECT * INTO v_contact FROM public.contacts WHERE id=NEW.contact_id AND user_id=NEW.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contact invalide'; END IF;
  IF char_length(coalesce(NEW.message,'')) NOT BETWEEN 1 AND 5000 OR char_length(coalesce(NEW.sujet_email,''))>200
    OR char_length(btrim(coalesce(NEW.message,'')))=0
    OR char_length(coalesce(NEW.event_description,''))>500 OR char_length(coalesce(NEW.ton,''))>40 THEN RAISE EXCEPTION 'Taille des champs invalide'; END IF;
  IF NEW.type_evenement NOT IN ('anniversaire','fete_prenomale','nouvel_an','noel','saint_valentin','fete_des_meres','fete_des_peres','paques','jour_special','mariage','naissance','autre')
    OR (NEW.ton IS NOT NULL AND NEW.ton NOT IN ('formel','familier','humoristique','poetique','beauf','vieux_francais'))
    OR coalesce(NEW.sujet_email,'') ~ '[\r\n]' THEN RAISE EXCEPTION 'Personnalisation non autorisée'; END IF;
  IF NEW.source NOT IN ('message_programme','rappel_auto') OR NEW.source IS NULL
    OR (NEW.source='rappel_auto' AND (NEW.destinataire<>'moi' OR NEW.email_destinataire IS NOT NULL)) THEN RAISE EXCEPTION 'Source ou destinataire non autorisé'; END IF;
  IF NEW.destinataire NOT IN ('moi','contact') THEN RAISE EXCEPTION 'Destinataire invalide'; END IF;
  IF NEW.source='message_programme' THEN
    IF NEW.type_rappel<>'jourj' OR char_length(coalesce(NEW.email_destinataire,''))>254
      OR NEW.email_destinataire !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      OR NEW.email_destinataire IS NULL THEN RAISE EXCEPTION 'Adresse ou type invalide'; END IF;
    IF NEW.destinataire='contact' AND lower(NEW.email_destinataire) IS DISTINCT FROM lower(v_contact.email) THEN RAISE EXCEPTION 'Adresse du contact invalide'; END IF;
    IF NEW.destinataire='moi' AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=NEW.user_id AND lower(email)=lower(NEW.email_destinataire)) THEN RAISE EXCEPTION 'Adresse utilisateur invalide'; END IF;
  END IF;
  IF NEW.statut='programme' AND (TG_OP='INSERT' OR NEW.date_envoi<>OLD.date_envoi OR OLD.statut='annule') THEN
    IF (TG_OP='INSERT' OR OLD.statut='annule') AND (SELECT count(*) FROM public.rappels WHERE user_id=NEW.user_id AND statut='programme')>=100 THEN RAISE EXCEPTION 'Limite de 100 rappels actifs atteinte'; END IF;
    IF NEW.date_envoi<v_today OR NEW.date_envoi>v_today+366 THEN RAISE EXCEPTION 'Date hors fenêtre autorisée'; END IF;
    v_month := date_trunc('month',NEW.date_envoi)::date;
    -- Ne pas rembourser à la suppression/annulation : cela empêcherait le contrôle.
    IF TG_OP='INSERT' OR v_month<>date_trunc('month',OLD.date_envoi)::date OR OLD.statut='annule' THEN
      INSERT INTO public.email_monthly_usage(user_id,month,used) VALUES(NEW.user_id,v_month,1)
        ON CONFLICT(user_id,month) DO UPDATE SET used=public.email_monthly_usage.used+1 RETURNING used INTO v_used;
      IF v_used>100 THEN RAISE EXCEPTION 'Limite de 100 rappels par mois atteinte'; END IF;
    END IF;
  END IF;
  -- Invalider les réservations pas encore transmises au prestataire.
  IF TG_OP='UPDATE' THEN UPDATE public.email_jobs SET state='cancelled',lease_until=NULL,updated_at=now()
    WHERE rappel_id=OLD.id AND state IN ('reserved','retryable') AND (NEW.statut='annule' OR NEW.message<>OLD.message OR NEW.date_envoi<>OLD.date_envoi); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_rappel_write BEFORE INSERT OR UPDATE OR DELETE ON public.rappels FOR EACH ROW EXECUTE FUNCTION public.guard_rappel_write();

-- Les RPC privilégiés n'ont jamais de droit PUBLIC, anon ou authenticated.
REVOKE ALL ON FUNCTION public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb),
  public.begin_email_job(uuid,uuid),public.finish_email_job(uuid,uuid,text,text),
  public.record_cron_run(text,uuid,date,text,boolean),public.record_email_webhook(text,text,text,timestamptz,uuid),
  public.my_email_status(),public.guard_contact_limit(),public.guard_rappel_write() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb),
  public.begin_email_job(uuid,uuid),public.finish_email_job(uuid,uuid,text,text),
  public.record_cron_run(text,uuid,date,text,boolean),public.record_email_webhook(text,text,text,timestamptz,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.my_email_status() TO authenticated;

COMMIT;
