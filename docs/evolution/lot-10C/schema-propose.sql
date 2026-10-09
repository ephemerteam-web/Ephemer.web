-- PROPOSITION 10C : installation HUMAINE seulement, après revue et sauvegarde.
-- Exécuter tout le fichier. Le contrôle 10A + 10B précède la transaction d'installation.
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
  IF (SELECT count(*) FROM pg_proc WHERE pronamespace='ephemer_social'::regnamespace)<>17 THEN
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

SELECT 'lot10b_catalogue_conforme' AS resultat;
COMMIT;

BEGIN;
SET LOCAL ephemer.lot10c_installation='CONFIRME_INSTALLATION_10C';
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_user<>'postgres' OR current_setting('ephemer.lot10c_installation',true) IS DISTINCT FROM 'CONFIRME_INSTALLATION_10C' THEN
    RAISE EXCEPTION 'Installation humaine reservee a postgres'; END IF;
  IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='ephemer_social.univers_utilisateurs'::regclass AND attname='ia_cadeaux' AND NOT attisdropped)
    OR to_regprocedure('public.consulter_univers_cadeaux(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION '10C deja present : ne pas rejouer'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
END;
$garde$;
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
ALTER TABLE ephemer_social.univers_utilisateurs ADD COLUMN ia_cadeaux jsonb NOT NULL DEFAULT '{"identite":false,"presentation":false,"passions":false,"plaisirs":false,"eviter":false}'::jsonb;
ALTER TABLE ephemer_social.univers_utilisateurs ADD CONSTRAINT lot10c_ia_cadeaux CHECK(ephemer_social.ia_cadeaux_valide(partage,ia_cadeaux));
ALTER TABLE ephemer_social.univers_utilisateurs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ephemer_social.univers_utilisateurs FROM PUBLIC,anon,authenticated,service_role;
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
      'identite',ephemer_social.identite(a),'valeurs',coalesce(u.valeurs,valeurs_vides),'partage',coalesce(u.partage,partage_vide),'iaCadeaux',coalesce(u.ia_cadeaux,'{"identite":false,"presentation":false,"passions":false,"plaisirs":false,"eviter":false}'::jsonb));
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
    IF (SELECT array_agg(c ORDER BY c) FROM jsonb_object_keys(donnees) AS keys(c)) IS DISTINCT FROM ARRAY['iaCadeaux','identite','modeIdentite','partage','valeurs']
      OR jsonb_typeof(donnees->'identite') IS DISTINCT FROM 'string'
      OR jsonb_typeof(donnees->'modeIdentite') IS DISTINCT FROM 'string'
      OR (donnees->>'modeIdentite') NOT IN ('prenom','pseudonyme')
      OR char_length(donnees->>'identite') NOT BETWEEN 1 AND 80
      OR btrim(donnees->>'identite')='' OR (donnees->>'identite') ~ '^[[:space:]]|[[:space:]]$'
      OR translate(donnees->>'identite',E'\t\r\n','') ~ '[[:cntrl:]]'
      OR NOT ephemer_social.partage_univers_valide(donnees->'valeurs',donnees->'partage')
      OR NOT ephemer_social.ia_cadeaux_valide(donnees->'partage',donnees->'iaCadeaux') THEN
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
    INSERT INTO ephemer_social.univers_utilisateurs(user_id,mode_identite,identite,valeurs,partage,ia_cadeaux,revision)
      VALUES(a,donnees->>'modeIdentite',donnees->>'identite',donnees->'valeurs',donnees->'partage',donnees->'iaCadeaux',courante+1)
      ON CONFLICT(user_id) DO UPDATE SET mode_identite=excluded.mode_identite,identite=excluded.identite,
        valeurs=excluded.valeurs,partage=excluded.partage,ia_cadeaux=excluded.ia_cadeaux,revision=excluded.revision,updated_at=now();
    courante:=courante+1;
  ELSIF courante>0 THEN
    UPDATE ephemer_social.univers_utilisateurs SET partage='{"presentation":false,"passions":false,"plaisirs":false,"eviter":false,"anniversaire":false,"annee":false,"email":false,"telephone":false,"avatar":false}',
      ia_cadeaux=jsonb_build_object('identite',u.ia_cadeaux->'identite','presentation',false,'passions',false,'plaisirs',false,'eviter',false),
      revision=courante+1,updated_at=now() WHERE user_id=a;
    courante:=courante+1;
  END IF;
  resultat:=jsonb_build_object('ok',true,'revision',courante);
  INSERT INTO ephemer_social.operations_univers(user_id,operation_id,empreinte,resultat) VALUES(a,operation,empreinte_args,resultat);
  RETURN resultat;
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

REVOKE ALL ON FUNCTION ephemer_social.ia_cadeaux_valide(jsonb,jsonb),ephemer_social.univers_cadeaux(uuid,text[],bigint,bigint,bigint),
  ephemer_social.univers_lire(uuid),ephemer_social.univers_commander(text,jsonb,bigint,uuid),
  public.consulter_univers_cadeaux(uuid),public.resoudre_univers_cadeaux(uuid,text[],bigint,bigint,bigint) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION ephemer_social.univers_cadeaux(uuid,text[],bigint,bigint,bigint),
  ephemer_social.univers_lire(uuid),ephemer_social.univers_commander(text,jsonb,bigint,uuid),
  public.consulter_univers_cadeaux(uuid),public.resoudre_univers_cadeaux(uuid,text[],bigint,bigint,bigint) TO authenticated;
-- Fermer le compteur aux clients : pas de modification du corps ni des données.
REVOKE EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid) TO service_role;
DO $quota$
BEGIN
  IF has_function_privilege('anon','public.incrementer_quota_ia(uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.incrementer_quota_ia(uuid)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.incrementer_quota_ia(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Quota non ferme'; END IF;
END;
$quota$;
NOTIFY pgrst,'reload schema';
COMMIT;
