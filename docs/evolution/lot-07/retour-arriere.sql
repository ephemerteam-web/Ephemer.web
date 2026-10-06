-- Retour HUMAIN uniquement ; sauvegarde prealable, aucune destruction de donnees.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.preferences_cadeaux_contacts IN ACCESS EXCLUSIVE MODE;
DO $garde$
BEGIN
 IF EXISTS(SELECT 1 FROM public.preferences_cadeaux_contacts) THEN
 RAISE EXCEPTION 'Rollback refuse : donnees presentes ; sauvegarder et reconcilier'; END IF;
END;
$garde$;
DROP TABLE public.preferences_cadeaux_contacts RESTRICT;
DROP FUNCTION ephemer_lot07.verifier_revision() RESTRICT;
DROP FUNCTION ephemer_lot07.categories_valides(text[]) RESTRICT;
DROP SCHEMA ephemer_lot07 RESTRICT;
NOTIFY pgrst,'reload schema';
COMMIT;

