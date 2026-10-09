import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const dir = 'docs/evolution/lot-10B/'
test('univers dossier : toutes les empreintes correspondent aux corps proposés, contrôle 10A conservé', () => {
  const proposal = read(dir + 'schema-propose.sql'), catalogue = read(dir + 'verification-lecture-seule.sql')
  const matches = [...proposal.matchAll(/CREATE (?:OR REPLACE )?FUNCTION ([\w.]+)\([^]*?AS \$fn\$([^]*?)\$fn\$;/g)]
  assert.equal(matches.length, 8)
  for (const match of matches) assert.ok(catalogue.includes(createHash('md5').update(match[2]).digest('hex')), match[1])
  assert.ok(catalogue.includes("schemaname='ephemer_social')<>9")); assert.ok(catalogue.includes("pronamespace='ephemer_social'::regnamespace)<>17"))
  const original = read('docs/evolution/lot-10A/verification-lecture-seule.sql')
  const originalHashes = [...original.matchAll(/\('([^']+)','([a-f0-9]{32})'\)/g)]
  assert.equal(originalHashes.length, 18)
  for (const [, signature, hash] of originalHashes) if (signature !== 'ephemer_social.identite(uuid)') assert.ok(catalogue.includes(hash), signature)
  assert.ok(catalogue.startsWith('-- Après application HUMAINE')); assert.ok(catalogue.includes('BEGIN READ ONLY;')); assert.ok(!catalogue.includes('__HASH_'))
})
test('univers dossier : retour sans données, identité 10A restaurée exactement et recette isolée', () => {
  const rollback = read(dir + 'retour-arriere.sql'), recipe = read(dir + 'verification.sql')
  const body = rollback.match(/CREATE OR REPLACE FUNCTION ephemer_social.identite\(v uuid\)[^]*?AS \$fn\$([^]*?)\$fn\$;/)[1]
  assert.equal(createHash('md5').update(body).digest('hex'), '5af7f37c9c3b92bf192fa4957fc4f0d3')
  assert.ok(rollback.includes('CONFIRME_RETOUR_SANS_DONNEES_10B')); assert.ok(rollback.includes('EXISTS(SELECT 1 FROM ephemer_social.operations_univers)'))
  assert.ok(!/DROP [^;]*CASCADE/i.test(rollback)); assert.ok(!/DELETE FROM/i.test(rollback))
  assert.ok(recipe.includes('CONFIRME_COPIE_ISOLEE_10B')); assert.ok(recipe.endsWith('ROLLBACK;\n'))
})
