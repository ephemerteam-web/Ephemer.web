-- Invitations V2 — proposition à relire et appliquer MANUELLEMENT sur une copie, puis sur le projet.
-- Prérequis : P2, lot-02 dates, lot-10A/B/C univers. Aucun secret et aucune donnée réelle ici.
BEGIN;
DO $pre$ BEGIN
 IF to_regclass('ephemer_social.univers_utilisateurs') IS NULL
 OR to_regprocedure('ephemer_lot02.materialiser(uuid,date,date)') IS NULL
 OR to_regprocedure('ephemer_social.acteur()') IS NULL THEN
   RAISE EXCEPTION 'Installer les lots dates et univers avant Invitations V2';
 END IF;
END $pre$;

CREATE SCHEMA ephemer_invites;
REVOKE ALL ON SCHEMA ephemer_invites FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA ephemer_invites TO authenticated;
ALTER TABLE public.profiles ADD COLUMN onboarding_completed_at timestamptz;
UPDATE public.profiles SET onboarding_completed_at=coalesce(created_at,now()) WHERE nullif(btrim(prenom),'') IS NOT NULL;

CREATE TABLE ephemer_invites.reponses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 hote_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
 personne text NOT NULL, donnees jsonb, candidats bigint[] NOT NULL DEFAULT '{}',
 contact_id bigint REFERENCES public.contacts(id) ON DELETE SET NULL,
 etat text NOT NULL CHECK(etat IN ('en_attente','traitee')),
 revision bigint NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(hote_id,personne)
);
CREATE TABLE ephemer_invites.operations (
 invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
 operation uuid NOT NULL, empreinte text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(invitation_id,operation)
);
CREATE TABLE ephemer_invites.reprises (
 id uuid PRIMARY KEY REFERENCES ephemer_invites.reponses(id) ON DELETE CASCADE,
 email text NOT NULL, donnees jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT (now()+interval '30 days')
);
CREATE INDEX ON ephemer_invites.reprises(email,expires_at);
CREATE TABLE ephemer_invites.operations_profil (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, operation uuid NOT NULL,
 empreinte text NOT NULL, PRIMARY KEY(user_id,operation)
);
ALTER TABLE ephemer_invites.reponses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ephemer_invites.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ephemer_invites.reprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE ephemer_invites.operations_profil ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA ephemer_invites FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION ephemer_invites.email(v text) RETURNS text LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog AS $$ SELECT lower(btrim(coalesce(v,''))); $$;
CREATE FUNCTION ephemer_invites.nom(v text) RETURNS text LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog AS $$ SELECT regexp_replace(translate(lower(btrim(coalesce(v,''))),
 'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc'),'[[:space:]]+',' ','g'); $$;

CREATE FUNCTION ephemer_invites.note(d jsonb) RETURNS text LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog AS $$ SELECT concat_ws(' — ',nullif((SELECT string_agg(v,', ' ORDER BY ord)
 FROM jsonb_array_elements_text(d->'interets') WITH ORDINALITY a(v,ord)),''),nullif(btrim(d->>'noteLibre'),'')); $$;

-- Validation fermée des réponses publiques, avant toute écriture privilégiée.
CREATE FUNCTION ephemer_invites.valider(d jsonb,profil boolean DEFAULT false) RETURNS void LANGUAGE plpgsql
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
 OR char_length(d->>'noteLibre')>(CASE WHEN profil THEN 1000 ELSE 500 END) OR char_length(d->>'email')>160
 OR (d->>'indicatif') !~ '^\+[0-9]{1,7}$' OR (d->>'tel') !~ '^[0-9]{0,20}$'
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

CREATE FUNCTION ephemer_invites.naissance(a uuid,c bigint) RETURNS jsonb LANGUAGE plpgsql STABLE
SET search_path=pg_catalog AS $fn$
DECLARE b date; r public.regles_evenements; e uuid;
BEGIN
 SELECT id INTO e FROM public.evenements_personnels WHERE user_id=a AND type_evenement='anniversaire'
 AND ((c IS NULL AND origine='compte') OR contact_id=c);
 IF e IS NOT NULL THEN
  SELECT * INTO r FROM public.regles_evenements WHERE evenement_id=e AND NOT retiree
   AND debut_cycle<=extract(year FROM now() AT TIME ZONE 'Europe/Paris')
   AND coalesce(fin_cycle,9999)>=extract(year FROM now() AT TIME ZONE 'Europe/Paris');
  IF FOUND THEN RETURN jsonb_build_object('day',r.jour,'month',r.mois,'year',r.annee_naissance); END IF;
  RETURN NULL; -- Une série existante n'est pas recréée à partir d'une ancienne colonne.
 END IF;
 IF c IS NULL THEN SELECT date_naissance INTO b FROM public.profiles WHERE id=a;
 ELSE SELECT date_naissance INTO b FROM public.contacts WHERE id=c AND user_id=a; END IF;
 IF b IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('day',extract(day FROM b)::int,'month',extract(month FROM b)::int,
  'year',CASE WHEN extract(year FROM b)=1900 THEN NULL ELSE extract(year FROM b)::int END);
END $fn$;

-- Ce helper privé ne peut être appelé par le client avec un hôte arbitraire.
CREATE FUNCTION ephemer_invites.ajouter_naissance(a uuid,c bigint,b jsonb,p text) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog AS $fn$
DECLARE e uuid; y int; legacy date;
BEGIN
 IF b IS NULL OR b='null'::jsonb OR EXISTS(SELECT 1 FROM public.evenements_personnels
  WHERE user_id=a AND type_evenement='anniversaire' AND ((c IS NULL AND origine='compte') OR contact_id=c)) THEN RETURN; END IF;
 IF c IS NULL THEN SELECT date_naissance INTO legacy FROM public.profiles WHERE id=a FOR UPDATE;
 ELSE SELECT date_naissance INTO legacy FROM public.contacts WHERE id=c AND user_id=a FOR UPDATE; END IF;
 IF legacy IS NOT NULL THEN RETURN; END IF;
 INSERT INTO public.evenements_personnels(user_id,contact_id,origine,type_evenement,titre,recurrence)
 VALUES(a,c,CASE WHEN c IS NULL THEN 'compte' ELSE 'contact' END,'anniversaire','Anniversaire de '||p,'annuelle') RETURNING id INTO e;
 y:=(b->>'year')::int;
 INSERT INTO public.regles_evenements(user_id,evenement_id,debut_cycle,jour,mois,annee_naissance)
 VALUES(a,e,1,(b->>'day')::int,(b->>'month')::int,y);
 IF y IS NOT NULL THEN
  IF c IS NULL THEN UPDATE public.profiles SET date_naissance=make_date(y,(b->>'month')::int,(b->>'day')::int) WHERE id=a;
  ELSE UPDATE public.contacts SET date_naissance=make_date(y,(b->>'month')::int,(b->>'day')::int) WHERE id=c AND user_id=a; END IF;
 END IF;
END $fn$;

CREATE FUNCTION ephemer_invites.projection(c public.contacts) RETURNS jsonb LANGUAGE sql STABLE
SET search_path=pg_catalog AS $$ SELECT jsonb_build_object('id',c.id::text,'prenom',coalesce(c.prenom,''),'nom',coalesce(c.nom,''),
 'email',coalesce(c.email,''),'indicatif',coalesce(c.telephone_indicatif,'+33'),'tel',coalesce(c.telephone_numero,''),
 'anniversaire',ephemer_invites.naissance(c.user_id,c.id),'relation',coalesce(c.relation,''),'note',coalesce(c.note,''),'empreinte',encode(extensions.digest(to_jsonb(c)::text||coalesce(ephemer_invites.naissance(c.user_id,c.id)::text,''),'sha256'),'hex')); $$;

CREATE FUNCTION ephemer_invites.conflits(c public.contacts,d jsonb) RETURNS text[] LANGUAGE plpgsql STABLE
SET search_path=pg_catalog AS $fn$
DECLARE out_fields text[]:='{}'; k text; old jsonb:=ephemer_invites.projection(c); b jsonb:=old->'anniversaire'; incoming jsonb:=d->'anniversaire'; n text:=ephemer_invites.note(d);
BEGIN
 FOREACH k IN ARRAY ARRAY['prenom','nom','email','relation','tel'] LOOP
  IF nullif(old->>k,'') IS NOT NULL AND nullif(d->>k,'') IS NOT NULL AND
  (CASE WHEN k IN ('prenom','nom') THEN ephemer_invites.nom(old->>k)<>ephemer_invites.nom(d->>k)
   WHEN k='email' THEN ephemer_invites.email(old->>k)<>ephemer_invites.email(d->>k)
   ELSE old->>k<>d->>k END) THEN out_fields:=array_append(out_fields,k); END IF;
 END LOOP;
 IF nullif(old->>'tel','') IS NOT NULL AND nullif(d->>'tel','') IS NOT NULL AND old->>'indicatif'<>d->>'indicatif' THEN out_fields:=array_append(out_fields,'indicatif'); END IF;
 IF b<>'null'::jsonb AND incoming<>'null'::jsonb AND
  (b->'day'<>incoming->'day' OR b->'month'<>incoming->'month'
   OR (b->'year'<>'null'::jsonb AND incoming->'year'<>'null'::jsonb AND b->'year'<>incoming->'year')) THEN out_fields:=array_append(out_fields,'anniversaire'); END IF;
 IF nullif(c.note,'') IS NOT NULL AND n<>'' AND c.note<>n THEN out_fields:=array_append(out_fields,'note'); END IF;
 RETURN out_fields;
END $fn$;

CREATE FUNCTION ephemer_invites.completer(a uuid,c bigint,d jsonb,choix text[] DEFAULT '{}') RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog AS $fn$
DECLARE old public.contacts; b jsonb; e public.evenements_personnels;
BEGIN
 SELECT * INTO STRICT old FROM public.contacts WHERE id=c AND user_id=a FOR UPDATE;
 UPDATE public.contacts SET
 prenom=CASE WHEN 'prenom'=ANY(choix) THEN d->>'prenom' ELSE coalesce(nullif(prenom,''),d->>'prenom') END,
 nom=CASE WHEN 'nom'=ANY(choix) THEN nullif(d->>'nom','') ELSE coalesce(nullif(nom,''),nullif(d->>'nom','')) END,
 email=CASE WHEN 'email'=ANY(choix) THEN nullif(ephemer_invites.email(d->>'email'),'') ELSE coalesce(nullif(email,''),nullif(ephemer_invites.email(d->>'email'),'')) END,
 relation=CASE WHEN 'relation'=ANY(choix) THEN d->>'relation' ELSE coalesce(nullif(relation,''),d->>'relation') END,
 telephone_numero=CASE WHEN 'tel'=ANY(choix) THEN nullif(d->>'tel','') ELSE coalesce(nullif(telephone_numero,''),nullif(d->>'tel','')) END,
 telephone_indicatif=CASE WHEN 'indicatif'=ANY(choix) OR nullif(old.telephone_numero,'') IS NULL THEN CASE WHEN nullif(d->>'tel','') IS NOT NULL THEN d->>'indicatif' ELSE telephone_indicatif END ELSE telephone_indicatif END,
 note=CASE WHEN 'note'=ANY(choix) THEN nullif(ephemer_invites.note(d),'') ELSE coalesce(nullif(note,''),nullif(ephemer_invites.note(d),'')) END
 WHERE id=c AND user_id=a;
 b:=d->'anniversaire';
 IF 'anniversaire'=ANY(choix) AND b<>'null'::jsonb THEN
  SELECT * INTO e FROM public.evenements_personnels WHERE user_id=a AND contact_id=c AND type_evenement='anniversaire';
  IF FOUND THEN
   -- Utiliser le moteur existant : historique, révisions et préférences conservés.
   PERFORM ephemer_lot02.enregistrer(jsonb_build_object('id',e.id,'revision',e.revision,'contact_id',c,'type_evenement','anniversaire',
     'titre',e.titre,'recurrence','annuelle','jour',b->'day','mois',b->'month','annee_naissance',b->'year',
     'depuis_cycle',extract(year FROM now() AT TIME ZONE 'Europe/Paris')::int));
  ELSE
   UPDATE public.contacts SET date_naissance=NULL WHERE id=c AND user_id=a;
   PERFORM ephemer_invites.ajouter_naissance(a,c,b,d->>'prenom');
  END IF;
 ELSE
  PERFORM ephemer_invites.ajouter_naissance(a,c,b,d->>'prenom');
 END IF;
END $fn$;

CREATE FUNCTION ephemer_invites.soumettre(t text,op uuid,d jsonb) RETURNS jsonb LANGUAGE plpgsql
SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE inv public.invitations; existing ephemer_invites.operations; answer ephemer_invites.reponses;
 c public.contacts; candidates bigint[]; strong bigint[]; target bigint; identity_key text; fingerprint text; prior boolean; pending boolean;
BEGIN
 IF t IS NULL OR char_length(t)>256 OR op IS NULL THEN RAISE EXCEPTION 'Lien invalide' USING ERRCODE='22023'; END IF;
 PERFORM ephemer_invites.valider(d);
 SELECT * INTO inv FROM public.invitations WHERE token=t;
 IF NOT FOUND THEN RETURN jsonb_build_object('succes',false,'message','Ce lien est indisponible.'); END IF;
 -- Tous les liens du même carnet prennent le même verrou, avant le verrou du lien.
 PERFORM pg_advisory_xact_lock(hashtextextended('invitation-hote:'||inv.user_id::text,0));
 SELECT * INTO inv FROM public.invitations WHERE id=inv.id FOR UPDATE;
 fingerprint:=encode(extensions.digest(d::text,'sha256'),'hex');
 SELECT * INTO existing FROM ephemer_invites.operations WHERE invitation_id=inv.id AND operation=op;
 IF FOUND THEN
  IF existing.empreinte<>fingerprint THEN RAISE EXCEPTION 'Opération réutilisée' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('succes',true,'message','Tes informations ont été prises en compte.');
 END IF;
 IF NOT inv.actif OR inv.expires_at<=now() THEN RETURN jsonb_build_object('succes',false,'message','Ce lien est désactivé ou expiré.'); END IF;
 IF (SELECT count(*) FROM ephemer_invites.operations WHERE invitation_id=inv.id AND created_at>now()-interval '1 day')>=200 THEN
  RETURN jsonb_build_object('succes',false,'message','Trop de réponses aujourd’hui. Réessaie demain.'); END IF;
 -- Correspondances privées : email, téléphone ou nom complet. Le visiteur ne voit jamais ce résultat.
 SELECT coalesce(array_agg(id ORDER BY id),'{}') INTO candidates FROM public.contacts
 WHERE user_id=inv.user_id AND (
  (nullif(ephemer_invites.email(d->>'email'),'') IS NOT NULL AND ephemer_invites.email(email)=ephemer_invites.email(d->>'email'))
  OR (nullif(d->>'tel','') IS NOT NULL AND regexp_replace(coalesce(telephone_indicatif,'')||coalesce(telephone_numero,''),'[^0-9]','','g')=regexp_replace((d->>'indicatif')||(d->>'tel'),'[^0-9]','','g'))
  OR (ephemer_invites.nom(prenom)=ephemer_invites.nom(d->>'prenom') AND
   (ephemer_invites.nom(nom)=ephemer_invites.nom(d->>'nom') OR nullif(btrim(d->>'nom'),'') IS NULL OR nullif(btrim(nom),'') IS NULL)));
 SELECT coalesce(array_agg(id ORDER BY id),'{}') INTO strong FROM public.contacts
 WHERE user_id=inv.user_id AND nullif(ephemer_invites.email(d->>'email'),'') IS NOT NULL
 AND ephemer_invites.email(email)=ephemer_invites.email(d->>'email') AND nullif(btrim(nom),'') IS NOT NULL
 AND ephemer_invites.nom(nom)=ephemer_invites.nom(d->>'nom') AND ephemer_invites.nom(prenom)=ephemer_invites.nom(d->>'prenom');
 identity_key:=encode(extensions.digest(ephemer_invites.email(d->>'email')||':'||ephemer_invites.nom(d->>'prenom')||':'||ephemer_invites.nom(d->>'nom')||':'||
  CASE WHEN nullif(d->>'email','') IS NULL AND nullif(d->>'nom','') IS NULL THEN d::text ELSE '' END,'sha256'),'hex');
 SELECT * INTO answer FROM ephemer_invites.reponses WHERE hote_id=inv.user_id AND personne=identity_key FOR UPDATE;
 prior:=FOUND;
 IF NOT prior AND cardinality(strong)<>1 AND inv.nb_utilisations>=inv.max_utilisations THEN
  RETURN jsonb_build_object('succes',false,'message','Ce lien a atteint sa limite.'); END IF;
 target:=NULL; pending:=false;
 IF cardinality(strong)=1 AND cardinality(candidates)=1 THEN
  target:=strong[1]; SELECT * INTO c FROM public.contacts WHERE id=target AND user_id=inv.user_id FOR UPDATE;
  IF cardinality(ephemer_invites.conflits(c,d))=0 THEN PERFORM ephemer_invites.completer(inv.user_id,target,d);
  ELSE pending:=true; END IF;
 ELSIF cardinality(candidates)>0 THEN pending:=true;
 ELSIF prior THEN
  -- Une ancienne réponse ne justifie jamais de recréer une fiche supprimée.
  pending:=true;
 ELSE
  INSERT INTO public.contacts(user_id,invitation_id,prenom,nom,email,relation,telephone_indicatif,telephone_numero,note,est_favori)
   VALUES(inv.user_id,inv.id,btrim(d->>'prenom'),nullif(btrim(d->>'nom'),''),nullif(ephemer_invites.email(d->>'email'),''),
    d->>'relation',CASE WHEN nullif(d->>'tel','') IS NOT NULL THEN d->>'indicatif' END,nullif(d->>'tel',''),nullif(ephemer_invites.note(d),''),false)
   RETURNING id INTO target;
  PERFORM ephemer_invites.ajouter_naissance(inv.user_id,target,d->'anniversaire',d->>'prenom');
 END IF;
 INSERT INTO ephemer_invites.reponses(hote_id,invitation_id,personne,donnees,candidats,contact_id,etat)
 VALUES(inv.user_id,inv.id,identity_key,CASE WHEN pending THEN d END,candidates,target,CASE WHEN pending THEN 'en_attente' ELSE 'traitee' END)
 ON CONFLICT(hote_id,personne) DO UPDATE SET donnees=excluded.donnees,candidats=excluded.candidats,
  contact_id=coalesce(excluded.contact_id,ephemer_invites.reponses.contact_id),etat=excluded.etat,revision=ephemer_invites.reponses.revision+1
 RETURNING * INTO answer;
 IF NOT prior AND cardinality(strong)<>1 THEN UPDATE public.invitations SET nb_utilisations=nb_utilisations+1 WHERE id=inv.id; END IF;
 IF (d->>'conserver')::boolean THEN
  INSERT INTO ephemer_invites.reprises(id,email,donnees) VALUES(answer.id,ephemer_invites.email(d->>'email'),d)
  ON CONFLICT(id) DO UPDATE SET email=excluded.email,donnees=excluded.donnees,created_at=now(),expires_at=now()+interval '30 days';
 ELSE DELETE FROM ephemer_invites.reprises WHERE id=answer.id; END IF;
 INSERT INTO ephemer_invites.operations(invitation_id,operation,empreinte) VALUES(inv.id,op,fingerprint);
 IF pending AND candidates[1] IS NOT NULL THEN
  INSERT INTO public.notifications(user_id,contact_id,type,message,lue)
   SELECT inv.user_id,candidates[1],'invitation_a_verifier','Une réponse à une invitation demande ton avis. Ouvre Mes proches → Invitations.',false
   WHERE NOT EXISTS(SELECT 1 FROM public.notifications WHERE user_id=inv.user_id AND type='invitation_a_verifier' AND NOT lue);
 END IF;
 RETURN jsonb_build_object('succes',true,'message','Tes informations ont été prises en compte.');
END $fn$;

CREATE FUNCTION public.soumettre_invitation_v2(p_token text,p_operation uuid,p_donnees jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT ephemer_invites.soumettre(p_token,p_operation,p_donnees); $$;

CREATE FUNCTION ephemer_invites.reprises_lire() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); address text;
BEGIN
 SELECT ephemer_invites.email(email) INTO address FROM auth.users WHERE id=a;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'createdAt',created_at,'expiresAt',expires_at,'donnees',donnees) ORDER BY created_at DESC,id)
 FROM (SELECT * FROM ephemer_invites.reprises WHERE email=address AND expires_at>now() ORDER BY created_at DESC,id LIMIT 100) choix),'[]'::jsonb);
END $fn$;
CREATE FUNCTION public.lire_reprises_invitation() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER
SET search_path=pg_catalog AS $$ SELECT ephemer_invites.reprises_lire(); $$;

CREATE FUNCTION ephemer_invites.reponses_lire() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur();
BEGIN
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'revision',r.revision,'donnees',r.donnees,'candidats',
  coalesce((SELECT jsonb_agg(ephemer_invites.projection(c) ORDER BY c.id) FROM public.contacts c WHERE c.user_id=a AND c.id=ANY(r.candidats)),'[]'::jsonb)) ORDER BY r.created_at,r.id)
  FROM (SELECT * FROM ephemer_invites.reponses WHERE hote_id=a AND etat='en_attente' ORDER BY created_at,id LIMIT 100) r),'[]'::jsonb);
END $fn$;
CREATE FUNCTION public.lire_reponses_invitation() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER
SET search_path=pg_catalog AS $$ SELECT ephemer_invites.reponses_lire(); $$;

CREATE FUNCTION ephemer_invites.traiter(p_id uuid,p_revision bigint,p_action text,p_contact text,p_champs text[],p_empreinte text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); r ephemer_invites.reponses; target bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('invitation-hote:'||a::text,0));
 SELECT * INTO r FROM ephemer_invites.reponses WHERE id=p_id AND hote_id=a FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Réponse inaccessible' USING ERRCODE='42501'; END IF;
 IF r.revision<>p_revision OR r.etat<>'en_attente' THEN RAISE EXCEPTION 'Réponse modifiée' USING ERRCODE='40001'; END IF;
 IF p_action NOT IN ('completer','creer','ignorer') OR p_action IS NULL OR p_champs IS NULL
 OR EXISTS(SELECT 1 FROM unnest(p_champs) k WHERE k<>ALL(ARRAY['prenom','nom','email','tel','indicatif','relation','note','anniversaire'])) THEN
  RAISE EXCEPTION 'Choix invalide' USING ERRCODE='22023'; END IF;
 IF p_action='completer' THEN
  IF p_contact IS NULL OR p_contact !~ '^[1-9][0-9]{0,18}$' THEN RAISE EXCEPTION 'Fiche invalide' USING ERRCODE='22023'; END IF;
  target:=p_contact::bigint;
  PERFORM 1 FROM public.contacts WHERE user_id=a AND id=target FOR UPDATE;
  IF (SELECT ephemer_invites.projection(c)->>'empreinte' FROM public.contacts c WHERE c.user_id=a AND c.id=target) IS DISTINCT FROM p_empreinte THEN RAISE EXCEPTION 'Fiche modifiée : relire' USING ERRCODE='40001'; END IF;
  IF NOT target=ANY(r.candidats) THEN RAISE EXCEPTION 'Fiche inaccessible' USING ERRCODE='42501'; END IF;
  PERFORM ephemer_invites.completer(a,target,r.donnees,p_champs);
 ELSIF p_action='creer' THEN
  INSERT INTO public.contacts(user_id,invitation_id,prenom,nom,email,relation,telephone_indicatif,telephone_numero,note,est_favori)
   VALUES(a,r.invitation_id,r.donnees->>'prenom',nullif(r.donnees->>'nom',''),nullif(r.donnees->>'email',''),r.donnees->>'relation',
    CASE WHEN nullif(r.donnees->>'tel','') IS NOT NULL THEN r.donnees->>'indicatif' END,nullif(r.donnees->>'tel',''),nullif(ephemer_invites.note(r.donnees),''),false)
   RETURNING id INTO target;
  PERFORM ephemer_invites.ajouter_naissance(a,target,r.donnees->'anniversaire',r.donnees->>'prenom');
 END IF;
 UPDATE ephemer_invites.reponses SET etat='traitee',donnees=NULL,contact_id=coalesce(target,contact_id),revision=revision+1 WHERE id=r.id;
 IF NOT EXISTS(SELECT 1 FROM ephemer_invites.reponses WHERE hote_id=a AND etat='en_attente') THEN
  UPDATE public.notifications SET lue=true WHERE user_id=a AND type='invitation_a_verifier'; END IF;
 RETURN jsonb_build_object('ok',true);
END $fn$;
CREATE FUNCTION public.traiter_reponse_invitation(p_id uuid,p_revision bigint,p_action text,p_contact text DEFAULT NULL,p_champs text[] DEFAULT '{}',p_empreinte text DEFAULT NULL) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT ephemer_invites.traiter(p_id,p_revision,p_action,p_contact,p_champs,p_empreinte); $$;

CREATE FUNCTION ephemer_invites.profil_lire() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); p public.profiles; u jsonb:=ephemer_social.univers_lire(NULL); output jsonb; address text; birthday jsonb;
BEGIN
 SELECT * INTO p FROM public.profiles WHERE id=a;
 SELECT email INTO address FROM auth.users WHERE id=a;
 birthday:=ephemer_invites.naissance(a,NULL);
 IF birthday IS NULL AND u->'valeurs'->'anniversaire'<>'null'::jsonb THEN
  birthday:=jsonb_build_object('day',u->'valeurs'->'anniversaire'->'jour','month',u->'valeurs'->'anniversaire'->'mois','year',u->'valeurs'->'anniversaire'->'annee'); END IF;
 output:=jsonb_build_object('complete',p.onboarding_completed_at IS NOT NULL AND nullif(btrim(p.prenom),'') IS NOT NULL,
  'prenom',coalesce(p.prenom,''),'nom',coalesce(p.nom,''),'anniversaire',birthday,'email',coalesce(address,''),
  'indicatif',coalesce(p.telephone_indicatif,'+33'),'tel',coalesce(p.telephone_numero,''),
  'passions',u->'valeurs'->>'passions','presentation',u->'valeurs'->>'presentation','revisionUnivers',u->'revision');
 RETURN output||jsonb_build_object('empreinte',encode(extensions.digest(output::text,'sha256'),'hex'));
END $fn$;
CREATE FUNCTION public.lire_premier_profil() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER
SET search_path=pg_catalog AS $$ SELECT ephemer_invites.profil_lire(); $$;

CREATE FUNCTION ephemer_invites.profil_enregistrer(op uuid,d jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog AS $fn$
DECLARE a uuid:=ephemer_social.acteur(); fingerprint text; old_op text; before_state jsonb; u jsonb; vals jsonb; input jsonb;
 birthday jsonb; ids uuid[]; k text;
BEGIN
 IF op IS NULL OR d IS NULL OR jsonb_typeof(d)<>'object' OR octet_length(d::text)>16384 OR
 (SELECT array_agg(c ORDER BY c) FROM jsonb_object_keys(d) keys(c)) IS DISTINCT FROM
 ARRAY['anniversaire','conserver','email','empreinte','indicatif','interets','nom','noteLibre','passions','prenom','relation','repriseIds','revisionUnivers','tel'] THEN
 RAISE EXCEPTION 'Profil invalide' USING ERRCODE='22023'; END IF;
 input:=d-ARRAY['empreinte','passions','repriseIds','revisionUnivers'];
 PERFORM ephemer_invites.valider(input,true);
 IF jsonb_typeof(d->'passions') IS DISTINCT FROM 'string' OR char_length(d->>'passions')>1000
 OR jsonb_typeof(d->'repriseIds') IS DISTINCT FROM 'array' OR jsonb_array_length(d->'repriseIds')>100 THEN RAISE EXCEPTION 'Profil invalide' USING ERRCODE='22023'; END IF;
 SELECT array_agg(v::uuid) INTO ids FROM jsonb_array_elements_text(d->'repriseIds') v;
 fingerprint:=encode(extensions.digest(d::text,'sha256'),'hex');
 -- Ordre commun avec le moteur univers, puis verrou du profil.
 PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
 PERFORM 1 FROM public.profiles WHERE id=a FOR UPDATE;
 SELECT empreinte INTO old_op FROM ephemer_invites.operations_profil WHERE user_id=a AND operation=op;
 IF FOUND THEN
  IF old_op<>fingerprint THEN RAISE EXCEPTION 'Opération réutilisée' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('ok',true); END IF;
 before_state:=ephemer_invites.profil_lire();
 IF before_state->>'empreinte' IS DISTINCT FROM d->>'empreinte' THEN RAISE EXCEPTION 'Profil modifié' USING ERRCODE='40001'; END IF;
 IF before_state->'anniversaire'<>'null'::jsonb AND before_state->'anniversaire' IS DISTINCT FROM d->'anniversaire' THEN
  RAISE EXCEPTION 'Modifier la date déjà enregistrée dans Dates' USING ERRCODE='40001'; END IF;
 INSERT INTO public.profiles(id,prenom,nom,telephone_indicatif,telephone_numero,onboarding_completed_at)
 VALUES(a,btrim(d->>'prenom'),nullif(btrim(d->>'nom'),''),d->>'indicatif',nullif(d->>'tel',''),now())
 ON CONFLICT(id) DO UPDATE SET prenom=excluded.prenom,nom=excluded.nom,telephone_indicatif=excluded.telephone_indicatif,
  telephone_numero=excluded.telephone_numero,onboarding_completed_at=excluded.onboarding_completed_at;
 PERFORM ephemer_invites.ajouter_naissance(a,NULL,d->'anniversaire',d->>'prenom');
 u:=ephemer_social.univers_lire(NULL); vals:=u->'valeurs';
 IF (u->>'revision')::bigint<>(d->>'revisionUnivers')::bigint THEN RAISE EXCEPTION 'Univers modifié' USING ERRCODE='40001'; END IF;
 vals:=vals||jsonb_build_object('passions',d->>'passions','presentation',d->>'noteLibre');
 -- Les champs pratiques déjà saisis dans l'univers et ses permissions restent prioritaires.
 IF nullif(vals->>'email','') IS NULL THEN vals:=vals||jsonb_build_object('email',before_state->>'email'); END IF;
 IF nullif(vals->>'telephone','') IS NULL AND nullif(d->>'tel','') IS NOT NULL THEN vals:=vals||jsonb_build_object('telephone',(d->>'indicatif')||(d->>'tel')); END IF;
 birthday:=d->'anniversaire';
 IF vals->'anniversaire'='null'::jsonb AND birthday<>'null'::jsonb THEN
  vals:=vals||jsonb_build_object('anniversaire',jsonb_build_object('jour',birthday->'day','mois',birthday->'month','annee',birthday->'year')); END IF;
 PERFORM ephemer_social.univers_commander('enregistrer',jsonb_build_object('modeIdentite',u->'modeIdentite','identite',
  CASE WHEN (u->>'revision')::bigint=0 THEN d->>'prenom' ELSE u->>'identite' END,
  'valeurs',vals,'partage',u->'partage','iaCadeaux',u->'iaCadeaux'),(u->>'revision')::bigint,op);
 DELETE FROM ephemer_invites.reprises WHERE id=ANY(ids) AND email=ephemer_invites.email(before_state->>'email');
 INSERT INTO ephemer_invites.operations_profil(user_id,operation,empreinte) VALUES(a,op,fingerprint);
 RETURN jsonb_build_object('ok',true);
END $fn$;
CREATE FUNCTION public.enregistrer_premier_profil(p_operation uuid,p_donnees jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER
SET search_path=pg_catalog AS $$ SELECT ephemer_invites.profil_enregistrer(p_operation,p_donnees); $$;

CREATE FUNCTION ephemer_invites.purger() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog AS $fn$
DECLARE n int;
BEGIN DELETE FROM ephemer_invites.reprises WHERE expires_at<=now(); GET DIAGNOSTICS n=ROW_COUNT;
 DELETE FROM ephemer_invites.operations WHERE created_at<now()-interval '30 days'; RETURN n; END $fn$;
CREATE FUNCTION public.purger_reprises_invitation() RETURNS integer LANGUAGE sql SECURITY INVOKER
SET search_path=pg_catalog AS $$ SELECT ephemer_invites.purger(); $$;


-- Un lien plein reste consultable : une répétition reconnue ne consomme pas de place.
CREATE FUNCTION ephemer_invites.verifier(t text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog AS $fn$
DECLARE i public.invitations; p text;
BEGIN
 IF t IS NULL OR char_length(t)>256 THEN RETURN jsonb_build_object('valide',false,'raison','introuvable'); END IF;
 SELECT * INTO i FROM public.invitations WHERE token=t;
 IF NOT FOUND THEN RETURN jsonb_build_object('valide',false,'raison','introuvable'); END IF;
 IF NOT i.actif THEN RETURN jsonb_build_object('valide',false,'raison','desactive'); END IF;
 IF i.expires_at<=now() THEN RETURN jsonb_build_object('valide',false,'raison','expire'); END IF;
 SELECT coalesce(nullif(btrim(prenom),''),'Un proche') INTO p FROM public.profiles WHERE id=i.user_id;
 RETURN jsonb_build_object('valide',true,'raison','ok','prenom_hote',coalesce(p,'Un proche'));
END $fn$;
CREATE FUNCTION public.verifier_invitation_v2(p_token text) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER
SET search_path=pg_catalog AS $$ SELECT ephemer_invites.verifier(p_token); $$;

-- Fermer les anciennes écritures publiques qui contourneraient idempotence et rapprochement.
DO $legacy$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('soumettre_invitation','repondre_invitation') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
 END LOOP;
END $legacy$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ephemer_invites FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.verifier_invitation_v2(text),public.soumettre_invitation_v2(text,uuid,jsonb),public.lire_reprises_invitation(),
 public.lire_reponses_invitation(),public.traiter_reponse_invitation(uuid,bigint,text,text,text[],text),
 public.lire_premier_profil(),public.enregistrer_premier_profil(uuid,jsonb),public.purger_reprises_invitation()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA ephemer_invites TO anon,service_role;
GRANT EXECUTE ON FUNCTION ephemer_invites.verifier(text),public.verifier_invitation_v2(text),ephemer_invites.soumettre(text,uuid,jsonb),public.soumettre_invitation_v2(text,uuid,jsonb) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION ephemer_invites.reprises_lire(),ephemer_invites.reponses_lire(),
 ephemer_invites.traiter(uuid,bigint,text,text,text[],text),ephemer_invites.profil_lire(),ephemer_invites.profil_enregistrer(uuid,jsonb),
 public.lire_reprises_invitation(),public.lire_reponses_invitation(),public.traiter_reponse_invitation(uuid,bigint,text,text,text[],text),
 public.lire_premier_profil(),public.enregistrer_premier_profil(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION ephemer_invites.purger(),public.purger_reprises_invitation() TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
