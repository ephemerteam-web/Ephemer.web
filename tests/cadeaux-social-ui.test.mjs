import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { harness } from './ui-harness.mjs'
const permissions = harness('components/cadeaux/UniversCadeauxPermissions.tsx', { globals: { TextEncoder } }).component.default
const selection = harness('components/cadeaux/UniversCadeauxSelection.tsx', { globals: { TextEncoder } }).component.default
const c = harness('lib/cadeaux-social-contract.ts', { globals: { TextEncoder } }).component
const u = harness('lib/univers-contract.ts', { globals: { TextEncoder } }).component
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, { onChange() {}, ...props }))
test('10C UI : portée persistante, cinq autorisations et aucun champ masqué activable', () => {
  const owner = c.universCadeauxInitial(u.universInitial('Lune'))
  const html = render(permissions, { univers: owner })
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 5)
  assert.equal((html.match(/<input[^>]*disabled/g) ?? []).length, 4)
  assert.ok(!html.includes(' checked=""'))
  assert.ok(html.includes('prochaines modifications enregistrées')); assert.ok(html.includes('jusqu’à'))
})
test('10C UI : seules les valeurs éligibles sont rendues, textes hostiles échappés', () => {
  const html = render(selection, { projection: { revision: 1, revisionRelation: 1, champs: { passions: '<script>texte</script>' } }, fields: [] })
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 1)
  assert.ok(html.includes('&lt;script&gt;texte&lt;/script&gt;')); assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('Informations partagées par cette étoile')); assert.ok(!html.includes(' checked=""'))
})
test('10C UI : indisponibilité ou absence de permissions permet la recherche générale', () => {
  for (const projection of [null, { revision: 0, revisionRelation: 1, champs: {} }]) {
    const html = render(selection, { projection, fields: [] })
    assert.ok(html.includes('idées générales')); assert.ok(!html.includes('type="checkbox"'))
  }
  assert.ok(render(selection, { projection: null, fields: [], loading: true }).includes('role="status"'))
})
