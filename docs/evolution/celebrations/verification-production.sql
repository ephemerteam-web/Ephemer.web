-- Célébrations B, correctif du 17 octobre 2026. APPLICATION HUMAINE seulement.
-- Généré par tools/prepare-celebrations-production.mjs ; contrats publics inchangés.
-- Ne crée aucun compte, ne lit aucun texte personnel, ne lance aucune commande métier.
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
DO $verification$ DECLARE oid_f oid; BEGIN
IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('preparer_effacement_celebrations','commander_celebrations','lire_celebration','lire_celebrations','lire_invitations_celebrations','exporter_celebrations'))<>6 THEN RAISE EXCEPTION 'Surface publique inattendue'; END IF;
IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ephemer_celebrations')<>20 THEN RAISE EXCEPTION 'Correctif incomplet'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.ami(uuid,uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.ami';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='boolean'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['a','b']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('5d6952f377bd827bd6134369d708d0cb')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.ami'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.tracer(uuid,text)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.tracer';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='void'
    AND p.prosecdef=false
    AND p.provolatile='v'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c','action']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('33cf5c5c2a8b7dd0c78348f731aebf80')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.tracer'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.notifier(uuid,text,uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.notifier';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='void'
    AND p.prosecdef=false
    AND p.provolatile='v'
    AND p.pronargdefaults=1
    AND p.proargnames=ARRAY['c','type_notification','cible']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('196fc38b366222738f17e235c0ccfc61')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.notifier'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.sortir(uuid,uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.sortir';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='void'
    AND p.prosecdef=false
    AND p.provolatile='v'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c','membre']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('9ef1a2580155add000fe9bd3743e48e1')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.sortir'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.supprimer(uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.supprimer';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='void'
    AND p.prosecdef=false
    AND p.provolatile='v'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('5873d020b0860e1d02cd61d96020903f')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.supprimer'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.commande_valide(text,jsonb)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.commande_valide';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='boolean'
    AND p.prosecdef=false
    AND p.provolatile='i'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['action','d']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('b339a7ebc93282b8a8ec6c979c02650b')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.commande_valide'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.lire(uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.lire';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=true
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('b6fe6a72ab88225e2aa7727245c0e585')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.lire'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.export_personnel(uuid,uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.export_personnel';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c','a']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('540eebfbcd939a23399090441ba5f735')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.export_personnel'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.apres_blocage()');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.apres_blocage';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='trigger'
    AND p.prosecdef=true
    AND p.provolatile='v'
    AND p.pronargdefaults=0
    AND p.proargnames IS NULL
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('baf37bcbc133f426a37f82943fb5809a')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.apres_blocage'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.effacer_compte(uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.effacer_compte';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='void'
    AND p.prosecdef=false
    AND p.provolatile='v'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['a']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('e2a7ca55d103195e6bf798b26891a55d')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.effacer_compte'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.avant_effacement()');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.avant_effacement';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='trigger'
    AND p.prosecdef=true
    AND p.provolatile='v'
    AND p.pronargdefaults=0
    AND p.proargnames IS NULL
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('dc8d3dd96b97987a32b100a04a52a131')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.avant_effacement'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.preparer_effacement()');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.preparer_effacement';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=true
    AND p.provolatile='v'
    AND p.pronargdefaults=0
    AND p.proargnames IS NULL
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('0847ad62782cf9d65a53d376427e411c')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.preparer_effacement'; END IF;

  oid_f:=to_regprocedure('public.preparer_effacement_celebrations()');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','public.preparer_effacement_celebrations';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=false
    AND p.provolatile='v'
    AND p.pronargdefaults=0
    AND p.proargnames IS NULL
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('b97b85c1e233b2efb890498c1b4dd228')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','public.preparer_effacement_celebrations'; END IF;

  oid_f:=to_regprocedure('public.commander_celebrations(text,jsonb,uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','public.commander_celebrations';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=false
    AND p.provolatile='v'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['p_action','p_donnees','p_operation']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('d5b7fb957d5c469de9aeb4945c125977')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','public.commander_celebrations'; END IF;

  oid_f:=to_regprocedure('public.lire_celebration(uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','public.lire_celebration';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['p_id']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('b7248832c1a8a8929868e884993a9457')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','public.lire_celebration'; END IF;

  oid_f:=to_regprocedure('public.lire_celebrations(uuid,integer)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','public.lire_celebrations';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=2
    AND p.proargnames=ARRAY['p_apres','p_limite']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('0a595d3fa5f7e1dec05478c88f73093e')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','public.lire_celebrations'; END IF;

  oid_f:=to_regprocedure('public.lire_invitations_celebrations(uuid,integer)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','public.lire_invitations_celebrations';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=2
    AND p.proargnames=ARRAY['p_apres','p_limite']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('dba38bce6d9c5120039e4a58e3a9d06a')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','public.lire_invitations_celebrations'; END IF;

  oid_f:=to_regprocedure('public.exporter_celebrations(uuid,integer)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','public.exporter_celebrations';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=2
    AND p.proargnames=ARRAY['p_apres','p_limite']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('a7bf3bb3191c8958ac575cb1ed14318a')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','public.exporter_celebrations'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.partage_valide(uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.partage_valide';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='boolean'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('ce91d7e0dfbbea1bb2eef35a05d9f90c')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.partage_valide'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.lisible(uuid,uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.lisible';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='boolean'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c','a']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('90b66a2f27d8d555695c216f3280c157')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.lisible'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.maintenance(uuid,uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.maintenance';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='boolean'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c','a']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('644f31ad6fb3281c85fb25bdf6c79fcb')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.maintenance'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.invite(uuid,uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.invite';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='boolean'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c','a']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('b222daa47e4c8f701cc373a286abf184')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.invite'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.resume(uuid,uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.resume';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c','a']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('6e8b6d29dbc374ef776c12ff274f5d7b')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.resume'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.commander(text,jsonb,uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.commander';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=true
    AND p.provolatile='v'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['action','d','operation']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('c2f6ade8011f3ca427ec887f23ca7334')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.commander'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.detail(uuid,uuid)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.detail';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c','a']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('00c8b6434faeba548d59c39aee00b707')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.detail'; END IF;

  oid_f:=to_regprocedure('ephemer_celebrations.lister(uuid,integer,text)');
  IF oid_f IS NULL THEN RAISE EXCEPTION 'Fonction attendue absente : %','ephemer_celebrations.lister';
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='jsonb'
    AND p.prosecdef=true
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['apres','limite','vue']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('ccee4d2721383790b9851be15adf4a86')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.lister'; END IF;
IF (SELECT count(*) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ephemer_celebrations')<>55 THEN RAISE EXCEPTION 'Contraintes inattendues'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.actions') AND conname='actions_celebration_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (celebration) REFERENCES ephemer_celebrations.celebrations(id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','actions/actions_celebration_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.actions') AND conname='actions_pkey' AND pg_get_constraintdef(oid,true)='PRIMARY KEY (id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','actions/actions_pkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.celebrations') AND conname='celebrations_check' AND pg_get_constraintdef(oid,true)='CHECK (NOT surprise OR mode = ''seul''::text OR destinataire IS NOT NULL)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','celebrations/celebrations_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.celebrations') AND conname='celebrations_date_fete_check' AND pg_get_constraintdef(oid,true)='CHECK (date_fete >= ''0001-01-01''::date AND date_fete <= ''9999-12-31''::date)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','celebrations/celebrations_date_fete_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.celebrations') AND conname='celebrations_etat_check' AND pg_get_constraintdef(oid,true)='CHECK (etat = ANY (ARRAY[''active''::text, ''annulee''::text, ''archivee''::text, ''supprimee''::text, ''suspendue''::text]))') THEN RAISE EXCEPTION 'Contrainte inattendue : %','celebrations/celebrations_etat_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.celebrations') AND conname='celebrations_lieu_check' AND pg_get_constraintdef(oid,true)='CHECK (length(lieu) <= 500)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','celebrations/celebrations_lieu_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.celebrations') AND conname='celebrations_mode_check' AND pg_get_constraintdef(oid,true)='CHECK (mode = ANY (ARRAY[''seul''::text, ''partage''::text]))') THEN RAISE EXCEPTION 'Contrainte inattendue : %','celebrations/celebrations_mode_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.celebrations') AND conname='celebrations_pkey' AND pg_get_constraintdef(oid,true)='PRIMARY KEY (id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','celebrations/celebrations_pkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.celebrations') AND conname='celebrations_revision_check' AND pg_get_constraintdef(oid,true)='CHECK (revision >= 1 AND revision <= ''9007199254740991''::bigint)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','celebrations/celebrations_revision_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.celebrations') AND conname='celebrations_titre_check' AND pg_get_constraintdef(oid,true)='CHECK (length(btrim(titre)) >= 1 AND length(btrim(titre)) <= 200)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','celebrations/celebrations_titre_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.commentaires') AND conname='commentaires_auteur_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (auteur) REFERENCES auth.users(id) ON DELETE CASCADE') THEN RAISE EXCEPTION 'Contrainte inattendue : %','commentaires/commentaires_auteur_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.commentaires') AND conname='commentaires_celebration_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (celebration) REFERENCES ephemer_celebrations.celebrations(id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','commentaires/commentaires_celebration_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.commentaires') AND conname='commentaires_pkey' AND pg_get_constraintdef(oid,true)='PRIMARY KEY (id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','commentaires/commentaires_pkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.commentaires') AND conname='commentaires_texte_check' AND pg_get_constraintdef(oid,true)='CHECK (length(btrim(texte)) >= 1 AND length(btrim(texte)) <= 2000)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','commentaires/commentaires_texte_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.demandes') AND conname='demandes_celebration_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (celebration) REFERENCES ephemer_celebrations.celebrations(id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','demandes/demandes_celebration_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.demandes') AND conname='demandes_demandeur_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (demandeur) REFERENCES auth.users(id) ON DELETE CASCADE') THEN RAISE EXCEPTION 'Contrainte inattendue : %','demandes/demandes_demandeur_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.demandes') AND conname='demandes_etat_check' AND pg_get_constraintdef(oid,true)='CHECK (etat = ANY (ARRAY[''attente''::text, ''acceptee''::text, ''refusee''::text, ''fermee''::text]))') THEN RAISE EXCEPTION 'Contrainte inattendue : %','demandes/demandes_etat_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.demandes') AND conname='demandes_motif_check' AND pg_get_constraintdef(oid,true)='CHECK (length(motif) <= 500)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','demandes/demandes_motif_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.demandes') AND conname='demandes_pkey' AND pg_get_constraintdef(oid,true)='PRIMARY KEY (id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','demandes/demandes_pkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.invitations') AND conname='invitations_celebration_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (celebration) REFERENCES ephemer_celebrations.celebrations(id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','invitations/invitations_celebration_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.invitations') AND conname='invitations_cible_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (cible) REFERENCES auth.users(id) ON DELETE CASCADE') THEN RAISE EXCEPTION 'Contrainte inattendue : %','invitations/invitations_cible_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.invitations') AND conname='invitations_emetteur_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (emetteur) REFERENCES auth.users(id) ON DELETE SET NULL') THEN RAISE EXCEPTION 'Contrainte inattendue : %','invitations/invitations_emetteur_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.invitations') AND conname='invitations_etat_check' AND pg_get_constraintdef(oid,true)='CHECK (etat = ANY (ARRAY[''attente''::text, ''acceptee''::text, ''refusee''::text, ''revoquee''::text]))') THEN RAISE EXCEPTION 'Contrainte inattendue : %','invitations/invitations_etat_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.invitations') AND conname='invitations_pkey' AND pg_get_constraintdef(oid,true)='PRIMARY KEY (id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','invitations/invitations_pkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.notifications') AND conname='notifications_celebration_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (celebration) REFERENCES ephemer_celebrations.celebrations(id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','notifications/notifications_celebration_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.notifications') AND conname='notifications_compte_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (compte) REFERENCES auth.users(id) ON DELETE CASCADE') THEN RAISE EXCEPTION 'Contrainte inattendue : %','notifications/notifications_compte_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.notifications') AND conname='notifications_pkey' AND pg_get_constraintdef(oid,true)='PRIMARY KEY (id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','notifications/notifications_pkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.notifications') AND conname='notifications_type_check' AND pg_get_constraintdef(oid,true)='CHECK (type = ANY (ARRAY[''invitation''::text, ''tache''::text, ''changement''::text, ''demande''::text, ''reponse''::text]))') THEN RAISE EXCEPTION 'Contrainte inattendue : %','notifications/notifications_type_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.operations') AND conname='operations_acteur_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (acteur) REFERENCES auth.users(id) ON DELETE CASCADE') THEN RAISE EXCEPTION 'Contrainte inattendue : %','operations/operations_acteur_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.operations') AND conname='operations_celebration_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (celebration) REFERENCES ephemer_celebrations.celebrations(id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','operations/operations_celebration_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.operations') AND conname='operations_pkey' AND pg_get_constraintdef(oid,true)='PRIMARY KEY (acteur, id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','operations/operations_pkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.participations') AND conname='participations_celebration_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (celebration) REFERENCES ephemer_celebrations.celebrations(id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','participations/participations_celebration_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.participations') AND conname='participations_celebration_id_key' AND pg_get_constraintdef(oid,true)='UNIQUE (celebration, id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','participations/participations_celebration_id_key'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.participations') AND conname='participations_compte_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (compte) REFERENCES auth.users(id) ON DELETE SET NULL') THEN RAISE EXCEPTION 'Contrainte inattendue : %','participations/participations_compte_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.participations') AND conname='participations_etat_check' AND pg_get_constraintdef(oid,true)='CHECK (etat = ANY (ARRAY[''active''::text, ''partie''::text, ''maintenance''::text]))') THEN RAISE EXCEPTION 'Contrainte inattendue : %','participations/participations_etat_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.participations') AND conname='participations_pkey' AND pg_get_constraintdef(oid,true)='PRIMARY KEY (id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','participations/participations_pkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.participations') AND conname='participations_role_check' AND pg_get_constraintdef(oid,true)='CHECK (role = ANY (ARRAY[''organisateur''::text, ''participant''::text]))') THEN RAISE EXCEPTION 'Contrainte inattendue : %','participations/participations_role_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.sources') AND conname='sources_celebration_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (celebration) REFERENCES ephemer_celebrations.celebrations(id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','sources/sources_celebration_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.sources') AND conname='sources_pkey' AND pg_get_constraintdef(oid,true)='PRIMARY KEY (celebration)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','sources/sources_pkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.sources') AND conname='sources_preparation_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (preparation) REFERENCES preparations_evenements(id) ON DELETE SET NULL') THEN RAISE EXCEPTION 'Contrainte inattendue : %','sources/sources_preparation_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.sources') AND conname='sources_proprietaire_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (proprietaire) REFERENCES auth.users(id) ON DELETE CASCADE') THEN RAISE EXCEPTION 'Contrainte inattendue : %','sources/sources_proprietaire_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.sources') AND conname='sources_proprietaire_preparation_key' AND pg_get_constraintdef(oid,true)='UNIQUE (proprietaire, preparation)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','sources/sources_proprietaire_preparation_key'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.taches') AND conname='taches_auteur_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (auteur) REFERENCES auth.users(id) ON DELETE SET NULL') THEN RAISE EXCEPTION 'Contrainte inattendue : %','taches/taches_auteur_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.taches') AND conname='taches_celebration_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (celebration) REFERENCES ephemer_celebrations.celebrations(id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','taches/taches_celebration_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.taches') AND conname='taches_celebration_responsable_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (celebration, responsable) REFERENCES ephemer_celebrations.participations(celebration, id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','taches/taches_celebration_responsable_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.taches') AND conname='taches_echeance_check' AND pg_get_constraintdef(oid,true)='CHECK (echeance >= ''0001-01-01''::date AND echeance <= ''9999-12-31''::date)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','taches/taches_echeance_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.taches') AND conname='taches_etat_check' AND pg_get_constraintdef(oid,true)='CHECK (etat = ANY (ARRAY[''a_faire''::text, ''faite''::text, ''abandonnee''::text]))') THEN RAISE EXCEPTION 'Contrainte inattendue : %','taches/taches_etat_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.taches') AND conname='taches_pkey' AND pg_get_constraintdef(oid,true)='PRIMARY KEY (id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','taches/taches_pkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.taches') AND conname='taches_titre_check' AND pg_get_constraintdef(oid,true)='CHECK (length(btrim(titre)) >= 1 AND length(btrim(titre)) <= 200)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','taches/taches_titre_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.taches') AND conname='taches_type_check' AND pg_get_constraintdef(oid,true)='CHECK (type = ANY (ARRAY[''cadeau''::text, ''message''::text, ''gateau''::text, ''repas''::text, ''boissons''::text, ''decoration''::text, ''appel''::text, ''sortie''::text, ''libre''::text]))') THEN RAISE EXCEPTION 'Contrainte inattendue : %','taches/taches_type_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.transferts') AND conname='transferts_celebration_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (celebration) REFERENCES ephemer_celebrations.celebrations(id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','transferts/transferts_celebration_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.transferts') AND conname='transferts_cible_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (cible) REFERENCES auth.users(id) ON DELETE CASCADE') THEN RAISE EXCEPTION 'Contrainte inattendue : %','transferts/transferts_cible_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.transferts') AND conname='transferts_etat_check' AND pg_get_constraintdef(oid,true)='CHECK (etat = ANY (ARRAY[''attente''::text, ''accepte''::text, ''refuse''::text, ''annule''::text]))') THEN RAISE EXCEPTION 'Contrainte inattendue : %','transferts/transferts_etat_check'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.transferts') AND conname='transferts_initiateur_fkey' AND pg_get_constraintdef(oid,true)='FOREIGN KEY (initiateur) REFERENCES auth.users(id) ON DELETE SET NULL') THEN RAISE EXCEPTION 'Contrainte inattendue : %','transferts/transferts_initiateur_fkey'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('ephemer_celebrations.transferts') AND conname='transferts_pkey' AND pg_get_constraintdef(oid,true)='PRIMARY KEY (id)') THEN RAISE EXCEPTION 'Contrainte inattendue : %','transferts/transferts_pkey'; END IF;
  IF (SELECT count(*) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ephemer_celebrations' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped)<>72 THEN RAISE EXCEPTION 'Colonnes inattendues'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.actions') AND attname='id' AND attnum=1 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','actions/id'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.actions') AND attname='celebration' AND attnum=2 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','actions/celebration'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.actions') AND attname='action' AND attnum=3 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','actions/action'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.actions') AND attname='created_at' AND attnum=4 AND NOT attisdropped AND format_type(atttypid,atttypmod)='timestamp with time zone' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','actions/created_at'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='id' AND attnum=1 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/id'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='titre' AND attnum=2 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/titre'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='date_fete' AND attnum=3 AND NOT attisdropped AND format_type(atttypid,atttypmod)='date' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/date_fete'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='date_canonique' AND attnum=4 AND NOT attisdropped AND format_type(atttypid,atttypmod)='date' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/date_canonique'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='heure' AND attnum=5 AND NOT attisdropped AND format_type(atttypid,atttypmod)='time without time zone' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/heure'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='lieu' AND attnum=6 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/lieu'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='mode' AND attnum=7 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/mode'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='surprise' AND attnum=8 AND NOT attisdropped AND format_type(atttypid,atttypmod)='boolean' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/surprise'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='destinataire' AND attnum=9 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/destinataire'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='etat' AND attnum=10 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/etat'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='revision' AND attnum=11 AND NOT attisdropped AND format_type(atttypid,atttypmod)='bigint' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/revision'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.celebrations') AND attname='created_at' AND attnum=12 AND NOT attisdropped AND format_type(atttypid,atttypmod)='timestamp with time zone' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','celebrations/created_at'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.commentaires') AND attname='id' AND attnum=1 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','commentaires/id'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.commentaires') AND attname='celebration' AND attnum=2 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','commentaires/celebration'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.commentaires') AND attname='auteur' AND attnum=3 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','commentaires/auteur'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.commentaires') AND attname='texte' AND attnum=4 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','commentaires/texte'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.commentaires') AND attname='revision' AND attnum=5 AND NOT attisdropped AND format_type(atttypid,atttypmod)='bigint' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','commentaires/revision'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.commentaires') AND attname='created_at' AND attnum=6 AND NOT attisdropped AND format_type(atttypid,atttypmod)='timestamp with time zone' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','commentaires/created_at'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.demandes') AND attname='id' AND attnum=1 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','demandes/id'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.demandes') AND attname='celebration' AND attnum=2 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','demandes/celebration'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.demandes') AND attname='demandeur' AND attnum=3 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','demandes/demandeur'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.demandes') AND attname='motif' AND attnum=4 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','demandes/motif'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.demandes') AND attname='etat' AND attnum=5 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','demandes/etat'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.demandes') AND attname='revision' AND attnum=6 AND NOT attisdropped AND format_type(atttypid,atttypmod)='bigint' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','demandes/revision'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.demandes') AND attname='created_at' AND attnum=7 AND NOT attisdropped AND format_type(atttypid,atttypmod)='timestamp with time zone' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','demandes/created_at'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.demandes') AND attname='decide_at' AND attnum=8 AND NOT attisdropped AND format_type(atttypid,atttypmod)='timestamp with time zone' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','demandes/decide_at'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.invitations') AND attname='id' AND attnum=1 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','invitations/id'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.invitations') AND attname='celebration' AND attnum=2 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','invitations/celebration'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.invitations') AND attname='emetteur' AND attnum=3 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','invitations/emetteur'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.invitations') AND attname='cible' AND attnum=4 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','invitations/cible'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.invitations') AND attname='etat' AND attnum=5 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','invitations/etat'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.invitations') AND attname='created_at' AND attnum=6 AND NOT attisdropped AND format_type(atttypid,atttypmod)='timestamp with time zone' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','invitations/created_at'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.invitations') AND attname='expire_at' AND attnum=7 AND NOT attisdropped AND format_type(atttypid,atttypmod)='timestamp with time zone' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','invitations/expire_at'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.notifications') AND attname='id' AND attnum=1 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','notifications/id'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.notifications') AND attname='celebration' AND attnum=2 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','notifications/celebration'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.notifications') AND attname='compte' AND attnum=3 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','notifications/compte'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.notifications') AND attname='type' AND attnum=4 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','notifications/type'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.notifications') AND attname='created_at' AND attnum=5 AND NOT attisdropped AND format_type(atttypid,atttypmod)='timestamp with time zone' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','notifications/created_at'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.operations') AND attname='acteur' AND attnum=1 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','operations/acteur'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.operations') AND attname='id' AND attnum=2 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','operations/id'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.operations') AND attname='celebration' AND attnum=3 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','operations/celebration'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.operations') AND attname='empreinte' AND attnum=4 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','operations/empreinte'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.operations') AND attname='action' AND attnum=5 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','operations/action'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.operations') AND attname='created_at' AND attnum=6 AND NOT attisdropped AND format_type(atttypid,atttypmod)='timestamp with time zone' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','operations/created_at'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.participations') AND attname='id' AND attnum=1 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','participations/id'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.participations') AND attname='celebration' AND attnum=2 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','participations/celebration'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.participations') AND attname='compte' AND attnum=3 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','participations/compte'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.participations') AND attname='role' AND attnum=4 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','participations/role'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.participations') AND attname='etat' AND attnum=5 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','participations/etat'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.participations') AND attname='generation' AND attnum=6 AND NOT attisdropped AND format_type(atttypid,atttypmod)='bigint' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','participations/generation'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.sources') AND attname='celebration' AND attnum=1 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','sources/celebration'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.sources') AND attname='proprietaire' AND attnum=2 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','sources/proprietaire'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.sources') AND attname='preparation' AND attnum=3 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','sources/preparation'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.taches') AND attname='id' AND attnum=1 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','taches/id'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.taches') AND attname='celebration' AND attnum=2 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','taches/celebration'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.taches') AND attname='auteur' AND attnum=3 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','taches/auteur'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.taches') AND attname='titre' AND attnum=4 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','taches/titre'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.taches') AND attname='type' AND attnum=5 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','taches/type'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.taches') AND attname='responsable' AND attnum=6 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','taches/responsable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.taches') AND attname='echeance' AND attnum=7 AND NOT attisdropped AND format_type(atttypid,atttypmod)='date' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','taches/echeance'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.taches') AND attname='etat' AND attnum=8 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','taches/etat'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.taches') AND attname='revision' AND attnum=9 AND NOT attisdropped AND format_type(atttypid,atttypmod)='bigint' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','taches/revision'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.transferts') AND attname='id' AND attnum=1 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','transferts/id'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.transferts') AND attname='celebration' AND attnum=2 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','transferts/celebration'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.transferts') AND attname='initiateur' AND attnum=3 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','transferts/initiateur'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.transferts') AND attname='cible' AND attnum=4 AND NOT attisdropped AND format_type(atttypid,atttypmod)='uuid' AND attnotnull=false) THEN RAISE EXCEPTION 'Colonne inattendue : %','transferts/cible'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.transferts') AND attname='etat' AND attnum=5 AND NOT attisdropped AND format_type(atttypid,atttypmod)='text' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','transferts/etat'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ephemer_celebrations.transferts') AND attname='expire_at' AND attnum=6 AND NOT attisdropped AND format_type(atttypid,atttypmod)='timestamp with time zone' AND attnotnull=true) THEN RAISE EXCEPTION 'Colonne inattendue : %','transferts/expire_at'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('ephemer_social.blocages_etoiles') AND tgname='celebrations_blocage' AND tgenabled='O' AND pg_get_triggerdef(oid)='CREATE TRIGGER celebrations_blocage AFTER INSERT ON ephemer_social.blocages_etoiles FOR EACH ROW EXECUTE FUNCTION ephemer_celebrations.apres_blocage()') THEN RAISE EXCEPTION 'Trigger inattendu : %','celebrations_blocage'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('auth.users') AND tgname='celebrations_effacement' AND tgenabled='O' AND pg_get_triggerdef(oid)='CREATE TRIGGER celebrations_effacement BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION ephemer_celebrations.avant_effacement()') THEN RAISE EXCEPTION 'Trigger inattendu : %','celebrations_effacement'; END IF;
IF EXISTS(SELECT 1 FROM (SELECT id FROM ephemer_celebrations.invitations UNION ALL SELECT id FROM ephemer_celebrations.transferts UNION ALL SELECT id FROM ephemer_celebrations.demandes) x GROUP BY id HAVING count(*)>1) THEN RAISE EXCEPTION 'Collision historique : arreter et diagnostiquer sans modifier les identifiants'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_taches_celebration') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_taches_celebration') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_taches_celebration'))<>'CREATE INDEX celebr_prod_taches_celebration ON ephemer_celebrations.taches USING btree (celebration, id)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_taches_celebration'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_taches_auteur') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_taches_auteur') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_taches_auteur'))<>'CREATE INDEX celebr_prod_taches_auteur ON ephemer_celebrations.taches USING btree (auteur, celebration)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_taches_auteur'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_commentaires_celebration') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_commentaires_celebration') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_commentaires_celebration'))<>'CREATE INDEX celebr_prod_commentaires_celebration ON ephemer_celebrations.commentaires USING btree (celebration, created_at, id)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_commentaires_celebration'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_commentaires_auteur') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_commentaires_auteur') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_commentaires_auteur'))<>'CREATE INDEX celebr_prod_commentaires_auteur ON ephemer_celebrations.commentaires USING btree (auteur, celebration)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_commentaires_auteur'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_demandes_historique') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_demandes_historique') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_demandes_historique'))<>'CREATE INDEX celebr_prod_demandes_historique ON ephemer_celebrations.demandes USING btree (celebration, demandeur, created_at)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_demandes_historique'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_demandes_demandeur') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_demandes_demandeur') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_demandes_demandeur'))<>'CREATE INDEX celebr_prod_demandes_demandeur ON ephemer_celebrations.demandes USING btree (demandeur, id)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_demandes_demandeur'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_invitations_quota') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_invitations_quota') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_invitations_quota'))<>'CREATE INDEX celebr_prod_invitations_quota ON ephemer_celebrations.invitations USING btree (celebration, emetteur, created_at)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_invitations_quota'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_invitations_emetteur') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_invitations_emetteur') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_invitations_emetteur'))<>'CREATE INDEX celebr_prod_invitations_emetteur ON ephemer_celebrations.invitations USING btree (emetteur)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_invitations_emetteur'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_transferts_cible') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_transferts_cible') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_transferts_cible'))<>'CREATE INDEX celebr_prod_transferts_cible ON ephemer_celebrations.transferts USING btree (cible, id)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_transferts_cible'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_transferts_initiateur') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_transferts_initiateur') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_transferts_initiateur'))<>'CREATE INDEX celebr_prod_transferts_initiateur ON ephemer_celebrations.transferts USING btree (initiateur)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_transferts_initiateur'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_actions_recent') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_actions_recent') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_actions_recent'))<>'CREATE INDEX celebr_prod_actions_recent ON ephemer_celebrations.actions USING btree (celebration, created_at DESC, id DESC)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_actions_recent'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_operations_quota') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_operations_quota') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_operations_quota'))<>'CREATE INDEX celebr_prod_operations_quota ON ephemer_celebrations.operations USING btree (acteur, created_at DESC)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_operations_quota'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_notifications_recent') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_notifications_recent') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_notifications_recent'))<>'CREATE INDEX celebr_prod_notifications_recent ON ephemer_celebrations.notifications USING btree (celebration, created_at DESC, id DESC)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_notifications_recent'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_sources_preparation') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_sources_preparation') AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_sources_preparation'))<>'CREATE INDEX celebr_prod_sources_preparation ON ephemer_celebrations.sources USING btree (preparation)' THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %','celebr_prod_sources_preparation'; END IF;
END $verification$;
DO $droits$ DECLARE r record; n integer; BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='ephemer_celebrations') THEN RAISE EXCEPTION 'Schema B absent'; END IF;
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='ephemer_celebrations' AND c.relkind='r';
  IF n<>11 THEN RAISE EXCEPTION 'Nombre de tables B inattendu'; END IF;
  FOR r IN SELECT c.oid,c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='ephemer_celebrations' AND c.relkind='r' LOOP
    IF NOT r.relrowsecurity OR has_any_column_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,REFERENCES')
      OR has_any_column_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,REFERENCES')
      OR has_any_column_privilege('service_role',r.oid,'SELECT,INSERT,UPDATE,REFERENCES')
      OR has_table_privilege('authenticated',r.oid,'DELETE,TRUNCATE') THEN RAISE EXCEPTION 'Table interne ouverte : %',r.relname; END IF;
  END LOOP;
  FOR r IN SELECT p.oid,p.proname,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='ephemer_celebrations' LOOP
    IF has_function_privilege('public',r.oid,'EXECUTE') OR has_function_privilege('anon',r.oid,'EXECUTE') OR has_function_privilege('service_role',r.oid,'EXECUTE') THEN RAISE EXCEPTION 'Fonction interne ouverte : %',r.proname; END IF;
    IF has_function_privilege('authenticated',r.oid,'EXECUTE') IS DISTINCT FROM (r.proname IN ('commander','lire','lister','preparer_effacement')) THEN RAISE EXCEPTION 'Surface RPC incorrecte : %',r.proname; END IF;
    IF NOT ('search_path=pg_catalog'=ANY(r.proconfig)) THEN RAISE EXCEPTION 'search_path non ferme'; END IF;
  END LOOP;
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND p.proname IN ('commander_celebrations','lire_celebration','lire_celebrations','lire_invitations_celebrations','exporter_celebrations','preparer_effacement_celebrations')
    AND NOT p.prosecdef AND has_function_privilege('authenticated',p.oid,'EXECUTE') AND NOT has_function_privilege('public',p.oid,'EXECUTE') AND NOT has_function_privilege('anon',p.oid,'EXECUTE') AND NOT has_function_privilege('service_role',p.oid,'EXECUTE');
  IF n<>6 THEN RAISE EXCEPTION 'RPC publiques incorrectes'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ephemer_social.blocages_etoiles'::regclass AND tgname='celebrations_blocage' AND tgenabled='O')
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND tgname='celebrations_effacement' AND tgenabled='O') THEN RAISE EXCEPTION 'Revocation transactionnelle absente'; END IF;
  IF has_schema_privilege('anon','ephemer_celebrations','USAGE,CREATE') OR has_schema_privilege('service_role','ephemer_celebrations','USAGE,CREATE')
    OR has_schema_privilege('authenticated','ephemer_celebrations','CREATE') OR NOT has_schema_privilege('authenticated','ephemer_celebrations','USAGE') THEN RAISE EXCEPTION 'Droits de schema inattendus'; END IF;
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) AS roles(nom)
    WHERE ns.nspname='ephemer_celebrations' AND c.relkind='r' AND has_table_privilege(roles.nom,c.oid,'DELETE,TRUNCATE,TRIGGER')) THEN RAISE EXCEPTION 'Droits directs de table inattendus'; END IF;
END $droits$;
SELECT 'celebrations_production_catalogue_conforme' AS resultat;
COMMIT;
