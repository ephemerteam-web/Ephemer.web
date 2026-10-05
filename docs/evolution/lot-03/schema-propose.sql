-- Lot 03 — PROPOSITION A VALIDER, NON APPLIQUEE — 5 octobre 2026.
-- Lire README.md ; essayer sur une copie isolee avant application humaine.
-- Autonome du lot 02. Aucun contact converti, aucun envoi, aucune fonction creee.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preconditions$
BEGIN
  IF to_regclass('public.contacts') IS NULL OR to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'Tables contacts/Auth absentes : contrat a revoir.';
  END IF;
  IF to_regclass('public.listes_personnelles') IS NOT NULL
     OR to_regclass('public.appartenances_listes') IS NOT NULL THEN
    RAISE EXCEPTION 'Objets lot 03 deja presents : inspecter, ne pas reexecuter.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='contacts' AND column_name='id' AND data_type='bigint' AND is_nullable='NO')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='contacts' AND column_name='user_id' AND data_type='uuid') THEN
    RAISE EXCEPTION 'Identifiants contacts divergents : contrat a revoir.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.contacts'::regclass
    AND conname='lot03_contacts_owner_id') THEN
    RAISE EXCEPTION 'Nom de contrainte lot 03 deja utilise : inspecter.';
  END IF;
END;
$preconditions$;

-- Reutiliser une cle unique non differee, dans l'un ou l'autre ordre.
-- Les contacts historiques sans proprietaire ne sont pas modifies ni classables.
DO $cle_contacts$
DECLARE v_owner smallint; v_id smallint;
BEGIN
  SELECT attnum INTO STRICT v_owner FROM pg_attribute
    WHERE attrelid='public.contacts'::regclass AND attname='user_id' AND NOT attisdropped;
  SELECT attnum INTO STRICT v_id FROM pg_attribute
    WHERE attrelid='public.contacts'::regclass AND attname='id' AND NOT attisdropped;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.contacts'::regclass
    AND contype IN ('p','u') AND NOT condeferrable AND convalidated
    AND (conkey=ARRAY[v_owner,v_id] OR conkey=ARRAY[v_id,v_owner])) THEN
    ALTER TABLE public.contacts ADD CONSTRAINT lot03_contacts_owner_id UNIQUE(user_id,id);
    COMMENT ON CONSTRAINT lot03_contacts_owner_id ON public.contacts
      IS 'Ephemer lot03 : cle ajoutee par schema-propose.sql ; rollback RESTRICT seulement';
  END IF;
END;
$cle_contacts$;

CREATE TABLE public.listes_personnelles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nom text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lot03_listes_owner_auth FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT lot03_listes_nom CHECK (nom=btrim(nom) AND char_length(nom) BETWEEN 1 AND 80),
  CONSTRAINT lot03_listes_owner_id UNIQUE(user_id,id)
);
CREATE UNIQUE INDEX lot03_listes_nom_unique ON public.listes_personnelles(user_id,lower(btrim(nom)));
-- Index de lecture paginee deja fourni par UNIQUE(user_id,id).

CREATE TABLE public.appartenances_listes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  liste_id uuid NOT NULL,
  contact_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lot03_appartenances_owner_auth FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT lot03_appartenances_liste FOREIGN KEY(user_id,liste_id)
    REFERENCES public.listes_personnelles(user_id,id) ON DELETE CASCADE,
  CONSTRAINT lot03_appartenances_contact FOREIGN KEY(user_id,contact_id)
    REFERENCES public.contacts(user_id,id) ON DELETE CASCADE,
  CONSTRAINT lot03_appartenances_paire UNIQUE(liste_id,contact_id)
);
CREATE INDEX lot03_appartenances_owner_cursor ON public.appartenances_listes(user_id,id);
CREATE INDEX lot03_appartenances_owner_liste ON public.appartenances_listes(user_id,liste_id);
CREATE INDEX lot03_appartenances_owner_contact ON public.appartenances_listes(user_id,contact_id);

ALTER TABLE public.listes_personnelles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appartenances_listes ENABLE ROW LEVEL SECURITY;

-- Les defaults de la plateforme peuvent donner des droits trop larges : les retirer
-- explicitement sur ces deux objets, sans modifier les defaults ou les anciennes tables.
REVOKE ALL ON public.listes_personnelles,public.appartenances_listes FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.listes_personnelles,public.appartenances_listes TO authenticated;
GRANT INSERT(id,user_id,nom) ON public.listes_personnelles TO authenticated;
GRANT UPDATE(nom) ON public.listes_personnelles TO authenticated;
GRANT INSERT(id,user_id,liste_id,contact_id) ON public.appartenances_listes TO authenticated;
GRANT SELECT ON public.listes_personnelles,public.appartenances_listes TO service_role;

CREATE POLICY lot03_listes_select ON public.listes_personnelles FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot03_listes_insert ON public.listes_personnelles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot03_listes_update ON public.listes_personnelles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot03_listes_delete ON public.listes_personnelles FOR DELETE TO authenticated
  USING ((SELECT auth.uid())=user_id);

CREATE POLICY lot03_appartenances_select ON public.appartenances_listes FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot03_appartenances_insert ON public.appartenances_listes FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid())=user_id
    AND EXISTS (SELECT 1 FROM public.listes_personnelles l
      WHERE l.id=liste_id AND l.user_id=appartenances_listes.user_id)
    AND EXISTS (SELECT 1 FROM public.contacts c
      WHERE c.id=contact_id AND c.user_id=appartenances_listes.user_id));
CREATE POLICY lot03_appartenances_delete ON public.appartenances_listes FOR DELETE TO authenticated
  USING ((SELECT auth.uid())=user_id);

-- Pas de policy UPDATE d'appartenance : retirer puis ajouter, sans reaffectation.
-- Pas de fonction, de EXECUTE nouveau, de Storage ou de droit ami/cercle.
NOTIFY pgrst, 'reload schema';
COMMIT;
