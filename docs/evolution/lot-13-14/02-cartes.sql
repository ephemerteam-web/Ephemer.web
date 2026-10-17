-- PROPOSITION NON INSTALLÉE. Installation HUMAINE sur copie après 01-journal.sql.
-- Aucune modification des cartes individuelles ou des fonctions historiques Célébrations.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='60s';
DO $garde$ BEGIN
 IF to_regclass('ephemer_celebrations.cartes_collectives') IS NOT NULL
  OR to_regprocedure('ephemer_celebrations.partage_valide(uuid)') IS NULL
  OR to_regprocedure('ephemer_lot09.avatar_valide(jsonb)') IS NULL
  OR to_regclass('public.email_jobs') IS NULL THEN
  RAISE EXCEPTION 'Préalable absent ou installation déjà présente : arrêter et comparer le catalogue';
 END IF;
END $garde$;

CREATE TABLE ephemer_celebrations.cartes_collectives (
 id uuid PRIMARY KEY, celebration uuid NOT NULL UNIQUE REFERENCES ephemer_celebrations.celebrations(id),
 titre text NOT NULL CHECK(length(btrim(titre)) BETWEEN 1 AND 200),
 modele text NOT NULL CHECK(modele IN ('clair_de_lune','constellation','aurore')),
 responsable uuid NOT NULL REFERENCES ephemer_celebrations.participations(id),
 destinataire_email text NOT NULL CHECK(length(destinataire_email)<=254 AND destinataire_email=lower(btrim(destinataire_email)) AND destinataire_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 phase text NOT NULL DEFAULT 'ouverte' CHECK(phase IN ('ouverte','fermee')),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 9007199254740991),
 validation jsonb, empreinte text,
 CHECK((validation IS NULL)=(empreinte IS NULL))
);
CREATE TABLE ephemer_celebrations.carte_exclusions (
 carte uuid NOT NULL REFERENCES ephemer_celebrations.cartes_collectives ON DELETE CASCADE,
 -- Interdiction de sécurité stable ; jamais une relation sociale ou un droit de profil.
 compte uuid NOT NULL, PRIMARY KEY(carte,compte)
);
CREATE TABLE ephemer_celebrations.carte_invitations (
 carte uuid NOT NULL REFERENCES ephemer_celebrations.cartes_collectives ON DELETE CASCADE,
 participation uuid NOT NULL REFERENCES ephemer_celebrations.participations(id), generation bigint NOT NULL,
 PRIMARY KEY(carte,participation)
);
CREATE TABLE ephemer_celebrations.carte_contributions (
 carte uuid NOT NULL REFERENCES ephemer_celebrations.cartes_collectives ON DELETE CASCADE,
 auteur uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 participation uuid NOT NULL REFERENCES ephemer_celebrations.participations(id), generation bigint NOT NULL,
 contenu jsonb NOT NULL, masquee boolean NOT NULL DEFAULT false, PRIMARY KEY(carte,auteur)
);
CREATE TABLE ephemer_celebrations.carte_signalements (
 carte uuid NOT NULL REFERENCES ephemer_celebrations.cartes_collectives ON DELETE CASCADE,
 auteur uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE, cible uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(carte,auteur,cible),
 FOREIGN KEY(carte,cible) REFERENCES ephemer_celebrations.carte_contributions(carte,auteur) ON DELETE CASCADE
);
CREATE TABLE ephemer_celebrations.carte_versions (
 id uuid PRIMARY KEY, carte uuid NOT NULL REFERENCES ephemer_celebrations.cartes_collectives ON DELETE CASCADE,
 operation uuid NOT NULL, contenu jsonb, auteurs uuid[] NOT NULL,
 empreinte text NOT NULL, expire_at timestamptz NOT NULL, revoked_at timestamptz,
 lien uuid NOT NULL UNIQUE, secret_hash text NOT NULL UNIQUE CHECK(secret_hash ~ '^[0-9a-f]{64}$'),
 secret_chiffre jsonb NOT NULL, UNIQUE(carte,operation),
 CHECK(contenu IS NOT NULL OR revoked_at IS NOT NULL)
);
CREATE UNIQUE INDEX carte_version_active ON ephemer_celebrations.carte_versions(carte) WHERE revoked_at IS NULL;
CREATE TABLE ephemer_celebrations.carte_plans (
 id uuid PRIMARY KEY, carte uuid NOT NULL REFERENCES ephemer_celebrations.cartes_collectives ON DELETE CASCADE,
 organisateur uuid NOT NULL REFERENCES auth.users, empreinte text NOT NULL,
 publication timestamptz, publication_civile jsonb, envoi timestamptz, envoi_civil jsonb,
 publication_etat text NOT NULL CHECK(publication_etat IN ('programme','publie','annule','a_reprogrammer')),
 email_etat text NOT NULL CHECK(email_etat IN ('absent','programme','annule','a_reprogrammer')),
 version uuid REFERENCES ephemer_celebrations.carte_versions ON DELETE SET NULL,
 job uuid REFERENCES public.email_jobs ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(publication IS NOT NULL OR envoi IS NOT NULL), CHECK(envoi IS NULL OR publication IS NULL OR envoi>=publication)
);
CREATE INDEX carte_plans_echeances ON ephemer_celebrations.carte_plans(publication,envoi) WHERE publication_etat='programme' OR email_etat='programme';
CREATE TABLE ephemer_celebrations.carte_operations (
 carte uuid NOT NULL REFERENCES ephemer_celebrations.cartes_collectives ON DELETE CASCADE,
 acteur uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE, operation uuid NOT NULL,
 empreinte text NOT NULL, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(acteur,operation)
);
CREATE INDEX carte_operations_quota ON ephemer_celebrations.carte_operations(acteur,created_at);
DO $droits$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['cartes_collectives','carte_exclusions','carte_invitations','carte_contributions','carte_signalements','carte_versions','carte_plans','carte_operations'] LOOP
  EXECUTE format('ALTER TABLE ephemer_celebrations.%I ENABLE ROW LEVEL SECURITY',r);
  EXECUTE format('REVOKE ALL ON ephemer_celebrations.%I FROM PUBLIC,anon,authenticated,service_role',r);
 END LOOP;
END $droits$;

CREATE FUNCTION ephemer_celebrations.carte_objet(j jsonb,k text[]) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $f$
 SELECT jsonb_typeof(j)='object' AND (SELECT count(*) FROM jsonb_object_keys(j))=cardinality(k) AND NOT EXISTS(SELECT 1 FROM jsonb_object_keys(j) x WHERE NOT x=ANY(k));
$f$;
CREATE FUNCTION ephemer_celebrations.carte_texte(j jsonb,limite integer,requis boolean) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $f$
 SELECT coalesce(jsonb_typeof(j)='string' AND length(j#>>'{}')<=limite AND (NOT requis OR length(btrim(j#>>'{}',
 chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)))>0),false);
$f$;
ALTER TABLE ephemer_celebrations.cartes_collectives ADD CONSTRAINT carte_titre_valide CHECK(ephemer_celebrations.carte_texte(to_jsonb(titre),200,true));
CREATE FUNCTION ephemer_celebrations.carte_signature(j jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $f$
BEGIN
 IF NOT coalesce(ephemer_celebrations.carte_objet(j,ARRAY['message','signature','avatar']),false) THEN RETURN false; END IF;
 RETURN ephemer_celebrations.carte_texte(j->'message',2000,true)
  AND ephemer_celebrations.carte_texte(j->'signature',200,false)
  AND (j->'avatar'='null'::jsonb OR coalesce(ephemer_lot09.avatar_valide(j->'avatar'),false));
END $f$;
ALTER TABLE ephemer_celebrations.carte_contributions ADD CONSTRAINT carte_contenu_valide CHECK(ephemer_celebrations.carte_signature(contenu));
CREATE FUNCTION ephemer_celebrations.carte_empreinte(j jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $f$
 SELECT encode(extensions.digest(j::text,'sha256'),'hex');
$f$;
CREATE FUNCTION ephemer_celebrations.carte_verrou(c uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $f$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
 PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-celebration:'||c::text,0));
END $f$;
CREATE FUNCTION ephemer_celebrations.carte_exclue(k uuid,a uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $f$
 SELECT EXISTS(SELECT 1 FROM ephemer_celebrations.cartes_collectives c JOIN ephemer_celebrations.celebrations e ON e.id=c.celebration WHERE c.id=k AND
  (e.destinataire=a OR EXISTS(SELECT 1 FROM ephemer_celebrations.carte_exclusions x WHERE x.carte=k AND x.compte=a)
   OR EXISTS(SELECT 1 FROM auth.users u WHERE u.id=a AND u.email_confirmed_at IS NOT NULL AND lower(btrim(u.email))=c.destinataire_email)));
$f$;
CREATE FUNCTION ephemer_celebrations.carte_autorisee(k uuid,a uuid,organisateur boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $f$
 SELECT EXISTS(SELECT 1 FROM ephemer_celebrations.cartes_collectives c JOIN ephemer_celebrations.participations m ON m.celebration=c.celebration
 JOIN auth.users u ON u.id=m.compte WHERE c.id=k AND m.compte=a AND m.etat='active' AND (NOT organisateur OR m.role='organisateur')
 AND u.deleted_at IS NULL AND u.email_confirmed_at IS NOT NULL AND NOT u.is_anonymous
 AND ephemer_celebrations.lisible(c.celebration,a) AND NOT ephemer_celebrations.carte_exclue(k,a)
 AND coalesce((SELECT collective_enabled FROM public.email_delivery_control WHERE singleton),false));
$f$;
CREATE FUNCTION ephemer_celebrations.carte_arreter(k uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $f$
BEGIN
 UPDATE ephemer_celebrations.carte_plans SET publication_etat=CASE WHEN publication_etat='programme' THEN 'annule' ELSE publication_etat END,
 email_etat=CASE WHEN email_etat='programme' AND NOT EXISTS(SELECT 1 FROM public.email_jobs j WHERE j.id=job AND j.state IN ('sending','uncertain','review','accepted')) THEN 'annule' ELSE email_etat END WHERE carte=k;
 UPDATE public.email_jobs SET state='cancelled',lease_until=NULL,updated_at=now() WHERE kind='carte' AND source->>'carte'=k::text AND state IN ('reserved','retryable') AND first_attempt_at IS NULL;
END $f$;
CREATE FUNCTION ephemer_celebrations.carte_retirer(k uuid,a uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $f$
BEGIN
 UPDATE ephemer_celebrations.carte_versions SET revoked_at=coalesce(revoked_at,now()),contenu=NULL,secret_chiffre='{}'::jsonb,auteurs=array_remove(auteurs,a) WHERE carte=k AND a=ANY(auteurs);
 DELETE FROM ephemer_celebrations.carte_contributions WHERE carte=k AND auteur=a;
 DELETE FROM ephemer_celebrations.carte_signalements WHERE carte=k AND auteur=a;
 UPDATE ephemer_celebrations.cartes_collectives SET validation=NULL,empreinte=NULL,revision=revision+1 WHERE id=k;
 PERFORM ephemer_celebrations.carte_arreter(k);
END $f$;
CREATE FUNCTION ephemer_celebrations.carte_snapshot(k uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $f$
 SELECT jsonb_build_object('format',3,'renderVersion',3,'templateVersion',1,'templateId',c.modele,'title',c.titre,'contributions',
  coalesce((SELECT jsonb_agg(t.contenu ORDER BY t.participation) FROM ephemer_celebrations.carte_contributions t
   JOIN ephemer_celebrations.participations m ON m.id=t.participation AND m.compte=t.auteur AND m.generation=t.generation AND m.etat='active'
   WHERE t.carte=k AND NOT t.masquee AND NOT ephemer_celebrations.carte_exclue(k,t.auteur)),'[]'::jsonb))
 FROM ephemer_celebrations.cartes_collectives c WHERE c.id=k;
$f$;
-- Heures inexistantes refusées ; les deux instants d'une heure ambiguë sont choisis explicitement.
CREATE FUNCTION ephemer_celebrations.carte_horaire(j jsonb) RETURNS timestamptz LANGUAGE plpgsql STABLE SET search_path='' AS $f$
DECLARE civil timestamp; z text; i timestamptz; premier timestamptz; dernier timestamptz; choix text;
BEGIN
 IF NOT coalesce(ephemer_celebrations.carte_objet(j,ARRAY['date','time','timeZone','occurrence','instant']),false)
 OR jsonb_typeof(j->'date')<>'string' OR (j->>'date')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 OR jsonb_typeof(j->'time')<>'string' OR (j->>'time')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Horaire invalide' USING ERRCODE='22023'; END IF;
 z:=j->>'timeZone'; choix:=j->>'occurrence';
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=z) THEN RAISE EXCEPTION 'Fuseau invalide' USING ERRCODE='22023'; END IF;
 civil:=((j->>'date')||'T'||(j->>'time'))::timestamp;
 -- Vérifie les décalages voisins ; aucune normalisation silencieuse de PostgreSQL.
 FOR i IN SELECT DISTINCT (civil AT TIME ZONE 'UTC')-((probe AT TIME ZONE z)-(probe AT TIME ZONE 'UTC')) FROM generate_series((civil AT TIME ZONE 'UTC')-interval '48 hours',(civil AT TIME ZONE 'UTC')+interval '48 hours',interval '6 hours') probe LOOP
  IF i AT TIME ZONE z=civil THEN premier:=least(premier,i); dernier:=greatest(dernier,i); END IF;
 END LOOP;
 IF premier IS NULL OR (premier=dernier AND choix<>'unique') OR (premier<>dernier AND choix NOT IN ('premiere','seconde')) THEN RAISE EXCEPTION 'Heure inexistante ou choix d occurrence requis' USING ERRCODE='22023'; END IF;
 i:=CASE WHEN choix='seconde' THEN dernier ELSE premier END;
 IF i IS DISTINCT FROM (j->>'instant')::timestamptz THEN RAISE EXCEPTION 'Instant divergent' USING ERRCODE='22023'; END IF;
 RETURN i;
END $f$;

CREATE FUNCTION public.lire_carte_collective(p_celebration uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE a uuid:=ephemer_social.acteur(); c ephemer_celebrations.cartes_collectives; admin boolean; plan ephemer_celebrations.carte_plans; v ephemer_celebrations.carte_versions; j public.email_jobs;
BEGIN
 PERFORM ephemer_celebrations.carte_verrou(p_celebration);
 IF NOT ephemer_celebrations.lisible(p_celebration,a) THEN RAISE EXCEPTION 'Indisponible' USING ERRCODE='42501'; END IF;
 IF NOT coalesce((SELECT collective_enabled FROM public.email_delivery_control WHERE singleton),false) THEN RETURN jsonb_build_object('absente',true); END IF;
 IF EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations WHERE id=p_celebration AND destinataire=a) THEN RETURN jsonb_build_object('absente',true); END IF;
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE celebration=p_celebration;
 IF NOT FOUND THEN RETURN jsonb_build_object('absente',true); END IF;
 IF ephemer_celebrations.carte_exclue(c.id,a) THEN RETURN jsonb_build_object('absente',true); END IF;
 IF NOT ephemer_celebrations.carte_autorisee(c.id,a) THEN RAISE EXCEPTION 'Indisponible' USING ERRCODE='42501'; END IF;
 admin:=ephemer_celebrations.carte_autorisee(c.id,a,true);
 SELECT * INTO plan FROM ephemer_celebrations.carte_plans WHERE carte=c.id ORDER BY created_at DESC,id DESC LIMIT 1;
 SELECT * INTO j FROM public.email_jobs WHERE id=plan.job;
 SELECT * INTO v FROM ephemer_celebrations.carte_versions WHERE carte=c.id AND revoked_at IS NULL AND expire_at>now();
 RETURN jsonb_build_object('id',c.id,'revision',c.revision,'title',c.titre,'templateId',c.modele,'phase',c.phase,'validated',c.validation IS NOT NULL,'isOrganizer',admin,
 'mine',(SELECT contenu FROM ephemer_celebrations.carte_contributions WHERE carte=c.id AND auteur=a),
 'invited',EXISTS(SELECT 1 FROM ephemer_celebrations.carte_invitations i JOIN ephemer_celebrations.participations m ON m.id=i.participation AND m.generation=i.generation WHERE i.carte=c.id AND m.compte=a AND m.etat='active'),
 'responsible',coalesce((SELECT ephemer_social.identite(m.compte) FROM ephemer_celebrations.participations m JOIN ephemer_celebrations.taches t ON t.responsable=m.id WHERE t.id=c.id AND t.celebration=c.celebration AND m.etat='active' AND m.role='organisateur' AND NOT ephemer_celebrations.carte_exclue(c.id,m.compte)),'Responsable à choisir'),
 'responsibleParticipation',(SELECT m.id FROM ephemer_celebrations.participations m JOIN ephemer_celebrations.taches t ON t.responsable=m.id WHERE t.id=c.id AND t.celebration=c.celebration AND m.etat='active' AND m.role='organisateur' AND NOT ephemer_celebrations.carte_exclue(c.id,m.compte)),
 'nextAction',CASE WHEN c.phase='ouverte' THEN 'Compléter puis fermer les contributions' WHEN c.validation IS NULL THEN 'Valider l aperçu final' WHEN v.id IS NULL THEN 'Publier ou programmer la carte' ELSE 'Partager la carte ou suivre son envoi' END,
 'members',coalesce((SELECT jsonb_agg(jsonb_build_object('participation',m.id,'account',m.compte,'name',ephemer_social.identite(m.compte),'organizer',m.role='organisateur',
  'invited',EXISTS(SELECT 1 FROM ephemer_celebrations.carte_invitations i WHERE i.carte=c.id AND i.participation=m.id AND i.generation=m.generation),
  'signed',EXISTS(SELECT 1 FROM ephemer_celebrations.carte_contributions t WHERE t.carte=c.id AND t.auteur=m.compte))) FROM ephemer_celebrations.participations m WHERE m.celebration=p_celebration AND m.etat='active' AND NOT ephemer_celebrations.carte_exclue(c.id,m.compte)),'[]'::jsonb),
 'contributions',coalesce((SELECT jsonb_agg(jsonb_build_object('author',t.auteur,'name',ephemer_social.identite(t.auteur),'own',t.auteur=a,'hidden',t.masquee,'content',t.contenu) ORDER BY t.participation) FROM ephemer_celebrations.carte_contributions t WHERE t.carte=c.id AND (NOT t.masquee OR admin OR t.auteur=a)),'[]'::jsonb),
 'published',CASE WHEN v.id IS NULL THEN NULL ELSE jsonb_build_object('version',v.id,'content',v.contenu,'expiresAt',v.expire_at) END,
 'publicationState',coalesce(plan.publication_etat,CASE WHEN v.id IS NULL THEN 'Non publiée' ELSE 'Publiée' END),
 'emailState',CASE WHEN j.delivery_status='delivered' THEN 'livre' WHEN j.delivery_status IN ('bounced','complained','failed','suppressed') THEN 'echec' WHEN j.state='accepted' THEN 'accepte' WHEN j.state IN ('uncertain','review') OR (j.state='sending' AND j.lease_until<now()) THEN 'incertain' WHEN j.state='sending' THEN 'pris_en_charge' WHEN j.state='failed' THEN 'echec' WHEN j.state='cancelled' THEN 'annule' ELSE coalesce(plan.email_etat,'absent') END,
 'reports',coalesce((SELECT jsonb_agg(jsonb_build_object('author',s.auteur,'target',s.cible)) FROM ephemer_celebrations.carte_signalements s WHERE s.carte=c.id AND (admin OR s.auteur=a)),'[]'::jsonb));
END $f$;

CREATE FUNCTION public.commander_carte_collective(p_celebration uuid,p_commande jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE a uuid:=ephemer_social.acteur(); c ephemer_celebrations.cartes_collectives; m ephemer_celebrations.participations; cible ephemer_celebrations.participations;
 d jsonb; action text; attendu text[]; op uuid; rev bigint; h text; ancien ephemer_celebrations.carte_operations; admin boolean; contenu jsonb; target_author uuid; pub timestamptz; env timestamptz; v uuid;
BEGIN
 IF NOT coalesce((SELECT collective_enabled FROM public.email_delivery_control WHERE singleton),false) THEN RAISE EXCEPTION 'Fonction collective désactivée' USING ERRCODE='42501'; END IF;
 IF NOT coalesce(ephemer_celebrations.carte_objet(p_commande,ARRAY['operation','revision','data']),false) OR octet_length(p_commande::text)>32768 THEN RAISE EXCEPTION 'Commande invalide' USING ERRCODE='22023'; END IF;
 op:=(p_commande->>'operation')::uuid; rev:=(p_commande->>'revision')::bigint; d:=p_commande->'data'; action:=d->>'action';
 attendu:=CASE action WHEN 'creer' THEN ARRAY['action','id','title','templateId','recipientEmail'] WHEN 'inviter' THEN ARRAY['action','participation'] WHEN 'confirmer' THEN ARRAY['action','content','consent']
 WHEN 'masquer' THEN ARRAY['action','author'] WHEN 'retablir' THEN ARRAY['action','author'] WHEN 'retirer' THEN ARRAY['action','author'] WHEN 'signaler' THEN ARRAY['action','author']
 WHEN 'fermer' THEN ARRAY['action','confirmMissing'] WHEN 'rouvrir' THEN ARRAY['action'] WHEN 'valider' THEN ARRAY['action'] WHEN 'revoquer' THEN ARRAY['action']
 WHEN 'responsable' THEN ARRAY['action','participation'] WHEN 'annuler_programmation' THEN ARRAY['action'] WHEN 'programmer' THEN ARRAY['action','id','publication','email','address','consent'] ELSE NULL END;
 IF attendu IS NULL OR NOT coalesce(ephemer_celebrations.carte_objet(d,attendu),false) OR rev IS NULL OR op IS NULL THEN RAISE EXCEPTION 'Commande invalide' USING ERRCODE='22023'; END IF;
 PERFORM ephemer_celebrations.carte_verrou(p_celebration);
 IF NOT ephemer_celebrations.lisible(p_celebration,a) OR EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations WHERE id=p_celebration AND destinataire=a) THEN RAISE EXCEPTION 'Indisponible' USING ERRCODE='42501'; END IF;
 SELECT * INTO m FROM ephemer_celebrations.participations WHERE celebration=p_celebration AND compte=a AND etat='active'; admin:=m.role='organisateur';
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE celebration=p_celebration FOR UPDATE;
 IF c.id IS NOT NULL AND NOT ephemer_celebrations.carte_autorisee(c.id,a) THEN RAISE EXCEPTION 'Indisponible' USING ERRCODE='42501'; END IF;
 h:=ephemer_celebrations.carte_empreinte(p_commande||jsonb_build_object('celebration',p_celebration));
 SELECT * INTO ancien FROM ephemer_celebrations.carte_operations WHERE acteur=a AND operation=op;
 IF FOUND THEN IF ancien.empreinte<>h OR ancien.carte IS DISTINCT FROM c.id THEN RAISE EXCEPTION 'Opération réutilisée' USING ERRCODE='22023'; END IF; RETURN jsonb_build_object('ok',true,'id',c.id); END IF;
 IF (SELECT count(*) FROM ephemer_celebrations.carte_operations WHERE acteur=a AND created_at>now()-interval '1 hour')>=60 THEN RAISE EXCEPTION 'Limite atteinte' USING ERRCODE='P1130'; END IF;
 IF EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations WHERE id=p_celebration AND etat<>'active') AND action NOT IN ('retirer','revoquer','signaler','annuler_programmation') THEN RAISE EXCEPTION 'Préparatifs fermés' USING ERRCODE='42501'; END IF;
 IF action='creer' THEN
  IF NOT admin OR c.id IS NOT NULL OR rev<>0 OR lower(btrim(d->>'recipientEmail'))=(SELECT lower(btrim(email)) FROM auth.users WHERE id=a) THEN RAISE EXCEPTION 'Indisponible' USING ERRCODE='42501'; END IF;
  INSERT INTO ephemer_celebrations.cartes_collectives(id,celebration,titre,modele,responsable,destinataire_email) VALUES((d->>'id')::uuid,p_celebration,d->>'title',d->>'templateId',m.id,lower(btrim(d->>'recipientEmail'))) RETURNING * INTO c;
  -- La tâche existante de Célébrations porte la coordination, sans preuve de publication/envoi.
  INSERT INTO ephemer_celebrations.taches(id,celebration,auteur,titre,type,responsable) VALUES(c.id,p_celebration,a,'Préparer la carte collective','message',m.id);
  INSERT INTO ephemer_celebrations.carte_exclusions SELECT c.id,u.id FROM auth.users u WHERE u.email_confirmed_at IS NOT NULL AND lower(btrim(u.email))=c.destinataire_email ON CONFLICT DO NOTHING;
 ELSE
  IF c.id IS NULL OR rev<>c.revision THEN RAISE EXCEPTION 'Révision divergente' USING ERRCODE='40001'; END IF;
  IF action='confirmer' THEN
   IF c.phase<>'ouverte' OR d->'consent' IS DISTINCT FROM 'true'::jsonb OR NOT coalesce(ephemer_celebrations.carte_signature(d->'content'),false) OR NOT EXISTS(SELECT 1 FROM ephemer_celebrations.carte_invitations WHERE carte=c.id AND participation=m.id AND generation=m.generation) THEN RAISE EXCEPTION 'Contribution indisponible' USING ERRCODE='42501'; END IF;
   INSERT INTO ephemer_celebrations.carte_contributions(carte,auteur,participation,generation,contenu) VALUES(c.id,a,m.id,m.generation,d->'content') ON CONFLICT(carte,auteur) DO UPDATE SET contenu=excluded.contenu;
   UPDATE ephemer_celebrations.cartes_collectives SET validation=NULL,empreinte=NULL WHERE id=c.id; PERFORM ephemer_celebrations.carte_arreter(c.id);
  ELSIF action='retirer' THEN
   target_author:=(d->>'author')::uuid; IF NOT admin AND target_author<>a THEN RAISE EXCEPTION 'Indisponible' USING ERRCODE='42501'; END IF;
   PERFORM ephemer_celebrations.carte_retirer(c.id,target_author);
  ELSIF action='signaler' THEN
   IF (SELECT count(*) FROM ephemer_celebrations.carte_operations x WHERE x.carte=c.id AND x.acteur=a AND x.action='signaler' AND x.created_at>now()-interval '24 hours')>=3 THEN RAISE EXCEPTION 'Limite atteinte' USING ERRCODE='P1130'; END IF;
   INSERT INTO ephemer_celebrations.carte_signalements(carte,auteur,cible) VALUES(c.id,a,(d->>'author')::uuid);
   INSERT INTO ephemer_celebrations.notifications(celebration,compte,type) SELECT p_celebration,x.compte,'changement' FROM ephemer_celebrations.participations x WHERE x.celebration=p_celebration AND x.etat='active' AND x.role='organisateur' AND ephemer_celebrations.carte_autorisee(c.id,x.compte,true);
  ELSE
   IF NOT admin THEN RAISE EXCEPTION 'Indisponible' USING ERRCODE='42501'; END IF;
   IF action IN ('inviter','responsable') THEN
    SELECT * INTO cible FROM ephemer_celebrations.participations WHERE id=(d->>'participation')::uuid AND celebration=p_celebration AND etat='active';
    IF NOT FOUND OR NOT ephemer_celebrations.carte_autorisee(c.id,cible.compte) OR (action='responsable' AND cible.role<>'organisateur') THEN RAISE EXCEPTION 'Indisponible' USING ERRCODE='42501'; END IF;
    IF action='inviter' THEN
     IF c.phase<>'ouverte' THEN RAISE EXCEPTION 'Contributions fermées' USING ERRCODE='40001'; END IF;
     IF (SELECT count(*) FROM ephemer_celebrations.carte_operations x WHERE x.carte=c.id AND x.acteur=a AND x.action='inviter' AND x.created_at>now()-interval '24 hours')>=10 THEN RAISE EXCEPTION 'Limite atteinte' USING ERRCODE='P1130'; END IF;
     INSERT INTO ephemer_celebrations.carte_invitations VALUES(c.id,cible.id,cible.generation);
     INSERT INTO ephemer_celebrations.notifications(celebration,compte,type) VALUES(p_celebration,cible.compte,'changement');
    ELSE
     UPDATE ephemer_celebrations.cartes_collectives SET responsable=cible.id WHERE id=c.id;
     UPDATE ephemer_celebrations.taches SET responsable=cible.id,revision=revision+1 WHERE id=c.id AND celebration=p_celebration;
     PERFORM ephemer_celebrations.notifier(p_celebration,'tache',cible.compte);
    END IF;
   ELSIF action IN ('masquer','retablir') THEN
    target_author:=(d->>'author')::uuid;
    UPDATE ephemer_celebrations.carte_contributions SET masquee=(action='masquer') WHERE carte=c.id AND auteur=target_author;
    IF NOT FOUND THEN RAISE EXCEPTION 'Contribution indisponible' USING ERRCODE='42501'; END IF;
    IF action='masquer' THEN UPDATE ephemer_celebrations.carte_versions SET revoked_at=coalesce(revoked_at,now()) WHERE carte=c.id AND target_author=ANY(auteurs); END IF;
    UPDATE ephemer_celebrations.cartes_collectives SET validation=NULL,empreinte=NULL WHERE id=c.id; PERFORM ephemer_celebrations.carte_arreter(c.id);
   ELSIF action='fermer' THEN
    IF c.phase<>'ouverte' OR (d->'confirmMissing' IS DISTINCT FROM 'true'::jsonb AND EXISTS(SELECT 1 FROM ephemer_celebrations.carte_invitations i WHERE i.carte=c.id AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.carte_contributions t WHERE t.carte=c.id AND t.participation=i.participation))) THEN RAISE EXCEPTION 'Confirmer les signatures manquantes' USING ERRCODE='22023'; END IF;
    UPDATE ephemer_celebrations.cartes_collectives SET phase='fermee',validation=NULL,empreinte=NULL WHERE id=c.id;
   ELSIF action='rouvrir' THEN
    UPDATE ephemer_celebrations.cartes_collectives SET phase='ouverte',validation=NULL,empreinte=NULL WHERE id=c.id; PERFORM ephemer_celebrations.carte_arreter(c.id);
   ELSIF action='valider' THEN
    contenu:=ephemer_celebrations.carte_snapshot(c.id);
    IF c.phase<>'fermee' OR jsonb_array_length(contenu->'contributions') NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'Carte fermée non vide requise' USING ERRCODE='22023'; END IF;
    UPDATE ephemer_celebrations.cartes_collectives SET validation=contenu,empreinte=ephemer_celebrations.carte_empreinte(contenu) WHERE id=c.id;
   ELSIF action='revoquer' THEN
    UPDATE ephemer_celebrations.carte_versions SET revoked_at=coalesce(revoked_at,now()) WHERE carte=c.id; PERFORM ephemer_celebrations.carte_arreter(c.id);
   ELSIF action='annuler_programmation' THEN
    IF EXISTS(SELECT 1 FROM ephemer_celebrations.carte_plans p JOIN public.email_jobs j ON j.id=p.job WHERE p.carte=c.id AND j.state IN ('sending','uncertain','review','accepted')) THEN RAISE EXCEPTION 'Trop tard pour garantir l annulation' USING ERRCODE='40001'; END IF;
    PERFORM ephemer_celebrations.carte_arreter(c.id);
   ELSIF action='programmer' THEN
    IF c.phase<>'fermee' OR c.validation IS NULL OR c.empreinte<>ephemer_celebrations.carte_empreinte(ephemer_celebrations.carte_snapshot(c.id)) OR d->'consent' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Validation requise' USING ERRCODE='40001'; END IF;
    IF d->'publication'<>'null'::jsonb THEN pub:=ephemer_celebrations.carte_horaire(d->'publication'); END IF;
    IF d->'email'<>'null'::jsonb THEN env:=ephemer_celebrations.carte_horaire(d->'email'); END IF;
    IF (pub IS NULL AND env IS NULL) OR pub<now() OR env<now() OR pub>now()+interval '366 days' OR env>now()+interval '366 days' OR env<pub OR (env IS NOT NULL AND lower(btrim(d->>'address')) IS DISTINCT FROM c.destinataire_email) THEN RAISE EXCEPTION 'Programmation invalide' USING ERRCODE='22023'; END IF;
    IF EXISTS(SELECT 1 FROM ephemer_celebrations.carte_plans p JOIN public.email_jobs j ON j.id=p.job WHERE p.carte=c.id AND j.state IN ('sending','uncertain','review')) THEN RAISE EXCEPTION 'Rapprochement requis avant report' USING ERRCODE='40001'; END IF;
    SELECT id INTO v FROM ephemer_celebrations.carte_versions WHERE carte=c.id AND revoked_at IS NULL AND expire_at>coalesce(env,now()) AND empreinte=c.empreinte;
    IF pub IS NULL AND v IS NULL THEN RAISE EXCEPTION 'Publication accessible requise' USING ERRCODE='22023'; END IF;
    PERFORM ephemer_celebrations.carte_arreter(c.id);
    INSERT INTO ephemer_celebrations.carte_plans(id,carte,organisateur,empreinte,publication,publication_civile,envoi,envoi_civil,publication_etat,email_etat,version) VALUES((d->>'id')::uuid,c.id,a,c.empreinte,pub,d->'publication',env,d->'email',CASE WHEN pub IS NULL THEN 'publie' ELSE 'programme' END,CASE WHEN env IS NULL THEN 'absent' ELSE 'programme' END,CASE WHEN pub IS NULL THEN v ELSE NULL END);
   END IF;
  END IF;
  IF action<>'retirer' THEN UPDATE ephemer_celebrations.cartes_collectives SET revision=revision+1 WHERE id=c.id; END IF;
 END IF;
 INSERT INTO ephemer_celebrations.carte_operations(carte,acteur,operation,empreinte,action) VALUES(c.id,a,op,h,action);
 RETURN jsonb_build_object('ok',true,'id',c.id);
END $f$;

-- Publication privilégiée : le serveur vérifie le Bearer et fabrique le secret chiffré.
CREATE FUNCTION public.publier_carte_collective(p_carte uuid,p_acteur uuid,p_revision bigint,p_operation uuid,p_version uuid,p_lien uuid,p_hash text,p_chiffre jsonb,p_duree integer,p_plan uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE c ephemer_celebrations.cartes_collectives; e ephemer_celebrations.celebrations; v ephemer_celebrations.carte_versions; plan ephemer_celebrations.carte_plans; h text; ancien ephemer_celebrations.carte_operations;
BEGIN
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE id=p_carte;
 PERFORM ephemer_celebrations.carte_verrou(c.celebration);
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE id=p_carte FOR UPDATE;
 SELECT * INTO e FROM ephemer_celebrations.celebrations WHERE id=c.celebration;
 IF c.id IS NULL OR e.etat<>'active' OR NOT ephemer_celebrations.carte_autorisee(c.id,p_acteur,true) THEN RAISE EXCEPTION 'Indisponible' USING ERRCODE='42501'; END IF;
 h:=ephemer_celebrations.carte_empreinte(jsonb_build_object('action','publier','carte',p_carte,'revision',p_revision,'duree',p_duree,'plan',p_plan));
 SELECT * INTO ancien FROM ephemer_celebrations.carte_operations WHERE acteur=p_acteur AND operation=p_operation;
 IF FOUND AND (ancien.empreinte<>h OR ancien.carte<>p_carte OR ancien.action<>'publier') THEN RAISE EXCEPTION 'Opération réutilisée' USING ERRCODE='22023'; END IF;
 SELECT * INTO v FROM ephemer_celebrations.carte_versions WHERE carte=c.id AND operation=p_operation;
 IF FOUND THEN
  IF ancien.operation IS NULL THEN RAISE EXCEPTION 'Opération réutilisée' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('version',v.id,'revoked',v.revoked_at IS NOT NULL);
 END IF;
 IF p_plan IS NOT NULL THEN
  SELECT * INTO plan FROM ephemer_celebrations.carte_plans WHERE id=p_plan AND carte=c.id FOR UPDATE;
  IF NOT FOUND OR plan.organisateur<>p_acteur OR plan.publication_etat<>'programme' OR plan.publication>now() OR plan.empreinte IS DISTINCT FROM c.empreinte THEN RAISE EXCEPTION 'Programmation indisponible' USING ERRCODE='40001'; END IF;
  IF now()>plan.publication+interval '48 hours' THEN UPDATE ephemer_celebrations.carte_plans SET publication_etat='a_reprogrammer',email_etat=CASE WHEN email_etat='programme' THEN 'a_reprogrammer' ELSE email_etat END WHERE id=p_plan; RETURN jsonb_build_object('state','a_reprogrammer'); END IF;
 END IF;
 IF c.phase<>'fermee' OR c.validation IS NULL OR c.revision<>p_revision OR c.empreinte<>ephemer_celebrations.carte_empreinte(ephemer_celebrations.carte_snapshot(c.id)) OR p_duree NOT IN (7,30,90,365)
  OR NOT coalesce(ephemer_celebrations.carte_objet(p_chiffre,ARRAY['format','ciphertext','nonce','tag']),false) OR p_chiffre->>'format'<>'1' THEN RAISE EXCEPTION 'Validation ou enveloppe invalide' USING ERRCODE='40001'; END IF;
 UPDATE ephemer_celebrations.carte_versions SET revoked_at=coalesce(revoked_at,now()) WHERE carte=c.id;
 PERFORM ephemer_celebrations.carte_arreter(c.id);
 INSERT INTO ephemer_celebrations.carte_versions(id,carte,operation,contenu,auteurs,empreinte,expire_at,lien,secret_hash,secret_chiffre)
 SELECT p_version,c.id,p_operation,c.validation,array_agg(t.auteur ORDER BY t.participation),c.empreinte,now()+make_interval(days=>p_duree),p_lien,p_hash,p_chiffre FROM ephemer_celebrations.carte_contributions t WHERE t.carte=c.id AND NOT t.masquee;
 IF p_plan IS NOT NULL THEN UPDATE ephemer_celebrations.carte_plans SET publication_etat='publie',email_etat=CASE WHEN envoi IS NULL THEN 'absent' ELSE 'programme' END,version=p_version WHERE id=p_plan; END IF;
 UPDATE ephemer_celebrations.cartes_collectives SET revision=revision+1 WHERE id=c.id;
 INSERT INTO ephemer_celebrations.carte_operations(carte,acteur,operation,empreinte,action) VALUES(c.id,p_acteur,p_operation,h,'publier');
 RETURN jsonb_build_object('version',p_version,'revoked',false);
END $f$;

CREATE FUNCTION public.consulter_carte_collective(p_empreinte text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE c ephemer_celebrations.cartes_collectives; v ephemer_celebrations.carte_versions;
BEGIN
 IF p_empreinte !~ '^[0-9a-f]{64}$' THEN RETURN NULL; END IF;
 SELECT c0.* INTO c FROM ephemer_celebrations.cartes_collectives c0 JOIN ephemer_celebrations.carte_versions v0 ON v0.carte=c0.id WHERE v0.secret_hash=p_empreinte;
 IF c.id IS NULL THEN RETURN NULL; END IF;
 PERFORM ephemer_celebrations.carte_verrou(c.celebration);
 SELECT * INTO v FROM ephemer_celebrations.carte_versions WHERE carte=c.id AND secret_hash=p_empreinte AND revoked_at IS NULL AND expire_at>now();
 IF v.id IS NULL OR NOT EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations WHERE id=c.celebration AND etat NOT IN ('suspendue','supprimee'))
 OR NOT ephemer_celebrations.partage_valide(c.celebration) OR EXISTS(SELECT 1 FROM unnest(v.auteurs) a WHERE NOT ephemer_celebrations.carte_autorisee(c.id,a)) THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('content',v.contenu,'expiresAt',v.expire_at);
END $f$;

-- Nettoyage transactionnel, également pour les appels B historiques et les cascades Auth.
CREATE FUNCTION ephemer_celebrations.carte_membre_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE c record;
BEGIN
 IF TG_OP='UPDATE' AND OLD.role='organisateur' AND NEW.role<>'organisateur' THEN
  PERFORM ephemer_celebrations.carte_verrou(OLD.celebration);
  FOR c IN SELECT id FROM ephemer_celebrations.cartes_collectives WHERE celebration=OLD.celebration LOOP PERFORM ephemer_celebrations.carte_arreter(c.id); END LOOP;
 END IF;
 IF OLD.compte IS NOT NULL AND (TG_OP='DELETE' OR NEW.etat<>'active' OR NEW.compte IS DISTINCT FROM OLD.compte OR NEW.generation<>OLD.generation) THEN
  PERFORM ephemer_celebrations.carte_verrou(OLD.celebration);
  FOR c IN SELECT id FROM ephemer_celebrations.cartes_collectives WHERE celebration=OLD.celebration LOOP
   PERFORM ephemer_celebrations.carte_retirer(c.id,OLD.compte);
   DELETE FROM ephemer_celebrations.carte_invitations WHERE carte=c.id AND participation=OLD.id;
  END LOOP;
 END IF;
 RETURN NULL;
END $f$;
CREATE TRIGGER carte_membre_change AFTER UPDATE OR DELETE ON ephemer_celebrations.participations FOR EACH ROW EXECUTE FUNCTION ephemer_celebrations.carte_membre_change();
CREATE FUNCTION ephemer_celebrations.carte_auth_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE c record;
BEGIN
 IF NEW.email_confirmed_at IS NOT NULL THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
  FOR c IN SELECT id,celebration FROM ephemer_celebrations.cartes_collectives WHERE destinataire_email=lower(btrim(NEW.email)) LOOP
   PERFORM ephemer_celebrations.carte_verrou(c.celebration);
   INSERT INTO ephemer_celebrations.carte_exclusions VALUES(c.id,NEW.id) ON CONFLICT DO NOTHING;
   PERFORM ephemer_celebrations.carte_retirer(c.id,NEW.id);
  END LOOP;
 END IF;
 RETURN NULL;
END $f$;
CREATE TRIGGER carte_auth_change AFTER INSERT OR UPDATE OF email,email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION ephemer_celebrations.carte_auth_change();
CREATE FUNCTION ephemer_celebrations.carte_evenement_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE c record;
BEGIN
 PERFORM ephemer_celebrations.carte_verrou(NEW.id);
 FOR c IN SELECT id FROM ephemer_celebrations.cartes_collectives WHERE celebration=NEW.id LOOP
  IF NEW.destinataire IS NOT NULL AND NEW.destinataire IS DISTINCT FROM OLD.destinataire THEN INSERT INTO ephemer_celebrations.carte_exclusions VALUES(c.id,NEW.destinataire) ON CONFLICT DO NOTHING; PERFORM ephemer_celebrations.carte_retirer(c.id,NEW.destinataire); END IF;
  IF NEW.etat<>'active' THEN PERFORM ephemer_celebrations.carte_arreter(c.id); END IF;
  IF NEW.etat IN ('suspendue','supprimee') THEN UPDATE ephemer_celebrations.carte_versions SET revoked_at=coalesce(revoked_at,now()) WHERE carte=c.id; END IF;
  IF NEW.etat='supprimee' THEN DELETE FROM ephemer_celebrations.cartes_collectives WHERE id=c.id; END IF;
 END LOOP;
 RETURN NULL;
END $f$;
CREATE TRIGGER carte_evenement_change AFTER UPDATE OF etat,destinataire ON ephemer_celebrations.celebrations FOR EACH ROW EXECUTE FUNCTION ephemer_celebrations.carte_evenement_change();
CREATE FUNCTION ephemer_celebrations.carte_avant_suppression() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 PERFORM ephemer_celebrations.carte_arreter(OLD.id);
 DELETE FROM ephemer_celebrations.taches WHERE id=OLD.id AND celebration=OLD.celebration AND type='message';
 UPDATE public.email_jobs SET payload='{}',source='{}' WHERE kind='carte' AND source->>'carte'=OLD.id::text;
 RETURN OLD;
END $f$;
CREATE TRIGGER carte_avant_suppression BEFORE DELETE ON ephemer_celebrations.cartes_collectives FOR EACH ROW EXECUTE FUNCTION ephemer_celebrations.carte_avant_suppression();

CREATE FUNCTION public.exporter_mes_contributions_collectives(p_celebration uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE a uuid:=ephemer_social.acteur(); c ephemer_celebrations.cartes_collectives;
BEGIN
 PERFORM ephemer_celebrations.carte_verrou(p_celebration);
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE celebration=p_celebration;
 IF NOT coalesce(ephemer_celebrations.carte_autorisee(c.id,a),false) THEN RAISE EXCEPTION 'Indisponible' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('id',c.id,'title',c.titre,'contributions',coalesce((SELECT jsonb_agg(contenu) FROM ephemer_celebrations.carte_contributions WHERE carte=c.id AND auteur=a),'[]'::jsonb));
END $f$;

DO $fermer$ DECLARE r record; BEGIN
 FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ephemer_celebrations' AND p.proname LIKE 'carte_%' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',r.signature);
 END LOOP;
END $fermer$;
REVOKE ALL ON FUNCTION public.lire_carte_collective(uuid),public.commander_carte_collective(uuid,jsonb),public.publier_carte_collective(uuid,uuid,bigint,uuid,uuid,uuid,text,jsonb,integer,uuid),public.consulter_carte_collective(text),public.exporter_mes_contributions_collectives(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lire_carte_collective(uuid),public.commander_carte_collective(uuid,jsonb),public.exporter_mes_contributions_collectives(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publier_carte_collective(uuid,uuid,bigint,uuid,uuid,uuid,text,jsonb,integer,uuid),public.consulter_carte_collective(text) TO service_role;
COMMIT;
