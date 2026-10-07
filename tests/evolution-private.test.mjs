import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPure, pageDatabase, p2Helpers as h } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'

const contact = { id: 1, user_id: 'A', prenom: 'SansSaintXYZ', nom: 'Test', date_naissance: null }
const event = { id: 'e1', user_id: 'A', contact_id: 1, type_evenement: 'anniversaire', titre: 'Anniversaire', recurrence: 'annuelle', visible: true, rappels_actifs: true, archive: false, choix_a_reconfirmer: false, arrete_apres_cycle: null }
const rule = { id: 'r1', user_id: 'A', evenement_id: 'e1', jour: 29, mois: 2, annee_naissance: null, debut_cycle: 1, fin_cycle: null, retiree: false }
const occurrence = { id: 'o1', user_id: 'A', evenement_id: 'e1', regle_id: 'r1', cycle: 2027, date_occurrence: '2027-03-01', titre_historique: 'Anniversaire', annulee: false, date_exception: false, revision: 1 }
const fixture = () => ({ contacts: [{ ...contact }], events: [{ ...event }], rules: [{ ...rule }], occurrences: [{ ...occurrence }] })

test('naissance partielle : même occurrence unique, âge absent et règle du 29 février entre années', () => {
  const data = fixture(); data.occurrences.push({ ...occurrence })
  const views = h.eventViews(data, '2027-01-01', '2027-12-31')
  assert.equal(views.length, 1); assert.equal(views[0].age, null); assert.equal(views[0].date, '2027-03-01')
  assert.equal(h.previewEventViews(data, '2028-01-01', '2028-12-31')[0].date, '2028-02-29')
  data.rules[0].annee_naissance = 2000
  assert.equal(h.eventViews(data, '2027-01-01', '2027-12-31')[0].age, 27)
  assert.equal(contact.date_naissance, null)
})

test('ponctuel non reconduit ; historique conservé après changement de règle, exceptions et arrêt de série', () => {
  const data = fixture()
  data.events[0].recurrence = 'ponctuelle'; data.events[0].type_evenement = 'rencontre'
  data.rules[0] = { ...rule, debut_cycle: 0, jour: null, mois: null, date_ponctuelle: '2027-03-01' }
  data.occurrences[0].cycle = 0
  assert.equal(h.previewEventViews(data, '2028-01-01', '2028-12-31').length, 0)
  const annual = fixture()
  annual.rules.push({ ...rule, id: 'r2', debut_cycle: 2028, jour: 10, mois: 4 })
  annual.rules[0].fin_cycle = 2027
  annual.occurrences[0].date_exception = true; annual.occurrences[0].date_occurrence = '2027-04-03'
  assert.equal(h.eventViews(annual, '2027-01-01', '2027-12-31')[0].date, '2027-04-03')
  assert.equal(h.previewEventViews(annual, '2028-01-01', '2028-12-31')[0].date, '2028-04-10')
  annual.events[0].arrete_apres_cycle = 2027
  assert.equal(h.previewEventViews(annual, '2028-01-01', '2028-12-31').length, 0)
  assert.equal(annual.occurrences.length, 1)
})

test('aucun repli historique pour une date archivée, masquée ou une fête à reconfirmer', () => {
  for (const flag of ['archive', 'choix_a_reconfirmer']) {
    const data = fixture(); data.contacts[0].date_naissance = '2000-02-29'; data.events[0][flag] = true
    assert.equal(h.eventViews(data, '2027-01-01', '2027-12-31').length, 0)
  }
  const hidden = fixture(); hidden.events[0].visible = false
  assert.equal(h.eventViews(hidden, '2027-01-01', '2027-12-31').length, 0)
  assert.equal(h.eventViews(hidden, '2027-01-01', '2027-12-31', true).length, 1)
})

test('rappels : occurrence/révision communs ; suspension et changement de date écartent un ancien récapitulatif', () => {
  const data = fixture(), today = '2027-02-28', views = h.eventViews(data, today, '2027-03-01', true)
  const rows = h.occurrenceNotifications('A', views, { rappel_j7: false, rappel_j3: false, rappel_j1: true, rappel_jourj: false }, today).map((row, i) => ({ ...row, id: String(i) }))
  assert.equal(rows.length, 1); assert.equal(rows[0].occurrence_id, 'o1'); assert.equal(rows[0].occurrence_revision, 1)
  assert.equal(h.occurrenceNotifications('B', views, null, today).length, 0)
  assert.equal(h.occurrenceRecap(rows, views, { rappel_j1: true }, today).length, 1)
  data.occurrences[0].revision++
  assert.equal(h.occurrenceRecap(rows, h.eventViews(data, today, '2027-03-01'), { rappel_j1: true }, today).length, 0)
  data.events[0].rappels_actifs = false
  assert.equal(h.occurrenceNotifications('A', h.eventViews(data, today, '2027-03-01'), null, today).length, 0)
})

test('lecture paginée des dates et listes au-delà de 200 lignes, aucun résultat partiel en panne', async () => {
  const members = Array.from({ length: 245 }, (_, i) => ({ id: String(i).padStart(4, '0'), user_id: 'A', liste_id: 'l1', contact_id: i }))
  const tables = { listes_personnelles: [{ id: 'l1', user_id: 'A', nom: 'Famille' }], appartenances_listes: members }
  const result = await h.readPrivateLists(pageDatabase(tables, { cap: 37 }), 'A')
  assert.equal(result.memberships.length, 245)
  await assert.rejects(h.readPrivateLists(pageDatabase(tables, { cap: 37, failAt: 3 }), 'A'))
  const data = fixture(); const occurrences = Array.from({ length: 245 }, (_, i) => ({ ...occurrence, id: String(i).padStart(4, '0') }))
  const db = pageDatabase({ contacts: data.contacts, evenements_personnels: data.events, regles_evenements: data.rules, occurrences_evenements: occurrences }, { cap: 37 })
  db.rpc = () => pageDatabase({ rows: occurrences }, { cap: 37 }).from('rows')
  assert.equal((await h.readEventData(db, 'A', '2027-01-01', '2027-12-31')).occurrences.length, 245)
})

test('listes multiples et vides : intersection conservant les fiches originales', () => {
  const contacts = [{ id: 1 }, { id: 2 }], memberships = [{ liste_id: 'l1', contact_id: 1 }, { liste_id: 'l2', contact_id: 1 }, { liste_id: 'l2', contact_id: 2 }]
  assert.equal(h.contactsInList(contacts, 'l1', memberships)[0], contacts[0])
  assert.equal(h.contactsInList(contacts, 'l2', memberships).length, 2)
  assert.equal(h.contactsInList(contacts, 'vide', memberships).length, 0)
  assert.equal(h.contactsInList(contacts, '', memberships), contacts)
})

test('renommage concurrent non écrasé et insertion concurrente reconnue seulement après relecture du propriétaire', async () => {
  const lists = [{ id: 'l1', user_id: 'A', nom: 'Nouveau nom concurrent' }]
  await assert.rejects(h.renameList(pageDatabase({ listes_personnelles: lists }), 'A', { id: 'l1', nom: 'Ancien' }, 'Mon choix'), /changé ailleurs/)
  assert.equal(lists[0].nom, 'Nouveau nom concurrent')
  const db = pageDatabase({ appartenances_listes: [{ id: 'm1', user_id: 'A', liste_id: 'l1', contact_id: 1 }] })
  const duplicate = { ...db, from: table => { const q = db.from(table); q.insert = () => Promise.resolve({ error: { code: '23505' } }); return q } }
  await h.changeMembership(duplicate, 'A', 'l1', 1, true)
  await assert.rejects(h.changeMembership(duplicate, 'B', 'l1', 1, true))
})

test('API liste : 401, UUID invalide 400, absente/inaccessible même 404, vide 200 et filtre propriétaire', async () => {
  const list = '00000000-0000-4000-8000-000000000001'
  const db = pageDatabase({ listes_personnelles: [{ id: list, user_id: 'A' }], appartenances_listes: [] })
  db.auth = { getUser: async () => ({ data: { user: { id: 'A' } } }) }
  let reads = 0
  const ctx = { ...h, supabaseAdmin: db, readEventData: async () => { reads++; return fixture() }, NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } }
  const { GET } = loadPure('app/api/evenements-mois/route.ts', 'GET', ctx)
  const req = (value, auth = true) => ({ headers: new Headers(auth ? { authorization: 'Bearer test' } : {}), nextUrl: new URL(`https://test.invalid/?mois=2&annee=2027&liste=${value}`) })
  assert.equal((await GET(req(list, false))).status, 401)
  assert.equal((await GET(req('invalide'))).status, 400)
  assert.equal((await GET(req('00000000-0000-4000-8000-000000000002'))).status, 404)
  assert.equal((await GET(req(list))).body.evenements.length, 0); assert.equal(reads, 0)
  db.auth.getUser = async () => ({ data: { user: { id: 'B' } } })
  assert.equal((await GET(req(list))).status, 404)
})

test('listes : réponse ancienne ignorée après changement de compte, choix privé réinitialisé', async () => {
  let resolve, owner = 'A'
  const pending = new Promise(done => { resolve = done })
  const screen = harness('lib/hooks/usePrivateLists.ts', { overrides: {
    '@/components/DashboardUserContext': { useDashboardUser: () => ({ id: owner }) },
    '../supabase-browser': { supabase: {} },
    '../private-lists': { contactsInList: h.contactsInList, readPrivateLists: async (_client, id) => id === 'A' ? pending : { lists: [], memberships: [] } },
  } })
  screen.render({}, 'usePrivateLists'); await screen.flush()
  owner = 'B'; screen.render({}, 'usePrivateLists'); await screen.flush()
  resolve({ lists: [{ id: 'l1', user_id: 'A' }], memberships: [] }); await screen.flush()
  const result = screen.render({}, 'usePrivateLists')
  assert.equal(result.owner, 'B'); assert.equal(result.lists.length, 0); assert.equal(result.selected, '')
})

test('alerte d’une ancienne date : rattachement de la notification en attente, historique accepté inchangé', async () => {
  const row = h.occurrenceNotifications('A', h.eventViews(fixture(), '2027-02-28', '2027-03-01'), { rappel_j1: true }, '2027-02-28').find(row => row.jours_restants === 1)
  const tables = { notifications: [{ ...row, id: 'n1', occurrence_id: null, occurrence_revision: null, email_envoye: false }] }
  const db = pageDatabase(tables)
  db.from = ((from) => table => { const q = from(table); q.insert = () => Promise.resolve({ error: { code: '23505' } }); return q })(db.from)
  await h.persistOccurrenceNotification(db, row)
  assert.equal(tables.notifications[0].occurrence_id, 'o1'); assert.equal(tables.notifications[0].occurrence_revision, 1)
  tables.notifications[0].email_envoye = true
  const before = structuredClone(tables.notifications[0])
  await h.persistOccurrenceNotification(db, { ...row, occurrence_revision: 2, message: 'Date modifiée' })
  assert.deepEqual(tables.notifications[0], before)
})

test('rappel lié : vérification propriétaire, révision et suspension avant tout transport', async () => {
  const data = fixture()
  const db = pageDatabase({ evenements_personnels: data.events, occurrences_evenements: data.occurrences })
  const reminder = { user_id: 'A', contact_id: 1, occurrence_id: 'o1', occurrence_revision: 1, event_date: '2027-03-01' }
  assert.equal(await h.rappelOccurrenceCurrent(db, reminder), true)
  assert.equal(await h.rappelOccurrenceCurrent(db, { ...reminder, user_id: 'B' }), false)
  assert.equal(await h.rappelOccurrenceCurrent(db, { ...reminder, occurrence_revision: 2 }), false)
  data.events[0].rappels_actifs = false
  assert.equal(await h.rappelOccurrenceCurrent(db, reminder), false)
})

test('formulaire naissance partielle : année NULL, saisie conservée en échec, même UUID à la reprise', async () => {
  const calls = []; let fail = true
  const db = { auth: { getUser: async () => ({ data: { user: { id: 'A' } } }) },
    from() { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { prenom: 'Zoé' }, error: null }) }; return q },
    rpc: async (_name, args) => { calls.push(args.p_donnees); return { error: fail ? new Error('Simulation') : null, data: null } } }
  const screen = harness('components/PersonalDates.tsx', { overrides: {
    './DashboardUserContext': { useDashboardUser: () => ({ id: 'A', prenom: 'Zoé' }) },
    './Modal': { default: 'dialog' }, '@/lib/supabase-browser': { supabase: db },
    '@/lib/hooks/usePersonalEvents': { usePersonalEvents: () => ({ loading: false, error: '', views: [], data: fixture(), retry() {} }) },
  } })
  screen.render({ contacts: [contact] }); screen.find(node => node.type === 'button' && screen.text(node).includes('Gérer')).props.onClick(); screen.render({ contacts: [contact] })
  screen.find(node => node.type === 'select' && node.props.value === '').props.onChange({ target: { value: '1' } })
  screen.find(node => node.type === 'input' && node.props.maxLength === 120).props.onChange({ target: { value: 'Anniversaire de Zoé' } })
  screen.find(node => node.type === 'input' && node.props.max === 31).props.onChange({ target: { value: '29' } })
  screen.find(node => node.type === 'input' && node.props.max === 12).props.onChange({ target: { value: '2' } })
  screen.render({ contacts: [contact] }); screen.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await screen.flush(); screen.render({ contacts: [contact] })
  assert.equal(calls[0].annee_naissance, null); assert.equal(calls[0].jour, 29); assert.equal(calls[0].mois, 2)
  assert.equal(screen.find(node => node.type === 'input' && node.props.maxLength === 120).props.value, 'Anniversaire de Zoé')
  assert.match(screen.text(), /Enregistrement refusé/)
  fail = false; screen.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await screen.flush(); screen.render({ contacts: [contact] })
  assert.equal(calls[0].id, calls[1].id)
  assert.match(screen.text(), /Date enregistrée/)
})

test('listes : erreur de lecture explicite, aucun résultat partiel présenté comme complet', async () => {
  const screen = harness('lib/hooks/usePrivateLists.ts', { overrides: {
    '../supabase-browser': { supabase: {} }, '../private-lists': { contactsInList: h.contactsInList, readPrivateLists: async () => { throw new Error('Réseau') } },
  } })
  screen.render({}, 'usePrivateLists'); await screen.flush()
  const result = screen.render({}, 'usePrivateLists')
  assert.ok(result.error); assert.equal(result.lists.length, 0); assert.equal(result.memberships.length, 0)
})

test('fête choisie retrouvée après réouverture et aucun RPC exécuté dans une simulation', async () => {
  const data = fixture(); data.events[0].type_evenement = 'fete_prenomale'; data.rules[0].mois = 6; data.rules[0].jour = 22
  data.occurrences[0].date_occurrence = '2027-06-22'
  const db = pageDatabase({ contacts: data.contacts, evenements_personnels: data.events, regles_evenements: data.rules, occurrences_evenements: data.occurrences })
  db.rpc = () => { throw new Error('Écriture interdite') }
  for (let i = 0; i < 2; i++) {
    const read = await h.readEventData(db, 'A', '2027-01-01', '2027-12-31', true, false)
    assert.equal(h.previewEventViews(read, '2027-01-01', '2027-12-31')[0].date, '2027-06-22')
  }
})

test('export version 6 : tous les ensembles nouveaux, propriétaire unique et arrêt si la session change', async () => {
  const db = pageDatabase({ listes_personnelles: [{ id: 'l1', user_id: 'A' }, { id: 'l2', user_id: 'B' }], evenements_personnels: [event] })
  let identity = 'A'; db.auth = { getUser: async () => ({ data: { user: { id: identity } } }) }
  const { exportOwnData } = loadPure('lib/user-data.ts', 'exportOwnData', { ...h, supabase: db })
  const result = await exportOwnData()
  assert.equal(result.version, 6); assert.equal(result.listes_personnelles.length, 1)
  for (const key of ['appartenances_listes', 'evenements_personnels', 'regles_evenements', 'occurrences_evenements']) assert.ok(Array.isArray(result[key]))
  let calls = 0; db.auth.getUser = async () => ({ data: { user: { id: ++calls === 1 ? 'A' : 'B' } } })
  await assert.rejects(exportOwnData(), /session a changé/)
})
