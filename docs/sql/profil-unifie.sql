-- PROFIL UNIFIÉ — installation MANUELLE complète après validation sur copie.
-- Prérequis : Invitations V2, dates lot-02, Univers 10C. Aucun DROP ni donnée fictive.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $pre$ BEGIN
 IF current_user<>'postgres' OR to_regprocedure('ephemer_invites.naissance(uuid,bigint)') IS NULL
 OR to_regprocedure('ephemer_social.univers_commander(text,jsonb,bigint,uuid)') IS NULL THEN
  RAISE EXCEPTION 'Prérequis Invitations V2/Univers absents ou rôle postgres requis'; END IF;
 IF to_regprocedure('public.lire_mon_profil()') IS NOT NULL THEN RAISE EXCEPTION 'Profil unifié déjà installé : ne pas rejouer'; END IF;
END $pre$;
ALTER TABLE public.profiles ADD COLUMN profil_unifie_at timestamptz;
ALTER TABLE ephemer_social.univers_utilisateurs ADD COLUMN partage_actif boolean NOT NULL DEFAULT false;
ALTER TABLE ephemer_social.univers_utilisateurs ADD COLUMN partage_nom boolean NOT NULL DEFAULT false;
-- Préserver uniquement les accords déjà présents. Un nouvel univers reste privé.
UPDATE ephemer_social.univers_utilisateurs u SET partage_actif=EXISTS(SELECT 1 FROM jsonb_each(u.partage) f WHERE f.value='true'::jsonb)
 OR EXISTS(SELECT 1 FROM jsonb_each(u.ia_cadeaux) f WHERE f.value='true'::jsonb);

-- Helpers privés : aucun appel client avec un propriétaire arbitraire.
CREATE FUNCTION ephemer_social.profil_naissance(a uuid) RETURNS jsonb LANGUAGE plpgsql STABLE
SET search_path=pg_catalog AS $fn$
DECLARE e public.evenements_personnels; r public.regles_evenements; b date;
BEGIN
 SELECT * INTO e FROM public.evenements_personnels WHERE user_id=a AND origine='compte' AND type_evenement='anniversaire';
 IF FOUND THEN
  IF e.archive THEN RETURN NULL; END IF;
  SELECT * INTO r FROM public.regles_evenements WHERE evenement_id=e.id AND NOT retiree
   AND debut_cycle<=extract(year FROM now() AT TIME ZONE 'Europe/Paris') AND coalesce(fin_cycle,9999)>=extract(year FROM now() AT TIME ZONE 'Europe/Paris');
  IF FOUND THEN RETURN jsonb_build_object('jour',r.jour,'mois',r.mois,'annee',r.annee_naissance); END IF;
  RETURN NULL;
 END IF;
 SELECT date_naissance INTO b FROM public.profiles WHERE id=a;
 IF b IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('jour',extract(day FROM b)::int,'mois',extract(month FROM b)::int,
  'annee',(CASE WHEN extract(year FROM b)=1900 THEN NULL ELSE extract(year FROM b)::int END));
END $fn$;

CREATE FUNCTION ephemer_social.profil_snapshot(a uuid) RETURNS jsonb LANGUAGE plpgsql STABLE
SET search_path=pg_catalog AS $fn$
DECLARE p public.profiles; u ephemer_social.univers_utilisateurs; vals jsonb; flags jsonb; ia jsonb; b jsonb;
 first text; surname text; email_auth text; code text; num text; phone text; ident text; old_phone text; output jsonb;
BEGIN
 SELECT * INTO p FROM public.profiles WHERE id=a;
 SELECT * INTO u FROM ephemer_social.univers_utilisateurs WHERE user_id=a;
 SELECT lower(email) INTO email_auth FROM auth.users WHERE id=a;
 vals:=coalesce(u.valeurs,'{"presentation":"","passions":"","plaisirs":"","eviter":"","anniversaire":null,"email":"","telephone":""}'::jsonb);
 flags:=coalesce(u.partage,'{"presentation":false,"passions":false,"plaisirs":false,"eviter":false,"anniversaire":false,"annee":false,"email":false,"telephone":false,"avatar":false}'::jsonb);
 ia:=coalesce(u.ia_cadeaux,'{"identite":false,"presentation":false,"passions":false,"plaisirs":false,"eviter":false}'::jsonb);
 first:=coalesce(nullif(btrim(p.prenom),''),(CASE WHEN p.profil_unifie_at IS NULL AND u.mode_identite='prenom' THEN u.identite END),''); surname:=coalesce(p.nom,'');
 code:=coalesce(nullif(p.telephone_indicatif,''),'+33'); num:=regexp_replace(coalesce(p.telephone_numero,''),'[^0-9]','','g');
 old_phone:=regexp_replace(coalesce(vals->>'telephone',''),'[^+0-9]','','g');
 IF num='' AND p.profil_unifie_at IS NULL AND old_phone<>'' THEN
  IF left(old_phone,1)='+' THEN
   SELECT c INTO code FROM unnest(ARRAY['+212','+213','+216','+33','+32','+41','+44','+34','+39','+49','+1']) c
    WHERE left(old_phone,char_length(c))=c ORDER BY char_length(c) DESC LIMIT 1;
   code:=coalesce(code,'+'); num:=substring(old_phone FROM char_length(code)+1);
  ELSE num:=old_phone; END IF;
 END IF;
 phone:=(CASE WHEN num<>'' THEN code||num ELSE '' END);
 b:=ephemer_social.profil_naissance(a);
 IF b IS NULL AND p.profil_unifie_at IS NULL AND NOT EXISTS(SELECT 1 FROM public.evenements_personnels WHERE user_id=a AND origine='compte' AND type_evenement='anniversaire') THEN
  b:=vals->'anniversaire'; END IF;
 ident:=(CASE WHEN u.mode_identite='pseudonyme' THEN u.identite ELSE coalesce(nullif(first,''),'Une étoile') END);
 -- Pas de comparaison à afficher : Profil prioritaire, publication des valeurs différentes suspendue.
 IF p.profil_unifie_at IS NULL THEN
  IF (vals->>'email') IS DISTINCT FROM coalesce(email_auth,'') THEN flags:=flags||'{"email":false}'; END IF;
  IF regexp_replace(coalesce(vals->>'telephone',''),'[^+0-9]','','g') IS DISTINCT FROM phone THEN flags:=flags||'{"telephone":false}'; END IF;
  IF (vals->'anniversaire'->'jour') IS DISTINCT FROM (b->'jour') OR (vals->'anniversaire'->'mois') IS DISTINCT FROM (b->'mois') THEN
   flags:=flags||'{"anniversaire":false,"annee":false}';
  ELSIF (vals->'anniversaire'->'annee') IS DISTINCT FROM (b->'annee') THEN flags:=flags||'{"annee":false}'; END IF;
  IF u.identite IS DISTINCT FROM ident THEN ia:=ia||'{"identite":false}'; END IF;
 END IF;
 IF b IS NULL OR b='null'::jsonb THEN flags:=flags||'{"anniversaire":false,"annee":false}';
 ELSIF b->'annee'='null'::jsonb THEN flags:=flags||'{"annee":false}'; END IF;
 IF NOT coalesce(u.partage_actif,false) THEN ia:='{"identite":false,"presentation":false,"passions":false,"plaisirs":false,"eviter":false}'; END IF;
 vals:=vals||jsonb_build_object('anniversaire',b,'email',coalesce(email_auth,''),'telephone',phone);
 output:=jsonb_build_object('revision',coalesce(u.revision,0),'modeIdentite',coalesce(u.mode_identite,'prenom'),'identite',ident,
  'valeurs',vals,'partage',flags,'iaCadeaux',ia,'prenom',first,'nom',surname,'indicatif',code,'tel',num,
  'partageActif',coalesce(u.partage_actif,false),'partageNom',coalesce(u.partage_nom,false));
 RETURN output||jsonb_build_object('empreinte',encode(extensions.digest(output::text||coalesce(to_jsonb(p)::text,'')||
  coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id)::text FROM public.evenements_personnels e WHERE user_id=a AND origine='compte' AND type_evenement='anniversaire'),'')||
  coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id)::text FROM public.regles_evenements r JOIN public.evenements_personnels e ON e.id=r.evenement_id WHERE e.user_id=a AND e.origine='compte' AND e.type_evenement='anniversaire'),''),'sha256'),'hex'));
END $fn$;
CREATE FUNCTION ephemer_social.profil_lire() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT ephemer_social.profil_snapshot(ephemer_social.acteur()); $$;
CREATE FUNCTION public.lire_mon_profil() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT ephemer_social.profil_lire(); $$;

CREATE FUNCTION ephemer_social.profil_enregistrer(op uuid,d jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); before_state jsonb; u ephemer_social.univers_utilisateurs; e public.evenements_personnels;
 old_op ephemer_social.operations_univers; fingerprint text; vals jsonb; ia jsonb; b jsonb; result jsonb; y int;
BEGIN
 IF op IS NULL OR d IS NULL OR jsonb_typeof(d)<>'object' OR octet_length(d::text)>32768
 OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(d) keys(k)) IS DISTINCT FROM
 ARRAY['empreinte','iaCadeaux','identite','indicatif','modeIdentite','nom','partage','partageActif','partageNom','prenom','revision','tel','valeurs'] THEN
  RAISE EXCEPTION 'Profil invalide' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(d->'prenom') IS DISTINCT FROM 'string' OR char_length(btrim(d->>'prenom')) NOT BETWEEN 1 AND 80
 OR jsonb_typeof(d->'nom') IS DISTINCT FROM 'string' OR char_length(d->>'nom')>80
 OR (d->>'prenom') ~ '[[:cntrl:]]' OR (d->>'nom') ~ '[[:cntrl:]]'
 OR jsonb_typeof(d->'indicatif') IS DISTINCT FROM 'string' OR (d->>'indicatif') !~ '^\+[0-9]{0,7}$'
 OR jsonb_typeof(d->'tel') IS DISTINCT FROM 'string' OR (d->>'tel') !~ '^[0-9]{0,31}$'
 OR jsonb_typeof(d->'revision') IS DISTINCT FROM 'number' OR (d->>'revision') !~ '^[0-9]+$'
 OR (d->>'revision')::bigint NOT BETWEEN 0 AND 9007199254740990
 OR jsonb_typeof(d->'empreinte') IS DISTINCT FROM 'string' OR (d->>'empreinte') !~ '^[a-f0-9]{64}$'
 OR jsonb_typeof(d->'partageActif') IS DISTINCT FROM 'boolean' OR jsonb_typeof(d->'partageNom') IS DISTINCT FROM 'boolean'
 OR jsonb_typeof(d->'modeIdentite') IS DISTINCT FROM 'string' OR d->>'modeIdentite' NOT IN ('prenom','pseudonyme') OR jsonb_typeof(d->'identite') IS DISTINCT FROM 'string'
 OR char_length(d->>'identite') NOT BETWEEN 1 AND 80 OR btrim(d->>'identite') IS DISTINCT FROM d->>'identite'
 OR (d->>'identite') ~ '[[:cntrl:]]' OR (d->>'modeIdentite'='prenom' AND d->>'identite'<>btrim(d->>'prenom'))
 OR NOT ephemer_social.valeurs_univers_valides(d->'valeurs') OR NOT ephemer_social.partage_univers_valide(d->'valeurs',d->'partage')
 OR NOT ephemer_social.ia_cadeaux_valide(d->'partage',d->'iaCadeaux') THEN
  RAISE EXCEPTION 'Champs invalides' USING ERRCODE='22023'; END IF;
 IF (d->'valeurs'->>'telephone') IS DISTINCT FROM (CASE WHEN d->>'tel'<>'' THEN (d->>'indicatif')||(d->>'tel') ELSE '' END)
 OR (d->'valeurs'->>'email') IS DISTINCT FROM (SELECT lower(email) FROM auth.users WHERE id=a)
 OR (NOT (d->>'partageActif')::boolean AND EXISTS(SELECT 1 FROM jsonb_each(d->'iaCadeaux') f WHERE f.value='true'::jsonb)) THEN
  RAISE EXCEPTION 'Coordonnées ou accords incohérents' USING ERRCODE='22023'; END IF;
 b:=d->'valeurs'->'anniversaire'; y:=(b->>'annee')::int;
 IF y IS NOT NULL AND make_date(y,(b->>'mois')::int,(b->>'jour')::int)>(now() AT TIME ZONE 'Europe/Paris')::date THEN
  RAISE EXCEPTION 'Naissance future' USING ERRCODE='22023'; END IF;
 fingerprint:=encode(extensions.digest('profil-unifie:'||d::text,'sha256'),'hex');
 PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
 PERFORM 1 FROM public.profiles WHERE id=a FOR UPDATE;
 SELECT * INTO e FROM public.evenements_personnels WHERE user_id=a AND origine='compte' AND type_evenement='anniversaire' FOR UPDATE;
 SELECT * INTO old_op FROM ephemer_social.operations_univers WHERE user_id=a AND operation_id=op;
 IF FOUND THEN
  IF old_op.empreinte<>fingerprint THEN RAISE EXCEPTION 'Opération réutilisée' USING ERRCODE='22023'; END IF;
  RETURN old_op.resultat; END IF;
 before_state:=ephemer_social.profil_snapshot(a);
 IF before_state->>'empreinte' IS DISTINCT FROM d->>'empreinte' OR before_state->'revision' IS DISTINCT FROM d->'revision' THEN
  RAISE EXCEPTION 'Profil ou dates modifiés : relire' USING ERRCODE='40001'; END IF;
 INSERT INTO public.profiles(id,prenom,nom,telephone_indicatif,telephone_numero,onboarding_completed_at)
 VALUES(a,d->>'prenom',nullif(d->>'nom',''),d->>'indicatif',nullif(d->>'tel',''),now())
 ON CONFLICT(id) DO UPDATE SET prenom=excluded.prenom,nom=excluded.nom,telephone_indicatif=excluded.telephone_indicatif,
  telephone_numero=excluded.telephone_numero,onboarding_completed_at=coalesce(public.profiles.onboarding_completed_at,excluded.onboarding_completed_at);
 IF before_state->'valeurs'->'anniversaire' IS DISTINCT FROM b OR (e.id IS NULL AND b<>'null'::jsonb) THEN
  IF b='null'::jsonb THEN
   IF e.id IS NOT NULL THEN
    -- Retirer les règles présentes/futures tout en conservant l'historique et les occurrences.
    UPDATE public.regles_evenements SET retiree=true WHERE evenement_id=e.id AND NOT retiree AND debut_cycle>=extract(year FROM now() AT TIME ZONE 'Europe/Paris');
    UPDATE public.regles_evenements SET fin_cycle=extract(year FROM now() AT TIME ZONE 'Europe/Paris')::int-1
     WHERE evenement_id=e.id AND NOT retiree AND coalesce(fin_cycle,9999)>=extract(year FROM now() AT TIME ZONE 'Europe/Paris');
    UPDATE public.evenements_personnels SET archive=true,revision=revision+1,updated_at=now() WHERE id=e.id;
   END IF;
   UPDATE public.profiles SET date_naissance=NULL WHERE id=a;
  ELSE
   PERFORM ephemer_lot02.enregistrer(jsonb_build_object('id',coalesce(e.id,gen_random_uuid()),'revision',coalesce(e.revision,0),'contact_id',NULL,
    'type_evenement','anniversaire','titre',coalesce(e.titre,'Mon anniversaire'),'recurrence','annuelle','jour',b->'jour','mois',b->'mois','annee_naissance',b->'annee',
    'depuis_cycle',extract(year FROM now() AT TIME ZONE 'Europe/Paris')::int));
   IF e.archive THEN UPDATE public.evenements_personnels SET archive=false,revision=revision+1,updated_at=now() WHERE id=e.id; END IF;
  END IF;
 END IF;
 INSERT INTO ephemer_social.univers_utilisateurs(user_id,mode_identite,identite,valeurs,partage,ia_cadeaux,revision,partage_actif,partage_nom)
 VALUES(a,d->>'modeIdentite',d->>'identite',d->'valeurs',d->'partage',d->'iaCadeaux',(d->>'revision')::bigint+1,(d->>'partageActif')::boolean,(d->>'partageNom')::boolean)
 ON CONFLICT(user_id) DO UPDATE SET mode_identite=excluded.mode_identite,identite=excluded.identite,valeurs=excluded.valeurs,
  partage=excluded.partage,ia_cadeaux=excluded.ia_cadeaux,revision=excluded.revision,partage_actif=excluded.partage_actif,partage_nom=excluded.partage_nom,updated_at=now();
 UPDATE public.profiles SET profil_unifie_at=coalesce(profil_unifie_at,now()) WHERE id=a;
 result:=jsonb_build_object('ok',true,'revision',(d->>'revision')::bigint+1);
 INSERT INTO ephemer_social.operations_univers(user_id,operation_id,empreinte,resultat) VALUES(a,op,fingerprint,result);
 RETURN result;
END $fn$;
CREATE FUNCTION public.enregistrer_mon_profil(p_operation uuid,p_donnees jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER
SET search_path=pg_catalog AS $$ SELECT ephemer_social.profil_enregistrer(p_operation,p_donnees); $$;

-- Identité minimale : pseudonyme conservé, prénom lu dans sa source après unification.
CREATE OR REPLACE FUNCTION ephemer_social.identite(v uuid) RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT coalesce((CASE WHEN p.profil_unifie_at IS NOT NULL AND u.mode_identite='prenom' THEN nullif(btrim(p.prenom),'') ELSE u.identite END),nullif(left(btrim(p.prenom),80),''),'Une etoile')
 FROM (SELECT 1) x LEFT JOIN public.profiles p ON p.id=v LEFT JOIN ephemer_social.univers_utilisateurs u ON u.user_id=v; $$;

-- Les anciens onglets ne doivent pas recréer une source de coordonnées indépendante.
CREATE OR REPLACE FUNCTION public.commander_mon_univers(p_action text,p_donnees jsonb,p_revision bigint,p_operation uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$ BEGIN
 PERFORM ephemer_social.acteur(); RAISE EXCEPTION 'Profil unifié : recharger la page' USING ERRCODE='P1009'; END $$;

CREATE OR REPLACE FUNCTION ephemer_social.univers_lire(cible uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); b uuid:=coalesce(cible,a); u ephemer_social.univers_utilisateurs;
  valeurs_vides jsonb:='{"presentation":"","passions":"","plaisirs":"","eviter":"","anniversaire":null,"email":"","telephone":""}';
  partage_vide jsonb:='{"presentation":false,"passions":false,"plaisirs":false,"eviter":false,"anniversaire":false,"annee":false,"email":false,"telephone":false,"avatar":false}';
  champs jsonb:='{}'; k text; avatar jsonb; anniversaire jsonb; own jsonb;
BEGIN
  -- Un retrait déjà validé interdit les nouvelles lectures ; pas de permissions dans un JWT.
  IF b<>a AND (ephemer_social.bloquee(a,b) OR NOT EXISTS(SELECT 1 FROM ephemer_social.relations_etoiles
    WHERE compte_a=least(a,b) AND compte_b=greatest(a,b) AND etat='active')) THEN
    RAISE EXCEPTION 'Univers indisponible' USING ERRCODE='42501'; END IF;
  SELECT * INTO u FROM ephemer_social.univers_utilisateurs WHERE user_id=b;
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id=b AND profil_unifie_at IS NOT NULL) THEN
    own:=ephemer_social.profil_snapshot(b); u.valeurs:=own->'valeurs'; u.partage:=own->'partage';
  END IF;
  IF cible IS NULL THEN
    IF NOT coalesce(u.partage_actif,false) THEN
      u.partage:='{"presentation":false,"passions":false,"plaisirs":false,"eviter":false,"anniversaire":false,"annee":false,"email":false,"telephone":false,"avatar":false}';
      u.ia_cadeaux:='{"identite":false,"presentation":false,"passions":false,"plaisirs":false,"eviter":false}';
    END IF;
    RETURN jsonb_build_object('revision',coalesce(u.revision,0),'modeIdentite',coalesce(u.mode_identite,'prenom'),
      'identite',ephemer_social.identite(a),'valeurs',coalesce(u.valeurs,valeurs_vides),'partage',coalesce(u.partage,partage_vide),'iaCadeaux',coalesce(u.ia_cadeaux,'{"identite":false,"presentation":false,"passions":false,"plaisirs":false,"eviter":false}'::jsonb));
  END IF;
  IF NOT coalesce(u.partage_actif,false) THEN RETURN jsonb_build_object('identite',ephemer_social.identite(b),'champs','{}'::jsonb); END IF;
  IF own IS NOT NULL AND u.partage_nom THEN
    SELECT champs||jsonb_build_object('nom',nom) INTO champs FROM public.profiles WHERE id=b AND nullif(nom,'') IS NOT NULL;
    champs:=coalesce(champs,'{}'::jsonb);
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

CREATE OR REPLACE FUNCTION ephemer_social.univers_cadeaux(cible uuid,selection text[],attendue bigint,relation_attendue bigint,contact bigint) RETURNS jsonb
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
    IF u.partage_actif AND u.ia_cadeaux->k='true'::jsonb AND (k='identite' OR u.partage->k='true'::jsonb)
      AND (k='identite' OR btrim(u.valeurs->>k)<>'') THEN
      champs:=champs||jsonb_build_object(k,CASE WHEN k='identite' THEN to_jsonb(ephemer_social.identite(cible)) ELSE u.valeurs->k END);
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

CREATE OR REPLACE FUNCTION ephemer_invites.valider(d jsonb,profil boolean DEFAULT false) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog AS $fn$
DECLARE b jsonb; y int; m int; j int; k text; date_test date;
BEGIN
 IF d IS NULL OR jsonb_typeof(d)<>'object' OR octet_length(d::text)>8192
 OR (SELECT array_agg(c ORDER BY c) FROM jsonb_object_keys(d) keys(c)) IS DISTINCT FROM
 ARRAY['anniversaire','conserver','email','indicatif','interets','nom','noteLibre','prenom','relation','tel'] THEN
 RAISE EXCEPTION 'Réponse invalide' USING ERRCODE='22023'; END IF;
 FOREACH k IN ARRAY ARRAY['prenom','nom','email','indicatif','noteLibre','relation','tel'] LOOP
  IF jsonb_typeof(d->k) IS DISTINCT FROM 'string' OR (CASE WHEN k='noteLibre' THEN translate(d->>k,E'\n\r\t','') ELSE d->>k END) ~ '[[:cntrl:]]' THEN
   RAISE EXCEPTION 'Texte invalide' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF char_length(btrim(d->>'prenom')) NOT BETWEEN 1 AND 80 OR char_length(d->>'nom')>80
 -- Les parenthèses évitent que le THEN du CASE termine la condition du IF PL/pgSQL.
 OR char_length(d->>'noteLibre')>(CASE WHEN profil THEN 1000 ELSE 500 END) OR char_length(d->>'email')>(CASE WHEN profil THEN 320 ELSE 160 END)
 OR (d->>'indicatif') !~ (CASE WHEN profil THEN '^\+[0-9]{0,7}$' ELSE '^\+[0-9]{1,7}$' END) OR (d->>'tel') !~ (CASE WHEN profil THEN '^[0-9]{0,31}$' ELSE '^[0-9]{0,20}$' END)
 OR (d->>'relation') NOT IN ('ami','famille','couple','pro','autre')
 OR jsonb_typeof(d->'conserver') IS DISTINCT FROM 'boolean'
 OR ((d->>'conserver')::boolean AND nullif(btrim(d->>'email'),'') IS NULL)
 OR (nullif(btrim(d->>'email'),'') IS NOT NULL AND ephemer_invites.email(d->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
 OR jsonb_typeof(d->'interets') IS DISTINCT FROM 'array' THEN
 RAISE EXCEPTION 'Champs invalides' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(d->'interets')>80 OR EXISTS(SELECT 1 FROM jsonb_array_elements(d->'interets') v
  WHERE jsonb_typeof(v)<>'string' OR char_length(v#>>'{}') NOT BETWEEN 1 AND 80 OR (v#>>'{}') ~ '[[:cntrl:]]')
 OR (SELECT count(*) FROM jsonb_array_elements(d->'interets'))<>(SELECT count(DISTINCT v) FROM jsonb_array_elements(d->'interets') v)
 OR (NOT profil AND char_length(ephemer_invites.note(d))>1000) THEN
 RAISE EXCEPTION 'Intérêts invalides' USING ERRCODE='22023'; END IF;
 b:=d->'anniversaire';
 IF b<>'null'::jsonb THEN
  IF jsonb_typeof(b)<>'object' OR (SELECT array_agg(c ORDER BY c) FROM jsonb_object_keys(b) keys(c)) IS DISTINCT FROM ARRAY['day','month','year']
  OR jsonb_typeof(b->'day') IS DISTINCT FROM 'number' OR jsonb_typeof(b->'month') IS DISTINCT FROM 'number'
  OR (b->>'day') !~ '^[0-9]+$' OR (b->>'month') !~ '^[0-9]+$'
  OR (b->'year'<>'null'::jsonb AND (jsonb_typeof(b->'year')<>'number' OR (b->>'year') !~ '^[0-9]+$')) THEN
   RAISE EXCEPTION 'Anniversaire invalide' USING ERRCODE='22023'; END IF;
  y:=(b->>'year')::int; m:=(b->>'month')::int; j:=(b->>'day')::int;
  IF y IS NOT NULL AND (y<1 OR y>extract(year FROM now() AT TIME ZONE 'Europe/Paris')) THEN
   RAISE EXCEPTION 'Année invalide' USING ERRCODE='22023'; END IF;
  date_test:=make_date(coalesce(y,2000),m,j);
  IF y IS NOT NULL AND date_test>(now() AT TIME ZONE 'Europe/Paris')::date THEN
   RAISE EXCEPTION 'Naissance future' USING ERRCODE='22023'; END IF;
 END IF;
END $fn$;

-- Même lecture canonique pour le premier profil et la reprise consentie.
CREATE OR REPLACE FUNCTION ephemer_invites.profil_lire() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); s jsonb:=ephemer_social.profil_snapshot(a); b jsonb:=s->'valeurs'->'anniversaire';
BEGIN
 RETURN jsonb_build_object('complete',EXISTS(SELECT 1 FROM public.profiles WHERE id=a AND onboarding_completed_at IS NOT NULL AND nullif(btrim(prenom),'') IS NOT NULL),
 'prenom',s->'prenom','nom',s->'nom','anniversaire',(CASE WHEN b='null'::jsonb THEN NULL ELSE jsonb_build_object('day',b->'jour','month',b->'mois','year',b->'annee') END),
 'email',s->'valeurs'->'email','indicatif',s->'indicatif','tel',s->'tel','passions',s->'valeurs'->'passions','presentation',s->'valeurs'->'presentation',
 'revisionUnivers',s->'revision','empreinte',s->'empreinte');
END $fn$;

-- Conserver les vérifications et l'idempotence V2, puis terminer dans les sources communes.
ALTER FUNCTION ephemer_invites.profil_enregistrer(uuid,jsonb) RENAME TO profil_enregistrer_avant_fusion;
CREATE FUNCTION ephemer_invites.profil_enregistrer(op uuid,d jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); r jsonb; s jsonb;
BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=a AND profil_unifie_at IS NOT NULL)
 AND NOT EXISTS(SELECT 1 FROM ephemer_invites.operations_profil WHERE user_id=a AND operation=op) THEN
  RAISE EXCEPTION 'Profil déjà unifié : recharger Mon profil' USING ERRCODE='P1009'; END IF;
 r:=ephemer_invites.profil_enregistrer_avant_fusion(op,d);
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=a AND profil_unifie_at IS NULL) THEN
  s:=ephemer_social.profil_snapshot(a);
  UPDATE ephemer_social.univers_utilisateurs SET valeurs=s->'valeurs',partage=s->'partage',ia_cadeaux=s->'iaCadeaux',
    identite=s->>'identite' WHERE user_id=a;
  UPDATE public.profiles SET profil_unifie_at=now() WHERE id=a;
 END IF;
 RETURN r;
END $fn$;

CREATE OR REPLACE FUNCTION public.enregistrer_premier_profil(p_operation uuid,p_donnees jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER
SET search_path=pg_catalog AS $$ SELECT ephemer_invites.profil_enregistrer(p_operation,p_donnees); $$;

REVOKE ALL ON FUNCTION ephemer_social.profil_naissance(uuid),ephemer_social.profil_snapshot(uuid),
 ephemer_social.profil_lire(),ephemer_social.profil_enregistrer(uuid,jsonb),public.lire_mon_profil(),
 public.enregistrer_mon_profil(uuid,jsonb),ephemer_invites.profil_enregistrer_avant_fusion(uuid,jsonb),
 ephemer_invites.profil_enregistrer(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION ephemer_social.univers_commander(text,jsonb,bigint,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION ephemer_social.profil_lire(),ephemer_social.profil_enregistrer(uuid,jsonb),
 public.lire_mon_profil(),public.enregistrer_mon_profil(uuid,jsonb),ephemer_invites.profil_enregistrer(uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
