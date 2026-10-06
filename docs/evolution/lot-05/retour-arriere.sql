-- Lot 05 — retour arriere HUMAIN, sauvegarde prealable ; lire README.md.
-- Le lot 04 reste installe. Aucune suppression automatique de donnees.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.idees_cadeaux,public.choix_cadeaux,public.cadeaux_offerts IN ACCESS EXCLUSIVE MODE;
DO $garde$
BEGIN
  IF EXISTS(SELECT 1 FROM public.idees_cadeaux) OR EXISTS(SELECT 1 FROM public.choix_cadeaux)
    OR EXISTS(SELECT 1 FROM public.cadeaux_offerts) THEN
    RAISE EXCEPTION 'Retour refuse : sauvegarder/reconcilier les donnees du lot 05.';
  END IF;
END;
$garde$;
DROP FUNCTION public.budget_cadeaux_lot05(date,date) RESTRICT;
DROP FUNCTION public.noter_cadeau_offert_lot05(uuid,uuid,date,text) RESTRICT;
DROP FUNCTION public.choisir_idee_lot05(uuid,uuid,uuid) RESTRICT;
DROP TABLE public.cadeaux_offerts RESTRICT;
DROP TABLE public.choix_cadeaux RESTRICT;
DROP TABLE public.idees_cadeaux RESTRICT;
DROP FUNCTION ephemer_lot05.verifier_don() RESTRICT;
DROP FUNCTION ephemer_lot05.verifier_revision() RESTRICT;
DROP FUNCTION ephemer_lot05.lien_valide(text) RESTRICT;
DROP SCHEMA ephemer_lot05 RESTRICT;
NOTIFY pgrst,'reload schema';
COMMIT;

