-- COPIE ISOLEE uniquement, sans webhook ni service externe. AUCUNE execution automatique.
-- Dans la meme session, confirmer la copie : SET ephemer.recette_celebrations='copie_autorisee';
-- JWT ici simulé par claims SQL ; rôles PostgreSQL réels. HTTP/JWT signé : protocole README-B.md.
BEGIN;
SET LOCAL statement_timeout='60s';
DO $garde$ BEGIN
  IF current_setting('ephemer.recette_celebrations',true) IS DISTINCT FROM 'copie_autorisee' THEN RAISE EXCEPTION 'Copie explicitement autorisee requise'; END IF;
  IF EXISTS(SELECT 1 FROM auth.users WHERE id IN ('31000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000003','31000000-0000-4000-8000-000000000004')) THEN RAISE EXCEPTION 'UUID fixtures deja presents, arreter'; END IF;
END $garde$;
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous,aud,role)
VALUES ('31000000-0000-4000-8000-000000000001','celebration-a@example.invalid',now(),false,'authenticated','authenticated'),
 ('31000000-0000-4000-8000-000000000002','celebration-b@example.invalid',now(),false,'authenticated','authenticated'),
 ('31000000-0000-4000-8000-000000000003','celebration-c@example.invalid',now(),false,'authenticated','authenticated'),
 ('31000000-0000-4000-8000-000000000004','celebration-d@example.invalid',now(),false,'authenticated','authenticated');
INSERT INTO ephemer_social.relations_etoiles(compte_a,compte_b,etat,origine)
VALUES ('31000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000002','active','demande'),
 ('31000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000003','active','demande');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT public.commander_celebrations('creer','{"id":"32000000-0000-4000-8000-000000000001","titre":"Repas fictif","date":null,"heure":null,"lieu":null,"mode":"partage","surprise":false,"destinataire":"31000000-0000-4000-8000-000000000002"}', '33000000-0000-4000-8000-000000000001');
-- Réessai exact : même résultat, pas de seconde célébration.
SELECT public.commander_celebrations('creer','{"id":"32000000-0000-4000-8000-000000000001","titre":"Repas fictif","date":null,"heure":null,"lieu":null,"mode":"partage","surprise":false,"destinataire":"31000000-0000-4000-8000-000000000002"}', '33000000-0000-4000-8000-000000000001');
SELECT public.commander_celebrations('inviter','{"id":"32000000-0000-4000-8000-000000000001","invitation":"34000000-0000-4000-8000-000000000001","cible":"31000000-0000-4000-8000-000000000002"}','33000000-0000-4000-8000-000000000002');
SELECT public.commander_celebrations('inviter','{"id":"32000000-0000-4000-8000-000000000001","invitation":"34000000-0000-4000-8000-000000000002","cible":"31000000-0000-4000-8000-000000000003"}','33000000-0000-4000-8000-000000000003');
DO $tests$ BEGIN
  BEGIN PERFORM public.commander_celebrations('accepter','{"id":"32000000-0000-4000-8000-000000000001","invitation":"34000000-0000-4000-8000-000000000001"}','33000000-0000-4000-8000-000000000004'); RAISE EXCEPTION 'Organisateur a accepte pour autrui'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM * FROM ephemer_celebrations.celebrations; RAISE EXCEPTION 'Table interne accessible'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $tests$;
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $tests$ DECLARE r jsonb; BEGIN
  BEGIN PERFORM public.lire_celebration('32000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'Invitation ouvre preparatifs'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  r:=public.lire_invitations_celebrations(NULL,100);
  IF jsonb_array_length(r->'items')<>1 OR (r->'items'->0)?'taches' THEN RAISE EXCEPTION 'Presentation invitation incorrecte'; END IF;
END $tests$;
SELECT public.commander_celebrations('demander_suppression','{"id":"32000000-0000-4000-8000-000000000001","demande":"35000000-0000-4000-8000-000000000001","motif":"MOTIF_PRIVE_FIXTURE"}','33000000-0000-4000-8000-000000000005');
SELECT public.commander_celebrations('accepter','{"id":"32000000-0000-4000-8000-000000000001","invitation":"34000000-0000-4000-8000-000000000001"}','33000000-0000-4000-8000-000000000006');
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
SELECT public.commander_celebrations('accepter','{"id":"32000000-0000-4000-8000-000000000001","invitation":"34000000-0000-4000-8000-000000000002"}','33000000-0000-4000-8000-000000000007');
DO $tests$ DECLARE r jsonb; BEGIN
  r:=public.lire_celebration('32000000-0000-4000-8000-000000000001');
  IF r::text LIKE '%MOTIF_PRIVE_FIXTURE%' THEN RAISE EXCEPTION 'Motif divulgue'; END IF;
  BEGIN PERFORM public.commander_celebrations('supprimer',jsonb_build_object('id','32000000-0000-4000-8000-000000000001','revision',(r->'celebration'->>'revision')::bigint,'confirmer',true),'33000000-0000-4000-8000-000000000008'); RAISE EXCEPTION 'Participant supprime'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $tests$;
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
DO $tests$ DECLARE r jsonb; m uuid; BEGIN
  r:=public.lire_celebration('32000000-0000-4000-8000-000000000001');
  SELECT (x->>'id')::uuid INTO m FROM jsonb_array_elements(r->'participants') x WHERE x->>'compte'='31000000-0000-4000-8000-000000000003';
  PERFORM public.commander_celebrations('ajouter_tache',jsonb_build_object('id','32000000-0000-4000-8000-000000000001','tache','36000000-0000-4000-8000-000000000001','titre','CADEAU_SECRET_FIXTURE','type','cadeau','responsable',m,'echeance',NULL),'33000000-0000-4000-8000-000000000009');
  PERFORM public.commander_celebrations('ajouter_tache',jsonb_build_object('id','32000000-0000-4000-8000-000000000001','tache','36000000-0000-4000-8000-000000000001','titre','CADEAU_SECRET_FIXTURE','type','cadeau','responsable',m,'echeance',NULL),'33000000-0000-4000-8000-000000000009');
END $tests$;
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $tests$ BEGIN IF public.lire_celebration('32000000-0000-4000-8000-000000000001')::text LIKE '%CADEAU_SECRET_FIXTURE%' OR public.exporter_celebrations(NULL,1)::text LIKE '%CADEAU_SECRET_FIXTURE%' THEN RAISE EXCEPTION 'Cadeau divulgue au destinataire'; END IF; END $tests$;
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT public.commander_celebrations('creer','{"id":"32000000-0000-4000-8000-000000000002","titre":"Surprise fictive","date":null,"heure":null,"lieu":null,"mode":"partage","surprise":true,"destinataire":"31000000-0000-4000-8000-000000000002"}','33000000-0000-4000-8000-000000000010');
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $tests$ BEGIN
  IF public.lire_celebrations(NULL,100)::text LIKE '%Surprise fictive%' THEN RAISE EXCEPTION 'Surprise dans liste'; END IF;
  BEGIN PERFORM public.lire_celebration('32000000-0000-4000-8000-000000000002'); RAISE EXCEPTION 'Destinataire lit surprise'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $tests$;
-- Même destinataire avec rôle organisateur ajouté par l'admin de la COPIE : exclusion prioritaire.
RESET ROLE;
INSERT INTO ephemer_celebrations.participations(celebration,compte,role) VALUES('32000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000002','organisateur');
SET LOCAL ROLE authenticated;
DO $tests$ BEGIN BEGIN PERFORM public.lire_celebration('32000000-0000-4000-8000-000000000002'); RAISE EXCEPTION 'Role contourne exclusion'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $tests$;
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
SELECT public.commander_celebrations('quitter','{"id":"32000000-0000-4000-8000-000000000001","cloturer":false}','33000000-0000-4000-8000-000000000011');
DO $tests$ BEGIN
  BEGIN PERFORM public.lire_celebration('32000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'Ex-membre lit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.commander_celebrations('demander_suppression','{"id":"32000000-0000-4000-8000-000000000001","demande":"35000000-0000-4000-8000-000000000002","motif":null}','33000000-0000-4000-8000-000000000012'); RAISE EXCEPTION 'Ex-membre demande'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $tests$;
-- Blocage réel de la relation sociale : le bloqueur A, dernier organisateur, passe en maintenance.
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT public.commander_etoiles('bloquer','{"etoileId":"31000000-0000-4000-8000-000000000002"}','33000000-0000-4000-8000-000000000013');
DO $tests$ DECLARE r jsonb; BEGIN
  r:=public.lire_celebration('32000000-0000-4000-8000-000000000001');
  IF NOT (r->'celebration'->>'maintenance')::boolean OR jsonb_array_length(r->'taches')<>0 THEN RAISE EXCEPTION 'Maintenance divulgue preparatifs'; END IF;
  PERFORM public.commander_celebrations('supprimer',jsonb_build_object('id','32000000-0000-4000-8000-000000000001','revision',(r->'celebration'->>'revision')::bigint,'confirmer',true),'33000000-0000-4000-8000-000000000014');
  PERFORM public.commander_celebrations('supprimer',jsonb_build_object('id','32000000-0000-4000-8000-000000000001','revision',(r->'celebration'->>'revision')::bigint,'confirmer',true),'33000000-0000-4000-8000-000000000014');
END $tests$;
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $tests$ BEGIN BEGIN PERFORM public.lire_celebration('32000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'Contenu supprime accessible'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $tests$;
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
DO $tests$ BEGIN BEGIN PERFORM public.lire_celebration('32000000-0000-4000-8000-000000000002'); RAISE EXCEPTION 'Non membre lit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $tests$;
SET LOCAL ROLE anon;
DO $tests$ BEGIN BEGIN PERFORM public.lire_celebrations(NULL,100); RAISE EXCEPTION 'Lecture anonyme'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $tests$;
RESET ROLE;
DO $tests$ BEGIN
  IF EXISTS(SELECT 1 FROM ephemer_celebrations.taches WHERE celebration='32000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Taches supprimees presentes'; END IF;
END $tests$;
-- Publication à partir des RPC privées installées : aucun brouillon ou historique copié.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT public.enregistrer_evenement_lot02('{"id":"37000000-0000-4000-8000-000000000001","revision":0,"contact_id":null,"type_evenement":"libre","titre":"SOURCE_PRIVEE_FIXTURE","recurrence":"ponctuelle","date":"2026-12-20"}');
SELECT * FROM public.materialiser_occurrences_lot02('2026-12-20','2026-12-20');
DO $source$ DECLARE o public.occurrences_evenements; p public.preparations_evenements; t public.taches_preparation; r jsonb; BEGIN
 SELECT * INTO o FROM public.occurrences_evenements WHERE user_id=auth.uid() AND evenement_id='37000000-0000-4000-8000-000000000001';
 p:=public.ouvrir_preparation_lot04(o.id);
 t:=public.ajouter_tache_lot04('37000000-0000-4000-8000-000000000002',p.id,'message','Titre choisi');
 PERFORM public.enregistrer_tache_lot04(t.id,t.revision,t.titre,'BROUILLON_NON_PUBLIE_FIXTURE','a_faire');
 BEGIN
   PERFORM public.commander_celebrations('publier',jsonb_build_object('id','32000000-0000-4000-8000-000000000003','titre','Copie minimale','date',NULL,'heure',NULL,'lieu',NULL,'mode','partage','surprise',false,'destinataire',NULL,'preparation',p.id,'taches',jsonb_build_array(t.id),'apercuSource',jsonb_build_object('date',o.date_occurrence,'taches',jsonb_build_array(jsonb_build_object('id',t.id,'titre','Titre obsolete','type',t.type_tache))),'confirmer',true),'33000000-0000-4000-8000-000000000015');
   RAISE EXCEPTION 'Publication sans nouvel apercu acceptee';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 PERFORM public.commander_celebrations('publier',jsonb_build_object('id','32000000-0000-4000-8000-000000000003','titre','Copie minimale','date',NULL,'heure',NULL,'lieu',NULL,'mode','partage','surprise',false,'destinataire',NULL,'preparation',p.id,'taches',jsonb_build_array(t.id),'apercuSource',jsonb_build_object('date',o.date_occurrence,'taches',jsonb_build_array(jsonb_build_object('id',t.id,'titre',t.titre,'type',t.type_tache))),'confirmer',true),'33000000-0000-4000-8000-000000000015');
 r:=public.lire_celebration('32000000-0000-4000-8000-000000000003');
 IF r::text LIKE '%BROUILLON_NON_PUBLIE_FIXTURE%' OR r->'celebration'->>'dateCanonique'<>'2026-12-20' THEN RAISE EXCEPTION 'Projection privee incorrecte'; END IF;
 PERFORM public.modifier_occurrence_lot02(o.id,o.revision,'2026-12-21',false);
 IF public.lire_celebration('32000000-0000-4000-8000-000000000003')->'celebration'->>'dateCanonique'<>'2026-12-20' THEN RAISE EXCEPTION 'Source propagee silencieusement'; END IF;
END $source$;
SELECT public.commander_celebrations('inviter','{"id":"32000000-0000-4000-8000-000000000003","invitation":"34000000-0000-4000-8000-000000000003","cible":"31000000-0000-4000-8000-000000000003"}','33000000-0000-4000-8000-000000000016');
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
SELECT public.commander_celebrations('demander_suppression','{"id":"32000000-0000-4000-8000-000000000003","demande":"35000000-0000-4000-8000-000000000003","motif":"PREMIERE_DEMANDE"}','33000000-0000-4000-8000-000000000017');
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT public.commander_celebrations('traiter_suppression','{"id":"32000000-0000-4000-8000-000000000003","demande":"35000000-0000-4000-8000-000000000003","revision":1,"accepter":false,"confirmer":false}','33000000-0000-4000-8000-000000000018');
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
DO $tests$ BEGIN IF public.lire_invitations_celebrations(NULL,100)::text NOT LIKE '%refusee%' THEN RAISE EXCEPTION 'Statut refuse invisible'; END IF; END $tests$;
SELECT public.commander_celebrations('demander_suppression','{"id":"32000000-0000-4000-8000-000000000003","demande":"35000000-0000-4000-8000-000000000004","motif":null}','33000000-0000-4000-8000-000000000019');
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT public.commander_celebrations('traiter_suppression','{"id":"32000000-0000-4000-8000-000000000003","demande":"35000000-0000-4000-8000-000000000004","revision":1,"accepter":true,"confirmer":true}','33000000-0000-4000-8000-000000000020');
DO $source$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.taches_preparation WHERE id='37000000-0000-4000-8000-000000000002' AND brouillon_texte='BROUILLON_NON_PUBLIE_FIXTURE') THEN RAISE EXCEPTION 'Suppression commune efface source privee'; END IF; END $source$;
SELECT set_config('request.jwt.claims','{"sub":"31000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
DO $tests$ BEGIN IF public.lire_invitations_celebrations(NULL,100)::text NOT LIKE '%suppression%' THEN RAISE EXCEPTION 'Confirmation personnelle absente'; END IF; END $tests$;
-- Effacement sur UUID de fixture uniquement ; aucune suppression réelle automatique.
RESET ROLE;
DELETE FROM auth.users WHERE id='31000000-0000-4000-8000-000000000001';
DO $tests$ BEGIN
 IF EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE compte='31000000-0000-4000-8000-000000000001' AND etat IN ('active','maintenance')) THEN RAISE EXCEPTION 'Participation apres effacement'; END IF;
END $tests$;
SELECT 'celebrations_recette_roles_sql_ok_non_jwt_http' AS resultat;
ROLLBACK;
