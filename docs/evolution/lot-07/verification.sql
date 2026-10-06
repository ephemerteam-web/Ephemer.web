-- Lot 07 : RECETTE MUTANTE, uniquement sur COPIE ISOLEE AUTORISEE.
-- Lire les triggers Auth/contacts avant execution. ROLLBACK ne neutralise pas un prestataire externe.
-- Dans la MEME session : SET ephemer.lot07_test_isole='CONFIRME_COPIE_ISOLEE_LOT07';
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
 IF current_setting('ephemer.lot07_test_isole',true) IS DISTINCT FROM 'CONFIRME_COPIE_ISOLEE_LOT07' THEN RAISE EXCEPTION 'Recette desactivee : copie isolee autorisee requise'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id IN ('00000000-0000-4000-8000-0000000007a1','00000000-0000-4000-8000-0000000007b2')) OR EXISTS(SELECT 1 FROM public.contacts WHERE id IN (-70001,-70002)) THEN RAISE EXCEPTION 'Fixtures deja presentes : arret'; END IF;
END;
$garde$;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('00000000-0000-4000-8000-0000000007a1','lot07-a@example.invalid','{"prenom":"Test A"}'),('00000000-0000-4000-8000-0000000007b2','lot07-b@example.invalid','{"prenom":"Test B"}');
INSERT INTO public.contacts(id,user_id,prenom) VALUES (-70001,'00000000-0000-4000-8000-0000000007a1','Fixture A'),(-70002,'00000000-0000-4000-8000-0000000007b2','Fixture B');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000007a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000007a1","role":"authenticated"}',true);

INSERT INTO public.preferences_cadeaux_contacts(id,contact_id,categories) VALUES ('00000000-0000-4000-8000-000000000711',-70001,ARRAY['loisir','tech']);
INSERT INTO public.preferences_cadeaux_contacts(id,contact_id) VALUES ('00000000-0000-4000-8000-000000000711',-70001) ON CONFLICT(id) DO NOTHING;
DO $categories$
BEGIN
 BEGIN INSERT INTO public.preferences_cadeaux_contacts(contact_id) VALUES (-70001); RAISE EXCEPTION 'Doublon contact'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN UPDATE public.preferences_cadeaux_contacts SET categories=ARRAY['secret'],revision=2; RAISE EXCEPTION 'Categorie inconnue'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.preferences_cadeaux_contacts SET categories=ARRAY['tech','tech'],revision=2; RAISE EXCEPTION 'Categorie dupliquee'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.preferences_cadeaux_contacts SET categories=ARRAY[NULL::text],revision=2; RAISE EXCEPTION 'Categorie NULL'; EXCEPTION WHEN check_violation THEN NULL; END;
END;
$categories$;
UPDATE public.preferences_cadeaux_contacts SET categories=ARRAY['tech'],revision=2 WHERE id='00000000-0000-4000-8000-000000000711' AND revision=1;
DO $revision$
DECLARE nb int;
BEGIN
 IF (SELECT revision FROM public.preferences_cadeaux_contacts WHERE id='00000000-0000-4000-8000-000000000711')<>2 THEN RAISE EXCEPTION 'Revision non avancee'; END IF;
 UPDATE public.preferences_cadeaux_contacts SET categories=ARRAY['tech'],revision=2 WHERE id='00000000-0000-4000-8000-000000000711' AND revision=1;
 GET DIAGNOSTICS nb=ROW_COUNT;
 IF nb<>0 THEN RAISE EXCEPTION 'Revision perimee ecrasee'; END IF;
 BEGIN UPDATE public.preferences_cadeaux_contacts SET categories=ARRAY['tech'] WHERE id='00000000-0000-4000-8000-000000000711'; RAISE EXCEPTION 'UPDATE aveugle accepte'; EXCEPTION WHEN serialization_failure THEN NULL; END;
END;
$revision$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000007b2',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000007b2","role":"authenticated"}',true);

DO $compte_b$
DECLARE nb int;
BEGIN
 IF EXISTS(SELECT 1 FROM public.preferences_cadeaux_contacts) THEN RAISE EXCEPTION 'B lit A : preferences_cadeaux_contacts'; END IF;
 DELETE FROM public.preferences_cadeaux_contacts; GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>0 THEN RAISE EXCEPTION 'B supprime A'; END IF;
 UPDATE public.preferences_cadeaux_contacts SET categories=ARRAY['tech'],revision=3 WHERE id='00000000-0000-4000-8000-000000000711'; GET DIAGNOSTICS nb=ROW_COUNT; IF nb<>0 THEN RAISE EXCEPTION 'B modifie A'; END IF;
 BEGIN INSERT INTO public.preferences_cadeaux_contacts(contact_id) VALUES (-70001); RAISE EXCEPTION 'Contact etranger'; EXCEPTION WHEN foreign_key_violation OR insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.preferences_cadeaux_contacts(user_id,contact_id) VALUES ('00000000-0000-4000-8000-0000000007a1',-70001); RAISE EXCEPTION 'Proprietaire falsifie'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO public.preferences_cadeaux_contacts(contact_id,categories) VALUES (-70002,ARRAY['gourmand']);
END;
$compte_b$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
DO $anon$
BEGIN
 BEGIN PERFORM 1 FROM public.preferences_cadeaux_contacts; RAISE EXCEPTION 'Anon lit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.preferences_cadeaux_contacts; RAISE EXCEPTION 'Anon supprime'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.preferences_cadeaux_contacts SET revision=2; RAISE EXCEPTION 'Anon modifie'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.preferences_cadeaux_contacts(id) VALUES (gen_random_uuid()); RAISE EXCEPTION 'Anon cree'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$anon$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000007a1',true);
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000007a1","role":"authenticated"}',true);

DO $reconnexion$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.preferences_cadeaux_contacts WHERE id='00000000-0000-4000-8000-000000000711' AND revision=2) THEN RAISE EXCEPTION 'Donnees perdues entre sessions simulees'; END IF;
END;
$reconnexion$;
RESET ROLE;
-- Seules des fixtures de la COPIE ISOLEE sont effacees. Ne jamais adapter a un compte reel.
DELETE FROM public.contacts WHERE id=-70001;
DO $contact_supprime$
BEGIN
 IF EXISTS(SELECT 1 FROM public.preferences_cadeaux_contacts WHERE user_id='00000000-0000-4000-8000-0000000007a1') THEN RAISE EXCEPTION 'Cascade contact incomplete'; END IF;
END;
$contact_supprime$;
DELETE FROM auth.users WHERE id IN ('00000000-0000-4000-8000-0000000007a1','00000000-0000-4000-8000-0000000007b2');
DO $auth_supprime$
BEGIN
 IF EXISTS(SELECT 1 FROM public.preferences_cadeaux_contacts WHERE user_id IN ('00000000-0000-4000-8000-0000000007a1','00000000-0000-4000-8000-0000000007b2')) THEN RAISE EXCEPTION 'Cascade Auth incomplete : preferences_cadeaux_contacts'; END IF;
END;
$auth_supprime$;
ROLLBACK;
-- Concurrence a deux connexions et reconnexion JWT reelle : protocole dans README.md.

