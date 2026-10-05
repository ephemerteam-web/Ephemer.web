-- Lot 02 — PROPOSITION NON VALIDEE / NON APPLIQUEE — 5 octobre 2026.
-- Lire README.md. Application humaine sur copie de test, puis revue distincte.
-- Aucune conversion des contacts historiques ; aucun envoi ni appel externe.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preconditions$
BEGIN
  IF current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'Proposition preparee pour PostgreSQL 17 ; relire avant autre version.';
  END IF;
  IF to_regclass('public.contacts') IS NULL OR to_regclass('public.profiles') IS NULL OR to_regclass('public.rappels') IS NULL
     OR to_regclass('public.notifications') IS NULL THEN
    RAISE EXCEPTION 'Tables historiques attendues absentes.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'ephemer_lot02')
     OR to_regclass('public.evenements_personnels') IS NOT NULL
     OR to_regclass('public.regles_evenements') IS NOT NULL
     OR to_regclass('public.occurrences_evenements') IS NOT NULL THEN
    RAISE EXCEPTION 'Objets lot 02 deja presents : inspecter, ne pas reexecuter.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name IN ('rappels', 'notifications') AND column_name LIKE 'occurrence_%') THEN
    RAISE EXCEPTION 'Colonnes occurrence deja presentes : contrat divergent.';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name IN ('rappels','notifications') AND column_name = 'contact_id'
    AND data_type = 'bigint' AND is_nullable = 'NO') <> 2 THEN
    RAISE EXCEPTION 'Relire types et nullabilite des liens historiques.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name = 'contacts' AND column_name = 'date_naissance' AND data_type = 'date') THEN
    RAISE EXCEPTION 'Contrat historique de naissance divergent.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='profiles' AND column_name='date_naissance' AND data_type='date') THEN
    RAISE EXCEPTION 'Contrat de naissance du profil divergent.';
  END IF;
END;
$preconditions$;

-- Schema prive NON expose dans la Data API. Pas de nouveau Storage.
CREATE SCHEMA ephemer_lot02;
REVOKE ALL ON SCHEMA ephemer_lot02 FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA ephemer_lot02 TO authenticated, service_role;

-- Témoin persistant : rollback interdit après utilisation, même si l'utilisateur
-- efface ensuite tous ses événements. Ne pas perdre les modifications du legacy.
CREATE TABLE ephemer_lot02.etat_schema (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  utilise boolean NOT NULL DEFAULT false
);
ALTER TABLE ephemer_lot02.etat_schema ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ephemer_lot02.etat_schema FROM PUBLIC, anon, authenticated, service_role;
INSERT INTO ephemer_lot02.etat_schema(singleton,utilise) VALUES(true,false);

-- Catalogue de reference copie du SAINTS local ; aucune donnee de contact.
CREATE TABLE ephemer_lot02.fetes_catalogue (
  prenom_cle text NOT NULL,
  mois smallint NOT NULL,
  jour smallint NOT NULL,
  PRIMARY KEY (prenom_cle, mois, jour),
  CHECK (mois BETWEEN 1 AND 12 AND jour BETWEEN 1 AND 31)
);
ALTER TABLE ephemer_lot02.fetes_catalogue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ephemer_lot02.fetes_catalogue FROM PUBLIC, anon, authenticated, service_role;

-- Le bloc genere du catalogue est insere ici avant livraison documentaire.
-- Catalogue SAINTS : 483 correspondances uniques ; SHA-256 source 8f5e8ff3be339347c99f540cde90439e7cb2d26d92d9083e593c6a7b850c0977.
INSERT INTO ephemer_lot02.fetes_catalogue (prenom_cle,mois,jour) VALUES
('abel',8,5),
('achille',5,12),
('adele',12,24),
('adeline',10,20),
('adeline',12,24),
('adelphe',9,11),
('agathe',2,5),
('agnes',1,21),
('aime',2,20),
('aime',9,13),
('aimee',2,20),
('alain',9,9),
('alban',6,22),
('albert',11,15),
('albin',3,1),
('alex',4,22),
('alexandra',4,22),
('alexandre',4,22),
('alexia',2,17),
('alexis',2,17),
('alice',1,9),
('alice',12,16),
('alicia',1,9),
('alida',4,26),
('alix',1,9),
('alphonse',8,1),
('amanda',7,9),
('amandine',7,9),
('ambroise',12,7),
('amedee',3,30),
('amour',8,9),
('andre',11,30),
('andrew',11,30),
('angele',1,27),
('angelina',1,27),
('angelique',1,27),
('anicet',4,17),
('anna',7,26),
('anne',7,26),
('anselme',4,21),
('anthelme',6,26),
('anthony',1,17),
('antoine',1,17),
('antoine',6,13),
('antoine',7,5),
('antonin',1,17),
('apollinaire',9,12),
('apolline',2,9),
('aristide',8,31),
('armand',12,23),
('armande',12,23),
('armel',8,16),
('arnaud',2,10),
('arsene',7,19),
('aubin',3,1),
('aude',11,18),
('audrey',6,23),
('auguste',2,29),
('augustin',2,29),
('augustin',5,27),
('augustin',8,28),
('aymar',5,29),
('balthazar',1,6),
('barbara',12,4),
('barnabe',6,11),
('barnard',1,23),
('barthelemy',8,24),
('basil',1,2),
('basile',1,2),
('bastien',1,20),
('baudouin',10,17),
('beatrice',2,13),
('ben',3,31),
('benedicte',3,16),
('benjamin',3,31),
('benoit',3,16),
('benoit',4,16),
('benoit',7,11),
('berenger',5,26),
('bernadette',2,18),
('bernard',1,23),
('bernard',8,20),
('bernardin',5,20),
('bertille',11,6),
('bertrand',9,6),
('bienvenue',10,30),
('blaise',2,3),
('boris',5,2),
('brice',11,13),
('brigitte',7,23),
('bruno',10,6),
('carine',11,7),
('carmel',7,16),
('casimir',3,4),
('catherine',3,24),
('catherine',4,29),
('catherine',11,25),
('cathy',3,24),
('cecile',11,22),
('cecilia',11,22),
('cedric',1,7),
('celine',10,21),
('chantal',8,12),
('chantal',12,12),
('charles',3,2),
('charles',11,4),
('charlie',3,2),
('charlotte',7,17),
('christelle',7,24),
('christian',11,12),
('christine',7,24),
('christophe',8,21),
('claire',8,11),
('clara',8,11),
('claude',2,15),
('claudie',2,15),
('clemence',3,21),
('clement',11,23),
('clementine',3,21),
('clotilde',6,4),
('colette',3,6),
('come',9,26),
('conception',12,8),
('constant',9,23),
('constantin',5,21),
('croix',9,14),
('cyril',3,18),
('cyrille',3,18),
('daniel',12,11),
('david',12,29),
('davy',9,20),
('defunts',11,2),
('delphine',11,26),
('denis',10,9),
('denise',5,15),
('desire',5,8),
('diana',6,9),
('diane',6,9),
('didier',5,23),
('dimitri',10,26),
('dominique',8,8),
('donald',7,15),
('donatien',5,24),
('doria',10,25),
('eddie',1,5),
('edith',9,16),
('edmond',11,20),
('edouard',1,5),
('edward',1,5),
('edwige',10,16),
('elena',8,18),
('eleonore',2,1),
('elisabeth',11,17),
('elisee',6,14),
('elizabeth',11,17),
('ella',2,1),
('elodie',10,22),
('emeline',10,27),
('emilie',5,22),
('emilie',9,19),
('emily',5,22),
('emma',4,19),
('eric',5,18),
('erika',5,18),
('estelle',5,11),
('etienne',12,26),
('eugene',2,7),
('eugene',6,2),
('eugenie',2,7),
('evrard',8,14),
('fabien',1,20),
('fabrice',8,22),
('felicie',2,12),
('felicite',3,7),
('felicity',3,7),
('felix',2,12),
('fernand',6,27),
('fiacre',8,30),
('fidele',4,24),
('firmin',10,11),
('fleur',10,5),
('flora',11,24),
('flore',11,24),
('florence',12,1),
('florent',7,4),
('florentin',10,24),
('florian',5,4),
('floriane',5,4),
('france',3,9),
('france',7,14),
('francis',1,24),
('francis',12,3),
('francois',1,24),
('francois',10,4),
('francois',12,3),
('francoise',3,9),
('francoise',12,22),
('frederic',7,18),
('fulbert',4,10),
('gabin',2,19),
('gabriel',3,25),
('gabrielle',3,25),
('gael',12,17),
('gaelle',12,17),
('gaetan',8,7),
('gaspar',1,6),
('gaston',2,6),
('gatien',12,18),
('gautier',4,9),
('genevieve',1,3),
('geoffroy',11,8),
('georges',4,23),
('gerald',12,5),
('gerard',10,3),
('geraud',10,13),
('germain',5,28),
('germaine',6,15),
('ghislain',10,10),
('gilbert',6,7),
('gildas',1,29),
('gilles',9,1),
('ginette',1,3),
('gisele',5,7),
('gladys',3,29),
('gontran',3,28),
('gregoire',9,3),
('gregory',9,3),
('guenole',3,3),
('guillaume',1,10),
('guy',6,12),
('habib',3,27),
('helene',8,18),
('henri',7,13),
('henry',7,13),
('herbert',3,20),
('hermann',9,25),
('herve',6,17),
('hilaire',1,13),
('hippolyte',8,13),
('honore',5,16),
('honorine',2,27),
('hubert',11,3),
('hugo',4,1),
('hugues',4,1),
('hyacinthe',8,17),
('ignace',7,31),
('igor',6,5),
('ines',1,21),
('ines',9,10),
('ingrid',9,2),
('innocent',12,28),
('irene',4,5),
('irenee',6,28),
('isabel',2,22),
('isabelle',2,22),
('isidore',4,4),
('jackie',2,8),
('jacqueline',2,8),
('jacques',7,25),
('jacques',11,28),
('james',7,25),
('jean-baptiste',6,24),
('jean-francois',6,16),
('jean-marie',8,4),
('jean',3,8),
('jean',4,7),
('jean',6,24),
('jean',8,19),
('jean',10,23),
('jean',12,27),
('jeanne',5,30),
('jerome',9,30),
('joseph',3,19),
('joseph',5,1),
('josephine',3,19),
('judith',5,5),
('jules',4,12),
('julia',4,8),
('julie',4,8),
('julien',2,16),
('julien',8,2),
('julienne',2,16),
('juliette',7,30),
('juste',10,14),
('justin',3,12),
('justin',6,1),
('justine',3,12),
('kevin',6,3),
('landry',6,10),
('larissa',3,26),
('laurent',8,10),
('lazare',2,23),
('lea',3,22),
('leger',10,2),
('leo',11,10),
('leon',11,10),
('leonard',11,10),
('leonce',6,18),
('liam',1,10),
('louis',3,15),
('louis',8,25),
('louise',3,15),
('lourdes',2,11),
('luc',10,18),
('lucas',10,18),
('lucie',12,13),
('lucien',1,8),
('lucy',12,13),
('ludovic',8,25),
('lydie',8,3),
('madeleine',7,22),
('marc',4,25),
('marcel',1,16),
('marcella',1,31),
('marcelle',1,16),
('marcelle',1,31),
('marcellin',4,6),
('marco',4,25),
('margot',11,16),
('marguerite',11,16),
('maria',1,1),
('marianne',1,1),
('marie',1,1),
('marie',5,31),
('marie',8,15),
('marie',9,8),
('marie',10,7),
('marie',11,21),
('mariette',7,6),
('marina',7,20),
('mario',1,19),
('marion',1,1),
('marius',1,19),
('marthe',7,29),
('martial',6,30),
('martin',4,13),
('martin',11,11),
('martina',1,30),
('martine',1,30),
('martinien',7,2),
('mary',1,1),
('mathilde',3,14),
('matthew',9,21),
('matthias',5,14),
('matthieu',9,21),
('maud',3,14),
('maurice',9,22),
('max',4,14),
('maxime',4,14),
('medard',6,8),
('melchior',1,6),
('michael',9,29),
('michel',9,29),
('modeste',2,24),
('monique',8,27),
('nadege',9,18),
('narcisse',10,29),
('natacha',8,26),
('nathalie',7,27),
('nestor',2,26),
('nicolas',12,6),
('nicole',12,6),
('nina',1,14),
('ninon',12,15),
('noel',12,25),
('noelle',12,25),
('norbert',6,6),
('odette',1,4),
('odette',4,20),
('odile',1,4),
('odile',12,14),
('olive',3,5),
('oliver',7,12),
('olivia',12,10),
('olivier',7,12),
('pacome',5,9),
('parfait',4,18),
('pascal',5,17),
('pascale',5,17),
('paterne',4,15),
('patricia',3,17),
('patrick',3,17),
('paul',1,25),
('paula',1,11),
('paule',1,26),
('paulette',1,11),
('pauline',1,11),
('pelagie',10,8),
('philip',5,3),
('philippe',5,3),
('pierre',2,21),
('pierre',6,29),
('pierre',12,9),
('pierre',12,21),
('pierrick',2,21),
('prisca',1,18),
('priscille',1,18),
('prosper',6,25),
('prudence',5,6),
('quentin',10,31),
('raissa',9,5),
('raoul',7,7),
('raymond',1,7),
('raymonde',1,7),
('reine',9,7),
('remi',1,15),
('remy',1,15),
('renaud',9,17),
('rene',10,19),
('richard',4,3),
('robert',4,30),
('rodolphe',6,21),
('rodrigo',3,13),
('rodrigue',3,13),
('roger',12,30),
('roland',9,15),
('rolande',5,13),
('romain',2,28),
('roman',2,28),
('romeo',2,25),
('romuald',6,19),
('rosalie',9,4),
('rose',8,23),
('rosine',3,11),
('sabine',8,29),
('salvador',8,6),
('samson',7,28),
('sandrine',4,2),
('saturnin',11,29),
('sebastien',1,20),
('severin',11,27),
('sidoine',11,14),
('silvere',6,20),
('simon',10,28),
('simone',10,28),
('solange',5,10),
('sophia',5,25),
('sophie',5,25),
('stan',4,11),
('stanislas',4,11),
('stella',5,11),
('stephane',12,26),
('sylvain',5,4),
('sylvain',12,31),
('sylvestre',12,31),
('sylvie',5,4),
('sylvie',11,5),
('tanguy',11,19),
('tania',1,12),
('tatiana',1,12),
('thecle',9,24),
('theo',11,9),
('theodore',11,9),
('theophane',2,2),
('theophile',12,20),
('therese',10,1),
('therese',10,15),
('thibault',7,8),
('thierry',7,1),
('thomas',1,28),
('thomas',7,3),
('tom',1,28),
('toussaint',11,1),
('ulric',7,10),
('urbain',12,19),
('valentin',2,14),
('valentine',2,14),
('valerie',4,28),
('venceslas',9,28),
('veronica',2,4),
('veronique',2,4),
('victor',7,21),
('victorien',3,23),
('vincent',1,22),
('vincent',9,27),
('viviane',3,10),
('viviane',12,2),
('vivien',3,10),
('wilfried',10,12),
('william',1,10),
('yves',5,19),
('yvon',5,19),
('zita',4,27);

ALTER TABLE public.contacts ADD CONSTRAINT lot02_contacts_owner_id UNIQUE (user_id, id);

CREATE TABLE public.evenements_personnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id bigint,
  origine text NOT NULL CHECK (origine IN ('contact','compte')),
  type_evenement text NOT NULL CHECK (type_evenement IN
    ('anniversaire','fete_prenomale','rencontre','mariage','adoption','reussite','libre')),
  titre text NOT NULL CHECK (char_length(btrim(titre)) BETWEEN 1 AND 120),
  recurrence text NOT NULL DEFAULT 'ponctuelle' CHECK (recurrence IN ('ponctuelle','annuelle')),
  visible boolean NOT NULL DEFAULT true,
  rappels_actifs boolean NOT NULL DEFAULT true,
  choix_a_reconfirmer boolean NOT NULL DEFAULT false,
  archive boolean NOT NULL DEFAULT false,
  arrete_apres_cycle integer CHECK (arrete_apres_cycle BETWEEN 1 AND 9999),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, id),
  CONSTRAINT lot02_evenement_contact_owner FOREIGN KEY (user_id, contact_id)
    REFERENCES public.contacts(user_id, id) ON DELETE SET NULL (contact_id),
  CHECK (type_evenement NOT IN ('anniversaire','fete_prenomale')
    OR (recurrence = 'annuelle' AND (contact_id IS NOT NULL OR origine='compte' OR archive))),
  CHECK (origine='contact' OR contact_id IS NULL),
  CHECK (recurrence = 'annuelle' OR arrete_apres_cycle IS NULL)
);
CREATE UNIQUE INDEX lot02_contact_evenement_unique
  ON public.evenements_personnels (user_id, contact_id, type_evenement)
  WHERE type_evenement IN ('anniversaire','fete_prenomale') AND contact_id IS NOT NULL;
CREATE UNIQUE INDEX lot02_compte_evenement_unique ON public.evenements_personnels (user_id,type_evenement)
  WHERE origine='compte' AND type_evenement IN ('anniversaire','fete_prenomale');
CREATE INDEX lot02_evenements_contact ON public.evenements_personnels (contact_id);

-- Versions de regle : ne pas recalculer l'histoire avec la nouvelle date.
-- 0 est la cle technique de l'unique occurrence ponctuelle, JAMAIS une annee.
CREATE TABLE public.regles_evenements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evenement_id uuid NOT NULL,
  debut_cycle integer NOT NULL CHECK (debut_cycle BETWEEN 0 AND 9999),
  fin_cycle integer CHECK (fin_cycle BETWEEN debut_cycle AND 9999),
  retiree boolean NOT NULL DEFAULT false,
  jour smallint,
  mois smallint,
  annee_naissance smallint CHECK (annee_naissance BETWEEN 1 AND 9999),
  date_ponctuelle date,
  fete_prenom_cle text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, evenement_id, id),
  CONSTRAINT lot02_regle_owner FOREIGN KEY (user_id, evenement_id)
    REFERENCES public.evenements_personnels(user_id, id) ON DELETE CASCADE,
  CONSTRAINT lot02_fete_correspondance FOREIGN KEY (fete_prenom_cle, mois, jour)
    REFERENCES ephemer_lot02.fetes_catalogue(prenom_cle, mois, jour),
  CHECK ((date_ponctuelle IS NOT NULL AND debut_cycle = 0 AND fin_cycle = 0
    AND jour IS NULL AND mois IS NULL AND annee_naissance IS NULL AND fete_prenom_cle IS NULL)
    OR (date_ponctuelle IS NULL AND debut_cycle >= 1 AND jour IS NOT NULL AND mois IS NOT NULL
      AND mois BETWEEN 1 AND 12 AND jour BETWEEN 1 AND 31)),
  CHECK (date_ponctuelle IS NULL OR extract(year FROM date_ponctuelle) BETWEEN 1 AND 9999)
);
CREATE INDEX lot02_regles_cycle ON public.regles_evenements (user_id, evenement_id, debut_cycle);
CREATE UNIQUE INDEX lot02_regle_debut_active ON public.regles_evenements (evenement_id, debut_cycle)
  WHERE NOT retiree;

CREATE TABLE public.occurrences_evenements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evenement_id uuid NOT NULL,
  regle_id uuid NOT NULL,
  cycle integer NOT NULL CHECK (cycle BETWEEN 0 AND 9999),
  date_occurrence date NOT NULL CHECK (extract(year FROM date_occurrence) BETWEEN 1 AND 9999),
  titre_historique text NOT NULL,
  date_exception boolean NOT NULL DEFAULT false,
  annulee boolean NOT NULL DEFAULT false,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evenement_id, cycle),
  UNIQUE (user_id, id),
  CONSTRAINT lot02_occurrence_regle_owner FOREIGN KEY (user_id, evenement_id, regle_id)
    REFERENCES public.regles_evenements(user_id, evenement_id, id) ON DELETE CASCADE
);
CREATE INDEX lot02_occurrences_periode ON public.occurrences_evenements (user_id, date_occurrence, id);
CREATE INDEX lot02_occurrences_regle ON public.occurrences_evenements (regle_id);

-- Les evenements sans contact necessitent des alertes sans contact.
-- Les anciens liens restent intacts et les colonnes nouvelles restent NULL.
ALTER TABLE public.notifications ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE public.rappels ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE public.notifications ADD COLUMN occurrence_id uuid, ADD COLUMN occurrence_revision bigint;
ALTER TABLE public.rappels ADD COLUMN occurrence_id uuid, ADD COLUMN occurrence_revision bigint;
ALTER TABLE public.notifications ADD CONSTRAINT lot02_notification_occurrence_owner
  FOREIGN KEY (user_id, occurrence_id) REFERENCES public.occurrences_evenements(user_id, id) ON DELETE CASCADE;
ALTER TABLE public.rappels ADD CONSTRAINT lot02_rappel_occurrence_owner
  FOREIGN KEY (user_id, occurrence_id) REFERENCES public.occurrences_evenements(user_id, id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT lot02_notification_source CHECK
  ((contact_id IS NOT NULL OR occurrence_id IS NOT NULL) AND
   ((occurrence_id IS NULL AND occurrence_revision IS NULL) OR
    (occurrence_id IS NOT NULL AND occurrence_revision IS NOT NULL AND occurrence_revision > 0)));
ALTER TABLE public.rappels ADD CONSTRAINT lot02_rappel_source CHECK
  ((contact_id IS NOT NULL OR occurrence_id IS NOT NULL) AND
   ((occurrence_id IS NULL AND occurrence_revision IS NULL) OR
    (occurrence_id IS NOT NULL AND occurrence_revision IS NOT NULL AND occurrence_revision > 0)));
-- Pas de doublon de palier apres correction de la date de l'occurrence.
CREATE UNIQUE INDEX lot02_notification_palier ON public.notifications
  (user_id, occurrence_id, type, jours_restants) NULLS NOT DISTINCT WHERE occurrence_id IS NOT NULL;
CREATE INDEX lot02_rappels_occurrence ON public.rappels (occurrence_id) WHERE occurrence_id IS NOT NULL;

-- Clients : lecture de leurs lignes ; toutes les mutations nouvelles par RPC.
ALTER TABLE public.evenements_personnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regles_evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences_evenements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evenements_personnels, public.regles_evenements, public.occurrences_evenements
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.evenements_personnels, public.regles_evenements, public.occurrences_evenements TO authenticated;
GRANT SELECT ON public.evenements_personnels,
  public.regles_evenements, public.occurrences_evenements TO service_role;
CREATE POLICY lot02_evenements_lecture ON public.evenements_personnels FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY lot02_regles_lecture ON public.regles_evenements FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY lot02_occurrences_lecture ON public.occurrences_evenements FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE FUNCTION ephemer_lot02.marquer_utilisation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
BEGIN
  UPDATE ephemer_lot02.etat_schema SET utilise=true WHERE singleton AND NOT utilise;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER lot02_evenement_utilise AFTER INSERT OR UPDATE OR DELETE ON public.evenements_personnels
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot02.marquer_utilisation();
CREATE TRIGGER lot02_regle_utilisee AFTER INSERT OR UPDATE OR DELETE ON public.regles_evenements
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot02.marquer_utilisation();
CREATE TRIGGER lot02_occurrence_utilisee AFTER INSERT OR UPDATE OR DELETE ON public.occurrences_evenements
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot02.marquer_utilisation();

CREATE FUNCTION ephemer_lot02.prenom_cle(p_prenom text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path = pg_catalog AS $fn$
  SELECT regexp_replace(normalize(lower(btrim(p_prenom)), NFD), '[̀-ͯ]', '', 'g');
$fn$;

CREATE FUNCTION ephemer_lot02.identite() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $fn$
DECLARE v_id uuid := auth.uid();
BEGIN
  IF v_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_id) THEN
    RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501';
  END IF;
  RETURN v_id;
END;
$fn$;

CREATE FUNCTION ephemer_lot02.date_annuelle(p_mois integer, p_jour integer, p_cycle integer) RETURNS date
LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path = pg_catalog AS $fn$
  -- Le 29 fevrier devient le 1er mars hors annee bissextile.
  SELECT make_date(p_cycle, p_mois, 1) + (p_jour - 1);
$fn$;

-- Controle des periodes sous verrou du parent, aussi pour ecritures serveur.
CREATE FUNCTION ephemer_lot02.verifier_regle() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $fn$
DECLARE v_event public.evenements_personnels;
BEGIN
  SELECT * INTO STRICT v_event FROM public.evenements_personnels
    WHERE id = NEW.evenement_id AND user_id = NEW.user_id FOR UPDATE;
  IF NEW.date_ponctuelle IS NULL THEN
    PERFORM make_date(2000, NEW.mois, NEW.jour); -- validation seulement, jamais naissance persistée
    IF NEW.annee_naissance IS NOT NULL THEN
      PERFORM make_date(NEW.annee_naissance, NEW.mois, NEW.jour);
    END IF;
  END IF;
  IF (v_event.recurrence = 'ponctuelle') <> (NEW.date_ponctuelle IS NOT NULL)
     OR (v_event.type_evenement = 'fete_prenomale') <> (NEW.fete_prenom_cle IS NOT NULL)
     OR (v_event.type_evenement <> 'anniversaire' AND NEW.annee_naissance IS NOT NULL) THEN
    RAISE EXCEPTION 'Regle incompatible avec evenement' USING ERRCODE = '23514';
  END IF;
  IF NOT NEW.retiree AND EXISTS (SELECT 1 FROM public.regles_evenements r
    WHERE r.evenement_id = NEW.evenement_id AND r.id <> NEW.id AND NOT r.retiree
    AND r.debut_cycle <= coalesce(NEW.fin_cycle,9999)
    AND NEW.debut_cycle <= coalesce(r.fin_cycle,9999)) THEN
    RAISE EXCEPTION 'Periodes de regle en conflit' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER lot02_verifier_regle BEFORE INSERT OR UPDATE ON public.regles_evenements
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot02.verifier_regle();

CREATE FUNCTION ephemer_lot02.verifier_occurrence() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
DECLARE v_recurrence text; v_rule public.regles_evenements; v_date date;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.evenement_id IS DISTINCT FROM OLD.evenement_id OR NEW.cycle IS DISTINCT FROM OLD.cycle) THEN
    RAISE EXCEPTION 'Identite occurrence immuable' USING ERRCODE='23514';
  END IF;
  SELECT recurrence INTO STRICT v_recurrence FROM public.evenements_personnels
    WHERE id=NEW.evenement_id AND user_id=NEW.user_id;
  SELECT * INTO STRICT v_rule FROM public.regles_evenements
    WHERE id=NEW.regle_id AND evenement_id=NEW.evenement_id AND user_id=NEW.user_id;
  IF (v_recurrence='ponctuelle') <> (NEW.cycle=0) THEN
    RAISE EXCEPTION 'Cycle incompatible avec recurrence' USING ERRCODE='23514';
  END IF;
  IF NOT NEW.date_exception THEN
    IF v_rule.retiree OR NEW.cycle < v_rule.debut_cycle OR NEW.cycle > coalesce(v_rule.fin_cycle,9999) THEN
      RAISE EXCEPTION 'Regle hors cycle' USING ERRCODE='23514';
    END IF;
    v_date := CASE WHEN NEW.cycle=0 THEN v_rule.date_ponctuelle
      ELSE make_date(NEW.cycle,v_rule.mois,1) + (v_rule.jour-1) END;
    IF NEW.date_occurrence IS DISTINCT FROM v_date THEN
      RAISE EXCEPTION 'Date incompatible avec regle' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER lot02_verifier_occurrence BEFORE INSERT OR UPDATE ON public.occurrences_evenements
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot02.verifier_occurrence();

CREATE FUNCTION ephemer_lot02.verifier_lien_alerte() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $fn$
DECLARE v_contact bigint; v_revision bigint;
BEGIN
  IF NEW.occurrence_id IS NULL THEN RETURN NEW; END IF;
  SELECT e.contact_id, o.revision INTO v_contact, v_revision
    FROM public.occurrences_evenements o JOIN public.evenements_personnels e ON e.id = o.evenement_id
    WHERE o.id = NEW.occurrence_id AND o.user_id = NEW.user_id;
  IF NOT FOUND OR NEW.contact_id IS DISTINCT FROM v_contact THEN
    RAISE EXCEPTION 'Lien alerte non autorise' USING ERRCODE = '23514';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.occurrence_revision IS DISTINCT FROM OLD.occurrence_revision
    OR NEW.occurrence_id IS DISTINCT FROM OLD.occurrence_id)
    AND NEW.occurrence_revision IS DISTINCT FROM v_revision THEN
    RAISE EXCEPTION 'Occurrence modifiee : relire avant programmation' USING ERRCODE = '40001';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER lot02_notification_lien BEFORE INSERT OR UPDATE OF occurrence_id, occurrence_revision, user_id, contact_id
  ON public.notifications FOR EACH ROW EXECUTE FUNCTION ephemer_lot02.verifier_lien_alerte();
CREATE TRIGGER lot02_rappel_lien BEFORE INSERT OR UPDATE OF occurrence_id, occurrence_revision, user_id, contact_id
  ON public.rappels FOR EACH ROW EXECUTE FUNCTION ephemer_lot02.verifier_lien_alerte();

CREATE FUNCTION ephemer_lot02.source_cycle_vie() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $fn$
DECLARE v_rule public.regles_evenements; v_date date; v_owner uuid; v_contact bigint;
BEGIN
  -- Le verrou du contact/profil est deja pris avant les parents evenements.
  IF TG_TABLE_NAME='profiles' THEN v_owner := OLD.id;
  ELSE v_owner := OLD.user_id; v_contact := OLD.id; END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE public.evenements_personnels SET contact_id = NULL, archive = true,
      rappels_actifs = false, revision = revision + 1, updated_at = now()
      WHERE user_id = v_owner AND ((TG_TABLE_NAME='profiles' AND origine='compte')
        OR (TG_TABLE_NAME='contacts' AND contact_id=v_contact));
    RETURN OLD;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id AND EXISTS (SELECT 1 FROM public.evenements_personnels
    WHERE user_id=v_owner AND ((TG_TABLE_NAME='profiles' AND origine='compte')
      OR (TG_TABLE_NAME='contacts' AND contact_id=v_contact))) THEN
    RAISE EXCEPTION 'Identite de la source liee immuable' USING ERRCODE='23514';
  END IF;
  IF TG_TABLE_NAME='contacts' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id AND EXISTS
      (SELECT 1 FROM public.evenements_personnels WHERE contact_id=v_contact) THEN
      RAISE EXCEPTION 'Proprietaire du contact lie immuable' USING ERRCODE='23514';
    END IF;
  END IF;
  IF NEW.date_naissance IS DISTINCT FROM OLD.date_naissance THEN
    SELECT r.* INTO v_rule FROM public.evenements_personnels e JOIN public.regles_evenements r
      ON r.evenement_id = e.id WHERE e.user_id = v_owner
      AND ((TG_TABLE_NAME='profiles' AND e.origine='compte') OR (TG_TABLE_NAME='contacts' AND e.contact_id=v_contact))
      AND e.type_evenement = 'anniversaire' AND NOT r.retiree
      AND r.debut_cycle <= extract(year FROM now() AT TIME ZONE 'Europe/Paris')
      AND coalesce(r.fin_cycle,9999) >= extract(year FROM now() AT TIME ZONE 'Europe/Paris');
    IF FOUND THEN
      v_date := CASE WHEN v_rule.annee_naissance IS NULL THEN NULL
        ELSE make_date(v_rule.annee_naissance, v_rule.mois, v_rule.jour) END;
      IF NEW.date_naissance IS DISTINCT FROM v_date THEN
        RAISE EXCEPTION 'Modifier la naissance via son evenement, pas un ancien formulaire' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  IF ephemer_lot02.prenom_cle(NEW.prenom) IS DISTINCT FROM ephemer_lot02.prenom_cle(OLD.prenom) THEN
    UPDATE public.evenements_personnels SET choix_a_reconfirmer = true, rappels_actifs = false,
      revision = revision + 1, updated_at = now() WHERE user_id = v_owner
      AND ((TG_TABLE_NAME='profiles' AND origine='compte') OR (TG_TABLE_NAME='contacts' AND contact_id=v_contact))
      AND type_evenement = 'fete_prenomale';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER lot02_contacts_cycle_vie BEFORE UPDATE OR DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot02.source_cycle_vie();
CREATE TRIGGER lot02_profiles_cycle_vie BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION ephemer_lot02.source_cycle_vie();

-- Les fonctions privilegiees sont necessaires : clients sans DML direct,
-- plusieurs tables a changer atomiquement, controle du proprietaire dans chaque entree.
CREATE FUNCTION ephemer_lot02.enregistrer(p_donnees jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $fn$
DECLARE
  v_user uuid := ephemer_lot02.identite();
  v_id uuid := coalesce((p_donnees->>'id')::uuid, gen_random_uuid());
  v_expected bigint := coalesce((p_donnees->>'revision')::bigint,0);
  v_contact bigint := (p_donnees->>'contact_id')::bigint;
  v_type text := p_donnees->>'type_evenement';
  v_title text := btrim(p_donnees->>'titre');
  v_recurrence text := coalesce(p_donnees->>'recurrence','ponctuelle');
  v_day integer := (p_donnees->>'jour')::integer;
  v_month integer := (p_donnees->>'mois')::integer;
  v_birth integer := (p_donnees->>'annee_naissance')::integer;
  v_date date := (p_donnees->>'date')::date;
  v_cut integer := (p_donnees->>'depuis_cycle')::integer;
  v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_event public.evenements_personnels;
  v_name text; v_key text; v_rule uuid; v_current public.regles_evenements;
BEGIN
  IF p_donnees IS NULL OR jsonb_typeof(p_donnees) <> 'object' OR EXISTS
    (SELECT 1 FROM jsonb_object_keys(p_donnees) k WHERE k <> ALL(ARRAY[
      'id','revision','contact_id','type_evenement','titre','recurrence','jour','mois',
      'annee_naissance','date','depuis_cycle'])) THEN
    RAISE EXCEPTION 'Champs non autorises' USING ERRCODE = '22023';
  END IF;
  IF v_type IS NULL OR v_type NOT IN ('anniversaire','fete_prenomale','rencontre','mariage','adoption','reussite','libre')
    OR v_title IS NULL OR char_length(v_title) NOT BETWEEN 1 AND 120
    OR v_recurrence NOT IN ('ponctuelle','annuelle') OR v_expected < 0 THEN
    RAISE EXCEPTION 'Evenement invalide' USING ERRCODE = '22023';
  END IF;
  IF v_contact IS NOT NULL THEN
    SELECT prenom INTO v_name FROM public.contacts WHERE id = v_contact AND user_id = v_user FOR KEY SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE = '42501'; END IF;
  END IF;
  IF v_type IN ('anniversaire','fete_prenomale') THEN
    IF v_contact IS NULL THEN
      SELECT prenom INTO v_name FROM public.profiles WHERE id=v_user FOR KEY SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Profil requis' USING ERRCODE='42501'; END IF;
    END IF;
    IF v_recurrence <> 'annuelle' OR v_date IS NOT NULL THEN
      RAISE EXCEPTION 'Recurrence annuelle requise' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF v_type <> 'anniversaire' AND v_birth IS NOT NULL THEN
    RAISE EXCEPTION 'Annee de naissance hors anniversaire' USING ERRCODE = '22023';
  END IF;
  IF p_donnees ? 'date' AND p_donnees->>'date' IS NOT NULL
    AND (p_donnees->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'Date civile YYYY-MM-DD requise' USING ERRCODE = '22023';
  END IF;
  IF v_recurrence = 'ponctuelle' THEN
    IF v_date IS NULL OR v_day IS NOT NULL OR v_month IS NOT NULL THEN
      RAISE EXCEPTION 'Date complete requise pour evenement ponctuel' USING ERRCODE = '22023';
    END IF;
    v_cut := 0;
  ELSE
    IF v_type NOT IN ('anniversaire','fete_prenomale') THEN
      IF v_date IS NULL OR v_day IS NOT NULL OR v_month IS NOT NULL THEN
        RAISE EXCEPTION 'Date de debut requise pour recurrence personnelle' USING ERRCODE = '22023';
      END IF;
      v_day := extract(day FROM v_date); v_month := extract(month FROM v_date);
    END IF;
    IF v_day IS NULL OR v_month IS NULL THEN
      RAISE EXCEPTION 'Jour et mois requis' USING ERRCODE = '22023';
    END IF;
    PERFORM make_date(2000, v_month, v_day);
    IF v_birth IS NOT NULL THEN
      IF v_birth NOT BETWEEN 1 AND 9999 THEN RAISE EXCEPTION 'Annee invalide' USING ERRCODE = '22023'; END IF;
      PERFORM make_date(v_birth, v_month, v_day);
      IF make_date(v_birth, v_month, v_day) > v_today THEN
        RAISE EXCEPTION 'Naissance future invalide' USING ERRCODE = '22023';
      END IF;
    END IF;
    IF v_type = 'fete_prenomale' THEN
      v_key := ephemer_lot02.prenom_cle(v_name);
      IF NOT EXISTS (SELECT 1 FROM ephemer_lot02.fetes_catalogue
        WHERE prenom_cle = v_key AND mois = v_month AND jour = v_day) THEN
        RAISE EXCEPTION 'Choisir une correspondance existante du prenom' USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;
  SELECT * INTO v_event FROM public.evenements_personnels WHERE id = v_id AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    IF v_expected <> 0 THEN RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE = '42501'; END IF;
    IF v_recurrence = 'annuelle' THEN
      v_cut := CASE WHEN v_type IN ('anniversaire','fete_prenomale') THEN 1 ELSE extract(year FROM v_date)::integer END;
    END IF;
    INSERT INTO public.evenements_personnels(id,user_id,contact_id,origine,type_evenement,titre,recurrence)
      VALUES (v_id,v_user,v_contact,CASE WHEN v_contact IS NULL THEN 'compte' ELSE 'contact' END,
        v_type,v_title,v_recurrence) ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_event FROM public.evenements_personnels WHERE id = v_id AND user_id = v_user FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE = '42501'; END IF;
    IF EXISTS (SELECT 1 FROM public.regles_evenements WHERE evenement_id = v_id) THEN
      RETURN jsonb_build_object('id',v_id,'revision',v_event.revision,'rejeu',true);
    END IF;
  ELSE
    IF v_expected = 0 THEN
      RETURN jsonb_build_object('id',v_id,'revision',v_event.revision,'rejeu',true);
    END IF;
    IF v_expected <> v_event.revision THEN RAISE EXCEPTION 'Evenement modifie : relire' USING ERRCODE = '40001'; END IF;
    IF v_contact IS DISTINCT FROM v_event.contact_id OR v_type <> v_event.type_evenement
      OR v_recurrence <> v_event.recurrence THEN
      RAISE EXCEPTION 'Changer de type ou recurrence exige un nouvel evenement ; archiver ancien' USING ERRCODE = '22023';
    END IF;
    IF v_recurrence = 'annuelle' AND
      (v_cut IS NULL OR v_cut < extract(year FROM v_today) OR v_cut > 9999) THEN
      RAISE EXCEPTION 'Choisir cette annee ou une annee future ; exception pour date seule' USING ERRCODE = '22023';
    END IF;
    UPDATE public.evenements_personnels SET titre = v_title, choix_a_reconfirmer = false,
      revision = revision + 1, updated_at = now() WHERE id = v_id RETURNING * INTO v_event;
    UPDATE public.regles_evenements SET retiree = true WHERE evenement_id = v_id
      AND NOT retiree AND debut_cycle >= v_cut;
    UPDATE public.regles_evenements SET fin_cycle = v_cut - 1 WHERE evenement_id = v_id
      AND NOT retiree AND debut_cycle < v_cut AND coalesce(fin_cycle,9999) >= v_cut;
  END IF;
  INSERT INTO public.regles_evenements(user_id,evenement_id,debut_cycle,fin_cycle,jour,mois,
    annee_naissance,date_ponctuelle,fete_prenom_cle)
    VALUES (v_user,v_id,v_cut,CASE WHEN v_cut = 0 THEN 0 ELSE NULL END,
      CASE WHEN v_cut = 0 THEN NULL ELSE v_day END, CASE WHEN v_cut = 0 THEN NULL ELSE v_month END,
      v_birth,CASE WHEN v_cut = 0 THEN v_date ELSE NULL END,v_key) RETURNING id INTO v_rule;
  UPDATE public.occurrences_evenements SET regle_id = v_rule,
    date_occurrence = CASE WHEN cycle = 0 THEN v_date ELSE ephemer_lot02.date_annuelle(v_month,v_day,cycle) END,
    titre_historique = v_title, revision = revision + 1, updated_at = now()
    WHERE evenement_id = v_id AND cycle >= v_cut AND NOT date_exception AND date_occurrence >= v_today;
  -- Compatibilite avec les anciens lecteurs, sans inventer d'annee.
  IF v_type = 'anniversaire' THEN
    SELECT * INTO v_current FROM public.regles_evenements WHERE evenement_id = v_id AND NOT retiree
      AND debut_cycle <= extract(year FROM v_today) AND coalesce(fin_cycle,9999) >= extract(year FROM v_today);
    IF v_event.origine='compte' THEN
      UPDATE public.profiles SET date_naissance = CASE WHEN v_current.annee_naissance IS NULL THEN NULL
        ELSE make_date(v_current.annee_naissance,v_current.mois,v_current.jour) END WHERE id=v_user;
    ELSE
      UPDATE public.contacts SET date_naissance = CASE WHEN v_current.annee_naissance IS NULL THEN NULL
        ELSE make_date(v_current.annee_naissance,v_current.mois,v_current.jour) END
        WHERE id = v_contact AND user_id = v_user;
    END IF;
  END IF;
  RETURN jsonb_build_object('id',v_id,'revision',v_event.revision,'regle_id',v_rule,'rejeu',false);
END;
$fn$;

CREATE FUNCTION ephemer_lot02.materialiser(p_user uuid, p_debut date, p_fin date) RETURNS SETOF public.occurrences_evenements
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $fn$
DECLARE v_event public.evenements_personnels; v_rule public.regles_evenements; v_year integer; v_day date;
BEGIN
  IF p_user IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user)
    OR p_debut IS NULL OR p_fin IS NULL OR p_fin < p_debut OR p_fin - p_debut > 400
    OR extract(year FROM p_debut) < 1 OR extract(year FROM p_fin) > 9999 THEN
    RAISE EXCEPTION 'Periode invalide ; utiliser des fenetres de 400 jours maximum' USING ERRCODE = '22023';
  END IF;
  FOR v_event IN SELECT * FROM public.evenements_personnels WHERE user_id = p_user
    AND NOT archive AND NOT choix_a_reconfirmer ORDER BY id FOR UPDATE LOOP
    FOR v_rule IN SELECT * FROM public.regles_evenements WHERE evenement_id = v_event.id AND NOT retiree LOOP
      IF v_event.recurrence = 'ponctuelle' THEN
        IF v_rule.date_ponctuelle BETWEEN p_debut AND p_fin THEN
          INSERT INTO public.occurrences_evenements(user_id,evenement_id,regle_id,cycle,date_occurrence,titre_historique)
            VALUES (p_user,v_event.id,v_rule.id,0,v_rule.date_ponctuelle,v_event.titre)
            ON CONFLICT (evenement_id,cycle) DO NOTHING;
        END IF;
      ELSE
        FOR v_year IN greatest(extract(year FROM p_debut)::integer,v_rule.debut_cycle)
          ..least(extract(year FROM p_fin)::integer,coalesce(v_rule.fin_cycle,9999),coalesce(v_event.arrete_apres_cycle,9999)) LOOP
          IF v_rule.annee_naissance IS NOT NULL AND v_year < v_rule.annee_naissance THEN CONTINUE; END IF;
          v_day := ephemer_lot02.date_annuelle(v_rule.mois,v_rule.jour,v_year);
          IF v_day BETWEEN p_debut AND p_fin THEN
            INSERT INTO public.occurrences_evenements(user_id,evenement_id,regle_id,cycle,date_occurrence,titre_historique)
              VALUES (p_user,v_event.id,v_rule.id,v_year,v_day,v_event.titre)
              ON CONFLICT (evenement_id,cycle) DO NOTHING;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
  RETURN QUERY SELECT o.* FROM public.occurrences_evenements o JOIN public.evenements_personnels e ON e.id=o.evenement_id
    WHERE o.user_id=p_user AND o.date_occurrence BETWEEN p_debut AND p_fin AND NOT e.archive
      AND NOT e.choix_a_reconfirmer AND NOT o.annulee
      AND (e.arrete_apres_cycle IS NULL OR o.cycle <= e.arrete_apres_cycle)
    ORDER BY o.date_occurrence,o.id;
END;
$fn$;

CREATE FUNCTION ephemer_lot02.materialiser_client(p_debut date, p_fin date) RETURNS SETOF public.occurrences_evenements
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $fn$
  SELECT * FROM ephemer_lot02.materialiser(ephemer_lot02.identite(),p_debut,p_fin);
$fn$;
CREATE FUNCTION ephemer_lot02.materialiser_serveur(p_user uuid, p_debut date, p_fin date) RETURNS SETOF public.occurrences_evenements
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $fn$
  SELECT * FROM ephemer_lot02.materialiser(p_user,p_debut,p_fin);
$fn$;

CREATE FUNCTION ephemer_lot02.modifier_occurrence(p_id uuid, p_date date, p_annulee boolean, p_revision bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $fn$
DECLARE v_user uuid := ephemer_lot02.identite(); v_event uuid; v_row public.occurrences_evenements;
BEGIN
  IF p_date IS NULL OR p_annulee IS NULL OR extract(year FROM p_date) NOT BETWEEN 1 AND 9999 THEN
    RAISE EXCEPTION 'Date ou etat invalide' USING ERRCODE = '22023';
  END IF;
  SELECT evenement_id INTO v_event FROM public.occurrences_evenements WHERE id=p_id AND user_id=v_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.evenements_personnels WHERE id=v_event AND user_id=v_user FOR UPDATE;
  SELECT * INTO v_row FROM public.occurrences_evenements WHERE id=p_id AND user_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE='42501'; END IF;
  IF p_revision IS NULL OR v_row.revision <> p_revision THEN
    RAISE EXCEPTION 'Occurrence modifiee : relire' USING ERRCODE='40001';
  END IF;
  UPDATE public.occurrences_evenements SET date_occurrence=p_date,annulee=p_annulee,date_exception=true,
    revision=revision+1,updated_at=now() WHERE id=p_id RETURNING * INTO v_row;
  RETURN jsonb_build_object('id',v_row.id,'revision',v_row.revision,'cycle',v_row.cycle);
END;
$fn$;

CREATE FUNCTION ephemer_lot02.preferences(p_id uuid, p_visible boolean, p_rappels boolean,
  p_archive boolean, p_arret integer, p_revision bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $fn$
DECLARE v_user uuid := ephemer_lot02.identite(); v_event public.evenements_personnels;
BEGIN
  SELECT * INTO v_event FROM public.evenements_personnels WHERE id=p_id AND user_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE='42501'; END IF;
  IF p_revision IS NULL OR p_revision <> v_event.revision THEN
    RAISE EXCEPTION 'Evenement modifie : relire' USING ERRCODE='40001';
  END IF;
  IF p_visible IS NULL OR p_rappels IS NULL OR p_archive IS NULL OR
    (v_event.choix_a_reconfirmer AND p_rappels) THEN
    RAISE EXCEPTION 'Preference invalide ; reconfirmer la fete si necessaire' USING ERRCODE='22023';
  END IF;
  UPDATE public.evenements_personnels SET visible=p_visible,rappels_actifs=p_rappels,archive=p_archive,
    arrete_apres_cycle=p_arret,revision=revision+1,updated_at=now() WHERE id=p_id RETURNING * INTO v_event;
  RETURN jsonb_build_object('id',p_id,'revision',v_event.revision);
END;
$fn$;

CREATE FUNCTION ephemer_lot02.supprimer(p_id uuid, p_revision bigint, p_confirmer boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $fn$
DECLARE v_user uuid := ephemer_lot02.identite(); v_event public.evenements_personnels; v_contact bigint;
BEGIN
  SELECT contact_id INTO v_contact FROM public.evenements_personnels WHERE id=p_id AND user_id=v_user;
  IF v_contact IS NOT NULL THEN
    PERFORM 1 FROM public.contacts WHERE id=v_contact AND user_id=v_user FOR KEY SHARE;
  END IF;
  IF EXISTS (SELECT 1 FROM public.evenements_personnels WHERE id=p_id AND user_id=v_user
    AND origine='compte' AND type_evenement='anniversaire') THEN
    PERFORM 1 FROM public.profiles WHERE id=v_user FOR KEY SHARE;
  END IF;
  SELECT * INTO v_event FROM public.evenements_personnels WHERE id=p_id AND user_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ressource non autorisee' USING ERRCODE='42501'; END IF;
  IF p_revision IS NULL OR p_revision <> v_event.revision THEN
    RAISE EXCEPTION 'Evenement modifie : relire' USING ERRCODE='40001';
  END IF;
  IF p_confirmer IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Confirmer effacement de cet historique ; archivage disponible' USING ERRCODE='22023';
  END IF;
  DELETE FROM public.evenements_personnels WHERE id=p_id AND user_id=v_user;
  IF v_event.type_evenement='anniversaire' AND v_contact IS NOT NULL THEN
    UPDATE public.contacts SET date_naissance=NULL WHERE id=v_contact AND user_id=v_user;
  END IF;
  IF v_event.type_evenement='anniversaire' AND v_event.origine='compte' THEN
    UPDATE public.profiles SET date_naissance=NULL WHERE id=v_user;
  END IF;
END;
$fn$;

-- Entrees publiques invoker ; les fonctions privees controlees font la transaction.
CREATE FUNCTION public.enregistrer_evenement_lot02(p_donnees jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT ephemer_lot02.enregistrer(p_donnees);
$fn$;
CREATE FUNCTION public.materialiser_occurrences_lot02(p_debut date,p_fin date) RETURNS SETOF public.occurrences_evenements
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT * FROM ephemer_lot02.materialiser_client(p_debut,p_fin);
$fn$;
CREATE FUNCTION public.materialiser_occurrences_serveur_lot02(p_user uuid,p_debut date,p_fin date)
RETURNS SETOF public.occurrences_evenements LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT * FROM ephemer_lot02.materialiser_serveur(p_user,p_debut,p_fin);
$fn$;
CREATE FUNCTION public.modifier_occurrence_lot02(p_id uuid,p_date date,p_annulee boolean,p_revision bigint) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT ephemer_lot02.modifier_occurrence(p_id,p_date,p_annulee,p_revision);
$fn$;
CREATE FUNCTION public.preferences_evenement_lot02(p_id uuid,p_visible boolean,p_rappels boolean,
  p_archive boolean,p_arret integer,p_revision bigint) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT ephemer_lot02.preferences(p_id,p_visible,p_rappels,p_archive,p_arret,p_revision);
$fn$;
CREATE FUNCTION public.supprimer_evenement_lot02(p_id uuid,p_revision bigint,p_confirmer boolean) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
  SELECT ephemer_lot02.supprimer(p_id,p_revision,p_confirmer);
$fn$;

-- Aucun EXECUTE implicite, y compris helpers et triggers.
DO $droits$
DECLARE v_function record;
BEGIN
  FOR v_function IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ephemer_lot02'
      OR (n.nspname='public' AND p.proname IN ('enregistrer_evenement_lot02',
        'materialiser_occurrences_lot02','materialiser_occurrences_serveur_lot02',
        'modifier_occurrence_lot02','preferences_evenement_lot02','supprimer_evenement_lot02')) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',v_function.signature);
  END LOOP;
END;
$droits$;
GRANT EXECUTE ON FUNCTION ephemer_lot02.enregistrer(jsonb), ephemer_lot02.materialiser_client(date,date),
  ephemer_lot02.modifier_occurrence(uuid,date,boolean,bigint),
  ephemer_lot02.preferences(uuid,boolean,boolean,boolean,integer,bigint),
  ephemer_lot02.supprimer(uuid,bigint,boolean),
  public.enregistrer_evenement_lot02(jsonb),public.materialiser_occurrences_lot02(date,date),
  public.modifier_occurrence_lot02(uuid,date,boolean,bigint),
  public.preferences_evenement_lot02(uuid,boolean,boolean,boolean,integer,bigint),
  public.supprimer_evenement_lot02(uuid,bigint,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION ephemer_lot02.materialiser_serveur(uuid,date,date),
  public.materialiser_occurrences_serveur_lot02(uuid,date,date) TO service_role;

NOTIFY pgrst, 'reload schema'; -- signal interne, delivre seulement au COMMIT
COMMIT;
