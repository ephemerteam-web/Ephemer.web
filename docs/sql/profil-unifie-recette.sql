-- RECETTE sur COPIE JETABLE, après profil-unifie.sql. Tout exécuter : fixtures annulées.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.enregistrer_mon_profil(uuid,jsonb)') IS NULL THEN RAISE EXCEPTION 'Installer profil-unifie.sql en entier avant la recette'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id IN ('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002')) THEN RAISE EXCEPTION 'Identités fictives déjà présentes : arrêter'; END IF;
END $$;
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data) VALUES
 ('81000000-0000-4000-8000-000000000001','profil-v2@example.invalid',now(),false,'{}'),
 ('82000000-0000-4000-8000-000000000002','etoile-v2@example.invalid',now(),false,'{}');
INSERT INTO public.profiles(id,prenom,nom,telephone_indicatif,telephone_numero,date_naissance)
 VALUES('81000000-0000-4000-8000-000000000001','Camille','Martin','+33','612345678','2000-02-29')
 ON CONFLICT(id) DO UPDATE SET prenom=excluded.prenom,nom=excluded.nom,telephone_indicatif=excluded.telephone_indicatif,telephone_numero=excluded.telephone_numero,date_naissance=excluded.date_naissance;
INSERT INTO ephemer_social.univers_utilisateurs(user_id,mode_identite,identite,valeurs,partage,ia_cadeaux,revision,partage_actif)
 VALUES('81000000-0000-4000-8000-000000000001','prenom','Autre prénom',
 '{"presentation":"Texte personnel","passions":"Romans","plaisirs":"Balades","eviter":"Parfum","anniversaire":{"jour":3,"mois":5,"annee":1999},"email":"ancien@example.invalid","telephone":"+41777777777"}',
 '{"presentation":true,"passions":true,"plaisirs":true,"eviter":true,"anniversaire":true,"annee":true,"email":true,"telephone":true,"avatar":false}',
 '{"identite":true,"presentation":true,"passions":true,"plaisirs":true,"eviter":true}',1,true);
INSERT INTO ephemer_social.relations_etoiles(compte_a,compte_b,etat,origine) VALUES('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002','active','demande');
SELECT set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE p jsonb; d jsonb; r jsonb; b jsonb; BEGIN
 p:=public.lire_mon_profil();
 IF p->>'prenom'<>'Camille' OR p->>'identite'<>'Camille' OR p->>'tel'<>'612345678' OR p->'valeurs'->>'email'<>'profil-v2@example.invalid'
 OR p->'valeurs'->'anniversaire'<>'{"jour":29,"mois":2,"annee":2000}'::jsonb THEN RAISE EXCEPTION 'Priorité Profil perdue'; END IF;
 IF p->'partage'->'email'<>'false'::jsonb OR p->'partage'->'telephone'<>'false'::jsonb OR p->'partage'->'anniversaire'<>'false'::jsonb
 OR p->'partage'->'annee'<>'false'::jsonb OR p->'iaCadeaux'->'identite'<>'false'::jsonb OR p->'partageNom'<>'false'::jsonb THEN RAISE EXCEPTION 'Publication de valeurs différentes ou nouveau nom'; END IF;
 d:=(p-'empreinte')||jsonb_build_object('empreinte',p->'empreinte','valeurs',(p->'valeurs')||'{"anniversaire":{"jour":29,"mois":2,"annee":null}}','partageNom',true,'partage',(p->'partage')||'{"anniversaire":true}');
 r:=public.enregistrer_mon_profil('83000000-0000-4000-8000-000000000001',d);
 IF r<>public.enregistrer_mon_profil('83000000-0000-4000-8000-000000000001',d) THEN RAISE EXCEPTION 'Rejeu différent'; END IF;
 p:=public.lire_mon_profil();
 IF p->'revision'<>'2'::jsonb OR p->'valeurs'->'anniversaire'->'annee'<>'null'::jsonb THEN RAISE EXCEPTION 'Révision ou année nullable perdue'; END IF;
 BEGIN
  PERFORM public.enregistrer_mon_profil('83000000-0000-4000-8000-000000000008',p||jsonb_build_object('valeurs',(p->'valeurs')||'{"email":"invente@example.invalid"}'));
  RAISE EXCEPTION 'E-mail libre accepté'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 BEGIN
  PERFORM public.enregistrer_mon_profil('83000000-0000-4000-8000-000000000009',p||jsonb_build_object('partageActif',false));
  RAISE EXCEPTION 'IA active sans partage acceptée'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 BEGIN
  PERFORM public.enregistrer_mon_profil('83000000-0000-4000-8000-000000000002',d);
  RAISE EXCEPTION 'Ancienne version acceptée'; EXCEPTION WHEN SQLSTATE '40001' THEN NULL; END;
 BEGIN
  PERFORM public.enregistrer_mon_profil('83000000-0000-4000-8000-000000000001',d||'{"nom":"Changé"}');
  RAISE EXCEPTION 'UUID réutilisé accepté'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 d:=p||jsonb_build_object('partageActif',false,'iaCadeaux','{"identite":false,"presentation":false,"passions":false,"plaisirs":false,"eviter":false}'::jsonb);
 PERFORM public.enregistrer_mon_profil('83000000-0000-4000-8000-000000000003',d);
END $test$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT date_naissance FROM public.profiles WHERE id='81000000-0000-4000-8000-000000000001') IS NOT NULL THEN RAISE EXCEPTION 'Année fictive enregistrée'; END IF;
 IF (SELECT profil_unifie_at FROM public.profiles WHERE id='81000000-0000-4000-8000-000000000001') IS NULL THEN RAISE EXCEPTION 'Unification non marquée'; END IF;
 IF (SELECT partage FROM ephemer_social.univers_utilisateurs WHERE user_id='81000000-0000-4000-8000-000000000001')->'anniversaire'<>'true'::jsonb THEN RAISE EXCEPTION 'Critères non mémorisés'; END IF;
 IF has_function_privilege('anon','public.lire_mon_profil()','EXECUTE') OR has_function_privilege('authenticated','ephemer_social.profil_snapshot(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Helper ou données exposés'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','82000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.consulter_univers_etoile('81000000-0000-4000-8000-000000000001')->'champs'<>'{}'::jsonb
 OR public.consulter_univers_cadeaux('81000000-0000-4000-8000-000000000001')->'champs'<>'{}'::jsonb THEN RAISE EXCEPTION 'Partage général ou IA non coupés'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE p jsonb; BEGIN
 p:=public.lire_mon_profil();p:=p||jsonb_build_object('partageActif',true);
 PERFORM public.enregistrer_mon_profil('83000000-0000-4000-8000-000000000004',p);
 -- Effacement conserve les règles/historique et ne ressuscite jamais l'ancienne copie JSON.
 p:=public.lire_mon_profil();p:=p||jsonb_build_object('valeurs',(p->'valeurs')||'{"anniversaire":null}','partage',(p->'partage')||'{"anniversaire":false,"annee":false}');
 PERFORM public.enregistrer_mon_profil('83000000-0000-4000-8000-000000000005',p);
 IF public.lire_mon_profil()->'valeurs'->'anniversaire'<>'null'::jsonb THEN RAISE EXCEPTION 'Ancien anniversaire ressuscité'; END IF;
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','82000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE s jsonb; BEGIN
 s:=public.consulter_univers_etoile('81000000-0000-4000-8000-000000000001');
 IF s->'champs'->>'nom'<>'Martin' OR s->'champs' ? 'anniversaire' OR s->'champs' ? 'email' OR s->'champs' ? 'telephone' THEN RAISE EXCEPTION 'Projection nom/dates/coordonnées incorrecte'; END IF;
 IF public.consulter_univers_cadeaux('81000000-0000-4000-8000-000000000001')->'champs'<>'{}'::jsonb THEN RAISE EXCEPTION 'Accords IA réactivés implicitement'; END IF;
END $test$;
RESET ROLE;
-- Profil vide : reprise de l'ancien univers, indicatif non catalogué et pseudonyme conservé.
INSERT INTO public.profiles(id,prenom,nom,telephone_indicatif,telephone_numero,date_naissance)
 VALUES('82000000-0000-4000-8000-000000000002',NULL,NULL,NULL,NULL,NULL)
 ON CONFLICT(id) DO UPDATE SET prenom=NULL,nom=NULL,telephone_indicatif=NULL,telephone_numero=NULL,date_naissance=NULL;
INSERT INTO ephemer_social.univers_utilisateurs(user_id,mode_identite,identite,valeurs,partage,ia_cadeaux,revision,partage_actif)
 VALUES('82000000-0000-4000-8000-000000000002','prenom','Élodie',
 '{"presentation":"Présentation personnelle","passions":"Cuisine","plaisirs":"","eviter":"","anniversaire":{"jour":29,"mois":2,"annee":null},"email":"ancien@example.invalid","telephone":"+435551234"}',
 '{"presentation":false,"passions":false,"plaisirs":false,"eviter":false,"anniversaire":false,"annee":false,"email":false,"telephone":false,"avatar":false}',
 '{"identite":false,"presentation":false,"passions":false,"plaisirs":false,"eviter":false}',1,false);
SELECT set_config('request.jwt.claim.sub','82000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE p jsonb; BEGIN
 p:=public.lire_mon_profil();
 IF p->>'prenom'<>'Élodie' OR p->'valeurs'->>'telephone'<>'+435551234' OR p->'valeurs'->'anniversaire'->'annee'<>'null'::jsonb
 OR p->'valeurs'->>'email'<>'etoile-v2@example.invalid' THEN RAISE EXCEPTION 'Reprise des champs vides ou e-mail vérifié perdus'; END IF;
 p:=p||'{"modeIdentite":"pseudonyme","identite":"Polaris"}';
 PERFORM public.enregistrer_mon_profil('84000000-0000-4000-8000-000000000001',p);
 p:=public.lire_mon_profil();p:=p||'{"prenom":"Autre prénom"}';
 PERFORM public.enregistrer_mon_profil('84000000-0000-4000-8000-000000000002',p);
 IF public.lire_mon_profil()->>'identite'<>'Polaris' THEN RAISE EXCEPTION 'Pseudonyme remplacé par le prénom'; END IF;
 BEGIN
  PERFORM public.commander_mon_univers('masquer','{}',2,'84000000-0000-4000-8000-000000000003');
  RAISE EXCEPTION 'Ancien appel accepté'; EXCEPTION WHEN SQLSTATE 'P1009' THEN NULL; END;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'Recette Profil unifié réussie — données de test annulées' AS resultat;
