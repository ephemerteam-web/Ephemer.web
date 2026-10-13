import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { loadPure, pageDatabase, p2Helpers } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'

const costs = loadPure('lib/celebration-personal.ts', 'personalCelebrationCosts,preparationIsHistory,exactTotal')
const ideas = loadPure('lib/attention-utils.ts', 'quickIdea')
const choice = (values = {}) => ({ id: 'c', preparation_id: 'p', etat: 'prevu', devise_estimee: 'EUR', prix_estime_centimes: 29, devise_depensee: 'EUR', montant_depense_centimes: 25, ...values })

test('célébration personnelle : historique calculé sans modifier les occurrences ni les états', () => {
  const prep = { etat: 'ouverte' }
  assert.equal(costs.preparationIsHistory(prep, '2026-10-13', '2026-10-13'), false)
  assert.equal(costs.preparationIsHistory(prep, '2026-10-12', '2026-10-13'), true)
  assert.equal(costs.preparationIsHistory({ etat: 'terminee' }, '2027-01-01', '2026-10-13'), true)
  assert.equal(costs.preparationIsHistory(prep, '2027-01-01', '2026-10-13', true), true)
  assert.equal(prep.etat, 'ouverte')
})

test('frais personnels : centimes exacts, devises isolées, don non doublé et achats sans date conservés', () => {
  const rows = [choice({ etat: 'achete' }), choice({ id: 'planned' }), choice({ id: 'other', preparation_id: 'other', etat: 'achete' }), choice({ id: 'usd', etat: 'achete', devise_depensee: 'USD', montant_depense_centimes: 100 })]
  const totals = costs.personalCelebrationCosts(rows, [{ choix_id: 'c', montant_depense_centimes: 25 }], 'p', true)
  assert.equal(totals[0].spent, 25n)
  assert.equal(totals[0].planned, 29n)
  assert.equal(totals[1].spent, 100n)
  assert.equal(costs.personalCelebrationCosts(rows, [], 'p', false)[0].planned, 0n)
  assert.equal(costs.personalCelebrationCosts([choice()], [{ choix_id: 'c' }], 'p', true).length, 0)
})

test('frais : inconnu distinct de zéro, somme au-delà des entiers JS et refus des montants inexacts', () => {
  const totals = costs.personalCelebrationCosts([choice({ prix_estime_centimes: null }), choice({ id: 'zero', prix_estime_centimes: 0 })], [], 'p', true)
  assert.equal(totals[0].planned, 0n); assert.equal(totals[0].plannedUnknown, 1)
  const max = costs.personalCelebrationCosts([choice({ prix_estime_centimes: Number.MAX_SAFE_INTEGER }), choice({ id: 'b', prix_estime_centimes: Number.MAX_SAFE_INTEGER })], [], 'p', true)
  assert.equal(costs.exactTotal(max[0].planned, 'EUR'), '180143985094819,82 EUR')
  assert.throws(() => costs.personalCelebrationCosts([choice({ prix_estime_centimes: 0.1 })], [], 'p', true))
})

test('ajout rapide : titre ou lien, libellé neutre, aucune adresse exécutable acceptée', () => {
  assert.equal(ideas.quickIdea(' Livre ', '').titre, 'Livre')
  assert.equal(ideas.quickIdea('', 'https://example.invalid/gift').titre, 'Idée à découvrir')
  assert.equal(ideas.quickIdea('Livre', '').lien_marchand, null)
  assert.throws(() => ideas.quickIdea(' ', ''))
  assert.throws(() => ideas.quickIdea('Livre', 'javascript:alert(1)'))
})

test('onglets : même contenu monté après changement et navigation clavier sans perte de saisie', () => {
  const h = harness('components/CelebrationTabs.tsx', { overrides: { '@/components/AttentionShared': { button: '' } }, globals: { document: { getElementById: () => ({ focus() {} }) } } })
  const org = React.createElement('input', { defaultValue: 'Texte privé' }), props = { organisation: org, ideas: 'Idées', costs: 'Frais' }
  h.render(props)
  assert.equal(h.find(n => n.props.role === 'tabpanel' && !n.props.hidden).props.children, org)
  h.find(n => n.props.role === 'tab' && n.props.children === 'Frais').props.onClick()
  h.render(props)
  assert.equal(h.find(n => n.props.role === 'tabpanel' && !n.props.hidden).props.children, 'Frais')
  h.find(n => n.props.role === 'tab' && n.props.children === 'Frais').props.onKeyDown({ key: 'Home', preventDefault() {} })
  h.render(props)
  assert.equal(h.find(n => n.props.role === 'tabpanel' && !n.props.hidden).props.children, org)
  assert.equal(h.nodes().filter(n => n.props.role === 'tabpanel').length, 3)
})

test('consultation d’une préparation existante sans permission d’écriture : aucun appel de création, propriétaire vérifié', async () => {
  const tables = {
    occurrences_evenements: [{ id: 'o', user_id: 'A', evenement_id: 'e' }],
    evenements_personnels: [{ id: 'e', user_id: 'A', contact_id: null }],
    preparations_evenements: [{ id: 'p', user_id: 'A', occurrence_id: 'o', etat: 'terminee' }, { id: 'foreign', user_id: 'B', occurrence_id: 'o' }],
    taches_preparation: [{ id: 't', user_id: 'A', preparation_id: 'p', titre: 'Privée' }],
  }
  const db = pageDatabase(tables)
  const from = db.from; db.from = table => { const query = from(table); query.single = query.maybeSingle; return query }
  db.auth = { getUser: async () => ({ data: { user: { id: 'A' } } }) }
  let writes = 0
  db.rpc = async () => { writes++; throw new Error('Écriture refusée') }
  const api = loadPure('lib/attention-data.ts', 'loadPreparation,requireOwner', { supabase: db, ...p2Helpers })
  const result = await api.loadPreparation('A', 'o')
  assert.equal(result.preparation.id, 'p'); assert.equal(result.tasks[0].titre, 'Privée'); assert.equal(writes, 0)
  await assert.rejects(api.loadPreparation('B', 'o'), /session a changé/)
  tables.preparations_evenements = []
  await assert.rejects(api.loadPreparation('A', 'o'), /Écriture refusée/)
  assert.equal(writes, 1)
})
