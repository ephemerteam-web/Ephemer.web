-- Lot 03 — retour arriere humain, apres sauvegarde ; lire README.md.
-- Refuse si de nouvelles donnees existent ou si d'autres lots dependent de ces objets.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.contacts,public.listes_personnelles,public.appartenances_listes IN ACCESS EXCLUSIVE MODE;
DO $garde$
BEGIN
  IF EXISTS (SELECT 1 FROM public.listes_personnelles)
     OR EXISTS (SELECT 1 FROM public.appartenances_listes) THEN
    RAISE EXCEPTION 'Retour automatique refuse : sauvegarder et reconcilier les donnees du lot 03.';
  END IF;
END;
$garde$;
-- RESTRICT : toute dependance externe inattendue fait echouer toute la transaction.
DROP TABLE public.appartenances_listes RESTRICT;
DROP TABLE public.listes_personnelles RESTRICT;
DO $cle_ajoutee$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.contacts'::regclass
    AND conname='lot03_contacts_owner_id'
    AND obj_description(oid,'pg_constraint')=
      'Ephemer lot03 : cle ajoutee par schema-propose.sql ; rollback RESTRICT seulement') THEN
    ALTER TABLE public.contacts DROP CONSTRAINT lot03_contacts_owner_id RESTRICT;
  END IF;
END;
$cle_ajoutee$;
NOTIFY pgrst, 'reload schema';
COMMIT;
