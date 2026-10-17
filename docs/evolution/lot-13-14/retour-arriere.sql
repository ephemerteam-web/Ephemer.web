-- Retour fonctionnel HUMAINE, sans DROP et sans réouverture de droits historiques.
-- Arrêter le branchement applicatif/worker avant ce fichier. Garder le webhook de rapprochement.
BEGIN;
SET LOCAL lock_timeout='3s';
SELECT pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
UPDATE public.email_delivery_control SET collective_enabled=false WHERE singleton;
UPDATE ephemer_celebrations.carte_versions SET revoked_at=coalesce(revoked_at,now());
UPDATE ephemer_celebrations.carte_plans SET publication_etat=CASE WHEN publication_etat='programme' THEN 'annule' ELSE publication_etat END,
 email_etat=CASE WHEN email_etat='programme' AND NOT EXISTS(SELECT 1 FROM public.email_jobs j WHERE j.id=job AND j.state IN ('sending','uncertain','review','accepted')) THEN 'annule' ELSE email_etat END;
UPDATE public.email_jobs SET state='cancelled',lease_until=NULL,updated_at=now() WHERE kind='carte' AND state IN ('reserved','retryable') AND first_attempt_at IS NULL;
-- Un email engagé reste incertain/accepté selon son vrai résultat, jamais « annulé » par déduction.
REVOKE ALL ON FUNCTION public.lire_carte_collective(uuid),public.commander_carte_collective(uuid,jsonb),public.exporter_mes_contributions_collectives(uuid),
 public.publier_carte_collective(uuid,uuid,bigint,uuid,uuid,uuid,text,jsonb,integer,uuid),public.consulter_carte_collective(text),
 public.lire_echeances_cartes(integer),public.lire_enveloppe_carte(uuid),public.reserver_email_carte(uuid,jsonb),public.engager_email_carte(uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
-- Conserver RLS, triggers de retrait/effacement et journal jusqu'à résolution des engagements.
-- Le socle rappel/recap/newsletter et les cartes individuelles gardent leurs contrats.
COMMIT;
