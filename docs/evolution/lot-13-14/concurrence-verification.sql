BEGIN READ ONLY;
DO $controle$ DECLARE c ephemer_celebrations.cartes_collectives; BEGIN
 IF current_setting('ephemer.recette_collective',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'COPIE requise'; END IF;
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE id='f1300000-0000-4000-8000-000000000002';
 IF c.revision<>9 OR (SELECT count(*) FROM ephemer_celebrations.carte_operations WHERE operation IN ('f1300000-0000-4000-8000-000000000031','f1300000-0000-4000-8000-000000000032'))<>1 THEN RAISE EXCEPTION 'La course n a pas exactement un gagnant'; END IF;
 IF c.phase='ouverte' AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.carte_contributions WHERE carte=c.id AND contenu->>'message'='Édition session A') THEN RAISE EXCEPTION 'Édition gagnante manquante'; END IF;
END $controle$;
SELECT 'un_gagnant_SQL_chevauchement_a_constater_humainement' AS resultat;
ROLLBACK;
