// Contrats/rendus réellement exécutés, aucune prétention de vérifier une RLS distante.
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { harness } from './ui-harness.mjs'
const c = harness('lib/univers-contract.ts', { globals: { TextEncoder } }).component
const avatar = harness('lib/avatar-collection-v3.ts').component.DEFAULT_AVATAR_V3
const uuid = '00000000-0000-4000-8000-0000000030a1'
const copy = v => JSON.parse(JSON.stringify(v))
const data = () => { const v = copy(c.universInitial('Lune')); v.valeurs.presentation = '<script>texte</script>'; v.valeurs.eviter = 'Secret privé'; v.valeurs.anniversaire = { jour: 29, mois: 2, annee: 2000 }; return v }
test('univers : première lecture sans facultatif, aucune donnée privée récupérée', () => {
  const row = c.universInitial('Lune')
  assert.equal(row.revision, 0); assert.ok(Object.values(row.partage).every(v => v === false))
  assert.deepEqual(copy(c.apercuUnivers(row, avatar)), { identite: 'Lune', champs: {} })
})
test('univers : année absente de la projection même si conservée dans les valeurs', () => {
  const row = data(); row.partage.anniversaire = true
  assert.deepEqual(copy(c.apercuUnivers(row)), { identite: 'Lune', champs: { anniversaire: { jour: 29, mois: 2 } } })
  row.partage.annee = true
  assert.equal(c.apercuUnivers(row).champs.anniversaire.annee, 2000)
  row.partage.anniversaire = false; assert.throws(() => c.monUnivers(row))
})
test('univers : toutes les dates et années limites, 29 février indépendant du fuseau', () => {
  for (const year of [null, 2000, 2024]) assert.doesNotThrow(() => c.anniversaireUnivers({ jour: 29, mois: 2, annee: year }))
  for (const value of [null, 1, [], {}, { jour: 29, mois: 2, annee: 1900 }, { jour: 31, mois: 4, annee: null }, { jour: 0, mois: 1, annee: null }, { jour: 1, mois: 13, annee: null }, { jour: 1, mois: 1, annee: 0 }, { jour: 1, mois: 1, annee: 10000 }, { jour: 1.5, mois: 1, annee: null }]) {
    if (value === null) assert.equal(c.anniversaireUnivers(value), null); else assert.throws(() => c.anniversaireUnivers(value))
  }
})
test('univers : coordonnées distinctes, aucune publication implicite, projection sans champs cachés', () => {
  const row = data(); row.valeurs.email = 'choisi@example.invalid'; row.valeurs.telephone = '+33 6 00 00 00 00'; row.partage.email = true
  assert.deepEqual(copy(c.apercuUnivers(row)), { identite: 'Lune', champs: { email: 'choisi@example.invalid' } })
  for (const value of ['A@EX.ORG', 'a b@ex.org', 'a@b']) { row.valeurs.email = value; assert.throws(() => c.monUnivers(row)) }
  row.valeurs.email = ''; row.valeurs.telephone = 'javascript:alert(1)'; assert.throws(() => c.monUnivers(row))
})
test('univers : aucun champ propriétaire ou IA injecté dans les commandes', () => {
  const { revision, ...donnees } = data(), command = { action: 'enregistrer', revision, operation: uuid, donnees }
  const result = c.commandeUnivers(command); assert.equal(result.operation, uuid)
  for (const input of [{ ...command, user_id: uuid }, { ...command, donnees: { ...donnees, note: 'secret' } }, { ...command, donnees: { ...donnees, partage: { ...donnees.partage, ia: true } } }, { ...command, operation: 'mauvais' }, { ...command, revision: Number.MAX_SAFE_INTEGER }, { ...command, action: 'masquer' }, { ...command, action: 'publier' }]) assert.throws(() => c.commandeUnivers(input))
  assert.doesNotThrow(() => c.commandeUnivers({ action: 'masquer', revision: 0, operation: uuid, donnees: {} }))
})
test('univers : longueurs Unicode, contrôles et volume bornés ; texte hostile conservé comme donnée', () => {
  const row = data(); row.valeurs.presentation = '🌙'.repeat(1000); assert.doesNotThrow(() => c.monUnivers(row))
  row.valeurs.presentation += 'a'; assert.throws(() => c.monUnivers(row))
  row.valeurs.presentation = '\u0000'; assert.throws(() => c.monUnivers(row))
  row.valeurs.presentation = '<img src=x onerror=alert(1)>\nPassion'; row.partage.presentation = true
  assert.equal(c.apercuUnivers(row).champs.presentation, row.valeurs.presentation)
})
test('univers : avatar enregistré valide seulement, essais indépendants et aucune mutation du propriétaire', () => {
  const row = data(), before = copy(row); row.partage.avatar = true
  assert.equal(c.apercuUnivers(row, null).champs.avatar, undefined)
  assert.equal(c.apercuUnivers(row, { ...avatar, src: 'https://example.invalid/secret' }).champs.avatar, undefined)
  const rendered = c.apercuUnivers(row, avatar); assert.equal(rendered.champs.avatar.catalogVersion, 3)
  rendered.champs.avatar.accessories.headwearId = 'halo'; assert.equal(avatar.accessories.headwearId, 'aucun')
  row.partage.avatar = false; assert.deepEqual(copy(row), before)
})
test('univers : lecteur partagé fermé, dates sans année, versions inconnues refusées', () => {
  assert.doesNotThrow(() => c.universPartage({ identite: 'Lune', champs: { anniversaire: { jour: 29, mois: 2 } } }))
  for (const input of [{ identite: 'Lune', champs: {}, valeurs: {} }, { identite: 'Lune', champs: { revision: 1 } }, { identite: 'Lune', champs: { anniversaire: { jour: 1, mois: 1, annee: null } } }, { identite: 'Lune', champs: { avatar: { format: 999 } } }]) assert.throws(() => c.universPartage(input))
  assert.equal(c.monUnivers({ ...data(), revision: Number.MAX_SAFE_INTEGER }).revision, Number.MAX_SAFE_INTEGER)
  assert.throws(() => c.resultatUnivers({ ok: true, revision: 1, valeurs: 'ancien contenu' }))
})
test('univers : rendu React réel échappé, sans année cachée, email privé ou HTML injecté', () => {
  const row = data(); row.partage.presentation = true; row.partage.anniversaire = true
  const View = harness('components/univers/UniversView.tsx', { globals: { TextEncoder } }).component.default
  const html = renderToStaticMarkup(React.createElement(View, { value: c.apercuUnivers(row) }))
  assert.ok(html.includes('&lt;script&gt;texte&lt;/script&gt;')); assert.ok(html.includes('29/02'))
  assert.ok(!html.includes('<script>')); assert.ok(!html.includes('2000')); assert.ok(!html.includes('Secret privé'))
})
