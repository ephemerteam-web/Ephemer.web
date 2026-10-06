-- Lot 06 : RECETTE MUTANTE, uniquement sur COPIE ISOLEE AUTORISEE.
-- Lire les triggers Auth/contacts avant execution. ROLLBACK ne neutralise pas un prestataire externe.
-- Dans la MEME session : SET ephemer.lot06_test_isole='CONFIRME_COPIE_ISOLEE_LOT06';
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
 IF current_setting('ephemer.lot06_test_isole',true) IS DISTINCT FROM 'CONFIRME_COPIE_ISOLEE_LOT06' THEN RAISE EXCEPTION 'Recette desactivee : copie isolee autorisee requise'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id IN ('00000000-0000-4000-8000-0000000006a1','00000000-0000-4000-8000-0000000006b2')) OR EXISTS(SELECT 1 FROM public.contacts WHERE id IN (-60001,-60002)) THEN RAISE EXCEPTION 'Fixtures deja presentes : arret'; END IF;
END;
$garde$;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('00000000-0000-4000-8000-0000000006a1','lot06-a@example.invalid','{"prenom":"Test A"}'),('00000000-0000-4000-8000-0000000006b2','lot06-b@example.invalid','{"prenom":"Test B"}');
INSERT INTO public.contacts(id,user_id,prenom) VALUES (-60001,'00000000-0000-4000-8000-0000000006a1','Fixture A'),(-60002,'00000000-0000-4000-8000-0000000006b2','Fixture B');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000006a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000006a1","role":"authenticated"}',true);

INSERT INTO public.styles_messages(id,nom,ton,signature) VALUES ('00000000-0000-4000-8000-000000000611','Court','familier','Signature locale');
-- Retry reseau : meme UUID, aucun doublon et aucune modification silencieuse.
INSERT INTO public.styles_messages(id,nom,ton) VALUES ('00000000-0000-4000-8000-000000000611','Autre','formel') ON CONFLICT(id) DO NOTHING;
INSERT INTO public.preferences_styles_messages(id,style_id) VALUES ('00000000-0000-4000-8000-000000000612','00000000-0000-4000-8000-000000000611');
INSERT INTO public.styles_messages_contacts(id,contact_id,style_id) VALUES ('00000000-0000-4000-8000-000000000613',-60001,'00000000-0000-4000-8000-000000000611');
DO $options$
BEGIN
 IF (SELECT count(*) FROM public.styles_messages)<>1 OR (SELECT signature FROM public.styles_messages)<>'Signature locale' THEN RAISE EXCEPTION 'Retry divergent'; END IF;
 BEGIN INSERT INTO public.styles_messages(nom,ton) VALUES ('Invalide','inconnu'); RAISE EXCEPTION 'Ton inconnu accepte'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.styles_messages(nom,ton,longueur) VALUES ('Invalide','formel','illimitee'); RAISE EXCEPTION 'Longueur acceptee'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.styles_messages(nom,ton,adresse) VALUES ('Invalide','formel','autre'); RAISE EXCEPTION 'Adresse acceptee'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.styles_messages(nom,ton,signature) VALUES ('Invalide','formel',repeat('x',201)); RAISE EXCEPTION 'Signature trop longue'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.preferences_styles_messages(style_id) VALUES ('00000000-0000-4000-8000-000000000611'); RAISE EXCEPTION 'Deux defaults'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN INSERT INTO public.styles_messages_contacts(contact_id,style_id) VALUES (-60001,'00000000-0000-4000-8000-000000000611'); RAISE EXCEPTION 'Deux affectations'; EXCEPTION WHEN unique_violation THEN NULL; END;
END;
$options$;
UPDATE public.styles_messages SET nom='Modifie',revision=2 WHERE id='00000000-0000-4000-8000-000000000611' AND revision=1;
DO $revision$
DECLARE nb int;
BEGIN
 IF (SELECT revision FROM public.styles_messages WHERE id='00000000-0000-4000-8000-000000000611')<>2 THEN RAISE EXCEPTION 'Revision non avancee'; END IF;
 UPDATE public.styles_messages SET nom='Modifie',revision=2 WHERE id='00000000-0000-4000-8000-000000000611' AND revision=1;
 GET DIAGNOSTICS nb=ROW_COUNT;
 IF nb<>0 THEN RAISE EXCEPTION 'Revision perimee ecrasee'; END IF;
 BEGIN UPDATE public.styles_messages SET nom='Modifie' WHERE id='00000000-0000-4000-8000-000000000611'; RAISE EXCEPTION 'UPDATE aveugle accepte'; EXCEPTION WHEN serialization_failure THEN NULL; END;
END;
$revision$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000006b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000006b2","role":"authenticated"}',true);

DO $compte_b$
DECLARE nb int;
BEGIN
 IF EXISTS(SELECT 1 FROM public.styles_messages) THEN RAISE EXCEPTION 'B lit A : styles_messages'; END IF;
 DELETE FROM public.styles_messages; GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>0 THEN RAISE EXCEPTION 'B supprime A'; END IF;
 IF EXISTS(SELECT 1 FROM public.preferences_styles_messages) THEN RAISE EXCEPTION 'B lit A : preferences_styles_messages'; END IF;
 DELETE FROM public.preferences_styles_messages; GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>0 THEN RAISE EXCEPTION 'B supprime A'; END IF;
 IF EXISTS(SELECT 1 FROM public.styles_messages_contacts) THEN RAISE EXCEPTION 'B lit A : styles_messages_contacts'; END IF;
 DELETE FROM public.styles_messages_contacts; GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>0 THEN RAISE EXCEPTION 'B supprime A'; END IF;
 UPDATE public.styles_messages SET nom='Modifie',revision=3 WHERE id='00000000-0000-4000-8000-000000000611'; GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>0 THEN RAISE EXCEPTION 'B modifie A'; END IF;
 BEGIN INSERT INTO public.preferences_styles_messages(style_id) VALUES ('00000000-0000-4000-8000-000000000611'); RAISE EXCEPTION 'Style etranger'; EXCEPTION WHEN foreign_key_violation OR insufficient_privilege THEN NULL; END;
 INSERT INTO public.styles_messages(id,nom,ton) VALUES ('00000000-0000-4000-8000-000000000621','Style B','formel');
 BEGIN INSERT INTO public.styles_messages_contacts(contact_id,style_id) VALUES (-60001,'00000000-0000-4000-8000-000000000621'); RAISE EXCEPTION 'Contact etranger'; EXCEPTION WHEN foreign_key_violation OR insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.styles_messages(user_id,nom,ton) VALUES ('00000000-0000-4000-8000-0000000006a1','Usurpation','familier'); RAISE EXCEPTION 'Proprietaire falsifie'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$compte_b$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
DO $anon$
BEGIN
 BEGIN PERFORM 1 FROM public.styles_messages; RAISE EXCEPTION 'Anon lit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.styles_messages; RAISE EXCEPTION 'Anon supprime'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.styles_messages SET revision=2; RAISE EXCEPTION 'Anon modifie'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.styles_messages(id) VALUES (gen_random_uuid()); RAISE EXCEPTION 'Anon cree'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.preferences_styles_messages; RAISE EXCEPTION 'Anon lit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.preferences_styles_messages; RAISE EXCEPTION 'Anon supprime'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.preferences_styles_messages SET revision=2; RAISE EXCEPTION 'Anon modifie'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.preferences_styles_messages(id) VALUES (gen_random_uuid()); RAISE EXCEPTION 'Anon cree'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.styles_messages_contacts; RAISE EXCEPTION 'Anon lit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.styles_messages_contacts; RAISE EXCEPTION 'Anon supprime'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.styles_messages_contacts SET revision=2; RAISE EXCEPTION 'Anon modifie'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.styles_messages_contacts(id) VALUES (gen_random_uuid()); RAISE EXCEPTION 'Anon cree'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$anon$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000006a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000006a1","role":"authenticated"}',true);

DO $reconnexion$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.styles_messages WHERE id='00000000-0000-4000-8000-000000000611' AND revision=2) THEN RAISE EXCEPTION 'Donnees perdues entre sessions simulees'; END IF;
END;
$reconnexion$;
DELETE FROM public.styles_messages WHERE id='00000000-0000-4000-8000-000000000611';
DO $style_supprime$
BEGIN
 IF EXISTS(SELECT 1 FROM public.preferences_styles_messages) OR EXISTS(SELECT 1 FROM public.styles_messages_contacts) THEN RAISE EXCEPTION 'Affectations non nettoyees'; END IF;
 INSERT INTO public.styles_messages(id,nom,ton) VALUES ('00000000-0000-4000-8000-000000000631','Encore','familier');
 INSERT INTO public.styles_messages_contacts(contact_id,style_id) VALUES (-60001,'00000000-0000-4000-8000-000000000631');
END;
$style_supprime$;
RESET ROLE;
-- Seules des fixtures de la COPIE ISOLEE sont effacees. Ne jamais adapter a un compte reel.
DELETE FROM public.contacts WHERE id=-60001;
DO $contact_supprime$
BEGIN
 IF EXISTS(SELECT 1 FROM public.styles_messages_contacts WHERE user_id='00000000-0000-4000-8000-0000000006a1') THEN RAISE EXCEPTION 'Cascade contact incomplete'; END IF;
END;
$contact_supprime$;
DELETE FROM auth.users WHERE id IN ('00000000-0000-4000-8000-0000000006a1','00000000-0000-4000-8000-0000000006b2');
DO $auth_supprime$
BEGIN
 IF EXISTS(SELECT 1 FROM public.styles_messages WHERE user_id IN ('00000000-0000-4000-8000-0000000006a1','00000000-0000-4000-8000-0000000006b2')) THEN RAISE EXCEPTION 'Cascade Auth incomplete : styles_messages'; END IF;
 IF EXISTS(SELECT 1 FROM public.preferences_styles_messages WHERE user_id IN ('00000000-0000-4000-8000-0000000006a1','00000000-0000-4000-8000-0000000006b2')) THEN RAISE EXCEPTION 'Cascade Auth incomplete : preferences_styles_messages'; END IF;
 IF EXISTS(SELECT 1 FROM public.styles_messages_contacts WHERE user_id IN ('00000000-0000-4000-8000-0000000006a1','00000000-0000-4000-8000-0000000006b2')) THEN RAISE EXCEPTION 'Cascade Auth incomplete : styles_messages_contacts'; END IF;
END;
$auth_supprime$;
ROLLBACK;
-- Concurrence a deux connexions et reconnexion JWT reelle : protocole dans README.md.

