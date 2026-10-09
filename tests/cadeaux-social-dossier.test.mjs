import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const base = 'docs/evolution/lot-10C/'
test('10C dossier : empreintes et contrôle 10A inchangés, colonne ajoutée uniquement à univers', () => {
  const proposal = read(base + 'schema-propose.sql'), catalogue = read(base + 'verification-lecture-seule.sql')
  const bodies = [...proposal.matchAll(/CREATE (?:OR REPLACE )?FUNCTION ([\w.]+)\([^]*?AS \$fn\$([^]*?)\$fn\$;/g)]
  assert.equal(bodies.length, 6)
  for (const [, name, body] of bodies) assert.ok(catalogue.includes(createHash('md5').update(body).digest('hex')), name)
  const old = read('docs/evolution/lot-10B/verification-lecture-seule.sql')
  assert.ok(proposal.includes(old))
  for (const [, signature, hash] of old.matchAll(/\('([^']+)','([a-f0-9]{32})'/g)) if (!signature.includes('univers_lire(') && !signature.includes('univers_commander(')) assert.ok(catalogue.includes(hash), signature)
  const relationColumns = "WHEN 'relations_etoiles' THEN ARRAY['id','compte_a','compte_b','etat','origine','revision','created_at','updated_at']"
  assert.ok(catalogue.includes(relationColumns))
  assert.ok(catalogue.includes("THEN ARRAY['user_id','mode_identite','identite','valeurs','partage','revision','created_at','updated_at','ia_cadeaux']"))
  assert.ok(catalogue.includes("pronamespace='ephemer_social'::regnamespace)<>19"))
  assert.ok(catalogue.includes('lot10c_catalogue_conforme')); assert.ok(catalogue.startsWith('-- Après application HUMAINE'))
  assert.ok(!catalogue.includes('__HASH_'))
})
test('10C dossier : installation humaine, quota fermé, aucun historique ni nouvelle table', () => {
  const proposal = read(base + 'schema-propose.sql')
  assert.ok(proposal.includes("SET LOCAL ephemer.lot10c_installation='CONFIRME_INSTALLATION_10C'"))
  assert.ok(proposal.includes('REVOKE EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid) FROM PUBLIC,anon,authenticated'))
  assert.ok(proposal.includes('GRANT EXECUTE ON FUNCTION public.incrementer_quota_ia(uuid) TO service_role'))
  assert.ok(!/CREATE TABLE|DELETE FROM|DROP TABLE/.test(proposal))
  assert.ok(proposal.includes('ENABLE ROW LEVEL SECURITY'))
  assert.ok(proposal.includes("ARRAY['iaCadeaux','identite','modeIdentite','partage','valeurs']"))
})
test('10C dossier : retour sans effacement conserve les autorisations et ferme les entrées IA', () => {
  const rollback = read(base + 'retour-arriere.sql'), catalogue = read(base + 'verification-retour-lecture-seule.sql')
  assert.ok(rollback.includes('CONFIRME_RETOUR_10B_SANS_PERTE'))
  assert.ok(!/DELETE FROM|DROP TABLE|DROP COLUMN|DROP FUNCTION|CASCADE/.test(rollback))
  assert.ok(rollback.includes('FROM PUBLIC,anon,authenticated,service_role'))
  assert.ok(catalogue.includes('lot10c_retour_conforme'))
  assert.ok(catalogue.includes("IS DISTINCT FROM (false)"))
  for (const [, body] of rollback.matchAll(/AS \$fn\$([^]*?)\$fn\$;/g)) assert.ok(catalogue.includes(createHash('md5').update(body).digest('hex')))
  assert.ok(!catalogue.includes('__HASH_'))
})
test('10C dossier : recette isolée annulée, refus directs et aucune transmission fournisseur', () => {
  const recipe = read(base + 'verification.sql')
  assert.ok(recipe.includes('CONFIRME_COPIE_ISOLEE_10C')); assert.ok(recipe.endsWith('ROLLBACK;\n'))
  for (const name of ['ancien_ami', 'bloque', 'non_ami', 'anon', 'cascade', 'ancienne_selection', 'relation_renouvelee']) assert.ok(recipe.includes('$' + name + '$'))
  assert.ok(!recipe.includes('api.mammouth')); assert.ok(recipe.includes('EXCEPTION WHEN insufficient_privilege'))
})
