-- Humain seulement. Retour possible UNIQUEMENT avant creation de toute donnee sociale.
-- Aucun CASCADE, aucune restauration des droits de est_contact_lie.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
DECLARE t record; contient boolean;
BEGIN
  IF current_setting('ephemer.lot10a_retour_vide',true) IS DISTINCT FROM 'CONFIRME_RETOUR_SANS_DONNEES_10A' THEN
    RAISE EXCEPTION 'Retour desactive : validation humaine requise'; END IF;
  IF to_regnamespace('ephemer_social') IS NULL THEN RAISE EXCEPTION 'Lot absent'; END IF;
  FOR t IN SELECT schemaname,tablename FROM pg_tables WHERE schemaname='ephemer_social'
    OR (schemaname='public' AND tablename='notifications_etoiles') ORDER BY schemaname,tablename LOOP
    EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',t.schemaname,t.tablename);
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I)',t.schemaname,t.tablename) INTO contient;
    IF contient THEN RAISE EXCEPTION 'Retour refuse : donnees presentes, preserver blocages/retraits et sauvegarder'; END IF;
  END LOOP;
END;
$garde$;
DROP FUNCTION public.reconnaitre_etoiles(bigint,integer);
DROP FUNCTION public.commander_etoiles(text,jsonb,uuid);
DROP FUNCTION public.lire_etoiles(text,uuid,integer);
DROP FUNCTION public.lire_associations_etoiles(bigint,integer);
DROP FUNCTION public.exporter_etoiles(text,text,integer);
DROP FUNCTION ephemer_social.reconnaitre(bigint,integer);
DROP FUNCTION ephemer_social.commander(text,jsonb,uuid);
DROP FUNCTION ephemer_social.lire(text,uuid,integer);
DROP FUNCTION ephemer_social.lire_associations(bigint,integer);
DROP FUNCTION ephemer_social.exporter(text,text,integer);
DROP FUNCTION ephemer_social.demander(uuid,text,uuid);
DROP FUNCTION ephemer_social.activer(uuid,uuid,text);
DROP FUNCTION ephemer_social.preparer_reception(uuid);
DROP FUNCTION ephemer_social.associer_contacts(uuid,uuid);
DROP FUNCTION ephemer_social.bloquee(uuid,uuid);
DROP FUNCTION ephemer_social.identite(uuid);
DROP FUNCTION ephemer_social.acteur();
DROP FUNCTION ephemer_social.normaliser_email(text);
DROP TABLE public.notifications_etoiles;
DROP TABLE ephemer_social.contacts_etoiles;
DROP TABLE ephemer_social.blocages_etoiles;
DROP TABLE ephemer_social.operations_etoiles;
DROP TABLE ephemer_social.quotas_demandes;
DROP TABLE ephemer_social.liens_etoiles;
DROP TABLE ephemer_social.demandes_etoiles;
DROP TABLE ephemer_social.relations_etoiles;
DROP INDEX public.lot10a_contacts_email;
DROP SCHEMA ephemer_social;
NOTIFY pgrst,'reload schema';
COMMIT;
