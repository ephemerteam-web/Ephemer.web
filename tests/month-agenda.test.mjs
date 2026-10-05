// Recette du vrai composant avec réponses HTTP fictives, sans compte distant.
import assert from 'node:assert/strict'
import test from 'node:test'
import { harness } from './ui-harness.mjs'

const event = (key, day, kind = 'anniversaire', id = 1) => ({ id, occurrenceId: key,
  titre: kind === 'anniversaire' ? 'Anniversaire de Léa' : kind === 'fete_prenomale' ? 'Fête de Léa' : 'Première adoption',
  age: kind === 'anniversaire' ? 30 : null, prenom: 'Léa', nom: 'Martin', typeEvenement: kind,
  jour: Number(day.slice(8)), dateComplete: `${day}T00:00:00.000Z`, emoji: '🎉' })
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const response = (events, status = 200) => ({ ok: status === 200, status, json: async () => ({ evenements: events }) })

function setup({ rows = [], now = '2026-10-06T12:00:00Z', fetcher } = {}) {
  let owner = 'A', sessionOwner = 'A'
  const calls = []
  const lists = { loading: false, error: '', selected: '', lists: [{ id: 'famille', nom: 'Famille' }, { id: 'vide', nom: 'Vide' }], select(value) { this.selected = value }, async retry() { this.error = ''; return true } }
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])) } static now() { return Date.parse(now) } }
  const h = harness('components/EvenementsMois.tsx', { overrides: {
    '@/components/DashboardUserContext': { useDashboardUser: () => ({ id: owner }) },
    '@/lib/hooks/usePrivateLists': { usePrivateLists: () => lists },
    '@/lib/supabase-browser': { supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: sessionOwner }, access_token: 'fixture' } } }) } } },
    '@/components/Modal': { default: 'modal' }, 'next/link': { default: 'a' },
  }, globals: { Date: Clock, fetch: async (url, options) => { calls.push(url); return fetcher ? fetcher(url, options) : response(rows) } } })
  const ready = async () => { h.render(); await h.flush(); h.render() }
  const buttons = () => h.nodes().filter(node => node.type === 'button' && node.props['aria-haspopup'] === 'dialog')
  const select = (label, value) => { h.find(node => node.type === 'select' && node.props['aria-label'] === label).props.onChange({ target: { value } }); h.render() }
  const click = label => { h.find(node => node.type === 'button' && (node.props['aria-label'] === label || h.text(node) === label)).props.onClick(); h.render() }
  return { h, lists, calls, ready, buttons, select, click, owner(value) { owner = value; sessionOwner = value }, session(value) { sessionOwner = value } }
}

test('agenda : tri par journée, occurrences multiples, filtres combinés et détail sans faux contact', async () => {
  const rows = [event('c', '2026-10-14', 'adoption', null), event('b', '2026-10-08', 'fete_prenomale'), event('a', '2026-10-08')]
  const s = setup({ rows, fetcher: url => response(url.includes('liste=famille') ? rows.filter(row => row.id !== null) : url.includes('liste=vide') ? [] : rows) })
  await s.ready()
  assert.match(s.h.text(), /3 événements · 2 journées/)
  assert.equal(s.h.nodes().filter(node => node.type === 'section').length, 2)
  assert.deepEqual(s.buttons().map(node => node.props['aria-label'].split(',')[0]), ['Voir Anniversaire de Léa', 'Voir Fête de Léa', 'Voir Première adoption'])
  s.buttons()[0].props.onClick(); s.h.render()
  assert.equal(s.h.find(node => node.type === 'modal').props.open, true)
  assert.equal(s.h.find(node => node.type === 'a').props.href, '/dashboard/contacts/1/edit')
  assert.match(s.h.text(), /Âge à cette date30 ans/)
  s.select('Type d’événement', 'personnel')
  assert.equal(s.h.find(node => node.type === 'modal').props.open, false)
  assert.equal(s.buttons().length, 1); assert.match(s.h.text(), /Adoption · Ma date/)
  s.buttons()[0].props.onClick(); s.h.render()
  assert.equal(s.h.nodes().filter(node => node.type === 'a').length, 0)
  assert.doesNotMatch(s.h.text(), /Âge à cette date|ans/)
  s.select('Liste personnelle', 'famille'); await s.ready()
  assert.match(s.h.text(), /Aucun résultat avec ces filtres/)
  s.click('Réinitialiser les filtres'); await s.ready(); assert.equal(s.buttons().length, 3)
  s.select('Liste personnelle', 'vide'); await s.ready(); assert.equal(s.buttons().length, 0)
  assert.match(s.h.text(), /Aucun résultat avec ces filtres/)
})

test('agenda : Paris, décembre/janvier, conservation du filtre et mois vide', async () => {
  const s = setup({ now: '2026-12-31T23:30:00Z' }); await s.ready()
  assert.match(s.calls[0], /mois=0&annee=2027/)
  s.select('Type d’événement', 'fete_prenomale'); s.click('Mois précédent'); await s.ready()
  assert.match(s.calls.at(-1), /mois=11&annee=2026/)
  assert.equal(s.h.find(node => node.type === 'select' && node.props['aria-label'] === 'Type d’événement').props.value, 'fete_prenomale')
  s.click('Aujourd’hui'); await s.ready(); assert.match(s.calls.at(-1), /mois=0&annee=2027/)
  s.select('Type d’événement', 'tous'); assert.match(s.h.text(), /Aucun événement pour ce mois/)
  assert.equal(s.h.nodes().filter(node => node.type === 'button' && s.h.text(node) === 'Réinitialiser les filtres').length, 0)
})

test('agenda : chargement et réponse tardive après mois/liste/compte ; détail immédiatement masqué', async () => {
  const pending = []; const s = setup({ fetcher: url => { const request = deferred(); pending.push({ url, ...request }); return request.promise } })
  await s.ready(); assert.equal(s.buttons().length, 0)
  assert.equal(s.h.nodes().filter(node => node.type === 'select').length, 2)
  pending[0].resolve(response([event('a', '2026-10-08')])); await s.ready()
  s.buttons()[0].props.onClick(); s.h.render(); assert.equal(s.h.find(node => node.type === 'modal').props.open, true)
  s.click('Mois suivant')
  assert.equal(s.buttons().length, 0); assert.equal(s.h.find(node => node.type === 'modal').props.open, false)
  await s.ready(); s.click('Mois suivant'); await s.ready()
  pending[1].resolve(response([event('ancien', '2026-11-08')])); await s.ready()
  assert.equal(s.buttons().length, 0); assert.doesNotMatch(s.h.text(), /Léa/)
  pending[2].resolve(response([event('dec', '2026-12-08')])); await s.ready(); assert.equal(s.buttons().length, 1)
  s.select('Liste personnelle', 'famille'); assert.equal(s.buttons().length, 0); await s.ready()
  s.owner('B'); s.h.render(); assert.equal(s.buttons().length, 0); await s.ready()
  pending[3].resolve(response([event('ancien-compte', '2026-12-08')])); await s.ready(); assert.equal(s.buttons().length, 0)
  pending[4].resolve(response([])); await s.ready(); assert.equal(s.buttons().length, 0)
  assert.doesNotMatch(s.h.text(), /Léa/)
})

test('agenda : erreurs, réessai, refus Auth et réponse incomplète bloquent tous les résultats', async () => {
  let status = 500
  const s = setup({ fetcher: () => response([event('a', '2026-10-08')], status) }); await s.ready()
  assert.match(s.h.text(), /Impossible de charger/); assert.equal(s.buttons().length, 0)
  assert.equal(s.h.nodes().filter(node => node.type === 'select').length, 2)
  status = 200; s.click('Réessayer'); await s.ready(); assert.equal(s.buttons().length, 1)
  s.session('B'); s.click('Mois suivant'); await s.ready()
  assert.match(s.h.text(), /Session indisponible/); assert.equal(s.buttons().length, 0)
  assert.equal(s.h.find(node => node.type === 'a').props.href, '/connexion')
  for (const code of [401, 403, 404]) {
    const denied = setup({ fetcher: () => response([], code) }); await denied.ready()
    assert.equal(denied.buttons().length, 0); assert.match(denied.h.text(), code === 401 ? /Session indisponible/ : code === 403 ? /pas accès/ : /liste est indisponible/)
  }
  const bad = setup({ rows: [event('a', '2026-10-08'), { occurrenceId: 'incomplet' }] }); await bad.ready()
  assert.match(bad.h.text(), /Impossible de charger/); assert.equal(bad.buttons().length, 0)
  const lists = setup(); lists.lists.loading = true; await lists.ready(); assert.equal(lists.calls.length, 0)
  lists.lists.loading = false; lists.lists.error = 'Liste indisponible'; await lists.ready(); assert.match(lists.h.text(), /Liste indisponible/)
  lists.click('Réessayer'); await lists.ready(); await lists.ready(); assert.match(lists.h.text(), /Aucun événement pour ce mois/)
})
