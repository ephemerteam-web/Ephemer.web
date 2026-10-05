-- Lot 02 — rollback AVANT toute utilisation des objets nouveaux uniquement.
-- Non execute. Lire README.md : apres ecriture, sauvegarde/reconciliation manuelles.
-- Aucun CASCADE et aucune suppression silencieuse de donnees de produit.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- Verrouiller avant de compter : une RPC concurrente ne peut inserer apres le garde.
LOCK TABLE public.contacts,public.profiles,public.evenements_personnels,public.regles_evenements,
  public.occurrences_evenements,public.notifications,public.rappels,ephemer_lot02.etat_schema IN ACCESS EXCLUSIVE MODE;
DO $garde$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ephemer_lot02.etat_schema WHERE singleton AND NOT utilise)
    OR EXISTS (SELECT 1 FROM public.evenements_personnels)
    OR EXISTS (SELECT 1 FROM public.regles_evenements)
    OR EXISTS (SELECT 1 FROM public.occurrences_evenements)
    OR EXISTS (SELECT 1 FROM public.notifications WHERE occurrence_id IS NOT NULL OR contact_id IS NULL)
    OR EXISTS (SELECT 1 FROM public.rappels WHERE occurrence_id IS NOT NULL OR contact_id IS NULL) THEN
    RAISE EXCEPTION 'Rollback automatique refuse : donnees nouvelles ; sauvegarder et reconcilier manuellement.';
  END IF;
END;
$garde$;

DROP TRIGGER lot02_notification_lien ON public.notifications;
DROP TRIGGER lot02_rappel_lien ON public.rappels;
DROP TRIGGER lot02_contacts_cycle_vie ON public.contacts;
DROP TRIGGER lot02_profiles_cycle_vie ON public.profiles;
DROP FUNCTION public.enregistrer_evenement_lot02(jsonb);
DROP FUNCTION public.materialiser_occurrences_lot02(date,date);
DROP FUNCTION public.materialiser_occurrences_serveur_lot02(uuid,date,date);
DROP FUNCTION public.modifier_occurrence_lot02(uuid,date,boolean,bigint);
DROP FUNCTION public.preferences_evenement_lot02(uuid,boolean,boolean,boolean,integer,bigint);
DROP FUNCTION public.supprimer_evenement_lot02(uuid,bigint,boolean);
DROP FUNCTION ephemer_lot02.enregistrer(jsonb);
DROP FUNCTION ephemer_lot02.materialiser_client(date,date);
DROP FUNCTION ephemer_lot02.materialiser_serveur(uuid,date,date);
DROP FUNCTION ephemer_lot02.materialiser(uuid,date,date);
DROP FUNCTION ephemer_lot02.modifier_occurrence(uuid,date,boolean,bigint);
DROP FUNCTION ephemer_lot02.preferences(uuid,boolean,boolean,boolean,integer,bigint);
DROP FUNCTION ephemer_lot02.supprimer(uuid,bigint,boolean);
DROP FUNCTION ephemer_lot02.source_cycle_vie();
DROP FUNCTION ephemer_lot02.verifier_lien_alerte();

DROP INDEX public.lot02_notification_palier;
DROP INDEX public.lot02_rappels_occurrence;
ALTER TABLE public.notifications DROP CONSTRAINT lot02_notification_occurrence_owner,
  DROP CONSTRAINT lot02_notification_source, DROP COLUMN occurrence_id, DROP COLUMN occurrence_revision;
ALTER TABLE public.rappels DROP CONSTRAINT lot02_rappel_occurrence_owner,
  DROP CONSTRAINT lot02_rappel_source, DROP COLUMN occurrence_id, DROP COLUMN occurrence_revision;
ALTER TABLE public.notifications ALTER COLUMN contact_id SET NOT NULL;
ALTER TABLE public.rappels ALTER COLUMN contact_id SET NOT NULL;

-- Retirer les dependances dans l'ordre ; un objet ajoute par un autre lot bloque ce rollback.
DROP TRIGGER lot02_verifier_occurrence ON public.occurrences_evenements;
DROP FUNCTION ephemer_lot02.verifier_occurrence();
DROP TABLE public.occurrences_evenements;
DROP TRIGGER lot02_verifier_regle ON public.regles_evenements;
DROP FUNCTION ephemer_lot02.verifier_regle();
DROP TABLE public.regles_evenements;
DROP TABLE public.evenements_personnels;
DROP FUNCTION ephemer_lot02.marquer_utilisation();
ALTER TABLE public.contacts DROP CONSTRAINT lot02_contacts_owner_id;
DROP FUNCTION ephemer_lot02.date_annuelle(integer,integer,integer);
DROP FUNCTION ephemer_lot02.identite();
DROP FUNCTION ephemer_lot02.prenom_cle(text);
DROP TABLE ephemer_lot02.fetes_catalogue; -- reference livree, aucune donnee utilisateur
DROP TABLE ephemer_lot02.etat_schema;
DROP SCHEMA ephemer_lot02;
NOTIFY pgrst, 'reload schema';
COMMIT;
