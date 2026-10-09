-- Humain seulement, après sauvegarde. Refus dès qu'une donnée 10B existe.
-- Ne retire aucune relation, association, notification, avatar ou donnée 10A.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_setting('ephemer.lot10b_retour_vide',true) IS DISTINCT FROM 'CONFIRME_RETOUR_SANS_DONNEES_10B' THEN
    RAISE EXCEPTION 'Retour désactivé : validation humaine requise'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
  LOCK TABLE ephemer_social.univers_utilisateurs,ephemer_social.operations_univers IN ACCESS EXCLUSIVE MODE;
  IF EXISTS(SELECT 1 FROM ephemer_social.univers_utilisateurs) OR EXISTS(SELECT 1 FROM ephemer_social.operations_univers) THEN
    RAISE EXCEPTION 'Données 10B présentes : retour refusé, sauvegarder et préparer une procédure sans perte'; END IF;
END;
$garde$;
CREATE OR REPLACE FUNCTION ephemer_social.identite(v uuid) RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT coalesce(nullif(left(btrim(p.prenom),80),''),'Une etoile')
    FROM (SELECT 1) x LEFT JOIN public.profiles p ON p.id=v;
$fn$;
REVOKE ALL ON FUNCTION ephemer_social.identite(uuid) FROM PUBLIC,anon,authenticated,service_role;
DROP FUNCTION public.lire_mon_univers();
DROP FUNCTION public.consulter_univers_etoile(uuid);
DROP FUNCTION public.commander_mon_univers(text,jsonb,bigint,uuid);
DROP FUNCTION ephemer_social.univers_lire(uuid);
DROP FUNCTION ephemer_social.univers_commander(text,jsonb,bigint,uuid);
DROP TABLE ephemer_social.operations_univers;
DROP TABLE ephemer_social.univers_utilisateurs;
DROP FUNCTION ephemer_social.partage_univers_valide(jsonb,jsonb);
DROP FUNCTION ephemer_social.valeurs_univers_valides(jsonb);
NOTIFY pgrst,'reload schema';
COMMIT;
