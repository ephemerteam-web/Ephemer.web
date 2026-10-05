// Parcours du vrai écran avec contacts fictifs ; aucun accès Supabase.
import assert from 'node:assert/strict'
import test from 'node:test'
import { harness } from './ui-harness.mjs'

function contactsPage(contacts, listState = { lists: [], memberships: [], loading: false, error: '', selected: '', filter: rows => rows }) {
  return harness('app/dashboard/contacts/page.tsx', {
    overrides: {
      '@/lib/hooks/useContacts': { useContacts: () => ({ contacts, loading: false, error: '', retry() {} }) },
      '@/lib/hooks/usePrivateLists': { usePrivateLists: () => listState },
      '@/components/PrivateLists': { ListSelector: 'select', ManageLists: 'button' },
      '@/components/PersonalDates': { default: 'button' },
      '@/components/DrawerContext': { useDrawer: () => ({ ouvrirDrawer() {} }) },
      '@/components/AlphabetScrollbar': { default: 'nav' },
      'next/navigation': { useRouter: () => ({ push() {} }) },
      'next/link': { default: 'a' },
    },
  })
}
const fixture = () => [
  { id: 1, nom: 'Zulu', prenom: 'Léa', relation: 'amis', est_favori: true },
  { id: 2, nom: 'Albert', prenom: 'Léa', relation: 'ami', est_favori: false },
  { id: 3, nom: 'Martin', prenom: 'Léa', relation: 'famille', est_favori: true },
  { id: 4, nom: 'Bernard', prenom: 'Paul', relation: 'ami', est_favori: null },
  { id: 5, nom: 'Dupont', prenom: 'Inès', relation: 'ami' },
]
const cards = h => h.nodes().filter(node => node.props['data-letter']).map(node => node.key.replace(/^\.\$/, ''))
const toggle = (h, checked) => {
  h.find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked } })
  h.render()
}

test('contacts : favoris combinés avec recherche et relation, puis retour à tous sans mutation', () => {
  const contacts = fixture(), before = structuredClone(contacts), h = contactsPage(contacts)
  h.render()
  assert.deepEqual(cards(h), ['2', '4', '5', '3', '1'])
  assert.equal(h.find(node => node.type === 'input' && node.props.type === 'checkbox').props.checked, false)
  toggle(h, true)
  assert.deepEqual(cards(h), ['3', '1'])
  h.find(node => node.type === 'input' && node.props.type === 'search').props.onChange({ target: { value: '  léa ' } })
  h.render()
  h.find(node => node.type === 'button' && h.text(node).includes('Ami(e)')).props.onClick()
  h.render()
  assert.deepEqual(cards(h), ['1']) // La relation historique « amis » est normalisée.
  toggle(h, false)
  assert.deepEqual(cards(h), ['2', '1'])
  assert.deepEqual(contacts, before)
})

test('contacts : liste combinée avec favoris, recherche et relation ; liste vide explicite', () => {
  let selected = new Set([1, 2])
  const state = { lists: [], memberships: [], loading: false, error: '', selected: 'l1', filter: rows => rows.filter(row => selected.has(row.id)) }
  const h = contactsPage(fixture(), state); h.render()
  assert.deepEqual(cards(h), ['2', '1'])
  toggle(h, true); assert.deepEqual(cards(h), ['1'])
  h.find(node => node.type === 'input' && node.props.type === 'search').props.onChange({ target: { value: 'léa' } }); h.render()
  h.find(node => node.type === 'button' && h.text(node).includes('Ami(e)')).props.onClick(); h.render()
  assert.deepEqual(cards(h), ['1'])
  selected = new Set(); h.render(); assert.deepEqual(cards(h), [])
  assert.match(h.text(), /Aucun contact ne correspond/)
})

test('contacts : favoris nullable exclus, état vide explicite et filtre réinitialisé à la réouverture', () => {
  const h = contactsPage(fixture())
  h.render()
  toggle(h, true)
  h.find(node => node.type === 'input' && node.props.type === 'search').props.onChange({ target: { value: 'Paul' } })
  h.render()
  assert.deepEqual(cards(h), [])
  assert.match(h.text(), /Aucun contact ne correspond à tes filtres/)
  toggle(h, false)
  assert.deepEqual(cards(h), ['4'])
  const reopened = contactsPage(fixture())
  reopened.render()
  assert.equal(reopened.find(node => node.type === 'input' && node.props.type === 'checkbox').props.checked, false)
  assert.equal(cards(reopened).length, 5)
})
