-- Lot 06 : PROPOSITION NON APPLIQUEE. Application humaine uniquement.
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
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='ephemer_lot06')
    OR to_regclass('public.styles_messages') IS NOT NULL
    OR to_regclass('public.preferences_styles_messages') IS NOT NULL
    OR to_regclass('public.styles_messages_contacts') IS NOT NULL THEN
    RAISE EXCEPTION 'Objets lot 06 deja presents : inspecter, ne pas rejouer';
  END IF;
END;
$garde$;
CREATE SCHEMA ephemer_lot06;
REVOKE ALL ON SCHEMA ephemer_lot06 FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA ephemer_lot06 TO authenticated;
CREATE TABLE public.styles_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text NOT NULL CHECK (nom=btrim(nom) AND char_length(nom) BETWEEN 1 AND 80),
  ton text NOT NULL CHECK (ton IN ('formel','familier','humoristique','poetique','beauf','vieux_francais')),
  longueur text NOT NULL DEFAULT 'courte' CHECK (longueur IN ('courte','moyenne','longue')),
  adresse text NOT NULL DEFAULT 'tu' CHECK (adresse IN ('tu','vous')),
  emojis boolean NOT NULL DEFAULT false,
  signature text NOT NULL DEFAULT '' CHECK (char_length(signature)<=200),
  UNIQUE(user_id,id),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lot06_styles_messages_cursor ON public.styles_messages(user_id,id);
CREATE TABLE public.preferences_styles_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  style_id uuid NOT NULL,
  UNIQUE(user_id),
  FOREIGN KEY(user_id,style_id) REFERENCES public.styles_messages(user_id,id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lot06_preferences_styles_messages_cursor ON public.preferences_styles_messages(user_id,id);
CREATE TABLE public.styles_messages_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id bigint NOT NULL,
  style_id uuid NOT NULL,
  UNIQUE(user_id,contact_id),
  FOREIGN KEY(user_id,contact_id) REFERENCES public.contacts(user_id,id) ON DELETE CASCADE,
  FOREIGN KEY(user_id,style_id) REFERENCES public.styles_messages(user_id,id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lot06_styles_messages_contacts_cursor ON public.styles_messages_contacts(user_id,id);
CREATE FUNCTION ephemer_lot06.verifier_revision() RETURNS trigger
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
REVOKE ALL ON FUNCTION ephemer_lot06.verifier_revision() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER lot06_revision BEFORE INSERT OR UPDATE ON public.styles_messages
 FOR EACH ROW EXECUTE FUNCTION ephemer_lot06.verifier_revision();
ALTER TABLE public.styles_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.styles_messages FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.styles_messages TO authenticated;
GRANT SELECT ON public.styles_messages TO service_role;
GRANT INSERT(id,user_id,nom,ton,longueur,adresse,emojis,signature) ON public.styles_messages TO authenticated;
GRANT UPDATE(nom,ton,longueur,adresse,emojis,signature,revision) ON public.styles_messages TO authenticated;
CREATE POLICY lot06_select ON public.styles_messages FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot06_insert ON public.styles_messages FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot06_update ON public.styles_messages FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot06_delete ON public.styles_messages FOR DELETE TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE TRIGGER lot06_revision BEFORE INSERT OR UPDATE ON public.preferences_styles_messages
 FOR EACH ROW EXECUTE FUNCTION ephemer_lot06.verifier_revision();
ALTER TABLE public.preferences_styles_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.preferences_styles_messages FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.preferences_styles_messages TO authenticated;
GRANT SELECT ON public.preferences_styles_messages TO service_role;
GRANT INSERT(id,user_id,style_id) ON public.preferences_styles_messages TO authenticated;
GRANT UPDATE(style_id,revision) ON public.preferences_styles_messages TO authenticated;
CREATE POLICY lot06_select ON public.preferences_styles_messages FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot06_insert ON public.preferences_styles_messages FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot06_update ON public.preferences_styles_messages FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot06_delete ON public.preferences_styles_messages FOR DELETE TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE TRIGGER lot06_revision BEFORE INSERT OR UPDATE ON public.styles_messages_contacts
 FOR EACH ROW EXECUTE FUNCTION ephemer_lot06.verifier_revision();
ALTER TABLE public.styles_messages_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.styles_messages_contacts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.styles_messages_contacts TO authenticated;
GRANT SELECT ON public.styles_messages_contacts TO service_role;
GRANT INSERT(id,user_id,contact_id,style_id) ON public.styles_messages_contacts TO authenticated;
GRANT UPDATE(style_id,revision) ON public.styles_messages_contacts TO authenticated;
CREATE POLICY lot06_select ON public.styles_messages_contacts FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE POLICY lot06_insert ON public.styles_messages_contacts FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot06_update ON public.styles_messages_contacts FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY lot06_delete ON public.styles_messages_contacts FOR DELETE TO authenticated USING ((SELECT auth.uid())=user_id);
NOTIFY pgrst,'reload schema';
COMMIT;

