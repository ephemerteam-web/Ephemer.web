-- Fragment assemblé avec le contrôle 10A intact (sauf compteurs/identité).
DO $univers_catalogue$
DECLARE t text; v regclass; f record; p record; entree boolean; cols text[]; types_attendus text[]; role_cible text;
BEGIN
  FOREACH t IN ARRAY ARRAY['univers_utilisateurs','operations_univers'] LOOP
    v:=to_regclass('ephemer_social.'||t);
    IF v IS NULL OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=v)
      OR (SELECT relowner FROM pg_class WHERE oid=v)<>(SELECT oid FROM pg_roles WHERE rolname='postgres') THEN
      RAISE EXCEPTION 'Table univers/RLS/propriétaire divergent : %',t; END IF;
    cols:=CASE WHEN t='univers_utilisateurs' THEN ARRAY['user_id','mode_identite','identite','valeurs','partage','revision','created_at','updated_at']
      ELSE ARRAY['user_id','operation_id','empreinte','resultat','created_at'] END;
    types_attendus:=CASE WHEN t='univers_utilisateurs' THEN ARRAY['uuid','text','text','jsonb','jsonb','bigint','timestamp with time zone','timestamp with time zone']
      ELSE ARRAY['uuid','uuid','text','jsonb','timestamp with time zone'] END;
    IF (SELECT array_agg(attname::text ORDER BY attnum) FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped) IS DISTINCT FROM cols
      OR (SELECT array_agg(format_type(atttypid,atttypmod) ORDER BY attnum) FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped) IS DISTINCT FROM types_attendus
      OR EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped AND NOT attnotnull)
      OR (SELECT count(*) FROM pg_constraint WHERE conrelid=v AND contype='f')<>1
      OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND contype='f' AND confrelid='auth.users'::regclass AND confdeltype='c')
      OR EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND NOT convalidated)
      OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=v)
      OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=v AND NOT tgisinternal) THEN RAISE EXCEPTION 'Structure univers divergente : %',t; END IF;
    FOREACH role_cible IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF has_table_privilege(role_cible,v,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege(role_cible,v,'SELECT,INSERT,UPDATE,REFERENCES') THEN RAISE EXCEPTION 'Table univers exposée : %/%',t,role_cible; END IF;
    END LOOP;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ephemer_social.univers_utilisateurs'::regclass AND contype='p' AND pg_get_constraintdef(oid)='PRIMARY KEY (user_id)')
    OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ephemer_social.operations_univers'::regclass AND contype='p' AND pg_get_constraintdef(oid)='PRIMARY KEY (user_id, operation_id)')
    OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ephemer_social.univers_utilisateurs'::regclass AND pg_get_constraintdef(oid)='CHECK (ephemer_social.valeurs_univers_valides(valeurs))')
    OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ephemer_social.univers_utilisateurs'::regclass AND pg_get_constraintdef(oid)='CHECK (ephemer_social.partage_univers_valide(valeurs, partage))')
    OR (SELECT count(*) FROM pg_constraint WHERE conrelid='ephemer_social.univers_utilisateurs'::regclass AND contype='c')<>5
    OR (SELECT count(*) FROM pg_constraint WHERE conrelid='ephemer_social.operations_univers'::regclass AND contype='c')<>2 THEN RAISE EXCEPTION 'Contraintes univers divergentes'; END IF;
  FOR f IN SELECT * FROM (VALUES
    ('ephemer_social.valeurs_univers_valides(jsonb)','__HASH_valeurs_univers_valides__','plpgsql','i',false,false),
    ('ephemer_social.partage_univers_valide(jsonb,jsonb)','__HASH_partage_univers_valide__','plpgsql','i',false,false),
    ('ephemer_social.univers_lire(uuid)','__HASH_univers_lire__','plpgsql','s',true,true),
    ('ephemer_social.univers_commander(text,jsonb,bigint,uuid)','__HASH_univers_commander__','plpgsql','v',true,true),
    ('public.lire_mon_univers()','__HASH_lire_mon_univers__','sql','s',false,true),
    ('public.consulter_univers_etoile(uuid)','__HASH_consulter_univers_etoile__','plpgsql','s',false,true),
    ('public.commander_mon_univers(text,jsonb,bigint,uuid)','__HASH_commander_mon_univers__','sql','v',false,true)
  ) attentes(signature,empreinte,langue,volatilite,definer,entree) LOOP
    SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure(f.signature);
    IF p.oid IS NULL THEN RAISE EXCEPTION 'Fonction univers absente : %',f.signature; END IF;
    entree:=f.entree;
    IF md5(replace(p.prosrc,E'\r\n',E'\n'))<>f.empreinte
      OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog']
      OR p.prosecdef IS DISTINCT FROM f.definer OR p.provolatile::text<>f.volatilite
      OR p.prorettype IS DISTINCT FROM (CASE WHEN p.proname IN ('valeurs_univers_valides','partage_univers_valide') THEN 'boolean'::regtype ELSE 'jsonb'::regtype END)
      OR p.proretset
      OR (SELECT lanname FROM pg_language WHERE oid=p.prolang)<>f.langue
      OR p.proowner<>(SELECT oid FROM pg_roles WHERE rolname='postgres')
      OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('service_role',p.oid,'EXECUTE')
      OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM entree THEN
      RAISE EXCEPTION 'Fonction univers corps/droits divergents : %',f.signature; END IF;
  END LOOP;
  IF to_regprocedure('ephemer_lot09.avatar_valide(jsonb)') IS NULL
    OR to_regclass('public.avatars_utilisateurs') IS NULL THEN RAISE EXCEPTION 'Avatar absent'; END IF;
END;
$univers_catalogue$;
