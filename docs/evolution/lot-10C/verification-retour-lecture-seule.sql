-- Après application HUMAINE du schéma, métadonnées seulement. Aucun contenu personnel.
BEGIN READ ONLY;
SET LOCAL statement_timeout='60s';
DO $catalogue$
DECLARE t text; v regclass; f record; p record; est_entree boolean; cols text[]; types_attendus text[]; role_cible text;
BEGIN
  IF to_regnamespace('ephemer_social') IS NULL THEN RAISE EXCEPTION '10A absent'; END IF;
  IF has_schema_privilege('anon','ephemer_social','USAGE,CREATE')
    OR has_schema_privilege('authenticated','ephemer_social','CREATE')
    OR has_schema_privilege('service_role','ephemer_social','USAGE,CREATE')
    OR NOT has_schema_privilege('authenticated','ephemer_social','USAGE') THEN
    RAISE EXCEPTION 'Droits du schema divergents'; END IF;
  IF (SELECT count(*) FROM pg_tables WHERE schemaname='ephemer_social')<>9 THEN
    RAISE EXCEPTION 'Nombre de tables privees divergent'; END IF;
  FOREACH t IN ARRAY ARRAY['relations_etoiles','blocages_etoiles','demandes_etoiles','liens_etoiles',
    'contacts_etoiles','operations_etoiles','quotas_demandes','notifications_etoiles'] LOOP
    v:=to_regclass(CASE WHEN t='notifications_etoiles' THEN 'public.' ELSE 'ephemer_social.' END||t);
    IF v IS NULL OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=v)
      OR (SELECT relowner FROM pg_class WHERE oid=v)<>(SELECT oid FROM pg_roles WHERE rolname='postgres') THEN
      RAISE EXCEPTION 'Table/RLS/proprietaire divergent : %',t; END IF;
    cols:=CASE t
      WHEN 'relations_etoiles' THEN ARRAY['id','compte_a','compte_b','etat','origine','revision','created_at','updated_at']
      WHEN 'blocages_etoiles' THEN ARRAY['user_id','cible_id','created_at']
      WHEN 'demandes_etoiles' THEN ARRAY['id','auteur_id','adresse_cible','destinataire_id','etat','neutralisee','created_at','expires_at','updated_at']
      WHEN 'liens_etoiles' THEN ARRAY['id','user_id','empreinte','created_at','expires_at','revoque']
      WHEN 'contacts_etoiles' THEN ARRAY['user_id','contact_id','etoile_id']
      WHEN 'operations_etoiles' THEN ARRAY['user_id','operation_id','action','empreinte','resultat','created_at']
      WHEN 'quotas_demandes' THEN ARRAY['user_id','jour','total']
      ELSE ARRAY['id','user_id','type','demande_id','relation_id','lue','created_at'] END;
    IF (SELECT array_agg(attname::text ORDER BY attnum) FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped)
      IS DISTINCT FROM cols THEN RAISE EXCEPTION 'Colonnes divergentes : %',t; END IF;
    types_attendus:=CASE t
      WHEN 'relations_etoiles' THEN ARRAY['uuid','uuid','uuid','text','text','bigint','timestamp with time zone','timestamp with time zone']
      WHEN 'blocages_etoiles' THEN ARRAY['uuid','uuid','timestamp with time zone']
      WHEN 'demandes_etoiles' THEN ARRAY['uuid','uuid','text','uuid','text','boolean','timestamp with time zone','timestamp with time zone','timestamp with time zone']
      WHEN 'liens_etoiles' THEN ARRAY['uuid','uuid','text','timestamp with time zone','timestamp with time zone','boolean']
      WHEN 'contacts_etoiles' THEN ARRAY['uuid','bigint','uuid']
      WHEN 'operations_etoiles' THEN ARRAY['uuid','uuid','text','text','jsonb','timestamp with time zone']
      WHEN 'quotas_demandes' THEN ARRAY['uuid','date','integer']
      ELSE ARRAY['uuid','uuid','text','uuid','uuid','boolean','timestamp with time zone'] END;
    IF (SELECT array_agg(format_type(atttypid,atttypmod) ORDER BY attnum) FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped)
      IS DISTINCT FROM types_attendus THEN RAISE EXCEPTION 'Types divergents : %',t; END IF;
    IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped
      AND attnotnull IS DISTINCT FROM (NOT ((t='demandes_etoiles' AND attname='destinataire_id')
        OR (t='notifications_etoiles' AND attname IN ('demande_id','relation_id'))))) THEN
      RAISE EXCEPTION 'Nullabilite divergente : %',t; END IF;
    IF (SELECT count(*) FROM pg_constraint WHERE conrelid=v AND contype='f')<>
      (CASE WHEN t IN ('relations_etoiles','blocages_etoiles','demandes_etoiles') THEN 2
        WHEN t IN ('contacts_etoiles','notifications_etoiles') THEN 3 ELSE 1 END) THEN
      RAISE EXCEPTION 'References manquantes : %',t; END IF;
    FOREACH role_cible IN ARRAY ARRAY['anon','service_role'] LOOP
      IF has_table_privilege(role_cible,v,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege(role_cible,v,'SELECT,INSERT,UPDATE,REFERENCES') THEN
        RAISE EXCEPTION 'Privilege inattendu : % / %',role_cible,t; END IF;
    END LOOP;
    IF t<>'notifications_etoiles' THEN
      IF has_table_privilege('authenticated',v,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege('authenticated',v,'SELECT,INSERT,UPDATE,REFERENCES')
        OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=v) THEN
        RAISE EXCEPTION 'Table privee exposee : %',t; END IF;
    ELSE
      IF NOT has_table_privilege('authenticated',v,'SELECT')
        OR has_table_privilege('authenticated',v,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR NOT has_column_privilege('authenticated',v,'lue','UPDATE')
        OR EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=v AND attnum>0 AND NOT attisdropped
          AND attname<>'lue' AND has_column_privilege('authenticated',v,attname,'UPDATE'))
        OR (SELECT count(*) FROM pg_policy WHERE polrelid=v)<>2
        OR NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=v AND polname='lot10a_notif_select' AND polcmd='r')
        OR NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=v AND polname='lot10a_notif_update' AND polcmd='w')
        OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=v AND
          (polroles IS DISTINCT FROM ARRAY[(SELECT oid FROM pg_roles WHERE rolname='authenticated')]
           OR NOT polpermissive
           OR regexp_replace(pg_get_expr(polqual,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id'
           OR (polcmd='w' AND regexp_replace(pg_get_expr(polwithcheck,polrelid),'[[:space:]()]','','g') IS DISTINCT FROM 'SELECTauth.uidASuid=user_id'))) THEN
        RAISE EXCEPTION 'Permissions notifications divergentes'; END IF;
    END IF;
    IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=v AND (NOT convalidated OR (contype='f' AND confdeltype<>'c')))
      OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=v AND NOT tgisinternal) THEN
      RAISE EXCEPTION 'Contraintes ou triggers divergents : %',t; END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ephemer_social.relations_etoiles'::regclass
    AND contype='u' AND pg_get_constraintdef(oid)='UNIQUE (compte_a, compte_b)')
    OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ephemer_social.contacts_etoiles'::regclass
      AND contype='f' AND confrelid='public.contacts'::regclass AND array_length(conkey,1)=2 AND confdeltype='c')
    OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.lot10a_contacts_email') AND indisvalid) THEN
    RAISE EXCEPTION 'Unicite/FK composee/index divergent'; END IF;
  IF (SELECT count(*) FROM pg_proc WHERE pronamespace='ephemer_social'::regnamespace)<>19 THEN
    RAISE EXCEPTION 'Nombre de fonctions privees divergent'; END IF;
  FOR f IN SELECT * FROM (VALUES
    ('ephemer_social.normaliser_email(text)','b56931d567c35e0fd688254f40e3cdfd'),
    ('ephemer_social.acteur()','5330074adb917eda0d4c75effffcdbd4'),
    ('ephemer_social.identite(uuid)','391e46d2512e261682dc4dd93936fd9f'),
    ('ephemer_social.bloquee(uuid,uuid)','f8a6c92a8ce395c0c16df204f8ee8469'),
    ('ephemer_social.associer_contacts(uuid,uuid)','ec5edb281cf26fe00dec28958a474690'),
    ('ephemer_social.activer(uuid,uuid,text)','a721ba2df06bfbec9dd10128a07aafd8'),
    ('ephemer_social.preparer_reception(uuid)','d7ecd97adfb4181dd4ed519b61160ad7'),
    ('ephemer_social.reconnaitre(bigint,integer)','e4a97251e795d4f876cbdb0ea19b5c2d'),
    ('ephemer_social.demander(uuid,text,uuid)','86adf81745ce80d9a718dcb7994b1564'),
    ('ephemer_social.commander(text,jsonb,uuid)','18290c0e154d05cb15d5a40a437ac312'),
    ('ephemer_social.lire(text,uuid,integer)','1e542433e7962c5d73b0ae27deae1588'),
    ('ephemer_social.lire_associations(bigint,integer)','1085e381e6299d51231bafecb77f8552'),
    ('ephemer_social.exporter(text,text,integer)','2715e1f383daf106bcd42da811a17b3a'),
    ('public.reconnaitre_etoiles(bigint,integer)','8e1ee58d03d1504e4acaf21b73718250'),
    ('public.commander_etoiles(text,jsonb,uuid)','8c491360ae0e9f33cd095f465671551b'),
    ('public.lire_etoiles(text,uuid,integer)','6ef7a4729267a0ab94d529cbeb9ecf0a'),
    ('public.lire_associations_etoiles(bigint,integer)','ddbdd53bb3a35528216b0ca65163f56f'),
    ('public.exporter_etoiles(text,text,integer)','c3522ec5af54daa3bcc5706cc18a425a')
  ) attentes(signature,empreinte) LOOP
    SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure(f.signature);
    IF p.oid IS NULL THEN RAISE EXCEPTION 'Fonction absente : %',f.signature; END IF;
    est_entree:=p.proname IN ('reconnaitre','commander','lire','lire_associations','exporter') OR f.signature LIKE 'public.%';
    IF md5(replace(p.prosrc,E'\r\n',E'\n'))<>f.empreinte
      OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog']
      OR p.prosecdef IS DISTINCT FROM (p.proname IN ('reconnaitre','commander','lire','lire_associations','exporter'))
      OR p.proowner<>(SELECT oid FROM pg_roles WHERE rolname='postgres')
      OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('service_role',p.oid,'EXECUTE')
      OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM est_entree THEN
      RAISE EXCEPTION 'Corps/droits/proprietaire divergents : %',f.signature; END IF;
  END LOOP;
  IF to_regprocedure('public.est_contact_lie(uuid,text)') IS NOT NULL AND
    (has_function_privilege('anon','public.est_contact_lie(uuid,text)','EXECUTE')
     OR has_function_privilege('authenticated','public.est_contact_lie(uuid,text)','EXECUTE')) THEN
    RAISE EXCEPTION 'Ancienne fonction encore exposee'; END IF;
END;
$catalogue$;
-- Fragment assemblé avec le contrôle 10A intact (sauf compteurs/identité).
DO $univers_catalogue$
DECLARE t text; v regclass; f record; p record; entree boolean; cols text[]; types_attendus text[]; role_cible text;
BEGIN
  FOREACH t IN ARRAY ARRAY['univers_utilisateurs','operations_univers'] LOOP
    v:=to_regclass('ephemer_social.'||t);
    IF v IS NULL OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=v)
      OR (SELECT relowner FROM pg_class WHERE oid=v)<>(SELECT oid FROM pg_roles WHERE rolname='postgres') THEN
      RAISE EXCEPTION 'Table univers/RLS/propriétaire divergent : %',t; END IF;
    cols:=CASE WHEN t='univers_utilisateurs' THEN ARRAY['user_id','mode_identite','identite','valeurs','partage','revision','created_at','updated_at','ia_cadeaux']
      ELSE ARRAY['user_id','operation_id','empreinte','resultat','created_at'] END;
    types_attendus:=CASE WHEN t='univers_utilisateurs' THEN ARRAY['uuid','text','text','jsonb','jsonb','bigint','timestamp with time zone','timestamp with time zone','jsonb']
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
    OR (SELECT count(*) FROM pg_constraint WHERE conrelid='ephemer_social.univers_utilisateurs'::regclass AND contype='c')<>6
    OR (SELECT count(*) FROM pg_constraint WHERE conrelid='ephemer_social.operations_univers'::regclass AND contype='c')<>2 THEN RAISE EXCEPTION 'Contraintes univers divergentes'; END IF;
  FOR f IN SELECT * FROM (VALUES
    ('ephemer_social.valeurs_univers_valides(jsonb)','ddc6f23b286cacebc2cd140d3f5aaf15','plpgsql','i',false,false),
    ('ephemer_social.partage_univers_valide(jsonb,jsonb)','3b89e721b7c1e89b658b183e558e9686','plpgsql','i',false,false),
    ('ephemer_social.univers_lire(uuid)','b397d523c90ae7d66042d4adcf10537e','plpgsql','s',true,true),
    ('ephemer_social.univers_commander(text,jsonb,bigint,uuid)','a9c0c01d67f6dc3297c14f6aa7cefb40','plpgsql','v',true,true),
    ('public.lire_mon_univers()','8cde2b4a8a55e0f2b2b46b17662c3079','sql','s',false,true),
    ('public.consulter_univers_etoile(uuid)','1b3c7b534ba4b96dfbf80455c4eab763','plpgsql','s',false,true),
    ('public.commander_mon_univers(text,jsonb,bigint,uuid)','9c09d6c3d6d1fdf0cc1ac68c7bc12f1a','sql','v',false,true)
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

-- Fragment généré dans le contrôle combiné, ne pas lancer seul.
DO $cadeaux_catalogue$
DECLARE f record; p record;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ephemer_social.univers_utilisateurs'::regclass
    AND conname='lot10c_ia_cadeaux' AND pg_get_constraintdef(oid)='CHECK (ephemer_social.ia_cadeaux_valide(''{"eviter": true, "passions": true, "plaisirs": true, "presentation": true}''::jsonb, ia_cadeaux))')
    OR (SELECT pg_get_expr(adbin,adrelid) FROM pg_attrdef WHERE adrelid='ephemer_social.univers_utilisateurs'::regclass
      AND adnum=(SELECT attnum FROM pg_attribute WHERE attrelid='ephemer_social.univers_utilisateurs'::regclass AND attname='ia_cadeaux')) IS DISTINCT FROM
      '''{"eviter": false, "identite": false, "passions": false, "plaisirs": false, "presentation": false}''::jsonb' THEN
    RAISE EXCEPTION 'Permissions initiales/contrainte 10C divergentes'; END IF;
  FOR f IN SELECT * FROM (VALUES
    ('ephemer_social.ia_cadeaux_valide(jsonb,jsonb)','66aac26b2b94976285d197290e4b2be6','plpgsql',false,ARRAY['p','i']),
    ('ephemer_social.univers_cadeaux(uuid,text[],bigint,bigint,bigint)','c1241aaffcb77a52ab71b99d18d33e2c','plpgsql',true,ARRAY['cible','selection','attendue','relation_attendue','contact']),
    ('public.consulter_univers_cadeaux(uuid)','db939c295dba0161d8802fd2ec77f9ea','sql',false,ARRAY['p_etoile']),
    ('public.resoudre_univers_cadeaux(uuid,text[],bigint,bigint,bigint)','da6d596db1420dd5e082ad94bdea17f4','plpgsql',false,ARRAY['p_etoile','p_champs','p_revision','p_revision_relation','p_contact'])
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
      OR has_function_privilege('authenticated',p.oid,'EXECUTE') IS DISTINCT FROM (false) THEN
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

SELECT 'lot10c_retour_conforme' AS resultat;
COMMIT;
