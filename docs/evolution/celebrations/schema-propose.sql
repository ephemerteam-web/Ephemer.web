-- Tranche B uniquement — installation HUMAINE sur copie, après revue de README-B.md.
-- Aucun objet C/D, aucun droit élargi sur les tables privées existantes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$ BEGIN
  IF current_setting('server_version_num')::integer<170000
    OR to_regprocedure('ephemer_social.acteur()') IS NULL
    OR to_regprocedure('ephemer_social.bloquee(uuid,uuid)') IS NULL
    OR to_regprocedure('extensions.digest(text,text)') IS NULL
    OR to_regclass('public.preparations_evenements') IS NULL THEN
    RAISE EXCEPTION 'PostgreSQL 17, socle social et preparations installes requis';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='ephemer_celebrations')
    OR to_regprocedure('public.commander_celebrations(text,jsonb,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'Objets deja presents : ne pas reinstaller';
  END IF;
END $garde$;
CREATE SCHEMA ephemer_celebrations;
REVOKE ALL ON SCHEMA ephemer_celebrations FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ephemer_celebrations REVOKE ALL ON TABLES FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ephemer_celebrations REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE ephemer_celebrations.celebrations (
  id uuid PRIMARY KEY, titre text NOT NULL CHECK(length(btrim(titre)) BETWEEN 1 AND 200),
  date_fete date CHECK(date_fete BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
  date_canonique date, heure time, lieu text CHECK(length(lieu)<=500),
  mode text NOT NULL CHECK(mode IN ('seul','partage')), surprise boolean NOT NULL DEFAULT false,
  -- Exclusion stable : pas de SET NULL a la suppression du destinataire.
  destinataire uuid, etat text NOT NULL DEFAULT 'active' CHECK(etat IN ('active','annulee','archivee','supprimee','suspendue')),
  revision bigint NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(NOT surprise OR mode='seul' OR destinataire IS NOT NULL)
);
CREATE TABLE ephemer_celebrations.participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), celebration uuid NOT NULL REFERENCES ephemer_celebrations.celebrations,
  compte uuid REFERENCES auth.users ON DELETE SET NULL,
  role text NOT NULL CHECK(role IN ('organisateur','participant')),
  etat text NOT NULL DEFAULT 'active' CHECK(etat IN ('active','partie','maintenance')),
  generation bigint NOT NULL DEFAULT 1, UNIQUE(celebration,id)
);
CREATE UNIQUE INDEX membre_courant ON ephemer_celebrations.participations(celebration,compte) WHERE etat IN ('active','maintenance');
CREATE INDEX membre_compte ON ephemer_celebrations.participations(compte,celebration);
CREATE TABLE ephemer_celebrations.sources (
  celebration uuid PRIMARY KEY REFERENCES ephemer_celebrations.celebrations,
  proprietaire uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  preparation uuid REFERENCES public.preparations_evenements ON DELETE SET NULL,
  UNIQUE(proprietaire,preparation)
);
CREATE TABLE ephemer_celebrations.invitations (
  id uuid PRIMARY KEY, celebration uuid NOT NULL REFERENCES ephemer_celebrations.celebrations,
  emetteur uuid REFERENCES auth.users ON DELETE SET NULL, cible uuid REFERENCES auth.users ON DELETE CASCADE,
  etat text NOT NULL DEFAULT 'attente' CHECK(etat IN ('attente','acceptee','refusee','revoquee')),
  created_at timestamptz NOT NULL DEFAULT now(), expire_at timestamptz NOT NULL DEFAULT now()+interval '7 days'
);
CREATE INDEX invitations_cible ON ephemer_celebrations.invitations(cible,id);
CREATE UNIQUE INDEX invitation_courante ON ephemer_celebrations.invitations(celebration,cible) WHERE etat='attente';
CREATE TABLE ephemer_celebrations.transferts (
  id uuid PRIMARY KEY, celebration uuid NOT NULL REFERENCES ephemer_celebrations.celebrations,
  initiateur uuid REFERENCES auth.users ON DELETE SET NULL, cible uuid REFERENCES auth.users ON DELETE CASCADE,
  etat text NOT NULL DEFAULT 'attente' CHECK(etat IN ('attente','accepte','refuse','annule')),
  expire_at timestamptz NOT NULL DEFAULT now()+interval '7 days'
);
CREATE UNIQUE INDEX transfert_courant ON ephemer_celebrations.transferts(celebration) WHERE etat='attente';
CREATE TABLE ephemer_celebrations.taches (
  id uuid PRIMARY KEY, celebration uuid NOT NULL REFERENCES ephemer_celebrations.celebrations,
  auteur uuid REFERENCES auth.users ON DELETE SET NULL,
  titre text NOT NULL CHECK(length(btrim(titre)) BETWEEN 1 AND 200),
  type text NOT NULL CHECK(type IN ('cadeau','message','gateau','repas','boissons','decoration','appel','sortie','libre')),
  responsable uuid, echeance date CHECK(echeance BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
  etat text NOT NULL DEFAULT 'a_faire' CHECK(etat IN ('a_faire','faite','abandonnee')),
  revision bigint NOT NULL DEFAULT 1,
  FOREIGN KEY(celebration,responsable) REFERENCES ephemer_celebrations.participations(celebration,id)
);
CREATE TABLE ephemer_celebrations.commentaires (
  id uuid PRIMARY KEY, celebration uuid NOT NULL REFERENCES ephemer_celebrations.celebrations,
  auteur uuid REFERENCES auth.users ON DELETE CASCADE,
  texte text NOT NULL CHECK(length(btrim(texte)) BETWEEN 1 AND 2000), revision bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ephemer_celebrations.demandes (
  id uuid PRIMARY KEY, celebration uuid NOT NULL REFERENCES ephemer_celebrations.celebrations,
  demandeur uuid REFERENCES auth.users ON DELETE CASCADE, motif text CHECK(length(motif)<=500),
  etat text NOT NULL DEFAULT 'attente' CHECK(etat IN ('attente','acceptee','refusee','fermee')),
  revision bigint NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), decide_at timestamptz
);
CREATE UNIQUE INDEX demande_courante ON ephemer_celebrations.demandes(celebration,demandeur) WHERE etat='attente';
CREATE TABLE ephemer_celebrations.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), celebration uuid NOT NULL REFERENCES ephemer_celebrations.celebrations,
  action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ephemer_celebrations.operations (
  acteur uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE, id uuid NOT NULL,
  celebration uuid NOT NULL REFERENCES ephemer_celebrations.celebrations, empreinte text NOT NULL,
  action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(acteur,id)
  -- Aucun texte libre ou ancien detail mis en cache ; resultat minimal reconstruit apres autorisation.
);
CREATE TABLE ephemer_celebrations.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), celebration uuid NOT NULL REFERENCES ephemer_celebrations.celebrations,
  compte uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type text NOT NULL CHECK(type IN ('invitation','tache','changement','demande','reponse')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_compte ON ephemer_celebrations.notifications(compte,celebration);
DO $tables$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='ephemer_celebrations' LOOP
    EXECUTE format('ALTER TABLE ephemer_celebrations.%I ENABLE ROW LEVEL SECURITY',r.tablename);
    EXECUTE format('REVOKE ALL ON TABLE ephemer_celebrations.%I FROM PUBLIC,anon,authenticated,service_role',r.tablename);
  END LOOP;
END $tables$;
-- Tables internes sans GRANT direct : RPC SECURITY DEFINER uniquement,
-- permissions fermees en fin de transaction, autorisation a chaque operation.

CREATE FUNCTION ephemer_celebrations.ami(a uuid,b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT a<>b AND NOT ephemer_social.bloquee(a,b) AND EXISTS(
    SELECT 1 FROM ephemer_social.relations_etoiles WHERE compte_a=least(a,b) AND compte_b=greatest(a,b) AND etat='active')
    AND EXISTS(SELECT 1 FROM auth.users WHERE id=b AND deleted_at IS NULL AND email_confirmed_at IS NOT NULL AND NOT is_anonymous);
$fn$;
CREATE FUNCTION ephemer_celebrations.lisible(c uuid,a uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations e JOIN ephemer_celebrations.participations m ON m.celebration=e.id
    WHERE e.id=c AND e.etat NOT IN ('supprimee','suspendue') AND m.compte=a AND m.etat='active'
    AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a)
    AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations autre
      WHERE autre.celebration=e.id AND autre.etat='active' AND ephemer_social.bloquee(a,autre.compte)));
$fn$;
CREATE FUNCTION ephemer_celebrations.maintenance(c uuid,a uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations e JOIN ephemer_celebrations.participations m ON m.celebration=e.id
    WHERE e.id=c AND e.etat='suspendue' AND m.compte=a AND m.role='organisateur' AND m.etat='maintenance'
    AND e.destinataire IS DISTINCT FROM a);
$fn$;
CREATE FUNCTION ephemer_celebrations.invite(c uuid,a uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT EXISTS(SELECT 1 FROM ephemer_celebrations.invitations i JOIN ephemer_celebrations.celebrations e ON e.id=i.celebration
    WHERE e.id=c AND e.etat='active' AND i.cible=a AND i.etat='attente' AND i.expire_at>now()
    AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a)
    AND ephemer_celebrations.ami(i.emetteur,a)
    AND EXISTS(SELECT 1 FROM ephemer_celebrations.participations m WHERE m.celebration=e.id AND m.compte=i.emetteur AND m.role='organisateur' AND m.etat='active')
    AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations m WHERE m.celebration=e.id AND m.etat='active' AND ephemer_social.bloquee(a,m.compte)));
$fn$;
CREATE FUNCTION ephemer_celebrations.resume(c uuid,a uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT jsonb_build_object('id',e.id,'titre',CASE WHEN m.etat='maintenance' THEN 'Célébration suspendue' ELSE e.titre END,
    'date',CASE WHEN m.etat='maintenance' THEN NULL ELSE e.date_fete END,'dateCanonique',CASE WHEN m.etat='maintenance' THEN NULL ELSE e.date_canonique END,
    'heure',CASE WHEN m.etat='maintenance' THEN NULL ELSE left(e.heure::text,5) END,'lieu',CASE WHEN m.etat='maintenance' THEN NULL ELSE e.lieu END,
    'mode',e.mode,'surprise',e.surprise,'destinataire',CASE WHEN m.etat='maintenance' THEN NULL ELSE e.destinataire END,'etat',e.etat,'revision',e.revision,'role',m.role,'maintenance',m.etat='maintenance')
  FROM ephemer_celebrations.celebrations e JOIN ephemer_celebrations.participations m ON m.celebration=e.id
  WHERE e.id=c AND m.compte=a AND m.etat IN ('active','maintenance');
$fn$;
CREATE FUNCTION ephemer_celebrations.tracer(c uuid,action text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
  INSERT INTO ephemer_celebrations.actions(celebration,action) VALUES(c,action);
  DELETE FROM ephemer_celebrations.actions WHERE celebration=c AND id NOT IN(
    SELECT id FROM ephemer_celebrations.actions WHERE celebration=c ORDER BY created_at DESC,id DESC LIMIT 100);
END $fn$;
CREATE FUNCTION ephemer_celebrations.notifier(c uuid,type_notification text,cible uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
  INSERT INTO ephemer_celebrations.notifications(celebration,compte,type)
    SELECT c,m.compte,type_notification FROM ephemer_celebrations.participations m
    WHERE m.celebration=c AND m.etat='active' AND m.compte IS NOT NULL
      AND (cible IS NULL OR m.compte=cible) AND ephemer_celebrations.lisible(c,m.compte);
  DELETE FROM ephemer_celebrations.notifications WHERE celebration=c AND id NOT IN(
    SELECT id FROM ephemer_celebrations.notifications WHERE celebration=c ORDER BY created_at DESC,id DESC LIMIT 100);
END $fn$;
CREATE FUNCTION ephemer_celebrations.sortir(c uuid,membre uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE a uuid;
BEGIN
  SELECT compte INTO a FROM ephemer_celebrations.participations WHERE id=membre AND celebration=c;
  UPDATE ephemer_celebrations.participations SET etat='partie' WHERE id=membre AND celebration=c;
  UPDATE ephemer_celebrations.taches SET responsable=NULL,revision=revision+1 WHERE celebration=c AND responsable=membre;
  UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=c AND etat='attente' AND (emetteur=a OR cible=a);
  UPDATE ephemer_celebrations.transferts SET etat='annule' WHERE celebration=c AND etat='attente' AND (initiateur=a OR cible=a);
  UPDATE ephemer_celebrations.demandes SET etat='fermee',motif=NULL,revision=revision+1 WHERE celebration=c AND demandeur=a AND etat='attente';
  DELETE FROM ephemer_celebrations.notifications WHERE celebration=c AND compte=a;
END $fn$;
CREATE FUNCTION ephemer_celebrations.supprimer(c uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
  UPDATE ephemer_celebrations.celebrations SET etat='supprimee',titre='Célébration supprimée',date_fete=NULL,date_canonique=NULL,heure=NULL,lieu=NULL,revision=revision+1 WHERE id=c AND etat<>'supprimee';
  UPDATE ephemer_celebrations.participations SET etat='partie' WHERE celebration=c;
  UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=c;
  UPDATE ephemer_celebrations.transferts SET etat='annule' WHERE celebration=c AND etat='attente';
  UPDATE ephemer_celebrations.demandes SET etat=CASE WHEN etat='attente' THEN 'fermee' ELSE etat END,motif=NULL,revision=revision+1 WHERE celebration=c;
  DELETE FROM ephemer_celebrations.taches WHERE celebration=c;
  DELETE FROM ephemer_celebrations.commentaires WHERE celebration=c;
  DELETE FROM ephemer_celebrations.notifications WHERE celebration=c;
  DELETE FROM ephemer_celebrations.actions WHERE celebration=c;
  -- Garder seulement la cle source pour empecher une publication rejouee de ressusciter le contenu.
  -- Pas d'effacement de la preparation, occurrence, contact ou carte source.
END $fn$;

CREATE FUNCTION ephemer_celebrations.commande_valide(action text,d jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE attendu text[]; k text; v jsonb;
BEGIN
  attendu:=CASE action
    WHEN 'creer' THEN ARRAY['id','titre','date','heure','lieu','mode','surprise','destinataire']
    WHEN 'publier' THEN ARRAY['id','titre','date','heure','lieu','mode','surprise','destinataire','preparation','taches','apercuSource','confirmer']
    WHEN 'modifier' THEN ARRAY['id','revision','titre','date','heure','lieu','mode','surprise','destinataire','revoirAcces']
    WHEN 'inviter' THEN ARRAY['id','invitation','cible']
    WHEN 'accepter' THEN ARRAY['id','invitation'] WHEN 'refuser' THEN ARRAY['id','invitation'] WHEN 'revoquer' THEN ARRAY['id','invitation']
    WHEN 'quitter' THEN ARRAY['id','cloturer'] WHEN 'retirer' THEN ARRAY['id','participation']
    WHEN 'proposer_transfert' THEN ARRAY['id','transfert','cible'] WHEN 'accepter_transfert' THEN ARRAY['id','transfert'] WHEN 'refuser_transfert' THEN ARRAY['id','transfert']
    WHEN 'ajouter_tache' THEN ARRAY['id','tache','titre','type','responsable','echeance']
    WHEN 'modifier_tache' THEN ARRAY['id','tache','revision','titre','responsable','echeance','etat']
    WHEN 'commenter' THEN ARRAY['id','commentaire','texte'] WHEN 'modifier_commentaire' THEN ARRAY['id','commentaire','revision','texte'] WHEN 'retirer_commentaire' THEN ARRAY['id','commentaire']
    WHEN 'annuler' THEN ARRAY['id','revision','confirmer'] WHEN 'archiver' THEN ARRAY['id','revision'] WHEN 'supprimer' THEN ARRAY['id','revision','confirmer']
    WHEN 'demander_suppression' THEN ARRAY['id','demande','motif'] WHEN 'traiter_suppression' THEN ARRAY['id','demande','revision','accepter','confirmer'] ELSE NULL END;
  IF attendu IS NULL OR jsonb_typeof(d)<>'object' OR octet_length(d::text)>16384
    OR (SELECT count(*) FROM jsonb_object_keys(d))<>cardinality(attendu)
    OR EXISTS(SELECT 1 FROM jsonb_object_keys(d) AS x(k) WHERE NOT x.k=ANY(attendu)) THEN RETURN false; END IF;
  FOR k,v IN SELECT * FROM jsonb_each(d) LOOP
    IF k IN ('id','invitation','cible','participation','transfert','tache','commentaire','demande','preparation','responsable','destinataire') THEN
      IF v='null'::jsonb AND k IN ('responsable','destinataire') THEN CONTINUE; END IF;
      IF jsonb_typeof(v)<>'string' OR (v#>>'{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN false; END IF;
    ELSIF k IN ('confirmer','cloturer','surprise','revoirAcces','accepter') THEN
      IF jsonb_typeof(v)<>'boolean' THEN RETURN false; END IF;
    ELSIF k='revision' THEN
      IF jsonb_typeof(v)<>'number' OR (v::text)!~'^[1-9][0-9]*$' OR v::text::numeric>9007199254740991 THEN RETURN false; END IF;
    ELSIF k IN ('date','echeance') THEN
      IF v<>'null'::jsonb AND (jsonb_typeof(v)<>'string' OR (v#>>'{}')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR NOT pg_input_is_valid(v#>>'{}','date') OR (v#>>'{}')<'0001-01-01' OR (v#>>'{}')>'9999-12-31') THEN RETURN false; END IF;
    ELSIF k='heure' THEN
      IF v<>'null'::jsonb AND (jsonb_typeof(v)<>'string' OR (v#>>'{}')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$') THEN RETURN false; END IF;
    ELSIF k='titre' THEN
      IF jsonb_typeof(v)<>'string' OR (v#>>'{}')<>btrim(v#>>'{}') OR length(v#>>'{}') NOT BETWEEN 1 AND 200 THEN RETURN false; END IF;
    ELSIF k='texte' THEN
      IF jsonb_typeof(v)<>'string' OR length(btrim(v#>>'{}')) NOT BETWEEN 1 AND 2000 THEN RETURN false; END IF;
    ELSIF k IN ('lieu','motif') THEN
      IF v<>'null'::jsonb AND (jsonb_typeof(v)<>'string' OR length(v#>>'{}')>500) THEN RETURN false; END IF;
    ELSIF k='mode' THEN IF v NOT IN ('"seul"'::jsonb,'"partage"'::jsonb) THEN RETURN false; END IF;
    ELSIF k='type' THEN IF jsonb_typeof(v)<>'string' OR (v#>>'{}') NOT IN ('cadeau','message','gateau','repas','boissons','decoration','appel','sortie','libre') THEN RETURN false; END IF;
    ELSIF k='etat' THEN IF jsonb_typeof(v)<>'string' OR (v#>>'{}') NOT IN ('a_faire','faite','abandonnee') THEN RETURN false; END IF;
    ELSIF k='apercuSource' THEN
      IF jsonb_typeof(v)<>'object' THEN RETURN false; END IF;
      -- Egalite a la projection privee sous verrou dans commander : champs fermes,
      -- titres/types/date selectionnes exactement identiques a l'apercu confirme.
    ELSIF k='taches' THEN
      IF jsonb_typeof(v)<>'array' OR jsonb_array_length(v)>30 THEN RETURN false; END IF;
      IF EXISTS(SELECT 1 FROM jsonb_array_elements(v) x WHERE jsonb_typeof(x)<>'string' OR (x#>>'{}')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
        OR (SELECT count(DISTINCT x) FROM jsonb_array_elements(v) x)<>jsonb_array_length(v) THEN RETURN false; END IF;
    END IF;
  END LOOP;
  RETURN true;
END $fn$;

CREATE FUNCTION ephemer_celebrations.commander(action text,d jsonb,operation uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); c uuid; b uuid; membre ephemer_celebrations.participations;
  e ephemer_celebrations.celebrations; i ephemer_celebrations.invitations; tr ephemer_celebrations.transferts;
  ta ephemer_celebrations.taches; co ephemer_celebrations.commentaires; de ephemer_celebrations.demandes;
  op ephemer_celebrations.operations; empreinte text; admin boolean; maintenance boolean;
  v_responsable uuid; source_date date; source_projection jsonb; selection record;
BEGIN
  IF operation IS NULL OR NOT ephemer_celebrations.commande_valide(action,d) THEN RAISE EXCEPTION 'Commande invalide' USING ERRCODE='22023'; END IF;
  c:=(d->>'id')::uuid;
  empreinte:=encode(extensions.digest(action||':'||d::text,'sha256'),'hex');
  -- Meme ordre que les commandes sociales : verrou social, puis celebration.
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-celebration:'||c::text,0));
  SELECT * INTO e FROM ephemer_celebrations.celebrations WHERE id=c FOR UPDATE;
  SELECT * INTO membre FROM ephemer_celebrations.participations WHERE celebration=c AND compte=a AND etat IN ('active','maintenance');
  maintenance:=ephemer_celebrations.maintenance(c,a);
  admin:=membre.role='organisateur' AND (ephemer_celebrations.lisible(c,a) OR maintenance);
  SELECT * INTO op FROM ephemer_celebrations.operations WHERE acteur=a AND id=operation;
  IF op.id IS NOT NULL THEN
    IF op.empreinte<>empreinte THEN RAISE EXCEPTION 'Identifiant reutilise' USING ERRCODE='22023'; END IF;
    IF ephemer_celebrations.lisible(c,a) OR maintenance OR ephemer_celebrations.invite(c,a)
      OR (e.etat='supprimee' AND op.action IN ('supprimer','traiter_suppression'))
      OR (op.action IN ('quitter','refuser') AND e.etat<>'supprimee' AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a)) THEN
      RETURN jsonb_build_object('ok',true,'id',c);
    END IF;
    RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501';
  END IF;
  IF (SELECT count(*) FROM ephemer_celebrations.operations WHERE acteur=a AND created_at>now()-interval '1 hour')>=120 THEN RAISE EXCEPTION 'Limite actions' USING ERRCODE='P1130'; END IF;
  IF action IN ('creer','publier') THEN
    IF e.id IS NOT NULL THEN RAISE EXCEPTION 'Identifiant utilise' USING ERRCODE='40001'; END IF;
    b:=(d->>'destinataire')::uuid;
    IF (d->>'surprise')::boolean AND (b=a OR ((d->>'mode')='partage' AND b IS NULL)) THEN RAISE EXCEPTION 'Surprise indisponible' USING ERRCODE='42501'; END IF;
    IF b IS NOT NULL AND b<>a AND NOT ephemer_celebrations.ami(a,b) THEN RAISE EXCEPTION 'Destinataire indisponible' USING ERRCODE='42501'; END IF;
    IF (SELECT count(*) FROM ephemer_celebrations.participations WHERE compte=a AND role='organisateur' AND etat IN ('active','maintenance'))>=100 THEN RAISE EXCEPTION 'Limite atteinte' USING ERRCODE='P1130'; END IF;
    IF action='publier' THEN
      IF NOT (d->>'confirmer')::boolean THEN RAISE EXCEPTION 'Confirmation requise' USING ERRCODE='22023'; END IF;
      SELECT o.date_occurrence INTO source_date FROM public.preparations_evenements p JOIN public.occurrences_evenements o ON o.id=p.occurrence_id AND o.user_id=p.user_id
        WHERE p.id=(d->>'preparation')::uuid AND p.user_id=a FOR SHARE OF p,o;
      IF NOT FOUND THEN RAISE EXCEPTION 'Source indisponible' USING ERRCODE='42501'; END IF;
      IF EXISTS(SELECT 1 FROM ephemer_celebrations.sources WHERE proprietaire=a AND preparation=(d->>'preparation')::uuid) THEN RAISE EXCEPTION 'Preparation deja publiee : relire' USING ERRCODE='40001'; END IF;
      IF (SELECT count(*) FROM public.taches_preparation WHERE user_id=a AND preparation_id=(d->>'preparation')::uuid AND id IN(SELECT x::uuid FROM jsonb_array_elements_text(d->'taches') x))<>jsonb_array_length(d->'taches') THEN RAISE EXCEPTION 'Selection indisponible' USING ERRCODE='42501'; END IF;
      PERFORM t.id FROM public.taches_preparation t WHERE t.user_id=a AND t.preparation_id=(d->>'preparation')::uuid
        AND t.id IN(SELECT x::uuid FROM jsonb_array_elements_text(d->'taches') x) ORDER BY t.id FOR SHARE OF t;
      SELECT jsonb_build_object('date',source_date,'taches',coalesce(jsonb_agg(jsonb_build_object('id',t.id,'titre',t.titre,'type',t.type_tache) ORDER BY t.id),'[]'::jsonb)) INTO source_projection
        FROM public.taches_preparation t WHERE t.user_id=a AND t.preparation_id=(d->>'preparation')::uuid
          AND t.id IN(SELECT x::uuid FROM jsonb_array_elements_text(d->'taches') x);
      IF source_projection IS DISTINCT FROM d->'apercuSource' THEN RAISE EXCEPTION 'Source changee : refaire apercu' USING ERRCODE='40001'; END IF;
    END IF;
    INSERT INTO ephemer_celebrations.celebrations(id,titre,date_fete,date_canonique,heure,lieu,mode,surprise,destinataire)
      VALUES(c,d->>'titre',(d->>'date')::date,source_date,(d->>'heure')::time,d->>'lieu',d->>'mode',(d->>'surprise')::boolean,b);
    INSERT INTO ephemer_celebrations.participations(celebration,compte,role) VALUES(c,a,'organisateur') RETURNING * INTO membre;
    IF action='publier' THEN
      INSERT INTO ephemer_celebrations.sources VALUES(c,a,(d->>'preparation')::uuid);
      INSERT INTO ephemer_celebrations.taches(id,celebration,auteur,titre,type,responsable)
        SELECT gen_random_uuid(),c,a,titre,type_tache,membre.id FROM public.taches_preparation
          WHERE user_id=a AND preparation_id=(d->>'preparation')::uuid AND id IN(SELECT x::uuid FROM jsonb_array_elements_text(d->'taches') x);
      -- Etat a_faire, aucun brouillon, note, budget, carte ou progression privee copie.
    END IF;
  ELSE
    IF e.id IS NULL OR e.etat='supprimee' OR (e.surprise AND e.destinataire=a) THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
    IF action IN ('accepter','refuser','demander_suppression') THEN
      IF NOT ephemer_celebrations.lisible(c,a) AND NOT ephemer_celebrations.invite(c,a) THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
    ELSIF action IN ('accepter_transfert','refuser_transfert') THEN
      IF membre.id IS NULL OR membre.etat<>'active' OR e.etat NOT IN ('active','suspendue') THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
    ELSIF NOT ephemer_celebrations.lisible(c,a) AND NOT (maintenance AND action IN ('proposer_transfert','supprimer','annuler')) THEN
      RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501';
    END IF;
    IF action IN ('modifier','inviter','revoquer','retirer','proposer_transfert','annuler','archiver','supprimer','traiter_suppression') AND NOT coalesce(admin,false) THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
    IF action IN ('modifier','inviter','ajouter_tache','modifier_tache','commenter','modifier_commentaire') AND e.etat<>'active' THEN RAISE EXCEPTION 'Celebration fermee' USING ERRCODE='40001'; END IF;
    IF action IN ('modifier','annuler','archiver','supprimer') AND e.revision<>(d->>'revision')::bigint THEN RAISE EXCEPTION 'Revision changee' USING ERRCODE='40001'; END IF;

    IF action='modifier' THEN
      b:=(d->>'destinataire')::uuid;
      IF b IS NOT NULL AND b<>a AND b IS DISTINCT FROM e.destinataire AND NOT ephemer_celebrations.ami(a,b) THEN RAISE EXCEPTION 'Destinataire indisponible' USING ERRCODE='42501'; END IF;
      IF (d->>'surprise')::boolean AND (b=a OR (d->>'mode'='partage' AND b IS NULL)) THEN RAISE EXCEPTION 'Surprise indisponible' USING ERRCODE='42501'; END IF;
      IF e.surprise IS DISTINCT FROM (d->>'surprise')::boolean OR e.destinataire IS DISTINCT FROM b OR e.mode IS DISTINCT FROM (d->>'mode') THEN
        IF NOT (d->>'revoirAcces')::boolean THEN RAISE EXCEPTION 'Revue des acces requise' USING ERRCODE='22023'; END IF;
        UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=c AND etat='attente';
        UPDATE ephemer_celebrations.transferts SET etat='annule' WHERE celebration=c AND etat='attente';
        FOR selection IN SELECT id FROM ephemer_celebrations.participations WHERE celebration=c AND compte<>a AND etat='active'
          AND ((d->>'mode')='seul' OR ((d->>'surprise')::boolean AND compte=b)) LOOP PERFORM ephemer_celebrations.sortir(c,selection.id); END LOOP;
      END IF;
      UPDATE ephemer_celebrations.celebrations SET titre=d->>'titre',date_fete=(d->>'date')::date,heure=(d->>'heure')::time,lieu=d->>'lieu',mode=d->>'mode',surprise=(d->>'surprise')::boolean,destinataire=b WHERE id=c;
      PERFORM ephemer_celebrations.notifier(c,'changement');
    ELSIF action='inviter' THEN
      b:=(d->>'cible')::uuid;
      IF e.mode<>'partage' OR NOT ephemer_celebrations.ami(a,b) OR (e.surprise AND (e.destinataire=b OR e.destinataire IS NULL))
        OR EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration=c AND etat='active' AND (compte=b OR ephemer_social.bloquee(b,compte))) THEN RAISE EXCEPTION 'Invitation indisponible' USING ERRCODE='42501'; END IF;
      UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=c AND etat='attente' AND expire_at<=now();
      IF (SELECT count(*) FROM ephemer_celebrations.invitations WHERE celebration=c AND etat='attente')>=20
        OR (SELECT count(*) FROM ephemer_celebrations.invitations WHERE celebration=c AND emetteur=a AND created_at>now()-interval '24 hours')>=10 THEN RAISE EXCEPTION 'Limite invitations' USING ERRCODE='P1130'; END IF;
      INSERT INTO ephemer_celebrations.invitations(id,celebration,emetteur,cible) VALUES((d->>'invitation')::uuid,c,a,b);
      INSERT INTO ephemer_celebrations.notifications(celebration,compte,type) VALUES(c,b,'invitation');
    ELSIF action IN ('accepter','refuser','revoquer') THEN
      SELECT * INTO i FROM ephemer_celebrations.invitations WHERE id=(d->>'invitation')::uuid AND celebration=c FOR UPDATE;
      IF i.id IS NULL OR i.etat<>'attente' OR i.expire_at<=now() OR (action<>'revoquer' AND (i.cible<>a OR NOT ephemer_celebrations.invite(c,a))) THEN RAISE EXCEPTION 'Invitation indisponible' USING ERRCODE='42501'; END IF;
      IF action='accepter' THEN
        IF (SELECT count(*) FROM ephemer_celebrations.participations WHERE celebration=c AND etat='active')>=30 THEN RAISE EXCEPTION 'Limite participants' USING ERRCODE='P1130'; END IF;
        INSERT INTO ephemer_celebrations.participations(celebration,compte,role,generation)
          SELECT c,a,'participant',coalesce(max(generation),0)+1 FROM ephemer_celebrations.participations WHERE celebration=c AND compte=a;
      END IF;
      UPDATE ephemer_celebrations.invitations SET etat=CASE action WHEN 'accepter' THEN 'acceptee' WHEN 'refuser' THEN 'refusee' ELSE 'revoquee' END WHERE id=i.id;
      DELETE FROM ephemer_celebrations.notifications WHERE celebration=c AND compte=i.cible AND type='invitation';
    ELSIF action IN ('quitter','retirer') THEN
      IF action='retirer' THEN SELECT * INTO membre FROM ephemer_celebrations.participations WHERE celebration=c AND id=(d->>'participation')::uuid AND etat='active'; END IF;
      IF membre.id IS NULL OR membre.etat<>'active' THEN RAISE EXCEPTION 'Participation indisponible' USING ERRCODE='42501'; END IF;
      IF membre.role='organisateur' AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration=c AND role='organisateur' AND etat='active' AND id<>membre.id AND (NOT e.surprise OR compte IS DISTINCT FROM e.destinataire)) THEN
        IF action<>'quitter' OR NOT (d->>'cloturer')::boolean THEN RAISE EXCEPTION 'Transfert accepte ou cloture requis' USING ERRCODE='40001'; END IF;
        UPDATE ephemer_celebrations.celebrations SET etat='annulee' WHERE id=c;
        UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=c AND etat='attente';
      END IF;
      PERFORM ephemer_celebrations.sortir(c,membre.id);
    ELSIF action='proposer_transfert' THEN
      b:=(d->>'cible')::uuid;
      IF b=a OR ephemer_social.bloquee(a,b) OR NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration=c AND compte=b AND etat='active') THEN RAISE EXCEPTION 'Transfert indisponible' USING ERRCODE='42501'; END IF;
      UPDATE ephemer_celebrations.transferts SET etat='annule' WHERE celebration=c AND etat='attente' AND expire_at<=now();
      INSERT INTO ephemer_celebrations.transferts(id,celebration,initiateur,cible) VALUES((d->>'transfert')::uuid,c,a,b);
    ELSIF action IN ('accepter_transfert','refuser_transfert') THEN
      SELECT * INTO tr FROM ephemer_celebrations.transferts WHERE celebration=c AND id=(d->>'transfert')::uuid FOR UPDATE;
      IF tr.id IS NULL OR tr.cible<>a OR tr.etat<>'attente' OR tr.expire_at<=now() OR ephemer_social.bloquee(a,tr.initiateur)
        OR NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration=c AND compte=tr.initiateur AND role='organisateur' AND etat IN ('active','maintenance')) THEN RAISE EXCEPTION 'Transfert indisponible' USING ERRCODE='42501'; END IF;
      IF action='accepter_transfert' THEN
        UPDATE ephemer_celebrations.participations SET role='participant' WHERE celebration=c AND compte=tr.initiateur AND etat='active';
        FOR selection IN SELECT id FROM ephemer_celebrations.participations WHERE celebration=c AND compte=tr.initiateur AND etat='maintenance' LOOP PERFORM ephemer_celebrations.sortir(c,selection.id); END LOOP;
        UPDATE ephemer_celebrations.participations SET role='organisateur' WHERE id=membre.id;
        UPDATE ephemer_celebrations.celebrations SET etat='active' WHERE id=c AND etat='suspendue';
      END IF;
      UPDATE ephemer_celebrations.transferts SET etat=CASE action WHEN 'accepter_transfert' THEN 'accepte' ELSE 'refuse' END WHERE id=tr.id;
    ELSIF action IN ('ajouter_tache','modifier_tache') THEN
      v_responsable:=(d->>'responsable')::uuid;
      IF v_responsable IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration=c AND id=v_responsable AND etat='active') THEN RAISE EXCEPTION 'Responsable indisponible' USING ERRCODE='42501'; END IF;
      IF action='ajouter_tache' THEN
        IF e.destinataire=a AND d->>'type' IN ('cadeau','message') THEN RAISE EXCEPTION 'Tache indisponible' USING ERRCODE='42501'; END IF;
        IF d->>'type' IN ('cadeau','message') AND EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE id=v_responsable AND compte=e.destinataire) THEN RAISE EXCEPTION 'Responsable indisponible' USING ERRCODE='42501'; END IF;
        IF NOT coalesce(admin,false) AND v_responsable IS DISTINCT FROM membre.id THEN RAISE EXCEPTION 'Attribuer seulement a soi' USING ERRCODE='42501'; END IF;
        IF (SELECT count(*) FROM ephemer_celebrations.taches WHERE celebration=c)>=100 THEN RAISE EXCEPTION 'Limite taches' USING ERRCODE='P1130'; END IF;
        INSERT INTO ephemer_celebrations.taches(id,celebration,auteur,titre,type,responsable,echeance) VALUES((d->>'tache')::uuid,c,a,d->>'titre',d->>'type',v_responsable,(d->>'echeance')::date);
      ELSE
        SELECT * INTO ta FROM ephemer_celebrations.taches WHERE id=(d->>'tache')::uuid AND celebration=c FOR UPDATE;
        IF ta.type IN ('cadeau','message') AND (e.destinataire=a OR EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE id=v_responsable AND compte=e.destinataire)) THEN RAISE EXCEPTION 'Tache indisponible' USING ERRCODE='42501'; END IF;
        IF ta.id IS NULL OR (NOT coalesce(admin,false) AND ta.responsable IS DISTINCT FROM membre.id AND ta.auteur IS DISTINCT FROM a)
          OR (NOT coalesce(admin,false) AND v_responsable IS DISTINCT FROM ta.responsable) THEN RAISE EXCEPTION 'Tache indisponible' USING ERRCODE='42501'; END IF;
        IF ta.revision<>(d->>'revision')::bigint THEN RAISE EXCEPTION 'Tache changee' USING ERRCODE='40001'; END IF;
        UPDATE ephemer_celebrations.taches SET titre=d->>'titre',responsable=v_responsable,echeance=(d->>'echeance')::date,etat=d->>'etat',revision=revision+1 WHERE id=ta.id;
      END IF;
      IF v_responsable IS NOT NULL THEN SELECT compte INTO b FROM ephemer_celebrations.participations WHERE id=v_responsable; PERFORM ephemer_celebrations.notifier(c,'tache',b); END IF;
    ELSIF action IN ('commenter','modifier_commentaire','retirer_commentaire') THEN
      IF action='commenter' THEN
        IF (SELECT count(*) FROM ephemer_celebrations.commentaires WHERE celebration=c)>=100 OR (SELECT count(*) FROM ephemer_celebrations.operations o WHERE o.celebration=c AND o.acteur=a AND o.action='commenter' AND o.created_at>now()-interval '1 hour')>=30 THEN RAISE EXCEPTION 'Limite commentaires' USING ERRCODE='P1130'; END IF;
        INSERT INTO ephemer_celebrations.commentaires(id,celebration,auteur,texte) VALUES((d->>'commentaire')::uuid,c,a,d->>'texte');
      ELSE
        SELECT * INTO co FROM ephemer_celebrations.commentaires WHERE id=(d->>'commentaire')::uuid AND celebration=c FOR UPDATE;
        IF co.id IS NULL OR (co.auteur IS DISTINCT FROM a AND (action<>'retirer_commentaire' OR NOT coalesce(admin,false))) THEN RAISE EXCEPTION 'Commentaire indisponible' USING ERRCODE='42501'; END IF;
        IF action='modifier_commentaire' THEN
          IF co.revision<>(d->>'revision')::bigint THEN RAISE EXCEPTION 'Commentaire change' USING ERRCODE='40001'; END IF;
          UPDATE ephemer_celebrations.commentaires SET texte=d->>'texte',revision=revision+1 WHERE id=co.id;
        ELSE DELETE FROM ephemer_celebrations.commentaires WHERE id=co.id; END IF;
      END IF;
    ELSIF action IN ('annuler','archiver','supprimer') THEN
      IF action<>'archiver' AND NOT (d->>'confirmer')::boolean THEN RAISE EXCEPTION 'Confirmation requise' USING ERRCODE='22023'; END IF;
      IF action='supprimer' THEN PERFORM ephemer_celebrations.supprimer(c);
      ELSE
        UPDATE ephemer_celebrations.celebrations SET etat=CASE action WHEN 'annuler' THEN 'annulee' ELSE 'archivee' END WHERE id=c;
        UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=c AND etat='attente';
        UPDATE ephemer_celebrations.transferts SET etat='annule' WHERE celebration=c AND etat='attente';
        IF maintenance THEN PERFORM ephemer_celebrations.sortir(c,membre.id); END IF;
      END IF;
    ELSIF action='demander_suppression' THEN
      IF (SELECT count(*) FROM ephemer_celebrations.demandes WHERE celebration=c)>=100 OR (SELECT count(*) FROM ephemer_celebrations.demandes WHERE celebration=c AND demandeur=a AND created_at>now()-interval '30 days')>=3 THEN RAISE EXCEPTION 'Limite demandes' USING ERRCODE='P1130'; END IF;
      INSERT INTO ephemer_celebrations.demandes(id,celebration,demandeur,motif) VALUES((d->>'demande')::uuid,c,a,d->>'motif');
      FOR selection IN SELECT compte FROM ephemer_celebrations.participations WHERE celebration=c AND role='organisateur' AND etat='active' LOOP PERFORM ephemer_celebrations.notifier(c,'demande',selection.compte); END LOOP;
    ELSIF action='traiter_suppression' THEN
      SELECT * INTO de FROM ephemer_celebrations.demandes WHERE celebration=c AND id=(d->>'demande')::uuid FOR UPDATE;
      IF de.id IS NULL OR de.etat<>'attente' OR de.revision<>(d->>'revision')::bigint THEN RAISE EXCEPTION 'Demande changee' USING ERRCODE='40001'; END IF;
      IF NOT ephemer_celebrations.lisible(c,de.demandeur) AND NOT ephemer_celebrations.invite(c,de.demandeur) THEN RAISE EXCEPTION 'Demande indisponible' USING ERRCODE='42501'; END IF;
      IF (d->>'accepter')::boolean THEN
        IF NOT (d->>'confirmer')::boolean THEN RAISE EXCEPTION 'Confirmation requise' USING ERRCODE='22023'; END IF;
        UPDATE ephemer_celebrations.demandes SET etat='acceptee',revision=revision+1,decide_at=now() WHERE id=de.id;
        PERFORM ephemer_celebrations.supprimer(c);
      ELSE UPDATE ephemer_celebrations.demandes SET etat='refusee',revision=revision+1,decide_at=now() WHERE id=de.id; PERFORM ephemer_celebrations.notifier(c,'reponse',de.demandeur); END IF;
    END IF;
  END IF;
  IF action NOT IN ('supprimer','traiter_suppression') OR NOT EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations WHERE id=c AND etat='supprimee') THEN
    IF action IN ('modifier','annuler','archiver','accepter_transfert') OR (action='quitter' AND (d->>'cloturer')::boolean) THEN
      UPDATE ephemer_celebrations.celebrations SET revision=revision+1 WHERE id=c;
    END IF;
    PERFORM ephemer_celebrations.tracer(c,action);
  END IF;
  INSERT INTO ephemer_celebrations.operations(acteur,id,celebration,empreinte,action) VALUES(a,operation,c,empreinte,action);
  RETURN jsonb_build_object('ok',true,'id',c);
END $fn$;

CREATE FUNCTION ephemer_celebrations.detail(c uuid,a uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE r jsonb; est_admin boolean; est_maintenance boolean; e ephemer_celebrations.celebrations;
BEGIN
  est_maintenance:=ephemer_celebrations.maintenance(c,a);
  IF NOT ephemer_celebrations.lisible(c,a) AND NOT est_maintenance THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
  SELECT * INTO e FROM ephemer_celebrations.celebrations WHERE id=c;
  SELECT role='organisateur' INTO est_admin FROM ephemer_celebrations.participations WHERE celebration=c AND compte=a AND etat IN ('active','maintenance');
  r:=jsonb_build_object('celebration',ephemer_celebrations.resume(c,a),'participants','[]'::jsonb,'taches','[]'::jsonb,'commentaires','[]'::jsonb,'invitations','[]'::jsonb,'transferts','[]'::jsonb,'demandes','[]'::jsonb,'actions','[]'::jsonb,'notifications','[]'::jsonb);
  r:=jsonb_set(r,'{participants}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'compte',m.compte,'identite',ephemer_social.identite(m.compte),'role',m.role,'etat',m.etat) ORDER BY m.id)
    FROM ephemer_celebrations.participations m WHERE m.celebration=c AND m.etat='active' AND NOT ephemer_social.bloquee(a,m.compte)),'[]'::jsonb));
  r:=jsonb_set(r,'{transferts}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'cible',t.cible,'initiateur',t.initiateur,'expiration',t.expire_at) ORDER BY t.id)
    FROM ephemer_celebrations.transferts t WHERE t.celebration=c AND t.etat='attente' AND t.expire_at>now() AND (est_admin OR t.cible=a)),'[]'::jsonb));
  IF est_maintenance THEN RETURN r; END IF;
  r:=jsonb_set(r,'{taches}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'titre',t.titre,'type',t.type,'responsable',t.responsable,'echeance',t.echeance,'etat',t.etat,'revision',t.revision,'auteur',t.auteur) ORDER BY t.id) FROM ephemer_celebrations.taches t WHERE t.celebration=c AND (e.destinataire IS DISTINCT FROM a OR t.type NOT IN ('cadeau','message'))),'[]'::jsonb));
  r:=jsonb_set(r,'{commentaires}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'texte',t.texte,'auteur',t.auteur,'revision',t.revision,'identite',CASE WHEN EXISTS(SELECT 1 FROM ephemer_celebrations.participations m WHERE m.celebration=c AND m.compte=t.auteur AND m.etat='active') THEN ephemer_social.identite(t.auteur) ELSE 'Participant parti' END) ORDER BY t.created_at,t.id) FROM ephemer_celebrations.commentaires t WHERE t.celebration=c),'[]'::jsonb));
  IF est_admin THEN r:=jsonb_set(r,'{invitations}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'cible',t.cible,'identite',ephemer_social.identite(t.cible),'expiration',t.expire_at) ORDER BY t.id) FROM ephemer_celebrations.invitations t WHERE t.celebration=c AND t.etat='attente' AND t.expire_at>now()),'[]'::jsonb)); END IF;
  r:=jsonb_set(r,'{demandes}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'demandeur',t.demandeur,'motif',t.motif,'etat',t.etat,'revision',t.revision) ORDER BY t.id)
    FROM ephemer_celebrations.demandes t WHERE t.celebration=c AND (t.demandeur=a OR (est_admin AND (ephemer_celebrations.lisible(c,t.demandeur) OR ephemer_celebrations.invite(c,t.demandeur))))),'[]'::jsonb));
  r:=jsonb_set(r,'{actions}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'action',t.action,'date',t.created_at) ORDER BY t.created_at DESC,t.id DESC) FROM ephemer_celebrations.actions t WHERE t.celebration=c AND (e.destinataire IS DISTINCT FROM a OR t.action NOT IN ('ajouter_tache','modifier_tache','publier'))),'[]'::jsonb));
  r:=jsonb_set(r,'{notifications}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'type',t.type,'date',t.created_at) ORDER BY t.created_at DESC,t.id DESC) FROM ephemer_celebrations.notifications t WHERE t.celebration=c AND t.compte=a),'[]'::jsonb));
  RETURN r;
END $fn$;
CREATE FUNCTION ephemer_celebrations.lire(c uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $fn$
BEGIN RETURN ephemer_celebrations.detail(c,ephemer_social.acteur()); END $fn$;
CREATE FUNCTION ephemer_celebrations.export_personnel(c uuid,a uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE r jsonb:=ephemer_celebrations.detail(c,a); propre_membre uuid;
BEGIN
  SELECT id INTO propre_membre FROM ephemer_celebrations.participations WHERE celebration=c AND compte=a AND etat='active';
  r:=jsonb_set(r,'{participants}',coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(r->'participants') x WHERE x->>'compte'=a::text),'[]'::jsonb));
  r:=jsonb_set(r,'{commentaires}',coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(r->'commentaires') x WHERE x->>'auteur'=a::text),'[]'::jsonb));
  r:=jsonb_set(r,'{taches}',coalesce((SELECT jsonb_agg(CASE WHEN x->>'responsable' IS DISTINCT FROM propre_membre::text THEN jsonb_set(x,'{responsable}','null') ELSE x END) FROM jsonb_array_elements(r->'taches') x WHERE x->>'auteur'=a::text),'[]'::jsonb));
  r:=jsonb_set(r,'{demandes}',coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(r->'demandes') x WHERE x->>'demandeur'=a::text),'[]'::jsonb));
  r:=jsonb_set(jsonb_set(jsonb_set(r,'{invitations}','[]'),'{transferts}','[]'),'{actions}','[]');
  RETURN r;
END $fn$;
CREATE FUNCTION ephemer_celebrations.lister(apres uuid,limite integer,vue text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); r jsonb;
BEGIN
  IF limite IS NULL OR limite NOT BETWEEN 1 AND 100 OR vue IS NULL OR vue NOT IN ('liste','invitations','export') THEN RAISE EXCEPTION 'Lecture invalide' USING ERRCODE='22023'; END IF;
  IF vue='export' AND limite<>1 THEN RAISE EXCEPTION 'Export une celebration par page' USING ERRCODE='22023'; END IF;
  IF vue='invitations' THEN
    SELECT coalesce(jsonb_agg(x.obj ORDER BY x.id),'[]'::jsonb) INTO r FROM (
      SELECT i.id,jsonb_build_object('id',i.id,'type','invitation','celebration',e.id,'titre',e.titre,'date',e.date_fete,'emetteur',ephemer_social.identite(i.emetteur),'expiration',i.expire_at,
        'demande',(SELECT jsonb_build_object('id',de.id,'etat',de.etat,'revision',de.revision) FROM ephemer_celebrations.demandes de WHERE de.celebration=e.id AND de.demandeur=a ORDER BY de.created_at DESC,de.id DESC LIMIT 1)) AS obj
      FROM ephemer_celebrations.invitations i JOIN ephemer_celebrations.celebrations e ON e.id=i.celebration
      WHERE i.cible=a AND i.etat='attente' AND i.expire_at>now() AND (apres IS NULL OR i.id>apres) AND ephemer_celebrations.invite(e.id,a)
      UNION ALL
      SELECT t.id,jsonb_build_object('id',t.id,'type','transfert','celebration',e.id,'titre',CASE WHEN e.etat='suspendue' THEN 'Transfert de responsabilité' ELSE e.titre END,'date',CASE WHEN e.etat='suspendue' THEN NULL ELSE e.date_fete END,'emetteur',ephemer_social.identite(t.initiateur),'expiration',t.expire_at,'demande',NULL)
      FROM ephemer_celebrations.transferts t JOIN ephemer_celebrations.celebrations e ON e.id=t.celebration
      WHERE t.cible=a AND t.etat='attente' AND t.expire_at>now() AND e.etat IN ('active','suspendue') AND (apres IS NULL OR t.id>apres)
        AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a) AND NOT ephemer_social.bloquee(a,t.initiateur)
        AND EXISTS(SELECT 1 FROM ephemer_celebrations.participations m WHERE m.celebration=e.id AND m.compte=a AND m.etat='active')
      UNION ALL
      SELECT de.id,jsonb_build_object('id',de.id,'type','suppression','celebration',e.id,'titre','Célébration supprimée','date',NULL,'emetteur','Réponse à ta demande','expiration',de.decide_at+interval '30 days',
        'demande',jsonb_build_object('id',de.id,'etat','acceptee','revision',de.revision))
      FROM ephemer_celebrations.demandes de JOIN ephemer_celebrations.celebrations e ON e.id=de.celebration
      WHERE de.demandeur=a AND de.etat='acceptee' AND e.etat='supprimee' AND de.decide_at>now()-interval '30 days'
        AND (apres IS NULL OR de.id>apres) AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a)
      ORDER BY id LIMIT limite) x;
  ELSE
    SELECT coalesce(jsonb_agg(x.obj ORDER BY x.id),'[]'::jsonb) INTO r FROM (
      SELECT e.id,CASE WHEN vue='export' THEN ephemer_celebrations.export_personnel(e.id,a) ELSE ephemer_celebrations.resume(e.id,a) END AS obj
      FROM ephemer_celebrations.celebrations e WHERE (apres IS NULL OR e.id>apres)
        AND (ephemer_celebrations.lisible(e.id,a) OR (vue='liste' AND ephemer_celebrations.maintenance(e.id,a))) ORDER BY e.id LIMIT limite) x;
  END IF;
  RETURN jsonb_build_object('items',r);
END $fn$;

-- Le blocage social coupe le partage dans LA MEME transaction.
CREATE FUNCTION ephemer_celebrations.apres_blocage() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE r record; m ephemer_celebrations.participations;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
  FOR r IN SELECT DISTINCT e.id,e.surprise,e.destinataire FROM ephemer_celebrations.celebrations e
    JOIN ephemer_celebrations.participations x ON x.celebration=e.id AND x.compte=NEW.user_id AND x.etat='active'
    JOIN ephemer_celebrations.participations y ON y.celebration=e.id AND y.compte=NEW.cible_id AND y.etat='active'
    WHERE e.etat<>'supprimee' ORDER BY e.id LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-celebration:'||r.id::text,0));
    PERFORM 1 FROM ephemer_celebrations.celebrations WHERE id=r.id FOR UPDATE;
    SELECT * INTO m FROM ephemer_celebrations.participations WHERE celebration=r.id AND compte=NEW.user_id AND etat='active';
    IF m.role='organisateur' AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration=r.id AND etat='active' AND role='organisateur' AND id<>m.id AND (NOT r.surprise OR compte IS DISTINCT FROM r.destinataire)) THEN
      UPDATE ephemer_celebrations.participations SET etat='maintenance' WHERE id=m.id;
      UPDATE ephemer_celebrations.celebrations SET etat='suspendue',revision=revision+1 WHERE id=r.id;
      UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=r.id AND etat='attente';
      UPDATE ephemer_celebrations.transferts SET etat='annule' WHERE celebration=r.id AND etat='attente';
      DELETE FROM ephemer_celebrations.notifications WHERE celebration=r.id;
      UPDATE ephemer_celebrations.taches SET responsable=NULL,revision=revision+1 WHERE celebration=r.id AND responsable=m.id;
    ELSE PERFORM ephemer_celebrations.sortir(r.id,m.id); END IF;
    PERFORM ephemer_celebrations.tracer(r.id,'participation_retiree');
  END LOOP;
  UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE etat='attente' AND ((emetteur=NEW.user_id AND cible=NEW.cible_id) OR (emetteur=NEW.cible_id AND cible=NEW.user_id));
  RETURN NEW;
END $fn$;
CREATE TRIGGER celebrations_blocage AFTER INSERT ON ephemer_social.blocages_etoiles FOR EACH ROW EXECUTE FUNCTION ephemer_celebrations.apres_blocage();

CREATE FUNCTION ephemer_celebrations.effacer_compte(a uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE r record; m record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
  FOR r IN SELECT DISTINCT e.id FROM ephemer_celebrations.celebrations e LEFT JOIN ephemer_celebrations.participations p ON p.celebration=e.id
    WHERE e.destinataire=a OR p.compte=a ORDER BY e.id LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-celebration:'||r.id::text,0));
    PERFORM 1 FROM ephemer_celebrations.celebrations WHERE id=r.id FOR UPDATE;
    FOR m IN SELECT id FROM ephemer_celebrations.participations WHERE celebration=r.id AND compte=a LOOP PERFORM ephemer_celebrations.sortir(r.id,m.id); END LOOP;
    IF NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations p JOIN ephemer_celebrations.celebrations e ON e.id=p.celebration WHERE p.celebration=r.id AND p.role='organisateur' AND p.etat='active' AND (NOT e.surprise OR p.compte IS DISTINCT FROM e.destinataire)) THEN
      UPDATE ephemer_celebrations.celebrations SET etat='annulee',revision=revision+1 WHERE id=r.id AND etat<>'supprimee';
      UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=r.id AND etat='attente';
    END IF;
    IF EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations WHERE id=r.id AND surprise AND destinataire=a AND etat<>'supprimee') THEN
      UPDATE ephemer_celebrations.celebrations SET etat='suspendue',revision=revision+1 WHERE id=r.id;
      UPDATE ephemer_celebrations.participations SET etat='maintenance' WHERE celebration=r.id AND role='organisateur' AND etat='active';
    END IF;
    DELETE FROM ephemer_celebrations.taches WHERE celebration=r.id AND auteur=a;
    DELETE FROM ephemer_celebrations.commentaires WHERE celebration=r.id AND auteur=a;
    DELETE FROM ephemer_celebrations.notifications WHERE celebration=r.id;
  END LOOP;
END $fn$;
CREATE FUNCTION ephemer_celebrations.avant_effacement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
BEGIN PERFORM ephemer_celebrations.effacer_compte(OLD.id); RETURN OLD; END $fn$;
CREATE TRIGGER celebrations_effacement BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION ephemer_celebrations.avant_effacement();
CREATE FUNCTION ephemer_celebrations.preparer_effacement() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=auth.uid();
BEGIN
  IF a IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=a AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Connexion requise' USING ERRCODE='28000'; END IF;
  -- L'effacement de son compte reste possible meme sans email confirme ou pour un compte anonyme.
  PERFORM ephemer_celebrations.effacer_compte(a); RETURN jsonb_build_object('ok',true);
END $fn$;
CREATE FUNCTION public.preparer_effacement_celebrations() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_celebrations.preparer_effacement(); $fn$;

CREATE FUNCTION public.commander_celebrations(p_action text,p_donnees jsonb,p_operation uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_celebrations.commander(p_action,p_donnees,p_operation); $fn$;
CREATE FUNCTION public.lire_celebration(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_celebrations.lire(p_id); $fn$;
CREATE FUNCTION public.lire_celebrations(p_apres uuid DEFAULT NULL,p_limite integer DEFAULT 100) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_celebrations.lister(p_apres,p_limite,'liste'); $fn$;
CREATE FUNCTION public.lire_invitations_celebrations(p_apres uuid DEFAULT NULL,p_limite integer DEFAULT 100) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_celebrations.lister(p_apres,p_limite,'invitations'); $fn$;
CREATE FUNCTION public.exporter_celebrations(p_apres uuid DEFAULT NULL,p_limite integer DEFAULT 1) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_celebrations.lister(p_apres,p_limite,'export'); $fn$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ephemer_celebrations FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA ephemer_celebrations TO authenticated;
GRANT EXECUTE ON FUNCTION ephemer_celebrations.commander(text,jsonb,uuid),ephemer_celebrations.lire(uuid),ephemer_celebrations.lister(uuid,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION ephemer_celebrations.preparer_effacement() TO authenticated;
REVOKE ALL ON FUNCTION public.commander_celebrations(text,jsonb,uuid),public.lire_celebration(uuid),public.lire_celebrations(uuid,integer),public.lire_invitations_celebrations(uuid,integer),public.exporter_celebrations(uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.commander_celebrations(text,jsonb,uuid),public.lire_celebration(uuid),public.lire_celebrations(uuid,integer),public.lire_invitations_celebrations(uuid,integer),public.exporter_celebrations(uuid,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.preparer_effacement_celebrations() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.preparer_effacement_celebrations() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
