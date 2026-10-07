// 🧪 Persistance et conflits simulés ; aucune écriture distante ni génération facturée.
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPure, p2Helpers, pageDatabase } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'
const config = loadPure('lib/gift-config.ts', 'CATEGORIES_CADEAU')
const styleTools = loadPure('lib/message-styles.ts', 'styleSettings,resolveMessageStyle,styleValues', p2Helpers)
const sample = { id: 'style-A', user_id: 'A', nom: 'Chaleureux', ton: 'poetique', longueur: 'longue', adresse: 'vous', emojis: true, signature: 'Signature privée', revision: 1 }
function database() {
  const rows = { styles_messages: [], preferences_styles_messages: [], styles_messages_contacts: [], preferences_cadeaux_contacts: [] }
  let owner = 'A', lose = false, count = 0
  const db = { auth: { getUser: async () => ({ data: { user: { id: owner } } }) }, from(table) {
    let op = 'read', single = false, values, limit = 2000, key = 'id'; const filters = []
    const q = { select: () => q, eq: (k, v) => { filters.push(r => r[k] === v); return q }, gt: (k, v) => { filters.push(r => r[k] > v); return q }, order: k => { key = k; return q }, limit: n => { limit = n; return q },
      maybeSingle: () => { single = true; return q }, single: () => { single = true; return q }, insert: v => { op = 'insert'; values = v; return q }, update: v => { op = 'update'; values = v; return q }, delete: () => { op = 'delete'; return q },
      then(resolve) {
        let found = rows[table].filter(r => filters.every(f => f(r)))
        if (op === 'insert') {
          const duplicate = rows[table].some(r => r.id === values.id || (table !== 'styles_messages' && r.user_id === values.user_id && (table === 'preferences_styles_messages' || r.contact_id === values.contact_id)))
          if (duplicate) return Promise.resolve({ data: null, error: { code: '23505' } }).then(resolve)
          count++; const row = { ...values, revision: 1 }; rows[table].push(row); found = [row]
        }
        if (op === 'update') {
          if (['contact_id', 'user_id', 'id', 'created_at'].some(k => k in values)) return Promise.resolve({ data: null, error: { code: '42501' } }).then(resolve)
          found.forEach(r => Object.assign(r, values))
        }
        if (op === 'delete') rows[table] = rows[table].filter(r => !found.includes(r))
        if (lose && op !== 'read') { lose = false; return Promise.resolve({ data: null, error: { code: 'NETWORK' } }).then(resolve) }
        const sorted = found.sort((a, b) => a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0).slice(0, limit)
        return Promise.resolve({ data: single ? (sorted[0] ? { ...sorted[0] } : null) : sorted.map(r => ({ ...r })), error: null }).then(resolve)
      },
    }; return q
  } }
  const ownerTools = loadPure('lib/attention-data.ts', 'requireOwner', { supabase: db })
  const api = loadPure('lib/personal-preferences.ts', 'readStyleBook,preferenceRows,savePreference,removePreference,giftCategories', { ...p2Helpers, ...config, ...ownerTools, supabase: db })
  return { rows, db, api, setOwner: v => { owner = v }, lose: () => { lose = true }, count: () => count }
}
test('style : contact prioritaire sur défaut, temporaire prioritaire sur contact, valeurs inconnues refusées', () => {
  const contact = { ...sample, id: 'contact', longueur: 'courte', ton: 'formel' }
  const list = [sample, contact], resolve = styleTools.resolveMessageStyle
  assert.equal(resolve(list, sample.id, contact.id).tone, 'formel')
  assert.equal(resolve(list, sample.id, null).tone, 'poetique')
  assert.equal(resolve(list, sample.id, 'supprimé').tone, 'poetique')
  assert.equal(resolve(list, null, null), null)
  assert.equal(resolve(list, sample.id, contact.id, { tone: 'humoristique' }).tone, 'humoristique')
  for (const data of [{ ...sample, ton: 'unknown' }, { ...sample, longueur: 'unknown' }, { ...sample, adresse: 'unknown' }, { ...sample, emojis: 'yes' }, { ...sample, signature: 'x'.repeat(201) }]) assert.throws(() => styleTools.styleSettings(data))
})
test('styles et affectations retrouvés après remontage ; retry réseau conserve le même UUID', async () => {
  const mock = database(); mock.lose()
  await assert.rejects(mock.api.savePreference('styles_messages', 'A', sample.id, null, sample))
  await assert.rejects(mock.api.savePreference('styles_messages', 'A', sample.id, null, { ...sample, nom: 'Ne doit pas écraser' }), /création précédente a réussi/)
  await mock.api.savePreference('styles_messages', 'A', sample.id, null, sample)
  assert.equal(mock.count(), 1); assert.equal(mock.rows.styles_messages[0].nom, sample.nom)
  await mock.api.savePreference('preferences_styles_messages', 'A', 'default', null, { style_id: sample.id })
  await mock.api.savePreference('styles_messages_contacts', 'A', 'contact', null, { contact_id: 12, style_id: sample.id })
  const restored = await mock.api.readStyleBook('A')
  assert.equal(restored.styles[0].signature, 'Signature privée'); assert.equal(restored.contacts[0].contact_id, 12); assert.equal(restored.defaultPreference.style_id, sample.id)
})
test('révisions périmées et suppression concurrente refusées ; changement de compte empêche écriture et lecture', async () => {
  const mock = database(); mock.rows.styles_messages.push({ ...sample })
  await mock.api.savePreference('styles_messages', 'A', sample.id, 1, { nom: 'Nouveau' })
  await assert.rejects(mock.api.savePreference('styles_messages', 'A', sample.id, 1, { nom: 'Écrasement' }))
  await assert.rejects(mock.api.removePreference('styles_messages', 'A', sample.id, 1))
  mock.setOwner('B')
  await assert.rejects(mock.api.readStyleBook('A'), /session a changé/)
  await assert.rejects(mock.api.savePreference('styles_messages', 'A', sample.id, 2, { nom: 'Vol' }))
  assert.equal((await mock.api.readStyleBook('B')).styles.length, 0)
  await assert.rejects(mock.api.savePreference('styles_messages', 'B', sample.id, 2, { nom: 'Vol' }))
  assert.equal(mock.rows.styles_messages[0].nom, 'Nouveau')
})
test('deux créations pour le même contact : aucun écrasement implicite de sa préférence', async () => {
  const mock = database()
  await mock.api.savePreference('preferences_cadeaux_contacts', 'A', 'one', null, { contact_id: 1, categories: ['tech'] })
  await assert.rejects(mock.api.savePreference('preferences_cadeaux_contacts', 'A', 'two', null, { contact_id: 1, categories: ['loisir'] }), /préférence existe déjà/)
  assert.equal(mock.rows.preferences_cadeaux_contacts.length, 1); assert.equal(mock.rows.preferences_cadeaux_contacts[0].categories[0], 'tech')
})
test('modifier intérêts et style affecté utilise seulement les colonnes autorisées', async () => {
  const mock = database()
  await mock.api.savePreference('preferences_cadeaux_contacts', 'A', 'interests', null, { contact_id: 12, categories: ['tech'] })
  const interests = await mock.api.savePreference('preferences_cadeaux_contacts', 'A', 'interests', 1, { contact_id: 12, categories: ['loisir'] })
  assert.equal(interests.revision, 2); assert.equal(interests.contact_id, 12); assert.equal(interests.categories[0], 'loisir')
  await mock.api.savePreference('styles_messages_contacts', 'A', 'style', null, { contact_id: 12, style_id: 'one' })
  const assignment = await mock.api.savePreference('styles_messages_contacts', 'A', 'style', 1, { contact_id: 12, style_id: 'two' })
  assert.equal(assignment.style_id, 'two'); assert.equal(assignment.contact_id, 12)
})
test('un rechargement en arrière-plan ne remplace pas la révision du choix en cours de saisie', async () => {
  const mock = database(), preference = { id: 'default', user_id: 'A', style_id: 'one', revision: 1 }
  mock.rows.preferences_styles_messages.push({ ...preference })
  const h = harness('components/MessageStyles.tsx', { overrides: { '@/lib/personal-preferences': mock.api, '@/lib/supabase-browser': { supabase: mock.db } } })
  const props = { owner: 'A', styles: [{ ...sample, id: 'one' }, { ...sample, id: 'two' }], preference, onSaved() {} }
  h.render(props, 'StyleAssignmentEditor')
  mock.rows.preferences_styles_messages[0].revision = 2
  h.render({ ...props, preference: { ...preference, revision: 2 } }, 'StyleAssignmentEditor')
  const form = h.find(n => typeof n.props.save === 'function')
  await assert.rejects(form.props.save({ get: () => 'two' }))
  assert.equal(mock.rows.preferences_styles_messages[0].style_id, 'one')
})
test('catégories explicites fermées, privées et reprises depuis la préférence enregistrée', async () => {
  const mock = database()
  for (const invalid of [['secret'], ['tech', 'tech'], [null]]) assert.throws(() => mock.api.giftCategories(invalid))
  assert.equal(mock.api.giftCategories([]).length, 0)
  await mock.api.savePreference('preferences_cadeaux_contacts', 'A', 'interests', null, { contact_id: 1, categories: ['tech'] })
  assert.equal((await mock.api.preferenceRows('preferences_cadeaux_contacts', 'A'))[0].categories[0], 'tech')
})
test('export 6 : styles, affectations et intérêts du propriétaire uniquement, arrêt sur panne', async () => {
  const tables = ['styles_messages', 'preferences_styles_messages', 'styles_messages_contacts', 'preferences_cadeaux_contacts']
  const data = Object.fromEntries(tables.map(table => [table, [{ id: 'a', user_id: 'A', signature: 'PRIVATE_A' }, { id: 'b', user_id: 'B', signature: 'PRIVATE_B' }]]))
  const db = pageDatabase(data); db.auth = { getUser: async () => ({ data: { user: { id: 'A' } } }) }
  const api = loadPure('lib/user-data.ts', 'exportOwnData,readOwnRows', { ...p2Helpers, supabase: db })
  const exported = await api.exportOwnData(); assert.equal(exported.version, 6)
  for (const table of tables) assert.equal(exported[table].length, 1)
  assert.doesNotMatch(JSON.stringify(exported), /PRIVATE_B/)
  const failed = pageDatabase(data, { failAt: 1 }); failed.auth = db.auth
  await assert.rejects(loadPure('lib/user-data.ts', 'exportOwnData,readOwnRows', { ...p2Helpers, supabase: failed }).exportOwnData(), /Aucun export partiel/)
})
test('suggestions : catégories enregistrées reprises, temporaire sans sauvegarde ni transmission IA', async () => {
  const db = pageDatabase({ contacts: [{ id: 1, user_id: 'u1', prenom: 'Léa', relation: 'ami' }], preferences_cadeaux_contacts: [{ id: 'p', user_id: 'u1', contact_id: 1, revision: 1, categories: ['tech'] }] })
  db.auth = { getUser: async () => ({ data: { user: { id: 'u1' } } }), getSession: async () => ({ data: { session: { user: { id: 'u1' }, access_token: 'mock' } } }) }
  const bodies = [], h = harness('components/GiftSuggestions.tsx', { overrides: { '@/lib/supabase-browser': { supabase: db }, '@/components/ContactDraftProvider': { useContactDraft: () => ({ hasPrivateDraft: () => false }) } }, globals: { fetch: async (url, init) => { bodies.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ ideas: [{ idee: 'Livre', raison: 'Lecture', categorie: 'loisir', recherche: 'livre' }] }) } } } })
  h.render({ initialContactId: '1' }); await h.flush(); h.render({ initialContactId: '1' })
  const checks = h.nodes().filter(n => n.type === 'input' && n.props.type === 'checkbox')
  assert.equal(checks[2].props.checked, true)
  checks[0].props.onChange({ target: { checked: true } }); h.render({ initialContactId: '1' })
  await h.find(n => n.type === 'button' && h.text(n).includes('Trouver des idées')).props.onClick(); await h.flush(); h.render({ initialContactId: '1' })
  assert.equal(bodies.length, 1); assert.doesNotMatch(JSON.stringify(bodies), /categories|interests|Léa|loisir|tech/)
  assert.equal(h.nodes().filter(n => n.type === 'input' && n.props.type === 'checkbox')[0].props.checked, true)
})
