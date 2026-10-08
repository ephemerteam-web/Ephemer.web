-- Retour HUMAIN uniquement, apres sauvegarde, controle catalogue 09 et retrait du code V2.
-- Les donnees 08/V1 peuvent rester ; toute donnee 09 interdit ce retour.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.avatars_utilisateurs,public.cartes_individuelles,public.versions_cartes IN ACCESS EXCLUSIVE MODE;
DO $garde$
BEGIN
 IF EXISTS(SELECT 1 FROM public.avatars_utilisateurs)
  OR EXISTS(SELECT 1 FROM public.cartes_individuelles WHERE rendu_version<>1 OR avatar_signature IS NOT NULL)
  OR EXISTS(SELECT 1 FROM public.versions_cartes WHERE NOT ephemer_lot08.snapshot_valide(contenu)) THEN
  RAISE EXCEPTION 'Rollback refuse : donnees lot 09 presentes ; reconciliation humaine requise';
 END IF;
 IF (SELECT count(*) FROM pg_proc WHERE pronamespace='ephemer_lot09'::regnamespace)<>3
  OR (SELECT count(*) FROM pg_attribute WHERE attrelid='public.avatars_utilisateurs'::regclass AND attnum>0 AND NOT attisdropped)<>5
  OR (SELECT count(*) FROM pg_constraint WHERE conrelid='public.avatars_utilisateurs'::regclass)<>4
  OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.avatars_utilisateurs'::regclass AND NOT tgisinternal)<>1
  OR (SELECT count(*) FROM pg_policy WHERE polrelid='public.avatars_utilisateurs'::regclass)<>4
  OR (SELECT count(*) FROM pg_index WHERE indrelid='public.avatars_utilisateurs'::regclass)<>1
  OR EXISTS(SELECT 1 FROM pg_constraint WHERE confrelid='public.avatars_utilisateurs'::regclass)
  OR EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.cartes_individuelles'::regclass AND conname<>'lot09_avatar_signature_check'
   AND (SELECT attnum FROM pg_attribute WHERE attrelid=conrelid AND attname='avatar_signature')=ANY(conkey)) THEN
  RAISE EXCEPTION 'Rollback refuse : dependance ulterieure';
 END IF;
END;
$garde$;
DROP FUNCTION public.publier_carte_lot09(uuid,uuid,bigint,uuid,integer,uuid,text,text,text,text) RESTRICT;
ALTER TABLE public.versions_cartes DROP CONSTRAINT versions_cartes_contenu_check;
ALTER TABLE public.versions_cartes ADD CONSTRAINT versions_cartes_contenu_check CHECK(ephemer_lot08.snapshot_valide(contenu) AND ephemer_lot08.message_non_vide(contenu->>'message'));
ALTER TABLE public.cartes_individuelles DROP CONSTRAINT lot09_avatar_signature_check;
ALTER TABLE public.cartes_individuelles DROP COLUMN avatar_signature RESTRICT;
ALTER TABLE public.cartes_individuelles DROP CONSTRAINT cartes_individuelles_rendu_version_check;
ALTER TABLE public.cartes_individuelles ADD CONSTRAINT cartes_individuelles_rendu_version_check CHECK(rendu_version=1);
DROP TABLE public.avatars_utilisateurs RESTRICT;
DROP FUNCTION ephemer_lot09.verifier_revision() RESTRICT;
DROP FUNCTION ephemer_lot09.snapshot_valide(jsonb) RESTRICT;
DROP FUNCTION ephemer_lot09.avatar_valide(jsonb) RESTRICT;
DROP SCHEMA ephemer_lot09 RESTRICT;
NOTIFY pgrst,'reload schema';
COMMIT;
