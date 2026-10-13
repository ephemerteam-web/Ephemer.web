-- Fermeture humaine sans perte de données. Désactiver CELEBRATIONS_ENABLED d'abord.
-- Conserver le schéma et ses triggers de révocation ; aucune dette, source ou contenu privé effacé.
BEGIN;
REVOKE ALL ON FUNCTION public.commander_celebrations(text,jsonb,uuid),public.lire_celebration(uuid),
 public.lire_celebrations(uuid,integer),public.lire_invitations_celebrations(uuid,integer),public.exporter_celebrations(uuid,integer),
 public.preparer_effacement_celebrations() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ephemer_celebrations FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA ephemer_celebrations FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SCHEMA ephemer_celebrations FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
