// Contrat, RLS simulée, concurrence et composant réels : aucun fournisseur appelé.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { harness } from './ui-harness.mjs'
import { pageDatabase, p2Helpers } from './p2-helpers.mjs'

const style = readFileSync(new URL('../assets/avatars/selfie-style-v1.jpg', import.meta.url))
const image = 'data:image/jpeg;base64,' + style.toString('base64')
function load(path, names, deps = {}) {
  const code = stripTypeScriptTypes(readFileSync(new URL('../' + path, import.meta.url), 'utf8')).replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '').replace(/^export /gm, '')
  return runInNewContext(code + `\n;({${names}})`, { Error, DOMException, AbortSignal, Uint8Array, DataView, atob, ...deps })
}
const contract = load('lib/selfie-avatar-contract.ts', 'rasterInfo,SelfieAvatarError,SELFIE_PROMPT_VERSION')
const portraits = load('lib/portrait-avatar.ts', 'portraitAvatar,PORTRAIT_MAX_BYTES', contract)
const portrait = revision => ({ image, promptVersion: 'celeste-cartoon-v1', revision })
const config = harness('lib/avatar-collection-v3.ts').component.DEFAULT_AVATAR_V3
const row = (revision = 1, portrait_ia = null) => ({ user_id: 'A', configuration: config, revision, portrait_ia })
const copy = value => JSON.parse(JSON.stringify(value))
function db({ initial = null, error = null, lost = false, ownerChange = Infinity, beforeWrite = () => {} } = {}) {
  let current = initial, checks = 0, writes = 0
  const supabase = { from(table) {
    assert.equal(table, 'avatars_utilisateurs')
    let values, insertion = false; const filters = []
    const query = {
      select: () => query, eq: (key, value) => { filters.push([key, value]); return query }, abortSignal: () => query,
      update: value => { values = value; return query }, insert: value => { insertion = true; values = value; return query }, maybeSingle: () => query,
      then(resolve) {
        if (!values) return Promise.resolve({ data: copy(current), error: null }).then(resolve)
        writes++; beforeWrite()
        if (error) return Promise.resolve({ data: null, error }).then(resolve)
        if (!insertion && !filters.every(([key, value]) => current?.[key] === value)) return Promise.resolve({ data: null, error: null }).then(resolve)
        current = insertion ? { ...row(), ...values } : { ...current, ...values }
        return Promise.resolve({ data: lost ? null : copy(current), error: lost ? { code: 'FETCH' } : null }).then(resolve)
      },
    }; return query
  } }
  const data = load('lib/avatar-data.ts', 'loadAvatar,savePortraitAvatar', {
    ...portraits, supabase, requireOwner: async owner => { assert.equal(owner, 'A'); if (++checks >= ownerChange) throw new Error('Session expirée.') },
    avatarConfigV3: value => value, DEFAULT_AVATAR_V3: config,
  })
  return { data, current: () => current, writes: () => writes }
}

test('portrait privé : JPEG 500 px borné, version et révision fermées ; ni URL externe ni SVG', () => {
  assert.equal(portraits.portraitAvatar(portrait(1), 1).image, image)
  assert.equal(portraits.portraitAvatar(null, 1), null)
  for (const invalid of [{ ...portrait(1), revision: 2 }, { ...portrait(1), promptVersion: 'autre' }, { ...portrait(1), url: 'https://example.invalid' }, { ...portrait(1), image: 'data:image/svg+xml;base64,PHN2Zy8+' }, { ...portrait(1), image: image.slice(0, -5) }, { ...portrait(1), image: image + 'a'.repeat(180000) }, []]) assert.throws(() => portraits.portraitAvatar(invalid, 1))
})

test('portrait : premier enregistrement et remplacement atomique de la même ligne privée', async () => {
  const h = db(), signal = new AbortController().signal
  const first = await h.data.savePortraitAvatar('A', null, portrait(1), signal)
  assert.equal(first.user_id, 'A'); assert.equal(first.revision, 1); assert.equal(h.writes(), 1)
  await h.data.savePortraitAvatar('A', 1, portrait(2), signal)
  assert.equal(h.current().revision, 2); assert.equal(h.current().portrait_ia.image, image)
  assert.deepEqual(h.current().configuration, config)
})

test('portrait : révision concurrente refusée, réponse perdue reconnue sans réécriture', async () => {
  const conflict = db({ initial: row(2) })
  await assert.rejects(conflict.data.savePortraitAvatar('A', 1, portrait(2), new AbortController().signal), /a changé/)
  assert.equal(conflict.writes(), 0)
  const h = db({ initial: row(), lost: true }), signal = new AbortController().signal
  await h.data.savePortraitAvatar('A', 1, portrait(2), signal)
  await h.data.savePortraitAvatar('A', 1, portrait(2), signal)
  assert.equal(h.writes(), 1)
})

test('portrait : colonne absente, session perdue et interruption n’annoncent aucun succès', async () => {
  const missing = db({ initial: row(), error: { code: 'PGRST204' } })
  await assert.rejects(missing.data.savePortraitAvatar('A', 1, portrait(2), new AbortController().signal), /script Avatar IA/)
  const changed = db({ initial: row(), ownerChange: 3 })
  await assert.rejects(changed.data.savePortraitAvatar('A', 1, portrait(2), new AbortController().signal), /Session/)
  assert.equal(changed.writes(), 0)
  const controller = new AbortController(); controller.abort()
  const stopped = db()
  await assert.rejects(stopped.data.savePortraitAvatar('A', null, portrait(1), controller.signal), /abort/i)
  assert.equal(stopped.writes(), 0)
})

test('portrait : changement de compte après écriture interdit de reprendre le résultat', async () => {
  const h = db({ initial: row(), ownerChange: 4 })
  await assert.rejects(h.data.savePortraitAvatar('A', 1, portrait(2), new AbortController().signal), /Session/)
  assert.equal(h.writes(), 1)
})

test('portrait partagé : lecture après reconnexion, badge IA et retour personnalisable', async () => {
  const h = harness('components/avatars/DashboardAvatarContext.tsx', { overrides: { '@/lib/avatar-data': { loadAvatar: async () => row(1, portrait(1)) } }, globals: { atob, Uint8Array, DataView } })
  const render = () => h.render({ ownerId: 'A', children: 'Profil' }, 'AccountAvatar')
  render(); await h.flush(); render()
  const state = () => h.find(n => n.props.value?.updateAvatar).props.value
  assert.equal(state().portrait.image, image); assert.equal(state().revision, 1)
  const badge = harness('components/avatars/AccountAvatarBadge.tsx', { overrides: { '@/components/avatars/DashboardAvatarContext': { useDashboardAvatar: state } } })
  badge.render({ initiale: 'A' }); assert.equal(badge.find(n => n.type === 'img').props.src, image)
  state().updateAvatar(row(2)); render(); assert.equal(state().portrait, null)
  badge.render({ initiale: 'A' }); assert.ok(badge.find(n => n.props.config))
  h.unmount()
})

test('portrait : export JSON réel inclut le portrait propriétaire et exclut celui d’un autre compte', async () => {
  const database = pageDatabase({ avatars_utilisateurs: [row(1, portrait(1)), { ...row(1, portrait(1)), user_id: 'B' }] })
  const api = load('lib/user-data.ts', 'exportOwnData', { ...p2Helpers, supabase: { ...database, auth: { getUser: async () => ({ data: { user: { id: 'A', email: 'fixture@example.invalid' } }, error: null }) } } })
  const exported = await api.exportOwnData()
  assert.equal(exported.avatars_utilisateurs.length, 1)
  assert.equal(exported.avatars_utilisateurs[0].user_id, 'A')
  assert.equal(exported.avatars_utilisateurs[0].portrait_ia.image, image)
})
