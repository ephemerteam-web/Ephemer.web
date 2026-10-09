-- Fragment de préparation : ne pas exécuter seul. Inclus dans schema-propose.sql.
CREATE FUNCTION ephemer_social.ia_cadeaux_valide(p jsonb,i jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE k text;
BEGIN
  IF p IS NULL OR i IS NULL OR jsonb_typeof(p)<>'object' OR jsonb_typeof(i)<>'object' THEN RETURN false; END IF;
  IF (SELECT array_agg(c ORDER BY c) FROM jsonb_object_keys(i) AS keys(c)) IS DISTINCT FROM
    ARRAY['eviter','identite','passions','plaisirs','presentation'] THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['identite','presentation','passions','plaisirs','eviter'] LOOP
    IF jsonb_typeof(i->k) IS DISTINCT FROM 'boolean' THEN RETURN false; END IF;
    IF k<>'identite' AND i->k='true'::jsonb AND p->k IS DISTINCT FROM 'true'::jsonb THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END;
$fn$;

-- NULL sélection = consultation ; tableau non vide = résolution d'une génération.
-- Aucune coordonnées/date/avatar ni permissions brutes dans ces projections.
CREATE FUNCTION ephemer_social.univers_cadeaux(cible uuid,selection text[],attendue bigint,relation_attendue bigint,contact bigint) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); u ephemer_social.univers_utilisateurs;
  r ephemer_social.relations_etoiles; champs jsonb:='{}'; k text;
BEGIN
  IF cible IS NULL OR cible=a OR ephemer_social.bloquee(a,cible) THEN
    RAISE EXCEPTION 'Univers indisponible' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM ephemer_social.relations_etoiles WHERE compte_a=least(a,cible)
    AND compte_b=greatest(a,cible) AND etat='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Univers indisponible' USING ERRCODE='42501'; END IF;
  IF contact IS NOT NULL AND (contact<=0 OR NOT EXISTS(SELECT 1 FROM ephemer_social.contacts_etoiles
    WHERE user_id=a AND contact_id=contact AND etoile_id=cible)) THEN
    RAISE EXCEPTION 'Association modifiee : relire' USING ERRCODE='P1009'; END IF;
  SELECT * INTO u FROM ephemer_social.univers_utilisateurs WHERE user_id=cible;
  IF selection IS NOT NULL THEN
    IF cardinality(selection) NOT BETWEEN 1 AND 5 OR array_ndims(selection) IS DISTINCT FROM 1
      OR EXISTS(SELECT 1 FROM unnest(selection) AS fields(c) WHERE c IS NULL OR c NOT IN ('identite','presentation','passions','plaisirs','eviter'))
      OR (SELECT count(DISTINCT c) FROM unnest(selection) AS fields(c))<>cardinality(selection)
      OR attendue IS NULL OR attendue<0 OR attendue>9007199254740991
      OR relation_attendue IS NULL OR relation_attendue<1 OR relation_attendue>9007199254740991 THEN
      RAISE EXCEPTION 'Selection invalide' USING ERRCODE='22023'; END IF;
    IF coalesce(u.revision,0)<>attendue OR r.revision<>relation_attendue THEN
      RAISE EXCEPTION 'Informations modifiees : reselectionner' USING ERRCODE='P1009'; END IF;
  ELSIF attendue IS NOT NULL OR relation_attendue IS NOT NULL OR contact IS NOT NULL THEN
    RAISE EXCEPTION 'Consultation invalide' USING ERRCODE='22023'; END IF;
  FOREACH k IN ARRAY ARRAY['identite','presentation','passions','plaisirs','eviter'] LOOP
    IF u.ia_cadeaux->k='true'::jsonb AND (k='identite' OR u.partage->k='true'::jsonb)
      AND (k='identite' OR btrim(u.valeurs->>k)<>'') THEN
      champs:=champs||jsonb_build_object(k,CASE WHEN k='identite' THEN to_jsonb(u.identite) ELSE u.valeurs->k END);
    END IF;
  END LOOP;
  IF selection IS NULL THEN
    RETURN jsonb_build_object('revision',coalesce(u.revision,0),'revisionRelation',r.revision,'champs',champs);
  END IF;
  IF EXISTS(SELECT 1 FROM unnest(selection) AS fields(c) WHERE NOT champs ? c) THEN
    RAISE EXCEPTION 'Autorisation modifiee : reselectionner' USING ERRCODE='P1009'; END IF;
  SELECT coalesce(jsonb_object_agg(c,champs->c),'{}'::jsonb) INTO champs FROM unnest(selection) AS fields(c);
  RETURN jsonb_build_object('revision',u.revision,'revisionRelation',r.revision,'champs',champs);
END;
$fn$;

CREATE FUNCTION public.consulter_univers_cadeaux(p_etoile uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT ephemer_social.univers_cadeaux(p_etoile,NULL,NULL,NULL,NULL);
$fn$;
CREATE FUNCTION public.resoudre_univers_cadeaux(p_etoile uuid,p_champs text[],p_revision bigint,p_revision_relation bigint,p_contact bigint) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
  IF p_champs IS NULL THEN RAISE EXCEPTION 'Selection requise' USING ERRCODE='22023'; END IF;
  RETURN ephemer_social.univers_cadeaux(p_etoile,p_champs,p_revision,p_revision_relation,p_contact);
END;
$fn$;
