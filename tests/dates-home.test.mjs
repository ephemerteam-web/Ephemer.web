import test from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './ui-harness.mjs'
import { p2Helpers, pageDatabase } from './p2-helpers.mjs'

const today = '2026-10-10'
const contact = { id: 1, prenom: 'Camille', nom: 'Martin', date_naissance: '1990-10-17', relation: 'ami', email: null }
const dates = [
  { key: 'fete', kind: 'fete_prenomale', contact, date: '2026-10-12', title: 'Fête de Camille', age: null, reminder: true, event: null, occurrence: null },
  { key: 'birthday', kind: 'anniversaire', contact, date: '2026-10-17', title: 'Anniversaire de Camille', age: 36, reminder: true, event: null, occurrence: null },
]

test('décomptes rétablis : prochaine occurrence, filtres 7 jours, vue compacte et contexte du message', () => {
  for (const [file, kind, delay] of [['anniversaires', 'anniversaire', 7], ['calendrier_saints', 'fete_prenomale', 2]]) {
    const destinations = []
    const ui = harness(`app/dashboard/${file}/page.tsx`, { overrides: {
      'next/navigation': { useRouter: () => ({ push: url => destinations.push(url) }) },
      '@/lib/supabase-browser': { supabase: {} },
      '@/lib/hooks/useContacts': { useContacts: () => ({ contacts: [contact], loading: false, error: '', retry() {} }) },
      '@/lib/hooks/usePrivateLists': { usePrivateLists: () => ({ filter: rows => rows, loading: false, error: '', retry() {} }) },
      '@/lib/hooks/usePersonalEvents': { usePersonalEvents: () => ({ views: dates, loading: false, error: '', retry() {} }) },
      '@/lib/calendar-day': { ...p2Helpers, parseLocalDay: value => new Date(`${value}T00:00:00`), parisDay: () => today },
    } })
    ui.render()
    const card = ui.nodes().find(node => node.props.anniv || node.props.fete)
    assert.equal((card.props.anniv ?? card.props.fete).joursRestants, delay)
    card.props.onMessage(1)
    assert.equal(destinations[0], `/dashboard/generate?contactId=1&eventType=${kind}`)
    ui.find(node => node.type === 'button' && ui.text(node) === '7 jours').props.onClick()
    ui.find(node => node.type === 'button' && ui.text(node).includes('Vue compacte')).props.onClick()
    ui.render()
    assert.equal(ui.nodes().filter(node => node.props.anniv || node.props.fete).length, 1)
    ui.find(node => node.type === 'button' && ui.text(node) === "Aujourd'hui").props.onClick()
    ui.render()
    assert.equal(ui.nodes().filter(node => node.props.anniv || node.props.fete).length, 0)
    assert.match(ui.text(), /à afficher pour ce filtre/)
  }
})

test('accueil unifié : chaque occurrence dans un groupe, borne 30 jours et un seul message vide', () => {
  const ui = harness('components/HomeDates.tsx', { extra: '\nexport { DateGroup };', overrides: { 'next/link': { default: 'a' }, '@/lib/supabase-browser': { supabase: {} } } })
  const views = [...dates, { ...dates[0], key: 'now', date: today }, { ...dates[1], key: 'recent', date: '2026-10-08' }, { ...dates[0], key: 'limit', date: '2026-11-09' }, { ...dates[0], key: 'outside', date: '2026-11-10' }]
  ui.render({ views, today })
  const groups = ui.nodes().filter(node => node.props.views)
  const displayed = groups.flatMap(node => node.props.views.map(view => view.key))
  assert.equal(new Set(displayed).size, displayed.length)
  assert.equal(displayed.length, 5)
  assert.ok(displayed.includes('limit')); assert.ok(!displayed.includes('outside'))
  assert.doesNotMatch(ui.text(), /Aucune date personnelle/)
  ui.render({ title: 'Décompte', views: dates, today }, 'DateGroup')
  assert.match(ui.text(), /J‑2/); assert.match(ui.text(), /J‑7/)
  ui.render({ views: [], today })
  assert.equal(ui.text().match(/Aucune date personnelle/g).length, 1)
})

test('étoile des invitations : visible seulement pour une demande reçue connue, puis disparaît', () => {
  const social = { recues: [], loading: false, error: '', offline: false }
  const ui = harness('components/PendingInvitationStar.tsx', { overrides: { './etoiles/EtoilesContext': { useEtoiles: () => social } } })
  assert.equal(ui.render(), null)
  social.recues = [{ id: 'invitation' }]
  ui.render()
  assert.equal(ui.find(node => node.props.role === 'img').props['aria-label'], '1 invitation en attente')
  for (const field of ['loading', 'error', 'offline']) {
    social[field] = field === 'error' ? 'Erreur' : true
    assert.equal(ui.render(), null)
    social[field] = field === 'error' ? '' : false
  }
  social.recues = []
  assert.equal(ui.render(), null)
})

test('messages : journal indisponible sans bandeau ni faux statut livré, erreur de liste toujours visible', async () => {
  const db = pageDatabase({ rappels: [{ id: 1, user_id: 'u1', statut: 'envoye', date_envoi: today, type_evenement: 'anniversaire', contacts: { prenom: 'Camille', nom: 'Martin' }, message: 'Bon anniversaire' }] })
  db.rpc = async () => ({ data: null, error: new Error('Journal absent') })
  const overrides = { 'next/navigation': { useRouter: () => ({ push() {} }) }, '@/lib/supabase-browser': { supabase: db }, '@/components/ContactDraftProvider': { useContactDraft: () => ({ confirm: async () => false }) } }
  const ui = harness('app/dashboard/messages-programmes/page.tsx', { overrides })
  ui.render(); await ui.flush(); ui.render()
  assert.doesNotMatch(ui.text(), /Le suivi des emails est indisponible|Réessayer/)
  const card = ui.nodes().find(node => node.props.message?.id === 1)
  assert.ok(card)
  assert.equal(card.props.message.delivery_status, undefined)
  const failed = harness('app/dashboard/messages-programmes/page.tsx', { overrides: { ...overrides, '@/lib/supabase-browser': { supabase: pageDatabase({ rappels: [] }, { failAt: 1 }) } } })
  failed.render(); await failed.flush(); failed.render()
  assert.ok(failed.nodes().some(node => node.props.message === 'Impossible de charger tes messages.' && typeof node.props.retry === 'function'))
})
