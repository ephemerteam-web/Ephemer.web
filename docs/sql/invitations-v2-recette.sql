-- RECETTE MANUELLE sur une COPIE JETABLE, après invitations-v2.sql.
-- Identités fictives, aucune session réelle. Le ROLLBACK final annule toute la recette.
-- Ne jamais remplacer les UUID par ceux d'un utilisateur réel.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.soumettre_invitation_v2(text,uuid,jsonb)') IS NULL
 OR to_regprocedure('public.lire_reprises_invitation()') IS NULL
 OR to_regprocedure('public.lire_reponses_invitation()') IS NULL
 OR to_regprocedure('public.traiter_reponse_invitation(uuid,bigint,text,text,text[],text)') IS NULL
 OR to_regprocedure('public.lire_premier_profil()') IS NULL
 OR to_regprocedure('public.enregistrer_premier_profil(uuid,jsonb)') IS NULL
 OR to_regprocedure('public.purger_reprises_invitation()') IS NULL
 OR to_regprocedure('public.verifier_invitation_v2(text)') IS NULL THEN
  RAISE EXCEPTION 'Installation Invitations V2 absente ou incomplète : exécuter invitations-v2.sql en entier, jusqu’au COMMIT réussi, dans ce même projet avant la recette';
 END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id IN (
 '71000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002','73000000-0000-4000-8000-000000000003')) THEN
 RAISE EXCEPTION 'Ces identités fictives existent déjà : arrêter la recette'; END IF;
END $$;
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data)
VALUES ('71000000-0000-4000-8000-000000000001','v2-hote@example.invalid',now(),false,'{"prenom":"Hôte fictif"}'),
 ('72000000-0000-4000-8000-000000000002','camille-v2@example.invalid',now(),false,'{}'),
 ('73000000-0000-4000-8000-000000000003','autre-v2@example.invalid',now(),false,'{}');
INSERT INTO public.invitations(id,user_id,token,label,max_utilisations,nb_utilisations,expires_at,actif)
VALUES ('74000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','fixture-invitation-v2-a','Recette',1,0,now()+interval '1 day',true),
 ('74000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','fixture-invitation-v2-b','Recette second lien',1,0,now()+interval '1 day',true);

DO $test$
DECLARE d jsonb:='{"prenom":"Camille","nom":"Martin","anniversaire":{"day":29,"month":2,"year":null},"relation":"ami","interets":["Romans"],"noteLibre":"Réponse originale","email":"camille-v2@example.invalid","indicatif":"+33","tel":"","conserver":true}';
 r jsonb; c bigint; result jsonb;
BEGIN
 -- Régression : limites du texte libre et CASE imbriqué dans le IF du validateur.
 PERFORM ephemer_invites.valider(d||jsonb_build_object('noteLibre',repeat('a',500)),false);
 BEGIN
  PERFORM ephemer_invites.valider(d||jsonb_build_object('noteLibre',repeat('a',501)),false);
  RAISE EXCEPTION 'Une réponse de 501 caractères a été acceptée';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 PERFORM ephemer_invites.valider(d||jsonb_build_object('noteLibre',repeat('a',1000)),true);
 BEGIN
  PERFORM ephemer_invites.valider(d||jsonb_build_object('noteLibre',repeat('a',1001)),true);
  RAISE EXCEPTION 'Un profil de 1001 caractères a été accepté';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 r:=public.soumettre_invitation_v2('fixture-invitation-v2-a','75000000-0000-4000-8000-000000000001',d);
 IF r->'succes'<>'true'::jsonb THEN RAISE EXCEPTION 'Premier envoi refusé'; END IF;
 result:=public.soumettre_invitation_v2('fixture-invitation-v2-a','75000000-0000-4000-8000-000000000001',d);
 IF r<>result THEN RAISE EXCEPTION 'Accusé de réception différent'; END IF;
 IF (SELECT count(*) FROM public.contacts WHERE user_id='71000000-0000-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Doublon idempotent'; END IF;
 SELECT id INTO c FROM public.contacts WHERE user_id='71000000-0000-4000-8000-000000000001';
 IF (SELECT nb_utilisations FROM public.invitations WHERE token='fixture-invitation-v2-a')<>1 THEN RAISE EXCEPTION 'Compteur dupliqué'; END IF;
 IF (SELECT date_naissance FROM public.contacts WHERE id=c) IS NOT NULL THEN RAISE EXCEPTION 'Année fictive'; END IF;
 IF ephemer_invites.naissance('71000000-0000-4000-8000-000000000001',c)<>'{"day":29,"month":2,"year":null}'::jsonb THEN RAISE EXCEPTION '29 février perdu'; END IF;
 -- Quota plein : même personne reconnue, nouvelle opération et autre lien acceptés.
 PERFORM public.soumettre_invitation_v2('fixture-invitation-v2-a','75000000-0000-4000-8000-000000000002',d||'{"tel":"612345678"}');
 PERFORM public.soumettre_invitation_v2('fixture-invitation-v2-b','75000000-0000-4000-8000-000000000003',d||'{"tel":"612345678"}');
 IF (SELECT telephone_numero FROM public.contacts WHERE id=c)<>'612345678' THEN RAISE EXCEPTION 'Champ vide non complété'; END IF;
 IF (SELECT count(*) FROM public.contacts WHERE user_id='71000000-0000-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Doublon entre liens'; END IF;
 IF (SELECT nb_utilisations FROM public.invitations WHERE token='fixture-invitation-v2-b')<>0 THEN RAISE EXCEPTION 'Répétition comptée'; END IF;
 IF public.verifier_invitation_v2('fixture-invitation-v2-a')->'valide'<>'true'::jsonb THEN RAISE EXCEPTION 'Lien plein illisible'; END IF;
 BEGIN
  PERFORM public.soumettre_invitation_v2('fixture-invitation-v2-a','75000000-0000-4000-8000-000000000001',d||'{"prenom":"Modifié"}');
  RAISE EXCEPTION 'UUID réutilisé accepté';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 UPDATE public.contacts SET note='Note privée de l’hôte' WHERE id=c;
 PERFORM public.soumettre_invitation_v2('fixture-invitation-v2-b','75000000-0000-4000-8000-000000000004',d);
 IF (SELECT note FROM public.contacts WHERE id=c)<>'Note privée de l’hôte' THEN RAISE EXCEPTION 'Valeur remplacée implicitement'; END IF;
 IF NOT EXISTS(SELECT 1 FROM ephemer_invites.reponses WHERE hote_id='71000000-0000-4000-8000-000000000001' AND etat='en_attente') THEN RAISE EXCEPTION 'Différence perdue'; END IF;
 UPDATE public.invitations SET actif=false WHERE token='fixture-invitation-v2-b';
 r:=public.soumettre_invitation_v2('fixture-invitation-v2-b','75000000-0000-4000-8000-000000000005',d);
 IF r->'succes'<>'false'::jsonb THEN RAISE EXCEPTION 'Lien désactivé accepté'; END IF;
 UPDATE public.invitations SET actif=true,expires_at=now()-interval '1 day' WHERE token='fixture-invitation-v2-b';
 r:=public.soumettre_invitation_v2('fixture-invitation-v2-b','75000000-0000-4000-8000-000000000006',d);
 IF r->'succes'<>'false'::jsonb THEN RAISE EXCEPTION 'Lien expiré accepté'; END IF;
END $test$;

SELECT set_config('request.jwt.claim.sub','73000000-0000-4000-8000-000000000003',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.lire_reprises_invitation()<>'[]'::jsonb OR public.lire_reponses_invitation()<>'[]'::jsonb THEN
 RAISE EXCEPTION 'Données lisibles avec le mauvais compte'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE rows jsonb; p jsonb; d jsonb; result jsonb; BEGIN
 rows:=public.lire_reprises_invitation();
 IF jsonb_array_length(rows)<>1 OR rows->0->'donnees'->>'noteLibre'<>'Réponse originale' THEN RAISE EXCEPTION 'Reprise perdue ou note privée copiée'; END IF;
 p:=public.lire_premier_profil();
 d:=(rows->0->'donnees')||jsonb_build_object('conserver',false,'passions','Romans','empreinte',p->>'empreinte',
 'revisionUnivers',p->'revisionUnivers','repriseIds',jsonb_build_array(rows->0->'id'));
 result:=public.enregistrer_premier_profil('76000000-0000-4000-8000-000000000001',d);
 IF result->'ok'<>'true'::jsonb THEN RAISE EXCEPTION 'Profil non enregistré'; END IF;
 IF public.enregistrer_premier_profil('76000000-0000-4000-8000-000000000001',d)<>result THEN RAISE EXCEPTION 'Rejeu du profil impossible'; END IF;
 p:=public.lire_premier_profil();
 IF p->'complete'<>'true'::jsonb OR p->'anniversaire'->'year'<>'null'::jsonb OR p->>'passions'<>'Romans'
 OR p->>'presentation'<>'Réponse originale' THEN RAISE EXCEPTION 'Profil incomplet'; END IF;
 IF public.lire_reprises_invitation()<>'[]'::jsonb THEN RAISE EXCEPTION 'Reprise consommée encore visible'; END IF;
END $test$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT date_naissance FROM public.profiles WHERE id='72000000-0000-4000-8000-000000000002') IS NOT NULL THEN RAISE EXCEPTION 'Année de profil fictive'; END IF;
 IF EXISTS(SELECT 1 FROM ephemer_social.univers_utilisateurs u,jsonb_each(u.partage) f
 WHERE u.user_id='72000000-0000-4000-8000-000000000002' AND f.value='true'::jsonb) THEN RAISE EXCEPTION 'Partage activé'; END IF;
 IF EXISTS(SELECT 1 FROM ephemer_social.univers_utilisateurs u,jsonb_each(u.ia_cadeaux) f
 WHERE u.user_id='72000000-0000-4000-8000-000000000002' AND f.value='true'::jsonb) THEN RAISE EXCEPTION 'IA activée'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE r jsonb; c jsonb; BEGIN
 r:=public.lire_reponses_invitation()->0; c:=r->'candidats'->0;
 BEGIN
  PERFORM public.traiter_reponse_invitation((r->>'id')::uuid,(r->>'revision')::bigint,'completer',c->>'id','{}','fausse-empreinte');
  RAISE EXCEPTION 'Fiche modifiée non protégée';
 EXCEPTION WHEN SQLSTATE '40001' THEN NULL; END;
 PERFORM public.traiter_reponse_invitation((r->>'id')::uuid,(r->>'revision')::bigint,'completer',c->>'id','{}',c->>'empreinte');
 IF public.lire_reponses_invitation()<>'[]'::jsonb THEN RAISE EXCEPTION 'Réponse non résolue'; END IF;
END $test$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT note FROM public.contacts WHERE user_id='71000000-0000-4000-8000-000000000001')<>'Note privée de l’hôte' THEN RAISE EXCEPTION 'Note privée écrasée'; END IF;
 IF has_table_privilege('authenticated','ephemer_invites.reprises','SELECT')
 OR has_function_privilege('anon','public.lire_reprises_invitation()','EXECUTE')
 OR has_function_privilege('authenticated','public.purger_reprises_invitation()','EXECUTE')
 OR has_function_privilege('anon','public.soumettre_invitation(text,text,text,date,text,text,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Privilèges trop larges'; END IF;
END $$;
-- Expiration logique et purge physique sont distinctes.
INSERT INTO ephemer_invites.reprises(id,email,donnees,expires_at)
SELECT id,'camille-v2@example.invalid','{}'::jsonb,now()-interval '1 day' FROM ephemer_invites.reponses
WHERE hote_id='71000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 IF public.lire_reprises_invitation()<>'[]'::jsonb THEN RAISE EXCEPTION 'Reprise expirée visible'; END IF;
 PERFORM public.purger_reprises_invitation();
 IF EXISTS(SELECT 1 FROM ephemer_invites.reprises WHERE email='camille-v2@example.invalid') THEN RAISE EXCEPTION 'Purge incomplète'; END IF;
END $$;
ROLLBACK;
-- Résultat explicite après toutes les assertions et l'annulation des données fictives.
SELECT 'Recette Invitations V2 réussie — données de test annulées' AS resultat;
