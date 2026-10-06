-- Lot 04 — PROPOSITION NON APPLIQUEE — 6 octobre 2026.
-- Application humaine uniquement, apres revue de README.md et essai isole.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

DO $garde$
BEGIN
  IF current_setting('server_version_num')::integer < 170000
    OR to_regclass('public.occurrences_evenements') IS NULL
    OR to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'PostgreSQL 17 et lot 02 confirme requis.';
  END IF;
  IF to_regclass('public.preparations_evenements') IS NOT NULL
    OR to_regclass('public.taches_preparation') IS NOT NULL
    OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='ephemer_lot04')
    OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN
      ('ouvrir_preparation_lot04','enregistrer_preparation_lot04','ajouter_tache_lot04','enregistrer_tache_lot04')) THEN
    RAISE EXCEPTION 'Objets lot 04 deja presents : inspecter, ne pas reexecuter.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid='public.occurrences_evenements'::regclass
      AND contype='u' AND NOT condeferrable AND convalidated
      AND pg_get_constraintdef(oid)='UNIQUE (user_id, id)') THEN
    RAISE EXCEPTION 'Cle occurrence/proprietaire attendue absente.';
  END IF;
END;
$garde$;

CREATE SCHEMA ephemer_lot04;
REVOKE ALL ON SCHEMA ephemer_lot04 FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA ephemer_lot04 TO authenticated;

CREATE TABLE public.preparations_evenements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  occurrence_id uuid NOT NULL,
  etat text NOT NULL DEFAULT 'ouverte' CHECK (etat IN ('ouverte','terminee','abandonnee')),
  sans_achat boolean NOT NULL DEFAULT false,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lot04_preparation_occurrence FOREIGN KEY(user_id,occurrence_id)
    REFERENCES public.occurrences_evenements(user_id,id) ON DELETE CASCADE,
  CONSTRAINT lot04_preparation_unique UNIQUE(user_id,occurrence_id),
  CONSTRAINT lot04_preparation_owner_id UNIQUE(user_id,id)
);
CREATE TABLE public.taches_preparation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  preparation_id uuid NOT NULL,
  type_tache text NOT NULL CHECK (type_tache IN ('cadeau','message','appel','sortie','libre')),
  titre text NOT NULL CHECK (titre=btrim(titre) AND char_length(titre) BETWEEN 1 AND 200),
  brouillon_texte text CHECK (char_length(brouillon_texte)<=10000),
  etat text NOT NULL DEFAULT 'a_faire' CHECK (etat IN ('a_faire','faite','abandonnee')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lot04_tache_preparation FOREIGN KEY(user_id,preparation_id)
    REFERENCES public.preparations_evenements(user_id,id) ON DELETE CASCADE,
  CONSTRAINT lot04_message_texte CHECK (type_tache='message' OR brouillon_texte IS NULL),
  CONSTRAINT lot04_message_pret CHECK (type_tache<>'message' OR etat<>'faite'
    OR (brouillon_texte IS NOT NULL AND char_length(btrim(brouillon_texte))>0)),
  CONSTRAINT lot04_tache_owner_id UNIQUE(user_id,id)
);
CREATE UNIQUE INDEX lot04_action_unique ON public.taches_preparation(user_id,preparation_id,type_tache)
  WHERE type_tache<>'libre';
CREATE INDEX lot04_taches_cursor ON public.taches_preparation(user_id,preparation_id,id);

-- Le client soumet revision attendue + 1. Un UPDATE aveugle sans revision est refuse.
-- Les identites/parents sont immuables ; les dates techniques sont gerees ici.
CREATE FUNCTION ephemer_lot04.verifier_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.revision<>1 THEN RAISE EXCEPTION 'Revision initiale invalide' USING ERRCODE='23514'; END IF;
    NEW.created_at:=now();
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Identite immuable' USING ERRCODE='23514';
    END IF;
    IF TG_TABLE_NAME='preparations_evenements' THEN
      IF NEW.occurrence_id IS DISTINCT FROM OLD.occurrence_id THEN
        RAISE EXCEPTION 'Occurrence immuable' USING ERRCODE='23514';
      END IF;
    ELSE
      IF NEW.preparation_id IS DISTINCT FROM OLD.preparation_id
        OR NEW.type_tache IS DISTINCT FROM OLD.type_tache THEN
        RAISE EXCEPTION 'Parent et type immuables' USING ERRCODE='23514';
      END IF;
    END IF;
    IF NEW.revision IS DISTINCT FROM OLD.revision+1 THEN
      RAISE EXCEPTION 'Revision attendue requise : relire' USING ERRCODE='40001';
    END IF;
  END IF;
  NEW.updated_at:=clock_timestamp();
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER lot04_preparation_revision BEFORE INSERT OR UPDATE ON public.preparations_evenements
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot04.verifier_revision();
CREATE TRIGGER lot04_tache_revision BEFORE INSERT OR UPDATE ON public.taches_preparation
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot04.verifier_revision();

ALTER TABLE public.preparations_evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taches_preparation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.preparations_evenements,public.taches_preparation FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.preparations_evenements,public.taches_preparation TO authenticated;
GRANT INSERT(id,user_id,occurrence_id,etat,sans_achat) ON public.preparations_evenements TO authenticated;
GRANT UPDATE(etat,sans_achat,revision) ON public.preparations_evenements TO authenticated;
GRANT INSERT(id,user_id,preparation_id,type_tache,titre,brouillon_texte,etat) ON public.taches_preparation TO authenticated;
GRANT UPDATE(titre,brouillon_texte,etat,revision) ON public.taches_preparation TO authenticated;
-- Le serveur peut exporter/lire. L'effacement Auth/occurrence utilise les FK,
-- sans ouvrir les ecritures de preparatifs au client admin.
GRANT SELECT ON public.preparations_evenements,public.taches_preparation TO service_role;

CREATE POLICY lot04_preparation_select ON public.preparations_evenements FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot04_preparation_insert ON public.preparations_evenements FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid())=user_id AND EXISTS
    (SELECT 1 FROM public.occurrences_evenements o WHERE o.user_id=preparations_evenements.user_id AND o.id=occurrence_id));
CREATE POLICY lot04_preparation_update ON public.preparations_evenements FOR UPDATE TO authenticated
  USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot04_preparation_delete ON public.preparations_evenements FOR DELETE TO authenticated
  USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot04_tache_select ON public.taches_preparation FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot04_tache_insert ON public.taches_preparation FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid())=user_id AND EXISTS
    (SELECT 1 FROM public.preparations_evenements p WHERE p.user_id=taches_preparation.user_id AND p.id=preparation_id));
CREATE POLICY lot04_tache_update ON public.taches_preparation FOR UPDATE TO authenticated
  USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot04_tache_delete ON public.taches_preparation FOR DELETE TO authenticated
  USING ((SELECT auth.uid())=user_id);

CREATE FUNCTION public.ouvrir_preparation_lot04(p_occurrence uuid)
RETURNS public.preparations_evenements LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE v_result public.preparations_evenements; v_user uuid:=auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Session requise' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.occurrences_evenements WHERE id=p_occurrence AND user_id=v_user) THEN
    RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.preparations_evenements(user_id,occurrence_id)
    VALUES(v_user,p_occurrence) ON CONFLICT(user_id,occurrence_id) DO NOTHING RETURNING * INTO v_result;
  IF NOT FOUND THEN
    SELECT * INTO v_result FROM public.preparations_evenements WHERE user_id=v_user AND occurrence_id=p_occurrence;
  END IF;
  -- En READ COMMITTED, la seconde instruction voit le commit concurrent.
  -- En isolation superieure, 40001 demande de rejouer toute la transaction.
  IF v_result.id IS NULL THEN RAISE EXCEPTION 'Creation concurrente : reessayer' USING ERRCODE='40001'; END IF;
  RETURN v_result;
END;
$fn$;
CREATE FUNCTION public.enregistrer_preparation_lot04(p_id uuid,p_revision bigint,p_etat text,p_sans_achat boolean)
RETURNS public.preparations_evenements LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE v_result public.preparations_evenements; v_user uuid:=auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Session requise' USING ERRCODE='42501'; END IF;
  UPDATE public.preparations_evenements SET etat=p_etat,sans_achat=p_sans_achat,revision=p_revision+1
    WHERE id=p_id AND user_id=v_user AND revision=p_revision RETURNING * INTO v_result;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.preparations_evenements WHERE id=p_id AND user_id=v_user) THEN
      RAISE EXCEPTION 'Preparation modifiee : relire' USING ERRCODE='40001';
    END IF;
    RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE='42501';
  END IF;
  RETURN v_result;
END;
$fn$;
CREATE FUNCTION public.ajouter_tache_lot04(p_id uuid,p_preparation uuid,p_type text,p_titre text)
RETURNS public.taches_preparation LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE v_result public.taches_preparation; v_user uuid:=auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Session requise' USING ERRCODE='42501'; END IF;
  IF p_id IS NULL OR NOT EXISTS
    (SELECT 1 FROM public.preparations_evenements WHERE id=p_preparation AND user_id=v_user) THEN
    RAISE EXCEPTION 'Identifiant ou ressource non autorisee' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.taches_preparation(id,user_id,preparation_id,type_tache,titre)
    VALUES(p_id,v_user,p_preparation,p_type,p_titre) ON CONFLICT DO NOTHING RETURNING * INTO v_result;
  IF NOT FOUND THEN
    SELECT * INTO v_result FROM public.taches_preparation WHERE id=p_id AND user_id=v_user;
    IF FOUND AND (v_result.preparation_id<>p_preparation OR v_result.type_tache<>p_type) THEN
      RAISE EXCEPTION 'Identifiant deja utilise pour une autre tache' USING ERRCODE='22023';
    END IF;
    IF v_result.id IS NULL AND p_type<>'libre' THEN
      SELECT * INTO v_result FROM public.taches_preparation
        WHERE user_id=v_user AND preparation_id=p_preparation AND type_tache=p_type;
    END IF;
  END IF;
  IF v_result.id IS NULL THEN RAISE EXCEPTION 'Creation impossible : relire' USING ERRCODE='40001'; END IF;
  RETURN v_result;
END;
$fn$;
CREATE FUNCTION public.enregistrer_tache_lot04(p_id uuid,p_revision bigint,p_titre text,p_brouillon text,p_etat text)
RETURNS public.taches_preparation LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE v_result public.taches_preparation; v_user uuid:=auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Session requise' USING ERRCODE='42501'; END IF;
  UPDATE public.taches_preparation SET titre=p_titre,brouillon_texte=p_brouillon,etat=p_etat,revision=p_revision+1
    WHERE id=p_id AND user_id=v_user AND revision=p_revision RETURNING * INTO v_result;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.taches_preparation WHERE id=p_id AND user_id=v_user) THEN
      RAISE EXCEPTION 'Tache modifiee : relire' USING ERRCODE='40001';
    END IF;
    RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE='42501';
  END IF;
  RETURN v_result;
END;
$fn$;

REVOKE ALL ON FUNCTION ephemer_lot04.verifier_revision() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.ouvrir_preparation_lot04(uuid),
  public.enregistrer_preparation_lot04(uuid,bigint,text,boolean),
  public.ajouter_tache_lot04(uuid,uuid,text,text),
  public.enregistrer_tache_lot04(uuid,bigint,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.ouvrir_preparation_lot04(uuid),
  public.enregistrer_preparation_lot04(uuid,bigint,text,boolean),
  public.ajouter_tache_lot04(uuid,uuid,text,text),
  public.enregistrer_tache_lot04(uuid,bigint,text,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

