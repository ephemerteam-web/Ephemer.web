// Contrats futurs exécutés localement ; aucune preuve d'autorisation Supabase distante.
import test from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './ui-harness.mjs'
const c = harness('lib/cadeaux-social-contract.ts', { globals: { TextEncoder } }).component
const u = harness('lib/univers-contract.ts', { globals: { TextEncoder } }).component
const copy = v => JSON.parse(JSON.stringify(v))
const etoileId = '00000000-0000-4000-8000-0000000040a1'
const owner = () => copy(c.universCadeauxInitial(u.universInitial('Lune')))
const projection = () => ({ revision: 2, revisionRelation: 3, champs: { passions: 'Livres', eviter: '<script>texte littéral</script>' } })

test('10C : défaut fermé et ancien contrat propriétaire rejeté, sans migration implicite', () => {
  assert.ok(Object.values(owner().iaCadeaux).every(v => !v))
  assert.throws(() => c.monUniversCadeaux(u.universInitial('Lune')))
  assert.throws(() => c.monUniversCadeaux({ ...owner(), userId: etoileId }))
  for (const flags of [{}, null, { ...owner().iaCadeaux, email: true }, { ...owner().iaCadeaux, passions: 1 }]) assert.throws(() => c.monUniversCadeaux({ ...owner(), iaCadeaux: flags }))
})
test('10C : les autorisations persistent après texte enregistré, et exigent le partage', () => {
  const row = owner(); row.partage.passions = true; row.iaCadeaux.passions = true; row.valeurs.passions = 'Livres'
  assert.equal(c.monUniversCadeaux(row).iaCadeaux.passions, true)
  row.valeurs.passions = 'Musique'; assert.equal(c.monUniversCadeaux(row).iaCadeaux.passions, true)
  row.partage.passions = false; assert.throws(() => c.monUniversCadeaux(row))
  row.iaCadeaux.passions = false; row.iaCadeaux.identite = true; assert.equal(c.monUniversCadeaux(row).iaCadeaux.identite, true)
})
test('10C : projection sans coordonnées, date, avatar, permissions ou identité non autorisée', () => {
  assert.deepEqual(copy(c.universPourCadeaux(projection())), projection())
  for (const key of ['email', 'telephone', 'anniversaire', 'avatar', 'note']) assert.throws(() => c.universPourCadeaux({ ...projection(), champs: { ...projection().champs, [key]: 'SECRET' } }))
  assert.throws(() => c.universPourCadeaux({ ...projection(), identite: 'Hors autorisation' }))
  assert.deepEqual(copy(c.universPourCadeaux({ revision: 0, revisionRelation: 1, champs: {} })).champs, {})
})
test('10C : sélection explicite unique bornée et révisions sûres', () => {
  const valid = { etoileId, revision: 2, revisionRelation: 3, champs: ['passions'] }
  assert.deepEqual(copy(c.selectionUniversCadeaux(valid)), valid)
  for (const champs of [[], null, ['email'], ['passions', 'passions'], ['passions', null]]) assert.throws(() => c.selectionUniversCadeaux({ ...valid, champs }))
  for (const revision of [-1, '2', 2.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => c.selectionUniversCadeaux({ ...valid, revision }))
  assert.throws(() => c.selectionUniversCadeaux({ ...valid, revisionRelation: 0 }))
  assert.throws(() => c.selectionUniversCadeaux({ ...valid, valeurs: { passions: 'injecté' } }))
  assert.throws(() => c.selectionDepuisProjection(etoileId, projection(), ['identite']))
})
test('10C : la résolution exige exactement les champs sélectionnés et la même relation', () => {
  const selected = c.selectionDepuisProjection(etoileId, projection(), ['passions'])
  const resolved = { ...projection(), champs: { passions: 'Livres' } }
  assert.deepEqual(copy(c.sourceCadeauxAutorisee(resolved, selected)), resolved)
  for (const row of [projection(), { ...resolved, champs: {} }, { ...resolved, revision: 3 }, { ...resolved, revisionRelation: 4 }]) assert.throws(() => c.sourceCadeauxAutorisee(row, selected))
})
test('10C : bigint conservés en texte et textes hostiles jamais interprétés', () => {
  assert.equal(c.contactCadeaux('9223372036854775807'), '9223372036854775807')
  assert.equal(c.contactCadeaux(42), '42'); assert.equal(c.contactCadeaux(null), null)
  for (const value of [Number.MAX_SAFE_INTEGER + 1, '9223372036854775808', '0', 0, '1.1']) assert.throws(() => c.contactCadeaux(value))
  assert.equal(c.universPourCadeaux(projection()).champs.eviter, '<script>texte littéral</script>')
  for (const value of ['x'.repeat(1001), '\ud800', '\u0000', '']) assert.throws(() => c.universPourCadeaux({ ...projection(), champs: { passions: value } }))
})
