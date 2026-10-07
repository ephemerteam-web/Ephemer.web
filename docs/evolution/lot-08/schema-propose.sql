-- 💌 Lot 08 — PROPOSITION NON APPLIQUEE — 7 octobre 2026.
-- Application HUMAINE uniquement, apres revue et recette sur copie isolee.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_setting('server_version_num')::integer < 170000
    OR to_regclass('public.preparations_evenements') IS NULL THEN
    RAISE EXCEPTION 'PostgreSQL 17 et lot 04 confirme requis';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='ephemer_lot08')
    OR to_regclass('public.cartes_individuelles') IS NOT NULL
    OR to_regclass('public.versions_cartes') IS NOT NULL
    OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN ('gerer_partage_carte_lot08','consulter_carte_lot08','lire_partage_carte_lot08','exporter_liens_cartes_lot08')) THEN
    RAISE EXCEPTION 'Objets lot 08 deja presents : inspecter, ne pas reexecuter';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.preparations_evenements'::regclass
    AND contype='u' AND convalidated AND NOT condeferrable AND pg_get_constraintdef(oid)='UNIQUE (user_id, id)') THEN
    RAISE EXCEPTION 'Cle preparation/proprietaire absente';
  END IF;
END;
$garde$;

CREATE SCHEMA ephemer_lot08;
REVOKE ALL ON SCHEMA ephemer_lot08 FROM PUBLIC,anon,authenticated,service_role;
-- Schema NON expose dans Data API. USAGE authenticated sert seulement aux helpers purs.
GRANT USAGE ON SCHEMA ephemer_lot08 TO authenticated,service_role;

CREATE FUNCTION ephemer_lot08.snapshot_valide(p jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
 SELECT CASE WHEN jsonb_typeof(p)='object' THEN
  (SELECT count(*)=6 AND bool_and(k=ANY(ARRAY['format','templateId','templateVersion','renderVersion','message','signature'])) FROM jsonb_object_keys(p) AS keys(k))
  AND p->'format'='1'::jsonb AND p->'templateVersion'='1'::jsonb AND p->'renderVersion'='1'::jsonb
  AND p->>'templateId' IN ('clair_de_lune','constellation','aurore')
  AND jsonb_typeof(p->'message')='string' AND char_length(p->>'message')<=10000
  AND jsonb_typeof(p->'signature')='string' AND char_length(p->>'signature')<=200
 ELSE false END IS TRUE;
$fn$;

CREATE FUNCTION ephemer_lot08.message_non_vide(p text) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
 -- Ensemble des espaces ECMAScript trim, identique au controle applicatif.
 SELECT char_length(btrim(p,chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)))>0 IS TRUE;
$fn$;

CREATE TABLE public.cartes_individuelles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 preparation_id uuid NOT NULL,
 modele_id text NOT NULL DEFAULT 'clair_de_lune' CHECK(modele_id IN ('clair_de_lune','constellation','aurore')),
 modele_version integer NOT NULL DEFAULT 1 CHECK(modele_version=1),
 rendu_version integer NOT NULL DEFAULT 1 CHECK(rendu_version=1),
 message text NOT NULL DEFAULT '' CHECK(char_length(message)<=10000),
 signature text NOT NULL DEFAULT '' CHECK(char_length(signature)<=200),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 9007199254740991),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT lot08_carte_preparation FOREIGN KEY(user_id,preparation_id) REFERENCES public.preparations_evenements(user_id,id) ON DELETE CASCADE,
 CONSTRAINT lot08_carte_unique UNIQUE(user_id,preparation_id),
 CONSTRAINT lot08_carte_owner_id UNIQUE(user_id,id)
);
CREATE TABLE public.versions_cartes (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 carte_id uuid NOT NULL,
 revision_publication bigint NOT NULL CHECK(revision_publication BETWEEN 2 AND 9007199254740991),
 contenu jsonb NOT NULL CHECK(ephemer_lot08.snapshot_valide(contenu) AND ephemer_lot08.message_non_vide(contenu->>'message')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT lot08_version_carte FOREIGN KEY(user_id,carte_id) REFERENCES public.cartes_individuelles(user_id,id) ON DELETE CASCADE,
 CONSTRAINT lot08_version_unique UNIQUE(user_id,carte_id,revision_publication),
 CONSTRAINT lot08_version_owner_card_id UNIQUE(user_id,carte_id,id)
);
CREATE TABLE ephemer_lot08.liens (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 carte_id uuid NOT NULL,
 version_id uuid NOT NULL,
 revision_creation bigint NOT NULL CHECK(revision_creation BETWEEN 2 AND 9007199254740991),
 empreinte text NOT NULL UNIQUE CHECK(empreinte ~ '^[0-9a-f]{64}$'),
 secret_format integer NOT NULL DEFAULT 1 CHECK(secret_format=1),
 secret_chiffre text NOT NULL CHECK(secret_chiffre ~ '^[0-9a-f]{64}$'),
 nonce text NOT NULL UNIQUE CHECK(nonce ~ '^[0-9a-f]{24}$'),
 tag text NOT NULL CHECK(tag ~ '^[0-9a-f]{32}$'),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT lot08_lien_dates CHECK(expires_at>created_at AND (revoked_at IS NULL OR revoked_at>=created_at)),
 CONSTRAINT lot08_lien_version FOREIGN KEY(user_id,carte_id,version_id) REFERENCES public.versions_cartes(user_id,carte_id,id) ON DELETE CASCADE,
 CONSTRAINT lot08_lien_owner_card_id UNIQUE(user_id,carte_id,id),
 CONSTRAINT lot08_lien_revision_unique UNIQUE(user_id,carte_id,revision_creation)
);
CREATE UNIQUE INDEX lot08_un_lien_actif ON ephemer_lot08.liens(user_id,carte_id) WHERE revoked_at IS NULL;
CREATE TABLE ephemer_lot08.operations (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 carte_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('publier','remplacer','revoquer')),
 revision_attendue bigint NOT NULL CHECK(revision_attendue BETWEEN 1 AND 9007199254740990),
 duree_jours integer,
 revision_resultat bigint NOT NULL CHECK(revision_resultat=revision_attendue+1),
 version_id uuid,
 lien_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT lot08_operation_carte FOREIGN KEY(user_id,carte_id) REFERENCES public.cartes_individuelles(user_id,id) ON DELETE CASCADE,
 CONSTRAINT lot08_operation_version FOREIGN KEY(user_id,carte_id,version_id) REFERENCES public.versions_cartes(user_id,carte_id,id) ON DELETE CASCADE,
 CONSTRAINT lot08_operation_lien FOREIGN KEY(user_id,carte_id,lien_id) REFERENCES ephemer_lot08.liens(user_id,carte_id,id) ON DELETE CASCADE,
 CONSTRAINT lot08_operation_parametres CHECK((action='revoquer' AND duree_jours IS NULL AND lien_id IS NULL)
   OR (action IN ('publier','remplacer') AND duree_jours IS NOT NULL AND duree_jours IN (7,30,90,365) AND lien_id IS NOT NULL AND version_id IS NOT NULL))
);
CREATE INDEX lot08_operations_carte ON ephemer_lot08.operations(user_id,carte_id,id);

CREATE FUNCTION ephemer_lot08.verifier_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.revision<>1 THEN RAISE EXCEPTION 'Revision initiale invalide' USING ERRCODE='23514'; END IF;
  NEW.created_at:=clock_timestamp();
 ELSE
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.preparation_id IS DISTINCT FROM OLD.preparation_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'Identite et preparation immuables' USING ERRCODE='23514';
  END IF;
  IF NEW.revision IS DISTINCT FROM OLD.revision+1 THEN
   RAISE EXCEPTION 'Revision attendue requise : relire' USING ERRCODE='40001';
  END IF;
 END IF;
 NEW.updated_at:=clock_timestamp();
 RETURN NEW;
END;
$fn$;
CREATE TRIGGER lot08_carte_revision BEFORE INSERT OR UPDATE ON public.cartes_individuelles
 FOR EACH ROW EXECUTE FUNCTION ephemer_lot08.verifier_revision();
CREATE FUNCTION ephemer_lot08.version_immuable() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN RAISE EXCEPTION 'Version publiee immuable' USING ERRCODE='23514'; END;
$fn$;
CREATE TRIGGER lot08_version_immuable BEFORE UPDATE ON public.versions_cartes
 FOR EACH ROW EXECUTE FUNCTION ephemer_lot08.version_immuable();

ALTER TABLE public.cartes_individuelles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versions_cartes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ephemer_lot08.liens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ephemer_lot08.operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cartes_individuelles,public.versions_cartes,ephemer_lot08.liens,ephemer_lot08.operations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.cartes_individuelles TO authenticated;
GRANT INSERT(id,user_id,preparation_id,modele_id,modele_version,rendu_version,message,signature) ON public.cartes_individuelles TO authenticated;
GRANT UPDATE(modele_id,modele_version,rendu_version,message,signature,revision) ON public.cartes_individuelles TO authenticated;
GRANT SELECT ON public.versions_cartes TO authenticated;
CREATE POLICY lot08_carte_select ON public.cartes_individuelles FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
CREATE POLICY lot08_carte_insert ON public.cartes_individuelles FOR INSERT TO authenticated WITH CHECK((SELECT auth.uid())=user_id);
CREATE POLICY lot08_carte_update ON public.cartes_individuelles FOR UPDATE TO authenticated USING((SELECT auth.uid())=user_id) WITH CHECK((SELECT auth.uid())=user_id);
CREATE POLICY lot08_carte_delete ON public.cartes_individuelles FOR DELETE TO authenticated USING((SELECT auth.uid())=user_id);
CREATE POLICY lot08_version_select ON public.versions_cartes FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
-- La service role reste exclusivement serveur ; chaque route verifie JWT + proprietaire.
GRANT SELECT,DELETE ON public.cartes_individuelles TO service_role;
GRANT UPDATE(revision) ON public.cartes_individuelles TO service_role;
GRANT SELECT,INSERT ON public.versions_cartes,ephemer_lot08.liens,ephemer_lot08.operations TO service_role;
GRANT UPDATE(revoked_at) ON ephemer_lot08.liens TO service_role;

-- Un seul verrou serialise edition/publication/revocation/remplacement pour cette carte.
-- Un retry d'UUID deja traite retourne le resultat initial ; le serveur relit ensuite le droit courant.
CREATE FUNCTION public.gerer_partage_carte_lot08(
 p_user_id uuid,p_carte uuid,p_revision bigint,p_operation uuid,p_action text,
 p_duree integer DEFAULT NULL,p_lien uuid DEFAULT NULL,p_empreinte text DEFAULT NULL,
 p_secret_chiffre text DEFAULT NULL,p_nonce text DEFAULT NULL,p_tag text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE c public.cartes_individuelles%ROWTYPE; o ephemer_lot08.operations%ROWTYPE;
 v_version uuid; v_lien uuid; v_revision bigint; v_now timestamptz; v_contenu jsonb;
BEGIN
 IF p_user_id IS NULL OR p_carte IS NULL OR p_operation IS NULL OR p_revision IS NULL
   OR p_revision NOT BETWEEN 1 AND 9007199254740990 OR p_action IS NULL OR p_action NOT IN ('publier','remplacer','revoquer')
   OR (p_action='revoquer' AND p_duree IS NOT NULL)
   OR (p_action<>'revoquer' AND (p_duree IS NULL OR p_duree NOT IN (7,30,90,365))) THEN
  RAISE EXCEPTION 'Parametres invalides' USING ERRCODE='22023';
 END IF;
 SELECT * INTO c FROM public.cartes_individuelles WHERE id=p_carte AND user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Carte inaccessible' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM ephemer_lot08.operations WHERE id=p_operation;
 IF FOUND THEN
  IF o.user_id IS DISTINCT FROM p_user_id OR o.carte_id IS DISTINCT FROM p_carte
    OR o.action IS DISTINCT FROM p_action OR o.revision_attendue IS DISTINCT FROM p_revision OR o.duree_jours IS DISTINCT FROM p_duree THEN
   RAISE EXCEPTION 'Operation incompatible' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('revision',o.revision_resultat,'versionId',o.version_id,'linkId',o.lien_id);
 END IF;
 IF c.revision<>p_revision THEN RAISE EXCEPTION 'Conflit : relire la carte' USING ERRCODE='40001'; END IF;
 SELECT id INTO v_version FROM public.versions_cartes WHERE user_id=p_user_id AND carte_id=p_carte ORDER BY revision_publication DESC LIMIT 1;
 IF p_action='publier' THEN
  IF NOT ephemer_lot08.message_non_vide(c.message) THEN
   RAISE EXCEPTION 'Message requis avant publication' USING ERRCODE='23514';
  END IF;
 ELSIF p_action='remplacer' AND v_version IS NULL THEN
  RAISE EXCEPTION 'Aucune version publiee' USING ERRCODE='23514';
 END IF;
 IF p_action<>'revoquer' THEN
  IF p_lien IS NULL OR p_empreinte IS NULL OR p_empreinte !~ '^[0-9a-f]{64}$'
   OR p_secret_chiffre IS NULL OR p_secret_chiffre !~ '^[0-9a-f]{64}$'
   OR p_nonce IS NULL OR p_nonce !~ '^[0-9a-f]{24}$' OR p_tag IS NULL OR p_tag !~ '^[0-9a-f]{32}$' THEN
   RAISE EXCEPTION 'Materiel de lien invalide' USING ERRCODE='22023';
  END IF;
  v_lien:=p_lien;
 ELSIF p_lien IS NOT NULL OR p_empreinte IS NOT NULL OR p_secret_chiffre IS NOT NULL OR p_nonce IS NOT NULL OR p_tag IS NOT NULL THEN
  RAISE EXCEPTION 'Revocation sans secret' USING ERRCODE='22023';
 END IF;
 v_now:=clock_timestamp(); v_revision:=c.revision+1;
 IF p_action='publier' THEN
  v_version:=gen_random_uuid();
  v_contenu:=jsonb_build_object('format',1,'templateId',c.modele_id,'templateVersion',c.modele_version,'renderVersion',c.rendu_version,'message',c.message,'signature',c.signature);
  INSERT INTO public.versions_cartes(id,user_id,carte_id,revision_publication,contenu,created_at)
   VALUES(v_version,p_user_id,p_carte,v_revision,v_contenu,v_now);
 END IF;
 -- Inclut les droits expires pour liberer l'unicite avant une nouvelle publication.
 UPDATE ephemer_lot08.liens SET revoked_at=v_now WHERE user_id=p_user_id AND carte_id=p_carte AND revoked_at IS NULL;
 IF p_action<>'revoquer' THEN
  INSERT INTO ephemer_lot08.liens(id,user_id,carte_id,version_id,revision_creation,empreinte,secret_chiffre,nonce,tag,expires_at,created_at)
   VALUES(v_lien,p_user_id,p_carte,v_version,v_revision,p_empreinte,p_secret_chiffre,p_nonce,p_tag,v_now+make_interval(hours=>p_duree*24),v_now);
 END IF;
 UPDATE public.cartes_individuelles SET revision=v_revision WHERE id=p_carte AND user_id=p_user_id;
 INSERT INTO ephemer_lot08.operations(id,user_id,carte_id,action,revision_attendue,duree_jours,revision_resultat,version_id,lien_id,created_at)
  VALUES(p_operation,p_user_id,p_carte,p_action,p_revision,p_duree,v_revision,v_version,v_lien,v_now);
 RETURN jsonb_build_object('revision',v_revision,'versionId',v_version,'linkId',v_lien);
END;
$fn$;

-- Exception fonctionnelle : lecture par possession d'un secret, via le serveur seulement.
-- Pas de jointure profil/contact/preparation. Pas d'ID ni de brouillon dans la reponse.
CREATE FUNCTION public.consulter_carte_lot08(p_empreinte text) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
 SELECT jsonb_build_object('content',v.contenu,'expiresAt',l.expires_at)
 FROM ephemer_lot08.liens l JOIN public.versions_cartes v
  ON (v.user_id,v.carte_id,v.id)=(l.user_id,l.carte_id,l.version_id)
 WHERE l.empreinte=p_empreinte AND l.revoked_at IS NULL AND l.expires_at>clock_timestamp();
$fn$;
-- Donnees internes pour une route de createur authentifiee. Le chiffrement ne sort pas au navigateur.
CREATE FUNCTION public.lire_partage_carte_lot08(p_user_id uuid,p_carte uuid,p_avec_secret boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE l ephemer_lot08.liens%ROWTYPE; v_version uuid; v_result jsonb; v_etat text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.cartes_individuelles WHERE user_id=p_user_id AND id=p_carte) THEN
  RAISE EXCEPTION 'Carte inaccessible' USING ERRCODE='42501';
 END IF;
 SELECT id INTO v_version FROM public.versions_cartes WHERE user_id=p_user_id AND carte_id=p_carte ORDER BY revision_publication DESC LIMIT 1;
 SELECT * INTO l FROM ephemer_lot08.liens WHERE user_id=p_user_id AND carte_id=p_carte ORDER BY revision_creation DESC LIMIT 1;
 v_etat:=CASE WHEN l.id IS NULL THEN 'absent' WHEN l.revoked_at IS NOT NULL THEN 'revoque' WHEN l.expires_at<=clock_timestamp() THEN 'expire' ELSE 'actif' END;
 v_result:=jsonb_build_object('versionId',v_version,'linkId',l.id,'state',v_etat,'expiresAt',l.expires_at);
 IF p_avec_secret AND v_etat='actif' THEN
  v_result:=v_result||jsonb_build_object('secretHash',l.empreinte,'encryptedSecret',jsonb_build_object('format',l.secret_format,'ciphertext',l.secret_chiffre,'nonce',l.nonce,'tag',l.tag));
 END IF;
 RETURN v_result;
END;
$fn$;
-- Export pagine : aucune empreinte, aucun secret chiffre, nonce, tag ou UUID d'operation.
CREATE FUNCTION public.exporter_liens_cartes_lot08(p_user_id uuid,p_apres uuid DEFAULT NULL,p_limite integer DEFAULT 200)
RETURNS TABLE(id uuid,carte_id uuid,version_id uuid,expires_at timestamptz,revoked_at timestamptz,created_at timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
 IF p_user_id IS NULL OR p_limite IS NULL OR p_limite NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Pagination invalide' USING ERRCODE='22023'; END IF;
 RETURN QUERY SELECT l.id,l.carte_id,l.version_id,l.expires_at,l.revoked_at,l.created_at FROM ephemer_lot08.liens l
  WHERE l.user_id=p_user_id AND (p_apres IS NULL OR l.id>p_apres) ORDER BY l.id LIMIT p_limite;
END;
$fn$;

-- Postgres et Supabase peuvent accorder EXECUTE par defaut : suppression explicite, sans DEFINER.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ephemer_lot08 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION ephemer_lot08.snapshot_valide(jsonb),ephemer_lot08.message_non_vide(text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.gerer_partage_carte_lot08(uuid,uuid,bigint,uuid,text,integer,uuid,text,text,text,text),
 public.consulter_carte_lot08(text),public.lire_partage_carte_lot08(uuid,uuid,boolean),public.exporter_liens_cartes_lot08(uuid,uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.gerer_partage_carte_lot08(uuid,uuid,bigint,uuid,text,integer,uuid,text,text,text,text),
 public.consulter_carte_lot08(text),public.lire_partage_carte_lot08(uuid,uuid,boolean),public.exporter_liens_cartes_lot08(uuid,uuid,integer) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
