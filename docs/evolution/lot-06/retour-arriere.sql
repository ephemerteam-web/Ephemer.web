-- Retour HUMAIN uniquement ; sauvegarde prealable, aucune destruction de donnees.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.styles_messages,public.preferences_styles_messages,public.styles_messages_contacts IN ACCESS EXCLUSIVE MODE;
DO $garde$
BEGIN
 IF EXISTS(SELECT 1 FROM public.styles_messages) OR EXISTS(SELECT 1 FROM public.preferences_styles_messages) OR EXISTS(SELECT 1 FROM public.styles_messages_contacts) THEN
 RAISE EXCEPTION 'Rollback refuse : donnees presentes ; sauvegarder et reconcilier'; END IF;
END;
$garde$;
DROP TABLE public.styles_messages_contacts RESTRICT;
DROP TABLE public.preferences_styles_messages RESTRICT;
DROP TABLE public.styles_messages RESTRICT;
DROP FUNCTION ephemer_lot06.verifier_revision() RESTRICT;
DROP SCHEMA ephemer_lot06 RESTRICT;
NOTIFY pgrst,'reload schema';
COMMIT;

