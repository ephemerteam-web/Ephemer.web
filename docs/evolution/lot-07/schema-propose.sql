-- Lot 07 : PROPOSITION NON APPLIQUEE. Application humaine uniquement.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_setting('server_version_num')::int<170000 OR NOT EXISTS
    (SELECT 1 FROM pg_constraint WHERE conrelid='public.contacts'::regclass
     AND contype='u' AND pg_get_constraintdef(oid)='UNIQUE (user_id, id)') THEN
    RAISE EXCEPTION 'PostgreSQL 17 et cle contacts/proprietaire confirmes requis';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='ephemer_lot07')
    OR to_regclass('public.preferences_cadeaux_contacts') IS NOT NULL THEN
    RAISE EXCEPTION 'Objets lot 07 deja presents : inspecter, ne pas rejouer';
  END IF;
END;
$garde$;
CREATE SCHEMA ephemer_lot07;
REVOKE ALL ON SCHEMA ephemer_lot07 FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA ephemer_lot07 TO authenticated;
CREATE FUNCTION ephemer_lot07.categories_valides(v text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
 SELECT v IS NOT NULL AND coalesce(array_ndims(v),1)=1 AND cardinality(v)<=5
   AND v <@ ARRAY['loisir','bien_etre','tech','decoration','gourmand']::text[]
   AND NOT EXISTS (SELECT 1 FROM unnest(v) AS c WHERE c IS NULL)
   AND cardinality(v)=(SELECT count(DISTINCT c) FROM unnest(v) AS c);
$fn$;
REVOKE ALL ON FUNCTION ephemer_lot07.categories_valides(text[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION ephemer_lot07.categories_valides(text[]) TO authenticated;
CREATE TABLE public.preferences_cadeaux_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id bigint NOT NULL,
  categories text[] NOT NULL DEFAULT '{}' CHECK (ephemer_lot07.categories_valides(categories)),
  UNIQUE(user_id,contact_id),
  FOREIGN KEY(user_id,contact_id) REFERENCES public.contacts(user_id,id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lot07_preferences_cadeaux_contacts_cursor ON public.preferences_cadeaux_contacts(user_id,id);
CREATE FUNCTION ephemer_lot07.verifier_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.revision<>1 THEN RAISE EXCEPTION 'Revision initiale invalide' USING ERRCODE='23514'; END IF;
    NEW.created_at:=now();
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR (to_jsonb(NEW)->'contact_id') IS DISTINCT FROM (to_jsonb(OLD)->'contact_id') THEN
      RAISE EXCEPTION 'Identite et contact immuables' USING ERRCODE='23514';
    END IF;
    IF NEW.revision IS DISTINCT FROM OLD.revision+1 THEN
      RAISE EXCEPTION 'Revision attendue requise : relire' USING ERRCODE='40001';
    END IF;
  END IF;
  NEW.updated_at:=clock_timestamp();
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION ephemer_lot07.verifier_revision() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER lot07_revision BEFORE INSERT OR UPDATE ON public.preferences_cadeaux_contacts
 FOR EACH ROW EXECUTE FUNCTION ephemer_lot07.verifier_revision();
ALTER TABLE public.preferences_cadeaux_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.preferences_cadeaux_contacts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.preferences_cadeaux_contacts TO authenticated;
GRANT SELECT ON public.preferences_cadeaux_contacts TO service_role;
GRANT INSERT(id,user_id,contact_id,categories) ON public.preferences_cadeaux_contacts TO authenticated;
GRANT UPDATE(categories,revision) ON public.preferences_cadeaux_contacts TO authenticated;
CREATE POLICY lot07_select ON public.preferences_cadeaux_contacts FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot07_insert ON public.preferences_cadeaux_contacts FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot07_update ON public.preferences_cadeaux_contacts FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot07_delete ON public.preferences_cadeaux_contacts FOR DELETE TO authenticated USING ((SELECT auth.uid())=user_id);
NOTIFY pgrst,'reload schema';
COMMIT;

