-- PROPOSITION 10B : application HUMAINE après revue/sauvegarde, jamais par l'assistant.
-- Prérequis : contrôle complet lot10a_catalogue_conforme et avatar installé V1/V3.
-- Ne pas exposer ephemer_social dans la Data API. Aucun changement de profils/carnets.
BEGIN;
-- Lancer ce fichier complet après validation humaine confirme l'installation.
-- Confirmation locale à cette transaction : aucun SET séparé n'est nécessaire.
SET LOCAL ephemer.lot10b_installation='CONFIRME_INSTALLATION_10B';
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_user<>'postgres' THEN RAISE EXCEPTION 'Installation réservée au rôle postgres après revue humaine'; END IF;
  IF current_setting('ephemer.lot10b_installation',true) IS DISTINCT FROM 'CONFIRME_INSTALLATION_10B' THEN
    RAISE EXCEPTION 'Revue humaine requise : définir ephemer.lot10b_installation dans cette session'; END IF;
  IF to_regprocedure('ephemer_social.acteur()') IS NULL
    OR to_regprocedure('ephemer_lot09.avatar_valide(jsonb)') IS NULL
    OR to_regclass('public.avatars_utilisateurs') IS NULL THEN RAISE EXCEPTION 'Prérequis 10A/avatar absents'; END IF;
  IF to_regclass('ephemer_social.univers_utilisateurs') IS NOT NULL
    OR to_regclass('ephemer_social.operations_univers') IS NOT NULL THEN RAISE EXCEPTION '10B déjà présent : ne pas rejouer'; END IF;
  IF md5(replace((SELECT prosrc FROM pg_proc WHERE oid='ephemer_social.identite(uuid)'::regprocedure),E'\r\n',E'\n'))<>'5af7f37c9c3b92bf192fa4957fc4f0d3' THEN
    RAISE EXCEPTION 'Identité 10A divergente : arrêter et revoir le dossier'; END IF;
END;
$garde$;

CREATE FUNCTION ephemer_social.valeurs_univers_valides(v jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE k text; d jsonb; j integer; m integer; y integer;
BEGIN
  IF v IS NULL OR jsonb_typeof(v)<>'object' OR octet_length(v::text)>24576 THEN RETURN false; END IF;
  IF (SELECT array_agg(c ORDER BY c) FROM jsonb_object_keys(v) AS keys(c)) IS DISTINCT FROM
    ARRAY['anniversaire','email','eviter','passions','plaisirs','presentation','telephone'] THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['presentation','passions','plaisirs','eviter','email','telephone'] LOOP
    IF jsonb_typeof(v->k)<>'string' OR char_length(v->>k)>
      (CASE WHEN k='email' THEN 320 WHEN k='telephone' THEN 32 ELSE 1000 END) THEN RETURN false; END IF;
    -- Tabulation et retours à la ligne autorisés dans les textes, jamais du HTML exécuté.
    IF translate(v->>k,E'\t\r\n','') ~ '[[:cntrl:]]' THEN RETURN false; END IF;
  END LOOP;
  IF v->>'email'<>'' AND ((v->>'email')<>ephemer_social.normaliser_email(v->>'email')
    OR (v->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN RETURN false; END IF;
  IF v->>'telephone'<>'' AND (v->>'telephone') !~ '^\+?[0-9][0-9 ().-]*$' THEN RETURN false; END IF;
  d:=v->'anniversaire';
  IF d='null'::jsonb THEN RETURN true; END IF;
  IF jsonb_typeof(d)<>'object' THEN RETURN false; END IF;
  IF (SELECT array_agg(c ORDER BY c) FROM jsonb_object_keys(d) AS keys(c)) IS DISTINCT FROM ARRAY['annee','jour','mois'] THEN RETURN false; END IF;
  IF jsonb_typeof(d->'jour')<>'number' OR jsonb_typeof(d->'mois')<>'number'
    OR (d->>'jour') !~ '^[0-9]{1,2}$' OR (d->>'mois') !~ '^[0-9]{1,2}$' THEN RETURN false; END IF;
  IF d->'annee'<>'null'::jsonb AND (jsonb_typeof(d->'annee')<>'number' OR (d->>'annee') !~ '^[0-9]{1,4}$') THEN RETURN false; END IF;
  j:=(d->>'jour')::integer; m:=(d->>'mois')::integer;
  y:=coalesce((d->>'annee')::integer,2000);
  IF y<1 OR y>9999 THEN RETURN false; END IF;
  PERFORM make_date(y,m,j); -- Année fictive de validation seulement pour 29/02 sans année.
  RETURN true;
EXCEPTION WHEN datetime_field_overflow OR invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END;
$fn$;

CREATE FUNCTION ephemer_social.partage_univers_valide(v jsonb,p jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE k text;
BEGIN
  IF p IS NULL OR jsonb_typeof(p)<>'object' OR NOT ephemer_social.valeurs_univers_valides(v) THEN RETURN false; END IF;
  IF (SELECT array_agg(c ORDER BY c) FROM jsonb_object_keys(p) AS keys(c)) IS DISTINCT FROM
    ARRAY['annee','anniversaire','avatar','email','eviter','passions','plaisirs','presentation','telephone'] THEN RETURN false; END IF;
  FOR k IN SELECT jsonb_object_keys(p) LOOP IF jsonb_typeof(p->k)<>'boolean' THEN RETURN false; END IF; END LOOP;
  IF p->'anniversaire'='true'::jsonb AND v->'anniversaire'='null'::jsonb THEN RETURN false; END IF;
  IF p->'annee'='true'::jsonb AND (p->'anniversaire'<>'true'::jsonb OR v->'anniversaire'->'annee'='null'::jsonb) THEN RETURN false; END IF;
  RETURN true;
END;
$fn$;

CREATE TABLE ephemer_social.univers_utilisateurs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mode_identite text NOT NULL CHECK(mode_identite IN ('prenom','pseudonyme')),
  identite text NOT NULL CHECK(char_length(identite) BETWEEN 1 AND 80 AND btrim(identite)<>''
    AND identite !~ '^[[:space:]]|[[:space:]]$' AND translate(identite,E'\t\r\n','') !~ '[[:cntrl:]]'),
  valeurs jsonb NOT NULL CHECK(ephemer_social.valeurs_univers_valides(valeurs)),
  partage jsonb NOT NULL CHECK(ephemer_social.partage_univers_valide(valeurs,partage)),
  revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ephemer_social.operations_univers (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  empreinte text NOT NULL CHECK(empreinte ~ '^[0-9a-f]{64}$'),
  resultat jsonb NOT NULL CHECK(jsonb_typeof(resultat)='object' AND octet_length(resultat::text)<256),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,operation_id)
);
ALTER TABLE ephemer_social.univers_utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ephemer_social.operations_univers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ephemer_social.univers_utilisateurs,ephemer_social.operations_univers FROM PUBLIC,anon,authenticated,service_role;

-- Seule modification de fonction 10A. Les lecteurs existants gardent leurs filtres.
CREATE OR REPLACE FUNCTION ephemer_social.identite(v uuid) RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT coalesce(u.identite,nullif(left(btrim(p.prenom),80),''),'Une etoile')
    FROM (SELECT 1) x LEFT JOIN ephemer_social.univers_utilisateurs u ON u.user_id=v
    LEFT JOIN public.profiles p ON p.id=v;
$fn$;

CREATE FUNCTION ephemer_social.univers_lire(cible uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); b uuid:=coalesce(cible,a); u ephemer_social.univers_utilisateurs;
  valeurs_vides jsonb:='{"presentation":"","passions":"","plaisirs":"","eviter":"","anniversaire":null,"email":"","telephone":""}';
  partage_vide jsonb:='{"presentation":false,"passions":false,"plaisirs":false,"eviter":false,"anniversaire":false,"annee":false,"email":false,"telephone":false,"avatar":false}';
  champs jsonb:='{}'; k text; avatar jsonb; anniversaire jsonb;
BEGIN
  -- Un retrait déjà validé interdit les nouvelles lectures ; pas de permissions dans un JWT.
  IF b<>a AND (ephemer_social.bloquee(a,b) OR NOT EXISTS(SELECT 1 FROM ephemer_social.relations_etoiles
    WHERE compte_a=least(a,b) AND compte_b=greatest(a,b) AND etat='active')) THEN
    RAISE EXCEPTION 'Univers indisponible' USING ERRCODE='42501'; END IF;
  SELECT * INTO u FROM ephemer_social.univers_utilisateurs WHERE user_id=b;
  IF cible IS NULL THEN
    RETURN jsonb_build_object('revision',coalesce(u.revision,0),'modeIdentite',coalesce(u.mode_identite,'prenom'),
      'identite',ephemer_social.identite(a),'valeurs',coalesce(u.valeurs,valeurs_vides),'partage',coalesce(u.partage,partage_vide));
  END IF;
  FOREACH k IN ARRAY ARRAY['presentation','passions','plaisirs','eviter','email','telephone'] LOOP
    IF u.partage->k='true'::jsonb AND u.valeurs->>k<>'' THEN champs:=champs||jsonb_build_object(k,u.valeurs->k); END IF;
  END LOOP;
  IF u.partage->'anniversaire'='true'::jsonb THEN
    anniversaire:=jsonb_build_object('jour',u.valeurs->'anniversaire'->'jour','mois',u.valeurs->'anniversaire'->'mois');
    IF u.partage->'annee'='true'::jsonb THEN anniversaire:=anniversaire||jsonb_build_object('annee',u.valeurs->'anniversaire'->'annee'); END IF;
    champs:=champs||jsonb_build_object('anniversaire',anniversaire);
  END IF;
  IF u.partage->'avatar'='true'::jsonb THEN
    SELECT configuration INTO avatar FROM public.avatars_utilisateurs WHERE user_id=b;
    IF avatar IS NOT NULL AND ephemer_lot09.avatar_valide(avatar) THEN champs:=champs||jsonb_build_object('avatar',avatar); END IF;
  END IF;
  RETURN jsonb_build_object('identite',ephemer_social.identite(b),'champs',champs);
END;
$fn$;

CREATE FUNCTION ephemer_social.univers_commander(action_demandee text,donnees jsonb,attendue bigint,operation uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); u ephemer_social.univers_utilisateurs; op ephemer_social.operations_univers;
  empreinte_args text; courante bigint; resultat jsonb;
BEGIN
  IF action_demandee IS NULL OR action_demandee NOT IN ('enregistrer','masquer') OR operation IS NULL
    OR attendue IS NULL OR attendue<0 OR attendue>=9007199254740991 OR donnees IS NULL
    OR jsonb_typeof(donnees)<>'object' OR octet_length(donnees::text)>28672 THEN
    RAISE EXCEPTION 'Commande univers invalide' USING ERRCODE='22023'; END IF;
  IF action_demandee='enregistrer' THEN
    IF (SELECT array_agg(c ORDER BY c) FROM jsonb_object_keys(donnees) AS keys(c)) IS DISTINCT FROM ARRAY['identite','modeIdentite','partage','valeurs']
      OR jsonb_typeof(donnees->'identite') IS DISTINCT FROM 'string'
      OR jsonb_typeof(donnees->'modeIdentite') IS DISTINCT FROM 'string'
      OR (donnees->>'modeIdentite') NOT IN ('prenom','pseudonyme')
      OR char_length(donnees->>'identite') NOT BETWEEN 1 AND 80
      OR btrim(donnees->>'identite')='' OR (donnees->>'identite') ~ '^[[:space:]]|[[:space:]]$'
      OR translate(donnees->>'identite',E'\t\r\n','') ~ '[[:cntrl:]]'
      OR NOT ephemer_social.partage_univers_valide(donnees->'valeurs',donnees->'partage') THEN
      RAISE EXCEPTION 'Données univers invalides' USING ERRCODE='22023'; END IF;
  ELSIF donnees<>'{}'::jsonb THEN RAISE EXCEPTION 'Masquage invalide' USING ERRCODE='22023'; END IF;
  empreinte_args:=encode(extensions.digest(action_demandee||':'||attendue::text||':'||donnees::text,'sha256'),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
  SELECT * INTO op FROM ephemer_social.operations_univers WHERE user_id=a AND operation_id=operation;
  IF FOUND THEN
    IF op.empreinte<>empreinte_args THEN RAISE EXCEPTION 'Opération réutilisée' USING ERRCODE='22023'; END IF;
    RETURN op.resultat; -- Jamais une ancienne valeur de champ ou un avatar dans le journal.
  END IF;
  SELECT * INTO u FROM ephemer_social.univers_utilisateurs WHERE user_id=a;
  courante:=coalesce(u.revision,0);
  IF courante<>attendue THEN RAISE EXCEPTION 'Univers modifié : relire' USING ERRCODE='P1009'; END IF;
  IF action_demandee='enregistrer' THEN
    INSERT INTO ephemer_social.univers_utilisateurs(user_id,mode_identite,identite,valeurs,partage,revision)
      VALUES(a,donnees->>'modeIdentite',donnees->>'identite',donnees->'valeurs',donnees->'partage',courante+1)
      ON CONFLICT(user_id) DO UPDATE SET mode_identite=excluded.mode_identite,identite=excluded.identite,
        valeurs=excluded.valeurs,partage=excluded.partage,revision=excluded.revision,updated_at=now();
    courante:=courante+1;
  ELSIF courante>0 THEN
    UPDATE ephemer_social.univers_utilisateurs SET partage='{"presentation":false,"passions":false,"plaisirs":false,"eviter":false,"anniversaire":false,"annee":false,"email":false,"telephone":false,"avatar":false}',
      revision=courante+1,updated_at=now() WHERE user_id=a;
    courante:=courante+1;
  END IF;
  resultat:=jsonb_build_object('ok',true,'revision',courante);
  INSERT INTO ephemer_social.operations_univers(user_id,operation_id,empreinte,resultat) VALUES(a,operation,empreinte_args,resultat);
  RETURN resultat;
END;
$fn$;

CREATE FUNCTION public.lire_mon_univers() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_social.univers_lire(NULL); $fn$;
CREATE FUNCTION public.consulter_univers_etoile(p_etoile uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
  IF p_etoile IS NULL OR p_etoile=auth.uid() THEN RAISE EXCEPTION 'Univers indisponible' USING ERRCODE='42501'; END IF;
  RETURN ephemer_social.univers_lire(p_etoile);
END;
$fn$;
CREATE FUNCTION public.commander_mon_univers(p_action text,p_donnees jsonb,p_revision bigint,p_operation uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$ SELECT ephemer_social.univers_commander(p_action,p_donnees,p_revision,p_operation); $fn$;

-- EXECUTE PUBLIC n'est jamais laissé par défaut, même pour les helpers invoker.
REVOKE ALL ON FUNCTION ephemer_social.valeurs_univers_valides(jsonb),ephemer_social.partage_univers_valide(jsonb,jsonb),
  ephemer_social.identite(uuid),ephemer_social.univers_lire(uuid),ephemer_social.univers_commander(text,jsonb,bigint,uuid),
  public.lire_mon_univers(),public.consulter_univers_etoile(uuid),public.commander_mon_univers(text,jsonb,bigint,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION ephemer_social.univers_lire(uuid),ephemer_social.univers_commander(text,jsonb,bigint,uuid),
  public.lire_mon_univers(),public.consulter_univers_etoile(uuid),public.commander_mon_univers(text,jsonb,bigint,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
