-- Extension nécessaire au branchement applicatif. Installation HUMAINE après 01/02/03.
-- N'active rien et ne réécrit aucune version ou RPC de carte individuelle.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $garde$ BEGIN
 IF to_regprocedure('public.engager_email_carte(uuid,uuid)') IS NULL OR to_regprocedure('public.statut_lien_collectif(uuid,uuid)') IS NOT NULL THEN RAISE EXCEPTION 'Préalable absent ou 04 déjà installé : contrôler le catalogue'; END IF;
END $garde$;

-- Le départ d'un organisateur annule ses plans via les triggers déjà installés.
-- Son effacement Auth doit ensuite pouvoir supprimer ses plans, comme ses jobs email.
DO $fk$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ephemer_celebrations.carte_plans'::regclass AND conname='carte_plans_organisateur_fkey' AND confrelid='auth.users'::regclass AND confdeltype='a') THEN RAISE EXCEPTION 'Référence organisateur divergente'; END IF;
END $fk$;
ALTER TABLE ephemer_celebrations.carte_plans DROP CONSTRAINT carte_plans_organisateur_fkey;
ALTER TABLE ephemer_celebrations.carte_plans ADD CONSTRAINT carte_plans_organisateur_fkey FOREIGN KEY(organisateur) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE FUNCTION public.statut_lien_collectif(p_carte uuid,p_acteur uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE c ephemer_celebrations.cartes_collectives; v ephemer_celebrations.carte_versions;
BEGIN
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE id=p_carte;
 PERFORM ephemer_celebrations.carte_verrou(c.celebration);
 IF c.id IS NULL OR NOT ephemer_celebrations.carte_autorisee(c.id,p_acteur,true) THEN RAISE EXCEPTION 'Indisponible' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM ephemer_celebrations.carte_versions WHERE carte=c.id AND revoked_at IS NULL AND expire_at>now();
 IF v.id IS NULL OR public.consulter_carte_collective(v.secret_hash) IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('celebration',c.celebration,'carte',c.id,'version',v.id,'expiresAt',v.expire_at,'secretChiffre',v.secret_chiffre,'hash',v.secret_hash);
END $f$;

CREATE FUNCTION public.preparer_publication_collective(p_plan uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE p ephemer_celebrations.carte_plans; c ephemer_celebrations.cartes_collectives;
BEGIN
 SELECT * INTO p FROM ephemer_celebrations.carte_plans WHERE id=p_plan;
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE id=p.carte;
 IF c.id IS NULL THEN RETURN NULL; END IF;
 PERFORM ephemer_celebrations.carte_verrou(c.celebration);
 SELECT * INTO p FROM ephemer_celebrations.carte_plans WHERE id=p_plan FOR UPDATE;
 SELECT * INTO c FROM ephemer_celebrations.cartes_collectives WHERE id=p.carte;
 IF p.publication_etat<>'programme' OR p.publication>now() OR NOT ephemer_celebrations.carte_autorisee(c.id,p.organisateur,true) THEN RETURN NULL; END IF;
 IF p.publication<now()-interval '48 hours' THEN
  UPDATE ephemer_celebrations.carte_plans SET publication_etat='a_reprogrammer',email_etat=CASE WHEN email_etat='programme' THEN 'a_reprogrammer' ELSE email_etat END WHERE id=p.id;
  RETURN NULL;
 END IF;
 IF c.phase<>'fermee' OR c.validation IS NULL OR c.empreinte IS DISTINCT FROM p.empreinte THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('celebration',c.celebration,'carte',c.id,'actor',p.organisateur,'revision',c.revision);
END $f$;

-- Le client voit uniquement la disponibilité globale, sans journal ni adresse.
CREATE FUNCTION public.collectif_disponible() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 PERFORM ephemer_social.acteur();
 RETURN coalesce((SELECT collective_enabled FROM public.email_delivery_control WHERE singleton),false);
END $f$;
REVOKE ALL ON FUNCTION public.statut_lien_collectif(uuid,uuid),public.preparer_publication_collective(uuid),public.collectif_disponible() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.statut_lien_collectif(uuid,uuid),public.preparer_publication_collective(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.collectif_disponible() TO authenticated;
-- DEBUT PROTECTION CELEBRATIONS 04
-- Ne concerne que coordination/lectures B ; aucune RPC de carte individuelle modifiée.
DO $compatibilite$ DECLARE f record; o oid; BEGIN
 FOR f IN SELECT * FROM (VALUES
('ephemer_celebrations.commander(text,jsonb,uuid)','c2f6ade8011f3ca427ec887f23ca7334',true),
('ephemer_celebrations.detail(uuid,uuid)','00c8b6434faeba548d59c39aee00b707',false)
 ) attendu(signature,empreinte,auth) LOOP
  o:=to_regprocedure(f.signature);
  IF o IS NULL OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=o AND md5(btrim(replace(prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))=f.empreinte AND prosecdef=f.auth AND cardinality(proconfig)=1 AND proconfig[1]='search_path=pg_catalog') THEN RAISE EXCEPTION 'Socle Célébrations différent : %',f.signature; END IF;
  IF has_function_privilege('anon',o,'EXECUTE') OR has_function_privilege('authenticated',o,'EXECUTE') IS DISTINCT FROM f.auth OR has_function_privilege('service_role',o,'EXECUTE') THEN RAISE EXCEPTION 'Permissions B différentes : %',f.signature; END IF;
 END LOOP;
END $compatibilite$;
CREATE OR REPLACE FUNCTION ephemer_celebrations.commander(action text, d jsonb, operation uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE a uuid:=ephemer_social.acteur(); c uuid; b uuid; membre ephemer_celebrations.participations;
  e ephemer_celebrations.celebrations; i ephemer_celebrations.invitations; tr ephemer_celebrations.transferts;
  ta ephemer_celebrations.taches; co ephemer_celebrations.commentaires; de ephemer_celebrations.demandes;
  op ephemer_celebrations.operations; empreinte text; admin boolean; maintenance boolean;
  v_responsable uuid; source_date date; source_projection jsonb; selection record;
BEGIN
  IF operation IS NULL OR NOT ephemer_celebrations.commande_valide(action,d) THEN RAISE EXCEPTION 'Commande invalide' USING ERRCODE='22023'; END IF;
  c:=(d->>'id')::uuid;
  empreinte:=encode(extensions.digest(action||':'||d::text,'sha256'),'hex');
  -- Meme ordre que les commandes sociales : verrou social, puis celebration.
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-celebration:'||c::text,0));
  -- Une tâche collective garde les mêmes exclusions que la carte, même sans UUID destinataire.
  IF action='modifier_tache' AND EXISTS(SELECT 1 FROM ephemer_celebrations.cartes_collectives cc WHERE cc.id=(d->>'tache')::uuid AND cc.celebration=c) THEN
    IF NOT ephemer_celebrations.carte_autorisee((d->>'tache')::uuid,a,true)
     OR ((d->>'responsable') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations cp WHERE cp.id=(d->>'responsable')::uuid AND cp.celebration=c AND cp.etat='active' AND cp.role='organisateur' AND NOT ephemer_celebrations.carte_exclue((d->>'tache')::uuid,cp.compte))) THEN
      RAISE EXCEPTION 'Tache indisponible' USING ERRCODE='42501';
    END IF;
  END IF;
  SELECT * INTO e FROM ephemer_celebrations.celebrations WHERE id=c FOR UPDATE;
  SELECT * INTO membre FROM ephemer_celebrations.participations WHERE celebration=c AND compte=a AND etat IN ('active','maintenance');
  maintenance:=ephemer_celebrations.maintenance(c,a);
  admin:=membre.role='organisateur' AND (ephemer_celebrations.lisible(c,a) OR maintenance);
  -- Exclusions actuelles prioritaires, meme avant restitution d'un ancien resultat.
  IF e.id IS NOT NULL AND e.surprise AND e.destinataire=a THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
  IF e.id IS NOT NULL AND NOT ephemer_celebrations.partage_valide(c) AND action NOT IN ('annuler','supprimer','traiter_suppression') THEN RAISE EXCEPTION 'Partage suspendu' USING ERRCODE='42501'; END IF;
  SELECT * INTO op FROM ephemer_celebrations.operations WHERE acteur=a AND id=operation;
  IF op.id IS NOT NULL THEN
    IF op.empreinte<>empreinte THEN RAISE EXCEPTION 'Identifiant reutilise' USING ERRCODE='22023'; END IF;
    IF ephemer_celebrations.lisible(c,a) OR (maintenance AND action IN ('proposer_transfert','annuler','supprimer')) OR ephemer_celebrations.invite(c,a)
      OR (e.etat='supprimee' AND op.action IN ('supprimer','traiter_suppression'))
      OR (op.action IN ('quitter','refuser') AND e.etat<>'supprimee' AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a)) THEN
      RETURN jsonb_build_object('ok',true,'id',c);
    END IF;
    RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501';
  END IF;
  IF (SELECT count(*) FROM ephemer_celebrations.operations WHERE acteur=a AND created_at>now()-interval '1 hour')>=120 THEN RAISE EXCEPTION 'Limite actions' USING ERRCODE='P1130'; END IF;
  IF action IN ('creer','publier') THEN
    IF e.id IS NOT NULL THEN RAISE EXCEPTION 'Identifiant utilise' USING ERRCODE='40001'; END IF;
    b:=(d->>'destinataire')::uuid;
    IF (d->>'surprise')::boolean AND (b=a OR ((d->>'mode')='partage' AND b IS NULL)) THEN RAISE EXCEPTION 'Surprise indisponible' USING ERRCODE='42501'; END IF;
    IF b IS NOT NULL AND b<>a AND NOT ephemer_celebrations.ami(a,b) THEN RAISE EXCEPTION 'Destinataire indisponible' USING ERRCODE='42501'; END IF;
    IF (SELECT count(*) FROM ephemer_celebrations.participations WHERE compte=a AND role='organisateur' AND etat IN ('active','maintenance'))>=100 THEN RAISE EXCEPTION 'Limite atteinte' USING ERRCODE='P1130'; END IF;
    IF action='publier' THEN
      IF NOT (d->>'confirmer')::boolean THEN RAISE EXCEPTION 'Confirmation requise' USING ERRCODE='22023'; END IF;
      SELECT o.date_occurrence INTO source_date FROM public.preparations_evenements p JOIN public.occurrences_evenements o ON o.id=p.occurrence_id AND o.user_id=p.user_id
        WHERE p.id=(d->>'preparation')::uuid AND p.user_id=a FOR SHARE OF p,o;
      IF NOT FOUND THEN RAISE EXCEPTION 'Source indisponible' USING ERRCODE='42501'; END IF;
      IF EXISTS(SELECT 1 FROM ephemer_celebrations.sources WHERE proprietaire=a AND preparation=(d->>'preparation')::uuid) THEN RAISE EXCEPTION 'Preparation deja publiee : relire' USING ERRCODE='40001'; END IF;
      IF (SELECT count(*) FROM public.taches_preparation WHERE user_id=a AND preparation_id=(d->>'preparation')::uuid AND id IN(SELECT x::uuid FROM jsonb_array_elements_text(d->'taches') x))<>jsonb_array_length(d->'taches') THEN RAISE EXCEPTION 'Selection indisponible' USING ERRCODE='42501'; END IF;
      PERFORM t.id FROM public.taches_preparation t WHERE t.user_id=a AND t.preparation_id=(d->>'preparation')::uuid
        AND t.id IN(SELECT x::uuid FROM jsonb_array_elements_text(d->'taches') x) ORDER BY t.id FOR SHARE OF t;
      SELECT jsonb_build_object('date',source_date,'taches',coalesce(jsonb_agg(jsonb_build_object('id',t.id,'titre',t.titre,'type',t.type_tache) ORDER BY t.id),'[]'::jsonb)) INTO source_projection
        FROM public.taches_preparation t WHERE t.user_id=a AND t.preparation_id=(d->>'preparation')::uuid
          AND t.id IN(SELECT x::uuid FROM jsonb_array_elements_text(d->'taches') x);
      IF source_projection IS DISTINCT FROM d->'apercuSource' THEN RAISE EXCEPTION 'Source changee : refaire apercu' USING ERRCODE='40001'; END IF;
    END IF;
    INSERT INTO ephemer_celebrations.celebrations(id,titre,date_fete,date_canonique,heure,lieu,mode,surprise,destinataire)
      VALUES(c,d->>'titre',(d->>'date')::date,source_date,(d->>'heure')::time,d->>'lieu',d->>'mode',(d->>'surprise')::boolean,b);
    INSERT INTO ephemer_celebrations.participations(celebration,compte,role) VALUES(c,a,'organisateur') RETURNING * INTO membre;
    IF action='publier' THEN
      INSERT INTO ephemer_celebrations.sources VALUES(c,a,(d->>'preparation')::uuid);
      INSERT INTO ephemer_celebrations.taches(id,celebration,auteur,titre,type,responsable)
        SELECT gen_random_uuid(),c,a,titre,type_tache,membre.id FROM public.taches_preparation
          WHERE user_id=a AND preparation_id=(d->>'preparation')::uuid AND id IN(SELECT x::uuid FROM jsonb_array_elements_text(d->'taches') x);
      -- Etat a_faire, aucun brouillon, note, budget, carte ou progression privee copie.
    END IF;
  ELSE
    IF e.id IS NULL OR e.etat='supprimee' OR (e.surprise AND e.destinataire=a) THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
    IF action IN ('accepter','refuser','demander_suppression') THEN
      IF NOT ephemer_celebrations.lisible(c,a) AND NOT ephemer_celebrations.invite(c,a) THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
    ELSIF action IN ('accepter_transfert','refuser_transfert') THEN
      IF membre.id IS NULL OR membre.etat<>'active' OR e.etat NOT IN ('active','suspendue') THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
    ELSIF NOT ephemer_celebrations.lisible(c,a) AND NOT (maintenance AND action IN ('proposer_transfert','supprimer','annuler')) THEN
      RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501';
    END IF;
    IF action IN ('modifier','inviter','revoquer','retirer','proposer_transfert','annuler','archiver','supprimer','traiter_suppression') AND NOT coalesce(admin,false) THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
    IF action IN ('modifier','inviter','ajouter_tache','modifier_tache','commenter','modifier_commentaire') AND e.etat<>'active' THEN RAISE EXCEPTION 'Celebration fermee' USING ERRCODE='40001'; END IF;
    IF action IN ('modifier','annuler','archiver','supprimer') AND e.revision<>(d->>'revision')::bigint THEN RAISE EXCEPTION 'Revision changee' USING ERRCODE='40001'; END IF;

    IF NOT ephemer_celebrations.partage_valide(c) AND action NOT IN ('annuler','supprimer') THEN RAISE EXCEPTION 'Partage suspendu' USING ERRCODE='42501'; END IF;
    -- Un meme UUID ne peut representer deux lignes de la liste paginee des invitations.
  -- Le verrou social commun est deja acquis ; un reessai confirme est retourne plus haut.
  IF action IN ('inviter','proposer_transfert','demander_suppression') THEN
    b:=coalesce(d->>'invitation',d->>'transfert',d->>'demande')::uuid;
    IF EXISTS(SELECT 1 FROM ephemer_celebrations.invitations WHERE id=b)
      OR EXISTS(SELECT 1 FROM ephemer_celebrations.transferts WHERE id=b)
      OR EXISTS(SELECT 1 FROM ephemer_celebrations.demandes WHERE id=b) THEN
      RAISE EXCEPTION 'Identifiant utilise : nouvelle commande requise' USING ERRCODE='40001';
    END IF;
  END IF;

    IF action='modifier' THEN
      b:=(d->>'destinataire')::uuid;
      IF b IS NOT NULL AND b<>a AND b IS DISTINCT FROM e.destinataire AND NOT ephemer_celebrations.ami(a,b) THEN RAISE EXCEPTION 'Destinataire indisponible' USING ERRCODE='42501'; END IF;
      IF (d->>'surprise')::boolean AND (b=a OR (d->>'mode'='partage' AND b IS NULL)) THEN RAISE EXCEPTION 'Surprise indisponible' USING ERRCODE='42501'; END IF;
      IF e.surprise IS DISTINCT FROM (d->>'surprise')::boolean OR e.destinataire IS DISTINCT FROM b OR e.mode IS DISTINCT FROM (d->>'mode') THEN
        IF NOT (d->>'revoirAcces')::boolean THEN RAISE EXCEPTION 'Revue des acces requise' USING ERRCODE='22023'; END IF;
        UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=c AND etat='attente';
        UPDATE ephemer_celebrations.transferts SET etat='annule' WHERE celebration=c AND etat='attente';
        FOR selection IN SELECT id FROM ephemer_celebrations.participations WHERE celebration=c AND compte<>a AND etat='active'
          AND ((d->>'mode')='seul' OR ((d->>'surprise')::boolean AND compte=b)) LOOP PERFORM ephemer_celebrations.sortir(c,selection.id); END LOOP;
      END IF;
      UPDATE ephemer_celebrations.celebrations SET titre=d->>'titre',date_fete=(d->>'date')::date,heure=(d->>'heure')::time,lieu=d->>'lieu',mode=d->>'mode',surprise=(d->>'surprise')::boolean,destinataire=b WHERE id=c;
      PERFORM ephemer_celebrations.notifier(c,'changement');
    ELSIF action='inviter' THEN
      b:=(d->>'cible')::uuid;
      IF e.mode<>'partage' OR NOT ephemer_celebrations.ami(a,b) OR (e.surprise AND (e.destinataire=b OR e.destinataire IS NULL))
        OR EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration=c AND etat='active' AND (compte=b OR ephemer_social.bloquee(b,compte))) THEN RAISE EXCEPTION 'Invitation indisponible' USING ERRCODE='42501'; END IF;
      UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=c AND etat='attente' AND expire_at<=now();
      IF (SELECT count(*) FROM ephemer_celebrations.invitations WHERE celebration=c AND etat='attente')>=20
        OR (SELECT count(*) FROM ephemer_celebrations.invitations WHERE celebration=c AND emetteur=a AND created_at>now()-interval '24 hours')>=10 THEN RAISE EXCEPTION 'Limite invitations' USING ERRCODE='P1130'; END IF;
      INSERT INTO ephemer_celebrations.invitations(id,celebration,emetteur,cible) VALUES((d->>'invitation')::uuid,c,a,b);
      INSERT INTO ephemer_celebrations.notifications(celebration,compte,type) VALUES(c,b,'invitation');
    ELSIF action IN ('accepter','refuser','revoquer') THEN
      SELECT * INTO i FROM ephemer_celebrations.invitations WHERE id=(d->>'invitation')::uuid AND celebration=c FOR UPDATE;
      IF i.id IS NULL OR i.etat<>'attente' OR i.expire_at<=now() OR (action<>'revoquer' AND (i.cible<>a OR NOT ephemer_celebrations.invite(c,a))) THEN RAISE EXCEPTION 'Invitation indisponible' USING ERRCODE='42501'; END IF;
      IF action='accepter' THEN
        IF (SELECT count(*) FROM ephemer_celebrations.participations WHERE celebration=c AND etat='active')>=30 THEN RAISE EXCEPTION 'Limite participants' USING ERRCODE='P1130'; END IF;
        INSERT INTO ephemer_celebrations.participations(celebration,compte,role,generation)
          SELECT c,a,'participant',coalesce(max(generation),0)+1 FROM ephemer_celebrations.participations WHERE celebration=c AND compte=a;
      END IF;
      UPDATE ephemer_celebrations.invitations SET etat=CASE action WHEN 'accepter' THEN 'acceptee' WHEN 'refuser' THEN 'refusee' ELSE 'revoquee' END WHERE id=i.id;
      DELETE FROM ephemer_celebrations.notifications WHERE celebration=c AND compte=i.cible AND type='invitation';
    ELSIF action IN ('quitter','retirer') THEN
      IF action='retirer' THEN SELECT * INTO membre FROM ephemer_celebrations.participations WHERE celebration=c AND id=(d->>'participation')::uuid AND etat='active'; END IF;
      IF membre.id IS NULL OR membre.etat<>'active' THEN RAISE EXCEPTION 'Participation indisponible' USING ERRCODE='42501'; END IF;
      IF membre.role='organisateur' AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration=c AND role='organisateur' AND etat='active' AND id<>membre.id AND (NOT e.surprise OR compte IS DISTINCT FROM e.destinataire)) THEN
        IF action<>'quitter' OR NOT (d->>'cloturer')::boolean THEN RAISE EXCEPTION 'Transfert accepte ou cloture requis' USING ERRCODE='40001'; END IF;
        UPDATE ephemer_celebrations.celebrations SET etat='annulee' WHERE id=c;
        UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=c AND etat='attente';
      END IF;
      PERFORM ephemer_celebrations.sortir(c,membre.id);
    ELSIF action='proposer_transfert' THEN
      b:=(d->>'cible')::uuid;
      IF b=a OR ephemer_social.bloquee(a,b) OR NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration=c AND compte=b AND etat='active') THEN RAISE EXCEPTION 'Transfert indisponible' USING ERRCODE='42501'; END IF;
      UPDATE ephemer_celebrations.transferts SET etat='annule' WHERE celebration=c AND etat='attente' AND expire_at<=now();
      INSERT INTO ephemer_celebrations.transferts(id,celebration,initiateur,cible) VALUES((d->>'transfert')::uuid,c,a,b);
    ELSIF action IN ('accepter_transfert','refuser_transfert') THEN
      SELECT * INTO tr FROM ephemer_celebrations.transferts WHERE celebration=c AND id=(d->>'transfert')::uuid FOR UPDATE;
      IF tr.id IS NULL OR tr.cible<>a OR tr.etat<>'attente' OR tr.expire_at<=now() OR ephemer_social.bloquee(a,tr.initiateur)
        OR NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration=c AND compte=tr.initiateur AND role='organisateur' AND etat IN ('active','maintenance')) THEN RAISE EXCEPTION 'Transfert indisponible' USING ERRCODE='42501'; END IF;
      IF action='accepter_transfert' THEN
        UPDATE ephemer_celebrations.participations SET role='participant' WHERE celebration=c AND compte=tr.initiateur AND etat='active';
        FOR selection IN SELECT id FROM ephemer_celebrations.participations WHERE celebration=c AND compte=tr.initiateur AND etat='maintenance' LOOP PERFORM ephemer_celebrations.sortir(c,selection.id); END LOOP;
        UPDATE ephemer_celebrations.participations SET role='organisateur' WHERE id=membre.id;
        UPDATE ephemer_celebrations.celebrations SET etat='active' WHERE id=c AND etat='suspendue';
      END IF;
      UPDATE ephemer_celebrations.transferts SET etat=CASE action WHEN 'accepter_transfert' THEN 'accepte' ELSE 'refuse' END WHERE id=tr.id;
    ELSIF action IN ('ajouter_tache','modifier_tache') THEN
      v_responsable:=(d->>'responsable')::uuid;
      IF v_responsable IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE celebration=c AND id=v_responsable AND etat='active') THEN RAISE EXCEPTION 'Responsable indisponible' USING ERRCODE='42501'; END IF;
      IF action='ajouter_tache' THEN
        IF e.destinataire=a AND d->>'type' IN ('cadeau','message') THEN RAISE EXCEPTION 'Tache indisponible' USING ERRCODE='42501'; END IF;
        IF d->>'type' IN ('cadeau','message') AND EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE id=v_responsable AND compte=e.destinataire) THEN RAISE EXCEPTION 'Responsable indisponible' USING ERRCODE='42501'; END IF;
        IF NOT coalesce(admin,false) AND v_responsable IS DISTINCT FROM membre.id THEN RAISE EXCEPTION 'Attribuer seulement a soi' USING ERRCODE='42501'; END IF;
        IF (SELECT count(*) FROM ephemer_celebrations.taches WHERE celebration=c)>=100 THEN RAISE EXCEPTION 'Limite taches' USING ERRCODE='P1130'; END IF;
        INSERT INTO ephemer_celebrations.taches(id,celebration,auteur,titre,type,responsable,echeance) VALUES((d->>'tache')::uuid,c,a,d->>'titre',d->>'type',v_responsable,(d->>'echeance')::date);
      ELSE
        SELECT * INTO ta FROM ephemer_celebrations.taches WHERE id=(d->>'tache')::uuid AND celebration=c FOR UPDATE;
        IF ta.type IN ('cadeau','message') AND (e.destinataire=a OR EXISTS(SELECT 1 FROM ephemer_celebrations.participations WHERE id=v_responsable AND compte=e.destinataire)) THEN RAISE EXCEPTION 'Tache indisponible' USING ERRCODE='42501'; END IF;
        IF ta.id IS NULL OR (NOT coalesce(admin,false) AND ta.responsable IS DISTINCT FROM membre.id AND ta.auteur IS DISTINCT FROM a)
          OR (NOT coalesce(admin,false) AND v_responsable IS DISTINCT FROM ta.responsable) THEN RAISE EXCEPTION 'Tache indisponible' USING ERRCODE='42501'; END IF;
        IF ta.revision<>(d->>'revision')::bigint THEN RAISE EXCEPTION 'Tache changee' USING ERRCODE='40001'; END IF;
        UPDATE ephemer_celebrations.taches SET titre=d->>'titre',responsable=v_responsable,echeance=(d->>'echeance')::date,etat=d->>'etat',revision=revision+1 WHERE id=ta.id;
      END IF;
      IF v_responsable IS NOT NULL THEN SELECT compte INTO b FROM ephemer_celebrations.participations WHERE id=v_responsable; PERFORM ephemer_celebrations.notifier(c,'tache',b); END IF;
    ELSIF action IN ('commenter','modifier_commentaire','retirer_commentaire') THEN
      IF action='commenter' THEN
        IF (SELECT count(*) FROM ephemer_celebrations.commentaires WHERE celebration=c)>=100 OR (SELECT count(*) FROM ephemer_celebrations.operations o WHERE o.celebration=c AND o.acteur=a AND o.action='commenter' AND o.created_at>now()-interval '1 hour')>=30 THEN RAISE EXCEPTION 'Limite commentaires' USING ERRCODE='P1130'; END IF;
        INSERT INTO ephemer_celebrations.commentaires(id,celebration,auteur,texte) VALUES((d->>'commentaire')::uuid,c,a,d->>'texte');
      ELSE
        SELECT * INTO co FROM ephemer_celebrations.commentaires WHERE id=(d->>'commentaire')::uuid AND celebration=c FOR UPDATE;
        IF co.id IS NULL OR (co.auteur IS DISTINCT FROM a AND (action<>'retirer_commentaire' OR NOT coalesce(admin,false))) THEN RAISE EXCEPTION 'Commentaire indisponible' USING ERRCODE='42501'; END IF;
        IF action='modifier_commentaire' THEN
          IF co.revision<>(d->>'revision')::bigint THEN RAISE EXCEPTION 'Commentaire change' USING ERRCODE='40001'; END IF;
          UPDATE ephemer_celebrations.commentaires SET texte=d->>'texte',revision=revision+1 WHERE id=co.id;
        ELSE DELETE FROM ephemer_celebrations.commentaires WHERE id=co.id; END IF;
      END IF;
    ELSIF action IN ('annuler','archiver','supprimer') THEN
      IF action<>'archiver' AND NOT (d->>'confirmer')::boolean THEN RAISE EXCEPTION 'Confirmation requise' USING ERRCODE='22023'; END IF;
      IF action='supprimer' THEN PERFORM ephemer_celebrations.supprimer(c);
      ELSE
        UPDATE ephemer_celebrations.celebrations SET etat=CASE action WHEN 'annuler' THEN 'annulee' ELSE 'archivee' END WHERE id=c;
        UPDATE ephemer_celebrations.invitations SET etat='revoquee' WHERE celebration=c AND etat='attente';
        UPDATE ephemer_celebrations.transferts SET etat='annule' WHERE celebration=c AND etat='attente';
        IF maintenance THEN PERFORM ephemer_celebrations.sortir(c,membre.id); END IF;
      END IF;
    ELSIF action='demander_suppression' THEN
      IF (SELECT count(*) FROM ephemer_celebrations.demandes WHERE celebration=c)>=100 OR (SELECT count(*) FROM ephemer_celebrations.demandes WHERE celebration=c AND demandeur=a AND created_at>now()-interval '30 days')>=3 THEN RAISE EXCEPTION 'Limite demandes' USING ERRCODE='P1130'; END IF;
      INSERT INTO ephemer_celebrations.demandes(id,celebration,demandeur,motif) VALUES((d->>'demande')::uuid,c,a,d->>'motif');
      FOR selection IN SELECT compte FROM ephemer_celebrations.participations WHERE celebration=c AND role='organisateur' AND etat='active' LOOP PERFORM ephemer_celebrations.notifier(c,'demande',selection.compte); END LOOP;
    ELSIF action='traiter_suppression' THEN
      SELECT * INTO de FROM ephemer_celebrations.demandes WHERE celebration=c AND id=(d->>'demande')::uuid FOR UPDATE;
      IF de.id IS NULL OR de.etat<>'attente' OR de.revision<>(d->>'revision')::bigint THEN RAISE EXCEPTION 'Demande changee' USING ERRCODE='40001'; END IF;
      IF NOT ephemer_celebrations.lisible(c,de.demandeur) AND NOT ephemer_celebrations.invite(c,de.demandeur) THEN RAISE EXCEPTION 'Demande indisponible' USING ERRCODE='42501'; END IF;
      IF (d->>'accepter')::boolean THEN
        IF NOT (d->>'confirmer')::boolean THEN RAISE EXCEPTION 'Confirmation requise' USING ERRCODE='22023'; END IF;
        UPDATE ephemer_celebrations.demandes SET etat='acceptee',revision=revision+1,decide_at=now() WHERE id=de.id;
        PERFORM ephemer_celebrations.supprimer(c);
      ELSE UPDATE ephemer_celebrations.demandes SET etat='refusee',revision=revision+1,decide_at=now() WHERE id=de.id; PERFORM ephemer_celebrations.notifier(c,'reponse',de.demandeur); END IF;
    END IF;
  END IF;
  IF action NOT IN ('supprimer','traiter_suppression') OR NOT EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations WHERE id=c AND etat='supprimee') THEN
    IF action IN ('modifier','annuler','archiver','accepter_transfert') OR (action='quitter' AND (d->>'cloturer')::boolean) THEN
      UPDATE ephemer_celebrations.celebrations SET revision=revision+1 WHERE id=c;
    END IF;
    PERFORM ephemer_celebrations.tracer(c,action);
  END IF;
  INSERT INTO ephemer_celebrations.operations(acteur,id,celebration,empreinte,action) VALUES(a,operation,c,empreinte,action);
  RETURN jsonb_build_object('ok',true,'id',c);
END $function$;
CREATE OR REPLACE FUNCTION ephemer_celebrations.detail(c uuid, a uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE r jsonb; est_admin boolean; est_maintenance boolean; e ephemer_celebrations.celebrations;
BEGIN
  est_maintenance:=ephemer_celebrations.maintenance(c,a);
  IF NOT ephemer_celebrations.lisible(c,a) AND NOT est_maintenance THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
  SELECT * INTO e FROM ephemer_celebrations.celebrations WHERE id=c;
  SELECT role='organisateur' INTO est_admin FROM ephemer_celebrations.participations WHERE celebration=c AND compte=a AND etat IN ('active','maintenance');
  r:=jsonb_build_object('celebration',ephemer_celebrations.resume(c,a),'participants','[]'::jsonb,'taches','[]'::jsonb,'commentaires','[]'::jsonb,'invitations','[]'::jsonb,'transferts','[]'::jsonb,'demandes','[]'::jsonb,'actions','[]'::jsonb,'notifications','[]'::jsonb);
  r:=jsonb_set(r,'{participants}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'compte',m.compte,'identite',ephemer_social.identite(m.compte),'role',m.role,'etat',m.etat) ORDER BY m.id)
    FROM ephemer_celebrations.participations m WHERE m.celebration=c AND m.etat='active' AND NOT ephemer_social.bloquee(a,m.compte) AND (NOT est_maintenance OR ephemer_celebrations.partage_valide(c) OR m.compte=a)),'[]'::jsonb));
  r:=jsonb_set(r,'{transferts}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'cible',t.cible,'initiateur',t.initiateur,'expiration',t.expire_at) ORDER BY t.id)
    FROM ephemer_celebrations.transferts t WHERE t.celebration=c AND t.etat='attente' AND t.expire_at>now() AND ephemer_celebrations.partage_valide(c) AND (est_admin OR t.cible=a)),'[]'::jsonb));
  IF est_maintenance THEN RETURN r; END IF;
  r:=jsonb_set(r,'{taches}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'titre',t.titre,'type',t.type,'responsable',t.responsable,'echeance',t.echeance,'etat',t.etat,'revision',t.revision,'auteur',t.auteur) ORDER BY t.id) FROM ephemer_celebrations.taches t WHERE t.celebration=c AND (e.destinataire IS DISTINCT FROM a OR t.type NOT IN ('cadeau','message')) AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.cartes_collectives cc WHERE cc.id=t.id AND ephemer_celebrations.carte_exclue(cc.id,a))),'[]'::jsonb));
  r:=jsonb_set(r,'{commentaires}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'texte',t.texte,'auteur',t.auteur,'revision',t.revision,'identite',CASE WHEN EXISTS(SELECT 1 FROM ephemer_celebrations.participations m WHERE m.celebration=c AND m.compte=t.auteur AND m.etat='active') THEN ephemer_social.identite(t.auteur) ELSE 'Participant parti' END) ORDER BY t.created_at,t.id) FROM ephemer_celebrations.commentaires t WHERE t.celebration=c),'[]'::jsonb));
  IF est_admin THEN r:=jsonb_set(r,'{invitations}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'cible',t.cible,'identite',ephemer_social.identite(t.cible),'expiration',t.expire_at) ORDER BY t.id) FROM ephemer_celebrations.invitations t WHERE t.celebration=c AND t.etat='attente' AND t.expire_at>now()),'[]'::jsonb)); END IF;
  r:=jsonb_set(r,'{demandes}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'demandeur',t.demandeur,'motif',t.motif,'etat',t.etat,'revision',t.revision) ORDER BY t.id)
    FROM ephemer_celebrations.demandes t WHERE t.celebration=c AND (t.demandeur=a OR (est_admin AND (ephemer_celebrations.lisible(c,t.demandeur) OR ephemer_celebrations.invite(c,t.demandeur))))),'[]'::jsonb));
  r:=jsonb_set(r,'{actions}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'action',t.action,'date',t.created_at) ORDER BY t.created_at DESC,t.id DESC) FROM ephemer_celebrations.actions t WHERE t.celebration=c AND ((e.destinataire IS DISTINCT FROM a AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.cartes_collectives cc WHERE cc.celebration=c AND ephemer_celebrations.carte_exclue(cc.id,a))) OR t.action NOT IN ('ajouter_tache','modifier_tache','publier'))),'[]'::jsonb));
  r:=jsonb_set(r,'{notifications}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'type',t.type,'date',t.created_at) ORDER BY t.created_at DESC,t.id DESC) FROM ephemer_celebrations.notifications t WHERE t.celebration=c AND t.compte=a AND (t.type<>'tache' OR NOT EXISTS(SELECT 1 FROM ephemer_celebrations.cartes_collectives cc WHERE cc.celebration=c AND ephemer_celebrations.carte_exclue(cc.id,a)))),'[]'::jsonb));
  RETURN r;
END $function$;
-- FIN PROTECTION CELEBRATIONS 04
NOTIFY pgrst,'reload schema';
COMMIT;
