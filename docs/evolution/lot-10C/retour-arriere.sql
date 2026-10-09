-- Retour HUMAINE au fonctionnement 10B, SANS supprimer de colonne, permission ou journal.
-- Revenir au code 10B en même temps. Les valeurs 10C sont conservées et inactives.
-- Même session : SET ephemer.lot10c_retour='CONFIRME_RETOUR_10B_SANS_PERTE';
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_user<>'postgres' OR current_setting('ephemer.lot10c_retour',true) IS DISTINCT FROM 'CONFIRME_RETOUR_10B_SANS_PERTE' THEN
    RAISE EXCEPTION 'Retour humain confirme requis'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
END;
$garde$;
CREATE OR REPLACE FUNCTION ephemer_social.univers_lire(cible uuid DEFAULT NULL) RETURNS jsonb
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
CREATE OR REPLACE FUNCTION ephemer_social.univers_commander(action_demandee text,donnees jsonb,attendue bigint,operation uuid) RETURNS jsonb
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
-- Les sauvegardes 10B ne touchent pas ia_cadeaux. Supprimer le CHECK dépendant du partage,
-- sans effacer les permissions ; les accès IA restent fermés ci-dessous.
ALTER TABLE ephemer_social.univers_utilisateurs DROP CONSTRAINT lot10c_ia_cadeaux;
-- CHECK structurel de conservation : masque artificiel complet pour les permissions historiques.
ALTER TABLE ephemer_social.univers_utilisateurs ADD CONSTRAINT lot10c_ia_cadeaux CHECK(ephemer_social.ia_cadeaux_valide(
  '{"presentation":true,"passions":true,"plaisirs":true,"eviter":true}'::jsonb,ia_cadeaux));
REVOKE ALL ON FUNCTION ephemer_social.univers_cadeaux(uuid,text[],bigint,bigint,bigint),
  public.consulter_univers_cadeaux(uuid),public.resoudre_univers_cadeaux(uuid,text[],bigint,bigint,bigint) FROM PUBLIC,anon,authenticated,service_role;
-- Ne jamais réouvrir le compteur lors d'un retour.
REVOKE EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
