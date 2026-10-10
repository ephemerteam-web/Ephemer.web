import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash, createECDH } from 'node:crypto'
import { loadPure, p2Helpers, pageDatabase } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'

const digest = loadPure('lib/daily-digest.ts', 'dailyEvents,digestPayload,safePushSubscription,dispatchDaily', { URL })
const images = loadPure('lib/share-image.ts', 'defaultImageFields,selectedImageFields,imagePageCuts')
const projections = loadPure('lib/image-projections.ts', 'contactImageFields,eventImageFields,ownUniversImageFields')
const navigation = loadPure('lib/legacy-navigation.ts', 'legacyDestination')

test('push : uniquement J0 actif, déductions non confirmées, annulations et archives exclues', () => {
  const day = '2026-10-10', base = { key: 'a', date: day, reminder: true, title: 'NOM PRIVE', event: null, occurrence: null }
  const views = [base, base, { ...base, key: 'future', date: '2026-10-11' }, { ...base, key: 'feast', reminder: false },
    { ...base, key: 'cancelled', occurrence: { annulee: true } }, { ...base, key: 'archived', event: { archive: true, rappels_actifs: true } },
    { ...base, key: 'reconfirm', event: { choix_a_reconfirmer: true, rappels_actifs: true } }, { ...base, key: 'off', event: { rappels_actifs: false } }]
  assert.equal(digest.dailyEvents(views, day).length, 1)
  const payload = digest.digestPayload(1, [], day)
  assert.doesNotMatch(JSON.stringify(payload), /NOM PRIVE/)
  assert.equal(payload.url, '/dashboard/notifications?vue=jour')
  assert.equal(digest.digestPayload(0, [], day), null)
  assert.match(digest.digestPayload(0, ['Saint Michel'], day).body, /Saint Michel/)
})

test('push : deux crons concurrents, résultat incertain et journal en panne ne provoquent jamais un second envoi', async () => {
  let claimed = false, sends = 0
  const claim = async () => { if (claimed) return false; claimed = true; return true }
  const send = async () => { sends++; throw new Error('Réponse perdue après acceptation') }
  const results = await Promise.allSettled([digest.dispatchDaily({}, claim, send), digest.dispatchDaily({}, claim, send)])
  assert.equal(sends, 1); assert.equal(results.filter(result => result.status === 'rejected').length, 1)
  assert.equal(await digest.dispatchDaily({}, claim, send), false)
  await assert.rejects(digest.dispatchDaily({}, async () => { throw new Error('Journal absent') }, send))
  assert.equal(sends, 1)
  assert.equal(await digest.dispatchDaily(null, async () => { throw new Error('Ne doit pas réserver') }, send), false)
})

test('push : endpoints locaux, hôtes trompeurs, HTTP, ports et clés invalides refusés avant réseau', () => {
  const value = { endpoint: 'https://fcm.googleapis.com/fcm/send/fiction', keys: { p256dh: 'A'.repeat(87), auth: 'A'.repeat(22) } }
  assert.equal(digest.safePushSubscription(value).saints, false)
  assert.equal(digest.safePushSubscription({ ...value, ephemer: { saints: true } }).saints, true)
  for (const endpoint of ['https://127.0.0.1/', 'http://fcm.googleapis.com/', 'https://fcm.googleapis.com.evil.invalid/', 'https://fcm.googleapis.com:444/', 'https://user@fcm.googleapis.com/', 'https://example.invalid/']) assert.equal(digest.safePushSubscription({ ...value, endpoint }), null)
  assert.equal(digest.safePushSubscription({ ...value, keys: { auth: 'bad', p256dh: 'bad' } }), null)
})

test('images : aperçu par sélection, coordonnées, année, notes et montants exclus par défaut', () => {
  const contact = { prenom: 'Léa', nom: 'Martin', date_naissance: '1990-10-10', email: 'SECRET_MAIL', telephone_numero: 'SECRET_PHONE', note: 'SECRET_NOTE', user_id: 'SECRET_OWNER', invitation_id: 'SECRET_TOKEN' }
  const fields = projections.contactImageFields(contact)
  const selected = images.selectedImageFields(fields, images.defaultImageFields(fields))
  assert.doesNotMatch(JSON.stringify(selected), /SECRET|1990/)
  assert.match(JSON.stringify(selected), /10\/10|Léa/)
  assert.match(JSON.stringify(images.selectedImageFields(fields, ['email'])), /SECRET_MAIL/)
  assert.doesNotMatch(JSON.stringify(fields), /SECRET_OWNER|SECRET_TOKEN/)
  const event = projections.eventImageFields({ date: '2026-10-10', age: 36, contact })
  assert.doesNotMatch(JSON.stringify(images.selectedImageFields(event, images.defaultImageFields(event))), /36 ans|SECRET/)
  const budget = [{ id: 'amount', label: 'Dépensé', value: '99 EUR', sensitive: true }]
  assert.equal(images.defaultImageFields(budget).length, 0)
})

test('images longues : 1280 px de large, pages bornées, aucune ligne ni illustration coupée', () => {
  const intervals = Array.from({ length: 400 }, (_, i) => ({ top: i*25+10, bottom: i*25+32 }))
  const pages = images.imagePageCuts(10050, intervals)
  assert.ok(pages.length > 1); assert.equal(pages.reduce((sum, page) => sum+page.height, 0), 10050)
  for (const page of pages) {
    assert.ok(page.height <= 2048)
    const end = page.top + page.height
    if (end < 10050) assert.ok(!intervals.some(line => line.top < end && line.bottom > end))
  }
  assert.throws(() => images.imagePageCuts(6000, [{ top: 0, bottom: 5000 }]), /trop haute/)
})

test('navigation : anciennes URL conservées et contexte social/occurrence intact', () => {
  for (const [source, destination] of [['month', '/dashboard/calendrier'], ['gifts', '/dashboard/idees']]) {
    const url = new URL(navigation.legacyDestination(source, { contactId: '7', etoileId: 'etoile', occurrenceId: 'occurrence', eventType: 'mariage', tag: ['a', 'b'] }), 'https://test.invalid')
    assert.equal(url.pathname, destination); assert.equal(url.searchParams.get('contactId'), '7'); assert.equal(url.searchParams.get('etoileId'), 'etoile')
    assert.equal(url.searchParams.get('occurrenceId'), 'occurrence'); assert.equal(url.searchParams.get('eventType'), 'mariage')
    assert.equal(url.searchParams.get('vue'), source === 'gifts' ? 'suggestions' : 'agenda')
    assert.equal(url.searchParams.getAll('tag').join(), 'a,b')
  }
})

test('push : statut refusé sans session, aucun contrôle du journal avant authentification', async () => {
  let auth = 0, checked = 0
  const ui = harness('app/api/push/status/route.ts', { overrides: {
    '@/lib/supabase-admin': { supabaseAdmin: { auth: { getUser: async () => { auth++; return { data: { user: null }, error: null } } } } },
    '@/lib/daily-push': { pushReady: async () => { checked++; return true } },
  } })
  assert.equal((await ui.component.GET(new Request('https://test.invalid/api/push/status'))).status, 401)
  assert.equal(auth, 0)
  assert.equal((await ui.component.GET(new Request('https://test.invalid/api/push/status', { headers: { authorization: 'Bearer invalid' } }))).status, 401)
  assert.equal(auth, 1); assert.equal(checked, 0)
})

test('images : propre univers exportable, aucun bouton dans le rendu univers tiers', () => {
  const fields = projections.ownUniversImageFields({ identite: 'Moi', valeurs: { presentation: 'Bonjour', anniversaire: { jour: 10, mois: 10, annee: 1990 }, email: 'SECRET_EMAIL', telephone: 'SECRET_PHONE' } })
  assert.doesNotMatch(JSON.stringify(images.selectedImageFields(fields, images.defaultImageFields(fields))), /SECRET|1990/)
  const view = readFileSync(new URL('../components/univers/UniversView.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(view, /ShareImageButton/)
})

test('push serveur : configuration fermée, isolation du compte, doublons et journal obligatoire', async () => {
  const key = createECDH('prime256v1'); key.generateKeys()
  const env = { EPHEMER_DAILY_PUSH_ENABLED: 'true', NEXT_PUBLIC_VAPID_PUBLIC_KEY: key.getPublicKey().toString('base64url'), VAPID_PRIVATE_KEY: key.getPrivateKey().toString('base64url'), VAPID_SUBJECT: 'mailto:test@example.invalid' }
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/fiction', keys: { p256dh: 'A'.repeat(87), auth: 'A'.repeat(22) } }
  let sent = 0, claims = 0, failJournal = false
  const receipts = new Set(), db = pageDatabase({ user_push_subscriptions: [
    { id: '1', user_id: 'owner', subscription }, { id: '2', user_id: 'owner', subscription },
    { id: '3', user_id: 'other', subscription: { ...subscription, endpoint: subscription.endpoint + '-other' } },
  ] })
  db.rpc = async (name, args) => {
    claims++; if (failJournal) return { error: new Error('Absent'), data: null }
    const receipt = [args.p_user_id, args.p_device_key, args.p_day].join('/')
    const claimed = !receipts.has(receipt); receipts.add(receipt); return { data: claimed, error: null }
  }
  const journal = loadPure('lib/daily-push-journal.ts', 'dailyPushRpc')
  const server = loadPure('lib/daily-push.ts', 'sendDailyPush,pushConfigured,pushReady', {
    ...digest, ...journal, Buffer, createHash, createECDH, process: { env }, supabaseAdmin: db, readAllRows: p2Helpers.readAllRows,
    SAINTS_PAR_DATE: new Map(), eventViews: () => [{ key: 'today', date: '2026-10-10', reminder: true }],
    webpush: { sendNotification: async (device, payload) => { sent++; assert.equal(device.endpoint, subscription.endpoint); assert.doesNotMatch(payload, /other|owner|p256dh/) } },
  })
  env.EPHEMER_DAILY_PUSH_ENABLED = 'false'
  assert.equal(await server.sendDailyPush('owner', {}, '2026-10-10', true), 0); assert.equal(claims, 0)
  env.EPHEMER_DAILY_PUSH_ENABLED = 'true'
  assert.equal(await server.sendDailyPush('owner', {}, '2026-10-10', false), 0)
  assert.equal(await server.sendDailyPush('owner', {}, '2026-10-10', true), 1)
  assert.equal(await server.sendDailyPush('owner', {}, '2026-10-10', true), 0); assert.equal(sent, 1)
  failJournal = true
  await assert.rejects(server.sendDailyPush('owner', {}, '2026-10-10', true)); assert.equal(sent, 1)
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'mismatched'
  assert.equal(server.pushConfigured(), false)
})

test('accueil : anniversaire d’un contact non favori visible, rangée favoris indépendante', () => {
  const contact = { id: 1, prenom: 'NON_FAVORI_VISIBLE', nom: 'Martin', date_naissance: '1990-10-10', est_favori: false }
  const ui = harness('app/dashboard/page.tsx', { overrides: {
    'next/navigation': { useRouter: () => ({ push() {} }) },
    '@/lib/supabase-browser': { supabase: {} },
    '@/lib/calendar-day': { ...p2Helpers, parisDay: () => '2026-10-10' },
    '@/lib/hooks/useContacts': { useContacts: () => ({ contacts: [contact], loading: false, error: '', retry() {} }) },
    '@/lib/hooks/usePrivateLists': { usePrivateLists: () => ({ filter: rows => rows, selected: null, loading: false, error: '', retry() {} }) },
    '@/lib/hooks/usePersonalEvents': { usePersonalEvents: () => ({ views: [{ key: 'birthday', kind: 'anniversaire', contact, date: '2026-10-10' }], loading: false, error: '', retry() {} }) },
  } })
  ui.render()
  const dates = ui.nodes().find(node => node.type.name === 'HomeDates')
  assert.equal(dates.props.views[0].contact.prenom, 'NON_FAVORI_VISIBLE')
  const favorites = ui.nodes().find(node => node.props.favoris)
  assert.equal(favorites.props.favoris.length, 0)
})
