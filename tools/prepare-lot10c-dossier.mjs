// Prépare uniquement des fichiers locaux. Aucun accès à Supabase ni génération de types DB.
import fs from 'node:fs'
import { createHash } from 'node:crypto'
const base = 'docs/evolution/lot-10C/'
const read = path => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
const digest = body => createHash('md5').update(body).digest('hex')
const functions = source => new Map([...source.matchAll(/CREATE (?:OR REPLACE )?FUNCTION ([\w.]+)\([^]*?AS \$fn\$([^]*?)\$fn\$;/g)].map(m => [m[1], { statement: m[0], hash: digest(m[2]) }]))
const original = functions(read('docs/evolution/lot-10B/schema-propose.sql'))
const iaVide = `'{"identite":false,"presentation":false,"passions":false,"plaisirs":false,"eviter":false}'::jsonb`
function change(source, before, after) {
  if (!source.includes(before)) throw new Error('Source 10B divergente : ' + before)
  return source.replace(before, after)
}
let lire = original.get('ephemer_social.univers_lire').statement.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION')
lire = change(lire, "'partage',coalesce(u.partage,partage_vide)", "'partage',coalesce(u.partage,partage_vide),'iaCadeaux',coalesce(u.ia_cadeaux," + iaVide + ')')
let commander = original.get('ephemer_social.univers_commander').statement.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION')
commander = change(commander, "ARRAY['identite','modeIdentite','partage','valeurs']", "ARRAY['iaCadeaux','identite','modeIdentite','partage','valeurs']")
commander = change(commander, "OR NOT ephemer_social.partage_univers_valide(donnees->'valeurs',donnees->'partage')", "OR NOT ephemer_social.partage_univers_valide(donnees->'valeurs',donnees->'partage')\n      OR NOT ephemer_social.ia_cadeaux_valide(donnees->'partage',donnees->'iaCadeaux')")
commander = change(commander, 'partage,revision)\n      VALUES', 'partage,ia_cadeaux,revision)\n      VALUES')
commander = change(commander, "donnees->'partage',courante+1)", "donnees->'partage',donnees->'iaCadeaux',courante+1)")
commander = change(commander, 'partage=excluded.partage,revision=excluded.revision', 'partage=excluded.partage,ia_cadeaux=excluded.ia_cadeaux,revision=excluded.revision')
// L'identité reste partagée après masquage des seuls champs facultatifs.
commander = change(commander, 'revision=courante+1,updated_at=now() WHERE user_id=a;', `ia_cadeaux=jsonb_build_object('identite',u.ia_cadeaux->'identite','presentation',false,'passions',false,'plaisirs',false,'eviter',false),\n      revision=courante+1,updated_at=now() WHERE user_id=a;`)
const extra = read(base + 'fonctions-cadeaux.sql')
const validator = functions(extra).get('ephemer_social.ia_cadeaux_valide').statement
const others = extra.slice(extra.indexOf('-- NULL sélection'))
const initialCatalogue = read('docs/evolution/lot-10B/verification-lecture-seule.sql')
const schema = `-- PROPOSITION 10C : installation HUMAINE seulement, après revue et sauvegarde.
-- Exécuter tout le fichier. Le contrôle 10A + 10B précède la transaction d'installation.
${initialCatalogue}
BEGIN;
SET LOCAL ephemer.lot10c_installation='CONFIRME_INSTALLATION_10C';
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_user<>'postgres' OR current_setting('ephemer.lot10c_installation',true) IS DISTINCT FROM 'CONFIRME_INSTALLATION_10C' THEN
    RAISE EXCEPTION 'Installation humaine reservee a postgres'; END IF;
  IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='ephemer_social.univers_utilisateurs'::regclass AND attname='ia_cadeaux' AND NOT attisdropped)
    OR to_regprocedure('public.consulter_univers_cadeaux(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION '10C deja present : ne pas rejouer'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
END;
$garde$;
${validator}
ALTER TABLE ephemer_social.univers_utilisateurs ADD COLUMN ia_cadeaux jsonb NOT NULL DEFAULT ${iaVide};
ALTER TABLE ephemer_social.univers_utilisateurs ADD CONSTRAINT lot10c_ia_cadeaux CHECK(ephemer_social.ia_cadeaux_valide(partage,ia_cadeaux));
ALTER TABLE ephemer_social.univers_utilisateurs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ephemer_social.univers_utilisateurs FROM PUBLIC,anon,authenticated,service_role;
${lire}
${commander}
${others}
REVOKE ALL ON FUNCTION ephemer_social.ia_cadeaux_valide(jsonb,jsonb),ephemer_social.univers_cadeaux(uuid,text[],bigint,bigint,bigint),
  ephemer_social.univers_lire(uuid),ephemer_social.univers_commander(text,jsonb,bigint,uuid),
  public.consulter_univers_cadeaux(uuid),public.resoudre_univers_cadeaux(uuid,text[],bigint,bigint,bigint) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION ephemer_social.univers_cadeaux(uuid,text[],bigint,bigint,bigint),
  ephemer_social.univers_lire(uuid),ephemer_social.univers_commander(text,jsonb,bigint,uuid),
  public.consulter_univers_cadeaux(uuid),public.resoudre_univers_cadeaux(uuid,text[],bigint,bigint,bigint) TO authenticated;
-- Fermer le compteur aux clients : pas de modification du corps ni des données.
REVOKE EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid) TO service_role;
DO $quota$
BEGIN
  IF has_function_privilege('anon','public.incrementer_quota_ia(uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.incrementer_quota_ia(uuid)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.incrementer_quota_ia(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Quota non ferme'; END IF;
END;
$quota$;
NOTIFY pgrst,'reload schema';
COMMIT;
`
const bodies = functions(schema)
if (bodies.size !== 6) throw new Error('Six fonctions 10C attendues')
function catalogue(retour = false) {
  let text = initialCatalogue.replace("pronamespace='ephemer_social'::regnamespace)<>17", "pronamespace='ephemer_social'::regnamespace)<>19")
    .replace("ARRAY['user_id','mode_identite','identite','valeurs','partage','revision','created_at','updated_at']", "ARRAY['user_id','mode_identite','identite','valeurs','partage','revision','created_at','updated_at','ia_cadeaux']")
    .replace("ARRAY['uuid','text','text','jsonb','jsonb','bigint','timestamp with time zone','timestamp with time zone']", "ARRAY['uuid','text','text','jsonb','jsonb','bigint','timestamp with time zone','timestamp with time zone','jsonb']")
    .replace("AND contype='c')<>5", "AND contype='c')<>6")
  for (const name of ['ephemer_social.univers_lire','ephemer_social.univers_commander']) if (!retour) text = text.replace(original.get(name).hash, bodies.get(name).hash)
  let fragment = read(base + 'catalogue-cadeaux.sql').replace(/__HASH_([\w.]+)__/g, (_, name) => {
    if (!bodies.has(name)) throw new Error(name)
    return bodies.get(name).hash
  })
  if (retour) fragment = fragment.replace("p.proname<>'ia_cadeaux_valide'", 'false')
  return text.replace("SELECT 'lot10b_catalogue_conforme' AS resultat;\nCOMMIT;", fragment + `\nSELECT '${retour ? 'lot10c_retour_conforme' : 'lot10c_catalogue_conforme'}' AS resultat;\nCOMMIT;`)
}
const rollback = `-- Retour HUMAINE au fonctionnement 10B, SANS supprimer de colonne, permission ou journal.
-- Revenir au code 10B en même temps. Les valeurs 10C sont conservées et inactives.
-- Même session : SET ephemer.lot10c_retour='CONFIRME_RETOUR_10B_SANS_PERTE';
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $garde$
BEGIN
  IF current_user<>'postgres' OR current_setting('ephemer.lot10c_retour',true) IS DISTINCT FROM 'CONFIRME_RETOUR_10B_SANS_PERTE' THEN
    RAISE EXCEPTION 'Retour humain confirme requis'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));
END;
$garde$;
${original.get('ephemer_social.univers_lire').statement.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION')}
${original.get('ephemer_social.univers_commander').statement.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION')}
-- Les sauvegardes 10B ne touchent pas ia_cadeaux. Supprimer le CHECK dépendant du partage,
-- sans effacer les permissions ; les accès IA restent fermés ci-dessous.
ALTER TABLE ephemer_social.univers_utilisateurs DROP CONSTRAINT lot10c_ia_cadeaux;
-- CHECK structurel de conservation : masque artificiel complet pour les permissions historiques.
ALTER TABLE ephemer_social.univers_utilisateurs ADD CONSTRAINT lot10c_ia_cadeaux CHECK(ephemer_social.ia_cadeaux_valide(
  '{"presentation":true,"passions":true,"plaisirs":true,"eviter":true}'::jsonb,ia_cadeaux));
REVOKE ALL ON FUNCTION ephemer_social.univers_cadeaux(uuid,text[],bigint,bigint,bigint),
  public.consulter_univers_cadeaux(uuid),public.resoudre_univers_cadeaux(uuid,text[],bigint,bigint,bigint) FROM PUBLIC,anon,authenticated,service_role;
-- Ne jamais réouvrir le compteur lors d'un retour.
REVOKE EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
`
const outputs = { 'schema-propose.sql': schema, 'verification-lecture-seule.sql': catalogue(), 'retour-arriere.sql': rollback,
  'verification-retour-lecture-seule.sql': catalogue(true).replace('CHECK (ephemer_social.ia_cadeaux_valide(partage, ia_cadeaux))', `CHECK (ephemer_social.ia_cadeaux_valide(''{"eviter": true, "passions": true, "plaisirs": true, "presentation": true}''::jsonb, ia_cadeaux))`) }
for (const [name, value] of Object.entries(outputs)) {
  if (process.argv.includes('--check')) { if (read(base + name) !== value) throw new Error('Fichier à régénérer : ' + name) }
  else fs.writeFileSync(base + name, value)
}
console.log(process.argv.includes('--check') ? 'Dossier 10C et empreintes cohérents localement ; aucun SQL exécuté par cet outil.' : 'Dossier 10C préparé localement ; aucune mutation distante.')
