-- PROPOSITION NON INSTALLÉE. Même journal email_jobs, aucun deuxième transport ni cron.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $garde$ BEGIN
 IF to_regclass('ephemer_celebrations.carte_plans') IS NULL OR to_regprocedure('public.reserver_email_carte(uuid,jsonb)') IS NOT NULL THEN RAISE EXCEPTION 'Préalable absent ou extension déjà présente'; END IF;
END $garde$;
ALTER TABLE public.email_jobs DROP CONSTRAINT email_jobs_kind_check;
ALTER TABLE public.email_jobs ADD CONSTRAINT email_jobs_kind_check CHECK(kind IN ('rappel','recap','newsletter','carte'));
CREATE INDEX email_carte_quota ON public.email_jobs(user_id,first_attempt_at) WHERE kind='carte';

CREATE FUNCTION ephemer_celebrations.carte_envoi_valide(p_plan uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $f$
 SELECT EXISTS(SELECT 1 FROM ephemer_celebrations.carte_plans p JOIN ephemer_celebrations.cartes_collectives c ON c.id=p.carte
 JOIN ephemer_celebrations.carte_versions v ON v.id=p.version JOIN ephemer_celebrations.celebrations e ON e.id=c.celebration
 WHERE p.id=p_plan AND p.email_etat='programme' AND p.publication_etat='publie' AND p.envoi<=now() AND p.envoi>=now()-interval '48 hours'
 AND e.etat='active' AND c.phase='fermee' AND c.validation IS NOT NULL AND p.empreinte=c.empreinte AND v.empreinte=c.empreinte
 AND v.revoked_at IS NULL AND v.expire_at>now() AND ephemer_celebrations.carte_autorisee(c.id,p.organisateur,true)
 AND NOT EXISTS(SELECT 1 FROM unnest(v.auteurs) a WHERE NOT ephemer_celebrations.carte_autorisee(c.id,a)));
$f$;

CREATE FUNCTION public.lire_echeances_cartes(p_limite integer DEFAULT 25) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 IF p_limite NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Limite invalide'; END IF;
 IF NOT coalesce((SELECT collective_enabled FROM public.email_delivery_control WHERE singleton),false) THEN RETURN '[]'::jsonb; END IF;
 -- Aucun contenu personnel. Les opérations privilégiées revérifient sous verrou.
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('plan',id,'carte',carte,'publication',publication_etat='programme','envoi',email_etat='programme')) FROM
 (SELECT id,carte,publication_etat,email_etat FROM ephemer_celebrations.carte_plans WHERE
  (publication_etat='programme' AND publication<=now()) OR (email_etat='programme' AND envoi<=now() AND (SELECT enabled FROM public.email_delivery_control WHERE singleton) AND (job IS NULL OR EXISTS(SELECT 1 FROM public.email_jobs j WHERE j.id=job AND (j.state IN ('reserved','retryable') OR j.state='sending' AND j.lease_until<now())))) ORDER BY least(publication,envoi),id LIMIT p_limite) p),'[]'::jsonb);
END $f$;

CREATE FUNCTION public.lire_enveloppe_carte(p_plan uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE p ephemer_celebrations.carte_plans; c ephemer_celebrations.cartes_collectives; v ephemer_celebrations.carte_versions;
BEGIN
 SELECT * INTO p FROM ephemer_celebrations.carte_plans WHERE id=p_plan;
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE id=p.carte;
 PERFORM ephemer_celebrations.carte_verrou(c.celebration);
 IF NOT ephemer_celebrations.carte_envoi_valide(p_plan) THEN RETURN NULL; END IF;
 SELECT * INTO v FROM ephemer_celebrations.carte_versions WHERE id=p.version;
 RETURN jsonb_build_object('celebration',c.celebration,'carte',c.id,'version',v.id,'lien',v.lien,'secretChiffre',v.secret_chiffre,'address',c.destinataire_email,'dueAt',p.envoi);
END $f$;

CREATE FUNCTION public.reserver_email_carte(p_plan uuid,p_payload_chiffre jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE p ephemer_celebrations.carte_plans; c ephemer_celebrations.cartes_collectives; j public.email_jobs; jeton uuid;
BEGIN
 IF NOT coalesce((SELECT enabled AND collective_enabled FROM public.email_delivery_control WHERE singleton),false) THEN RETURN jsonb_build_object('state','busy'); END IF;
 SELECT * INTO p FROM ephemer_celebrations.carte_plans WHERE id=p_plan;
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE id=p.carte;
 IF c.id IS NULL THEN RETURN jsonb_build_object('state','cancelled'); END IF;
 PERFORM ephemer_celebrations.carte_verrou(c.celebration);
 PERFORM pg_advisory_xact_lock(hashtextextended(p.organisateur::text,47));
 SELECT * INTO p FROM ephemer_celebrations.carte_plans WHERE id=p_plan FOR UPDATE;
 SELECT * INTO j FROM public.email_jobs WHERE job_key='carte/'||p_plan::text FOR UPDATE;
 IF j.id IS NOT NULL THEN
  IF j.state='accepted' THEN RETURN jsonb_build_object('state','accepted'); END IF;
  IF j.state IN ('sending','uncertain','review') OR j.first_attempt_at IS NOT NULL AND j.state<>'retryable' THEN
   IF j.lease_until<now() AND j.state='sending' THEN UPDATE public.email_jobs SET state='uncertain',updated_at=now() WHERE id=j.id; END IF;
   RETURN jsonb_build_object('state',CASE WHEN j.state='sending' AND j.lease_until>=now() THEN 'busy' ELSE 'uncertain' END);
  END IF;
  IF j.state IN ('cancelled','failed','expired') THEN RETURN jsonb_build_object('state',CASE WHEN j.state='failed' THEN 'failed' ELSE 'cancelled' END); END IF;
  IF j.lease_until>now() THEN RETURN jsonb_build_object('state','busy'); END IF;
 END IF;
 IF p.envoi>now() THEN RETURN jsonb_build_object('state','waiting'); END IF;
 IF p.envoi<now()-interval '48 hours' THEN
  UPDATE ephemer_celebrations.carte_plans SET email_etat='a_reprogrammer' WHERE id=p_plan;
  IF j.id IS NOT NULL THEN UPDATE public.email_jobs SET state='expired',lease_until=NULL,updated_at=now() WHERE id=j.id; END IF;
  RETURN jsonb_build_object('state','a_reprogrammer');
 END IF;
 IF NOT ephemer_celebrations.carte_envoi_valide(p_plan) THEN RETURN jsonb_build_object('state','cancelled'); END IF;
 IF j.id IS NULL THEN
  IF NOT coalesce(ephemer_celebrations.carte_objet(p_payload_chiffre,ARRAY['format','ciphertext','nonce','tag']),false) OR p_payload_chiffre->>'format'<>'1' OR octet_length(p_payload_chiffre::text)>131072 THEN RAISE EXCEPTION 'Enveloppe invalide'; END IF;
  INSERT INTO public.email_jobs(job_key,kind,user_id,event_keys,source,payload,expires_on,state)
  VALUES('carte/'||p_plan::text,'carte',p.organisateur,'{}',jsonb_build_object('carte',p.carte,'plan',p.id,'version',p.version,'destinataire',encode(extensions.digest(c.destinataire_email,'sha256'),'hex')),p_payload_chiffre,(p.envoi AT TIME ZONE 'UTC')::date+2,'reserved') RETURNING * INTO j;
 END IF;
 jeton:=gen_random_uuid();
 UPDATE public.email_jobs SET state='reserved',token=jeton,first_attempt_at=NULL,lease_until=now()+interval '10 minutes',updated_at=now() WHERE id=j.id;
 UPDATE ephemer_celebrations.carte_plans SET job=j.id WHERE id=p_plan;
 RETURN jsonb_build_object('state','reserved','id',j.id,'token',jeton,'dueAt',p.envoi,'encryptedPayload',j.payload);
END $f$;

CREATE FUNCTION public.engager_email_carte(p_job uuid,p_token uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE j public.email_jobs; p ephemer_celebrations.carte_plans; c ephemer_celebrations.cartes_collectives;
BEGIN
 IF NOT coalesce((SELECT enabled AND collective_enabled FROM public.email_delivery_control WHERE singleton),false) THEN RETURN jsonb_build_object('ready',false,'state','busy'); END IF;
 SELECT * INTO j FROM public.email_jobs WHERE id=p_job AND kind='carte';
 SELECT * INTO p FROM ephemer_celebrations.carte_plans WHERE id=(j.source->>'plan')::uuid;
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE id=p.carte;
 IF c.id IS NULL THEN RETURN jsonb_build_object('ready',false,'state','cancelled'); END IF;
 PERFORM ephemer_celebrations.carte_verrou(c.celebration);
 PERFORM pg_advisory_xact_lock(hashtextextended(j.user_id::text,47));
 SELECT * INTO j FROM public.email_jobs WHERE id=p_job FOR UPDATE;
 IF j.state<>'reserved' OR j.token IS DISTINCT FROM p_token OR j.lease_until<now() THEN RETURN jsonb_build_object('ready',false,'state','busy'); END IF;
 IF p.envoi<now()-interval '48 hours' THEN
  UPDATE public.email_jobs SET state='expired',lease_until=NULL,updated_at=now() WHERE id=p_job;
  UPDATE ephemer_celebrations.carte_plans SET email_etat='a_reprogrammer' WHERE id=p.id;
  RETURN jsonb_build_object('ready',false,'state','a_reprogrammer');
 END IF;
 IF NOT ephemer_celebrations.carte_envoi_valide(p.id) OR p.version::text IS DISTINCT FROM j.source->>'version' THEN
  UPDATE public.email_jobs SET state='cancelled',lease_until=NULL,updated_at=now() WHERE id=p_job; RETURN jsonb_build_object('ready',false,'state','cancelled');
 END IF;
 -- 10 engagements / organisateur / 24 h ; 1 / adresse de référence / heure, même entre célébrations.
 IF (SELECT count(*) FROM public.email_attempts a JOIN public.email_jobs x ON x.id=a.job_id WHERE x.kind='carte' AND x.user_id=j.user_id AND a.started_at>now()-interval '24 hours')>=10
 OR EXISTS(SELECT 1 FROM public.email_attempts a JOIN public.email_jobs x ON x.id=a.job_id WHERE x.kind='carte' AND x.source->>'destinataire'=j.source->>'destinataire' AND a.started_at>now()-interval '1 hour') THEN
  UPDATE public.email_jobs SET state='retryable',lease_until=NULL,updated_at=now() WHERE id=p_job; RETURN jsonb_build_object('ready',false,'state','retryable');
 END IF;
 UPDATE public.email_jobs SET state='sending',first_attempt_at=now(),lease_until=now()+interval '10 minutes',updated_at=now() WHERE id=p_job;
 INSERT INTO public.email_attempts(job_id,token) VALUES(p_job,p_token);
 RETURN jsonb_build_object('ready',true,'state','sending');
END $f$;

-- Les appels génériques ne doivent jamais contourner les contrôles du nouveau canal.
ALTER FUNCTION public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb) RENAME TO claim_email_job_socle;
CREATE FUNCTION public.claim_email_job(p_key text,p_kind text,p_user_id uuid,p_rappel_id bigint,p_notification_ids uuid[],p_event_keys text[],p_source jsonb,p_expires_on date,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 IF p_kind NOT IN ('rappel','recap','newsletter') THEN RAISE EXCEPTION 'Canal dédié requis'; END IF;
 RETURN public.claim_email_job_socle(p_key,p_kind,p_user_id,p_rappel_id,p_notification_ids,p_event_keys,p_source,p_expires_on,p_payload);
END $f$;
ALTER FUNCTION public.begin_email_job(uuid,uuid) RENAME TO begin_email_job_socle;
CREATE FUNCTION public.begin_email_job(p_job_id uuid,p_token uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 IF EXISTS(SELECT 1 FROM public.email_jobs WHERE id=p_job_id AND kind='carte') THEN
  RETURN public.engager_email_carte(p_job_id,p_token);
 END IF;
 RETURN public.begin_email_job_socle(p_job_id,p_token);
END $f$;
-- Les anciennes fonctions renommées restent privées au propriétaire SQL, sans accès service direct.
REVOKE ALL ON FUNCTION public.claim_email_job_socle(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb),public.begin_email_job_socle(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION ephemer_celebrations.carte_envoi_valide(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.lire_echeances_cartes(integer),public.lire_enveloppe_carte(uuid),public.reserver_email_carte(uuid,jsonb),public.engager_email_carte(uuid,uuid),public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb),public.begin_email_job(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lire_echeances_cartes(integer),public.lire_enveloppe_carte(uuid),public.reserver_email_carte(uuid,jsonb),public.engager_email_carte(uuid,uuid),public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb),public.begin_email_job(uuid,uuid) TO service_role;
COMMIT;
