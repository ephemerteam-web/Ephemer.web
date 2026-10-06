-- Lot 05 — PROPOSITION NON APPLIQUEE — 6 octobre 2026.
-- Appliquer seulement apres confirmation en lecture seule du lot 04.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_setting('server_version_num')::integer<170000
    OR to_regclass('public.preparations_evenements') IS NULL
    OR to_regprocedure('public.ouvrir_preparation_lot04(uuid)') IS NULL THEN
    RAISE EXCEPTION 'PostgreSQL 17 et lot 04 confirme requis.';
  END IF;
  IF to_regclass('public.idees_cadeaux') IS NOT NULL OR to_regclass('public.choix_cadeaux') IS NOT NULL
    OR to_regclass('public.cadeaux_offerts') IS NOT NULL
    OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='ephemer_lot05')
    OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN ('choisir_idee_lot05','noter_cadeau_offert_lot05','budget_cadeaux_lot05')) THEN
    RAISE EXCEPTION 'Objets lot 05 deja presents : inspecter, ne pas reexecuter.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.preparations_evenements'::regclass
    AND contype='u' AND NOT condeferrable AND convalidated
    AND pg_get_constraintdef(oid)='UNIQUE (user_id, id)') THEN
    RAISE EXCEPTION 'Cle preparation/proprietaire divergente.';
  END IF;
END;
$garde$;
CREATE SCHEMA ephemer_lot05;
REVOKE ALL ON SCHEMA ephemer_lot05 FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA ephemer_lot05 TO authenticated;

-- Validation conservative, sans DNS/requete reseau. Host ASCII (IDN en punycode),
-- port 1..65535 facultatif, aucun identifiant/mot de passe dans l'autorite.
CREATE FUNCTION ephemer_lot05.lien_valide(p_lien text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE v_port text[];
BEGIN
  IF p_lien IS NULL THEN RETURN true; END IF;
  IF char_length(p_lien)>2048 THEN RETURN false; END IF;
  v_port:=regexp_match(p_lien,
    $rx$^https?://(?:\[[0-9A-Fa-f:]+\]|[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?)(?::([0-9]{1,5}))?(?:[/?#][^[:space:][:cntrl:]<>"']*)?$$rx$);
  IF v_port IS NULL THEN RETURN false; END IF;
  RETURN v_port[1] IS NULL OR v_port[1]::integer BETWEEN 1 AND 65535;
END;
$fn$;

CREATE TABLE public.idees_cadeaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id bigint,
  titre text NOT NULL CHECK (titre=btrim(titre) AND char_length(titre) BETWEEN 1 AND 200),
  note text CHECK (char_length(note)<=4000),
  lien_marchand text CHECK (ephemer_lot05.lien_valide(lien_marchand)),
  prix_estime_centimes bigint CHECK (prix_estime_centimes BETWEEN 0 AND 9007199254740991),
  devise_estimee text DEFAULT 'EUR' CHECK (devise_estimee IN ('EUR','USD','GBP','CHF','CAD')),
  archivee boolean NOT NULL DEFAULT false,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lot05_idee_montant_devise CHECK (prix_estime_centimes IS NULL OR devise_estimee IS NOT NULL),
  CONSTRAINT lot05_idee_contact FOREIGN KEY(user_id,contact_id)
    REFERENCES public.contacts(user_id,id) ON DELETE SET NULL (contact_id),
  CONSTRAINT lot05_idee_owner_id UNIQUE(user_id,id)
);
CREATE TABLE public.choix_cadeaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  preparation_id uuid NOT NULL,
  idee_id uuid,
  titre text NOT NULL CHECK (titre=btrim(titre) AND char_length(titre) BETWEEN 1 AND 200),
  prix_estime_centimes bigint CHECK (prix_estime_centimes BETWEEN 0 AND 9007199254740991),
  devise_estimee text DEFAULT 'EUR' CHECK (devise_estimee IN ('EUR','USD','GBP','CHF','CAD')),
  etat text NOT NULL DEFAULT 'prevu' CHECK (etat IN ('prevu','achete','abandonne')),
  montant_depense_centimes bigint CHECK (montant_depense_centimes BETWEEN 0 AND 9007199254740991),
  devise_depensee text CHECK (devise_depensee IN ('EUR','USD','GBP','CHF','CAD')),
  date_achat date CHECK (date_achat BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lot05_choix_preparation FOREIGN KEY(user_id,preparation_id)
    REFERENCES public.preparations_evenements(user_id,id) ON DELETE CASCADE,
  CONSTRAINT lot05_choix_idee FOREIGN KEY(user_id,idee_id)
    REFERENCES public.idees_cadeaux(user_id,id) ON DELETE SET NULL (idee_id),
  CONSTRAINT lot05_choix_estimation_devise CHECK (prix_estime_centimes IS NULL OR devise_estimee IS NOT NULL),
  CONSTRAINT lot05_choix_depense_devise CHECK (montant_depense_centimes IS NULL OR devise_depensee IS NOT NULL),
  CONSTRAINT lot05_choix_achat CHECK (etat='achete' OR
    (montant_depense_centimes IS NULL AND devise_depensee IS NULL AND date_achat IS NULL)),
  CONSTRAINT lot05_choix_idee_unique UNIQUE(user_id,preparation_id,idee_id),
  CONSTRAINT lot05_choix_owner_id UNIQUE(user_id,id)
);
CREATE TABLE public.cadeaux_offerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id bigint,
  destinataire_historique text NOT NULL CHECK
    (destinataire_historique=btrim(destinataire_historique) AND char_length(destinataire_historique) BETWEEN 1 AND 200),
  occurrence_id uuid,
  choix_id uuid,
  titre text NOT NULL CHECK (titre=btrim(titre) AND char_length(titre) BETWEEN 1 AND 200),
  date_don date NOT NULL CHECK (date_don BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
  reaction text CHECK (char_length(reaction)<=4000),
  -- Seulement pour les dons directs, sans choix : declaration d'achat distincte du don.
  achat_declare boolean NOT NULL DEFAULT false,
  montant_depense_centimes bigint CHECK (montant_depense_centimes BETWEEN 0 AND 9007199254740991),
  devise_depensee text CHECK (devise_depensee IN ('EUR','USD','GBP','CHF','CAD')),
  date_achat date CHECK (date_achat BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lot05_don_contact FOREIGN KEY(user_id,contact_id)
    REFERENCES public.contacts(user_id,id) ON DELETE SET NULL (contact_id),
  CONSTRAINT lot05_don_occurrence FOREIGN KEY(user_id,occurrence_id)
    REFERENCES public.occurrences_evenements(user_id,id) ON DELETE CASCADE,
  CONSTRAINT lot05_don_choix FOREIGN KEY(user_id,choix_id)
    REFERENCES public.choix_cadeaux(user_id,id) ON DELETE CASCADE,
  CONSTRAINT lot05_don_choix_unique UNIQUE(user_id,choix_id),
  CONSTRAINT lot05_don_depense_devise CHECK (montant_depense_centimes IS NULL OR devise_depensee IS NOT NULL),
  CONSTRAINT lot05_don_sans_double_depense CHECK (choix_id IS NULL OR
    (NOT achat_declare AND montant_depense_centimes IS NULL AND devise_depensee IS NULL AND date_achat IS NULL)),
  CONSTRAINT lot05_don_achat CHECK (achat_declare OR
    (montant_depense_centimes IS NULL AND devise_depensee IS NULL AND date_achat IS NULL))
);
CREATE INDEX lot05_idees_contact_cursor ON public.idees_cadeaux(user_id,contact_id,id);
CREATE INDEX lot05_choix_cursor ON public.choix_cadeaux(user_id,preparation_id,id);
CREATE INDEX lot05_choix_idee ON public.choix_cadeaux(user_id,idee_id);
CREATE INDEX lot05_choix_budget ON public.choix_cadeaux(user_id,date_achat,id) WHERE etat='achete';
CREATE INDEX lot05_dons_contact_cursor ON public.cadeaux_offerts(user_id,contact_id,date_don,id);
CREATE INDEX lot05_dons_occurrence ON public.cadeaux_offerts(user_id,occurrence_id);
CREATE INDEX lot05_dons_budget ON public.cadeaux_offerts(user_id,date_achat,id) WHERE achat_declare;
CREATE INDEX lot05_dons_cursor ON public.cadeaux_offerts(user_id,id);

CREATE FUNCTION ephemer_lot05.verifier_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE v_detachement boolean:=false; v_col text;
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.revision<>1 THEN RAISE EXCEPTION 'Revision initiale invalide' USING ERRCODE='23514'; END IF;
    NEW.created_at:=now();
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Identite immuable' USING ERRCODE='23514';
    END IF;
    IF TG_TABLE_NAME='choix_cadeaux' THEN
      IF NEW.preparation_id IS DISTINCT FROM OLD.preparation_id THEN
        RAISE EXCEPTION 'Preparation immuable' USING ERRCODE='23514';
      END IF;
      v_col:='idee_id';
    ELSE
      v_col:='contact_id';
      IF TG_TABLE_NAME='cadeaux_offerts' AND NEW.choix_id IS DISTINCT FROM OLD.choix_id THEN
        RAISE EXCEPTION 'Choix du don immuable' USING ERRCODE='23514';
      END IF;
    END IF;
    -- Seuls les SET NULL des FK imbriques peuvent omettre la revision.
    -- Les autres champs doivent etre identiques ; une ecriture client directe
    -- continue d'exiger revision + 1. Pas de SECURITY DEFINER.
    v_detachement:=pg_trigger_depth()>1
      AND (to_jsonb(OLD)->>v_col) IS NOT NULL AND (to_jsonb(NEW)->>v_col) IS NULL
      AND (to_jsonb(NEW)-ARRAY[v_col,'revision','updated_at'])=
          (to_jsonb(OLD)-ARRAY[v_col,'revision','updated_at']);
    IF v_detachement THEN NEW.revision:=OLD.revision+1;
    ELSIF NEW.revision IS DISTINCT FROM OLD.revision+1 THEN
      RAISE EXCEPTION 'Revision attendue requise : relire' USING ERRCODE='40001';
    END IF;
  END IF;
  NEW.updated_at:=clock_timestamp();
  RETURN NEW;
END;
$fn$;
CREATE FUNCTION ephemer_lot05.verifier_don() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE v_occurrence uuid; v_contact bigint;
BEGIN
  IF NEW.choix_id IS NOT NULL THEN
    SELECT p.occurrence_id INTO v_occurrence FROM public.choix_cadeaux c
      JOIN public.preparations_evenements p ON p.id=c.preparation_id AND p.user_id=c.user_id
      WHERE c.id=NEW.choix_id AND c.user_id=NEW.user_id;
    IF NOT FOUND OR NEW.occurrence_id IS DISTINCT FROM v_occurrence THEN
      RAISE EXCEPTION 'Don et choix incompatibles' USING ERRCODE='23514';
    END IF;
  END IF;
  -- Le destinataire historique ne suit pas les corrections ulterieures de la
  -- fiche evenement. Valider ce rattachement a la creation ou au changement
  -- d'occurrence ; une reaction modifiee et les detachements FK restent possibles.
  IF NEW.occurrence_id IS NOT NULL AND (TG_OP='INSERT' OR
    NEW.occurrence_id IS DISTINCT FROM OLD.occurrence_id) THEN
    SELECT e.contact_id INTO v_contact FROM public.occurrences_evenements o
      JOIN public.evenements_personnels e ON e.id=o.evenement_id AND e.user_id=o.user_id
      WHERE o.id=NEW.occurrence_id AND o.user_id=NEW.user_id;
    IF NOT FOUND OR NEW.contact_id IS DISTINCT FROM v_contact THEN
      RAISE EXCEPTION 'Don et destinataire incompatibles' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER lot05_idee_revision BEFORE INSERT OR UPDATE ON public.idees_cadeaux
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot05.verifier_revision();
CREATE TRIGGER lot05_choix_revision BEFORE INSERT OR UPDATE ON public.choix_cadeaux
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot05.verifier_revision();
CREATE TRIGGER lot05_don_revision BEFORE INSERT OR UPDATE ON public.cadeaux_offerts
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot05.verifier_revision();
CREATE TRIGGER lot05_don_coherence BEFORE INSERT OR UPDATE ON public.cadeaux_offerts
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot05.verifier_don();

ALTER TABLE public.idees_cadeaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choix_cadeaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadeaux_offerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.idees_cadeaux,public.choix_cadeaux,public.cadeaux_offerts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.idees_cadeaux,public.choix_cadeaux,public.cadeaux_offerts TO authenticated;
GRANT SELECT ON public.idees_cadeaux,public.choix_cadeaux,public.cadeaux_offerts TO service_role;
GRANT INSERT(id,user_id,contact_id,titre,note,lien_marchand,prix_estime_centimes,devise_estimee,archivee)
  ON public.idees_cadeaux TO authenticated;
GRANT UPDATE(contact_id,titre,note,lien_marchand,prix_estime_centimes,devise_estimee,archivee,revision)
  ON public.idees_cadeaux TO authenticated;
GRANT INSERT(id,user_id,preparation_id,idee_id,titre,prix_estime_centimes,devise_estimee,etat,
  montant_depense_centimes,devise_depensee,date_achat) ON public.choix_cadeaux TO authenticated;
GRANT UPDATE(titre,prix_estime_centimes,devise_estimee,etat,montant_depense_centimes,devise_depensee,date_achat,revision)
  ON public.choix_cadeaux TO authenticated;
GRANT INSERT(id,user_id,contact_id,destinataire_historique,occurrence_id,choix_id,titre,date_don,reaction,
  achat_declare,montant_depense_centimes,devise_depensee,date_achat) ON public.cadeaux_offerts TO authenticated;
GRANT UPDATE(contact_id,destinataire_historique,occurrence_id,titre,date_don,reaction,
  achat_declare,montant_depense_centimes,devise_depensee,date_achat,revision) ON public.cadeaux_offerts TO authenticated;
CREATE POLICY lot05_idees_cadeaux_select ON public.idees_cadeaux FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot05_idees_cadeaux_insert ON public.idees_cadeaux FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot05_idees_cadeaux_update ON public.idees_cadeaux FOR UPDATE TO authenticated
  USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot05_idees_cadeaux_delete ON public.idees_cadeaux FOR DELETE TO authenticated
  USING ((SELECT auth.uid())=user_id);

CREATE POLICY lot05_choix_cadeaux_select ON public.choix_cadeaux FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot05_choix_cadeaux_insert ON public.choix_cadeaux FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot05_choix_cadeaux_update ON public.choix_cadeaux FOR UPDATE TO authenticated
  USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot05_choix_cadeaux_delete ON public.choix_cadeaux FOR DELETE TO authenticated
  USING ((SELECT auth.uid())=user_id);

CREATE POLICY lot05_cadeaux_offerts_select ON public.cadeaux_offerts FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot05_cadeaux_offerts_insert ON public.cadeaux_offerts FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot05_cadeaux_offerts_update ON public.cadeaux_offerts FOR UPDATE TO authenticated
  USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot05_cadeaux_offerts_delete ON public.cadeaux_offerts FOR DELETE TO authenticated
  USING ((SELECT auth.uid())=user_id);

-- Une meme idee ne cree qu'un choix par preparation ; une nouvelle annee peut
-- la selectionner a nouveau. Le titre/estimation sont copies, jamais la note.
CREATE FUNCTION public.choisir_idee_lot05(p_id uuid,p_preparation uuid,p_idee uuid)
RETURNS public.choix_cadeaux LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE v_result public.choix_cadeaux; v_idee public.idees_cadeaux; v_user uuid:=auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Session requise' USING ERRCODE='42501'; END IF;
  IF p_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.preparations_evenements WHERE id=p_preparation AND user_id=v_user) THEN
    RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_idee FROM public.idees_cadeaux WHERE id=p_idee AND user_id=v_user FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE='42501'; END IF;
  INSERT INTO public.choix_cadeaux(id,user_id,preparation_id,idee_id,titre,prix_estime_centimes,devise_estimee)
    VALUES(p_id,v_user,p_preparation,p_idee,v_idee.titre,v_idee.prix_estime_centimes,v_idee.devise_estimee)
    ON CONFLICT DO NOTHING RETURNING * INTO v_result;
  IF NOT FOUND THEN
    SELECT * INTO v_result FROM public.choix_cadeaux WHERE id=p_id AND user_id=v_user;
    IF FOUND AND (v_result.preparation_id<>p_preparation OR v_result.idee_id IS DISTINCT FROM p_idee) THEN
      RAISE EXCEPTION 'Identifiant utilise pour un autre choix' USING ERRCODE='22023';
    END IF;
    IF v_result.id IS NULL THEN
      SELECT * INTO v_result FROM public.choix_cadeaux
        WHERE user_id=v_user AND preparation_id=p_preparation AND idee_id=p_idee;
    END IF;
  END IF;
  IF v_result.id IS NULL THEN RAISE EXCEPTION 'Creation concurrente : relire' USING ERRCODE='40001'; END IF;
  RETURN v_result;
END;
$fn$;
CREATE FUNCTION public.noter_cadeau_offert_lot05(p_id uuid,p_choix uuid,p_date date,p_reaction text)
RETURNS public.cadeaux_offerts LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE v_result public.cadeaux_offerts; v_choix public.choix_cadeaux;
  v_occurrence uuid; v_contact bigint; v_nom text; v_user uuid:=auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Session requise' USING ERRCODE='42501'; END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Identifiant requis' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_choix FROM public.choix_cadeaux WHERE id=p_choix AND user_id=v_user FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE='42501'; END IF;
  SELECT o.id,e.contact_id,coalesce(nullif(btrim(concat_ws(' ',c.prenom,c.nom)),''),e.titre)
    INTO v_occurrence,v_contact,v_nom FROM public.preparations_evenements p
    JOIN public.occurrences_evenements o ON o.id=p.occurrence_id AND o.user_id=p.user_id
    JOIN public.evenements_personnels e ON e.id=o.evenement_id AND e.user_id=o.user_id
    LEFT JOIN public.contacts c ON c.id=e.contact_id AND c.user_id=e.user_id
    WHERE p.id=v_choix.preparation_id AND p.user_id=v_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE='42501'; END IF;
  INSERT INTO public.cadeaux_offerts(id,user_id,contact_id,destinataire_historique,occurrence_id,choix_id,titre,date_don,reaction)
    VALUES(p_id,v_user,v_contact,left(v_nom,200),v_occurrence,p_choix,v_choix.titre,p_date,p_reaction)
    ON CONFLICT DO NOTHING RETURNING * INTO v_result;
  IF NOT FOUND THEN
    SELECT * INTO v_result FROM public.cadeaux_offerts WHERE id=p_id AND user_id=v_user;
    IF FOUND AND v_result.choix_id IS DISTINCT FROM p_choix THEN
      RAISE EXCEPTION 'Identifiant utilise pour un autre don' USING ERRCODE='22023';
    END IF;
    IF v_result.id IS NULL THEN
      SELECT * INTO v_result FROM public.cadeaux_offerts WHERE user_id=v_user AND choix_id=p_choix;
    END IF;
  END IF;
  IF v_result.id IS NULL THEN RAISE EXCEPTION 'Creation concurrente : relire' USING ERRCODE='40001'; END IF;
  -- Le don ne modifie ni l'etat achete, ni la depense, ni une tache.
  RETURN v_result;
END;
$fn$;

CREATE FUNCTION public.budget_cadeaux_lot05(p_debut date,p_fin date)
RETURNS TABLE(devise text,prevu text,depense text,nb_prevu_inconnu bigint,nb_depense_inconnu bigint,
  nb_depense_sans_date bigint,depense_sans_date text,nb_depense_sans_date_inconnu bigint)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Session requise' USING ERRCODE='42501'; END IF;
  IF p_debut IS NULL OR p_fin IS NULL OR p_fin-p_debut NOT BETWEEN 1 AND 366 THEN
    RAISE EXCEPTION 'Periode civile de 1 a 366 jours, fin exclusive' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
  WITH prevus AS (
    SELECT c.devise_estimee AS code,c.prix_estime_centimes::numeric AS montant
    FROM public.choix_cadeaux c
    JOIN public.preparations_evenements p ON p.id=c.preparation_id AND p.user_id=c.user_id
    JOIN public.occurrences_evenements o ON o.id=p.occurrence_id AND o.user_id=p.user_id
    JOIN public.evenements_personnels e ON e.id=o.evenement_id AND e.user_id=o.user_id
    WHERE c.user_id=auth.uid() AND c.etat='prevu' AND NOT p.sans_achat AND p.etat<>'abandonnee'
      AND NOT o.annulee AND NOT e.archive AND o.date_occurrence>=p_debut AND o.date_occurrence<p_fin
      AND NOT EXISTS (SELECT 1 FROM public.cadeaux_offerts d WHERE d.user_id=c.user_id AND d.choix_id=c.id)
  ), achats AS (
    SELECT c.devise_depensee AS code,c.montant_depense_centimes::numeric AS montant,c.date_achat AS jour
      FROM public.choix_cadeaux c WHERE c.user_id=auth.uid() AND c.etat='achete'
    UNION ALL
    SELECT d.devise_depensee,d.montant_depense_centimes::numeric,d.date_achat
      FROM public.cadeaux_offerts d WHERE d.user_id=auth.uid() AND d.choix_id IS NULL AND d.achat_declare
  ), lignes AS (
    SELECT code,montant,'prevu'::text AS nature FROM prevus
    UNION ALL SELECT code,montant,'depense' FROM achats WHERE jour>=p_debut AND jour<p_fin
    UNION ALL SELECT code,montant,'sans_date' FROM achats WHERE jour IS NULL
  )
  SELECT coalesce(l.code,'SANS_DEVISE'),
    round(coalesce(sum(l.montant) FILTER (WHERE l.nature='prevu'),0)/100,2)::text,
    round(coalesce(sum(l.montant) FILTER (WHERE l.nature='depense'),0)/100,2)::text,
    count(*) FILTER (WHERE l.nature='prevu' AND l.montant IS NULL),
    count(*) FILTER (WHERE l.nature='depense' AND l.montant IS NULL),
    count(*) FILTER (WHERE l.nature='sans_date'),
    round(coalesce(sum(l.montant) FILTER (WHERE l.nature='sans_date'),0)/100,2)::text,
    count(*) FILTER (WHERE l.nature='sans_date' AND l.montant IS NULL)
  FROM lignes l GROUP BY l.code ORDER BY coalesce(l.code,'SANS_DEVISE');
END;
$fn$;

REVOKE ALL ON FUNCTION ephemer_lot05.lien_valide(text),ephemer_lot05.verifier_revision(),
  ephemer_lot05.verifier_don() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION ephemer_lot05.lien_valide(text) TO authenticated;
REVOKE ALL ON FUNCTION public.choisir_idee_lot05(uuid,uuid,uuid),
  public.noter_cadeau_offert_lot05(uuid,uuid,date,text),public.budget_cadeaux_lot05(date,date)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.choisir_idee_lot05(uuid,uuid,uuid),
  public.noter_cadeau_offert_lot05(uuid,uuid,date,text),public.budget_cadeaux_lot05(date,date) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
