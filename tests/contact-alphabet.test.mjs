import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const source = stripTypeScriptTypes(readFileSync(new URL('../lib/contact-alphabet.ts', import.meta.url), 'utf8')).replace(/^export /gm, '')
const { contactLetter, compareContactNames, alphabetIndex } = runInNewContext(`${source}\n;({ contactLetter, compareContactNames, alphabetIndex })`)

test('initiales : accents, espaces et champ vide utilisent la même clé que le tri', () => {
  assert.equal(contactLetter({ nom: ' Évrard ', prenom: 'Paul' }, 'nom'), 'E')
  assert.equal(contactLetter({ nom: '  ', prenom: 'Àlice' }, 'nom'), 'A')
  assert.equal(contactLetter({ nom: 'Martin', prenom: null }, 'prenom'), 'M')
  assert.equal(contactLetter({ nom: null, prenom: null }, 'nom'), '')
  assert.ok(compareContactNames({ nom: ' ', prenom: 'Zoé' }, { nom: 'Martin', prenom: null }, 'nom') > 0)
})

test('les favoris restent à leur place dans les deux tris alphabétiques', () => {
  const contacts = [
    { nom: 'Zulu', prenom: 'Zoé', est_favori: true },
    { nom: 'Albert', prenom: 'Alice', est_favori: false },
    { nom: 'Évrard', prenom: 'Émile', est_favori: false },
  ]
  for (const sort of ['nom', 'prenom']) {
    assert.deepEqual([...contacts].sort((a, b) => compareContactNames(a, b, sort)).map(c => c.nom), ['Albert', 'Évrard', 'Zulu'])
  }
})

test('le doigt parcourt toutes les lettres et reste borné en dehors de la réglette', () => {
  for (const height of [180, 380, 728]) {
    for (let index = 0; index < 26; index++) {
      assert.equal(alphabetIndex(80 + (index + 0.5) * height / 26, 80, height, 26), index)
    }
    assert.equal(alphabetIndex(-100, 80, height, 26), 0)
    assert.equal(alphabetIndex(2000, 80, height, 26), 25)
  }
  assert.equal(alphabetIndex(150, 100, 100, 2), 1)
  assert.equal(alphabetIndex(150, 100, 0, 2), -1)
  assert.equal(alphabetIndex(150, 100, 100, 0), -1)
})
