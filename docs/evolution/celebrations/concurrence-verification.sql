BEGIN READ ONLY;
DO $tests$ BEGIN
 IF current_setting('ephemer.recette_celebrations',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'Copie autorisee requise'; END IF;
 IF (SELECT count(*) FROM ephemer_celebrations.participations WHERE celebration='52000000-0000-4000-8000-000000000001' AND compte='51000000-0000-4000-8000-000000000002' AND etat='active')<>1 THEN RAISE EXCEPTION 'Acceptation non unique'; END IF;
 IF (SELECT count(*) FROM ephemer_celebrations.taches WHERE id='57000000-0000-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Tache non unique'; END IF;
 IF NOT EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations WHERE id='52000000-0000-4000-8000-000000000003' AND etat='supprimee' AND revision=2) THEN RAISE EXCEPTION 'Suppression rejouee incorrecte'; END IF;
 IF NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration='52000000-0000-4000-8000-000000000004' AND compte='51000000-0000-4000-8000-000000000003' AND role='organisateur' AND etat='active') THEN RAISE EXCEPTION 'Transfert non confirme'; END IF;
 IF EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations e WHERE e.etat='active' AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations m WHERE m.celebration=e.id AND m.role='organisateur' AND m.etat='active' AND (NOT e.surprise OR m.compte IS DISTINCT FROM e.destinataire))) THEN RAISE EXCEPTION 'Celebration active sans responsable autorise'; END IF;
END $tests$;
SELECT 'celebrations_concurrence_cinq_courses_ok' AS resultat;
COMMIT;
