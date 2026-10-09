// ⭐ Validations réellement exécutées ; aucune simulation de RLS ou d'amitié SQL.
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPure } from './p2-helpers.mjs'

const contract = loadPure('lib/etoiles-contract.ts', 'commandeEtoile,emailEtoile,contactIdEtoile,lectureEtoiles', { TextEncoder })
const id = 'A0000000-0000-4000-8000-000000000010'
const body = (action, donnees) => ({ action, donnees, operation: id })
const copy = value => JSON.parse(JSON.stringify(value))

test('étoiles : adresse exacte, casse et espaces périphériques, sans rapprochement approximatif', () => {
  assert.equal(contract.emailEtoile(' \tALIce+amis@Example.org\r\n'), 'alice+amis@example.org')
  assert.notEqual(contract.emailEtoile('a.lice@example.org'), contract.emailEtoile('alice@example.org'))
  assert.notEqual(contract.emailEtoile('alice+amis@example.org'), contract.emailEtoile('alice@example.org'))
  for (const value of [null, 1, {}, '', 'a@b', 'a b@ex.org', 'a@b@ex.org', '\u00a0a@ex.org', `${'a'.repeat(315)}@ex.org`]) {
    assert.throws(() => contract.emailEtoile(value))
  }
})
test('étoiles : chaque commande autorisée produit une projection fermée', () => {
  const cases = [
    ['demander', { email: ' A@EX.ORG ' }], ['demander_contact', { contactId: '12' }],
    ['demander_lien', { token: 'a'.repeat(42) + 'A' }],
    ...['accepter', 'refuser', 'annuler'].map(action => [action, { demandeId: id }]),
    ...['retirer', 'bloquer', 'debloquer'].map(action => [action, { etoileId: id }]),
    ['creer_lien', {}], ['revoquer_lien', { lienId: id }], ['associer_contact', { contactId: '12', etoileId: id }],
  ]
  for (const [action, data] of cases) {
    const input = body(action, data), before = copy(input), result = contract.commandeEtoile(input)
    assert.equal(result.action, action); assert.equal(result.operation, id.toLowerCase())
    assert.deepEqual(copy(input), before)
    data.extra = 'aucune mutation de la copie retournée'; assert.equal(result.donnees.extra, undefined)
  }
  assert.equal(contract.commandeEtoile(body('demander', { email: ' A@EX.ORG ' })).donnees.email, 'a@ex.org')
})
test('étoiles : refus de propriétaire injecté, champs supplémentaires, absents et mauvais types', () => {
  for (const value of [null, [], {}, { ...body('creer_lien', {}), user_id: id }, body(null, {}), body('inconnu', {}),
    body('creer_lien', { email: 'a@ex.org' }), body('demander', {}), body('demander', { email: ['a@ex.org'] }),
    body('demander', { email: 'a@ex.org', cible_id: id }), body('accepter', { demandeId: null }),
    { ...body('creer_lien', {}), operation: 'uuid-invalide' }, body('associer_contact', { contactId: '1' }),
    body('associer_contact', { contactId: '1', etoileId: id, note: 'secret' })]) assert.throws(() => contract.commandeEtoile(value))
})
test('étoiles : les identifiants bigint conservent leur précision', () => {
  assert.equal(contract.contactIdEtoile('9007199254740993'), '9007199254740993')
  assert.equal(contract.contactIdEtoile('9223372036854775807'), '9223372036854775807')
  for (const value of [1, 9007199254740992, 1n, '0', '-1', '01', '1.2', '1e4', ' 12', '9223372036854775808', '9'.repeat(20)]) {
    assert.throws(() => contract.contactIdEtoile(value))
  }
})
test('étoiles : token canonique et limites de taille, aucune URL libre', () => {
  for (const last of 'AEIMQUYcgkosw048') assert.doesNotThrow(() => contract.commandeEtoile(body('demander_lien', { token: 'a'.repeat(42) + last })))
  for (const token of ['a'.repeat(43), 'a'.repeat(42) + 'B', 'a'.repeat(42), 'a'.repeat(44), 'https://ex.org/#' + 'a'.repeat(42) + 'A']) {
    assert.throws(() => contract.commandeEtoile(body('demander_lien', { token })))
  }
  assert.throws(() => contract.commandeEtoile(body('demander', { email: 'é'.repeat(2048) })))
})
test('étoiles : lectures bornées, UUID de curseur, refus de null ou limite illimitée', () => {
  for (const vue of ['actives', 'recues', 'envoyees', 'bloquees', 'liens']) {
    assert.equal(contract.lectureEtoiles({ vue, apres: id, limite: 100 }).apres, id.toLowerCase())
    assert.equal(contract.lectureEtoiles({ vue, apres: null, limite: 1 }).apres, null)
  }
  for (const value of [{ vue: null, apres: null, limite: 10 }, { vue: 'associations', apres: null, limite: 10 },
    ...[null, 0, 101, -1, 1.5, '50', Infinity].map(limite => ({ vue: 'actives', apres: null, limite })),
    { vue: 'actives', apres: '1', limite: 10 }, { vue: 'actives', apres: null, limite: 10, user_id: id }]) {
    assert.throws(() => contract.lectureEtoiles(value))
  }
})
