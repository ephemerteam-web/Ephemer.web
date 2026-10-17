// Produit un fichier COMPLET à relire humainement ; n'exécute aucune requête SQL.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const source = readFileSync('docs/sql/email-reliability.sql', 'utf8')
const end = source.indexOf('-- Plafonds proposés')
if (end < 0) throw new Error('Source du journal inattendue')
let core = source.slice(0, end)
core = core.replace('BEGIN;', `BEGIN;
SET LOCAL lock_timeout='3s';
DO $garde$ BEGIN
 IF to_regclass('public.email_jobs') IS NOT NULL OR to_regprocedure('public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb)') IS NOT NULL THEN
  RAISE EXCEPTION 'Journal déjà présent : comparer le catalogue, ne pas réinstaller';
 END IF;
END $garde$;`)
core = core.replace("WHEN 'j7' THEN coalesce(prefs.rappel_j7,true) WHEN 'jourj'", "WHEN 'j7' THEN coalesce(prefs.rappel_j7,true) WHEN 'j3' THEN coalesce(prefs.rappel_j3,true) WHEN 'j1' THEN coalesce(prefs.rappel_j1,false) WHEN 'jourj'")
core = core.replace('CREATE FUNCTION public.claim_email_job', `-- Verrou opérationnel fermé par défaut : installer le journal ne lance aucun email.
CREATE TABLE public.email_delivery_control (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false, collective_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO public.email_delivery_control(singleton) VALUES(true);
ALTER TABLE public.email_delivery_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_delivery_control FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.claim_email_job`)
core = core.replace('  -- Ordre de verrouillage partagé', `  IF NOT coalesce((SELECT enabled FROM public.email_delivery_control WHERE singleton),false) THEN RETURN jsonb_build_object('state','busy'); END IF;
  -- Ordre de verrouillage partagé`)
core = core.replace('BEGIN\n  SELECT * INTO j FROM public.email_jobs WHERE id=p_job_id;', `BEGIN
  IF NOT coalesce((SELECT enabled FROM public.email_delivery_control WHERE singleton),false) THEN RETURN jsonb_build_object('ready',false,'state','busy'); END IF;
  SELECT * INTO j FROM public.email_jobs WHERE id=p_job_id;`)
// La vérification est répétée dans la transaction d'engagement, sous verrou de l'occurrence.
const legacyContact = 'OR r.date_envoi>v_today OR NOT EXISTS(SELECT 1 FROM public.contacts c WHERE c.id=r.contact_id AND c.user_id=j.user_id) THEN'
if (!core.includes(legacyContact)) throw new Error('Contrat du journal source divergent')
core = core.replace(legacyContact, `OR r.date_envoi>v_today
      OR (r.contact_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.contacts c WHERE c.id=r.contact_id AND c.user_id=j.user_id))
      OR (r.contact_id IS NULL AND (r.occurrence_id IS NULL OR r.destinataire<>'moi'))
      OR NOT public.email_occurrence_current(j.rappel_id) THEN`)
// Déclaration avant begin_email_job ; pas de nouvelle autorisation client.
const marker = 'CREATE FUNCTION public.begin_email_job'
core = core.replace(marker, `CREATE FUNCTION public.email_occurrence_current(p_id bigint) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $occ$
DECLARE r public.rappels; o public.occurrences_evenements; e public.evenements_personnels;
BEGIN
 SELECT * INTO r FROM public.rappels WHERE id=p_id;
 IF NOT FOUND THEN RETURN false; END IF;
 IF r.occurrence_id IS NULL THEN
  IF r.source='message_programme' OR r.type_evenement NOT IN ('anniversaire','fete_prenomale') THEN RETURN true; END IF;
  RETURN NOT EXISTS(SELECT 1 FROM public.evenements_personnels x WHERE x.user_id=r.user_id AND x.contact_id IS NOT DISTINCT FROM r.contact_id AND x.type_evenement=r.type_evenement);
 END IF;
 SELECT * INTO o FROM public.occurrences_evenements WHERE id=r.occurrence_id AND user_id=r.user_id FOR SHARE;
 IF NOT FOUND OR o.annulee OR o.revision<>r.occurrence_revision OR o.date_occurrence<>r.event_date THEN RETURN false; END IF;
 SELECT * INTO e FROM public.evenements_personnels WHERE id=o.evenement_id AND user_id=r.user_id FOR SHARE;
 RETURN FOUND AND NOT e.archive AND e.rappels_actifs AND NOT e.choix_a_reconfirmer AND e.contact_id IS NOT DISTINCT FROM r.contact_id
  AND (e.arrete_apres_cycle IS NULL OR o.cycle=0 OR o.cycle<=e.arrete_apres_cycle);
END $occ$;
REVOKE ALL ON FUNCTION public.email_occurrence_current(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.email_occurrence_current(bigint) TO service_role;

${marker}`)
core += `
-- Aucun plafond contacts/rappels ni trigger d'écriture de l'ancien dossier n'est installé ici.
REVOKE ALL ON FUNCTION public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb),
 public.begin_email_job(uuid,uuid),public.finish_email_job(uuid,uuid,text,text),
 public.record_cron_run(text,uuid,date,text,boolean),public.record_email_webhook(text,text,text,timestamptz,uuid),public.my_email_status()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.claim_email_job(text,text,uuid,bigint,uuid[],text[],jsonb,date,jsonb),
 public.begin_email_job(uuid,uuid),public.finish_email_job(uuid,uuid,text,text),
 public.record_cron_run(text,uuid,date,text,boolean),public.record_email_webhook(text,text,text,timestamptz,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.my_email_status() TO authenticated;
COMMIT;
`
mkdirSync('docs/evolution/lot-13-14', { recursive: true })
writeFileSync('docs/evolution/lot-13-14/01-journal.sql', core)
console.log('Dossier journal préparé localement ; aucune installation.')
