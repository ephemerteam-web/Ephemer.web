-- 🌙 Lot 09 — PROPOSITION NON APPLIQUEE — 8 octobre 2026.
-- Application HUMAINE sur copie autorisee uniquement, apres controle complet du lot 08.
-- Ne pas reexecuter le schema 08. Aucun profil ou publication existante n'est reecrit.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
 IF current_setting('server_version_num')::integer<170000
  OR to_regclass('public.cartes_individuelles') IS NULL OR to_regclass('public.versions_cartes') IS NULL
  OR to_regclass('ephemer_lot08.liens') IS NULL OR to_regclass('ephemer_lot08.operations') IS NULL THEN
  RAISE EXCEPTION 'PostgreSQL 17 et lot 08 confirme requis';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='ephemer_lot09')
  OR to_regclass('public.avatars_utilisateurs') IS NOT NULL
  OR EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.cartes_individuelles'::regclass AND attname='avatar_signature' AND NOT attisdropped)
  OR EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='publier_carte_lot09') THEN
  RAISE EXCEPTION 'Objets lot 09 deja presents : inspecter, ne pas reexecuter';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.cartes_individuelles'::regclass AND conname='cartes_individuelles_rendu_version_check' AND convalidated AND pg_get_constraintdef(oid)='CHECK ((rendu_version = 1))')
  OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.versions_cartes'::regclass AND conname='versions_cartes_contenu_check' AND convalidated)
  OR to_regprocedure('public.gerer_partage_carte_lot08(uuid,uuid,bigint,uuid,text,integer,uuid,text,text,text,text)') IS NULL THEN
  RAISE EXCEPTION 'Contraintes/RPC du lot 08 divergentes : reprendre son controle';
 END IF;
END;
$garde$;
LOCK TABLE public.cartes_individuelles,public.versions_cartes IN ACCESS EXCLUSIVE MODE;

CREATE SCHEMA ephemer_lot09;
REVOKE ALL ON SCHEMA ephemer_lot09 FROM PUBLIC,anon,authenticated,service_role;
-- NON expose dans Data API ; USAGE utilisateur uniquement pour les validateurs de CHECK.
GRANT USAGE ON SCHEMA ephemer_lot09 TO authenticated,service_role;

CREATE FUNCTION ephemer_lot09.avatar_valide(p jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
 SELECT CASE WHEN jsonb_typeof(p)='object' THEN
  (SELECT count(*)=10 AND bool_and(k=ANY(ARRAY['format','catalogVersion','renderVersion','faceId','skinId','hairId','hairColorId','clothingId','clothingColorId','accessoryId'])) FROM jsonb_object_keys(p) AS keys(k))
  AND p->'format'='1'::jsonb AND p->'catalogVersion'='1'::jsonb AND p->'renderVersion'='1'::jsonb
  AND p->'faceId' IN ('"ovale"'::jsonb,'"rond"'::jsonb,'"anguleux"'::jsonb)
  AND p->'skinId' IN ('"porcelaine"'::jsonb,'"peche"'::jsonb,'"sable"'::jsonb,'"miel"'::jsonb,'"ambre"'::jsonb,'"cuivre"'::jsonb,'"brun"'::jsonb,'"ebene"'::jsonb)
  AND p->'hairId' IN ('"sans"'::jsonb,'"rase"'::jsonb,'"court"'::jsonb,'"carre"'::jsonb,'"long"'::jsonb,'"boucles"'::jsonb)
  AND p->'hairColorId' IN ('"nuit"'::jsonb,'"chataigne"'::jsonb,'"cuivre"'::jsonb,'"soleil"'::jsonb,'"argent"'::jsonb,'"prune"'::jsonb)
  AND p->'clothingId' IN ('"pull"'::jsonb,'"tunique"'::jsonb,'"veste"'::jsonb)
  AND p->'clothingColorId' IN ('"indigo"'::jsonb,'"sauge"'::jsonb,'"rose"'::jsonb,'"ocre"'::jsonb,'"brume"'::jsonb,'"prune"'::jsonb)
  AND p->'accessoryId' IN ('"aucun"'::jsonb,'"lune"'::jsonb,'"etoile"'::jsonb,'"halo"'::jsonb)
 ELSE false END IS TRUE;
$fn$;
CREATE FUNCTION ephemer_lot09.snapshot_valide(p jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
 SELECT CASE WHEN jsonb_typeof(p)='object' THEN
  (SELECT count(*)=7 AND bool_and(k=ANY(ARRAY['format','templateId','templateVersion','renderVersion','message','signature','avatar'])) FROM jsonb_object_keys(p) AS keys(k))
  AND p->'format'='2'::jsonb AND p->'renderVersion'='2'::jsonb
  AND ephemer_lot08.snapshot_valide(jsonb_build_object('format',1,'templateId',p->'templateId','templateVersion',p->'templateVersion','renderVersion',1,'message',p->'message','signature',p->'signature'))
  AND (p->'avatar'='null'::jsonb OR ephemer_lot09.avatar_valide(p->'avatar'))
 ELSE false END IS TRUE;
$fn$;

CREATE TABLE public.avatars_utilisateurs (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 configuration jsonb NOT NULL CHECK(ephemer_lot09.avatar_valide(configuration)),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 9007199254740991),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION ephemer_lot09.verifier_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.revision<>1 THEN RAISE EXCEPTION 'Revision initiale invalide' USING ERRCODE='23514'; END IF;
  NEW.created_at:=clock_timestamp();
 ELSE
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'Identite immuable' USING ERRCODE='23514';
  END IF;
  IF NEW.revision IS DISTINCT FROM OLD.revision+1 THEN RAISE EXCEPTION 'Revision attendue requise : relire' USING ERRCODE='40001'; END IF;
 END IF;
 NEW.updated_at:=clock_timestamp();
 RETURN NEW;
END;
$fn$;
CREATE TRIGGER lot09_avatar_revision BEFORE INSERT OR UPDATE ON public.avatars_utilisateurs
 FOR EACH ROW EXECUTE FUNCTION ephemer_lot09.verifier_revision();
ALTER TABLE public.avatars_utilisateurs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.avatars_utilisateurs FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.avatars_utilisateurs TO authenticated;
GRANT INSERT(user_id,configuration),UPDATE(configuration,revision) ON public.avatars_utilisateurs TO authenticated;
CREATE POLICY lot09_avatar_select ON public.avatars_utilisateurs FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
CREATE POLICY lot09_avatar_insert ON public.avatars_utilisateurs FOR INSERT TO authenticated WITH CHECK((SELECT auth.uid())=user_id);
CREATE POLICY lot09_avatar_update ON public.avatars_utilisateurs FOR UPDATE TO authenticated USING((SELECT auth.uid())=user_id) WITH CHECK((SELECT auth.uid())=user_id);
CREATE POLICY lot09_avatar_delete ON public.avatars_utilisateurs FOR DELETE TO authenticated USING((SELECT auth.uid())=user_id);

ALTER TABLE public.cartes_individuelles ADD COLUMN avatar_signature jsonb;
ALTER TABLE public.cartes_individuelles DROP CONSTRAINT cartes_individuelles_rendu_version_check;
ALTER TABLE public.cartes_individuelles ADD CONSTRAINT cartes_individuelles_rendu_version_check CHECK(rendu_version IN (1,2));
ALTER TABLE public.cartes_individuelles ADD CONSTRAINT lot09_avatar_signature_check CHECK(
 (rendu_version=1 AND avatar_signature IS NULL)
 OR (rendu_version=2 AND (avatar_signature IS NULL OR ephemer_lot09.avatar_valide(avatar_signature)))
);
-- Le defaut SQL reste 1 pour les anciens clients ; le nouveau client choisira explicitement 2.
GRANT INSERT(avatar_signature),UPDATE(avatar_signature) ON public.cartes_individuelles TO authenticated;
ALTER TABLE public.versions_cartes DROP CONSTRAINT versions_cartes_contenu_check;
ALTER TABLE public.versions_cartes ADD CONSTRAINT versions_cartes_contenu_check CHECK(
 (ephemer_lot08.snapshot_valide(contenu) OR ephemer_lot09.snapshot_valide(contenu))
 AND ephemer_lot08.message_non_vide(contenu->>'message')
);

-- Publication seulement. Rotation/revocation et consultation restent les RPC 08 inchangees.
-- Memes verrous, revisions et registre d'operations que 08 : retry avant lecture du brouillon.
CREATE FUNCTION public.publier_carte_lot09(
 p_user_id uuid,p_carte uuid,p_revision bigint,p_operation uuid,p_duree integer,
 p_lien uuid,p_empreinte text,p_secret_chiffre text,p_nonce text,p_tag text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE c public.cartes_individuelles%ROWTYPE; o ephemer_lot08.operations%ROWTYPE;
 v_version uuid; v_revision bigint; v_now timestamptz; v_contenu jsonb;
BEGIN
 IF p_user_id IS NULL OR p_carte IS NULL OR p_operation IS NULL OR p_revision IS NULL
  OR p_revision NOT BETWEEN 1 AND 9007199254740990 OR p_duree IS NULL OR p_duree NOT IN (7,30,90,365) THEN
  RAISE EXCEPTION 'Parametres invalides' USING ERRCODE='22023';
 END IF;
 SELECT * INTO c FROM public.cartes_individuelles WHERE id=p_carte AND user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Carte inaccessible' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM ephemer_lot08.operations WHERE id=p_operation;
 IF FOUND THEN
  IF o.user_id IS DISTINCT FROM p_user_id OR o.carte_id IS DISTINCT FROM p_carte OR o.action IS DISTINCT FROM 'publier'
   OR o.revision_attendue IS DISTINCT FROM p_revision OR o.duree_jours IS DISTINCT FROM p_duree THEN
   RAISE EXCEPTION 'Operation incompatible' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('revision',o.revision_resultat,'versionId',o.version_id,'linkId',o.lien_id);
 END IF;
 IF c.revision<>p_revision THEN RAISE EXCEPTION 'Conflit : relire la carte' USING ERRCODE='40001'; END IF;
 IF c.rendu_version=1 THEN
  RETURN public.gerer_partage_carte_lot08(p_user_id,p_carte,p_revision,p_operation,'publier',p_duree,p_lien,p_empreinte,p_secret_chiffre,p_nonce,p_tag);
 END IF;
 IF NOT ephemer_lot08.message_non_vide(c.message) THEN RAISE EXCEPTION 'Message requis avant publication' USING ERRCODE='23514'; END IF;
 IF p_lien IS NULL OR p_empreinte IS NULL OR p_empreinte !~ '^[0-9a-f]{64}$'
  OR p_secret_chiffre IS NULL OR p_secret_chiffre !~ '^[0-9a-f]{64}$'
  OR p_nonce IS NULL OR p_nonce !~ '^[0-9a-f]{24}$' OR p_tag IS NULL OR p_tag !~ '^[0-9a-f]{32}$' THEN
  RAISE EXCEPTION 'Materiel de lien invalide' USING ERRCODE='22023';
 END IF;
 v_now:=clock_timestamp(); v_revision:=c.revision+1; v_version:=gen_random_uuid();
 v_contenu:=jsonb_build_object('format',2,'templateId',c.modele_id,'templateVersion',c.modele_version,'renderVersion',2,'message',c.message,'signature',c.signature,'avatar',c.avatar_signature);
 INSERT INTO public.versions_cartes(id,user_id,carte_id,revision_publication,contenu,created_at)
  VALUES(v_version,p_user_id,p_carte,v_revision,v_contenu,v_now);
 UPDATE ephemer_lot08.liens SET revoked_at=v_now WHERE user_id=p_user_id AND carte_id=p_carte AND revoked_at IS NULL;
 INSERT INTO ephemer_lot08.liens(id,user_id,carte_id,version_id,revision_creation,empreinte,secret_chiffre,nonce,tag,expires_at,created_at)
  VALUES(p_lien,p_user_id,p_carte,v_version,v_revision,p_empreinte,p_secret_chiffre,p_nonce,p_tag,v_now+make_interval(hours=>p_duree*24),v_now);
 UPDATE public.cartes_individuelles SET revision=v_revision WHERE id=p_carte AND user_id=p_user_id;
 INSERT INTO ephemer_lot08.operations(id,user_id,carte_id,action,revision_attendue,duree_jours,revision_resultat,version_id,lien_id,created_at)
  VALUES(p_operation,p_user_id,p_carte,'publier',p_revision,p_duree,v_revision,v_version,p_lien,v_now);
 RETURN jsonb_build_object('revision',v_revision,'versionId',v_version,'linkId',p_lien);
END;
$fn$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ephemer_lot09 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION ephemer_lot09.avatar_valide(jsonb),ephemer_lot09.snapshot_valide(jsonb) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.publier_carte_lot09(uuid,uuid,bigint,uuid,integer,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.publier_carte_lot09(uuid,uuid,bigint,uuid,integer,uuid,text,text,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
