-- Retour HUMAIN uniquement, apres sauvegarde et retrait des dependances applicatives.
-- Refuse toute donnee ; aucune suppression CASCADE.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.cartes_individuelles,public.versions_cartes,ephemer_lot08.liens,ephemer_lot08.operations IN ACCESS EXCLUSIVE MODE;
DO $garde$
BEGIN
 IF EXISTS(SELECT 1 FROM public.cartes_individuelles) OR EXISTS(SELECT 1 FROM public.versions_cartes)
  OR EXISTS(SELECT 1 FROM ephemer_lot08.liens) OR EXISTS(SELECT 1 FROM ephemer_lot08.operations) THEN
  RAISE EXCEPTION 'Rollback refuse : donnees presentes ; sauvegarde et reconciliation humaines requises';
 END IF;
END;
$garde$;
DROP FUNCTION public.exporter_liens_cartes_lot08(uuid,uuid,integer) RESTRICT;
DROP FUNCTION public.lire_partage_carte_lot08(uuid,uuid,boolean) RESTRICT;
DROP FUNCTION public.consulter_carte_lot08(text) RESTRICT;
DROP FUNCTION public.gerer_partage_carte_lot08(uuid,uuid,bigint,uuid,text,integer,uuid,text,text,text,text) RESTRICT;
DROP TABLE ephemer_lot08.operations RESTRICT;
DROP TABLE ephemer_lot08.liens RESTRICT;
DROP TABLE public.versions_cartes RESTRICT;
DROP TABLE public.cartes_individuelles RESTRICT;
DROP FUNCTION ephemer_lot08.version_immuable() RESTRICT;
DROP FUNCTION ephemer_lot08.verifier_revision() RESTRICT;
DROP FUNCTION ephemer_lot08.snapshot_valide(jsonb) RESTRICT;
DROP FUNCTION ephemer_lot08.message_non_vide(text) RESTRICT;
DROP SCHEMA ephemer_lot08 RESTRICT;
NOTIFY pgrst,'reload schema';
COMMIT;
