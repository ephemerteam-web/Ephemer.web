-- Lot 04 — retour arriere HUMAIN, sauvegarde prealable ; lire README.md.
-- Aucune suppression automatique de donnees ou de dependances.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.preparations_evenements,public.taches_preparation IN ACCESS EXCLUSIVE MODE;
DO $garde$
BEGIN
  IF EXISTS(SELECT 1 FROM public.preparations_evenements) OR EXISTS(SELECT 1 FROM public.taches_preparation) THEN
    RAISE EXCEPTION 'Retour refuse : sauvegarder/reconcilier les donnees du lot 04.';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='ephemer_lot05')
    OR to_regclass('public.choix_cadeaux') IS NOT NULL
    OR to_regclass('public.cadeaux_offerts') IS NOT NULL THEN
    RAISE EXCEPTION 'Retour refuse : le lot 05 depend du lot 04.';
  END IF;
END;
$garde$;
-- RESTRICT et transaction : une dependance catalogue inattendue annule tout.
DROP FUNCTION public.enregistrer_tache_lot04(uuid,bigint,text,text,text) RESTRICT;
DROP FUNCTION public.ajouter_tache_lot04(uuid,uuid,text,text) RESTRICT;
DROP FUNCTION public.enregistrer_preparation_lot04(uuid,bigint,text,boolean) RESTRICT;
DROP FUNCTION public.ouvrir_preparation_lot04(uuid) RESTRICT;
DROP TABLE public.taches_preparation RESTRICT;
DROP TABLE public.preparations_evenements RESTRICT;
DROP FUNCTION ephemer_lot04.verifier_revision() RESTRICT;
DROP SCHEMA ephemer_lot04 RESTRICT;
NOTIFY pgrst,'reload schema';
COMMIT;

