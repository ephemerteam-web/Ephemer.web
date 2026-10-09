// L'orchestration réelle est exécutée avec Auth/RPC/fournisseur fictifs, jamais payants.
import test from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './ui-harness.mjs'
const g = harness('lib/cadeaux-social-generation.ts', { globals: { TextEncoder } }).component
const etoileId = '00000000-0000-4000-8000-0000000040a1'
const selection = () => ({ etoileId, revision: 2, revisionRelation: 1, champs: ['passions'] })
const projected = () => ({ revision: 2, revisionRelation: 1, champs: { passions: 'Livres' } })
function fixture(overrides = {}) {
  const calls = [], sources = []
  const services = {
    verifierSession: async () => { calls.push('session') },
    lireNotesPrivees: async contact => { calls.push(['prive', contact]); return contact ? { note: 'Ma note sélectionnée' } : {} },
    resoudreUnivers: async (selected, contact) => { calls.push(['rpc', selected.etoileId, contact]); return projected() },
    consommerQuota: async () => { calls.push('quota') },
    appelerFournisseur: async input => { calls.push('fournisseur'); sources.push(input); return { ideas: ['Suggestion fictive'] } },
    ...overrides,
  }
  return { services, calls, sources }
}
test('10C : double accord, sources séparées et contrôles avant quota/avant fournisseur/après', async () => {
  const f = fixture()
  const result = await g.genererCadeauxAvecSources({ contactId: '42', univers: selection() }, f.services)
  assert.equal(result.ideas[0], 'Suggestion fictive')
  assert.deepEqual(f.calls, ['session', ['prive', '42'], ['rpc', etoileId, '42'], 'quota', ['rpc', etoileId, '42'], 'fournisseur', 'session', ['rpc', etoileId, '42']])
  assert.deepEqual(JSON.parse(JSON.stringify(f.sources)), [{ notesPrivees: { note: 'Ma note sélectionnée' }, universPartage: { passions: 'Livres' } }])
})
test('10C : étoile sans fiche et génération générale sans source sociale', async () => {
  const f = fixture(); await g.genererCadeauxAvecSources({ univers: selection() }, f.services)
  assert.deepEqual(JSON.parse(JSON.stringify(f.sources[0].notesPrivees)), {})
  const general = fixture(); await g.genererCadeauxAvecSources({}, general.services)
  assert.ok(!general.calls.some(c => Array.isArray(c) && c[0] === 'rpc'))
  assert.deepEqual(JSON.parse(JSON.stringify(general.sources[0])), { notesPrivees: {}, universPartage: {} })
})
test('10C : refus session/sélection/association avant compteur et fournisseur', async () => {
  for (const failure of [new Error('Session invalide'), new Error('Association incompatible')]) {
    const f = fixture(failure.message.startsWith('Session') ? { verifierSession: async () => { throw failure } } : { resoudreUnivers: async () => { throw failure } })
    await assert.rejects(g.genererCadeauxAvecSources({ univers: selection() }, f.services))
    assert.ok(!f.calls.includes('quota')); assert.ok(!f.calls.includes('fournisseur'))
  }
  const f = fixture(); await assert.rejects(g.genererCadeauxAvecSources({ univers: { ...selection(), champs: ['email'] } }, f.services)); assert.equal(f.calls.length, 0)
})
test('10C : retrait entre prévalidation et fournisseur empêche toute transmission', async () => {
  let reads = 0
  const f = fixture({ resoudreUnivers: async () => ++reads === 1 ? projected() : { ...projected(), champs: {} } })
  await assert.rejects(g.genererCadeauxAvecSources({ univers: selection() }, f.services), e => e.status === 409)
  assert.ok(f.calls.includes('quota')); assert.ok(!f.calls.includes('fournisseur')); assert.equal(reads, 2)
})
test('10C : retrait ou changement pendant fournisseur écarte le résultat', async () => {
  for (const after of [{ ...projected(), revisionRelation: 2 }, { ...projected(), revision: 3 }, { ...projected(), champs: { passions: 'Autre texte' } }]) {
    let reads = 0
    const f = fixture({ resoudreUnivers: async () => ++reads < 3 ? projected() : after })
    await assert.rejects(g.genererCadeauxAvecSources({ univers: selection() }, f.services), e => e.status === 409)
    assert.equal(f.sources.length, 1)
  }
})
test('10C : quota dépassé, annulation et réponse perdue sans retry automatique', async () => {
  const quota = fixture({ consommerQuota: async () => { throw new Error('Quota dépassé') } })
  await assert.rejects(g.genererCadeauxAvecSources({ univers: selection() }, quota.services)); assert.equal(quota.sources.length, 0)
  let calls = 0
  const lost = fixture({ appelerFournisseur: async () => { calls++; throw new Error('Réponse perdue') } })
  await assert.rejects(g.genererCadeauxAvecSources({ univers: selection() }, lost.services)); assert.equal(calls, 1)
  const controller = new AbortController(); const abort = fixture({ consommerQuota: async () => controller.abort() })
  await assert.rejects(g.genererCadeauxAvecSources({ univers: selection() }, abort.services, controller.signal)); assert.equal(abort.sources.length, 0)
})
