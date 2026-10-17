-- Célébrations B, correctif du 17 octobre 2026. APPLICATION HUMAINE seulement.
-- Généré par tools/prepare-celebrations-production.mjs ; contrats publics inchangés.
-- Ne crée aucun compte, ne lit aucun texte personnel, ne lance aucune commande métier.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='60s';
DO $preconditions$ DECLARE oid_f oid; BEGIN
IF current_setting('server_version_num')::integer<170000 THEN RAISE EXCEPTION 'PostgreSQL 17 minimum requis'; END IF;
IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ephemer_celebrations')<>(19+CASE WHEN to_regprocedure('ephemer_celebrations.partage_valide(uuid)') IS NULL THEN 0 ELSE 1 END) THEN RAISE EXCEPTION 'Surface interne inattendue'; END IF;
IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('preparer_effacement_celebrations','commander_celebrations','lire_celebration','lire_celebrations','lire_invitations_celebrations','exporter_celebrations'))<>6 THEN RAISE EXCEPTION 'Surface publique inattendue'; END IF;

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
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('fb31f8d5291147188d07b90db95c4d76','90b66a2f27d8d555695c216f3280c157')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.lisible'; END IF;

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
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('5e5fb6d191b070e710e6b2fafc05a443','644f31ad6fb3281c85fb25bdf6c79fcb')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.maintenance'; END IF;

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
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('908bebd5cdfff02282f3cb1264223a7b','b222daa47e4c8f701cc373a286abf184')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.invite'; END IF;

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
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('ee9a08294cd98e12d4f3be36e9839da0','6e8b6d29dbc374ef776c12ff274f5d7b')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.resume'; END IF;

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
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('b04ba15f8b20744e6619086fa0f1e6db','c2f6ade8011f3ca427ec887f23ca7334')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.commander'; END IF;

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
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('8ce0071e0d7b86e0e5c14492b204b1b6','00c8b6434faeba548d59c39aee00b707')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.detail'; END IF;

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
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('c89ca396c50c0685404e4694db15742e','ccee4d2721383790b9851be15adf4a86')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.lister'; END IF;

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
  IF oid_f IS NULL THEN NULL;
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='sql') AND p.prokind='f'
    AND pg_get_function_result(p.oid)='boolean'
    AND p.prosecdef=false
    AND p.provolatile='s'
    AND p.pronargdefaults=0
    AND p.proargnames=ARRAY['c']::text[]
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))) IN ('ce91d7e0dfbbea1bb2eef35a05d9f90c')) THEN RAISE EXCEPTION 'Version ou signature inattendue : %','ephemer_celebrations.partage_valide'; END IF;

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
END $preconditions$;
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
DO $index_garde$ BEGIN
IF to_regclass('ephemer_celebrations.celebr_prod_taches_celebration') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_taches_celebration'))<>'CREATE INDEX celebr_prod_taches_celebration ON ephemer_celebrations.taches USING btree (celebration, id)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_taches_celebration') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_taches_celebration'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_taches_auteur') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_taches_auteur'))<>'CREATE INDEX celebr_prod_taches_auteur ON ephemer_celebrations.taches USING btree (auteur, celebration)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_taches_auteur') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_taches_auteur'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_commentaires_celebration') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_commentaires_celebration'))<>'CREATE INDEX celebr_prod_commentaires_celebration ON ephemer_celebrations.commentaires USING btree (celebration, created_at, id)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_commentaires_celebration') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_commentaires_celebration'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_commentaires_auteur') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_commentaires_auteur'))<>'CREATE INDEX celebr_prod_commentaires_auteur ON ephemer_celebrations.commentaires USING btree (auteur, celebration)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_commentaires_auteur') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_commentaires_auteur'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_demandes_historique') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_demandes_historique'))<>'CREATE INDEX celebr_prod_demandes_historique ON ephemer_celebrations.demandes USING btree (celebration, demandeur, created_at)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_demandes_historique') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_demandes_historique'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_demandes_demandeur') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_demandes_demandeur'))<>'CREATE INDEX celebr_prod_demandes_demandeur ON ephemer_celebrations.demandes USING btree (demandeur, id)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_demandes_demandeur') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_demandes_demandeur'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_invitations_quota') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_invitations_quota'))<>'CREATE INDEX celebr_prod_invitations_quota ON ephemer_celebrations.invitations USING btree (celebration, emetteur, created_at)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_invitations_quota') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_invitations_quota'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_invitations_emetteur') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_invitations_emetteur'))<>'CREATE INDEX celebr_prod_invitations_emetteur ON ephemer_celebrations.invitations USING btree (emetteur)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_invitations_emetteur') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_invitations_emetteur'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_transferts_cible') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_transferts_cible'))<>'CREATE INDEX celebr_prod_transferts_cible ON ephemer_celebrations.transferts USING btree (cible, id)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_transferts_cible') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_transferts_cible'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_transferts_initiateur') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_transferts_initiateur'))<>'CREATE INDEX celebr_prod_transferts_initiateur ON ephemer_celebrations.transferts USING btree (initiateur)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_transferts_initiateur') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_transferts_initiateur'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_actions_recent') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_actions_recent'))<>'CREATE INDEX celebr_prod_actions_recent ON ephemer_celebrations.actions USING btree (celebration, created_at DESC, id DESC)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_actions_recent') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_actions_recent'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_operations_quota') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_operations_quota'))<>'CREATE INDEX celebr_prod_operations_quota ON ephemer_celebrations.operations USING btree (acteur, created_at DESC)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_operations_quota') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_operations_quota'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_notifications_recent') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_notifications_recent'))<>'CREATE INDEX celebr_prod_notifications_recent ON ephemer_celebrations.notifications USING btree (celebration, created_at DESC, id DESC)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_notifications_recent') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_notifications_recent'; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_sources_preparation') IS NOT NULL AND (pg_get_indexdef(to_regclass('ephemer_celebrations.celebr_prod_sources_preparation'))<>'CREATE INDEX celebr_prod_sources_preparation ON ephemer_celebrations.sources USING btree (preparation)' OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('ephemer_celebrations.celebr_prod_sources_preparation') AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %','celebr_prod_sources_preparation'; END IF;
END $index_garde$;
DO $correctif$ DECLARE modifie boolean:=false; BEGIN
PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('ephemer_celebrations.partage_valide(uuid)') AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))='ce91d7e0dfbbea1bb2eef35a05d9f90c') THEN
EXECUTE $definition$CREATE OR REPLACE FUNCTION ephemer_celebrations.partage_valide(c uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations e WHERE e.id=c
    AND (NOT e.surprise OR e.mode='seul' OR EXISTS(SELECT 1 FROM auth.users u
      WHERE u.id=e.destinataire AND u.deleted_at IS NULL AND u.email_confirmed_at IS NOT NULL AND NOT u.is_anonymous)));
$fn$;$definition$;
REVOKE ALL ON FUNCTION ephemer_celebrations.partage_valide(uuid) FROM PUBLIC,anon,authenticated,service_role;
modifie:=true;
END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('ephemer_celebrations.lisible(uuid,uuid)') AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))='90b66a2f27d8d555695c216f3280c157') THEN
EXECUTE $definition$CREATE OR REPLACE FUNCTION ephemer_celebrations.lisible(c uuid,a uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations e JOIN ephemer_celebrations.participations m ON m.celebration=e.id
    WHERE e.id=c AND e.etat NOT IN ('supprimee','suspendue') AND m.compte=a AND m.etat='active'
    AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a) AND ephemer_celebrations.partage_valide(c)
    AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations autre
      WHERE autre.celebration=e.id AND autre.etat='active' AND ephemer_social.bloquee(a,autre.compte)));
$fn$;$definition$;
modifie:=true;
END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('ephemer_celebrations.maintenance(uuid,uuid)') AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))='644f31ad6fb3281c85fb25bdf6c79fcb') THEN
EXECUTE $definition$CREATE OR REPLACE FUNCTION ephemer_celebrations.maintenance(c uuid,a uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations e JOIN ephemer_celebrations.participations m ON m.celebration=e.id
    WHERE e.id=c AND e.etat<>'supprimee' AND m.compte=a AND m.role='organisateur' AND m.etat IN ('active','maintenance')
    AND (e.etat='suspendue' OR NOT ephemer_celebrations.partage_valide(c))
    AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a));
$fn$;$definition$;
modifie:=true;
END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('ephemer_celebrations.invite(uuid,uuid)') AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))='b222daa47e4c8f701cc373a286abf184') THEN
EXECUTE $definition$CREATE OR REPLACE FUNCTION ephemer_celebrations.invite(c uuid,a uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT EXISTS(SELECT 1 FROM ephemer_celebrations.invitations i JOIN ephemer_celebrations.celebrations e ON e.id=i.celebration
    WHERE e.id=c AND e.etat='active' AND i.cible=a AND i.etat='attente' AND i.expire_at>now()
    AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a) AND ephemer_celebrations.partage_valide(c)
    AND ephemer_celebrations.ami(i.emetteur,a)
    AND EXISTS(SELECT 1 FROM ephemer_celebrations.participations m WHERE m.celebration=e.id AND m.compte=i.emetteur AND m.role='organisateur' AND m.etat='active')
    AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations m WHERE m.celebration=e.id AND m.etat='active' AND ephemer_social.bloquee(a,m.compte)));
$fn$;$definition$;
modifie:=true;
END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('ephemer_celebrations.resume(uuid,uuid)') AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))='6e8b6d29dbc374ef776c12ff274f5d7b') THEN
EXECUTE $definition$CREATE OR REPLACE FUNCTION ephemer_celebrations.resume(c uuid,a uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT jsonb_build_object('id',e.id,'titre',CASE WHEN ephemer_celebrations.maintenance(c,a) THEN 'Célébration suspendue' ELSE e.titre END,
    'date',CASE WHEN ephemer_celebrations.maintenance(c,a) THEN NULL ELSE e.date_fete END,'dateCanonique',CASE WHEN ephemer_celebrations.maintenance(c,a) THEN NULL ELSE e.date_canonique END,
    'heure',CASE WHEN ephemer_celebrations.maintenance(c,a) THEN NULL ELSE left(e.heure::text,5) END,'lieu',CASE WHEN ephemer_celebrations.maintenance(c,a) THEN NULL ELSE e.lieu END,
    'mode',e.mode,'surprise',e.surprise,'destinataire',CASE WHEN ephemer_celebrations.maintenance(c,a) THEN NULL ELSE e.destinataire END,'etat',CASE WHEN ephemer_celebrations.maintenance(c,a) THEN 'suspendue' ELSE e.etat END,'revision',e.revision,'role',m.role,'maintenance',ephemer_celebrations.maintenance(c,a))
  FROM ephemer_celebrations.celebrations e JOIN ephemer_celebrations.participations m ON m.celebration=e.id
  WHERE e.id=c AND m.compte=a AND m.etat IN ('active','maintenance');
$fn$;$definition$;
modifie:=true;
END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('ephemer_celebrations.commander(text,jsonb,uuid)') AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))='c2f6ade8011f3ca427ec887f23ca7334') THEN
EXECUTE $definition$CREATE OR REPLACE FUNCTION ephemer_celebrations.commander(action text,d jsonb,operation uuid) RETURNS jsonb
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
  -- Exclusions actuelles prioritaires, meme avant restitution d'un ancien resultat.
  IF e.id IS NOT NULL AND e.surprise AND e.destinataire=a THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
  IF e.id IS NOT NULL AND NOT ephemer_celebrations.partage_valide(c) AND action NOT IN ('annuler','supprimer','traiter_suppression') THEN RAISE EXCEPTION 'Partage suspendu' USING ERRCODE='42501'; END IF;
  SELECT * INTO op FROM ephemer_celebrations.operations WHERE acteur=a AND id=operation;
  IF op.id IS NOT NULL THEN
    IF op.empreinte<>empreinte THEN RAISE EXCEPTION 'Identifiant reutilise' USING ERRCODE='22023'; END IF;
    IF ephemer_celebrations.lisible(c,a) OR (maintenance AND action IN ('proposer_transfert','annuler','supprimer')) OR ephemer_celebrations.invite(c,a)
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

    IF NOT ephemer_celebrations.partage_valide(c) AND action NOT IN ('annuler','supprimer') THEN RAISE EXCEPTION 'Partage suspendu' USING ERRCODE='42501'; END IF;
    -- Un meme UUID ne peut representer deux lignes de la liste paginee des invitations.
  -- Le verrou social commun est deja acquis ; un reessai confirme est retourne plus haut.
  IF action IN ('inviter','proposer_transfert','demander_suppression') THEN
    b:=coalesce(d->>'invitation',d->>'transfert',d->>'demande')::uuid;
    IF EXISTS(SELECT 1 FROM ephemer_celebrations.invitations WHERE id=b)
      OR EXISTS(SELECT 1 FROM ephemer_celebrations.transferts WHERE id=b)
      OR EXISTS(SELECT 1 FROM ephemer_celebrations.demandes WHERE id=b) THEN
      RAISE EXCEPTION 'Identifiant utilise : nouvelle commande requise' USING ERRCODE='40001';
    END IF;
  END IF;

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
END $fn$;$definition$;
modifie:=true;
END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('ephemer_celebrations.detail(uuid,uuid)') AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))='00c8b6434faeba548d59c39aee00b707') THEN
EXECUTE $definition$CREATE OR REPLACE FUNCTION ephemer_celebrations.detail(c uuid,a uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE r jsonb; est_admin boolean; est_maintenance boolean; e ephemer_celebrations.celebrations;
BEGIN
  est_maintenance:=ephemer_celebrations.maintenance(c,a);
  IF NOT ephemer_celebrations.lisible(c,a) AND NOT est_maintenance THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
  SELECT * INTO e FROM ephemer_celebrations.celebrations WHERE id=c;
  SELECT role='organisateur' INTO est_admin FROM ephemer_celebrations.participations WHERE celebration=c AND compte=a AND etat IN ('active','maintenance');
  r:=jsonb_build_object('celebration',ephemer_celebrations.resume(c,a),'participants','[]'::jsonb,'taches','[]'::jsonb,'commentaires','[]'::jsonb,'invitations','[]'::jsonb,'transferts','[]'::jsonb,'demandes','[]'::jsonb,'actions','[]'::jsonb,'notifications','[]'::jsonb);
  r:=jsonb_set(r,'{participants}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'compte',m.compte,'identite',ephemer_social.identite(m.compte),'role',m.role,'etat',m.etat) ORDER BY m.id)
    FROM ephemer_celebrations.participations m WHERE m.celebration=c AND m.etat='active' AND NOT ephemer_social.bloquee(a,m.compte) AND (NOT est_maintenance OR ephemer_celebrations.partage_valide(c) OR m.compte=a)),'[]'::jsonb));
  r:=jsonb_set(r,'{transferts}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'cible',t.cible,'initiateur',t.initiateur,'expiration',t.expire_at) ORDER BY t.id)
    FROM ephemer_celebrations.transferts t WHERE t.celebration=c AND t.etat='attente' AND t.expire_at>now() AND ephemer_celebrations.partage_valide(c) AND (est_admin OR t.cible=a)),'[]'::jsonb));
  IF est_maintenance THEN RETURN r; END IF;
  r:=jsonb_set(r,'{taches}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'titre',t.titre,'type',t.type,'responsable',t.responsable,'echeance',t.echeance,'etat',t.etat,'revision',t.revision,'auteur',t.auteur) ORDER BY t.id) FROM ephemer_celebrations.taches t WHERE t.celebration=c AND (e.destinataire IS DISTINCT FROM a OR t.type NOT IN ('cadeau','message'))),'[]'::jsonb));
  r:=jsonb_set(r,'{commentaires}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'texte',t.texte,'auteur',t.auteur,'revision',t.revision,'identite',CASE WHEN EXISTS(SELECT 1 FROM ephemer_celebrations.participations m WHERE m.celebration=c AND m.compte=t.auteur AND m.etat='active') THEN ephemer_social.identite(t.auteur) ELSE 'Participant parti' END) ORDER BY t.created_at,t.id) FROM ephemer_celebrations.commentaires t WHERE t.celebration=c),'[]'::jsonb));
  IF est_admin THEN r:=jsonb_set(r,'{invitations}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'cible',t.cible,'identite',ephemer_social.identite(t.cible),'expiration',t.expire_at) ORDER BY t.id) FROM ephemer_celebrations.invitations t WHERE t.celebration=c AND t.etat='attente' AND t.expire_at>now()),'[]'::jsonb)); END IF;
  r:=jsonb_set(r,'{demandes}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'demandeur',t.demandeur,'motif',t.motif,'etat',t.etat,'revision',t.revision) ORDER BY t.id)
    FROM ephemer_celebrations.demandes t WHERE t.celebration=c AND (t.demandeur=a OR (est_admin AND (ephemer_celebrations.lisible(c,t.demandeur) OR ephemer_celebrations.invite(c,t.demandeur))))),'[]'::jsonb));
  r:=jsonb_set(r,'{actions}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'action',t.action,'date',t.created_at) ORDER BY t.created_at DESC,t.id DESC) FROM ephemer_celebrations.actions t WHERE t.celebration=c AND (e.destinataire IS DISTINCT FROM a OR t.action NOT IN ('ajouter_tache','modifier_tache','publier'))),'[]'::jsonb));
  r:=jsonb_set(r,'{notifications}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'type',t.type,'date',t.created_at) ORDER BY t.created_at DESC,t.id DESC) FROM ephemer_celebrations.notifications t WHERE t.celebration=c AND t.compte=a),'[]'::jsonb));
  RETURN r;
END $fn$;$definition$;
modifie:=true;
END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('ephemer_celebrations.lister(uuid,integer,text)') AND md5(btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))='ccee4d2721383790b9851be15adf4a86') THEN
EXECUTE $definition$CREATE OR REPLACE FUNCTION ephemer_celebrations.lister(apres uuid,limite integer,vue text) RETURNS jsonb
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
        AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a) AND ephemer_celebrations.partage_valide(e.id) AND NOT ephemer_social.bloquee(a,t.initiateur)
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
      FROM ephemer_celebrations.participations propre JOIN ephemer_celebrations.celebrations e ON e.id=propre.celebration
      WHERE propre.compte=a AND propre.etat IN ('active','maintenance') AND (apres IS NULL OR e.id>apres)
        AND (ephemer_celebrations.lisible(e.id,a) OR (vue='liste' AND ephemer_celebrations.maintenance(e.id,a))) ORDER BY e.id LIMIT limite) x;
  END IF;
  RETURN jsonb_build_object('items',r);
END $fn$;$definition$;
modifie:=true;
END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_taches_celebration') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_taches_celebration ON ephemer_celebrations.taches USING btree (celebration, id)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_taches_auteur') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_taches_auteur ON ephemer_celebrations.taches USING btree (auteur, celebration)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_commentaires_celebration') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_commentaires_celebration ON ephemer_celebrations.commentaires USING btree (celebration, created_at, id)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_commentaires_auteur') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_commentaires_auteur ON ephemer_celebrations.commentaires USING btree (auteur, celebration)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_demandes_historique') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_demandes_historique ON ephemer_celebrations.demandes USING btree (celebration, demandeur, created_at)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_demandes_demandeur') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_demandes_demandeur ON ephemer_celebrations.demandes USING btree (demandeur, id)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_invitations_quota') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_invitations_quota ON ephemer_celebrations.invitations USING btree (celebration, emetteur, created_at)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_invitations_emetteur') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_invitations_emetteur ON ephemer_celebrations.invitations USING btree (emetteur)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_transferts_cible') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_transferts_cible ON ephemer_celebrations.transferts USING btree (cible, id)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_transferts_initiateur') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_transferts_initiateur ON ephemer_celebrations.transferts USING btree (initiateur)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_actions_recent') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_actions_recent ON ephemer_celebrations.actions USING btree (celebration, created_at DESC, id DESC)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_operations_quota') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_operations_quota ON ephemer_celebrations.operations USING btree (acteur, created_at DESC)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_notifications_recent') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_notifications_recent ON ephemer_celebrations.notifications USING btree (celebration, created_at DESC, id DESC)'; modifie:=true; END IF;
IF to_regclass('ephemer_celebrations.celebr_prod_sources_preparation') IS NULL THEN EXECUTE 'CREATE INDEX celebr_prod_sources_preparation ON ephemer_celebrations.sources USING btree (preparation)'; modifie:=true; END IF;
IF modifie THEN PERFORM pg_notify('pgrst','reload schema'); RAISE NOTICE 'Correctif applique, aucun contenu reecrit'; ELSE RAISE NOTICE 'Correctif deja installe'; END IF;
END $correctif$;
DO $droits_apres$ DECLARE r record; n integer; BEGIN
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
END $droits_apres$;
SELECT 'celebrations_correctif_production_applique' AS resultat;
COMMIT;
