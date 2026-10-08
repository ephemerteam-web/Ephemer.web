-- RECETTE MUTANTE : COPIE ISOLEE AUTORISEE seulement, jamais le projet principal.
-- Lire les triggers Auth et neutraliser les prestataires externes avant de commencer.
-- Dans LA MEME session : SET ephemer.lot09_test_isole='CONFIRME_COPIE_ISOLEE_LOT09';
-- Les claims ci-dessous simulent les roles SQL, pas un JWT signe ou une reconnexion reelle.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
 IF current_setting('ephemer.lot09_test_isole',true) IS DISTINCT FROM 'CONFIRME_COPIE_ISOLEE_LOT09' THEN RAISE EXCEPTION 'Recette desactivee : copie isolee autorisee requise'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id IN ('00000000-0000-4000-8000-0000000009a1','00000000-0000-4000-8000-0000000009b2'))
  OR EXISTS(SELECT 1 FROM public.evenements_personnels WHERE id IN ('00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000902'))
  OR EXISTS(SELECT 1 FROM public.cartes_individuelles WHERE id IN ('00000000-0000-4000-8000-000000000911','00000000-0000-4000-8000-000000000912'))
  OR EXISTS(SELECT 1 FROM ephemer_lot08.operations WHERE id IN ('00000000-0000-4000-8000-000000000921','00000000-0000-4000-8000-000000000922','00000000-0000-4000-8000-000000000923','00000000-0000-4000-8000-000000000924','00000000-0000-4000-8000-000000000925'))
  OR EXISTS(SELECT 1 FROM ephemer_lot08.liens WHERE id IN ('00000000-0000-4000-8000-000000000931','00000000-0000-4000-8000-000000000932','00000000-0000-4000-8000-000000000933','00000000-0000-4000-8000-000000000934')) THEN RAISE EXCEPTION 'Fixtures deja presentes : arret'; END IF;
END;
$garde$;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('00000000-0000-4000-8000-0000000009a1','lot09-a@example.invalid','{"prenom":"Fixture A"}'),
 ('00000000-0000-4000-8000-0000000009b2','lot09-b@example.invalid','{"prenom":"Fixture B"}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000009a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000009a1","role":"authenticated"}',true);
SELECT public.enregistrer_evenement_lot02('{"id":"00000000-0000-4000-8000-000000000901","revision":0,"type_evenement":"libre","titre":"Fixture A","date":"2027-04-12"}');
SELECT public.materialiser_occurrences_lot02('2027-01-01','2027-12-31');
SELECT set_config('ephemer.lot08_preparation_a',(public.ouvrir_preparation_lot04((SELECT id FROM public.occurrences_evenements WHERE evenement_id='00000000-0000-4000-8000-000000000901'))).id::text,true);
INSERT INTO public.cartes_individuelles(id,preparation_id) VALUES('00000000-0000-4000-8000-000000000911',current_setting('ephemer.lot08_preparation_a')::uuid);
DO $brouillon$
DECLARE nb integer;
BEGIN
 BEGIN INSERT INTO public.cartes_individuelles(preparation_id) VALUES(current_setting('ephemer.lot08_preparation_a')::uuid); RAISE EXCEPTION 'Doublon preparation'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN UPDATE public.cartes_individuelles SET modele_id='inconnu',revision=2; RAISE EXCEPTION 'Modele inconnu accepte'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.cartes_individuelles SET message=repeat('x',10001),revision=2; RAISE EXCEPTION 'Message trop long'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.cartes_individuelles SET signature=repeat('x',201),revision=2; RAISE EXCEPTION 'Signature trop longue'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.cartes_individuelles SET rendu_version=3,revision=2; RAISE EXCEPTION 'Version inconnue'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.cartes_individuelles SET message='UPDATE aveugle'; RAISE EXCEPTION 'UPDATE aveugle accepte'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN UPDATE public.cartes_individuelles SET preparation_id=gen_random_uuid(),revision=2; RAISE EXCEPTION 'Preparation reassignee'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.versions_cartes(id) VALUES(gen_random_uuid()); RAISE EXCEPTION 'Client publie directement'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.consulter_carte_lot08(repeat('0',64)); RAISE EXCEPTION 'Client appelle lecture privilegiee'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.gerer_partage_carte_lot08('00000000-0000-4000-8000-0000000009a1','00000000-0000-4000-8000-000000000911',1,gen_random_uuid(),'revoquer'); RAISE EXCEPTION 'Client appelle mutation serveur'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM ephemer_lot08.liens; RAISE EXCEPTION 'Client lit secrets'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.cartes_individuelles SET message='Message choisi <script>alert(1)</script>',signature='Signature choisie',revision=2 WHERE id='00000000-0000-4000-8000-000000000911' AND revision=1;
 UPDATE public.cartes_individuelles SET message='Ecrasement',revision=2 WHERE id='00000000-0000-4000-8000-000000000911' AND revision=1;
 GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>0 THEN RAISE EXCEPTION 'Revision perimee ecrasee'; END IF;
END;
$brouillon$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000009b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000009b2","role":"authenticated"}',true);
SELECT public.enregistrer_evenement_lot02('{"id":"00000000-0000-4000-8000-000000000902","revision":0,"type_evenement":"libre","titre":"Fixture B","date":"2027-05-01"}');
SELECT public.materialiser_occurrences_lot02('2027-01-01','2027-12-31');
SELECT set_config('ephemer.lot08_preparation_b',(public.ouvrir_preparation_lot04((SELECT id FROM public.occurrences_evenements WHERE evenement_id='00000000-0000-4000-8000-000000000902'))).id::text,true);
DO $b$
DECLARE nb integer;
BEGIN
 IF EXISTS(SELECT 1 FROM public.cartes_individuelles) OR EXISTS(SELECT 1 FROM public.versions_cartes) THEN RAISE EXCEPTION 'B lit A'; END IF;
 UPDATE public.cartes_individuelles SET message='Vol',revision=3; GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>0 THEN RAISE EXCEPTION 'B modifie A'; END IF;
 DELETE FROM public.cartes_individuelles; GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>0 THEN RAISE EXCEPTION 'B efface A'; END IF;
 BEGIN INSERT INTO public.cartes_individuelles(preparation_id) VALUES(current_setting('ephemer.lot08_preparation_a')::uuid); RAISE EXCEPTION 'B rattache preparation A'; EXCEPTION WHEN foreign_key_violation OR insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.cartes_individuelles(user_id,preparation_id) VALUES('00000000-0000-4000-8000-0000000009a1',current_setting('ephemer.lot08_preparation_a')::uuid); RAISE EXCEPTION 'B usurpe A'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$b$;
INSERT INTO public.cartes_individuelles(id,preparation_id) VALUES('00000000-0000-4000-8000-000000000912',current_setting('ephemer.lot08_preparation_b')::uuid);
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
DO $anon$
BEGIN
 BEGIN PERFORM 1 FROM public.cartes_individuelles; RAISE EXCEPTION 'Anon lit brouillon'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.versions_cartes; RAISE EXCEPTION 'Anon enumere versions'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.cartes_individuelles(id) VALUES(gen_random_uuid()); RAISE EXCEPTION 'Anon cree'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.cartes_individuelles SET revision=2; RAISE EXCEPTION 'Anon modifie'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.cartes_individuelles; RAISE EXCEPTION 'Anon supprime'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM ephemer_lot08.liens; RAISE EXCEPTION 'Anon lit secret'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.consulter_carte_lot08(repeat('0',64)); RAISE EXCEPTION 'Anon appelle RPC serveur'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.lire_partage_carte_lot08('00000000-0000-4000-8000-0000000009a1','00000000-0000-4000-8000-000000000911',true); RAISE EXCEPTION 'Anon recupere lien'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.exporter_liens_cartes_lot08('00000000-0000-4000-8000-0000000009a1'); RAISE EXCEPTION 'Anon exporte'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$anon$;
RESET ROLE;
SET LOCAL ROLE service_role;
-- Empreintes/chiffres factices : test du contrat SQL, pas des primitives cryptographiques Node.
DO $publication$
DECLARE result jsonb; again jsonb; payload jsonb; export_row jsonb;
 a uuid:='00000000-0000-4000-8000-0000000009a1'; c uuid:='00000000-0000-4000-8000-000000000911';
BEGIN
 IF public.consulter_carte_lot08(repeat('1',64)) IS NOT NULL THEN RAISE EXCEPTION 'Brouillon lisible'; END IF;
 BEGIN PERFORM public.lire_partage_carte_lot08('00000000-0000-4000-8000-0000000009b2',c,true); RAISE EXCEPTION 'Proprietaire non controle'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.gerer_partage_carte_lot08(a,'00000000-0000-4000-8000-000000000912',1,gen_random_uuid(),'revoquer'); RAISE EXCEPTION 'Mutation carte etrangere'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.gerer_partage_carte_lot08('00000000-0000-4000-8000-0000000009b2','00000000-0000-4000-8000-000000000912',1,gen_random_uuid(),'publier',30,gen_random_uuid(),repeat('9',64),repeat('0',64),repeat('9',24),repeat('0',32)); RAISE EXCEPTION 'Publication vide'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN PERFORM public.gerer_partage_carte_lot08(a,c,2,gen_random_uuid(),'publier',0); RAISE EXCEPTION 'Duree inconnue'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 result:=public.gerer_partage_carte_lot08(a,c,2,'00000000-0000-4000-8000-000000000921','publier',30,'00000000-0000-4000-8000-000000000931',repeat('1',64),repeat('0',64),repeat('1',24),repeat('0',32));
 again:=public.gerer_partage_carte_lot08(a,c,2,'00000000-0000-4000-8000-000000000921','publier',30);
 IF result<>again OR (SELECT count(*) FROM public.versions_cartes WHERE carte_id=c)<>1 THEN RAISE EXCEPTION 'Retry duplique publication'; END IF;
 BEGIN PERFORM public.gerer_partage_carte_lot08(a,c,2,'00000000-0000-4000-8000-000000000921','publier',7); RAISE EXCEPTION 'UUID reutilise avec autre demande'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.gerer_partage_carte_lot08(a,c,2,gen_random_uuid(),'revoquer'); RAISE EXCEPTION 'Revision perimee accepte'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 payload:=public.consulter_carte_lot08(repeat('1',64));
 IF payload->'content'->>'message'<>'Message choisi <script>alert(1)</script>' OR payload->'content'->>'signature'<>'Signature choisie'
  OR (SELECT count(*) FROM jsonb_object_keys(payload))<>2 OR (SELECT count(*) FROM jsonb_object_keys(payload->'content'))<>6 THEN RAISE EXCEPTION 'Projection publiee divergente'; END IF;
 IF public.lire_partage_carte_lot08(a,c)->>'state'<>'actif' OR public.lire_partage_carte_lot08(a,c) ? 'encryptedSecret'
  OR NOT (public.lire_partage_carte_lot08(a,c,true) ? 'encryptedSecret') THEN RAISE EXCEPTION 'Recuperation/status divergent'; END IF;
 SELECT to_jsonb(e) INTO export_row FROM public.exporter_liens_cartes_lot08(a,NULL,1) e;
 IF (SELECT count(*) FROM jsonb_object_keys(export_row))<>6 OR export_row ?| ARRAY['empreinte','secret_chiffre','nonce','tag'] THEN RAISE EXCEPTION 'Export contient secret'; END IF;
 BEGIN PERFORM public.exporter_liens_cartes_lot08(a,NULL,201); RAISE EXCEPTION 'Export non borne'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 -- Collision de nonce : la transaction echoue et ne revoque pas le droit precedent.
 BEGIN PERFORM public.gerer_partage_carte_lot08(a,c,3,gen_random_uuid(),'remplacer',30,gen_random_uuid(),repeat('2',64),repeat('0',64),repeat('1',24),repeat('0',32)); RAISE EXCEPTION 'Nonce duplique'; EXCEPTION WHEN unique_violation THEN NULL; END;
 IF public.consulter_carte_lot08(repeat('1',64)) IS NULL OR (SELECT revision FROM public.cartes_individuelles WHERE id=c)<>3 THEN RAISE EXCEPTION 'Echec non atomique'; END IF;
END;
$publication$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000009a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000009a1","role":"authenticated"}',true);
UPDATE public.cartes_individuelles SET message='Nouveau brouillon prive',signature='Autre signature',modele_id='aurore',revision=4 WHERE id='00000000-0000-4000-8000-000000000911' AND revision=3;
DO $version$
BEGIN
 IF (SELECT contenu->>'signature' FROM public.versions_cartes WHERE carte_id='00000000-0000-4000-8000-000000000911')<>'Signature choisie' THEN RAISE EXCEPTION 'Signature modifiee retroactivement'; END IF;
 BEGIN UPDATE public.versions_cartes SET contenu='{}'; RAISE EXCEPTION 'Client modifie version'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$version$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000009b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000009b2","role":"authenticated"}',true);
DO $version_b$ BEGIN IF EXISTS(SELECT 1 FROM public.versions_cartes) THEN RAISE EXCEPTION 'B lit versions A'; END IF; END; $version_b$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $cycles$
DECLARE a uuid:='00000000-0000-4000-8000-0000000009a1'; c uuid:='00000000-0000-4000-8000-000000000911';
BEGIN
 IF public.consulter_carte_lot08(repeat('1',64))->'content'->>'message'<>'Message choisi <script>alert(1)</script>' THEN RAISE EXCEPTION 'Brouillon remplace publication'; END IF;
 PERFORM public.gerer_partage_carte_lot08(a,c,4,'00000000-0000-4000-8000-000000000922','remplacer',7,'00000000-0000-4000-8000-000000000932',repeat('2',64),repeat('0',64),repeat('2',24),repeat('0',32));
 IF public.consulter_carte_lot08(repeat('1',64)) IS NOT NULL OR public.consulter_carte_lot08(repeat('2',64))->'content'->>'signature'<>'Signature choisie'
  OR (SELECT count(*) FROM public.versions_cartes WHERE carte_id=c)<>1 THEN RAISE EXCEPTION 'Remplacement non fige'; END IF;
 PERFORM public.gerer_partage_carte_lot08(a,c,5,'00000000-0000-4000-8000-000000000923','publier',90,'00000000-0000-4000-8000-000000000933',repeat('3',64),repeat('0',64),repeat('3',24),repeat('0',32));
 IF public.consulter_carte_lot08(repeat('2',64)) IS NOT NULL OR public.consulter_carte_lot08(repeat('3',64))->'content'->>'message'<>'Nouveau brouillon prive'
  OR (SELECT count(*) FROM public.versions_cartes WHERE carte_id=c)<>2 THEN RAISE EXCEPTION 'Republication divergente'; END IF;
 PERFORM public.gerer_partage_carte_lot08(a,c,6,'00000000-0000-4000-8000-000000000924','revoquer');
 PERFORM public.gerer_partage_carte_lot08(a,c,6,'00000000-0000-4000-8000-000000000924','revoquer');
 IF public.consulter_carte_lot08(repeat('3',64)) IS NOT NULL OR public.lire_partage_carte_lot08(a,c,true) ? 'encryptedSecret'
  OR (SELECT revision FROM public.cartes_individuelles WHERE id=c)<>7 THEN RAISE EXCEPTION 'Revocation/retry divergent'; END IF;
 PERFORM public.gerer_partage_carte_lot08(a,c,7,'00000000-0000-4000-8000-000000000925','remplacer',365,'00000000-0000-4000-8000-000000000934',repeat('4',64),repeat('0',64),repeat('4',24),repeat('0',32));
END;
$cycles$;
RESET ROLE;
-- Horloge de fixture seulement ; ne jamais modifier un vrai droit pour tester une expiration.
UPDATE ephemer_lot08.liens SET expires_at=clock_timestamp() WHERE id='00000000-0000-4000-8000-000000000934';
DO $immuable$
BEGIN
 BEGIN UPDATE public.versions_cartes SET contenu=contenu WHERE carte_id='00000000-0000-4000-8000-000000000911'; RAISE EXCEPTION 'Version mutable meme sous role privilegie'; EXCEPTION WHEN check_violation THEN NULL; END;
END;
$immuable$;
SET LOCAL ROLE service_role;
DO $expiration$
BEGIN
 IF public.consulter_carte_lot08(repeat('4',64)) IS NOT NULL OR public.consulter_carte_lot08(repeat('f',64)) IS NOT NULL
  OR public.lire_partage_carte_lot08('00000000-0000-4000-8000-0000000009a1','00000000-0000-4000-8000-000000000911',true)->>'state'<>'expire'
  OR public.lire_partage_carte_lot08('00000000-0000-4000-8000-0000000009a1','00000000-0000-4000-8000-000000000911',true) ? 'encryptedSecret' THEN RAISE EXCEPTION 'Expiration non appliquee'; END IF;
END;
$expiration$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000009a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000009a1","role":"authenticated"}',true);
DO $reprise$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.cartes_individuelles WHERE id='00000000-0000-4000-8000-000000000911' AND message='Nouveau brouillon prive' AND revision=8)
  OR (SELECT count(*) FROM public.versions_cartes)<>2 THEN RAISE EXCEPTION 'Reprise sous A perdue'; END IF;
END;
$reprise$;
-- Bloc utilise par verification.sql ; ne pas executer separement.
-- Les donnees/chiffrements ci-dessous sont fictifs, aucun secret de partage utilisable.
SELECT set_config('ephemer.lot09_avatar','{"format":1,"catalogVersion":1,"renderVersion":1,"faceId":"ovale","skinId":"miel","hairId":"court","hairColorId":"nuit","clothingId":"pull","clothingColorId":"indigo","accessoryId":"aucun"}',true);
SELECT set_config('ephemer.lot09_version_v1',(SELECT contenu::text FROM public.versions_cartes WHERE carte_id='00000000-0000-4000-8000-000000000911' AND revision_publication=3),true);
INSERT INTO public.avatars_utilisateurs(user_id,configuration) VALUES('00000000-0000-4000-8000-0000000009a1',current_setting('ephemer.lot09_avatar')::jsonb);
DO $avatar_a$
DECLARE nb integer;
BEGIN
 BEGIN UPDATE public.avatars_utilisateurs SET configuration=configuration||'{"hairId":"<svg/>"}',revision=2; RAISE EXCEPTION 'Markup accepte'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.avatars_utilisateurs SET configuration=configuration||'{"faceId":["ovale"]}',revision=2; RAISE EXCEPTION 'Type accepte'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.avatars_utilisateurs SET configuration=configuration||'{"profil":{"email":"prive@example.invalid"}}',revision=2; RAISE EXCEPTION 'Profil accepte'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.avatars_utilisateurs SET configuration=configuration; RAISE EXCEPTION 'UPDATE aveugle accepte'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN UPDATE public.avatars_utilisateurs SET user_id='00000000-0000-4000-8000-0000000009b2',revision=2; RAISE EXCEPTION 'Identite mutable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.publier_carte_lot09(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL); RAISE EXCEPTION 'Client appelle publication'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.cartes_individuelles SET rendu_version=2,avatar_signature=current_setting('ephemer.lot09_avatar')::jsonb,revision=9
  WHERE id='00000000-0000-4000-8000-000000000911' AND revision=8;
 GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>1 THEN RAISE EXCEPTION 'Preparation du brouillon V2 echouee'; END IF;
 BEGIN UPDATE public.cartes_individuelles SET rendu_version=1,revision=10 WHERE id='00000000-0000-4000-8000-000000000911'; RAISE EXCEPTION 'Avatar V1 accepte'; EXCEPTION WHEN check_violation THEN NULL; END;
END;
$avatar_a$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $anon09$
BEGIN
 BEGIN PERFORM 1 FROM public.avatars_utilisateurs; RAISE EXCEPTION 'Anon lit avatars'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.publier_carte_lot09(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL); RAISE EXCEPTION 'Anon publie'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$anon09$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000009b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000009b2","role":"authenticated"}',true);
DO $avatar_b$
DECLARE nb integer;
BEGIN
 IF EXISTS(SELECT 1 FROM public.avatars_utilisateurs) THEN RAISE EXCEPTION 'B lit avatar A'; END IF;
 UPDATE public.avatars_utilisateurs SET configuration=current_setting('ephemer.lot09_avatar')::jsonb,revision=2; GET DIAGNOSTICS nb=ROW_COUNT;
 IF nb<>0 THEN RAISE EXCEPTION 'B modifie A'; END IF;
 DELETE FROM public.avatars_utilisateurs; GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>0 THEN RAISE EXCEPTION 'B efface A'; END IF;
 BEGIN INSERT INTO public.avatars_utilisateurs(user_id,configuration) VALUES('00000000-0000-4000-8000-0000000009a1',current_setting('ephemer.lot09_avatar')::jsonb); RAISE EXCEPTION 'B usurpe A'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$avatar_b$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $publication09$
DECLARE a uuid:='00000000-0000-4000-8000-0000000009a1'; c uuid:='00000000-0000-4000-8000-000000000911'; r jsonb; retry jsonb; lecture jsonb;
BEGIN
 r:=public.publier_carte_lot09(a,c,9,'00000000-0000-4000-8000-000000000941',30,'00000000-0000-4000-8000-000000000951',repeat('5',64),repeat('0',64),repeat('5',24),repeat('0',32));
 retry:=public.publier_carte_lot09(a,c,9,'00000000-0000-4000-8000-000000000941',30,gen_random_uuid(),repeat('6',64),repeat('0',64),repeat('6',24),repeat('0',32));
 IF retry IS DISTINCT FROM r OR (SELECT revision FROM public.cartes_individuelles WHERE id=c)<>10 THEN RAISE EXCEPTION 'Retry publication divergent'; END IF;
 lecture:=public.consulter_carte_lot08(repeat('5',64));
 IF lecture->'content'->'avatar' IS DISTINCT FROM current_setting('ephemer.lot09_avatar')::jsonb
  OR lecture->'content'->'format' IS DISTINCT FROM '2'::jsonb OR (SELECT count(*) FROM jsonb_object_keys(lecture))<>2
  OR (SELECT count(*) FROM jsonb_object_keys(lecture->'content'))<>7 OR NOT ephemer_lot09.snapshot_valide(lecture->'content')
  OR (SELECT contenu FROM public.versions_cartes WHERE carte_id=c AND revision_publication=3) IS DISTINCT FROM current_setting('ephemer.lot09_version_v1')::jsonb THEN
  RAISE EXCEPTION 'Projection/stabilite V1/V2 divergente';
 END IF;
 BEGIN PERFORM public.publier_carte_lot09(a,c,9,gen_random_uuid(),30,gen_random_uuid(),repeat('6',64),repeat('0',64),repeat('6',24),repeat('0',32)); RAISE EXCEPTION 'Revision perimee acceptee'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.gerer_partage_carte_lot08(a,c,10,gen_random_uuid(),'publier',30,gen_random_uuid(),repeat('6',64),repeat('0',64),repeat('6',24),repeat('0',32)); RAISE EXCEPTION 'Ancienne RPC publie V2'; EXCEPTION WHEN check_violation THEN NULL; END;
END;
$publication09$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000009a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000009a1","role":"authenticated"}',true);
UPDATE public.avatars_utilisateurs SET configuration=configuration||'{"accessoryId":"lune"}',revision=2 WHERE user_id='00000000-0000-4000-8000-0000000009a1' AND revision=1;
DO $conflit09$
DECLARE nb integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.avatars_utilisateurs WHERE user_id='00000000-0000-4000-8000-0000000009a1' AND revision=2 AND configuration->>'accessoryId'='lune') THEN RAISE EXCEPTION 'Modification profil non appliquee'; END IF;
 UPDATE public.avatars_utilisateurs SET configuration=current_setting('ephemer.lot09_avatar')::jsonb,revision=2 WHERE user_id='00000000-0000-4000-8000-0000000009a1' AND revision=1;
 GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>0 THEN RAISE EXCEPTION 'Ancienne revision ecrasee'; END IF;
END;
$conflit09$;
UPDATE public.cartes_individuelles SET avatar_signature=NULL,message='Autre brouillon',revision=11 WHERE id='00000000-0000-4000-8000-000000000911' AND revision=10;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $stabilite09$
DECLARE a uuid:='00000000-0000-4000-8000-0000000009a1'; c uuid:='00000000-0000-4000-8000-000000000911';
BEGIN
 IF public.consulter_carte_lot08(repeat('5',64))->'content'->'avatar' IS DISTINCT FROM current_setting('ephemer.lot09_avatar')::jsonb THEN RAISE EXCEPTION 'Profil/brouillon change publication'; END IF;
 PERFORM public.publier_carte_lot09(a,c,11,'00000000-0000-4000-8000-000000000942',7,'00000000-0000-4000-8000-000000000952',repeat('6',64),repeat('0',64),repeat('6',24),repeat('0',32));
 IF public.consulter_carte_lot08(repeat('5',64)) IS NOT NULL OR public.consulter_carte_lot08(repeat('6',64))->'content'->'avatar' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'Republication/removal divergent'; END IF;
 PERFORM public.gerer_partage_carte_lot08(a,c,12,gen_random_uuid(),'remplacer',90,'00000000-0000-4000-8000-000000000953',repeat('7',64),repeat('0',64),repeat('7',24),repeat('0',32));
 IF public.consulter_carte_lot08(repeat('6',64)) IS NOT NULL OR public.consulter_carte_lot08(repeat('7',64))->'content'->'avatar' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'Rotation V2 divergente'; END IF;
 PERFORM public.gerer_partage_carte_lot08(a,c,13,gen_random_uuid(),'revoquer');
 PERFORM public.publier_carte_lot09(a,c,11,'00000000-0000-4000-8000-000000000942',7,gen_random_uuid(),repeat('8',64),repeat('0',64),repeat('8',24),repeat('0',32));
 IF public.consulter_carte_lot08(repeat('7',64)) IS NOT NULL OR public.consulter_carte_lot08(repeat('8',64)) IS NOT NULL
  OR (SELECT revision FROM public.cartes_individuelles WHERE id=c)<>14 THEN RAISE EXCEPTION 'Retry reactive un ancien droit'; END IF;
END;
$stabilite09$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000009a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000009a1","role":"authenticated"}',true);

DELETE FROM public.preparations_evenements WHERE id=current_setting('ephemer.lot08_preparation_a')::uuid;
RESET ROLE;
DO $cascade$
BEGIN
 IF EXISTS(SELECT 1 FROM public.cartes_individuelles WHERE user_id='00000000-0000-4000-8000-0000000009a1')
  OR EXISTS(SELECT 1 FROM public.versions_cartes WHERE user_id='00000000-0000-4000-8000-0000000009a1')
  OR EXISTS(SELECT 1 FROM ephemer_lot08.liens WHERE user_id='00000000-0000-4000-8000-0000000009a1')
  OR EXISTS(SELECT 1 FROM ephemer_lot08.operations WHERE user_id='00000000-0000-4000-8000-0000000009a1') THEN RAISE EXCEPTION 'Cascade preparation incomplete'; END IF;
END;
$cascade$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000009b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000009b2","role":"authenticated"}',true);
UPDATE public.cartes_individuelles SET message='Carte B avant suppression Auth',revision=2 WHERE id='00000000-0000-4000-8000-000000000912' AND revision=1;
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT public.gerer_partage_carte_lot08('00000000-0000-4000-8000-0000000009b2','00000000-0000-4000-8000-000000000912',2,gen_random_uuid(),'publier',30,gen_random_uuid(),repeat('b',64),repeat('0',64),repeat('b',24),repeat('0',32));
RESET ROLE;
DELETE FROM auth.users WHERE id IN ('00000000-0000-4000-8000-0000000009a1','00000000-0000-4000-8000-0000000009b2');
DO $auth$
BEGIN
 IF EXISTS(SELECT 1 FROM public.cartes_individuelles WHERE user_id IN ('00000000-0000-4000-8000-0000000009a1','00000000-0000-4000-8000-0000000009b2'))
  OR EXISTS(SELECT 1 FROM public.versions_cartes WHERE user_id IN ('00000000-0000-4000-8000-0000000009a1','00000000-0000-4000-8000-0000000009b2'))
  OR EXISTS(SELECT 1 FROM ephemer_lot08.liens WHERE user_id IN ('00000000-0000-4000-8000-0000000009a1','00000000-0000-4000-8000-0000000009b2'))
  OR EXISTS(SELECT 1 FROM ephemer_lot08.operations WHERE user_id IN ('00000000-0000-4000-8000-0000000009a1','00000000-0000-4000-8000-0000000009b2'))
  OR public.consulter_carte_lot08(repeat('b',64)) IS NOT NULL THEN RAISE EXCEPTION 'Cascade Auth incomplete'; END IF;
END;
$auth$;
DO $cascade_avatar09$
BEGIN
 IF EXISTS(SELECT 1 FROM public.avatars_utilisateurs WHERE user_id IN ('00000000-0000-4000-8000-0000000009a1','00000000-0000-4000-8000-0000000009b2')) THEN RAISE EXCEPTION 'Cascade avatar Auth incomplete'; END IF;
END;
$cascade_avatar09$;
SELECT 'lot09_recette_isolee_conforme' AS controle;
ROLLBACK;
-- Deux connexions, vraie reconnexion, crypto/HTTP et suppression de contact : protocole dans README.
