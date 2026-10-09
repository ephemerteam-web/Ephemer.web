-- Ephemer 10A — PROPOSITION NON APPLIQUEE — 9 octobre 2026.
-- Validation/application humaines exclusivement. Lire README.md avant execution.
-- Pas de modification d'auth.users ; pas de collecte des carnets dans une table publique.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preconditions$
BEGIN
  IF current_setting('server_version_num')::integer < 170000
     OR to_regclass('auth.users') IS NULL OR to_regclass('public.contacts') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns
       WHERE table_schema='auth' AND table_name='users' AND column_name='email_confirmed_at')
     OR NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
       WHERE e.extname='pgcrypto' AND n.nspname='extensions') THEN
    RAISE EXCEPTION 'Contrat PostgreSQL/Auth/contacts/pgcrypto absent : revoir le dossier';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='ephemer_social')
     OR to_regclass('public.notifications_etoiles') IS NOT NULL
     OR to_regprocedure('public.commander_etoiles(text,jsonb,uuid)') IS NOT NULL
     OR to_regprocedure('public.lire_etoiles(text,uuid,integer)') IS NOT NULL
     OR to_regprocedure('public.reconnaitre_etoiles(bigint,integer)') IS NOT NULL
     OR to_regprocedure('public.lire_associations_etoiles(bigint,integer)') IS NOT NULL
     OR to_regprocedure('public.exporter_etoiles(text,text,integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'Lot social deja present : inspecter, ne pas rejouer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.contacts'::regclass
     AND contype='u' AND pg_get_constraintdef(oid)='UNIQUE (user_id, id)') THEN
    RAISE EXCEPTION 'Cle contacts(user_id,id) requise';
  END IF;
END;
$preconditions$;

CREATE SCHEMA ephemer_social;
REVOKE ALL ON SCHEMA ephemer_social FROM PUBLIC,anon,authenticated,service_role;
-- Schema NON expose a PostgREST. Usage uniquement pour les wrappers invoker.
GRANT USAGE ON SCHEMA ephemer_social TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA ephemer_social REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA ephemer_social REVOKE ALL ON TABLES FROM PUBLIC,anon,authenticated,service_role;
-- Accelere les verifications du carnet sans modifier ses donnees ni Auth.
CREATE INDEX lot10a_contacts_email ON public.contacts(user_id,lower(btrim(email,E' \t\r\n')));

CREATE TABLE ephemer_social.relations_etoiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compte_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compte_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  etat text NOT NULL CHECK (etat IN ('active','retiree')),
  origine text NOT NULL CHECK (origine IN ('reciproque','demande')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (compte_a < compte_b), UNIQUE(compte_a,compte_b)
);
CREATE INDEX lot10a_relations_b ON ephemer_social.relations_etoiles(compte_b,id);

CREATE TABLE ephemer_social.blocages_etoiles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cible_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,cible_id), CHECK (user_id <> cible_id)
);

CREATE TABLE ephemer_social.demandes_etoiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auteur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Adresse normalisee privee ; jamais exposee au destinataire ou a un annuaire.
  adresse_cible text NOT NULL CHECK (length(adresse_cible) BETWEEN 3 AND 320),
  destinataire_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  etat text NOT NULL DEFAULT 'en_attente' CHECK (etat IN ('en_attente','acceptee','refusee','annulee')),
  -- Une demande neutralisee par blocage reste visuellement en attente pour son auteur.
  neutralisee boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '30 days'),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (auteur_id IS DISTINCT FROM destinataire_id), CHECK (expires_at > created_at)
);
CREATE INDEX lot10a_demandes_auteur ON ephemer_social.demandes_etoiles(auteur_id,id);
CREATE INDEX lot10a_demandes_destinataire ON ephemer_social.demandes_etoiles(destinataire_id,id);
CREATE INDEX lot10a_demandes_adresse ON ephemer_social.demandes_etoiles(adresse_cible)
  WHERE destinataire_id IS NULL AND etat='en_attente';

CREATE TABLE ephemer_social.liens_etoiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empreinte text NOT NULL UNIQUE CHECK (empreinte ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '7 days'),
  revoque boolean NOT NULL DEFAULT false,
  CHECK (expires_at > created_at)
);
CREATE INDEX lot10a_liens_proprietaire ON ephemer_social.liens_etoiles(user_id,id);

CREATE TABLE ephemer_social.contacts_etoiles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id bigint NOT NULL,
  etoile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id,contact_id),
  FOREIGN KEY(user_id,contact_id) REFERENCES public.contacts(user_id,id) ON DELETE CASCADE,
  CHECK (user_id <> etoile_id)
);

CREATE TABLE ephemer_social.operations_etoiles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  action text NOT NULL,
  empreinte text NOT NULL,
  resultat jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,operation_id)
);
-- Quota transactionnel : nouvelles demandes seulement, pas les retries/consultations.
CREATE TABLE ephemer_social.quotas_demandes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jour date NOT NULL,
  total integer NOT NULL CHECK (total BETWEEN 0 AND 20),
  PRIMARY KEY(user_id,jour)
);

CREATE TABLE public.notifications_etoiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('demande_etoile','nouvelle_etoile')),
  demande_id uuid REFERENCES ephemer_social.demandes_etoiles(id) ON DELETE CASCADE,
  relation_id uuid REFERENCES ephemer_social.relations_etoiles(id) ON DELETE CASCADE,
  lue boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((type='demande_etoile' AND demande_id IS NOT NULL AND relation_id IS NULL)
      OR (type='nouvelle_etoile' AND relation_id IS NOT NULL AND demande_id IS NULL)),
  UNIQUE(user_id,type,demande_id), UNIQUE(user_id,type,relation_id)
);
CREATE INDEX lot10a_notifications_proprietaire ON public.notifications_etoiles(user_id,id);
ALTER TABLE public.notifications_etoiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications_etoiles FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.notifications_etoiles TO authenticated;
GRANT UPDATE(lue) ON public.notifications_etoiles TO authenticated;
CREATE POLICY lot10a_notif_select ON public.notifications_etoiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot10a_notif_update ON public.notifications_etoiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);

-- RLS sans policies et aucun privilege client sur les tables privees : refus direct.
DO $tables$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='ephemer_social' LOOP
    EXECUTE format('ALTER TABLE ephemer_social.%I ENABLE ROW LEVEL SECURITY',t.tablename);
    EXECUTE format('REVOKE ALL ON ephemer_social.%I FROM PUBLIC,anon,authenticated,service_role',t.tablename);
  END LOOP;
END;
$tables$;

CREATE FUNCTION ephemer_social.normaliser_email(v text) RETURNS text
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT lower(btrim(v,E' \t\r\n'));
$fn$;

CREATE FUNCTION ephemer_social.acteur() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE v uuid := auth.uid();
BEGIN
  IF v IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=v
      AND u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL
      AND u.deleted_at IS NULL AND NOT u.is_anonymous) THEN
    RAISE EXCEPTION 'Connexion avec adresse verifiee requise' USING ERRCODE='28000';
  END IF;
  RETURN v;
END;
$fn$;

CREATE FUNCTION ephemer_social.identite(v uuid) RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT coalesce(nullif(left(btrim(p.prenom),80),''),'Une etoile')
    FROM (SELECT 1) x LEFT JOIN public.profiles p ON p.id=v;
$fn$;

CREATE FUNCTION ephemer_social.bloquee(a uuid,b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT EXISTS (SELECT 1 FROM ephemer_social.blocages_etoiles
    WHERE (user_id=a AND cible_id=b) OR (user_id=b AND cible_id=a));
$fn$;

CREATE FUNCTION ephemer_social.associer_contacts(a uuid,b uuid) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  INSERT INTO ephemer_social.contacts_etoiles(user_id,contact_id,etoile_id)
  SELECT c.user_id,c.id,u.id FROM public.contacts c
  JOIN auth.users u ON ephemer_social.normaliser_email(u.email)=ephemer_social.normaliser_email(c.email)
    AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL AND NOT u.is_anonymous
  WHERE (c.user_id=a AND u.id=b) OR (c.user_id=b AND u.id=a)
  ON CONFLICT(user_id,contact_id) DO NOTHING;
$fn$;

CREATE FUNCTION ephemer_social.activer(a uuid,b uuid,origine_relation text) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE r ephemer_social.relations_etoiles; nouvelle boolean := false;
BEGIN
  IF a=b OR ephemer_social.bloquee(a,b) THEN
    RAISE EXCEPTION 'Relation indisponible' USING ERRCODE='42501';
  END IF;
  SELECT * INTO r FROM ephemer_social.relations_etoiles WHERE compte_a=least(a,b) AND compte_b=greatest(a,b);
  IF r.id IS NULL THEN
    INSERT INTO ephemer_social.relations_etoiles(compte_a,compte_b,etat,origine)
      VALUES(least(a,b),greatest(a,b),'active',origine_relation) RETURNING * INTO r;
    nouvelle:=true;
  ELSIF r.etat<>'active' THEN
    IF origine_relation='reciproque' THEN RETURN NULL; END IF;
    UPDATE ephemer_social.relations_etoiles SET etat='active',origine='demande',
      revision=revision+1,updated_at=clock_timestamp() WHERE id=r.id RETURNING * INTO r;
    nouvelle:=true;
  END IF;
  PERFORM ephemer_social.associer_contacts(a,b);
  UPDATE ephemer_social.demandes_etoiles SET etat='annulee',updated_at=clock_timestamp()
    WHERE etat='en_attente' AND ((auteur_id=a AND destinataire_id=b) OR (auteur_id=b AND destinataire_id=a));
  DELETE FROM public.notifications_etoiles n USING ephemer_social.demandes_etoiles d
    WHERE n.demande_id=d.id AND d.etat<>'en_attente';
  IF nouvelle THEN
    -- Supprime la notification de l'ancienne activation avant un nouveau lien accepte.
    DELETE FROM public.notifications_etoiles WHERE relation_id=r.id;
    INSERT INTO public.notifications_etoiles(user_id,type,relation_id)
      VALUES(a,'nouvelle_etoile',r.id),(b,'nouvelle_etoile',r.id);
  END IF;
  RETURN r.id;
END;
$fn$;

CREATE FUNCTION ephemer_social.preparer_reception(a uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE adresse text;
BEGIN
  SELECT ephemer_social.normaliser_email(email) INTO STRICT adresse FROM auth.users WHERE id=a;
  UPDATE ephemer_social.demandes_etoiles SET destinataire_id=a,
    neutralisee=ephemer_social.bloquee(auteur_id,a),updated_at=clock_timestamp()
    WHERE destinataire_id IS NULL AND adresse_cible=adresse AND auteur_id<>a
      AND etat='en_attente' AND expires_at>now();
  INSERT INTO public.notifications_etoiles(user_id,type,demande_id)
    SELECT a,'demande_etoile',id FROM ephemer_social.demandes_etoiles
    WHERE destinataire_id=a AND etat='en_attente' AND NOT neutralisee AND expires_at>now()
      AND NOT ephemer_social.bloquee(auteur_id,a)
    ON CONFLICT(user_id,type,demande_id) DO NOTHING;
  DELETE FROM public.notifications_etoiles n USING ephemer_social.demandes_etoiles d
    WHERE n.demande_id=d.id AND (d.etat<>'en_attente' OR d.expires_at<=now()
      OR d.neutralisee OR ephemer_social.bloquee(d.auteur_id,d.destinataire_id));
END;
$fn$;

CREATE FUNCTION ephemer_social.reconnaitre(apres bigint,limite integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); adresse text; b uuid; r uuid; compteur integer:=0;
  fiches bigint[]; dernier bigint; suite boolean;
BEGIN
  IF limite IS NULL OR limite NOT BETWEEN 1 AND 100 OR (apres IS NOT NULL AND apres<0) THEN
    RAISE EXCEPTION 'Lecture invalide' USING ERRCODE='22023';
  END IF;
  -- Verrou global explicite pour cette premiere version : voir capacite dans README.
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
  SELECT ephemer_social.normaliser_email(email) INTO STRICT adresse FROM auth.users WHERE id=a;
  PERFORM ephemer_social.preparer_reception(a);
  SELECT array_agg(id ORDER BY id),max(id) INTO fiches,dernier FROM (
    SELECT id FROM public.contacts WHERE user_id=a AND (apres IS NULL OR id>apres)
      ORDER BY id LIMIT limite
  ) page;
  FOR b IN
    SELECT DISTINCT u.id FROM public.contacts c JOIN auth.users u
      ON ephemer_social.normaliser_email(u.email)=ephemer_social.normaliser_email(c.email)
    WHERE c.user_id=a AND c.id=ANY(fiches) AND u.id<>a AND u.email_confirmed_at IS NOT NULL
      AND u.deleted_at IS NULL AND NOT u.is_anonymous
      AND EXISTS (SELECT 1 FROM public.contacts retour WHERE retour.user_id=u.id
        AND ephemer_social.normaliser_email(retour.email)=adresse)
      AND NOT ephemer_social.bloquee(a,u.id)
      AND NOT EXISTS (SELECT 1 FROM ephemer_social.relations_etoiles rel
        WHERE rel.compte_a=least(a,u.id) AND rel.compte_b=greatest(a,u.id) AND rel.etat='retiree')
    ORDER BY u.id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM ephemer_social.relations_etoiles
       WHERE compte_a=least(a,b) AND compte_b=greatest(a,b)) THEN compteur:=compteur+1; END IF;
    r:=ephemer_social.activer(a,b,'reciproque');
  END LOOP;
  SELECT EXISTS (SELECT 1 FROM public.contacts WHERE user_id=a AND id>dernier) INTO suite;
  -- Bigint transmis en texte pour eviter les arrondis JavaScript.
  RETURN jsonb_build_object('ok',true,'nouvelles',compteur,
    'apres',CASE WHEN suite THEN dernier::text ELSE NULL END);
END;
$fn$;

CREATE FUNCTION ephemer_social.demander(a uuid,adresse text,cible_forcee uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE b uuid; d uuid; total_jour integer; jour_paris date:=(now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  -- Egalite exacte normalisee, jamais de rapprochement Gmail/domaine/telephone.
  IF cible_forcee IS NOT NULL THEN b:=cible_forcee;
  ELSE
    SELECT id INTO b FROM auth.users WHERE ephemer_social.normaliser_email(email)=adresse
      AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL AND NOT is_anonymous;
  END IF;
  -- Confirmation identique, meme pour soi : aucune lecture du profil du compte cible.
  IF b=a THEN RETURN jsonb_build_object('ok',true,'message','Demande enregistree.'); END IF;
  SELECT id INTO d FROM ephemer_social.demandes_etoiles
    WHERE auteur_id=a AND etat='en_attente' AND expires_at>now()
      AND (NOT neutralisee OR (b IS NOT NULL AND ephemer_social.bloquee(a,b)))
      AND (adresse_cible=adresse OR (b IS NOT NULL AND destinataire_id=b)) ORDER BY created_at LIMIT 1;
  IF d IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'message','Demande enregistree.'); END IF;
  INSERT INTO ephemer_social.quotas_demandes(user_id,jour,total) VALUES(a,jour_paris,1)
    ON CONFLICT(user_id,jour) DO UPDATE SET total=ephemer_social.quotas_demandes.total+1
      WHERE ephemer_social.quotas_demandes.total<20 RETURNING total INTO total_jour;
  IF total_jour IS NULL THEN RAISE EXCEPTION 'Limite de 20 nouvelles demandes par jour' USING ERRCODE='P1020'; END IF;
  INSERT INTO ephemer_social.demandes_etoiles(auteur_id,adresse_cible,destinataire_id,neutralisee)
    VALUES(a,adresse,b,b IS NOT NULL AND (ephemer_social.bloquee(a,b) OR EXISTS
      (SELECT 1 FROM ephemer_social.relations_etoiles WHERE compte_a=least(a,b) AND compte_b=greatest(a,b) AND etat='active')))
    RETURNING id INTO d;
  IF b IS NOT NULL THEN PERFORM ephemer_social.preparer_reception(b); END IF;
  RETURN jsonb_build_object('ok',true,'message','Demande enregistree.');
END;
$fn$;

CREATE FUNCTION ephemer_social.commander(action_demandee text,donnees jsonb,operation uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); b uuid; adresse text; cle uuid; empreinte_args text;
  existante ephemer_social.operations_etoiles; d ephemer_social.demandes_etoiles;
  r ephemer_social.relations_etoiles; lien ephemer_social.liens_etoiles;
  resultat jsonb; secret text; v_contact bigint; attendues text[]; presentes text[]; k text;
BEGIN
  IF operation IS NULL OR action_demandee IS NULL OR donnees IS NULL OR jsonb_typeof(donnees)<>'object'
      OR octet_length(donnees::text)>2048 OR action_demandee NOT IN
      ('demander','demander_contact','demander_lien','accepter','refuser','annuler',
       'retirer','bloquer','debloquer','creer_lien','revoquer_lien','associer_contact') THEN
    RAISE EXCEPTION 'Commande invalide' USING ERRCODE='22023';
  END IF;
  attendues:=CASE
    WHEN action_demandee='demander' THEN ARRAY['email']
    WHEN action_demandee='demander_contact' THEN ARRAY['contactId']
    WHEN action_demandee='demander_lien' THEN ARRAY['token']
    WHEN action_demandee IN ('accepter','refuser','annuler') THEN ARRAY['demandeId']
    WHEN action_demandee IN ('retirer','bloquer','debloquer') THEN ARRAY['etoileId']
    WHEN action_demandee='revoquer_lien' THEN ARRAY['lienId']
    WHEN action_demandee='associer_contact' THEN ARRAY['contactId','etoileId']
    ELSE ARRAY[]::text[] END;
  SELECT coalesce(array_agg(cle_json ORDER BY cle_json),ARRAY[]::text[]) INTO presentes
    FROM jsonb_object_keys(donnees) AS cles(cle_json);
  IF presentes<>attendues THEN RAISE EXCEPTION 'Champs invalides' USING ERRCODE='22023'; END IF;
  FOREACH k IN ARRAY attendues LOOP
    IF jsonb_typeof(donnees->k) IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Champ invalide' USING ERRCODE='22023';
    END IF;
    IF k IN ('demandeId','etoileId','lienId') AND (donnees->>k) !~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      RAISE EXCEPTION 'Identifiant invalide' USING ERRCODE='22023';
    END IF;
    IF k='contactId' THEN
      IF (donnees->>k) !~ '^[1-9][0-9]{0,18}$' THEN
        RAISE EXCEPTION 'Identifiant contact invalide' USING ERRCODE='22023';
      END IF;
      IF (donnees->>k)::numeric>9223372036854775807 THEN
        RAISE EXCEPTION 'Identifiant contact invalide' USING ERRCODE='22023';
      END IF;
    END IF;
    IF k='token' AND (donnees->>k) !~ '^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$' THEN
      RAISE EXCEPTION 'Lien indisponible' USING ERRCODE='42501';
    END IF;
  END LOOP;
  empreinte_args:=encode(extensions.digest(action_demandee||':'||donnees::text,'sha256'),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
  SELECT * INTO existante FROM ephemer_social.operations_etoiles WHERE user_id=a AND operation_id=operation;
  IF existante.operation_id IS NOT NULL THEN
    IF existante.empreinte<>empreinte_args THEN RAISE EXCEPTION 'Operation reutilisee pour une autre commande' USING ERRCODE='22023'; END IF;
    RETURN existante.resultat;
  END IF;
  resultat:=jsonb_build_object('ok',true);

  IF action_demandee IN ('demander','demander_contact','demander_lien') THEN
    IF action_demandee='demander_contact' THEN
      v_contact:=(donnees->>'contactId')::bigint;
      SELECT ephemer_social.normaliser_email(email) INTO adresse FROM public.contacts WHERE user_id=a AND id=v_contact;
      IF NOT FOUND THEN RAISE EXCEPTION 'Contact inaccessible' USING ERRCODE='42501'; END IF;
    ELSIF action_demandee='demander_lien' THEN
      secret:=donnees->>'token';
      IF secret IS NULL OR secret !~ '^[A-Za-z0-9_-]{43}$' THEN RAISE EXCEPTION 'Lien indisponible' USING ERRCODE='42501'; END IF;
      SELECT * INTO lien FROM ephemer_social.liens_etoiles
        WHERE empreinte=encode(extensions.digest(secret,'sha256'),'hex') AND NOT revoque AND expires_at>now();
      IF lien.id IS NULL THEN RAISE EXCEPTION 'Lien indisponible' USING ERRCODE='42501'; END IF;
      SELECT ephemer_social.normaliser_email(email) INTO adresse FROM auth.users
        WHERE id=lien.user_id AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL AND NOT is_anonymous;
      IF adresse IS NULL THEN RAISE EXCEPTION 'Lien indisponible' USING ERRCODE='42501'; END IF;
      b:=lien.user_id;
    ELSE adresse:=ephemer_social.normaliser_email(donnees->>'email');
    END IF;
    IF adresse IS NULL OR length(adresse)>320 OR adresse !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
      RAISE EXCEPTION 'Adresse invalide' USING ERRCODE='22023';
    END IF;
    resultat:=ephemer_social.demander(a,adresse,b);

  ELSIF action_demandee IN ('accepter','refuser','annuler') THEN
    cle:=(donnees->>'demandeId')::uuid;
    PERFORM ephemer_social.preparer_reception(a);
    SELECT * INTO d FROM ephemer_social.demandes_etoiles WHERE id=cle;
    IF d.id IS NULL OR (action_demandee='annuler' AND d.auteur_id<>a)
       OR (action_demandee<>'annuler' AND (d.destinataire_id IS DISTINCT FROM a OR d.neutralisee)) THEN
      RAISE EXCEPTION 'Demande indisponible' USING ERRCODE='42501';
    END IF;
    IF d.etat<>'en_attente' OR d.expires_at<=now() THEN
      RAISE EXCEPTION 'Demande terminee ou expiree : actualise la page' USING ERRCODE='P1009';
    END IF;
    IF action_demandee='accepter' THEN
      IF ephemer_social.bloquee(a,d.auteur_id) THEN RAISE EXCEPTION 'Demande indisponible' USING ERRCODE='42501'; END IF;
      SELECT * INTO r FROM ephemer_social.relations_etoiles
        WHERE compte_a=least(a,d.auteur_id) AND compte_b=greatest(a,d.auteur_id);
      IF r.id IS NOT NULL AND r.etat='retiree' AND d.created_at<=r.updated_at THEN
        RAISE EXCEPTION 'Une nouvelle demande est necessaire' USING ERRCODE='P1009';
      END IF;
      cle:=ephemer_social.activer(a,d.auteur_id,'demande');
      UPDATE ephemer_social.demandes_etoiles SET etat='acceptee',updated_at=clock_timestamp() WHERE id=d.id;
      resultat:=jsonb_build_object('ok',true,'relationId',cle);
    ELSE
      UPDATE ephemer_social.demandes_etoiles SET etat=CASE WHEN action_demandee='refuser' THEN 'refusee' ELSE 'annulee' END,
        updated_at=clock_timestamp() WHERE id=d.id;
    END IF;
    DELETE FROM public.notifications_etoiles WHERE demande_id=d.id;

  ELSIF action_demandee IN ('retirer','bloquer','debloquer') THEN
    b:=(donnees->>'etoileId')::uuid;
    IF b IS NULL OR b=a THEN RAISE EXCEPTION 'Cible invalide' USING ERRCODE='22023'; END IF;
    SELECT * INTO r FROM ephemer_social.relations_etoiles WHERE compte_a=least(a,b) AND compte_b=greatest(a,b);
    IF action_demandee='debloquer' THEN
      DELETE FROM ephemer_social.blocages_etoiles WHERE user_id=a AND cible_id=b;
    ELSE
      -- Pas de recherche de compte libre : seulement relation connue ou demande recue.
      IF r.id IS NULL AND NOT EXISTS (SELECT 1 FROM ephemer_social.demandes_etoiles
         WHERE auteur_id=b AND destinataire_id=a AND etat='en_attente' AND NOT neutralisee AND expires_at>now()) THEN
        RAISE EXCEPTION 'Etoile indisponible' USING ERRCODE='42501';
      END IF;
      IF r.id IS NULL THEN
        INSERT INTO ephemer_social.relations_etoiles(compte_a,compte_b,etat,origine)
          VALUES(least(a,b),greatest(a,b),'retiree','demande') RETURNING * INTO r;
      ELSE
        UPDATE ephemer_social.relations_etoiles SET etat='retiree',revision=revision+1,
          updated_at=clock_timestamp() WHERE id=r.id;
      END IF;
      IF action_demandee='bloquer' THEN
        INSERT INTO ephemer_social.blocages_etoiles(user_id,cible_id) VALUES(a,b) ON CONFLICT DO NOTHING;
      END IF;
      -- Ne pas communiquer le blocage a l'autre : ses demandes restent neutralisees.
      UPDATE ephemer_social.demandes_etoiles SET neutralisee=true,updated_at=clock_timestamp()
        WHERE etat='en_attente' AND ((auteur_id=a AND destinataire_id=b) OR (auteur_id=b AND destinataire_id=a));
      DELETE FROM public.notifications_etoiles WHERE relation_id=r.id OR demande_id IN
        (SELECT id FROM ephemer_social.demandes_etoiles WHERE neutralisee AND
          ((auteur_id=a AND destinataire_id=b) OR (auteur_id=b AND destinataire_id=a)));
    END IF;

  ELSIF action_demandee='creer_lien' THEN
    IF (SELECT count(*) FROM ephemer_social.liens_etoiles WHERE user_id=a AND NOT revoque AND expires_at>now())>=5 THEN
      RAISE EXCEPTION 'Revoque un lien avant d en creer un autre' USING ERRCODE='P1009';
    END IF;
    secret:=rtrim(translate(encode(extensions.gen_random_bytes(32),'base64'),'+/','-_'),'=');
    INSERT INTO ephemer_social.liens_etoiles(user_id,empreinte)
      VALUES(a,encode(extensions.digest(secret,'sha256'),'hex')) RETURNING * INTO lien;
    resultat:=jsonb_build_object('ok',true,'lienId',lien.id,'expiresAt',lien.expires_at);
    -- Le secret n'est conserve ni en table ni dans le journal d'idempotence.

  ELSIF action_demandee='revoquer_lien' THEN
    UPDATE ephemer_social.liens_etoiles SET revoque=true WHERE id=(donnees->>'lienId')::uuid AND user_id=a;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lien indisponible' USING ERRCODE='42501'; END IF;

  ELSIF action_demandee='associer_contact' THEN
    b:=(donnees->>'etoileId')::uuid; v_contact:=(donnees->>'contactId')::bigint;
    IF NOT EXISTS (SELECT 1 FROM ephemer_social.relations_etoiles WHERE compte_a=least(a,b)
      AND compte_b=greatest(a,b) AND etat='active') OR ephemer_social.bloquee(a,b)
      OR NOT EXISTS (SELECT 1 FROM public.contacts WHERE user_id=a AND id=v_contact) THEN
      RAISE EXCEPTION 'Association indisponible' USING ERRCODE='42501';
    END IF;
    -- Modification explicite seulement ; la reconnaissance automatique ne reaffecte jamais une fiche.
    INSERT INTO ephemer_social.contacts_etoiles(user_id,contact_id,etoile_id) VALUES(a,v_contact,b)
      ON CONFLICT(user_id,contact_id) DO UPDATE SET etoile_id=excluded.etoile_id;
  END IF;

  INSERT INTO ephemer_social.operations_etoiles(user_id,operation_id,action,empreinte,resultat)
    VALUES(a,operation,action_demandee,empreinte_args,resultat);
  IF action_demandee='creer_lien' THEN RETURN resultat||jsonb_build_object('token',secret); END IF;
  RETURN resultat;
END;
$fn$;

CREATE FUNCTION ephemer_social.lire(vue text,apres uuid,limite integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); lignes jsonb;
BEGIN
  IF vue IS NULL OR vue NOT IN ('actives','recues','envoyees','bloquees','liens')
     OR limite IS NULL OR limite NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Lecture invalide' USING ERRCODE='22023'; END IF;
  IF vue='actives' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') INTO lignes FROM (
      SELECT r.id,CASE WHEN r.compte_a=a THEN r.compte_b ELSE r.compte_a END AS etoile_id,
        ephemer_social.identite(CASE WHEN r.compte_a=a THEN r.compte_b ELSE r.compte_a END) AS identite,
        r.origine,r.created_at,r.revision
      FROM ephemer_social.relations_etoiles r WHERE (r.compte_a=a OR r.compte_b=a)
        AND r.etat='active' AND NOT ephemer_social.bloquee(r.compte_a,r.compte_b)
        AND (apres IS NULL OR r.id>apres) ORDER BY r.id LIMIT limite
    ) x;
  ELSIF vue='recues' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') INTO lignes FROM (
      SELECT d.id,d.auteur_id,ephemer_social.identite(d.auteur_id) AS identite,d.created_at,d.expires_at
      FROM ephemer_social.demandes_etoiles d WHERE d.destinataire_id=a AND NOT d.neutralisee
        AND d.etat='en_attente' AND d.expires_at>now() AND NOT ephemer_social.bloquee(a,d.auteur_id)
        AND (apres IS NULL OR d.id>apres) ORDER BY d.id LIMIT limite
    ) x;
  ELSIF vue='envoyees' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') INTO lignes FROM (
      SELECT d.id,d.adresse_cible,CASE WHEN d.etat='en_attente' AND d.expires_at<=now() THEN 'expiree' ELSE d.etat END AS etat,
        d.created_at,d.expires_at FROM ephemer_social.demandes_etoiles d WHERE d.auteur_id=a
        AND (apres IS NULL OR d.id>apres) ORDER BY d.id LIMIT limite
    ) x;
  ELSIF vue='bloquees' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') INTO lignes FROM (
      SELECT cible_id AS id,created_at
        FROM ephemer_social.blocages_etoiles WHERE user_id=a AND (apres IS NULL OR cible_id>apres)
        ORDER BY cible_id LIMIT limite
    ) x;
  ELSIF vue='liens' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') INTO lignes FROM (
      SELECT id,created_at,expires_at,revoque FROM ephemer_social.liens_etoiles
        WHERE user_id=a AND (apres IS NULL OR id>apres) ORDER BY id LIMIT limite
    ) x;
  END IF;
  RETURN jsonb_build_object('items',lignes);
END;
$fn$;

CREATE FUNCTION ephemer_social.lire_associations(apres bigint,limite integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); lignes jsonb;
BEGIN
  IF limite IS NULL OR limite NOT BETWEEN 1 AND 100 OR (apres IS NOT NULL AND apres<0) THEN
    RAISE EXCEPTION 'Lecture invalide' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.contact_id::bigint),'[]') INTO lignes FROM (
    SELECT c.contact_id::text AS contact_id,c.etoile_id,r.id AS relation_id FROM ephemer_social.contacts_etoiles c
    JOIN ephemer_social.relations_etoiles r ON r.compte_a=least(a,c.etoile_id) AND r.compte_b=greatest(a,c.etoile_id)
    WHERE c.user_id=a AND r.etat='active' AND NOT ephemer_social.bloquee(a,c.etoile_id)
      AND (apres IS NULL OR c.contact_id>apres) ORDER BY c.contact_id LIMIT limite
  ) x;
  RETURN jsonb_build_object('items',lignes);
END;
$fn$;

-- Export du titulaire uniquement. Aucun secret, hash, profil tiers, compteur ou journal.
CREATE FUNCTION ephemer_social.exporter(vue text,apres text,limite integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); lignes jsonb; curseur uuid; contact_apres bigint;
BEGIN
  IF vue IS NULL OR vue NOT IN ('relations','demandes','blocages','liens','associations')
    OR limite IS NULL OR limite NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Export invalide' USING ERRCODE='22023';
  END IF;
  IF vue='associations' THEN
    IF apres IS NOT NULL THEN
      IF apres !~ '^[1-9][0-9]{0,18}$' OR apres::numeric>9223372036854775807 THEN
        RAISE EXCEPTION 'Curseur invalide' USING ERRCODE='22023'; END IF;
      contact_apres:=apres::bigint;
    END IF;
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.contact_id::bigint),'[]') INTO lignes FROM (
      SELECT contact_id::text AS contact_id,etoile_id FROM ephemer_social.contacts_etoiles
        WHERE user_id=a AND (contact_apres IS NULL OR contact_id>contact_apres)
        ORDER BY contact_id LIMIT limite
    ) x;
  ELSE
    IF apres IS NOT NULL THEN
      IF apres !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        RAISE EXCEPTION 'Curseur invalide' USING ERRCODE='22023'; END IF;
      curseur:=apres::uuid;
    END IF;
    IF vue='relations' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') INTO lignes FROM (
        SELECT id,CASE WHEN compte_a=a THEN compte_b ELSE compte_a END AS etoile_id,
          etat,origine,created_at,updated_at FROM ephemer_social.relations_etoiles
          WHERE (compte_a=a OR compte_b=a) AND (curseur IS NULL OR id>curseur) ORDER BY id LIMIT limite
      ) x;
    ELSIF vue='demandes' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') INTO lignes FROM (
        SELECT id,CASE WHEN auteur_id=a THEN 'envoyee' ELSE 'recue' END AS direction,
          CASE WHEN auteur_id=a THEN adresse_cible ELSE NULL END AS adresse_cible,
          CASE WHEN auteur_id=a THEN NULL ELSE auteur_id END AS auteur_id,
          CASE WHEN etat='en_attente' AND expires_at<=now() THEN 'expiree' ELSE etat END AS etat,
          created_at,expires_at FROM ephemer_social.demandes_etoiles
          WHERE (auteur_id=a OR (destinataire_id=a AND NOT neutralisee))
            AND (curseur IS NULL OR id>curseur) ORDER BY id LIMIT limite
      ) x;
    ELSIF vue='blocages' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') INTO lignes FROM (
        SELECT cible_id AS id,created_at FROM ephemer_social.blocages_etoiles
          WHERE user_id=a AND (curseur IS NULL OR cible_id>curseur) ORDER BY cible_id LIMIT limite
      ) x;
    ELSE
      SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') INTO lignes FROM (
        SELECT id,created_at,expires_at,revoque FROM ephemer_social.liens_etoiles
          WHERE user_id=a AND (curseur IS NULL OR id>curseur) ORDER BY id LIMIT limite
      ) x;
    END IF;
  END IF;
  RETURN jsonb_build_object('items',lignes);
END;
$fn$;

-- Wrappers publics etroits. Identite toujours auth.uid(), jamais p_user_id fourni.
CREATE FUNCTION public.reconnaitre_etoiles(p_apres bigint DEFAULT NULL,p_limite integer DEFAULT 100) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_social.reconnaitre(p_apres,p_limite); $fn$;
CREATE FUNCTION public.commander_etoiles(p_action text,p_donnees jsonb,p_operation uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_social.commander(p_action,p_donnees,p_operation); $fn$;
CREATE FUNCTION public.lire_etoiles(p_vue text,p_apres uuid DEFAULT NULL,p_limite integer DEFAULT 50) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_social.lire(p_vue,p_apres,p_limite); $fn$;
CREATE FUNCTION public.lire_associations_etoiles(p_apres bigint DEFAULT NULL,p_limite integer DEFAULT 100) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_social.lire_associations(p_apres,p_limite); $fn$;
CREATE FUNCTION public.exporter_etoiles(p_vue text,p_apres text DEFAULT NULL,p_limite integer DEFAULT 100) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_social.exporter(p_vue,p_apres,p_limite); $fn$;

-- Aucun helper, fonction privilegiee ou commande librement executable par anon/service_role.
DO $fonctions$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='ephemer_social' OR (n.nspname='public' AND p.proname IN
      ('reconnaitre_etoiles','commander_etoiles','lire_etoiles','lire_associations_etoiles','exporter_etoiles')) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
  END LOOP;
END;
$fonctions$;
GRANT EXECUTE ON FUNCTION ephemer_social.reconnaitre(bigint,integer),ephemer_social.commander(text,jsonb,uuid),
  ephemer_social.lire(text,uuid,integer),ephemer_social.lire_associations(bigint,integer),
  ephemer_social.exporter(text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconnaitre_etoiles(bigint,integer),public.commander_etoiles(text,jsonb,uuid),
  public.lire_etoiles(text,uuid,integer),public.lire_associations_etoiles(bigint,integer),
  public.exporter_etoiles(text,text,integer) TO authenticated;

-- Fermeture du mecanisme historique, sans restauration automatique de droits vulnerables.
DO $ancien$
BEGIN
  IF to_regprocedure('public.est_contact_lie(uuid,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.est_contact_lie(uuid,text) FROM PUBLIC,anon,authenticated;
  END IF;
END;
$ancien$;
NOTIFY pgrst,'reload schema';
COMMIT;
