-- Fragment généré dans le contrôle combiné, ne pas lancer seul.
DO $cadeaux_catalogue$
DECLARE f record; p record;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ephemer_social.univers_utilisateurs'::regclass
    AND conname='lot10c_ia_cadeaux' AND pg_get_constraintdef(oid)='CHECK (ephemer_social.ia_cadeaux_valide(partage, ia_cadeaux))')
    OR (SELECT pg_get_expr(adbin,adrelid) FROM pg_attrdef WHERE adrelid='ephemer_social.univers_utilisateurs'::regclass
      AND adnum=(SELECT attnum FROM pg_attribute WHERE attrelid='ephemer_social.univers_utilisateurs'::regclass AND attname='ia_cadeaux')) IS DISTINCT FROM
      '''{"eviter": false, "identite": false, "passions": false, "plaisirs": false, "presentation": false}''::jsonb' THEN
    RAISE EXCEPTION 'Permissions initiales/contrainte 10C divergentes'; END IF;
  FOR f IN SELECT * FROM (VALUES
    ('ephemer_social.ia_cadeaux_valide(jsonb,jsonb)','__HASH_ephemer_social.ia_cadeaux_valide__','plpgsql',false,ARRAY['p','i']),
    ('ephemer_social.univers_cadeaux(uuid,text[],bigint,bigint,bigint)','__HASH_ephemer_social.univers_cadeaux__','plpgsql',true,ARRAY['cible','selection','attendue','relation_attendue','contact']),
    ('public.consulter_univers_cadeaux(uuid)','__HASH_public.consulter_univers_cadeaux__','sql',false,ARRAY['p_etoile']),
    ('public.resoudre_univers_cadeaux(uuid,text[],bigint,bigint,bigint)','__HASH_public.resoudre_univers_cadeaux__','plpgsql',false,ARRAY['p_etoile','p_champs','p_revision','p_revision_relation','p_contact'])
  ) attentes(signature,empreinte,langue,definer,noms) LOOP
    SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure(f.signature);
    IF p.oid IS NULL OR md5(replace(p.prosrc,E'\r\n',E'\n')) IS DISTINCT FROM f.empreinte
      OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog'] OR p.prosecdef IS DISTINCT FROM f.definer
      OR p.provolatile::text IS DISTINCT FROM (CASE WHEN p.proname='ia_cadeaux_valide' THEN 'i' ELSE 's' END)
      OR p.prorettype IS DISTINCT FROM (CASE WHEN p.proname='ia_cadeaux_valide' THEN 'boolean'::regtype ELSE 'jsonb'::regtype END)
      OR p.proretset OR (SELECT lanname FROM pg_language WHERE oid=p.prolang) IS DISTINCT FROM f.langue
      OR p.proargnames IS DISTINCT FROM f.noms OR p.pronargdefaults<>0 OR p.prokind<>'f' OR p.proleakproof
      OR p.proowner IS DISTINCT FROM (SELECT oid FROM pg_roles WHERE rolname='postgres')
      OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('service_role',p.oid,'EXECUTE')
      OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM (p.proname<>'ia_cadeaux_valide') THEN
      RAISE EXCEPTION 'Fonction 10C divergente : %',f.signature; END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace
    AND proname IN ('consulter_univers_cadeaux','resoudre_univers_cadeaux'))<>2 THEN
    RAISE EXCEPTION 'RPC cadeaux absente ou surcharge inattendue'; END IF;
  IF to_regprocedure('public.incrementer_quota_ia(uuid)') IS NULL
    OR has_function_privilege('anon','public.incrementer_quota_ia(uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.incrementer_quota_ia(uuid)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.incrementer_quota_ia(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Quota encore expose ou inaccessible au serveur'; END IF;
END;
$cadeaux_catalogue$;
